// scripts/monster-carry-over.mjs
//
// Nimmt die 7 Monster aus dem jeweils VORHERIGEN Bracket, skaliert sie auf
// das Niveau des NEUEN Brackets hoch (HP/Rüstung/Ausweichen/Krit/Glück/
// Resistenzen/EXP proportional zum Verhältnis der nativen Bracket-Mittelwerte,
// `attack` per iterativer Simulation neu kalibriert — exakt dieselbe Methode
// wie scripts/fight-tool-monster-curve-calibration.mjs für Bracket 1-10) und
// schreibt sie als "Veteran"-Varianten in eine eigene JSON-Datei pro Bracket.
// Diese Datei wird zusätzlich zum nativen Bracket-Pool importiert (siehe
// dark-forest.class.ts) — ein Bracket-Wechsel bringt so 14 statt 7 Monster
// mit, ohne den Pool über mehrere Brackets hinweg unbegrenzt wachsen zu
// lassen (nur der UNMITTELBAR vorherige Bracket wird mitgenommen).
//
// Nutzung: node scripts/monster-carry-over.mjs [--apply]
// Ohne --apply: nur anzeigen, was generiert würde (Trockenlauf, schreibt aber
// trotzdem die *.veteran.json testweise, damit man reinschauen kann — nur
// dark-forest.class.ts wird NICHT angefasst ohne --apply).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCombatStats, simulateRun, hasEquippedWeaponType, winRateAgainst, calibrateMonsterAttackAndHp } from './lib/fight-tool-sim-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const RUNS_PER_ITERATION = 1500;
const TARGET_WINRATE = 0.78;
const TOLERANCE = 0.04;
const MAX_ITERATIONS = 18;

// 🔧 Zweiter Kalibrierungs-Hebel (attack + HP-Fallback): siehe
// scripts/lib/fight-tool-sim-core.mjs `calibrateMonsterAttackAndHp` für die
// Begründung. Verhindert die in Abschnitt 8 des Reports dokumentierten
// Ausreißer (attack:433+, Kurven die bei 0% starten) bei höheren Brackets.
const CALIBRATION_OPTS = {
  targetWinRate: TARGET_WINRATE, tolerance: TOLERANCE, runsPerIteration: RUNS_PER_ITERATION,
  maxIterations: MAX_ITERATIONS, minHpFraction: 0.5, hpStepFraction: 0.85, maxHpReductions: 12,
};

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf-8'));
}

function nonCursed(items) {
  return items.slice(0, 4);
}

function loadTierPools(tier) {
  return {
    head: nonCursed(loadJson(`public/item-data/equipment/head/head_tier${tier}.json`)),
    chest: nonCursed(loadJson(`public/item-data/equipment/chest/chest_tier${tier}.json`)),
    leg: nonCursed(loadJson(`public/item-data/equipment/leg/leg_tier${tier}.json`)),
    gloves: nonCursed(loadJson(`public/item-data/equipment/gloves/gloves_tier${tier}.json`)),
    footwear: nonCursed(loadJson(`public/item-data/equipment/footwear/footwear_tier${tier}.json`)),
    necklace: nonCursed(loadJson(`public/item-data/equipment/necklace/necklace_tier${tier}.json`)),
    ring: nonCursed(loadJson(`public/item-data/equipment/ring/ring_tier${tier}.json`)),
    weapon: loadJson(`public/item-data/weapons/weapon_tier${tier}.json`),
  };
}

const PASSIVES = loadJson('public/item-data/passives.json');

function loadAllSpells() {
  const files = [
    ...[1, 2, 3, 4, 5].map((t) => `public/item-data/skills/physical/physicalspells_tier${t}.json`),
    ...[1, 2, 3, 4, 5].map((t) => `public/item-data/skills/heal/healspells_tier${t}.json`),
    ...[1, 2, 3, 4, 5].map((t) => `public/item-data/skills/energy-shield/energyshieldspells_tier${t}.json`),
    ...[1, 2, 3, 4, 5].map((t) => `public/item-data/skills/magic/fire/firespells_tier${t}.json`),
    ...[1, 2, 3, 4, 5].map((t) => `public/item-data/skills/magic/cold/coldspells_tier${t}.json`),
    ...[1, 2, 3, 4, 5].map((t) => `public/item-data/skills/magic/lightning/lightningspells_tier${t}.json`),
    ...[1, 2, 3, 4, 5].map((t) => `public/item-data/skills/magic/chaos/chaosspells_tier${t}.json`),
  ];
  return files.flatMap((f) => loadJson(f));
}
const SPELLS_BY_ID = new Map(loadAllSpells().map((s) => [s.id, s]));

const STARTER_SWORD = {
  name: 'Verrostetes Kurzschwert', 'armor-slot': 'weapon-1', 'weapon-type': 'schnitt',
  stats: { intelligence:0,dexterity:0,strength:0,vitality:0,luck:0,'energy-shield':0,'magic-find':0,armor:0,attack:12,'magic-attack':0,initiative:0,evasion:0,'crit-chance':0,'crit-damage':0,chaosDamage:0,'magic-damage-fire':0,'magic-damage-cold':0,'magic-damage-lightning':0,resistances:{fire:0,cold:0,lightning:0,chaos:0}},
};

// 🩹 2026-07-15: GEAR_SLOT_ORDER/GEAR_SLOT_COUNTS fehlten bislang 'gloves' und
// ein zweites Waffen-Slot (Dual-Wield) — das "volles Gear"-Checkpoint (8
// Slots) bildete damit nur 8 von real 10 möglichen Ausrüstungs-Slots ab und
// unterschätzte die reale Spieler-Schadensausbeute deutlich (bestätigt: ein
// Bracket-40-Charakter mit Dual-Wield + Handschuhen macht ~80% mehr Schaden
// als das alte 8-Slot-Modell). Auf 10 Slots erweitert, damit die
// Kalibrierung (v.a. die Rundenzahl-Abschätzung) realistisch bleibt.
const GEAR_SLOT_ORDER = ['weapon-1', 'chest', 'leg', 'head', 'footwear', 'necklace', 'ring-left', 'ring-right', 'gloves', 'weapon-2'];
const CHECKPOINT_FRACTIONS = [0, 8/50, 17/50, 25/50, 33/50, 42/50, 1]; // gleiche Verteilung wie Bracket 1-10, relativ zur Bracket-Punktespanne
const GEAR_SLOT_COUNTS = [0, 1, 3, 5, 6, 8, 10];

function buildCheckpointCharacter(points, gearSlots, tierPools) {
  const slots = {};
  for (let i = 0; i < gearSlots; i++) {
    const slotName = GEAR_SLOT_ORDER[i];
    if (slotName === 'weapon-1' || slotName === 'weapon-2') {
      const oneHand = tierPools.weapon.filter((w) => String(w.hands) === '1' && w['weapon-type'] !== 'magie')[0];
      slots[slotName] = oneHand ?? tierPools.weapon[0];
    } else if (slotName.startsWith('ring')) {
      slots[slotName] = tierPools.ring[i % tierPools.ring.length];
    } else {
      slots[slotName] = tierPools[slotName][0];
    }
  }
  if (gearSlots === 0) slots['weapon-1'] = STARTER_SWORD;

  const stats = ['strength', 'dexterity', 'intelligence', 'vitality'];
  const investedPoints = { strength: 0, dexterity: 0, intelligence: 0, vitality: 0 };
  for (let i = 0; i < points; i++) investedPoints[stats[i % 4]]++;

  return { slots, investedPoints };
}

function winRateAt(monster, character, runs) {
  return winRateAgainst(monster, character, PASSIVES, runs, SPELLS_BY_ID);
}

function avgRoundsAgainst(monster, character, runs) {
  const playerStats = computeCombatStats(character.slots, character.investedPoints, PASSIVES);
  const hasWeaponType = (wt) => hasEquippedWeaponType(character.slots, wt);
  let totalRounds = 0;
  for (let i = 0; i < runs; i++) {
    const result = simulateRun(playerStats, [], [monster], hasWeaponType, SPELLS_BY_ID);
    totalRounds += result.steps[0]?.rounds ?? 0;
  }
  return totalRounds / runs;
}

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function avgResistance(monsters) {
  const all = monsters.flatMap((m) => Object.values(m.resistances ?? { fire: 0, cold: 0, lightning: 0, chaos: 0 }));
  return avg(all);
}

// ─────────────────────────────────────────────────────────────────────────
// 🗺️ Bracket-Konfiguration: Ziel-Bracket ← Quell-Bracket (nur der jeweils
// UNMITTELBAR vorherige Bracket wird mitgenommen, nicht kumulativ).
// ─────────────────────────────────────────────────────────────────────────

const BRACKET_CONFIGS = [
  { target: '11-20', source: '1-10', pointRange: [50, 100], gearTier: 2 },
  { target: '21-30', source: '11-20', pointRange: [100, 150], gearTier: 3 },
  {
    target: '31-40', source: '21-30', pointRange: [150, 200], gearTier: 4,
    // 🩹 2026-07-15: Ausweichen ist über die Brackets hinweg immer weiter
    // gestiegen (1-10: Ø~5.7, 11-20: Ø~7.9, 21-30: Ø~10.1, 31-40 vorher:
    // Ø~14.3), während der Spieler-Basis-Luck-Wert IMMER bei 5 bleibt (Glück
    // ist kein Schrein-Stat, nur Gear gibt +Luck) — dadurch wurden
    // Spieler-Treffer bracket-für-bracket unzuverlässiger (bei Ausweichen 19
    // vs Luck 5: ~87% Ausweich-Chance für das Monster). Für Bracket 31-40
    // (auf Nutzerwunsch) durch eine feste, niedrige Kurve ersetzt statt per
    // Verhältnis mitzuwachsen — macht Treffer wieder verlässlich, ohne die
    // Formel selbst anzufassen. HP bekommt einen Mindestwert von 800 (auf
    // Nutzerwunsch: "Monster im Bereich 31-40 sollten schon über 800 HP
    // haben"), ersetzt die vorher per Verhältnis geschrumpften Werte.
    hpCurve: [800, 900, 1000, 1100, 1200, 1300, 1400],
    evasionCurve: [2, 2, 3, 3, 4, 4, 5],
  },
  { target: '41-50', source: '31-40', pointRange: [200, 250], gearTier: 5 },
];

for (const config of BRACKET_CONFIGS) {
  console.log(`\n═══ Bracket ${config.target} ← ${config.source} (Punktespanne ${config.pointRange[0]}-${config.pointRange[1]}, T${config.gearTier}-Gear) ═══`);

  const nativeTarget = loadJson(`public/mosters/dark-forest/dark-forest.${config.target}.json`);
  const sourceMonsters = loadJson(`public/mosters/dark-forest/dark-forest.${config.source}.json`);
  const tierPools = loadTierPools(config.gearTier);

  // Skalierungs-Verhältnisse aus den nativen Ziel-/Quell-Bracket-Mittelwerten.
  const hpRatio = avg(nativeTarget.map((m) => m.hp)) / avg(sourceMonsters.map((m) => m.hp));
  const expRatio = avg(nativeTarget.map((m) => m.expReward)) / avg(sourceMonsters.map((m) => m.expReward));
  const armorRatio = avg(nativeTarget.map((m) => m.armor)) / Math.max(1, avg(sourceMonsters.map((m) => m.armor)));
  const evasionRatio = avg(nativeTarget.map((m) => m.evasion)) / avg(sourceMonsters.map((m) => m.evasion));
  const luckRatio = avg(nativeTarget.map((m) => m.luck)) / avg(sourceMonsters.map((m) => m.luck));
  const critChanceRatio = avg(nativeTarget.map((m) => m.critChance)) / avg(sourceMonsters.map((m) => m.critChance));
  const resistanceRatio = avgResistance(nativeTarget) / Math.max(1, avgResistance(sourceMonsters));

  console.log(`  Skalierung: HP x${hpRatio.toFixed(2)}, EXP x${expRatio.toFixed(2)}, Rüstung x${armorRatio.toFixed(2)}, Ausweichen x${evasionRatio.toFixed(2)}, Glück x${luckRatio.toFixed(2)}, Krit x${critChanceRatio.toFixed(2)}, Resistenz x${resistanceRatio.toFixed(2)}`);

  // Basis-Skalierung anwenden (alles außer attack, das folgt per Kalibrierung).
  const scaledMonsters = sourceMonsters.map((m) => ({
    ...m,
    id: `${m.id}_veteran`,
    name: `${m.name} (Veteran)`,
    hp: Math.max(1, Math.round(m.hp * hpRatio)),
    expReward: Math.max(1, Math.round(m.expReward * expRatio)),
    armor: Math.max(0, Math.round(m.armor * armorRatio)),
    evasion: Math.max(0, Math.round(m.evasion * evasionRatio)),
    luck: Math.max(0, Math.round(m.luck * luckRatio)),
    critChance: Math.max(0, Math.round(m.critChance * critChanceRatio)),
    resistances: {
      fire: Math.max(0, Math.round((m.resistances?.fire ?? 0) * resistanceRatio)),
      cold: Math.max(0, Math.round((m.resistances?.cold ?? 0) * resistanceRatio)),
      lightning: Math.max(0, Math.round((m.resistances?.lightning ?? 0) * resistanceRatio)),
      chaos: Math.max(0, Math.round((m.resistances?.chaos ?? 0) * resistanceRatio)),
    },
  }));

  // Gemessene Ist-Schwierigkeit (0-Punkte-Checkpoint dieses Brackets) zur Sortierung.
  const [minPts, maxPts] = config.pointRange;
  const referenceCharacter = buildCheckpointCharacter(minPts, GEAR_SLOT_COUNTS[0], tierPools);
  const ranked = scaledMonsters
    .map((m) => ({ monster: m, refWinRate: winRateAt(m, referenceCharacter, RUNS_PER_ITERATION) }))
    .sort((a, b) => b.refWinRate - a.refWinRate)
    .map((r) => r.monster);

  // 🩹 Feste HP-/Ausweichen-Kurve statt Verhältnis-Skalierung (nur 31-40, siehe Kommentar oben).
  if (config.hpCurve) {
    ranked.forEach((m, i) => { m.hp = config.hpCurve[i]; });
  }
  if (config.evasionCurve) {
    ranked.forEach((m, i) => { m.evasion = config.evasionCurve[i]; });
  }

  const changes = [];
  for (let i = 0; i < ranked.length; i++) {
    const monster = ranked[i];
    const points = Math.round(minPts + CHECKPOINT_FRACTIONS[i] * (maxPts - minPts));
    const gearSlots = GEAR_SLOT_COUNTS[i];
    const character = buildCheckpointCharacter(points, gearSlots, tierPools);

    // Wenn hp/evasion schon fest vorgegeben sind (config.hpCurve), soll der
    // Kalibrator sie NICHT mehr über den HP-Fallback-Hebel absenken —
    // ausschließlich attack anpassen.
    const calibrationOpts = config.hpCurve
      ? { ...CALIBRATION_OPTS, spellsById: SPELLS_BY_ID, maxHpReductions: 0 }
      : { ...CALIBRATION_OPTS, spellsById: SPELLS_BY_ID };

    const result = calibrateMonsterAttackAndHp(monster, character, PASSIVES, calibrationOpts);
    monster.hp = result.hp;
    monster.attack = result.attack;

    const avgRounds = avgRoundsAgainst(monster, character, RUNS_PER_ITERATION);
    changes.push({ name: monster.name, points, gearSlots, winRate: result.winRate, hpReductions: result.hpReductions, avgRounds });
    const hpNote = result.hpReductions > 0 ? ` | HP zusätzlich gesenkt (${result.hpReductions}× -15%, jetzt ${result.hp})` : '';
    console.log(`  ${monster.name.padEnd(30)} Checkpoint ${points}pts/${gearSlots} Gear | HP=${monster.hp} evasion=${monster.evasion} attack → ${result.attack} | Winrate ${(result.winRate * 100).toFixed(1)}% | Ø Runden ${avgRounds.toFixed(1)}${hpNote}`);
  }

  // Gefühlte Kurve validieren: Sonde am unteren und oberen Ende der Bracket-Punktespanne.
  const lowProbe = buildCheckpointCharacter(minPts, GEAR_SLOT_COUNTS[0], tierPools);
  const highProbe = buildCheckpointCharacter(maxPts, GEAR_SLOT_COUNTS[6], tierPools);
  const lowRates = ranked.map((m) => winRateAt(m, lowProbe, RUNS_PER_ITERATION));
  const highRates = ranked.map((m) => winRateAt(m, highProbe, RUNS_PER_ITERATION));
  console.log(`  Kurve @${minPts}pts:  ` + lowRates.map((r) => (r * 100).toFixed(0) + '%').join(' → '));
  console.log(`  Kurve @${maxPts}pts: ` + highRates.map((r) => (r * 100).toFixed(0) + '%').join(' → '));

  const outPath = path.join(ROOT, 'public', 'mosters', 'dark-forest', `dark-forest.${config.target}.veteran.json`);
  fs.writeFileSync(outPath, JSON.stringify(ranked, null, 2) + '\n');
  console.log(`  💾 ${path.relative(ROOT, outPath)}`);
}

if (!APPLY) {
  console.log('\nℹ️  *.veteran.json-Dateien wurden geschrieben. Mit --apply zusätzlich dark-forest.class.ts anpassen (Pools verbinden).');
} else {
  console.log('\nℹ️  --apply gesetzt — Verbindung der Pools in dark-forest.class.ts erfolgt manuell (siehe Report).');
}

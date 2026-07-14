// scripts/fight-tool-monster-curve-calibration.mjs
//
// Kalibriert den `attack`-Wert jedes Bracket-1-10-Monsters so, dass eine
// "Checkpoint"-Referenzfigur (Attributpunkte + passendes T1-Gear, gestaffelt
// von 0 Punkten/nackt bis 50 Punkten/voll ausgerüstet — der reale Fortschritt
// von Level 1 bis Level 10, siehe STAT_POINTS_PER_LEVEL=5 in profile.service.ts)
// gegen das ihr zugeordnete Monster eine Ziel-Winrate erreicht.
//
// Monster werden nach aktueller HP aufsteigend sortiert (= grobe Ist-Schwierig-
// keit) und je einem der 7 Checkpoints zugeordnet — Monster 1 (niedrigste HP)
// bekommt Checkpoint 0 Punkte, Monster 7 (höchste HP) Checkpoint 50 Punkte.
// Ergebnis: eine sauber steigende Kurve "je später im Bracket, desto mehr
// Punkte/Gear brauchst du, um eine vergleichbare Gewinnchance zu haben".
//
// Nutzung: node scripts/fight-tool-monster-curve-calibration.mjs [--apply]
// Ohne --apply: nur anzeigen, was sich ändern würde (Trockenlauf).
// Mit --apply: schreibt die neuen attack-Werte direkt in
//   public/mosters/dark-forest/dark-forest.1-10.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCombatStats, simulateRun, hasEquippedWeaponType } from './lib/fight-tool-sim-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const RUNS_PER_ITERATION = 2000;
const TARGET_WINRATE = 0.78;
const TOLERANCE = 0.04; // akzeptiert 74-82%
const MAX_ITERATIONS = 20;

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf-8'));
}

// Index 4 (letztes Item je Kategorie) ist durchgehend die "verfluchte"
// Glaskanonen-Variante (siehe fight-tool-balance-report.md) — für eine
// REPRÄSENTATIVE Checkpoint-Figur bewusst ausgeklammert, exakt wie
// balance-sim.mjs es für seine GEAR_BY_TIER-Durchschnittswerte tut.
function nonCursed(items) {
  return items.slice(0, 4);
}

const T1 = {
  head: nonCursed(loadJson('public/item-data/equipment/head/head_tier1.json')),
  chest: nonCursed(loadJson('public/item-data/equipment/chest/chest_tier1.json')),
  leg: nonCursed(loadJson('public/item-data/equipment/leg/leg_tier1.json')),
  gloves: nonCursed(loadJson('public/item-data/equipment/gloves/gloves_tier1.json')),
  footwear: nonCursed(loadJson('public/item-data/equipment/footwear/footwear_tier1.json')),
  necklace: nonCursed(loadJson('public/item-data/equipment/necklace/necklace_tier1.json')),
  ring: nonCursed(loadJson('public/item-data/equipment/ring/ring_tier1.json')),
  weapon: loadJson('public/item-data/weapons/weapon_tier1.json'),
};
const PASSIVES = loadJson('public/item-data/passives.json');
const MONSTER_FILE = 'public/mosters/dark-forest/dark-forest.1-10.json';
const MONSTERS_1_10 = loadJson(MONSTER_FILE);

const T1_ONE_HAND_WEAPON = T1.weapon.filter((w) => String(w.hands) === '1' && w['weapon-type'] !== 'magie')[0];

// ─────────────────────────────────────────────────────────────────────────
// 🧗 Checkpoint-Figuren: 0 → 50 Punkte, entspricht Level 1 → Level 10
// (STAT_POINTS_PER_LEVEL=5, siehe src/app/services/profile.service.ts).
// Gear-Menge wächst proportional mit (mehr Loot je mehr man gespielt hat).
// ─────────────────────────────────────────────────────────────────────────

const GEAR_SLOT_ORDER = ['weapon-1', 'chest', 'leg', 'head', 'footwear', 'necklace', 'ring-left', 'ring-right'];

const CHECKPOINTS = [
  { points: 0, gearSlots: 0 },
  { points: 8, gearSlots: 1 },
  { points: 17, gearSlots: 3 },
  { points: 25, gearSlots: 4 },
  { points: 33, gearSlots: 5 },
  { points: 42, gearSlots: 7 },
  { points: 50, gearSlots: 8 },
];

function spreadPoints(total) {
  const stats = ['strength', 'dexterity', 'intelligence', 'vitality'];
  const points = { strength: 0, dexterity: 0, intelligence: 0, vitality: 0 };
  for (let i = 0; i < total; i++) points[stats[i % 4]]++;
  return points;
}

function buildCheckpointCharacter(cp) {
  const slots = {};
  for (let i = 0; i < cp.gearSlots; i++) {
    const slotName = GEAR_SLOT_ORDER[i];
    if (slotName === 'weapon-1') {
      slots['weapon-1'] = T1_ONE_HAND_WEAPON;
    } else if (slotName.startsWith('ring')) {
      slots[slotName] = T1.ring[i % T1.ring.length];
    } else {
      slots[slotName] = T1[slotName][0];
    }
  }
  if (cp.gearSlots === 0) {
    // Blutiger Anfänger — Start-Schwert statt komplett waffenlos, wie im echten Spiel (DEFAULT_INVENTAR).
    slots['weapon-1'] = {
      name: 'Verrostetes Kurzschwert', 'armor-slot': 'weapon-1', 'weapon-type': 'schnitt',
      stats: { intelligence:0,dexterity:0,strength:0,vitality:0,luck:0,'energy-shield':0,'magic-find':0,armor:0,attack:12,'magic-attack':0,initiative:0,evasion:0,'crit-chance':0,'crit-damage':0,chaosDamage:0,'magic-damage-fire':0,'magic-damage-cold':0,'magic-damage-lightning':0,resistances:{fire:0,cold:0,lightning:0,chaos:0}},
    };
  }
  return { slots, investedPoints: spreadPoints(cp.points) };
}

// ─────────────────────────────────────────────────────────────────────────
// 🎯 Kalibrierung: pro Monster den attack-Wert so anpassen, dass die
// zugeordnete Checkpoint-Figur ~78% Winrate erreicht (iterative Anpassung).
// ─────────────────────────────────────────────────────────────────────────

function winRateAt(monster, character, runs) {
  const playerStats = computeCombatStats(character.slots, character.investedPoints, PASSIVES);
  const hasWeaponType = (wt) => hasEquippedWeaponType(character.slots, wt);
  let won = 0;
  for (let i = 0; i < runs; i++) {
    const result = simulateRun(playerStats, [], [monster], hasWeaponType, new Map());
    if (result.outcome === 'won') won++;
  }
  return won / runs;
}

// ─────────────────────────────────────────────────────────────────────────
// 📏 Ist-Schwierigkeit EMPIRISCH ermitteln statt über einen einzelnen Rohwert
// (HP) zu sortieren — HP allein ist irreführend: ein hoher HP-Pool bedeutet
// mehr Runden = mehr Trefferchancen fürs Monster, macht es also schon bei
// moderatem attack gefährlicher, als sein HP-Wert vermuten lässt. Referenz:
// Winrate der 0-Punkte-Checkpoint-Figur gegen jedes Monster in seinem
// AKTUELLEN (unkalibrierten) Zustand — je niedriger die Winrate, desto
// schwerer ist das Monster schon heute, ganz unabhängig davon, WARUM.
// ─────────────────────────────────────────────────────────────────────────

const referenceCharacter = buildCheckpointCharacter(CHECKPOINTS[0]);
const difficultyRanking = MONSTERS_1_10.map((m) => ({
  monster: m,
  referenceWinRate: winRateAt(m, referenceCharacter, RUNS_PER_ITERATION),
})).sort((a, b) => b.referenceWinRate - a.referenceWinRate); // absteigend = leichtestes zuerst

console.log('📏 Gemessene Ist-Schwierigkeit (0-Punkte-Referenzfigur, unkalibriert):');
for (const d of difficultyRanking) {
  console.log(`   ${d.monster.name.padEnd(24)} Winrate ${(d.referenceWinRate * 100).toFixed(1)}%`);
}
console.log();

const monstersByHp = difficultyRanking.map((d) => d.monster);

console.log(`🎯 Kalibriere ${monstersByHp.length} Monster auf Ziel-Winrate ${(TARGET_WINRATE * 100).toFixed(0)}% (±${(TOLERANCE * 100).toFixed(0)}%) gegen ihren zugeordneten Checkpoint.\n`);

const changes = [];

for (let i = 0; i < monstersByHp.length; i++) {
  const monster = monstersByHp[i];
  const cp = CHECKPOINTS[i];
  const character = buildCheckpointCharacter(cp);
  const originalAttack = monster.attack;

  let attack = monster.attack;
  let winRate = winRateAt({ ...monster, attack }, character, RUNS_PER_ITERATION);
  let iterations = 0;

  while (Math.abs(winRate - TARGET_WINRATE) > TOLERANCE && iterations < MAX_ITERATIONS) {
    // Grobe proportionale Schrittweite: je weiter weg vom Ziel, desto größer der Sprung.
    const gap = winRate - TARGET_WINRATE; // >0 = Spieler gewinnt zu oft -> Monster braucht mehr Angriff
    const step = Math.max(1, Math.round(attack * 0.15 * Math.abs(gap) * 2));
    attack = Math.max(1, attack + (gap > 0 ? step : -step));
    winRate = winRateAt({ ...monster, attack }, character, RUNS_PER_ITERATION);
    iterations++;
  }

  changes.push({
    name: monster.name, hp: monster.hp, checkpointPoints: cp.points, checkpointGearSlots: cp.gearSlots,
    originalAttack, newAttack: attack, finalWinRate: winRate, iterations,
  });

  console.log(
    `${monster.name.padEnd(24)} HP=${String(monster.hp).padStart(3)} | Checkpoint: ${cp.points}pts/${cp.gearSlots} Gear-Slots | ` +
    `attack ${originalAttack} → ${attack} | Winrate ${(winRate * 100).toFixed(1)}% (${iterations} Iterationen)`,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 📋 Kurve prüfen: NICHT den rohen attack-Wert (der ist wegen sehr
// unterschiedlicher HP-Werte — mehr HP = mehr Runden = mehr Trefferchancen —
// kein verlässlicher Schwierigkeits-Maßstab zwischen Monstern), sondern die
// tatsächlich GEFÜHLTE Schwierigkeit: zwei feste Sonden-Figuren (0-Punkte-
// Anfänger und 50-Punkte-voll-ausgerüstet) gegen ALLE 7 kalibrierten Monster
// in der Reihenfolge Monster1→Monster7 — die Winrate MUSS dabei fallen.
// ─────────────────────────────────────────────────────────────────────────

const calibratedMonsters = monstersByHp.map((m) => {
  const change = changes.find((c) => c.name === m.name);
  return { ...m, attack: change.newAttack };
});

function checkFeltDifficultyCurve(label, character) {
  const rates = calibratedMonsters.map((m) => winRateAt(m, character, RUNS_PER_ITERATION));
  const monotonic = rates.every((r, i) => i === 0 || r <= rates[i - 1] + 0.03); // 3% Toleranz gg. Sampling-Rauschen
  console.log(
    `\n📈 Gefühlte Schwierigkeit für "${label}" über Monster 1→7:\n   ` +
    rates.map((r) => (r * 100).toFixed(0) + '%').join(' → '),
  );
  console.log(monotonic ? '   ✅ fällt durchgehend (Kurve stimmt)' : '   ⚠️  nicht durchgehend fallend');
  return monotonic;
}

const curveOkForBeginner = checkFeltDifficultyCurve('0-Punkte-Anfänger', buildCheckpointCharacter(CHECKPOINTS[0]));
const curveOkForVeteran = checkFeltDifficultyCurve('50-Punkte-voll ausgerüstet', buildCheckpointCharacter(CHECKPOINTS[6]));
const isMonotonic = curveOkForBeginner && curveOkForVeteran;

if (APPLY) {
  const updated = MONSTERS_1_10.map((m) => {
    const change = changes.find((c) => c.name === m.name);
    return change ? { ...m, attack: change.newAttack } : m;
  });
  fs.writeFileSync(path.join(ROOT, MONSTER_FILE), JSON.stringify(updated, null, 2) + '\n');
  console.log(`\n💾 Übernommen in ${MONSTER_FILE}`);
} else {
  console.log('\nℹ️  Trockenlauf — mit --apply erneut ausführen, um die Werte tatsächlich zu übernehmen.');
}

const outPath = path.join(ROOT, 'scripts', 'output', 'fight-tool-monster-curve-calibration.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(changes, null, 2));

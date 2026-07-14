// scripts/fight-tool-monster-curve-calibration-31-40.mjs
//
// Analog zu fight-tool-monster-curve-calibration-21-30.mjs, aber für die 7
// NATIVEN Bracket-31-40-Monster (dark-forest.31-40.json). Kalibriert deren
// `attack`-Wert so, dass eine Checkpoint-Referenzfigur (Level 31, 150 Punkte,
// T2-Reste -> Level 40, 195 Punkte, volles T4-Gear -- echte
// Level-Progression, STAT_POINTS_PER_LEVEL=5) eine Ziel-Winrate von ~78%
// erreicht. Monster werden nach GEMESSENER Ist-Schwierigkeit sortiert
// (Winrate der schwächsten Checkpoint-Figur, unkalibriert), nicht nach
// roher HP.
//
// Nutzung: node scripts/fight-tool-monster-curve-calibration-31-40.mjs [--apply]
// Ohne --apply: nur anzeigen, was sich ändern würde (Trockenlauf).
// Mit --apply: schreibt die neuen attack-Werte direkt in
//   public/mosters/dark-forest/dark-forest.31-40.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCombatStats, simulateRun, hasEquippedWeaponType, winRateAgainst, calibrateMonsterAttackAndHp } from './lib/fight-tool-sim-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const RUNS_PER_ITERATION = 2000;
const TARGET_WINRATE = 0.78;
const TOLERANCE = 0.04;
const MAX_ITERATIONS = 20;

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
const MONSTER_FILE = 'public/mosters/dark-forest/dark-forest.31-40.json';
const MONSTERS_31_40 = loadJson(MONSTER_FILE);

const STARTER_SWORD = {
  name: 'Verrostetes Kurzschwert', 'armor-slot': 'weapon-1', 'weapon-type': 'schnitt',
  stats: { intelligence:0,dexterity:0,strength:0,vitality:0,luck:0,'energy-shield':0,'magic-find':0,armor:0,attack:12,'magic-attack':0,initiative:0,evasion:0,'crit-chance':0,'crit-damage':0,chaosDamage:0,'magic-damage-fire':0,'magic-damage-cold':0,'magic-damage-lightning':0,resistances:{fire:0,cold:0,lightning:0,chaos:0}},
};

// 🩹 2026-07-15: auf 10 Slots erweitert (Handschuhe + zweite Waffe/Dual-
// Wield fehlten bislang, siehe monster-carry-over.mjs für die Begründung).
const GEAR_SLOT_ORDER = ['weapon-1', 'chest', 'leg', 'head', 'footwear', 'necklace', 'ring-left', 'ring-right', 'gloves', 'weapon-2'];

// Level 31 (150 Pkt, T2-Reste) -> Level 40 (195 Pkt, volles T4-Gear, Dual-Wield).
const CHECKPOINTS = [
  { points: 150, gearTier: 2, gearSlots: 0 },
  { points: 155, gearTier: 2, gearSlots: 1 },
  { points: 165, gearTier: 3, gearSlots: 3 },
  { points: 170, gearTier: 3, gearSlots: 5 },
  { points: 180, gearTier: 4, gearSlots: 6 },
  { points: 190, gearTier: 4, gearSlots: 8 },
  { points: 195, gearTier: 4, gearSlots: 10 },
];

// 🩹 Feste HP-/Ausweichen-Kurve statt der oft zu hohen nativen Rohwerte
// (auf Nutzerwunsch: "Monster im Bereich 31-40 sollten schon über 800 HP
// haben" + Ausweichen darf Spieler-Treffer nicht dominieren, siehe
// monster-carry-over.mjs für die volle Begründung/Messung).
const HP_CURVE = [800, 900, 1000, 1100, 1200, 1300, 1400];
const EVASION_CURVE = [2, 2, 3, 3, 4, 4, 5];

function spreadPoints(total) {
  const stats = ['strength', 'dexterity', 'intelligence', 'vitality'];
  const points = { strength: 0, dexterity: 0, intelligence: 0, vitality: 0 };
  for (let i = 0; i < total; i++) points[stats[i % 4]]++;
  return points;
}

function buildCheckpointCharacter(cp) {
  const tierPools = loadTierPools(cp.gearTier);
  const slots = {};
  for (let i = 0; i < cp.gearSlots; i++) {
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
  if (cp.gearSlots === 0) slots['weapon-1'] = STARTER_SWORD;
  return { slots, investedPoints: spreadPoints(cp.points) };
}

function winRateAt(monster, character, runs) {
  return winRateAgainst(monster, character, PASSIVES, runs);
}

function avgRoundsAgainst(monster, character, runs) {
  const playerStats = computeCombatStats(character.slots, character.investedPoints, PASSIVES);
  const hasWeaponType = (wt) => hasEquippedWeaponType(character.slots, wt);
  let totalRounds = 0;
  for (let i = 0; i < runs; i++) {
    const result = simulateRun(playerStats, [], [monster], hasWeaponType, new Map());
    totalRounds += result.steps[0]?.rounds ?? 0;
  }
  return totalRounds / runs;
}

// HP ist jetzt über HP_CURVE fest vorgegeben -> der HP-Fallback-Hebel im
// Kalibrator bleibt aus (maxHpReductions: 0), nur attack wird angepasst.
const CALIBRATION_OPTS = {
  targetWinRate: TARGET_WINRATE, tolerance: TOLERANCE, runsPerIteration: RUNS_PER_ITERATION,
  maxIterations: MAX_ITERATIONS, minHpFraction: 0.5, hpStepFraction: 0.85, maxHpReductions: 0,
};

const referenceCharacter = buildCheckpointCharacter(CHECKPOINTS[0]);
const difficultyRanking = MONSTERS_31_40.map((m) => ({
  monster: m,
  referenceWinRate: winRateAt(m, referenceCharacter, RUNS_PER_ITERATION),
})).sort((a, b) => b.referenceWinRate - a.referenceWinRate);

console.log('📏 Gemessene Ist-Schwierigkeit (Level-31-Referenzfigur, unkalibriert):');
for (const d of difficultyRanking) {
  console.log(`   ${d.monster.name.padEnd(28)} HP=${String(d.monster.hp).padStart(4)} attack=${String(d.monster.attack).padStart(3)} Winrate ${(d.referenceWinRate * 100).toFixed(1)}%`);
}
console.log();

const monstersRanked = difficultyRanking.map((d) => d.monster);

// Feste HP-/Ausweichen-Kurve anwenden (überschreibt die nativen Rohwerte).
monstersRanked.forEach((m, i) => { m.hp = HP_CURVE[i]; m.evasion = EVASION_CURVE[i]; });

console.log(`🎯 Kalibriere ${monstersRanked.length} Monster auf Ziel-Winrate ${(TARGET_WINRATE * 100).toFixed(0)}% (±${(TOLERANCE * 100).toFixed(0)}%) gegen ihren zugeordneten Checkpoint.\n`);

const changes = [];

for (let i = 0; i < monstersRanked.length; i++) {
  const monster = monstersRanked[i];
  const cp = CHECKPOINTS[i];
  const character = buildCheckpointCharacter(cp);
  const originalAttack = monster.attack;

  const result = calibrateMonsterAttackAndHp(monster, character, PASSIVES, CALIBRATION_OPTS);
  monster.attack = result.attack;
  const avgRounds = avgRoundsAgainst(monster, character, RUNS_PER_ITERATION);

  changes.push({
    name: monster.name, newHp: monster.hp, newEvasion: monster.evasion, checkpointPoints: cp.points, checkpointGearTier: cp.gearTier, checkpointGearSlots: cp.gearSlots,
    originalAttack, newAttack: result.attack, finalWinRate: result.winRate, avgRounds,
  });

  console.log(
    `${monster.name.padEnd(28)} HP=${monster.hp} evasion=${monster.evasion} | Checkpoint: ${cp.points}pts/T${cp.gearTier}-${cp.gearSlots}Slots | ` +
    `attack ${originalAttack} → ${result.attack} | Winrate ${(result.winRate * 100).toFixed(1)}% | Ø Runden ${avgRounds.toFixed(1)}`,
  );
}

const calibratedMonsters = monstersRanked;

function checkFeltDifficultyCurve(label, character) {
  const rates = calibratedMonsters.map((m) => winRateAt(m, character, RUNS_PER_ITERATION));
  const monotonic = rates.every((r, i) => i === 0 || r <= rates[i - 1] + 0.03);
  console.log(`\n📈 Gefühlte Schwierigkeit für "${label}" über Monster 1→7:\n   ` + rates.map((r) => (r * 100).toFixed(0) + '%').join(' → '));
  console.log(monotonic ? '   ✅ fällt durchgehend (Kurve stimmt)' : '   ⚠️  nicht durchgehend fallend');
  return monotonic;
}

checkFeltDifficultyCurve('Level 31 (Bracket-Einstieg)', buildCheckpointCharacter(CHECKPOINTS[0]));
checkFeltDifficultyCurve('Level 40 (voll T4 ausgerüstet)', buildCheckpointCharacter(CHECKPOINTS[6]));

if (APPLY) {
  const updated = MONSTERS_31_40.map((m) => {
    const change = changes.find((c) => c.name === m.name);
    return change ? { ...m, hp: change.newHp, evasion: change.newEvasion, attack: change.newAttack } : m;
  });
  fs.writeFileSync(path.join(ROOT, MONSTER_FILE), JSON.stringify(updated, null, 2) + '\n');
  console.log(`\n💾 Übernommen in ${MONSTER_FILE}`);
} else {
  console.log('\nℹ️  Trockenlauf — mit --apply erneut ausführen, um die Werte tatsächlich zu übernehmen.');
}

const outPath = path.join(ROOT, 'scripts', 'output', 'fight-tool-monster-curve-calibration-31-40.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(changes, null, 2));
console.log(`💾 Rohdaten: ${path.relative(ROOT, outPath)}`);

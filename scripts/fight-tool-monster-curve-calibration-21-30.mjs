// scripts/fight-tool-monster-curve-calibration-21-30.mjs
//
// Analog zu fight-tool-monster-curve-calibration.mjs (Bracket 1-10), aber für
// die 7 NATIVEN Bracket-21-30-Monster (dark-forest.21-30.json). Kalibriert
// deren `attack`-Wert so, dass eine Checkpoint-Referenzfigur (Level 21, 100
// Punkte, kaum Gear -> Level 30, 145 Punkte, volles T3-Gear -- echte
// Level-Progression, STAT_POINTS_PER_LEVEL=5) eine Ziel-Winrate von ~78%
// erreicht. Monster werden nach GEMESSENER Ist-Schwierigkeit (Winrate der
// schwächsten Checkpoint-Figur, unkalibriert) sortiert, nicht nach roher HP
// -- siehe Bracket-1-10-Skript für die Begründung.
//
// Nutzung: node scripts/fight-tool-monster-curve-calibration-21-30.mjs [--apply]
// Ohne --apply: nur anzeigen, was sich ändern würde (Trockenlauf).
// Mit --apply: schreibt die neuen attack-Werte direkt in
//   public/mosters/dark-forest/dark-forest.21-30.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCombatStats, simulateRun, hasEquippedWeaponType } from './lib/fight-tool-sim-core.mjs';

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
const MONSTER_FILE = 'public/mosters/dark-forest/dark-forest.21-30.json';
const MONSTERS_21_30 = loadJson(MONSTER_FILE);

const STARTER_SWORD = {
  name: 'Verrostetes Kurzschwert', 'armor-slot': 'weapon-1', 'weapon-type': 'schnitt',
  stats: { intelligence:0,dexterity:0,strength:0,vitality:0,luck:0,'energy-shield':0,'magic-find':0,armor:0,attack:12,'magic-attack':0,initiative:0,evasion:0,'crit-chance':0,'crit-damage':0,chaosDamage:0,'magic-damage-fire':0,'magic-damage-cold':0,'magic-damage-lightning':0,resistances:{fire:0,cold:0,lightning:0,chaos:0}},
};

const GEAR_SLOT_ORDER = ['weapon-1', 'chest', 'leg', 'head', 'footwear', 'necklace', 'ring-left', 'ring-right'];

// ─────────────────────────────────────────────────────────────────────────
// 🧗 Checkpoint-Figuren: Level 21 (100 Pkt, T1-Reste) -> Level 30 (145 Pkt,
// volles T3-Gear). Gear-Tier wächst mit, weil TIER_DISTRIBUTION für 21-30
// gleichgewichtet T1/T2/T3 droppt (siehe dark-forest.class.ts) -- ein frisch
// ins Bracket gekommener Charakter hat meist noch T1/T2-Reste aus 11-20,
// gegen Bracket-Ende realistisch T3.
// ─────────────────────────────────────────────────────────────────────────

const CHECKPOINTS = [
  { points: 100, gearTier: 1, gearSlots: 0 },
  { points: 105, gearTier: 1, gearSlots: 1 },
  { points: 115, gearTier: 2, gearSlots: 3 },
  { points: 120, gearTier: 2, gearSlots: 4 },
  { points: 130, gearTier: 3, gearSlots: 5 },
  { points: 140, gearTier: 3, gearSlots: 7 },
  { points: 145, gearTier: 3, gearSlots: 8 },
];

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
    if (slotName === 'weapon-1') {
      const oneHand = tierPools.weapon.filter((w) => String(w.hands) === '1' && w['weapon-type'] !== 'magie')[0];
      slots['weapon-1'] = oneHand ?? tierPools.weapon[0];
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
  const playerStats = computeCombatStats(character.slots, character.investedPoints, PASSIVES);
  const hasWeaponType = (wt) => hasEquippedWeaponType(character.slots, wt);
  let won = 0;
  for (let i = 0; i < runs; i++) {
    const result = simulateRun(playerStats, [], [monster], hasWeaponType, new Map());
    if (result.outcome === 'won') won++;
  }
  return won / runs;
}

// 📏 Ist-Schwierigkeit EMPIRISCH ermitteln (Winrate der schwächsten
// Checkpoint-Figur gegen jedes Monster im UNKALIBRIERTEN Zustand) statt
// über rohe HP zu sortieren.
const referenceCharacter = buildCheckpointCharacter(CHECKPOINTS[0]);
const difficultyRanking = MONSTERS_21_30.map((m) => ({
  monster: m,
  referenceWinRate: winRateAt(m, referenceCharacter, RUNS_PER_ITERATION),
})).sort((a, b) => b.referenceWinRate - a.referenceWinRate); // absteigend = leichtestes zuerst

console.log('📏 Gemessene Ist-Schwierigkeit (Level-21-Referenzfigur, unkalibriert):');
for (const d of difficultyRanking) {
  console.log(`   ${d.monster.name.padEnd(28)} HP=${String(d.monster.hp).padStart(4)} attack=${String(d.monster.attack).padStart(3)} Winrate ${(d.referenceWinRate * 100).toFixed(1)}%`);
}
console.log();

const monstersRanked = difficultyRanking.map((d) => d.monster);

console.log(`🎯 Kalibriere ${monstersRanked.length} Monster auf Ziel-Winrate ${(TARGET_WINRATE * 100).toFixed(0)}% (±${(TOLERANCE * 100).toFixed(0)}%) gegen ihren zugeordneten Checkpoint.\n`);

const changes = [];

for (let i = 0; i < monstersRanked.length; i++) {
  const monster = monstersRanked[i];
  const cp = CHECKPOINTS[i];
  const character = buildCheckpointCharacter(cp);
  const originalAttack = monster.attack;

  let attack = monster.attack;
  let winRate = winRateAt({ ...monster, attack }, character, RUNS_PER_ITERATION);
  let iterations = 0;

  while (Math.abs(winRate - TARGET_WINRATE) > TOLERANCE && iterations < MAX_ITERATIONS) {
    const gap = winRate - TARGET_WINRATE;
    const step = Math.max(1, Math.round(attack * 0.15 * Math.abs(gap) * 2));
    attack = Math.max(1, attack + (gap > 0 ? step : -step));
    winRate = winRateAt({ ...monster, attack }, character, RUNS_PER_ITERATION);
    iterations++;
  }

  changes.push({
    name: monster.name, hp: monster.hp, checkpointPoints: cp.points, checkpointGearTier: cp.gearTier, checkpointGearSlots: cp.gearSlots,
    originalAttack, newAttack: attack, finalWinRate: winRate, iterations,
  });

  console.log(
    `${monster.name.padEnd(28)} HP=${String(monster.hp).padStart(4)} | Checkpoint: ${cp.points}pts/T${cp.gearTier}-${cp.gearSlots}Slots | ` +
    `attack ${originalAttack} → ${attack} | Winrate ${(winRate * 100).toFixed(1)}% (${iterations} Iterationen)`,
  );
}

// 📋 Gefühlte Kurve prüfen: zwei Sonden-Figuren (Level 21 / Level 30) gegen
// ALLE 7 kalibrierten Monster in Reihenfolge -- Winrate MUSS fallen.
const calibratedMonsters = monstersRanked.map((m) => {
  const change = changes.find((c) => c.name === m.name);
  return { ...m, attack: change.newAttack };
});

function checkFeltDifficultyCurve(label, character) {
  const rates = calibratedMonsters.map((m) => winRateAt(m, character, RUNS_PER_ITERATION));
  const monotonic = rates.every((r, i) => i === 0 || r <= rates[i - 1] + 0.03);
  console.log(`\n📈 Gefühlte Schwierigkeit für "${label}" über Monster 1→7:\n   ` + rates.map((r) => (r * 100).toFixed(0) + '%').join(' → '));
  console.log(monotonic ? '   ✅ fällt durchgehend (Kurve stimmt)' : '   ⚠️  nicht durchgehend fallend');
  return monotonic;
}

checkFeltDifficultyCurve('Level 21 (Bracket-Einstieg)', buildCheckpointCharacter(CHECKPOINTS[0]));
checkFeltDifficultyCurve('Level 30 (voll T3 ausgerüstet)', buildCheckpointCharacter(CHECKPOINTS[6]));

if (APPLY) {
  const updated = MONSTERS_21_30.map((m) => {
    const change = changes.find((c) => c.name === m.name);
    return change ? { ...m, attack: change.newAttack } : m;
  });
  fs.writeFileSync(path.join(ROOT, MONSTER_FILE), JSON.stringify(updated, null, 2) + '\n');
  console.log(`\n💾 Übernommen in ${MONSTER_FILE}`);
} else {
  console.log('\nℹ️  Trockenlauf — mit --apply erneut ausführen, um die Werte tatsächlich zu übernehmen.');
}

const outPath = path.join(ROOT, 'scripts', 'output', 'fight-tool-monster-curve-calibration-21-30.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(changes, null, 2));
console.log(`💾 Rohdaten: ${path.relative(ROOT, outPath)}`);

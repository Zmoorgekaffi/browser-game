// scripts/fight-tool-balance-sim.mjs
//
// Standalone Node-Batch-Analyse für die Frage "wie balanced ist reines
// T1-Gear + 30 Schrein-Attributspunkte gegen die Düsterwald-Bracket-1-10-
// Monster?" — generiert N zufällige T1-Builds (Ausrüstung + Spells +
// Attribut-Verteilung), simuliert pro Build M Runs gegen eine zufällige
// Step-Sequenz (1-3 Monster aus Bracket 1-10) und aggregiert die Winrate-
// Verteilung über alle Builds.
//
// Nutzt scripts/lib/fight-tool-sim-core.mjs für Stat-Aggregation + Kampf-
// Simulation (siehe dort für den Formel-Port aus SkillsService/FightService/
// SpellsEngineService/fight-simulator.util.ts).
//
// Nutzung: node scripts/fight-tool-balance-sim.mjs [buildCount] [runsPerBuild]
// Default: 1000 Builds x 10000 Runs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCombatStats, simulateRun, hasEquippedWeaponType } from './lib/fight-tool-sim-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BUILD_COUNT = Number(process.argv[2]) || 1000;
const RUNS_PER_BUILD = Number(process.argv[3]) || 10000;
const TOTAL_ATTRIBUTE_POINTS = 30;

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf-8'));
}

// ─────────────────────────────────────────────────────────────────────────
// 📦 Daten laden (nur Tier 1 + Bracket 1-10, wie angefragt)
// ─────────────────────────────────────────────────────────────────────────

const ITEM_POOLS = {
  head: loadJson('public/item-data/equipment/head/head_tier1.json'),
  chest: loadJson('public/item-data/equipment/chest/chest_tier1.json'),
  leg: loadJson('public/item-data/equipment/leg/leg_tier1.json'),
  gloves: loadJson('public/item-data/equipment/gloves/gloves_tier1.json'),
  footwear: loadJson('public/item-data/equipment/footwear/footwear_tier1.json'),
  necklace: loadJson('public/item-data/equipment/necklace/necklace_tier1.json'),
  ring: loadJson('public/item-data/equipment/ring/ring_tier1.json'),
  weapon: loadJson('public/item-data/weapons/weapon_tier1.json'),
};

const T1_SPELLS = [
  ...loadJson('public/item-data/skills/physical/physicalspells_tier1.json'),
  ...loadJson('public/item-data/skills/heal/healspells_tier1.json'),
  ...loadJson('public/item-data/skills/energy-shield/energyshieldspells_tier1.json'),
  ...loadJson('public/item-data/skills/magic/fire/firespells_tier1.json'),
  ...loadJson('public/item-data/skills/magic/cold/coldspells_tier1.json'),
  ...loadJson('public/item-data/skills/magic/lightning/lightningspells_tier1.json'),
  ...loadJson('public/item-data/skills/magic/chaos/chaosspells_tier1.json'),
];
const SPELLS_BY_ID = new Map(T1_SPELLS.map((s) => [s.id, s]));

const PASSIVES = loadJson('public/item-data/passives.json');

// 🧪 Kalibrierungs-Override (per ENV, NICHT persistiert) — siehe fight-tool-baseline-check.mjs.
const ATTACK_MULT = Number(process.env.ATTACK_MULT) || 1;
const LUCK_MULT = Number(process.env.LUCK_MULT) || 1;
const MONSTERS_1_10 = loadJson('public/mosters/dark-forest/dark-forest.1-10.json').map((m) => ({
  ...m,
  attack: Math.round(m.attack * ATTACK_MULT),
  luck: Math.round(m.luck * LUCK_MULT),
}));
if (ATTACK_MULT !== 1 || LUCK_MULT !== 1) {
  console.log(`⚙️  Kalibrierung aktiv: ATTACK_MULT=${ATTACK_MULT} LUCK_MULT=${LUCK_MULT}`);
}

// ─────────────────────────────────────────────────────────────────────────
// 🎲 Zufalls-Build-Generator
// ─────────────────────────────────────────────────────────────────────────

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function randomInvestedPoints(total) {
  const points = { strength: 0, dexterity: 0, intelligence: 0, vitality: 0 };
  const stats = Object.keys(points);
  for (let i = 0; i < total; i++) {
    points[pick(stats)]++;
  }
  return points;
}

function randomBuild() {
  const slots = {};
  const nonWeaponSlots = {
    head: ITEM_POOLS.head, chest: ITEM_POOLS.chest, leg: ITEM_POOLS.leg,
    gloves: ITEM_POOLS.gloves, footwear: ITEM_POOLS.footwear, necklace: ITEM_POOLS.necklace,
    'ring-left': ITEM_POOLS.ring, 'ring-right': ITEM_POOLS.ring,
  };
  for (const [slot, pool] of Object.entries(nonWeaponSlots)) {
    if (Math.random() < 0.85) slots[slot] = pick(pool);
  }

  const weaponRoll = Math.random();
  if (weaponRoll < 0.1) {
    // keine Waffe
  } else if (weaponRoll < 0.5) {
    const twoHanders = ITEM_POOLS.weapon.filter((w) => String(w.hands) === '2');
    slots['weapon-1'] = pick(twoHanders.length ? twoHanders : ITEM_POOLS.weapon);
  } else {
    const oneHanders = ITEM_POOLS.weapon.filter((w) => String(w.hands) === '1');
    const pool = oneHanders.length ? oneHanders : ITEM_POOLS.weapon;
    slots['weapon-1'] = pick(pool);
    if (Math.random() < 0.6) slots['weapon-2'] = pick(pool);
  }

  const shuffledSpells = [...T1_SPELLS].sort(() => Math.random() - 0.5);
  const spellIds = shuffledSpells.slice(0, randInt(0, 4)).map((s) => s.id);

  const investedPoints = randomInvestedPoints(TOTAL_ATTRIBUTE_POINTS);
  const stepCount = randInt(1, 3);
  const monsterSteps = Array.from({ length: stepCount }, () => pick(MONSTERS_1_10));

  return { slots, spellIds, investedPoints, monsterSteps };
}

// ─────────────────────────────────────────────────────────────────────────
// 🚀 Batch-Run
// ─────────────────────────────────────────────────────────────────────────

function summarizeBuild(build) {
  const gearNames = Object.entries(build.slots).map(([slot, item]) => `${slot}=${item.name}`);
  const spellNames = build.spellIds.map((id) => SPELLS_BY_ID.get(id)?.name ?? id);
  return {
    gear: gearNames,
    spells: spellNames,
    investedPoints: build.investedPoints,
    monsterSteps: build.monsterSteps.map((m) => m.name),
  };
}

console.log(`🎲 Generiere ${BUILD_COUNT} zufällige T1-Builds, je ${RUNS_PER_BUILD} Runs, ${TOTAL_ATTRIBUTE_POINTS} Attributpunkte...`);
const startTime = Date.now();

const buildResults = [];

for (let b = 0; b < BUILD_COUNT; b++) {
  const build = randomBuild();
  const playerStats = computeCombatStats(build.slots, build.investedPoints, PASSIVES);
  const equippedSpells = build.spellIds.map((id) => SPELLS_BY_ID.get(id));
  const hasWeaponType = (wt) => hasEquippedWeaponType(build.slots, wt);

  let won = 0, died = 0, timedOut = 0;
  const deathAtStep = {};
  let totalRounds = 0, totalStepFights = 0;

  for (let i = 0; i < RUNS_PER_BUILD; i++) {
    const result = simulateRun(playerStats, equippedSpells, build.monsterSteps, hasWeaponType, SPELLS_BY_ID);
    if (result.outcome === 'won') won++;
    else if (result.outcome === 'died') {
      died++;
      deathAtStep[result.stoppedAtStepIndex] = (deathAtStep[result.stoppedAtStepIndex] || 0) + 1;
    } else timedOut++;

    for (const s of result.steps) { totalRounds += s.rounds; totalStepFights++; }
  }

  buildResults.push({
    id: b,
    winRate: won / RUNS_PER_BUILD,
    died: died / RUNS_PER_BUILD,
    timedOut: timedOut / RUNS_PER_BUILD,
    deathAtStep,
    avgRounds: totalStepFights ? totalRounds / totalStepFights : 0,
    stepCount: build.monsterSteps.length,
    summary: summarizeBuild(build),
  });

  if ((b + 1) % 50 === 0) {
    const elapsedS = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ... ${b + 1}/${BUILD_COUNT} Builds simuliert (${elapsedS}s)`);
  }
}

const elapsedS = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n✅ Fertig in ${elapsedS}s (${BUILD_COUNT} Builds x ${RUNS_PER_BUILD} Runs).\n`);

// ─────────────────────────────────────────────────────────────────────────
// 📊 Auswertung
// ─────────────────────────────────────────────────────────────────────────

const winRates = buildResults.map((r) => r.winRate);
const avgWinRate = winRates.reduce((a, b) => a + b, 0) / winRates.length;
const sorted = [...buildResults].sort((a, b) => a.winRate - b.winRate);

const buckets = [
  ['0% (nie gewonnen)', (r) => r.winRate === 0],
  ['1-20%', (r) => r.winRate > 0 && r.winRate <= 0.2],
  ['21-40%', (r) => r.winRate > 0.2 && r.winRate <= 0.4],
  ['41-60%', (r) => r.winRate > 0.4 && r.winRate <= 0.6],
  ['61-80%', (r) => r.winRate > 0.6 && r.winRate <= 0.8],
  ['81-99%', (r) => r.winRate > 0.8 && r.winRate < 1],
  ['100% (immer gewonnen)', (r) => r.winRate === 1],
];

console.log('📊 WINRATE-VERTEILUNG ÜBER ALLE BUILDS');
console.log('─'.repeat(50));
for (const [label, test] of buckets) {
  const count = buildResults.filter(test).length;
  const pct = ((count / buildResults.length) * 100).toFixed(1);
  console.log(`${label.padEnd(24)} ${String(count).padStart(4)} Builds (${pct}%)`);
}
console.log('─'.repeat(50));
console.log(`Ø Winrate über alle Builds: ${(avgWinRate * 100).toFixed(1)}%`);
const totalDied = buildResults.reduce((sum, r) => sum + r.died, 0) / buildResults.length;
const totalTimedOut = buildResults.reduce((sum, r) => sum + r.timedOut, 0) / buildResults.length;
console.log(`Ø Tod-Rate über alle Builds: ${(totalDied * 100).toFixed(1)}%`);
console.log(`Ø Unentschieden-Rate über alle Builds: ${(totalTimedOut * 100).toFixed(1)}%\n`);

console.log('💀 TOP 10 SCHWÄCHSTE BUILDS');
for (const r of sorted.slice(0, 10)) {
  console.log(
    `  #${r.id} winrate=${(r.winRate * 100).toFixed(1)}% died=${(r.died * 100).toFixed(0)}% timeout=${(r.timedOut * 100).toFixed(0)}% ` +
    `avgRounds=${r.avgRounds.toFixed(1)} steps=${r.stepCount} | ${r.summary.gear.join(', ') || 'KEINE AUSRÜSTUNG'} | Spells: ${r.summary.spells.join(', ') || 'keine'} | Stats: ${JSON.stringify(r.summary.investedPoints)}`,
  );
}

console.log('\n🏆 TOP 10 STÄRKSTE BUILDS');
for (const r of sorted.slice(-10).reverse()) {
  console.log(
    `  #${r.id} winrate=${(r.winRate * 100).toFixed(1)}% avgRounds=${r.avgRounds.toFixed(1)} steps=${r.stepCount} | ` +
    `${r.summary.gear.join(', ') || 'KEINE AUSRÜSTUNG'} | Spells: ${r.summary.spells.join(', ') || 'keine'} | Stats: ${JSON.stringify(r.summary.investedPoints)}`,
  );
}

const outPath = path.join(ROOT, 'scripts', 'output', 'fight-tool-balance-report.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ buildCount: BUILD_COUNT, runsPerBuild: RUNS_PER_BUILD, avgWinRate, buildResults }, null, 2));
console.log(`\n💾 Volle Rohdaten gespeichert unter: ${path.relative(ROOT, outPath)}`);

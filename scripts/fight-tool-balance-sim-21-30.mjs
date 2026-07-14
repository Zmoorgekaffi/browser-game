// scripts/fight-tool-balance-sim-21-30.mjs
//
// Analog zu fight-tool-balance-sim.mjs (Bracket 1-10), aber für Bracket
// 21-30: generiert N zufällige Builds mit ECHTER Level-Progression (Level
// 21-30 uniform verteilt, Attributpunkte = (Level-1)*5, STAT_POINTS_PER_LEVEL
// =5 aus profile.service.ts) und gemischtem T1/T2/T3-Gear (TIER_DISTRIBUTION
// für 21-30 droppt gleichgewichtet T1/T2/T3, siehe dark-forest.class.ts).
// Jeder Build durchläuft EIN Abenteuer mit fest 6 Monster-Kämpfen (das
// Maximum, das ein echtes Abenteuer laut Area.generateSteps() überhaupt
// erzeugen kann: stepCount 4-8, fightCount = 50-75% davon -> max 6 bei
// stepCount=8) gegen den VOLLEN Bracket-21-30-Pool (7 native + 7 hoch-
// skalierte "Veteran"-Monster aus 11-20), je RUNS_PER_BUILD mal wiederholt.
//
// Optional --calibrated: überschreibt die `attack`-Werte der 7 nativen
// Monster mit den Werten aus scripts/output/fight-tool-monster-curve-
// calibration-21-30.json (Trockenlauf-Ergebnis von
// fight-tool-monster-curve-calibration-21-30.mjs) -- für einen Vorher/
// Nachher-Vergleich OHNE die echte JSON anzufassen.
//
// Nutzung: node scripts/fight-tool-balance-sim-21-30.mjs [buildCount] [runsPerBuild] [--calibrated]
// Default: 1000 Builds x 10000 Runs, 6 Kämpfe/Adventure.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCombatStats, simulateRun, hasEquippedWeaponType } from './lib/fight-tool-sim-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CALIBRATED = process.argv.includes('--calibrated');
const numArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const BUILD_COUNT = Number(numArgs[0]) || 1000;
const RUNS_PER_BUILD = Number(numArgs[1]) || 10000;
const FIGHTS_PER_ADVENTURE = 6;

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf-8'));
}

// ─────────────────────────────────────────────────────────────────────────
// 📦 Daten laden: Gear T1-T3, Spells T1-T3, voller 21-30-Monster-Pool
// (nativ + veteran).
// ─────────────────────────────────────────────────────────────────────────

function loadItemPoolsForTier(tier) {
  return {
    head: loadJson(`public/item-data/equipment/head/head_tier${tier}.json`),
    chest: loadJson(`public/item-data/equipment/chest/chest_tier${tier}.json`),
    leg: loadJson(`public/item-data/equipment/leg/leg_tier${tier}.json`),
    gloves: loadJson(`public/item-data/equipment/gloves/gloves_tier${tier}.json`),
    footwear: loadJson(`public/item-data/equipment/footwear/footwear_tier${tier}.json`),
    necklace: loadJson(`public/item-data/equipment/necklace/necklace_tier${tier}.json`),
    ring: loadJson(`public/item-data/equipment/ring/ring_tier${tier}.json`),
    weapon: loadJson(`public/item-data/weapons/weapon_tier${tier}.json`),
  };
}
const ITEM_POOLS_BY_TIER = { 1: loadItemPoolsForTier(1), 2: loadItemPoolsForTier(2), 3: loadItemPoolsForTier(3) };

function loadSpellsForTier(tier) {
  return [
    ...loadJson(`public/item-data/skills/physical/physicalspells_tier${tier}.json`),
    ...loadJson(`public/item-data/skills/heal/healspells_tier${tier}.json`),
    ...loadJson(`public/item-data/skills/energy-shield/energyshieldspells_tier${tier}.json`),
    ...loadJson(`public/item-data/skills/magic/fire/firespells_tier${tier}.json`),
    ...loadJson(`public/item-data/skills/magic/cold/coldspells_tier${tier}.json`),
    ...loadJson(`public/item-data/skills/magic/lightning/lightningspells_tier${tier}.json`),
    ...loadJson(`public/item-data/skills/magic/chaos/chaosspells_tier${tier}.json`),
  ];
}
const SPELLS_1_3 = [1, 2, 3].flatMap(loadSpellsForTier);
// Für die Monster-Spell-Auflösung (Monster können auf beliebige Spell-IDs
// verweisen, auch außerhalb 1-3) alle Tiers 1-5 laden.
const ALL_SPELLS = [1, 2, 3, 4, 5].flatMap(loadSpellsForTier);
const SPELLS_BY_ID = new Map(ALL_SPELLS.map((s) => [s.id, s]));

const PASSIVES = loadJson('public/item-data/passives.json');

let MONSTERS_21_30_NATIVE = loadJson('public/mosters/dark-forest/dark-forest.21-30.json');
const MONSTERS_21_30_VETERAN = loadJson('public/mosters/dark-forest/dark-forest.21-30.veteran.json');

if (CALIBRATED) {
  const calibration = loadJson('scripts/output/fight-tool-monster-curve-calibration-21-30.json');
  MONSTERS_21_30_NATIVE = MONSTERS_21_30_NATIVE.map((m) => {
    const change = calibration.find((c) => c.name === m.name);
    return change ? { ...m, attack: change.newAttack } : m;
  });
  console.log('⚙️  --calibrated aktiv: native Monster-attack-Werte aus fight-tool-monster-curve-calibration-21-30.json übernommen.');
}

const MONSTER_POOL = [
  ...MONSTERS_21_30_NATIVE.map((m) => ({ ...m, origin: 'nativ' })),
  ...MONSTERS_21_30_VETERAN.map((m) => ({ ...m, origin: 'veteran' })),
];

// ─────────────────────────────────────────────────────────────────────────
// 🎲 Zufalls-Build-Generator (echte Level-Progression + gemischtes T1-3-Gear)
// ─────────────────────────────────────────────────────────────────────────

function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function randomTier() { return randInt(1, 3); }

function randomInvestedPoints(total) {
  const points = { strength: 0, dexterity: 0, intelligence: 0, vitality: 0 };
  const stats = Object.keys(points);
  for (let i = 0; i < total; i++) points[pick(stats)]++;
  return points;
}

function randomBuild() {
  const level = randInt(21, 30);
  const totalPoints = (level - 1) * 5; // STAT_POINTS_PER_LEVEL=5, 0 Pkt bei Level 1

  const slots = {};
  const nonWeaponSlotNames = ['head', 'chest', 'leg', 'gloves', 'footwear', 'necklace', 'ring-left', 'ring-right'];
  for (const slot of nonWeaponSlotNames) {
    if (Math.random() < 0.85) {
      const tier = randomTier();
      const poolKey = slot.startsWith('ring') ? 'ring' : slot;
      slots[slot] = pick(ITEM_POOLS_BY_TIER[tier][poolKey]);
    }
  }

  const weaponRoll = Math.random();
  if (weaponRoll < 0.1) {
    // keine Waffe
  } else if (weaponRoll < 0.5) {
    const tier = randomTier();
    const twoHanders = ITEM_POOLS_BY_TIER[tier].weapon.filter((w) => String(w.hands) === '2');
    slots['weapon-1'] = pick(twoHanders.length ? twoHanders : ITEM_POOLS_BY_TIER[tier].weapon);
  } else {
    const tier = randomTier();
    const oneHanders = ITEM_POOLS_BY_TIER[tier].weapon.filter((w) => String(w.hands) === '1');
    const pool = oneHanders.length ? oneHanders : ITEM_POOLS_BY_TIER[tier].weapon;
    slots['weapon-1'] = pick(pool);
    if (Math.random() < 0.6) {
      const tier2 = randomTier();
      const oneHanders2 = ITEM_POOLS_BY_TIER[tier2].weapon.filter((w) => String(w.hands) === '1');
      slots['weapon-2'] = pick(oneHanders2.length ? oneHanders2 : ITEM_POOLS_BY_TIER[tier2].weapon);
    }
  }

  const shuffledSpells = [...SPELLS_1_3].sort(() => Math.random() - 0.5);
  const spellIds = shuffledSpells.slice(0, randInt(0, 4)).map((s) => s.id);

  const investedPoints = randomInvestedPoints(totalPoints);
  const monsterSteps = Array.from({ length: FIGHTS_PER_ADVENTURE }, () => pick(MONSTER_POOL));

  return { level, totalPoints, slots, spellIds, investedPoints, monsterSteps };
}

// ─────────────────────────────────────────────────────────────────────────
// 🚀 Batch-Run
// ─────────────────────────────────────────────────────────────────────────

function summarizeBuild(build) {
  const gearNames = Object.entries(build.slots).map(([slot, item]) => `${slot}=${item.name}`);
  const spellNames = build.spellIds.map((id) => SPELLS_BY_ID.get(id)?.name ?? id);
  return {
    level: build.level,
    totalPoints: build.totalPoints,
    gear: gearNames,
    spells: spellNames,
    investedPoints: build.investedPoints,
    monsterSteps: build.monsterSteps.map((m) => m.name),
  };
}

console.log(`🎲 Generiere ${BUILD_COUNT} zufällige Bracket-21-30-Builds (Level 21-30, T1-3-Gear-Mix), je ${RUNS_PER_BUILD} Runs, ${FIGHTS_PER_ADVENTURE} Kämpfe/Abenteuer...`);
const startTime = Date.now();

const buildResults = [];
// Pro-Monster-Aggregation über ALLE Builds/Runs: wie oft trat dieses Monster
// in einem Kampf auf, wie oft wurde dieser EINZELNE Kampf gewonnen/verloren.
const monsterStats = new Map(); // name -> { origin, fights, won, died, timedOut, totalRounds }
function trackMonster(name, origin) {
  if (!monsterStats.has(name)) monsterStats.set(name, { origin, fights: 0, won: 0, died: 0, timedOut: 0, totalRounds: 0 });
  return monsterStats.get(name);
}
// Level-Bucket-Aggregation (früh/mittel/spät im Bracket).
const levelBuckets = { '21-23': [], '24-27': [], '28-30': [] };
function levelBucketKey(level) { return level <= 23 ? '21-23' : level <= 27 ? '24-27' : '28-30'; }

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

    for (let s = 0; s < result.steps.length; s++) {
      const step = result.steps[s];
      totalRounds += step.rounds;
      totalStepFights++;
      const monster = build.monsterSteps[s];
      const ms = trackMonster(monster.name, monster.origin);
      ms.fights++;
      ms.totalRounds += step.rounds;
      if (step.won) ms.won++;
      else if (s === result.stoppedAtStepIndex && result.outcome === 'died') ms.died++;
      else if (step.timedOut) ms.timedOut++;
    }
  }

  const winRate = won / RUNS_PER_BUILD;
  buildResults.push({
    id: b,
    level: build.level,
    totalPoints: build.totalPoints,
    winRate,
    died: died / RUNS_PER_BUILD,
    timedOut: timedOut / RUNS_PER_BUILD,
    deathAtStep,
    avgRounds: totalStepFights ? totalRounds / totalStepFights : 0,
    summary: summarizeBuild(build),
  });
  levelBuckets[levelBucketKey(build.level)].push(winRate);

  if ((b + 1) % 50 === 0) {
    const elapsedS = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ... ${b + 1}/${BUILD_COUNT} Builds simuliert (${elapsedS}s)`);
  }
}

const elapsedS = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n✅ Fertig in ${elapsedS}s (${BUILD_COUNT} Builds x ${RUNS_PER_BUILD} Runs x ${FIGHTS_PER_ADVENTURE} Kämpfe).\n`);

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

console.log('📈 WINRATE NACH LEVEL-BUCKET (innerhalb Bracket 21-30)');
for (const [bucket, rates] of Object.entries(levelBuckets)) {
  if (rates.length === 0) continue;
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  console.log(`  Level ${bucket}: Ø Winrate ${(avg * 100).toFixed(1)}% (${rates.length} Builds)`);
}

console.log('\n👹 PRO-MONSTER-AUSWERTUNG (über alle Einzelkämpfe, nicht ganze Runs)');
console.log('─'.repeat(90));
const monsterRows = [...monsterStats.entries()].map(([name, s]) => ({
  name, origin: s.origin, fights: s.fights,
  winRate: s.won / s.fights, deathShare: s.died / s.fights, timeoutShare: s.timedOut / s.fights,
  avgRounds: s.totalRounds / s.fights,
})).sort((a, b) => a.winRate - b.winRate);
for (const m of monsterRows) {
  console.log(
    `  [${m.origin === 'veteran' ? 'VET' : 'NAT'}] ${m.name.padEnd(28)} Winrate ${(m.winRate * 100).toFixed(1).padStart(5)}%  ` +
    `Tod-Anteil ${(m.deathShare * 100).toFixed(1).padStart(5)}%  Ø Runden ${m.avgRounds.toFixed(1).padStart(5)}  (${m.fights} Kämpfe)`,
  );
}

console.log('\n💀 TOP 10 SCHWÄCHSTE BUILDS');
for (const r of sorted.slice(0, 10)) {
  console.log(
    `  #${r.id} Lv${r.level} (${r.totalPoints}pts) winrate=${(r.winRate * 100).toFixed(1)}% died=${(r.died * 100).toFixed(0)}% timeout=${(r.timedOut * 100).toFixed(0)}% ` +
    `avgRounds=${r.avgRounds.toFixed(1)} | ${r.summary.gear.join(', ') || 'KEINE AUSRÜSTUNG'} | Spells: ${r.summary.spells.join(', ') || 'keine'}`,
  );
}

console.log('\n🏆 TOP 10 STÄRKSTE BUILDS');
for (const r of sorted.slice(-10).reverse()) {
  console.log(
    `  #${r.id} Lv${r.level} (${r.totalPoints}pts) winrate=${(r.winRate * 100).toFixed(1)}% avgRounds=${r.avgRounds.toFixed(1)} | ` +
    `${r.summary.gear.join(', ') || 'KEINE AUSRÜSTUNG'} | Spells: ${r.summary.spells.join(', ') || 'keine'}`,
  );
}

const suffix = CALIBRATED ? '-calibrated' : '';
const outPath = path.join(ROOT, 'scripts', 'output', `fight-tool-balance-report-21-30${suffix}.json`);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({
  buildCount: BUILD_COUNT, runsPerBuild: RUNS_PER_BUILD, fightsPerAdventure: FIGHTS_PER_ADVENTURE, calibrated: CALIBRATED,
  avgWinRate, avgDied: totalDied, avgTimedOut: totalTimedOut,
  levelBuckets: Object.fromEntries(Object.entries(levelBuckets).map(([k, v]) => [k, v.length ? v.reduce((a, b) => a + b, 0) / v.length : null])),
  monsterRows, buildResults,
}, null, 2));
console.log(`\n💾 Volle Rohdaten gespeichert unter: ${path.relative(ROOT, outPath)}`);

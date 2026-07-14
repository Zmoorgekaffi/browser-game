// scripts/fight-tool-baseline-check-31-40.mjs
//
// Analog zu fight-tool-baseline-check-21-30.mjs, aber für Bracket 31-40: 7
// feste Checkpoint-Referenzcharaktere (Level 31, 150 Punkte, T2-Reste ->
// Level 40, 195 Punkte, volles T4-Gear -- echte Level-Progression,
// STAT_POINTS_PER_LEVEL=5) je EINZELN gegen JEDES der 14 Monster im
// Bracket-31-40-Pool (7 native + 7 hochskalierte "Veteran"-Monster aus
// 21-30, siehe scripts/monster-carry-over.mjs).
//
// Gear-Tiers T2->T4 statt T1->T3, weil TIER_DISTRIBUTION['31-40'] in
// dark-forest.class.ts gleichgewichtet T2/T3/T4 droppt (kein T1/T5 in
// diesem Bracket).
//
// Nutzung: node scripts/fight-tool-baseline-check-31-40.mjs [runsPerMatchup]
// Default: 4000 Runs pro (Charakter, Monster)-Paar.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCombatStats, simulateRun, hasEquippedWeaponType } from './lib/fight-tool-sim-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RUNS = Number(process.argv[2]) || 4000;

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

function loadSpellsUpToTier(maxTier) {
  const tiers = Array.from({ length: maxTier }, (_, i) => `tier${i + 1}`);
  const files = [
    ...tiers.map((t) => `public/item-data/skills/physical/physicalspells_${t}.json`),
    ...tiers.map((t) => `public/item-data/skills/heal/healspells_${t}.json`),
    ...tiers.map((t) => `public/item-data/skills/energy-shield/energyshieldspells_${t}.json`),
    ...tiers.map((t) => `public/item-data/skills/magic/fire/firespells_${t}.json`),
    ...tiers.map((t) => `public/item-data/skills/magic/cold/coldspells_${t}.json`),
    ...tiers.map((t) => `public/item-data/skills/magic/lightning/lightningspells_${t}.json`),
    ...tiers.map((t) => `public/item-data/skills/magic/chaos/chaosspells_${t}.json`),
  ];
  return files.flatMap((f) => loadJson(f));
}
const ALL_SPELLS = loadSpellsUpToTier(5);
const SPELLS_BY_ID = new Map(ALL_SPELLS.map((s) => [s.id, s]));

const STARTER_SWORD = {
  name: 'Verrostetes Kurzschwert', 'armor-slot': 'weapon-1', 'weapon-type': 'schnitt',
  stats: { intelligence:0,dexterity:0,strength:0,vitality:0,luck:0,'energy-shield':0,'magic-find':0,armor:0,attack:12,'magic-attack':0,initiative:0,evasion:0,'crit-chance':0,'crit-damage':0,chaosDamage:0,'magic-damage-fire':0,'magic-damage-cold':0,'magic-damage-lightning':0,resistances:{fire:0,cold:0,lightning:0,chaos:0}},
};

const GEAR_SLOT_ORDER = ['weapon-1', 'chest', 'leg', 'head', 'footwear', 'necklace', 'ring-left', 'ring-right'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function spreadPoints(total) {
  const stats = ['strength', 'dexterity', 'intelligence', 'vitality'];
  const points = { strength: 0, dexterity: 0, intelligence: 0, vitality: 0 };
  for (let i = 0; i < total; i++) points[stats[i % 4]]++;
  return points;
}

// Level 31 (150 Pkt, T2-Reste) -> Level 40 (195 Pkt, volles T4-Gear).
// points = (level-1)*5. Gear-Tier wächst T2->T3->T4 (kein T1/T5 im Bracket).
const CHECKPOINTS = [
  { label: 'Level 31 (Bracket-Einstieg, 150 Pkt, T2-Reste, 0 Slots)', level: 31, points: 150, gearTier: 2, gearSlots: 0 },
  { label: 'Level 32 (155 Pkt, T2-Gear, 1 Slot)', level: 32, points: 155, gearTier: 2, gearSlots: 1 },
  { label: 'Level 34 (T3-Gear, 3 Slots)', level: 34, points: 165, gearTier: 3, gearSlots: 3 },
  { label: 'Level 35 (T3-Gear, 4 Slots)', level: 35, points: 170, gearTier: 3, gearSlots: 4 },
  { label: 'Level 37 (T3/T4-Mix, 5 Slots)', level: 37, points: 180, gearTier: 4, gearSlots: 5 },
  { label: 'Level 39 (T4-Gear, 7 Slots)', level: 39, points: 190, gearTier: 4, gearSlots: 7 },
  { label: 'Level 40 (Bracket-Ende, 195 Pkt, volles T4-Gear)', level: 40, points: 195, gearTier: 4, gearSlots: 8 },
];

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

const MONSTERS = [
  ...loadJson('public/mosters/dark-forest/dark-forest.31-40.json').map((m) => ({ ...m, origin: 'nativ' })),
  ...loadJson('public/mosters/dark-forest/dark-forest.31-40.veteran.json').map((m) => ({ ...m, origin: 'veteran' })),
];

console.log(`🧪 Baseline-Check Bracket 31-40: ${CHECKPOINTS.length} Referenz-Charaktere x ${MONSTERS.length} Monster x ${RUNS} Runs\n`);

const report = [];

for (const cp of CHECKPOINTS) {
  const character = buildCheckpointCharacter(cp);
  console.log(`\n=== ${cp.label} ===`);
  const playerStats = computeCombatStats(character.slots, character.investedPoints, PASSIVES);
  console.log(
    `  HP=${playerStats.hp} Mana=${playerStats.mana} Schild=${Math.round(playerStats['energy-shield'])} ` +
    `Angriff=${playerStats.attackMin}-${playerStats.attackMax} Rüstung=${playerStats.armor} Ausweichen=${playerStats.evasion}`,
  );

  for (const monster of MONSTERS) {
    let won = 0, died = 0, timedOut = 0, totalRounds = 0;
    const hasWeaponType = (wt) => hasEquippedWeaponType(character.slots, wt);

    for (let i = 0; i < RUNS; i++) {
      const result = simulateRun(playerStats, [], [monster], hasWeaponType, SPELLS_BY_ID);
      if (result.outcome === 'won') won++;
      else if (result.outcome === 'died') died++;
      else timedOut++;
      totalRounds += result.steps[0]?.rounds ?? 0;
    }

    const winRate = won / RUNS;
    console.log(
      `  vs [${monster.origin === 'veteran' ? 'VET' : 'NAT'}] ${monster.name.padEnd(28)} (HP ${String(monster.hp).padStart(4)}, ATK ${String(monster.attack).padStart(3)}): ` +
      `Winrate ${(winRate * 100).toFixed(1).padStart(5)}%  Tod ${(died / RUNS * 100).toFixed(1).padStart(4)}%  Ø Runden ${(totalRounds / RUNS).toFixed(1)}`,
    );
    report.push({ checkpoint: cp.label, monster: monster.name, origin: monster.origin, winRate, died: died / RUNS, timedOut: timedOut / RUNS, avgRounds: totalRounds / RUNS });
  }
}

const outPath = path.join(ROOT, 'scripts', 'output', 'fight-tool-baseline-report-31-40.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`\n💾 Gespeichert unter: ${path.relative(ROOT, outPath)}`);

// scripts/fight-tool-baseline-check-21-30.mjs
//
// Analog zu fight-tool-baseline-check.mjs (Bracket 1-10), aber für Bracket
// 21-30: 7 feste Checkpoint-Referenzcharaktere (Level 21, 0 Punkte/0 Gear bis
// Level 30, 145 Punkte/volles T3-Gear — echte Level-Progression,
// STAT_POINTS_PER_LEVEL=5, siehe profile.service.ts) je EINZELN gegen JEDES
// der 14 Monster im Bracket-21-30-Pool (7 native + 7 hochskalierte
// "Veteran"-Monster aus 11-20, siehe scripts/monster-carry-over.mjs).
//
// Nutzung: node scripts/fight-tool-baseline-check-21-30.mjs [runsPerMatchup]
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
// Referenzcharaktere sollen nur Spells kennen, die ihre eigene Gear-Tier auch
// realistisch mitbringen würde -- alle Spell-Tiers 1-5 laden, damit auch
// Monster-Spell-IDs (die aus beliebigen Tiers stammen können) auflösbar sind.
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

// Level 21 (0 Zusatzpunkte über den Bracket-Einstieg, s.u.) bis Level 30
// (voll T3 ausgerüstet). points = (level-1)*5, STAT_POINTS_PER_LEVEL=5.
// Gear-Tier wächst mit: frisch in 21-30 hat man meist noch T1/T2-Reste aus
// 11-20, am Ende des Brackets realistisch volles T3 (siehe TIER_DISTRIBUTION
// '21-30' in dark-forest.class.ts: 3xT1 + 3xT2 + 3xT3 - gleichgewichtet).
const CHECKPOINTS = [
  { label: 'Level 21 (Bracket-Einstieg, 100 Pkt, T1-Reste, 0 Slots)', level: 21, points: 100, gearTier: 1, gearSlots: 0 },
  { label: 'Level 22 (108 Pkt, T1-Gear, 1 Slot)', level: 22, points: 105, gearTier: 1, gearSlots: 1 },
  { label: 'Level 24 (T2-Gear, 3 Slots)', level: 24, points: 115, gearTier: 2, gearSlots: 3 },
  { label: 'Level 25 (T2-Gear, 4 Slots)', level: 25, points: 120, gearTier: 2, gearSlots: 4 },
  { label: 'Level 27 (T2/T3-Mix, 5 Slots)', level: 27, points: 130, gearTier: 3, gearSlots: 5 },
  { label: 'Level 29 (T3-Gear, 7 Slots)', level: 29, points: 140, gearTier: 3, gearSlots: 7 },
  { label: 'Level 30 (Bracket-Ende, 145 Pkt, volles T3-Gear)', level: 30, points: 145, gearTier: 3, gearSlots: 8 },
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
  ...loadJson('public/mosters/dark-forest/dark-forest.21-30.json').map((m) => ({ ...m, origin: 'nativ' })),
  ...loadJson('public/mosters/dark-forest/dark-forest.21-30.veteran.json').map((m) => ({ ...m, origin: 'veteran' })),
];

console.log(`🧪 Baseline-Check Bracket 21-30: ${CHECKPOINTS.length} Referenz-Charaktere x ${MONSTERS.length} Monster x ${RUNS} Runs\n`);

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
      `  vs [${monster.origin === 'veteran' ? 'VET' : 'NAT'}] ${monster.name.padEnd(28)} (HP ${String(monster.hp).padStart(3)}, ATK ${String(monster.attack).padStart(3)}): ` +
      `Winrate ${(winRate * 100).toFixed(1).padStart(5)}%  Tod ${(died / RUNS * 100).toFixed(1).padStart(4)}%  Ø Runden ${(totalRounds / RUNS).toFixed(1)}`,
    );
    report.push({ checkpoint: cp.label, monster: monster.name, origin: monster.origin, winRate, died: died / RUNS, timedOut: timedOut / RUNS, avgRounds: totalRounds / RUNS });
  }
}

const outPath = path.join(ROOT, 'scripts', 'output', 'fight-tool-baseline-report-21-30.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`\n💾 Gespeichert unter: ${path.relative(ROOT, outPath)}`);

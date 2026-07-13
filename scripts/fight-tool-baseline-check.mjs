// scripts/fight-tool-baseline-check.mjs
//
// Ergänzt fight-tool-balance-sim.mjs (1000 zufällige T1-Builds) um einen
// kontrollierten Vergleich: WENIGE, klar definierte Referenz-Charaktere
// (blutiger Anfänger ... voll T1 + 30 Punkte) je EINZELN gegen JEDES der 7
// Bracket-1-10-Monster getestet — zeigt die Power-Kurve von unten nach oben,
// nicht nur zufällige Stichproben.
//
// Nutzung: node scripts/fight-tool-baseline-check.mjs [runsPerMatchup]
// Default: 5000 Runs pro (Charakter, Monster)-Paar.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCombatStats, simulateRun, hasEquippedWeaponType } from './lib/fight-tool-sim-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RUNS = Number(process.argv[2]) || 5000;

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf-8'));
}

const T1 = {
  head: loadJson('public/item-data/equipment/head/head_tier1.json'),
  chest: loadJson('public/item-data/equipment/chest/chest_tier1.json'),
  leg: loadJson('public/item-data/equipment/leg/leg_tier1.json'),
  gloves: loadJson('public/item-data/equipment/gloves/gloves_tier1.json'),
  footwear: loadJson('public/item-data/equipment/footwear/footwear_tier1.json'),
  necklace: loadJson('public/item-data/equipment/necklace/necklace_tier1.json'),
  ring: loadJson('public/item-data/equipment/ring/ring_tier1.json'),
  weapon: loadJson('public/item-data/weapons/weapon_tier1.json'),
};
const PASSIVES = loadJson('public/item-data/passives.json');

// 🧪 Kalibrierungs-Overrides für Tuning-Iterationen (per ENV, NICHT persistiert) —
// ATTACK_MULT/LUCK_MULT skalieren attack/luck aller Bracket-1-10-Monster testweise,
// damit man vor dem tatsächlichen JSON-Edit erst den Ziel-Bereich findet.
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

// Alle Spell-Tiers laden (Monster können grundsätzlich jede ID referenzieren).
const ALL_SPELLS = [
  ...['tier1', 'tier2', 'tier3', 'tier4', 'tier5'].flatMap((t) => loadJson(`public/item-data/skills/physical/physicalspells_${t}.json`)),
  ...['tier1', 'tier2', 'tier3', 'tier4', 'tier5'].flatMap((t) => loadJson(`public/item-data/skills/heal/healspells_${t}.json`)),
  ...['tier1', 'tier2', 'tier3', 'tier4', 'tier5'].flatMap((t) => loadJson(`public/item-data/skills/energy-shield/energyshieldspells_${t}.json`)),
  ...['tier1', 'tier2', 'tier3', 'tier4', 'tier5'].flatMap((t) => loadJson(`public/item-data/skills/magic/fire/firespells_${t}.json`)),
  ...['tier1', 'tier2', 'tier3', 'tier4', 'tier5'].flatMap((t) => loadJson(`public/item-data/skills/magic/cold/coldspells_${t}.json`)),
  ...['tier1', 'tier2', 'tier3', 'tier4', 'tier5'].flatMap((t) => loadJson(`public/item-data/skills/magic/lightning/lightningspells_${t}.json`)),
  ...['tier1', 'tier2', 'tier3', 'tier4', 'tier5'].flatMap((t) => loadJson(`public/item-data/skills/magic/chaos/chaosspells_${t}.json`)),
];
const SPELLS_BY_ID = new Map(ALL_SPELLS.map((s) => [s.id, s]));

const STARTER_SWORD = {
  name: 'Verrostetes Kurzschwert',
  'armor-slot': 'weapon-1',
  'weapon-type': 'schnitt',
  stats: {
    intelligence: 0, dexterity: 0, strength: 0, vitality: 0, luck: 0,
    'energy-shield': 0, 'magic-find': 0, armor: 0, attack: 12,
    'magic-attack': 0, initiative: 0, evasion: 0, 'crit-chance': 0, 'crit-damage': 0, chaosDamage: 0,
    'magic-damage-fire': 0, 'magic-damage-cold': 0, 'magic-damage-lightning': 0,
    resistances: { fire: 0, cold: 0, lightning: 0, chaos: 0 },
  },
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const CHARACTERS = [
  {
    label: 'Blutiger Anfänger (0 Punkte, nur Start-Schwert)',
    slots: { 'weapon-1': STARTER_SWORD },
    investedPoints: { strength: 0, dexterity: 0, intelligence: 0, vitality: 0 },
  },
  {
    label: 'Halbwegs ausgerüstet (4 von 8 Slots T1, 15 Punkte)',
    slots: {
      head: pick(T1.head), chest: pick(T1.chest), 'weapon-1': pick(T1.weapon.filter((w) => String(w.hands) === '1')),
      necklace: pick(T1.necklace),
    },
    investedPoints: { strength: 5, dexterity: 4, intelligence: 3, vitality: 3 },
  },
  {
    label: 'Voll T1 ausgerüstet (alle 8 Slots + 1H/1H-Waffen, 30 Punkte)',
    slots: {
      head: pick(T1.head), chest: pick(T1.chest), leg: pick(T1.leg), gloves: pick(T1.gloves),
      footwear: pick(T1.footwear), necklace: pick(T1.necklace),
      'ring-left': pick(T1.ring), 'ring-right': pick(T1.ring),
      'weapon-1': pick(T1.weapon.filter((w) => String(w.hands) === '1')),
      'weapon-2': pick(T1.weapon.filter((w) => String(w.hands) === '1')),
    },
    investedPoints: { strength: 8, dexterity: 8, intelligence: 7, vitality: 7 },
  },
];

console.log(`🧪 Baseline-Check: ${CHARACTERS.length} Referenz-Charaktere x ${MONSTERS_1_10.length} Monster x ${RUNS} Runs\n`);

const report = [];

for (const character of CHARACTERS) {
  console.log(`\n=== ${character.label} ===`);
  const playerStats = computeCombatStats(character.slots, character.investedPoints, PASSIVES);
  console.log(
    `  HP=${playerStats.hp} Mana=${playerStats.mana} Schild=${Math.round(playerStats['energy-shield'])} ` +
    `Angriff=${playerStats.attackMin}-${playerStats.attackMax} Rüstung=${playerStats.armor} Ausweichen=${playerStats.evasion}`,
  );

  for (const monster of MONSTERS_1_10) {
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
      `  vs ${monster.name.padEnd(24)} (HP ${String(monster.hp).padStart(3)}, ATK ${String(monster.attack).padStart(3)}): ` +
      `Winrate ${(winRate * 100).toFixed(1).padStart(5)}%  Ø Runden ${(totalRounds / RUNS).toFixed(1)}`,
    );
    report.push({ character: character.label, monster: monster.name, winRate, avgRounds: totalRounds / RUNS });
  }
}

const outPath = path.join(ROOT, 'scripts', 'output', 'fight-tool-baseline-report.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`\n💾 Gespeichert unter: ${path.relative(ROOT, outPath)}`);

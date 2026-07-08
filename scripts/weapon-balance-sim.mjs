// scripts/weapon-balance-sim.mjs
//
// Kalibrierungs-Helfer für die 40 Waffen-Items (5 Tiers x 8 Items). Ersetzt den
// flachen GEAR_BY_TIER.attack-Bonus aus balance-sim.mjs testweise durch einen
// echten Waffen-Range-Roll (min..max pro Treffer) und prüft, ob die Sieg-Rate
// pro Bracket weiterhin im Zielkorridor bleibt (siehe balance-sim.mjs Report).
//
// Nutzung: node scripts/weapon-balance-sim.mjs

import { BRACKET_ORDER, BRACKETS, ROLES, buildMonster } from './balance-sim.mjs';

const ITERATIONS = 3000;

function rollDie(sides) {
  return 1 + Math.floor(Math.random() * sides);
}

function rollBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** 1:1 Basiswerte + Skalierung wie playerAtLevel() in balance-sim.mjs, aber OHNE Gear-Attack —
 *  der wird hier durch den Waffen-Roll ersetzt. Andere Gear-Boni (Evasion/Luck/Crit/HP) bleiben. */
const NON_WEAPON_GEAR_BY_TIER = {
  0: { evasion: 0, luck: 0, critChance: 0, critDamage: 0, hp: 0 },
  1: { evasion: 4, luck: 2, critChance: 2, critDamage: 5, hp: 15 },
  2: { evasion: 9, luck: 4, critChance: 4, critDamage: 10, hp: 35 },
  3: { evasion: 15, luck: 6, critChance: 6, critDamage: 16, hp: 60 },
  4: { evasion: 22, luck: 9, critChance: 9, critDamage: 24, hp: 95 },
  5: { evasion: 32, luck: 13, critChance: 13, critDamage: 34, hp: 140 },
};

function playerAtLevelWithWeapon(level, gearTier, weaponMin, weaponMax) {
  const statPoints = 5 * (level - 1);
  const perStat = Math.floor(statPoints / 4);
  const remainder = statPoints - perStat * 4;

  const strength = 5 + perStat;
  const vitality = 5 + perStat + remainder;

  const gear = NON_WEAPON_GEAR_BY_TIER[gearTier] ?? NON_WEAPON_GEAR_BY_TIER[0];

  const baseAttack = 5 + strength * 2; // ohne Waffen-Anteil
  const weaponRoll = rollBetween(weaponMin, weaponMax);
  const attack = baseAttack + weaponRoll;

  const hp = 100 + vitality * 3 + gear.hp;
  const luck = 5 + gear.luck;
  const critChance = 5 + Math.floor(luck * 0.2) + gear.critChance;
  const critDamage = 150 + gear.critDamage;
  const evasion = 5 + gear.evasion;
  const initiative = 10 + (5 + perStat) * 2;

  return { hp, attack, initiative, evasion, luck, critChance, critDamage };
}

function resolveAttack(rawDamage, { attackerLuck, attackerCritChance, attackerCritDamage, defenderEvasion }) {
  const defenseTotal = rollDie(20) + defenderEvasion;
  const attackTotal = rollDie(20) + attackerLuck;
  if (defenseTotal >= attackTotal) return { finalDamage: 0, dodged: true };

  const critChancePercent = rollDie(10) + attackerCritChance - 5;
  if (Math.random() * 100 < critChancePercent) {
    const finalDamage = Math.round(rawDamage * (1 + attackerCritDamage / 2 / 100));
    return { finalDamage, dodged: false };
  }
  return { finalDamage: rawDamage, dodged: false };
}

function rollInitiative(playerInitiative, monsterInitiative) {
  const diff = playerInitiative - monsterInitiative;
  return rollDie(20) + diff > 10 ? 'player' : 'monster';
}

function simulateOneFight(playerBase, monster, weaponMin, weaponMax) {
  let playerHp = playerBase.hp;
  let monsterHp = monster.hp;
  let turn = rollInitiative(playerBase.initiative, monster.initiative);
  let rounds = 0;

  while (playerHp > 0 && monsterHp > 0 && rounds < 300) {
    if (turn === 'player') {
      const rawDamage = playerBase.baseAttack + rollBetween(weaponMin, weaponMax);
      const { finalDamage, dodged } = resolveAttack(rawDamage, {
        attackerLuck: playerBase.luck,
        attackerCritChance: playerBase.critChance,
        attackerCritDamage: playerBase.critDamage,
        defenderEvasion: monster.evasion,
      });
      if (!dodged) monsterHp -= finalDamage;
      turn = 'monster';
    } else {
      let rawDamage = monster.attack;
      if (monster.hasSpell && Math.random() > 0.5) rawDamage = monster.spellValue + monster.magicAttack;
      const scaled = Math.round(rawDamage * (0.75 + Math.random() * 0.25));
      const { finalDamage, dodged } = resolveAttack(scaled, {
        attackerLuck: monster.luck,
        attackerCritChance: monster.critChance,
        attackerCritDamage: monster.critDamage,
        defenderEvasion: playerBase.evasion,
      });
      if (!dodged) playerHp -= finalDamage;
      turn = 'player';
      rounds++;
    }
  }

  const playerWon = monsterHp <= 0 && playerHp > 0;
  return { playerWon, rounds, hpLostFraction: playerWon ? 1 - Math.max(0, playerHp) / playerBase.hp : 1 };
}

function runBattery(level, gearTier, weaponMin, weaponMax, monster, iterations = ITERATIONS) {
  const statPoints = 5 * (level - 1);
  const perStat = Math.floor(statPoints / 4);
  const strength = 5 + perStat;
  const playerBase = { ...playerAtLevelWithWeapon(level, gearTier, weaponMin, weaponMax), baseAttack: 5 + strength * 2 };

  let wins = 0, totalRounds = 0, totalHpLost = 0;
  for (let i = 0; i < iterations; i++) {
    const result = simulateOneFight(playerBase, monster, weaponMin, weaponMax);
    if (result.playerWon) wins++;
    totalRounds += result.rounds;
    totalHpLost += result.hpLostFraction;
  }
  return { winRate: wins / iterations, avgRounds: totalRounds / iterations, avgHpLostPct: (totalHpLost / iterations) * 100 };
}

function formatPct(x) {
  return `${(x * 100).toFixed(0)}%`;
}

// Kandidaten-Ranges pro Tier: [1H min, 1H max, 2H min, 2H max]
const CANDIDATES = {
  '1-10': [8, 14, 12, 20],
  '11-20': [18, 28, 26, 40],
  '21-30': [30, 44, 42, 62],
  '31-40': [42, 60, 58, 84],
  '41-50': [54, 76, 74, 106],
};

console.log('='.repeat(100));
console.log(`Waffen-Range-Kalibrierung (${ITERATIONS} Kämpfe je Matchup)`);
console.log('='.repeat(100));

BRACKET_ORDER.forEach((bracketKey, idx) => {
  const b = BRACKETS[bracketKey];
  const [oneMin, oneMax, twoMin, twoMax] = CANDIDATES[bracketKey];
  const prevBracketKey = idx > 0 ? BRACKET_ORDER[idx - 1] : null;
  const prevGearTier = prevBracketKey ? BRACKETS[prevBracketKey].gearTier : 0;
  const [prevOneMin, prevOneMax, prevTwoMin, prevTwoMax] = prevBracketKey ? CANDIDATES[prevBracketKey] : [3, 6, 4, 8];

  console.log(`\n### Bracket ${bracketKey} — 1H ${oneMin}-${oneMax} / 2H ${twoMin}-${twoMax} ###`);

  const scenarios = [
    { label: `Start (Lvl ${b.startLevel}, Gear T${prevGearTier}, Vor-Tier-Waffe)`, level: b.startLevel, gearTier: prevGearTier, oneMin: prevOneMin, oneMax: prevOneMax, twoMin: prevTwoMin, twoMax: prevTwoMax },
    { label: `Ende (Lvl ${b.endLevel}, Gear T${b.gearTier}, eigene Waffe)`, level: b.endLevel, gearTier: b.gearTier, oneMin, oneMax, twoMin, twoMax },
  ];

  for (const s of scenarios) {
    console.log(`\n  -- ${s.label} --`);
    console.log('  Waffe | Rolle       | Sieg-Rate | ⌀ Runden | ⌀ HP-Verlust');
    console.log('  ' + '-'.repeat(64));
    for (const [label, min, max] of [['1H', s.oneMin, s.oneMax], ['2H', s.twoMin, s.twoMax]]) {
      for (const roleKey of Object.keys(ROLES)) {
        const monster = buildMonster(bracketKey, roleKey);
        const result = runBattery(s.level, s.gearTier, min, max, monster);
        console.log(
          `  ${label.padEnd(5)} | ${roleKey.padEnd(11)} | ${formatPct(result.winRate).padStart(9)} | ${result.avgRounds.toFixed(1).padStart(8)} | ${result.avgHpLostPct.toFixed(0).padStart(11)}%`,
        );
      }
    }
  }
});

console.log('\n' + '='.repeat(100));
console.log('Zielkorridor "normal" (grunt/scout/caster/beast): Sieg-Rate 65-90%, 3-8 Runden, 15-45% HP-Verlust');
console.log('Zielkorridor "hart"   (brute/elite/aberration):   Sieg-Rate 45-80%, 4-10 Runden, 25-60% HP-Verlust');

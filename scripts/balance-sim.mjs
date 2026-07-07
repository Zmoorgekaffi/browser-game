// scripts/balance-sim.mjs
import { pathToFileURL } from 'node:url';
//
// Standalone Node-Simulation der Kampf-Mathematik aus src/app/services/fight.service.ts,
// um Monster-Stats gegen einen angenommenen Durchschnitts-Charakter zu balancen, OHNE
// hunderte manuelle Kämpfe im Browser zu spielen.
//
// Nachgebildet (1:1 aus fight.service.ts):
//  - resolveAttack(): Ausweichen (1w20+Evasion vs. 1w20+Glück), dann Krit
//    (1w10+CritChance-5 = %, Multiplikator 1+critDamage/2/100)
//  - applyDamageToPlayer(): Monster-Schaden wird zusätzlich 0.75-1.0 zufällig skaliert
//  - monsterTurn(): 50% Chance/Zug auf Spell statt Basisangriff (falls Monster Spells hat)
//  - rollInitiative(): 1w20 + (playerInit - monsterInit) > 10 → Spieler beginnt
//
// Spieler-Baseline: NUR Basisangriff (kein Spellcast) — das ist die konservative
// Untergrenze der Spieler-Power (siehe applyAttributeScaling() in skills.service.ts).
//
// Ausrüstung: Evasion/Glück/Crit wachsen im echten Spiel NUR über Ausrüstung (nicht über
// Attributspunkte). Ein "bare" (0 Gear) Charakter oberhalb von Level 1 ist unrealistisch —
// wer Level 11+ ist, hat unterwegs Tier-1(+)-Loot gesammelt. Deshalb: "Start" eines Brackets
// nimmt an, dass der Charakter noch die Ausrüstung des VORHERIGEN Brackets trägt, "Ende"
// nimmt die eigene Tier-Ausrüstung des Brackets an. Nur Bracket 1-10 startet bei 0 Gear
// (echter Frischling).
//
// Nutzung: node scripts/balance-sim.mjs

const ITERATIONS = 3000;

function rollDie(sides) {
  return 1 + Math.floor(Math.random() * sides);
}

/** Sauber durchgestufte, "vernünftig itemisierte" Ausrüstungs-Boni pro Tier (0 = kein Gear). */
const GEAR_BY_TIER = {
  0: { attack: 0, magicAttack: 0, evasion: 0, luck: 0, critChance: 0, critDamage: 0, hp: 0 },
  1: { attack: 4, magicAttack: 4, evasion: 4, luck: 2, critChance: 2, critDamage: 5, hp: 15 },
  2: { attack: 9, magicAttack: 9, evasion: 9, luck: 4, critChance: 4, critDamage: 10, hp: 35 },
  3: { attack: 15, magicAttack: 15, evasion: 15, luck: 6, critChance: 6, critDamage: 16, hp: 60 },
  4: { attack: 24, magicAttack: 24, evasion: 22, luck: 9, critChance: 9, critDamage: 24, hp: 95 },
  5: { attack: 35, magicAttack: 35, evasion: 32, luck: 13, critChance: 13, critDamage: 34, hp: 140 },
};

/** 1:1 Port von SkillsService.applyAttributeScaling() + Basiswerten + Gear-Bonus. */
function playerAtLevel(level, gearTier = 0) {
  const statPoints = 5 * (level - 1);
  const perStat = Math.floor(statPoints / 4);
  const remainder = statPoints - perStat * 4;

  const strength = 5 + perStat;
  const dexterity = 5 + perStat;
  const intelligence = 5 + perStat;
  const vitality = 5 + perStat + remainder; // Rest-Punkte in Vitalität geparkt

  const gear = GEAR_BY_TIER[gearTier] ?? GEAR_BY_TIER[0];

  const attack = 5 + strength * 2 + gear.attack;
  const magicAttack = 5 + intelligence * 2 + gear.magicAttack;
  const initiative = 10 + dexterity * 2;
  const hp = 100 + vitality * 3 + gear.hp;
  const mana = 20 + intelligence * 5;
  const luck = 5 + gear.luck;
  const critChance = 5 + Math.floor(luck * 0.2) + gear.critChance;
  const critDamage = 150 + gear.critDamage;
  const evasion = 5 + gear.evasion;

  return { hp, mana, attack, magicAttack, initiative, evasion, luck, critChance, critDamage };
}

/** 1:1 Port von FightService.resolveAttack(). */
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

/** 1:1 Port von FightService.rollInitiative(). */
function rollInitiative(playerInitiative, monsterInitiative) {
  const diff = playerInitiative - monsterInitiative;
  const result = rollDie(20) + diff;
  return result > 10 ? 'player' : 'monster';
}

function simulateOneFight(player, monster) {
  let playerHp = player.hp;
  let monsterHp = monster.hp;
  let turn = rollInitiative(player.initiative, monster.initiative);
  let rounds = 0;

  while (playerHp > 0 && monsterHp > 0 && rounds < 300) {
    if (turn === 'player') {
      const { finalDamage, dodged } = resolveAttack(player.attack, {
        attackerLuck: player.luck,
        attackerCritChance: player.critChance,
        attackerCritDamage: player.critDamage,
        defenderEvasion: monster.evasion,
      });
      if (!dodged) monsterHp -= finalDamage;
      turn = 'monster';
    } else {
      let rawDamage = monster.attack;
      if (monster.hasSpell && Math.random() > 0.5) {
        rawDamage = monster.spellValue + monster.magicAttack;
      }
      const scaled = Math.round(rawDamage * (0.75 + Math.random() * 0.25));
      const { finalDamage, dodged } = resolveAttack(scaled, {
        attackerLuck: monster.luck,
        attackerCritChance: monster.critChance,
        attackerCritDamage: monster.critDamage,
        defenderEvasion: player.evasion,
      });
      if (!dodged) playerHp -= finalDamage;
      turn = 'player';
      rounds++;
    }
  }

  const playerWon = monsterHp <= 0 && playerHp > 0;
  return {
    playerWon,
    rounds,
    hpLostFraction: playerWon ? 1 - Math.max(0, playerHp) / player.hp : 1,
  };
}

function runBattery(player, monster, iterations = ITERATIONS) {
  let wins = 0;
  let totalRounds = 0;
  let totalHpLost = 0;

  for (let i = 0; i < iterations; i++) {
    const result = simulateOneFight(player, monster);
    if (result.playerWon) wins++;
    totalRounds += result.rounds;
    totalHpLost += result.hpLostFraction;
  }

  return {
    winRate: wins / iterations,
    avgRounds: totalRounds / iterations,
    avgHpLostPct: (totalHpLost / iterations) * 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Monster-Rollen: Multiplikatoren relativ zum Bracket-Base (Grunt = 1.0)
// ═══════════════════════════════════════════════════════════════════════

export const ROLES = {
  grunt: { hp: 1.0, attack: 1.0, initiative: 1.0, evasion: 1.0, luck: 1.0, critChance: 1.0, critDamage: 1.0, hasSpell: false, magicAttackMult: 1.0 },
  scout: { hp: 0.55, attack: 0.8, initiative: 1.3, evasion: 1.6, luck: 1.3, critChance: 1.5, critDamage: 1.1, hasSpell: false, magicAttackMult: 1.0 },
  caster: { hp: 0.65, attack: 0.5, initiative: 1.0, evasion: 1.0, luck: 1.0, critChance: 1.0, critDamage: 1.0, hasSpell: true, magicAttackMult: 1.5 },
  beast: { hp: 0.85, attack: 1.25, initiative: 1.15, evasion: 1.1, luck: 1.2, critChance: 1.4, critDamage: 1.5, hasSpell: false, magicAttackMult: 1.0 },
  brute: { hp: 1.6, attack: 1.3, initiative: 0.65, evasion: 0.85, luck: 0.9, critChance: 0.9, critDamage: 1.0, hasSpell: false, magicAttackMult: 1.0 },
  elite: { hp: 1.75, attack: 1.35, initiative: 1.0, evasion: 1.1, luck: 1.05, critChance: 1.1, critDamage: 1.15, hasSpell: true, magicAttackMult: 1.25 },
  aberration: { hp: 1.9, attack: 1.2, initiative: 0.9, evasion: 1.2, luck: 1.1, critChance: 1.05, critDamage: 1.1, hasSpell: true, magicAttackMult: 1.3 },
};

// ═══════════════════════════════════════════════════════════════════════
// Bracket-Basiswerte (werden hier iterativ getunt) + zugeordneter Spell.
// gearTier = Tier-Ausrüstung, die zum ENDE dieses Brackets angenommen wird
// (siehe TIER_DISTRIBUTION in dark-forest.class.ts).
// ═══════════════════════════════════════════════════════════════════════

export const BRACKET_ORDER = ['1-10', '11-20', '21-30', '31-40', '41-50'];

export const BRACKETS = {
  '1-10': { startLevel: 1, endLevel: 10, gearTier: 1, baseHp: 65, baseAttack: 14, baseMagicAttack: 12, baseInitiative: 10, baseEvasion: 5, baseLuck: 5, baseCritChance: 5, baseCritDamage: 150, spellValue: 20 },
  '11-20': { startLevel: 11, endLevel: 20, gearTier: 2, baseHp: 150, baseAttack: 32, baseMagicAttack: 28, baseInitiative: 20, baseEvasion: 7, baseLuck: 7, baseCritChance: 6, baseCritDamage: 150, spellValue: 45 },
  '21-30': { startLevel: 21, endLevel: 30, gearTier: 3, baseHp: 245, baseAttack: 52, baseMagicAttack: 46, baseInitiative: 32, baseEvasion: 9, baseLuck: 9, baseCritChance: 7, baseCritDamage: 155, spellValue: 70 },
  '31-40': { startLevel: 31, endLevel: 40, gearTier: 4, baseHp: 335, baseAttack: 71, baseMagicAttack: 58, baseInitiative: 40, baseEvasion: 12, baseLuck: 12, baseCritChance: 8, baseCritDamage: 160, spellValue: 130 },
  '41-50': { startLevel: 41, endLevel: 50, gearTier: 5, baseHp: 405, baseAttack: 88, baseMagicAttack: 72, baseInitiative: 50, baseEvasion: 15, baseLuck: 15, baseCritChance: 9, baseCritDamage: 165, spellValue: 180 },
};

export function buildMonster(bracketKey, roleKey) {
  const b = BRACKETS[bracketKey];
  const r = ROLES[roleKey];
  return {
    hp: Math.round(b.baseHp * r.hp),
    attack: Math.round(b.baseAttack * r.attack),
    magicAttack: Math.round(b.baseMagicAttack * r.magicAttackMult),
    initiative: Math.round(b.baseInitiative * r.initiative),
    evasion: Math.round(b.baseEvasion * r.evasion),
    luck: Math.round(b.baseLuck * r.luck),
    critChance: Math.round(b.baseCritChance * r.critChance),
    critDamage: Math.round(b.baseCritDamage * r.critDamage),
    hasSpell: r.hasSpell,
    spellValue: b.spellValue,
  };
}

function formatPct(x) {
  return `${(x * 100).toFixed(0)}%`;
}

// Nur ausführen, wenn dieses Skript direkt gestartet wird (nicht beim
// Import der exportierten Tabellen/Funktionen aus generate-monsters.mjs).
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
runSimulationReport();
}

function runSimulationReport() {
console.log('='.repeat(100));
console.log(`Balance-Simulation (${ITERATIONS} Kämpfe je Matchup)`);
console.log('='.repeat(100));

BRACKET_ORDER.forEach((bracketKey, idx) => {
  const b = BRACKETS[bracketKey];
  const prevBracketKey = idx > 0 ? BRACKET_ORDER[idx - 1] : null;
  const startGearTier = prevBracketKey ? BRACKETS[prevBracketKey].gearTier : 0;

  console.log(`\n### Bracket ${bracketKey} ###`);

  const scenarios = [
    { label: `Start (Lvl ${b.startLevel}, Gear T${startGearTier})`, player: playerAtLevel(b.startLevel, startGearTier) },
    { label: `Ende (Lvl ${b.endLevel}, Gear T${b.gearTier})`, player: playerAtLevel(b.endLevel, b.gearTier) },
  ];

  for (const scenario of scenarios) {
    console.log(`\n  -- ${scenario.label} -- (Spieler: HP=${Math.round(scenario.player.hp)}, Attack=${Math.round(scenario.player.attack)}, Evasion=${Math.round(scenario.player.evasion)}, Luck=${Math.round(scenario.player.luck)})`);
    console.log('  Rolle       | Sieg-Rate | ⌀ Runden | ⌀ HP-Verlust');
    console.log('  ' + '-'.repeat(58));
    for (const roleKey of Object.keys(ROLES)) {
      const monster = buildMonster(bracketKey, roleKey);
      const result = runBattery(scenario.player, monster);
      console.log(
        `  ${roleKey.padEnd(11)} | ${formatPct(result.winRate).padStart(9)} | ${result.avgRounds.toFixed(1).padStart(8)} | ${result.avgHpLostPct.toFixed(0).padStart(11)}%`,
      );
    }
  }
});

console.log('\n' + '='.repeat(100));
console.log('Zielkorridor "normal" (grunt/scout/caster/beast): Sieg-Rate 65-90%, 3-8 Runden, 15-45% HP-Verlust');
console.log('Zielkorridor "hart"   (brute/elite/aberration):   Sieg-Rate 45-80%, 4-10 Runden, 25-60% HP-Verlust');

// ═══════════════════════════════════════════════════════════════════════
// --dump: rohe Stat-Blöcke je Bracket/Rolle als JSON ausgeben (Basis für
// die finalen Monster-JSONs — Namen/Lore/Sprite-Pfade werden von Hand ergänzt).
// ═══════════════════════════════════════════════════════════════════════
if (process.argv.includes('--dump')) {
  console.log('\n' + '='.repeat(100));
  console.log('RAW STAT DUMP');
  console.log('='.repeat(100));
  for (const bracketKey of BRACKET_ORDER) {
    const dump = {};
    for (const roleKey of Object.keys(ROLES)) {
      dump[roleKey] = buildMonster(bracketKey, roleKey);
    }
    console.log(`\n-- ${bracketKey} --`);
    console.log(JSON.stringify(dump, null, 2));
  }
}
} // Ende runSimulationReport()

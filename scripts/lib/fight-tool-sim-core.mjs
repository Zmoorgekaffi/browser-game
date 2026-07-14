// scripts/lib/fight-tool-sim-core.mjs
//
// Gemeinsamer Kern für alle Fight-Tool-Balance-Skripte (fight-tool-balance-sim.mjs,
// fight-tool-baseline-check.mjs, ...): Stat-Aggregation + Kampf-Simulation, OHNE
// Angular-Abhängigkeiten (kein DI, kein Browser) — läuft pur in Node.
//
// 1:1 Port von:
//  - Stat-Aggregation: src/app/services/skills.service.ts (statBreakdown-Kette)
//  - Kampf-Formeln: src/app/utils/fight-simulator.util.ts (selbst schon ein Port
//    von FightService/SpellsEngineService)
//
// ⚠️ Bei Änderungen an SkillsService/FightService/SpellsEngineService/
// fight-simulator.util.ts MUSS dieses Modul manuell nachgezogen werden, sonst
// driftet die Analyse von der echten Kampf-Logik ab.

// ─────────────────────────────────────────────────────────────────────────
// 🧮 Stat-Aggregation — Port von SkillsService.statBreakdown
// ─────────────────────────────────────────────────────────────────────────

export const RESISTANCE_KEYS = ['fire', 'cold', 'lightning', 'chaos'];
export const ELEMENT_KEYS = RESISTANCE_KEYS;
export const ELEMENT_DAMAGE_STAT_KEYS = {
  fire: 'magicDamageFire', cold: 'magicDamageCold', lightning: 'magicDamageLightning', chaos: 'chaosDamage',
};
export const ELEMENT_DAMAGE_MULTIPLIER_KEYS = {
  fire: 'fireDamageMultiplier', cold: 'coldDamageMultiplier', lightning: 'lightningDamageMultiplier', chaos: 'chaosDamageMultiplier',
};
const FLAT_STAT_MAP = [
  ['armor', 'armor'], ['energy-shield', 'energy-shield'], ['hp-regeneration', 'hp-regeneration'],
  ['mana-regeneration', 'mana-regeneration'], ['magic-find', 'magic-find'], ['initiative', 'initiative'],
  ['evasion', 'evasion'], ['crit-chance', 'critChance'], ['crit-damage', 'critDamage'],
  ['chaosDamage', 'chaosDamage'], ['magic-damage-fire', 'magicDamageFire'],
  ['magic-damage-cold', 'magicDamageCold'], ['magic-damage-lightning', 'magicDamageLightning'],
];
export const EQUIPMENT_SLOTS = ['head', 'chest', 'leg', 'gloves', 'footwear', 'necklace', 'ring-left', 'ring-right', 'weapon-1', 'weapon-2'];

export const DEFAULT_BASE = {
  intelligence: 5, dexterity: 5, strength: 5, vitality: 5, luck: 5,
  'energy-shield': 0, 'magic-find': 0, armor: 0, hp: 100, 'hp-regeneration': 0,
  mana: 20, 'mana-regeneration': 3, attack: 5, magicAttack: 5, initiative: 10, evasion: 5,
  critChance: 5, critDamage: 150, chaosDamage: 0,
  magicDamageFire: 0, magicDamageCold: 0, magicDamageLightning: 0,
  resistances: { fire: 0, cold: 0, lightning: 0, chaos: 0 },
};

function zeroMagicAttackByElement() {
  return { fire: { min: 0, max: 0 }, cold: { min: 0, max: 0 }, lightning: { min: 0, max: 0 }, chaos: { min: 0, max: 0 } };
}

function deriveAttackScalars(stats) {
  stats.attack = Math.round((stats.attackMin + stats.attackMax) / 2);
  const elementAverageSum = ELEMENT_KEYS.reduce((sum, el) => {
    const range = stats.magicAttackByElement?.[el];
    return sum + (range ? (range.min + range.max) / 2 : 0);
  }, 0);
  stats.magicAttack = Math.round((stats.magicAttackMin + stats.magicAttackMax) / 2 + elementAverageSum);
}

function createBaseCombatStats(base) {
  const stats = {
    intelligence: base.intelligence, dexterity: base.dexterity, strength: base.strength,
    vitality: base.vitality, luck: base.luck,
    'energy-shield': base['energy-shield'], 'magic-find': base['magic-find'], armor: base.armor,
    hp: base.hp, 'hp-regeneration': base['hp-regeneration'] ?? 0,
    mana: base.mana, 'mana-regeneration': base['mana-regeneration'] ?? 0,
    attack: base.attack, magicAttack: base.magicAttack,
    attackMin: base.attack, attackMax: base.attack,
    magicAttackMin: base.magicAttack, magicAttackMax: base.magicAttack,
    magicAttackByElement: zeroMagicAttackByElement(),
    physicalDamageMultiplier: 1, magicDamageMultiplier: 1,
    fireDamageMultiplier: 1, coldDamageMultiplier: 1, lightningDamageMultiplier: 1, chaosDamageMultiplier: 1,
    initiative: base.initiative, evasion: base.evasion, critChance: base.critChance, critDamage: base.critDamage,
    chaosDamage: base.chaosDamage,
    magicDamageFire: base.magicDamageFire ?? 0, magicDamageCold: base.magicDamageCold ?? 0, magicDamageLightning: base.magicDamageLightning ?? 0,
    resistances: { ...base.resistances },
  };
  deriveAttackScalars(stats);
  return stats;
}

function cloneStats(stats) {
  const clonedByElement = {};
  for (const el of ELEMENT_KEYS) clonedByElement[el] = { ...stats.magicAttackByElement?.[el] };
  return { ...stats, resistances: { ...stats.resistances }, magicAttackByElement: clonedByElement };
}

function addFlatItemStats(finalStats, s) {
  for (const [itemKey, statsKey] of FLAT_STAT_MAP) {
    if (s[itemKey]) finalStats[statsKey] += Number(s[itemKey]);
  }
}
function addItemResistances(finalStats, s) {
  if (!s.resistances) return;
  for (const key of RESISTANCE_KEYS) {
    if (s.resistances[key]) finalStats.resistances[key] += Number(s.resistances[key]);
  }
}
function addItemAttributes(finalStats, s) {
  if (s.strength) finalStats.strength += Number(s.strength);
  if (s.intelligence) finalStats.intelligence += Number(s.intelligence);
  if (s.dexterity) finalStats.dexterity += Number(s.dexterity);
  if (s.vitality) finalStats.vitality += Number(s.vitality);
  if (s.luck) finalStats.luck += Number(s.luck);
}
function addWeaponRangeStats(finalStats, s, magicDamageType) {
  const flatAttack = Number(s['attack']) || 0;
  const flatMagicAttack = Number(s['magic-attack']) || 0;
  const dmgMin = Number(s['damage-min']) || 0;
  const dmgMax = Number(s['damage-max']) || 0;
  const magicDmgMin = Number(s['magic-damage-min']) || 0;
  const magicDmgMax = Number(s['magic-damage-max']) || 0;
  finalStats.attackMin += dmgMin + flatAttack;
  finalStats.attackMax += dmgMax + flatAttack;
  finalStats.magicAttackMin += flatMagicAttack;
  finalStats.magicAttackMax += flatMagicAttack;
  const elementRange = magicDamageType ? finalStats.magicAttackByElement?.[magicDamageType] : null;
  if (elementRange) {
    elementRange.min += magicDmgMin;
    elementRange.max += magicDmgMax;
  } else {
    finalStats.magicAttackMin += magicDmgMin;
    finalStats.magicAttackMax += magicDmgMax;
  }
}

function applyAttributeScaling(finalStats) {
  finalStats.physicalDamageMultiplier = 1 + finalStats.strength / 10000;
  finalStats.initiative += finalStats.dexterity * 2;
  finalStats.magicDamageMultiplier = 1 + finalStats.intelligence / 1000;
  finalStats.mana += finalStats.intelligence * 5;
  finalStats['mana-regeneration'] += finalStats.intelligence * 0.2;
  finalStats['energy-shield'] += finalStats.intelligence * 2;
  finalStats.hp += finalStats.vitality * 3;
  finalStats['hp-regeneration'] += finalStats.vitality * 0.5;
  finalStats.critChance += Math.floor(finalStats.luck * 0.2);
  finalStats['magic-find'] += Math.floor(finalStats.luck * 0.5);
  for (const element of ELEMENT_KEYS) {
    const statKey = ELEMENT_DAMAGE_STAT_KEYS[element];
    const multiplierKey = ELEMENT_DAMAGE_MULTIPLIER_KEYS[element];
    finalStats[multiplierKey] = 1 + (finalStats[statKey] ?? 0) / 1000;
  }
}

function addPassiveEffects(finalStats, unlockedIds, passivesList) {
  if (!unlockedIds || unlockedIds.length === 0) return;
  const passives = unlockedIds.map((id) => passivesList.find((p) => p.id === id)).filter(Boolean);

  for (const passive of passives) {
    for (const effect of passive.effects) {
      if (effect.type === 'stat-flat') {
        if (effect.stat === 'attack') {
          finalStats.attackMin += effect.value;
          finalStats.attackMax += effect.value;
        } else if (effect.stat === 'magicAttack') {
          finalStats.magicAttackMin += effect.value;
          finalStats.magicAttackMax += effect.value;
        } else {
          finalStats[effect.stat] = (finalStats[effect.stat] ?? 0) + effect.value;
        }
      }
      if (effect.type === 'resistance') {
        for (const element of effect.elements) {
          finalStats.resistances[element] = (finalStats.resistances[element] ?? 0) + effect.value;
        }
      }
    }
  }
  for (const passive of passives) {
    for (const effect of passive.effects) {
      if (effect.type === 'stat-percent') {
        if (effect.stat === 'attack') {
          finalStats.attackMin = Math.round(finalStats.attackMin * (1 + effect.value / 100));
          finalStats.attackMax = Math.round(finalStats.attackMax * (1 + effect.value / 100));
        } else if (effect.stat === 'magicAttack') {
          finalStats.magicAttackMin = Math.round(finalStats.magicAttackMin * (1 + effect.value / 100));
          finalStats.magicAttackMax = Math.round(finalStats.magicAttackMax * (1 + effect.value / 100));
          for (const element of ELEMENT_KEYS) {
            const range = finalStats.magicAttackByElement[element];
            range.min = Math.round(range.min * (1 + effect.value / 100));
            range.max = Math.round(range.max * (1 + effect.value / 100));
          }
        } else {
          const current = finalStats[effect.stat] ?? 0;
          finalStats[effect.stat] = Math.round(current + current * (effect.value / 100));
        }
      }
    }
  }
}

export function derivePassiveIds(investedPoints, passivesList) {
  return passivesList.filter((p) => (investedPoints[p.stat] ?? 0) >= p.threshold).map((p) => p.id);
}

/**
 * @param equippedSlots Objekt { 'head': item|undefined, 'weapon-1': item|undefined, ... }
 * @param investedPoints { strength, dexterity, intelligence, vitality } — 0-100 je Stat
 * @param passivesList    Rohes passives.json-Array
 */
export function computeCombatStats(equippedSlots, investedPoints, passivesList) {
  const base = {
    ...DEFAULT_BASE,
    strength: DEFAULT_BASE.strength + investedPoints.strength,
    dexterity: DEFAULT_BASE.dexterity + investedPoints.dexterity,
    intelligence: DEFAULT_BASE.intelligence + investedPoints.intelligence,
    vitality: DEFAULT_BASE.vitality + investedPoints.vitality,
    resistances: { ...DEFAULT_BASE.resistances },
  };

  const baseLayer = createBaseCombatStats(base);
  const afterEquipment = cloneStats(baseLayer);
  for (const slotName of EQUIPMENT_SLOTS) {
    const item = equippedSlots[slotName];
    if (!item || !item.stats) continue;
    addFlatItemStats(afterEquipment, item.stats);
    addItemResistances(afterEquipment, item.stats);
    addItemAttributes(afterEquipment, item.stats);
    addWeaponRangeStats(afterEquipment, item.stats, item['magic-damage-type']);
  }
  deriveAttackScalars(afterEquipment);

  const afterMainStats = cloneStats(afterEquipment);
  applyAttributeScaling(afterMainStats);
  deriveAttackScalars(afterMainStats);

  const afterPassives = cloneStats(afterMainStats);
  addPassiveEffects(afterPassives, derivePassiveIds(investedPoints, passivesList), passivesList);
  deriveAttackScalars(afterPassives);

  return afterPassives;
}

export function hasEquippedWeaponType(equippedSlots, weaponType) {
  return equippedSlots['weapon-1']?.['weapon-type'] === weaponType || equippedSlots['weapon-2']?.['weapon-type'] === weaponType;
}

// ─────────────────────────────────────────────────────────────────────────
// ⚔️ Kampf-Simulation — 1:1 Port von src/app/utils/fight-simulator.util.ts
// ─────────────────────────────────────────────────────────────────────────

const MAX_ROUNDS_PER_STEP = 100;

function rollD(sides) {
  return 1 + Math.floor(Math.random() * sides);
}
export function rollBetween(min, max) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
const ARMOR_MITIGATION_K = 150;
const MAX_MITIGATION_PERCENT = 75;
export function applyArmorMitigation(damage, armor) {
  if (armor <= 0) return damage;
  const raw = (armor / (armor + ARMOR_MITIGATION_K)) * 100;
  const capped = Math.min(raw, MAX_MITIGATION_PERCENT);
  return Math.round(damage * (1 - capped / 100));
}
export function applyResistanceMitigation(damage, resistancePercent) {
  const capped = Math.min(Math.max(resistancePercent, 0), MAX_MITIGATION_PERCENT);
  return Math.round(damage * (1 - capped / 100));
}

function resolveAttack(rawDamage, attacker, defenderEvasion) {
  const defenseTotal = rollD(20) + defenderEvasion;
  const attackTotal = rollD(20) + attacker.luck;
  if (defenseTotal >= attackTotal) return { finalDamage: 0, dodged: true };

  const critChancePercent = rollD(10) + attacker.critChance - 5;
  if (Math.random() * 100 < critChancePercent) {
    const critMultiplierPercent = attacker.critDamage / 2;
    return { finalDamage: Math.round(rawDamage * (1 + critMultiplierPercent / 100)), dodged: false };
  }
  return { finalDamage: rawDamage, dodged: false };
}

function drainEnergyShield(shield, damage) {
  if (shield.value <= 0) return damage;
  const absorbed = Math.min(shield.value, damage);
  shield.value -= absorbed;
  return damage - absorbed;
}

function applyDamageToMonster(step, playerStats, monster, damage, damageType) {
  const { finalDamage, dodged } = resolveAttack(
    damage,
    { luck: playerStats.luck ?? 0, critChance: playerStats.critChance ?? 0, critDamage: playerStats.critDamage ?? 0 },
    monster.evasion ?? 0,
  );
  if (dodged) return;
  const mitigated = damageType === 'physical' ? applyArmorMitigation(finalDamage, monster.armor ?? 0) : finalDamage;
  const shieldRef = { value: step.monsterEnergyShield };
  const remaining = drainEnergyShield(shieldRef, mitigated);
  step.monsterEnergyShield = shieldRef.value;
  step.monsterHp = Math.max(0, step.monsterHp - remaining);
}

function applyDamageToPlayer(run, playerStats, monster, damage, damageType) {
  const scaledDamage = Math.round(damage * (0.75 + Math.random() * 0.25));
  const { finalDamage, dodged } = resolveAttack(
    scaledDamage,
    { luck: monster.luck ?? 0, critChance: monster.critChance ?? 0, critDamage: monster.critDamage ?? 0 },
    playerStats.evasion ?? 0,
  );
  if (dodged) return;
  const mitigated = damageType === 'physical' ? applyArmorMitigation(finalDamage, playerStats.armor ?? 0) : finalDamage;
  const shieldRef = { value: run.playerEnergyShield };
  const remaining = drainEnergyShield(shieldRef, mitigated);
  run.playerEnergyShield = shieldRef.value;
  run.playerHp = Math.max(0, run.playerHp - remaining);
}

function castSpellSim(spell, casterType, run, step, playerStats, monster) {
  if (casterType === 'player') {
    run.playerMana = Math.max(0, run.playerMana - (spell.manaCost ?? 0));
  }
  const bonusAttack = casterType === 'player' ? rollBetween(playerStats.attackMin, playerStats.attackMax) : monster.attack || 10;
  const bonusMagic = casterType === 'player' ? rollBetween(playerStats.magicAttackMin, playerStats.magicAttackMax) : monster.magicAttack || 10;

  switch (spell.effectType) {
    case 'PHYSICAL_DAMAGE': {
      let totalDamage = Number(spell.effectValues.value) + bonusAttack;
      if (casterType === 'player') {
        totalDamage = Math.round(totalDamage * (playerStats.physicalDamageMultiplier ?? 1));
        applyDamageToMonster(step, playerStats, monster, totalDamage, 'physical');
      } else {
        applyDamageToPlayer(run, playerStats, monster, totalDamage, 'physical');
      }
      break;
    }
    case 'ELEMENTAL_DAMAGE': {
      const element = spell.effectValues.element;
      const elementRange = casterType === 'player' ? playerStats.magicAttackByElement?.[element] : null;
      const elementBonus = elementRange ? rollBetween(elementRange.min, elementRange.max) : 0;
      let totalDamage = Number(spell.effectValues.value) + bonusMagic + elementBonus;
      if (casterType === 'player') {
        const elementMultiplierKey = ELEMENT_DAMAGE_MULTIPLIER_KEYS[element];
        const elementDamageMultiplier = playerStats[elementMultiplierKey] ?? 1;
        totalDamage = Math.round(totalDamage * (playerStats.magicDamageMultiplier ?? 1) * elementDamageMultiplier);
        const defenderResistance = monster?.resistances?.[element] ?? 0;
        totalDamage = applyResistanceMitigation(totalDamage, defenderResistance);
        applyDamageToMonster(step, playerStats, monster, totalDamage, 'elemental');
      } else {
        const defenderResistance = playerStats.resistances?.[element] ?? 0;
        totalDamage = applyResistanceMitigation(totalDamage, defenderResistance);
        applyDamageToPlayer(run, playerStats, monster, totalDamage, 'elemental');
      }
      break;
    }
    case 'HEAL': {
      const healAmount = Number(spell.effectValues.value);
      if (casterType === 'player') {
        run.playerHp = Math.min(run.playerMaxHp, run.playerHp + healAmount);
      } else {
        step.monsterHp = Math.min(step.monsterMaxHp, step.monsterHp + healAmount);
      }
      break;
    }
    case 'ENERGY_SHIELD_RESTORE': {
      const shieldAmount = Number(spell.effectValues.value);
      if (casterType === 'player') {
        run.playerEnergyShield = Math.min(run.playerMaxEnergyShield, run.playerEnergyShield + shieldAmount);
      } else {
        step.monsterEnergyShield = Math.min(step.monsterMaxEnergyShield, step.monsterEnergyShield + shieldAmount);
      }
      break;
    }
  }
}

function rollInitiative(playerInitiative, monsterInitiative) {
  const diff = playerInitiative - monsterInitiative;
  const result = rollD(20) + diff;
  return result > 10 ? 'player' : 'monster';
}

function pickPlayerAction(equippedSpells, playerMana, hasWeaponType) {
  for (const spell of equippedSpells) {
    if (!spell) continue;
    if ((spell.manaCost ?? 0) > playerMana) continue;
    if (spell.requiredWeaponType && !hasWeaponType(spell.requiredWeaponType)) continue;
    return spell;
  }
  return null;
}

/**
 * Simuliert einen kompletten Run (Sequenz von Monster-Steps, HP/Mana/Schild
 * tragen zwischen den Steps weiter).
 *
 * @param spellsById Map<string, SpellData> — für die Auflösung der Monster-Spell-Stubs ({id}/'id').
 */
export function simulateRun(playerStats, equippedSpells, monsterSteps, hasWeaponType, spellsById) {
  const enrichMonsterSpells = (spellStubs) =>
    spellStubs.map((s) => (typeof s === 'string' ? spellsById.get(s) : spellsById.get(s.id))).filter(Boolean);

  const run = {
    playerHp: playerStats.hp, playerMana: playerStats.mana, playerEnergyShield: playerStats['energy-shield'] ?? 0,
    playerMaxHp: playerStats.hp, playerMaxMana: playerStats.mana, playerMaxEnergyShield: playerStats['energy-shield'] ?? 0,
  };
  const steps = [];

  for (let stepIndex = 0; stepIndex < monsterSteps.length; stepIndex++) {
    const monster = structuredClone(monsterSteps[stepIndex]);
    monster.spells = Array.isArray(monster.spells) && monster.spells.length > 0 ? enrichMonsterSpells(monster.spells) : [];

    const step = {
      monsterHp: monster.hp, monsterMaxHp: monster.hp,
      monsterEnergyShield: monster['energy-shield'] ?? 0, monsterMaxEnergyShield: monster['energy-shield'] ?? 0,
    };

    const hpAtStepStart = run.playerHp;
    let turn = rollInitiative(playerStats.initiative ?? 0, monster.initiative ?? 0);
    let round = 1;
    let timedOut = false;

    while (step.monsterHp > 0 && run.playerHp > 0) {
      if (round > MAX_ROUNDS_PER_STEP) { timedOut = true; break; }

      if (turn === 'player') {
        const spell = pickPlayerAction(equippedSpells, run.playerMana, hasWeaponType);
        if (spell) {
          castSpellSim(spell, 'player', run, step, playerStats, monster);
        } else {
          const rawDamage = rollBetween(playerStats.attackMin, playerStats.attackMax);
          const damage = Math.round(rawDamage * (playerStats.physicalDamageMultiplier ?? 1));
          applyDamageToMonster(step, playerStats, monster, damage, 'physical');
        }
        turn = 'monster';
      } else {
        if (monster.spells.length > 0 && Math.random() > 0.5) {
          const spell = monster.spells[Math.floor(Math.random() * monster.spells.length)];
          castSpellSim(spell, 'monster', run, step, playerStats, monster);
        } else {
          applyDamageToPlayer(run, playerStats, monster, monster.attack || 10, 'physical');
        }

        // 🐛 Todes-Check MUSS vor der Regeneration passieren, siehe fight-simulator.util.ts.
        if (run.playerHp <= 0) break;

        run.playerMana = Math.min(run.playerMaxMana, run.playerMana + Math.floor(playerStats['mana-regeneration'] ?? 0));
        run.playerHp = Math.min(run.playerMaxHp, run.playerHp + Math.floor(playerStats['hp-regeneration'] ?? 0));
        turn = 'player';
        round++;
      }
    }

    const won = step.monsterHp <= 0 && run.playerHp > 0;
    const hpLost = Math.max(0, hpAtStepStart - run.playerHp);
    steps.push({
      monsterName: monster.name, won, rounds: round,
      playerHpLostPercent: hpAtStepStart > 0 ? Math.min(100, (hpLost / hpAtStepStart) * 100) : 0,
      timedOut,
    });

    if (run.playerHp <= 0) return { outcome: 'died', stoppedAtStepIndex: stepIndex, steps };
    if (timedOut) return { outcome: 'timedOut', stoppedAtStepIndex: stepIndex, steps };
  }

  return { outcome: 'won', stoppedAtStepIndex: null, steps };
}

// ─────────────────────────────────────────────────────────────────────────
// 🎯 Monster-Kalibrierung — geteilte Zwei-Hebel-Logik für alle Curve-
// Calibration-/Carry-Over-Skripte (attack als primärer Hebel, HP als
// Fallback wenn selbst attack=1 die Ziel-Winrate nicht erreicht, weil der
// Kampf ins 100-Runden-Timeout statt in einen Sieg läuft -- passiert bei
// höheren Brackets, wo die verhältnis-skalierte HP für die zugeordnete
// Checkpoint-Figur schlicht zu viel ist).
// ─────────────────────────────────────────────────────────────────────────

export function winRateAgainst(monster, character, passivesList, runs, spellsById = new Map()) {
  const playerStats = computeCombatStats(character.slots, character.investedPoints, passivesList);
  const hasWeaponType = (wt) => hasEquippedWeaponType(character.slots, wt);
  let won = 0;
  for (let i = 0; i < runs; i++) {
    const result = simulateRun(playerStats, [], [monster], hasWeaponType, spellsById);
    if (result.outcome === 'won') won++;
  }
  return won / runs;
}

/**
 * Kalibriert `attack` (primär) und, falls nötig, `hp` (Fallback) eines
 * Monsters so, dass `character` eine Ziel-Winrate erreicht.
 * @returns { hp, attack, winRate, hpReductions }
 */
export function calibrateMonsterAttackAndHp(monster, character, passivesList, opts) {
  const {
    targetWinRate = 0.78, tolerance = 0.04, runsPerIteration = 2000, maxIterations = 20,
    minHpFraction = 0.5, hpStepFraction = 0.85, maxHpReductions = 12, spellsById = new Map(),
  } = opts ?? {};

  let hp = monster.hp;
  const minHp = Math.max(1, Math.round(monster.hp * minHpFraction));
  let hpReductions = 0;

  while (true) {
    let attack = monster.attack;
    let winRate = winRateAgainst({ ...monster, hp, attack }, character, passivesList, runsPerIteration, spellsById);
    let iterations = 0;
    while (Math.abs(winRate - targetWinRate) > tolerance && iterations < maxIterations) {
      const gap = winRate - targetWinRate;
      const step = Math.max(1, Math.round(attack * 0.15 * Math.abs(gap) * 2));
      attack = Math.max(1, attack + (gap > 0 ? step : -step));
      winRate = winRateAgainst({ ...monster, hp, attack }, character, passivesList, runsPerIteration, spellsById);
      iterations++;
    }

    const withinTolerance = Math.abs(winRate - targetWinRate) <= tolerance;
    // Winrate bleibt trotz Attack-Anpassung zu NIEDRIG -> meist kein
    // Schadens-, sondern ein Zeit-Problem (zu viel HP, Kampf läuft ins
    // Timeout statt in einen Sieg). attack allein löst das nicht (senkt nur
    // den Schaden GEGEN den Spieler, nicht die Zeit bis zum Sieg) -> HP senken.
    const strugglingOnHp = winRate < targetWinRate - tolerance;
    if (withinTolerance || !strugglingOnHp || hp <= minHp || hpReductions >= maxHpReductions) {
      return { hp, attack, winRate, hpReductions };
    }
    hp = Math.max(minHp, Math.round(hp * hpStepFraction));
    hpReductions++;
  }
}

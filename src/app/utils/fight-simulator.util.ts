// src/app/utils/fight-simulator.util.ts
//
// Headless-Kampfsimulation für /fight-tool. Portiert die Turn-Formeln aus
// FightService (resolveAttack, mitigateByArmor, drainEnergyShield, monster-
// Zug) und SpellsEngineService (castSpell-Effektberechnung pro effectType)
// 1:1, aber als reine Funktionen ohne Signals/setTimeout/Persistenz/Router —
// damit hunderte Kämpfe pro Klick synchron durchlaufen können.
//
// ⚠️ Wenn sich die Kampf-Formeln in FightService/SpellsEngineService ändern,
// MUSS dieselbe Änderung hier nachgezogen werden, sonst driftet das
// Balance-Tool von der echten Kampf-Logik ab.
//
// Resolve-Minigame: wird bewusst NICHT simuliert — der Spieler "verbindet
// immer alle Punkte", d.h. der volle Skill-Wert wird ohne Reskalierung
// verwendet (siehe SpellsEngineService.applyResolveChallenge).

import { rollBetween, applyArmorMitigation, applyResistanceMitigation } from './combat-roll.util';

const ELEMENT_DAMAGE_MULTIPLIER_KEYS: Record<string, string> = {
  fire: 'fireDamageMultiplier',
  cold: 'coldDamageMultiplier',
  lightning: 'lightningDamageMultiplier',
  chaos: 'chaosDamageMultiplier',
};

/** Verhindert Endlos-Kämpfe bei kaputten Loadouts (z.B. 0 Schaden auf beiden Seiten). */
const MAX_ROUNDS_PER_STEP = 100;

export interface SimStepOutcome {
  monsterName: string;
  /** true nur, wenn das Monster in diesem Step tatsächlich besiegt wurde (nicht bei Tod/Unentschieden). */
  won: boolean;
  rounds: number;
  hpAtStepStart: number;
  hpAtStepEnd: number;
  /** HP-Verlust während dieses Steps, in % der HP, mit der der Spieler in DIESEN Step gestartet ist (0-100). */
  playerHpLostPercent: number;
  /** true, wenn der Kampf am Runden-Limit abgebrochen wurde, ohne dass eine Seite besiegt wurde. */
  timedOut: boolean;
}

export type RunOutcome = 'won' | 'died' | 'timedOut';

export interface SimRunResult {
  /** 'won' = alle Steps geklärt, 'died' = HP auf 0 gefallen, 'timedOut' = Rundenlimit ohne Ergebnis erreicht. */
  outcome: RunOutcome;
  /** 0-basierter Index des Steps, an dem der Run gestoppt wurde (null = alle Steps geklärt). */
  stoppedAtStepIndex: number | null;
  steps: SimStepOutcome[];
}

interface CombatantRoll {
  luck: number;
  critChance: number;
  critDamage: number;
}

/** Ausweich-/Krit-Wurf — exakt dieselbe Formel wie FightService.resolveAttack (ohne Logging). */
function resolveAttack(
  rawDamage: number,
  attacker: CombatantRoll,
  defenderEvasion: number,
): { finalDamage: number; dodged: boolean } {
  const defenseTotal = rollD(20) + defenderEvasion;
  const attackTotal = rollD(20) + attacker.luck;

  if (defenseTotal >= attackTotal) {
    return { finalDamage: 0, dodged: true };
  }

  const critChancePercent = rollD(10) + attacker.critChance - 5;
  if (Math.random() * 100 < critChancePercent) {
    const critMultiplierPercent = attacker.critDamage / 2;
    return { finalDamage: Math.round(rawDamage * (1 + critMultiplierPercent / 100)), dodged: false };
  }

  return { finalDamage: rawDamage, dodged: false };
}

function rollD(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

/** Zieht Schaden zuerst vom Energieschild ab — exakt wie FightService.drainEnergyShield. */
function drainEnergyShield(shield: { value: number }, damage: number): number {
  if (shield.value <= 0) return damage;
  const absorbed = Math.min(shield.value, damage);
  shield.value -= absorbed;
  return damage - absorbed;
}

interface RunState {
  playerHp: number;
  playerMana: number;
  playerEnergyShield: number;
  playerMaxHp: number;
  playerMaxMana: number;
  playerMaxEnergyShield: number;
}

interface StepState {
  monsterHp: number;
  monsterMaxHp: number;
  monsterEnergyShield: number;
  monsterMaxEnergyShield: number;
}

/** Schaden von Spieler → Monster — exakt wie FightService.applyDamageToMonster. */
function applyDamageToMonster(
  step: StepState,
  playerStats: any,
  monster: any,
  damage: number,
  damageType: 'physical' | 'elemental',
): void {
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

/** Schaden von Monster → Spieler — exakt wie FightService.applyDamageToPlayer (inkl. 75-100%-Zufallsskalierung). */
function applyDamageToPlayer(
  run: RunState,
  playerStats: any,
  monster: any,
  damage: number,
  damageType: 'physical' | 'elemental',
): void {
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

/**
 * Wirkt einen Spell — portiert aus SpellsEngineService.castSpell (ohne Resolve-Minigame,
 * ohne Waffentyp-/Mana-Vorprüfung, die übernimmt der Aufrufer bereits vorher).
 */
function castSpellSim(
  spell: any,
  casterType: 'player' | 'monster',
  run: RunState,
  step: StepState,
  playerStats: any,
  monster: any,
): void {
  if (casterType === 'player') {
    run.playerMana = Math.max(0, run.playerMana - (spell.manaCost ?? 0));
  }

  const bonusAttack = casterType === 'player'
    ? rollBetween(playerStats.attackMin, playerStats.attackMax)
    : monster.attack || 10;
  const bonusMagic = casterType === 'player'
    ? rollBetween(playerStats.magicAttackMin, playerStats.magicAttackMax)
    : monster.magicAttack || 10;

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

/** Initiative-Wurf — exakt wie FightService.rollInitiative. */
function rollInitiative(playerInitiative: number, monsterInitiative: number): 'player' | 'monster' {
  const diff = playerInitiative - monsterInitiative;
  const result = rollD(20) + diff;
  return result > 10 ? 'player' : 'monster';
}

/**
 * Wählt den Spiel-Zug des Autopilot-Spielers: den ersten ausgerüsteten Spell
 * (Slot 1→4), für den genug Mana da ist und dessen Waffentyp-Anforderung
 * (falls vorhanden) erfüllt ist — sonst einen normalen Angriff.
 */
function pickPlayerAction(
  equippedSpells: any[],
  playerMana: number,
  hasEquippedWeaponType: (weaponType: string) => boolean,
): any | null {
  for (const spell of equippedSpells) {
    if (!spell) continue;
    if ((spell.manaCost ?? 0) > playerMana) continue;
    if (spell.requiredWeaponType && !hasEquippedWeaponType(spell.requiredWeaponType)) continue;
    return spell;
  }
  return null;
}

/**
 * Simuliert einen kompletten Run (Sequenz von Monster-Steps, HP/Mana/Schild
 * tragen zwischen den Steps weiter — wie ein echter Düsterwald-Run).
 *
 * @param playerStats        `SkillsService.combatStats()` des Sandbox-Charakters.
 * @param equippedSpells     Die 4 ausgerüsteten Spells (volle Objekte, null = leerer Slot), Slot-Reihenfolge 1→4.
 * @param monsterSteps       Ein Monster (rohes JSON-Objekt) pro Step, in Reihenfolge.
 * @param enrichMonsterSpells Reichert Monster-Spell-IDs zu vollen Spell-Objekten an (SpellLoaderService.enrichSpells).
 * @param hasEquippedWeaponType Prüft, ob der Sandbox-Charakter eine Waffe vom geforderten Typ trägt.
 */
export function simulateRun(
  playerStats: any,
  equippedSpells: any[],
  monsterSteps: any[],
  enrichMonsterSpells: (spells: any[]) => any[],
  hasEquippedWeaponType: (weaponType: string) => boolean,
): SimRunResult {
  const run: RunState = {
    playerHp: playerStats.hp,
    playerMana: playerStats.mana,
    playerEnergyShield: playerStats['energy-shield'] ?? 0,
    playerMaxHp: playerStats.hp,
    playerMaxMana: playerStats.mana,
    playerMaxEnergyShield: playerStats['energy-shield'] ?? 0,
  };

  const steps: SimStepOutcome[] = [];

  for (let stepIndex = 0; stepIndex < monsterSteps.length; stepIndex++) {
    const monster = structuredClone(monsterSteps[stepIndex]);
    monster.spells = Array.isArray(monster.spells) && monster.spells.length > 0
      ? enrichMonsterSpells(monster.spells)
      : [];

    const step: StepState = {
      monsterHp: monster.hp,
      monsterMaxHp: monster.hp,
      monsterEnergyShield: monster['energy-shield'] ?? 0,
      monsterMaxEnergyShield: monster['energy-shield'] ?? 0,
    };

    const hpAtStepStart = run.playerHp;
    let turn = rollInitiative(playerStats.initiative ?? 0, monster.initiative ?? 0);
    let round = 1;
    let timedOut = false;

    while (step.monsterHp > 0 && run.playerHp > 0) {
      if (round > MAX_ROUNDS_PER_STEP) {
        timedOut = true;
        break;
      }

      if (turn === 'player') {
        const spell = pickPlayerAction(equippedSpells, run.playerMana, hasEquippedWeaponType);
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

        // 🐛 Todes-Check MUSS vor der Regeneration passieren — sonst heilt der
        // hp-regeneration-Tick unten eine tödliche Wunde in derselben Runde
        // wieder auf 1+ HP, und der Spieler kann rechnerisch nie sterben (exakt
        // wie FightService.applyDamageToPlayer, das sofort handleFightEnd(false)
        // auslöst, BEVOR endTurn() die Regeneration anwendet).
        if (run.playerHp <= 0) break;

        // Mana-/HP-Regeneration am Ende jeder vollen Runde — wie FightService.endTurn.
        run.playerMana = Math.min(run.playerMaxMana, run.playerMana + Math.floor(playerStats['mana-regeneration'] ?? 0));
        run.playerHp = Math.min(run.playerMaxHp, run.playerHp + Math.floor(playerStats['hp-regeneration'] ?? 0));

        turn = 'player';
        round++;
      }
    }

    const won = step.monsterHp <= 0 && run.playerHp > 0;
    const hpLost = Math.max(0, hpAtStepStart - run.playerHp);
    steps.push({
      monsterName: monster.name,
      won,
      rounds: round,
      hpAtStepStart,
      hpAtStepEnd: run.playerHp,
      // Relativ zum HP-Stand BEIM START dieses Steps (nicht zur Max-HP) —
      // "100%" = die HP, mit der der Spieler in diesen konkreten Kampf ging.
      playerHpLostPercent: hpAtStepStart > 0 ? Math.min(100, (hpLost / hpAtStepStart) * 100) : 0,
      timedOut,
    });

    if (run.playerHp <= 0) {
      return { outcome: 'died', stoppedAtStepIndex: stepIndex, steps };
    }
    if (timedOut) {
      return { outcome: 'timedOut', stoppedAtStepIndex: stepIndex, steps };
    }
  }

  return { outcome: 'won', stoppedAtStepIndex: null, steps };
}

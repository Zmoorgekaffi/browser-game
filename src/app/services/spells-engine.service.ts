import { Injectable, inject, Injector } from '@angular/core';
import { SkillsService } from './skills.service';
import { FightService } from './fight.service';
import { ResolveChallengeService } from './resolve-challenge.service';
import { rollBetween, applyResistanceMitigation } from '../utils/combat-roll.util';

/**
 * @service SpellsEngineService
 * @description Führt Spell-Effekte aus (Schaden, Heilung) — für Spieler UND
 * Monster. Kümmert sich um Mana-Check/-Abzug und die Boni aus den Stats.
 *
 * Der FightService wird über den Injector lazy geholt, um eine zirkuläre
 * DI-Abhängigkeit (FightService ↔ SpellsEngineService) zu vermeiden.
 */
@Injectable({
  providedIn: 'root',
})
export class SpellsEngineService {
  private skillsService = inject(SkillsService);
  private injector = inject(Injector);
  private resolveChallengeService = inject(ResolveChallengeService);

  /**
   * Wirkt einen Spell.
   *
   * Ablauf: 1. Waffentyp-Anforderung prüfen (nur Spieler) → 2. Mana prüfen/
   * abziehen (nur Spieler) → 3. Schadens-Boni aus den Stats ermitteln →
   * 4. Effekt anhand von effectType verarbeiten.
   *
   * Nur beim Spieler-Cast (casterType 'player') wird der Skill-Endwert
   * (Schaden oder Heilung) zusätzlich durch das Resolve-Minigame reskaliert
   * (siehe applyResolveChallenge). Monster-Casts sind davon unberührt.
   *
   * @param spell      Vollständiges Spell-Objekt (mit effectType!).
   * @param casterType Wer wirkt: 'player' (Default) oder 'monster'.
   * @returns true, wenn der Spell erfolgreich gewirkt wurde.
   */
  public async castSpell(spell: any, casterType: 'player' | 'monster' = 'player'): Promise<boolean> {
    console.log(`🔍 [SpellsEngine] castSpell aufgerufen von [${casterType}]. Inhalt von spell:`, spell);

    // Sicherheits-Check: Spell muss ein vollständiges Objekt sein
    if (!spell || typeof spell !== 'object' || !spell.effectType) {
      console.error(`❌ castSpell: Spell ist kein gültiges Objekt oder fehlt effectType.`, spell);
      return false;
    }

    const fightService = this.injector.get(FightService);
    const isCombat = fightService.activeFight() !== null;

    // --- 1. WAFFENTYP CHECK (nur Spieler) ---
    // Manche Skills sind an einen Waffentyp gebunden (z.B. Feuerzauber nur mit
    // 'magie'-Waffe, ein wuchtiger Schlag nur mit 'stumpf'). Wird bei jedem Cast
    // neu geprüft (nicht nur beim Ausrüsten), da die Waffe jederzeit gewechselt
    // werden kann, während der Skill im Slot bleibt.
    if (casterType === 'player' && spell.requiredWeaponType) {
      if (!this.skillsService.hasEquippedWeaponType(spell.requiredWeaponType)) {
        console.warn(
          `❌ "${spell.name}" benötigt eine Waffe vom Typ "${spell.requiredWeaponType}"!`,
        );
        return false;
      }
    }

    // --- 2. MANA CHECK & ABZUG ---
    if (casterType === 'player') {
      const currentMana = isCombat
        ? fightService.playerMana()
        : this.skillsService.combatStats().mana;

      if (currentMana < spell.manaCost) {
        console.warn(`❌ Nicht genug Mana für Spieler-Spell ${spell.name}!`);
        return false;
      }

      if (isCombat) {
        fightService.playerMana.update((mana) => Math.max(0, mana - spell.manaCost));
      } else {
        this.skillsService.state.update((s) => ({
          ...s,
          mana: Math.max(0, s.mana - spell.manaCost),
        }));
      }
    } else {
      console.log(`👹 Monster wirkt ${spell.name}.`);
    }

    // --- 3. SCHADENS-BONI BERECHNEN ---
    const playerStats = this.skillsService.combatStats();

    // ✅ Monster-Stats aus enrichedMonster holen (vollständiges Objekt, nicht activeFight)
    const enrichedMonster = fightService.getEnrichedMonster();
    const bonusAttack =
      casterType === 'player'
        ? rollBetween(playerStats.attackMin, playerStats.attackMax)
        : enrichedMonster?.attack || 10;
    const bonusMagic =
      casterType === 'player'
        ? rollBetween(playerStats.magicAttackMin, playerStats.magicAttackMax)
        : enrichedMonster?.magicAttack || 10;

    // --- 4. EFFEKT VERARBEITUNG ---
    switch (spell.effectType) {
      case 'PHYSICAL_DAMAGE': {
        let totalDamage = Number(spell.effectValues.value) + bonusAttack;
        if (casterType === 'player') {
          // Physischer Schadens-Multiplikator aus Stärke (siehe SkillsService.
          // applyAttributeScaling) wirkt auf (Waffen-Wurf + Skill-Wert), NICHT
          // auf die Waffen-Range selbst. Rüstungs-Mitigation passiert danach
          // zentral in applyDamageToMonster (damageType 'physical', Default).
          totalDamage = Math.round(totalDamage * (playerStats.physicalDamageMultiplier ?? 1));
          totalDamage = await this.applyResolveChallenge(spell, totalDamage);
          fightService.applyDamageToMonster(totalDamage, 'physical');
        } else {
          fightService.applyDamageToPlayer(totalDamage, 'physical');
        }
        break;
      }

      case 'ELEMENTAL_DAMAGE': {
        let totalDamage = Number(spell.effectValues.value) + bonusMagic;
        const element = spell.effectValues.element;
        console.log(`💥 ${element}-Schaden abgefeuert von [${casterType}]: ${totalDamage}`);
        if (casterType === 'player') {
          // Magischer Schadens-Multiplikator aus Intelligenz, analog zum
          // physischen Multiplikator oben.
          totalDamage = Math.round(totalDamage * (playerStats.magicDamageMultiplier ?? 1));
          // Element-Resistenz des ZIELS mindert den Schaden (1 Punkt = 1%,
          // gedeckelt bei 75%) — muss HIER passieren, da nur die Engine das
          // konkrete Element kennt. FightService bekommt danach 'elemental'
          // übergeben, damit die Rüstungs-Mitigation dort nicht nochmal greift.
          const defenderResistance = enrichedMonster?.resistances?.[element] ?? 0;
          totalDamage = applyResistanceMitigation(totalDamage, defenderResistance);
          totalDamage = await this.applyResolveChallenge(spell, totalDamage);
          fightService.applyDamageToMonster(totalDamage, 'elemental');
        } else {
          const defenderResistance = playerStats.resistances?.[element] ?? 0;
          totalDamage = applyResistanceMitigation(totalDamage, defenderResistance);
          fightService.applyDamageToPlayer(totalDamage, 'elemental');
        }
        break;
      }

      case 'HEAL': {
        let healAmount = Number(spell.effectValues.value);
        if (casterType === 'player') {
          healAmount = await this.applyResolveChallenge(spell, healAmount);
          fightService.playerHp.update((hp) =>
            Math.min(fightService.playerMaxHp(), hp + healAmount),
          );
        } else {
          fightService.monsterHp.update((hp) =>
            Math.min(fightService.monsterMaxHp(), hp + healAmount),
          );
        }
        break;
      }

      default:
        console.error(`⚠️ Unbekannter Effekt-Typ in Engine: ${spell.effectType}`);
        return false;
    }

    return true;
  }

  /**
   * Reskaliert den Skill-Endwert (Schaden/Heilung) anhand des Resolve-
   * Minigames: (Endwert / resolvePoints) * korrekt verbundene Punkte.
   * Nur für Spieler-Casts aufgerufen — Monster sind von der Resolve-
   * Mechanik nicht betroffen.
   */
  private async applyResolveChallenge(spell: any, finalValue: number): Promise<number> {
    const resolvePoints = Number(spell.resolvePoints) || 3;
    const correctCount = await this.resolveChallengeService.start(resolvePoints);
    return Math.round((finalValue / resolvePoints) * correctCount);
  }
}
import { Injectable, inject, Injector } from '@angular/core';
import { SkillsService } from './skills.service';
import { FightService } from './fight.service';
import { ResolveChallengeService } from './resolve-challenge.service';

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
   * Ablauf: 1. Mana prüfen/abziehen (nur Spieler) → 2. Schadens-Boni aus
   * den Stats ermitteln → 3. Effekt anhand von effectType verarbeiten.
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

    // --- 1. MANA CHECK & ABZUG ---
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

    // --- 2. SCHADENS-BONI BERECHNEN ---
    const playerStats = this.skillsService.combatStats();

    // ✅ Monster-Stats aus enrichedMonster holen (vollständiges Objekt, nicht activeFight)
    const enrichedMonster = fightService.getEnrichedMonster();
    const bonusAttack =
      casterType === 'player' ? playerStats.attack : enrichedMonster?.attack || 10;
    const bonusMagic =
      casterType === 'player' ? playerStats.magicAttack : enrichedMonster?.magicAttack || 10;

    // --- 3. EFFEKT VERARBEITUNG ---
    switch (spell.effectType) {
      case 'PHYSICAL_DAMAGE': {
        let totalDamage = Number(spell.effectValues.value) + bonusAttack;
        if (casterType === 'player') {
          totalDamage = await this.applyResolveChallenge(spell, totalDamage);
          fightService.applyDamageToMonster(totalDamage);
        } else {
          fightService.applyDamageToPlayer(totalDamage);
        }
        break;
      }

      case 'ELEMENTAL_DAMAGE': {
        let totalDamage = Number(spell.effectValues.value) + bonusMagic;
        const element = spell.effectValues.element;
        console.log(`💥 ${element}-Schaden abgefeuert von [${casterType}]: ${totalDamage}`);
        if (casterType === 'player') {
          totalDamage = await this.applyResolveChallenge(spell, totalDamage);
          fightService.applyDamageToMonster(totalDamage);
        } else {
          fightService.applyDamageToPlayer(totalDamage);
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
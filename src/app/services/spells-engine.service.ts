import { Injectable, inject, Injector } from '@angular/core';
import { SkillsService } from './skills.service';
import { FightService } from './fight.service';

@Injectable({
  providedIn: 'root',
})
export class SpellsEngineService {
  private skillsService = inject(SkillsService);
  private injector = inject(Injector);

  public castSpell(spell: any, casterType: 'player' | 'monster' = 'player'): boolean {
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
        const totalDamage = Number(spell.effectValues.value) + bonusAttack;
        if (casterType === 'player') {
          fightService.applyDamageToMonster(totalDamage);
        } else {
          fightService.applyDamageToPlayer(totalDamage);
        }
        break;
      }

      case 'ELEMENTAL_DAMAGE': {
        const totalDamage = Number(spell.effectValues.value) + bonusMagic;
        const element = spell.effectValues.element;
        console.log(`💥 ${element}-Schaden abgefeuert von [${casterType}]: ${totalDamage}`);
        if (casterType === 'player') {
          fightService.applyDamageToMonster(totalDamage);
        } else {
          fightService.applyDamageToPlayer(totalDamage);
        }
        break;
      }

      case 'HEAL': {
        const healAmount = Number(spell.effectValues.value);
        if (casterType === 'player') {
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
}
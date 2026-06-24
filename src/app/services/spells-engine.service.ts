import { Injectable, inject } from '@angular/core';
import { WalletService } from './wallet.service'; // Für Gold/Ressourcen falls nötig
import { SkillsService } from './skills.service';

@Injectable({
  providedIn: 'root',
})
export class SpellsEngineService {
  private skillsService = inject(SkillsService);

  /**
   * 🔥 DIE ZENTRALE VERARBEITUNGSMETHODE
   * Nimmt einen Zauber und führt seine Logik anhand des Effect-Typs aus.
   * @param spell Das Spell-Objekt aus dem JSON
   * @param currentEnemy Die Instanz des aktuellen Gegners im Kampf
   */
  public castSpell(spell: any, currentEnemy: any): void {
    // 1. Mana-Check (Haben wir überhaupt genug Mana?)
    const currentMana = this.skillsService.combatStats().mana; // Finaler reaktiver Manawert
    if (currentMana < spell.manaCost) {
      console.warn(
        `❌ Nicht genug Mana für ${spell.name}! Benötigt: ${spell.manaCost}, Verfügbar: ${currentMana}`,
      );
      return;
    }

    // 2. Mana abziehen (Wir updaten den State im SkillsService)
    this.skillsService.state.update((currentState) => ({
      ...currentState,
      mana: currentState.mana - spell.manaCost,
    }));

    console.log(`✨ ${spell.name} wird gewirkt! Cost: ${spell.manaCost} Mana.`);

    // 3. 🎯 DAS SWITCH-CASE FÜR DIE EFFEKTE
    switch (spell.effectType) {
      // 🔥 NEU: Physischer Schaden (z. B. für "Schildschlag", "Rundumhieb" oder "Pfeilregen")
      case 'PHYSICAL_DAMAGE': {
        const baseDamage = Number(spell.effectValues.value);

        // RPG-Berechnung: Wir addieren den physischen Angriff (attack) zum Grundschaden
        const totalDamage = baseDamage + this.skillsService.combatStats().attack;

        console.log(`⚔️ Effekt: Physischer Schaden ausgelöst! Verursacht ${totalDamage} Schaden.`);

        // Dem Gegner den Schaden reindrücken (als Typ übergeben wir 'physical')
        if (currentEnemy && typeof currentEnemy.damage === 'function') {
          currentEnemy.damage('physical', totalDamage);
        }
        break;
      }

      case 'ELEMENTAL_DAMAGE': {
        const element = spell.effectValues.element; // 'fire', 'cold', etc.
        const baseDamage = Number(spell.effectValues.value);

        // RPG-Berechnung: Wir addieren den magischen Angriff des Spielers zum Schaden!
        const totalDamage = baseDamage + this.skillsService.combatStats().magicAttack;

        console.log(`💥 Effekt: ${element}-Schaden ausgelöst! Verursacht ${totalDamage} Schaden.`);

        if (currentEnemy && typeof currentEnemy.damage === 'function') {
          currentEnemy.damage(element, totalDamage);
        }
        break;
      }

      case 'HEAL': {
        const healAmount = Number(spell.effectValues.value);
        console.log(`💚 Effekt: Heilung ausgelöst! Heilt um ${healAmount} HP.`);

        this.skillsService.state.update((currentState) => {
          const maxHp = this.skillsService.combatStats().hp;
          const newHp = Math.min(maxHp, currentState.hp + healAmount);
          return { ...currentState, hp: newHp };
        });
        break;
      }

      case 'BUFF_ARMOR': {
        const durationTurns = spell.effectValues.turns;
        const armorBonus = spell.effectValues.value;
        console.log(
          `🛡️ Effekt: Rüstungs-Buff für ${durationTurns} Runden (+${armorBonus} Rüstung).`,
        );
        break;
      }

      default:
        console.error(`⚠️ Unbekannter Spell-Effekt-Typ: ${spell.effectType}`);
        break;
    }
  }
}

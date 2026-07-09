import { Injectable, inject } from '@angular/core';
import { InventarService } from './inventar.service';
import { AdventureStateService } from './adventure-state.service';
import { FightService } from './fight.service';

export type PotionType = 'health' | 'mana' | 'buff';

/** Ein Trank-Item im Inventar zusammen mit seinem Original-Index (für Removal). */
export interface InventoryPotion {
  item: any;
  index: number;
}

/**
 * @service PotionService
 * @description Zentrale Verbrauchslogik für Tränke — sowohl außerhalb eines
 * Kampfes (Zwischenstand, siehe AdventureStateService.applyPotionHeal/-Mana)
 * als auch im Kampf (siehe FightService.healPlayer/restoreMana/addPlayerBuff).
 * Trank-Items liegen als vollständige Objekte im Inventar (kein ID-Cache wie
 * bei Spells nötig) — Effektdaten stecken direkt im `effect`-Feld.
 */
@Injectable({
  providedIn: 'root',
})
export class PotionService {
  private inventarService = inject(InventarService);
  private adventureStateService = inject(AdventureStateService);
  private fightService = inject(FightService);

  /**
   * Liefert alle Tränke aus dem Inventar (optional gefiltert nach Typ), inkl.
   * Original-Inventar-Index (für removeItemFromInventar).
   *
   * @param types Optional: nur diese Tranktypen (z.B. ['health','mana'] für
   *              den Zwischenstand, in dem Buff-Tränke nicht nutzbar sind).
   */
  public getInventoryPotions(types?: PotionType[]): InventoryPotion[] {
    const items: any[] = this.inventarService.inventar()?.items ?? [];
    const result: InventoryPotion[] = [];

    items.forEach((item, index) => {
      if (item?.['armor-slot'] !== 'potion') return;
      if (types && !types.includes(item['potion-type'])) return;
      result.push({ item, index });
    });

    return result;
  }

  /**
   * Benutzt einen Heil-/Manatrank AUSSERHALB eines Kampfes (z.B. im
   * Zwischenstand zwischen zwei Adventure-Steps). Buff-Tränke sind hier
   * bewusst nicht nutzbar (wirkungslos ohne laufenden Kampf).
   *
   * @param index Inventar-Index (aus getInventoryPotions()).
   */
  public useOutOfCombat(index: number): boolean {
    const item = this.inventarService.inventar()?.items?.[index];
    if (!item || item['armor-slot'] !== 'potion') return false;

    const potionType = item['potion-type'] as PotionType;
    if (potionType === 'health') {
      this.adventureStateService.applyPotionHeal(item.effect?.value ?? 0);
    } else if (potionType === 'mana') {
      this.adventureStateService.applyPotionMana(item.effect?.value ?? 0);
    } else {
      return false;
    }

    this.inventarService.removeItemFromInventar(index);
    return true;
  }

  /**
   * Benutzt einen beliebigen Trank IM Kampf — ersetzt Angriff/Zauber für die
   * laufende Runde (siehe FightService.consumePotionTurn()).
   *
   * @param index Inventar-Index (aus getInventoryPotions()).
   */
  public useInCombat(index: number): boolean {
    const item = this.inventarService.inventar()?.items?.[index];
    if (!item || item['armor-slot'] !== 'potion') return false;

    const potionType = item['potion-type'] as PotionType;
    const effect = item.effect ?? {};

    switch (potionType) {
      case 'health':
        this.fightService.healPlayer(effect.value ?? 0);
        break;
      case 'mana':
        this.fightService.restoreMana(effect.value ?? 0);
        break;
      case 'buff':
        this.fightService.addPlayerBuff(effect.stat, effect.value ?? 0, effect.duration ?? 5, item.name);
        break;
      default:
        return false;
    }

    this.inventarService.removeItemFromInventar(index);
    this.fightService.consumePotionTurn(`🧪 Du trinkst ${item.name}.`);
    return true;
  }
}

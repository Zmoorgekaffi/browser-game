import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';

// Definition der verfügbaren Slots zur Typsicherheit (ear-right entfernt)
export interface EquippedSlots {
  head: any | null;
  chest: any | null;
  leg: any | null;
  gloves: any | null;
  footwear: any | null;
  'accessoire-left': any | null;
  'accessoire-right': any | null;
  necklace: any | null;
  'ring-left': any | null;
  'ring-right': any | null;
  'weapon-1': any | null;
  'weapon-2': any | null;
  back: any | null;

  [key: string]: any;
}

/** Erzeugt ein frisches, komplett leeres Slot-Objekt. */
function createEmptySlots(): EquippedSlots {
  return {
    head: null, chest: null, leg: null, gloves: null, footwear: null,
    'accessoire-left': null, 'accessoire-right': null,
    necklace: null, 'ring-left': null, 'ring-right': null,
    'weapon-1': null, 'weapon-2': null, back: null,
  };
}

/**
 * @service InventarService
 * @description Verwaltet das Item-Inventar des Charakters inklusive
 * An-/Ablegen von Ausrüstung, Doppel-Slot-Handling (Ringe/Accessoires)
 * und Persistierung im LocalStorage.
 */
@Injectable({
  providedIn: 'root'
})
export class InventarService {
  private router = inject(Router);

  /** Das komplette Inventar ({ items: [...] }). */
  public inventar: WritableSignal<any> = signal<any>({ items: [] });

  /** Aktuell ausgerüstete Items pro Slot (null = Slot leer). */
  public equippedSlots: WritableSignal<EquippedSlots> = signal<EquippedSlots>(createEmptySlots());

  /** Item, das gerade in einem ArmorSlot gehovert wird (für den Tooltip). */
  public hoveredEquippedItem: WritableSignal<any | null> = signal<any | null>(null);

  /** Slot-Name, für den gerade der "Ausziehen?"-Bestätigungsdialog offen ist. */
  public unequipConfirmSlot: WritableSignal<string | null> = signal<string | null>(null);

  private activeCharId: string | null = null;

  /**
   * Initialisiert das Inventar mit Savegame-Daten.
   * Fehlende Flags (equipped / assigned-slot) werden dabei nachgerüstet.
   *
   * @param data   Inventar-Block aus dem LocalStorage.
   * @param charId ID des aktiven Charakters (für den Storage-Key).
   */
  init(data: any, charId: string): void {
    if (data && data.items) {
      data.items = data.items.map((item: any) => ({
        ...item,
        equipped: item.equipped !== undefined ? item.equipped : false,
        'assigned-slot': item['assigned-slot'] !== undefined ? item['assigned-slot'] : null
      }));
    }

    this.activeCharId = charId;
    this.inventar.set(data || { items: [] });
    this.updateEquippedSlotsSignal(this.inventar().items);
  }

  /**
   * Fügt ein neues Item ans Ende des Inventars an und speichert sofort.
   *
   * @param newItem Das hinzuzufügende Item (Shop-Kauf, Loot, Reward ...).
   */
  public addItemToInventar(newItem: any): void {
    this.inventar.update(currentInv => {
      const formattedItem = {
        ...newItem,
        equipped: newItem.equipped !== undefined ? newItem.equipped : false,
        'assigned-slot': null
      };
      const updatedItems = currentInv?.items ? [...currentInv.items, formattedItem] : [formattedItem];
      const newInventar = { ...currentInv, items: updatedItems };

      this.saveToLocalStorage(newInventar);
      return newInventar;
    });
  }

  /**
   * Rüstet ein Item an bzw. ab (Toggle).
   *
   * Beim Anlegen:
   *  - Ringe/Accessoires wandern in den ersten freien Links/Rechts-Slot.
   *  - Ein bereits im Ziel-Slot sitzendes Item wird automatisch abgelegt.
   *
   * @param itemIndex Index des Items im Inventar-Array.
   */
  public toggleEquipItem(itemIndex: number): void {
    let latestItems: any[] = [];

    this.inventar.update(currentInv => {
      if (!currentInv?.items || !currentInv.items[itemIndex]) return currentInv;

      const updatedItems = JSON.parse(JSON.stringify(currentInv.items));
      const targetItem = updatedItems[itemIndex];
      const baseSlot = targetItem['armor-slot'];

      if (!baseSlot) return currentInv;

      const isEquipping = !targetItem.equipped;

      if (isEquipping) {
        const finalSlot = this.resolveTargetSlot(baseSlot);
        targetItem['assigned-slot'] = finalSlot;
        this.unequipConflictingItems(updatedItems, itemIndex, finalSlot);
      } else {
        targetItem['assigned-slot'] = null;
      }

      targetItem.equipped = isEquipping;
      updatedItems[itemIndex] = targetItem;

      const newInventar = { ...currentInv, items: updatedItems };
      this.saveToLocalStorage(newInventar);
      latestItems = updatedItems;
      return newInventar;
    });

    this.updateEquippedSlotsSignal(latestItems);
  }

  /**
   * Legt das Item ab, das aktuell in `slotName` steckt (explizites Ausziehen
   * über einen Klick auf den ArmorSlot, kein Toggle wie bei toggleEquipItem).
   *
   * @param slotName Der Slot, dessen Item ausgezogen werden soll.
   */
  public unequipSlot(slotName: string): void {
    let latestItems: any[] = [];

    this.inventar.update(currentInv => {
      if (!currentInv?.items) return currentInv;

      const updatedItems = JSON.parse(JSON.stringify(currentInv.items));
      const idx = updatedItems.findIndex(
        (item: any) => item.equipped && (item['assigned-slot'] || item['armor-slot']) === slotName
      );
      if (idx === -1) return currentInv;

      updatedItems[idx].equipped = false;
      updatedItems[idx]['assigned-slot'] = null;

      const newInventar = { ...currentInv, items: updatedItems };
      this.saveToLocalStorage(newInventar);
      latestItems = updatedItems;
      return newInventar;
    });

    this.updateEquippedSlotsSignal(latestItems);
  }

  /**
   * Entfernt ein Item endgültig aus dem Inventar (z.B. beim Verkauf im Shop).
   *
   * @param itemIndex Index des Items im Inventar-Array.
   */
  public removeItemFromInventar(itemIndex: number): void {
    let latestItems: any[] = [];

    this.inventar.update(currentInv => {
      if (!currentInv?.items || !currentInv.items[itemIndex]) return currentInv;

      const updatedItems = currentInv.items.filter((_: any, i: number) => i !== itemIndex);
      const newInventar = { ...currentInv, items: updatedItems };

      this.saveToLocalStorage(newInventar);
      latestItems = updatedItems;
      return newInventar;
    });

    this.updateEquippedSlotsSignal(latestItems);
  }

  /**
   * Ermittelt den konkreten Ziel-Slot für ein Item.
   * Ringe und Accessoires haben je zwei Slots: erst links versuchen,
   * ist der belegt, rechts nehmen. Alle anderen Slots bleiben 1:1.
   *
   * @param baseSlot Der 'armor-slot' des Items (z.B. 'ring', 'head').
   */
  private resolveTargetSlot(baseSlot: string): string {
    const slots = this.equippedSlots();

    if (baseSlot === 'ring') {
      return !slots['ring-left'] ? 'ring-left' : 'ring-right';
    }
    if (baseSlot === 'accessoire') {
      return !slots['accessoire-left'] ? 'accessoire-left' : 'accessoire-right';
    }
    return baseSlot;
  }

  /**
   * Legt alle Items ab, die bereits im Ziel-Slot sitzen
   * (mutiert das übergebene Array direkt).
   *
   * @param items     Arbeits-Kopie der Inventar-Items.
   * @param itemIndex Index des Items, das gerade angelegt wird.
   * @param finalSlot Der Slot, der frei geräumt werden soll.
   */
  private unequipConflictingItems(items: any[], itemIndex: number, finalSlot: string): void {
    items.forEach((item: any, index: number) => {
      const currentAssigned = item['assigned-slot'] || item['armor-slot'];
      if (index !== itemIndex && currentAssigned === finalSlot && item.equipped) {
        items[index].equipped = false;
        items[index]['assigned-slot'] = null;
      }
    });
  }

  /**
   * Baut das equippedSlots-Signal aus dem Items-Array neu auf.
   *
   * @param itemsArray Optional: Items-Liste (Default: aktuelles Inventar).
   */
  private updateEquippedSlotsSignal(itemsArray?: any[]): void {
    const items = itemsArray || this.inventar().items || [];
    const newSlots: EquippedSlots = createEmptySlots();

    items.forEach((item: any) => {
      if (item.equipped) {
        const slot = (item['assigned-slot'] || item['armor-slot']) as keyof EquippedSlots;
        if (slot && slot in newSlots) {
          newSlots[slot] = item;
        }
      }
    });

    this.equippedSlots.set(newSlots);
  }

  /** Persistiert das Inventar unter dem Key des aktiven Charakters. */
  private saveToLocalStorage(newInventar: any): void {
    if (this.activeCharId) {
      localStorage.setItem(`${this.activeCharId}_inventar`, JSON.stringify(newInventar));
    }
  }
}

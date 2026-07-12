import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { PersonalItemsService } from './personal-items.service';
import { isEquippableItem, isItemCompatibleWithSlot } from '../utils/item-category.util';

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
  private personalItemsService = inject(PersonalItemsService);

  /** Das komplette Inventar ({ items: [...] }). */
  public inventar: WritableSignal<any> = signal<any>({ items: [] });

  /** Aktuell ausgerüstete Items pro Slot (null = Slot leer). */
  public equippedSlots: WritableSignal<EquippedSlots> = signal<EquippedSlots>(createEmptySlots());

  /** Item, das gerade in einem ArmorSlot gehovert wird (für den Tooltip). */
  public hoveredEquippedItem: WritableSignal<any | null> = signal<any | null>(null);

  /** Slot-Name, für den gerade der "Ausziehen?"-Bestätigungsdialog offen ist. */
  public unequipConfirmSlot: WritableSignal<string | null> = signal<string | null>(null);

  /** Item, das gerade per Drag & Drop aus der Inventarliste auf einen Slot gezogen wird. */
  public draggingItem: WritableSignal<any | null> = signal<any | null>(null);

  /** Slot-Name, über dem der Pointer beim Ziehen gerade schwebt (für Grün/Rot-Highlight). */
  public dragHoveredSlot: WritableSignal<string | null> = signal<string | null>(null);

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
   * Rüstet ein Item an bzw. ab (Toggle). Funktioniert sowohl für normale
   * Inventar-Items als auch für persönliche (soulbound) Crafting-Items —
   * beide Quellen teilen sich dieselben Ausrüstungs-Slots.
   *
   * Beim Anlegen:
   *  - Ringe/Accessoires wandern in den ersten freien Links/Rechts-Slot.
   *  - Ein bereits im Ziel-Slot sitzendes Item (aus Inventar ODER
   *    persönlichen Items) wird automatisch abgelegt.
   *
   * @param itemIndex Index des Items in der jeweiligen Quell-Liste.
   * @param source    'inventar' (Default) oder 'personal'.
   */
  public toggleEquipItem(itemIndex: number, source: 'inventar' | 'personal' = 'inventar'): void {
    if (source === 'personal') {
      this.togglePersonalEquipItem(itemIndex);
      return;
    }

    let latestItems: any[] = [];

    this.inventar.update(currentInv => {
      if (!currentInv?.items || !currentInv.items[itemIndex]) return currentInv;

      const updatedItems = JSON.parse(JSON.stringify(currentInv.items));
      const targetItem = updatedItems[itemIndex];
      const baseSlot = targetItem['armor-slot'];

      if (!baseSlot || !isEquippableItem(targetItem)) return currentInv;

      const isEquipping = !targetItem.equipped;

      if (isEquipping) {
        const finalSlot = this.resolveTargetSlot(baseSlot, targetItem);
        targetItem['assigned-slot'] = finalSlot;
        this.clearSlotEverywhere(finalSlot, 'inventar', itemIndex, updatedItems);
        this.enforceTwoHandedExclusivity(targetItem, finalSlot, 'inventar', itemIndex, updatedItems);
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

  /** Wie toggleEquipItem, nur für ein Item aus den persönlichen (soulbound) Items. */
  private togglePersonalEquipItem(itemIndex: number): void {
    const items = this.personalItemsService.personalItems()?.items ?? [];
    const targetItem = items[itemIndex];
    const baseSlot = targetItem?.['armor-slot'];
    if (!targetItem || !baseSlot || !isEquippableItem(targetItem)) return;

    const isEquipping = !targetItem.equipped;

    if (isEquipping) {
      const finalSlot = this.resolveTargetSlot(baseSlot, targetItem);

      // Etwaige Konflikte im Inventar auflösen (mutiert eine Arbeits-Kopie).
      const workingInventarItems = JSON.parse(JSON.stringify(this.inventar()?.items ?? []));
      this.clearSlotEverywhere(finalSlot, 'personal', itemIndex, workingInventarItems);
      this.enforceTwoHandedExclusivity(targetItem, finalSlot, 'personal', itemIndex, workingInventarItems);
      const newInventar = { ...this.inventar(), items: workingInventarItems };
      this.inventar.set(newInventar);
      this.saveToLocalStorage(newInventar);

      this.personalItemsService.setEquippedAt(itemIndex, true, finalSlot);
    } else {
      this.personalItemsService.setEquippedAt(itemIndex, false, null);
    }

    this.updateEquippedSlotsSignal();
  }

  /**
   * Rüstet ein Item explizit auf `targetSlot` an (Drag & Drop aus der
   * Item-Liste). Anders als `toggleEquipItem` kein Toggle: legt immer an
   * (auch wenn das Item schon in einem anderen Slot steckt) und ersetzt ein
   * ggf. dort sitzendes Item. Ring/Accessoire/Waffen-Slots werden dabei
   * weiterhin automatisch verteilt (`resolveTargetSlot`) — `targetSlot`
   * bestimmt nur, ob die Slot-Familie passt (siehe `isItemCompatibleWithSlot`).
   *
   * @param itemIndex  Index des Items in der jeweiligen Quell-Liste.
   * @param source     'inventar' oder 'personal'.
   * @param targetSlot Slot, über dem das Item losgelassen wurde.
   */
  public equipItemToSlot(itemIndex: number, source: 'inventar' | 'personal', targetSlot: string): void {
    if (source === 'personal') {
      this.equipPersonalItemToSlot(itemIndex, targetSlot);
      return;
    }

    let latestItems: any[] = [];

    this.inventar.update(currentInv => {
      if (!currentInv?.items || !currentInv.items[itemIndex]) return currentInv;

      const updatedItems = JSON.parse(JSON.stringify(currentInv.items));
      const targetItem = updatedItems[itemIndex];

      if (!isItemCompatibleWithSlot(targetItem, targetSlot)) return currentInv;

      const finalSlot = this.resolveTargetSlot(targetItem['armor-slot'], targetItem);
      targetItem['assigned-slot'] = finalSlot;
      this.clearSlotEverywhere(finalSlot, 'inventar', itemIndex, updatedItems);
      this.enforceTwoHandedExclusivity(targetItem, finalSlot, 'inventar', itemIndex, updatedItems);
      targetItem.equipped = true;
      updatedItems[itemIndex] = targetItem;

      const newInventar = { ...currentInv, items: updatedItems };
      this.saveToLocalStorage(newInventar);
      latestItems = updatedItems;
      return newInventar;
    });

    this.updateEquippedSlotsSignal(latestItems);
  }

  /** Wie equipItemToSlot, nur für ein Item aus den persönlichen (soulbound) Items. */
  private equipPersonalItemToSlot(itemIndex: number, targetSlot: string): void {
    const items = this.personalItemsService.personalItems()?.items ?? [];
    const targetItem = items[itemIndex];
    if (!targetItem || !isItemCompatibleWithSlot(targetItem, targetSlot)) return;

    const finalSlot = this.resolveTargetSlot(targetItem['armor-slot'], targetItem);

    const workingInventarItems = JSON.parse(JSON.stringify(this.inventar()?.items ?? []));
    this.clearSlotEverywhere(finalSlot, 'personal', itemIndex, workingInventarItems);
    this.enforceTwoHandedExclusivity(targetItem, finalSlot, 'personal', itemIndex, workingInventarItems);
    const newInventar = { ...this.inventar(), items: workingInventarItems };
    this.inventar.set(newInventar);
    this.saveToLocalStorage(newInventar);

    this.personalItemsService.setEquippedAt(itemIndex, true, finalSlot);
    this.updateEquippedSlotsSignal();
  }

  /**
   * Legt jedes Item ab, das aktuell im Ziel-Slot sitzt — egal ob es aus dem
   * normalen Inventar oder aus den persönlichen (soulbound) Items kommt.
   *
   * @param finalSlot            Der Slot, der frei geräumt werden soll.
   * @param exceptSource         Quelle des Items, das gerade angelegt wird (wird übersprungen).
   * @param exceptIndex          Index dieses Items (wird übersprungen).
   * @param workingInventarItems Arbeits-Kopie der Inventar-Items (wird mutiert).
   */
  private clearSlotEverywhere(
    finalSlot: string,
    exceptSource: 'inventar' | 'personal',
    exceptIndex: number,
    workingInventarItems: any[],
  ): void {
    workingInventarItems.forEach((item: any, index: number) => {
      if (exceptSource === 'inventar' && index === exceptIndex) return;
      const assigned = item['assigned-slot'] || item['armor-slot'];
      if (item.equipped && assigned === finalSlot) {
        item.equipped = false;
        item['assigned-slot'] = null;
      }
    });

    const personalItems = this.personalItemsService.personalItems()?.items ?? [];
    personalItems.forEach((item: any, index: number) => {
      if (exceptSource === 'personal' && index === exceptIndex) return;
      const assigned = item['assigned-slot'] || item['armor-slot'];
      if (item.equipped && assigned === finalSlot) {
        this.personalItemsService.setEquippedAt(index, false, null);
      }
    });
  }

  /**
   * Legt das Item ab, das aktuell in `slotName` steckt (explizites Ausziehen
   * über einen Klick auf den ArmorSlot, kein Toggle wie bei toggleEquipItem).
   *
   * @param slotName Der Slot, dessen Item ausgezogen werden soll.
   */
  public unequipSlot(slotName: string): void {
    let latestItems: any[] = this.inventar()?.items ?? [];

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

    // Der Slot könnte statt von einem Inventar-Item auch von einem
    // persönlichen (soulbound) Item belegt sein.
    const personalItems = this.personalItemsService.personalItems()?.items ?? [];
    const personalIdx = personalItems.findIndex(
      (item: any) => item.equipped && (item['assigned-slot'] || item['armor-slot']) === slotName
    );
    if (personalIdx !== -1) {
      this.personalItemsService.setEquippedAt(personalIdx, false, null);
    }

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
  private resolveTargetSlot(baseSlot: string, item?: any): string {
    const slots = this.equippedSlots();

    if (baseSlot === 'ring') {
      return !slots['ring-left'] ? 'ring-left' : 'ring-right';
    }
    if (baseSlot === 'accessoire') {
      return !slots['accessoire-left'] ? 'accessoire-left' : 'accessoire-right';
    }
    if (baseSlot === 'weapon-1') {
      const isTwoHanded = String(item?.hands) === '2';
      const mainHand = slots['weapon-1'];
      const mainHandIsTwoHanded = String(mainHand?.hands) === '2';
      // 1H-Waffe, Haupthand schon mit einer anderen 1H-Waffe belegt und Nebenhand frei
      // → dorthin ausweichen (Dual-Wield). In jedem anderen Fall (leer, 2H in Haupthand,
      // eigene Waffe ist 2H) bleibt es bei weapon-1.
      if (!isTwoHanded && mainHand && !mainHandIsTwoHanded && !slots['weapon-2']) {
        return 'weapon-2';
      }
      return 'weapon-1';
    }
    return baseSlot;
  }

  /**
   * 2H-Waffen belegen beide Waffen-Slots gleichzeitig: liegt eine 2H-Waffe in
   * `weapon-1`, muss `weapon-2` zwangsläufig leer bleiben und umgekehrt.
   * Wird direkt nach dem Belegen von `finalSlot` aufgerufen.
   */
  private enforceTwoHandedExclusivity(
    item: any,
    finalSlot: string,
    exceptSource: 'inventar' | 'personal',
    exceptIndex: number,
    workingInventarItems: any[],
  ): void {
    if (String(item?.hands) === '2' && finalSlot === 'weapon-1') {
      this.clearSlotEverywhere('weapon-2', exceptSource, exceptIndex, workingInventarItems);
    }
  }

  /**
   * Baut das equippedSlots-Signal aus dem Items-Array neu auf.
   *
   * @param itemsArray Optional: Items-Liste (Default: aktuelles Inventar).
   */
  private updateEquippedSlotsSignal(itemsArray?: any[]): void {
    const items = itemsArray || this.inventar().items || [];
    const personalItems = this.personalItemsService.personalItems()?.items || [];
    const newSlots: EquippedSlots = createEmptySlots();

    [...items, ...personalItems].forEach((item: any) => {
      if (item.equipped) {
        const slot = (item['assigned-slot'] || item['armor-slot']) as keyof EquippedSlots;
        if (slot && slot in newSlots) {
          newSlots[slot] = item;
        }
      }
    });

    this.equippedSlots.set(newSlots);
  }

  /**
   * Baut das equippedSlots-Signal neu auf. Öffentlich, damit der
   * GameStateService es nach dem Laden der persönlichen Items erneut
   * anstoßen kann (die Reihenfolge beim Char-Load ist: Inventar → Personal Items).
   */
  public refreshEquippedSlots(): void {
    this.updateEquippedSlotsSignal();
  }

  /** Persistiert das Inventar unter dem Key des aktiven Charakters. */
  private saveToLocalStorage(newInventar: any): void {
    if (this.activeCharId) {
      localStorage.setItem(`${this.activeCharId}_inventar`, JSON.stringify(newInventar));
    }
  }
}

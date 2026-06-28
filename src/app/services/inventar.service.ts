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

@Injectable({
  providedIn: 'root'
})
export class InventarService {
  private router = inject(Router);

  public inventar: WritableSignal<any> = signal<any>({ items: [] });
  
  public equippedSlots: WritableSignal<EquippedSlots> = signal<EquippedSlots>({
    head: null, chest: null, leg: null, gloves: null, footwear: null,
    'accessoire-left': null, 'accessoire-right': null,
    necklace: null, 'ring-left': null, 'ring-right': null,
    'weapon-1': null, 'weapon-2': null, back: null
  });

  private activeCharId: string | null = null;

  // CONSTRUCTOR IST JETZT LEER
  constructor() {}

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

  // goBack() wurde entfernt, da nun gameStateService.scene.goBack() genutzt wird.

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

  public toggleEquipItem(itemIndex: number): void {
    let latestItems: any[] = [];

    this.inventar.update(currentInv => {
      if (!currentInv?.items || !currentInv.items[itemIndex]) return currentInv;

      const updatedItems = JSON.parse(JSON.stringify(currentInv.items));
      const targetItem = updatedItems[itemIndex];
      const baseSlot = targetItem['armor-slot'];
      let finalSlot: string = baseSlot;

      if (!baseSlot) return currentInv;

      const isEquipping = !targetItem.equipped;

      if (isEquipping) {
        const slots = this.equippedSlots();
        if (baseSlot === 'ring') {
          finalSlot = !slots['ring-left'] ? 'ring-left' : 'ring-right';
        } else if (baseSlot === 'accessoire') {
          finalSlot = !slots['accessoire-left'] ? 'accessoire-left' : 'accessoire-right';
        }
        targetItem['assigned-slot'] = finalSlot;

        updatedItems.forEach((item: any, index: number) => {
          const currentAssigned = item['assigned-slot'] || item['armor-slot'];
          if (index !== itemIndex && currentAssigned === finalSlot && item.equipped) {
            updatedItems[index].equipped = false;
            updatedItems[index]['assigned-slot'] = null;
          }
        });
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

  private updateEquippedSlotsSignal(itemsArray?: any[]): void {
    const items = itemsArray || this.inventar().items || [];
    const newSlots: EquippedSlots = {
      head: null, chest: null, leg: null, gloves: null, footwear: null,
      'accessoire-left': null, 'accessoire-right': null,
      necklace: null, 'ring-left': null, 'ring-right': null,
      'weapon-1': null, 'weapon-2': null, back: null
    };

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

  private saveToLocalStorage(newInventar: any): void {
    if (this.activeCharId) {
      localStorage.setItem(`${this.activeCharId}_inventar`, JSON.stringify(newInventar));
    }
  }
}
import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';

// Definition der verfügbaren Slots zur Typsicherheit
export interface EquippedSlots {
  head: any | null;
  chest: any | null;
  leg: any | null;
  gloves: any | null;
  footwear: any | null;
  'accessoire-left': any | null;
  'accessoire-right': any | null;
  'ear-right': any | null;
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

  // Das gesamte rohe Inventar (beinhaltet die Items-Liste)
  public inventar: WritableSignal<any> = signal<any>({ items: [] });
  
  // Ein Signal, das die aktuell ausgerüsteten Items nach Slot sortiert hält
  public equippedSlots: WritableSignal<EquippedSlots> = signal<EquippedSlots>({
    head: null,
    chest: null,
    leg: null,
    gloves: null,
    footwear: null,
    'accessoire-left': null,
    'accessoire-right': null,
    'ear-right': null,
    necklace: null,
    'ring-left': null,
    'ring-right': null,
    'weapon-1': null,
    'weapon-2': null,
    back: null
  });

  private activeCharId: string | null = null;
  private previousRoute: string = '/village';

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: any) => {
      if (event.url === '/inventar') {
        const currentUrl = this.router.url;
        if (currentUrl !== '/inventar' && currentUrl !== '/') {
          this.previousRoute = currentUrl;
          console.log(`📌 Inventar-Herkunft gemerkt: ${this.previousRoute}`);
        }
      }
    });
  }

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
    
    // Nach dem Laden des Inventars füllen wir das equippedSlots-Signal initial ab
    this.updateEquippedSlotsSignal(this.inventar().items);
  }

  public goBack(): void {
    this.router.navigateByUrl(this.previousRoute);
  }

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
   * Rüstet ein Item aus. Fängt dynamische Slots wie Ringe und Accessoires ab.
   */
  public toggleEquipItem(itemIndex: number): void {
    let latestItems: any[] = [];

    this.inventar.update(currentInv => {
      if (!currentInv?.items || !currentInv.items[itemIndex]) return currentInv;

      // Deep Copy via JSON-Schnittstelle verhindert jegliche Objektreferenz-Konflikte
      const updatedItems = JSON.parse(JSON.stringify(currentInv.items));
      const targetItem = updatedItems[itemIndex];
      
      const baseSlot = targetItem['armor-slot'];
      let finalSlot: string = baseSlot;

      if (!baseSlot) {
        console.warn(`⚠️ Item '${targetItem.name}' hat keinen gültigen 'armor-slot' definiert!`);
        return currentInv;
      }

      const isEquipping = !targetItem.equipped;

      if (isEquipping) {
        const slots = this.equippedSlots();

        // 🛠️ DYNAMISCHE SLOT-WEISUNG FÜR RINGE & ACCESSOIRES
        if (baseSlot === 'ring') {
          finalSlot = !slots['ring-left'] ? 'ring-left' : 'ring-right';
        } else if (baseSlot === 'accessoire') {
          finalSlot = !slots['accessoire-left'] ? 'accessoire-left' : 'accessoire-right';
        }

        // Wir merken uns den tatsächlichen Slot direkt auf dem Item
        targetItem['assigned-slot'] = finalSlot;

        // 🔥 AUTOMATISCHER AUSTAUSCH: Alle anderen Items auf diesem exakten Ziel-Slot ablegen
        updatedItems.forEach((item: any, index: number) => {
          const currentAssigned = item['assigned-slot'] || item['armor-slot'];
          if (index !== itemIndex && currentAssigned === finalSlot && item.equipped) {
            updatedItems[index].equipped = false;
            updatedItems[index]['assigned-slot'] = null;
            console.log(`🔄 Automatischer Austausch: '${item.name}' von Slot '${finalSlot}' abgelegt.`);
          }
        });
      } else {
        // Beim Ablegen den zugewiesenen Platz wieder löschen
        targetItem['assigned-slot'] = null;
      }

      // Zustand des geklickten Items setzen
      targetItem.equipped = isEquipping;
      updatedItems[itemIndex] = targetItem;

      console.log(`🛡️ Item '${targetItem.name}' auf Slot '${finalSlot}': ${isEquipping ? 'Ausgerüstet' : 'Abgelegt'}`);

      const newInventar = { ...currentInv, items: updatedItems };
      this.saveToLocalStorage(newInventar);
      
      // Speichern der lokalen Variable für den direkten Datenfluss nach dem Update
      latestItems = updatedItems;
      return newInventar;
    });

    // Wir übergeben die frisch berechneten Items direkt, um dem Signal-Lag zu entgehen!
    this.updateEquippedSlotsSignal(latestItems);
  }

  /**
   * Hilfsfunktion: Bekommt die aktuellen Items und befüllt das `equippedSlots` Signal.
   */
  private updateEquippedSlotsSignal(itemsArray?: any[]): void {
    const items = itemsArray || this.inventar().items || [];
    
    // Frisches leeres Slot-Objekt vorbereiten
    const newSlots: EquippedSlots = {
      head: null, chest: null, leg: null, gloves: null, footwear: null,
      'accessoire-left': null, 'accessoire-right': null, 'ear-right': null,
      necklace: null, 'ring-left': null, 'ring-right': null,
      'weapon-1': null, 'weapon-2': null, back: null
    };

    // Verteilt alle Gegenstände anhand ihres tatsächlichen Slots
    items.forEach((item: any) => {
      if (item.equipped) {
        const slot = (item['assigned-slot'] || item['armor-slot']) as keyof EquippedSlots;
        if (slot && slot in newSlots) {
          newSlots[slot] = item;
        }
      }
    });

    // Das reaktive Signal updaten, damit SkillsService.combatStats anspringt
    this.equippedSlots.set(newSlots);
    console.log('✨ Ausgerüstete Slots reaktiv aktualisiert:', this.equippedSlots());
  }

  private saveToLocalStorage(newInventar: any): void {
    if (this.activeCharId) {
      localStorage.setItem(`${this.activeCharId}_inventar`, JSON.stringify(newInventar));
      console.log('🎒 Inventar im LocalStorage aktualisiert!');
    }
  }
}
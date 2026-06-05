import { Injectable, inject, signal, WritableSignal, computed } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';

// Definition der verfügbaren Slots zur Typsicherheit
export interface EquippedSlots {
  head: any | null;
  chest: any | null;
  leg: any | null;
  gloves: any | null;
  footwear: any | null;
  'accessoires-left': any | null;
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
    'accessoires-left': null,
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
        equipped: item.equipped !== undefined ? item.equipped : false
      }));
    }
    
    this.activeCharId = charId;
    this.inventar.set(data || { items: [] });
    
    // Nach dem Laden des Inventars füllen wir das equippedSlots-Signal initial ab
    this.updateEquippedSlotsSignal();
  }

  public goBack(): void {
    this.router.navigateByUrl(this.previousRoute);
  }

  public addItemToInventar(newItem: any): void {
    this.inventar.update(currentInv => {
      const formattedItem = {
        ...newItem,
        equipped: newItem.equipped !== undefined ? newItem.equipped : false
      };
      const updatedItems = currentInv?.items ? [...currentInv.items, formattedItem] : [formattedItem];
      const newInventar = { ...currentInv, items: updatedItems };

      this.saveToLocalStorage(newInventar);
      return newInventar;
    });
  }

  /**
   * Rüstet ein Item aus. Wenn der Slot besetzt ist, wird das alte Item automatisch abgelegt.
   */
  public toggleEquipItem(itemIndex: number): void {
    this.inventar.update(currentInv => {
      if (!currentInv?.items || !currentInv.items[itemIndex]) return currentInv;

      const updatedItems = [...currentInv.items];
      const targetItem = updatedItems[itemIndex];
      
      // Holt den zugewiesenen Slot aus dem Item-Objekt (z.B. "head", "necklace", "weapon-1")
      const slot: keyof EquippedSlots = targetItem['armor-slot'];

      if (!slot) {
        console.warn(`⚠️ Item '${targetItem.name}' hat keinen gültigen 'armor-slot' definiert!`);
        return currentInv;
      }

      // Zustand des ausgewählten Items umkehren
      const isEquipping = !targetItem.equipped;

      if (isEquipping) {
        // 🔥 GARANTIE: Loop durch den Rucksack, um alle ANDEREN Items 
        // auf demselben Slot zu finden und rigoros abzulegen (equipped = false)
        updatedItems.forEach((item, index) => {
          const itemSlot = item['armor-slot'];
          if (index !== itemIndex && itemSlot === slot && item.equipped) {
            updatedItems[index] = { ...item, equipped: false };
            console.log(`🔄 Automatischer Austausch: Altes Item '${item.name}' vom Slot '${slot}' abgelegt.`);
          }
        });
      }

      // Zustand des geklickten Items setzen
      updatedItems[itemIndex] = {
        ...targetItem,
        equipped: isEquipping
      };

      console.log(`🛡️ Item '${targetItem.name}' auf Slot '${slot}': ${isEquipping ? 'Ausgerüstet' : 'Abgelegt'}`);

      const newInventar = { ...currentInv, items: updatedItems };
      this.saveToLocalStorage(newInventar);
      return newInventar;
    });

    // Nach dem Update des Haupt-Inventars berechnen wir das Slot-Signal komplett reaktiv neu
    this.updateEquippedSlotsSignal();
  }

  /**
   * Hilfsfunktion: Scannt das geänderte Inventar und füllt das `equippedSlots` Signal 
   * mit den Objekten, die equipped: true sind.
   */
  private updateEquippedSlotsSignal(): void {
    const items = this.inventar().items || [];
    
    // Frisches leeres Slot-Objekt vorbereiten
    const newSlots: EquippedSlots = {
      head: null, chest: null, leg: null, gloves: null, footwear: null,
      'accessoires-left': null, 'accessoire-right': null, 'ear-right': null,
      necklace: null, 'ring-left': null, 'ring-right': null,
      'weapon-1': null, 'weapon-2': null, back: null
    };

    // Verteilt alle Gegenstände, die "equipped: true" haben, auf ihre exakten Slots
    items.forEach((item: any) => {
      if (item.equipped) {
        const slot = item['armor-slot'] as keyof EquippedSlots;
        if (slot && slot in newSlots) {
          newSlots[slot] = item;
        }
      }
    });

    // Das reaktive Signal für das UI updaten
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
import { Injectable, inject, signal, computed } from '@angular/core';
import { UtilityService } from './utility.service';
import { WalletService } from './wallet.service';
import { InventarService } from './inventar.service';

import amuletsData from '../../../public/item-data/necklace.json';
import weaponsData from '../../../public/item-data/necklace.json'; 
import suppliesData from '../../../public/item-data/necklace.json'; 

interface AllShopsData {
  magic: any[];
  weapon: any[];
  armor: any[];
  alchemist: any[];
}

export type ShopType = 'magic' | 'weapon' | 'alchemist' | 'armor';

@Injectable({
  providedIn: 'root',
})
export class ShopService {
  private utilityService = inject(UtilityService);
  private walletService = inject(WalletService);
  private inventarService = inject(InventarService);

  private magicShopItems = signal<any[]>([]);
  private weaponShopItems = signal<any[]>([]);      
  private armorShopItems = signal<any[]>([]);       
  private alchemistShopItems = signal<any[]>([]);   

  public currentMagicItems = computed(() => this.magicShopItems());
  public currentWeaponItems = computed(() => this.weaponShopItems());
  public currentArmorItems = computed(() => this.armorShopItems());
  public currentAlchemistItems = computed(() => this.alchemistShopItems());

  private activeCharId: string | null = null;

  // item-info-card globaler Zustand
  public itemInfoCardShow = signal<boolean>(false);
  public currentDisplayedItem = signal<any>(null);

  // NEU: Hier speichern wir den Typ und den Index des aktuell ausgewählten Items ab
  public activeShopType = signal<ShopType | null>(null);
  public activeItemIndex = signal<number | null>(null);

  public init(charId: string) {
    this.activeCharId = charId;
    console.log('activeCharIdIn Shop.service.ts:', charId);
    
    const savedShopsRaw = localStorage.getItem(`${charId}_shops`);
    
    if (savedShopsRaw) {
      const shopsData: AllShopsData = JSON.parse(savedShopsRaw);
      
      this.magicShopItems.set(shopsData.magic || []);
      this.weaponShopItems.set(shopsData.weapon || []);
      this.armorShopItems.set(shopsData.armor || []);
      this.alchemistShopItems.set(shopsData.alchemist || []);
    } else {
      this.rerollAllShopsAtEndOfRun();
    }
  }

  /**
   * Wird aufgerufen, wenn man im Laden auf ein Item klickt.
   * Merkt sich die Daten für die Info-Card und öffnet diese.
   */
  public selectItemForPreview(shopType: ShopType, index: number): void {
    const shopSignal = this.getSignalByShopType(shopType);
    if (!shopSignal) return;

    const item = shopSignal()[index];
    if (!item || item.isSold) return;

    // Daten im Service hinterlegen
    this.activeShopType.set(shopType);
    this.activeItemIndex.set(index);
    this.currentDisplayedItem.set(item);
    
    // Karte anzeigen
    this.itemInfoCardShow.set(true);
  }

  /**
   * ZENTRALE KAUF-LOGIK (Wird nun aus der Info-Card getriggert)
   * Nutzt die intern gespeicherten Variablen für den Kauf.
   */
  public buyCurrentlySelectedItem(): boolean {
    const shopType = this.activeShopType();
    const index = this.activeItemIndex();

    // Validierung, ob überhaupt ein Item ausgewählt ist
    if (shopType === null || index === null) {
      console.warn('❌ Kein Item zum Kaufen ausgewählt!');
      return false;
    }

    const shopSignal = this.getSignalByShopType(shopType);
    if (!shopSignal) return false;

    const currentItems = [...shopSignal()];
    const item = currentItems[index];

    if (!item || item.isSold || !item.price) {
      console.warn('❌ Dieses Item existiert nicht oder wurde bereits verkauft!');
      return false;
    }

    // 1. Wallet prüfen & Geld abziehen
    const hasEnoughGold = this.walletService.spendGold(item.price);
    if (!hasEnoughGold) {
      console.error('❌ Nicht genug Gold für dieses Item!');
      return false;
    }

    // 2. Item ins Inventar transferieren
    this.inventarService.addItemToInventar(item);

    // 3. Item im Shop durch einen "isSold"-Platzhalter ersetzen
    currentItems[index] = { isSold: true };
    shopSignal.set(currentItems);

    // 4. Shop-Zustand im LocalStorage sichern
    this.saveAllShopsToLocalStorage();

    // 5. Item-Details-Karte schließen & Zustand zurücksetzen
    this.itemInfoCardShow.set(false);
    this.activeShopType.set(null);
    this.activeItemIndex.set(null);
    this.currentDisplayedItem.set(null);

    console.log(`🛍 *Erfolgreich gekauft!*`);
    return true;
  }

  private getSignalByShopType(type: ShopType) {
    switch (type) {
      case 'magic': return this.magicShopItems;
      case 'weapon': return this.weaponShopItems;
      case 'alchemist': return this.alchemistShopItems;
      case 'armor': return this.armorShopItems;
    }
  }

  private generatePoolSelection(itemPool: any[], itemCount: number): any[] {
    const selectedItems: any[] = [];
    if (!itemPool || itemPool.length === 0) return selectedItems;

    for (let i = 0; i < itemCount; i++) {
      const randomIndex = this.utilityService.getRandomIndex(itemPool);
      selectedItems.push({ ...itemPool[randomIndex], isSold: false });
    }
    return selectedItems;
  }

  private saveAllShopsToLocalStorage() {
    if (!this.activeCharId) return;

    const combinedShopsData: AllShopsData = {
      magic: this.magicShopItems(),
      weapon: this.weaponShopItems(),
      armor: this.armorShopItems(),
      alchemist: this.alchemistShopItems()
    };

    localStorage.setItem(`${this.activeCharId}_shops`, JSON.stringify(combinedShopsData));
  }

  public rerollAllShopsAtEndOfRun() {
    this.magicShopItems.set(this.generatePoolSelection(amuletsData, 6));
    this.weaponShopItems.set(this.generatePoolSelection(weaponsData, 5));
    this.alchemistShopItems.set(this.generatePoolSelection(suppliesData, 5));
    this.armorShopItems.set([]);
    this.saveAllShopsToLocalStorage();
  }
}
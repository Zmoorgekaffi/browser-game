import { Injectable, inject, signal, computed } from '@angular/core';
import { UtilityService } from './utility.service';
import { WalletService } from './wallet.service';
import { InventarService } from './inventar.service';
import { getSellPrice } from '../utils/item-display.util';

// Import der korrekten JSON-Pools für deine 3 Shops
import magicData from '../../../public/item-data/necklace.json';
import smitherData from '../../../public/item-data/chest.json'; 
import generalSuppliesData from '../../../public/item-data/head.json'; 

interface AllShopsData {
  magic: any[];
  smither: any[];
  'general': any[];
}

// Auf 3 feste Shop-Typen reduziert
export type ShopType = 'magic' | 'smither' | 'general';

/**
 * @service ShopService
 * @description Verwaltet die Angebote der drei Dorf-Shops (Magie, Schmied,
 * Gemischtwaren), den Kaufprozess über die Item-Info-Card sowie das
 * Neu-Auswürfeln der Angebote am Ende eines Adventure-Runs.
 */
@Injectable({
  providedIn: 'root',
})
export class ShopService {
  private utilityService = inject(UtilityService);
  private walletService = inject(WalletService);
  private inventarService = inject(InventarService);

  // Die 3 reaktiven Shop-Signals
  private magicShopItems = signal<any[]>([]);
  private smitherShopItems = signal<any[]>([]);      
  private generalSuppliesShopItems = signal<any[]>([]);   

  // Computed Properties für deine UI-Komponenten
  public currentMagicItems = computed(() => this.magicShopItems());
  public currentSmitherItems = computed(() => this.smitherShopItems());
  public currentGeneralSuppliesItems = computed(() => this.generalSuppliesShopItems());

  private activeCharId: string | null = null;

  // Globaler Zustand für die info-card
  public itemInfoCardShow = signal<boolean>(false);
  public currentDisplayedItem = signal<any>(null);

  // Aktive Auswahl für den Kaufprozess
  public activeShopType = signal<ShopType | null>(null);
  public activeItemIndex = signal<number | null>(null);

  // Globaler Zustand für den Verkaufs-Dialog
  public sellListShow = signal<boolean>(false);
  public sellConfirmIndex = signal<number | null>(null);

  /**
   * Lädt gespeicherte Shop-Angebote aus dem LocalStorage
   * oder würfelt sie neu aus, wenn noch keine existieren.
   *
   * @param charId ID des aktiven Charakters (für den Storage-Key).
   */
  public init(charId: string) {
    this.activeCharId = charId;
    console.log('activeCharIdIn Shop.service.ts:', charId);
    
    const savedShopsRaw = localStorage.getItem(`${charId}_shops`);
    
    if (savedShopsRaw) {
      const shopsData: AllShopsData = JSON.parse(savedShopsRaw);
      
      this.magicShopItems.set(shopsData.magic || []);
      this.smitherShopItems.set(shopsData.smither || []);
      this.generalSuppliesShopItems.set(shopsData['general'] || []);
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

    this.activeShopType.set(shopType);
    this.activeItemIndex.set(index);
    this.currentDisplayedItem.set(item);
    
    this.itemInfoCardShow.set(true);
  }

  /**
   * ZENTRALE KAUF-LOGIK: prüft Verfügbarkeit und Gold, überführt das Item
   * ins Inventar, markiert den Shop-Platz als verkauft und schließt die Card.
   *
   * @returns true, wenn der Kauf erfolgreich war.
   */
  public buyCurrentlySelectedItem(): boolean {
    const shopType = this.activeShopType();
    const index = this.activeItemIndex();

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

    const hasEnoughGold = this.walletService.spendGold(item.price);
    if (!hasEnoughGold) {
      console.error('❌ Nicht genug Gold für dieses Item!');
      return false;
    }

    this.inventarService.addItemToInventar(item);

    currentItems[index] = { isSold: true };
    shopSignal.set(currentItems);

    this.saveAllShopsToLocalStorage();

    this.itemInfoCardShow.set(false);
    this.activeShopType.set(null);
    this.activeItemIndex.set(null);
    this.currentDisplayedItem.set(null);

    console.log(`🛍 *Erfolgreich gekauft!*`);
    return true;
  }

  /** Öffnet die Verkaufsliste (alle unausgerüsteten Items). */
  public openSellList(): void {
    this.sellListShow.set(true);
  }

  /** Schließt die Verkaufsliste inkl. eines evtl. offenen Bestätigungsdialogs. */
  public closeSellList(): void {
    this.sellListShow.set(false);
    this.sellConfirmIndex.set(null);
  }

  /**
   * Verkauft ein Item aus dem Inventar für 50% seines Preises.
   *
   * @param itemIndex Index des Items im Inventar-Array.
   * @returns true, wenn der Verkauf erfolgreich war.
   */
  public sellItem(itemIndex: number): boolean {
    const items = this.inventarService.inventar()?.items;
    const item = items?.[itemIndex];

    if (!item || item.equipped) {
      console.warn('❌ Dieses Item kann nicht verkauft werden (ausgerüstet oder nicht vorhanden)!');
      return false;
    }

    this.walletService.addGold(getSellPrice(item.price));
    this.inventarService.removeItemFromInventar(itemIndex);
    this.sellConfirmIndex.set(null);

    console.log(`💰 Item verkauft für ${getSellPrice(item.price)} Gold!`);
    return true;
  }

  /** Liefert das passende Item-Signal zum Shop-Typ. */
  private getSignalByShopType(type: ShopType) {
    switch (type) {
      case 'magic': return this.magicShopItems;
      case 'smither': return this.smitherShopItems;
      case 'general': return this.generalSuppliesShopItems;
    }
  }

  /**
   * Zieht `itemCount` zufällige Items aus dem Pool (Ziehen mit Zurücklegen).
   *
   * @param itemPool  Quell-Pool aus den JSON-Daten.
   * @param itemCount Anzahl der Shop-Plätze.
   */
  private generatePoolSelection(itemPool: any[], itemCount: number): any[] {
    const selectedItems: any[] = [];
    if (!itemPool || itemPool.length === 0) return selectedItems;

    for (let i = 0; i < itemCount; i++) {
      const randomIndex = this.utilityService.getRandomIndex(itemPool);
      selectedItems.push({ ...itemPool[randomIndex], isSold: false });
    }
    return selectedItems;
  }

  /** Persistiert alle drei Shop-Angebote gebündelt im LocalStorage. */
  private saveAllShopsToLocalStorage() {
    if (!this.activeCharId) return;

    const combinedShopsData: AllShopsData = {
      magic: this.magicShopItems(),
      smither: this.smitherShopItems(),
      'general': this.generalSuppliesShopItems()
    };

    localStorage.setItem(`${this.activeCharId}_shops`, JSON.stringify(combinedShopsData));
  }

  /**
   * Generiert das Angebot für die 3 neuen Shops
   */
  public rerollAllShopsAtEndOfRun() {
    this.magicShopItems.set(this.generatePoolSelection(magicData, 6));
    this.smitherShopItems.set(this.generatePoolSelection(smitherData, 5));
    this.generalSuppliesShopItems.set(this.generatePoolSelection(generalSuppliesData, 5));
    
    this.saveAllShopsToLocalStorage();
  }
}
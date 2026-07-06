import { Injectable, inject, signal, computed } from '@angular/core';
import { UtilityService } from './utility.service';
import { WalletService } from './wallet.service';
import { InventarService } from './inventar.service';
import { PersonalItemsService } from './personal-items.service';
import { getSellPrice } from '../utils/item-display.util';

// Import der korrekten JSON-Pools für deine 3 Shops
import magicData from '../../../public/item-data/necklace.json';

// 🛠️ Schmiede: Chest + Leg (Tier 1-5)
import chestTier1 from '../../../public/item-data/equipment/chest/chest_tier1.json';
import chestTier2 from '../../../public/item-data/equipment/chest/chest_tier2.json';
import chestTier3 from '../../../public/item-data/equipment/chest/chest_tier3.json';
import chestTier4 from '../../../public/item-data/equipment/chest/chest_tier4.json';
import chestTier5 from '../../../public/item-data/equipment/chest/chest_tier5.json';
import legTier1 from '../../../public/item-data/equipment/leg/leg_tier1.json';
import legTier2 from '../../../public/item-data/equipment/leg/leg_tier2.json';
import legTier3 from '../../../public/item-data/equipment/leg/leg_tier3.json';
import legTier4 from '../../../public/item-data/equipment/leg/leg_tier4.json';
import legTier5 from '../../../public/item-data/equipment/leg/leg_tier5.json';
import footwearTier1 from '../../../public/item-data/equipment/footwear/footwear_tier1.json';
import footwearTier2 from '../../../public/item-data/equipment/footwear/footwear_tier2.json';
import footwearTier3 from '../../../public/item-data/equipment/footwear/footwear_tier3.json';
import footwearTier4 from '../../../public/item-data/equipment/footwear/footwear_tier4.json';
import footwearTier5 from '../../../public/item-data/equipment/footwear/footwear_tier5.json';

// 🎒 Gemischtwaren: Head + Gloves (Tier 1-5)
import headTier1 from '../../../public/item-data/equipment/head/head_tier1.json';
import headTier2 from '../../../public/item-data/equipment/head/head_tier2.json';
import headTier3 from '../../../public/item-data/equipment/head/head_tier3.json';
import headTier4 from '../../../public/item-data/equipment/head/head_tier4.json';
import headTier5 from '../../../public/item-data/equipment/head/head_tier5.json';
import glovesTier1 from '../../../public/item-data/equipment/gloves/gloves_tier1.json';
import glovesTier2 from '../../../public/item-data/equipment/gloves/gloves_tier2.json';
import glovesTier3 from '../../../public/item-data/equipment/gloves/gloves_tier3.json';
import glovesTier4 from '../../../public/item-data/equipment/gloves/gloves_tier4.json';
import glovesTier5 from '../../../public/item-data/equipment/gloves/gloves_tier5.json';

// Tier-1-Pool und Tier-2+-Pool je Shop — 2 Items im Angebot sind garantiert
// Tier 2 oder höher, der Rest ist Tier 1 (siehe generateShopSelection()).
const smitherTier1Pool: any[] = [...chestTier1, ...legTier1, ...footwearTier1];
const smitherHigherTierPool: any[] = [
  ...chestTier2, ...chestTier3, ...chestTier4, ...chestTier5,
  ...legTier2, ...legTier3, ...legTier4, ...legTier5,
    ...footwearTier2, ...footwearTier3, ...footwearTier4, ...footwearTier5,
];

const generalTier1Pool: any[] = [...headTier1, ...glovesTier1];
const generalHigherTierPool: any[] = [
  ...headTier2, ...headTier3, ...headTier4, ...headTier5,
  ...glovesTier2, ...glovesTier3, ...glovesTier4, ...glovesTier5,
];

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
  private personalItemsService = inject(PersonalItemsService);

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
  public sellConfirmSource = signal<'inventar' | 'personal'>('inventar');

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
    this.sellConfirmSource.set('inventar');
  }

  /**
   * Verkauft ein Item für 50% seines Preises — aus dem normalen Inventar
   * oder aus den persönlichen (soulbound) Items.
   *
   * @param itemIndex Index des Items in der jeweiligen Quell-Liste.
   * @param source    'inventar' (Default) oder 'personal'.
   * @returns true, wenn der Verkauf erfolgreich war.
   */
  public sellItem(itemIndex: number, source: 'inventar' | 'personal' = 'inventar'): boolean {
    const items = source === 'personal'
      ? this.personalItemsService.personalItems()?.items
      : this.inventarService.inventar()?.items;
    const item = items?.[itemIndex];

    if (!item || item.equipped) {
      console.warn('❌ Dieses Item kann nicht verkauft werden (ausgerüstet oder nicht vorhanden)!');
      return false;
    }

    this.walletService.addGold(getSellPrice(item.price));

    if (source === 'personal') {
      this.personalItemsService.removeItemAt(itemIndex);
    } else {
      this.inventarService.removeItemFromInventar(itemIndex);
    }

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

  /**
   * Würfelt das Angebot für einen Ausrüstungs-Shop: `guaranteedHigherTierCount`
   * Items kommen garantiert aus `higherTierPool` (Tier 2+), der Rest aus
   * `tier1Pool` (Ziehen jeweils mit Zurücklegen). Die Reihenfolge der
   * Shop-Plätze wird danach gemischt.
   *
   * @param tier1Pool               Pool mit reinen Tier-1-Items.
   * @param higherTierPool          Pool mit Tier-2-bis-5-Items.
   * @param itemCount               Anzahl der Shop-Plätze.
   * @param guaranteedHigherTierCount Anzahl garantierter Tier-2+-Items.
   */
  private generateShopSelection(
    tier1Pool: any[],
    higherTierPool: any[],
    itemCount: number,
    guaranteedHigherTierCount: number,
  ): any[] {
    const higherTierCount = higherTierPool.length > 0
      ? Math.min(guaranteedHigherTierCount, itemCount)
      : 0;
    const tier1Count = itemCount - higherTierCount;

    const selectedItems: any[] = [
      ...this.generatePoolSelection(higherTierPool, higherTierCount),
      ...this.generatePoolSelection(tier1Pool, tier1Count),
    ];

    // Fisher-Yates: garantierte Tier-2+-Items nicht immer auf denselben Plätzen
    for (let i = selectedItems.length - 1; i > 0; i--) {
      const j = this.utilityService.getRandomIndex(selectedItems.slice(0, i + 1));
      [selectedItems[i], selectedItems[j]] = [selectedItems[j], selectedItems[i]];
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
    this.smitherShopItems.set(
      this.generateShopSelection(smitherTier1Pool, smitherHigherTierPool, 5, 2),
    );
    this.generalSuppliesShopItems.set(
      this.generateShopSelection(generalTier1Pool, generalHigherTierPool, 5, 2),
    );

    this.saveAllShopsToLocalStorage();
  }
}
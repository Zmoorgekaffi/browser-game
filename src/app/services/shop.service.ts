import { Injectable, inject, signal, computed } from '@angular/core';
import { UtilityService } from './utility.service';

// 1. IMPORTIERE ALLE ITEM-POOLS HIER CENTRAL
import amuletsData from '../../../public/item-data/amulets.json';
import weaponsData from '../../../public/item-data/amulets.json';        // Für Smither
import suppliesData from '../../../public/item-data/amulets.json';      // Für GeneralSupplies
// import armorData from '../../../public/item-data/armor.json';        // Für die Zukunft

interface AllShopsData {
  magic: any[];
  weapon: any[];
  armor: any[];
  alchemist: any[];
}

@Injectable({
  providedIn: 'root',
})
export class ShopService {
  private utilityService = inject(UtilityService);

  // Interne reaktive Signale für die einzelnen Shops
  private magicShopItems = signal<any[]>([]);
  private weaponShopItems = signal<any[]>([]);      // Nutzt Smither
  private armorShopItems = signal<any[]>([]);       // Für Rüstungen reserviert
  private alchemistShopItems = signal<any[]>([]);   // Nutzt GeneralSupplies

  // Öffentliche Lese-Signals für deine Komponenten
  public currentMagicItems = computed(() => this.magicShopItems());
  public currentWeaponItems = computed(() => this.weaponShopItems());
  public currentArmorItems = computed(() => this.armorShopItems());
  public currentAlchemistItems = computed(() => this.alchemistShopItems());

  private activeCharId: string | null = null;

  // item-info-card globaler Zustand
  public itemInfoCardShow = signal<boolean>(false);
  public currentDisplayedItem = signal<any>(null);

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

  private generatePoolSelection(itemPool: any[], itemCount: number): any[] {
    const selectedItems: any[] = [];
    if (!itemPool || itemPool.length === 0) return selectedItems;

    for (let i = 0; i < itemCount; i++) {
      const randomIndex = this.utilityService.getRandomIndex(itemPool);
      selectedItems.push({ ...itemPool[randomIndex] });
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
    console.log('🛍️ Alle Shop-Daten wurden gebündelt im localStorage gespeichert!');
  }

  /**
   * DIE ZENTRALE WÜRFEL-MASCHINE FÜR JEDEN RUN
   * Hier bestimmen wir, welcher Händler wie viele Gegenstände aus welchem Pool erhält.
   */
  public rerollAllShopsAtEndOfRun() {
    // 1. Magic Shop bekommt 6 Amulette
    this.magicShopItems.set(this.generatePoolSelection(amuletsData, 6));

    // 2. Smither (Waffenschmied) bekommt 5 Waffen gewürfelt
    this.weaponShopItems.set(this.generatePoolSelection(weaponsData, 5));

    // 3. General Supplies bekommt 5 Verbrauchsgüter gewürfelt (wird im alchemist-Slot gespeichert)
    this.alchemistShopItems.set(this.generatePoolSelection(suppliesData, 5));
    
    // Rüstungs-Shop ist aktuell noch Standby-Leer für zukünftige Rüstungs-JSONs
    this.armorShopItems.set([]);

    // 4. Alles zusammen atomar wegschreiben
    this.saveAllShopsToLocalStorage();
    console.log('🔄 Alle Händler der Stadt (Magic, Smither, Supplies) wurden frisch bestückt!');
  }
}
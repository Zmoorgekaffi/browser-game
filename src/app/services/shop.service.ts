import { Injectable, inject, signal, computed } from '@angular/core';
import { UtilityService } from './utility.service';

// Importiere deine JSON-Rohdaten (Beispiel für Amulette)
import amuletsData from '../../../public/item-data/amulets.json';
// Hier kannst du später deine anderen JSONs importieren:
// import weaponsData from '../../../public/item-data/weapons.json';
// import armorData from '../../../public/item-data/armor.json';

// Interface für die Struktur im LocalStorage
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
  private weaponShopItems = signal<any[]>([]);
  private armorShopItems = signal<any[]>([]);
  private alchemistShopItems = signal<any[]>([]);

  // Öffentliche Lese-Signals für deine Komponenten
  public currentMagicItems = computed(() => this.magicShopItems());
  public currentWeaponItems = computed(() => this.weaponShopItems());
  public currentArmorItems = computed(() => this.armorShopItems());
  public currentAlchemistItems = computed(() => this.alchemistShopItems());

  // Wir merken uns die geladene charId fürs Speichern
  private activeCharId: string | null = null;

  // item-info-card
  public itemInfoCardShow = signal<boolean>(false);
  public currentDisplayedItem = signal<any>(null);

  /**
   * Wird von GameStateService.loadCharacterData() aufgerufen
   */
  public init(charId: string) {
    this.activeCharId = charId;
    console.log('activeCharIdIn Shop.service.ts:', charId);
    
    
    // Wir laden das EINE zentrale Shops-Objekt nach deinem Wunsch
    const savedShopsRaw = localStorage.getItem(`${charId}_shops`);
    
    if (savedShopsRaw) {
      const shopsData: AllShopsData = JSON.parse(savedShopsRaw);
      
      // Befülle die Signale aus dem geladenen Objekt
      this.magicShopItems.set(shopsData.magic || []);
      this.weaponShopItems.set(shopsData.weapon || []);
      this.armorShopItems.set(shopsData.armor || []);
      this.alchemistShopItems.set(shopsData.alchemist || []);
    } else {
      // Wenn der Charakter neu ist oder das Objekt fehlt: Alle Shops initial generieren!
      this.rerollAllShopsAtEndOfRun();

    }
  }

  /**
   * Universelle interne Hilfsfunktion zum Auswürfeln aus einer beliebigen JSON-Liste
   */
  private generatePoolSelection(itemPool: any[], itemCount: number): any[] {
    const selectedItems: any[] = [];
    if (!itemPool || itemPool.length === 0) return selectedItems;

    for (let i = 0; i < itemCount; i++) {
      const randomIndex = this.utilityService.getRandomIndex(itemPool);
      selectedItems.push({ ...itemPool[randomIndex] });
    }
    return selectedItems;
  }

  /**
   * ZENTRALE SPEICHER-FUNKTION
   * Packt alle aktuellen Signal-Zustände in ein Objekt und schreibt es in den LocalStorage
   */
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
   * Würfelt NUR den Magic Shop neu aus (z.B. falls du mal einen einzelnen Reroll erlaubst)
   */
  public rerollMagicShop() {
    const newItems = this.generatePoolSelection(amuletsData, 6); // 6 Items auswürfeln
    this.magicShopItems.set(newItems);
    
    // Nach der Änderung das gesamte Objekt updaten
    this.saveAllShopsToLocalStorage();
  }

  /**
   * DIE FUNKTION FÜR DAS ENDE DEINES ABENTEUERS
   * Würfelt alle Läden komplett neu aus und speichert das gebündelte Gesamt-Objekt
   */
  public rerollAllShopsAtEndOfRun() {
    // 1. Magic Shop neu auswürfeln
    this.magicShopItems.set(this.generatePoolSelection(amuletsData, 6));

    // 2. Hier später deine anderen JSON-Pools eintragen sobald fertig:
    // this.weaponShopItems.set(this.generatePoolSelection(weaponsData, 5));
    // this.armorShopItems.set(this.generatePoolSelection(armorData, 5));
    
    // Standby-Leere Arrays für noch nicht implementierte Shops, damit kein "undefined" entsteht
    this.weaponShopItems.set([]);
    this.armorShopItems.set([]);
    this.alchemistShopItems.set([]);

    // 3. Alles zusammen in einen einzigen LocalStorage-Key schreiben
    this.saveAllShopsToLocalStorage();
    console.log('🔄 Alle Händler der Stadt wurden für den neuen Run neu bestückt!');
  }
}
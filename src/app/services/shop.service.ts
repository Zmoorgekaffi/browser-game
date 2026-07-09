import { Injectable, inject, signal, computed } from '@angular/core';
import { UtilityService } from './utility.service';
import { WalletService } from './wallet.service';
import { InventarService } from './inventar.service';
import { PersonalItemsService } from './personal-items.service';
import { SkillsService } from './skills.service';
import { getSellPrice } from '../utils/item-display.util';

// ✨ Magie-Laden: Necklace + Ring (Tier 1-5)
import necklaceTier1 from '../../../public/item-data/equipment/necklace/necklace_tier1.json';
import necklaceTier2 from '../../../public/item-data/equipment/necklace/necklace_tier2.json';
import necklaceTier3 from '../../../public/item-data/equipment/necklace/necklace_tier3.json';
import necklaceTier4 from '../../../public/item-data/equipment/necklace/necklace_tier4.json';
import necklaceTier5 from '../../../public/item-data/equipment/necklace/necklace_tier5.json';
import ringTier1 from '../../../public/item-data/equipment/ring/ring_tier1.json';
import ringTier2 from '../../../public/item-data/equipment/ring/ring_tier2.json';
import ringTier3 from '../../../public/item-data/equipment/ring/ring_tier3.json';
import ringTier4 from '../../../public/item-data/equipment/ring/ring_tier4.json';
import ringTier5 from '../../../public/item-data/equipment/ring/ring_tier5.json';

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
import weaponTier1 from '../../../public/item-data/weapons/weapon_tier1.json';
import weaponTier2 from '../../../public/item-data/weapons/weapon_tier2.json';
import weaponTier3 from '../../../public/item-data/weapons/weapon_tier3.json';
import weaponTier4 from '../../../public/item-data/weapons/weapon_tier4.json';
import weaponTier5 from '../../../public/item-data/weapons/weapon_tier5.json';
import materials from '../../../public/item-data/materials.json';

// 🧪 Tränke: Gemischtwaren wird zum Verbrauchsgüter-Laden (Tränke + Materialien)
import healthPotionsTier1 from '../../../public/item-data/potions/health/healthpotions_t1.json';
import healthPotionsTier2 from '../../../public/item-data/potions/health/healthpotions_t2.json';
import healthPotionsTier3 from '../../../public/item-data/potions/health/healthpotions_t3.json';
import healthPotionsTier4 from '../../../public/item-data/potions/health/healthpotions_t4.json';
import healthPotionsTier5 from '../../../public/item-data/potions/health/healthpotions_t5.json';
import manaPotionsTier1 from '../../../public/item-data/potions/mana/manapotions_t1.json';
import manaPotionsTier2 from '../../../public/item-data/potions/mana/manapotions_t2.json';
import manaPotionsTier3 from '../../../public/item-data/potions/mana/manapotions_t3.json';
import manaPotionsTier4 from '../../../public/item-data/potions/mana/manapotions_t4.json';
import manaPotionsTier5 from '../../../public/item-data/potions/mana/manapotions_t5.json';
import buffPotionsTier1 from '../../../public/item-data/potions/buff/buffpotions_t1.json';
import buffPotionsTier2 from '../../../public/item-data/potions/buff/buffpotions_t2.json';
import buffPotionsTier3 from '../../../public/item-data/potions/buff/buffpotions_t3.json';
import buffPotionsTier4 from '../../../public/item-data/potions/buff/buffpotions_t4.json';
import buffPotionsTier5 from '../../../public/item-data/potions/buff/buffpotions_t5.json';

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

// ✨ Skill-Shop (Magie-Laden): 6 Kategorien x Tier 1-5, je 1 Spell pro Tier.
import firespellsTier1 from '../../../public/item-data/skills/magic/fire/firespells_tier1.json';
import firespellsTier2 from '../../../public/item-data/skills/magic/fire/firespells_tier2.json';
import firespellsTier3 from '../../../public/item-data/skills/magic/fire/firespells_tier3.json';
import firespellsTier4 from '../../../public/item-data/skills/magic/fire/firespells_tier4.json';
import firespellsTier5 from '../../../public/item-data/skills/magic/fire/firespells_tier5.json';
import coldspellsTier1 from '../../../public/item-data/skills/magic/cold/coldspells_tier1.json';
import coldspellsTier2 from '../../../public/item-data/skills/magic/cold/coldspells_tier2.json';
import coldspellsTier3 from '../../../public/item-data/skills/magic/cold/coldspells_tier3.json';
import coldspellsTier4 from '../../../public/item-data/skills/magic/cold/coldspells_tier4.json';
import coldspellsTier5 from '../../../public/item-data/skills/magic/cold/coldspells_tier5.json';
import lightningspellsTier1 from '../../../public/item-data/skills/magic/lightning/lightningspells_tier1.json';
import lightningspellsTier2 from '../../../public/item-data/skills/magic/lightning/lightningspells_tier2.json';
import lightningspellsTier3 from '../../../public/item-data/skills/magic/lightning/lightningspells_tier3.json';
import lightningspellsTier4 from '../../../public/item-data/skills/magic/lightning/lightningspells_tier4.json';
import lightningspellsTier5 from '../../../public/item-data/skills/magic/lightning/lightningspells_tier5.json';
import chaosspellsTier1 from '../../../public/item-data/skills/magic/chaos/chaosspells_tier1.json';
import chaosspellsTier2 from '../../../public/item-data/skills/magic/chaos/chaosspells_tier2.json';
import chaosspellsTier3 from '../../../public/item-data/skills/magic/chaos/chaosspells_tier3.json';
import chaosspellsTier4 from '../../../public/item-data/skills/magic/chaos/chaosspells_tier4.json';
import chaosspellsTier5 from '../../../public/item-data/skills/magic/chaos/chaosspells_tier5.json';
import physicalspellsTier1 from '../../../public/item-data/skills/physical/physicalspells_tier1.json';
import physicalspellsTier2 from '../../../public/item-data/skills/physical/physicalspells_tier2.json';
import physicalspellsTier3 from '../../../public/item-data/skills/physical/physicalspells_tier3.json';
import physicalspellsTier4 from '../../../public/item-data/skills/physical/physicalspells_tier4.json';
import physicalspellsTier5 from '../../../public/item-data/skills/physical/physicalspells_tier5.json';
import healspellsTier1 from '../../../public/item-data/skills/heal/healspells_tier1.json';
import healspellsTier2 from '../../../public/item-data/skills/heal/healspells_tier2.json';
import healspellsTier3 from '../../../public/item-data/skills/heal/healspells_tier3.json';
import healspellsTier4 from '../../../public/item-data/skills/heal/healspells_tier4.json';
import healspellsTier5 from '../../../public/item-data/skills/heal/healspells_tier5.json';
import energyshieldspellsTier1 from '../../../public/item-data/skills/energy-shield/energyshieldspells_tier1.json';
import energyshieldspellsTier2 from '../../../public/item-data/skills/energy-shield/energyshieldspells_tier2.json';
import energyshieldspellsTier3 from '../../../public/item-data/skills/energy-shield/energyshieldspells_tier3.json';
import energyshieldspellsTier4 from '../../../public/item-data/skills/energy-shield/energyshieldspells_tier4.json';
import energyshieldspellsTier5 from '../../../public/item-data/skills/energy-shield/energyshieldspells_tier5.json';

// Aufwerte-Materialien nach Typ getrennt: beide gehören jetzt (wie Tränke)
// zum Gemischtwaren-Laden, der reinen Verbrauchsgüter-Shop geworden ist —
// siehe WeaponUpgradeService.requiredMaterialType für die Verwendung.
const grindingMaterials: any[] = materials.filter((m: any) => m['material-type'] === 'grinding');
const upgradeCremeMaterials: any[] = materials.filter((m: any) => m['material-type'] === 'upgrade-creme');

// Tier-1-Pool und Tier-2+-Pool je Shop — 2 Items im Angebot sind garantiert
// Tier 2 oder höher, der Rest ist Tier 1 (siehe generateShopSelection()).
// 🛠️ Schmied verkauft jetzt ALLE Ausrüstung (Kopf/Handschuhe sind vom
// Gemischtwaren-Laden hierher gewandert, der reiner Verbrauchsgüter-Shop wird).
const smitherTier1Pool: any[] = [
  ...chestTier1, ...legTier1, ...footwearTier1, ...weaponTier1,
  ...headTier1, ...glovesTier1,
];
const smitherHigherTierPool: any[] = [
  ...chestTier2, ...chestTier3, ...chestTier4, ...chestTier5,
  ...legTier2, ...legTier3, ...legTier4, ...legTier5,
  ...footwearTier2, ...footwearTier3, ...footwearTier4, ...footwearTier5,
  ...weaponTier2, ...weaponTier3, ...weaponTier4, ...weaponTier5,
  ...headTier2, ...headTier3, ...headTier4, ...headTier5,
  ...glovesTier2, ...glovesTier3, ...glovesTier4, ...glovesTier5,
];

// 🧪 Gemischtwaren: reiner Verbrauchsgüter-Laden — Tränke (Heil/Mana/Buff) +
// Aufwertungsmaterialien. Keine Ausrüstung mehr (siehe smither-Pools oben).
const generalTier1Pool: any[] = [...healthPotionsTier1, ...manaPotionsTier1, ...buffPotionsTier1];
const generalHigherTierPool: any[] = [
  ...healthPotionsTier2, ...healthPotionsTier3, ...healthPotionsTier4, ...healthPotionsTier5,
  ...manaPotionsTier2, ...manaPotionsTier3, ...manaPotionsTier4, ...manaPotionsTier5,
  ...buffPotionsTier2, ...buffPotionsTier3, ...buffPotionsTier4, ...buffPotionsTier5,
  ...grindingMaterials,
  ...upgradeCremeMaterials,
];

const magicTier1Pool: any[] = [...necklaceTier1, ...ringTier1];
const magicHigherTierPool: any[] = [
  ...necklaceTier2, ...necklaceTier3, ...necklaceTier4, ...necklaceTier5,
  ...ringTier2, ...ringTier3, ...ringTier4, ...ringTier5,
];

// ✨ Skill-Shop-Pool: Tier-1-Spells aller 6 Kategorien vs. Tier 2-5.
const skillsTier1Pool: any[] = [
  ...firespellsTier1, ...coldspellsTier1, ...lightningspellsTier1,
  ...chaosspellsTier1, ...physicalspellsTier1, ...healspellsTier1,
  ...energyshieldspellsTier1,
];
const skillsHigherTierPool: any[] = [
  ...firespellsTier2, ...firespellsTier3, ...firespellsTier4, ...firespellsTier5,
  ...coldspellsTier2, ...coldspellsTier3, ...coldspellsTier4, ...coldspellsTier5,
  ...lightningspellsTier2, ...lightningspellsTier3, ...lightningspellsTier4, ...lightningspellsTier5,
  ...chaosspellsTier2, ...chaosspellsTier3, ...chaosspellsTier4, ...chaosspellsTier5,
  ...physicalspellsTier2, ...physicalspellsTier3, ...physicalspellsTier4, ...physicalspellsTier5,
  ...healspellsTier2, ...healspellsTier3, ...healspellsTier4, ...healspellsTier5,
  ...energyshieldspellsTier2, ...energyshieldspellsTier3, ...energyshieldspellsTier4, ...energyshieldspellsTier5,
];

interface AllShopsData {
  magic: any[];
  smither: any[];
  'general': any[];
  skills: any[];
}

// Auf 3 feste Item-Shop-Typen reduziert + der separat behandelte Skill-Shop
// (kein ShopType-Member, weil er nicht über die Item-Info-Card/Inventar
// läuft, sondern Spells direkt in den SkillsService "lernt" — siehe unten).
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
  private skillsService = inject(SkillsService);

  // Die 3 reaktiven Item-Shop-Signals
  private magicShopItems = signal<any[]>([]);
  private smitherShopItems = signal<any[]>([]);
  private generalSuppliesShopItems = signal<any[]>([]);

  // Computed Properties für deine UI-Komponenten
  public currentMagicItems = computed(() => this.magicShopItems());
  public currentSmitherItems = computed(() => this.smitherShopItems());
  public currentGeneralSuppliesItems = computed(() => this.generalSuppliesShopItems());

  // ✨ Skill-Shop: 3 zufällige Spells im Angebot (eigener Kauf-Flow, siehe buySkill()).
  private skillShopItems = signal<any[]>([]);
  public currentSkillShopItems = computed(() => this.skillShopItems());
  public skillShopPanelShow = signal<boolean>(false);

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
      this.skillShopItems.set(shopsData.skills || []);
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
   * Blättert von der offenen Item-Info-Card aus zum nächsten/vorherigen
   * Item desselben Shops (wrap-around: nach dem letzten kommt wieder das
   * erste). Bereits verkaufte Plätze werden dabei übersprungen.
   *
   * @param direction +1 für vorwärts (rechter Pfeil), -1 für rückwärts.
   */
  public cycleItem(direction: 1 | -1): void {
    const shopType = this.activeShopType();
    const currentIndex = this.activeItemIndex();
    if (shopType === null || currentIndex === null) return;

    const shopSignal = this.getSignalByShopType(shopType);
    if (!shopSignal) return;

    const items = shopSignal();
    const count = items.length;
    if (count === 0) return;

    for (let step = 1; step <= count; step++) {
      const nextIndex = ((currentIndex + direction * step) % count + count) % count;
      const nextItem = items[nextIndex];
      if (nextItem && !nextItem.isSold) {
        this.activeItemIndex.set(nextIndex);
        this.currentDisplayedItem.set(nextItem);
        return;
      }
    }
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

  /** Öffnet den Skill-Shop (3 zufällige Spells zum Erlernen). */
  public openSkillShop(): void {
    this.skillShopPanelShow.set(true);
  }

  /** Schließt den Skill-Shop. */
  public closeSkillShop(): void {
    this.skillShopPanelShow.set(false);
  }

  /**
   * Kauft/lernt einen Spell aus dem Skill-Shop-Angebot. Anders als
   * buyCurrentlySelectedItem() landet das Ergebnis nicht im Inventar,
   * sondern direkt in SkillsService.updateSpells('learn', ...).
   *
   * @param index Platz im skillShopItems-Array.
   * @returns true, wenn der Kauf erfolgreich war.
   */
  public buySkill(index: number): boolean {
    const currentItems = [...this.skillShopItems()];
    const spell = currentItems[index];

    if (!spell || spell.isSold || !spell.price) {
      console.warn('❌ Dieser Spell existiert nicht oder wurde bereits verkauft!');
      return false;
    }

    const alreadyKnown = this.skillsService.spells().some((s: any) => s.id === spell.id);
    if (alreadyKnown) {
      console.warn(`❌ "${spell.name}" ist bereits erlernt!`);
      return false;
    }

    const hasEnoughGold = this.walletService.spendGold(spell.price);
    if (!hasEnoughGold) {
      console.error('❌ Nicht genug Gold für diesen Spell!');
      return false;
    }

    this.skillsService.updateSpells('learn', spell);

    currentItems[index] = { isSold: true };
    this.skillShopItems.set(currentItems);
    this.saveAllShopsToLocalStorage();

    console.log(`📖 *Spell "${spell.name}" erfolgreich gelernt!*`);
    return true;
  }

  /** Anzahl der Plätze im aktuell für die Info-Card aktiven Shop (für die Pfeil-Navigation). */
  public getActiveShopItemCount(): number {
    const shopType = this.activeShopType();
    if (shopType === null) return 0;
    return this.getSignalByShopType(shopType)?.().length ?? 0;
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
   * Zieht `itemCount` zufällige, eindeutige Items aus dem Pool (Ziehen ohne
   * Zurücklegen, nach Item-Name). So landet nie dasselbe Item doppelt im
   * selben Shop-Angebot.
   *
   * @param itemPool  Quell-Pool aus den JSON-Daten.
   * @param itemCount Anzahl der Shop-Plätze.
   * @param usedNames Namen, die bereits an anderer Stelle im selben Shop-Roll
   *                  gezogen wurden (z. B. aus dem Higher-Tier-Pool) und daher
   *                  hier ausgeschlossen werden. Wird um neu gezogene Namen
   *                  ergänzt.
   */
  private generatePoolSelection(
    itemPool: any[],
    itemCount: number,
    usedNames: Set<string> = new Set<string>(),
  ): any[] {
    const selectedItems: any[] = [];
    if (!itemPool || itemPool.length === 0) return selectedItems;

    const availableItems = itemPool.filter((item) => !usedNames.has(item.name));

    for (let i = 0; i < itemCount && availableItems.length > 0; i++) {
      const randomIndex = this.utilityService.getRandomIndex(availableItems);
      const [pickedItem] = availableItems.splice(randomIndex, 1);
      usedNames.add(pickedItem.name);
      selectedItems.push({ ...pickedItem, isSold: false });
    }
    return selectedItems;
  }

  /**
   * Würfelt das Angebot für einen Ausrüstungs-Shop: `guaranteedHigherTierCount`
   * Items kommen garantiert aus `higherTierPool` (Tier 2+), der Rest aus
   * `tier1Pool` (Ziehen jeweils ohne Zurücklegen, s. `generatePoolSelection`).
   * Ein gemeinsames `usedNames`-Set sorgt dafür, dass innerhalb des gesamten
   * Angebots kein Item-Name doppelt vorkommt. Die Reihenfolge der
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

    const usedNames = new Set<string>();
    const selectedItems: any[] = [
      ...this.generatePoolSelection(higherTierPool, higherTierCount, usedNames),
      ...this.generatePoolSelection(tier1Pool, tier1Count, usedNames),
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
      'general': this.generalSuppliesShopItems(),
      skills: this.skillShopItems(),
    };

    localStorage.setItem(`${this.activeCharId}_shops`, JSON.stringify(combinedShopsData));
  }

  /**
   * Generiert das Angebot für die 3 Item-Shops + den Skill-Shop (3 Spells,
   * davon garantiert 1 Tier 2+).
   */
  public rerollAllShopsAtEndOfRun() {
    this.magicShopItems.set(
      this.generateShopSelection(magicTier1Pool, magicHigherTierPool, 6, 2),
    );
    this.smitherShopItems.set(
      this.generateShopSelection(smitherTier1Pool, smitherHigherTierPool, 5, 2),
    );
    this.generalSuppliesShopItems.set(
      this.generateShopSelection(generalTier1Pool, generalHigherTierPool, 5, 2),
    );
    this.skillShopItems.set(
      this.generateShopSelection(skillsTier1Pool, skillsHigherTierPool, 3, 1),
    );

    this.saveAllShopsToLocalStorage();
  }
}
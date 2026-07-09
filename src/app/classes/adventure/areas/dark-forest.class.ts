// src/app/classes/adventure/areas/dark-forest.class.ts
import { Area, LootTable } from '../area.class';
import { Encounter } from '../encounter.interface'
import { framePaths, pad } from '../../../utils/frame-paths.util';
import { getLevelBracket, LevelBracket } from '../../../utils/level-bracket.util';
import monsterData1o10 from '../../../../../public/mosters/dark-forest/dark-forest.1-10.json'
import monsterData11o20 from '../../../../../public/mosters/dark-forest/dark-forest.11-20.json';
import monsterData21o30 from '../../../../../public/mosters/dark-forest/dark-forest.21-30.json';
import monsterData31o40 from '../../../../../public/mosters/dark-forest/dark-forest.31-40.json';
import monsterData41o50 from '../../../../../public/mosters/dark-forest/dark-forest.41-50.json';

/** Monster-Pool je Level-Bracket — analog zur LootTable, aber für Kämpfe. */
const MONSTER_POOLS: Record<LevelBracket, any[]> = {
  '1-10': monsterData1o10,
  '11-20': monsterData11o20,
  '21-30': monsterData21o30,
  '31-40': monsterData31o40,
  '41-50': monsterData41o50,
};

// ═══════════════════════════════════════════════════════════════════════
// 🎒 ITEM-POOLS
// ═══════════════════════════════════════════════════════════════════════

// 🥊 GLOVES
import glovesTier1 from '../../../../../public/item-data/equipment/gloves/gloves_tier1.json';
import glovesTier2 from '../../../../../public/item-data/equipment/gloves/gloves_tier2.json';
import glovesTier3 from '../../../../../public/item-data/equipment/gloves/gloves_tier3.json';
import glovesTier4 from '../../../../../public/item-data/equipment/gloves/gloves_tier4.json';
import glovesTier5 from '../../../../../public/item-data/equipment/gloves/gloves_tier5.json';

// 🎩 HEAD
import headTier1 from '../../../../../public/item-data/equipment/head/head_tier1.json';
import headTier2 from '../../../../../public/item-data/equipment/head/head_tier2.json';
import headTier3 from '../../../../../public/item-data/equipment/head/head_tier3.json';
import headTier4 from '../../../../../public/item-data/equipment/head/head_tier4.json';
import headTier5 from '../../../../../public/item-data/equipment/head/head_tier5.json';

// 🥋 CHEST
import chestTier1 from '../../../../../public/item-data/equipment/chest/chest_tier1.json';
import chestTier2 from '../../../../../public/item-data/equipment/chest/chest_tier2.json';
import chestTier3 from '../../../../../public/item-data/equipment/chest/chest_tier3.json';
import chestTier4 from '../../../../../public/item-data/equipment/chest/chest_tier4.json';
import chestTier5 from '../../../../../public/item-data/equipment/chest/chest_tier5.json';

// 🩳 LEG
import legTier1 from '../../../../../public/item-data/equipment/leg/leg_tier1.json';
import legTier2 from '../../../../../public/item-data/equipment/leg/leg_tier2.json';
import legTier3 from '../../../../../public/item-data/equipment/leg/leg_tier3.json';
import legTier4 from '../../../../../public/item-data/equipment/leg/leg_tier4.json';
import legTier5 from '../../../../../public/item-data/equipment/leg/leg_tier5.json';

// 👢 FOOTWEAR
import footwearTier1 from '../../../../../public/item-data/equipment/footwear/footwear_tier1.json';
import footwearTier2 from '../../../../../public/item-data/equipment/footwear/footwear_tier2.json';
import footwearTier3 from '../../../../../public/item-data/equipment/footwear/footwear_tier3.json';
import footwearTier4 from '../../../../../public/item-data/equipment/footwear/footwear_tier4.json';
import footwearTier5 from '../../../../../public/item-data/equipment/footwear/footwear_tier5.json';

// 🧣 NECKLACE
import necklaceTier1 from '../../../../../public/item-data/equipment/necklace/necklace_tier1.json';
import necklaceTier2 from '../../../../../public/item-data/equipment/necklace/necklace_tier2.json';
import necklaceTier3 from '../../../../../public/item-data/equipment/necklace/necklace_tier3.json';
import necklaceTier4 from '../../../../../public/item-data/equipment/necklace/necklace_tier4.json';
import necklaceTier5 from '../../../../../public/item-data/equipment/necklace/necklace_tier5.json';

// 💍 RING
import ringTier1 from '../../../../../public/item-data/equipment/ring/ring_tier1.json';
import ringTier2 from '../../../../../public/item-data/equipment/ring/ring_tier2.json';
import ringTier3 from '../../../../../public/item-data/equipment/ring/ring_tier3.json';
import ringTier4 from '../../../../../public/item-data/equipment/ring/ring_tier4.json';
import ringTier5 from '../../../../../public/item-data/equipment/ring/ring_tier5.json';

// ⚔️ WEAPON
import weaponTier1 from '../../../../../public/item-data/weapons/weapon_tier1.json';
import weaponTier2 from '../../../../../public/item-data/weapons/weapon_tier2.json';
import weaponTier3 from '../../../../../public/item-data/weapons/weapon_tier3.json';
import weaponTier4 from '../../../../../public/item-data/weapons/weapon_tier4.json';
import weaponTier5 from '../../../../../public/item-data/weapons/weapon_tier5.json';

// 🎒 BACK / 🎗️ ACCESSOIRE — TODO (Einzeldateien ohne Tier1-5-Ordnerstruktur,
// passen aktuell nicht ins ITEM_POOLS-Schema unten)

// 🧪 TRÄNKE (Heil/Mana/Buff, Tier 1-5)
import healthPotionsTier1 from '../../../../../public/item-data/potions/health/healthpotions_t1.json';
import healthPotionsTier2 from '../../../../../public/item-data/potions/health/healthpotions_t2.json';
import healthPotionsTier3 from '../../../../../public/item-data/potions/health/healthpotions_t3.json';
import healthPotionsTier4 from '../../../../../public/item-data/potions/health/healthpotions_t4.json';
import healthPotionsTier5 from '../../../../../public/item-data/potions/health/healthpotions_t5.json';
import manaPotionsTier1 from '../../../../../public/item-data/potions/mana/manapotions_t1.json';
import manaPotionsTier2 from '../../../../../public/item-data/potions/mana/manapotions_t2.json';
import manaPotionsTier3 from '../../../../../public/item-data/potions/mana/manapotions_t3.json';
import manaPotionsTier4 from '../../../../../public/item-data/potions/mana/manapotions_t4.json';
import manaPotionsTier5 from '../../../../../public/item-data/potions/mana/manapotions_t5.json';
import buffPotionsTier1 from '../../../../../public/item-data/potions/buff/buffpotions_t1.json';
import buffPotionsTier2 from '../../../../../public/item-data/potions/buff/buffpotions_t2.json';
import buffPotionsTier3 from '../../../../../public/item-data/potions/buff/buffpotions_t3.json';
import buffPotionsTier4 from '../../../../../public/item-data/potions/buff/buffpotions_t4.json';
import buffPotionsTier5 from '../../../../../public/item-data/potions/buff/buffpotions_t5.json';

// 🧴 AUFWERTUNGSMATERIALIEN — nur Tier-2-Bucket befüllt (siehe ITEM_POOLS.material
// unten), damit sie über TIER_DISTRIBUTION eine feste "Tier-2-Dropchance" bekommen.
import materials from '../../../../../public/item-data/materials.json';

// 💬 ENCOUNTERS
import elfEncounter from '../../../../../public/encounters/dark-forest/elf-encounter.json';
import merchantEncounter from '../../../../../public/encounters/dark-forest/merchant-encounter.json';
import lostChildEncounter from '../../../../../public/encounters/dark-forest/lost-child-encounter.json';
import witchEncounter from '../../../../../public/encounters/dark-forest/witch-encounter.json';
import woundedKnightEncounter from '../../../../../public/encounters/dark-forest/wounded-knight-encounter.json';
import koboldEncounter from '../../../../../public/encounters/dark-forest/kobold-encounter.json';

type TierNumber = 1 | 2 | 3 | 4 | 5;
type SlotTierMap = Record<TierNumber, any[]>;
type TierCounts = Record<TierNumber, number>;

const ITEM_POOLS: Record<string, SlotTierMap> = {
  gloves: {
    1: glovesTier1,
    2: glovesTier2,
    3: glovesTier3,
    4: glovesTier4,
    5: glovesTier5,
  },
  head: {
    1: headTier1,
    2: headTier2,
    3: headTier3,
    4: headTier4,
    5: headTier5,
  },
  chest: {
    1: chestTier1,
    2: chestTier2,
    3: chestTier3,
    4: chestTier4,
    5: chestTier5,
  },
  leg: {
    1: legTier1,
    2: legTier2,
    3: legTier3,
    4: legTier4,
    5: legTier5,
  },
  footwear: {
    1: footwearTier1,
    2: footwearTier2,
    3: footwearTier3,
    4: footwearTier4,
    5: footwearTier5,
  },
  necklace: {
    1: necklaceTier1,
    2: necklaceTier2,
    3: necklaceTier3,
    4: necklaceTier4,
    5: necklaceTier5,
  },
  ring: {
    1: ringTier1,
    2: ringTier2,
    3: ringTier3,
    4: ringTier4,
    5: ringTier5,
  },
  weapon: {
    1: weaponTier1,
    2: weaponTier2,
    3: weaponTier3,
    4: weaponTier4,
    5: weaponTier5,
  },
  // 🎒 BACK / 🎗️ ACCESSOIRE bewusst ausgelassen — Einzeldateien ohne
  // Tier1-5-Ordnerstruktur, passen nicht ins TierNumber-Schema oben.

  // 🧪 Tränke — normale Tier-Skalierung wie Ausrüstung (über TIER_DISTRIBUTION).
  'potion-health': {
    1: healthPotionsTier1,
    2: healthPotionsTier2,
    3: healthPotionsTier3,
    4: healthPotionsTier4,
    5: healthPotionsTier5,
  },
  'potion-mana': {
    1: manaPotionsTier1,
    2: manaPotionsTier2,
    3: manaPotionsTier3,
    4: manaPotionsTier4,
    5: manaPotionsTier5,
  },
  'potion-buff': {
    1: buffPotionsTier1,
    2: buffPotionsTier2,
    3: buffPotionsTier3,
    4: buffPotionsTier4,
    5: buffPotionsTier5,
  },
  // 🧴 Aufwertungsmaterialien — bewusst NUR im Tier-2-Bucket befüllt (Tier
  // 1/3/4/5 bleiben leer), damit sie in JEDEM Level-Bracket ausschließlich
  // über den Tier-2-Anteil von TIER_DISTRIBUTION droppen ("Tier-2-Dropchance").
  material: {
    1: [],
    2: materials,
    3: [],
    4: [],
    5: [],
  },
};

/**
 * Basis-Verteilung PRO SLOT: wie viele Items pro Tier je Level-Range in
 * den Loot-Pool wandern (ohne Magic-Find-Bonus).
 */
const TIER_DISTRIBUTION: Record<keyof LootTable, TierCounts> = {
  '1-10':  { 1: 9, 2: 0, 3: 0, 4: 0, 5: 0 },
  '11-20': { 1: 6, 2: 3, 3: 0, 4: 0, 5: 0 },
  '21-30': { 1: 3, 2: 3, 3: 3, 4: 0, 5: 0 },
  '31-40': { 1: 0, 2: 3, 3: 3, 4: 3, 5: 0 },
  '41-50': { 1: 0, 2: 0, 3: 3, 4: 3, 5: 3 },
};

/**
 * Alle 20 MF = 1 Upgrade-Step. Danach kann's über MF_STEP_SIZE hier
 * zentral getunt werden ohne dass irgendwo sonst was angefasst werden muss.
 */
const MF_STEP_SIZE = 20;

/**
 * Die 25 Intro-Frames des Düsterwalds (frame_0000.webp ... frame_0024.webp).
 * Wird aktuell für Intro, Loot-Intro UND Loot-Hintergrund verwendet —
 * vorher standen hier drei identische, handgepflegte 25-Zeilen-Arrays.
 */
const DARK_FOREST_INTRO_FRAMES = framePaths(
  44,
  (i) => `imgs/areas/dark-forest/intro/frame_${pad(i, 4)}.webp`,
);

/**
 * @class DarkForest
 * @description Konkrete Adventure-Area "Düsterwald": generiert die
 * eventSteps, befüllt Kämpfe/Dialoge und baut die Level- und
 * Magic-Find-abhängige LootTable auf.
 */
export class DarkForest extends Area {
  override name = 'Düsterwald';
  override monsterPool: any[] = [];
  override eventSteps: any[] = [];

  override introDuration: number = 4000;
  override introPaths = [...DARK_FOREST_INTRO_FRAMES];

  override lootIntroDuration: number = 2000;
  override lootIntroPaths: any[] = [...DARK_FOREST_INTRO_FRAMES];

  override lootSceneDuration: number = 4000;
  override lootScenePaths: any[] = [...DARK_FOREST_INTRO_FRAMES];

  override lootTable: LootTable = {
    '1-10': [],
    '11-20': [],
    '21-30': [],
    '31-40': [],
    '41-50': [],
  };

  // 💬 Alle möglichen Dialog-Begegnungen für den Düsterwald
  override encounters: Encounter[] = [
    elfEncounter as Encounter,
    merchantEncounter as Encounter,
    lostChildEncounter as Encounter,
    witchEncounter as Encounter,
    woundedKnightEncounter as Encounter,
    koboldEncounter as Encounter,
  ];

  /**
   * @param playerLevel Level des Spielers (bestimmt das Loot-Tier).
   * @param magicFind   Magic-Find-Wert (verbessert die Tier-Verteilung).
   */
  constructor(playerLevel: number, magicFind: number = 0) {
    super(playerLevel, magicFind);
    const bracket = getLevelBracket(playerLevel);
    this.monsterPool = MONSTER_POOLS[bracket];
    this.eventSteps = this.generateSteps(4, 8);
    this.populateFights(this.monsterPool);
    this.populateDialogs(); // 💬 Encounters auf dialog-Steps verteilen
    this.lootTable = this.buildLootTable();
    console.log(`👹 Monster-Pool für Bracket ${bracket} (playerLevel=${playerLevel}):`, this.monsterPool);
    console.log('die generierten steps sind: ', this.eventSteps);
    console.log(`🎲 LootTable generiert (playerLevel=${playerLevel}, magicFind=${magicFind}):`, this.lootTable);
  }

  /**
   * Baut die LootTable dynamisch auf:
   *   1. Basis-Distribution aus TIER_DISTRIBUTION laden
   *   2. Magic-Find-Bonus draufrechnen (Tier-Upgrades)
   *   3. Pro Slot in ITEM_POOLS die passende Anzahl Items pro Tier ziehen
   */
  private buildLootTable(): LootTable {
    const table: LootTable = {
      '1-10': [],
      '11-20': [],
      '21-30': [],
      '31-40': [],
      '41-50': [],
    };

    (Object.keys(TIER_DISTRIBUTION) as (keyof LootTable)[]).forEach((range) => {
      const baseDistribution = TIER_DISTRIBUTION[range];
      const adjustedDistribution = this.applyMagicFindBonus(baseDistribution, this.magicFind);

      console.log(
        `🎁 [buildLootTable] ${range}: base=`,
        baseDistribution,
        `→ adjusted (MF=${this.magicFind}):`,
        adjustedDistribution
      );

      Object.entries(ITEM_POOLS).forEach(([slotType, tierPools]) => {
        ([1, 2, 3, 4, 5] as TierNumber[]).forEach((tier) => {
          const count = adjustedDistribution[tier];
          if (count <= 0) return;

          const pool = tierPools[tier];
          if (!pool || pool.length === 0) {
            console.warn(
              `[buildLootTable] Leerer Pool für ${slotType} Tier ${tier} — überspringe.`
            );
            return;
          }

          const picked = this.pickRandomItems(pool, count);
          for (const item of picked) {
            table[range].push({
              item,
              'drop-chance': item['drop-chance'] ?? 1,
            });
          }
        });
      });
    });

    return table;
  }

  /**
   * 🍀 Wendet Magic-Find auf die Tier-Verteilung an.
   *
   * Pro `MF_STEP_SIZE` (default 20) Punkte MF wird EIN Upgrade-Schritt
   * durchgeführt:
   *   → Suche den NIEDRIGSTEN Tier-Slot der noch existiert (count > 0)
   *     UND noch upgradbar ist (tier < 5).
   *   → Reduziere ihn um 1 und erhöhe den darüberliegenden Tier um 1.
   *
   * Beispiel bei MF=20, Range 21-30 (base: 3T1 + 3T2 + 3T3):
   *   Step 1: T1 niedrigster → 2T1 + 4T2 + 3T3
   *
   * Beispiel bei MF=80, Range 21-30:
   *   Steps 1-3: T1 leerfahren → 0T1 + 6T2 + 3T3
   *   Step 4: jetzt T2 niedrigster → 0T1 + 5T2 + 4T3
   *
   * Wenn alles bereits T5 ist, brechen weitere Steps still ab.
   */
  private applyMagicFindBonus(
    baseDistribution: TierCounts,
    magicFind: number
  ): TierCounts {
    const result: TierCounts = { ...baseDistribution };
    const upgradeSteps = Math.floor(Math.max(0, magicFind) / MF_STEP_SIZE);

    for (let step = 0; step < upgradeSteps; step++) {
      let lowestUpgradable: TierNumber | null = null;

      // Von T1 aufwärts suchen — erster Tier mit count > 0 UND tier < 5
      for (const tier of [1, 2, 3, 4] as TierNumber[]) {
        if (result[tier] > 0) {
          lowestUpgradable = tier;
          break;
        }
      }

      // Keiner mehr upgradbar → keine weiteren Steps möglich (alles ist T5)
      if (lowestUpgradable === null) break;

      result[lowestUpgradable]--;
      result[(lowestUpgradable + 1) as TierNumber]++;
    }

    return result;
  }

  /**
   * Zieht `count` random Items aus dem Pool.
   * Deep-Clone verhindert Verunreinigung des originalen JSON-Objekts.
   */
  private pickRandomItems(pool: any[], count: number): any[] {
    if (!pool || pool.length === 0) return [];

    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const result: any[] = [];
    for (let i = 0; i < count; i++) {
      const item = shuffled[i % shuffled.length];
      result.push(JSON.parse(JSON.stringify(item)));
    }
    return result;
  }
}

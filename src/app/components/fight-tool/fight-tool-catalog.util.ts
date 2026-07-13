// src/app/components/fight-tool/fight-tool-catalog.util.ts
//
// Flacht das komplette Item- und Monster-JSON (alle Tiers, alle 5 Level-
// Brackets Düsterwald) zu Pick-Listen für den /fight-tool Equip-/Monster-
// Picker ab. Gleiches Build-Time-Import-Muster wie dark-forest.class.ts /
// spell-loader.service.ts (kein fetch(), JSON landet direkt im Bundle).

import { LevelBracket } from '../../utils/level-bracket.util';

// 🎩 HEAD
import headTier1 from '../../../../public/item-data/equipment/head/head_tier1.json';
import headTier2 from '../../../../public/item-data/equipment/head/head_tier2.json';
import headTier3 from '../../../../public/item-data/equipment/head/head_tier3.json';
import headTier4 from '../../../../public/item-data/equipment/head/head_tier4.json';
import headTier5 from '../../../../public/item-data/equipment/head/head_tier5.json';

// 🥋 CHEST
import chestTier1 from '../../../../public/item-data/equipment/chest/chest_tier1.json';
import chestTier2 from '../../../../public/item-data/equipment/chest/chest_tier2.json';
import chestTier3 from '../../../../public/item-data/equipment/chest/chest_tier3.json';
import chestTier4 from '../../../../public/item-data/equipment/chest/chest_tier4.json';
import chestTier5 from '../../../../public/item-data/equipment/chest/chest_tier5.json';

// 🩳 LEG
import legTier1 from '../../../../public/item-data/equipment/leg/leg_tier1.json';
import legTier2 from '../../../../public/item-data/equipment/leg/leg_tier2.json';
import legTier3 from '../../../../public/item-data/equipment/leg/leg_tier3.json';
import legTier4 from '../../../../public/item-data/equipment/leg/leg_tier4.json';
import legTier5 from '../../../../public/item-data/equipment/leg/leg_tier5.json';

// 🥊 GLOVES
import glovesTier1 from '../../../../public/item-data/equipment/gloves/gloves_tier1.json';
import glovesTier2 from '../../../../public/item-data/equipment/gloves/gloves_tier2.json';
import glovesTier3 from '../../../../public/item-data/equipment/gloves/gloves_tier3.json';
import glovesTier4 from '../../../../public/item-data/equipment/gloves/gloves_tier4.json';
import glovesTier5 from '../../../../public/item-data/equipment/gloves/gloves_tier5.json';

// 👢 FOOTWEAR
import footwearTier1 from '../../../../public/item-data/equipment/footwear/footwear_tier1.json';
import footwearTier2 from '../../../../public/item-data/equipment/footwear/footwear_tier2.json';
import footwearTier3 from '../../../../public/item-data/equipment/footwear/footwear_tier3.json';
import footwearTier4 from '../../../../public/item-data/equipment/footwear/footwear_tier4.json';
import footwearTier5 from '../../../../public/item-data/equipment/footwear/footwear_tier5.json';

// 🧣 NECKLACE
import necklaceTier1 from '../../../../public/item-data/equipment/necklace/necklace_tier1.json';
import necklaceTier2 from '../../../../public/item-data/equipment/necklace/necklace_tier2.json';
import necklaceTier3 from '../../../../public/item-data/equipment/necklace/necklace_tier3.json';
import necklaceTier4 from '../../../../public/item-data/equipment/necklace/necklace_tier4.json';
import necklaceTier5 from '../../../../public/item-data/equipment/necklace/necklace_tier5.json';

// 💍 RING
import ringTier1 from '../../../../public/item-data/equipment/ring/ring_tier1.json';
import ringTier2 from '../../../../public/item-data/equipment/ring/ring_tier2.json';
import ringTier3 from '../../../../public/item-data/equipment/ring/ring_tier3.json';
import ringTier4 from '../../../../public/item-data/equipment/ring/ring_tier4.json';
import ringTier5 from '../../../../public/item-data/equipment/ring/ring_tier5.json';

// ⚔️ WEAPON
import weaponTier1 from '../../../../public/item-data/weapons/weapon_tier1.json';
import weaponTier2 from '../../../../public/item-data/weapons/weapon_tier2.json';
import weaponTier3 from '../../../../public/item-data/weapons/weapon_tier3.json';
import weaponTier4 from '../../../../public/item-data/weapons/weapon_tier4.json';
import weaponTier5 from '../../../../public/item-data/weapons/weapon_tier5.json';

// 👹 MONSTER — alle 5 Level-Brackets Düsterwald
import monsterData1o10 from '../../../../public/mosters/dark-forest/dark-forest.1-10.json';
import monsterData11o20 from '../../../../public/mosters/dark-forest/dark-forest.11-20.json';
import monsterData21o30 from '../../../../public/mosters/dark-forest/dark-forest.21-30.json';
import monsterData31o40 from '../../../../public/mosters/dark-forest/dark-forest.31-40.json';
import monsterData41o50 from '../../../../public/mosters/dark-forest/dark-forest.41-50.json';

/** Alle Ausrüstungs-Slots, die im Fight-Tool frei bestückbar sind (accessoire-left/-right und back existieren nicht mehr im Spiel). */
export type EquipSlotKey =
  | 'head' | 'chest' | 'leg' | 'gloves' | 'footwear' | 'necklace'
  | 'ring-left' | 'ring-right'
  | 'weapon-1' | 'weapon-2';

export const EQUIP_SLOT_KEYS: EquipSlotKey[] = [
  'head', 'chest', 'leg', 'gloves', 'footwear', 'necklace',
  'ring-left', 'ring-right',
  'weapon-1', 'weapon-2',
];

/** Anzeigenamen für die Slot-Auswahl im Template. */
export const EQUIP_SLOT_LABELS: Record<EquipSlotKey, string> = {
  head: 'Kopf', chest: 'Brust', leg: 'Beine', gloves: 'Handschuhe',
  footwear: 'Schuhe', necklace: 'Kette',
  'ring-left': 'Ring (links)', 'ring-right': 'Ring (rechts)',
  'weapon-1': 'Waffe (Haupthand)', 'weapon-2': 'Waffe (Nebenhand)',
};

const ALL_HEAD = [...headTier1, ...headTier2, ...headTier3, ...headTier4, ...headTier5];
const ALL_CHEST = [...chestTier1, ...chestTier2, ...chestTier3, ...chestTier4, ...chestTier5];
const ALL_LEG = [...legTier1, ...legTier2, ...legTier3, ...legTier4, ...legTier5];
const ALL_GLOVES = [...glovesTier1, ...glovesTier2, ...glovesTier3, ...glovesTier4, ...glovesTier5];
const ALL_FOOTWEAR = [...footwearTier1, ...footwearTier2, ...footwearTier3, ...footwearTier4, ...footwearTier5];
const ALL_NECKLACE = [...necklaceTier1, ...necklaceTier2, ...necklaceTier3, ...necklaceTier4, ...necklaceTier5];
const ALL_RING = [...ringTier1, ...ringTier2, ...ringTier3, ...ringTier4, ...ringTier5];
const ALL_WEAPON = [...weaponTier1, ...weaponTier2, ...weaponTier3, ...weaponTier4, ...weaponTier5];

/** Item-Katalog je Slot — für Ringe/Waffen teilen sich beide Slots denselben Pool. */
export const ITEM_CATALOG_BY_SLOT: Record<EquipSlotKey, any[]> = {
  head: ALL_HEAD,
  chest: ALL_CHEST,
  leg: ALL_LEG,
  gloves: ALL_GLOVES,
  footwear: ALL_FOOTWEAR,
  necklace: ALL_NECKLACE,
  'ring-left': ALL_RING,
  'ring-right': ALL_RING,
  'weapon-1': ALL_WEAPON,
  'weapon-2': ALL_WEAPON,
};

export interface CatalogMonster {
  bracket: LevelBracket;
  monster: any;
}

const MONSTER_POOLS: Record<LevelBracket, any[]> = {
  '1-10': monsterData1o10,
  '11-20': monsterData11o20,
  '21-30': monsterData21o30,
  '31-40': monsterData31o40,
  '41-50': monsterData41o50,
};

/** Alle Düsterwald-Monster über alle 5 Brackets hinweg, flach für den Step-Picker. */
export const ALL_MONSTERS: CatalogMonster[] = (Object.keys(MONSTER_POOLS) as LevelBracket[]).flatMap(
  (bracket) => MONSTER_POOLS[bracket].map((monster) => ({ bracket, monster })),
);

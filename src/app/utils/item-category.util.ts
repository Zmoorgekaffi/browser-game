export type ItemCategory = 'armor' | 'weapon' | 'potion' | 'material' | 'ingredient' | 'quest';

/** Nur diese Kategorien tragen Stats und können in einen ArmorSlot angelegt werden. */
export const EQUIPPABLE_CATEGORIES: ItemCategory[] = ['armor', 'weapon'];

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  armor: 'Rüstung',
  weapon: 'Waffen',
  potion: 'Tränke',
  material: 'Materialien',
  ingredient: 'Zutaten',
  quest: 'Quest-Items',
};

/** URL-Slug (ASCII, ohne Umlaute) je Kategorie für /inventar/:category. */
export const CATEGORY_ROUTE_SLUGS: Record<ItemCategory, string> = {
  armor: 'ruestung',
  weapon: 'waffen',
  potion: 'traenke',
  material: 'materialien',
  ingredient: 'zutaten',
  quest: 'quest',
};

const SLUG_TO_CATEGORY: Record<string, ItemCategory> = Object.fromEntries(
  Object.entries(CATEGORY_ROUTE_SLUGS).map(([category, slug]) => [slug, category as ItemCategory]),
);

export function categoryFromRouteSlug(slug: string | null | undefined): ItemCategory {
  return (slug && SLUG_TO_CATEGORY[slug]) || 'armor';
}

/**
 * Liefert die Item-Kategorie. Neuere Items tragen ein explizites 'category'-Feld;
 * für ältere Spielstände ohne dieses Feld wird über 'armor-slot'/'weapon-type'
 * zurückgefallen.
 */
export function getItemCategory(item: any): ItemCategory {
  if (item?.category) return item.category as ItemCategory;

  const slot = item?.['armor-slot'];
  if (slot === 'potion') return 'potion';
  if (slot === 'material') return 'material';
  if (slot === 'weapon-1' || slot === 'weapon-2' || item?.['weapon-type']) return 'weapon';
  return 'armor';
}

export function isEquippableItem(item: any): boolean {
  return EQUIPPABLE_CATEGORIES.includes(getItemCategory(item));
}

/** Fasst Doppel-Slots zu einer gemeinsamen Familie zusammen (z. B. 'ring-left'/'ring-right' -> 'ring'). */
function slotFamily(slot: string): string {
  if (slot.startsWith('ring')) return 'ring';
  if (slot.startsWith('accessoire')) return 'accessoire';
  if (slot.startsWith('weapon')) return 'weapon';
  return slot;
}

/**
 * Prüft, ob ein Item per Drag & Drop auf `slotName` abgelegt werden darf.
 * Ringe/Accessoires/Waffen passen auf beide ihrer jeweiligen Slots, alle
 * anderen Slots müssen exakt zum 'armor-slot' des Items passen.
 */
export function isItemCompatibleWithSlot(item: any, slotName: string): boolean {
  const baseSlot = item?.['armor-slot'];
  if (!baseSlot || !isEquippableItem(item)) return false;
  return slotFamily(baseSlot) === slotFamily(slotName);
}

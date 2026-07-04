/** Verkaufspreis: pauschal 50% des Item-Preises. */
export function getSellPrice(price: number | undefined | null): number {
  return Math.round((price ?? 0) * 0.5);
}

/** Liest das tier-Feld eines Items aus (numerisch), oder null falls nicht gesetzt/ungültig. */
export function getItemTier(item: any): number | null {
  const tier = item?.tier;
  if (tier === undefined || tier === null || tier === '') return null;
  const parsed = Number(tier);
  return Number.isNaN(parsed) ? null : parsed;
}

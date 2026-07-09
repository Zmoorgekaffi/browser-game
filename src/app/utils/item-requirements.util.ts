export interface ItemRequirement {
  stat: string;
  value: number;
}

/**
 * Liest die Stat-Anforderungen eines Items normalisiert als Array aus.
 * Ältere/gekaufte Items tragen ein einzelnes `requirement: {stat, value}`,
 * gecraftete Items können mehrere in `requirements: {stat, value}[]` haben.
 */
export function getItemRequirements(item: any): ItemRequirement[] {
  if (!item) return [];
  if (Array.isArray(item.requirements)) return item.requirements;
  if (item.requirement && typeof item.requirement === 'object') return [item.requirement];
  return [];
}

/** True, wenn alle Anforderungen eines Items durch `currentStats` erfüllt sind (keine Anforderung = immer true). */
export function meetsAllRequirements(item: any, currentStats: Record<string, number>): boolean {
  return getItemRequirements(item).every((req) => (currentStats[req.stat] ?? 0) >= req.value);
}

/** Menschenlesbarer Text aller Anforderungen, z. B. "15 strength, 12 luck". */
export function formatRequirements(item: any): string {
  return getItemRequirements(item)
    .map((req) => `${req.value} ${req.stat}`)
    .join(', ');
}

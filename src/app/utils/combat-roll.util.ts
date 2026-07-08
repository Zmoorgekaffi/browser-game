/** Würfelt einen ganzzahligen Wert im Intervall [min, max] (beide inklusiv). */
export function rollBetween(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

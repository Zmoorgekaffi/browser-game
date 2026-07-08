/**
 * Berechnet die effektive Schadens-Range einer Waffe aus ihrer unveränderlichen
 * Basis-Range (`base-damage-min/max` bzw. `base-magic-damage-min/max`) und der
 * aktuellen `quality`-Stufe: +5% pro Stufe auf beiden Seiten der Range,
 * jeweils frisch aus der Basis berechnet (keine kumulative Rundung über
 * mehrere Upgrades hinweg).
 *
 * @param item Waffen-Item (bleibt unverändert, es wird eine Kopie zurückgegeben).
 */
export function applyQualityScaling(item: any): any {
  if (!item?.stats) return item;

  const quality = item.quality ?? 0;
  const multiplier = 1 + 0.05 * quality;
  const stats = { ...item.stats };

  const baseDmgMin = item['base-damage-min'] ?? 0;
  const baseDmgMax = item['base-damage-max'] ?? 0;
  const baseMagicDmgMin = item['base-magic-damage-min'] ?? 0;
  const baseMagicDmgMax = item['base-magic-damage-max'] ?? 0;

  if (baseDmgMin || baseDmgMax) {
    stats['damage-min'] = Math.round(baseDmgMin * multiplier);
    stats['damage-max'] = Math.round(baseDmgMax * multiplier);
  }
  if (baseMagicDmgMin || baseMagicDmgMax) {
    stats['magic-damage-min'] = Math.round(baseMagicDmgMin * multiplier);
    stats['magic-damage-max'] = Math.round(baseMagicDmgMax * multiplier);
  }

  return { ...item, quality, stats };
}

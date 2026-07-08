/** Würfelt einen ganzzahligen Wert im Intervall [min, max] (beide inklusiv). */
export function rollBetween(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/** Obergrenze für jede Mitigations-Art (Elementar-Resistenz UND Rüstung): max. 75% Endschaden-Mitigation. */
export const MAX_MITIGATION_PERCENT = 75;

/**
 * Mindert Elementarschaden linear (1 Resistenz-Punkt = 1% Endschaden-Mitigation),
 * gedeckelt bei MAX_MITIGATION_PERCENT. Genutzt in SpellsEngineService, pro Element
 * (fire/cold/lightning/chaos) gegen die Resistenz DES ZIELS.
 *
 * @param damage             Schaden vor Mitigation.
 * @param resistancePercent  Rohe Element-Resistenz des Verteidigers (kann > 75 sein, wird gedeckelt).
 */
export function applyResistanceMitigation(damage: number, resistancePercent: number): number {
  const capped = Math.min(Math.max(resistancePercent, 0), MAX_MITIGATION_PERCENT);
  return Math.round(damage * (1 - capped / 100));
}

/**
 * Konstante der Rüstungs-Diminishing-Returns-Kurve (siehe applyArmorMitigation).
 * Gewählt so, dass ein voll ausgerüsteter Tier-5-Charakter (~425 Rüstung, aus allen
 * 8 Nicht-Waffen-Slots aufsummiert) bei ~74% landet — knapp unter dem Deckel,
 * mit Luft für Passives/Uniques. Ein Tier-1-Charakter (~29 Rüstung) liegt bei ~16%.
 */
export const ARMOR_MITIGATION_K = 150;

/**
 * Mindert physischen Schaden über Rüstung, NICHT linear wie Resistenz — sondern per
 * Diminishing-Returns-Kurve (`armor / (armor + K)`), ebenfalls gedeckelt bei
 * MAX_MITIGATION_PERCENT. Notwendig, weil Rüstungs-Werte auf Ausrüstung (siehe
 * public/item-data/equipment/**) als reine Flavor-Zahlen ohne Bezug zu einem
 * Prozent-Deckel vergeben wurden (z.B. Tier-1-Items schon 1-12 Rüstung/Stück,
 * über 8 Slots hinweg im Schnitt ~29) — eine lineare 1-Punkt-=-1%-Formel wie bei
 * Resistenz würde den 75%-Deckel bereits mit Tier-2/3-Ausrüstung sprengen und
 * physischen Schaden am Spieler quasi bedeutungslos machen.
 *
 * @param damage Schaden vor Mitigation.
 * @param armor  Rohe Rüstung des Verteidigers.
 */
export function applyArmorMitigation(damage: number, armor: number): number {
  if (armor <= 0) return damage;
  const raw = (armor / (armor + ARMOR_MITIGATION_K)) * 100;
  const capped = Math.min(raw, MAX_MITIGATION_PERCENT);
  return Math.round(damage * (1 - capped / 100));
}

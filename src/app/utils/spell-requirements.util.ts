/** Prüft, ob alle Einträge in `requirements: [{stat, value}]` erfüllt sind (kein Feld = immer true). */
export function meetsStatRequirements(
  requirements: { stat: string; value: number }[] | undefined | null,
  combatStats: any,
): boolean {
  if (!requirements || requirements.length === 0) return true;
  return requirements.every((req) => (combatStats?.[req.stat] ?? 0) >= req.value);
}

/** Prüft, ob der geforderte Waffentyp (`requiredWeaponType`) aktuell ausgerüstet ist (kein Feld = immer true). */
export function meetsWeaponRequirement(
  requiredWeaponType: string | undefined | null,
  hasEquippedWeaponType: (weaponType: string) => boolean,
): boolean {
  if (!requiredWeaponType) return true;
  return hasEquippedWeaponType(requiredWeaponType);
}

/** Kombiniert Stat- und Waffen-Anforderung eines Spells zu einer Gesamt-Prüfung (z.B. für Drag&Drop-Highlight). */
export function meetsAllSpellRequirements(
  spell: any,
  combatStats: any,
  hasEquippedWeaponType: (weaponType: string) => boolean,
): boolean {
  return (
    meetsStatRequirements(spell?.requirements, combatStats) &&
    meetsWeaponRequirement(spell?.requiredWeaponType, hasEquippedWeaponType)
  );
}

/** Menschenlesbare Anforderungs-Liste, z.B. "10 strength, 5 dexterity". */
export function formatSpellRequirements(spell: any): string {
  return (spell?.requirements ?? [])
    .map((req: { stat: string; value: number }) => `${req.value} ${req.stat}`)
    .join(', ');
}

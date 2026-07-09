import { EquippedSlots } from '../services/inventar.service';

export interface CompareSlot {
  label: string;
  item: any | null;
}

/** Deutsche Anzeige-Labels für Slots ohne Links/Rechts-Unterscheidung. */
const SLOT_LABELS: Record<string, string> = {
  head: 'Kopf',
  chest: 'Brust',
  leg: 'Beine',
  gloves: 'Handschuhe',
  footwear: 'Schuhe',
  necklace: 'Halskette',
  back: 'Rücken',
};

/**
 * Ermittelt, welche(r) angelegte(n) Slot(s) einem Shop-Item zum Vergleich
 * gegenübergestellt werden. Ringe/Accessoires/Waffen haben je zwei Slots und
 * liefern entsprechend bis zu zwei Einträge (Ausnahme: eine angelegte
 * 2-Hand-Waffe belegt beide Waffen-Slots gleichzeitig -> nur ein Eintrag).
 *
 * @param item Das im Shop angezeigte Item (liefert `armor-slot`).
 * @param equippedSlots Aktuell angelegte Items pro Slot.
 */
export function getCompareSlots(item: any, equippedSlots: EquippedSlots): CompareSlot[] {
  const baseSlot = item?.['armor-slot'];
  // Tränke tragen 'armor-slot: potion' nur zur Einsortierung ins Inventar —
  // dafür gibt es keinen echten Ausrüstungs-Slot, also kein Vergleich.
  if (!baseSlot || baseSlot === 'potion') return [];

  if (baseSlot === 'ring') {
    return [
      { label: 'Ring (links)', item: equippedSlots['ring-left'] ?? null },
      { label: 'Ring (rechts)', item: equippedSlots['ring-right'] ?? null },
    ];
  }

  if (baseSlot === 'accessoire') {
    return [
      { label: 'Accessoire (links)', item: equippedSlots['accessoire-left'] ?? null },
      { label: 'Accessoire (rechts)', item: equippedSlots['accessoire-right'] ?? null },
    ];
  }

  if (baseSlot === 'weapon-1') {
    const weapon1 = equippedSlots['weapon-1'] ?? null;
    // 2H-Waffe belegt beide Hände gleichzeitig -> nur eine Vergleichs-Toolbox.
    if (String(weapon1?.hands) === '2') {
      return [{ label: 'Waffe', item: weapon1 }];
    }
    return [
      { label: 'Waffe 1', item: weapon1 },
      { label: 'Waffe 2', item: equippedSlots['weapon-2'] ?? null },
    ];
  }

  return [{ label: SLOT_LABELS[baseSlot] ?? baseSlot, item: equippedSlots[baseSlot] ?? null }];
}

/**
 * Wählbare Charakter-Portraits für den Namens-/Avatar-Screen.
 *
 * Platzhalter: es existiert noch keine dedizierte Portrait-Kunst, daher
 * werden vorhandene NPC-Illustrationen wiederverwendet. Sobald echte
 * Spieler-Portraits vorliegen, hier einfach die `src`-Pfade austauschen.
 */
export interface Portrait {
  id: string;
  src: string;
}

export const PORTRAITS: Portrait[] = [
  { id: 'smith', src: 'imgs/smither/merchant/greet/sprite_01.webp' },
  { id: 'mage', src: 'imgs/magic-shop/merchant/greet/frame-001-Photoroom.webp' },
  { id: 'trader', src: 'imgs/general-supplies/merchant-animations/hello/sprite_1.png' },
  { id: 'pilgrim', src: 'imgs/shrine/pilgrim/pray/frame_001.png' },
];

export const DEFAULT_PORTRAIT_ID = PORTRAITS[0].id;

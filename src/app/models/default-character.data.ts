/**
 * Standard-Daten für einen frisch erstellten Charakter.
 *
 * Ausgelagert aus dem GameStateService, damit dieser schlank bleibt und
 * die Startwerte zentral an einer Stelle gepflegt werden können.
 *
 * WICHTIG: Die Strukturen (inkl. Key-Schreibweisen wie 'img-path',
 * 'armor-slot', 'crit-chance') entsprechen exakt dem LocalStorage-Format
 * und dürfen nicht umbenannt werden.
 */

/**
 * Erzeugt das Standard-Profil für einen neuen Charakter.
 *
 * @param charId Die Charakter-ID, unter der gespeichert wird.
 */
export function createDefaultProfile(charId: string) {
  return { id: charId, name: 'Hero', level: 1, exp: 0 };
}

/** Basis-Attribute und Kampfwerte eines Level-1-Charakters. */
export const DEFAULT_SKILLS = {
  intelligence: 5, dexterity: 5, strength: 5, vitality: 5, luck: 5,
  'energy-shield': 0, 'magic-find': 0, armor: 0, hp: 100, mana: 20,
  attack: 5, magicAttack: 5, initiative: 10, evasion: 5,
  critChance: 5, critDamage: 150, chaosDamage: 0, charisma: 1,
  resistances: { fire: 0, cold: 0, lightning: 0, chaos: 0 },
  spells: [],
};

/** Start-Guthaben eines neuen Charakters. */
export const DEFAULT_WALLET = { gold: 1000, rubies: 0 };

/** Start-Inventar: ein einfaches Anfänger-Schwert. */
export const DEFAULT_INVENTAR = {
  items: [{
    name: 'Verrostetes Kurzschwert',
    description: 'Eine abgenutzte Klinge mit schartigem Rand.',
    'img-path': 'imgs/items/weapon/shortsword_rusty.webp',
    price: 8,
    'armor-slot': 'weapon-1',
    stats: {
      intelligence: 0, dexterity: 0, strength: 0, vitality: 0, luck: 0,
      'energy-shield': 0, 'magic-find': 0, armor: 0, attack: 12,
      'magic-attack': 0, initiative: 0, evasion: 0,
      'crit-chance': 0, 'crit-damage': 0, chaosDamage: 0, charisma: 0,
      resistances: { fire: 0, cold: 0, lightning: 0, chaos: 0 },
    },
  }],
};

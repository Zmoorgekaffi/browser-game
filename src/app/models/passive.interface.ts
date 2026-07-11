/**
 * Modelle für das Shrine-Levelup-System (Attributspunkte → Passives).
 *
 * Die 4 Grundattribute, in die am Schrein investiert werden kann.
 * (Glück bekommt bewusst keine eigene Investitions-Leiste.)
 */
export type InvestableStat = 'strength' | 'dexterity' | 'intelligence' | 'vitality';

/** Alle Stat-Keys, die ein Passive per Flat-/Prozent-Effekt beeinflussen kann. */
export type PassiveStatKey =
  | 'strength'
  | 'dexterity'
  | 'intelligence'
  | 'vitality'
  | 'luck'
  | 'hp'
  | 'mana'
  | 'attack'
  | 'magicAttack'
  | 'armor'
  | 'energy-shield'
  | 'initiative'
  | 'evasion'
  | 'critChance'
  | 'critDamage'
  | 'chaosDamage'
  | 'magicDamageFire'
  | 'magicDamageCold'
  | 'magicDamageLightning'
  | 'magic-find';

/** Die vier Elementar-Schadensarten, gegen die Resistenz-Passives schützen können. */
export type DamageElement = 'fire' | 'cold' | 'lightning' | 'chaos';

export interface StatFlatEffect {
  type: 'stat-flat';
  stat: PassiveStatKey;
  value: number;
}

export interface StatPercentEffect {
  type: 'stat-percent';
  stat: PassiveStatKey;
  value: number;
}

/** Resistenz gegen eine oder mehrere Schadensarten gleichzeitig (gleicher Wert für jede). */
export interface ResistanceEffect {
  type: 'resistance';
  elements: DamageElement[];
  value: number;
}

/** Schaltet einen Skill frei und lernt ihn automatisch ins Skill-Inventar des Spielers. */
export interface SkillUnlockEffect {
  type: 'skill-unlock';
  skillId: string;
}

export type PassiveEffect = StatFlatEffect | StatPercentEffect | ResistanceEffect | SkillUnlockEffect;

/**
 * Eine einzelne Passive-Stufe, gebunden an einen Grundstat und eine
 * Investitions-Schwelle (10, 20, ..., 100 Punkte).
 */
export interface PassiveData {
  id: string;
  stat: InvestableStat;
  threshold: number;
  name: string;
  description: string;
  effects: PassiveEffect[];
}

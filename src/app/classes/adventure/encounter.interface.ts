// src/app/classes/adventure/encounter.interface.ts

/**
 * Was passiert wenn der Spieler diese Antwort wählt:
 *  - nothing: keine Belohnung
 *  - gold:    rollGoldReward() aus der Area
 *  - item:    rollLoot() aus der Area (landet in pendingRewards)
 */
export type ReactionType = 'nothing' | 'gold' | 'item';

export interface EncounterAnimation {
  paths: string[];
  duration: number;
}

export interface EncounterAnswer {
  text: string;
  reactionType: ReactionType;
  /** Text den der NPC nach der Antwort sagt (optional) */
  responseText?: string;
  /**
   * Optional: eigene Animation die statt der default speak-Animation
   * abgespielt wird. Ideal wenn eine Antwort etwas Besonderes triggert
   * (Angriff, Zauber, Freudentanz, was auch immer).
   */
  reactionAnimation?: EncounterAnimation;
}

export interface Encounter {
  id: string;
  name: string;
  intro: EncounterAnimation;
  idle: EncounterAnimation;
  speak: EncounterAnimation;
  /** Multi-Step-Dialog vor den Antworten. Klick „Weiter" → nächster Text. */
  texts: string[];
  /** Genau 3 Antwortmöglichkeiten */
  answers: EncounterAnswer[];
}
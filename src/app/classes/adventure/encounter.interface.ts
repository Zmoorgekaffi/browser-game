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
   *
   * WICHTIG: Damit jede Antwort ihre EIGENE Reaktion abspielt, sollte
   * hier praktisch immer eine eigene Animation hinterlegt werden statt
   * sich auf den "speak"-Fallback zu verlassen.
   */
  reactionAnimation?: EncounterAnimation;
}

export interface Encounter {
  id: string;
  name: string;
  /**
   * 🆕 Hintergrund der Dialog-Scene für diese Begegnung. Einzelner
   * statischer Bild-Pfad (kein paths[]/duration-Objekt), wird 1:1 an
   * app-animation-object als [spritePaths]="[enc['scene-background']]"
   * übergeben.
   */
  'scene-background': string;
  intro: EncounterAnimation;
  idle: EncounterAnimation;
  speak: EncounterAnimation;
  /** Multi-Step-Dialog vor den Antworten. Klick „Weiter" → nächster Text. */
  texts: string[];
  /** Genau 3 Antwortmöglichkeiten */
  answers: EncounterAnswer[];
}
import { Injectable, inject, signal } from '@angular/core';
import { ProfileService } from './profile.service';
import { getLevelBracket, LevelBracket } from '../utils/level-bracket.util';

/**
 * @service BracketNotificationService
 * @description Erkennt, ob der Charakter seit dem letzten Dorf-Besuch in ein
 * neues Monster-Bracket (1-10, 11-20, ...) aufgestiegen ist, und hält das für
 * einen Toast in der Dorf-Szene bereit. Merkt sich das zuletzt gezeigte
 * Bracket pro Charakter in `${charId}_lastSeenBracket` (LocalStorage), analog
 * zu den übrigen `${charId}_*`-Keys (siehe GameStateService.loadCharacterData).
 */
@Injectable({
  providedIn: 'root',
})
export class BracketNotificationService {
  private profileService = inject(ProfileService);

  /** Gesetzt, sobald ein neues Bracket erkannt wurde — vom Toast gelesen, per dismiss() wieder geleert. */
  public newBracket = signal<LevelBracket | null>(null);

  /**
   * Beim Betreten der Dorf-Szene aufrufen. Vergleicht das aktuelle Bracket
   * mit dem zuletzt gespeicherten; bei neuem Charakter (noch kein
   * gespeicherter Wert) wird nur der Ausgangswert gesetzt, OHNE einen Toast
   * auszulösen — sonst würde jeder Neustart fälschlich "neues Gebiet!" zeigen.
   */
  public checkForBracketChange(): void {
    const charId = this.profileService.charId();
    if (!charId) return;

    const currentBracket = getLevelBracket(this.profileService.level());
    const storageKey = `${charId}_lastSeenBracket`;
    const lastSeenBracket = localStorage.getItem(storageKey);

    if (lastSeenBracket !== currentBracket) {
      localStorage.setItem(storageKey, currentBracket);
      if (lastSeenBracket !== null) {
        this.newBracket.set(currentBracket);
      }
    }
  }

  /** Toast wurde ausgeblendet (Timer abgelaufen) — Signal wieder leeren. */
  public dismiss(): void {
    this.newBracket.set(null);
  }
}

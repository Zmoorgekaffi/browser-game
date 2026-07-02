import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { ProfileData } from '../models/game-state.interface';

/**
 * @service ProfileService
 * @description Hält die Profildaten des Charakters (Name, Level, EXP).
 * Die Persistierung übernimmt der GameStateService.
 */
@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private state = signal<ProfileData>({ name: 'Hero', level: 1, exp: 0 });

  name = computed(() => this.state().name);
  level = computed(() => this.state().level);
  exp = computed(() => this.state().exp);
  charId: WritableSignal<any | null> = signal(null);

  /**
   * Initialisiert das Profil mit Savegame-Daten.
   *
   * @param data Profil-Block aus dem LocalStorage.
   */
  init(data: ProfileData): void {
    this.state.set(data);
  }

  /** Ändert den Anzeigenamen des Charakters. */
  updateName(name: string): void {
    this.state.update(state => {
      const newState = { ...state, name };
      // Speicherung wird im GameStateService gehandhabt
      return newState;
    });
  }

  /**
   * Fügt Erfahrungspunkte hinzu.
   *
   * @param amount Betrag > 0, sonst passiert nichts.
   */
  addExp(amount: number): void {
    if (amount <= 0) return;
    
    this.state.update(state => {
      const newState = { ...state, exp: state.exp + amount };
      // Speicherung wird im GameStateService gehandhabt
      return newState;
    });
  }

  /** Erhöht das Level um 1 und setzt die EXP auf 0 zurück. */
  levelUp(): void {
    this.state.update(state => {
      const newState = { ...state, level: state.level + 1, exp: 0 };
      // Speicherung wird im GameStateService gehandhabt
      return newState;
    });
  }
}
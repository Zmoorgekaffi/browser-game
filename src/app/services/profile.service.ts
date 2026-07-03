import { Injectable, signal, computed, inject, WritableSignal } from '@angular/core';
import { ProfileData } from '../models/game-state.interface';
import { SkillsService } from './skills.service';

/** Anzahl der Attributspunkte, die pro Level-up am Schrein verteilt werden können. */
const STAT_POINTS_PER_LEVEL = 5;

/**
 * @service ProfileService
 * @description Hält die Profildaten des Charakters (Name, Level, EXP).
 */
@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private skillsService = inject(SkillsService);

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
      this.persist(newState);
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
      this.persist(newState);
      return newState;
    });
  }

  /**
   * Erhöht das Level um 1, setzt die EXP zurück und gewährt Attributspunkte
   * für die Schrein-UI (siehe SkillsService.investStatPoint).
   */
  levelUp(): void {
    this.state.update(state => {
      const newState = { ...state, level: state.level + 1, exp: 0 };
      this.persist(newState);
      return newState;
    });

    this.skillsService.addStatPoints(STAT_POINTS_PER_LEVEL);
  }

  /** Persistiert die Profildaten im LocalStorage des aktiven Charakters. */
  private persist(newState: ProfileData): void {
    const id = this.charId();
    if (!id) return;
    localStorage.setItem(`${id}_profile`, JSON.stringify(newState));
  }
}
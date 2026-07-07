import { Injectable, signal, computed, inject, WritableSignal } from '@angular/core';
import { ProfileData } from '../models/game-state.interface';
import { SkillsService } from './skills.service';

/** Anzahl der Attributspunkte, die pro Level-up am Schrein verteilt werden können. */
const STAT_POINTS_PER_LEVEL = 5;

/** Charakter-Levels sind bei 50 gedeckelt (Level 40-50 = Endgame). */
const MAX_LEVEL = 50;

/** XP-Bedarf von Level 1 auf Level 2. */
const BASE_XP_TO_NEXT_LEVEL = 200;

/** Der XP-Bedarf steigt pro Level um diesen Faktor (9% ≈ Mitte von 8-10%). */
const XP_GROWTH_RATE = 1.09;

/**
 * @service ProfileService
 * @description Hält die Profildaten des Charakters (Name, Level, EXP).
 */
@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private skillsService = inject(SkillsService);

  private state = signal<ProfileData>({ name: '', level: 1, exp: 0 });

  name = computed(() => this.state().name);
  level = computed(() => this.state().level);
  exp = computed(() => this.state().exp);
  charId: WritableSignal<any | null> = signal(null);

  /** True, sobald der Charakter das Levelcap (50) erreicht hat. */
  isMaxLevel = computed(() => this.level() >= MAX_LEVEL);

  /** XP, die auf dem aktuellen Level noch bis zum nächsten benötigt werden (0 bei Levelcap). */
  expRequiredForNextLevel = computed(() =>
    this.isMaxLevel() ? 0 : this.xpRequiredForLevel(this.level()),
  );

  /** Fortschritt zum nächsten Level als Anteil zwischen 0 und 1 (für Balken-UI). */
  expProgress = computed(() => {
    const required = this.expRequiredForNextLevel();
    return required > 0 ? Math.min(this.exp() / required, 1) : 1;
  });

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
   * Fügt Erfahrungspunkte hinzu und verarbeitet dabei automatisch alle
   * Level-ups, die durch den Zuwachs ausgelöst werden (auch mehrere auf
   * einmal, z.B. bei einem großen XP-Batzen). Überschüssige XP werden ins
   * neue Level mitgenommen statt verworfen. Oberhalb von Level 50 (Cap)
   * wird kein weiterer Fortschritt mehr gezählt.
   *
   * @param amount Betrag > 0, sonst passiert nichts.
   */
  addExp(amount: number): void {
    if (amount <= 0 || this.isMaxLevel()) return;

    this.state.update(state => {
      let { level, exp } = state;
      exp += amount;

      let levelsGained = 0;
      while (level < MAX_LEVEL) {
        const required = this.xpRequiredForLevel(level);
        if (exp < required) break;
        exp -= required;
        level += 1;
        levelsGained += 1;
      }

      if (level >= MAX_LEVEL) {
        level = MAX_LEVEL;
        exp = 0;
      }

      const newState = { ...state, level, exp };
      this.persist(newState);

      if (levelsGained > 0) {
        this.skillsService.addStatPoints(STAT_POINTS_PER_LEVEL * levelsGained);
      }

      return newState;
    });
  }

  /**
   * Erhöht das Level manuell um 1 (z.B. für Debug-Zwecke) und gewährt
   * Attributspunkte für die Schrein-UI. Respektiert das Levelcap.
   */
  levelUp(): void {
    if (this.isMaxLevel()) return;

    this.state.update(state => {
      const newState = { ...state, level: state.level + 1, exp: 0 };
      this.persist(newState);
      return newState;
    });

    this.skillsService.addStatPoints(STAT_POINTS_PER_LEVEL);
  }

  /** XP-Bedarf, um von `level` auf `level + 1` zu kommen (200, +9% pro Level). */
  private xpRequiredForLevel(level: number): number {
    return Math.round(BASE_XP_TO_NEXT_LEVEL * Math.pow(XP_GROWTH_RATE, level - 1));
  }

  /** Persistiert die Profildaten im LocalStorage des aktiven Charakters. */
  private persist(newState: ProfileData): void {
    const id = this.charId();
    if (!id) return;
    localStorage.setItem(`${id}_profile`, JSON.stringify(newState));
  }
}
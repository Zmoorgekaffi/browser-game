import { Injectable, signal, inject, effect, WritableSignal } from '@angular/core';
import { DarkForest } from '../classes/adventure/areas/dark-forest.class';
import { ProfileService } from './profile.service';
import { Router } from '@angular/router';

/**
 * Definiert den persistierbaren Zustand eines Abenteuers.
 */
export interface AdventureSaveState {
  adventureId: string;
  currentStepIndex: number;
  steps: any[];
  playerLevel: number;
  activeFight?: {
    monsterHp: number;
    playerHp: number;
    round: number;
    turn: 'player' | 'monster';
  } | null;
}

/**
 * Service zur Verwaltung des Abenteuer-Zustands, inklusive Speicherung,
 * Laden und Navigation innerhalb von Abenteuer-Szenen.
 */
@Injectable({ providedIn: 'root' })
export class AdventureStateService {
  private profileService = inject(ProfileService);
  private router = inject(Router);

  /** Liste der einzelnen Events/Schritte im aktuellen Abenteuer */
  steps = signal<any[]>([]);

  /** Index des aktuell aktiven Abenteuer-Schritts */
  currentStepIndex = signal<number>(0);

  /** Eindeutige ID des aktuell geladenen Abenteuergebiets */
  adventureId = signal<string | null>(null);

  /** Status eines laufenden Kampfes, falls vorhanden */
  activeFight = signal<any | null>(null);

  /** Das aktuelle Level-Objekt */
  level: WritableSignal<any | null> = signal<any | null>(null);

  /** Verhindert mehrfaches Laden, falls charId sich später noch einmal ändert */
  private hasAttemptedInitialLoad = false;

  constructor() {
    // WICHTIG: charId() ist im Moment der Service-Erstellung oft noch null,
    // weil GameStateService.init() erst später (z.B. in ngOnInit) aufgerufen wird.
    // Mit effect() warten wir reaktiv, bis charId einen echten Wert hat,
    // statt im Constructor blind zu laden.
    effect(() => {
      const charId = this.profileService.charId();

      console.log('[AdventureStateService] effect läuft, charId:', charId);

      if (!charId || this.hasAttemptedInitialLoad) {
        return;
      }

      this.hasAttemptedInitialLoad = true;

      const loaded = this.loadAdventure();
      console.log('[AdventureStateService] loadAdventure() Ergebnis:', loaded);

      if (loaded) {
        console.log('[AdventureStateService] Savegame geladen, leite fort...');
        this.continueAdventure();
      } else {
        console.log('[AdventureStateService] Kein Savegame gefunden, warte auf Start...');
      }
    });
  }

  /**
   * Leitet den Spieler basierend auf dem aktuellen Step-Typ an die richtige Route weiter.
   */
  private continueAdventure(): void {
    const currentIndex = this.currentStepIndex();
    const currentStep = this.steps()[currentIndex];

    console.log('[continueAdventure] adventureId:', this.adventureId());
    console.log('[continueAdventure] currentIndex:', currentIndex);
    console.log('[continueAdventure] currentStep:', currentStep);

    // Falls wir kein aktives Abenteuer haben, machen wir nichts
    if (!this.adventureId()) {
      console.log('[continueAdventure] Kein adventureId gesetzt, breche ab.');
      return;
    }

    if (currentStep) {
      switch (currentStep.type) {
        case 'dialog':
          console.log('[continueAdventure] Navigiere zu /adventure/dialog');
          this.router.navigate(['/adventure/dialog']).then(success =>
            console.log('[continueAdventure] navigate() success?', success)
          );
          break;
        case 'loot':
          console.log('[continueAdventure] Navigiere zu /adventure/loot');
          this.router.navigate(['/adventure/loot']).then(success =>
            console.log('[continueAdventure] navigate() success?', success)
          );
          break;
        case 'fight':
          console.log('[continueAdventure] Navigiere zu /adventure/fight');
          this.router.navigate(['/adventure/fight']).then(success =>
            console.log('[continueAdventure] navigate() success?', success)
          );
          break;
        case 'quiz':
          console.log('[continueAdventure] Navigiere zu /adventure/quiz');
          this.router.navigate(['/adventure/quiz']).then(success =>
            console.log('[continueAdventure] navigate() success?', success)
          );
          break;
        default:
          console.warn('[continueAdventure] Unbekannter Step-Typ:', currentStep.type);
      }
    } else {
      console.log('[continueAdventure] currentStep ist undefined/null — steps-Array leer oder Index ungültig.');
    }
  }

  /**
   * Initialisiert das Level-Objekt basierend auf der Abenteuer-ID.
   * @param adventureId ID des Gebiets
   * @param level Spieler-Level für die Skalierung
   * @param steps Die abzurufenden Event-Schritte
   */
  private initializeLevel(adventureId: string, level: number, steps: any[]): void {
    // 1. Nur neu instanziieren, wenn noch kein Level gesetzt ist
    if (!this.level()) {
      if (adventureId === 'duesterwald') {
        this.level.set(new DarkForest(level));
      }
    }

    // 2. Jetzt die Schritte auf dem (jetzt definitiv existierenden) Level setzen
    const currentLevel = this.level();
    if (currentLevel) {
      currentLevel.eventSteps = steps;
      // WICHTIG: Da wir das Objekt intern verändert haben,
      // triggern wir das Signal hier kurz neu, falls Angular die Änderung
      // durch das reine Zuweisen nicht erkennt:
      this.level.set({ ...currentLevel });
    }
  }

  /**
   * Generiert ein neues Level und setzt den Start-Zustand.
   */
  generateLevel() {
    const newLevel = new DarkForest(this.profileService.level() || 1);

    this.adventureId.set('duesterwald');
    this.steps.set(newLevel.eventSteps);
    this.currentStepIndex.set(0);

    this.initializeLevel('duesterwald', this.profileService.level() || 1, newLevel.eventSteps);
    this.saveAdventure();
    console.log('aktuellstes level', this.level());
  }

  /**
   * Gibt den Key für den LocalStorage basierend auf der Character-ID zurück.
   */
  private getStorageKey(): string {
    return `${this.profileService.charId()}_adventure_save`;
  }

  /**
   * Speichert den aktuellen Abenteuer-Zustand im LocalStorage.
   */
  saveAdventure(): void {
    const state: AdventureSaveState = {
      adventureId: this.adventureId()!,
      currentStepIndex: this.currentStepIndex(),
      steps: this.steps(),
      playerLevel: this.profileService.level(),
      activeFight: this.activeFight(),
    };
    localStorage.setItem(this.getStorageKey(), JSON.stringify(state));
    console.log('[saveAdventure] gespeichert unter Key:', this.getStorageKey(), state);
  }

  /**
   * Lädt ein gespeichertes Abenteuer aus dem LocalStorage.
   * @returns true, wenn ein Savegame gefunden wurde, sonst false.
   */
  loadAdventure(): boolean {
    const key = this.getStorageKey();
    console.log('[loadAdventure] Suche Key:', key);

    const data = localStorage.getItem(key);
    if (!data) {
      console.log('[loadAdventure] Kein Eintrag im localStorage gefunden.');
      return false;
    }

    const state: AdventureSaveState = JSON.parse(data);
    console.log('[loadAdventure] Gefundener State:', state);

    this.adventureId.set(state.adventureId);
    this.currentStepIndex.set(state.currentStepIndex);
    this.steps.set(state.steps);
    this.activeFight.set(state.activeFight || null);

    this.initializeLevel(state.adventureId, state.playerLevel, state.steps);
    return true;
  }

  /**
   * Startet ein neues Abenteuer für ein bestimmtes Gebiet.
   * @param areaId ID des zu startenden Gebiets
   */
  startNewAdventure(areaId: string) {
    if (this.adventureId()) {
      console.warn('Es läuft bereits ein Abenteuer. Bitte erst abschließen.');
      return;
    }

    if (areaId === 'duesterwald') {
      this.level.set(new DarkForest(this.profileService.level() || 1));
    } else {
      console.error('Unbekannte Area-ID');
      return;
    }

    this.adventureId.set(areaId);
    this.steps.set(this.level()!.eventSteps);
    this.currentStepIndex.set(0);
    this.activeFight.set(null);

    this.saveAdventure();
    this.router.navigate(['/adventure/intro']);
  }
}
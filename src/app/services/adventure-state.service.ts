import { Injectable, signal, inject, effect, WritableSignal } from '@angular/core';
import { DarkForest } from '../classes/adventure/areas/dark-forest.class';
import { ProfileService } from './profile.service';
import { Router } from '@angular/router';
import { ShopService } from './shop.service';
import { WalletService } from './wallet.service';

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

@Injectable({ providedIn: 'root' })
export class AdventureStateService {
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private shopService = inject(ShopService);
  private walletService = inject(WalletService);

  steps = signal<any[]>([]);
  currentStepIndex = signal<number>(0);
  adventureId = signal<string | null>(null);
  activeFight = signal<any | null>(null);
  level: WritableSignal<any | null> = signal<any | null>(null);

  /**
   * Verhindert dass der effect() selbst navigiert –
   * das übernimmt jetzt GameStateService nach skills.init().
   */
  private hasAttemptedInitialLoad = true; // ← auf true gesetzt, effect ist deaktiviert

  constructor() {
    // Effect nur noch für Logging, Navigation läuft über GameStateService.loadCharacterData()
    effect(() => {
      const charId = this.profileService.charId();
      console.log('[AdventureStateService] effect läuft, charId:', charId);
      // Absichtlich leer – Navigation erfolgt manuell via loadAdventureManually()
    });
  }

  /**
   * Wird von GameStateService NACH skills.init() aufgerufen.
   * Damit sind Spells garantiert angereichert bevor continueAdventure() navigiert.
   */
  public loadAdventureManually(): boolean {
    const loaded = this.loadAdventure();
    console.log('[loadAdventureManually] Ergebnis:', loaded);
    return loaded;
  }

  public clearAdventure(): void {
    const key = this.getStorageKey();
    localStorage.removeItem(key);
    console.log('[clearAdventure] Savegame gelöscht für Key:', key);
    this.adventureId.set(null);
    this.currentStepIndex.set(0);
    this.steps.set([]);
    this.activeFight.set(null);
    this.level.set(null);
    this.shopService.rerollAllShopsAtEndOfRun();
  }

  public continueAdventure(): void {
    const currentIndex = this.currentStepIndex();
    const currentStep = this.steps()[currentIndex];

    console.log('[continueAdventure] adventureId:', this.adventureId());
    console.log('[continueAdventure] currentIndex:', currentIndex);
    console.log('[continueAdventure] currentStep:', currentStep);

    if (!this.adventureId()) {
      console.log('[continueAdventure] Kein adventureId gesetzt, breche ab.');
      return;
    }

    if (currentStep) {
      switch (currentStep.type) {
        case 'dialog':
          this.router.navigate(['/adventure/dialog']).then(s =>
            console.log('[continueAdventure] navigate() success?', s));
          break;
        case 'loot':
          this.router.navigate(['/adventure/loot']).then(s =>
            console.log('[continueAdventure] navigate() success?', s));
          break;
        case 'fight':
          this.router.navigate(['/adventure/fight']).then(s =>
            console.log('[continueAdventure] navigate() success?', s));
          break;
        case 'quiz':
          this.router.navigate(['/adventure/quiz']).then(s =>
            console.log('[continueAdventure] navigate() success?', s));
          break;
        default:
          console.warn('[continueAdventure] Unbekannter Step-Typ:', currentStep.type);
      }
    } else {
      console.log('[continueAdventure] currentStep ist undefined/null.');
    }

    this.walletService.addGold(10);
  }

  private initializeLevel(adventureId: string, level: number, steps: any[]): void {
    if (!this.level()) {
      if (adventureId === 'duesterwald') {
        this.level.set(new DarkForest(level));
      }
    }
    const currentLevel = this.level();
    if (currentLevel) {
      currentLevel.eventSteps = steps;
      this.level.set({ ...currentLevel });
    }
  }

  generateLevel() {
    const newLevel = new DarkForest(this.profileService.level() || 1);
    this.adventureId.set('duesterwald');
    this.steps.set(newLevel.eventSteps);
    this.currentStepIndex.set(0);
    this.initializeLevel('duesterwald', this.profileService.level() || 1, newLevel.eventSteps);
    this.saveAdventure();
  }

  private getStorageKey(): string {
    return `${this.profileService.charId()}_adventure_save`;
  }

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

  loadAdventure(): boolean {
    const key = this.getStorageKey();
    console.log('[loadAdventure] Suche Key:', key);
    const data = localStorage.getItem(key);
    if (!data) {
      console.log('[loadAdventure] Kein Eintrag gefunden.');
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

  startNewAdventure(areaId: string) {
    if (this.adventureId()) {
      console.warn('Es läuft bereits ein Abenteuer.');
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
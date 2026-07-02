// src/app/services/adventure-state.service.ts
import { Injectable, signal, inject, effect, WritableSignal } from '@angular/core';
import { DarkForest } from '../classes/adventure/areas/dark-forest.class';
import { ProfileService } from './profile.service';
import { Router } from '@angular/router';
import { ShopService } from './shop.service';
import { WalletService } from './wallet.service';
import { InventarService } from './inventar.service';
import { SkillsService } from './skills.service';

/** Persistiertes Adventure-Savegame (LocalStorage-Format). */
export interface AdventureSaveState {
  adventureId: string;
  currentStepIndex: number;
  steps: any[];
  playerLevel: number;
  pendingRewards: any[]; // 🎁 gesammelte Belohnungen für diesen Run
  activeFight?: {
    monsterHp: number;
    playerHp: number;
    round: number;
    turn: 'player' | 'monster';
  } | null;
}

/**
 * Mapping: Step-Typ → Route der zugehörigen Adventure-Szene.
 * Wird von continueAdventure() und der IntroScene gemeinsam genutzt.
 */
export const ADVENTURE_STEP_ROUTES: Record<string, string> = {
  dialog: '/adventure/dialog',
  loot: '/adventure/loot',
  fight: '/adventure/fight',
  quiz: '/adventure/quiz',
};

/**
 * @service AdventureStateService
 * @description Verwaltet den kompletten Zustand eines Adventure-Runs:
 * Steps, aktueller Step-Index, aktiver Kampf, gesammelte Belohnungen
 * sowie Speichern/Laden des Runs im LocalStorage.
 */
@Injectable({ providedIn: 'root' })
export class AdventureStateService {
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private shopService = inject(ShopService);
  private walletService = inject(WalletService);
  private inventarService = inject(InventarService); // 🎁 für Reward-Übergabe
  private skillsService = inject(SkillsService);

  /** Alle Steps des laufenden Runs (fight/loot/dialog/quiz). */
  steps = signal<any[]>([]);
  /** Index des Steps, in dem sich der Spieler gerade befindet. */
  currentStepIndex = signal<number>(0);
  /** ID des laufenden Abenteuers (z.B. 'duesterwald') oder null. */
  adventureId = signal<string | null>(null);
  /** Zustand des aktiven Kampfes oder null, wenn kein Kampf läuft. */
  activeFight = signal<any | null>(null);
  /** Die aktive Area-Instanz (z.B. DarkForest) mit Loot-/Intro-Daten. */
  level: WritableSignal<any | null> = signal<any | null>(null);

  // 🎁 Sammlung aller Items, die in DIESEM Run gefunden wurden.
  // Wandert erst beim erfolgreichen Abschluss (completeAdventure) ins
  // Inventar. Bei Niederlage / clearAdventure wird's verworfen.
  pendingRewards: WritableSignal<any[]> = signal<any[]>([]);

  private hasAttemptedInitialLoad = true;

  constructor() {
    effect(() => {
      const charId = this.profileService.charId();
      console.log('[AdventureStateService] effect läuft, charId:', charId);
    });
  }

  /**
   * Lädt ein gespeichertes Abenteuer aus dem LocalStorage.
   *
   * @returns true, wenn ein Savegame gefunden und geladen wurde.
   */
  public loadAdventureManually(): boolean {
    const loaded = this.loadAdventure();
    console.log('[loadAdventureManually] Ergebnis:', loaded);
    return loaded;
  }

  /**
   * Setzt den kompletten Adventure-Zustand zurück und löscht das Savegame.
   * pendingRewards werden dabei verworfen; alle Shops werden neu ausgewürfelt.
   */
  public clearAdventure(): void {
    const key = this.getStorageKey();
    localStorage.removeItem(key);
    console.log('[clearAdventure] Savegame gelöscht für Key:', key);
    this.adventureId.set(null);
    this.currentStepIndex.set(0);
    this.steps.set([]);
    this.activeFight.set(null);
    this.level.set(null);
    this.pendingRewards.set([]); // 🎁 verworfen
    this.shopService.rerollAllShopsAtEndOfRun();
  }

  /**
   * 🎁 Fügt ein Item dem pendingRewards-Array hinzu und persistiert
   * den State sofort, damit ein Page-Reload die Belohnung nicht verschluckt.
   *
   * Wird typischerweise aus der LootScene aufgerufen, sobald gerollt wurde.
   *
   * @param item Das gefundene Item (null/undefined wird ignoriert).
   */
  public addReward(item: any): void {
    if (!item) return;
    this.pendingRewards.update((rewards) => [...rewards, item]);
    this.saveAdventure();
    console.log('🎁 [addReward] Belohnung hinzugefügt:', item);
    console.log('🎁 [addReward] pendingRewards aktuell:', this.pendingRewards());
  }

  /**
   * 🎁 Abenteuer erfolgreich beendet — alle gesammelten Rewards
   * werden ins Inventar überführt, danach State leeren und ins Dorf.
   */
  public completeAdventure(): void {
    const rewards = this.pendingRewards();
    console.log(
      `🏆 [completeAdventure] ${rewards.length} Items werden ins Inventar gepackt:`,
      rewards,
    );

    for (const item of rewards) {
      this.inventarService.addItemToInventar(item);
    }

    // Aufräumen + Shops rerollen passiert in clearAdventure
    this.clearAdventure();
    this.router.navigate(['/village']);
  }

  /**
   * Schließt den aktuellen Step ab und macht mit dem nächsten weiter:
   * Index hochzählen → speichern → continueAdventure().
   *
   * Zentrale Stelle für das früher mehrfach duplizierte Trio aus
   * DialogScene, LootScene und FightService.
   */
  public advanceToNextStep(): void {
    this.currentStepIndex.update((idx) => idx + 1);
    this.saveAdventure();
    this.continueAdventure();
  }

  /**
   * Navigiert zur Szene des aktuellen Steps — oder schließt das Abenteuer
   * ab, wenn keine Steps mehr übrig sind. Vergibt pro Aufruf 10 Gold.
   */
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

    // 🎁 Kein Step mehr → Adventure ist durch → Loot vergeben
    if (!currentStep) {
      console.log('[continueAdventure] Keine weiteren Steps — Adventure abgeschlossen!');
      this.completeAdventure();
      return;
    }

    const route = ADVENTURE_STEP_ROUTES[currentStep.type];
    if (route) {
      this.router
        .navigate([route])
        .then((s) => console.log('[continueAdventure] navigate() success?', s));
    } else {
      console.warn('[continueAdventure] Unbekannter Step-Typ:', currentStep.type);
    }

    this.walletService.addGold(10);
  }

  /**
   * Erzeugt IMMER eine frische Class-Instanz der Area und füttert sie mit den
   * gespeicherten eventSteps. Wichtig: KEIN { ...currentLevel } Spread mehr —
   * das hat die Prototype-Kette zerstört und Methoden wie rollLoot() killed.
   *
   * @param adventureId ID der Area (aktuell nur 'duesterwald').
   * @param level       Spieler-Level für die Loot-Generierung.
   * @param steps       Bereits generierte/gespeicherte eventSteps.
   */
  private initializeLevel(adventureId: string, level: number, steps: any[]): void {
    let newArea: any = null;

    if (adventureId === 'duesterwald') {
      newArea = new DarkForest(level, this.skillsService.combatStats()['magic-find'] || 0);
    } else {
      console.warn('[initializeLevel] Unbekannte adventureId:', adventureId);
      return;
    }

    newArea.eventSteps = steps;
    this.level.set(newArea);
  }

  /** Generiert einen komplett neuen Düsterwald-Run und speichert ihn. */
  generateLevel() {
    const newLevel = new DarkForest(
      this.profileService.level() || 1,
      this.skillsService.combatStats()['magic-find'] || 0,
    );
    this.adventureId.set('duesterwald');
    this.steps.set(newLevel.eventSteps);
    this.currentStepIndex.set(0);
    this.pendingRewards.set([]);
    this.initializeLevel('duesterwald', this.profileService.level() || 1, newLevel.eventSteps);
    this.saveAdventure();
  }

  /** LocalStorage-Key für das Adventure-Savegame des aktiven Charakters. */
  private getStorageKey(): string {
    return `${this.profileService.charId()}_adventure_save`;
  }

  /** Persistiert den kompletten Adventure-Zustand im LocalStorage. */
  saveAdventure(): void {
    const state: AdventureSaveState = {
      adventureId: this.adventureId()!,
      currentStepIndex: this.currentStepIndex(),
      steps: this.steps(),
      playerLevel: this.profileService.level(),
      pendingRewards: this.pendingRewards(), // 🎁 mit-persistieren
      activeFight: this.activeFight(),
    };
    localStorage.setItem(this.getStorageKey(), JSON.stringify(state));
    console.log('[saveAdventure] gespeichert unter Key:', this.getStorageKey(), state);
  }

  /**
   * Stellt den Adventure-Zustand aus dem LocalStorage wieder her.
   *
   * @returns true, wenn ein Savegame existierte und geladen wurde.
   */
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
    this.pendingRewards.set(state.pendingRewards || []); // 🎁 restoren
    this.initializeLevel(state.adventureId, state.playerLevel, state.steps);
    return true;
  }

  /**
   * Startet einen frischen Run in der angegebenen Area und
   * navigiert zur Intro-Szene.
   *
   * @param areaId ID der Area (aktuell nur 'duesterwald').
   */
  startNewAdventure(areaId: string) {
    if (areaId === 'duesterwald') {
      this.level.set(
        new DarkForest(
          this.profileService.level() || 1,
          this.skillsService.combatStats()['magic-find'] || 0,
        ),
      );
    } else {
      console.error('Unbekannte Area-ID');
      return;
    }
    this.adventureId.set(areaId);
    this.steps.set(this.level()!.eventSteps);
    this.currentStepIndex.set(0);
    this.activeFight.set(null);
    this.pendingRewards.set([]); // 🎁 frischer Run = leere Rewards
    this.saveAdventure();
    this.router.navigate(['/adventure/intro']);
  }

  /**
   * 💀 Abenteuer gescheitert (z.B. Kampf verloren, User klickt "zurück ins Dorf"
   * mitten im Run). pendingRewards werden VERWORFEN — analog zur alten
   * clearAdventure-Logik, aber navigiert zusätzlich zurück ins Dorf.
   */
  public failAdventure(): void {
    console.log('💀 [failAdventure] Abenteuer gescheitert — pendingRewards verworfen.');
    this.clearAdventure(); // löscht Storage, resetet Signals, rerollt Shops
    this.router.navigate(['/village']);
  }
}

// src/app/services/adventure-state.service.ts
import { Injectable, signal, inject, effect, computed, WritableSignal } from '@angular/core';
import { DarkForest } from '../classes/adventure/areas/dark-forest.class';
import { ProfileService } from './profile.service';
import { Router } from '@angular/router';
import { ShopService } from './shop.service';
import { WalletService } from './wallet.service';
import { InventarService } from './inventar.service';
import { SkillsService } from './skills.service';
import materials from '../../../public/item-data/materials.json';

// 🏆 Abschluss-Bonus, den es NUR gibt, wenn wirklich alle Steps eines Runs
// geschafft wurden (completeAdventure) — nicht beim vorzeitigen Rückzug
// über returnToVillageEarly().
const COMPLETION_BONUS_GOLD = 50;
const COMPLETION_BONUS_MATERIAL_CHANCE = 0.05;

/** Persistiertes Adventure-Savegame (LocalStorage-Format). */
export interface AdventureSaveState {
  adventureId: string;
  currentStepIndex: number;
  steps: any[];
  playerLevel: number;
  pendingRewards: any[]; // 🎁 gesammelte Belohnungen für diesen Run
  goldEarnedThisRun: number; // 💰 im laufenden Run vergebenes Gold (bei Tod/Flucht rückbuchbar)
  activeFight?: {
    monsterHp: number;
    playerHp: number;
    round: number;
    turn: 'player' | 'monster';
  } | null;
  /** 🧪 Über den ganzen Run mitgenommene HP/Mana (null = noch nicht initialisiert → voll). */
  currentPlayerHp?: number | null;
  currentPlayerMana?: number | null;
  /** 🛡️ Über den ganzen Run mitgenommenes Energieschild (null = noch nicht initialisiert → voll). */
  currentPlayerEnergyShield?: number | null;
}

/**
 * Mapping: Step-Typ → Route der zugehörigen Adventure-Szene.
 * Wird von continueAdventure() und der IntroScene gemeinsam genutzt.
 */
export const ADVENTURE_STEP_ROUTES: Record<string, string> = {
  dialog: '/adventure/dialog',
  loot: '/adventure/loot',
  fight: '/adventure/fight',
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

  /** Alle Steps des laufenden Runs (fight/loot/dialog). */
  steps = signal<any[]>([]);
  /** Index des Steps, in dem sich der Spieler gerade befindet. */
  currentStepIndex = signal<number>(0);
  /** ID des laufenden Abenteuers (z.B. 'duesterwald') oder null. */
  adventureId = signal<string | null>(null);
  /** Zustand des aktiven Kampfes oder null, wenn kein Kampf läuft. */
  activeFight = signal<any | null>(null);

  // 🧪 HP/Mana werden über den GESAMTEN Run mitgenommen (nicht mehr pro Kampf voll
  // regeneriert) — null bedeutet "noch nicht initialisiert", FightService.initializeFight()
  // füllt dann mit den vollen combatStats() als Startwert für den allerersten Kampf.
  public currentPlayerHp: WritableSignal<number | null> = signal<number | null>(null);
  public currentPlayerMana: WritableSignal<number | null> = signal<number | null>(null);
  public currentPlayerEnergyShield: WritableSignal<number | null> = signal<number | null>(null);
  /** Die aktive Area-Instanz (z.B. DarkForest) mit Loot-/Intro-Daten. */
  level: WritableSignal<any | null> = signal<any | null>(null);

  // 🎁 Sammlung aller Items, die in DIESEM Run gefunden wurden.
  // Wandert erst beim erfolgreichen Abschluss (completeAdventure) ins
  // Inventar. Bei Niederlage / clearAdventure wird's verworfen.
  pendingRewards: WritableSignal<any[]> = signal<any[]>([]);

  // 💰 Im laufenden Run bereits ausgezahltes Gold (Reise-Gold pro Step + Dialog-Belohnungen).
  // Wird bei Tod/Flucht per walletService.spendGold() wieder abgezogen — analog zu
  // pendingRewards, nur dass Gold (anders als Items) sofort statt erst am Run-Ende gezahlt wird.
  goldEarnedThisRun: WritableSignal<number> = signal<number>(0);

  // 📜 Zwischenstand-Fenster: läuft nach jedem erfolgreich abgeschlossenen Step
  // (Kampf gewonnen, Loot eingesackt, Dialog beendet) UND bei Niederlage.
  // 'step'  → normaler Zwischenstand, "Weiter" führt zum nächsten Step.
  // 'death' → Niederlage, "Weiter" beendet den Run (failAdventure).
  public summaryMode: WritableSignal<'step' | 'death' | null> = signal(null);
  // Items/Gold, die seit dem LETZTEN Zwischenstand neu dazugekommen sind (fürs Hervorheben).
  public summaryNewItems: WritableSignal<any[]> = signal<any[]>([]);
  public summaryNewGold: WritableSignal<number> = signal<number>(0);

  // 🏠 Gate für returnToVillageEarly(): true, sobald mindestens EIN fight-Step
  // im laufenden Run erfolgreich abgeschlossen wurde (steps bis inkl.
  // currentStepIndex, da der Index beim Anzeigen der Summary noch auf dem
  // gerade beendeten Step steht — siehe showStepSummary()). Verhindert, dass
  // man direkt nach einer aufwandslosen Loot-/Dialog-Scene ohne jeden Kampf
  // sofort mit der Beute zurück ins Dorf geht.
  public hasWonAnyFight = computed(() =>
    this.steps()
      .slice(0, this.currentStepIndex() + 1)
      .some((step) => step.type === 'fight'),
  );

  // Merkt sich den Stand von pendingRewards/goldEarnedThisRun beim letzten
  // Zwischenstand, um beim nächsten den Diff ("neu seit letztem Mal") zu bilden.
  private lastSummaryItemCount = 0;
  private lastSummaryGold = 0;

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
    this.goldEarnedThisRun.set(0);
    this.currentPlayerHp.set(null); // 🧪 nächster Run startet wieder mit voller HP/Mana
    this.currentPlayerMana.set(null);
    this.currentPlayerEnergyShield.set(null); // 🛡️ nächster Run startet wieder mit vollem Schild
    this.summaryMode.set(null);
    this.summaryNewItems.set([]);
    this.summaryNewGold.set(0);
    this.lastSummaryItemCount = 0;
    this.lastSummaryGold = 0;
    this.shopService.rerollAllShopsAtEndOfRun();
  }

  /**
   * 💰 Vergibt Gold, das an den laufenden Run gebunden ist (Reise-Gold pro Step,
   * Dialog-Belohnungen). Im Gegensatz zu Items (siehe addReward/pendingRewards) wird
   * Gold sofort ausgezahlt, aber die Summe wird mitgezählt, damit sie bei Tod/Flucht
   * über finishFailedRun() wieder abgebucht werden kann.
   */
  public recordRunGold(amount: number): void {
    if (amount <= 0) return;
    this.walletService.addGold(amount);
    this.goldEarnedThisRun.update((total) => total + amount);
    this.saveAdventure();
  }

  /**
   * 🧪 Wendet einen Heiltrank AUSSERHALB eines Kampfes an (z.B. im Zwischenstand).
   * Geklemmt an die volle HP aus combatStats() — falls noch nie initialisiert
   * (null, allererster Step des Runs), wird von diesem Maximum ausgegangen.
   */
  public applyPotionHeal(value: number): void {
    const maxHp = this.skillsService.combatStats().hp;
    const current = this.currentPlayerHp() ?? maxHp;
    this.currentPlayerHp.set(Math.min(maxHp, current + value));
    this.saveAdventure();
  }

  /** 🧪 Wendet einen Manatrank AUSSERHALB eines Kampfes an — siehe applyPotionHeal(). */
  public applyPotionMana(value: number): void {
    const maxMana = this.skillsService.combatStats().mana;
    const current = this.currentPlayerMana() ?? maxMana;
    this.currentPlayerMana.set(Math.min(maxMana, current + value));
    this.saveAdventure();
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
   * 🎁 Abenteuer erfolgreich beendet (ALLE Steps geschafft) — alle
   * gesammelten Rewards werden ins Inventar überführt, dazu gibt's den
   * Abschluss-Bonus (50 Gold + 5% Chance auf ein Upgrade-Material) —
   * danach State leeren und ins Dorf.
   *
   * Der Bonus gibt's NUR hier, nicht bei returnToVillageEarly() (vorzeitiger
   * freiwilliger Rückzug mit dem bisher gesammelten Loot).
   */
  public completeAdventure(): void {
    this.walletService.addGold(COMPLETION_BONUS_GOLD);
    console.log(`🏆 [completeAdventure] Abschluss-Bonus: ${COMPLETION_BONUS_GOLD} Gold.`);

    if (Math.random() < COMPLETION_BONUS_MATERIAL_CHANCE) {
      const material = materials[Math.floor(Math.random() * materials.length)];
      if (material) {
        this.inventarService.addItemToInventar(JSON.parse(JSON.stringify(material)));
        console.log('🏆 [completeAdventure] Bonus-Material gedroppt:', material.name);
      }
    }

    this.finishAdventureKeepingRewards();
  }

  /**
   * 🏠 Spieler beendet das Abenteuer freiwillig VORZEITIG, behält aber alles
   * bisher gesammelte Loot & Gold — im Gegensatz zu failAdventure() (Kampf
   * verloren, zählt wie eine Niederlage und verwirft alles). Kein
   * Abschluss-Bonus, den gibt's nur bei completeAdventure().
   */
  public returnToVillageEarly(): void {
    this.finishAdventureKeepingRewards();
  }

  /** Gemeinsame Logik für completeAdventure/returnToVillageEarly: Rewards ins Inventar, aufräumen, heim. */
  private finishAdventureKeepingRewards(): void {
    const rewards = this.pendingRewards();
    console.log(
      `🎁 [finishAdventureKeepingRewards] ${rewards.length} Items werden ins Inventar gepackt:`,
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
   * 📜 Zeigt den Zwischenstand nach einem erfolgreich abgeschlossenen Step
   * (Kampf gewonnen, Loot eingesackt, Dialog beendet). Bildet den Diff zu
   * pendingRewards/goldEarnedThisRun seit dem letzten Zwischenstand, damit
   * die Summary-Scene zeigen kann, was gerade NEU dazugekommen ist.
   *
   * Ersetzt an den entsprechenden Stellen den direkten advanceToNextStep()-
   * Aufruf — der eigentliche Step-Wechsel passiert erst, wenn der Spieler
   * die Summary-Scene bestätigt (siehe acknowledgeSummary()).
   */
  public showStepSummary(): void {
    const items = this.pendingRewards();
    const gold = this.goldEarnedThisRun();

    this.summaryNewItems.set(items.slice(this.lastSummaryItemCount));
    this.summaryNewGold.set(gold - this.lastSummaryGold);

    this.lastSummaryItemCount = items.length;
    this.lastSummaryGold = gold;

    this.summaryMode.set('step');

    // 🛡️ Vor JEDER Navigation speichern: SceneContainerComponent lädt bei
    // jedem Szenenwechsel den Adventure-State aus dem LocalStorage neu
    // (siehe gameStateService.init()). Ist der zuletzt gespeicherte Stand
    // veraltet (z.B. activeFight vom gerade beendeten Kampf), würde dieser
    // Reload das frisch aufgeräumte In-Memory-Signal wieder überschreiben.
    this.saveAdventure();
    this.router.navigate(['/adventure/summary']);
  }

  /**
   * 💀 Zeigt denselben Zwischenstand mit der Niederlage-Nachricht, BEVOR
   * der Run über failAdventure() tatsächlich beendet wird (siehe
   * acknowledgeSummary()) — Items/Gold sind an dieser Stelle noch nicht
   * verworfen, die Summary-Scene zeigt also genau das, was verloren geht.
   */
  public showDeathSummary(): void {
    this.summaryNewItems.set([]);
    this.summaryNewGold.set(0);
    this.summaryMode.set('death');
    this.saveAdventure(); // 🛡️ siehe Kommentar in showStepSummary()
    this.router.navigate(['/adventure/summary']);
  }

  /**
   * Wird von der Summary-Scene beim Klick auf "Weiter" aufgerufen:
   * bei 'step' geht's zum nächsten Step, bei 'death' wird der Run
   * über failAdventure() beendet (Loot/Gold verworfen).
   */
  public acknowledgeSummary(): void {
    const mode = this.summaryMode();
    this.summaryMode.set(null);

    if (mode === 'death') {
      this.failAdventure();
    } else {
      this.advanceToNextStep();
    }
  }

  /**
   * Navigiert zur Szene des aktuellen Steps — oder schließt das Abenteuer
   * ab, wenn keine Steps mehr übrig sind. Gold gibt es nur noch über
   * Encounter- bzw. Loot-Belohnungen (recordRunGold-Aufrufe in fight.service
   * und dialog-scene), kein fester Betrag mehr pro Step.
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
    this.goldEarnedThisRun.set(0);
    this.currentPlayerHp.set(null); // 🧪 frischer Run = volle HP/Mana beim ersten Kampf
    this.currentPlayerMana.set(null);
    this.currentPlayerEnergyShield.set(null); // 🛡️ frischer Run = volles Schild beim ersten Kampf
    this.lastSummaryItemCount = 0;
    this.lastSummaryGold = 0;
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
      goldEarnedThisRun: this.goldEarnedThisRun(),
      activeFight: this.activeFight(),
      currentPlayerHp: this.currentPlayerHp(), // 🧪 mit-persistieren
      currentPlayerMana: this.currentPlayerMana(),
      currentPlayerEnergyShield: this.currentPlayerEnergyShield(), // 🛡️ mit-persistieren
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
    this.goldEarnedThisRun.set(state.goldEarnedThisRun || 0);
    this.currentPlayerHp.set(state.currentPlayerHp ?? null); // 🧪 restoren
    this.currentPlayerMana.set(state.currentPlayerMana ?? null);
    this.currentPlayerEnergyShield.set(state.currentPlayerEnergyShield ?? null); // 🛡️ restoren
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
    this.goldEarnedThisRun.set(0);
    this.currentPlayerHp.set(null); // 🧪 frischer Run = volle HP/Mana beim ersten Kampf
    this.currentPlayerMana.set(null);
    this.currentPlayerEnergyShield.set(null); // 🛡️ frischer Run = volles Schild beim ersten Kampf
    this.lastSummaryItemCount = 0;
    this.lastSummaryGold = 0;
    this.saveAdventure();
    this.router.navigate(['/adventure/intro']);
  }

  /**
   * 💀 Abenteuer gescheitert (Kampf verloren): kein Loot, kein Gold aus dem
   * Run — nur die bereits vergebene EXP bleibt (die wird sofort bei
   * Kampf-Sieg vergeben, ist also nie Teil von pendingRewards).
   */
  public failAdventure(): void {
    this.finishFailedRun('💀 Niederlage');
  }

  /** Gemeinsame Logik für eine Niederlage (siehe failAdventure). */
  private finishFailedRun(logPrefix: string): void {
    const lostGold = this.goldEarnedThisRun();
    if (lostGold > 0) {
      this.walletService.spendGold(lostGold);
      console.log(`${logPrefix}: ${lostGold} Gold aus diesem Lauf verworfen.`);
    }
    console.log(`${logPrefix}: Abenteuer beendet — pendingRewards verworfen.`);
    this.clearAdventure(); // löscht Storage, resetet Signals, rerollt Shops
    this.router.navigate(['/village']);
  }
}

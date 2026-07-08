import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimationObject } from '../../shared/animation-object/animation-object';
import { LoadingScreen } from '../../shared/loading-screen/loading-screen';
import { GameStateService } from '../../../services/game-state.service';
import { AssetPreloaderService } from '../../../services/asset-preloader.service';
import { getItemTier } from '../../../utils/item-display.util';
import { FleeButton } from '../../shared/flee-button/flee-button';

/**
 * @component LootScene
 * @description Zeigt erst eine Loot-Intro-Animation, danach das gerollte
 * Item. Klick auf das Item-Panel → currentStepIndex++ und weiter im Adventure.
 *
 * Hintergrund-Frames und Intro-Frames kommen aus der jeweiligen Area
 * (lootScenePaths / lootIntroPaths), sodass jedes Gebiet seine eigene
 * Loot-Scene-Optik hat.
 *
 * Das Würfeln passiert NUR beim ersten Betreten dieses Steps. Beim Resume
 * (Page-Reload mitten in der Loot-Scene) wird das bereits gerollte Item aus
 * dem Step wiederverwendet — sonst hätten wir bei jedem Reload ein neues
 * Item, was unfair wäre und pendingRewards duplizieren würde.
 */
@Component({
  selector: 'app-loot-scene',
  standalone: true,
  imports: [CommonModule, AnimationObject, LoadingScreen, FleeButton],
  templateUrl: './loot-scene.html',
  styleUrl: './loot-scene.scss',
})
export class LootScene implements OnInit {
  gameStateService = inject(GameStateService);
  private preloader = inject(AssetPreloaderService);

  // --- 🆕 Preloading: solange true zeigt das Template nur den Ladebildschirm ---
  public isLoading = signal<boolean>(true);

  // --- UI-State: Intro ---
  public showLootIntro = signal<boolean>(false);
  public lootIntroPaths = signal<string[]>([]);
  public lootIntroDuration = signal<number>(2000);

  // --- UI-State: Hintergrund (kommt aus der Area) ---
  public lootScenePaths = signal<string[]>([]);
  public lootSceneDuration = signal<number>(4000);

  // --- UI-State: gerolltes Item ---
  public foundItem = signal<any | null>(null);

  async ngOnInit(): Promise<void> {
    console.log('🎁 LootScene ngOnInit feuert!');

    const adventure = this.gameStateService.adventureStateService;
    const area = adventure.level();
    const currentIndex = adventure.currentStepIndex();
    const currentStep = adventure.steps()[currentIndex];

    if (!area || !currentStep) {
      console.error('🎁 LootScene: kein Level oder kein Step gefunden!');
      return;
    }

    // 🖼️ Hintergrund-Pfade aus der Area in lokale Signals spiegeln,
    // damit das Template sauber data-bindet.
    this.lootScenePaths.set(area.lootScenePaths ?? []);
    this.lootSceneDuration.set(area.lootSceneDuration ?? 4000);

    // 1️⃣ Loot ermitteln — entweder schon im Step (Resume) oder frisch rollen
    let lootItem = currentStep.loot;
    const isFirstVisit = !lootItem;

    if (isFirstVisit) {
      lootItem = area.rollLoot();
      console.log('🎲 [LootScene] Frisch gerollt:', lootItem);

      // Im Step verankern, damit Resume das gleiche Item zeigt
      currentStep.loot = lootItem;

      // pendingRewards füttern (saveAdventure läuft intern in addReward)
      if (lootItem) {
        adventure.addReward(lootItem);
      } else {
        // Tier leer / kein Loot → trotzdem saven dass wir das versucht haben
        adventure.saveAdventure();
      }
    } else {
      console.log('♻️ [LootScene] Resume — wiederverwende:', lootItem);
    }

    this.foundItem.set(lootItem);

    // 2️⃣ Intro nur beim ersten Betreten zeigen — beim Resume direkt das Item
    const introPaths = area.lootIntroPaths ?? [];
    const introDuration = area.lootIntroDuration ?? 2000;

    // 🆕 ALLE Bilder der Loot-Scene (Hintergrund, Intro-Frames, Item-Bild)
    // VOR dem Start laden — solange läuft der Ladebildschirm. Erst danach
    // startet der Intro-Timer, damit auf dem Webserver nichts mehr ruckelt.
    this.isLoading.set(true);
    await this.preloader.preloadImages([
      ...(area.lootScenePaths ?? []),
      ...introPaths,
      lootItem?.['img-path'],
    ]);
    this.isLoading.set(false);

    if (isFirstVisit && Array.isArray(introPaths) && introPaths.length > 0) {
      this.lootIntroPaths.set(introPaths);
      this.lootIntroDuration.set(introDuration);
      this.showLootIntro.set(true);

      console.log(
        `🎬 Loot-Intro startet (${introDuration}ms, ${introPaths.length} Frames)`
      );

      setTimeout(() => {
        this.showLootIntro.set(false);
        console.log('🎬 Loot-Intro beendet, zeige Item');
      }, introDuration);
    } else {
      this.showLootIntro.set(false);
    }
  }

  /**
   * Wird gefeuert wenn der Spieler nach dem Loot weiterklickt.
   * Zeigt erst den Zwischenstand (Fortschritts-Fenster), der beim
   * Bestätigen dann advanceToNextStep() auslöst.
   */
  public onContinue(): void {
    this.gameStateService.adventureStateService.showStepSummary();
  }

  public getTier(item: any): number | null {
    return getItemTier(item);
  }
}
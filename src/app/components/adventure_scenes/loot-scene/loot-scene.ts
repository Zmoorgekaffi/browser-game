import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimationObject } from '../../shared/animation-object/animation-object';
import { GameStateService } from '../../../services/game-state.service';

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
  imports: [CommonModule, AnimationObject],
  templateUrl: './loot-scene.html',
  styleUrl: './loot-scene.scss',
})
export class LootScene implements OnInit {
  gameStateService = inject(GameStateService);

  // --- UI-State: Intro ---
  public showLootIntro = signal<boolean>(false);
  public lootIntroPaths = signal<string[]>([]);
  public lootIntroDuration = signal<number>(2000);

  // --- UI-State: Hintergrund (kommt aus der Area) ---
  public lootScenePaths = signal<string[]>([]);
  public lootSceneDuration = signal<number>(4000);

  // --- UI-State: gerolltes Item ---
  public foundItem = signal<any | null>(null);

  ngOnInit(): void {
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
   * advanceToNextStep() ruft entweder die nächste Szene oder
   * completeAdventure (wenn keine Steps mehr übrig sind).
   */
  public onContinue(): void {
    this.gameStateService.adventureStateService.advanceToNextStep();
  }
}
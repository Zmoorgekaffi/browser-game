import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AnimationObject } from '../../shared/animation-object/animation-object';
import { LoadingScreen } from '../../shared/loading-screen/loading-screen';
import { GameStateService } from '../../../services/game-state.service';
import { AssetPreloaderService } from '../../../services/asset-preloader.service';
import { ADVENTURE_STEP_ROUTES } from '../../../services/adventure-state.service';

/**
 * @component RandomIntroScene
 * @description Intro-Szene des ALTEN Zufalls-Step-Systems (fight/loot/dialog,
 * siehe AdventureStateService/Area) — koexistiert bewusst neben der neuen,
 * festen Welt (siehe generisches IntroScene + INTRO_REGISTRY). Liest Frames/
 * Duration aus der aktiven Area-Instanz (`adventureStateService.level()`)
 * und navigiert danach zum ersten Step. Wird über "🎲 Zufalls-Abenteuer" auf
 * der Adventure-Auswahlseite gestartet.
 */
@Component({
  selector: 'app-random-intro-scene',
  imports: [AnimationObject, LoadingScreen],
  templateUrl: './random-intro-scene.html',
  styleUrl: './random-intro-scene.scss',
})
export class RandomIntroScene implements OnInit {
  gameStateService = inject(GameStateService);
  private router = inject(Router);
  private preloader = inject(AssetPreloaderService);

  public isLoading = signal<boolean>(true);

  async ngOnInit(): Promise<void> {
    const level = this.gameStateService.adventureStateService.level();
    if (!level) {
      console.error('RandomIntroScene: kein Level gefunden!');
      return;
    }

    await this.preloader.preloadImages(level.introPaths ?? []);
    this.isLoading.set(false);

    setTimeout(() => {
      this.navigateToNextStep();
    }, level.introDuration);
  }

  /** Navigiert anhand des Step-Typs zur passenden Adventure-Szene. */
  private navigateToNextStep(): void {
    const adventure = this.gameStateService.adventureStateService;
    const currentStep = adventure.steps()[adventure.currentStepIndex()];

    if (!currentStep) {
      console.error('Kein Step gefunden!');
      return;
    }

    const route = ADVENTURE_STEP_ROUTES[currentStep.type];
    if (route) {
      this.router.navigate([route]);
    } else {
      console.warn('Unbekannter Step-Typ:', currentStep.type);
    }
  }
}

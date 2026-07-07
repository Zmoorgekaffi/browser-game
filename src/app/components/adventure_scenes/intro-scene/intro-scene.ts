import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AnimationObject } from '../../shared/animation-object/animation-object';
import { LoadingScreen } from '../../shared/loading-screen/loading-screen';
import { GameStateService } from '../../../services/game-state.service';
import { AssetPreloaderService } from '../../../services/asset-preloader.service';
import { ADVENTURE_STEP_ROUTES } from '../../../services/adventure-state.service';
import { FleeButton } from '../../shared/flee-button/flee-button';

/**
 * @component IntroScene
 * @description Spielt die Intro-Animation der Area ab und navigiert nach
 * Ablauf von introDuration automatisch zur Szene des ersten Steps.
 *
 * 🆕 Vorher startete der Navigations-Timer sofort in ngAfterViewInit —
 * auf dem Webserver waren die Frames dann noch gar nicht geladen und die
 * Animation ruckelte (bzw. war schon vorbei, bevor Bilder ankamen).
 * Jetzt werden erst ALLE Intro-Frames vorgeladen (Ladebildschirm),
 * dann starten Animation und Timer gemeinsam.
 */
@Component({
  selector: 'app-intro-scene',
  imports: [AnimationObject, LoadingScreen, FleeButton],
  templateUrl: './intro-scene.html',
  styleUrl: './intro-scene.scss',
})
export class IntroScene implements OnInit {
  gameStateService = inject(GameStateService);
  private router = inject(Router);
  private preloader = inject(AssetPreloaderService);

  /** Solange true zeigt das Template nur den Ladebildschirm. */
  public isLoading = signal<boolean>(true);

  async ngOnInit(): Promise<void> {
    const level = this.gameStateService.adventureStateService.level();
    if (!level) {
      console.error('IntroScene: kein Level gefunden!');
      return;
    }

    // 🆕 Alle Intro-Frames vorladen, DANN Animation + Navigations-Timer starten
    await this.preloader.preloadImages(level.introPaths ?? []);
    this.isLoading.set(false);

    setTimeout(() => {
      console.log('intro finished');
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

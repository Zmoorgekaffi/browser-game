import { Component, inject, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AnimationObject } from '../../shared/animation-object/animation-object';
import { GameStateService } from '../../../services/game-state.service';
import { ADVENTURE_STEP_ROUTES } from '../../../services/adventure-state.service';

/**
 * @component IntroScene
 * @description Spielt die Intro-Animation der Area ab und navigiert nach
 * Ablauf von introDuration automatisch zur Szene des ersten Steps.
 */
@Component({
  selector: 'app-intro-scene',
  imports: [AnimationObject],
  templateUrl: './intro-scene.html',
  styleUrl: './intro-scene.scss',
})
export class IntroScene implements AfterViewInit {
  gameStateService = inject(GameStateService);
  private router = inject(Router);

  ngAfterViewInit(): void {
    setTimeout(() => {
      console.log('intro finished');
      this.navigateToNextStep();
    }, this.gameStateService.adventureStateService.level()!.introDuration);
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

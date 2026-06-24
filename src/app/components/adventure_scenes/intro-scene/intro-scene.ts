import { Component, inject, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AnimationObject } from '../../shared/animation-object/animation-object';
import { GameStateService } from '../../../services/game-state.service';

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

  private navigateToNextStep(): void {
    const adventure = this.gameStateService.adventureStateService;
    const currentStep = adventure.steps()[adventure.currentStepIndex()];

    if (!currentStep) {
      console.error('Kein Step gefunden!');
      return;
    }

    switch (currentStep.type) {
      case 'dialog':
        this.router.navigate(['/adventure/dialog']);
        break;
      case 'loot':
        this.router.navigate(['/adventure/loot']);
        break;
      case 'fight':
        this.router.navigate(['/adventure/fight']);
        break;
      case 'quiz':
        this.router.navigate(['/adventure/quiz']);
        break;
      default:
        console.warn('Unbekannter Step-Typ:', currentStep.type);
    }
  }
}
// src/app/components/shared/scene-container/scene-container.ts
import { Component, Signal } from '@angular/core'; // Signal Typ großgeschrieben
import { CommonModule } from '@angular/common';
import { RedirectHotspotComponent } from '../redirect-hotspot/redirect-hotspot.component';
import { GameStateService } from '../../../services/game-state.service';


@Component({
  selector: 'app-scene-container',
  imports: [RedirectHotspotComponent, CommonModule],
  standalone: true,
  templateUrl: './scene-container.html',
  styleUrls: ['./scene-container.scss']
})
export class SceneContainerComponent {
    currentCharId: Signal<string | null>;

    constructor(public gameStateService: GameStateService) {
          this.currentCharId = this.gameStateService.currentCharId;
    }
}


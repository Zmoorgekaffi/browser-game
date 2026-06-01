import { Component } from '@angular/core';
import { RedirectHotspotComponent } from '../shared/redirect-hotspot/redirect-hotspot.component';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-village-scene',
  standalone: true,
  imports: [RedirectHotspotComponent],
  templateUrl: './village-scene.html',
  styleUrls: ['./village-scene.scss'],
})
export class VillageSceneComponent {
  constructor(private gameStateService: GameStateService) {
    this.getCurrentUserId();
  }

  getCurrentUserId() {
    let currentUser = sessionStorage.getItem('pixel-quest-currentUser');
    if (currentUser) {
      this.gameStateService.currentCharId.set(currentUser);
    }
  }
}

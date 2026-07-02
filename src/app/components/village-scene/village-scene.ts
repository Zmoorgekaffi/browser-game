import { Component, inject } from '@angular/core';
import { RedirectHotspotComponent } from '../shared/redirect-hotspot/redirect-hotspot.component';
import { GameStateService } from '../../services/game-state.service';

/**
 * @component VillageSceneComponent
 * @description Dorf-Übersicht mit klickbaren Hotspots zu den einzelnen
 * Gebäuden (Shops, Taverne, Schrein, Abenteuer ...).
 */
@Component({
  selector: 'app-village-scene',
  standalone: true,
  imports: [RedirectHotspotComponent],
  templateUrl: './village-scene.html',
  styleUrls: ['./village-scene.scss'],
})
export class VillageSceneComponent {

  public gameStateService = inject(GameStateService);

  constructor() {
    this.getCurrentUserId();
  }

  /** Übernimmt die Charakter-ID aus der Session in den GameState. */
  getCurrentUserId() {
    let currentUser = sessionStorage.getItem('pixel-quest-currentUser');
    if (currentUser) {
      this.gameStateService.currentCharId.set(currentUser);
    }
  }
}

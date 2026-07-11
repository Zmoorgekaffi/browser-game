import { Component, OnInit, inject, signal } from '@angular/core';
import { RedirectHotspotComponent } from '../shared/redirect-hotspot/redirect-hotspot.component';
import { LoadingScreen } from '../shared/loading-screen/loading-screen';
import { GameStateService } from '../../services/game-state.service';
import { AssetPreloaderService } from '../../services/asset-preloader.service';

/**
 * @component VillageSceneComponent
 * @description Dorf-Übersicht mit klickbaren Hotspots zu den einzelnen
 * Gebäuden (Shops, Taverne, Schrein, Abenteuer ...).
 *
 * 🆕 Zeigt einen Ladebildschirm, bis das Dorf-Hintergrundbild vollständig
 * geladen ist (auf dem Webserver würde sonst erst ein schwarzer Screen
 * mit Hotspots erscheinen).
 */
@Component({
  selector: 'app-village-scene',
  standalone: true,
  imports: [RedirectHotspotComponent, LoadingScreen],
  templateUrl: './village-scene.html',
  styleUrls: ['./village-scene.scss'],
})
export class VillageSceneComponent implements OnInit {

  public gameStateService = inject(GameStateService);
  private preloader = inject(AssetPreloaderService);

  /** Solange true zeigt das Template nur den Ladebildschirm. */
  public isLoading = signal<boolean>(true);

  constructor() {
    this.getCurrentUserId();
  }

  async ngOnInit(): Promise<void> {
    await this.preloader.preloadImages([
      'imgs/village/village_0.webp',
      'imgs/magic-shop/village-building/magic-shop-building_0.webp',
      'imgs/general-supplies/general-supplies-building/general-supplies-building_0.webp',
      'imgs/tavern/tavern-building/tavern-building_0.webp',
      'imgs/smither/smith-building/smith-building_0.webp',
      'imgs/shrine/shrine-building/shrine-building_0.webp',
    ]);
    this.isLoading.set(false);
  }

  /** Übernimmt die Charakter-ID aus der Session in den GameState. */
  getCurrentUserId() {
    let currentUser = sessionStorage.getItem('pixel-quest-currentUser');
    if (currentUser) {
      this.gameStateService.currentCharId.set(currentUser);
    }
  }
}

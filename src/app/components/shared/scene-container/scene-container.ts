// src/app/components/shared/scene-container/scene-container.ts
import { Component, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RedirectHotspotComponent } from '../redirect-hotspot/redirect-hotspot.component';
import { LoginService } from '../../../services/login.service';
import { SceneService } from '../../../services/scene.service'; // Pfad zu deinem neuen Service anpassen
import { GameStateService } from '../../../services/game-state.service';
import { AudioService } from '../../../services/audio-object.service';


@Component({
  selector: 'app-scene-container',
  imports: [RedirectHotspotComponent, CommonModule],
  standalone: true,
  templateUrl: './scene-container.html',
  styleUrls: ['./scene-container.scss'],
})
export class SceneContainerComponent {
  // Services
  private loginService = inject(LoginService);
  private sceneService = inject(SceneService);
  private gameStateService = inject(GameStateService);
  private audioService = inject(AudioService);

  constructor() {
    effect(() => {
      const currentScene = this.sceneService.currentScene();

      // 1. Wenn die Route leer ("/") ODER gleich "/login" ist -> ABBRECHEN!
      if (currentScene === '' || currentScene === '/' || currentScene === '/login') {
        console.log('init() blockiert auf Route:', currentScene);
        return; // Hier stoppen wir, der restliche Code wird ignoriert
      }

      // 2. In JEDEM anderen Fall: Ausführen!
      console.log('Gültige Route gefunden! GameStateService wird initialisiert:', currentScene);
      this.gameStateService.init();

    });
  }

  // Kombiniertes Signal für das Template
  public showBackToVillageButton = computed(() => {
    const charId = this.loginService.loggedInAs();
    const currentScene = this.sceneService.currentScene();

    // Button anzeigen, wenn eingeloggt und nicht im Dorf
    return charId !== null && currentScene !== '/village';
  });
}

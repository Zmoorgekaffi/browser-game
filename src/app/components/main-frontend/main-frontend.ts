import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SceneContainerComponent } from '../shared/scene-container/scene-container';
import { Header } from '../shared/header/header';
import { LoginService } from '../../services/login.service';
import { SceneService } from '../../services/scene.service';
import { ScreenSizingService } from '../../services/screen-sizing.service';

/**
 * @component MainFrontendComponent
 * @description Rahmen-Layout der App: Header + Szenen-Container.
 * Entscheidet reaktiv, ob der Header sichtbar ist (Login/Vollbild).
 */
@Component({
  selector: 'app-main-frontend',
  standalone: true,
  imports: [RouterOutlet, SceneContainerComponent, Header],
  templateUrl: './main-frontend.html',
  styleUrls: ['./main-frontend.scss'],
})
export class MainFrontendComponent {
  loginService = inject(LoginService);
  sceneService = inject(SceneService);
  screenSizingService = inject(ScreenSizingService);

  /**
   * Header nur zeigen, wenn eingeloggt und nicht auf /login oder /profile.
   * Bleibt (auch im Vollbild) permanent sichtbar.
   */
  public showHeader = computed(() => {
    const charId = this.loginService.loggedInAs();
    const currentScene = this.sceneService.currentScene();
    return charId !== null && currentScene !== '/login' && currentScene !== '/profile';
  });
}
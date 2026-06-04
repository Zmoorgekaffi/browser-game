import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SceneContainerComponent } from '../shared/scene-container/scene-container';
import { Header } from '../shared/header/header';
import { LoginService } from '../../services/login.service';
import { SceneService } from '../../services/scene.service';
import { ScreenSizingService } from '../../services/screen-sizing.service';

@Component({
  selector: 'app-main-frontend',
  standalone: true,
  imports: [RouterOutlet, SceneContainerComponent, Header],
  templateUrl: './main-frontend.html',
  styleUrls: ['./main-frontend.scss']
})
export class MainFrontendComponent {
  // Services sind bereit
  loginService = inject(LoginService);
  sceneService = inject(SceneService);
  screenSizingService = inject(ScreenSizingService);

  public showHeader = computed(() => {
    const charId = this.loginService.loggedInAs();
    const currentScene = this.sceneService.currentScene();
    return charId !== null && currentScene !== '/login';
  });
}
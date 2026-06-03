import { Component, computed, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SceneContainerComponent } from '../shared/scene-container/scene-container';
import { Header } from '../shared/header/header';
import { LoginService } from '../../services/login.service';
import { SceneService } from '../../services/scene.service';


@Component({
  selector: 'app-main-frontend',
  standalone: true,
  imports: [RouterOutlet, SceneContainerComponent, Header],
  templateUrl: './main-frontend.html',
  styleUrls: ['./main-frontend.scss']
})
export class MainFrontendComponent {

  //services
  loginService = inject(LoginService);
  sceneService = inject(SceneService);

    // Kombiniertes Signal für das Template
  public showHeader = computed(() => {
    const charId = this.loginService.loggedInAs();
    
    const currentScene = this.sceneService.currentScene();
    
    // Button anzeigen, wenn eingeloggt und nicht im login
    console.log(charId);
    
    return charId !== null && currentScene !== '/login';
  });
}


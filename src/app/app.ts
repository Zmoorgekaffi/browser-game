import { Component, signal } from '@angular/core';
import { MainFrontendComponent } from './components/main-frontend/main-frontend';

/**
 * @component App
 * @description Root-Komponente — rendert nur das MainFrontend-Layout.
 * Das <router-outlet> selbst sitzt im MainFrontendComponent.
 */
@Component({
  selector: 'app-root',
  imports: [MainFrontendComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected readonly title = signal('browser-game');
}


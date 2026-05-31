import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MainFrontendComponent } from './components/main-frontend/main-frontend';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MainFrontendComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected readonly title = signal('browser-game');
}


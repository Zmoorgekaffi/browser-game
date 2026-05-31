import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SceneContainerComponent } from '../shared/scene-container/scene-container';
import { Header } from '../shared/header/header';


@Component({
  selector: 'app-main-frontend',
  standalone: true,
  imports: [RouterOutlet, SceneContainerComponent, Header],
  templateUrl: './main-frontend.html',
  styleUrls: ['./main-frontend.scss']
})
export class MainFrontendComponent {
}


import { Component, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-adventure',
  imports: [],
  templateUrl: './adventure.html',
  styleUrl: './adventure.scss',
})
export class Adventure {
  public gameStateService = inject(GameStateService);
}

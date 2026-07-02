import { Component, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';

/**
 * @component Adventure
 * @description Auswahl-Bildschirm für Abenteuer-Gebiete. Startet über
 * den AdventureStateService einen neuen Run.
 */
@Component({
  selector: 'app-adventure',
  imports: [],
  templateUrl: './adventure.html',
  styleUrl: './adventure.scss',
})
export class Adventure {
  public gameStateService = inject(GameStateService);
}

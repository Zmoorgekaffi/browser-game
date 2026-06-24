import { Component, Signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { InventarItem } from './inventar-item/inventar-item';
import { CommonModule } from '@angular/common';
import { ArmorSlot } from './armor-slot/armor-slot';

@Component({
  selector: 'app-inventar',
  standalone: true,
  imports: [InventarItem, CommonModule, ArmorSlot],
  templateUrl: './inventar.html',
  styleUrl: './inventar.scss',
})
export class Inventar {
  inventar: Signal<any>;

  constructor(public gameStateService: GameStateService) {
    this.inventar = this.gameStateService.inventar.inventar;
  }

  /**
   * Schließt das Inventar und nutzt den zentralen SceneService, 
   * um zur letzten Spiel-Szene zurückzukehren.
   */
  closeInventar(): void {
    this.gameStateService.sceneService.goBack();
  }
}
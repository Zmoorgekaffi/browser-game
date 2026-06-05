import { Component, Signal, effect } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { InventarItem } from './inventar-item/inventar-item';
import { CommonModule } from '@angular/common';
import { ItemSlot } from './item-slot/item-slot';

@Component({
  selector: 'app-inventar',
  standalone: true,
  imports: [InventarItem, CommonModule, ItemSlot],
  templateUrl: './inventar.html',
  styleUrl: './inventar.scss',
})
export class Inventar {
  inventar: Signal<any>;

  constructor(public gameStateService: GameStateService) {
    this.inventar = this.gameStateService.inventar.inventar;

    effect(() => {
      console.log('Aktueller Inhalt des Inventar-Signals:', this.inventar());
      if (this.inventar()?.items?.length > 0) {
        console.log('Erstes gefundenes Item:', this.inventar().items[0]);
      }
    });
  }

  /**
   * Schließt das Inventar und leitet den Spieler zurück zur alten Szene
   */
  closeInventar(): void {
    this.gameStateService.inventar.goBack();
  }
}
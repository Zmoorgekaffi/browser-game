import { Component, Signal, effect } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { InventarItem } from './inventar-item/inventar-item';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inventar',
  standalone: true,
  imports: [InventarItem, CommonModule],
  templateUrl: './inventar.html',
  styleUrl: './inventar.scss',
})
export class Inventar {
  // Verweis auf das Signal aus dem Service
  inventar: Signal<any>;

  constructor(public gameStateService: GameStateService) {
    this.inventar = this.gameStateService.inventar.inventar;

    // Reaktiver Effekt: Sobald Daten im Signal landen, loggt er sie fehlerfrei
    effect(() => {
      console.log('Aktueller Inhalt des Inventar-Signals:', this.inventar());
      if (this.inventar()?.items?.length > 0) {
        console.log('Erstes gefundenes Item:', this.inventar().items[0]);
      }
    });
  }
}
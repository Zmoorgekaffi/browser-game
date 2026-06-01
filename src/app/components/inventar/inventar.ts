import { Component, Input, Signal } from '@angular/core'; // Signal statt WritableSignal
import { GameStateService } from '../../services/game-state.service';
import { InventarItem } from './inventar-item/inventar-item';

@Component({
  selector: 'app-inventar',
  standalone: true,
  imports: [InventarItem],
  templateUrl: './inventar.html',
  styleUrl: './inventar.scss',
})
export class Inventar {
  // 1. Hier ändern zu Signal, da die Items aus dem Service schreibgeschützt (computed) sind
  inventar: Signal<any[]>;

  constructor(public gameStateService: GameStateService) {
    // 2. Jetzt passt der Typ perfekt zusammen!
    this.inventar = this.gameStateService.inventar.inventar;

    console.log(this.inventar());
    
  }
}
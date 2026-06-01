import { Component, Signal } from '@angular/core'; // Signal Typ großgeschrieben
import { GameStateService } from '../../../services/game-state.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true, // Falls du Angular 19+ nutzt, ist das oft Standard, schadet aber nicht
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  // 1. Deklaration der Typen
  gold: Signal<number>;
  rubies: Signal<number>;
  currentCharId: Signal<string | null>;
  name: Signal<string>;
  exp: Signal<number>;
  lvl: Signal<number>;

  constructor(
    public gameStateService: GameStateService) {
    // 2. SOFORT die Referenz auf das Signal übergeben (nicht erst nach 1 Sekunde!)
    this.currentCharId = this.gameStateService.currentCharId;
    this.gold = this.gameStateService.wallet.gold;
    this.rubies = this.gameStateService.wallet.rubies;
    this.name = this.gameStateService.profile.name;
    this.exp = this.gameStateService.profile.exp;
    this.lvl = this.gameStateService.profile.level;
    // Wenn du hier loggst, siehst du den INITIALEN Wert des Signals (z.B. 0 oder null)
    console.log('Initiales Gold im TS:', this.gold());
  }
}

// Wenn du unbedingt sehen willst, wann sich der Wert ändert, nutzt man ein "effect"
// (Optional, nur zum Debuggen):

import { Component, Signal, inject, computed, signal } from '@angular/core'; // Signal Typ großgeschrieben
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
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
  private router = inject(Router);

  // 1. Deklaration der Typen
  gold: Signal<number>;
  rubies: Signal<number>;
  currentCharId: Signal<string | null>;
  name: Signal<string>;
  exp: Signal<number>;
  lvl: Signal<number>;
  currentUrl = signal<string>(this.router.url);
  isInAdventureAction = computed(() => {
    const url = this.currentUrl();
    return (
      url.startsWith('/adventure/fight') ||
      url.startsWith('/adventure/quiz') ||
      url.startsWith('/adventure/dialog') ||
      url.startsWith('/adventure/loot')
    );
  });

  constructor(public gameStateService: GameStateService) {
    // 2. SOFORT die Referenz auf das Signal übergeben (nicht erst nach 1 Sekunde!)
    this.currentCharId = this.gameStateService.currentCharId;
    this.gold = this.gameStateService.wallet.gold;
    this.rubies = this.gameStateService.wallet.rubies;
    this.name = this.gameStateService.profile.name;
    this.exp = this.gameStateService.profile.exp;
    this.lvl = this.gameStateService.profile.level;

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.currentUrl.set(this.router.url);
    });
    // Wenn du hier loggst, siehst du den INITIALEN Wert des Signals (z.B. 0 oder null)
    console.log('Initiales Gold im TS: HEADER WIRD AUSGEFèHRT', this.gold());
  }
}

// Wenn du unbedingt sehen willst, wann sich der Wert ändert, nutzt man ein "effect"
// (Optional, nur zum Debuggen):

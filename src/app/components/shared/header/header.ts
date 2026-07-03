import { Component, Signal, inject, computed, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { GameStateService } from '../../../services/game-state.service';
import { ScreenSizingService } from '../../../services/screen-sizing.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * @component Header
 * @description Kopfleiste mit Charakter-Infos (Name, Level, EXP),
 * Währungen und Menü-Links. Blendet die Navigation in
 * Adventure-Action-Szenen aus (isInAdventureAction).
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private router = inject(Router);
  public screenSizingService = inject(ScreenSizingService);

  gold: Signal<number>;
  rubies: Signal<number>;
  currentCharId: Signal<string | null>;
  name: Signal<string>;
  exp: Signal<number>;
  lvl: Signal<number>;
  expRequiredForNextLevel: Signal<number>;
  expProgress: Signal<number>;
  isMaxLevel: Signal<boolean>;
  currentUrl = signal<string>(this.router.url);
  isInAdventureAction = computed(() => {
    const url = this.currentUrl();
    return (
      url.startsWith('/adventure/fight') ||
      url.startsWith('/adventure/dialog') ||
      url.startsWith('/adventure/loot')
    );
  });

  constructor(public gameStateService: GameStateService) {
    this.currentCharId = this.gameStateService.currentCharId;
    this.gold = this.gameStateService.wallet.gold;
    this.rubies = this.gameStateService.wallet.rubies;
    this.name = this.gameStateService.profile.name;
    this.exp = this.gameStateService.profile.exp;
    this.lvl = this.gameStateService.profile.level;
    this.expRequiredForNextLevel = this.gameStateService.profile.expRequiredForNextLevel;
    this.expProgress = this.gameStateService.profile.expProgress;
    this.isMaxLevel = this.gameStateService.profile.isMaxLevel;

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.currentUrl.set(this.router.url);
    });
  }
}
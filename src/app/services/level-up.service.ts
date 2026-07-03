import { Injectable, signal } from '@angular/core';

/**
 * @service LevelUpService
 * @description Hält nur den Sichtbarkeits-Zustand des Shrine-Levelup-Panels.
 * Die eigentliche Punkte-/Passive-Logik lebt in SkillsService, analog dazu
 * wie ItemInfoCard nur den `itemInfoCardShow`-Zustand aus ShopService liest.
 */
@Injectable({
  providedIn: 'root',
})
export class LevelUpService {
  public show = signal<boolean>(false);

  public open(): void {
    this.show.set(true);
  }

  public close(): void {
    this.show.set(false);
  }
}

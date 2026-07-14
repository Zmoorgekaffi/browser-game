import { Component, inject, signal, effect } from '@angular/core';
import { BracketNotificationService } from '../../../services/bracket-notification.service';

/** Toast bleibt sichtbar, danach 400ms Fade-out (siehe CSS-Transition im Template), dann Signal leeren. */
const VISIBLE_DURATION_MS = 4600;
const FADE_DURATION_MS = 400;

/**
 * @component BracketChangeToast
 * @description Nicht-blockierender Hinweis oben im Dorf, wenn der Charakter
 * seit dem letzten Besuch in ein neues Monster-Bracket aufgestiegen ist
 * (siehe BracketNotificationService). Blendet sich nach ein paar Sekunden
 * automatisch wieder aus.
 */
@Component({
  selector: 'app-bracket-change-toast',
  templateUrl: './bracket-change-toast.html',
})
export class BracketChangeToast {
  private bracketNotificationService = inject(BracketNotificationService);

  newBracket = this.bracketNotificationService.newBracket;
  /** Steuert nur die CSS-Fade-Transition kurz vor dem eigentlichen Ausblenden. */
  fading = signal(false);

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    effect(() => {
      if (!this.newBracket()) return;

      this.fading.set(false);
      this.clearTimers();
      this.timers.push(
        setTimeout(() => this.fading.set(true), VISIBLE_DURATION_MS - FADE_DURATION_MS),
        setTimeout(() => this.bracketNotificationService.dismiss(), VISIBLE_DURATION_MS),
      );
    });
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}

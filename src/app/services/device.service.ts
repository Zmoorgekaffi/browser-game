import { Injectable, signal } from '@angular/core';

/**
 * @service DeviceService
 * @description Erkennt, ob die primäre Eingabe grob/berührungsbasiert ist
 * (Handy/Tablet) statt präzise (Maus). Wird genutzt, um Hover-Tooltips auf
 * Touch-Geräten durch Klick/Tap-Interaktionen zu ersetzen.
 */
@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private readonly mediaQuery = matchMedia('(pointer: coarse)');

  public isTouch = signal<boolean>(this.mediaQuery.matches);

  constructor() {
    this.mediaQuery.addEventListener('change', (e) => this.isTouch.set(e.matches));
  }
}

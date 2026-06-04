import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ScreenSizingService {
  public isFullscreen = signal<boolean>(false);

  constructor() {
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen.set(!!document.fullscreenElement);
    });
  }

  /**
   * Schaltet den Vollbildmodus für ein bestimmtes Element um.
   * Wird kein Element übergeben, nutzt der Service standardmäßig die ganze Seite.
   * * @param element Optional: Das HTML-Element (z.B. eine Div), das Vollbild werden soll
   */
  public toggleFullscreen(element?: HTMLElement): void {
    if (!document.fullscreenElement) {
      // Wenn KEIN Element übergeben wurde, nimm das gesamte Dokument
      const targetElement = element || document.documentElement;

      targetElement.requestFullscreen().catch((err) => {
        console.error(`Fehler beim Aktivieren des Vollbildmodus: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
}
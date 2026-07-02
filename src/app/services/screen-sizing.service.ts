import { Injectable, signal } from '@angular/core';

/**
 * @service ScreenSizingService
 * @description Verwaltet Vollbild-Modus und Skalierung der festen
 * 1280×720-Spielfläche auf die aktuelle Fenster-/Bildschirmgröße.
 */
@Injectable({
  providedIn: 'root',
})
export class ScreenSizingService {
  private readonly BASE_WIDTH = 1280;
  private readonly BASE_HEIGHT = 720;

  public isFullscreen = signal<boolean>(false);
  public scale = signal<number>(1);
  public headerVisibleInFullscreen = signal<boolean>(false);

  // True wenn das Browser-Fenster schmaler als die native Spielbreite ist
  public isScreenTooSmall = signal<boolean>(window.innerWidth < this.BASE_WIDTH);

  constructor() {
    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      this.isFullscreen.set(isFs);

      if (isFs) {
        this.headerVisibleInFullscreen.set(false);
      }

      requestAnimationFrame(() => this.recalculateScale());
    });

    window.addEventListener('resize', () => {
      this.recalculateScale();
      this.isScreenTooSmall.set(window.innerWidth < this.BASE_WIDTH);
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.recalculateScale();
        this.isScreenTooSmall.set(window.innerWidth < this.BASE_WIDTH);
      }, 150);
    });
  }

  /**
   * Schaltet den Vollbild-Modus um.
   *
   * @param element Ziel-Element (Default: gesamtes Dokument).
   */
  public toggleFullscreen(element?: HTMLElement): void {
    if (!document.fullscreenElement) {
      const target = element || document.documentElement;
      target.requestFullscreen().catch((err) => {
        console.error(`Fehler beim Aktivieren des Vollbildmodus: ${err.message}`);
      });
    } else {
      document.exitFullscreen?.();
    }
  }

  /** Blendet den Header im Vollbild-Modus ein/aus. */
  public toggleHeader(): void {
    this.headerVisibleInFullscreen.update((v) => !v);
  }

  /** Berechnet den Skalierungsfaktor (nur im Vollbild ≠ 1). */
  private recalculateScale(): void {
    if (!document.fullscreenElement) {
      this.scale.set(1);
      return;
    }

    const scaleX = window.innerWidth / this.BASE_WIDTH;
    const scaleY = window.innerHeight / this.BASE_HEIGHT;

    this.scale.set(Math.min(scaleX, scaleY));
  }
}
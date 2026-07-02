import { Injectable, signal, computed } from '@angular/core';

/**
 * @service AssetPreloaderService
 * @description Lädt Bild-Assets (z.B. Animations-Frames) VOR, bevor eine
 * Szene sie anzeigt. Auf localhost fällt das Nachladen nicht auf, aber auf
 * einem echten Webserver wird jeder Frame erst beim Anzeigen gefetcht —
 * die Animationen ruckeln dann beim ersten Durchlauf.
 *
 * Lösung: Die Szene sammelt alle Bild-Pfade, ruft preloadImages() auf und
 * zeigt solange einen Ladebildschirm (siehe LoadingScreen-Komponente, die
 * ihren Fortschritt direkt aus den Signalen dieses Services liest).
 *
 * Bereits geladene URLs werden in einem Set gemerkt und übersprungen —
 * ein erneuter Szenen-Besuch lädt also nichts doppelt. Zusätzlich halten
 * wir die HTMLImageElement-Referenzen in einer Map fest, damit die
 * dekodierten Bilder nicht vom Garbage Collector / Memory-Cache
 * verworfen werden können.
 */
@Injectable({
  providedIn: 'root',
})
export class AssetPreloaderService {
  /** URLs, die bereits (versucht) geladen wurden — werden nie erneut gefetcht. */
  private loadedUrls = new Set<string>();

  /** Harte Referenzen auf die vorgeladenen Bilder (hält sie im Speicher). */
  private imageCache = new Map<string, HTMLImageElement>();

  /** Anzahl der Bilder, die der AKTUELLE preloadImages()-Aufruf laden muss. */
  public totalCount = signal<number>(0);

  /** Davon bereits fertig geladene Bilder. */
  public loadedCount = signal<number>(0);

  /** Fortschritt in Prozent (0–100) für die Anzeige im Ladebildschirm. */
  public progress = computed(() => {
    const total = this.totalCount();
    if (total === 0) return 100;
    return Math.round((this.loadedCount() / total) * 100);
  });

  /**
   * Lädt alle übergebenen Bild-Pfade vor und resolved erst, wenn ALLE
   * fertig sind (auch fehlgeschlagene zählen als fertig, damit ein
   * kaputter Pfad den Ladebildschirm nicht ewig blockiert).
   *
   * @param paths Bild-Pfade; Duplikate, leere Einträge und bereits
   *              geladene URLs werden automatisch herausgefiltert.
   */
  public preloadImages(paths: (string | null | undefined)[]): Promise<void> {
    const toLoad = [...new Set(paths)].filter(
      (p): p is string => !!p && !this.loadedUrls.has(p)
    );

    if (toLoad.length === 0) {
      this.totalCount.set(0);
      this.loadedCount.set(0);
      return Promise.resolve();
    }

    this.totalCount.set(toLoad.length);
    this.loadedCount.set(0);

    console.log(`🖼️ Preloader: lade ${toLoad.length} Bilder vor...`);

    return new Promise<void>((resolve) => {
      let finished = 0;

      const onFinished = (url: string, ok: boolean) => {
        if (!ok) {
          console.warn(`🖼️ Preloader: konnte Bild nicht laden: ${url}`);
        }
        this.loadedUrls.add(url);
        finished++;
        this.loadedCount.set(finished);

        if (finished === toLoad.length) {
          console.log('🖼️ Preloader: alle Bilder geladen ✅');
          resolve();
        }
      };

      for (const url of toLoad) {
        const img = new Image();
        img.onload = () => onFinished(url, true);
        img.onerror = () => onFinished(url, false);
        img.src = url;
        this.imageCache.set(url, img);
      }
    });
  }
}

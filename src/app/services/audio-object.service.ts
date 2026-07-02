import { Injectable, inject, effect, signal } from '@angular/core';
import { SceneService } from './scene.service';

/** Audio-Konfiguration einer Route: Musik + optionales Ambient-Geräusch. */
interface RouteAudioConfig {
  music: string;
  musicVol?: number;
  ambient?: string;
  ambientVol?: number;
}

/**
 * @service AudioService
 * @description Steuert Hintergrundmusik (BGM), Umgebungsgeräusche (Ambient)
 * und Soundeffekte (SFX) abhängig von der aktuellen Route.
 *
 * Besonderheiten:
 *  - Im Inventar läuft die Musik der vorherigen Szene einfach weiter.
 *  - Autoplay-Unlock: Browser blockieren Audio bis zur ersten User-Geste,
 *    deshalb lauschen wir auf pointerdown/click/touchstart, bis die Musik
 *    tatsächlich läuft.
 */
@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private sceneService = inject(SceneService);

  private bgmAudio: HTMLAudioElement | null = null;
  private ambientAudio: HTMLAudioElement | null = null;
  private sfxAudio: HTMLAudioElement | null = null;

  /** Standard-Lautstärken, falls die Route keine eigenen Werte definiert. */
  public musicVolume = signal<number>(0.5);
  public ambientVolume = signal<number>(0.25);
  public sfxVolume = signal<number>(0.7);

  public isMuted = signal<boolean>(false);

  /** Route → Audio-Konfiguration. Routen ohne Eintrag stoppen die Musik. */
  private musicRoutes: Record<string, RouteAudioConfig> = {
    '/login': {
      music: 'audio/login/login_0.mp3',
      musicVol: 0.3,
    },
    '/village': {
      music: 'audio/village/village-music_0.mp3',
      musicVol: 0.18,
      ambient: 'audio/village/village-background_0.mp3',
      ambientVol: 0.5,
    },
    '/magic-shop': {
      music: 'audio/village/village-music_0.mp3',
      musicVol: 0.12,
    },
    '/smither': {
      music: 'audio/village/village-music_0.mp3',
      musicVol: 0.12,
    },
    '/general-supplies': {
      music: 'audio/village/village-music_0.mp3',
      musicVol: 0.12,
    },
    '/character': {
      music: 'audio/village/village-music_0.mp3',
      musicVol: 0.12,
    },
    '/skills': {
      music: 'audio/village/village-music_0.mp3',
      musicVol: 0.12,
    },
    '/adventure/fight': {
      music: 'audio/fight/dark-forest/fight-track-1.mp3',
      ambientVol: 0.5,
    },
  };

  constructor() {
    // Bei jedem Szenenwechsel die passende Audio-Konfiguration abspielen.
    effect(() => {
      const currentScene = this.sceneService.currentScene();
      if (currentScene) {
        this.playAudioForRoute(currentScene);
      }
    });

    // Lautstärke reaktiv nachziehen (Mute, Szenenwechsel, Slider).
    this.registerVolumeEffect(
      () => this.bgmAudio,
      'musicVol',
      () => this.musicVolume(),
    );
    this.registerVolumeEffect(
      () => this.ambientAudio,
      'ambientVol',
      () => this.ambientVolume(),
    );

    // Robuster Autoplay-Unlock: bleibt aktiv bis Audio TATSÄCHLICH läuft.
    // Reagiert auf pointerdown, click und touchstart — egal welches Event zuerst kommt.
    // Wichtig: Listener entfernt sich erst, wenn bgmAudio existiert UND nicht paused ist.
    // Sonst kann es passieren dass der erste Klick (z.B. auf Vollbild-Button) den
    // User Gesture "verbraucht" ohne Audio zu starten — und nie wieder eine Chance kommt.
    const unlockAutoplay = () => {
      const currentScene = this.sceneService.currentScene();
      if (currentScene) {
        this.playAudioForRoute(currentScene);
      }

      // Nur entfernen wenn Audio wirklich läuft
      if (this.bgmAudio && !this.bgmAudio.paused) {
        window.removeEventListener('pointerdown', unlockAutoplay);
        window.removeEventListener('click', unlockAutoplay);
        window.removeEventListener('touchstart', unlockAutoplay);
      }
    };

    window.addEventListener('pointerdown', unlockAutoplay);
    window.addEventListener('click', unlockAutoplay);
    window.addEventListener('touchstart', unlockAutoplay);
  }

  /** Schaltet zwischen stumm und laut um. */
  public toggleMute() {
    this.isMuted.update((muted) => !muted);
  }

  /** Setzt den Mute-Zustand explizit. */
  public setMute(mute: boolean) {
    this.isMuted.set(mute);
  }

  /**
   * Registriert einen effect(), der die Lautstärke eines Audio-Kanals
   * reaktiv an Mute-Status und Routen-Konfiguration koppelt.
   *
   * KORREKTUR-Detail: Im Inventar wird die Lautstärke-Konfiguration der
   * noch laufenden Route beibehalten (siehe getPlayingRoute()).
   *
   * @param getAudio   Getter für das Audio-Element des Kanals.
   * @param volKey     Config-Key der Routen-Lautstärke ('musicVol' | 'ambientVol').
   * @param defaultVol Getter für die Fallback-Lautstärke des Kanals.
   */
  private registerVolumeEffect(
    getAudio: () => HTMLAudioElement | null,
    volKey: 'musicVol' | 'ambientVol',
    defaultVol: () => number,
  ): void {
    effect(() => {
      const audio = getAudio();
      if (!audio) return;

      if (this.isMuted()) {
        audio.volume = 0;
        return;
      }

      const currentScene = this.sceneService.currentScene();
      const activeScene =
        currentScene === '/inventar' ? this.getPlayingRoute() : currentScene || '';
      const routeConfig = this.musicRoutes[activeScene];
      audio.volume = routeConfig?.[volKey] !== undefined ? routeConfig[volKey]! : defaultVol();
    });
  }

  /**
   * Berechnet die effektive Lautstärke:
   * gemutet → 0, Routen-Wert falls vorhanden, sonst Kanal-Standard.
   */
  private resolveVolume(configVol: number | undefined, fallback: number): number {
    if (this.isMuted()) return 0;
    return configVol !== undefined ? configVol : fallback;
  }

  /**
   * Spielt die Audio-Konfiguration der angegebenen Route ab.
   * BGM- und Ambient-Kanal laufen über dieselbe updateChannel()-Logik.
   */
  private playAudioForRoute(route: string) {
    // DER TRICK: Wenn der Spieler ins Inventar wechselt, brechen wir hier ab.
    // Die aktuelle Musik bleibt einfach unberührt und läuft weiter!
    if (route === '/inventar' && !this.musicRoutes['/inventar']) {
      return;
    }

    const audioConfig = this.musicRoutes[route];

    if (!audioConfig) {
      this.stopMusic();
      return;
    }

    this.bgmAudio = this.updateChannel(
      this.bgmAudio,
      audioConfig.music,
      this.resolveVolume(audioConfig.musicVol, this.musicVolume()),
      'BGM',
    );

    this.ambientAudio = this.updateChannel(
      this.ambientAudio,
      audioConfig.ambient,
      this.resolveVolume(audioConfig.ambientVol, this.ambientVolume()),
      'Ambient',
    );
  }

  /**
   * Aktualisiert einen Audio-Kanal (BGM oder Ambient):
   *  - kein src           → Kanal stoppen (null)
   *  - gleiche Datei      → nur Lautstärke setzen, ggf. Play-Retry
   *  - andere/neue Datei  → alten Kanal pausieren, neuen Loop starten
   *
   * @param current Aktuelles Audio-Element des Kanals (oder null).
   * @param src     Gewünschte Audio-Datei laut Routen-Config.
   * @param volume  Bereits aufgelöste Ziel-Lautstärke.
   * @param label   Kanal-Name für Fehlermeldungen ('BGM' | 'Ambient').
   * @returns Das (neue) Audio-Element des Kanals oder null.
   */
  private updateChannel(
    current: HTMLAudioElement | null,
    src: string | undefined,
    volume: number,
    label: string,
  ): HTMLAudioElement | null {
    if (!src) {
      if (current) current.pause();
      return null;
    }

    // Gleiche Datei läuft bereits → nur Lautstärke anpassen + ggf. Autoplay-Retry
    if (current && current.src.endsWith(src)) {
      current.volume = volume;
      if (current.paused) {
        current.play().catch((err) => console.warn(`${label} Autoplay-Retry failed:`, err.message));
      }
      return current;
    }

    // Neue Datei → alten Kanal stoppen und frisch starten
    if (current) current.pause();

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume;
    audio.play().catch((err) => console.warn(`${label} Fehler:`, err.message));
    return audio;
  }

  /**
   * Hilfsfunktion: Findet heraus, welche Route mathematisch/namentlich am ehesten
   * zu der aktuell laufenden bgmAudio-Datei passt.
   */
  private getPlayingRoute(): string {
    if (!this.bgmAudio) return '';
    const currentSrc = this.bgmAudio.src;
    const foundRoute = Object.keys(this.musicRoutes).find(
      (key) => this.musicRoutes[key].music && currentSrc.endsWith(this.musicRoutes[key].music),
    );
    return foundRoute || '';
  }

  /**
   * Spielt einen einmaligen Soundeffekt ab (kein Loop).
   *
   * @param soundPath Pfad zur Audio-Datei.
   */
  public playSFX(soundPath: string) {
    if (this.isMuted()) return;

    try {
      this.sfxAudio = new Audio(soundPath);
      this.sfxAudio.volume = this.sfxVolume();
      this.sfxAudio.play().catch((err) => console.error('SFX Fehler:', err.message));
    } catch (e) {
      console.error('Fehler beim Erstellen der SFX-Audiodatei:', e);
    }
  }

  /** Stoppt BGM- und Ambient-Kanal komplett. */
  public stopMusic() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio = null;
    }
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio = null;
    }
  }
}

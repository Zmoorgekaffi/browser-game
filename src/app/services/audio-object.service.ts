import { Injectable, inject, effect, signal } from '@angular/core';
import { SceneService } from './scene.service';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private sceneService = inject(SceneService);

  private bgmAudio: HTMLAudioElement | null = null;
  private ambientAudio: HTMLAudioElement | null = null;
  private sfxAudio: HTMLAudioElement | null = null;

  public musicVolume = signal<number>(0.5);
  public ambientVolume = signal<number>(0.25);
  public sfxVolume = signal<number>(0.7);

  public isMuted = signal<boolean>(false);

  private musicRoutes: Record <
    string,
    { music: string; musicVol?: number; ambient?: string; ambientVol?: number }
  > = {
    '/login': {
      music: '/audio/login/login_0.mp3',
      musicVol: 0.3,
    },
    '/village': {
      music: '/audio/village/village-music_0.mp3',
      musicVol: 0.18,
      ambient: '/audio/village/village-background_0.mp3',
      ambientVol: 0.5,
    },
    '/magic-shop': {
      music: '/audio/village/village-music_0.mp3',
      musicVol: 0.12,
    },
    '/smither': {
      music: '/audio/village/village-music_0.mp3',
      musicVol: 0.12,
    },
    '/general-supplies': {
      music: '/audio/village/village-music_0.mp3',
      musicVol: 0.12,
    },
    '/character': {
      music: '/audio/village/village-music_0.mp3',
      musicVol: 0.12,
    },
    '/skills': {
      music: '/audio/village/village-music_0.mp3',
      musicVol: 0.12,
    },
    // HINWEIS: Falls das Inventar irgendwann eigene Musik bekommen soll,
    // kannst du es hier eintragen. Solange es fehlt, läuft die alte Musik weiter!
  };

  constructor() {
    effect(() => {
      const currentScene = this.sceneService.currentScene();
      if (currentScene) {
        this.playAudioForRoute(currentScene);
      }
    });

    effect(() => {
      if (this.bgmAudio) {
        if (this.isMuted()) {
          this.bgmAudio.volume = 0;
        } else {
          const currentScene = this.sceneService.currentScene();
          // KORREKTUR: Wenn wir im Inventar sind, behalten wir die Lautstärke-Konfiguration bei
          const activeScene =
            currentScene === '/inventar' ? this.getPlayingRoute() : currentScene || '';
          const routeConfig = this.musicRoutes[activeScene];
          this.bgmAudio.volume =
            routeConfig?.musicVol !== undefined ? routeConfig.musicVol : this.musicVolume();
        }
      }
    });

    effect(() => {
      if (this.ambientAudio) {
        if (this.isMuted()) {
          this.ambientAudio.volume = 0;
        } else {
          const currentScene = this.sceneService.currentScene();
          // KORREKTUR: Auch für Ambient den Lautstärken-Bezug im Inventar halten
          const activeScene =
            currentScene === '/inventar' ? this.getPlayingRoute() : currentScene || '';
          const routeConfig = this.musicRoutes[activeScene];
          this.ambientAudio.volume =
            routeConfig?.ambientVol !== undefined ? routeConfig.ambientVol : this.ambientVolume();
        }
      }
    });

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

  public toggleMute() {
    this.isMuted.update((muted) => !muted);
  }

  public setMute(mute: boolean) {
    this.isMuted.set(mute);
  }

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

    // --- 1. KANAL: HINTERGRUNDMUSIK (BGM) ---
    if (audioConfig.music) {
      if (this.bgmAudio && this.bgmAudio.src.endsWith(audioConfig.music)) {
        this.bgmAudio.volume = this.isMuted()
          ? 0
          : audioConfig.musicVol !== undefined
            ? audioConfig.musicVol
            : this.musicVolume();

        if (this.bgmAudio.paused) {
          this.bgmAudio
            .play()
            .catch((err) => console.warn('BGM Autoplay-Retry failed:', err.message));
        }
      } else {
        if (this.bgmAudio) this.bgmAudio.pause();

        this.bgmAudio = new Audio(audioConfig.music);
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = this.isMuted()
          ? 0
          : audioConfig.musicVol !== undefined
            ? audioConfig.musicVol
            : this.musicVolume();
        this.bgmAudio.play().catch((err) => console.warn('BGM Fehler:', err.message));
      }
    } else {
      if (this.bgmAudio) {
        this.bgmAudio.pause();
        this.bgmAudio = null;
      }
    }

    // --- 2. KANAL: UMGEBUNGSGERÄUSCHE (AMBIENT) ---
    if (audioConfig.ambient) {
      if (this.ambientAudio && this.ambientAudio.src.endsWith(audioConfig.ambient)) {
        this.ambientAudio.volume = this.isMuted()
          ? 0
          : audioConfig.ambientVol !== undefined
            ? audioConfig.ambientVol
            : this.ambientVolume();

        if (this.ambientAudio.paused) {
          this.ambientAudio
            .play()
            .catch((err) => console.warn('Ambient Autoplay-Retry failed:', err.message));
        }
      } else {
        if (this.ambientAudio) this.ambientAudio.pause();

        this.ambientAudio = new Audio(audioConfig.ambient);
        this.ambientAudio.loop = true;
        this.ambientAudio.volume = this.isMuted()
          ? 0
          : audioConfig.ambientVol !== undefined
            ? audioConfig.ambientVol
            : this.ambientVolume();
        this.ambientAudio.play().catch((err) => console.warn('Ambient Fehler:', err.message));
      }
    } else {
      if (this.ambientAudio) {
        this.ambientAudio.pause();
        this.ambientAudio = null;
      }
    }
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
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

  // NEU: Ein globales Signal, um den Mute-Status zu tracken
  public isMuted = signal<boolean>(false);

  private musicRoutes: Record<string, { music: string; musicVol?: number; ambient?: string; ambientVol?: number }> = {
    '/login': { 
      music: '/audio/login/login_0.mp3',
      musicVol: 0.3 
    },
    '/village': { 
      music: '/audio/village/village-music_0.mp3', 
      musicVol: 0.18,     
      ambient: '/audio/village/village-background_0.mp3', 
      ambientVol: 0.5 
    },
    '/magic-shop': { 
      music: '/audio/village/village-music_0.mp3', 
      musicVol: 0.12,                               
      ambient: '/audio/music/magic_shop_ambient.mp3', 
      ambientVol: 0.4
    },
    '/smither': { 
      music: '/audio/village/village-music_0.mp3', 
      musicVol: 0.12,                               
      ambient: '/audio/music/blacksmith_ambient.mp3', 
      ambientVol: 0.3
    },
    '/general-supplies': { 
      music: '/audio/village/village-music_0.mp3', 
      musicVol: 0.12,
      ambient: '/audio/music/merchant_ambient.mp3' 
    },
  };

  constructor() {
    effect(() => {
      const currentScene = this.sceneService.currentScene();
      if (currentScene) {
        this.playAudioForRoute(currentScene);
      }
    });

    // REAKTIV: Passt die Musik-Lautstärke an, wenn sich das Volume, die Scene ODER der Mute-Status ändert!
    effect(() => {
      if (this.bgmAudio) {
        if (this.isMuted()) {
          this.bgmAudio.volume = 0;
        } else {
          const currentScene = this.sceneService.currentScene();
          const routeConfig = this.musicRoutes[currentScene || ''];
          this.bgmAudio.volume = routeConfig?.musicVol !== undefined ? routeConfig.musicVol : this.musicVolume();
        }
      }
    });

    // REAKTIV: Passt Ambient-Lautstärke an bei Änderung von Volume, Scene ODER Mute-Status!
    effect(() => {
      if (this.ambientAudio) {
        if (this.isMuted()) {
          this.ambientAudio.volume = 0;
        } else {
          const currentScene = this.sceneService.currentScene();
          const routeConfig = this.musicRoutes[currentScene || ''];
          this.ambientAudio.volume = routeConfig?.ambientVol !== undefined ? routeConfig.ambientVol : this.ambientVolume();
        }
      }
    });

    const unlockAutoplay = () => {
      const currentScene = this.sceneService.currentScene();
      if (currentScene) {
        this.playAudioForRoute(currentScene);
      }
      window.removeEventListener('click', unlockAutoplay);
    };
    window.addEventListener('click', unlockAutoplay);
  }

  /**
   * NEU: Schaltet den Sound um (An / Aus)
   */
  public toggleMute() {
    this.isMuted.update(muted => !muted);
  }

  /**
   * NEU: Setzt den Mute-Status explizit
   */
  public setMute(mute: boolean) {
    this.isMuted.set(mute);
  }

  private playAudioForRoute(route: string) {
    const audioConfig = this.musicRoutes[route];
    
    if (!audioConfig) {
      this.stopMusic();
      return;
    }

    // --- 1. KANAL: HINTERGRUNDMUSIK (BGM) ---
    if (audioConfig.music) {
      if (this.bgmAudio && this.bgmAudio.src.endsWith(audioConfig.music)) {
        // KORREKTUR: Mute-Status beim Aktualisieren direkt mit einberechnen
        this.bgmAudio.volume = this.isMuted() ? 0 : (audioConfig.musicVol !== undefined ? audioConfig.musicVol : this.musicVolume());
        
        if (this.bgmAudio.paused) {
          this.bgmAudio.play().catch(err => console.warn('BGM Autoplay-Retry fehlgeschlagen:', err.message));
        }
      } else {
        if (this.bgmAudio) this.bgmAudio.pause();
        
        this.bgmAudio = new Audio(audioConfig.music);
        this.bgmAudio.loop = true;
        // KORREKTUR: Mute-Status beim Erstellen direkt mit einberechnen
        this.bgmAudio.volume = this.isMuted() ? 0 : (audioConfig.musicVol !== undefined ? audioConfig.musicVol : this.musicVolume());
        this.bgmAudio.play().catch(err => console.warn('BGM Fehler:', err.message));
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
        // KORREKTUR: Mute-Status beim Aktualisieren direkt mit einberechnen
        this.ambientAudio.volume = this.isMuted() ? 0 : (audioConfig.ambientVol !== undefined ? audioConfig.ambientVol : this.ambientVolume());
        
        if (this.ambientAudio.paused) {
          this.ambientAudio.play().catch(err => console.warn('Ambient Autoplay-Retry fehlgeschlagen:', err.message));
        }
      } else {
        if (this.ambientAudio) this.ambientAudio.pause();
        
        this.ambientAudio = new Audio(audioConfig.ambient);
        this.ambientAudio.loop = true;
        // KORREKTUR: Mute-Status beim Erstellen direkt mit einberechnen
        this.ambientAudio.volume = this.isMuted() ? 0 : (audioConfig.ambientVol !== undefined ? audioConfig.ambientVol : this.ambientVolume());
        this.ambientAudio.play().catch(err => console.warn('Ambient Fehler:', err.message));
      }
    } else {
      if (this.ambientAudio) {
        this.ambientAudio.pause();
        this.ambientAudio = null;
      }
    }
  }

  public playSFX(soundPath: string) {
    // Wenn gemuted ist, überspringen wir das Abspielen von Soundeffekten direkt komplett
    if (this.isMuted()) return;

    try {
      this.sfxAudio = new Audio(soundPath);
      this.sfxAudio.volume = this.sfxVolume();
      this.sfxAudio.play().catch(err => console.error("SFX Fehler:", err.message));
    } catch (e) {
      console.error("Fehler beim Erstellen der SFX-Audiodatei:", e);
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
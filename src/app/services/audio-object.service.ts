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

    effect(() => {
      if (this.bgmAudio) {
        const currentScene = this.sceneService.currentScene();
        const routeConfig = this.musicRoutes[currentScene || ''];
        this.bgmAudio.volume = routeConfig?.musicVol !== undefined ? routeConfig.musicVol : this.musicVolume();
      }
    });

    effect(() => {
      if (this.ambientAudio) {
        const currentScene = this.sceneService.currentScene();
        const routeConfig = this.musicRoutes[currentScene || ''];
        this.ambientAudio.volume = routeConfig?.ambientVol !== undefined ? routeConfig.ambientVol : this.ambientVolume();
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

  private playAudioForRoute(route: string) {
    const audioConfig = this.musicRoutes[route];
    
    if (!audioConfig) {
      this.stopMusic();
      return;
    }

    // --- 1. KANAL: HINTERGRUNDMUSIK (BGM) ---
    if (audioConfig.music) {
      // KORREKTUR: Wenn das Lied bereits geladen ist, prüfen wir zusätzlich, ob es gerade pausiert ist (z.B. durch Autoplay-Block)
      if (this.bgmAudio && this.bgmAudio.src.endsWith(audioConfig.music)) {
        this.bgmAudio.volume = audioConfig.musicVol !== undefined ? audioConfig.musicVol : this.musicVolume();
        
        // Falls es geladen, aber wegen Autoplay pausiert ist -> Jetzt abspielen!
        if (this.bgmAudio.paused) {
          this.bgmAudio.play().catch(err => console.warn('BGM Autoplay-Retry fehlgeschlagen:', err.message));
        }
      } else {
        if (this.bgmAudio) this.bgmAudio.pause();
        
        this.bgmAudio = new Audio(audioConfig.music);
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = audioConfig.musicVol !== undefined ? audioConfig.musicVol : this.musicVolume();
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
      // KORREKTUR: Gleiche Logik für den Ambient-Kanal
      if (this.ambientAudio && this.ambientAudio.src.endsWith(audioConfig.ambient)) {
        this.ambientAudio.volume = audioConfig.ambientVol !== undefined ? route.endsWith(audioConfig.ambient) ? audioConfig.ambientVol : this.ambientVolume() : this.ambientVolume();
        
        if (this.ambientAudio.paused) {
          this.ambientAudio.play().catch(err => console.warn('Ambient Autoplay-Retry fehlgeschlagen:', err.message));
        }
      } else {
        if (this.ambientAudio) this.ambientAudio.pause();
        
        this.ambientAudio = new Audio(audioConfig.ambient);
        this.ambientAudio.loop = true;
        this.ambientAudio.volume = audioConfig.ambientVol !== undefined ? audioConfig.ambientVol : this.ambientVolume();
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
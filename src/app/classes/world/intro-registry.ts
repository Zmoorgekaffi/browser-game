import { framePaths, pad } from '../../utils/frame-paths.util';

/** Konfiguration EINES Intro-Clips: Frames abspielen, danach zu `nextRoute` navigieren. */
export interface IntroSceneConfig {
  frames: string[];
  duration: number;
  nextRoute: string;
  loadingLabel: string;
}

/**
 * Alle Intro-Clips der neuen, festen Welt, per ID (Route `/adventure/scene-intro/:introId`).
 * Intros können zu einem weiteren Intro ODER direkt zu einer WorldScene führen (`nextRoute`).
 *
 * 🧭 Ersetzt den alten, Area-getriebenen IntroScene-Flow (fight/loot/dialog-Steps) für den
 * Hauptspiel-Einstieg. Das alte System (Area/DarkForest, ADVENTURE_STEP_ROUTES) bleibt für
 * einen späteren Infinity-Tower-Modus unangetastet im Code — wird hier nur nicht mehr genutzt.
 */
export const INTRO_REGISTRY: Record<string, IntroSceneConfig> = {
  'village-exit': {
    // Wiederverwendete Düsterwald-Intro-Frames (dieselben, die bisher DarkForest.introPaths lieferte).
    frames: framePaths(120, (i) => `imgs/areas/dark-forest/intro/frame_${pad(i, 4)}.webp`),
    duration: 6000,
    nextRoute: '/adventure/scene-intro/crossroads-arrival',
    loadingLabel: 'Abenteuer wird geladen...',
  },
  'crossroads-arrival': {
    frames: framePaths(51, (i) => `imgs/scenes/pale-forest/crossroads/intro/frame_${pad(i, 4)}.webp`),
    duration: 5000,
    nextRoute: '/adventure/scene/crossroads',
    loadingLabel: 'Du näherst dich einer Kreuzung...',
  },
};

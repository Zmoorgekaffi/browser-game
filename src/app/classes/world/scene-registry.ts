import { Scene } from './scene.class';
import { CrossroadsScene } from './scenes/crossroads.scene';
import { RuinEntranceScene } from './scenes/ruin-entrance.scene';

/**
 * Alle WorldScenes der festen Welt, per ID (Route `/adventure/scene/:sceneId`).
 * Factory statt fertiger Instanz, damit jeder Szenen-Besuch mit frischem
 * State startet (z.B. noch nicht geplünderte Kräuter).
 */
export const SCENE_REGISTRY: Record<string, () => Scene> = {
  crossroads: () => new CrossroadsScene(),
  'ruin-entrance': () => new RuinEntranceScene(),
};

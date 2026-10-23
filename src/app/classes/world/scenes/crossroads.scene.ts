import { Scene, SceneBackground } from '../scene.class';
import { InteractiveObject } from '../interactive-object.class';
import { SceneLinkObject } from '../objects/scene-link-object.class';
import { framePaths, pad } from '../../../utils/frame-paths.util';

const CROSSROADS_BACKGROUND_FRAMES = framePaths(
  26,
  (i) => `imgs/scenes/pale-forest/crossroads/background/frame_${pad(i, 4)}.webp`,
);

/**
 * @class CrossroadsScene
 * @description Erster Knoten der neuen, festen Welt — Wald-Kreuzung. Der
 * Hintergrund läuft EINMAL durch und bleibt auf dem letzten Frame stehen
 * (type: 'once'), kein Loop.
 */
export class CrossroadsScene extends Scene {
  override id = 'crossroads';
  override background: SceneBackground = {
    type: 'once',
    frames: CROSSROADS_BACKGROUND_FRAMES,
    duration: 2000,
  };
  override loadingLabel = 'Kreuzung wird geladen...';

  override interactiveObjects: InteractiveObject[] = [
    // 🎯 x/y/width/height nur grob geschätzt (Torbogen rechts im Bild) — bei
    // Bedarf im Browser gegen den echten Hintergrund nachjustieren.
    Object.assign(
      new SceneLinkObject({ type: 'static', path: 'imgs/scenes/pale-forest/crossroads/objects/ruin-entrance.png' }, 'ruin-entrance'),
      { x: 940, y: 47, width: 336, height: 622, tooltipTitle: 'Ruineneingang', hideImage: true },
    ),
  ];
}

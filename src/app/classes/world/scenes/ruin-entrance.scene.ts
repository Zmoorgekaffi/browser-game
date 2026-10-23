import { Scene, SceneBackground } from '../scene.class';

/**
 * @class RuinEntranceScene
 * @description Ziel-Scene des Ruineneingang-Objekts auf der Kreuzung.
 * 🚧 Noch KEIN eigenes Artwork vorhanden — nutzt vorübergehend den letzten
 * Kreuzung-Frame als Platzhalter-Hintergrund. `background`/`interactiveObjects`
 * ersetzen, sobald echtes Material für diese Scene da ist.
 */
export class RuinEntranceScene extends Scene {
  override id = 'ruin-entrance';
  override background: SceneBackground = {
    type: 'static',
    path: 'imgs/scenes/pale-forest/crossroads/background/frame_0025.webp',
  };
  override loadingLabel = 'Ruineneingang wird geladen...';
}

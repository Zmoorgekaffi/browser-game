import { InteractiveObject } from './interactive-object.class';
import { VisualAsset } from './visual-asset.type';

/**
 * Hintergrund einer Scene — drei gleichwertige Varianten (siehe VisualAsset),
 * WorldScene entscheidet anhand von `type`, was gerendert wird:
 *  - 'static': ein einzelnes, unbewegtes Bild.
 *  - 'loop':   Animation läuft endlos im Kreis (z.B. wehender Nebel).
 *  - 'once':   Animation läuft EINMAL durch und bleibt auf dem letzten
 *              Frame stehen (z.B. Kreuzung: Kamera schwenkt einmal rein).
 */
export type SceneBackground = VisualAsset;

/**
 * @class Scene
 * @description Abstrakte Basis für einen Knoten der neuen, festen Welt
 * (Kreuzung, Lichtung, ...). Rein Daten/Verhalten, KEINE Angular-Komponente
 * — gerendert wird jede Scene über die eine generische WorldScene-Komponente
 * (siehe components/adventure_scenes/world-scene). Analog zum bestehenden
 * `Area`-Klassenmuster (siehe classes/adventure/area.class.ts).
 */
export abstract class Scene {
  abstract id: string;
  abstract background: SceneBackground;
  /** Text im Ladebildschirm, während die Hintergrund-Assets vorgeladen werden. */
  loadingLabel = 'Wird geladen...';

  interactiveObjects: InteractiveObject[] = [];

  /** Überschreibbar für Objekte, die nur unter bestimmten Bedingungen erscheinen (z.B. Quest-Status). */
  getInteractiveObjects(): InteractiveObject[] {
    return this.interactiveObjects;
  }
}

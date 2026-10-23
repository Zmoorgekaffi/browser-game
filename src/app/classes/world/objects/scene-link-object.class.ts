import { InteractiveObject, InteractionResult } from '../interactive-object.class';
import { VisualAsset } from '../visual-asset.type';

/**
 * @class SceneLinkObject
 * @description Einfachstes InteractiveObject: ein rein kosmetisches
 * "Hintergrund-Objekt" ohne eigene Spielmechanik — ein Klick lädt direkt
 * die verknüpfte WorldScene (z.B. ein Ruineneingang, der zur nächsten
 * Scene führt). Für Objekte mit echter Mechanik (Kräuter sammeln, NPC-
 * Dialog, Kampf-Trigger, ...) eigene InteractiveObject-Unterklassen bauen.
 */
export class SceneLinkObject extends InteractiveObject {
  constructor(
    public visual: VisualAsset,
    private targetSceneId: string,
  ) {
    super();
  }

  interact(): InteractionResult {
    return { type: 'navigate', sceneId: this.targetSceneId };
  }
}

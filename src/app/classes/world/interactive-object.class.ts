import { VisualAsset } from './visual-asset.type';

/**
 * Ergebnis von InteractiveObject.interact() — WorldScene wertet den `type`
 * aus und entscheidet, was als Reaktion passiert (Reward einsacken, Kampf
 * starten, Info anzeigen, Szenenwechsel). Neue Typen hier ergänzen, wenn ein
 * neues Objekt eine neue Art Reaktion braucht.
 */
export type InteractionResult =
  | { type: 'info'; text: string }
  | { type: 'reward'; item: any }
  | { type: 'fight'; monsterPool: any[] }
  | { type: 'navigate'; sceneId: string };

/**
 * @class InteractiveObject
 * @description Abstrakte Basis für alles Klickbare in einer WorldScene
 * (Kräuter, NPCs, Wege, Gegner-Trigger, ...). Konkrete Objekte (siehe
 * `objects/*.class.ts`) definieren nur noch ihr Bild/Animation (`visual`) +
 * `interact()` — Position wird beim Instanziieren in der jeweiligen
 * Scene-Klasse gesetzt. Gerendert wird jedes Objekt über die bereits
 * bestehende, gemeinsame `app-redirect-hotspot`-Komponente (siehe WorldScene):
 * Klickfläche mit object-fit:contain, Hover-Glow und einer Namens-Card unten
 * links (tooltipTitle).
 */
export abstract class InteractiveObject {
  x = 0;
  y = 0;
  width = 100;
  height = 100;
  tooltipTitle = '';
  /** true = `visual` bleibt immer unsichtbar, nur die Kontur leuchtet beim Hovern (nur für statisches `visual`). */
  hideImage = false;

  abstract visual: VisualAsset;
  abstract interact(): InteractionResult;
}

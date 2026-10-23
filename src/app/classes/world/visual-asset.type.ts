/**
 * Ein visuelles Asset — entweder ein einzelnes statisches Bild oder eine
 * Sprite-Animation (endlos loopend ODER einmal durchlaufend und dann auf dem
 * letzten Frame stehenbleibend). Gemeinsam genutzt von Scene.background
 * (siehe scene.class.ts) und InteractiveObject.visual (siehe
 * interactive-object.class.ts) — beide brauchen exakt dieselbe Unterscheidung.
 */
export type VisualAsset =
  | { type: 'static'; path: string }
  | { type: 'loop'; frames: string[]; duration: number }
  | { type: 'once'; frames: string[]; duration: number };

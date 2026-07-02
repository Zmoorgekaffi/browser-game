/**
 * Hilfsfunktion zum Erzeugen von Frame-Pfad-Arrays für Sprite-Animationen.
 *
 * Ersetzt lange, handgeschriebene Pfad-Listen wie:
 *   ['imgs/x/frame_0000.webp', 'imgs/x/frame_0001.webp', ...]
 *
 * WICHTIG: Die erzeugten Strings sind byte-identisch zu den vorherigen
 * Literal-Arrays — es ändern sich also keinerlei Bild-Pfade.
 *
 * @param count  Anzahl der Frames, die erzeugt werden sollen.
 * @param toPath Callback, der aus der Frame-Nummer den vollständigen Pfad baut.
 * @param startAt Erste Frame-Nummer (Default: 0).
 * @returns Array mit `count` Pfaden in aufsteigender Frame-Reihenfolge.
 *
 * @example
 * // frame_0000.webp ... frame_0024.webp
 * framePaths(25, (i) => `imgs/areas/dark-forest/intro/frame_${pad(i, 4)}.webp`);
 */
export function framePaths(
  count: number,
  toPath: (frame: number) => string,
  startAt = 0,
): string[] {
  return Array.from({ length: count }, (_, i) => toPath(startAt + i));
}

/**
 * Füllt eine Zahl links mit Nullen auf die gewünschte Stellenzahl auf.
 *
 * @param value  Die Zahl, z.B. 7
 * @param length Gewünschte Stellenzahl, z.B. 4
 * @returns Aufgefüllter String, z.B. '0007'
 */
export function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

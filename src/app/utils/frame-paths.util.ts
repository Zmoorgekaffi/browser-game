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

/**
 * Erzeugt ein Frame-Pfad-Array aus EINEM Beispielpfad (i.d.R. das erste
 * Frame, z.B. '.../frame_0000.webp') und der Gesamtzahl der Frames.
 *
 * Ersetzt die letzte Zahl im Pfad durch die hochgezählte Frame-Nummer (mit
 * derselben Nullen-Auffüllung wie im Ausgangspfad). So müssen Monster- und
 * Encounter-JSONs nicht mehr 30+ Pfade pro Animation ausschreiben, sondern
 * nur noch `path` (erstes Frame) + `frameBatchCount` (Gesamtzahl der Frames).
 *
 * @param path            Pfad des ersten Frames, z.B. 'imgs/x/frame_0000.webp'.
 * @param frameBatchCount Gesamtzahl der Frames in der Animation.
 * @returns Array mit `frameBatchCount` Pfaden in aufsteigender Reihenfolge.
 */
export function expandFrameBatch(path: string, frameBatchCount: number): string[] {
  const match = path.match(/^(.*?)(\d+)(\D*)$/);
  if (!match) return [path];

  const [, prefix, digits, suffix] = match;
  const startAt = parseInt(digits, 10);
  const width = digits.length;

  return framePaths(frameBatchCount, (frame) => `${prefix}${pad(frame, width)}${suffix}`, startAt);
}

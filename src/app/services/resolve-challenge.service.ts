import { Injectable, signal, computed } from '@angular/core';

export interface ResolvePoint {
  id: number;
  x: number;
  y: number;
}

export interface ResolveSegment {
  from: ResolvePoint;
  to: ResolvePoint;
}

/**
 * @service ResolveChallengeService
 * @description Steuert das Resolve-Minigame beim Wirken eines Spieler-Skills:
 * Punkte spawnen zufällig (mit Mindestabstand) im Popup, der Spieler muss sie
 * innerhalb eines Zeitlimits per Drag in aufsteigender Reihenfolge verbinden.
 *
 * Interaktion: Gedrückt halten auf dem zuletzt verbundenen Punkt (zu Beginn:
 * Punkt 1) startet einen Strahl, der dem Zeiger folgt. Erreicht der Zeiger
 * dabei den nächsten erwarteten Punkt, wird die Verbindung fest (grün) und
 * der Strahl läuft vom neuen Punkt weiter. Beim Loslassen verschwindet nur
 * der gerade gezogene Strahl — bereits verbundene Punkte bleiben erhalten;
 * zum Fortsetzen muss der zuletzt verbundene Punkt erneut berührt werden.
 * Ein falscher Punkt beim Ziehen wird schlicht ignoriert. Einzige Fehlerquelle
 * ist das Ablaufen der Zeit, bevor alle Punkte verbunden sind.
 *
 * `start()` liefert die Anzahl korrekt verbundener Punkte, mit der die
 * SpellsEngine den finalen Skill-Wert (Schaden/Heilung) reskaliert.
 */
@Injectable({
  providedIn: 'root',
})
export class ResolveChallengeService {
  public readonly durationMs = 2000;
  private readonly containerWidth = 900;
  private readonly containerHeight = 560;
  private readonly minDistance = 200;
  private readonly padding = 50;
  private readonly hitRadius = 32;

  public active = signal<boolean>(false);
  public points = signal<ResolvePoint[]>([]);
  public connectedIds = signal<number[]>([]);
  public dragging = signal<boolean>(false);
  public cursorPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  /** Fest verbundene Linien-Segmente (grün) zwischen aufeinanderfolgenden Punkten. */
  public connectedSegments = computed<ResolveSegment[]>(() => {
    const ids = this.connectedIds();
    const pts = this.points();
    const segments: ResolveSegment[] = [];

    for (let i = 0; i < ids.length - 1; i++) {
      const from = pts.find((p) => p.id === ids[i]);
      const to = pts.find((p) => p.id === ids[i + 1]);
      if (from && to) segments.push({ from, to });
    }
    return segments;
  });

  /** Der zuletzt verbundene Punkt — Startpunkt des gerade gezogenen Strahls. */
  public anchorPoint = computed<ResolvePoint | null>(() => {
    const ids = this.connectedIds();
    if (ids.length === 0) return null;
    return this.points().find((p) => p.id === ids[ids.length - 1]) ?? null;
  });

  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private finishCurrent: ((correctCount: number) => void) | null = null;

  /**
   * Startet die Resolve-Sequenz für einen Skill mit `resolvePoints` Punkten.
   * Löst das zurückgegebene Promise mit der Anzahl korrekt in Folge
   * verbundener Punkte auf (bei Erfolg oder Zeitablauf).
   */
  public start(resolvePoints: number): Promise<number> {
    return new Promise((resolve) => {
      this.points.set(this.generatePoints(resolvePoints));
      this.connectedIds.set([]);
      this.dragging.set(false);
      this.active.set(true);

      this.finishCurrent = (correctCount: number) => {
        if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
        this.finishCurrent = null;
        this.active.set(false);
        this.dragging.set(false);
        resolve(correctCount);
      };

      this.timeoutHandle = setTimeout(() => {
        this.finishCurrent?.(this.connectedIds().length);
      }, this.durationMs);
    });
  }

  /** ID des einzigen Punktes, an dem gerade ein neuer Zug-Vorgang beginnen darf. */
  public validStartId(): number {
    const ids = this.connectedIds();
    return ids.length === 0 ? 1 : ids[ids.length - 1];
  }

  /** Pointer-Down auf einem Punkt: startet den Strahl, falls es der gültige Startpunkt ist. */
  public onDragStart(id: number, pos: { x: number; y: number }): void {
    if (!this.active() || id !== this.validStartId()) return;

    if (this.connectedIds().length === 0) {
      this.connectedIds.set([id]);
    }
    this.dragging.set(true);
    this.cursorPos.set(pos);
  }

  /** Pointer-Move während des Ziehens (Touch): aktualisiert den Strahl und prüft auf Verbindung. */
  public onDragMove(pos: { x: number; y: number }): void {
    if (!this.dragging()) return;
    this.cursorPos.set(pos);
    this.tryConnectNext(pos);
  }

  /**
   * Maus-Hover (Desktop): anders als bei Touch braucht die Maus kein Gedrückthalten —
   * der nächste Punkt wird bereits verbunden, sobald der Mauszeiger ihn berührt.
   * Wird nur für pointerType 'mouse' aufgerufen (siehe ResolveChallenge-Komponente).
   */
  public onHoverMove(pos: { x: number; y: number }): void {
    if (!this.active()) return;
    this.dragging.set(true);
    this.cursorPos.set(pos);
    this.tryConnectNext(pos);
  }

  /** Pointer-Up/-Cancel: der aktuell gezogene Strahl verschwindet, Fortschritt bleibt. */
  public onDragEnd(): void {
    this.dragging.set(false);
  }

  /** Verbindet den nächsten erwarteten Punkt, falls `pos` nah genug dran ist. */
  private tryConnectNext(pos: { x: number; y: number }): void {
    const nextId = this.connectedIds().length + 1;
    const target = this.points().find((p) => p.id === nextId);
    if (!target) return;

    const distance = Math.hypot(target.x - pos.x, target.y - pos.y);
    if (distance > this.hitRadius) return;

    this.connectedIds.update((ids) => [...ids, nextId]);
    if (this.connectedIds().length === this.points().length) {
      this.finishCurrent?.(this.connectedIds().length);
    }
  }

  /**
   * Platziert `count` Punkte zufällig im Popup-Bereich. Hält den geforderten
   * Mindestabstand ein, reduziert ihn aber schrittweise, falls er sich bei
   * vielen Punkten in der begrenzten Fläche nicht einhalten lässt.
   */
  private generatePoints(count: number): ResolvePoint[] {
    const placed: ResolvePoint[] = [];

    for (let id = 1; id <= count; id++) {
      let minDist = this.minDistance;
      let attempts = 0;
      let x = 0;
      let y = 0;
      let found = false;

      while (!found) {
        x = this.padding + Math.random() * (this.containerWidth - this.padding * 2);
        y = this.padding + Math.random() * (this.containerHeight - this.padding * 2);
        found = placed.every((p) => Math.hypot(p.x - x, p.y - y) >= minDist);

        attempts++;
        if (!found && attempts > 300) {
          minDist = Math.max(40, minDist - 10);
          attempts = 0;
        }
      }

      placed.push({ id, x, y });
    }

    return placed;
  }
}

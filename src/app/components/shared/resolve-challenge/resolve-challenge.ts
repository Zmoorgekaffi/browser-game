import { Component, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResolveChallengeService } from '../../../services/resolve-challenge.service';
import { ScreenSizingService } from '../../../services/screen-sizing.service';

/**
 * @component ResolveChallenge
 * @description Popup mit nummerierten Kreisen, die der Spieler beim Wirken
 * eines Skills innerhalb des Zeitlimits per Drag in aufsteigender Reihenfolge
 * verbinden muss (siehe ResolveChallengeService für die Spiellogik).
 */
@Component({
  selector: 'app-resolve-challenge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resolve-challenge.html',
  styleUrl: './resolve-challenge.scss',
})
export class ResolveChallenge {
  public service = inject(ResolveChallengeService);
  private el = inject(ElementRef);
  private screenSizingService = inject(ScreenSizingService);

  public isConnected(id: number): boolean {
    return this.service.connectedIds().includes(id);
  }

  public onPointerDown(event: PointerEvent, id: number): void {
    if (id !== this.service.validStartId()) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.service.onDragStart(id, this.toLocalPos(event.clientX, event.clientY));
  }

  public onPointerMove(event: PointerEvent): void {
    if (!this.service.dragging()) return;
    event.preventDefault();
    this.service.onDragMove(this.toLocalPos(event.clientX, event.clientY));
  }

  public onPointerUp(): void {
    this.service.onDragEnd();
  }

  public onPointerCancel(): void {
    this.service.onDragEnd();
  }

  /** Wandelt Viewport-Koordinaten in popup-lokale Koordinaten um (kompensiert ScreenSizingService.scale()). */
  private toLocalPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.el.nativeElement.querySelector('.resolve-container')?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scale = this.screenSizingService.scale() || 1;
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  }
}

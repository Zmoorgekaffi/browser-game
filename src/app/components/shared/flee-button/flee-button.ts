import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdventureStateService } from '../../../services/adventure-state.service';
import { ResolveChallengeService } from '../../../services/resolve-challenge.service';

/**
 * @component FleeButton
 * @description Erscheint in allen Adventure-Szenen (Intro/Dialog/Loot/Fight), solange
 * ein Run läuft. Bricht das Abenteuer wie eine Niederlage ab (kein Loot, kein Gold aus
 * dem Run, EXP bleibt) — siehe AdventureStateService.fleeAdventure(). Fragt vorher kurz
 * nach, um Fehlklicks zu vermeiden.
 */
@Component({
  selector: 'app-flee-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flee-button.html',
  styleUrl: './flee-button.scss',
})
export class FleeButton {
  private adventureStateService = inject(AdventureStateService);
  private resolveChallengeService = inject(ResolveChallengeService);

  public inAdventure = this.adventureStateService.adventureId;
  public resolveChallengeActive = this.resolveChallengeService.active;

  public confirming = signal<boolean>(false);

  public requestFlee(): void {
    this.confirming.set(true);
  }

  public cancelFlee(): void {
    this.confirming.set(false);
  }

  public confirmFlee(): void {
    this.confirming.set(false);
    this.adventureStateService.fleeAdventure();
  }
}

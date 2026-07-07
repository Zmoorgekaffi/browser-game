import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/game-state.service';

/**
 * @component NameCreation
 * @description Namenswahl für den Charakter. Wird beim ersten Login eines
 * neuen Charakters (leerer Name im Profil) automatisch angezeigt, und
 * erneut, wenn der Spieler im Header auf seinen Namen klickt.
 */
@Component({
  selector: 'app-name-creation',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './name-creation.html',
  styleUrl: './name-creation.scss',
})
export class NameCreation {
  private gameStateService = inject(GameStateService);
  private router = inject(Router);

  name = this.gameStateService.profile.name() || '';
  error = '';

  /** Übernimmt den eingegebenen Namen und geht weiter ins Dorf. */
  onConfirm(): void {
    const trimmed = this.name.trim();
    if (!trimmed) {
      this.error = 'Bitte gib einen Namen ein.';
      return;
    }

    this.gameStateService.profile.updateName(trimmed);
    this.router.navigate(['/village']);
  }
}

import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/game-state.service';
import { PORTRAITS } from '../../models/portraits.data';

/**
 * @component NameCreation
 * @description Namens- und Portrait-Wahl für den Charakter. Wird beim ersten
 * Login eines neuen Charakters (leerer Name im Profil) automatisch angezeigt,
 * und erneut, wenn der Spieler im Header auf seinen Namen klickt. Name und
 * Portrait lassen sich hier jederzeit unabhängig voneinander ändern.
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

  portraits = PORTRAITS;
  selectedPortraitId = this.gameStateService.profile.avatar();

  selectPortrait(id: string): void {
    this.selectedPortraitId = id;
  }

  /** Übernimmt Namen und Portrait und geht weiter ins Dorf. */
  onConfirm(): void {
    const trimmed = this.name.trim();
    if (!trimmed) {
      this.error = 'Bitte gib einen Namen ein.';
      return;
    }

    this.gameStateService.profile.updateName(trimmed);
    this.gameStateService.profile.updateAvatar(this.selectedPortraitId);
    this.router.navigate(['/village']);
  }
}

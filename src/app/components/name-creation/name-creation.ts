import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/game-state.service';
import { AVATARS } from '../../models/avatars.data';

/**
 * @component NameCreation
 * @description Namens- und Avatar-Wahl für den Charakter (Route: /profile).
 * Wird beim ersten Login eines neuen Charakters (leerer Name im Profil)
 * automatisch angezeigt, und erneut, wenn der Spieler im Header auf seinen
 * Namen klickt. Name und Avatar lassen sich hier jederzeit unabhängig
 * voneinander ändern.
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

  avatars = AVATARS;
  selectedAvatarId = this.gameStateService.profile.avatar();

  /** Wählt den Avatar aus und speichert ihn sofort im Profil (LocalStorage). */
  selectAvatar(id: string): void {
    this.selectedAvatarId = id;
    this.gameStateService.profile.updateAvatar(id);
  }

  /** Übernimmt den Namen und geht weiter ins Dorf (Avatar ist bereits gespeichert, siehe selectAvatar). */
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

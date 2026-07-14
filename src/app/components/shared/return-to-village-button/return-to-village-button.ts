import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdventureStateService } from '../../../services/adventure-state.service';

/**
 * @component ReturnToVillageButton
 * @description Erscheint in der SummaryScene (Zwischenstand zwischen
 * Adventure-Steps), solange ein Run läuft UND mindestens ein Kampf
 * erfolgreich bestanden wurde (sonst könnte man nach einer aufwandslosen
 * Loot-/Dialog-Scene ohne jeden Kampf sofort mit der Beute zurück ins Dorf).
 * Beendet das Abenteuer vorzeitig, behält aber das bisher gesammelte Loot &
 * Gold — siehe AdventureStateService.returnToVillageEarly(). Kein
 * Abschluss-Bonus, der gibt's nur beim kompletten Durchspielen aller Steps.
 * Fragt vorher kurz nach, um Fehlklicks zu vermeiden.
 */
@Component({
  selector: 'app-return-to-village-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './return-to-village-button.html',
  styleUrl: './return-to-village-button.scss',
})
export class ReturnToVillageButton {
  private adventureStateService = inject(AdventureStateService);

  public inAdventure = this.adventureStateService.adventureId;
  public hasWonAnyFight = this.adventureStateService.hasWonAnyFight;

  public confirming = signal<boolean>(false);

  public requestReturn(): void {
    this.confirming.set(true);
  }

  public cancelReturn(): void {
    this.confirming.set(false);
  }

  public confirmReturn(): void {
    this.confirming.set(false);
    this.adventureStateService.returnToVillageEarly();
  }
}

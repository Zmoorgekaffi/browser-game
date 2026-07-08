import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../services/game-state.service';
import { getItemTier } from '../../../utils/item-display.util';

/**
 * @component SummaryScene
 * @description Zwischenstand-Fenster, das nach jedem erfolgreich
 * abgeschlossenen Adventure-Step (Kampf, Loot, Dialog) eingeblendet wird
 * und zeigt, was der Spieler auf der laufenden Reise bisher gefunden hat.
 * Läuft auch bei einer Niederlage — dann mit anderer Nachricht, weil die
 * gesammelte Beute in diesem Fall verloren geht (siehe failAdventure()).
 *
 * Der eigentliche Step-Wechsel bzw. Adventure-Abbruch passiert erst beim
 * Bestätigen (acknowledgeSummary() im AdventureStateService).
 */
@Component({
  selector: 'app-summary-scene',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-scene.html',
  styleUrl: './summary-scene.scss',
})
export class SummaryScene {
  gameStateService = inject(GameStateService);

  private adventure = this.gameStateService.adventureStateService;

  mode = this.adventure.summaryMode;
  totalGold = this.adventure.goldEarnedThisRun;
  totalItems = this.adventure.pendingRewards;
  newItems = this.adventure.summaryNewItems;
  newGold = this.adventure.summaryNewGold;

  get isDeath(): boolean {
    return this.mode() === 'death';
  }

  isNewItem(item: any): boolean {
    return this.newItems().includes(item);
  }

  getTier(item: any): number | null {
    return getItemTier(item);
  }

  onContinue(): void {
    this.adventure.acknowledgeSummary();
  }
}

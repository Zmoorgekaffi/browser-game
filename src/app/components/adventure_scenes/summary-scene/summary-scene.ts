import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../services/game-state.service';
import { getItemTier } from '../../../utils/item-display.util';
import { PotionPanel } from '../../shared/potion-panel/potion-panel';

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
  imports: [CommonModule, PotionPanel],
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

  // 🧪 HP/Mana werden über den Run mitgenommen — hier sichtbar, damit man vor
  // dem nächsten Step gezielt einen Trank trinken kann (siehe PotionPanel).
  maxHp = computed(() => this.gameStateService.skills.combatStats().hp);
  maxMana = computed(() => this.gameStateService.skills.combatStats().mana);
  currentHp = computed(() => this.adventure.currentPlayerHp() ?? this.maxHp());
  currentMana = computed(() => this.adventure.currentPlayerMana() ?? this.maxMana());

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

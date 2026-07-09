import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PotionService, PotionType, InventoryPotion } from '../../../services/potion.service';
import { FightService } from '../../../services/fight.service';
import { ResolveChallengeService } from '../../../services/resolve-challenge.service';

interface PotionGroup {
  name: string;
  description: string;
  imgPath: string;
  count: number;
  index: number;
}

/**
 * @component PotionPanel
 * @description Wiederverwendbares Tränke-Menü: ein Auslöse-Button ("Tränke"/
 * "Trank") plus auf-/zuklappbare Liste der passenden Inventar-Tränke.
 *
 * - mode='out-of-combat' (SummaryScene): nur Heil-/Manatränke, freie Nutzung.
 * - mode='in-combat' (FightScene): alle 3 Tranktypen, verbraucht den Spielzug
 *   (siehe FightService.consumePotionTurn) und ist nur im Spieler-Zug nutzbar.
 */
@Component({
  selector: 'app-potion-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './potion-panel.html',
  styleUrl: './potion-panel.scss',
})
export class PotionPanel {
  private potionService = inject(PotionService);
  private fightService = inject(FightService);
  public resolveChallengeService = inject(ResolveChallengeService);

  @Input() allowedTypes: PotionType[] = ['health', 'mana'];
  @Input() mode: 'out-of-combat' | 'in-combat' = 'out-of-combat';
  @Input() label = 'Tränke';
  @Output() used = new EventEmitter<void>();

  public open = signal<boolean>(false);

  public currentTurn = this.fightService.currentTurn;

  public toggle(): void {
    if (this.triggerDisabled()) return;
    this.open.update((v) => !v);
  }

  public triggerDisabled(): boolean {
    if (this.mode !== 'in-combat') return false;
    return this.currentTurn() !== 'player' || this.resolveChallengeService.active();
  }

  public groupedPotions(): PotionGroup[] {
    const entries: InventoryPotion[] = this.potionService.getInventoryPotions(this.allowedTypes);
    const groups = new Map<string, PotionGroup>();

    for (const { item, index } of entries) {
      const existing = groups.get(item.name);
      if (existing) {
        existing.count++;
      } else {
        groups.set(item.name, {
          name: item.name,
          description: item.description ?? '',
          imgPath: item['img-path'],
          count: 1,
          index,
        });
      }
    }

    return Array.from(groups.values());
  }

  public usePotion(group: PotionGroup): void {
    if (this.triggerDisabled()) return;

    const success =
      this.mode === 'out-of-combat'
        ? this.potionService.useOutOfCombat(group.index)
        : this.potionService.useInCombat(group.index);

    if (success) {
      this.used.emit();
      if (this.groupedPotions().length === 0) this.open.set(false);
    }
  }
}

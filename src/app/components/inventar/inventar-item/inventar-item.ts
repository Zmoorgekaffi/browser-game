import { Component, Input, signal, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../services/game-state.service';
import { getSellPrice, getItemTier } from '../../../utils/item-display.util';
import { getStatColor, getStatValue, hasPositiveStats, hasNegativeStats, STAT_DEFINITIONS, getElementLabel } from '../../../utils/stat-color.util';
import { getItemRequirements, meetsAllRequirements, formatRequirements } from '../../../utils/item-requirements.util';

/**
 * @component InventarItem
 * @description Eine Zeile in der Inventarliste. An-/Ausziehen läuft über
 * einen expliziten Button, nicht mehr über einen Klick auf die ganze Karte.
 */
@Component({
  selector: 'app-inventar-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventar-item.html',
  styleUrl: './inventar-item.scss',
  host: {
    class: 'w-full block',
  },
})
export class InventarItem implements OnChanges {
  private gameStateService = inject(GameStateService);

  @Input() item: any = {
    name: '',
    description: '',
    'img-path': '',
    price: 0,
    stats: {},
  };

  @Input() index!: number;
  @Input() source: 'inventar' | 'personal' = 'inventar';
  public itemSignal = signal<any>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      this.itemSignal.set(this.item);
    }
  }

  public get tier(): number | null {
    return getItemTier(this.item);
  }

  public get sellValue(): number {
    return getSellPrice(this.item?.price);
  }

  public statDefs = STAT_DEFINITIONS;
  public getStatValue = getStatValue;
  public hasPositiveStats = hasPositiveStats;
  public hasNegativeStats = hasNegativeStats;

  public statColor(key: string): string {
    return getStatColor(key, 'dark');
  }

  public getItemRequirements = getItemRequirements;
  public formatRequirements = formatRequirements;
  public getElementLabel = getElementLabel;

  toggleEquip(): void {
    if (this.index === undefined) return;

    const isEquipping = !this.item?.equipped;
    if (isEquipping) {
      const currentStats = this.gameStateService.skills.combatStats() as any;
      if (!meetsAllRequirements(this.item, currentStats)) {
        const missing = getItemRequirements(this.item)
          .filter((req) => (currentStats[req.stat] ?? 0) < req.value)
          .map((req) => `${req.value} ${req.stat}`)
          .join(', ');
        console.warn(`❌ Anforderung nicht erfüllt: ${missing} benötigt.`);
        return;
      }
    }

    this.gameStateService.inventar.toggleEquipItem(this.index, this.source);
  }
}

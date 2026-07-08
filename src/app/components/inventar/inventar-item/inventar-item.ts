import { Component, Input, signal, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../services/game-state.service';
import { getSellPrice, getItemTier } from '../../../utils/item-display.util';
import { getStatColor, getStatValue, hasPositiveStats, hasNegativeStats, STAT_DEFINITIONS } from '../../../utils/stat-color.util';

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

  toggleEquip(): void {
    if (this.index === undefined) return;

    const isEquipping = !this.item?.equipped;
    if (isEquipping && !this.meetsRequirement(this.item?.requirement)) {
      console.warn(
        `❌ Anforderung nicht erfüllt: ${this.item.requirement.value} ${this.item.requirement.stat} benötigt.`,
      );
      return;
    }

    this.gameStateService.inventar.toggleEquipItem(this.index, this.source);
  }

  /** Prüft ein optionales `requirement: { stat, value }`-Feld gegen die aktuellen Gesamt-Attribute. */
  private meetsRequirement(requirement: { stat: string; value: number } | undefined | null): boolean {
    if (!requirement) return true;
    const current = (this.gameStateService.skills.combatStats() as any)[requirement.stat] ?? 0;
    return current >= requirement.value;
  }
}

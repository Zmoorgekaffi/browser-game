import { Component, Input, effect, signal, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../services/game-state.service';
import { InventarService } from '../../../services/inventar.service';



/**
 * @component InventarItem
 * @description Eine Zeile im Inventar. Klick auf das gesamte Element
 * rüstet das Item an bzw. ab (Toggle über den InventarService).
 */
@Component({
  selector: 'app-inventar-item',
  standalone: true,
  imports: [CommonModule, ],
  templateUrl: './inventar-item.html',
  styleUrl: './inventar-item.scss',
  // HIER DIE MAGIE: Macht das gesamte Custom-Element im Browser klickbar und breit!
  host: {
    '(click)': 'onEquipClick()',
    'class': 'w-full block pointer-events-auto'
  }
})
export class InventarItem implements OnChanges {
  private gameStateService = inject(GameStateService);
  private inventarService = inject(InventarService);

  @Input() item: any = {
    name: '',
    description: '',
    'img-path': '',
    price: 0,
    stats: {},
  };

  @Input() index!: number;
  public itemSignal = signal<any>(null);

  constructor() {
    effect(() => {
      const slots = this.inventarService.equippedSlots();
      console.log('====== 🛡️ TEST-LOG: ALLE AUSGERÜSTETEN ITEMS ======');
      let hatAusruestung = false;
      Object.entries(slots).forEach(([slotName, itemObj]) => {
        if (itemObj) {
          hatAusruestung = true;
          console.log(`🔹 [Slot: ${slotName}] -> ${itemObj.name}`);
        }
      });
      if (!hatAusruestung) console.log('❌ Aktuell sind keine Gegenstände ausgerüstet.');
      console.log('==================================================');
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      this.itemSignal.set(this.item);
    }
  }

  /** Host-Klick: Item an-/ablegen. */
  onEquipClick(): void {
    console.log(`🎯 Klick im Host registriert! Index: ${this.index}`);
    if (this.index !== undefined) {
      this.gameStateService.inventar.toggleEquipItem(this.index);
    }
  }
}
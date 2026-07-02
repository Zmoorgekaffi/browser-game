import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventarService } from '../../../services/inventar.service';

/**
 * @component ArmorSlot
 * @description Einzelner Ausrüstungs-Slot in der Inventar-Ansicht.
 * Zeigt das ausgerüstete Item aus dem equippedSlots-Signal an.
 */
@Component({
  selector: 'app-armor-slot',
  imports: [CommonModule],
  templateUrl: './armor-slot.html',
  styleUrl: './armor-slot.scss',
})
export class ArmorSlot {
  public inventarService = inject(InventarService);

  // Wichtig: Exakt 'slotName' schreiben
  public slotName = input.required<string>();

  public x = input.required<number>();
  public y = input.required<number>();
  public height = input.required<string>();
  public width = input.required<string>();
  public devmode = input<boolean>(false);
}

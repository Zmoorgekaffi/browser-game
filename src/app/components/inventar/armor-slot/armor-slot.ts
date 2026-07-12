import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventarService } from '../../../services/inventar.service';
import { DeviceService } from '../../../services/device.service';

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
  private deviceService = inject(DeviceService);

  // Wichtig: Exakt 'slotName' schreiben
  public slotName = input.required<string>();

  public x = input.required<number>();
  public y = input.required<number>();
  public height = input.required<string>();
  public width = input.required<string>();
  public devmode = input<boolean>(false);

  get defaultImagePath(): string {
    return `imgs/inventar/slots/slot-${this.slotBaseName(this.slotName())}.png`;
  }

  private slotBaseName(name: string): string {
    if (name.startsWith('ring')) return 'ring';
    if (name.startsWith('weapon')) return 'weapon';
    if (name === 'head') return 'helmet';
    return name;
  }

  onEnter(): void {
    if (this.deviceService.isTouch()) return;
    const item = this.inventarService.equippedSlots()[this.slotName()];
    if (item) this.inventarService.hoveredEquippedItem.set(item);
  }

  onLeave(): void {
    if (this.deviceService.isTouch()) return;
    this.inventarService.hoveredEquippedItem.set(null);
  }

  onClick(): void {
    if (this.inventarService.equippedSlots()[this.slotName()]) {
      this.inventarService.unequipConfirmSlot.set(this.slotName());
    }
  }
}

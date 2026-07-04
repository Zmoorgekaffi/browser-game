import { Component, ElementRef, Signal, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { InventarItem } from './inventar-item/inventar-item';
import { CommonModule } from '@angular/common';
import { ArmorSlot } from './armor-slot/armor-slot';
import { ScreenSizingService } from '../../services/screen-sizing.service';
import { getItemTier } from '../../utils/item-display.util';

/**
 * @component Inventar
 * @description Inventar-Bildschirm: Item-Liste plus Ausrüstungs-Slots
 * (ArmorSlot). Das eigentliche An-/Ablegen läuft über InventarItem, das
 * Ausziehen direkt über einen ArmorSlot läuft über einen Bestätigungsdialog.
 */
@Component({
  selector: 'app-inventar',
  standalone: true,
  imports: [InventarItem, CommonModule, ArmorSlot],
  templateUrl: './inventar.html',
  styleUrl: './inventar.scss',
})
export class Inventar {
  public gameStateService = inject(GameStateService);
  private screenSizingService = inject(ScreenSizingService);
  private el = inject(ElementRef);

  inventar: Signal<any> = this.gameStateService.inventar.inventar;
  public hoveredEquippedItem = this.gameStateService.inventar.hoveredEquippedItem;
  public unequipConfirmSlot = this.gameStateService.inventar.unequipConfirmSlot;

  public tooltipX = 0;
  public tooltipY = 0;

  /** Siehe character.ts/onMouseMove für die Begründung von absolute+scale statt fixed. */
  public onMouseMove(event: MouseEvent): void {
    const rect = this.el.nativeElement.querySelector('#inventarRoot')?.getBoundingClientRect();
    if (!rect) return;
    const scale = this.screenSizingService.scale() || 1;
    this.tooltipX = (event.clientX - rect.left) / scale;
    this.tooltipY = (event.clientY - rect.top - 100) / scale;
  }

  public getTier(item: any): number | null {
    return getItemTier(item);
  }

  public confirmUnequip(): void {
    const slot = this.unequipConfirmSlot();
    if (slot) this.gameStateService.inventar.unequipSlot(slot);
    this.unequipConfirmSlot.set(null);
  }

  public cancelUnequip(): void {
    this.unequipConfirmSlot.set(null);
  }

  /**
   * Schließt das Inventar und nutzt den zentralen SceneService,
   * um zur letzten Spiel-Szene zurückzukehren.
   */
  closeInventar(): void {
    this.gameStateService.sceneService.goBack();
  }
}
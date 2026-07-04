import { Component, ElementRef, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { GameStateService } from '../../../services/game-state.service';
import { getItemTier } from '../../../utils/item-display.util';

/**
 * @component CraftingPanel
 * @description Crafting-Dialog im Shop: 3 Kästchen (links/Basis/rechts), in
 * die per Drag & Drop Items aus dem Inventar gezogen werden. Ein Klick auf
 * "Craften" erzeugt daraus ein neues, seelengebundenes Item.
 * Ein-/Ausblenden läuft per GSAP, exakt nach dem Muster von SellPanel.
 */
@Component({
  selector: 'app-crafting-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './crafting-panel.html',
  styleUrl: './crafting-panel.scss',
})
export class CraftingPanel {
  public gameStateService = inject(GameStateService);
  private el = inject(ElementRef);

  public show = this.gameStateService.crafting.craftingPanelShow;
  public slots = this.gameStateService.crafting.slots;
  public craftResultItem = this.gameStateService.crafting.craftResultItem;

  /** Index des Items, das gerade aus der Liste gezogen wird (Drag-Quelle). */
  private draggedInventarIndex: number | null = null;

  constructor() {
    effect(() => {
      if (this.show()) {
        requestAnimationFrame(() => this.animateIn());
      }
    });
  }

  private animateIn(): void {
    const target = this.el.nativeElement.querySelector('.panel-container');
    if (!target) return;

    gsap.killTweensOf(target);
    gsap.fromTo(
      target,
      { opacity: 0, y: 40, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.3 },
    );
  }

  public get craftableItems(): { item: any; index: number }[] {
    return this.gameStateService.crafting.craftableItems;
  }

  public get canCraft(): boolean {
    return this.gameStateService.crafting.canCraft;
  }

  public getTier(item: any): number | null {
    return getItemTier(item);
  }

  public close(): void {
    const target = this.el.nativeElement.querySelector('.panel-container');

    if (target) {
      gsap.killTweensOf(target);
      gsap.to(target, {
        opacity: 0,
        y: 30,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => this.gameStateService.crafting.closeCraftingPanel(),
      });
    } else {
      this.gameStateService.crafting.closeCraftingPanel();
    }
  }

  public onListDragStart(event: DragEvent, inventarIndex: number): void {
    this.draggedInventarIndex = inventarIndex;
    event.dataTransfer?.setData('text/plain', String(inventarIndex));
  }

  public onBoxDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  public onBoxDrop(event: DragEvent, slotIndex: number): void {
    event.preventDefault();

    const raw = event.dataTransfer?.getData('text/plain');
    const inventarIndex = raw ? Number(raw) : this.draggedInventarIndex;

    if (inventarIndex === null || inventarIndex === undefined || Number.isNaN(inventarIndex)) return;

    this.gameStateService.crafting.placeItemInSlot(slotIndex, inventarIndex);
    this.draggedInventarIndex = null;
  }

  /** Klick auf ein belegtes Kästchen legt das Item zurück ins Inventar. */
  public onBoxClick(slotIndex: number): void {
    this.gameStateService.crafting.returnSlotToInventory(slotIndex);
  }

  public craft(): void {
    this.gameStateService.crafting.craftItem();
  }

  public closeResult(): void {
    this.gameStateService.crafting.craftResultItem.set(null);
  }
}

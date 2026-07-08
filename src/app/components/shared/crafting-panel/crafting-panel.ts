import { Component, ElementRef, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { GameStateService } from '../../../services/game-state.service';
import { ScreenSizingService } from '../../../services/screen-sizing.service';
import { DeviceService } from '../../../services/device.service';
import { getItemTier } from '../../../utils/item-display.util';
import { getStatColor, getStatValue, hasPositiveStats, hasNegativeStats, STAT_DEFINITIONS } from '../../../utils/stat-color.util';

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
  public deviceService = inject(DeviceService);
  private screenSizingService = inject(ScreenSizingService);
  private el = inject(ElementRef);

  public show = this.gameStateService.crafting.craftingPanelShow;
  public slots = this.gameStateService.crafting.slots;
  public craftResultItem = this.gameStateService.crafting.craftResultItem;

  /** Index des Items in der Liste, das gerade per Pointer gezogen wird (Maus & Touch). */
  public draggingIndex = signal<number | null>(null);
  /** Index des Kästchens, über dem der Pointer gerade schwebt (Drop-Highlight). */
  public hoveredSlotIndex = signal<number | null>(null);
  /** Bildpfad des gerade gezogenen Items, für die Ghost-Vorschau. */
  public draggingImg: string | null = null;
  public ghostX = 0;
  public ghostY = 0;

  /** Steuert das Info-Popup mit den Crafting-Regeln (Klick auf den "i"-Button). */
  public showInfoPopup = signal<boolean>(false);

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

  public statDefs = STAT_DEFINITIONS;
  public getStatValue = getStatValue;
  public hasPositiveStats = hasPositiveStats;
  public hasNegativeStats = hasNegativeStats;

  public statColor(key: string): string {
    return getStatColor(key, 'dark');
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

  /**
   * Start des Ziehens per Pointer Events (Maus & Touch einheitlich).
   * Ersetzt natives HTML5 Drag&Drop, das auf Touch-Geräten nicht feuert.
   */
  public onItemPointerDown(event: PointerEvent, inventarIndex: number, imgPath: string): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.draggingIndex.set(inventarIndex);
    this.draggingImg = imgPath;
    this.updateGhostPosition(event.clientX, event.clientY);
  }

  public onItemPointerMove(event: PointerEvent): void {
    if (this.draggingIndex() === null) return;
    event.preventDefault();
    this.updateGhostPosition(event.clientX, event.clientY);
    this.hoveredSlotIndex.set(this.slotIndexAt(event.clientX, event.clientY));
  }

  public onItemPointerUp(event: PointerEvent): void {
    const inventarIndex = this.draggingIndex();
    if (inventarIndex === null) return;

    const slotIndex = this.slotIndexAt(event.clientX, event.clientY);
    if (slotIndex !== null) {
      this.gameStateService.crafting.placeItemInSlot(slotIndex, inventarIndex);
    }

    this.resetDrag();
  }

  public onItemPointerCancel(): void {
    this.resetDrag();
  }

  private resetDrag(): void {
    this.draggingIndex.set(null);
    this.hoveredSlotIndex.set(null);
    this.draggingImg = null;
  }

  /** Findet das Kästchen (per data-slot-index) unter den angegebenen Viewport-Koordinaten. */
  private slotIndexAt(clientX: number, clientY: number): number | null {
    const target = document.elementFromPoint(clientX, clientY)?.closest('[data-slot-index]');
    const raw = target?.getAttribute('data-slot-index');
    return raw !== null && raw !== undefined ? Number(raw) : null;
  }

  /** Ghost-Position relativ zu .panel-container, kompensiert um ScreenSizingService.scale(). */
  private updateGhostPosition(clientX: number, clientY: number): void {
    const rect = this.el.nativeElement.querySelector('.panel-container')?.getBoundingClientRect();
    if (!rect) return;
    const scale = this.screenSizingService.scale() || 1;
    this.ghostX = (clientX - rect.left) / scale;
    this.ghostY = (clientY - rect.top) / scale;
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

  public openInfo(): void {
    this.showInfoPopup.set(true);
  }

  public closeInfo(): void {
    this.showInfoPopup.set(false);
  }
}

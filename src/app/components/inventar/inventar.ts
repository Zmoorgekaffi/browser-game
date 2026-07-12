import { Component, ElementRef, Signal, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { GameStateService } from '../../services/game-state.service';
import { InventarItem } from './inventar-item/inventar-item';
import { CommonModule } from '@angular/common';
import { ArmorSlot } from './armor-slot/armor-slot';
import { RedirectHotspotComponent } from '../shared/redirect-hotspot/redirect-hotspot.component';
import { ScreenSizingService } from '../../services/screen-sizing.service';
import { DeviceService } from '../../services/device.service';
import { getItemTier } from '../../utils/item-display.util';
import { getStatColor, getStatValue, hasPositiveStats, hasNegativeStats, STAT_DEFINITIONS } from '../../utils/stat-color.util';
import { ItemCategory, categoryFromRouteSlug, getItemCategory, isItemCompatibleWithSlot } from '../../utils/item-category.util';
import { meetsAllRequirements } from '../../utils/item-requirements.util';

/**
 * @component Inventar
 * @description Inventar-Bildschirm: Item-Liste plus Ausrüstungs-Slots
 * (ArmorSlot). Das eigentliche An-/Ablegen läuft über InventarItem, das
 * Ausziehen direkt über einen ArmorSlot läuft über einen Bestätigungsdialog.
 */
@Component({
  selector: 'app-inventar',
  standalone: true,
  imports: [InventarItem, CommonModule, ArmorSlot, RedirectHotspotComponent],
  templateUrl: './inventar.html',
  styleUrl: './inventar.scss',
})
export class Inventar {
  public gameStateService = inject(GameStateService);
  public deviceService = inject(DeviceService);
  public screenSizingService = inject(ScreenSizingService);
  private el = inject(ElementRef);
  private route = inject(ActivatedRoute);

  inventar: Signal<any> = this.gameStateService.inventar.inventar;
  personalItems: Signal<any> = this.gameStateService.personalItems.personalItems;
  public hoveredEquippedItem = this.gameStateService.inventar.hoveredEquippedItem;
  public unequipConfirmSlot = this.gameStateService.inventar.unequipConfirmSlot;

  /** Kategorien-Tabs (Rüstung/Waffen/Tränke/Materialien/Zutaten/Quest) — Standard: Rüstung. */
  private paramMap = toSignal(this.route.paramMap);
  public activeCategory: Signal<ItemCategory> = computed(() => categoryFromRouteSlug(this.paramMap()?.get('category')));

  /** Normale Inventar-Items und persönliche (soulbound) Items in einer gemeinsamen Liste, gefiltert nach aktiver Kategorie. */
  public get displayedItems(): { item: any; index: number; source: 'inventar' | 'personal' }[] {
    const category = this.activeCategory();

    const fromInventar = (this.inventar()?.items ?? [])
      .map((item: any, index: number) => ({ item, index, source: 'inventar' as const }))
      .filter((entry: { item: any }) => getItemCategory(entry.item) === category);
    const fromPersonal = (this.personalItems()?.items ?? [])
      .map((item: any, index: number) => ({ item, index, source: 'personal' as const }))
      .filter((entry: { item: any }) => getItemCategory(entry.item) === category);
    return [...fromInventar, ...fromPersonal];
  }

  /** Eintrag, der gerade per Drag&Drop auf einen ArmorSlot gezogen wird. */
  public draggingEntry = signal<{ index: number; source: 'inventar' | 'personal' } | null>(null);
  public dragGhostImg: string | null = null;
  public dragGhostX = 0;
  public dragGhostY = 0;

  private findEntryItem(index: number, source: 'inventar' | 'personal'): any {
    const items = source === 'personal' ? this.personalItems()?.items : this.inventar()?.items;
    return items?.[index] ?? null;
  }

  /** Findet den Slot (per data-slot-name) unter den angegebenen Viewport-Koordinaten. */
  private slotNameAt(clientX: number, clientY: number): string | null {
    const target = document.elementFromPoint(clientX, clientY)?.closest('[data-slot-name]');
    return target?.getAttribute('data-slot-name') ?? null;
  }

  /** Ghost-Position relativ zu #inventarRoot, kompensiert um ScreenSizingService.scale() (siehe onMouseMove). */
  private updateDragGhostPosition(clientX: number, clientY: number): void {
    const rect = this.el.nativeElement.querySelector('#inventarRoot')?.getBoundingClientRect();
    if (!rect) return;
    const scale = this.screenSizingService.scale() || 1;
    this.dragGhostX = (clientX - rect.left) / scale;
    this.dragGhostY = (clientY - rect.top) / scale;
  }

  private resetDrag(): void {
    this.draggingEntry.set(null);
    this.dragGhostImg = null;
    this.gameStateService.inventar.draggingItem.set(null);
    this.gameStateService.inventar.dragHoveredSlot.set(null);
  }

  public onEquipDragStart(payload: { index: number; source: 'inventar' | 'personal'; imgPath: string; clientX: number; clientY: number }): void {
    this.draggingEntry.set({ index: payload.index, source: payload.source });
    this.dragGhostImg = payload.imgPath;
    this.updateDragGhostPosition(payload.clientX, payload.clientY);
    this.gameStateService.inventar.draggingItem.set(this.findEntryItem(payload.index, payload.source));
  }

  public onEquipDragMove(payload: { clientX: number; clientY: number }): void {
    this.updateDragGhostPosition(payload.clientX, payload.clientY);
    this.gameStateService.inventar.dragHoveredSlot.set(this.slotNameAt(payload.clientX, payload.clientY));
  }

  public onEquipDragEnd(payload: { clientX: number; clientY: number }): void {
    const entry = this.draggingEntry();
    const slotName = this.slotNameAt(payload.clientX, payload.clientY);

    if (entry && slotName) {
      const item = this.findEntryItem(entry.index, entry.source);
      const currentStats = this.gameStateService.skills.combatStats() as any;
      if (isItemCompatibleWithSlot(item, slotName) && meetsAllRequirements(item, currentStats)) {
        this.gameStateService.inventar.equipItemToSlot(entry.index, entry.source, slotName);
      }
    }

    this.resetDrag();
  }

  public onEquipDragCancel(): void {
    this.resetDrag();
  }

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

  public statDefs = STAT_DEFINITIONS;
  public getStatValue = getStatValue;
  public hasPositiveStats = hasPositiveStats;
  public hasNegativeStats = hasNegativeStats;

  public statColor(key: string): string {
    return getStatColor(key, 'dark');
  }

  /** Item des Slots, für den gerade der Ausziehen-Dialog offen ist (für die Handy-Infoanzeige). */
  public get unequipConfirmItem(): any {
    const slot = this.unequipConfirmSlot();
    return slot ? (this.gameStateService.inventar.equippedSlots()[slot] ?? null) : null;
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
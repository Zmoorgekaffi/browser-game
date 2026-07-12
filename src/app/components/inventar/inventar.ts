import { Component, ElementRef, Signal, computed, inject } from '@angular/core';
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
import { ItemCategory, categoryFromRouteSlug, getItemCategory } from '../../utils/item-category.util';

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
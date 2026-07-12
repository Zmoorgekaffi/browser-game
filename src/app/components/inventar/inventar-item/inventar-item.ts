import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../services/game-state.service';
import { DeviceService } from '../../../services/device.service';
import { getSellPrice, getItemTier } from '../../../utils/item-display.util';
import { getStatColor, getStatValue, hasPositiveStats, hasNegativeStats, STAT_DEFINITIONS, getElementLabel } from '../../../utils/stat-color.util';
import { getItemRequirements, meetsAllRequirements, formatRequirements } from '../../../utils/item-requirements.util';
import { isEquippableItem } from '../../../utils/item-category.util';

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
  public deviceService = inject(DeviceService);

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

  /** Start/Verlauf/Ende eines Drag&Drop-Equip-Vorgangs (nur Waffen/Rüstung, siehe isEquippable). */
  @Output() equipDragStart = new EventEmitter<{ index: number; source: 'inventar' | 'personal'; imgPath: string; clientX: number; clientY: number }>();
  @Output() equipDragMove = new EventEmitter<{ clientX: number; clientY: number }>();
  @Output() equipDragEnd = new EventEmitter<{ clientX: number; clientY: number }>();
  @Output() equipDragCancel = new EventEmitter<void>();

  /** True während dieses Item per Pointer gezogen wird (für die Ausgrau-Optik). */
  public isDragging = signal(false);

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

  /** Nur Rüstung und Waffen sind ausrüstbar — Tränke/Materialien/Zutaten/Quest-Items nicht. */
  public get isEquippable(): boolean {
    return isEquippableItem(this.item);
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

  /**
   * Start des Ziehens per Pointer Events (Maus & Touch einheitlich).
   * setPointerCapture bindet alle Folge-Events an dieses Element, egal wo
   * der Pointer sich danach hin bewegt (siehe crafting-panel.ts).
   */
  private beginDrag(event: PointerEvent): void {
    if (this.index === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.isDragging.set(true);
    this.equipDragStart.emit({
      index: this.index,
      source: this.source,
      imgPath: this.item?.['img-path'],
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  /** Grabber-Handle — auf dem Handy die einzige Möglichkeit, ein Item zu ziehen. */
  onGrabPointerDown(event: PointerEvent): void {
    this.beginDrag(event);
  }

  /**
   * Ganze Karte ziehbar — nur auf dem Desktop (Maus). Auf dem Handy bleibt die
   * Karte für Scrollen reserviert, dort zieht man nur über den Grabber.
   * Ein Klick auf den "Ausrüsten"-Button darf nicht als Drag-Start zählen.
   */
  onCardPointerDown(event: PointerEvent): void {
    if (!this.isEquippable || this.deviceService.isTouch()) return;
    if ((event.target as HTMLElement).closest('button')) return;
    this.beginDrag(event);
  }

  onItemPointerMove(event: PointerEvent): void {
    if (!this.isDragging()) return;
    event.preventDefault();
    event.stopPropagation();
    this.equipDragMove.emit({ clientX: event.clientX, clientY: event.clientY });
  }

  onItemPointerUp(event: PointerEvent): void {
    if (!this.isDragging()) return;
    event.stopPropagation();
    this.isDragging.set(false);
    this.equipDragEnd.emit({ clientX: event.clientX, clientY: event.clientY });
  }

  onItemPointerCancel(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    this.equipDragCancel.emit();
  }
}

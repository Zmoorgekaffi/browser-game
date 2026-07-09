import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getItemTier } from '../../../utils/item-display.util';
import { getStatColor, getStatValue, hasPositiveStats, hasNegativeStats, STAT_DEFINITIONS, getElementLabel } from '../../../utils/stat-color.util';
import { getItemRequirements, formatRequirements } from '../../../utils/item-requirements.util';

/**
 * @component ItemDetails
 * @description Reine Anzeige der Item-Infos (Bild, Name, Tier/Soulbound,
 * Beschreibung, Waffentyp, Anforderungen, Stats) ohne Preis/Kauf-Button.
 * Wird von der ItemInfoCard (Kauf-Ansicht) UND den Vergleichs-Toolboxen im
 * Shop gemeinsam genutzt, damit beide exakt dieselben Infos zeigen.
 */
@Component({
  selector: 'app-item-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './item-details.html',
  styleUrl: './item-details.scss',
})
export class ItemDetails {
  @Input() item: any;
  /** Bildgröße in px (128 in der großen Kauf-Card, kleiner in den Vergleichs-Toolboxen). */
  @Input() imageSize: number = 128;
  /** Textfarb-Variante passend zum Hintergrund (helle Karten vs. dunkle Panels). */
  @Input() variant: 'light' | 'dark' = 'light';

  /** Maus/Touch-Interaktionen auf dem Item-Bild, für den Vergleichs-Tooltip der ItemInfoCard. */
  @Output() iconEnter = new EventEmitter<void>();
  @Output() iconLeave = new EventEmitter<void>();
  @Output() iconClick = new EventEmitter<void>();

  public get tier(): number | null {
    return getItemTier(this.item);
  }

  public statDefs = STAT_DEFINITIONS;
  public getStatValue = getStatValue;
  public hasPositiveStats = hasPositiveStats;
  public hasNegativeStats = hasNegativeStats;
  public getItemRequirements = getItemRequirements;
  public formatRequirements = formatRequirements;
  public getElementLabel = getElementLabel;

  public statColor(key: string): string {
    return getStatColor(key, this.variant);
  }
}

import { Component, Signal, inject, ElementRef, effect } from '@angular/core';
import { GameStateService } from '../../../services/game-state.service';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap'; // <-- GSAP Import
import { getItemTier } from '../../../utils/item-display.util';
import { getStatColor, getStatValue, hasPositiveStats, hasNegativeStats, STAT_DEFINITIONS } from '../../../utils/stat-color.util';

/**
 * @component ItemInfoCard
 * @description Detail-Karte eines Shop-Items mit Kauf-Button.
 * Ein-/Ausblenden läuft über GSAP-Animationen, der Zustand
 * (sichtbar + angezeigtes Item) lebt im ShopService.
 */
@Component({
  selector: 'app-item-info-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './item-info-card.html',
  styleUrl: './item-info-card.scss',
})
export class ItemInfoCard {
  show: Signal<boolean>;
  currentDisplayedItem: Signal<any>;
  activeItemIndex: Signal<number | null>;

  // Injiziert die Referenz auf das HTML-Element dieser Komponente für GSAP
  private el = inject(ElementRef);

  constructor(public gameStateService: GameStateService) {
    this.show = this.gameStateService.shop.itemInfoCardShow;
    this.currentDisplayedItem = this.gameStateService.shop.currentDisplayedItem;
    this.activeItemIndex = this.gameStateService.shop.activeItemIndex;

    // Reaktiver Effekt: Springt an, sobald sich der Wert von 'show' ändert
    effect(() => {
      if (this.show()) {
        // DER TRICK: requestAnimationFrame wartet exakt, bis Angular das HTML
        // wegen dem @if (show()) ins DOM gerendert hat!
        requestAnimationFrame(() => {
          this.animateIn();
        });
      }
    });
  }

  /**
   * Einblend-Animation: Sucht nach dem inneren Container deiner Karte,
   * lässt ihn von unten (y: 60) reinfahren, skaliert ihn leicht hoch und ploppt auf.
   */
  private animateIn() {
    const cardTarget = this.el.nativeElement.querySelector('.card-container');

    
    if (cardTarget) {
      // Vorherige Animationen stoppen, um Grafikfehler zu vermeiden
      gsap.killTweensOf(cardTarget);

      gsap.fromTo(
        cardTarget,
        { opacity: 0, y: 60, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3 }
      );
    } else {
      console.warn('⚠️ GSAP: .card-container wurde beim Öffnen noch nicht im DOM gefunden!');
    }
  }

  /**
   * Schließen-Animation: Blendet erst das UI-Element aus und setzt
   * NACH Abschluss der Animation das Signal auf false, damit es verschwindet.
   */
  closeInfoCard() {
    const cardTarget = this.el.nativeElement.querySelector('.card-container');

    if (cardTarget) {
      gsap.killTweensOf(cardTarget);

      gsap.to(cardTarget, {
        opacity: 0,
        y: 40,
        scale: 0.95,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          // Erst wenn die Karte unsichtbar gerauscht ist, schalten wir das Signal aus
          // Dadurch löscht Angular das Element sauber aus dem DOM
          this.gameStateService.shop.itemInfoCardShow.set(false);
        }
      });
    } else {
      // Fallback, falls kein Element gefunden wurde
      this.gameStateService.shop.itemInfoCardShow.set(false);
    }
  }

  /** Triggert den Kauf über die im Service gemerkten Variablen. */
  buyItem() {
    this.gameStateService.shop.buyCurrentlySelectedItem();
  }

  /** Blättert zum nächsten (+1) oder vorherigen (-1) Item desselben Shops. */
  cycleItem(direction: 1 | -1): void {
    this.gameStateService.shop.cycleItem(direction);
  }

  /** Anzahl der Plätze im aktuell aktiven Shop (5 bei Schmied/Gemischtwaren, 6 beim Magie-Laden). */
  shopItemCount(): number {
    return this.gameStateService.shop.getActiveShopItemCount();
  }

  public get tier(): number | null {
    return getItemTier(this.currentDisplayedItem());
  }

  public statDefs = STAT_DEFINITIONS;
  public getStatValue = getStatValue;
  public hasPositiveStats = hasPositiveStats;
  public hasNegativeStats = hasNegativeStats;

  public statColor(key: string): string {
    return getStatColor(key, 'light');
  }
}
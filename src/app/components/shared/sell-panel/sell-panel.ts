import { Component, ElementRef, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { GameStateService } from '../../../services/game-state.service';
import { getSellPrice, getItemTier } from '../../../utils/item-display.util';

/**
 * @component SellPanel
 * @description Verkaufs-Dialog: listet alle unausgerüsteten Inventar-Items
 * auf, Klick öffnet einen Bestätigungsdialog (Abbrechen | Verkaufen).
 * Ein-/Ausblenden per GSAP, exakt nach dem Muster von LevelUpPanel.
 */
@Component({
  selector: 'app-sell-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sell-panel.html',
  styleUrl: './sell-panel.scss',
})
export class SellPanel {
  public gameStateService = inject(GameStateService);
  private el = inject(ElementRef);

  public show = this.gameStateService.shop.sellListShow;
  public confirmIndex = this.gameStateService.shop.sellConfirmIndex;

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

  public get sellableItems(): { item: any; index: number }[] {
    const items = this.gameStateService.inventar.inventar()?.items ?? [];
    return items
      .map((item: any, index: number) => ({ item, index }))
      .filter((entry: { item: any; index: number }) => !entry.item.equipped);
  }

  public getTier(item: any): number | null {
    return getItemTier(item);
  }

  public getSellValue(item: any): number {
    return getSellPrice(item?.price);
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
        onComplete: () => this.gameStateService.shop.closeSellList(),
      });
    } else {
      this.gameStateService.shop.closeSellList();
    }
  }

  public selectForSell(index: number): void {
    this.gameStateService.shop.sellConfirmIndex.set(index);
  }

  public cancelSell(): void {
    this.gameStateService.shop.sellConfirmIndex.set(null);
  }

  public confirmSell(): void {
    const index = this.confirmIndex();
    if (index !== null) {
      this.gameStateService.shop.sellItem(index);
    }
  }
}

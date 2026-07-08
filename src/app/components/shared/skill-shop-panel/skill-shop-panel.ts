import { Component, ElementRef, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { GameStateService } from '../../../services/game-state.service';
import { getItemTier } from '../../../utils/item-display.util';

/**
 * @component SkillShopPanel
 * @description Skill-Shop-Dialog im Magie-Laden: bietet 3 zufällige Spells
 * aus allen Kategorien/Tiers zum Erlernen an (analog zum CraftingPanel im
 * Aufbau, aber ohne Drag&Drop — hier reicht ein Klick auf "Kaufen").
 */
@Component({
  selector: 'app-skill-shop-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skill-shop-panel.html',
  styleUrl: './skill-shop-panel.scss',
})
export class SkillShopPanel {
  public gameStateService = inject(GameStateService);
  private el = inject(ElementRef);

  public show = this.gameStateService.shop.skillShopPanelShow;
  public offers = this.gameStateService.shop.currentSkillShopItems;

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
        onComplete: () => this.gameStateService.shop.closeSkillShop(),
      });
    } else {
      this.gameStateService.shop.closeSkillShop();
    }
  }

  public buy(index: number): void {
    this.gameStateService.shop.buySkill(index);
  }

  public getTier(spell: any): number | null {
    return getItemTier(spell);
  }

  public isAlreadyKnown(spell: any): boolean {
    return this.gameStateService.skills.spells().some((s: any) => s.id === spell?.id);
  }

  public canAfford(spell: any): boolean {
    return this.gameStateService.wallet.gold() >= (spell?.price ?? 0);
  }

  /** Farbklasse fürs Element (analog zur Spell-Liste im Skills-Screen). */
  public elementColor(spell: any): string {
    if (spell?.effectType === 'PHYSICAL_DAMAGE') return 'text-orange-400';
    if (spell?.effectType === 'HEAL') return 'text-emerald-400';
    switch (spell?.effectValues?.element) {
      case 'fire': return 'text-red-500';
      case 'cold': return 'text-cyan-400';
      case 'lightning': return 'text-yellow-400';
      case 'chaos': return 'text-purple-500';
      default: return 'text-zinc-300';
    }
  }
}

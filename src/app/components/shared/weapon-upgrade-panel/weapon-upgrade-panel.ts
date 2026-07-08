import { Component, ElementRef, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { GameStateService } from '../../../services/game-state.service';
import { getItemTier } from '../../../utils/item-display.util';
import { getStatColor, getStatValue, hasPositiveStats, hasNegativeStats, STAT_DEFINITIONS } from '../../../utils/stat-color.util';

/**
 * @component WeaponUpgradePanel
 * @description Qualitäts-Upgrade-Dialog im Schmied: Waffe + passendes
 * Material (Item-Schleifpapier für physische, Item-UpgradeCreme für
 * magische Waffen) auswählen, Upgrade bestätigen → +1 Qualitätsstufe
 * (+5% Schadens-Range auf beiden Seiten). Ein-/Ausblenden per GSAP, exakt
 * nach dem Muster von CraftingPanel.
 */
@Component({
  selector: 'app-weapon-upgrade-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weapon-upgrade-panel.html',
  styleUrl: './weapon-upgrade-panel.scss',
})
export class WeaponUpgradePanel {
  public gameStateService = inject(GameStateService);
  private el = inject(ElementRef);

  public show = this.gameStateService.weaponUpgrade.panelShow;
  public slots = this.gameStateService.weaponUpgrade.slots;
  public upgradeResultItem = this.gameStateService.weaponUpgrade.upgradeResultItem;

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
    gsap.fromTo(target, { opacity: 0, y: 40, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.3 });
  }

  public get upgradableWeapons(): { item: any; index: number }[] {
    return this.gameStateService.weaponUpgrade.upgradableWeapons;
  }

  public get availableMaterials(): { item: any; index: number }[] {
    return this.gameStateService.weaponUpgrade.availableMaterials;
  }

  public get canUpgrade(): boolean {
    return this.gameStateService.weaponUpgrade.canUpgrade;
  }

  public get requiredMaterialType(): string | null {
    return this.gameStateService.weaponUpgrade.requiredMaterialType;
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

  public selectWeapon(index: number): void {
    this.gameStateService.weaponUpgrade.placeWeaponInSlot(index);
  }

  public selectMaterial(index: number): void {
    this.gameStateService.weaponUpgrade.placeMaterialInSlot(index);
  }

  public clearWeaponSlot(): void {
    this.gameStateService.weaponUpgrade.returnWeaponToInventory();
  }

  public clearMaterialSlot(): void {
    this.gameStateService.weaponUpgrade.returnMaterialToInventory();
  }

  public upgrade(): void {
    this.gameStateService.weaponUpgrade.upgradeItem();
  }

  public closeResult(): void {
    this.gameStateService.weaponUpgrade.upgradeResultItem.set(null);
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
        onComplete: () => this.gameStateService.weaponUpgrade.closePanel(),
      });
    } else {
      this.gameStateService.weaponUpgrade.closePanel();
    }
  }
}

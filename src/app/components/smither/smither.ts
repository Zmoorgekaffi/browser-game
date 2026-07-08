import { Component, OnInit, inject, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ShopItem } from '../shared/shop-item/shop-item';
import { ItemInfoCard } from '../shared/item-info-card/item-info-card';
import { AnimationObject } from '../shared/animation-object/animation-object';
import { LoadingScreen } from '../shared/loading-screen/loading-screen';
import { SellPanel } from '../shared/sell-panel/sell-panel';
import { CraftingPanel } from '../shared/crafting-panel/crafting-panel';
import { WeaponUpgradePanel } from '../shared/weapon-upgrade-panel/weapon-upgrade-panel';
import { AssetPreloaderService } from '../../services/asset-preloader.service';
import { framePaths, pad } from '../../utils/frame-paths.util';

import chestTier1 from '../../../../public/item-data/equipment/chest/chest_tier1.json';
import chestTier2 from '../../../../public/item-data/equipment/chest/chest_tier2.json';
import chestTier3 from '../../../../public/item-data/equipment/chest/chest_tier3.json';
import chestTier4 from '../../../../public/item-data/equipment/chest/chest_tier4.json';
import chestTier5 from '../../../../public/item-data/equipment/chest/chest_tier5.json';
import legTier1 from '../../../../public/item-data/equipment/leg/leg_tier1.json';
import legTier2 from '../../../../public/item-data/equipment/leg/leg_tier2.json';
import legTier3 from '../../../../public/item-data/equipment/leg/leg_tier3.json';
import legTier4 from '../../../../public/item-data/equipment/leg/leg_tier4.json';
import legTier5 from '../../../../public/item-data/equipment/leg/leg_tier5.json';

const weaponsData: any[] = [
  ...chestTier1,
  ...chestTier2,
  ...chestTier3,
  ...chestTier4,
  ...chestTier5,
  ...legTier1,
  ...legTier2,
  ...legTier3,
  ...legTier4,
  ...legTier5,
];

/**
 * @component Smither
 * @description Schmiede: begrüßender Schmied (Sprite-Animation) und
 * das aktuelle Angebot aus dem ShopService.
 */
@Component({
  selector: 'app-smither',
  standalone: true,
  imports: [ShopItem, ItemInfoCard, AnimationObject, LoadingScreen, SellPanel, CraftingPanel, WeaponUpgradePanel],
  templateUrl: './smither.html',
  styleUrl: './smither.scss',
})
export class Smither implements OnInit {
  public gameStateService = inject(GameStateService);
  private preloader = inject(AssetPreloaderService);

  /** 🆕 Solange true zeigt das Template nur den Ladebildschirm. */
  public isLoading = signal<boolean>(true);

  // Bindet sich live an das Waffen-Signal aus dem Service!
  currentShopItems = this.gameStateService.shop.currentSmitherItems;

  /**
   * Greet-Animation: sprite_01 ... sprite_15, danach sprite_17 und
   * sprite_18 — sprite_16 existiert nicht und wird bewusst übersprungen.
   */
  greetAnimationPaths: any[] = [
    ...framePaths(15, (i) => `imgs/smither/merchant/greet/sprite_${pad(i, 2)}.webp`, 1),
    'imgs/smither/merchant/greet/sprite_17.webp',
    'imgs/smither/merchant/greet/sprite_18.webp',
  ];

  async ngOnInit(): Promise<void> {
    // 🆕 Hintergrund, Schmied-Frames und (falls schon da) die Item-Bilder
    // vorladen — solange läuft der Ladebildschirm
    await this.preloader.preloadImages([
      'imgs/smither/smither_0.webp',
      ...this.greetAnimationPaths,
      ...(this.currentShopItems() ?? []).map((item: any) => item?.['img-path']),
    ]);
    this.isLoading.set(false);
  }
}

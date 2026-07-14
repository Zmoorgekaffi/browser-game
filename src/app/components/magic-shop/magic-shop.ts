import { Component, OnInit, inject, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ShopItem } from '../shared/shop-item/shop-item';
import { ItemInfoCard } from '../shared/item-info-card/item-info-card';
import { AnimationObject } from '../shared/animation-object/animation-object';
import { LoadingScreen } from '../shared/loading-screen/loading-screen';
import { SellPanel } from '../shared/sell-panel/sell-panel';
import { CraftingPanel } from '../shared/crafting-panel/crafting-panel';
import { SkillShopPanel } from '../shared/skill-shop-panel/skill-shop-panel';
import { AssetPreloaderService } from '../../services/asset-preloader.service';
import { framePaths, pad } from '../../utils/frame-paths.util';

import necklaceTier1 from '../../../../public/item-data/equipment/necklace/necklace_tier1.json';
import necklaceTier2 from '../../../../public/item-data/equipment/necklace/necklace_tier2.json';
import necklaceTier3 from '../../../../public/item-data/equipment/necklace/necklace_tier3.json';
import necklaceTier4 from '../../../../public/item-data/equipment/necklace/necklace_tier4.json';
import necklaceTier5 from '../../../../public/item-data/equipment/necklace/necklace_tier5.json';
import ringTier1 from '../../../../public/item-data/equipment/ring/ring_tier1.json';
import ringTier2 from '../../../../public/item-data/equipment/ring/ring_tier2.json';
import ringTier3 from '../../../../public/item-data/equipment/ring/ring_tier3.json';
import ringTier4 from '../../../../public/item-data/equipment/ring/ring_tier4.json';
import ringTier5 from '../../../../public/item-data/equipment/ring/ring_tier5.json';

/**
 * @component MagicShop
 * @description Magie-Laden: begrüßender Händler (Sprite-Animation) und
 * das aktuelle Amulett-Angebot aus dem ShopService.
 */
@Component({
  selector: 'app-magic-shop',
  standalone: true,
  imports: [ShopItem, ItemInfoCard, AnimationObject, LoadingScreen, SellPanel, CraftingPanel, SkillShopPanel],
  templateUrl: './magic-shop.html',
  styleUrl: './magic-shop.scss',
})
export class MagicShop implements OnInit {
  public gameStateService = inject(GameStateService);
  private preloader = inject(AssetPreloaderService);

  /** 🆕 Solange true zeigt das Template nur den Ladebildschirm. */
  public isLoading = signal<boolean>(true);

  amuletsArray: any[] = [];
  amuletsMap: Record<string, any> = {};

  /**
   * Greet-Animation: frame-001 ... frame-015, danach nochmal frame-001
   * für einen sauberen Loop-Übergang.
   */
  greetAnimationPaths: any[] = [
    ...framePaths(37, (i) => `imgs/magic-shop/merchant/greet/frame_0${pad(i, 3)}.webp`, 1),
    'imgs/magic-shop/merchant/greet/frame_0001.webp',
  ];

  // Direkt das Signal binden!
  currentShopItems = this.gameStateService.shop.currentMagicItems;

  async ngOnInit(): Promise<void> {
    this.amuletsArray = [
      ...necklaceTier1, ...necklaceTier2, ...necklaceTier3, ...necklaceTier4, ...necklaceTier5,
      ...ringTier1, ...ringTier2, ...ringTier3, ...ringTier4, ...ringTier5,
    ];
    this.gameStateService.utility.mapArray(this.amuletsMap, this.amuletsArray);

    // 🆕 Hintergrund, Händler-Frames und (falls schon da) die Item-Bilder
    // vorladen — solange läuft der Ladebildschirm
    await this.preloader.preloadImages([
      'imgs/magic-shop/magic-shop_1.webp',
      ...this.greetAnimationPaths,
      ...(this.currentShopItems() ?? []).map((item: any) => item?.['img-path']),
    ]);
    this.isLoading.set(false);
  }
}

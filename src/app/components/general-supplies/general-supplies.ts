import { Component, OnInit, inject, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ShopItem } from '../shared/shop-item/shop-item';
import { ItemInfoCard } from '../shared/item-info-card/item-info-card';
import { AnimationObject } from '../shared/animation-object/animation-object';
import { LoadingScreen } from '../shared/loading-screen/loading-screen';
import { SellPanel } from '../shared/sell-panel/sell-panel';
import { CraftingPanel } from '../shared/crafting-panel/crafting-panel';
import { AssetPreloaderService } from '../../services/asset-preloader.service';
import { framePaths } from '../../utils/frame-paths.util';

import headTier1 from '../../../../public/item-data/equipment/head/head_tier1.json';
import headTier2 from '../../../../public/item-data/equipment/head/head_tier2.json';
import headTier3 from '../../../../public/item-data/equipment/head/head_tier3.json';
import headTier4 from '../../../../public/item-data/equipment/head/head_tier4.json';
import headTier5 from '../../../../public/item-data/equipment/head/head_tier5.json';
import glovesTier1 from '../../../../public/item-data/equipment/gloves/gloves_tier1.json';
import glovesTier2 from '../../../../public/item-data/equipment/gloves/gloves_tier2.json';
import glovesTier3 from '../../../../public/item-data/equipment/gloves/gloves_tier3.json';
import glovesTier4 from '../../../../public/item-data/equipment/gloves/gloves_tier4.json';
import glovesTier5 from '../../../../public/item-data/equipment/gloves/gloves_tier5.json';

const supplies: any[] = [
  ...headTier1, ...headTier2, ...headTier3, ...headTier4, ...headTier5,
  ...glovesTier1, ...glovesTier2, ...glovesTier3, ...glovesTier4, ...glovesTier5,
];

/**
 * @component GeneralSupplies
 * @description Gemischtwaren-Laden: begrüßender Händler (Sprite-Animation)
 * und das aktuelle Angebot aus dem ShopService.
 */
@Component({
  selector: 'app-general-supplies',
  standalone: true,
  imports: [ShopItem, ItemInfoCard, AnimationObject, LoadingScreen, SellPanel, CraftingPanel],
  templateUrl: './general-supplies.html',
  styleUrl: './general-supplies.scss',
})
export class GeneralSupplies implements OnInit {
  public gameStateService = inject(GameStateService);
  private preloader = inject(AssetPreloaderService);

  /** 🆕 Solange true zeigt das Template nur den Ladebildschirm. */
  public isLoading = signal<boolean>(true);

  suppliesArray: any[] = [];
  suppliesMap: Record<string, any> = {};

  /** Greet-Animation: sprite_1.png ... sprite_11.png. */
  greetAnimationPaths: any[] = framePaths(
    11,
    (i) => `imgs/general-supplies/merchant-animations/hello/sprite_${i}.png`,
    1,
  );

  // Bindet sich live an das Alchemist/Supplies-Signal aus dem Service!
  currentShopItems = this.gameStateService.shop.currentGeneralSuppliesItems;

  async ngOnInit(): Promise<void> {
    this.suppliesArray = supplies;
    this.gameStateService.utility.mapArray(this.suppliesMap, this.suppliesArray);

    // 🆕 Hintergrund, Händler-Frames und (falls schon da) die Item-Bilder
    // vorladen — solange läuft der Ladebildschirm
    await this.preloader.preloadImages([
      'imgs/general-supplies/general-supplies_0.webp',
      ...this.greetAnimationPaths,
      ...(this.currentShopItems() ?? []).map((item: any) => item?.['img-path']),
    ]);
    this.isLoading.set(false);
  }
}

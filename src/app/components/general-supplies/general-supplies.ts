import { Component, OnInit, inject, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ShopItem } from '../shared/shop-item/shop-item';
import { ItemInfoCard } from '../shared/item-info-card/item-info-card';
import { AnimationObject } from '../shared/animation-object/animation-object';
import { LoadingScreen } from '../shared/loading-screen/loading-screen';
import { AssetPreloaderService } from '../../services/asset-preloader.service';
import { framePaths } from '../../utils/frame-paths.util';

import supplies from '../../../../public/item-data/head.json';

/**
 * @component GeneralSupplies
 * @description Gemischtwaren-Laden: begrüßender Händler (Sprite-Animation)
 * und das aktuelle Angebot aus dem ShopService.
 */
@Component({
  selector: 'app-general-supplies',
  standalone: true,
  imports: [ShopItem, ItemInfoCard, AnimationObject, LoadingScreen],
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

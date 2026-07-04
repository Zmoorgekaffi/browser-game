import { Component, OnInit, inject, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ShopItem } from '../shared/shop-item/shop-item';
import { ItemInfoCard } from '../shared/item-info-card/item-info-card';
import { AnimationObject } from '../shared/animation-object/animation-object';
import { LoadingScreen } from '../shared/loading-screen/loading-screen';
import { SellPanel } from '../shared/sell-panel/sell-panel';
import { AssetPreloaderService } from '../../services/asset-preloader.service';
import { framePaths, pad } from '../../utils/frame-paths.util';

import necklace from '../../../../public/item-data/necklace.json';

/**
 * @component MagicShop
 * @description Magie-Laden: begrüßender Händler (Sprite-Animation) und
 * das aktuelle Amulett-Angebot aus dem ShopService.
 */
@Component({
  selector: 'app-magic-shop',
  standalone: true,
  imports: [ShopItem, ItemInfoCard, AnimationObject, LoadingScreen, SellPanel],
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
    ...framePaths(15, (i) => `imgs/magic-shop/merchant/greet/frame-${pad(i, 3)}-Photoroom.webp`, 1),
    'imgs/magic-shop/merchant/greet/frame-001-Photoroom.webp',
  ];

  // Direkt das Signal binden!
  currentShopItems = this.gameStateService.shop.currentMagicItems;

  async ngOnInit(): Promise<void> {
    this.amuletsArray = necklace;
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

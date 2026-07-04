import { Component, OnInit, inject, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ShopItem } from '../shared/shop-item/shop-item';
import { ItemInfoCard } from '../shared/item-info-card/item-info-card';
import { AnimationObject } from '../shared/animation-object/animation-object';
import { LoadingScreen } from '../shared/loading-screen/loading-screen';
import { SellPanel } from '../shared/sell-panel/sell-panel';
import { AssetPreloaderService } from '../../services/asset-preloader.service';
import { framePaths, pad } from '../../utils/frame-paths.util';

import weaponsData from '../../../../public/item-data/head.json';

/**
 * @component Smither
 * @description Schmiede: begrüßender Schmied (Sprite-Animation) und
 * das aktuelle Angebot aus dem ShopService.
 */
@Component({
  selector: 'app-smither',
  standalone: true,
  imports: [ShopItem, ItemInfoCard, AnimationObject, LoadingScreen, SellPanel],
  templateUrl: './smither.html',
  styleUrl: './smither.scss',
})
export class Smither implements OnInit {
  public gameStateService = inject(GameStateService);
  private preloader = inject(AssetPreloaderService);

  /** 🆕 Solange true zeigt das Template nur den Ladebildschirm. */
  public isLoading = signal<boolean>(true);

  weaponsArray: any[] = [];
  weaponsMap: Record<string, any> = {};

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
    this.weaponsArray = weaponsData;
    this.gameStateService.utility.mapArray(this.weaponsMap, this.weaponsArray);

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

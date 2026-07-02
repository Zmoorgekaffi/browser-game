import { Component, OnInit, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ShopItem } from '../shared/shop-item/shop-item';
import { ItemInfoCard } from '../shared/item-info-card/item-info-card';
import { AnimationObject } from '../shared/animation-object/animation-object';
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
  imports: [ShopItem, ItemInfoCard, AnimationObject],
  templateUrl: './magic-shop.html',
  styleUrl: './magic-shop.scss',
})
export class MagicShop implements OnInit {
  public gameStateService = inject(GameStateService);

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

  ngOnInit() {
    this.amuletsArray = necklace;
    this.gameStateService.utility.mapArray(this.amuletsMap, this.amuletsArray);
  }
}

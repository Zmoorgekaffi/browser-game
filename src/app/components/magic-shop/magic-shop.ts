import { Component, OnInit, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ShopItem } from '../shared/shop-item/shop-item';
import { ItemInfoCard } from '../shared/item-info-card/item-info-card';
import { AnimationObject } from '../shared/animation-object/animation-object';

import necklace from '../../../../public/item-data/necklace.json';

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

  //Animation paths:
  greetAnimationPaths: any[] = [
    '/imgs/magic-shop/merchant/greet/frame-001-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-002-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-003-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-004-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-005-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-006-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-007-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-008-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-009-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-010-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-011-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-012-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-013-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-014-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-015-Photoroom.webp',
    '/imgs/magic-shop/merchant/greet/frame-001-Photoroom.webp',
  ];

  // Direkt das Signal binden!
  currentShopItems = this.gameStateService.shop.currentMagicItems;

  ngOnInit() {
    this.amuletsArray = necklace;
    this.gameStateService.utility.mapArray(this.amuletsMap, this.amuletsArray);
  }
}

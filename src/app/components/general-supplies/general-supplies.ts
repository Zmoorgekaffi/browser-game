import { Component, OnInit, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ShopItem } from '../shared/shop-item/shop-item';
import { ItemInfoCard } from '../shared/item-info-card/item-info-card';
import { AnimationObject } from '../shared/animation-object/animation-object';

import supplies from '../../../../public/item-data/head.json';


@Component({
  selector: 'app-general-supplies',
  standalone: true,
  imports: [ShopItem, ItemInfoCard, AnimationObject],
  templateUrl: './general-supplies.html',
  styleUrl: './general-supplies.scss',
})
export class GeneralSupplies implements OnInit {
  public gameStateService = inject(GameStateService);

  suppliesArray: any[] = [];
  suppliesMap: Record<string, any> = {};

  //Animation paths:
  greetAnimationPaths: any[] = [
    '/imgs/general-supplies/merchant-animations/hello/sprite_1.png',
    '/imgs/general-supplies/merchant-animations/hello/sprite_2.png',
    '/imgs/general-supplies/merchant-animations/hello/sprite_3.png',
    '/imgs/general-supplies/merchant-animations/hello/sprite_4.png',
    '/imgs/general-supplies/merchant-animations/hello/sprite_5.png',
    '/imgs/general-supplies/merchant-animations/hello/sprite_6.png',
    '/imgs/general-supplies/merchant-animations/hello/sprite_7.png',
    '/imgs/general-supplies/merchant-animations/hello/sprite_8.png',
    '/imgs/general-supplies/merchant-animations/hello/sprite_9.png',
    '/imgs/general-supplies/merchant-animations/hello/sprite_10.png',
    '/imgs/general-supplies/merchant-animations/hello/sprite_11.png',
  ];

  // Bindet sich live an das Alchemist/Supplies-Signal aus dem Service!
  currentShopItems = this.gameStateService.shop.currentGeneralSuppliesItems;

  ngOnInit() {
    this.suppliesArray = supplies;
    this.gameStateService.utility.mapArray(this.suppliesMap, this.suppliesArray);
  }
}

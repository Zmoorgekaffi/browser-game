import { Component, OnInit, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ShopItem } from '../shared/shop-item/shop-item';
import { ItemInfoCard } from '../shared/item-info-card/item-info-card';
import { AnimationObject } from '../shared/animation-object/animation-object';

import weaponsData from '../../../../public/item-data/head.json';

@Component({
  selector: 'app-smither',
  standalone: true,
  imports: [ShopItem, ItemInfoCard, AnimationObject],
  templateUrl: './smither.html',
  styleUrl: './smither.scss',
})
export class Smither implements OnInit {
  public gameStateService = inject(GameStateService);

  weaponsArray: any[] = [];
  weaponsMap: Record<string, any> = {};

  // Bindet sich live an das Waffen-Signal aus dem Service!
  currentShopItems = this.gameStateService.shop.currentSmitherItems;

  //Animation paths:
  greetAnimationPaths: any[] = [
    'imgs/smither/merchant/greet/sprite_01.webp',
    'imgs/smither/merchant/greet/sprite_02.webp',
    'imgs/smither/merchant/greet/sprite_03.webp',
    'imgs/smither/merchant/greet/sprite_04.webp',
    'imgs/smither/merchant/greet/sprite_05.webp',
    'imgs/smither/merchant/greet/sprite_06.webp',
    'imgs/smither/merchant/greet/sprite_07.webp',
    'imgs/smither/merchant/greet/sprite_08.webp',
    'imgs/smither/merchant/greet/sprite_09.webp',
    'imgs/smither/merchant/greet/sprite_10.webp',
    'imgs/smither/merchant/greet/sprite_11.webp',
    'imgs/smither/merchant/greet/sprite_12.webp',
    'imgs/smither/merchant/greet/sprite_13.webp',
    'imgs/smither/merchant/greet/sprite_14.webp',
    'imgs/smither/merchant/greet/sprite_15.webp',
    'imgs/smither/merchant/greet/sprite_17.webp',
    'imgs/smither/merchant/greet/sprite_18.webp',
  ];

  ngOnInit() {
    this.weaponsArray = weaponsData;
    this.gameStateService.utility.mapArray(this.weaponsMap, this.weaponsArray);
  }
}

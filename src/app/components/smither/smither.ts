import { Component, OnInit, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ShopItem } from '../shared/shop-item/shop-item';
import { ItemInfoCard } from '../shared/item-info-card/item-info-card';
import { AnimationObject } from '../shared/animation-object/animation-object';
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

  /**
   * Greet-Animation: sprite_01 ... sprite_15, danach sprite_17 und
   * sprite_18 — sprite_16 existiert nicht und wird bewusst übersprungen.
   */
  greetAnimationPaths: any[] = [
    ...framePaths(15, (i) => `imgs/smither/merchant/greet/sprite_${pad(i, 2)}.webp`, 1),
    'imgs/smither/merchant/greet/sprite_17.webp',
    'imgs/smither/merchant/greet/sprite_18.webp',
  ];

  ngOnInit() {
    this.weaponsArray = weaponsData;
    this.gameStateService.utility.mapArray(this.weaponsMap, this.weaponsArray);
  }
}

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

import healthPotionsTier1 from '../../../../public/item-data/potions/health/healthpotions_t1.json';
import healthPotionsTier2 from '../../../../public/item-data/potions/health/healthpotions_t2.json';
import healthPotionsTier3 from '../../../../public/item-data/potions/health/healthpotions_t3.json';
import healthPotionsTier4 from '../../../../public/item-data/potions/health/healthpotions_t4.json';
import healthPotionsTier5 from '../../../../public/item-data/potions/health/healthpotions_t5.json';
import manaPotionsTier1 from '../../../../public/item-data/potions/mana/manapotions_t1.json';
import manaPotionsTier2 from '../../../../public/item-data/potions/mana/manapotions_t2.json';
import manaPotionsTier3 from '../../../../public/item-data/potions/mana/manapotions_t3.json';
import manaPotionsTier4 from '../../../../public/item-data/potions/mana/manapotions_t4.json';
import manaPotionsTier5 from '../../../../public/item-data/potions/mana/manapotions_t5.json';
import buffPotionsTier1 from '../../../../public/item-data/potions/buff/buffpotions_t1.json';
import buffPotionsTier2 from '../../../../public/item-data/potions/buff/buffpotions_t2.json';
import buffPotionsTier3 from '../../../../public/item-data/potions/buff/buffpotions_t3.json';
import buffPotionsTier4 from '../../../../public/item-data/potions/buff/buffpotions_t4.json';
import buffPotionsTier5 from '../../../../public/item-data/potions/buff/buffpotions_t5.json';
import materials from '../../../../public/item-data/materials.json';

// 🧪 Gemischtwaren ist der reine Verbrauchsgüter-Laden (Tränke + Materialien) —
// Ausrüstung (Kopf/Handschuhe) ist zum Schmied gewandert (siehe shop.service.ts).
const supplies: any[] = [
  ...healthPotionsTier1, ...healthPotionsTier2, ...healthPotionsTier3, ...healthPotionsTier4, ...healthPotionsTier5,
  ...manaPotionsTier1, ...manaPotionsTier2, ...manaPotionsTier3, ...manaPotionsTier4, ...manaPotionsTier5,
  ...buffPotionsTier1, ...buffPotionsTier2, ...buffPotionsTier3, ...buffPotionsTier4, ...buffPotionsTier5,
  ...materials,
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

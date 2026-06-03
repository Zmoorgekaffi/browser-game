import { Component, OnInit, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ShopItem } from '../shared/shop-item/shop-item';
import { ItemInfoCard } from '../shared/item-info-card/item-info-card';
import amuletsData from '../../../../public/item-data/amulets.json';

@Component({
  selector: 'app-magic-shop',
  standalone: true,
  imports: [ShopItem, ItemInfoCard],
  templateUrl: './magic-shop.html',
  styleUrl: './magic-shop.scss',
})
export class MagicShop implements OnInit {
  public gameStateService = inject(GameStateService);

  amuletsArray: any[] = [];
  amuletsMap: Record<string, any> = {};

  // Direkt das Signal binden!
  currentShopItems = this.gameStateService.shop.currentMagicItems;

  ngOnInit() {
    this.amuletsArray = amuletsData;
    this.gameStateService.utility.mapArray(this.amuletsMap, this.amuletsArray);
  }
}
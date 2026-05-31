import { Component } from '@angular/core';
import { UtilityService } from '../../services/utility.service';
import { ShopService } from '../../services/shop.service';
import { ShopItem } from '../shared/shop-item/shop-item';

// Import the JSON data
import amuletsData from '../../../../public/item-data/amulets.json';
@Component({
  selector: 'app-magic-shop',
  imports: [ShopItem],
  templateUrl: './magic-shop.html',
  styleUrl: './magic-shop.scss',
})
export class MagicShop {
  // Das Array für dein HTML-Template (bleibt mit shopItems[0] bedienbar)
  amuletsArray: any[] = [];

  // Das Objekt für die schnelle Suche im TypeScript
  amuletsMap: Record<string, any> = {};

  // Aktuell verfügbare Items im Shop
  currentShopItems: any[] = [];

  constructor(
    private shopService: ShopService,
    private utilityService: UtilityService,
  ) {
    this.amuletsArray = amuletsData;
    utilityService.mapArray(this.amuletsMap, this.amuletsArray); // Erstelle das Map-Objekt für schnelle Suche


    this.setUpCurrentShopItems();
    console.log(this.currentShopItems);
  }

  //HOLT GRAD NUR AMULETTEN
  setUpCurrentShopItems() {
    for (let i = 0; i < 6; i++) {
      this.currentShopItems.push(
        amuletsData[this.utilityService.getRandomIndex(this.amuletsArray)],
      );
    }
  }
}

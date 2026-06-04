import { Component, OnInit, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ShopItem } from '../shared/shop-item/shop-item';
import { ItemInfoCard } from '../shared/item-info-card/item-info-card';
import weaponsData from '../../../../public/item-data/amulets.json';

@Component({
  selector: 'app-smither',
  standalone: true,
  imports: [ShopItem, ItemInfoCard],
  templateUrl: './smither.html',
  styleUrl: './smither.scss',
})
export class Smither implements OnInit {
  public gameStateService = inject(GameStateService);

  weaponsArray: any[] = [];
  weaponsMap: Record<string, any> = {};
  


  // Bindet sich live an das Waffen-Signal aus dem Service!
  currentShopItems = this.gameStateService.shop.currentWeaponItems;

  ngOnInit() {
    this.weaponsArray = weaponsData;
    this.gameStateService.utility.mapArray(this.weaponsMap, this.weaponsArray);
    console.log('smither array ist: ',this.currentShopItems() && this.currentShopItems().length >= 5);
    
  }

}
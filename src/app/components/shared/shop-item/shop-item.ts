import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { GameStateService } from '../../../services/game-state.service';


/**
 * @component ShopItem
 * @description Einzelnes Item im Shop-Regal (absolut positioniert über
 * x/y). Klick öffnet die Item-Info-Card mit den Details.
 */
@Component({
  selector: 'app-shop-item',
  imports: [CommonModule],
  templateUrl: './shop-item.html',
  styleUrl: './shop-item.scss',
})
export class ShopItem {
  @Input() itemObject: any = {};
  @Input() x: number = 0;
  @Input() y: number = 0;
  @Input() devmode: boolean = false;

  constructor(public gameStateService: GameStateService) {}

  /** Zeigt die Info-Card für das angeklickte Item an. */
  showInfoCard(item:any) {
    this.gameStateService.shop.currentDisplayedItem.set(item);
    this.gameStateService.shop.itemInfoCardShow.set(true);
  }
}

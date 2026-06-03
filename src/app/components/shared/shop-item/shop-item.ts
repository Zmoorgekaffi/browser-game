import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { GameStateService } from '../../../services/game-state.service';


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

  showInfoCard(item:any) {
    // .update() liest den aktuellen Wert und setzt das Gegenteil (!) ein
    this.gameStateService.shop.currentDisplayedItem.set(item);
    this.gameStateService.shop.itemInfoCardShow.set(true);
  }
}

import { Component, Signal } from '@angular/core';
import { GameStateService } from '../../../services/game-state.service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-item-info-card',
  imports: [CommonModule],
  templateUrl: './item-info-card.html',
  styleUrl: './item-info-card.scss',
})
export class ItemInfoCard {

  show: Signal<boolean>;
  currentDisplayedItem: any;  


  constructor(private gameStateService: GameStateService) {
    this.show = this.gameStateService.shop.itemInfoCardShow;
    this.currentDisplayedItem = this.gameStateService.shop.currentDisplayedItem;
  }

}

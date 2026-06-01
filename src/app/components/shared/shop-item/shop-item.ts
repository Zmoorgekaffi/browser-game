import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ItemInfoCard } from '../item-info-card/item-info-card';


@Component({
  selector: 'app-shop-item',
  imports: [CommonModule,ItemInfoCard],
  templateUrl: './shop-item.html',
  styleUrl: './shop-item.scss',
})

export class ShopItem {
  @Input() itemObject: any = {};
  @Input() x: number = 0;
  @Input() y: number = 0;
  @Input() devmode: boolean = false;
}



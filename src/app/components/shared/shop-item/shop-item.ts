import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';


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
}



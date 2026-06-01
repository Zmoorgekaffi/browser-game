import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-item-info-card',
  imports: [],
  templateUrl: './item-info-card.html',
  styleUrl: './item-info-card.scss',
})
export class ItemInfoCard {
  @Input() itemObject: any = {};
}

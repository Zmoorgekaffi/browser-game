import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-inventar-item',
  imports: [],
  templateUrl: './inventar-item.html',
  styleUrl: './inventar-item.scss',
})
export class InventarItem {
  @Input() item = {};
}

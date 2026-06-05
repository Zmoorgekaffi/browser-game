import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-item-slot',
  standalone: true, // Falls du Angular 17/18+ nutzt
  imports: [CommonModule],
  templateUrl: './item-slot.html',
  styleUrl: './item-slot.scss',
})
export class ItemSlot {
  // Inputs definieren (Verwendung der modernen Signal-Inputs)
  x = input.required<number>();
  y = input.required<number>();
  imgPath = input.required<string>();
  width = input.required<string>();
  height = input.required<string>();
  
  // Standardwert ist false
  devmode = input<boolean>(false); 
}
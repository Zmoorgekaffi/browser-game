import { Injectable, signal, computed } from '@angular/core';
import { InventarData } from '../models/game-state.interface';

@Injectable({
  providedIn: 'root'
})
export class InventarService {
  private state = signal<InventarData>({ items: [] });
  
  items = computed(() => this.state().items);

  init(data: InventarData): void {
    this.state.set(data);
  }

  addItem(item: any): void {
    this.state.update(state => {
      const newState = { ...state, items: [...state.items, item] };
      return newState;
    });
  }

  removeItem(itemId: string): void {
    this.state.update(state => {
      const newState = {
        ...state,
        items: state.items.filter(item => item.id !== itemId)
      };
      return newState;
    });
  }
}


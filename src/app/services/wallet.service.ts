import { Injectable, signal, computed } from '@angular/core';
import { WalletData } from '../models/game-state.interface';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private state = signal<WalletData>({ gold: 0, rubies: 0 });

  gold = computed(() => this.state().gold);
  rubies = computed(() => this.state().rubies);

  init(data: WalletData): void {
    this.state.set(data);
  }

  addGold(amount: number): void {
    if (amount <= 0) return;
    
    this.state.update(state => {
      const newState = { ...state, gold: state.gold + amount };
      return newState;
    });
  }

  spendGold(amount: number): boolean {
    if (amount <= 0) return false;
    
    const currentGold = this.state().gold;
    if (currentGold < amount) return false;
    
    this.state.update(state => {
      const newState = { ...state, gold: state.gold - amount };
      return newState;
    });
    
    return true;
  }
}
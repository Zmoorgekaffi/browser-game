import { Injectable, signal, computed } from '@angular/core';
import { WalletData } from '../models/game-state.interface';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private state = signal<WalletData>({ gold: 0, rubies: 0 });
  private activeCharId: string | null = null;

  gold = computed(() => this.state().gold);
  rubies = computed(() => this.state().rubies);

  init(data: WalletData, charId: string): void {
    this.state.set(data || { gold: 0, rubies: 0 });
    this.activeCharId = charId;
  }

  private saveWalletToLocalStorage(updatedState: WalletData) {
    if (this.activeCharId) {
      localStorage.setItem(`${this.activeCharId}_wallet`, JSON.stringify(updatedState));
      console.log('🪙 Wallet im LocalStorage aktualisiert!');
    }
  }

  addGold(amount: number): void {
    if (amount <= 0) return;
    
    this.state.update(state => {
      const newState = { ...state, gold: state.gold + amount };
      this.saveWalletToLocalStorage(newState);
      return newState;
    });
  }

  spendGold(amount: number): boolean {
    if (amount <= 0) return false;
    
    const currentGold = this.state().gold;
    if (currentGold < amount) return false;
    
    let transactionSuccess = false;

    this.state.update(state => {
      if (state.gold >= amount) {
        const newState = { ...state, gold: state.gold - amount };
        this.saveWalletToLocalStorage(newState);
        transactionSuccess = true;
        return newState;
      }
      return state;
    });
    
    return transactionSuccess;
  }
}
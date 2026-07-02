import { Injectable, signal, computed } from '@angular/core';
import { WalletData } from '../models/game-state.interface';

/**
 * @service WalletService
 * @description Verwaltet Gold und Rubine des Charakters inklusive
 * Persistierung im LocalStorage.
 */
@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private state = signal<WalletData>({ gold: 0, rubies: 0 });
  private activeCharId: string | null = null;

  gold = computed(() => this.state().gold);
  rubies = computed(() => this.state().rubies);

  /**
   * Initialisiert die Wallet mit Savegame-Daten.
   *
   * @param data   Wallet-Block aus dem LocalStorage.
   * @param charId ID des aktiven Charakters (für den Storage-Key).
   */
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

  /**
   * Fügt Gold hinzu und speichert sofort.
   *
   * @param amount Betrag > 0, sonst passiert nichts.
   */
  addGold(amount: number): void {
    if (amount <= 0) return;
    
    this.state.update(state => {
      const newState = { ...state, gold: state.gold + amount };
      this.saveWalletToLocalStorage(newState);
      return newState;
    });
  }

  /**
   * Versucht, Gold auszugeben.
   *
   * @param amount Betrag > 0.
   * @returns true, wenn genug Gold vorhanden war und abgebucht wurde.
   */
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
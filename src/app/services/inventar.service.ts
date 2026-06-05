import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InventarService {
  public inventar: WritableSignal<any> = signal<any>({ items: [] });
  private activeCharId: string | null = null;

  init(data: any, charId: string): void {
    this.inventar.set(data || { items: [] });
    this.activeCharId = charId;
  }

  /**
   * Fügt ein Item dem Inventar hinzu und speichert es ab
   */
  public addItemToInventar(newItem: any): void {
    this.inventar.update(currentInv => {
      const updatedItems = currentInv?.items ? [...currentInv.items, newItem] : [newItem];
      const newInventar = { ...currentInv, items: updatedItems };

      if (this.activeCharId) {
        localStorage.setItem(`${this.activeCharId}_inventar`, JSON.stringify(newInventar));
        console.log('🎒 Inventar im LocalStorage aktualisiert!');
      }

      return newInventar;
    });
  }
}
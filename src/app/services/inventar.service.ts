import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InventarService {
  public inventar = signal<any[]>([]);

  init(data: any[]): void {
    this.inventar.set(data);
  }

  // Diese Methode fügt ein neues Objekt hinzu
  addItem(item: { name: string; [key: string]: any }): void {
    this.inventar.update(aktuellesInventar => [...aktuellesInventar, item]);
    
    // Speicher den neuen Zustand direkt im LocalStorage ab
    const charId = sessionStorage.getItem('pixel-quest-currentUser');
    if (charId) {
      localStorage.setItem(`${charId}_inventar`, JSON.stringify(this.inventar()));
    }
  }
}
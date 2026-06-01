import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InventarService {
  // Das Signal hält das Hauptobjekt, welches das 'items'-Array besitzt
  public inventar: WritableSignal<any> = signal<any>({ items: [] });

  // Wird vom GameStateService aufgerufen, um die Daten zu setzen
  init(data: any): void {
    this.inventar.set(data);
  }
}
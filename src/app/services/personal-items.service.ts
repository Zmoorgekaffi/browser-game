import { Injectable, signal, WritableSignal } from '@angular/core';

/**
 * @service PersonalItemsService
 * @description Verwaltet die "persönlichen" (soulbound) Items eines Charakters,
 * die durch Crafting entstehen. Diese Items leben in einer eigenen Liste
 * (getrennt vom normalen Inventar), können aber genauso angezogen oder
 * verkauft werden. Das eigentliche An-/Ausrüsten (inkl. Slot-Konflikten mit
 * dem normalen Inventar) läuft zentral über den InventarService.
 */
@Injectable({
  providedIn: 'root',
})
export class PersonalItemsService {
  /** Die kompletten persönlichen Items ({ items: [...] }). */
  public personalItems: WritableSignal<any> = signal<any>({ items: [] });

  private activeCharId: string | null = null;

  /**
   * Initialisiert die persönlichen Items mit Savegame-Daten.
   *
   * @param data   Personal-Items-Block aus dem LocalStorage.
   * @param charId ID des aktiven Charakters (für den Storage-Key).
   */
  init(data: any, charId: string): void {
    this.activeCharId = charId;
    this.personalItems.set(data && data.items ? data : { items: [] });
  }

  /**
   * Fügt ein frisch gecraftetes Item ans Ende der Liste an und speichert sofort.
   *
   * @param newItem Das neue (bereits fertig aufgebaute) soulbound Item.
   */
  public addItem(newItem: any): void {
    this.personalItems.update((current) => {
      const updatedItems = current?.items ? [...current.items, newItem] : [newItem];
      const updated = { ...current, items: updatedItems };
      this.saveToLocalStorage(updated);
      return updated;
    });
  }

  /**
   * Setzt equipped/assigned-slot für ein Item an einem bestimmten Index.
   * Wird vom InventarService aufgerufen, das die Slot-Konfliktauflösung
   * zentral über beide Item-Quellen hinweg übernimmt.
   *
   * @param index        Index des Items in der Personal-Items-Liste.
   * @param equipped     Neuer equipped-Zustand.
   * @param assignedSlot Zugewiesener Slot (oder null beim Ausziehen).
   */
  public setEquippedAt(index: number, equipped: boolean, assignedSlot: string | null): void {
    this.personalItems.update((current) => {
      if (!current?.items || !current.items[index]) return current;

      const updatedItems = [...current.items];
      updatedItems[index] = { ...updatedItems[index], equipped, 'assigned-slot': assignedSlot };

      const updated = { ...current, items: updatedItems };
      this.saveToLocalStorage(updated);
      return updated;
    });
  }

  /**
   * Entfernt ein persönliches Item endgültig (z.B. beim Verkauf im Shop).
   *
   * @param index Index des Items in der Personal-Items-Liste.
   */
  public removeItemAt(index: number): void {
    this.personalItems.update((current) => {
      if (!current?.items) return current;

      const updatedItems = current.items.filter((_: any, i: number) => i !== index);
      const updated = { ...current, items: updatedItems };
      this.saveToLocalStorage(updated);
      return updated;
    });
  }

  /** Persistiert die persönlichen Items unter dem Key des aktiven Charakters. */
  private saveToLocalStorage(data: any): void {
    if (this.activeCharId) {
      localStorage.setItem(`${this.activeCharId}_personal-items`, JSON.stringify(data));
    }
  }
}

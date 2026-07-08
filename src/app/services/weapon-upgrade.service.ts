import { Injectable, inject, signal } from '@angular/core';
import { InventarService } from './inventar.service';
import { applyQualityScaling } from '../utils/weapon-quality.util';

export type MaterialType = 'grinding' | 'upgrade-creme';

interface UpgradeSlots {
  weapon: any | null;
  material: any | null;
}

/**
 * @service WeaponUpgradeService
 * @description Verwaltet das Qualitäts-Upgrade-Panel im Schmied: 2 Kästchen
 * (Waffe + Material). Physische Waffen verbrauchen Item-Schleifpapier
 * (`material-type: 'grinding'`), Magie-Waffen Item-UpgradeCreme
 * (`material-type: 'upgrade-creme'`). Jede Stufe erhöht `quality` um 1 und
 * damit die Schadens-Range um +5% (siehe `applyQualityScaling`).
 */
@Injectable({
  providedIn: 'root',
})
export class WeaponUpgradeService {
  private inventarService = inject(InventarService);

  /** Sichtbarkeit des Upgrade-Panels. */
  public panelShow = signal<boolean>(false);

  /** Die 2 Kästchen: Waffe + Material. null = leer. */
  public slots = signal<UpgradeSlots>({ weapon: null, material: null });

  /** Zuletzt aufgewertetes Item, für das Ergebnis-Popup. */
  public upgradeResultItem = signal<any | null>(null);

  public openPanel(): void {
    this.panelShow.set(true);
  }

  /** Schließt das Panel, gezogene Items wandern zurück ins Inventar. */
  public closePanel(): void {
    const { weapon, material } = this.slots();
    if (weapon) this.inventarService.addItemToInventar(weapon);
    if (material) this.inventarService.addItemToInventar(material);
    this.slots.set({ weapon: null, material: null });
    this.panelShow.set(false);
  }

  /** Alle nicht ausgerüsteten Inventar-Items mit einem `weapon-type`-Feld. */
  public get upgradableWeapons(): { item: any; index: number }[] {
    const items = this.inventarService.inventar()?.items ?? [];
    return items
      .map((item: any, index: number) => ({ item, index }))
      .filter((entry: { item: any; index: number }) => !entry.item.equipped && !!entry.item['weapon-type']);
  }

  /** Alle Inventar-Items im Material-Slot (`armor-slot: 'material'`). */
  public get availableMaterials(): { item: any; index: number }[] {
    const items = this.inventarService.inventar()?.items ?? [];
    return items
      .map((item: any, index: number) => ({ item, index }))
      .filter((entry: { item: any; index: number }) => entry.item['armor-slot'] === 'material');
  }

  public placeWeaponInSlot(inventarIndex: number): void {
    const items = this.inventarService.inventar()?.items ?? [];
    const item = items[inventarIndex];
    if (!item || item.equipped || !item['weapon-type']) return;

    const current = this.slots().weapon;
    this.inventarService.removeItemFromInventar(inventarIndex);
    if (current) this.inventarService.addItemToInventar(current);

    this.slots.update((s) => ({ ...s, weapon: item }));
  }

  public placeMaterialInSlot(inventarIndex: number): void {
    const items = this.inventarService.inventar()?.items ?? [];
    const item = items[inventarIndex];
    if (!item || item['armor-slot'] !== 'material') return;

    const current = this.slots().material;
    this.inventarService.removeItemFromInventar(inventarIndex);
    if (current) this.inventarService.addItemToInventar(current);

    this.slots.update((s) => ({ ...s, material: item }));
  }

  public returnWeaponToInventory(): void {
    const weapon = this.slots().weapon;
    if (!weapon) return;
    this.inventarService.addItemToInventar(weapon);
    this.slots.update((s) => ({ ...s, weapon: null }));
  }

  public returnMaterialToInventory(): void {
    const material = this.slots().material;
    if (!material) return;
    this.inventarService.addItemToInventar(material);
    this.slots.update((s) => ({ ...s, material: null }));
  }

  /** Welcher Material-Typ für die aktuell eingesetzte Waffe benötigt wird. */
  public get requiredMaterialType(): MaterialType | null {
    const weapon = this.slots().weapon;
    if (!weapon) return null;
    return weapon['weapon-type'] === 'magie' ? 'upgrade-creme' : 'grinding';
  }

  public get canUpgrade(): boolean {
    const { weapon, material } = this.slots();
    if (!weapon || !material) return false;
    return material['material-type'] === this.requiredMaterialType;
  }

  /** Verbraucht Waffe + Material aus den Kästchen und legt die aufgewertete Waffe zurück ins Inventar. */
  public upgradeItem(): void {
    if (!this.canUpgrade) return;

    const { weapon } = this.slots();
    const upgraded = applyQualityScaling({ ...weapon, quality: (weapon.quality ?? 0) + 1 });

    this.inventarService.addItemToInventar(upgraded);
    this.slots.set({ weapon: null, material: null });
    this.upgradeResultItem.set(upgraded);
  }
}

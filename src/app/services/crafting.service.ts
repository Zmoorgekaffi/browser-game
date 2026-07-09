import { Injectable, inject, signal } from '@angular/core';
import { InventarService } from './inventar.service';
import { PersonalItemsService } from './personal-items.service';
import { ItemRequirement, getItemRequirements } from '../utils/item-requirements.util';

interface StatPoolEntry {
  path: string[];
  value: number;
}

/**
 * @service CraftingService
 * @description Verwaltet das Crafting-Panel im Shop: 3 Crafting-Kästchen
 * (links/Basis/rechts), das Ziehen von Items aus dem Inventar hinein sowie
 * die eigentliche Craft-Logik. Das Ergebnis ist ein neues, seelengebundenes
 * ("soulbound") Item in den persönlichen Items des Charakters.
 */
@Injectable({
  providedIn: 'root',
})
export class CraftingService {
  private inventarService = inject(InventarService);
  private personalItemsService = inject(PersonalItemsService);

  /** Sichtbarkeit des Crafting-Panels. */
  public craftingPanelShow = signal<boolean>(false);

  /** Die 3 Crafting-Kästchen: [links, Basis (Mitte), rechts]. null = leer. */
  public slots = signal<(any | null)[]>([null, null, null]);

  /** Zuletzt gecraftetes Item, für das Ergebnis-Popup. */
  public craftResultItem = signal<any | null>(null);

  /** Öffnet das Crafting-Panel. */
  public openCraftingPanel(): void {
    this.craftingPanelShow.set(true);
  }

  /**
   * Schließt das Crafting-Panel. Etwaige bereits in die Kästchen gezogene
   * Items werden dabei zurück ins Inventar gelegt, damit nichts verloren geht.
   */
  public closeCraftingPanel(): void {
    this.slots().forEach((item) => {
      if (item) this.inventarService.addItemToInventar(item);
    });
    this.slots.set([null, null, null]);
    this.craftingPanelShow.set(false);
  }

  /** Alle Inventar-Items, die ins Crafting-Feld gezogen werden dürfen. */
  public get craftableItems(): { item: any; index: number }[] {
    const items = this.inventarService.inventar()?.items ?? [];
    return items
      .map((item: any, index: number) => ({ item, index }))
      .filter((entry: { item: any; index: number }) => !entry.item.equipped && !entry.item.soulbound);
  }

  /**
   * Legt ein Item aus dem Inventar in ein Crafting-Kästchen. Ein evtl. schon
   * dort liegendes Item wandert zurück ins Inventar.
   *
   * @param slotIndex     0 (links), 1 (Basis/Mitte) oder 2 (rechts).
   * @param inventarIndex Index des Items im Inventar-Array.
   */
  public placeItemInSlot(slotIndex: number, inventarIndex: number): void {
    const items = this.inventarService.inventar()?.items ?? [];
    const item = items[inventarIndex];
    if (!item || item.equipped || item.soulbound) return;

    const currentSlotItem = this.slots()[slotIndex];

    this.inventarService.removeItemFromInventar(inventarIndex);
    if (currentSlotItem) this.inventarService.addItemToInventar(currentSlotItem);

    const updatedSlots = [...this.slots()];
    updatedSlots[slotIndex] = item;
    this.slots.set(updatedSlots);
  }

  /** Legt das Item aus einem Kästchen zurück ins Inventar. */
  public returnSlotToInventory(slotIndex: number): void {
    const item = this.slots()[slotIndex];
    if (!item) return;

    this.inventarService.addItemToInventar(item);

    const updatedSlots = [...this.slots()];
    updatedSlots[slotIndex] = null;
    this.slots.set(updatedSlots);
  }

  /** True, sobald alle 3 Kästchen belegt sind. */
  public get canCraft(): boolean {
    return this.slots().every((entry) => entry !== null) && this.craftBlockReason === null;
  }

  /**
   * Erklärt, warum die aktuelle Kästchen-Belegung nicht craftbar ist, oder
   * `null`, wenn die Kombination gültig ist (unabhängig davon, ob noch
   * Kästchen leer sind). Regeln: Rüstung nur mit Rüstung, Waffen nur mit
   * Waffen derselben Schadensart (`weapon-type`) — bei "magie"-Waffen zählt
   * zusätzlich das elementgebundene `magic-damage-type` (fire/cold/lightning/
   * chaos) als Teil der Schadensart.
   */
  public get craftBlockReason(): string | null {
    const filled = this.slots().filter((entry) => entry !== null);
    if (filled.length < 2) return null;

    const kinds = filled.map((item) => this.getItemKind(item));
    if (new Set(kinds).size > 1) {
      return 'Waffen und Rüstung können nicht zusammen gecraftet werden.';
    }

    if (kinds[0] === 'weapon') {
      const damageTypes = filled.map((item) => item['weapon-type']);
      if (new Set(damageTypes).size > 1) {
        return 'Waffen mit unterschiedlichen Schadensarten können nicht zusammen gecraftet werden.';
      }

      if (damageTypes[0] === 'magie') {
        const magicElements = filled.map((item) => item['magic-damage-type']);
        if (new Set(magicElements).size > 1) {
          return 'Magie-Waffen mit unterschiedlichen Elementen können nicht zusammen gecraftet werden.';
        }
      }
    }

    return null;
  }

  /** Waffe, wenn das Item eine `weapon-type` trägt, sonst Rüstung. */
  private getItemKind(item: any): 'weapon' | 'armor' {
    return item?.['weapon-type'] ? 'weapon' : 'armor';
  }

  /**
   * Führt das Crafting aus. Positive und negative Stats laufen getrennt:
   *
   * POSITIVE: Alle Bonus-Stats der 3 Items landen in einem Pool, pro Stat-Typ
   * bleibt genau ein zufälliger Eintrag übrig (dedupeStatsByPath), davon
   * werden bis zu 6 zufällig gezogen (pickRandom) — wie bisher.
   *
   * NEGATIV: Zuerst wird pro Item gezählt, wie viele Malus-Stats es hat; das
   * Maximum der 3 Items bestimmt, wie viele Malus-Stats das neue Item
   * bekommt. Alle Maluse landen in einem eigenen Pool und werden pro Stat-Typ
   * zusammengeführt (mergeNegativeStatsByPath): Kommt ein Malus nur auf einem
   * Item vor, bleibt er unverändert; kommt er auf mehreren vor, wird zwischen
   * der Hälfte der Summe (aufgerundet) und dem höchsten Einzelwert gerollt
   * und aufgerundet. Aus den so zusammengeführten Malus-Typen wird die zuvor
   * ermittelte Anzahl zufällig gezogen.
   *
   * Name, Beschreibung, Bild, Preis, Tier und Slot entsprechen dem Basis-Item
   * (mittleres Kästchen). Alle 3 eingesetzten Items werden dabei verbraucht.
   *
   * Voraussetzung (siehe `craftBlockReason`): alle 3 Items müssen von
   * derselben Art sein (nur Rüstung mit Rüstung, nur Waffen mit Waffen) und
   * bei Waffen dieselbe Schadensart (`weapon-type`) tragen.
   *
   * ANFORDERUNGEN: werden separat von den Stats über `mergeRequirements`
   * berechnet (siehe dort) und ersetzen die des Basis-Items komplett.
   */
  public craftItem(): void {
    const [left, base, right] = this.slots();
    if (!left || !base || !right || this.craftBlockReason) return;

    const pool: StatPoolEntry[] = [
      ...this.flattenStats(left.stats),
      ...this.flattenStats(base.stats),
      ...this.flattenStats(right.stats),
    ];

    // --- Positive Stats: unverändert (dedupe + 6 zufällige) ---
    const positivePool = pool.filter((entry) => entry.value > 0);
    const uniquePositive = this.dedupeStatsByPath(positivePool);
    const chosenPositive = this.pickRandom(uniquePositive, 6);

    // --- Negative Stats: eigene Mechanik ---
    const negativeCount = Math.max(
      this.countNegativeStats(left.stats),
      this.countNegativeStats(base.stats),
      this.countNegativeStats(right.stats),
    );
    const negativePool = pool.filter((entry) => entry.value < 0);
    const mergedNegative = this.mergeNegativeStatsByPath(negativePool);
    const chosenNegative = this.pickRandom(mergedNegative, negativeCount);

    const chosen = [...chosenPositive, ...chosenNegative];

    const newStats = this.zeroStatsLike(base.stats);
    chosen.forEach((entry) => this.setAtPath(newStats, entry.path, entry.value));

    const {
      equipped,
      'assigned-slot': _assignedSlot,
      requirement: _requirement,
      requirements: _requirements,
      ...baseRest
    } = base;

    const craftedItem: any = {
      ...baseRest,
      stats: newStats,
      soulbound: true,
      equipped: false,
      'assigned-slot': null,
    };

    const craftedRequirements = this.mergeRequirements(left, base, right);
    if (craftedRequirements.length === 1) {
      craftedItem.requirement = craftedRequirements[0];
    } else if (craftedRequirements.length > 1) {
      craftedItem.requirements = craftedRequirements;
    }

    this.personalItemsService.addItem(craftedItem);
    this.slots.set([null, null, null]);
    this.craftResultItem.set(craftedItem);
  }

  /**
   * Ermittelt die Anforderungen des gecrafteten Items aus den Anforderungen
   * der 3 Zutaten. Die Anzahl entspricht dem Item mit den meisten
   * Anforderungs-Stats; die Werte sind die N höchsten Anforderungswerte über
   * alle 3 Items hinweg; die Stats dafür werden zufällig aus der Menge aller
   * in den 3 Items vorkommenden Anforderungs-Stats gezogen (ohne
   * Wiederholung, sofern genug unterschiedliche Stats vorhanden sind).
   */
  private mergeRequirements(left: any, base: any, right: any): ItemRequirement[] {
    const perItem = [left, base, right].map((item) => getItemRequirements(item));
    const count = Math.max(...perItem.map((reqs) => reqs.length));
    if (count === 0) return [];

    const topValues = perItem
      .flat()
      .map((req) => req.value)
      .sort((a, b) => b - a)
      .slice(0, count);

    const statPool = Array.from(new Set(perItem.flat().map((req) => req.stat)));
    const shuffledStats = this.shuffle(statPool);
    const chosenStats = topValues.map((_, i) => shuffledStats[i % shuffledStats.length]);

    return topValues.map((value, i) => ({ stat: chosenStats[i], value }));
  }

  /**
   * Flacht ein (ggf. verschachteltes) Stats-Objekt zu einer Liste von {path, value} ab.
   * Stats mit Wert 0 gelten als "nicht vorhanden auf diesem Item" und werden
   * ausgelassen, sonst würde der Pool von den (immer voll ausgefüllten)
   * Null-Werten der Stat-Schablone überschwemmt.
   */
  private flattenStats(stats: any, prefix: string[] = []): StatPoolEntry[] {
    if (!stats) return [];

    return Object.keys(stats).flatMap((key) => {
      const value = stats[key];
      const path = [...prefix, key];

      if (value && typeof value === 'object') {
        return this.flattenStats(value, path);
      }
      const numericValue = Number(value) || 0;
      return numericValue !== 0 ? [{ path, value: numericValue }] : [];
    });
  }

  /** Baut ein gleich geformtes Stats-Objekt, bei dem alle Zahlenwerte auf 0 stehen. */
  private zeroStatsLike(stats: any): any {
    if (!stats) return {};

    const result: any = {};
    for (const key of Object.keys(stats)) {
      const value = stats[key];
      result[key] = value && typeof value === 'object' ? this.zeroStatsLike(value) : 0;
    }
    return result;
  }

  /** Schreibt `value` an den verschachtelten `path` innerhalb von `target`. */
  private setAtPath(target: any, path: string[], value: number): void {
    let node = target;
    for (let i = 0; i < path.length - 1; i++) {
      node = node[path[i]];
    }
    node[path[path.length - 1]] = value;
  }

  /**
   * Schritt 1: Gruppiert den Pool nach Stat-Pfad (z. B. alle 'strength'-Einträge
   * der 3 Items zusammen) und behält pro Gruppe genau einen, zufällig
   * gewählten Eintrag. Ein Stat-Typ, der auf mehreren der 3 Items vorkam,
   * darf dadurch NICHT bevorzugt in die finale Auswahl gelangen — jeder
   * Stat-Typ ist danach exakt einmal im Ergebnis vertreten.
   */
  private dedupeStatsByPath(pool: StatPoolEntry[]): StatPoolEntry[] {
    const groups = new Map<string, StatPoolEntry[]>();

    for (const entry of pool) {
      const key = entry.path.join('.');
      const group = groups.get(key);
      if (group) group.push(entry);
      else groups.set(key, [entry]);
    }

    return Array.from(groups.values()).map(
      (group) => group[Math.floor(Math.random() * group.length)],
    );
  }

  /** Schritt 2: Zieht bis zu `count` zufällige Einträge aus einer bereits eindeutigen Liste. */
  private pickRandom(entries: StatPoolEntry[], count: number): StatPoolEntry[] {
    return this.shuffle(entries).slice(0, count);
  }

  /** Zählt, wie viele Malus-Stats (< 0) ein einzelnes Item hat. */
  private countNegativeStats(stats: any): number {
    return this.flattenStats(stats).filter((entry) => entry.value < 0).length;
  }

  /**
   * Führt Malus-Einträge pro Stat-Typ zusammen. Kommt ein Malus nur auf einem
   * der 3 Items vor, bleibt sein Wert unverändert. Kommt er auf mehreren vor,
   * wird zwischen der Hälfte der Summe aller Beträge (aufgerundet) und dem
   * höchsten Einzelbetrag gerollt, das Ergebnis wird aufgerundet. Die untere
   * Grenze wird dabei nie über die obere hinaus geklammert (kann bei 3+
   * gleich hohen Duplikaten sonst passieren), damit der Rollbereich gültig bleibt.
   */
  private mergeNegativeStatsByPath(pool: StatPoolEntry[]): StatPoolEntry[] {
    const groups = new Map<string, StatPoolEntry[]>();

    for (const entry of pool) {
      const key = entry.path.join('.');
      const group = groups.get(key);
      if (group) group.push(entry);
      else groups.set(key, [entry]);
    }

    return Array.from(groups.values()).map((group) => {
      if (group.length === 1) return group[0];

      const magnitudes = group.map((entry) => Math.abs(entry.value));
      const sum = magnitudes.reduce((a, b) => a + b, 0);
      const upper = Math.max(...magnitudes);
      const lower = Math.min(Math.ceil(sum / 2), upper);
      const rolled = lower + Math.random() * (upper - lower);

      return { path: group[0].path, value: -Math.ceil(rolled) };
    });
  }

  /** Fisher-Yates-Shuffle (mutiert nicht das übergebene Array). */
  private shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

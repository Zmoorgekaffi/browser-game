import { Injectable, signal } from '@angular/core';
import { InvestableStat, PassiveData } from '../models/passive.interface';

// Build-Time-Import, analog zu SpellLoaderService: der Bundler packt den Inhalt
// direkt ins JS-Bundle, kein fetch() zur Laufzeit nötig.
import passivesJson from '../../../public/item-data/passives.json';

/** Baut aus dem importierten JSON eine ID → PassiveData Map. */
function buildPassiveCache(): Map<string, PassiveData> {
  const cache = new Map<string, PassiveData>();
  const passives = passivesJson as PassiveData[];

  for (const passive of passives) {
    if (passive?.id) {
      cache.set(passive.id, passive);
    }
  }

  return cache;
}

/**
 * @service PassiveLoaderService
 * @description Hält alle Shrine-Passives (Stat-Schwellen-Boni) synchron
 * bereit, analog zu SpellLoaderService. Datenquelle ist
 * `public/item-data/passives.json` — dort lassen sich neue Passives
 * anlegen oder bestehende anpassen, ohne Code zu berühren.
 */
@Injectable({
  providedIn: 'root',
})
export class PassiveLoaderService {
  private passiveCache = signal<Map<string, PassiveData>>(buildPassiveCache());

  /** Gibt ein einzelnes Passive per ID zurück, oder null wenn unbekannt. */
  public getPassiveById(id: string): PassiveData | null {
    return this.passiveCache().get(id) ?? null;
  }

  /** Gibt das Passive für einen Stat an einer bestimmten Investitions-Schwelle zurück. */
  public getPassiveByStatAndThreshold(stat: InvestableStat, threshold: number): PassiveData | null {
    for (const passive of this.passiveCache().values()) {
      if (passive.stat === stat && passive.threshold === threshold) return passive;
    }
    return null;
  }

  /** Gibt alle Passives eines Stats zurück, sortiert nach Schwelle aufsteigend. */
  public getPassivesForStat(stat: InvestableStat): PassiveData[] {
    return Array.from(this.passiveCache().values())
      .filter((p) => p.stat === stat)
      .sort((a, b) => a.threshold - b.threshold);
  }

  /** Gibt den gesamten Passive-Pool zurück (ungefiltert). */
  public getAllPassives(): PassiveData[] {
    return Array.from(this.passiveCache().values());
  }
}

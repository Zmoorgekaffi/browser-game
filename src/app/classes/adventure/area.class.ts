// src/app/classes/adventure/area.class.ts
import { Encounter } from './encounter.interface';

export interface LootEntry {
  item: any;
  'drop-chance': number;
}

export interface LootTable {
  '1-10': LootEntry[];
  '11-20': LootEntry[];
  '21-30': LootEntry[];
  '31-40': LootEntry[];
  '41-50': LootEntry[];
}

/**
 * Gold-Reward Ranges pro Level-Tier (identisch zur LootTable-Struktur).
 * Wird von rollGoldReward() genutzt.
 */
const GOLD_TIER_RANGES: Record<keyof LootTable, [number, number]> = {
  '1-10':  [10, 50],
  '11-20': [20, 100],
  '21-30': [30, 120],
  '31-40': [40, 130],
  '41-50': [50, 150],
};

/** Pro 10 Magic-Find gibt's 1 Bonus-Roll von 3-6 Gold zusätzlich. */
const GOLD_MF_STEP = 10;
const GOLD_MF_BONUS_MIN = 3;
const GOLD_MF_BONUS_MAX = 6;

/**
 * @class Area
 * @description Abstrakte Basisklasse für alle Adventure-Gebiete.
 * Liefert die gemeinsame Logik: Step-Generierung, Monster-/Dialog-Befüllung,
 * Loot- und Gold-Rolls. Konkrete Areas (z.B. DarkForest) definieren nur
 * noch ihre Daten (Pools, Animationen, LootTable).
 */
export abstract class Area {
  abstract name: string;
  abstract monsterPool: any[];
  abstract eventSteps: any[];
  abstract introPaths: any[];
  abstract introDuration: number;

  abstract lootIntroPaths: any[];
  abstract lootIntroDuration: number;

  abstract lootScenePaths: any[];
  abstract lootSceneDuration: number;

  abstract lootTable: LootTable;

  // 💬 NEU: Pool möglicher Dialog-Begegnungen. Wird in populateDialogs()
  // zufällig auf dialog-Steps verteilt.
  abstract encounters: Encounter[];

  playerLevel: number;
  magicFind: number;

  constructor(playerLevel: number, magicFind: number = 0) {
    this.playerLevel = playerLevel;
    this.magicFind = magicFind;
  }

  /** Zieht ein zufälliges Monster aus dem monsterPool (oder null). */
  protected getRandomMonster(playerLevel: number): any {
    if (!this.monsterPool || this.monsterPool.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.monsterPool.length);
    return this.monsterPool[randomIndex];
  }

  /**
   * Würfelt ein Item aus der LootTable des aktuellen Level-Tiers.
   * Gewichtung über 'drop-chance'; das Ergebnis ist ein Deep-Clone.
   *
   * @returns Das gerollte Item oder null (leeres Tier / kein Gewicht).
   */
  public rollLoot(): any | null {
    const tier = this.getLootTier(this.playerLevel);
    const entries = this.lootTable[tier];

    if (!entries || entries.length === 0) {
      console.warn(`[Area.rollLoot] Tier "${tier}" ist leer.`);
      return null;
    }

    const totalWeight = entries.reduce((sum, e) => sum + (e['drop-chance'] || 0), 0);
    if (totalWeight <= 0) return null;

    let roll = Math.random() * totalWeight;
    for (const entry of entries) {
      roll -= entry['drop-chance'] || 0;
      if (roll <= 0) return JSON.parse(JSON.stringify(entry.item));
    }
    return JSON.parse(JSON.stringify(entries[entries.length - 1].item));
  }

  /**
   * 💰 Rollt eine Gold-Belohnung basierend auf Level-Tier und Magic-Find.
   *
   * Basis: random zwischen tier-min und tier-max (siehe GOLD_TIER_RANGES).
   * Bonus: pro 10 MF ein zusätzlicher Roll von 3-6 Gold, alle draufaddiert.
   *
   * Beispiel Tier 1-10, MF=30:
   *   base = random(10..50)
   *   3 MF-bonus rolls → +random(3..6) * 3 mal
   *   final = base + bonusTotal
   */
  public rollGoldReward(): number {
    const tier = this.getLootTier(this.playerLevel);
    const [min, max] = GOLD_TIER_RANGES[tier];
    const base = Math.floor(Math.random() * (max - min + 1)) + min;

    const bonusSteps = Math.floor(Math.max(0, this.magicFind) / GOLD_MF_STEP);
    let bonusTotal = 0;
    for (let i = 0; i < bonusSteps; i++) {
      bonusTotal +=
        Math.floor(Math.random() * (GOLD_MF_BONUS_MAX - GOLD_MF_BONUS_MIN + 1)) +
        GOLD_MF_BONUS_MIN;
    }

    const final = base + bonusTotal;
    console.log(
      `💰 [rollGoldReward] tier=${tier}, base=${base}, MF=${this.magicFind} (${bonusSteps} bonus rolls, +${bonusTotal}) → total=${final}`
    );
    return final;
  }

  /** Ordnet ein Spieler-Level dem passenden LootTable-Tier zu. */
  private getLootTier(level: number): keyof LootTable {
    if (level <= 10) return '1-10';
    if (level <= 20) return '11-20';
    if (level <= 30) return '21-30';
    if (level <= 40) return '31-40';
    return '41-50';
  }

  /**
   * Generiert eine zufällige, gemischte Step-Liste für einen Run.
   * 50-75% der Steps sind Kämpfe, der Rest loot/quiz/dialog.
   *
   * @param min Minimale Step-Anzahl (Default 4).
   * @param max Maximale Step-Anzahl (Default 8).
   */
  generateSteps(min: number = 4, max: number = 8): any[] {
    const stepCount = Math.floor(Math.random() * (max - min + 1)) + min;
    const steps: any[] = [];

    const minFights = Math.ceil(stepCount * 0.5);
    const maxFights = Math.floor(stepCount * 0.75);
    const fightCount =
      Math.floor(Math.random() * (maxFights - minFights + 1)) + minFights;

    const specialEventCount = stepCount - fightCount;

    for (let i = 0; i < fightCount; i++) {
      steps.push({ type: 'fight', monster: this.getRandomMonster(1) });
    }

    const eventTypes = ['loot', 'quiz', 'dialog'];
    for (let i = 0; i < specialEventCount; i++) {
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      steps.push({ type: randomType, eventId: `${randomType}_01` });
    }

    return this.shuffleArray(steps);
  }

  /** Fisher-Yates-Shuffle (mischt das Array in-place und gibt es zurück). */
  public shuffleArray(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /** Weist jedem fight-Step ein zufälliges Monster aus dem Pool zu. */
  protected populateFights(monsterPool: any[]): void {
    if (!monsterPool || monsterPool.length === 0) return;
    this.eventSteps = this.eventSteps.map((step) => {
      if (step.type === 'fight') {
        const randomIndex = Math.floor(Math.random() * monsterPool.length);
        return { ...step, monster: monsterPool[randomIndex] };
      }
      return step;
    });
  }

  /**
   * 💬 NEU: Weist jedem dialog-Step eine zufällige Encounter aus der
   * encounters-Liste zu. Deep-Clone verhindert, dass verschiedene Steps
   * dieselbe Referenz teilen (wichtig für spätere Save/Load Roundtrips).
   */
  protected populateDialogs(): void {
    if (!this.encounters || this.encounters.length === 0) return;

    this.eventSteps = this.eventSteps.map((step) => {
      if (step.type === 'dialog') {
        const randomIndex = Math.floor(Math.random() * this.encounters.length);
        return {
          ...step,
          encounter: JSON.parse(JSON.stringify(this.encounters[randomIndex])),
        };
      }
      return step;
    });
  }
}
// src/app/classes/adventure/area.class.ts

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

  playerLevel: number;

  // ✨ NEU: Magic-Find beeinflusst die LootTable-Generierung (pro 20 MF
  // wird der niedrigste noch upgradbare Tier-Slot um 1 hochgestuft).
  magicFind: number;

  constructor(playerLevel: number, magicFind: number = 0) {
    this.playerLevel = playerLevel;
    this.magicFind = magicFind;
  }

  protected getRandomMonster(playerLevel: number): any {
    if (!this.monsterPool || this.monsterPool.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * this.monsterPool.length);
    return this.monsterPool[randomIndex];
  }

  public rollLoot(): any | null {
    const tier = this.getLootTier(this.playerLevel);
    const entries = this.lootTable[tier];

    if (!entries || entries.length === 0) {
      console.warn(`[Area.rollLoot] Tier "${tier}" ist leer — kein Loot.`);
      return null;
    }

    const totalWeight = entries.reduce(
      (sum, e) => sum + (e['drop-chance'] || 0),
      0
    );

    if (totalWeight <= 0) {
      console.warn(`[Area.rollLoot] Tier "${tier}" hat totalWeight 0.`);
      return null;
    }

    let roll = Math.random() * totalWeight;
    for (const entry of entries) {
      roll -= entry['drop-chance'] || 0;
      if (roll <= 0) {
        return JSON.parse(JSON.stringify(entry.item));
      }
    }

    return JSON.parse(JSON.stringify(entries[entries.length - 1].item));
  }

  private getLootTier(level: number): keyof LootTable {
    if (level <= 10) return '1-10';
    if (level <= 20) return '11-20';
    if (level <= 30) return '21-30';
    if (level <= 40) return '31-40';
    return '41-50';
  }

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

  public shuffleArray(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  protected populateFights(monsterPool: any[]): void {
    if (!monsterPool || monsterPool.length === 0) return;

    this.eventSteps = this.eventSteps.map((step) => {
      if (step.type === 'fight') {
        const randomIndex = Math.floor(Math.random() * monsterPool.length);
        return {
          ...step,
          monster: monsterPool[randomIndex],
        };
      }
      return step;
    });
  }
}
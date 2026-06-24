// src/app/services/adventure/area.base.ts
export abstract class Area {
  abstract name: string;
  abstract monsterPool: any[];
  abstract eventSteps: any[];
  abstract introPaths: any[];
  abstract introDuration: number;
  playerLevel: number;

  constructor(playerLevel: number) {
    this.playerLevel = playerLevel
  }

  // Helfer-Funktion: Holt ein Monster passend zum Spieler-Level
  protected getRandomMonster(playerLevel: number): any {
    if (!this.monsterPool || this.monsterPool.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * this.monsterPool.length);
    return this.monsterPool[randomIndex];
  }

  generateSteps(min: number = 4, max: number = 8): any[] {
    const stepCount = Math.floor(Math.random() * (max - min + 1)) + min;
    const steps: any[] = [];

    // 1. Berechne die Anzahl der Kämpfe (50% bis 75% des Gesamtwerts)
    const minFights = Math.ceil(stepCount * 0.5);
    const maxFights = Math.floor(stepCount * 0.75);
    const fightCount = Math.floor(Math.random() * (maxFights - minFights + 1)) + minFights;

    // Der Rest steht für Spezial-Events zur Verfügung
    const specialEventCount = stepCount - fightCount;

    // 2. Erstelle alle Schritte als Array
    // Erst alle Kämpfe...
    for (let i = 0; i < fightCount; i++) {
      steps.push({ type: 'fight', monster: this.getRandomMonster(1) });
    }

    // ...dann die Spezial-Events auffüllen
    const eventTypes = ['loot', 'quiz', 'dialog'];
    for (let i = 0; i < specialEventCount; i++) {
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      steps.push({ type: randomType, eventId: `${randomType}_01` });
    }

    // 3. Schritte durchmischen (Fisher-Yates Shuffle), damit nicht alle Kämpfe am Anfang stehen
    return this.shuffleArray(steps);
  }

  
    // Hilfsfunktion zum Mischen
  public shuffleArray(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Diese Funktion durchläuft die Steps und füllt Kämpfe mit Leben
  protected populateFights(monsterPool: any[]): void {
    if (!monsterPool || monsterPool.length === 0) return;

    this.eventSteps = this.eventSteps.map(step => {
      if (step.type === 'fight') {
        // Monster zuweisen
        const randomIndex = Math.floor(Math.random() * monsterPool.length);
        return { 
          ...step, // Behält den Typ 'fight' bei
          monster: monsterPool[randomIndex] 
        };
      }
      return step; // Unverändert lassen (Loot, Quiz, etc.)
    });
  }
}

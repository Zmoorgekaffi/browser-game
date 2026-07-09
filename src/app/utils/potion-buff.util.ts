// src/app/utils/potion-buff.util.ts

/** Attribute, die ein Buff-Trank temporär erhöhen kann (siehe FightService.activePlayerBuffs). */
export type BuffableStat = 'strength' | 'intelligence' | 'vitality' | 'luck';

export interface PlayerBuff {
  stat: BuffableStat;
  amount: number;
  roundsLeft: number;
  potionName: string;
}

/**
 * Wendet alle aktiven Buffs additiv auf ein Kopie der Kampfwerte an — exakt
 * dieselben linearen Formeln wie SkillsService.applyAttributeScaling(),
 * nur als eigenständiger Delta-Layer statt eines Attribut-Rewrites (kein
 * Anfassen der Basis-Pipeline nötig, da die Formeln pro Punkt linear/additiv
 * sind und sich ein Buff daher 1:1 als Delta auf die bereits abgeleiteten
 * Werte draufrechnen lässt).
 *
 * Bewusst NICHT abgedeckt: der Energy-Shield-Anteil von Intelligenz (siehe
 * FightService playerMaxEnergyShield, das aktuell kein computed() ist).
 *
 * @param baseStats Ergebnis von SkillsService.combatStats() (wird NICHT mutiert).
 * @param buffs     Aktive Buffs (siehe FightService.activePlayerBuffs).
 */
export function applyBuffDeltas(baseStats: any, buffs: PlayerBuff[]): any {
  if (!buffs || buffs.length === 0) return baseStats;

  const stats = { ...baseStats };

  for (const buff of buffs) {
    switch (buff.stat) {
      case 'strength':
        stats.physicalDamageMultiplier = (stats.physicalDamageMultiplier ?? 1) + buff.amount / 10000;
        break;
      case 'intelligence':
        stats.magicDamageMultiplier = (stats.magicDamageMultiplier ?? 1) + buff.amount / 1000;
        stats.mana = (stats.mana ?? 0) + buff.amount * 5;
        break;
      case 'vitality':
        stats.hp = (stats.hp ?? 0) + buff.amount * 3;
        stats['hp-regeneration'] = (stats['hp-regeneration'] ?? 0) + buff.amount * 0.5;
        break;
      case 'luck':
        stats.critChance = (stats.critChance ?? 0) + Math.floor(buff.amount * 0.2);
        stats['magic-find'] = (stats['magic-find'] ?? 0) + Math.floor(buff.amount * 0.5);
        break;
    }
  }

  return stats;
}

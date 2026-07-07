// src/app/utils/level-bracket.util.ts

export type LevelBracket = '1-10' | '11-20' | '21-30' | '31-40' | '41-50';

/** Ordnet ein Spieler-Level dem passenden 10er-Bracket zu (Loot-Tabelle & Monster-Pools). */
export function getLevelBracket(level: number): LevelBracket {
  if (level <= 10) return '1-10';
  if (level <= 20) return '11-20';
  if (level <= 30) return '21-30';
  if (level <= 40) return '31-40';
  return '41-50';
}

export interface WalletData {
  gold: number;
  rubies: number;
}

export interface SkillsData {
  attack: number;
  defense: number;
  spells: string[];
}

export interface ProfileData {
  name: string;
  level: number;
  exp: number;
  avatar?: string;
  /** Stummschaltung, persistiert pro Charakter. */
  muted?: boolean;
  /** Master-Lautstärke (0-1), persistiert pro Charakter. */
  volume?: number;
}

export interface InventarData {
  items: any[];
}

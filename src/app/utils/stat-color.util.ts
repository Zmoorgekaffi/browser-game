/**
 * Feste, thematisch abgeleitete Akzentfarbe je Stat (z. B. STR=rot,
 * INT=indigo, Feuerres.=orange), damit Stat-Listen auf einen Blick lesbar
 * sind statt einfarbig grün. `variant` wählt die Helligkeit passend zum
 * Hintergrund — helle Karten (z. B. ItemInfoCard) brauchen dunklere Töne
 * als dunkle Panels. Ein Stat behält seine Farbe unabhängig davon, ob er
 * als Bonus oder Malus auftritt — Positiv/Negativ wird stattdessen über die
 * Gruppierung (siehe `STAT_DEFINITIONS`-Nutzung in den Templates) sichtbar.
 *
 * Thematisch verwandte Stats (z. B. Stärke/Krit-Schaden, Magiefund/Chaosres.)
 * teilen sich bewusst dieselbe Farbfamilie in unterschiedlichem Ton, statt
 * eine komplett andere Farbe zu bekommen.
 */
const STAT_COLORS: Record<string, { dark: string; light: string }> = {
  strength: { dark: 'text-red-400', light: 'text-red-700' },
  dexterity: { dark: 'text-lime-400', light: 'text-lime-700' },
  intelligence: { dark: 'text-indigo-400', light: 'text-indigo-700' },
  vitality: { dark: 'text-emerald-400', light: 'text-emerald-700' },
  luck: { dark: 'text-amber-400', light: 'text-amber-700' },
  hp: { dark: 'text-rose-400', light: 'text-rose-700' },
  hpregeneration: { dark: 'text-green-400', light: 'text-green-700' },
  mana: { dark: 'text-sky-400', light: 'text-sky-700' },
  attack: { dark: 'text-orange-400', light: 'text-orange-700' },
  magicattack: { dark: 'text-violet-400', light: 'text-violet-700' },
  critchance: { dark: 'text-yellow-400', light: 'text-yellow-700' },
  critdamage: { dark: 'text-red-600', light: 'text-red-800' },
  chaosdamage: { dark: 'text-fuchsia-400', light: 'text-fuchsia-700' },
  charisma: { dark: 'text-pink-400', light: 'text-pink-700' },
  armor: { dark: 'text-slate-400', light: 'text-slate-600' },
  energyshield: { dark: 'text-cyan-400', light: 'text-cyan-700' },
  evasion: { dark: 'text-teal-400', light: 'text-teal-700' },
  initiative: { dark: 'text-yellow-600', light: 'text-yellow-800' },
  magicfind: { dark: 'text-purple-400', light: 'text-purple-700' },
  resistancesfire: { dark: 'text-orange-600', light: 'text-orange-800' },
  resistancescold: { dark: 'text-blue-400', light: 'text-blue-700' },
  resistanceslightning: { dark: 'text-amber-600', light: 'text-amber-800' },
  resistanceschaos: { dark: 'text-violet-600', light: 'text-violet-800' },
  damagemin: { dark: 'text-orange-400', light: 'text-orange-700' },
  damagemax: { dark: 'text-orange-500', light: 'text-orange-800' },
  magicdamagemin: { dark: 'text-violet-400', light: 'text-violet-700' },
  magicdamagemax: { dark: 'text-violet-500', light: 'text-violet-800' },
  magicdamagefire: { dark: 'text-orange-400', light: 'text-orange-700' },
  magicdamagecold: { dark: 'text-blue-400', light: 'text-blue-700' },
  magicdamagelightning: { dark: 'text-amber-400', light: 'text-amber-700' },
};

const DEFAULT_COLOR = { dark: 'text-emerald-400', light: 'text-emerald-700' };

/** Normalisiert 'resistances.fire', 'magic-find', 'critChance' etc. auf einen gemeinsamen Lookup-Key. */
function canonicalize(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Tailwind-Textfarbklasse für einen Stat-Key, z. B. `getStatColor('strength')`
 * oder `getStatColor('resistances.fire', 'light')`.
 */
export function getStatColor(key: string, variant: 'dark' | 'light' = 'dark'): string {
  const entry = STAT_COLORS[canonicalize(key)] ?? DEFAULT_COLOR;
  return entry[variant];
}

/**
 * Vollständige Liste aller Item-Stats mit einheitlich deutschem Kürzel, in
 * fester Anzeige-Reihenfolge. `key` referenziert das Feld im `stats`-Objekt
 * eines Items (Punktnotation für verschachtelte Felder wie Resistenzen).
 */
export const STAT_DEFINITIONS: { key: string; label: string }[] = [
  { key: 'strength', label: 'Stärke' },
  { key: 'damage-min', label: 'Schaden Min.' },
  { key: 'damage-max', label: 'Schaden Max.' },
  { key: 'magic-damage-min', label: 'Magieschaden Min.' },
  { key: 'magic-damage-max', label: 'Magieschaden Max.' },
  { key: 'attack', label: 'Angriff' },
  { key: 'vitality', label: 'Vitalität' },
  { key: 'intelligence', label: 'Intell.' },
  { key: 'dexterity', label: 'Geschick' },
  { key: 'luck', label: 'Glück' },
  { key: 'armor', label: 'Rüstung' },
  { key: 'energy-shield', label: 'E-Schild' },
  { key: 'hp-regeneration', label: 'HP-Regen.' },
  { key: 'magic-find', label: 'Magiefund' },
  { key: 'magic-attack', label: 'MagAngr.' },
  { key: 'initiative', label: 'Init.' },
  { key: 'evasion', label: 'Ausw.' },
  { key: 'crit-chance', label: 'Kritchance' },
  { key: 'crit-damage', label: 'Kritschad.' },
  { key: 'chaosDamage', label: 'Chaossch.' },
  { key: 'magic-damage-fire', label: 'Feuerschad.' },
  { key: 'magic-damage-cold', label: 'Kälteschad.' },
  { key: 'magic-damage-lightning', label: 'Blitzschad.' },
  { key: 'charisma', label: 'Charisma' },
  { key: 'resistances.fire', label: 'Feuerres.' },
  { key: 'resistances.cold', label: 'Kälteres.' },
  { key: 'resistances.lightning', label: 'Blitzres.' },
  { key: 'resistances.chaos', label: 'Chaosres.' },
];

/** Liest einen (ggf. verschachtelten, z. B. 'resistances.fire') Stat-Wert aus einem stats-Objekt. */
export function getStatValue(stats: any, key: string): number {
  if (!stats) return 0;
  const value = key.includes('.')
    ? key.split('.').reduce((acc: any, part: string) => acc?.[part], stats)
    : stats[key];
  return Number(value) || 0;
}

/** True, sobald das Item mindestens einen Bonus-Stat (> 0) hat. */
export function hasPositiveStats(stats: any): boolean {
  return STAT_DEFINITIONS.some((def) => getStatValue(stats, def.key) > 0);
}

/** True, sobald das Item mindestens einen Malus-Stat (< 0) hat. */
export function hasNegativeStats(stats: any): boolean {
  return STAT_DEFINITIONS.some((def) => getStatValue(stats, def.key) < 0);
}

/** Deutsche Anzeige-Labels für die vier Elemente (`magic-damage-type`, `resistances`-Keys). */
const ELEMENT_LABELS: Record<string, string> = {
  fire: 'Feuer',
  cold: 'Kälte',
  lightning: 'Blitz',
  chaos: 'Chaos',
};

/** Deutsches Label für einen Element-Key, z. B. `getElementLabel('fire')` → 'Feuer'. Unbekannte Keys werden unverändert zurückgegeben. */
export function getElementLabel(element: string | undefined | null): string {
  if (!element) return '';
  return ELEMENT_LABELS[element] ?? element;
}

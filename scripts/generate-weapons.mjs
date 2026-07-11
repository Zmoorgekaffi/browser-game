// scripts/generate-weapons.mjs
// Einmaliger Generator für die 40 Waffen-Items (5 Tiers x 8) + materials.json.
// Zahlen stammen aus der Kalibrierung in scripts/weapon-balance-sim.mjs.
// Nutzung: node scripts/generate-weapons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';

const STATS_TEMPLATE = {
  intelligence: 0, dexterity: 0, strength: 0, vitality: 0, luck: 0,
  'energy-shield': 0, 'magic-find': 0, armor: 0,
  attack: 0, 'magic-attack': 0, initiative: 0, evasion: 0,
  'crit-chance': 0, 'crit-damage': 0, chaosDamage: 0,
  'damage-min': 0, 'damage-max': 0, 'magic-damage-min': 0, 'magic-damage-max': 0,
  resistances: { fire: 0, cold: 0, lightning: 0, chaos: 0 },
};

function makeWeapon({ name, description, slug, price, tier, weaponType, hands, reqStat, reqValue, dmgMin, dmgMax, secondary }) {
  const stats = JSON.parse(JSON.stringify(STATS_TEMPLATE));
  const isMagic = weaponType === 'magie';
  if (isMagic) {
    stats['magic-damage-min'] = dmgMin;
    stats['magic-damage-max'] = dmgMax;
  } else {
    stats['damage-min'] = dmgMin;
    stats['damage-max'] = dmgMax;
  }
  for (const [key, value] of Object.entries(secondary)) {
    stats[key] = value;
  }

  return {
    name,
    description,
    'img-path': `imgs/items/weapon/${slug}.webp`,
    price,
    'armor-slot': 'weapon-1',
    tier: String(tier),
    'weapon-type': weaponType,
    hands: String(hands),
    requirement: { stat: reqStat, value: reqValue },
    quality: 0,
    'base-damage-min': isMagic ? 0 : dmgMin,
    'base-damage-max': isMagic ? 0 : dmgMax,
    'base-magic-damage-min': isMagic ? dmgMin : 0,
    'base-magic-damage-max': isMagic ? dmgMax : 0,
    stats,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Tier-Daten (Namen, Ranges, Requirements, Preise, Sekundär-Stats)
// ═══════════════════════════════════════════════════════════════════════

const TIERS = [
  {
    tier: 1,
    items: [
      { weaponType: 'schnitt', hands: 1, name: 'Kurzschwert der Wache', description: 'Standardklinge der Stadtwache. Nichts Besonderes, aber verlässlich scharf.', slug: 'shortsword_guard', price: 30, reqStat: 'strength', reqValue: 6, dmgMin: 9, dmgMax: 14, secondary: { 'crit-chance': 2, initiative: 3 } },
      { weaponType: 'schnitt', hands: 2, name: 'Zweihandschwert des Rekruten', description: 'Schwer und unhandlich, aber jeder Treffer sitzt.', slug: 'greatsword_recruit', price: 48, reqStat: 'strength', reqValue: 9, dmgMin: 13, dmgMax: 19, secondary: { 'crit-chance': 2, 'crit-damage': 8 } },
      { weaponType: 'stumpf', hands: 1, name: 'Holzknüppel', description: 'Ein einfacher, hart gebrannter Knüppel. Trifft zuverlässig, ohne Schnickschnack.', slug: 'wooden_club', price: 26, reqStat: 'strength', reqValue: 6, dmgMin: 10, dmgMax: 13, secondary: { 'crit-damage': 6 } },
      { weaponType: 'stumpf', hands: 2, name: 'Kriegshammer des Lehrlings', description: 'Grob geschmiedeter Hammer, mehr Wucht als Eleganz.', slug: 'warhammer_apprentice', price: 50, reqStat: 'strength', reqValue: 9, dmgMin: 14, dmgMax: 18, secondary: { 'crit-damage': 10, chaosDamage: 2 } },
      { weaponType: 'stich', hands: 1, name: 'Rostiger Dolch', description: 'Schnell gezogen, schnell zugestochen. Rost stört die Klinge nicht.', slug: 'rusty_dagger', price: 28, reqStat: 'dexterity', reqValue: 6, dmgMin: 7, dmgMax: 15, secondary: { 'crit-chance': 4, initiative: 4 } },
      { weaponType: 'stich', hands: 2, name: 'Jagdspeer', description: 'Langer Speer für Wildjäger, hält Gegner auf Abstand.', slug: 'hunting_spear', price: 46, reqStat: 'dexterity', reqValue: 9, dmgMin: 11, dmgMax: 21, secondary: { 'crit-chance': 3, initiative: 5 } },
      { weaponType: 'magie', hands: 1, name: 'Lehrlingsstab', description: 'Erster Stab jedes Magielehrlings. Kanalisiert schwache, aber stetige Energie.', slug: 'novice_staff', price: 32, reqStat: 'intelligence', reqValue: 6, dmgMin: 8, dmgMax: 14, secondary: { 'magic-find': 3, luck: 1 } },
      { weaponType: 'magie', hands: 2, name: 'Runenstab der Novizen', description: 'Mit einfachen Runen versehener Stab, verstärkt elementare Wirkung.', slug: 'rune_staff_novice', price: 52, reqStat: 'intelligence', reqValue: 9, dmgMin: 12, dmgMax: 20, secondary: { 'magic-find': 4, chaosDamage: 3 } },
    ],
  },
  {
    tier: 2,
    items: [
      { weaponType: 'schnitt', hands: 1, name: 'Söldnerklinge', description: 'Vielfach geschärfte Klinge eines erfahrenen Söldners.', slug: 'mercenary_blade', price: 95, reqStat: 'strength', reqValue: 16, dmgMin: 19, dmgMax: 27, secondary: { 'crit-chance': 3, initiative: 4 } },
      { weaponType: 'schnitt', hands: 2, name: 'Ritterschwert', description: 'Prunkvolle, aber kampferprobte Klinge niederer Ritter.', slug: 'knight_sword', price: 155, reqStat: 'strength', reqValue: 20, dmgMin: 27, dmgMax: 39, secondary: { 'crit-chance': 3, 'crit-damage': 14 } },
      { weaponType: 'stumpf', hands: 1, name: 'Eisenkeule', description: 'Massive Eisenkeule, jeder Treffer bricht Knochen.', slug: 'iron_mace', price: 90, reqStat: 'strength', reqValue: 16, dmgMin: 21, dmgMax: 25, secondary: { 'crit-damage': 12 } },
      { weaponType: 'stumpf', hands: 2, name: 'Wuchtiger Streithammer', description: 'Zweihändiger Hammer, gebaut um Rüstungen zu zertrümmern.', slug: 'heavy_warhammer', price: 160, reqStat: 'strength', reqValue: 20, dmgMin: 30, dmgMax: 36, secondary: { 'crit-damage': 16, chaosDamage: 4 } },
      { weaponType: 'stich', hands: 1, name: 'Assassinendolch', description: 'Federleichte Klinge für schnelle, tödliche Stiche.', slug: 'assassin_dagger', price: 98, reqStat: 'dexterity', reqValue: 16, dmgMin: 15, dmgMax: 29, secondary: { 'crit-chance': 6, initiative: 6 } },
      { weaponType: 'stich', hands: 2, name: 'Kriegslanze', description: 'Lange Lanze, durchbohrt selbst dicke Panzerung.', slug: 'war_lance', price: 150, reqStat: 'dexterity', reqValue: 20, dmgMin: 22, dmgMax: 42, secondary: { 'crit-chance': 4, initiative: 8 } },
      { weaponType: 'magie', hands: 1, name: 'Adeptenstab', description: 'Stab eines fortgeschrittenen Magie-Adepten, klar fokussierte Energie.', slug: 'adept_staff', price: 100, reqStat: 'intelligence', reqValue: 16, dmgMin: 18, dmgMax: 28, secondary: { 'magic-find': 6, luck: 2 } },
      { weaponType: 'magie', hands: 2, name: 'Elementarstab', description: 'Kanalisiert rohe Elementarkräfte durch einen kristallenen Kern.', slug: 'elemental_staff', price: 165, reqStat: 'intelligence', reqValue: 20, dmgMin: 26, dmgMax: 40, secondary: { 'magic-find': 7, chaosDamage: 6 } },
    ],
  },
  {
    tier: 3,
    items: [
      { weaponType: 'schnitt', hands: 1, name: 'Klinge des Veteranen', description: 'Von unzähligen Schlachten gezeichnete, makellos gepflegte Klinge.', slug: 'veteran_blade', price: 280, reqStat: 'strength', reqValue: 28, dmgMin: 32, dmgMax: 42, secondary: { 'crit-chance': 4, initiative: 5 } },
      { weaponType: 'schnitt', hands: 2, name: 'Bastardschwert', description: 'Zwischen Ein- und Zweihandschwert, kompromisslos brutal.', slug: 'bastard_sword', price: 460, reqStat: 'strength', reqValue: 33, dmgMin: 45, dmgMax: 59, secondary: { 'crit-chance': 4, 'crit-damage': 18 } },
      { weaponType: 'stumpf', hands: 1, name: 'Stahlmorgenstern', description: 'Stachelbesetzter Kopf aus gehärtetem Stahl.', slug: 'steel_morningstar', price: 270, reqStat: 'strength', reqValue: 28, dmgMin: 34, dmgMax: 39, secondary: { 'crit-damage': 16 } },
      { weaponType: 'stumpf', hands: 2, name: 'Kriegshammer der Garde', description: 'Zeremonielle Waffe der Palastgarde, im Kampf furchtbar effektiv.', slug: 'guard_warhammer', price: 470, reqStat: 'strength', reqValue: 33, dmgMin: 48, dmgMax: 56, secondary: { 'crit-damage': 20, chaosDamage: 6 } },
      { weaponType: 'stich', hands: 1, name: 'Giftdolch', description: 'In dunkle Essenzen getränkte Klinge, jede Wunde brennt nach.', slug: 'poison_dagger', price: 285, reqStat: 'dexterity', reqValue: 28, dmgMin: 25, dmgMax: 49, secondary: { 'crit-chance': 8, initiative: 7, chaosDamage: 4 } },
      { weaponType: 'stich', hands: 2, name: 'Langbogen der Waldläufer', description: 'Präzisionswaffe erfahrener Waldläufer, trifft auf große Distanz.', slug: 'ranger_longbow', price: 455, reqStat: 'dexterity', reqValue: 33, dmgMin: 38, dmgMax: 64, secondary: { 'crit-chance': 6, initiative: 10 } },
      { weaponType: 'magie', hands: 1, name: 'Kristallstab', description: 'Ein reiner Kristallkern verstärkt jeden gewirkten Zauber.', slug: 'crystal_staff', price: 290, reqStat: 'intelligence', reqValue: 28, dmgMin: 30, dmgMax: 44, secondary: { 'magic-find': 9, luck: 3 } },
      { weaponType: 'magie', hands: 2, name: 'Zepter der Elemente', description: 'Uraltes Zepter, das mehrere Elemente gleichzeitig bündelt.', slug: 'elemental_scepter', price: 480, reqStat: 'intelligence', reqValue: 33, dmgMin: 42, dmgMax: 62, secondary: { 'magic-find': 10, chaosDamage: 8 } },
    ],
  },
  {
    tier: 4,
    items: [
      { weaponType: 'schnitt', hands: 1, name: 'Klinge des Champions', description: 'Auszeichnung siegreicher Turnierkämpfer, tödlich scharf.', slug: 'champion_blade', price: 700, reqStat: 'strength', reqValue: 39, dmgMin: 44, dmgMax: 58, secondary: { 'crit-chance': 5, initiative: 6 } },
      { weaponType: 'schnitt', hands: 2, name: 'Großschwert der Legion', description: 'Standardwaffe der Elite-Legionen, meterlange Klinge aus Legierstahl.', slug: 'legion_greatsword', price: 1100, reqStat: 'strength', reqValue: 45, dmgMin: 62, dmgMax: 80, secondary: { 'crit-chance': 5, 'crit-damage': 22 } },
      { weaponType: 'stumpf', hands: 1, name: 'Titanstreitkolben', description: 'Aus seltenem Titanerz geschmiedet, jeder Schlag ein Erdbeben.', slug: 'titan_mace', price: 690, reqStat: 'strength', reqValue: 39, dmgMin: 47, dmgMax: 55, secondary: { 'crit-damage': 20 } },
      { weaponType: 'stumpf', hands: 2, name: 'Erdbrecher-Hammer', description: 'Legendärer Hammer, dessen Schläge den Boden erzittern lassen.', slug: 'earthbreaker_hammer', price: 1120, reqStat: 'strength', reqValue: 45, dmgMin: 66, dmgMax: 76, secondary: { 'crit-damage': 26, chaosDamage: 9 } },
      { weaponType: 'stich', hands: 1, name: 'Schattendolch', description: 'Fast unsichtbar im Dunkeln, jeder Stich ein tödliches Geheimnis.', slug: 'shadow_dagger', price: 720, reqStat: 'dexterity', reqValue: 39, dmgMin: 35, dmgMax: 67, secondary: { 'crit-chance': 10, initiative: 9, chaosDamage: 5 } },
      { weaponType: 'stich', hands: 2, name: 'Kompositbogen der Elite', description: 'Meisterhaft gefertigter Bogen aus geschichtetem Horn und Sehne.', slug: 'elite_compositebow', price: 1080, reqStat: 'dexterity', reqValue: 45, dmgMin: 52, dmgMax: 88, secondary: { 'crit-chance': 7, initiative: 13 } },
      { weaponType: 'magie', hands: 1, name: 'Arkaner Stab', description: 'Pulsiert mit kaum kontrollierbarer arkaner Energie.', slug: 'arcane_staff', price: 710, reqStat: 'intelligence', reqValue: 39, dmgMin: 42, dmgMax: 60, secondary: { 'magic-find': 12, luck: 4 } },
      { weaponType: 'magie', hands: 2, name: 'Chaosstab', description: 'Instabiler Stab, der rohes Chaos in Zauber kanalisiert.', slug: 'chaos_staff', price: 1130, reqStat: 'intelligence', reqValue: 45, dmgMin: 58, dmgMax: 84, secondary: { 'magic-find': 13, chaosDamage: 11 } },
    ],
  },
  {
    tier: 5,
    items: [
      { weaponType: 'schnitt', hands: 1, name: 'Klinge des Unsterblichen', description: 'Sagenumwobene Klinge, die niemals ihre Schärfe verliert.', slug: 'immortal_blade', price: 1500, reqStat: 'strength', reqValue: 52, dmgMin: 57, dmgMax: 73, secondary: { 'crit-chance': 6, initiative: 8 } },
      { weaponType: 'schnitt', hands: 2, name: 'Weltenspalter', description: 'Ein einziger Schlag dieser Klinge soll einst einen Berg gespalten haben.', slug: 'worldsplitter', price: 2350, reqStat: 'strength', reqValue: 60, dmgMin: 80, dmgMax: 100, secondary: { 'crit-chance': 6, 'crit-damage': 28 } },
      { weaponType: 'stumpf', hands: 1, name: 'Kriegsgott-Streitkolben', description: 'Geweihte Waffe eines vergessenen Kriegsgottes.', slug: 'wargod_mace', price: 1480, reqStat: 'strength', reqValue: 52, dmgMin: 60, dmgMax: 70, secondary: { 'crit-damage': 24 } },
      { weaponType: 'stumpf', hands: 2, name: 'Apokalypsenhammer', description: 'Jeder Schlag hallt wie das Ende der Welt.', slug: 'apocalypse_hammer', price: 2380, reqStat: 'strength', reqValue: 60, dmgMin: 84, dmgMax: 96, secondary: { 'crit-damage': 32, chaosDamage: 14 } },
      { weaponType: 'stich', hands: 1, name: 'Todesstachel', description: 'Dünn wie eine Nadel, tödlich wie der Tod selbst.', slug: 'deathsting_dagger', price: 1520, reqStat: 'dexterity', reqValue: 52, dmgMin: 45, dmgMax: 85, secondary: { 'crit-chance': 12, initiative: 11, chaosDamage: 7 } },
      { weaponType: 'stich', hands: 2, name: 'Himmelsbogen', description: 'Von Sturmwind getragene Pfeile treffen, wo immer man zielt.', slug: 'skybow', price: 2300, reqStat: 'dexterity', reqValue: 60, dmgMin: 66, dmgMax: 112, secondary: { 'crit-chance': 9, initiative: 16 } },
      { weaponType: 'magie', hands: 1, name: 'Stab der Urgewalt', description: 'Enthält einen Splitter uralter, nicht klassifizierbarer Magie.', slug: 'primalforce_staff', price: 1550, reqStat: 'intelligence', reqValue: 52, dmgMin: 54, dmgMax: 76, secondary: { 'magic-find': 16, luck: 6 } },
      { weaponType: 'magie', hands: 2, name: 'Zepter des Weltuntergangs', description: 'Das letzte Werk eines Erzmagiers, der die Konsequenzen ignorierte.', slug: 'doomsday_scepter', price: 2400, reqStat: 'intelligence', reqValue: 60, dmgMin: 74, dmgMax: 106, secondary: { 'magic-find': 18, chaosDamage: 16 } },
    ],
  },
];

const OUT_DIR = new URL('../public/item-data/weapons/', import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });

for (const { tier, items } of TIERS) {
  const weapons = items.map((item) => makeWeapon({ ...item, tier }));
  const outPath = new URL(`weapon_tier${tier}.json`, OUT_DIR);
  writeFileSync(outPath, JSON.stringify(weapons, null, 2) + '\n', 'utf-8');
  console.log(`✅ ${outPath.pathname} (${weapons.length} Items)`);
}

// ═══════════════════════════════════════════════════════════════════════
// Materialien: Item-Schleifpapier (physisch) + Item-UpgradeCreme (magisch)
// ═══════════════════════════════════════════════════════════════════════

const MATERIALS = [
  {
    name: 'Item-Schleifpapier',
    description: 'Feines Schleifpapier, um die Schneide oder Wucht einer nicht-magischen Waffe zu verbessern. Selten im Handel zu finden.',
    'img-path': 'imgs/items/material/grinding_paper.webp',
    price: 180,
    'armor-slot': 'material',
    tier: '1',
    'material-type': 'grinding',
    stats: JSON.parse(JSON.stringify(STATS_TEMPLATE)),
  },
  {
    name: 'Item-UpgradeCreme',
    description: 'Alchemistische Creme, die die magische Resonanz einer Waffe verstärkt. Nur wenige Alchemisten beherrschen das Rezept.',
    'img-path': 'imgs/items/material/upgrade_creme.webp',
    price: 420,
    'armor-slot': 'material',
    tier: '1',
    'material-type': 'upgrade-creme',
    stats: JSON.parse(JSON.stringify(STATS_TEMPLATE)),
  },
];

const materialsPath = new URL('../public/item-data/materials.json', import.meta.url);
writeFileSync(materialsPath, JSON.stringify(MATERIALS, null, 2) + '\n', 'utf-8');
console.log(`✅ ${materialsPath.pathname} (${MATERIALS.length} Items)`);

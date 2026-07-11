// scripts/generate-monsters.mjs
//
// Generiert die 5 Düsterwald-Monster-JSONs (public/mosters/dark-forest/dark-forest.*.json)
// aus den in balance-sim.mjs getunten Stat-Tabellen. Vermeidet ~2800 Zeilen handgetippter,
// repetitiver Frame-Pfad-Arrays (Goblin/Zyklop-Sprites werden reihum recycelt, siehe Plan).
//
// Nutzung: node scripts/generate-monsters.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BRACKETS, BRACKET_ORDER, buildMonster } from './balance-sim.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'mosters', 'dark-forest');

function pad(n, width) {
  return String(n).padStart(width, '0');
}

/** Anzahl Frames zwischen start und end (inklusive) — für frameBatchCount. */
function frameBatchCount(start, end) {
  return end - start + 1;
}

// Frame-Anzahl 1:1 aus den tatsächlichen Dateien auf der Platte übernommen
// (public/imgs/areas/dark-forest/monsters/<goblin|zyklop>/<intro|idle>/).
// Statt vollständiger Pfad-Arrays reicht jetzt EIN Beispielpfad (erstes
// Frame) + frameBatchCount — expandFrameBatch() im Frontend baut daraus
// die vollen Arrays (siehe src/app/utils/frame-paths.util.ts).
const SPRITES = {
  goblin: {
    introDuration: 2500,
    introPath: `imgs/areas/dark-forest/monsters/goblin/intro/frame_${pad(0, 4)}.webp`,
    introFrameBatchCount: frameBatchCount(0, 28),
    idleDuration: 5000,
    idlePath: `imgs/areas/dark-forest/monsters/goblin/idle/frame_${pad(0, 4)}.webp`,
    idleFrameBatchCount: frameBatchCount(0, 27),
  },
  zyklop: {
    introDuration: 2500,
    introPath: `imgs/areas/dark-forest/monsters/zyklop/intro/frame_${pad(0, 4)}.webp`,
    introFrameBatchCount: frameBatchCount(0, 28),
    idleDuration: 5000,
    idlePath: `imgs/areas/dark-forest/monsters/zyklop/idle/frame_${pad(0, 4)}.webp`,
    idleFrameBatchCount: frameBatchCount(0, 30),
  },
};

const ATTACK_DURATION = 2500;
const ATTACK_PATH = `imgs/areas/dark-forest/intro/frame_${pad(1, 4)}.webp`;
const ATTACK_FRAME_BATCH_COUNT = frameBatchCount(1, 24);

/** Rolle → wiederverwendetes Sprite-Set (siehe Plan: Goblin=agil/klein, Zyklop=groß/zäh). */
const ROLE_SPRITE = {
  grunt: 'goblin',
  scout: 'goblin',
  caster: 'goblin',
  beast: 'goblin',
  brute: 'zyklop',
  elite: 'zyklop',
  aberration: 'zyklop',
};

/** Spell-ID passend zum Bracket-Spellwert aus BRACKETS (siehe Plan A2). */
const BRACKET_SPELL_ID = {
  '1-10': 'spell_fire_01',
  '11-20': 'spell_cold_01',
  '21-30': 'spell_lightning_01',
  '31-40': 'spell_fire_02',
  '41-50': 'spell_chaos_01',
};

/** EXP-Basiswert je Bracket (~4-5 Kills/Level bei gemischtem Rollen-Mix), Rollen-Multiplikator siehe unten. */
const BRACKET_BASE_EXP = {
  '1-10': 60,
  '11-20': 150,
  '21-30': 350,
  '31-40': 830,
  '41-50': 1950,
};

const ROLE_EXP_MULT = {
  grunt: 0.7,
  scout: 0.8,
  caster: 0.8,
  beast: 0.9,
  brute: 1.3,
  elite: 1.6,
  aberration: 1.8,
};

/** Bracket → 7 Monster-Namen in Rollen-Reihenfolge [grunt, scout, caster, beast, brute, elite, aberration]. */
const MONSTER_NAMES = {
  '1-10': ['Goblin', 'Waldläufer-Kobold', 'Wurzelhexe', 'Dornwolf', 'Zyklop', 'Zyklopen-Stammeswächter', 'Moosschrecken'],
  '11-20': ['Goblin-Plünderer', 'Schattenläufer', 'Sumpfhexe', 'Klingenspinne', 'Höhlentroll', 'Trollwächter', 'Wurzelschrecken'],
  '21-30': ['Orc-Plünderer', 'Nachtklingen-Assassine', 'Nekromanten-Lehrling', 'Klauenpanther', 'Steinriese', 'Orc-Kriegshäuptling', 'Blutmoor-Schrecken'],
  '31-40': ['Untoter Legionär', 'Geisterklinge', 'Verfluchter Magier', 'Schattenluchs', 'Knochenkoloss', 'Grabmalwächter', 'Seelenfresser'],
  '41-50': ['Dämonischer Vollstrecker', 'Nachtschatten-Attentäter', 'Chaos-Zauberer', 'Blutmond-Panther', 'Erzdämon-Koloss', 'Düsterwald-Tyrann', 'Der Wurzelfürst'],
};

/** Bracket → ID-Präfix (Bracket 1-10 behält die bereits etablierten IDs darkforest_mob_01/02). */
const ID_PREFIX = {
  '1-10': 'darkforest_mob',
  '11-20': 'darkforest_b1120_mob',
  '21-30': 'darkforest_b2130_mob',
  '31-40': 'darkforest_b3140_mob',
  '41-50': 'darkforest_b4150_mob',
};

const ROLE_ORDER = ['grunt', 'scout', 'caster', 'beast', 'brute', 'elite', 'aberration'];

/** Grob abgeleitete Flavor-Attribute (nicht kampfrelevant, nur Schema-Konsistenz mit dem Bestand). */
function flavorAttributes(monster, roleKey) {
  const scale = Math.max(1, Math.round(monster.attack / 4));
  return {
    dexterity: roleKey === 'scout' || roleKey === 'beast' ? scale + 2 : scale,
    strength: roleKey === 'brute' || roleKey === 'beast' ? scale + 2 : scale,
    vitality: roleKey === 'brute' || roleKey === 'aberration' ? scale + 2 : scale,
  };
}

function buildMonsterJson(bracketKey, roleKey, index) {
  const stats = buildMonster(bracketKey, roleKey);
  const spriteKey = ROLE_SPRITE[roleKey];
  const sprite = SPRITES[spriteKey];
  const name = MONSTER_NAMES[bracketKey][index];
  const id = `${ID_PREFIX[bracketKey]}_${pad(index + 1, 2)}`;
  const expReward = Math.round(BRACKET_BASE_EXP[bracketKey] * ROLE_EXP_MULT[roleKey]);
  const flavor = flavorAttributes(stats, roleKey);

  const spells = stats.hasSpell ? [{ id: BRACKET_SPELL_ID[bracketKey] }] : [];

  return {
    id,
    name,

    'intro-duration': sprite.introDuration,
    'intro-path': sprite.introPath,
    'intro-frameBatchCount': sprite.introFrameBatchCount,

    'idle-duration': sprite.idleDuration,
    'idle-path': sprite.idlePath,
    'idle-frameBatchCount': sprite.idleFrameBatchCount,

    'attack-duration': ATTACK_DURATION,
    'attack-path': ATTACK_PATH,
    'attack-frameBatchCount': ATTACK_FRAME_BATCH_COUNT,

    hp: stats.hp,
    expReward,
    mana: 100,
    spells,
    resistances: {
      fire: stats.resistance ?? 0,
      cold: stats.resistance ?? 0,
      lightning: stats.resistance ?? 0,
      chaos: stats.resistance ?? 0,
    },
    dexterity: flavor.dexterity,
    strength: flavor.strength,
    vitality: flavor.vitality,
    luck: stats.luck,
    'energy-shield': 0,
    'magic-find': 0,
    armor: stats.armor ?? 0,
    attack: stats.attack,
    magicAttack: stats.magicAttack,
    initiative: stats.initiative,
    evasion: stats.evasion,
    critChance: stats.critChance,
    critDamage: stats.critDamage,
    chaosDamage: 0,
  };
}

for (const bracketKey of BRACKET_ORDER) {
  const monsters = ROLE_ORDER.map((roleKey, index) => buildMonsterJson(bracketKey, roleKey, index));
  const fileName = `dark-forest.${bracketKey}.json`;
  const outPath = join(OUT_DIR, fileName);
  writeFileSync(outPath, JSON.stringify(monsters, null, 2) + '\n', 'utf-8');
  console.log(`✅ ${fileName} geschrieben (${monsters.length} Monster)`);
}

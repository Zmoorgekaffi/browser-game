// scripts/patch-monster-defense.mjs
//
// Schreibt die in balance-sim.mjs getunten hp/armor/resistance-Werte in die
// bestehenden public/mosters/dark-forest/dark-forest.*.json OHNE die anderen,
// von Hand ergänzten Felder (fight-background, monster-frame, Sprite-Pfade,
// spells, ...) zu berühren — im Gegensatz zu generate-monsters.mjs, das die
// komplette Datei neu schreibt und diese Felder wieder verlieren würde.
//
// Patcht je Monster (nach Index, Rollen-Reihenfolge grunt/scout/caster/beast/
// brute/elite/aberration): hp, attack, magicAttack, luck, critChance, armor,
// resistances.{fire,cold,lightning,chaos}. initiative/evasion/critDamage bleiben
// unverändert (deren Bracket-Basiswerte wurden in dieser Runde nicht angefasst).
// spellValue wird NICHT hier gepatcht — das ist kein Monster-Feld, sondern der
// effectValues.value der referenzierten Spell-JSON (z.B. spell_fire_01), gemeinsam
// für Spieler UND Monster; siehe BRACKET_SPELL_ID in generate-monsters.mjs.
//
// Nutzung: node scripts/patch-monster-defense.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BRACKET_ORDER, ROLES, buildMonster } from './balance-sim.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'mosters', 'dark-forest');

const ROLE_ORDER = Object.keys(ROLES); // grunt, scout, caster, beast, brute, elite, aberration

for (const bracketKey of BRACKET_ORDER) {
  const fileName = `dark-forest.${bracketKey}.json`;
  const filePath = join(OUT_DIR, fileName);
  const monsters = JSON.parse(readFileSync(filePath, 'utf-8'));

  if (monsters.length !== ROLE_ORDER.length) {
    console.error(`❌ ${fileName}: erwartet ${ROLE_ORDER.length} Monster, gefunden ${monsters.length} — übersprungen.`);
    continue;
  }

  ROLE_ORDER.forEach((roleKey, index) => {
    const tuned = buildMonster(bracketKey, roleKey);
    const monster = monsters[index];
    const oldHp = monster.hp;
    const oldArmor = monster.armor;
    const oldAttack = monster.attack;
    const oldLuck = monster.luck;

    monster.hp = tuned.hp;
    monster.attack = tuned.attack;
    monster.magicAttack = tuned.magicAttack;
    monster.luck = tuned.luck;
    monster.critChance = tuned.critChance;
    monster.armor = tuned.armor;
    monster.resistances = {
      fire: tuned.resistance,
      cold: tuned.resistance,
      lightning: tuned.resistance,
      chaos: tuned.resistance,
    };

    console.log(
      `  ${fileName} [${index}] ${monster.name.padEnd(28)} hp ${String(oldHp).padStart(4)} → ${String(tuned.hp).padStart(4)}  ` +
      `attack ${String(oldAttack).padStart(3)} → ${String(tuned.attack).padStart(3)}  luck ${String(oldLuck).padStart(3)} → ${String(tuned.luck).padStart(3)}  armor ${oldArmor} → ${tuned.armor}`,
    );
  });

  writeFileSync(filePath, JSON.stringify(monsters, null, 2) + '\n', 'utf-8');
  console.log(`✅ ${fileName} gepatcht (hp/armor/resistances)\n`);
}

// scripts/item-damage-buff-t2-t4.mjs
//
// Hebt den GESAMTEN Schaden (Waffen UND Damage-Spells) von Tier 2-4 um einen
// festen Faktor an. Hintergrund: gemessen (siehe fight-tool-monster-curve-
// calibration-31-40.mjs / src/docs/fight-tool-balance-report.md Abschnitt
// "Waffen-/Spell-Schaden"), dass selbst ein voll ausgerüsteter T4-Dual-Wield-
// Charakter (Level 40) gegen ein für sein Level passendes Monster (1400 HP)
// ~20 Runden statt der angestrebten ~6-12 Runden brauchte -- Waffenschaden
// war der limitierende Faktor, nicht Ausweichen/HP (die wurden bereits
// separat gefixt, siehe monster-carry-over.mjs).
//
// Betrifft NUR Tier 2-4 (T1/T5 bewusst ausgenommen -- Bracket 1-10 ist
// bereits kalibriert und validiert, T5/Bracket 41-50 ist nicht Teil dieses
// Auftrags):
//  - public/item-data/weapons/weapon_tier{2,3,4}.json: damage-min/max UND
//    magic-damage-min/max (Zauberstäbe).
//  - public/item-data/skills/physical/physicalspells_tier{2,3,4}.json
//  - public/item-data/skills/magic/{fire,cold,lightning,chaos}/..._tier{2,3,4}.json
//    (effectValues.value -- reine Schadens-Spells, PHYSICAL_DAMAGE/
//    ELEMENTAL_DAMAGE)
// NICHT betroffen: Heal-/Energy-Shield-Spells (kein Schaden), Rüstungs-
// Slots (armor/Resistenzen/Attribute unverändert), Tier 1 und Tier 5.
//
// Nutzung: node scripts/item-damage-buff-t2-t4.mjs [--apply] [multiplier]
// Ohne --apply: nur anzeigen, was sich ändern würde (Trockenlauf).
// Default-Multiplikator: 1.9 (siehe Report für die Herleitung).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const MULT = Number(process.argv.find((a) => !a.startsWith('--') && !a.includes('item-damage-buff'))) || 1.9;

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf-8'));
}
function writeJson(relPath, data) {
  if (APPLY) fs.writeFileSync(path.join(ROOT, relPath), JSON.stringify(data, null, 2) + '\n');
}

console.log(`⚔️  Schadens-Multiplikator: ${MULT}x (Tier 2-4, Waffen + Damage-Spells)\n`);

const TIERS = [2, 3, 4];
let totalChanges = 0;

// ── Waffen ──────────────────────────────────────────────────────────────
for (const tier of TIERS) {
  const relPath = `public/item-data/weapons/weapon_tier${tier}.json`;
  const weapons = loadJson(relPath);
  const updated = weapons.map((w) => {
    const s = { ...w.stats };
    const before = { dMin: s['damage-min'] ?? 0, dMax: s['damage-max'] ?? 0, mMin: s['magic-damage-min'] ?? 0, mMax: s['magic-damage-max'] ?? 0 };
    if (s['damage-min']) s['damage-min'] = Math.round(s['damage-min'] * MULT);
    if (s['damage-max']) s['damage-max'] = Math.round(s['damage-max'] * MULT);
    if (s['magic-damage-min']) s['magic-damage-min'] = Math.round(s['magic-damage-min'] * MULT);
    if (s['magic-damage-max']) s['magic-damage-max'] = Math.round(s['magic-damage-max'] * MULT);
    console.log(
      `  [T${tier}] ${w.name.padEnd(30)} dmg ${before.dMin}-${before.dMax} → ${s['damage-min'] ?? 0}-${s['damage-max'] ?? 0}` +
      (before.mMin || before.mMax ? `  magic ${before.mMin}-${before.mMax} → ${s['magic-damage-min'] ?? 0}-${s['magic-damage-max'] ?? 0}` : ''),
    );
    totalChanges++;
    return { ...w, stats: s };
  });
  writeJson(relPath, updated);
}

// ── Damage-Spells ───────────────────────────────────────────────────────
const SPELL_CATEGORIES = [
  'skills/physical/physicalspells',
  'skills/magic/fire/firespells',
  'skills/magic/cold/coldspells',
  'skills/magic/lightning/lightningspells',
  'skills/magic/chaos/chaosspells',
];

for (const category of SPELL_CATEGORIES) {
  for (const tier of TIERS) {
    const relPath = `public/item-data/${category}_tier${tier}.json`;
    const spells = loadJson(relPath);
    const updated = spells.map((s) => {
      if (s.effectType !== 'PHYSICAL_DAMAGE' && s.effectType !== 'ELEMENTAL_DAMAGE') return s;
      const before = s.effectValues.value;
      const after = Math.round(before * MULT);
      console.log(`  [T${tier}] ${s.name.padEnd(30)} ${s.effectType.padEnd(17)} value ${before} → ${after}`);
      totalChanges++;
      return { ...s, effectValues: { ...s.effectValues, value: after } };
    });
    writeJson(relPath, updated);
  }
}

console.log(`\n${totalChanges} Einträge ${APPLY ? 'aktualisiert' : 'würden aktualisiert (Trockenlauf)'}.`);
if (!APPLY) console.log('ℹ️  Trockenlauf — mit --apply erneut ausführen, um die Werte tatsächlich zu übernehmen.');

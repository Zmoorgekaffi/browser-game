// scripts/balance-sim.mjs
import { pathToFileURL } from 'node:url';
//
// Standalone Node-Simulation der Kampf-Mathematik aus src/app/services/fight.service.ts,
// um Monster-Stats gegen einen angenommenen Durchschnitts-Charakter zu balancen, OHNE
// hunderte manuelle Kämpfe im Browser zu spielen.
//
// Nachgebildet (1:1 aus fight.service.ts):
//  - resolveAttack(): Ausweichen (1w20+Evasion vs. 1w20+Glück), dann Krit
//    (1w10+CritChance-5 = %, Multiplikator 1+critDamage/2/100)
//  - applyDamageToPlayer(): Monster-Schaden wird zusätzlich 0.75-1.0 zufällig skaliert
//  - applyArmorMitigation(): Rüstung mindert physischen Schaden per Diminishing-Returns
//    (armor/(armor+150), gedeckelt bei 75%) — NICHT linear wie Elementar-Resistenz, da
//    Rüstungs-Item-Werte eine ganz andere Zahlenskala haben (siehe GEAR_BY_TIER unten
//    und combat-roll.util.ts)
//  - monsterTurn(): 50% Chance/Zug auf Spell statt Basisangriff (falls Monster Spells hat)
//  - rollInitiative(): 1w20 + (playerInit - monsterInit) > 10 → Spieler beginnt
//  - SkillsService.applyAttributeScaling(): physicalDamageMultiplier = 1 + strength/10000,
//    magicDamageMultiplier = 1 + intelligence/10000 (str/int wirken NICHT mehr flach auf
//    attackMin/Max — das ist jetzt reine Waffen-Range, siehe WEAPON_MID_BY_TIER unten)
//
// Spieler-Baseline: NUR Basisangriff (kein eigener Spellcast) — das ist die
// konservative Untergrenze der Spieler-Power; Elementar-Resistenz auf Spieler-Seite
// wird in dieser Sim daher NUR gegen MONSTER-Spells getestet (monsterTurn-Zweig),
// nicht gegen eigene Elementar-Skills des Spielers (die castet er hier nie). Monster-
// Resistenz gegen Spieler-Elementarschaden bleibt entsprechend unverifiziert (siehe
// buildMonster). Rüstung (Monster UND Spieler) wirkt in BEIDE Richtungen, da beide
// Basisangriffe physisch sind.
//
// WICHTIG — Ausrüstung ist NICHT "1 Item", sondern 8 gleichzeitig bespielte Nicht-
// Waffen-Slots (head/chest/leg/gloves/footwear/necklace/ring-links/ring-rechts) PLUS
// Waffe(n). GEAR_BY_TIER ist daher die AUFSUMMIERTE Ausrüstung über alle 8 Slots
// (Ø der 4 "normalen" Item-Archetypen pro Kategorie/Tier aus public/item-data/equipment/**,
// die 5. "verfluchte" Glaskanonen-Variante pro Kategorie bewusst ausgeklammert, da kein
// repräsentativer Normal-Build). Das ergibt spürbar mehr Rüstung/Boni als ein einzelnes
// Item vermuten lässt (z.B. ~32 Rüstung schon bei Tier 1) — siehe applyArmorMitigation.
//
// Ein "bare" (0 Gear) Charakter oberhalb von Level 1 ist unrealistisch — wer Level 11+
// ist, hat unterwegs Tier-1(+)-Loot gesammelt. Deshalb: "Start" eines Brackets nimmt an,
// dass der Charakter noch die Ausrüstung des VORHERIGEN Brackets trägt, "Ende" nimmt die
// eigene Tier-Ausrüstung des Brackets an. Nur Bracket 1-10 startet bei 0 Gear (echter
// Frischling, Start-Waffe = Verrostetes Kurzschwert, siehe WEAPON_MID_BY_TIER[0]).
//
// Nutzung: node scripts/balance-sim.mjs

const ITERATIONS = 3000;

function rollDie(sides) {
  return 1 + Math.floor(Math.random() * sides);
}

const MAX_MITIGATION_PERCENT = 75;

/** 1 Resistenz-Punkt = 1% Schadens-Mitigation, gedeckelt bei 75% (linear, combat-roll.util.ts). */
function applyResistanceMitigation(damage, resistancePercent) {
  const capped = Math.min(Math.max(resistancePercent, 0), MAX_MITIGATION_PERCENT);
  return Math.round(damage * (1 - capped / 100));
}

/** Diminishing-Returns-Konstante für Rüstung (siehe combat-roll.util.ts). */
const ARMOR_MITIGATION_K = 150;

/** Rüstung mindert Schaden per armor/(armor+K)-Kurve, gedeckelt bei 75% (combat-roll.util.ts). */
function applyArmorMitigation(damage, armor) {
  if (armor <= 0) return damage;
  const raw = (armor / (armor + ARMOR_MITIGATION_K)) * 100;
  const capped = Math.min(raw, MAX_MITIGATION_PERCENT);
  return Math.round(damage * (1 - capped / 100));
}

/**
 * Ø Waffenschaden ((min+max)/2, gemittelt über die 8 Waffen/Tier aus
 * public/item-data/weapons/weapon_tierN.json) je Gear-Tier. Ersetzt die frühere
 * Stärke/Intelligenz-Flatskalierung als PRIMÄRE Schadensquelle. Tier 0 = Start-
 * Waffe (Verrostetes Kurzschwert, attack: 12 flat, siehe default-character.data.ts).
 * Gilt vereinfachend gleichermaßen für attack UND magicAttack (Sim testet ohnehin nur
 * den physischen Basisangriff, siehe Kommentar oben).
 */
const WEAPON_MID_BY_TIER = { 0: 12, 1: 14, 2: 28, 3: 44, 4: 61, 5: 77 };

/**
 * Aufsummierte Ausrüstungs-Boni über ALLE 8 Nicht-Waffen-Slots (head, chest, leg,
 * gloves, footwear, necklace, ring×2) je Tier. Werte (Armor, resistancePerElement)
 * sind der Ø aus 100 zufälligen Vollausrüstungen je Tier (alle 5 Item-Archetypen pro
 * Kategorie inkl. der "verfluchten" Glaskanonen-Variante — siehe reverse-engineering-
 * Lauf in der PR-Historie), NICHT mehr aus der Luft gegriffen. Restliche Felder (attack,
 * strength, ...) weiterhin aus dem Ø der 4 "normalen" Archetypen (siehe unten).
 *
 * Ergebnis: Armor-Mitigation (armor/(armor+150)) und Resistenz-Mitigation (linear,
 * gedeckelt 75%) landen bei einem T5-Charakter im Schnitt bei ~74% bzw. ~61% —
 * das bestätigt, dass der 75%-Deckel bei MAX-Stufe wirklich gebraucht wird (siehe
 * TARGET_HIT_FRACTION unten: Monster-Schaden wird GEGEN diese Mitigation gerechnet,
 * nicht umgekehrt gegen 0-Mitigation gebalanced).
 */
const GEAR_BY_TIER = {
  0: { armor: 0, attack: 0, magicAttack: 0, strength: 0, dexterity: 0, intelligence: 0, vitality: 0, luck: 0, evasion: 0, critChance: 0, critDamage: 0, energyShield: 0, resistancePerElement: 0 },
  1: { armor: 29, attack: 0, magicAttack: 2, strength: 4, dexterity: 5, intelligence: 7, vitality: 4, luck: 2, evasion: 4, critChance: 2, critDamage: 0, energyShield: 22, resistancePerElement: 4 },
  2: { armor: 59, attack: 1, magicAttack: 4, strength: 7, dexterity: 11, intelligence: 15, vitality: 10, luck: 4, evasion: 9, critChance: 4, critDamage: 0, energyShield: 47, resistancePerElement: 8 },
  3: { armor: 120, attack: 3, magicAttack: 10, strength: 15, dexterity: 25, intelligence: 30, vitality: 21, luck: 9, evasion: 18, critChance: 10, critDamage: 2, energyShield: 98, resistancePerElement: 20 },
  4: { armor: 221, attack: 8, magicAttack: 19, strength: 28, dexterity: 48, intelligence: 55, vitality: 41, luck: 17, evasion: 35, critChance: 19, critDamage: 8, energyShield: 184, resistancePerElement: 34 },
  5: { armor: 436, attack: 21, magicAttack: 38, strength: 53, dexterity: 92, intelligence: 101, vitality: 80, luck: 35, evasion: 69, critChance: 39, critDamage: 19, energyShield: 360, resistancePerElement: 61 },
};

/**
 * Ziel-Anteil der Spieler-Max-HP, den ein Grunt-Treffer NACH Mitigation (Rüstung
 * bzw. Resistenz) noch anrichten soll — sowohl physisch als auch elementar. Andere
 * Rollen skalieren relativ dazu über ROLES[*].attack/magicAttackMult.
 *
 * Kernidee (User-Vorgabe): Der 75%-Mitigations-Deckel existiert bewusst dafür, dass
 * ein maximal ausgerüsteter Charakter ihn auch BRAUCHT — also muss der rohe
 * Monster-Schaden so hoch sein, dass selbst nach ~74% Rüstungs- bzw. ~61%
 * Resistenz-Mitigation (Ø-Werte bei Tier 5, siehe GEAR_BY_TIER) noch spürbarer
 * Schaden durchkommt. Roh-Schaden wird deshalb RÜCKWÄRTS aus der Mitigation JEDES
 * Brackets berechnet (siehe computeBaseAttack/computeBaseMagicAttack), statt wie
 * in der Vorversion dieses Skripts von Hand geraten.
 */
const TARGET_HIT_FRACTION = 0.12;

/** Rüstungs-Mitigation, die ein Charakter mit dieser Tier-Ausrüstung im Schnitt hat. */
function armorMitigationPercentAtTier(gearTier) {
  const armor = GEAR_BY_TIER[gearTier]?.armor ?? 0;
  if (armor <= 0) return 0;
  return Math.min((armor / (armor + ARMOR_MITIGATION_K)) * 100, MAX_MITIGATION_PERCENT);
}

/** Resistenz-Mitigation (linear, gedeckelt), die ein Charakter mit dieser Tier-Ausrüstung im Schnitt hat. */
function resistanceMitigationPercentAtTier(gearTier) {
  const res = GEAR_BY_TIER[gearTier]?.resistancePerElement ?? 0;
  return Math.min(Math.max(res, 0), MAX_MITIGATION_PERCENT);
}

/**
 * Roher (Vor-Mitigation) physischer Grunt-Angriffswert, der bei der für dieses
 * Bracket ERWARTETEN Rüstungs-Mitigation (Ende-Gear-Tier) noch TARGET_HIT_FRACTION
 * der Spieler-Max-HP durchbringt. `endPlayerHp` = HP eines Charakters am ENDE
 * dieses Brackets (siehe playerAtLevel).
 */
function computeBaseAttack(endPlayerHp, gearTier) {
  const mitigation = armorMitigationPercentAtTier(gearTier) / 100;
  return Math.round((TARGET_HIT_FRACTION * endPlayerHp) / (1 - mitigation));
}

/**
 * Analog zu computeBaseAttack, aber für den KOMBINIERTEN Magie-Schaden
 * (spellValue + magicAttack) einer "hasSpell"-Rolle gegen Resistenz-Mitigation.
 * Aufgeteilt 70/30 auf spellValue/baseMagicAttack (grobe Anlehnung an die
 * bisherige Gewichtung, siehe buildMonster — magicAttack wird zusätzlich mit
 * ROLES[*].magicAttackMult skaliert, spellValue bracket-weit geteilt).
 */
function computeMagicSplit(endPlayerHp, gearTier, casterMagicAttackMult) {
  const mitigation = resistanceMitigationPercentAtTier(gearTier) / 100;
  const combined = (TARGET_HIT_FRACTION * endPlayerHp) / (1 - mitigation);
  const baseMagicAttack = Math.round((combined * 0.3) / casterMagicAttackMult);
  const spellValue = Math.round(combined * 0.7);
  return { baseMagicAttack, spellValue };
}

/** 1:1 Port von SkillsService.applyAttributeScaling() + Basiswerten + Gear-Bonus (alle 8 Slots) + Waffen-Range. */
function playerAtLevel(level, gearTier = 0) {
  const statPoints = 5 * (level - 1);
  const perStat = Math.floor(statPoints / 4);
  const remainder = statPoints - perStat * 4;

  const gear = GEAR_BY_TIER[gearTier] ?? GEAR_BY_TIER[0];

  const strength = 5 + perStat + gear.strength;
  const dexterity = 5 + perStat + gear.dexterity;
  const intelligence = 5 + perStat + gear.intelligence;
  const vitality = 5 + perStat + remainder + gear.vitality; // Rest-Punkte in Vitalität geparkt

  const weaponMid = WEAPON_MID_BY_TIER[gearTier] ?? WEAPON_MID_BY_TIER[0];

  // Waffen-Range + flacher Item-Bonus (Ringe/Ketten/etc. können attack/magic-attack
  // tragen, siehe addWeaponRangeStats) sind die Quelle für attack/magicAttack —
  // Stärke/Intelligenz wirken NUR noch über den Multiplikator (siehe simulateOneFight).
  const attack = weaponMid + gear.attack;
  const magicAttack = weaponMid + gear.magicAttack;
  const physicalDamageMultiplier = 1 + strength / 10000;
  const magicDamageMultiplier = 1 + intelligence / 10000;

  const initiative = 10 + dexterity * 2;
  const hp = 100 + vitality * 3;
  const mana = 20 + intelligence * 5;
  const luck = 5 + gear.luck;
  const critChance = 5 + Math.floor(luck * 0.2) + gear.critChance;
  const critDamage = 150 + gear.critDamage;
  const evasion = 5 + gear.evasion;
  const energyShield = intelligence * 2 + gear.energyShield;
  const armor = gear.armor;
  const resistancePerElement = gear.resistancePerElement;

  return {
    hp, mana, attack, magicAttack, physicalDamageMultiplier, magicDamageMultiplier,
    initiative, evasion, luck, critChance, critDamage, armor, energyShield, resistancePerElement,
  };
}

/** 1:1 Port von FightService.resolveAttack() (nur Ausweichen + Krit, OHNE Mitigation). */
function resolveAttack(rawDamage, { attackerLuck, attackerCritChance, attackerCritDamage, defenderEvasion }) {
  const defenseTotal = rollDie(20) + defenderEvasion;
  const attackTotal = rollDie(20) + attackerLuck;
  if (defenseTotal >= attackTotal) return { finalDamage: 0, dodged: true };

  const critChancePercent = rollDie(10) + attackerCritChance - 5;
  if (Math.random() * 100 < critChancePercent) {
    const finalDamage = Math.round(rawDamage * (1 + attackerCritDamage / 2 / 100));
    return { finalDamage, dodged: false };
  }
  return { finalDamage: rawDamage, dodged: false };
}

/** 1:1 Port von FightService.rollInitiative(). */
function rollInitiative(playerInitiative, monsterInitiative) {
  const diff = playerInitiative - monsterInitiative;
  const result = rollDie(20) + diff;
  return result > 10 ? 'player' : 'monster';
}

function simulateOneFight(player, monster) {
  let playerHp = player.hp;
  let playerShield = player.energyShield ?? 0; // einmaliger Pool pro Kampf, regeneriert nicht (drainEnergyShield)
  let monsterHp = monster.hp;
  let turn = rollInitiative(player.initiative, monster.initiative);
  let rounds = 0;

  while (playerHp > 0 && monsterHp > 0 && rounds < 300) {
    if (turn === 'player') {
      const rawDamage = Math.round(player.attack * player.physicalDamageMultiplier);
      const { finalDamage, dodged } = resolveAttack(rawDamage, {
        attackerLuck: player.luck,
        attackerCritChance: player.critChance,
        attackerCritDamage: player.critDamage,
        defenderEvasion: monster.evasion,
      });
      if (!dodged) {
        const mitigated = applyArmorMitigation(finalDamage, monster.armor ?? 0);
        monsterHp -= mitigated;
      }
      turn = 'monster';
    } else {
      let rawDamage = monster.attack;
      let isSpell = false;
      if (monster.hasSpell && Math.random() > 0.5) {
        rawDamage = monster.spellValue + monster.magicAttack;
        isSpell = true;
      }
      const scaled = Math.round(rawDamage * (0.75 + Math.random() * 0.25));
      const { finalDamage, dodged } = resolveAttack(scaled, {
        attackerLuck: monster.luck,
        attackerCritChance: monster.critChance,
        attackerCritDamage: monster.critDamage,
        defenderEvasion: player.evasion,
      });
      if (!dodged) {
        // Spell-Schaden (Element) wird über Resistenz (linear) gemindert, Basisangriff
        // (physisch) über Rüstung (Diminishing Returns) — siehe applyResistanceMitigation
        // vs. applyArmorMitigation weiter oben, 1:1 wie SpellsEngineService/FightService.
        const mitigated = isSpell
          ? applyResistanceMitigation(finalDamage, player.resistancePerElement ?? 0)
          : applyArmorMitigation(finalDamage, player.armor ?? 0);
        if (playerShield > 0) {
          const absorbed = Math.min(playerShield, mitigated);
          playerShield -= absorbed;
          playerHp -= mitigated - absorbed;
        } else {
          playerHp -= mitigated;
        }
      }
      turn = 'player';
      rounds++;
    }
  }

  const playerWon = monsterHp <= 0 && playerHp > 0;
  return {
    playerWon,
    rounds,
    hpLostFraction: playerWon ? 1 - Math.max(0, playerHp) / player.hp : 1,
  };
}

function runBattery(player, monster, iterations = ITERATIONS) {
  let wins = 0;
  let totalRounds = 0;
  let totalHpLost = 0;

  for (let i = 0; i < iterations; i++) {
    const result = simulateOneFight(player, monster);
    if (result.playerWon) wins++;
    totalRounds += result.rounds;
    totalHpLost += result.hpLostFraction;
  }

  return {
    winRate: wins / iterations,
    avgRounds: totalRounds / iterations,
    avgHpLostPct: (totalHpLost / iterations) * 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Monster-Rollen: Multiplikatoren relativ zum Bracket-Base (Grunt = 1.0)
// ═══════════════════════════════════════════════════════════════════════

export const ROLES = {
  grunt: { hp: 1.0, attack: 1.0, initiative: 1.0, evasion: 1.0, luck: 1.0, critChance: 1.0, critDamage: 1.0, hasSpell: false, magicAttackMult: 1.0, defense: 1.0 },
  scout: { hp: 0.55, attack: 0.8, initiative: 1.3, evasion: 1.6, luck: 1.3, critChance: 1.5, critDamage: 1.1, hasSpell: false, magicAttackMult: 1.0, defense: 0.5 },
  caster: { hp: 0.65, attack: 0.5, initiative: 1.0, evasion: 1.0, luck: 1.0, critChance: 1.0, critDamage: 1.0, hasSpell: true, magicAttackMult: 1.5, defense: 0.4 },
  beast: { hp: 0.85, attack: 1.25, initiative: 1.15, evasion: 1.1, luck: 1.2, critChance: 1.4, critDamage: 1.5, hasSpell: false, magicAttackMult: 1.0, defense: 0.8 },
  brute: { hp: 2.3, attack: 1.3, initiative: 0.65, evasion: 0.85, luck: 0.9, critChance: 0.9, critDamage: 1.0, hasSpell: false, magicAttackMult: 1.0, defense: 2.4 },
  elite: { hp: 2.7, attack: 1.35, initiative: 1.0, evasion: 1.1, luck: 1.05, critChance: 1.1, critDamage: 1.15, hasSpell: true, magicAttackMult: 1.25, defense: 2.8 },
  aberration: { hp: 2.6, attack: 1.2, initiative: 0.9, evasion: 1.2, luck: 1.1, critChance: 1.05, critDamage: 1.1, hasSpell: true, magicAttackMult: 1.3, defense: 2.6 },
};

// ═══════════════════════════════════════════════════════════════════════
// Bracket-Basiswerte (werden hier iterativ getunt) + zugeordneter Spell.
// gearTier = Tier-Ausrüstung, die zum ENDE dieses Brackets angenommen wird
// (siehe TIER_DISTRIBUTION in dark-forest.class.ts).
//
// baseDefense = Basis-Rüstung/-Resistenz DES BRACKETS bei Rolle grunt (1.0),
// siehe ROLES[*].defense für den Rollen-Multiplikator. Bewusst moderat gehalten
// (weit unter dem 75%-Deckel), damit Rüstung eine spürbare, aber keine
// dominante zweite Verteidigungslinie neben Evasion/HP ist.
// ═══════════════════════════════════════════════════════════════════════

export const BRACKET_ORDER = ['1-10', '11-20', '21-30', '31-40', '41-50'];

/**
 * Bracket-Metadaten OHNE baseAttack/baseMagicAttack/spellValue — die werden weiter
 * unten aus TARGET_HIT_FRACTION + der bei diesem Gear-Tier zu erwartenden Mitigation
 * zurückgerechnet (computeBaseAttack/computeMagicSplit), nicht mehr von Hand geraten.
 * baseHp/baseDefense/baseEvasion/baseLuck/baseCritChance bleiben weiterhin von Hand
 * getunt (siehe Bracket-Iterationen in der PR-Historie).
 */
// baseLuck ist bewusst NICHT mehr an baseEvasion gekoppelt: Monster-Luck muss mit dem
// Ausweichen des Spielers (das über Gear stark wächst, siehe GEAR_BY_TIER.evasion)
// mithalten, damit Treffer überhaupt ankommen (siehe resolveAttack: 1w20+Luck vs.
// 1w20+Evasion) — sonst verpufft der ganze Reverse-Engineering-Schaden oben, weil das
// Monster den Spieler schlicht nie trifft. baseEvasion bleibt dagegen niedrig, damit
// der SPIELER seinerseits weiterhin zuverlässig trifft (asymmetrisch mit Absicht).
const BRACKET_META = {
  '1-10': { startLevel: 1, endLevel: 10, gearTier: 1, baseHp: 49, baseInitiative: 10, baseEvasion: 5, baseLuck: 8, baseCritChance: 5, baseCritDamage: 150, baseDefense: 1 },
  '11-20': { startLevel: 11, endLevel: 20, gearTier: 2, baseHp: 113, baseInitiative: 20, baseEvasion: 7, baseLuck: 12, baseCritChance: 6, baseCritDamage: 150, baseDefense: 2 },
  '21-30': { startLevel: 21, endLevel: 30, gearTier: 3, baseHp: 280, baseInitiative: 32, baseEvasion: 10, baseLuck: 20, baseCritChance: 8, baseCritDamage: 155, baseDefense: 6 },
  '31-40': { startLevel: 31, endLevel: 40, gearTier: 4, baseHp: 420, baseInitiative: 40, baseEvasion: 13, baseLuck: 42, baseCritChance: 9, baseCritDamage: 160, baseDefense: 9 },
  '41-50': { startLevel: 41, endLevel: 50, gearTier: 5, baseHp: 620, baseInitiative: 50, baseEvasion: 17, baseLuck: 78, baseCritChance: 10, baseCritDamage: 165, baseDefense: 12 },
};

export const BRACKETS = Object.fromEntries(
  Object.entries(BRACKET_META).map(([bracketKey, meta]) => {
    const endPlayerHp = playerAtLevel(meta.endLevel, meta.gearTier).hp;
    const baseAttack = computeBaseAttack(endPlayerHp, meta.gearTier);
    const { baseMagicAttack, spellValue } = computeMagicSplit(
      endPlayerHp,
      meta.gearTier,
      ROLES.caster.magicAttackMult,
    );
    return [bracketKey, { ...meta, baseAttack, baseMagicAttack, spellValue }];
  }),
);

export function buildMonster(bracketKey, roleKey) {
  const b = BRACKETS[bracketKey];
  const r = ROLES[roleKey];
  const defense = Math.round(b.baseDefense * r.defense);
  return {
    hp: Math.round(b.baseHp * r.hp),
    attack: Math.round(b.baseAttack * r.attack),
    magicAttack: Math.round(b.baseMagicAttack * r.magicAttackMult),
    initiative: Math.round(b.baseInitiative * r.initiative),
    evasion: Math.round(b.baseEvasion * r.evasion),
    luck: Math.round(b.baseLuck * r.luck),
    critChance: Math.round(b.baseCritChance * r.critChance),
    critDamage: Math.round(b.baseCritDamage * r.critDamage),
    hasSpell: r.hasSpell,
    spellValue: b.spellValue,
    // Armor UND alle 4 Elementar-Resistenzen bekommen denselben Wert (siehe
    // Kommentar oben: symmetrische physische/magische Zähigkeit, da diese Sim
    // nur den physischen Pfad testet und resistances hier nicht verifizierbar sind).
    armor: defense,
    resistance: defense,
  };
}

function formatPct(x) {
  return `${(x * 100).toFixed(0)}%`;
}

// Nur ausführen, wenn dieses Skript direkt gestartet wird (nicht beim
// Import der exportierten Tabellen/Funktionen aus generate-monsters.mjs).
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
runSimulationReport();
}

function runSimulationReport() {
console.log('='.repeat(100));
console.log(`Balance-Simulation (${ITERATIONS} Kämpfe je Matchup)`);
console.log('='.repeat(100));

BRACKET_ORDER.forEach((bracketKey, idx) => {
  const b = BRACKETS[bracketKey];
  const prevBracketKey = idx > 0 ? BRACKET_ORDER[idx - 1] : null;
  const startGearTier = prevBracketKey ? BRACKETS[prevBracketKey].gearTier : 0;

  console.log(`\n### Bracket ${bracketKey} ###`);

  const scenarios = [
    { label: `Start (Lvl ${b.startLevel}, Gear T${startGearTier})`, player: playerAtLevel(b.startLevel, startGearTier) },
    { label: `Ende (Lvl ${b.endLevel}, Gear T${b.gearTier})`, player: playerAtLevel(b.endLevel, b.gearTier) },
  ];

  for (const scenario of scenarios) {
    console.log(`\n  -- ${scenario.label} -- (Spieler: HP=${Math.round(scenario.player.hp)}, Attack=${Math.round(scenario.player.attack)}, Evasion=${Math.round(scenario.player.evasion)}, Luck=${Math.round(scenario.player.luck)})`);
    console.log('  Rolle       | Sieg-Rate | ⌀ Runden | ⌀ HP-Verlust | Rüstung/Res');
    console.log('  ' + '-'.repeat(70));
    for (const roleKey of Object.keys(ROLES)) {
      const monster = buildMonster(bracketKey, roleKey);
      const result = runBattery(scenario.player, monster);
      console.log(
        `  ${roleKey.padEnd(11)} | ${formatPct(result.winRate).padStart(9)} | ${result.avgRounds.toFixed(1).padStart(8)} | ${result.avgHpLostPct.toFixed(0).padStart(11)}% | ${String(monster.armor).padStart(3)}`,
      );
    }
  }
});

console.log('\n' + '='.repeat(100));
console.log('Zielkorridor "normal" (grunt/scout/caster/beast): Sieg-Rate 65-90%, 3-8 Runden, 15-45% HP-Verlust');
console.log('Zielkorridor "hart"   (brute/elite/aberration):   Sieg-Rate 45-80%, 4-10 Runden, 25-60% HP-Verlust');

// ═══════════════════════════════════════════════════════════════════════
// --dump: rohe Stat-Blöcke je Bracket/Rolle als JSON ausgeben (Basis für
// die finalen Monster-JSONs — Namen/Lore/Sprite-Pfade werden von Hand ergänzt).
// ═══════════════════════════════════════════════════════════════════════
if (process.argv.includes('--dump')) {
  console.log('\n' + '='.repeat(100));
  console.log('RAW STAT DUMP');
  console.log('='.repeat(100));
  for (const bracketKey of BRACKET_ORDER) {
    const dump = {};
    for (const roleKey of Object.keys(ROLES)) {
      dump[roleKey] = buildMonster(bracketKey, roleKey);
    }
    console.log(`\n-- ${bracketKey} --`);
    console.log(JSON.stringify(dump, null, 2));
  }
}
} // Ende runSimulationReport()

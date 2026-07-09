import { Injectable, signal } from '@angular/core';

// ─────────────────────────────────────────────────────────────────────────
// JSON-Imports zur BUILD-ZEIT. Der Bundler (Vite/Webpack) packt den Inhalt
// direkt ins JS-Bundle — kein fetch() zur Laufzeit nötig, daher synchron
// ab dem allerersten Moment verfügbar.
//
// WICHTIG: Dafür muss in der tsconfig.json stehen:
//   "resolveJsonModule": true,
//   "esModuleInterop": true
//
// Trage hier deine echten Pfade ein:
// ─────────────────────────────────────────────────────────────────────────
// 🆕 Tier 1-5 pro Kategorie (ersetzt die früheren flachen *-skills.json
// Dateien) — jede Tier-Datei enthält genau einen Spell dieser Stärkestufe.
import healSkillsTier1 from '../../../public/item-data/skills/heal/healspells_tier1.json';
import healSkillsTier2 from '../../../public/item-data/skills/heal/healspells_tier2.json';
import healSkillsTier3 from '../../../public/item-data/skills/heal/healspells_tier3.json';
import healSkillsTier4 from '../../../public/item-data/skills/heal/healspells_tier4.json';
import healSkillsTier5 from '../../../public/item-data/skills/heal/healspells_tier5.json';
import chaosSkillsTier1 from '../../../public/item-data/skills/magic/chaos/chaosspells_tier1.json';
import chaosSkillsTier2 from '../../../public/item-data/skills/magic/chaos/chaosspells_tier2.json';
import chaosSkillsTier3 from '../../../public/item-data/skills/magic/chaos/chaosspells_tier3.json';
import chaosSkillsTier4 from '../../../public/item-data/skills/magic/chaos/chaosspells_tier4.json';
import chaosSkillsTier5 from '../../../public/item-data/skills/magic/chaos/chaosspells_tier5.json';
import coldSkillsTier1 from '../../../public/item-data/skills/magic/cold/coldspells_tier1.json';
import coldSkillsTier2 from '../../../public/item-data/skills/magic/cold/coldspells_tier2.json';
import coldSkillsTier3 from '../../../public/item-data/skills/magic/cold/coldspells_tier3.json';
import coldSkillsTier4 from '../../../public/item-data/skills/magic/cold/coldspells_tier4.json';
import coldSkillsTier5 from '../../../public/item-data/skills/magic/cold/coldspells_tier5.json';
import fireSkillsTier1 from '../../../public/item-data/skills/magic/fire/firespells_tier1.json';
import fireSkillsTier2 from '../../../public/item-data/skills/magic/fire/firespells_tier2.json';
import fireSkillsTier3 from '../../../public/item-data/skills/magic/fire/firespells_tier3.json';
import fireSkillsTier4 from '../../../public/item-data/skills/magic/fire/firespells_tier4.json';
import fireSkillsTier5 from '../../../public/item-data/skills/magic/fire/firespells_tier5.json';
import lightningSkillsTier1 from '../../../public/item-data/skills/magic/lightning/lightningspells_tier1.json';
import lightningSkillsTier2 from '../../../public/item-data/skills/magic/lightning/lightningspells_tier2.json';
import lightningSkillsTier3 from '../../../public/item-data/skills/magic/lightning/lightningspells_tier3.json';
import lightningSkillsTier4 from '../../../public/item-data/skills/magic/lightning/lightningspells_tier4.json';
import lightningSkillsTier5 from '../../../public/item-data/skills/magic/lightning/lightningspells_tier5.json';
import physicalSkillsTier1 from '../../../public/item-data/skills/physical/physicalspells_tier1.json';
import physicalSkillsTier2 from '../../../public/item-data/skills/physical/physicalspells_tier2.json';
import physicalSkillsTier3 from '../../../public/item-data/skills/physical/physicalspells_tier3.json';
import physicalSkillsTier4 from '../../../public/item-data/skills/physical/physicalspells_tier4.json';
import physicalSkillsTier5 from '../../../public/item-data/skills/physical/physicalspells_tier5.json';
// 🛡️ Energieschild-Zauber (ohne Waffentyp-Anforderung, nur Stat-Requirement)
import energyShieldSkillsTier1 from '../../../public/item-data/skills/energy-shield/energyshieldspells_tier1.json';
import energyShieldSkillsTier2 from '../../../public/item-data/skills/energy-shield/energyshieldspells_tier2.json';
import energyShieldSkillsTier3 from '../../../public/item-data/skills/energy-shield/energyshieldspells_tier3.json';
import energyShieldSkillsTier4 from '../../../public/item-data/skills/energy-shield/energyshieldspells_tier4.json';
import energyShieldSkillsTier5 from '../../../public/item-data/skills/energy-shield/energyshieldspells_tier5.json';

// Shrine-exklusive Skills (nur über Levelup-Passives freischaltbar, siehe
// passives.json / SkillsService.applySkillUnlockEffects). Bewusst in einem
// eigenen skills/shrine/-Zweig statt in den regulären Pools oben, damit sie
// niemals versehentlich in eine Loot-/Shop-Tabelle geraten, die z.B. einfach
// "alle Skills aus skills/magic/fire/*.json" zieht. Gleiche Struktur wie die
// regulären Pools, zusätzlich mit `shrineSkill: true` markiert.
import healSkillsShrine from '../../../public/item-data/skills/shrine/heal/heal-skills-shrine.json';
import chaosSkillsShrine from '../../../public/item-data/skills/shrine/magic/chaos/chaos-skills-shrine.json';
import coldSkillsShrine from '../../../public/item-data/skills/shrine/magic/cold/cold-skills-shrine.json';
import fireSkillsShrine from '../../../public/item-data/skills/shrine/magic/fire/fire-skills-shrine.json';
import lightningSkillsShrine from '../../../public/item-data/skills/shrine/magic/lightning/lightning-skills-shrine.json';
import physicalSkillsShrine from '../../../public/item-data/skills/shrine/physical/physical_skills_shrine.json';

/**
 * Vollständiges Spell-Objekt nach dem Laden aus den JSONs.
 */
export interface SpellData {
  id: string;
  name: string;
  type?: string;
  element?: string;
  damage?: number;
  healAmount?: number;
  manaCost?: number;
  description?: string;
  equipped?: boolean;
  /** true = nur über ein Shrine-Levelup-Passive erlernbar (siehe passives.json). */
  shrineSkill?: boolean;
  /** Anzahl der Punkte in der Resolve-Minigame-Sequenz beim Wirken dieses Skills (nur Spieler). */
  resolvePoints?: number;
  /** Tier 1-5 (als String, analog zu den Equipment-Tier-JSONs) — für getItemTier()/den Skill-Shop. */
  tier?: string;
  /** Gold-Preis im Skill-Shop. */
  price?: number;
  /** Stat-Anforderungen zum Ausrüsten (analog zu `requirement` bei Waffen, aber als Array für Mehrfach-Gates). */
  requirements?: { stat: string; value: number }[];
  /** Geforderter Waffentyp zum Wirken ('schnitt' | 'stumpf' | 'stich' | 'magie'), z.B. Feuerzauber nur mit Mage-Waffe. */
  requiredWeaponType?: string;
  [key: string]: any; // Für beliebige weitere Felder aus den JSONs
}

/**
 * Alle importierten JSON-Module an einer Stelle gesammelt.
 * Jedes Modul kann entweder { spells: [...] }, ein rohes Array [...]
 * oder ein Objekt mit ID-Keys sein — wird beim Cache-Aufbau normalisiert.
 */
const SPELL_JSON_MODULES: any[] = [
  healSkillsTier1, healSkillsTier2, healSkillsTier3, healSkillsTier4, healSkillsTier5,
  chaosSkillsTier1, chaosSkillsTier2, chaosSkillsTier3, chaosSkillsTier4, chaosSkillsTier5,
  coldSkillsTier1, coldSkillsTier2, coldSkillsTier3, coldSkillsTier4, coldSkillsTier5,
  fireSkillsTier1, fireSkillsTier2, fireSkillsTier3, fireSkillsTier4, fireSkillsTier5,
  lightningSkillsTier1, lightningSkillsTier2, lightningSkillsTier3, lightningSkillsTier4, lightningSkillsTier5,
  physicalSkillsTier1, physicalSkillsTier2, physicalSkillsTier3, physicalSkillsTier4, physicalSkillsTier5,
  energyShieldSkillsTier1, energyShieldSkillsTier2, energyShieldSkillsTier3, energyShieldSkillsTier4, energyShieldSkillsTier5,
  healSkillsShrine,
  chaosSkillsShrine,
  coldSkillsShrine,
  fireSkillsShrine,
  lightningSkillsShrine,
  physicalSkillsShrine,
];

/**
 * Baut aus den importierten JSON-Modulen eine ID → SpellData Map.
 * Läuft rein synchron, da die Module bereits beim Modul-Laden vorliegen.
 */
function buildSpellCache(): Map<string, SpellData> {
  const cache = new Map<string, SpellData>();

  for (const json of SPELL_JSON_MODULES) {
    const spellArray: SpellData[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.spells)
        ? json.spells
        : Object.values(json ?? {}); // Fallback: Objekt mit ID-Keys

    for (const spell of spellArray) {
      if (spell?.id) {
        cache.set(spell.id, spell);
      }
    }
  }

  return cache;
}

/**
 * Hält alle Spell-Daten komplett SYNCHRON bereit, da die JSONs per
 * Build-Time-Import statt fetch() eingebunden werden.
 *
 * Kein async, kein await, kein Promise irgendwo in diesem Service —
 * dadurch direkt in effect() nutzbar, z.B. wenn ein Monster-Signal
 * befüllt wird und seine Spells synchron angereichert werden sollen.
 */
@Injectable({
  providedIn: 'root',
})
export class SpellLoaderService {
  /**
   * Cache als Signal. Initial bereits befüllt (synchron, da Build-Time-
   * Import). Bleibt trotzdem ein Signal, falls du später per
   * clearCache()/reload neu befüllen willst — dann feuern alle effects,
   * die spellCache() lesen, automatisch erneut.
   */
  public spellCache = signal<Map<string, SpellData>>(buildSpellCache());

  constructor() {
    console.log(`✅ SpellLoader: ${this.spellCache().size} Spells synchron geladen.`);
  }

  /**
   * Gibt den vollständigen SpellData-Eintrag für eine einzelne ID zurück.
   * Gibt `null` zurück wenn die ID unbekannt ist.
   *
   * @param id - Die Spell-ID, z.B. 'spell_fire_01'
   */
  public getSpellById(id: string): SpellData | null {
    return this.spellCache().get(id) ?? null;
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * HAUPT-METHODE – überall direkt aufrufbar, auch in einem effect().
   * ─────────────────────────────────────────────────────────────────────────
   *
   * Nimmt ein Array von Spell-Stub-Objekten (mit mindestens einer `id`)
   * und gibt ein neues Array zurück, bei dem jedes Objekt mit den vollen
   * Daten aus den JSONs angereichert ist.
   *
   * Unbekannte IDs werden mit einem Warn-Log übersprungen.
   *
   * @example
   * effect(() => {
   *   const monster = this.activeFight()?.monster;
   *   const cacheVersion = this.spellLoader.spellCache(); // Dependency!
   *
   *   if (monster) {
   *     const enriched = this.spellLoader.enrichSpells(monster.spells);
   *     this.monsterSpells.set(enriched);
   *   }
   * });
   *
   * @param spells - Array von Objekten mit mindestens { id: string }
   * @param preserveProps - Eigene Properties (z.B. `equipped`) behalten? Default: true
   */
  public enrichSpells(
    spells: Array<{ id: string; [key: string]: any } | string>,
    preserveProps = true,
  ): SpellData[] {
    const cache = this.spellCache();
    const enriched: SpellData[] = [];

    for (const entry of spells) {
      // Unterstützt beide Formate: reiner String ('spell_fire_01') oder Objekt ({ id: 'spell_fire_01' })
      const stub: { id: string; [key: string]: any } =
        typeof entry === 'string' ? { id: entry } : entry;

      const base = cache.get(stub.id);

      if (!base) {
        console.warn(`⚠️ SpellLoader: Keine Daten für Spell-ID "${stub.id}" gefunden.`);
        continue;
      }

      // JSON-Daten als Basis, eigene Properties (z.B. equipped) obendrauf
      const fullSpell: SpellData = preserveProps
        ? { ...base, ...stub } // stub überschreibt base (z.B. equipped-Status bleibt)
        : { ...base }; // Nur JSON-Daten, stub-Props werden verworfen

      enriched.push(fullSpell);
    }

    return enriched;
  }

  /**
   * Gibt den gesamten Spell-Pool zurück (alle Spells aus allen JSONs, ungefiltert).
   */
  public getAllSpells(): SpellData[] {
    return Array.from(this.spellCache().values());
  }
}
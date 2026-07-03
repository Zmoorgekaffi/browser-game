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
import healSkills from '../../../public/item-data/skills/heal/heal-skills.json';
import chaosSkills from '../../../public/item-data/skills/magic/chaos/chaos-skills.json';
import coldSkills from '../../../public/item-data/skills/magic/cold/cold-skills.json';
import fireSkills from '../../../public/item-data/skills/magic/fire/fire-skills.json';
import lightningSkills from '../../../public/item-data/skills/magic/lightning/lightning-skills.json';
import physicalSkills from '../../../public/item-data/skills/physical/physical_skills.json';

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
  [key: string]: any; // Für beliebige weitere Felder aus den JSONs
}

/**
 * Alle importierten JSON-Module an einer Stelle gesammelt.
 * Jedes Modul kann entweder { spells: [...] }, ein rohes Array [...]
 * oder ein Objekt mit ID-Keys sein — wird beim Cache-Aufbau normalisiert.
 */
const SPELL_JSON_MODULES: any[] = [
  healSkills,
  chaosSkills,
  coldSkills,
  fireSkills,
  lightningSkills,
  physicalSkills,
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
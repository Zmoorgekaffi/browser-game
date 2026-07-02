import { Injectable, signal, computed, inject } from '@angular/core';
import { InventarService } from './inventar.service';
import { SpellLoaderService } from './spell-loader.service';

/**
 * Die vier ausrüstbaren Spell-Slots des Charakters.
 * Wert = Spell-ID oder null (Slot frei).
 */
export type EquippedSpells = {
  spell_1: string | null;
  spell_2: string | null;
  spell_3: string | null;
  spell_4: string | null;
};

/** Alle Ausrüstungs-Slots, deren Item-Stats in die combatStats einfließen. */
const EQUIPMENT_SLOTS = [
  'head', 'chest', 'leg', 'gloves', 'footwear',
  'accessoire-left', 'accessoire-right', 'necklace',
  'ring-left', 'ring-right', 'weapon-1', 'weapon-2', 'back',
] as const;

/**
 * Mapping: Stat-Key auf dem Item → Stat-Key in den finalen combatStats.
 * Diese Werte werden 1:1 additiv übernommen (ohne Attributs-Skalierung).
 */
const FLAT_STAT_MAP: ReadonlyArray<[itemKey: string, statsKey: string]> = [
  ['armor', 'armor'],
  ['energy-shield', 'energy-shield'],
  ['magic-find', 'magic-find'],
  ['attack', 'attack'],
  ['magic-attack', 'magicAttack'],
  ['initiative', 'initiative'],
  ['evasion', 'evasion'],
  ['crit-chance', 'critChance'],
  ['crit-damage', 'critDamage'],
  ['chaosDamage', 'chaosDamage'],
  ['charisma', 'charisma'],
];

/** Die vier Elementar-Resistenzen, die Items mitbringen können. */
const RESISTANCE_KEYS = ['fire', 'cold', 'lightning', 'chaos'] as const;

/**
 * @service SkillsService
 * @description Verwaltet Basis-Attribute, Kampfwerte und Spells des Charakters.
 *
 * Kernstück ist das computed Signal `combatStats`, das Basis-Werte und
 * Ausrüstungs-Boni reaktiv zu einem finalen Kampfpaket verrechnet.
 */
@Injectable({
  providedIn: 'root',
})
export class SkillsService {
  private inventarService = inject(InventarService);
  private spellLoader = inject(SpellLoaderService);

  /** Charakter-ID-Signal, wird vom GameStateService gesetzt (für Storage-Keys). */
  public profileData = signal<any>('');

  /** Der nackte Basis-State des Charakters (Level-1 Startwerte). */
  public state = signal<any>({
    intelligence: 5,
    dexterity: 5,
    strength: 5,
    vitality: 5,
    luck: 5,
    'energy-shield': 0,
    'magic-find': 0,
    armor: 0,
    hp: 100,
    mana: 20,
    attack: 5,
    magicAttack: 5,
    initiative: 10,
    evasion: 5,
    critChance: 5,
    critDamage: 150,
    chaosDamage: 0,
    charisma: 1,
    resistances: {
      fire: 0,
      cold: 0,
      lightning: 0,
      chaos: 0,
    },
    spells: [],
  });

  /** Reaktives Signal für die belegten Spell-Slots. */
  public equippedSpells = signal<EquippedSpells>({
    spell_1: null,
    spell_2: null,
    spell_3: null,
    spell_4: null,
  });

  // Basis-Selektoren (Read-Only) für das UI
  intelligence = computed(() => this.state().intelligence);
  dexterity = computed(() => this.state().dexterity);
  strength = computed(() => this.state().strength);
  vitality = computed(() => this.state().vitality);
  luck = computed(() => this.state().luck);
  energyShield = computed(() => this.state()['energy-shield']);
  magicFind = computed(() => this.state()['magic-find']);
  armor = computed(() => this.state().armor);
  hp = computed(() => this.state().hp);
  mana = computed(() => this.state().mana);
  attack = computed(() => this.state().attack);
  magicAttack = computed(() => this.state().magicAttack);
  initiative = computed(() => this.state().initiative);
  evasion = computed(() => this.state().evasion);
  critChance = computed(() => this.state().critChance);
  critDamage = computed(() => this.state().critDamage);
  chaosDamage = computed(() => this.state().chaosDamage);
  charisma = computed(() => this.state().charisma);
  resistances = computed(() => this.state().resistances);
  spells = computed(() => this.state().spells);

  /**
   * REAKTIVES COMPUTED SIGNAL
   * Berechnet das finale Kampfpaket: Basis-Werte + Ausrüstungsteile.
   *
   * Rechnet pro ausgerüstetem Item drei Schritte:
   *  1. Flat-Stats additiv übernehmen (siehe FLAT_STAT_MAP)
   *  2. Resistenzen additiv übernehmen
   *  3. Attribute skalieren (z.B. Stärke → Angriff/Rüstung)
   */
  public combatStats = computed(() => {
    const base = this.state();
    const slots = this.inventarService.equippedSlots();

    const finalStats = this.createBaseCombatStats(base);

    EQUIPMENT_SLOTS.forEach((slotName) => {
      const item = slots[slotName];
      if (!item || !item.stats) return;

      this.addFlatItemStats(finalStats, item.stats);
      this.addItemResistances(finalStats, item.stats);
      this.addAttributeScaling(finalStats, item.stats);
    });

    console.log('⚔️ Reaktiv berechnete combatStats:', finalStats);
    return finalStats;
  });

  /**
   * Kopiert die Basis-Werte des Charakters in ein frisches Stats-Objekt
   * (bewusst OHNE das spells-Array — combatStats enthält nur Zahlenwerte).
   */
  private createBaseCombatStats(base: any) {
    return {
      intelligence: base.intelligence,
      dexterity: base.dexterity,
      strength: base.strength,
      vitality: base.vitality,
      luck: base.luck,
      'energy-shield': base['energy-shield'],
      'magic-find': base['magic-find'],
      armor: base.armor,
      hp: base.hp,
      mana: base.mana,
      attack: base.attack,
      magicAttack: base.magicAttack,
      initiative: base.initiative,
      evasion: base.evasion,
      critChance: base.critChance,
      critDamage: base.critDamage,
      chaosDamage: base.chaosDamage,
      charisma: base.charisma,
      resistances: { ...base.resistances },
    };
  }

  /**
   * Übernimmt alle 1:1-Stats eines Items additiv in die finalen Stats.
   *
   * @param finalStats Ziel-Objekt (wird mutiert).
   * @param s          stats-Block des Items.
   */
  private addFlatItemStats(finalStats: any, s: any): void {
    for (const [itemKey, statsKey] of FLAT_STAT_MAP) {
      if (s[itemKey]) finalStats[statsKey] += Number(s[itemKey]);
    }
  }

  /**
   * Übernimmt die Elementar-Resistenzen eines Items additiv.
   *
   * @param finalStats Ziel-Objekt (wird mutiert).
   * @param s          stats-Block des Items.
   */
  private addItemResistances(finalStats: any, s: any): void {
    if (!s.resistances) return;
    for (const key of RESISTANCE_KEYS) {
      if (s.resistances[key]) finalStats.resistances[key] += Number(s.resistances[key]);
    }
  }

  /**
   * Wendet die Attributs-Skalierung eines Items an:
   *  - Stärke:       +Attribut, Angriff +2/Punkt, Rüstung +0.5/Punkt (abgerundet)
   *  - Intelligenz:  +Attribut, Magie-Angriff +2/Punkt, Mana +5/Punkt
   *  - Geschick:     +Attribut, Ausweichen +0.5/Punkt (abgerundet), Initiative +1/Punkt
   *  - Vitalität:    +Attribut, HP +12/Punkt
   *  - Glück:        +Attribut, Krit-Chance +0.2/Punkt, Magic-Find +0.5/Punkt (abgerundet)
   *
   * @param finalStats Ziel-Objekt (wird mutiert).
   * @param s          stats-Block des Items.
   */
  private addAttributeScaling(finalStats: any, s: any): void {
    if (s.strength) {
      const str = Number(s.strength);
      finalStats.strength += str;
      finalStats.attack += str * 2;
      finalStats.armor += Math.floor(str * 0.5);
    }
    if (s.intelligence) {
      const int = Number(s.intelligence);
      finalStats.intelligence += int;
      finalStats.magicAttack += int * 2;
      finalStats.mana += int * 5;
    }
    if (s.dexterity) {
      const dex = Number(s.dexterity);
      finalStats.dexterity += dex;
      finalStats.evasion += Math.floor(dex * 0.5);
      finalStats.initiative += dex;
    }
    if (s.vitality) {
      const vit = Number(s.vitality);
      finalStats.vitality += vit;
      finalStats.hp += vit * 12;
    }
    if (s.luck) {
      const lck = Number(s.luck);
      finalStats.luck += lck;
      finalStats.critChance += Math.floor(lck * 0.2);
      finalStats['magic-find'] += Math.floor(lck * 0.5);
    }
  }

  /** Liefert die Default-Spells (Start-Loadout) für neue/leere Savegames. */
  private getDefaultSpells(): any {
    return {
      spells: [
        { id: 'strike_01' },
        { id: 'spell_fire_01' },
      ],
      equipped_spells: {
        spell_1: null,
        spell_2: null,
        spell_3: null,
        spell_4: null,
      },
    };
  }

  /**
   * Mergt eingehende Savegame-Daten über die aktuellen Basis-Werte.
   *
   * @param currentBase  Aktueller Basis-State.
   * @param incomingData Daten aus dem Savegame.
   * @param finalSpells  Bereits angereicherte Spell-Objekte.
   */
  private mergeCharacterData(currentBase: any, incomingData: any, finalSpells: any[]): any {
    return {
      ...currentBase,
      ...incomingData,
      resistances: {
        ...currentBase.resistances,
        ...(incomingData.resistances || {}),
      },
      spells: finalSpells,
    };
  }

  /** True, wenn im Savegame keine Spells hinterlegt sind. */
  private hasNoSpells(data: any): boolean {
    return !data.spells || data.spells.length === 0;
  }

  /**
   * Schreibt die Default-Spells in den LocalStorage-Eintrag des Charakters
   * (Fallback, wenn ein Savegame ohne Spells geladen wurde).
   *
   * @param mergedBackupData Kompletter State als Backup, falls noch gar kein
   *                         LocalStorage-Eintrag existiert.
   */
  private updateLocalStorageSpells(mergedBackupData: any): void {
    const storageKey = `${this.profileData()}_skills`;
    const rawSave = localStorage.getItem(storageKey);

    if (rawSave) {
      try {
        const parsedSave = JSON.parse(rawSave);
        const defaults = this.getDefaultSpells();
        // Nur IDs speichern – keine aufgeblähten Objekte im LocalStorage
        parsedSave.spells = defaults.spells;
        if (!parsedSave.equipped_spells) {
          parsedSave.equipped_spells = defaults.equipped_spells;
        }
        localStorage.setItem(storageKey, JSON.stringify(parsedSave));
      } catch (e) {
        console.error('❌ Fehler beim Parsen des LocalStorage-Eintrags:', e);
      }
    } else {
      localStorage.setItem(storageKey, JSON.stringify(mergedBackupData));
    }
  }

  /**
   * Zentrale Spell-Verwaltung: lernen, ausrüsten oder ablegen.
   *
   * @param action  'learn' | 'equip' | 'unequip'
   * @param spell   Das betroffene Spell-Objekt.
   * @param slotKey Ziel-Slot (nur für equip/unequip relevant).
   */
  public updateSpells(action: 'equip' | 'unequip' | 'learn', spell: any, slotKey?: string): void {
    this.state.update((currentState) => {
      let updatedSpells = [...currentState.spells];

      if (action === 'learn') {
        const alreadyKnown = updatedSpells.some((s) => s.id === spell.id);
        if (!alreadyKnown) {
          updatedSpells.push({ ...spell, equipped: false });
          console.log(`📖 Spell gelernt: ${spell.name}`);
        } else {
          console.warn(`⚠️ Spell bereits bekannt: ${spell.name}`);
        }
      }

      if (action === 'equip' && slotKey) {
        const previousSpellId = this.equippedSpells()[slotKey as keyof EquippedSpells] ?? null;

        updatedSpells = updatedSpells.map((s) => {
          if (s.id === previousSpellId) return { ...s, equipped: false };
          if (s.id === spell.id) return { ...s, equipped: true };
          return s;
        });

        this.equippedSpells.update((slots) => ({ ...slots, [slotKey]: spell.id }));
        console.log(`⚔️ Spell "${spell.name}" in Slot "${slotKey}" eingesetzt`);
      }

      if (action === 'unequip' && slotKey) {
        updatedSpells = updatedSpells.map((s) =>
          s.id === spell.id ? { ...s, equipped: false } : s,
        );

        this.equippedSpells.update((slots) => ({ ...slots, [slotKey]: null }));
        console.log(`🔓 Spell "${spell.name}" aus Slot "${slotKey}" entfernt`);
      }

      const newState = { ...currentState, spells: updatedSpells };
      this.syncSpellsToLocalStorage(newState, action, spell, slotKey);
      return newState;
    });
  }

  /**
   * Persistiert den aktuellen Spell-Zustand (nur IDs + equipped-Flags)
   * in den LocalStorage.
   */
  private syncSpellsToLocalStorage(newState: any, action: string, spell: any, slotKey?: string): void {
    const storageKey = `${this.profileData()}_skills`;
    const rawSave = localStorage.getItem(storageKey);

    try {
      const parsedSave = rawSave ? JSON.parse(rawSave) : { ...newState };

      // Nur IDs im LocalStorage speichern, keine aufgeblähten Objekte
      parsedSave.spells = newState.spells.map((s: any) => ({ id: s.id, equipped: s.equipped }));
      parsedSave.equipped_spells = { ...this.equippedSpells() };

      localStorage.setItem(storageKey, JSON.stringify(parsedSave));
      console.log(`💾 LocalStorage aktualisiert [${action}]:`, parsedSave.equipped_spells);
    } catch (e) {
      console.error('❌ Fehler beim Synchronisieren der Spells in den LocalStorage:', e);
    }
  }

  /**
   * Sucht den ersten freien Spell-Slot.
   *
   * @returns Slot-Key ('spell_1' ... 'spell_4') oder null, wenn alle belegt.
   */
  public getNextFreeSlot(): keyof EquippedSpells | null {
    const slots = this.equippedSpells();
    const keys: (keyof EquippedSpells)[] = ['spell_1', 'spell_2', 'spell_3', 'spell_4'];
    return keys.find((key) => slots[key] === null) ?? null;
  }

  /**
   * Initialisiert den SkillsService mit Charakterdaten.
   * Lädt Spell-IDs aus dem Savegame und reichert sie via SpellLoaderService
   * mit den vollen JSON-Daten an, bevor sie in den State geschrieben werden.
   *
   * SYNCHRON – kein await mehr nötig, da SpellLoaderService.enrichSpells()
   * die JSONs per Build-Time-Import bereits synchron im Speicher hält.
   *
   * @param data Skills-Block aus dem Savegame (LocalStorage).
   */
  public init(data: any): void {
    if (!data || Object.keys(data).length === 0) {
      console.warn('⚠️ Keine Skill-Daten übergeben. Nutze Standard-Startwerte.');
      return;
    }

    // equipped_spells aus dem Savegame ins Signal laden
    if (data.equipped_spells) {
      this.equippedSpells.set({
        spell_1: data.equipped_spells.spell_1 ?? null,
        spell_2: data.equipped_spells.spell_2 ?? null,
        spell_3: data.equipped_spells.spell_3 ?? null,
        spell_4: data.equipped_spells.spell_4 ?? null,
      });
      console.log('🎯 equippedSpells geladen:', this.equippedSpells());
    }

    const missingSpells = this.hasNoSpells(data);
    const rawSpells = missingSpells ? this.getDefaultSpells().spells : data.spells;

    // ✨ IDs → vollständige Spell-Objekte (aus den JSON-Dateien angereichert)
    const enrichedSpells = this.spellLoader.enrichSpells(rawSpells);
    console.log('✅ Spells angereichert:', enrichedSpells);

    this.state.update((currentBase) => {
      const mergedState = this.mergeCharacterData(currentBase, data, enrichedSpells);

      if (missingSpells) {
        this.updateLocalStorageSpells(mergedState);
      }

      return mergedState;
    });
  }
}

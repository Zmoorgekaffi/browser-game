import { Injectable, signal, computed, inject } from '@angular/core';
import { InventarService } from './inventar.service';
import { SpellLoaderService } from './spell-loader.service';
import { PassiveLoaderService } from './passive-loader.service';
import { InvestableStat, PassiveData } from '../models/passive.interface';

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

/** Die vier Grundattribute, in die am Schrein investiert werden kann. */
const INVESTABLE_STATS = ['strength', 'dexterity', 'intelligence', 'vitality'] as const;

/** Investitions-Schwellen, an denen jeweils ein Passive freigeschaltet wird. */
const PASSIVE_THRESHOLDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

/** Startwert für `investedPoints`, wenn ein Savegame das Feld noch nicht kennt. */
const DEFAULT_INVESTED_POINTS = { strength: 0, dexterity: 0, intelligence: 0, vitality: 0 };

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
  private passiveLoader = inject(PassiveLoaderService);

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
    /** Noch nicht verteilte Attributspunkte (kommen z.B. durch Level-ups). */
    statPoints: 0,
    /** Am Schrein investierte Punkte pro Grundstat (0–100, löst alle 10 ein Passive aus). */
    investedPoints: { ...DEFAULT_INVESTED_POINTS },
    /** IDs aller bereits freigeschalteten Shrine-Passives. */
    unlockedPassives: [] as string[],
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
  statPoints = computed(() => this.state().statPoints ?? 0);
  investedPoints = computed(() => this.state().investedPoints ?? DEFAULT_INVESTED_POINTS);
  unlockedPassives = computed(() => this.state().unlockedPassives ?? []);

  /**
   * REAKTIVES COMPUTED SIGNAL
   * Berechnet das finale Kampfpaket UND die Herkunft jedes Bonus (für die
   * Tooltip-Aufschlüsselung in der Charakter-Ansicht: Basis / Hauptstats /
   * Ausrüstung / Passives). Vier Schichten, in dieser Reihenfolge:
   *
   *  1. base       – reine Basiswerte aus dem State (Level-Startwerte).
   *  2. equipment  – Flat-Stats, Resistenzen und Attribut-Rohwerte aus
   *                  ausgerüsteten Items (additiv, siehe FLAT_STAT_MAP).
   *  3. mainStats  – Skalierung der GESAMT-Attribute (Basis + Schrein +
   *                  Ausrüstung) auf abgeleitete Kampfwerte, z.B.
   *                  Stärke → Angriff. Läuft bewusst NACH der Ausrüstungs-
   *                  schicht, damit auch von Items mitgebrachte Attribute
   *                  mitskalieren (vorher wurde nur der Item-eigene
   *                  Attributwert isoliert verrechnet — Schrein-Punkte
   *                  hatten dadurch gar keinen Effekt auf z.B. Angriff).
   *  4. passives   – Shrine-Passives (erst Flat/Resistenz, dann Prozent).
   */
  public statBreakdown = computed(() => {
    const base = this.state();
    const slots = this.inventarService.equippedSlots();

    const baseLayer = this.createBaseCombatStats(base);

    const afterEquipment = this.cloneStats(baseLayer);
    EQUIPMENT_SLOTS.forEach((slotName) => {
      const item = slots[slotName];
      if (!item || !item.stats) return;

      this.addFlatItemStats(afterEquipment, item.stats);
      this.addItemResistances(afterEquipment, item.stats);
      this.addItemAttributes(afterEquipment, item.stats);
    });

    const afterMainStats = this.cloneStats(afterEquipment);
    this.applyAttributeScaling(afterMainStats);

    const afterPassives = this.cloneStats(afterMainStats);
    this.addPassiveEffects(afterPassives, base.unlockedPassives ?? []);

    const breakdown = {
      base: baseLayer,
      equipment: this.diffStats(afterEquipment, baseLayer),
      mainStats: this.diffStats(afterMainStats, afterEquipment),
      passives: this.diffStats(afterPassives, afterMainStats),
      total: afterPassives,
    };

    console.log('⚔️ Reaktiv berechnete combatStats:', breakdown.total);
    return breakdown;
  });

  /** Nur das finale Kampfpaket (ohne Herkunfts-Aufschlüsselung). */
  public combatStats = computed(() => this.statBreakdown().total);

  /**
   * Kopiert die Basis-Werte des Charakters in ein frisches Stats-Objekt
   * (bewusst OHNE das spells-Array — combatStats enthält nur Zahlenwerte).
   */
  private createBaseCombatStats(base: any): any {
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
   * Übernimmt NUR die rohen Attributwerte eines Items additiv (Stärke,
   * Geschick, Intelligenz, Vitalität, Glück) — ohne Skalierung auf
   * abgeleitete Kampfwerte. Die eigentliche Skalierung passiert danach
   * einmalig in `applyAttributeScaling()` auf Basis des GESAMT-Attributs
   * (Basis + Schrein-Investition + Ausrüstung), nicht mehr pro Item isoliert.
   *
   * @param finalStats Ziel-Objekt (wird mutiert).
   * @param s          stats-Block des Items.
   */
  private addItemAttributes(finalStats: any, s: any): void {
    if (s.strength) finalStats.strength += Number(s.strength);
    if (s.intelligence) finalStats.intelligence += Number(s.intelligence);
    if (s.dexterity) finalStats.dexterity += Number(s.dexterity);
    if (s.vitality) finalStats.vitality += Number(s.vitality);
    if (s.luck) finalStats.luck += Number(s.luck);
  }

  /**
   * Skaliert die GESAMT-Attribute (Basis + Schrein + Ausrüstung) einmalig auf
   * abgeleitete Kampfwerte:
   *  - Stärke:      Physischer Schaden (Angriff) +2/Punkt
   *  - Geschick:    Initiative +2/Punkt
   *  - Intelligenz: Magie-Angriff +2/Punkt, Mana +5/Punkt, Energieschild +2/Punkt
   *  - Vitalität:   HP +3/Punkt
   *  - Glück:       Krit-Chance +0.2/Punkt, Magic-Find +0.5/Punkt (abgerundet)
   *
   * @param finalStats Ziel-Objekt (wird mutiert). Muss bereits die
   *                   Gesamt-Attributwerte (inkl. Ausrüstung) enthalten.
   */
  private applyAttributeScaling(finalStats: any): void {
    finalStats.attack += finalStats.strength * 2;
    finalStats.initiative += finalStats.dexterity * 2;
    finalStats.magicAttack += finalStats.intelligence * 2;
    finalStats.mana += finalStats.intelligence * 5;
    finalStats['energy-shield'] += finalStats.intelligence * 2;
    finalStats.hp += finalStats.vitality * 3;
    finalStats.critChance += Math.floor(finalStats.luck * 0.2);
    finalStats['magic-find'] += Math.floor(finalStats.luck * 0.5);
  }

  /** Tiefe Kopie eines Kampfwerte-Objekts (inkl. verschachteltem `resistances`). */
  private cloneStats(stats: any): any {
    return { ...stats, resistances: { ...stats.resistances } };
  }

  /**
   * Differenz zweier Kampfwerte-Objekte, Feld für Feld (für die
   * Tooltip-Aufschlüsselung "wie viel kam von welcher Schicht").
   * `resistances` und `spells` werden bewusst ausgeklammert (nicht Teil der
   * Stat-Liste in der Charakter-Ansicht).
   */
  private diffStats(after: any, before: any): any {
    const result: any = {};
    for (const key of Object.keys(after)) {
      if (key === 'resistances' || key === 'spells') continue;
      result[key] = (after[key] ?? 0) - (before[key] ?? 0);
    }
    return result;
  }

  /**
   * Wendet alle freigeschalteten Shrine-Passives auf die finalen Stats an.
   *
   * Reihenfolge bewusst zweistufig: zuerst alle Flat-Boni und Resistenzen,
   * danach erst die Prozent-Boni — damit Prozent-Effekte auf dem bereits
   * inkl. Flat-Boni aufsummierten Zwischenstand rechnen (üblicher ARPG-Ansatz).
   *
   * @param finalStats Ziel-Objekt (wird mutiert).
   * @param unlockedIds IDs aller freigeschalteten Passives.
   */
  private addPassiveEffects(finalStats: any, unlockedIds: string[]): void {
    if (!unlockedIds || unlockedIds.length === 0) return;

    const passives = unlockedIds
      .map((id) => this.passiveLoader.getPassiveById(id))
      .filter((p): p is NonNullable<typeof p> => !!p);

    for (const passive of passives) {
      for (const effect of passive.effects) {
        if (effect.type === 'stat-flat') {
          finalStats[effect.stat] = (finalStats[effect.stat] ?? 0) + effect.value;
        }
        if (effect.type === 'resistance') {
          for (const element of effect.elements) {
            finalStats.resistances[element] = (finalStats.resistances[element] ?? 0) + effect.value;
          }
        }
      }
    }

    for (const passive of passives) {
      for (const effect of passive.effects) {
        if (effect.type === 'stat-percent') {
          const current = finalStats[effect.stat] ?? 0;
          finalStats[effect.stat] = Math.round(current + current * (effect.value / 100));
        }
      }
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
      // Ältere Savegames kennen diese Felder evtl. noch nicht → auf Default zurückfallen.
      statPoints: incomingData.statPoints ?? currentBase.statPoints ?? 0,
      investedPoints: {
        ...DEFAULT_INVESTED_POINTS,
        ...(incomingData.investedPoints || {}),
      },
      unlockedPassives: incomingData.unlockedPassives ?? currentBase.unlockedPassives ?? [],
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
   * Fügt unverteilte Attributspunkte hinzu (z.B. durch einen Level-up).
   *
   * @param amount Betrag > 0, sonst passiert nichts.
   */
  public addStatPoints(amount: number): void {
    if (amount <= 0) return;

    this.state.update((currentState) => {
      const newState = { ...currentState, statPoints: (currentState.statPoints ?? 0) + amount };
      this.persistProgressToLocalStorage(newState);
      return newState;
    });
  }

  /**
   * Investiert 1 unverteilten Attributspunkt in einen der vier Grundstats
   * (Schrein-UI). Erhöht sowohl den rohen Basiswert als auch die
   * Investitions-Leiste — und schaltet bei jeder 10er-Schwelle automatisch
   * das zugehörige Passive frei (inkl. etwaiger Skill-Unlocks).
   *
   * @param stat Ziel-Attribut ('strength' | 'dexterity' | 'intelligence' | 'vitality').
   * @returns Das neu freigeschaltete Passive, oder null wenn keins ausgelöst wurde
   *          (auch wenn schlicht kein Punkt verfügbar war).
   */
  public investStatPoint(stat: InvestableStat): PassiveData | null {
    let unlockedPassive: PassiveData | null = null;

    this.state.update((currentState) => {
      const investedPoints = currentState.investedPoints ?? DEFAULT_INVESTED_POINTS;
      const availablePoints = currentState.statPoints ?? 0;

      if (availablePoints <= 0 || investedPoints[stat] >= 100) {
        return currentState;
      }

      const newInvestedValue = investedPoints[stat] + 1;
      let updatedSpells = currentState.spells;

      const newState: any = {
        ...currentState,
        [stat]: currentState[stat] + 1,
        statPoints: availablePoints - 1,
        investedPoints: { ...investedPoints, [stat]: newInvestedValue },
      };

      if ((PASSIVE_THRESHOLDS as readonly number[]).includes(newInvestedValue)) {
        const passive = this.passiveLoader.getPassiveByStatAndThreshold(stat, newInvestedValue);
        const alreadyUnlocked = passive ? (currentState.unlockedPassives ?? []).includes(passive.id) : true;

        if (passive && !alreadyUnlocked) {
          unlockedPassive = passive;
          newState.unlockedPassives = [...(currentState.unlockedPassives ?? []), passive.id];
          updatedSpells = this.applySkillUnlockEffects(passive, updatedSpells);
          newState.spells = updatedSpells;
        }
      }

      this.persistProgressToLocalStorage(newState);
      return newState;
    });

    return unlockedPassive;
  }

  /** Lernt automatisch alle Skills, die ein neu freigeschaltetes Passive gewährt. */
  private applySkillUnlockEffects(passive: PassiveData, currentSpells: any[]): any[] {
    let updatedSpells = currentSpells;

    for (const effect of passive.effects) {
      if (effect.type !== 'skill-unlock') continue;

      const alreadyKnown = updatedSpells.some((s) => s.id === effect.skillId);
      if (alreadyKnown) continue;

      const spell = this.spellLoader.getSpellById(effect.skillId);
      if (spell) {
        updatedSpells = [...updatedSpells, { ...spell, equipped: false }];
        console.log(`📖 Passive-Skill gelernt: ${spell.name}`);
      } else {
        console.warn(`⚠️ Passive "${passive.id}" referenziert unbekannte Skill-ID "${effect.skillId}".`);
      }
    }

    return updatedSpells;
  }

  /**
   * Persistiert Basis-Attribute, Statpunkte und Passive-Fortschritt im
   * LocalStorage (Spells bleiben dabei nur als ID + equipped-Flag erhalten,
   * analog zu syncSpellsToLocalStorage).
   */
  private persistProgressToLocalStorage(newState: any): void {
    const storageKey = `${this.profileData()}_skills`;
    const rawSave = localStorage.getItem(storageKey);

    try {
      const parsedSave = rawSave ? JSON.parse(rawSave) : { ...newState };

      for (const stat of INVESTABLE_STATS) {
        parsedSave[stat] = newState[stat];
      }
      parsedSave.statPoints = newState.statPoints;
      parsedSave.investedPoints = { ...newState.investedPoints };
      parsedSave.unlockedPassives = [...newState.unlockedPassives];
      parsedSave.spells = newState.spells.map((s: any) => ({ id: s.id, equipped: s.equipped }));
      parsedSave.equipped_spells = { ...this.equippedSpells() };

      localStorage.setItem(storageKey, JSON.stringify(parsedSave));
      console.log('💾 LocalStorage aktualisiert [shrine-progress]:', {
        statPoints: parsedSave.statPoints,
        investedPoints: parsedSave.investedPoints,
      });
    } catch (e) {
      console.error('❌ Fehler beim Synchronisieren des Shrine-Fortschritts in den LocalStorage:', e);
    }
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

import { Injectable, signal, computed, inject } from '@angular/core';
import { InventarService } from './inventar.service';
import { SpellLoaderService } from './spell-loader.service';

type EquippedSpells = {
  spell_1: string | null;
  spell_2: string | null;
  spell_3: string | null;
  spell_4: string | null;
};

@Injectable({
  providedIn: 'root',
})
export class SkillsService {
  private inventarService = inject(InventarService);
  private spellLoader = inject(SpellLoaderService);

  //test
  public profileData = signal<any>('');

  // Der nackte Basis-State des Charakters (Level-1 Startwerte)
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

  /**
   * Reaktives Signal für die belegten Spell-Slots.
   */
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
   * Berechnet das finale Kampfpaket: Basis-Werte + Ausrüstungsteile
   */
  public combatStats = computed(() => {
    const base = this.state();
    const slots = this.inventarService.equippedSlots();

    const finalStats = {
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

    const validSlots = [
      'head', 'chest', 'leg', 'gloves', 'footwear',
      'accessoire-left', 'accessoire-right', 'necklace',
      'ring-left', 'ring-right', 'weapon-1', 'weapon-2', 'back',
    ];

    validSlots.forEach((slotName) => {
      const item = slots[slotName];
      if (!item || !item.stats) return;
      const s = item.stats;

      if (s.armor) finalStats.armor += Number(s.armor);
      if (s['energy-shield']) finalStats['energy-shield'] += Number(s['energy-shield']);
      if (s['magic-find']) finalStats['magic-find'] += Number(s['magic-find']);
      if (s.attack) finalStats.attack += Number(s.attack);
      if (s['magic-attack']) finalStats.magicAttack += Number(s['magic-attack']);
      if (s.initiative) finalStats.initiative += Number(s.initiative);
      if (s.evasion) finalStats.evasion += Number(s.evasion);
      if (s['crit-chance']) finalStats.critChance += Number(s['crit-chance']);
      if (s['crit-damage']) finalStats.critDamage += Number(s['crit-damage']);
      if (s.chaosDamage) finalStats.chaosDamage += Number(s.chaosDamage);
      if (s.charisma) finalStats.charisma += Number(s.charisma);

      if (s.resistances) {
        if (s.resistances.fire) finalStats.resistances.fire += Number(s.resistances.fire);
        if (s.resistances.cold) finalStats.resistances.cold += Number(s.resistances.cold);
        if (s.resistances.lightning) finalStats.resistances.lightning += Number(s.resistances.lightning);
        if (s.resistances.chaos) finalStats.resistances.chaos += Number(s.resistances.chaos);
      }

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
    });

    console.log('⚔️ Reaktiv berechnete combatStats:', finalStats);
    return finalStats;
  });

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

  private hasNoSpells(data: any): boolean {
    return !data.spells || data.spells.length === 0;
  }

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
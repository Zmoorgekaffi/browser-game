import { Injectable, signal, computed, inject } from '@angular/core';
import { InventarService } from './inventar.service';

@Injectable({
  providedIn: 'root'
})
export class SkillsService {
  private inventarService = inject(InventarService);

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
    hp: 100,          // Basis-Leben (wird durch Vitality erhöht)
    mana: 20,         // Basis-Mana (wird durch Intelligence erhöht)
    attack: 5,
    magicAttack: 5,
    initiative: 10,
    evasion: 5,
    critChance: 5,    // In %
    critDamage: 150,  // In %
    chaosDamage: 0,
    charisma: 1,
    resistances: {
      fire: 0,
      cold: 0,
      lightning: 0,
      chaos: 0
    },
    spells: []
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
    console.log("hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiier combatstats: ", slots);
    

    // Tiefe Kopie für die Berechnungen
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
      resistances: { ...base.resistances }
    };

    // 🛡️ Explizite Liste aller gültigen Ausrüstungsslots (verhindert Prototyp-Spam)
    const validSlots = [
      'head', 'chest', 'leg', 'gloves', 'footwear', 
      'accessoire-left', 'accessoire-right', 
      'necklace', 'ring-left', 'ring-right', 
      'weapon-1', 'weapon-2', 'back'
    ];

    // Iteriere nur über die echten Items der validen Slots
    validSlots.forEach(slotName => {
      const item = slots[slotName];
      
      // Sicherheits-Check: Existiert das Item und hat es ein valides 'stats'-Objekt?
      if (!item || !item.stats) return;
      const s = item.stats;

      // 1. Direkte Status-Additionen von Items
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

      // 2. Elementare Resistenzen aufsummieren
      if (s.resistances) {
        if (s.resistances.fire) finalStats.resistances.fire += Number(s.resistances.fire);
        if (s.resistances.cold) finalStats.resistances.cold += Number(s.resistances.cold);
        if (s.resistances.lightning) finalStats.resistances.lightning += Number(s.resistances.lightning);
        if (s.resistances.chaos) finalStats.resistances.chaos += Number(s.resistances.chaos);
      }

      // 3. Primärattribute aufaddieren und Folgewerte skalieren (RPG-Logik)
      if (s.strength) {
        const str = Number(s.strength);
        finalStats.strength += str;
        finalStats.attack += str * 2; // 1 Stärke = +2 physischer Schaden
        finalStats.armor += Math.floor(str * 0.5);
      }
      if (s.intelligence) {
        const int = Number(s.intelligence);
        finalStats.intelligence += int;
        finalStats.magicAttack += int * 2; // 1 Int = +2 magischer Schaden
        finalStats.mana += int * 5;        // 1 Int = +5 max Mana
      }
      if (s.dexterity) {
        const dex = Number(s.dexterity);
        finalStats.dexterity += dex;
        finalStats.evasion += Math.floor(dex * 0.5); // Mehr Ausweichen durch Dex
        finalStats.initiative += dex;                // Höhere Init durch Dex
      }
      if (s.vitality) {
        const vit = Number(s.vitality);
        finalStats.vitality += vit;
        finalStats.hp += vit * 12; // 1 Vitalität = +12 max HP
      }
      if (s.luck) {
        const lck = Number(s.luck);
        finalStats.luck += lck;
        finalStats.critChance += Math.floor(lck * 0.2); // Glück erhöht kritische Treffer
        finalStats['magic-find'] += Math.floor(lck * 0.5); // Glück erhöht Magic Find
      }
    });

    console.log('⚔️ Reaktiv berechnete combatStats:', finalStats);
    return finalStats;
  });

  init(data: any): void {
    if (data && Object.keys(data).length > 0) {
      this.state.update(currentBase => {
        const merged = {
          ...currentBase,
          ...data,
          resistances: {
            ...currentBase.resistances,
            ...(data.resistances || {})
          },
          spells: data.spells || currentBase.spells || []
        };
        console.log('🛡️ SkillsService erfolgreich initialisiert mit:', merged);
        return merged;
      });
    } else {
      console.warn('⚠️ Keine Skill-Daten übergeben. Nutze Standard-Startwerte.');
    }
  }
}
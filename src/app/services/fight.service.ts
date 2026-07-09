import { Injectable, inject, signal, computed, WritableSignal } from '@angular/core';
import { AdventureStateService } from './adventure-state.service';
import { SkillsService } from './skills.service';
import { SpellsEngineService } from './spells-engine.service';
import { SpellLoaderService } from './spell-loader.service';
import { ProfileService } from './profile.service';
import { rollBetween, applyArmorMitigation } from '../utils/combat-roll.util';
import { applyBuffDeltas, PlayerBuff, BuffableStat } from '../utils/potion-buff.util';

/** XP-Vergütung, wenn ein Monster keine eigene `expReward` mitbringt. */
const DEFAULT_MONSTER_EXP_REWARD = 30;

/**
 * @service FightService
 * @description Komplette Kampf-Logik: Initialisierung, Spieler-/Monster-Züge,
 * Schadens-Verrechnung, Mana-Regeneration und Kampf-Ende (Sieg/Niederlage).
 * Die FightScene ist nur noch dünne UI-Schicht über diesem Service.
 */
@Injectable({
  providedIn: 'root',
})
export class FightService {
  private adventureStateService = inject(AdventureStateService);
  private skillsService = inject(SkillsService);
  private spellsEngineService = inject(SpellsEngineService);
  private spellLoader = inject(SpellLoaderService);
  private profileService = inject(ProfileService);

  activeFight = this.adventureStateService.activeFight;

  /** 🧪 Aktive Buff-Effekte aus Buff-Tränken — nur Spieler, gelten nur für den laufenden Kampf. */
  activePlayerBuffs = signal<PlayerBuff[]>([]);

  /**
   * Spieler-Kampfwerte inkl. aktiver Buff-Tränke — Basis für ALLE spielerseitigen
   * Kampfberechnungen in diesem Service UND in SpellsEngineService (siehe
   * getPlayerCombatStats()). Ersetzt skillsService.combatStats() überall dort,
   * wo Spieler-Werte im Kampf gebraucht werden.
   */
  buffedCombatStats = computed(() =>
    applyBuffDeltas(this.skillsService.combatStats(), this.activePlayerBuffs()),
  );

  playerHp = signal<number>(0);
  playerMaxHp = computed(() => this.buffedCombatStats().hp);
  playerMana = signal<number>(0);
  playerMaxMana = computed(() => this.buffedCombatStats().mana);
  playerEnergyShield = signal<number>(0);
  playerMaxEnergyShield = signal<number>(0);

  monsterHp = signal<number>(0);
  monsterMaxHp = signal<number>(0);
  monsterEnergyShield = signal<number>(0);
  monsterMaxEnergyShield = signal<number>(0);
  currentTurn = signal<'player' | 'monster'>('player');
  round = signal<number>(1);

  /** Kampf-Nachrichten (Würfelwürfe, Treffer, Ausweichen, Krits ...) für das Textfeld in der FightScene. */
  public battleLog = signal<string[]>([]);

  /**
   * Hält das vollständige Monster-Objekt mit angereicherten Spell-Objekten.
   * Wird NICHT in den LocalStorage geschrieben – lebt nur im Arbeitsspeicher.
   * Damit gehen die Spell-Daten beim endTurn()-Roundtrip durch activeFight nicht verloren.
   */
  private enrichedMonster = signal<any>(null);

  monsterName = computed(() => this.activeFight()?.monster?.name || 'Unbekanntes Monster');

  /** Gibt das angereicherte Monster-Objekt zurück – für SpellsEngine zur Stats-Abfrage */
  public getEnrichedMonster(): any {
    return this.enrichedMonster();
  }

  /**
   * Initialisiert einen neuen Kampf oder stellt einen bestehenden Zustand wieder her.
   * Monster-Spells werden einmalig angereichert und im enrichedMonster-Signal gehalten.
   *
   * SYNCHRON – kein await mehr nötig, da SpellLoaderService.enrichSpells()
   * die JSONs per Build-Time-Import bereits synchron im Speicher hält.
   */
  initializeFight(): void {
    const currentAdventureStep =
      this.adventureStateService.steps()[this.adventureStateService.currentStepIndex()];

    if (!currentAdventureStep || currentAdventureStep.type !== 'fight') {
      console.error('Nicht in einem Kampf-Schritt oder Schrittdaten fehlen.');
      return;
    }

    // Original-Monster behält die spellId-Struktur und wird via saveAdventure() persistiert.
    const originalMonster = currentAdventureStep.monster;
    if (!originalMonster) {
      console.error('Monsterdaten fehlen für den Kampf.');
      return;
    }

    // ✨ Deep-Clone, damit die Anreicherung der Spells das Original (und somit
    // die Savegame-Struktur) garantiert nicht verändert. Auch sicher, wenn
    // mehrere Fights dieselbe Monster-Referenz aus den eventSteps teilen.
    const fightMonster: any = structuredClone(originalMonster);

    // Monster-Spell-IDs einmalig anreichern und im lokalen Signal parken.
    if (Array.isArray(fightMonster.spells) && fightMonster.spells.length > 0) {
      fightMonster.spells = this.spellLoader.enrichSpells(fightMonster.spells);
      console.log('👹 Monster-Spells angereichert:', fightMonster.spells);
    }
    this.enrichedMonster.set(fightMonster);

    const playerCombatStats = this.skillsService.combatStats();
    // 🧪 HP/Mana werden über den GESAMTEN Run mitgenommen statt pro Kampf voll
    // regeneriert zu werden — null (allererster Kampf des Runs) fällt auf die
    // vollen combatStats() zurück, sonst wird auf das aktuelle Maximum geklemmt
    // (falls sich die Ausrüstung seit dem letzten Kampf geändert hat).
    const carriedHp = this.adventureStateService.currentPlayerHp();
    const carriedMana = this.adventureStateService.currentPlayerMana();
    const initialPlayerHp =
      carriedHp !== null ? Math.min(carriedHp, playerCombatStats.hp) : playerCombatStats.hp;
    const initialPlayerMana =
      carriedMana !== null ? Math.min(carriedMana, playerCombatStats.mana) : playerCombatStats.mana;
    // 🛡️ Energieschild wird genau wie HP/Mana über den ganzen Run mitgenommen
    // statt pro Kampf voll aufzuladen — maxPlayerEnergyShield bleibt das echte
    // Maximum aus den Ausrüstungs-/Attribut-Werten, startingPlayerEnergyShield
    // ist der tatsächliche Startwert eines NEUEN Kampfes.
    const maxPlayerEnergyShield = playerCombatStats['energy-shield'] ?? 0;
    const carriedEnergyShield = this.adventureStateService.currentPlayerEnergyShield();
    const startingPlayerEnergyShield =
      carriedEnergyShield !== null
        ? Math.min(carriedEnergyShield, maxPlayerEnergyShield)
        : maxPlayerEnergyShield;
    const initialMonsterEnergyShield = fightMonster['energy-shield'] ?? 0;

    let fightState = this.activeFight();
    const isNewFight = !fightState;

    if (!fightState) {
      this.battleLog.set([]);
      const startingTurn = this.rollInitiative(
        playerCombatStats.initiative ?? 0,
        fightMonster.initiative ?? 0,
        fightMonster.name,
      );

      fightState = {
        monsterHp: fightMonster.hp,
        monsterEnergyShield: initialMonsterEnergyShield,
        playerHp: initialPlayerHp,
        playerMana: initialPlayerMana,
        playerEnergyShield: startingPlayerEnergyShield,
        round: 1,
        turn: startingTurn,
        // Bewusst die Original-Referenz (mit reinen spellIds) speichern,
        // damit saveAdventure() weiterhin die schlanke Struktur persistiert.
        monster: originalMonster,
      };
      this.adventureStateService.activeFight.set(fightState);
      this.adventureStateService.saveAdventure();
    }

    this.playerHp.set(fightState.playerHp);
    this.playerMana.set(fightState.playerMana ?? initialPlayerMana);
    this.playerEnergyShield.set(fightState.playerEnergyShield ?? startingPlayerEnergyShield);
    this.playerMaxEnergyShield.set(maxPlayerEnergyShield);
    this.monsterHp.set(fightState.monsterHp);
    this.monsterMaxHp.set(fightMonster.hp);
    this.monsterEnergyShield.set(fightState.monsterEnergyShield ?? initialMonsterEnergyShield);
    this.monsterMaxEnergyShield.set(initialMonsterEnergyShield);
    this.currentTurn.set(fightState.turn);
    this.round.set(fightState.round);

    // Wenn der Initiative-Wurf das Monster zuerst ziehen lässt, muss dessen
    // Zug hier manuell angestoßen werden — sonst wartet die UI (Button
    // deaktiviert, da currentTurn() !== 'player') auf ein Ereignis, das nie
    // kommt (normalerweise triggert nur endTurn() den nächsten Monsterzug).
    if (isNewFight && fightState.turn === 'monster') {
      setTimeout(() => this.monsterTurn(), 1000);
    }

    console.log('Kampf initialisiert. Angereichertes Monster:', this.enrichedMonster());
  }

  /**
   * Initiative-Wurf zu Kampfbeginn: 1w20 + Differenz der Initiative-Werte.
   * Ergebnis > 10 → Spieler beginnt, sonst das Monster. Wer die höhere
   * Initiative hat, hat dadurch einen spürbaren Vorteil bei diesem Wurf.
   */
  private rollInitiative(playerInitiative: number, monsterInitiative: number, monsterName: string): 'player' | 'monster' {
    const diff = playerInitiative - monsterInitiative;
    const roll = this.rollDie(20);
    const result = roll + diff;
    const playerStarts = result > 10;

    const diffText = diff >= 0 ? `+${diff}` : `${diff}`;
    this.addLogMessage(
      `🎲 Initiative-Wurf: ${roll} (Differenz ${diffText}) = ${result} → ${playerStarts ? 'Du beginnst!' : `${monsterName} beginnt!`}`,
    );

    return playerStarts ? 'player' : 'monster';
  }

  /** Würfelt einen W-seitigen Würfel (1 bis sides, inklusiv). */
  private rollDie(sides: number): number {
    return 1 + Math.floor(Math.random() * sides);
  }

  /** Hängt eine Nachricht ans Kampf-Log an (für das Textfeld in der FightScene). */
  private addLogMessage(message: string): void {
    this.battleLog.update((log) => [...log, message].slice(-30));
  }

  /** Führt den normalen Angriff des Spielers aus (nur im Spieler-Zug). */
  executePlayerAttack(): void {
    if (this.currentTurn() !== 'player') return;
    const stats = this.buffedCombatStats();
    const rawDamage = rollBetween(stats.attackMin, stats.attackMax);
    // Physischer Schadens-Multiplikator aus Stärke (siehe SkillsService.
    // applyAttributeScaling) wirkt erst hier auf den ausgewürfelten Waffenschaden.
    const damage = Math.round(rawDamage * (stats.physicalDamageMultiplier ?? 1));
    this.applyDamageToMonster(damage);
    this.endTurn();
  }

  /**
   * Wirkt einen Spieler-Spell über die SpellsEngine (nur im Spieler-Zug).
   *
   * @param spellId ID des zu wirkenden Spells.
   */
  async executeCastSpell(spellId: string): Promise<void> {
    if (this.currentTurn() !== 'player') return;
    const spell = this.skillsService.spells().find((s: any) => s.id === spellId);
    if (!spell) return;
    const success = await this.spellsEngineService.castSpell(spell, 'player');
    if (success) this.endTurn();
  }

  /** True, wenn der Spieler genug Mana für den angegebenen Spell hat. */
  hasEnoughMana(spellId: string): boolean {
    const spell = this.skillsService.spells().find((s: any) => s.id === spellId);
    const manaCost = spell?.manaCost || 0;
    return this.playerMana() >= manaCost;
  }

  /** Liefert den Anzeigenamen eines Spells (Fallback: 'Unbekannter Zauber'). */
  getSpellName(spellId: string): string {
    const spell = this.skillsService.spells().find((s: any) => s.id === spellId);
    return spell ? spell.name : 'Unbekannter Zauber';
  }

  /** 🧪 Spieler-Kampfwerte inkl. aktiver Buff-Tränke — für SpellsEngineService. */
  public getPlayerCombatStats(): any {
    return this.buffedCombatStats();
  }

  /** 🧪 Wendet einen Heiltrank im Kampf an, geklemmt an playerMaxHp(). */
  public healPlayer(value: number): void {
    this.playerHp.update((hp) => Math.min(this.playerMaxHp(), hp + value));
  }

  /** 🧪 Wendet einen Manatrank im Kampf an, geklemmt an playerMaxMana(). */
  public restoreMana(value: number): void {
    this.playerMana.update((mana) => Math.min(this.playerMaxMana(), mana + value));
  }

  /** 🧪 Fügt einen Buff-Trank-Effekt hinzu (siehe activePlayerBuffs/buffedCombatStats). */
  public addPlayerBuff(stat: BuffableStat, amount: number, duration: number, potionName: string): void {
    this.activePlayerBuffs.update((buffs) => [
      ...buffs,
      { stat, amount, roundsLeft: duration, potionName },
    ]);
  }

  /**
   * 🧪 Verbraucht den Spielzug für das Trinken eines Trankes (nur im Spieler-Zug,
   * wie ein Angriff oder Zauber — ersetzt den entfernten "Verteidigen (TBD)"-Slot).
   */
  public consumePotionTurn(logMessage: string): void {
    if (this.currentTurn() !== 'player') return;
    this.addLogMessage(logMessage);
    this.endTurn();
  }

  /**
   * Zieht dem Monster Schaden ab (nach Ausweich-/Krit-Wurf, siehe
   * `resolveAttack()`); bei 0 HP endet der Kampf mit Sieg.
   *
   * @param damageType 'physical' (Default) mindert über die Rüstung des
   *                   Monsters (siehe applyArmorMitigation); 'elemental'
   *                   überspringt das, da Elementarschaden bereits VOR
   *                   diesem Aufruf per Resistenz gemindert wurde (siehe
   *                   SpellsEngineService, wo das konkrete Element bekannt ist).
   */
  public applyDamageToMonster(damage: number, damageType: 'physical' | 'elemental' = 'physical'): void {
    const monster = this.enrichedMonster();
    const playerStats = this.buffedCombatStats();

    const { finalDamage, dodged } = this.resolveAttack(damage, {
      attackerLuck: playerStats.luck ?? 0,
      attackerCritChance: playerStats.critChance ?? 0,
      attackerCritDamage: playerStats.critDamage ?? 0,
      defenderEvasion: monster?.evasion ?? 0,
      attackerLabel: 'Du',
      defenderLabel: monster?.name ?? 'Gegner',
    });
    if (dodged) return;

    const mitigatedDamage = this.mitigateByArmor(finalDamage, damageType, monster?.armor ?? 0);
    const remaining = this.drainEnergyShield(this.monsterEnergyShield, mitigatedDamage);
    this.monsterHp.update((hp) => Math.max(0, hp - remaining));
    if (this.monsterHp() <= 0) this.handleFightEnd(true);
  }

  /**
   * Zieht dem Spieler Schaden ab (nach Ausweich-/Krit-Wurf, siehe
   * `resolveAttack()`); bei 0 HP endet der Kampf mit Niederlage.
   *
   * NUR hier (Schaden von NPC-Gegnern gegen den Spieler) wird der Schaden
   * zusätzlich zufällig auf 75%–100% skaliert. Die Skalierung passiert VOR
   * `resolveAttack()`, damit Kampf-Log (Krit-/Treffer-Zeile) und tatsächlich
   * abgezogene HP übereinstimmen. applyDamageToMonster (Spieler-Schaden)
   * bleibt davon unberührt.
   *
   * @param damageType Siehe applyDamageToMonster — hier mindert die Rüstung
   *                   des SPIELERS bei 'physical'.
   */
  public applyDamageToPlayer(damage: number, damageType: 'physical' | 'elemental' = 'physical'): void {
    const monster = this.enrichedMonster();
    const playerStats = this.buffedCombatStats();

    const scaledDamage = Math.round(damage * (0.75 + Math.random() * 0.25));

    const { finalDamage, dodged } = this.resolveAttack(scaledDamage, {
      attackerLuck: monster?.luck ?? 0,
      attackerCritChance: monster?.critChance ?? 0,
      attackerCritDamage: monster?.critDamage ?? 0,
      defenderEvasion: playerStats.evasion ?? 0,
      attackerLabel: monster?.name ?? 'Gegner',
      defenderLabel: 'Du',
    });
    if (dodged) return;

    const mitigatedDamage = this.mitigateByArmor(finalDamage, damageType, playerStats.armor ?? 0);
    const remaining = this.drainEnergyShield(this.playerEnergyShield, mitigatedDamage);
    this.playerHp.update((hp) => Math.max(0, hp - remaining));
    if (this.playerHp() <= 0) this.handleFightEnd(false);
  }

  /**
   * Ausweich- und Krit-Würfe für einen einzelnen Angriff (egal ob normaler
   * Schlag oder Spell — beide laufen über applyDamageToMonster/Player).
   *
   * Ausweichen: Verteidiger würfelt 1w20 + Ausweichen, Angreifer 1w20 + Glück.
   * Gewinnt der Verteidiger (>=), wird komplett ausgewichen (0 Schaden).
   *
   * Kritischer Treffer: 1w10 + Krit-Chance - 5 = Krit-Chance in Prozent für
   * diesen Angriff. Bei einem Krit wird der Schaden mit
   * (1 + Krit-Schaden/2/100) multipliziert (z.B. 150 Krit-Schaden → +75%).
   */
  private resolveAttack(
    rawDamage: number,
    params: {
      attackerLuck: number;
      attackerCritChance: number;
      attackerCritDamage: number;
      defenderEvasion: number;
      attackerLabel: string;
      defenderLabel: string;
    },
  ): { finalDamage: number; dodged: boolean } {
    const defenseRoll = this.rollDie(20);
    const defenseTotal = defenseRoll + params.defenderEvasion;
    const attackRoll = this.rollDie(20);
    const attackTotal = attackRoll + params.attackerLuck;

    if (defenseTotal >= attackTotal) {
      this.addLogMessage(
        `🛡️ ${params.defenderLabel} weicht aus! (Ausweichen ${defenseRoll}+${params.defenderEvasion}=${defenseTotal} vs. Glück ${attackRoll}+${params.attackerLuck}=${attackTotal})`,
      );
      return { finalDamage: 0, dodged: true };
    }

    const critRoll = this.rollDie(10);
    const critChancePercent = critRoll + params.attackerCritChance - 5;

    if (Math.random() * 100 < critChancePercent) {
      const critMultiplierPercent = params.attackerCritDamage / 2;
      const finalDamage = Math.round(rawDamage * (1 + critMultiplierPercent / 100));
      this.addLogMessage(
        `💥 Kritischer Treffer von ${params.attackerLabel}! (Krit-Wurf ${critRoll}+${params.attackerCritChance}-5=${critChancePercent}%) ${rawDamage} → ${finalDamage} Schaden`,
      );
      return { finalDamage, dodged: false };
    }

    this.addLogMessage(`⚔️ ${params.attackerLabel} trifft ${params.defenderLabel} für ${rawDamage} Schaden.`);
    return { finalDamage: rawDamage, dodged: false };
  }

  /**
   * Mindert physischen Schaden über die Rüstung des Verteidigers per Diminishing-
   * Returns-Kurve (siehe combat-roll.util.applyArmorMitigation — NICHT linear wie
   * Elementar-Resistenz, da Rüstungs-Item-Werte eine ganz andere Zahlenskala haben).
   * Bei 'elemental' greift stattdessen die Element-Resistenz (siehe SpellsEngineService),
   * daher hier ein reines Passthrough.
   */
  private mitigateByArmor(damage: number, damageType: 'physical' | 'elemental', armor: number): number {
    if (damageType !== 'physical' || armor <= 0) return damage;
    const mitigated = applyArmorMitigation(damage, armor);
    if (mitigated < damage) {
      this.addLogMessage(`🛡️ Rüstung mindert den Schaden: ${damage} → ${mitigated}`);
    }
    return mitigated;
  }

  /**
   * Zieht Schaden zuerst vom Energieschild ab, der Rest geht auf die HP.
   *
   * @param energyShieldSignal Signal von Spieler oder Monster (wird mutiert).
   * @param damage             Eingehender Schaden nach Ausweichen/Krit.
   * @returns Verbleibender Schaden, der die HP treffen soll.
   */
  private drainEnergyShield(energyShieldSignal: WritableSignal<number>, damage: number): number {
    const currentShield = energyShieldSignal();
    if (currentShield <= 0) return damage;

    const absorbed = Math.min(currentShield, damage);
    energyShieldSignal.set(currentShield - absorbed);
    return damage - absorbed;
  }

  private endTurn(): void {
    // 🛡️ Guard: Wenn der Kampf durch applyDamageToMonster/Player bereits als
    // Sieg oder Niederlage abgeschlossen wurde (activeFight = null), dann
    // darf hier NICHTS mehr passieren. Sonst überschreibt der Spread-Set
    // den null-State mit einem halben Fight-Snapshot und der nächste Step
    // spawnt beim nächsten Load kaputt (Monster mit 0 HP etc.).
    if (!this.adventureStateService.activeFight()) {
      console.log('[endTurn] Kampf ist bereits vorbei, breche ab.');
      return;
    }

    this.adventureStateService.activeFight.set({
      ...this.activeFight()!,
      playerHp: this.playerHp(),
      monsterHp: this.monsterHp(),
      playerMana: this.playerMana(),
      playerEnergyShield: this.playerEnergyShield(),
      monsterEnergyShield: this.monsterEnergyShield(),
      turn: this.currentTurn() === 'player' ? 'monster' : 'player',
    });
    this.adventureStateService.saveAdventure();

    if (this.currentTurn() === 'player') {
      this.currentTurn.set('monster');
      setTimeout(() => this.monsterTurn(), 1000);
    } else {
      this.currentTurn.set('player');
      this.round.update((r) => r + 1);

      // 🧪 Buff-Tränke laufen über eine feste Rundenzahl — ein voller
      // Rundenwechsel (Spieler UND Monster haben gezogen) zählt als 1 Runde.
      this.activePlayerBuffs.update((buffs) =>
        buffs
          .map((b) => ({ ...b, roundsLeft: b.roundsLeft - 1 }))
          .filter((b) => b.roundsLeft > 0),
      );

      const playerStats = this.buffedCombatStats();
      const manaRegen = 3 + Math.floor((playerStats.intelligence || 0) / 5);
      this.playerMana.update((mana) => Math.min(this.playerMaxMana(), mana + manaRegen));

      // HP-Regeneration: skaliert mit Vitalität (+0.5/Punkt, siehe SkillsService.
      // applyAttributeScaling), erst hier beim tatsächlichen Anwenden abgerundet.
      const hpRegen = Math.floor(playerStats['hp-regeneration'] ?? 0);
      if (hpRegen > 0) {
        this.playerHp.update((hp) => Math.min(this.playerMaxHp(), hp + hpRegen));
      }

      if (this.monsterHp() <= 0) this.handleFightEnd(true);
    }
  }

  /**
   * Monsterzug – liest Spells aus enrichedMonster (volle Objekte, kein LocalStorage-Roundtrip).
   * Defensiv: Falls die Anreicherung in initializeFight aus irgendeinem Grund nicht
   * gegriffen hat (z.B. Spell-IDs aus dem Save-Roundtrip), wird der Spell hier on-the-fly
   * über den SpellLoader nachgeladen, bevor er an die SpellsEngine geht.
   */
  private monsterTurn(): void {
    if (this.monsterHp() <= 0) return;

    const monster = this.enrichedMonster();
    if (!monster) return;

    if (Array.isArray(monster.spells) && monster.spells.length > 0 && Math.random() > 0.5) {
      const rawSpell = monster.spells[Math.floor(Math.random() * monster.spells.length)];

      const resolvedSpell = this.resolveMonsterSpell(rawSpell);

      if (!resolvedSpell) {
        // Auflösung gescheitert (ID unbekannt) → Fallback auf normalen Angriff,
        // damit der Kampf-Turn nicht kommentarlos verloren geht.
        console.warn(
          '👹 Monster-Spell konnte nicht aufgelöst werden, weiche auf normalen Angriff aus:',
          rawSpell,
        );
        const damage = monster.attack || 10;
        this.applyDamageToPlayer(damage);
        this.endTurn();
        return;
      }

      console.log('👹 Monster wirkt Spell:', resolvedSpell);
      // Monster-Casts durchlaufen die Resolve-Mechanik nicht (kein await in
      // diesem Zweig von SpellsEngineService.castSpell) und laufen daher
      // trotz async-Signatur synchron durch, bevor endTurn() greift.
      void this.spellsEngineService.castSpell(resolvedSpell, 'monster');
      this.endTurn();
    } else {
      console.log('Monster greift normal an!');
      const damage = monster.attack || 10;
      this.applyDamageToPlayer(damage);
      this.endTurn();
    }
  }

  /**
   * Garantiert ein vollständiges Spell-Objekt mit effectType. Akzeptiert
   * - Strings (reine ID: 'spell_fire_01')
   * - Stub-Objekte ({ id: 'spell_fire_01' } ohne weitere Felder)
   * - bereits angereicherte Objekte (werden unverändert zurückgegeben)
   * Gibt null zurück, wenn die ID im SpellLoader-Cache nicht existiert.
   */
  private resolveMonsterSpell(spell: any): any | null {
    // Bereits vollständiges Objekt? → durchreichen
    if (spell && typeof spell === 'object' && spell.effectType) {
      return spell;
    }

    // ID extrahieren (string oder { id })
    const spellId = typeof spell === 'string' ? spell : spell?.id;
    if (!spellId) return null;

    const enriched = this.spellLoader.enrichSpells([spellId]);
    return enriched.length > 0 ? enriched[0] : null;
  }

  /**
   * Beendet den Kampf: Bei Sieg geht's zum Zwischenstand (danach nächster
   * Step), bei Niederlage zum Zwischenstand mit Niederlage-Nachricht
   * (danach wird das Abenteuer über failAdventure() abgebrochen).
   *
   * XP werden sofort bei Sieg vergeben (nicht erst am Ende des Abenteuers,
   * anders als Loot/Items) — daher hier und nicht im LootScene-Flow.
   *
   * @param playerWon true = Spieler hat gewonnen.
   */
  private handleFightEnd(playerWon: boolean): void {
    const defeatedMonster = this.enrichedMonster();
    this.enrichedMonster.set(null); // aufräumen

    // 🧪 HP/Mana am Kampfende in den Run-weiten Träger zurückschreiben, damit
    // der nächste Kampf-Step NICHT wieder bei voller HP/Mana startet (siehe
    // initializeFight()). Bei Niederlage wird der Wert kurz danach ohnehin
    // über clearAdventure() (failAdventure) wieder auf null zurückgesetzt.
    this.adventureStateService.currentPlayerHp.set(this.playerHp());
    this.adventureStateService.currentPlayerMana.set(this.playerMana());
    this.adventureStateService.currentPlayerEnergyShield.set(this.playerEnergyShield());

    // 🧪 Buff-Tränke wirken nur für den Kampf, in dem sie getrunken wurden —
    // bei Sieg UND Niederlage werden sie hier immer geleert.
    this.activePlayerBuffs.set([]);

    if (playerWon) {
      console.log('🏆 Sieg!');
      const expReward = defeatedMonster?.expReward ?? DEFAULT_MONSTER_EXP_REWARD;
      this.profileService.addExp(expReward);

      // ⚠️ WICHTIG: activeFight VOR den Reward-Rolls nullen. recordRunGold()/
      // addReward() speichern (saveAdventure()) sofort — würde activeFight erst
      // danach genullt, persistiert dieser Save-Aufruf noch den besiegten Kampf
      // (Monster-HP 0). Beim nächsten Szenenwechsel lädt SceneContainer den
      // State aus dem LocalStorage neu und würde diesen toten Kampf zurück ins
      // Signal holen — der nächste Kampf startet dann fälschlich als "Resume"
      // mit 0 HP statt mit den vollen HP des neuen Monsters.
      this.adventureStateService.activeFight.set(null);

      // 🎁 Kampf-Beute: zufällig entweder Gold oder ein Item — exakt dieselben
      // Roll-Methoden, die auch die Dialog-Encounters für ihre Belohnungen nutzen.
      const area = this.adventureStateService.level();
      if (area) {
        if (Math.random() < 0.5) {
          const gold = area.rollGoldReward();
          this.adventureStateService.recordRunGold(gold);
          console.log(`💰 Kampf-Beute: ${gold} Gold`);
        } else {
          const item = area.rollLoot();
          if (item) {
            this.adventureStateService.addReward(item);
            console.log(`🎁 Kampf-Beute: ${item.name}`);
          }
        }
      }

      this.adventureStateService.showStepSummary();
    } else {
      console.log('💀 Niederlage! Zeige Zwischenstand vor Adventure-Abbruch.');
      // activeFight nicht extra nullen — failAdventure → clearAdventure macht das,
      // sobald der Spieler den Zwischenstand bestätigt.
      this.adventureStateService.showDeathSummary();
    }
  }
}

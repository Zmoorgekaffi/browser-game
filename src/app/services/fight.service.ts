import { Injectable, inject, signal, computed } from '@angular/core';
import { AdventureStateService } from './adventure-state.service';
import { SkillsService } from './skills.service';
import { SpellsEngineService } from './spells-engine.service';
import { SpellLoaderService } from './spell-loader.service';

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

  activeFight = this.adventureStateService.activeFight;

  playerHp = signal<number>(0);
  playerMaxHp = signal<number>(0);
  playerMana = signal<number>(0);
  playerMaxMana = computed(() => this.skillsService.combatStats().mana);

  monsterHp = signal<number>(0);
  monsterMaxHp = signal<number>(0);
  currentTurn = signal<'player' | 'monster'>('player');
  round = signal<number>(1);

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
    const initialPlayerHp = playerCombatStats.hp;
    const initialPlayerMana = playerCombatStats.mana;

    let fightState = this.activeFight();

    if (!fightState) {
      fightState = {
        monsterHp: fightMonster.hp,
        playerHp: initialPlayerHp,
        playerMana: initialPlayerMana,
        round: 1,
        turn: 'player',
        // Bewusst die Original-Referenz (mit reinen spellIds) speichern,
        // damit saveAdventure() weiterhin die schlanke Struktur persistiert.
        monster: originalMonster,
      };
      this.adventureStateService.activeFight.set(fightState);
      this.adventureStateService.saveAdventure();
    }

    this.playerHp.set(fightState.playerHp);
    this.playerMaxHp.set(initialPlayerHp);
    this.playerMana.set(fightState.playerMana ?? initialPlayerMana);
    this.monsterHp.set(fightState.monsterHp);
    this.monsterMaxHp.set(fightMonster.hp);
    this.currentTurn.set(fightState.turn);
    this.round.set(fightState.round);

    console.log('Kampf initialisiert. Angereichertes Monster:', this.enrichedMonster());
  }

  /** Führt den normalen Angriff des Spielers aus (nur im Spieler-Zug). */
  executePlayerAttack(): void {
    if (this.currentTurn() !== 'player') return;
    const damage = this.skillsService.combatStats().attack;
    this.applyDamageToMonster(damage);
    this.endTurn();
  }

  /**
   * Wirkt einen Spieler-Spell über die SpellsEngine (nur im Spieler-Zug).
   *
   * @param spellId ID des zu wirkenden Spells.
   */
  executeCastSpell(spellId: string): void {
    if (this.currentTurn() !== 'player') return;
    const spell = this.skillsService.spells().find((s: any) => s.id === spellId);
    if (!spell) return;
    const success = this.spellsEngineService.castSpell(spell, 'player');
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

  /** Zieht dem Monster Schaden ab; bei 0 HP endet der Kampf mit Sieg. */
  public applyDamageToMonster(damage: number): void {
    this.monsterHp.update((hp) => Math.max(0, hp - damage));
    if (this.monsterHp() <= 0) this.handleFightEnd(true);
  }

  /** Zieht dem Spieler Schaden ab; bei 0 HP endet der Kampf mit Niederlage. */
  public applyDamageToPlayer(damage: number): void {
    this.playerHp.update((hp) => Math.max(0, hp - damage));
    if (this.playerHp() <= 0) this.handleFightEnd(false);
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
      turn: this.currentTurn() === 'player' ? 'monster' : 'player',
    });
    this.adventureStateService.saveAdventure();

    if (this.currentTurn() === 'player') {
      this.currentTurn.set('monster');
      setTimeout(() => this.monsterTurn(), 1000);
    } else {
      this.currentTurn.set('player');
      this.round.update((r) => r + 1);

      const intelligence = this.skillsService.combatStats().intelligence || 0;
      const manaRegen = 3 + Math.floor(intelligence / 5);
      this.playerMana.update((mana) => Math.min(this.playerMaxMana(), mana + manaRegen));

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
      this.spellsEngineService.castSpell(resolvedSpell, 'monster');
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
   * Beendet den Kampf: Bei Sieg geht's zum nächsten Step, bei Niederlage
   * wird das komplette Abenteuer abgebrochen (failAdventure).
   *
   * @param playerWon true = Spieler hat gewonnen.
   */
  private handleFightEnd(playerWon: boolean): void {
    this.enrichedMonster.set(null); // aufräumen
    if (playerWon) {
      console.log('🏆 Sieg!');
      this.adventureStateService.activeFight.set(null);
      this.adventureStateService.advanceToNextStep();
    } else {
      console.log('💀 Niederlage! Adventure wird beendet.');
      // activeFight nicht extra nullen — failAdventure → clearAdventure macht das.
      this.adventureStateService.failAdventure();
    }
  }
}

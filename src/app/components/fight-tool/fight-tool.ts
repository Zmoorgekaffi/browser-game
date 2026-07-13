import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SkillsService } from '../../services/skills.service';
import { InventarService } from '../../services/inventar.service';
import { SpellLoaderService, SpellData } from '../../services/spell-loader.service';
import { PassiveLoaderService } from '../../services/passive-loader.service';
import { InvestableStat, PassiveData } from '../../models/passive.interface';
import { simulateRun, SimRunResult, SimStepOutcome } from '../../utils/fight-simulator.util';
import {
  EQUIP_SLOT_KEYS,
  EQUIP_SLOT_LABELS,
  EquipSlotKey,
  ITEM_CATALOG_BY_SLOT,
  ALL_MONSTERS,
  CatalogMonster,
} from './fight-tool-catalog.util';

/**
 * Sandbox-Charakter-ID für die im Konstruktor injizierten, isolierten
 * SkillsService-/InventarService-Instanzen (siehe `providers` unten). Sorgt
 * dafür, dass ein eventueller Persist-Aufruf niemals unter dem echten
 * Charakter-Key landet, sondern in einem harmlosen, klar erkennbaren
 * Wegwerf-Key — der echte Spielstand wird durch dieses Tool nie verändert.
 */
const SANDBOX_CHAR_ID = '__fight-tool__';

const INVESTABLE_STATS: InvestableStat[] = ['strength', 'dexterity', 'intelligence', 'vitality'];

const INVESTABLE_STAT_LABELS: Record<InvestableStat, string> = {
  strength: 'Stärke',
  dexterity: 'Geschick',
  intelligence: 'Intelligenz',
  vitality: 'Vitalität',
};

interface StepConfig {
  monsterId: string | null;
}

interface AggregatedStepStats {
  monsterName: string;
  attempts: number;
  wins: number;
  avgRounds: number;
  avgHpLostPercent: number;
  timeouts: number;
}

interface DeathAtStep {
  stepIndex: number;
  died: number;
  timedOut: number;
}

interface AggregatedResults {
  totalRuns: number;
  runsWon: number;
  deathDistribution: DeathAtStep[];
  perStep: AggregatedStepStats[];
  /** Die ersten N Einzel-Runs (roh), damit man konkret nachvollziehen kann, WANN/WIE viel HP wo verloren ging. */
  sampleRuns: SimRunResult[];
}

const MAX_SAMPLE_RUNS = 30;

/** Deckelt die Summe aller 4 Investitions-Leisten, damit im Sandbox nicht überall gleichzeitig auf 100 gedreht wird. */
const MAX_TOTAL_INVESTED_POINTS = 250;

const ELEMENT_LABELS: Record<string, string> = {
  fire: '🔥 Feuer', cold: '❄️ Kälte', lightning: '⚡ Blitz', chaos: '💀 Chaos',
};

interface WeaponDamageInfo {
  slot: 'weapon-1' | 'weapon-2';
  name: string;
  weaponType: string;
  /** Element, das der Schadensrange dieser Waffe zugutekommt — null bei physischen Waffen. */
  magicDamageType: string | null;
}

/**
 * @component FightTool
 * @description Dev-Route `/fight-tool` zum Balance-Testen: Charakter frei aus
 * ALLEN Items/Spells equippen (isolierte Sandbox, siehe SANDBOX_CHAR_ID),
 * Attributspunkte frei auf die 4 Schrein-Stats verteilen (schaltet automatisch
 * die passenden Passives frei), eine Monster-Step-Sequenz (Mini-Dungeon-Run)
 * zusammenstellen und N mal headless simulieren (siehe fight-simulator.util.ts).
 * Das Resolve-Minigame wird dabei immer als vollen Erfolg gewertet.
 *
 * `providers: [SkillsService, InventarService]` erzeugt für dieses
 * Komponenten-Subtree frische, vom echten Spielstand komplett isolierte
 * Instanzen (Standard-Angular-Hierarchical-DI) — inject() innerhalb dieser
 * Services löst weiterhin im selben Subtree auf, `combatStats()` bleibt also
 * die echte, unveränderte Formel-Pipeline.
 */
@Component({
  selector: 'app-fight-tool',
  imports: [FormsModule],
  providers: [SkillsService, InventarService],
  templateUrl: './fight-tool.html',
  styleUrl: './fight-tool.scss',
})
export class FightTool implements OnInit {
  private skillsService = inject(SkillsService);
  private inventarService = inject(InventarService);
  private spellLoader = inject(SpellLoaderService);
  private passiveLoader = inject(PassiveLoaderService);

  readonly equipSlotKeys = EQUIP_SLOT_KEYS;
  readonly equipSlotLabels = EQUIP_SLOT_LABELS;
  readonly itemCatalogBySlot = ITEM_CATALOG_BY_SLOT;
  readonly allMonsters: CatalogMonster[] = ALL_MONSTERS;
  readonly allSpells: SpellData[] = [...this.spellLoader.getAllSpells()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  readonly investableStats = INVESTABLE_STATS;
  readonly investableStatLabels = INVESTABLE_STAT_LABELS;

  /** Live-Kampfwerte des Sandbox-Charakters — reagiert automatisch auf jede Equip-/Attribut-Änderung. */
  combatStats = this.skillsService.combatStats;
  equippedSlots = this.inventarService.equippedSlots;

  /** 4 Spell-Slots (Spell-ID oder null) — Slot-Reihenfolge = Cast-Priorität im Autopilot. */
  spellSlotIds = signal<(string | null)[]>([null, null, null, null]);

  /** Frei einstellbare Investitions-Leiste pro Grundstat (0-100), unabhängig von echten statPoints. */
  investedPoints = signal<Record<InvestableStat, number>>({
    strength: 0, dexterity: 0, intelligence: 0, vitality: 0,
  });

  /** Rohe Basiswerte OHNE Schrein-Investition (Level-Basis + evtl. andere Boni) — Grundlage für applyInvestedPoints(). */
  private rawBaseAttributes: Record<InvestableStat, number> = {
    strength: 5, dexterity: 5, intelligence: 5, vitality: 5,
  };

  /** Aktuell aus investedPoints() abgeleitete, aktive Passives (Name/Beschreibung für die Anzeige). */
  activePassives = computed<PassiveData[]>(() => {
    const inv = this.investedPoints();
    const active: PassiveData[] = [];
    for (const stat of this.investableStats) {
      for (const passive of this.passiveLoader.getPassivesForStat(stat)) {
        if (passive.threshold <= inv[stat]) active.push(passive);
      }
    }
    return active;
  });

  readonly maxTotalInvestedPoints = MAX_TOTAL_INVESTED_POINTS;
  totalInvestedPoints = computed(() =>
    this.investableStats.reduce((sum, stat) => sum + this.investedPoints()[stat], 0),
  );
  remainingInvestedPoints = computed(() =>
    Math.max(0, this.maxTotalInvestedPoints - this.totalInvestedPoints()),
  );

  /**
   * Welche(s) ausgerüstete(n) Waffe(n) auf welchen Schadenstyp zählen — Kontrolle
   * für die Anzeige unter den Spell-Slots. Wichtig: eine "magie"-Waffe verstärkt
   * NUR Zauber IHRES EIGENEN Elements (magic-damage-type), siehe
   * SkillsService.addWeaponRangeStats/SpellsEngineService.castSpell
   * (magicAttackByElement ist strikt pro Element getrennt) — ein Chaos-Stab
   * bringt also NICHTS für einen Blitz-Zauber.
   */
  equippedWeaponInfo = computed<WeaponDamageInfo[]>(() => {
    const slots = this.equippedSlots();
    const result: WeaponDamageInfo[] = [];
    for (const slot of ['weapon-1', 'weapon-2'] as const) {
      const item = slots[slot];
      if (!item) continue;
      const weaponType = item['weapon-type'];
      result.push({
        slot,
        name: item.name,
        weaponType,
        magicDamageType: weaponType === 'magie' ? (item['magic-damage-type'] ?? null) : null,
      });
    }
    return result;
  });

  elementLabel(element: string): string {
    return ELEMENT_LABELS[element] ?? element;
  }

  steps = signal<StepConfig[]>([{ monsterId: null }]);
  numberOfRuns = signal<number>(50);

  isRunning = signal(false);
  results = signal<AggregatedResults | null>(null);
  configError = signal<string | null>(null);

  equippedSpellObjects = computed<(SpellData | null)[]>(() =>
    this.spellSlotIds().map((id) => (id ? this.spellLoader.getSpellById(id) : null)),
  );

  ngOnInit(): void {
    this.seedBaseAttributesFromRealCharacter();
  }

  /**
   * Übernimmt NUR die Basis-Attribute/Level/Schrein-Investitionen des echten,
   * aktuell eingeloggten Charakters als Startpunkt (bequemer Ausgangspunkt für
   * "wie würde MEIN Charakter mit anderer Ausrüstung/Investition abschneiden").
   * Ausrüstung und Spell-Slots starten bewusst leer — die werden komplett frei
   * über die Selects unten zusammengestellt, unabhängig vom echten Besitz.
   * Die Investitions-Leiste (investedPoints) wird danach frei editierbar,
   * unabhängig vom tatsächlich verfügbaren statPoints-Guthaben des echten Chars.
   */
  private seedBaseAttributesFromRealCharacter(): void {
    this.skillsService.profileData.set(SANDBOX_CHAR_ID);
    this.inventarService.init({ items: [] }, SANDBOX_CHAR_ID);

    try {
      const charId = sessionStorage.getItem('pixel-quest-currentUser');
      const skillsRaw = charId ? localStorage.getItem(`${charId}_skills`) : null;
      if (skillsRaw) {
        this.skillsService.init(JSON.parse(skillsRaw));
      }
    } catch (e) {
      console.warn('[FightTool] Konnte echten Charakter nicht als Vorlage laden, starte mit Standardwerten.', e);
    }

    // Equip-Init lädt ggf. Spells aus dem echten Save mit — für den Fight-Tool-
    // Loadout wollen wir aber explizit leere Slots, siehe Klassenkommentar.
    this.skillsService.equippedSpells.set({ spell_1: null, spell_2: null, spell_3: null, spell_4: null });

    // rohe Basis = aktueller State minus bereits investierter Punkte (investStatPoint()
    // erhöht Stat UND investedPoints immer im Gleichschritt um 1, siehe SkillsService).
    const state = this.skillsService.state();
    const seededInvested = state.investedPoints ?? { strength: 0, dexterity: 0, intelligence: 0, vitality: 0 };
    this.rawBaseAttributes = {
      strength: state.strength - seededInvested.strength,
      dexterity: state.dexterity - seededInvested.dexterity,
      intelligence: state.intelligence - seededInvested.intelligence,
      vitality: state.vitality - seededInvested.vitality,
    };
    this.investedPoints.set(this.clampToTotalBudget(seededInvested));
    this.applyInvestedPoints();
  }

  /**
   * Setzt einen einzelnen Stat, geklemmt auf 0-100 UND auf das, was vom
   * 250er-Gesamtbudget nach Abzug der ANDEREN 3 Stats noch übrig ist — z.B.
   * bei Stärke 100 + Vitalität 80 (Summe 180 der anderen) bleiben für
   * Geschick nur noch 70, egal was eingetippt wird.
   */
  onInvestedPointChange(stat: InvestableStat, rawValue: string): void {
    const desired = Math.max(0, Math.min(100, Math.floor(Number(rawValue) || 0)));
    const otherSum = this.investableStats
      .filter((s) => s !== stat)
      .reduce((sum, s) => sum + this.investedPoints()[s], 0);
    const maxAllowed = Math.max(0, this.maxTotalInvestedPoints - otherSum);
    const clamped = Math.min(desired, maxAllowed);

    this.investedPoints.update((points) => ({ ...points, [stat]: clamped }));
    this.applyInvestedPoints();
  }

  /** Trimmt eine Investitions-Leiste von vorne nach hinten auf max. 250 Punkte Summe (für den Seed-Fall). */
  private clampToTotalBudget(points: Record<InvestableStat, number>): Record<InvestableStat, number> {
    const result = { ...points };
    let remaining = MAX_TOTAL_INVESTED_POINTS;
    for (const stat of this.investableStats) {
      const clamped = Math.max(0, Math.min(result[stat], remaining));
      result[stat] = clamped;
      remaining -= clamped;
    }
    return result;
  }

  /**
   * Schreibt die aktuelle Investitions-Leiste in den Sandbox-State: Attribut =
   * roher Basiswert + investierte Punkte, unlockedPassives = alle Passives
   * jedes Stats, deren Schwelle erreicht ist (rein aus investedPoints
   * abgeleitet — kein inkrementelles Event-Log nötig). Die eigentliche
   * Anwendung der Passive-Effekte (Flat/Prozent/Resistenz) übernimmt
   * unverändert SkillsService.statBreakdown → addPassiveEffects().
   */
  private applyInvestedPoints(): void {
    const inv = this.investedPoints();
    const unlockedPassives: string[] = [];
    for (const stat of this.investableStats) {
      for (const passive of this.passiveLoader.getPassivesForStat(stat)) {
        if (passive.threshold <= inv[stat]) unlockedPassives.push(passive.id);
      }
    }

    this.skillsService.state.update((s) => ({
      ...s,
      strength: this.rawBaseAttributes.strength + inv.strength,
      dexterity: this.rawBaseAttributes.dexterity + inv.dexterity,
      intelligence: this.rawBaseAttributes.intelligence + inv.intelligence,
      vitality: this.rawBaseAttributes.vitality + inv.vitality,
      investedPoints: { ...inv },
      unlockedPassives,
    }));
  }

  itemLabel(item: any): string {
    return `[T${item.tier}] ${item.name}`;
  }

  spellLabel(spell: SpellData): string {
    return `[T${spell.tier ?? '?'}] ${spell.name} (${spell.manaCost ?? 0} Mana)`;
  }

  /**
   * Katalog für einen Slot — für `weapon-2` (Nebenhand) auf 1H-Waffen gefiltert,
   * damit man eine 2H-Waffe im Picker gar nicht erst in die Nebenhand legen kann
   * (im echten Spiel landet eine 2H-Waffe immer nur in `weapon-1`, siehe
   * InventarService.resolveTargetSlot/enforceTwoHandedExclusivity).
   */
  catalogForSlot(slot: EquipSlotKey): any[] {
    const catalog = this.itemCatalogBySlot[slot];
    if (slot === 'weapon-2') {
      return catalog.filter((item) => String(item.hands) !== '2');
    }
    return catalog;
  }

  /** Aktuell im Slot ausgerüstetes Item als Katalog-Index (für die `[value]`-Bindung des Selects). */
  selectedItemIndex(slot: EquipSlotKey): string {
    const current = this.equippedSlots()[slot];
    if (!current) return '';
    const idx = this.catalogForSlot(slot).indexOf(current);
    return idx === -1 ? '' : String(idx);
  }

  onEquipChange(slot: EquipSlotKey, rawIndex: string): void {
    const item = rawIndex === '' ? null : this.catalogForSlot(slot)[Number(rawIndex)];

    if (slot === 'weapon-1' || slot === 'weapon-2') {
      this.applyWeaponSlot(slot, item);
      return;
    }
    this.inventarService.equippedSlots.update((slots) => ({ ...slots, [slot]: item }));
  }

  /**
   * Erzwingt die reale Waffen-Regel: entweder EINE 2H-Waffe (belegt beide Hände)
   * ODER bis zu ZWEI 1H-Waffen — nie beides gleichzeitig (siehe
   * InventarService.enforceTwoHandedExclusivity, hier fürs freie Fight-Tool-
   * Equip nachgebaut, da dort direkt am Signal vorbeigearbeitet wird).
   */
  private applyWeaponSlot(slot: 'weapon-1' | 'weapon-2', item: any | null): void {
    const otherSlot = slot === 'weapon-1' ? 'weapon-2' : 'weapon-1';
    const isTwoHanded = item != null && String(item.hands) === '2';

    this.inventarService.equippedSlots.update((slots) => {
      const next = { ...slots, [slot]: item };
      const other = next[otherSlot];

      if (isTwoHanded) {
        // 2H-Waffe belegt beide Hände — die andere Waffe muss weichen.
        next[otherSlot] = null;
      } else if (item != null && other && String(other.hands) === '2') {
        // 1H-Waffe wird angelegt, während die andere Hand eine 2H-Waffe hält —
        // die kann nicht gleichzeitig mit einer zweiten Waffe gehalten werden.
        next[otherSlot] = null;
      }
      return next;
    });
  }

  onSpellSlotChange(slotIndex: number, spellId: string): void {
    this.spellSlotIds.update((ids) => {
      const next = [...ids];
      next[slotIndex] = spellId === '' ? null : spellId;
      return next;
    });
    const s = this.spellSlotIds();
    this.skillsService.equippedSpells.set({
      spell_1: s[0], spell_2: s[1], spell_3: s[2], spell_4: s[3],
    });
  }

  addStep(): void {
    this.steps.update((s) => [...s, { monsterId: null }]);
  }

  removeStep(index: number): void {
    this.steps.update((s) => s.filter((_, i) => i !== index));
  }

  onStepMonsterChange(index: number, monsterId: string): void {
    this.steps.update((s) => {
      const next = [...s];
      next[index] = { monsterId: monsterId === '' ? null : monsterId };
      return next;
    });
  }

  runBatch(): void {
    this.configError.set(null);
    const stepConfigs = this.steps();

    if (stepConfigs.length === 0) {
      this.configError.set('Mindestens ein Step wird benötigt.');
      return;
    }
    const monsters = stepConfigs.map(
      (s) => this.allMonsters.find((m) => m.monster.id === s.monsterId)?.monster ?? null,
    );
    if (monsters.some((m) => !m)) {
      this.configError.set('Jeder Step braucht ein ausgewähltes Monster.');
      return;
    }

    const runCount = Math.max(1, Math.floor(this.numberOfRuns()));
    const playerStats = this.combatStats();
    const equippedSpells = this.equippedSpellObjects();
    const hasEquippedWeaponType = (weaponType: string) => this.skillsService.hasEquippedWeaponType(weaponType);
    const enrichMonsterSpells = (spells: any[]) => this.spellLoader.enrichSpells(spells);

    this.isRunning.set(true);
    const runResults: SimRunResult[] = [];
    for (let i = 0; i < runCount; i++) {
      runResults.push(
        simulateRun(playerStats, equippedSpells, monsters as any[], enrichMonsterSpells, hasEquippedWeaponType),
      );
    }

    this.results.set(this.aggregate(runResults, monsters as any[]));
    this.isRunning.set(false);
  }

  /** Für die Detail-Tabelle: wie viele leere Spalten braucht dieser Run, damit die Tabelle ausgerichtet bleibt. */
  placeholderColumns(run: SimRunResult, totalSteps: number): number[] {
    return Array.from({ length: Math.max(0, totalSteps - run.steps.length) }, (_, i) => i);
  }

  private aggregate(runResults: SimRunResult[], monsters: any[]): AggregatedResults {
    const runsWon = runResults.filter((r) => r.outcome === 'won').length;

    const deathDistribution: DeathAtStep[] = monsters.map((_, index) => ({
      stepIndex: index,
      died: runResults.filter((r) => r.outcome === 'died' && r.stoppedAtStepIndex === index).length,
      timedOut: runResults.filter((r) => r.outcome === 'timedOut' && r.stoppedAtStepIndex === index).length,
    }));

    const perStep: AggregatedStepStats[] = monsters.map((monster, index) => {
      const attempts: SimStepOutcome[] = [];
      for (const r of runResults) {
        const outcome = r.steps[index];
        if (outcome) attempts.push(outcome);
      }
      const wins = attempts.filter((a) => a.won).length;
      const avgRounds = attempts.length ? attempts.reduce((sum, a) => sum + a.rounds, 0) / attempts.length : 0;
      const avgHpLostPercent = attempts.length
        ? attempts.reduce((sum, a) => sum + a.playerHpLostPercent, 0) / attempts.length
        : 0;
      const timeouts = attempts.filter((a) => a.timedOut).length;

      return {
        monsterName: monster.name,
        attempts: attempts.length,
        wins,
        avgRounds,
        avgHpLostPercent,
        timeouts,
      };
    });

    return {
      totalRuns: runResults.length,
      runsWon,
      deathDistribution,
      perStep,
      sampleRuns: runResults.slice(0, MAX_SAMPLE_RUNS),
    };
  }
}

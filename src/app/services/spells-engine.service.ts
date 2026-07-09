import { Injectable, inject, Injector } from '@angular/core';
import { SkillsService, ELEMENT_DAMAGE_MULTIPLIER_KEYS } from './skills.service';
import { FightService } from './fight.service';
import { ResolveChallengeService } from './resolve-challenge.service';
import { rollBetween, applyResistanceMitigation } from '../utils/combat-roll.util';

/**
 * @service SpellsEngineService
 * @description Führt Spell-Effekte aus (Schaden, Heilung) — für Spieler UND
 * Monster. Kümmert sich um Mana-Check/-Abzug und die Boni aus den Stats.
 *
 * Der FightService wird über den Injector lazy geholt, um eine zirkuläre
 * DI-Abhängigkeit (FightService ↔ SpellsEngineService) zu vermeiden.
 */
@Injectable({
  providedIn: 'root',
})
export class SpellsEngineService {
  private skillsService = inject(SkillsService);
  private injector = inject(Injector);
  private resolveChallengeService = inject(ResolveChallengeService);

  /**
   * Wirkt einen Spell.
   *
   * Ablauf: 1. Waffentyp-Anforderung prüfen (nur Spieler) → 2. Mana prüfen/
   * abziehen (nur Spieler) → 3. Schadens-Boni aus den Stats ermitteln →
   * 4. Effekt anhand von effectType verarbeiten.
   *
   * Nur beim Spieler-Cast (casterType 'player') wird der Skill-Endwert
   * (Schaden oder Heilung) zusätzlich durch das Resolve-Minigame reskaliert
   * (siehe applyResolveChallenge). Monster-Casts sind davon unberührt.
   *
   * @param spell      Vollständiges Spell-Objekt (mit effectType!).
   * @param casterType Wer wirkt: 'player' (Default) oder 'monster'.
   * @returns true, wenn der Spell erfolgreich gewirkt wurde.
   */
  public async castSpell(spell: any, casterType: 'player' | 'monster' = 'player'): Promise<boolean> {
    console.log(`🔍 [SpellsEngine] castSpell aufgerufen von [${casterType}]. Inhalt von spell:`, spell);

    // Sicherheits-Check: Spell muss ein vollständiges Objekt sein
    if (!spell || typeof spell !== 'object' || !spell.effectType) {
      console.error(`❌ castSpell: Spell ist kein gültiges Objekt oder fehlt effectType.`, spell);
      return false;
    }

    const fightService = this.injector.get(FightService);
    const isCombat = fightService.activeFight() !== null;

    // --- 1. WAFFENTYP CHECK (nur Spieler) ---
    // Manche Skills sind an einen Waffentyp gebunden (z.B. Feuerzauber nur mit
    // 'magie'-Waffe, ein wuchtiger Schlag nur mit 'stumpf'). Wird bei jedem Cast
    // neu geprüft (nicht nur beim Ausrüsten), da die Waffe jederzeit gewechselt
    // werden kann, während der Skill im Slot bleibt.
    if (casterType === 'player' && spell.requiredWeaponType) {
      if (!this.skillsService.hasEquippedWeaponType(spell.requiredWeaponType)) {
        console.warn(
          `❌ "${spell.name}" benötigt eine Waffe vom Typ "${spell.requiredWeaponType}"!`,
        );
        return false;
      }
    }

    // --- 2. MANA CHECK & ABZUG ---
    if (casterType === 'player') {
      const currentMana = isCombat
        ? fightService.playerMana()
        : this.skillsService.combatStats().mana;

      if (currentMana < spell.manaCost) {
        console.warn(`❌ Nicht genug Mana für Spieler-Spell ${spell.name}!`);
        return false;
      }

      if (isCombat) {
        fightService.playerMana.update((mana) => Math.max(0, mana - spell.manaCost));
      } else {
        this.skillsService.state.update((s) => ({
          ...s,
          mana: Math.max(0, s.mana - spell.manaCost),
        }));
      }
    } else {
      console.log(`👹 Monster wirkt ${spell.name}.`);
    }

    // --- 3. SCHADENS-BONI BERECHNEN ---
    const playerStats = this.skillsService.combatStats();

    // ✅ Monster-Stats aus enrichedMonster holen (vollständiges Objekt, nicht activeFight)
    const enrichedMonster = fightService.getEnrichedMonster();
    const bonusAttack =
      casterType === 'player'
        ? rollBetween(playerStats.attackMin, playerStats.attackMax)
        : enrichedMonster?.attack || 10;
    const bonusMagic =
      casterType === 'player'
        ? rollBetween(playerStats.magicAttackMin, playerStats.magicAttackMax)
        : enrichedMonster?.magicAttack || 10;

    // --- 4. EFFEKT VERARBEITUNG ---
    switch (spell.effectType) {
      case 'PHYSICAL_DAMAGE': {
        let totalDamage = Number(spell.effectValues.value) + bonusAttack;
        if (casterType === 'player') {
          // Physischer Schadens-Multiplikator aus Stärke (siehe SkillsService.
          // applyAttributeScaling) wirkt auf (Waffen-Wurf + Skill-Wert), NICHT
          // auf die Waffen-Range selbst. Rüstungs-Mitigation passiert danach
          // zentral in applyDamageToMonster (damageType 'physical', Default).
          totalDamage = Math.round(totalDamage * (playerStats.physicalDamageMultiplier ?? 1));
          totalDamage = await this.applyResolveChallenge(spell, totalDamage);
          fightService.applyDamageToMonster(totalDamage, 'physical');
        } else {
          fightService.applyDamageToPlayer(totalDamage, 'physical');
        }
        break;
      }

      // ELEMENTAL_DAMAGE-Formel (Spieler-Cast), Schritt für Schritt — jede Quelle,
      // die Elementarschaden (fire/cold/lightning/chaos) beeinflusst, taucht HIER
      // auf, nirgendwo sonst:
      //   1. spell.effectValues.value       – der reine Basiswert des Spells (JSON).
      //   2. + bonusMagic                    – generischer Magie-Pool, gewürfelt aus
      //      playerStats.magicAttackMin/Max. Speist sich aus: Basis-`magicAttack`
      //      (State, ~5) + jedem flachen `magic-attack`-Stat auf JEDEM Ausrüstungs-
      //      slot (Ringe/Rüstung/Waffe, additiv, siehe SkillsService.addWeaponRangeStats)
      //      + Passive-Effekte auf 'magicAttack' (flat UND percent, siehe
      //      SkillsService.addPassiveEffects). Gilt für JEDES Element gleichermaßen.
      //   3. + elementBonus                  – NUR wenn eine ausgerüstete "magie"-
      //      Waffe (weapon-1/weapon-2) ihr `magic-damage-type` exakt auf DIESES
      //      Element gesetzt hat (siehe magic-damage-type in den Waffen-JSONs unter
      //      public/item-data/weapons/). Gewürfelt aus
      //      playerStats.magicAttackByElement[element].min/max, die sich additiv aus
      //      `magic-damage-min/max` der passenden Waffe(n) speisen (skaliert per
      //      Waffen-Quality, siehe weapon-quality.util.ts applyQualityScaling) +
      //      Passive-Percent-Effekte auf 'magicAttack' (NICHT die Flat-Variante,
      //      siehe SkillsService.addPassiveEffects). Eine Feuer-Waffe liefert also
      //      NUR bei Feuer-Spells diesen dritten Summanden; bei einem Cold-Spell mit
      //      derselben Waffe ist elementBonus = 0, es bleibt bei Basiswert + bonusMagic.
      //   4. * magicDamageMultiplier         – 1 + GESAMT-Intelligenz/1000 (Basis +
      //      Schrein-Investition + Ausrüstung, siehe applyAttributeScaling), wirkt auf
      //      die volle Summe aus 1-3. Gilt für JEDES Element gleichermaßen.
      //   4b. * elementDamageMultiplier      – 1 + <Element>-Flat-Stat/1000, exakt
      //      dieselbe Formel wie magicDamageMultiplier, aber NUR aus dem elementeigenen
      //      Item-/Passive-Stat: `magic-damage-fire/cold/lightning` bzw. für Chaos der
      //      bestehende `chaosDamage`-Stat (SkillsService.applyAttributeScaling,
      //      ELEMENT_DAMAGE_STAT_KEYS/-MULTIPLIER_KEYS). Ein Feuer-Ring erhöht so NUR
      //      Feuer-Endschaden, nie Cold/Lightning/Chaos. Multiplikation ist kommutativ,
      //      die Reihenfolge zu magicDamageMultiplier spielt daher keine Rolle — beide
      //      werden in EINEM Schritt zusammen angewendet (siehe unten).
      //   5. Ziel-Mitigation                 – applyResistanceMitigation() in
      //      combat-roll.util.ts: 1 Punkt `resistances[element]` DES ZIELS = 1%
      //      Schadensminderung, gedeckelt bei MAX_MITIGATION_PERCENT (75%). Läuft
      //      NUR gegen das Element des Spells, nicht gegen andere Resistenzen.
      //   6. Resolve-Minigame (nur Spieler)  – applyResolveChallenge() reskaliert das
      //      Ergebnis auf (Endwert / resolvePoints) * korrekt getroffene Punkte.
      // Rüstung (applyArmorMitigation) greift hier NICHT — die gibt es nur bei
      // damageType 'physical' in FightService.applyDamageToMonster/-Player.
      case 'ELEMENTAL_DAMAGE': {
        const element = spell.effectValues.element;
        const elementRange = casterType === 'player' ? playerStats.magicAttackByElement?.[element] : null;
        const elementBonus = elementRange ? rollBetween(elementRange.min, elementRange.max) : 0;
        let totalDamage = Number(spell.effectValues.value) + bonusMagic + elementBonus;
        console.log(`💥 ${element}-Schaden abgefeuert von [${casterType}]: ${totalDamage}`);
        if (casterType === 'player') {
          // Magischer Schadens-Multiplikator (Intelligenz) UND Element-Multiplikator
          // (elementeigener Flat-Stat) wirken beide auf dieselbe Summe — siehe
          // Formel-Doku oben, Schritt 4/4b.
          const elementMultiplierKey = ELEMENT_DAMAGE_MULTIPLIER_KEYS[element as keyof typeof ELEMENT_DAMAGE_MULTIPLIER_KEYS];
          const elementDamageMultiplier = playerStats[elementMultiplierKey] ?? 1;
          totalDamage = Math.round(
            totalDamage * (playerStats.magicDamageMultiplier ?? 1) * elementDamageMultiplier,
          );
          // Element-Resistenz des ZIELS mindert den Schaden (1 Punkt = 1%,
          // gedeckelt bei 75%) — muss HIER passieren, da nur die Engine das
          // konkrete Element kennt. FightService bekommt danach 'elemental'
          // übergeben, damit die Rüstungs-Mitigation dort nicht nochmal greift.
          const defenderResistance = enrichedMonster?.resistances?.[element] ?? 0;
          totalDamage = applyResistanceMitigation(totalDamage, defenderResistance);
          totalDamage = await this.applyResolveChallenge(spell, totalDamage);
          fightService.applyDamageToMonster(totalDamage, 'elemental');
        } else {
          const defenderResistance = playerStats.resistances?.[element] ?? 0;
          totalDamage = applyResistanceMitigation(totalDamage, defenderResistance);
          fightService.applyDamageToPlayer(totalDamage, 'elemental');
        }
        break;
      }

      case 'HEAL': {
        let healAmount = Number(spell.effectValues.value);
        if (casterType === 'player') {
          healAmount = await this.applyResolveChallenge(spell, healAmount);
          fightService.playerHp.update((hp) =>
            Math.min(fightService.playerMaxHp(), hp + healAmount),
          );
        } else {
          fightService.monsterHp.update((hp) =>
            Math.min(fightService.monsterMaxHp(), hp + healAmount),
          );
        }
        break;
      }

      default:
        console.error(`⚠️ Unbekannter Effekt-Typ in Engine: ${spell.effectType}`);
        return false;
    }

    return true;
  }

  /**
   * Reskaliert den Skill-Endwert (Schaden/Heilung) anhand des Resolve-
   * Minigames: (Endwert / resolvePoints) * korrekt verbundene Punkte.
   * Nur für Spieler-Casts aufgerufen — Monster sind von der Resolve-
   * Mechanik nicht betroffen.
   */
  private async applyResolveChallenge(spell: any, finalValue: number): Promise<number> {
    const resolvePoints = Number(spell.resolvePoints) || 3;
    const correctCount = await this.resolveChallengeService.start(resolvePoints);
    return Math.round((finalValue / resolvePoints) * correctCount);
  }
}
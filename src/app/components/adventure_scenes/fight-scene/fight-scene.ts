import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FightService } from '../../../services/fight.service';
import { SkillsService } from '../../../services/skills.service';
import { ProfileService } from '../../../services/profile.service';
import { AnimationObject } from '../../shared/animation-object/animation-object';


/**
 * @component FightScene
 * @description Steuert die UI der Kampfszene. Delegiert die Berechnungen an den FightService.
 *
 * Beim ERSTEN Betreten dieses Kampfes (also wenn noch kein activeFight im Save liegt)
 * läuft zuerst das Monster-Intro aus dem Monster-JSON ab. Erst danach erscheint die
 * Kampf-UI. Bei einem Resume (Page-Reload mitten im Kampf) wird das Intro übersprungen.
 */
@Component({
  selector: 'app-fight-scene',
  standalone: true,
  imports: [CommonModule, AnimationObject],
  templateUrl: './fight-scene.html',
  styleUrl: './fight-scene.scss',
})
export class FightScene implements OnInit {
  // --- Services ---
  fightService = inject(FightService);
  skillsService = inject(SkillsService);
  profileService = inject(ProfileService);

  // --- UI Bindings direkt aus dem Service gelinkt ---
  monsterName = this.fightService.monsterName;
  monsterHp = this.fightService.monsterHp;
  monsterMaxHp = this.fightService.monsterMaxHp;

  round = this.fightService.round;
  currentTurn = this.fightService.currentTurn;

  playerName = this.profileService.name;
  playerLevel = this.profileService.level;
  playerHp = this.fightService.playerHp;
  playerMaxHp = this.fightService.playerMaxHp;
  playerMana = this.fightService.playerMana;
  playerMaxMana = this.fightService.playerMaxMana;

  playerEquippedSpells = this.skillsService.equippedSpells;

  // --- Lokaler UI-State für die Monster-Intro-Animation ---
  public showMonsterIntro = signal<boolean>(false);
  public monsterIntroPaths = signal<string[]>([]);
  public monsterIntroDuration = signal<number>(2500);

  ngOnInit(): void {
    console.log('🔥 FightScene ngOnInit feuert!');

    // Erkennt einen frischen Kampf-Start: BEVOR initializeFight() den activeFight setzt
    // ist er noch null. Bei einem Resume ist er bereits aus dem Save befüllt.
    const isNewFight = this.fightService.activeFight() === null;

    this.fightService.initializeFight();

    if (isNewFight) {
      const monster = this.fightService.getEnrichedMonster();
      // JSON-Felder kommen in kebab-case ('intro-duration', 'intro-path')
      const duration = monster?.['intro-duration'] ?? 2500;
      const paths = monster?.['intro-path'] ?? [];

      if (Array.isArray(paths) && paths.length > 0) {
        this.monsterIntroPaths.set(paths);
        this.monsterIntroDuration.set(duration);
        this.showMonsterIntro.set(true);

        console.log(`🐉 Monster-Intro startet (${duration}ms, ${paths.length} Frames)`);

        setTimeout(() => {
          this.showMonsterIntro.set(false);
          console.log('🐉 Monster-Intro beendet, Kampf-UI wird angezeigt');
        }, duration);
      } else {
        console.log('ℹ️ Monster hat kein Intro hinterlegt, springe direkt in die Kampf-UI');
      }
    }

    console.log('✅ Kampf bereit, enrichedMonster gesetzt');
  }

  // --- UI Interaktionen (leiten an den Service weiter) ---

  onPlayerAttack(): void {
    this.fightService.executePlayerAttack();
  }

  onCastSpell(spellId: string): void {
    this.fightService.executeCastSpell(spellId);
  }

  hasEnoughMana(spellId: string): boolean {
    return this.fightService.hasEnoughMana(spellId);
  }

  getSpellName(spellId: string): string {
    return this.fightService.getSpellName(spellId);
  }
}
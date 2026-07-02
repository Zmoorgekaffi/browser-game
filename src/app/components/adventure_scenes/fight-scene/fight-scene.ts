import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FightService } from '../../../services/fight.service';
import { SkillsService } from '../../../services/skills.service';
import { ProfileService } from '../../../services/profile.service';
import { AdventureStateService } from '../../../services/adventure-state.service';
import { AnimationObject } from '../../shared/animation-object/animation-object';
import { LoadingScreen } from '../../shared/loading-screen/loading-screen';
import { AssetPreloaderService } from '../../../services/asset-preloader.service';
import { CharacterFrame } from '../../../classes/adventure/encounter.interface';

/**
 * @component FightScene
 * @description Steuert die UI der Kampfszene. Delegiert die Berechnungen an den FightService.
 *
 * WICHTIG: Wir nutzen effect() statt ngOnInit als "Init-Trigger". Grund:
 * Bei fight→fight navigiert der Angular-Router auf dieselbe URL
 * (/adventure/fight → /adventure/fight) und feuert kein ngOnInit neu.
 * Der effect reagiert dagegen auf currentStepIndex und kann so den
 * nächsten Kampf sauber neu aufsetzen.
 */
@Component({
  selector: 'app-fight-scene',
  standalone: true,
  imports: [CommonModule, AnimationObject, LoadingScreen],
  templateUrl: './fight-scene.html',
  styleUrl: './fight-scene.scss',
})
export class FightScene {
  // --- Services ---
  fightService = inject(FightService);
  skillsService = inject(SkillsService);
  profileService = inject(ProfileService);
  private adventureStateService = inject(AdventureStateService);
  private preloader = inject(AssetPreloaderService);

  // 🆕 Hintergrund-Pfad als Property, damit Template UND Preloader
  // denselben String verwenden (vorher stand er nur hart im Template).
  public readonly fightBackgroundPath =
    'imgs/areas/dark-forest/fight/background/dark-forest-fight-background.png';

  // --- 🆕 Preloading: solange true zeigt das Template nur den Ladebildschirm ---
  public isLoading = signal<boolean>(true);

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

  // --- Monster-Idle-Animation (läuft während des Kampfes in Endlos-Loop) ---
  public monsterIdlePaths = signal<string[]>([]);
  public monsterIdleDuration = signal<number>(2500);

  // 🆕 Größe & Position der Monster-Idle-Animation (pro Monster über
  // "monster-frame" in der Monster-JSON steuerbar). Intro bleibt weiterhin
  // vollflächig, nur die Idle-Box wird individuell platziert.
  public monsterFrame = signal<CharacterFrame>({
    top: '280px',
    left: '540px',
    width: '180px',
    height: '260px',
  });

  // Guard damit wir einen Step-Index nicht doppelt initialisieren
  private lastInitializedStep: number = -1;

  constructor() {
    effect(() => {
      const idx = this.adventureStateService.currentStepIndex();
      const step = this.adventureStateService.steps()[idx];

      if (!step || step.type !== 'fight') return;
      if (idx === this.lastInitializedStep) return;

      console.log(`🔥 FightScene setup für Step-Index ${idx}`);
      this.lastInitializedStep = idx;
      this.setupFight();
    });
  }

  /**
   * Setzt den Kampf auf: initFight im Service + Intro-Animation abspielen.
   * Wird sowohl beim initialen Mount als auch bei fight→fight Wechsel
   * ausgelöst (siehe effect() im constructor).
   */
  private async setupFight(): Promise<void> {
    // BEVOR initializeFight() den activeFight setzt ist er noch null.
    // Bei einem Resume ist er bereits aus dem Save befüllt.
    const isNewFight = this.fightService.activeFight() === null;

    this.fightService.initializeFight();

    const monster = this.fightService.getEnrichedMonster();

    // 🆕 ALLE Kampf-Bilder (Hintergrund, Monster-Intro, Monster-Idle)
    // VOR dem Szenenstart laden — solange läuft der Ladebildschirm.
    // Erst danach starten Intro-Timer und Animationen, damit auf dem
    // Webserver kein Frame mehr mitten in der Animation nachgeladen wird.
    this.isLoading.set(true);
    await this.preloader.preloadImages([
      this.fightBackgroundPath,
      ...(monster?.['intro-path'] ?? []),
      ...(monster?.['idle-path'] ?? []),
    ]);
    this.isLoading.set(false);

    // Idle-Animation IMMER setzen (auch bei Resume)
    const idleDuration = monster?.['idle-duration'] ?? 2500;
    const idlePaths = monster?.['idle-path'] ?? [];
    if (Array.isArray(idlePaths) && idlePaths.length > 0) {
      this.monsterIdlePaths.set(idlePaths);
      this.monsterIdleDuration.set(idleDuration);
      console.log(`💤 Monster-Idle bereit (${idleDuration}ms, ${idlePaths.length} Frames)`);
    } else {
      this.monsterIdlePaths.set([]);
      console.log('ℹ️ Monster hat keine Idle-Animation hinterlegt');
    }

    // 🆕 Monster-Frame (Position/Größe der Idle-Animation) aus der Monster-JSON
    // übernehmen. Fällt zurück auf den alten Hardcoded-Wert, wenn das Feld
    // (noch) nicht in der JSON steht — so bleiben bestehende Monster-Definitionen
    // vollständig funktionsfähig.
    const mFrame = monster?.['monster-frame'] as CharacterFrame | undefined;
    this.monsterFrame.set(
      mFrame ?? { top: '280px', left: '540px', width: '180px', height: '260px' }
    );

    // Intro NUR bei einem frischen Kampfstart abspielen.
    if (isNewFight) {
      const introDuration = monster?.['intro-duration'] ?? 2500;
      const introPaths = monster?.['intro-path'] ?? [];

      if (Array.isArray(introPaths) && introPaths.length > 0) {
        this.monsterIntroPaths.set(introPaths);
        this.monsterIntroDuration.set(introDuration);
        this.showMonsterIntro.set(true);

        console.log(`🐉 Monster-Intro startet (${introDuration}ms, ${introPaths.length} Frames)`);

        setTimeout(() => {
          this.showMonsterIntro.set(false);
          console.log('🐉 Monster-Intro beendet, Kampf-UI wird angezeigt');
        }, introDuration);
      } else {
        this.showMonsterIntro.set(false);
        console.log('ℹ️ Monster hat kein Intro hinterlegt, springe direkt in die Kampf-UI');
      }
    } else {
      this.showMonsterIntro.set(false);
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
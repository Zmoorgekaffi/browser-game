import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimationObject } from '../../shared/animation-object/animation-object';
import { GameStateService } from '../../../services/game-state.service';
import { CharacterFrame } from '../../../classes/adventure/encounter.interface';

type DialogPhase = 'intro' | 'dialog' | 'reaction';

/**
 * @component DialogScene
 * @description Steuert eine Dialog-Begegnung (z.B. Waldelfe).
 *
 * Phasen:
 *   1. intro    — Intro-Animation der Begegnung läuft (nur beim frischen Start)
 *   2. dialog   — Character in idle-Loop, Multi-Step-Text-Box, dann 3 Antworten
 *   3. reaction — nach Antwort-Klick: (evtl. reaction-)Animation, Response-Text,
 *                 Belohnung wird verrechnet, „Weiterziehen" → nächster Step
 *
 * 🆕 Zusätzlich läuft im Hintergrund ein eigenes app-animation-object mit
 * dem `background` aus der Encounter (Loop=true), unabhängig vom Character.
 *
 * Wie bei FightScene läuft der Setup NICHT über ngOnInit sondern über einen
 * effect() auf currentStepIndex, damit auch dialog→dialog Übergänge sauber
 * die neue Encounter laden (same-URL Navigation).
 */
@Component({
  selector: 'app-dialog-scene',
  standalone: true,
  imports: [CommonModule, AnimationObject],
  templateUrl: './dialog-scene.html',
  styleUrl: './dialog-scene.scss',
})
export class DialogScene {
  private gameStateService = inject(GameStateService);

  // --- Encounter-Daten ---
  public encounter = signal<any | null>(null);

  // --- Phase-State ---
  public phase = signal<DialogPhase>('intro');

  // --- Multi-Text ---
  public currentTextIndex = signal<number>(0);
  public isLastText = computed(() => {
    const enc = this.encounter();
    if (!enc) return false;
    return this.currentTextIndex() >= enc.texts.length - 1;
  });

  // --- Reaktion ---
  public selectedAnswer = signal<any | null>(null);
  public rewardMessage = signal<string>('');

  // --- Character-Animation (wird je nach Phase umgesetzt) ---
  public currentAnimationPaths = signal<string[]>([]);
  public currentAnimationDuration = signal<number>(2500);
  public animationLoop = signal<boolean>(false);

  // --- 🆕 Background-Animation (statischer Pfad, läuft konstant durch) ---
  public backgroundPaths = signal<string[]>([]);

  // --- 🆕 Intro-Animation (eigenes app-animation-object, nur während phase()==='intro' sichtbar) ---
  public introPaths = signal<string[]>([]);
  public introDuration = signal<number>(2500);

  // --- 🆕 Größe & Position der Character-Animation (pro Encounter) ---
  public characterFrame = signal<CharacterFrame>({
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
  });

  // Guard gegen doppelte Init für denselben Step-Index
  private lastInitializedStep: number = -1;

  constructor() {
    effect(() => {
      const adventure = this.gameStateService.adventureStateService;
      const idx = adventure.currentStepIndex();
      const step = adventure.steps()[idx];

      if (!step || step.type !== 'dialog') return;
      if (idx === this.lastInitializedStep) return;

      console.log(`💬 DialogScene setup für Step-Index ${idx}`);
      this.lastInitializedStep = idx;
      this.setupDialog(step);
    });
  }

  private setupDialog(step: any): void {
    const enc = step.encounter;
    if (!enc) {
      console.error('💬 DialogScene: Step hat keine encounter!', step);
      return;
    }

    // Fresh state
    this.encounter.set(enc);
    this.currentTextIndex.set(0);
    this.selectedAnswer.set(null);
    this.rewardMessage.set('');

    // 🆕 Background setzen (läuft die ganze Begegnung über durch, egal welche Phase)
    this.backgroundPaths.set(enc['scene-background'] ? [enc['scene-background']] : []);

    // 🆕 Character-Box-Größe/-Position setzen (Fallback = alte Vollflächen-Optik)
    this.characterFrame.set(
      enc.characterFrame ?? { top: '0', left: '0', width: '100%', height: '100%' }
    );

    // 🆕 Intro-Animation-Signals setzen. Das eigenständige Intro-
    // app-animation-object im Template ist NUR während phase()==='intro'
    // sichtbar (vollflächig) — danach übernimmt das reguläre Character-
    // Object (idle/reaction) in der characterFrame-Box.
    this.introPaths.set(enc.intro?.paths ?? []);
    this.introDuration.set(enc.intro?.duration ?? 2500);

    // Phase 1: Intro läuft (eigenes Intro-Object rendert die Animation).
    // Das Character-Object ist während dieser Phase im Template ausgeblendet,
    // deshalb setzen wir seinen Zustand hier direkt schon auf idle — sobald
    // die Intro-Phase endet, ist der Character sofort im richtigen Loop.
    this.phase.set('intro');
    this.setAnimation(enc.idle, true);

    setTimeout(() => {
      // Phase 2: Intro-Object ausblenden, Character-Object übernimmt (bereits im idle-Loop)
      this.phase.set('dialog');
    }, enc.intro.duration);
  }

  // -----------------------------------------------------------------------
  // Text-Navigation
  // -----------------------------------------------------------------------

  public nextText(): void {
    const enc = this.encounter();
    if (!enc) return;
    if (this.currentTextIndex() < enc.texts.length - 1) {
      this.currentTextIndex.update((i) => i + 1);
    }
  }

  // -----------------------------------------------------------------------
  // Antwort-Auswahl + Reaction
  // -----------------------------------------------------------------------

  public selectAnswer(answer: any): void {
    this.selectedAnswer.set(answer);
    this.phase.set('reaction');

    const enc = this.encounter();

    // Reaktions-Animation: jede Antwort hat idealerweise ihre eigene
    // (siehe encounter.interface.ts), sonst Fallback auf default speak.
    const reactionAnim = answer.reactionAnimation ?? enc.speak;
    this.setAnimation(reactionAnim, false);

    // Belohnung verrechnen
    this.applyReward(answer);

    // Nach der Reaktion zurück in idle-Loop (Character redet nicht mehr)
    setTimeout(() => {
      this.setAnimation(enc.idle, true);
    }, reactionAnim.duration);
  }

  private applyReward(answer: any): void {
    const adventure = this.gameStateService.adventureStateService;
    const area = adventure.level();
    if (!area) return;

    switch (answer.reactionType) {
      case 'gold': {
        const gold = area.rollGoldReward();
        this.gameStateService.wallet.addGold(gold);
        this.rewardMessage.set(`+${gold} Gold`);
        console.log(`💰 Dialog reward: ${gold} gold`);
        break;
      }
      case 'item': {
        const item = area.rollLoot();
        if (item) {
          adventure.addReward(item);
          this.rewardMessage.set(`Erhalten: ${item.name}`);
          console.log(`🎁 Dialog reward: item ${item.name}`);
        } else {
          this.rewardMessage.set('');
          console.warn('💬 Dialog item reward: rollLoot() gab null zurück.');
        }
        break;
      }
      case 'nothing':
      default:
        this.rewardMessage.set('');
        break;
    }
  }

  // -----------------------------------------------------------------------
  // Weiterziehen zum nächsten Step
  // -----------------------------------------------------------------------

  public continueToNextStep(): void {
    const adventure = this.gameStateService.adventureStateService;
    adventure.currentStepIndex.update((idx) => idx + 1);
    adventure.saveAdventure();
    adventure.continueAdventure();
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private setAnimation(anim: { paths: string[]; duration: number }, loop: boolean): void {
    this.currentAnimationPaths.set(anim.paths ?? []);
    this.currentAnimationDuration.set(anim.duration ?? 2000);
    this.animationLoop.set(loop);
  }
}
import { Component, ElementRef, Signal, computed, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { GameStateService } from '../../../services/game-state.service';
import { PassiveLoaderService } from '../../../services/passive-loader.service';
import { InvestableStat, PassiveData } from '../../../models/passive.interface';

/** Investitions-Schwellen, an denen jeweils ein Segment der Leiste endet. */
const THRESHOLDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

/**
 * @component LevelUpPanel
 * @description Shrine-Levelup-UI: pro Grundstat eine in 10 Segmente
 * unterteilte 100-Punkte-Leiste. Jedes volle Segment (10 investierte Punkte)
 * schaltet ein Passive frei (siehe passives.json). Hover über ein Segment
 * zeigt das zugehörige Passive (freigeschaltet oder noch gesperrt) an.
 *
 * Zustand (show) lebt in LevelUpService, Punkte/Passives in SkillsService —
 * Ein-/Ausblenden läuft über GSAP, exakt nach dem Muster von ItemInfoCard.
 */
@Component({
  selector: 'app-level-up-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './level-up-panel.html',
  styleUrl: './level-up-panel.scss',
})
export class LevelUpPanel {
  public gameStateService = inject(GameStateService);
  private passiveLoader = inject(PassiveLoaderService);
  private el = inject(ElementRef);

  //für hover tooltip wichtig
  mouseX = 0;
  mouseY = 0;

  public readonly thresholds = THRESHOLDS;

  public readonly statList: { key: InvestableStat; name: string }[] = [
    { key: 'strength', name: 'Stärke' },
    { key: 'dexterity', name: 'Geschick' },
    { key: 'intelligence', name: 'Intelligenz' },
    { key: 'vitality', name: 'Vitalität' },
  ];

  public show: Signal<boolean> = this.gameStateService.levelUpPanel.show;
  public baseStats = this.gameStateService.skills.state;
  public statPoints = this.gameStateService.skills.statPoints;
  public investedPoints = this.gameStateService.skills.investedPoints;
  public unlockedPassives = this.gameStateService.skills.unlockedPassives;

  /** Aktuell gehovertes Segment (stat + Schwelle), für Tooltip + Highlight. */
  public hovered = signal<{ stat: InvestableStat; threshold: number } | null>(null);

  public hoveredPassive: Signal<PassiveData | null> = computed(() => {
    const target = this.hovered();
    if (!target) return null;
    return this.passiveLoader.getPassiveByStatAndThreshold(target.stat, target.threshold);
  });

  constructor() {
    effect(() => {
      if (this.show()) {
        requestAnimationFrame(() => this.animateIn());
      }
    });
  }

  private animateIn(): void {
    const target = this.el.nativeElement.querySelector('.panel-container');
    if (!target) return;

    gsap.killTweensOf(target);
    gsap.fromTo(
      target,
      { opacity: 0, y: 40, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.3 },
    );
  }

  public close(): void {
    const target = this.el.nativeElement.querySelector('.panel-container');

    if (target) {
      gsap.killTweensOf(target);
      gsap.to(target, {
        opacity: 0,
        y: 30,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => this.gameStateService.levelUpPanel.close(),
      });
    } else {
      this.gameStateService.levelUpPanel.close();
    }
  }

  /** Füllstand (0-100%) eines einzelnen 10er-Segments für die Leisten-Anzeige. */
  public segmentFill(stat: InvestableStat, threshold: number): number {
    const invested = this.investedPoints()[stat] ?? 0;
    const filledInSegment = Math.min(Math.max(invested - (threshold - 10), 0), 10);
    return (filledInSegment / 10) * 100;
  }

  public isUnlocked(passiveId: string): boolean {
    return this.unlockedPassives().includes(passiveId);
  }

  public canInvest(stat: InvestableStat): boolean {
    return this.statPoints() > 0 && (this.investedPoints()[stat] ?? 0) < 100;
  }

  public invest(stat: InvestableStat): void {
    this.gameStateService.skills.investStatPoint(stat);
  }

  public setHovered(stat: InvestableStat, threshold: number): void {
    this.hovered.set({ stat, threshold });
  }

  public clearHovered(): void {
    this.hovered.set(null);
  }

public onMouseMove(event: MouseEvent): void {
  const rect = this.el.nativeElement
    .querySelector('.panel-container')
    .getBoundingClientRect();

  this.mouseX = event.clientX - rect.left;
  this.mouseY = -50
  console.log(this.mouseX, this.mouseY);
  
}
}

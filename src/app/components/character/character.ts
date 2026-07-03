import { Component, ElementRef, inject, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';
import { RouterLink } from '@angular/router';
import { AnimationObject } from '../shared/animation-object/animation-object';
import { framePaths } from '../../utils/frame-paths.util';

/**
 * @component Character
 * @description Charakter-Bildschirm: zeigt Profildaten, die animierte
 * Spielfigur und alle Kampfwerte (Basis + Ausrüstung) als Liste.
 */
@Component({
  selector: 'app-character',
  standalone: true,
  imports: [CommonModule, RouterLink, AnimationObject],
  templateUrl: './character.html',
  styleUrl: './character.scss',
})
export class Character {
  public gameStateService = inject(GameStateService);
  private el = inject(ElementRef);

  public name = this.gameStateService.profile.name;
  public level = this.gameStateService.profile.level;
  public exp = this.gameStateService.profile.exp;

  public combatStats: Signal<any> = this.gameStateService.skills.combatStats;
  public baseStats = this.gameStateService.skills.state;
  /** Herkunfts-Aufschlüsselung (Basis/Ausrüstung/Hauptstats/Passives) für den Hover-Tooltip. */
  public statBreakdown = this.gameStateService.skills.statBreakdown;

  /** Stat-Key der aktuell gehoverten Zeile, oder null (kein Tooltip). */
  public hoveredStat = signal<string | null>(null);
  public tooltipX = 0;
  public tooltipY = 0;

  /** Position des Tooltips relativ zur Stat-Liste, folgt der Maus. */
  public onMouseMove(event: MouseEvent): void {
    const rect = this.el.nativeElement.querySelector('#statList')?.getBoundingClientRect();
    if (!rect) return;
    this.tooltipX = event.clientX - rect.left + 16;
    this.tooltipY = event.clientY - rect.top + 16;
  }

  /** Deutsches Label zu einem Stat-Key (für den Tooltip-Titel). */
  public getStatName(key: string): string {
    return this.displayStats.find((stat) => stat.key === key)?.name ?? key;
  }

  /**
   * Look-Around-Animation: frame (1).png ... frame (14).png,
   * danach nochmal frame (1).png für einen sauberen Loop-Übergang.
   */
  characterLookAraoundAnimation = [
    ...framePaths(14, (i) => `imgs/character/character-look-around/frame (${i}).png`, 1),
    'imgs/character/character-look-around/frame (1).png',
  ];

  /** Anzeige-Reihenfolge + deutsche Labels für die Stats-Liste im Template. */
  public displayStats = [
    { key: 'strength', name: 'Stärke' },
    { key: 'intelligence', name: 'Intelligenz' },
    { key: 'dexterity', name: 'Geschick' },
    { key: 'vitality', name: 'Vitalität' },
    { key: 'luck', name: 'Glück' },
    { key: 'hp', name: 'Lebenspunkte (HP)' },
    { key: 'mana', name: 'Mana' },
    { key: 'attack', name: 'Physischer Angriff' },
    { key: 'magicAttack', name: 'Magischer Angriff' },
    { key: 'armor', name: 'Rüstung' },
    { key: 'energy-shield', name: 'Energieschild' },
    { key: 'initiative', name: 'Initiative' },
    { key: 'evasion', name: 'Ausweichen' },
    { key: 'critChance', name: 'Krit. Chance' },
    { key: 'critDamage', name: 'Krit. Schaden' },
    { key: 'magic-find', name: 'Magic Find' },
  ];
}

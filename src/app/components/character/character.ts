import { Component, ElementRef, inject, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';
import { ScreenSizingService } from '../../services/screen-sizing.service';
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
  private screenSizingService = inject(ScreenSizingService);
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

  /**
   * Tooltip-Position folgt der Maus, ~100 echte Bildschirm-Pixel oberhalb
   * des Cursors.
   *
   * WICHTIG, zwei Effekte überlagern sich hier:
   *  1. `position: fixed` träfe hier NICHT den echten Browser-Viewport — die
   *     App legt ihre Szenen in einen Wrapper mit `transform: scale(...)`
   *     (siehe main-frontend.html), und jeder transformierte Vorfahre
   *     definiert für `fixed`-Nachfahren einen neuen Containing Block.
   *     Lösung: `position: absolute` relativ zu #characterRoot, Offset via
   *     dessen eigenem getBoundingClientRect() (liefert immer die
   *     tatsächliche Bildschirmposition, unabhängig von der Transform-Kette).
   *  2. Dieser Wrapper wird im Vollbild-Modus zusätzlich per
   *     ScreenSizingService.scale() NICHT-1 skaliert (Desktop: scale(1),
   *     Vollbild: an Fenstergröße angepasst). Ein Offset in echten
   *     Bildschirm-Pixeln muss deshalb durch den Skalierungsfaktor geteilt
   *     werden, um im LOKALEN (vor-Skalierung) CSS-Pixel-Raum von
   *     #characterRoot korrekt anzukommen — sonst stimmt die Position nur im
   *     Desktop-Modus (scale=1), im Vollbild aber nicht mehr.
   */
  public onMouseMove(event: MouseEvent): void {
    const rect = this.el.nativeElement.querySelector('#characterRoot')?.getBoundingClientRect();
    if (!rect) return;
    const scale = this.screenSizingService.scale() || 1;
    this.tooltipX = (event.clientX - rect.left) / scale;
    this.tooltipY = (event.clientY - rect.top - 100) / scale;
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

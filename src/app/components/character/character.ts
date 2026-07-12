import { Component, ElementRef, inject, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';
import { ScreenSizingService } from '../../services/screen-sizing.service';
import { DeviceService } from '../../services/device.service';
import { RouterLink } from '@angular/router';
import { AnimationObject } from '../shared/animation-object/animation-object';
import { framePaths } from '../../utils/frame-paths.util';
import { getStatColor } from '../../utils/stat-color.util';

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
  public deviceService = inject(DeviceService);
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

  /** Hover-Tooltip nur auf Desktop. Auf Touch-Geräten gibt es kein echtes
   * Hover, ein Tap löst sonst über synthetische Mouse-Events denselben
   * Tooltip aus, der dann ohne mouseleave hängen bleiben würde. */
  public onStatEnter(key: string): void {
    if (this.deviceService.isTouch()) return;
    this.hoveredStat.set(key);
  }

  public onStatLeave(): void {
    if (this.deviceService.isTouch()) return;
    this.hoveredStat.set(null);
  }

  /** Auf Touch-Geräten ersetzt Tap-Toggle den Hover: erneutes Antippen
   * derselben Zeile blendet den Tooltip wieder aus. Position wird aus dem
   * Click-Event berechnet, da auf Touch kein mousemove feuert. */
  public onStatClick(event: MouseEvent, key: string): void {
    if (!this.deviceService.isTouch()) return;
    this.onMouseMove(event);
    this.hoveredStat.update((current) => (current === key ? null : key));
  }

  /** Deutsches Label zu einem Stat-Key (für den Tooltip-Titel). */
  public getStatName(key: string): string {
    return this.displayStats.find((stat) => stat.key === key)?.name ?? key;
  }

  public statColor(key: string): string {
    return getStatColor(key, 'dark');
  }

  /**
   * Liest einen Stat-Wert aus einem Kampfwerte-Objekt. Unterstützt neben
   * flachen Keys ('strength') auch einen verschachtelten Punkt-Pfad
   * ('resistances.fire'), da die Resistenzen als eigenes Objekt gespeichert
   * sind statt als flache Top-Level-Keys.
   */
  public getStatValue(source: any, key: string): number {
    if (!source) return 0;
    const value = key.includes('.')
      ? key.split('.').reduce((acc, part) => acc?.[part], source)
      : source[key];
    return value ?? 0;
  }

  /**
   * Look-Around-Animation: frame (1).png ... frame (14).png,
   * danach nochmal frame (1).png für einen sauberen Loop-Übergang.
   */
  characterLookAraoundAnimation = [
    ...framePaths(14, (i) => `imgs/character/character-look-around/frame (${i}).png`, 1),
    'imgs/character/character-look-around/frame (1).png',
  ];

  /**
   * Stats in Klammer-Gruppen (Bracket-Blöcke), wie vom User vorgegeben.
   * Wird als 2 nebeneinanderliegende Spalten dargestellt (siehe statColumns),
   * damit alle Gruppen ohne Scrollen auf einmal sichtbar sind.
   */
  public statGroups: { key: string; stats: { key: string; name: string }[] }[] = [
    {
      key: 'vital',
      stats: [
        { key: 'hp', name: 'Lebenspunkte (HP)' },
        { key: 'hp-regeneration', name: 'Lebensregeneration' },
        { key: 'energy-shield', name: 'Energieschild' },
      ],
    },
    {
      key: 'mana',
      stats: [
        { key: 'mana', name: 'Mana' },
        { key: 'mana-regeneration', name: 'Manaregeneration' },
      ],
    },
    {
      key: 'attributes',
      stats: [
        { key: 'vitality', name: 'Vitalität' },
        { key: 'strength', name: 'Stärke' },
        { key: 'dexterity', name: 'Geschick' },
        { key: 'luck', name: 'Glück' },
        { key: 'intelligence', name: 'Intelligenz' },
      ],
    },
    {
      key: 'offense',
      stats: [
        { key: 'attack', name: 'Physischer Angriff' },
        { key: 'magicAttack', name: 'Magischer Angriff' },
        { key: 'critChance', name: 'Krit. Chance' },
        { key: 'critDamage', name: 'Krit. Schaden' },
      ],
    },
    {
      key: 'elemental-damage',
      stats: [
        { key: 'magicDamageCold', name: 'Kälteschaden' },
        { key: 'magicDamageFire', name: 'Feuerschaden' },
        { key: 'magicDamageLightning', name: 'Blitzschaden' },
        { key: 'chaosDamage', name: 'Chaosschaden' },
      ],
    },
    {
      // Rüstung ist ein defensiver Mitigations-Stat wie die Resistenzen, daher hier gemeinsam gruppiert.
      key: 'mitigation',
      stats: [
        { key: 'armor', name: 'Rüstung' },
        { key: 'resistances.fire', name: 'Feuerresistenz' },
        { key: 'resistances.cold', name: 'Kälteresistenz' },
        { key: 'resistances.lightning', name: 'Blitzresistenz' },
        { key: 'resistances.chaos', name: 'Chaosresistenz' },
      ],
    },
    {
      key: 'utility',
      stats: [
        { key: 'initiative', name: 'Initiative' },
        { key: 'evasion', name: 'Ausweichen' },
      ],
    },
    {
      key: 'magic-find',
      stats: [{ key: 'magic-find', name: 'Magisches Gespür' }],
    },
  ];

  /** Flache Liste aller Stats (für getStatName-Lookup im Tooltip-Titel). */
  public displayStats = this.statGroups.flatMap((group) => group.stats);

  /** Teilt statGroups in 2 Spalten (erste/zweite Hälfte der Bracket-Reihenfolge). */
  public statColumns = [this.statGroups.slice(0, 4), this.statGroups.slice(4)];
}

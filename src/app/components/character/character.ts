import { Component, ElementRef, computed, inject, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { GameStateService } from '../../services/game-state.service';
import { ScreenSizingService } from '../../services/screen-sizing.service';
import { DeviceService } from '../../services/device.service';
import { getStatColor } from '../../utils/stat-color.util';
import { SkillSlot } from './skill-slot/skill-slot';
import { RedirectHotspotComponent } from '../shared/redirect-hotspot/redirect-hotspot.component';
import { SkillListItem } from '../skills/skill-list-item/skill-list-item';
import { EquippedSpells } from '../../services/skills.service';
import { meetsAllSpellRequirements } from '../../utils/spell-requirements.util';
import { AVATARS } from '../../models/avatars.data';

/**
 * @component Character
 * @description Charakter-Bildschirm: zeigt Profildaten, das Standbild der
 * Spielfigur (full-body-wo-bg des gewählten Avatars, siehe avatars.data —
 * vorerst statisch statt animiert), alle Kampfwerte (Basis + Ausrüstung)
 * sowie (umschaltbar über die Charakterwerte/Skills-Tabs) die Spell-Liste.
 * Der Tab lebt als Routen-Segment ('/character' bzw. '/character/skills'),
 * damit der Wechsel ohne Komponenten-Neuaufbau passiert (gleiche
 * Route-Config wie bei Inventar/:category, siehe Inventar.activeCategory).
 */
@Component({
  selector: 'app-character',
  standalone: true,
  imports: [CommonModule, SkillSlot, RedirectHotspotComponent, SkillListItem],
  templateUrl: './character.html',
  styleUrl: './character.scss',
})
export class Character {
  public gameStateService = inject(GameStateService);
  public deviceService = inject(DeviceService);
  private screenSizingService = inject(ScreenSizingService);
  private el = inject(ElementRef);
  private route = inject(ActivatedRoute);

  public name = this.gameStateService.profile.name;
  public level = this.gameStateService.profile.level;
  public exp = this.gameStateService.profile.exp;

  public combatStats: Signal<any> = this.gameStateService.skills.combatStats;
  public baseStats = this.gameStateService.skills.state;
  /** Herkunfts-Aufschlüsselung (Basis/Ausrüstung/Hauptstats/Passives) für den Hover-Tooltip. */
  public statBreakdown = this.gameStateService.skills.statBreakdown;

  /** Full-Body-Standbild (ohne Hintergrund) des gewählten Avatars (siehe avatars.data). */
  public avatarFullBodyImage = computed(
    () => AVATARS.find((avatar) => avatar.id === this.gameStateService.profile.avatar())?.['full-body-wo-bg'],
  );

  /** Aktiver Tab ('stats' Default, 'skills' über '/character/skills'). */
  private paramMap = toSignal(this.route.paramMap);
  public activeView = computed<'stats' | 'skills'>(() =>
    this.paramMap()?.get('category') === 'skills' ? 'skills' : 'stats',
  );

  /** Alle gelernten Spells, für die Skill-Liste im 'skills'-Tab. */
  public spells = this.gameStateService.skills.spells;

  /** Anzeige-Reihenfolge der vier Skill-Slots unter der Charakter-Anzeige. */
  public skillSlotKeys: (keyof EquippedSpells)[] = ['spell_1', 'spell_2', 'spell_3', 'spell_4'];
  public hoveredEquippedSpell = this.gameStateService.skills.hoveredEquippedSpell;
  public unequipConfirmSlot = this.gameStateService.skills.unequipConfirmSlot;

  /** Skill, das gerade per Drag&Drop aus der Skill-Liste auf einen Slot gezogen wird (siehe Inventar.draggingEntry). */
  public draggingSpell = this.gameStateService.skills.draggingSpell;
  public dragGhostImg: string | null = null;
  public dragGhostX = 0;
  public dragGhostY = 0;

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
   * Navigiert zur letzten Nicht-Menü-Szene zurück (Dorf, Abenteuer, Inventar ...),
   * siehe SceneService.goBack — genau wie der "Zurück"-Button in /inventar.
   */
  public goBack(): void {
    this.gameStateService.sceneService.goBack();
  }

  /** Spell, für den gerade der Ablegen-Dialog offen ist (siehe SkillSlot.onClick). */
  public get unequipConfirmSpell(): any {
    const slot = this.unequipConfirmSlot();
    return slot ? this.gameStateService.skills.spells().find((s: any) => s.id === this.gameStateService.skills.equippedSpells()[slot]) ?? null : null;
  }

  public confirmUnequipSkill(): void {
    const slot = this.unequipConfirmSlot();
    if (slot) this.gameStateService.skills.unequipSpellSlot(slot);
    this.unequipConfirmSlot.set(null);
  }

  public cancelUnequipSkill(): void {
    this.unequipConfirmSlot.set(null);
  }

  /** Findet den Slot (per data-slot-name) unter den angegebenen Viewport-Koordinaten (siehe Inventar.slotNameAt). */
  private slotNameAt(clientX: number, clientY: number): string | null {
    const target = document.elementFromPoint(clientX, clientY)?.closest('[data-slot-name]');
    return target?.getAttribute('data-slot-name') ?? null;
  }

  /** Ghost-Position relativ zu #characterRoot, kompensiert um ScreenSizingService.scale() (siehe Inventar.updateDragGhostPosition). */
  private updateDragGhostPosition(clientX: number, clientY: number): void {
    const rect = this.el.nativeElement.querySelector('#characterRoot')?.getBoundingClientRect();
    if (!rect) return;
    const scale = this.screenSizingService.scale() || 1;
    this.dragGhostX = (clientX - rect.left) / scale;
    this.dragGhostY = (clientY - rect.top) / scale;
  }

  private resetSkillDrag(): void {
    this.dragGhostImg = null;
    this.gameStateService.skills.draggingSpell.set(null);
    this.gameStateService.skills.dragHoveredSlot.set(null);
  }

  public onSkillDragStart(payload: { spell: any; imgPath: string; clientX: number; clientY: number }): void {
    this.gameStateService.skills.draggingSpell.set(payload.spell);
    this.dragGhostImg = payload.imgPath;
    this.updateDragGhostPosition(payload.clientX, payload.clientY);
  }

  public onSkillDragMove(payload: { clientX: number; clientY: number }): void {
    this.updateDragGhostPosition(payload.clientX, payload.clientY);
    this.gameStateService.skills.dragHoveredSlot.set(this.slotNameAt(payload.clientX, payload.clientY) as keyof EquippedSpells | null);
  }

  public onSkillDragEnd(payload: { clientX: number; clientY: number }): void {
    const spell = this.draggingSpell();
    const slotName = this.slotNameAt(payload.clientX, payload.clientY) as keyof EquippedSpells | null;

    if (spell && slotName && this.skillSlotKeys.includes(slotName)) {
      const meetsRequirements = meetsAllSpellRequirements(
        spell,
        this.gameStateService.skills.combatStats(),
        (type) => this.gameStateService.skills.hasEquippedWeaponType(type),
      );
      if (meetsRequirements) {
        this.gameStateService.skills.equipSpellToSlot(spell, slotName);
      }
    }

    this.resetSkillDrag();
  }

  public onSkillDragCancel(): void {
    this.resetSkillDrag();
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

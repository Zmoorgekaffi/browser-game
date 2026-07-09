import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FightService } from '../../../services/fight.service';
import { BuffableStat } from '../../../utils/potion-buff.util';

const STAT_LABELS: Record<BuffableStat, string> = {
  strength: 'Stärke',
  intelligence: 'Intelligenz',
  vitality: 'Vitalität',
  luck: 'Glück',
};

/**
 * @component ActiveBuffsIndicator
 * @description Kleines Badge neben der Spieler-HP-Anzeige im Kampf, das
 * erscheint, sobald mindestens ein Buff aktiv ist (aktuell nur Buff-Tränke,
 * siehe FightService.activePlayerBuffs — architektonisch offen für künftige
 * Spell-Buffs, da die Anzeige rein vom Signal-Inhalt abhängt).
 *
 * Desktop: Hover zeigt den Tooltip. Mobile: Antippen öffnet das Popup,
 * erneutes Antippen schließt es wieder (kein zuverlässiges :hover auf Touch).
 * Beide Trigger sind unabhängig kombiniert (visible = hovering || pinned).
 *
 * WICHTIG: Nutzt Pointer- statt Maus-Events und filtert explizit auf
 * `pointerType === 'mouse'`. Touch-Taps lösen auf vielen Browsern zusätzlich
 * synthetische "Ghost"-Mouse-Events (mouseenter/mouseover) aus — ohne diesen
 * Filter würde ein Tap `hovering` dauerhaft auf true setzen (nie ein
 * passendes mouseleave auf Touch) und das Popup ließe sich per Tap nie mehr
 * schließen, egal was `pinned` sagt.
 */
@Component({
  selector: 'app-active-buffs-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-buffs-indicator.html',
  styleUrl: './active-buffs-indicator.scss',
})
export class ActiveBuffsIndicator {
  private fightService = inject(FightService);

  public buffs = this.fightService.activePlayerBuffs;

  private hovering = signal<boolean>(false);
  private pinned = signal<boolean>(false);
  public visible = computed(() => this.hovering() || this.pinned());

  /** Nur echte Maus-Pointer setzen hovering — Touch/Pen werden ignoriert. */
  public onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'mouse') this.hovering.set(true);
  }

  public onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'mouse') this.hovering.set(false);
  }

  /** Touch/Pen: Tippen togglet das Popup. Maus wird hier bewusst ignoriert (Hover reicht). */
  public onPointerUp(event: PointerEvent): void {
    if (event.pointerType === 'mouse') return;
    this.pinned.update((v) => !v);
  }

  public statLabel(stat: BuffableStat): string {
    return STAT_LABELS[stat] ?? stat;
  }
}

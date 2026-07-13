import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { GameStateService } from '../../../services/game-state.service';
import { DeviceService } from '../../../services/device.service';
import { meetsStatRequirements, meetsWeaponRequirement, formatSpellRequirements } from '../../../utils/spell-requirements.util';

/**
 * @component SkillListItem
 * @description Eine Zeile in der Spell-Liste. Kann wie ein Item im Inventar
 * per Drag&Drop auf einen Skill-Slot gezogen werden (siehe Character/SkillSlot);
 * der Button unten rüstet stattdessen direkt aus bzw. legt ab (Toggle,
 * in den nächsten freien Slot).
 */
@Component({
  selector: 'app-skill-list-item',
  standalone: true,
  imports: [CommonModule, UpperCasePipe],
  templateUrl: './skill-list-item.html',
  styleUrl: './skill-list-item.scss',
  host: {
    class: 'w-full block',
  },
})
export class SkillListItem {
  private gameStateService = inject(GameStateService);
  public deviceService = inject(DeviceService);

  @Input({ required: true }) spell!: any;
  @Input({ required: true }) index!: number;

  /** Start/Verlauf/Ende eines Drag&Drop-Equip-Vorgangs (siehe InventarItem). */
  @Output() skillDragStart = new EventEmitter<{ spell: any; imgPath: string; clientX: number; clientY: number }>();
  @Output() skillDragMove = new EventEmitter<{ clientX: number; clientY: number }>();
  @Output() skillDragEnd = new EventEmitter<{ clientX: number; clientY: number }>();
  @Output() skillDragCancel = new EventEmitter<void>();

  /** True während dieser Skill per Pointer gezogen wird (für die Ausgrau-Optik). */
  public isDragging = signal(false);

  /**
   * Start des Ziehens per Pointer Events (Maus & Touch einheitlich).
   * setPointerCapture bindet alle Folge-Events an dieses Element, egal wo
   * der Pointer sich danach hin bewegt (siehe InventarItem).
   */
  private beginDrag(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.isDragging.set(true);
    this.skillDragStart.emit({
      spell: this.spell,
      imgPath: this.spell?.['img-path'] || '/imgs/spells/' + this.spell?.id + '.png',
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  /** Grabber-Handle — auf dem Handy die einzige Möglichkeit, einen Skill zu ziehen. */
  onGrabPointerDown(event: PointerEvent): void {
    this.beginDrag(event);
  }

  /**
   * Ganze Karte ziehbar — nur auf dem Desktop (Maus). Auf dem Handy bleibt die
   * Karte für Scrollen reserviert, dort zieht man nur über den Grabber.
   * Ein Klick auf den Ausrüsten-Button darf nicht als Drag-Start zählen.
   */
  onCardPointerDown(event: PointerEvent): void {
    if (this.deviceService.isTouch()) return;
    if ((event.target as HTMLElement).closest('button')) return;
    this.beginDrag(event);
  }

  onItemPointerMove(event: PointerEvent): void {
    if (!this.isDragging()) return;
    event.preventDefault();
    event.stopPropagation();
    this.skillDragMove.emit({ clientX: event.clientX, clientY: event.clientY });
  }

  onItemPointerUp(event: PointerEvent): void {
    if (!this.isDragging()) return;
    event.stopPropagation();
    this.isDragging.set(false);
    this.skillDragEnd.emit({ clientX: event.clientX, clientY: event.clientY });
  }

  onItemPointerCancel(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    this.skillDragCancel.emit();
  }

  /**
   * Toggle-Logik für den Ausrüsten-Button:
   *  - Spell ausgerüstet → aus seinem Slot entfernen.
   *  - Spell nicht ausgerüstet → in den nächsten freien Slot legen
   *    (Warnung, wenn alle vier Slots belegt sind).
   */
  interact() {
    if (this.spell.equipped) {
      // Slot aus den equippedSpells ermitteln in dem dieser Spell sitzt
      const slots = this.gameStateService.skills.equippedSpells();
      const slotKey = (Object.keys(slots) as (keyof typeof slots)[])
        .find(key => slots[key] === this.spell.id) ?? null;

      if (slotKey) {
        this.gameStateService.skills.updateSpells('unequip', this.spell, slotKey);
      }
    } else {
      if (!this.meetsRequirements(this.spell?.requirements)) {
        console.warn(
          `❌ Anforderung nicht erfüllt für "${this.spell.name}": ${this.requirementText}`,
        );
        return;
      }

      if (!this.meetsWeaponRequirement(this.spell)) {
        console.warn(
          `❌ "${this.spell.name}" benötigt eine Waffe vom Typ "${this.spell.requiredWeaponType}"!`,
        );
        return;
      }

      const freeSlot = this.gameStateService.skills.getNextFreeSlot();
      if (freeSlot) {
        this.gameStateService.skills.updateSpells('equip', this.spell, freeSlot);
      } else {
        console.warn('⚠️ Alle Spell-Slots belegt!');
      }
    }
  }

  /** True, wenn alle Einträge in `requirements: [{stat, value}]` erfüllt sind (kein Feld = immer true). */
  public meetsRequirements(requirements: { stat: string; value: number }[] | undefined | null): boolean {
    return meetsStatRequirements(requirements, this.gameStateService.skills.combatStats());
  }

  /** Menschenlesbare Anforderungs-Liste fürs Template/Log, z.B. "10 strength, 5 dexterity". */
  public get requirementText(): string {
    return formatSpellRequirements(this.spell);
  }

  /** True, wenn der Skill keinen Waffentyp fordert oder eine passende Waffe ausgerüstet ist. */
  public meetsWeaponRequirement(spell: any): boolean {
    return meetsWeaponRequirement(spell?.requiredWeaponType, (type) => this.gameStateService.skills.hasEquippedWeaponType(type));
  }
}

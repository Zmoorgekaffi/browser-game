import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../services/game-state.service';
import { DeviceService } from '../../../services/device.service';
import { EquippedSpells } from '../../../services/skills.service';
import { meetsAllSpellRequirements } from '../../../utils/spell-requirements.util';

/**
 * @component SkillSlot
 * @description Einzelner Skill-Slot in der Charakter-Ansicht. Design und
 * Verhalten angelehnt an ArmorSlot (inventar/armor-slot): zeigt den
 * ausgerüsteten Spell aus equippedSpells an, Klick auf einen belegten Slot
 * öffnet den Ablegen-Bestätigungsdialog (siehe Character-Komponente).
 */
@Component({
  selector: 'app-skill-slot',
  imports: [CommonModule],
  templateUrl: './skill-slot.html',
  styleUrl: './skill-slot.scss',
})
export class SkillSlot {
  public gameStateService = inject(GameStateService);
  private deviceService = inject(DeviceService);

  public slotKey = input.required<keyof EquippedSpells>();

  public x = input.required<number>();
  public y = input.required<number>();
  public height = input.required<string>();
  public width = input.required<string>();
  public devmode = input<boolean>(false);

  public defaultImagePath = 'imgs/inventar/slots/slot-skill.png';

  /** Löst den ausgerüsteten Spell dieses Slots auf (null = Slot leer). */
  public equippedSpell = computed(() => {
    const spellId = this.gameStateService.skills.equippedSpells()[this.slotKey()];
    if (!spellId) return null;
    return this.gameStateService.skills.spells().find((s: any) => s.id === spellId) ?? null;
  });

  onEnter(): void {
    if (this.deviceService.isTouch()) return;
    const spell = this.equippedSpell();
    if (spell) this.gameStateService.skills.hoveredEquippedSpell.set(spell);
  }

  onLeave(): void {
    if (this.deviceService.isTouch()) return;
    this.gameStateService.skills.hoveredEquippedSpell.set(null);
  }

  onClick(): void {
    if (this.equippedSpell()) {
      this.gameStateService.skills.unequipConfirmSlot.set(this.slotKey());
    }
  }

  /** Grün/Rot-Highlight während ein Skill aus der Liste über diesen Slot gezogen wird. */
  get dragState(): 'none' | 'valid' | 'invalid' {
    const dragging = this.gameStateService.skills.draggingSpell();
    if (!dragging || this.gameStateService.skills.dragHoveredSlot() !== this.slotKey()) return 'none';
    const meetsRequirements = meetsAllSpellRequirements(
      dragging,
      this.gameStateService.skills.combatStats(),
      (type) => this.gameStateService.skills.hasEquippedWeaponType(type),
    );
    return meetsRequirements ? 'valid' : 'invalid';
  }
}

import { Component, Input, inject } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { GameStateService } from '../../../services/game-state.service';

/**
 * @component SkillListItem
 * @description Eine Zeile in der Spell-Liste. Klick auf das gesamte
 * Element rüstet den Spell aus bzw. legt ihn ab (Toggle).
 */
@Component({
  selector: 'app-skill-list-item',
  standalone: true,
  imports: [CommonModule, UpperCasePipe],
  templateUrl: './skill-list-item.html',
  styleUrl: './skill-list-item.scss',
  host: {
    '(click)': 'onSkillClick()',
    class: 'w-full block pointer-events-auto cursor-pointer',
  },
})
export class SkillListItem {
  private gameStateService = inject(GameStateService);

  @Input({ required: true }) spell!: any;
  @Input({ required: true }) index!: number;

  /** Host-Klick: Spell an-/ablegen. */
  onSkillClick(): void {
    this.interact();
  }

  /**
   * Toggle-Logik:
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
    if (!requirements || requirements.length === 0) return true;
    const stats = this.gameStateService.skills.combatStats() as any;
    return requirements.every((req) => (stats[req.stat] ?? 0) >= req.value);
  }

  /** Menschenlesbare Anforderungs-Liste fürs Template/Log, z.B. "10 strength, 5 dexterity". */
  public get requirementText(): string {
    return (this.spell?.requirements ?? [])
      .map((req: { stat: string; value: number }) => `${req.value} ${req.stat}`)
      .join(', ');
  }

  /** True, wenn der Skill keinen Waffentyp fordert oder eine passende Waffe ausgerüstet ist. */
  public meetsWeaponRequirement(spell: any): boolean {
    if (!spell?.requiredWeaponType) return true;
    return this.gameStateService.skills.hasEquippedWeaponType(spell.requiredWeaponType);
  }
}

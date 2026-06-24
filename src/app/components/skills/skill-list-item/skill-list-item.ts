import { Component, Input, inject } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { GameStateService } from '../../../services/game-state.service';

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

  onSkillClick(): void {
    this.interact();
  }

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
    const freeSlot = this.gameStateService.skills.getNextFreeSlot();
    if (freeSlot) {
      this.gameStateService.skills.updateSpells('equip', this.spell, freeSlot);
    } else {
      console.warn('⚠️ Alle Spell-Slots belegt!');
    }
  }
}
}

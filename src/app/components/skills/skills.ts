import { Component, computed, inject } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';
import { SkillListItem } from './skill-list-item/skill-list-item';
import { EquippedSpells } from '../../services/skills.service';

/**
 * @component Skills
 * @description Übersicht aller gelernten Spells inklusive der vier
 * Spell-Slots. Das Ausrüsten/Ablegen übernimmt SkillListItem.
 */
@Component({
  selector: 'app-skills',
  imports: [CommonModule, UpperCasePipe, SkillListItem],
  templateUrl: './skills.html',
  styleUrl: './skills.scss',
})
export class Skills {
  gameStateService = inject(GameStateService);
  spells = this.gameStateService.skills.spells;

  /** Anzeige-Reihenfolge der vier Spell-Slots. */
  slotKeys: (keyof EquippedSpells)[] = ['spell_1', 'spell_2', 'spell_3', 'spell_4'];

  /**
   * Löst die Spell-IDs in den Slots zu vollständigen Spell-Objekten auf
   * (null = Slot leer), damit das Template Name/Icon anzeigen kann.
   */
  equippedSpellObjects = computed(() => {
    const slots = this.gameStateService.skills.equippedSpells();
    const allSpells = this.gameStateService.skills.spells();

    const resolved = {} as Record<keyof EquippedSpells, any | null>;
    for (const key of this.slotKeys) {
      resolved[key] = allSpells.find((s: any) => s.id === slots[key]) ?? null;
    }
    return resolved;
  });
}

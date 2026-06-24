
import { Component, computed, inject } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';
import { SkillListItem } from './skill-list-item/skill-list-item';
 
type EquippedSpells = {
  spell_1: string | null;
  spell_2: string | null;
  spell_3: string | null;
  spell_4: string | null;
};
 
@Component({
  selector: 'app-skills',
  imports: [CommonModule, UpperCasePipe, SkillListItem],
  templateUrl: './skills.html',
  styleUrl: './skills.scss',
})
export class Skills {
  gameStateService = inject(GameStateService);
  spells = this.gameStateService.skills.spells;
 
  slotKeys: (keyof EquippedSpells)[] = ['spell_1', 'spell_2', 'spell_3', 'spell_4'];
 
  equippedSpellObjects = computed(() => {
    const slots = this.gameStateService.skills.equippedSpells();
    const allSpells = this.gameStateService.skills.spells();
 
    return {
      spell_1: allSpells.find((s: any) => s.id === slots.spell_1) ?? null,
      spell_2: allSpells.find((s: any) => s.id === slots.spell_2) ?? null,
      spell_3: allSpells.find((s: any) => s.id === slots.spell_3) ?? null,
      spell_4: allSpells.find((s: any) => s.id === slots.spell_4) ?? null,
    };
  });
}
 
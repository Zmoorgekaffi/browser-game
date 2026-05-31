import { Injectable, signal, computed } from '@angular/core';
import { SkillsData } from '../models/game-state.interface';
@Injectable({
  providedIn: 'root'
})
export class SkillsService {
  private state = signal<SkillsData>({ attack: 1, defense: 1, spells: [] });

  attack = computed(() => this.state().attack);
  defense = computed(() => this.state().defense);
  spells = computed(() => this.state().spells);

  init(data: SkillsData): void {
    this.state.set(data);
  }

  upgradeAttack(): void {
    this.state.update(state => {
      const newState = { ...state, attack: state.attack + 1 };
      return newState;
    });
  }

  upgradeDefense(): void {
    this.state.update(state => {
      const newState = { ...state, defense: state.defense + 1 };
      return newState;
    });
  }

  addSpell(spell: string): void {
    this.state.update(state => {
      const newState = { ...state, spells: [...state.spells, spell] };
      return newState;
    });
  }
}
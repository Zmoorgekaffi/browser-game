import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { ProfileData } from '../models/game-state.interface';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private state = signal<ProfileData>({ name: 'Hero', level: 1, exp: 0 });

  name = computed(() => this.state().name);
  level = computed(() => this.state().level);
  exp = computed(() => this.state().exp);
  charId: WritableSignal<any | null> = signal(null);

  init(data: ProfileData): void {
    this.state.set(data);
  }

  updateName(name: string): void {
    this.state.update(state => {
      const newState = { ...state, name };
      // Speicherung wird im GameStateService gehandhabt
      return newState;
    });
  }

  addExp(amount: number): void {
    if (amount <= 0) return;
    
    this.state.update(state => {
      const newState = { ...state, exp: state.exp + amount };
      // Speicherung wird im GameStateService gehandhabt
      return newState;
    });
  }

  levelUp(): void {
    this.state.update(state => {
      const newState = { ...state, level: state.level + 1, exp: 0 };
      // Speicherung wird im GameStateService gehandhabt
      return newState;
    });
  }
}
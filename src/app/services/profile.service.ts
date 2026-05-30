import { Injectable, signal, computed } from '@angular/core';
import { ProfileData } from '../models/game-state.interface';
import { GameStateService } from './game-state.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private state = signal<ProfileData>({ name: 'Hero', level: 1, exp: 0 });

  name = computed(() => this.state().name);
  level = computed(() => this.state().level);
  exp = computed(() => this.state().exp);

  constructor(private gameStateService: GameStateService) {}

  init(data: ProfileData): void {
    this.state.set(data);
  }

  updateName(name: string): void {
    this.state.update(state => {
      const newState = { ...state, name };
      this.gameStateService.saveData('profile', newState);
      return newState;
    });
  }

  addExp(amount: number): void {
    if (amount <= 0) return;
    
    this.state.update(state => {
      const newState = { ...state, exp: state.exp + amount };
      this.gameStateService.saveData('profile', newState);
      return newState;
    });
  }

  levelUp(): void {
    this.state.update(state => {
      const newState = { ...state, level: state.level + 1, exp: 0 };
      this.gameStateService.saveData('profile', newState);
      return newState;
    });
  }
}
import { Injectable, signal } from '@angular/core';
import { WalletData, SkillsData, ProfileData } from '../models/game-state.interface';
import { WalletService } from './wallet.service'; 
import { SkillsService } from './skills.service';
import { ProfileService } from './profile.service';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  currentCharacterId = signal<string | null>(null);

  constructor(
    private walletService: WalletService,
    private skillsService: SkillsService,
    private profileService: ProfileService
  ) {}

  loginCharacter(charId: string): void {
    this.currentCharacterId.set(charId);
    
    // Crawl all data for the character
    const walletData = this.crawlData<WalletData>('wallet', charId);
    const skillsData = this.crawlData<SkillsData>('skills', charId);
    const profileData = this.crawlData<ProfileData>('profile', charId);
    
    // Initialize services with loaded data
    this.walletService.init(walletData || this.getDefaultData('wallet'));
    this.skillsService.init(skillsData || this.getDefaultData('skills'));
    this.profileService.init(profileData || this.getDefaultData('profile'));
  }

  crawlData<T>(dataType: string, charId: string): T | null {
    const key = `${charId}_${dataType}`;
    const data = localStorage.getItem(key);
    
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error(`Error parsing ${dataType} data for character ${charId}:`, e);
        return null;
      }
    }
    
    return null;
  }

  saveData(dataType: string, data: any): void {
    const charId = this.currentCharacterId();
    if (!charId) return;
    
    const key = `${charId}_${dataType}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  getDefaultData(dataType: string): any {
    switch (dataType) {
      case 'wallet':
        return { gold: 0, rubies: 0 };
      case 'skills':
        return { attack: 1, defense: 1, spells: [] };
      case 'profile':
        return { name: 'Hero', level: 1, exp: 0 };
      default:
        return null;
    }
  }
}
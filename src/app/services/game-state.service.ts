import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UtilityService } from './utility.service';
import { WalletService } from './wallet.service';
import { SkillsService } from './skills.service';
import { InventarService } from './inventar.service';
import { ProfileService } from './profile.service';

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  //variablen
  currentCharId:any = signal(null);

  constructor(
    public wallet: WalletService,
    public skills: SkillsService,
    public inventar: InventarService,
    public profile: ProfileService,
    public utility: UtilityService,
    private router: Router
  ) {
    this.currentCharId.set(sessionStorage.getItem('pixel-quest-currentUser') || null);
    if (this.currentCharId()) {
      this.loadCharacterData(this.currentCharId());
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadCharacterData(charId: string) {
    // Load data from localStorage or create new character
    const profileKey = `${charId}_profile`;
    const profileData = localStorage.getItem(profileKey);

    if (!profileData) {
      // Create new character with default data
      const defaultProfile = { id: `${charId}`, name: 'Hero', level: 1, exp: 0 };
      const defaultSkills = { attack: 1, defense: 1, spells: [] };
      const defaultWallet = { gold: 0, rubies: 0 };
      const defaultInventar = { items: [] };

      localStorage.setItem(profileKey, JSON.stringify(defaultProfile));
      localStorage.setItem(`${charId}_skills`, JSON.stringify(defaultSkills));
      localStorage.setItem(`${charId}_wallet`, JSON.stringify(defaultWallet));
      localStorage.setItem(`${charId}_inventar`, JSON.stringify(defaultInventar));
    }

    // Load all data into services
    this.profile.init(JSON.parse(localStorage.getItem(profileKey) || '{}'));
    this.skills.init(JSON.parse(localStorage.getItem(`${charId}_skills`) || '{}'));
    this.wallet.init(JSON.parse(localStorage.getItem(`${charId}_wallet`) || '{}'));
    this.inventar.init(JSON.parse(localStorage.getItem(`${charId}_inventar`) || '{}'));
  }
}

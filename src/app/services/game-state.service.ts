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
  currentCharId = signal<string | null>(null);

  constructor(
    public wallet: WalletService,
    public skills: SkillsService,
    public inventar: InventarService,
    public profile: ProfileService,
    public utility: UtilityService,
    private router: Router
  ) {
    const storedId = sessionStorage.getItem('pixel-quest-currentUser');
    this.currentCharId.set(storedId);
    
    if (storedId) {
      this.loadCharacterData(storedId);
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadCharacterData(charId: string) {
    const profileKey = `${charId}_profile`;
    const profileData = localStorage.getItem(profileKey);

    // Wenn kein Profil existiert, erstellen wir den Charakter neu
    if (!profileData) {
      this.createNewCharacter(charId);
    }

    // Daten laden und in die jeweiligen Services jagen
    this.profile.init(JSON.parse(localStorage.getItem(profileKey) || '{}'));
    this.skills.init(JSON.parse(localStorage.getItem(`${charId}_skills`) || '{}'));
    this.wallet.init(JSON.parse(localStorage.getItem(`${charId}_wallet`) || '{}'));
    
    // Korrigiert: Nutzt jetzt ein leeres Array als Fallback, passend zum InventarService
    this.inventar.init(JSON.parse(localStorage.getItem(`${charId}_inventar`) || '[]'));
  }

  createNewCharacter(charId: string) {
    const defaultProfile = { id: charId, name: 'Hero', level: 1, exp: 0 };
    const defaultSkills = { attack: 1, defense: 1, spells: [] };
    const defaultWallet = { gold: 0, rubies: 0 };
    
    // Korrigiert: Ein reines Array für das Inventar deklarieren
    const defaultInventar: any[] = []; 

    localStorage.setItem(`${charId}_profile`, JSON.stringify(defaultProfile));
    localStorage.setItem(`${charId}_skills`, JSON.stringify(defaultSkills));
    localStorage.setItem(`${charId}_wallet`, JSON.stringify(defaultWallet));
    localStorage.setItem(`${charId}_inventar`, JSON.stringify(defaultInventar));
  }
}
import { Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { WalletService } from './wallet.service';
import { SkillsService } from './skills.service';
import { InventarService } from './inventar.service';
import { ProfileService } from './profile.service';
import { UtilityService } from './utility.service';

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  currentCharId = signal<string | null>(null);
  
  // Hier ist dein neues Signal für die aktuelle Route (Szene)
  scene = signal<string>('');

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
    
    // 1. Initial den aktuellen Pfad beim Starten der App setzen
    this.scene.set(this.router.url);

    // 2. Den Router abonnieren, um Routenwechsel live mitzubekommen
    this.router.events
      .pipe(
        // Wir filtern so, dass wir nur reagieren, wenn ein Navigationsvorgang ERFOLGREICH abgeschlossen wurde
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        // Setzt z.B. "/village", "/inventar" oder "/login" ins Signal
        this.scene.set(event.urlAfterRedirects);
      });

    if (storedId) {
      this.loadCharacterData(storedId);
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadCharacterData(charId: string) {
    const profileKey = `${charId}_profile`;
    const profileData = localStorage.getItem(profileKey);

    if (!profileData) {
      this.createNewCharacter(charId);
    }

    const inventarRaw = localStorage.getItem(`${charId}_inventar`) || '{"items": []}';
    const inventarObjekt = JSON.parse(inventarRaw);

    this.inventar.init(inventarObjekt);

    this.profile.init(JSON.parse(localStorage.getItem(profileKey) || '{}'));
    this.skills.init(JSON.parse(localStorage.getItem(`${charId}_skills`) || '{}'));
    this.wallet.init(JSON.parse(localStorage.getItem(`${charId}_wallet`) || '{}'));
  }

  createNewCharacter(charId: string) {
    const defaultProfile = { id: charId, name: 'Hero', level: 1, exp: 0 };
    const defaultSkills = { attack: 1, defense: 1, spells: [] };
    const defaultWallet = { gold: 0, rubies: 0 };
    const defaultInventar = { items: [] };

    localStorage.setItem(`${charId}_profile`, JSON.stringify(defaultProfile));
    localStorage.setItem(`${charId}_skills`, JSON.stringify(defaultSkills));
    localStorage.setItem(`${charId}_wallet`, JSON.stringify(defaultWallet));
    localStorage.setItem(`${charId}_inventar`, JSON.stringify(defaultInventar));
  }
}
import { Injectable, signal, inject, effect } from '@angular/core';
import { Router } from '@angular/router'; 
import { WalletService } from './wallet.service';
import { SkillsService } from './skills.service';
import { InventarService } from './inventar.service';
import { ProfileService } from './profile.service';
import { UtilityService } from './utility.service';
import { ShopService } from './shop.service';
import { LoginService } from './login.service';
import { SceneService } from './scene.service'; 

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  // 1. Moderne Dependency Injection
  public wallet = inject(WalletService);
  public skills = inject(SkillsService);
  public inventar = inject(InventarService);
  public profile = inject(ProfileService);
  public utility = inject(UtilityService);
  public shop = inject(ShopService);
  private login = inject(LoginService);
  
  private sceneService = inject(SceneService); 
  private router = inject(Router); 

  // 2. Reaktive Signale für den State
  public currentCharId = signal<string | null>(null);
  public scene = this.sceneService.currentScene;

  // 3. Facade Pattern: Exponiert die finalen, berechneten Kampfwerte ans UI
  public combatStats = this.skills.combatStats;

  constructor() {
    effect(() => {
      const timestamp = this.sceneService.onSceneChange();
      
      if (timestamp > 0) {
        this.shop.itemInfoCardShow.set(false);
      }

      //test
      console.log(this.combatStats(), "hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiier");
      
    });
  }

  init() {
    console.log('GAMMESTATESERVICE wird ausgeführt');
    
    const storedId = sessionStorage.getItem('pixel-quest-currentUser');
    console.log('hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiier', storedId);

    if (storedId === null) {
      this.currentCharId.set(this.login.loggedInAs());
    } else {
      this.currentCharId.set(storedId);
      this.login.loggedInAs.set(storedId);
    }

    if (storedId && this.login.loggedInAs()) {
      this.loadCharacterData(storedId);
    } else {
      this.router.navigate(['/login']);
    }
  }

  public loadCharacterData(charId: string) {
    const profileKey = `${charId}_profile`;
    const profileData = localStorage.getItem(profileKey);

    if (!profileData) {
      this.createNewCharacter(charId);
    }

    const inventarRaw = localStorage.getItem(`${charId}_inventar`) || '{"items": []}';
    const inventarObjekt = JSON.parse(inventarRaw);

    this.inventar.init(inventarObjekt, charId);
    this.profile.init(JSON.parse(localStorage.getItem(profileKey) || '{}'));
    this.skills.init(JSON.parse(localStorage.getItem(`${charId}_skills`) || '{}'));
    this.wallet.init(JSON.parse(localStorage.getItem(`${charId}_wallet`) || '{}'), charId);

    this.shop.init(charId);
  }

  /**
   * Erstellt die initialen Standard-Daten für einen brandneuen Charakter
   * mit allen neuen RPG-Attributen.
   */
  private createNewCharacter(charId: string) {
    const defaultProfile = { id: charId, name: 'Hero', level: 1, exp: 0 };
    
    const defaultSkills = {
      intelligence: 5,
      dexterity: 5,
      strength: 5,
      vitality: 5,
      luck: 5,
      'energy-shield': 0,
      'magic-find': 0,
      armor: 0,
      hp: 100,
      mana: 20,
      attack: 5,
      magicAttack: 5,
      initiative: 10,
      evasion: 5,
      critChance: 5,
      critDamage: 150,
      chaosDamage: 0,
      charisma: 1,
      resistances: {
        fire: 0,
        cold: 0,
        lightning: 0,
        chaos: 0
      },
      spells: []
    };
    
    const defaultWallet = { gold: 1000, rubies: 0 };
    const defaultInventar = { items: [] };

    localStorage.setItem(`${charId}_profile`, JSON.stringify(defaultProfile));
    localStorage.setItem(`${charId}_skills`, JSON.stringify(defaultSkills));
    localStorage.setItem(`${charId}_wallet`, JSON.stringify(defaultWallet));
    localStorage.setItem(`${charId}_inventar`, JSON.stringify(defaultInventar));
  }
}
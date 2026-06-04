import { Injectable, signal, inject, effect } from '@angular/core';
import { Router } from '@angular/router'; // Wird nur noch für den initialen Login-Redirect benötigt
import { WalletService } from './wallet.service';
import { SkillsService } from './skills.service';
import { InventarService } from './inventar.service';
import { ProfileService } from './profile.service';
import { UtilityService } from './utility.service';
import { ShopService } from './shop.service';
import { LoginService } from './login.service';
import { SceneService } from './scene.service'; // Neu importiert

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
  
  // Der neue SceneService ersetzt die direkte Router-Logik hier
  private sceneService = inject(SceneService); 
  private router = inject(Router); // Nur noch für den Login-Redirect im Constructor

  // 2. Reaktive Signale für den State
  public currentCharId = signal<string | null>(null);
  
  // Verweist direkt auf das Signal im SceneService. 
  // Alle anderen Komponenten, die gameStateService.scene() aufrufen, merken keinen Unterschied!
  public scene = this.sceneService.currentScene;

  constructor() {
    effect(() => {
      // Wir holen uns den aktuellen Wert (den Zeitstempel). 
      // Das sorgt dafür, dass dieser Effekt bei JEDEM Routenwechsel anspringt.
      const timestamp = this.sceneService.onSceneChange();
      
      // Beim App-Start ist der Wert 0, da wollen wir noch nicht würfeln
      if (timestamp > 0) {
        this.shop.itemInfoCardShow.set(false);
      }
    });
  }

  init() {
     console.log('GAMMESTATESERVICE wird ausgeführt');
    
    const storedId = sessionStorage.getItem('pixel-quest-currentUser');
    console.log('hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiier', storedId);

    if (storedId === null) {
      this.currentCharId.set(this.login.loggedInAs());
      console.log('hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiier if', this.currentCharId());
    } else {
      this.currentCharId.set(storedId);
      this.login.loggedInAs.set(storedId);
      console.log('hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiier else', this.currentCharId());
    }

    // Login-Prüfung beim App-Start
    if (storedId && this.login.loggedInAs()) {
      this.loadCharacterData(storedId);
    } else {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Lädt alle Sub-Services mit den persistenten Daten des Charakters
   */
  public loadCharacterData(charId: string) {
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

    this.shop.init(charId);
  }

  /**
   * Erstellt die initialen Standard-Daten für einen brandneuen Charakter
   */
  private createNewCharacter(charId: string) {
    const defaultProfile = { id: charId, name: 'Hero', level: 1, exp: 0 };
    const defaultSkills = { attack: 1, defense: 1, spells: [] };
    const defaultWallet = { gold: 100, rubies: 0 };
    const defaultInventar = { items: [] };

    localStorage.setItem(`${charId}_profile`, JSON.stringify(defaultProfile));
    localStorage.setItem(`${charId}_skills`, JSON.stringify(defaultSkills));
    localStorage.setItem(`${charId}_wallet`, JSON.stringify(defaultWallet));
    localStorage.setItem(`${charId}_inventar`, JSON.stringify(defaultInventar));
  }
}
import { Injectable, signal, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { WalletService } from './wallet.service';
import { SkillsService } from './skills.service';
import { InventarService } from './inventar.service';
import { PersonalItemsService } from './personal-items.service';
import { CraftingService } from './crafting.service';
import { ProfileService } from './profile.service';
import { UtilityService } from './utility.service';
import { ShopService } from './shop.service';
import { LoginService } from './login.service';
import { SceneService } from './scene.service';
import { AdventureStateService } from './adventure-state.service';
import { LevelUpService } from './level-up.service';
import {
  createDefaultProfile,
  DEFAULT_SKILLS,
  DEFAULT_WALLET,
  DEFAULT_INVENTAR,
} from '../models/default-character.data';

/**
 * @service GameStateService
 * @description Zentraler Einstiegspunkt für den gesamten Spielzustand.
 *
 * Bündelt alle Teil-Services (Wallet, Skills, Inventar, Profil, Shop,
 * Adventure ...) unter einem Dach, sodass Komponenten nur diesen einen
 * Service injizieren müssen. Kümmert sich außerdem um:
 *  - das Laden/Erstellen der Charakterdaten aus dem LocalStorage
 *  - das Fortsetzen eines gespeicherten Abenteuers
 *  - das Schließen der Item-Info-Card bei jedem Szenenwechsel
 */
@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  public wallet = inject(WalletService);
  public skills = inject(SkillsService);
  public inventar = inject(InventarService);
  public personalItems = inject(PersonalItemsService);
  public crafting = inject(CraftingService);
  public profile = inject(ProfileService);
  public utility = inject(UtilityService);
  public shop = inject(ShopService);
  public adventureStateService = inject(AdventureStateService);
  private login = inject(LoginService);
  public sceneService = inject(SceneService);
  public levelUpPanel = inject(LevelUpService);
  private router = inject(Router);

  /** ID des aktuell eingeloggten Charakters (null = niemand eingeloggt). */
  public currentCharId = signal<string | null>(null);

  /** Durchgereichte Kampfwerte (Basis + Ausrüstung) aus dem SkillsService. */
  public combatStats = this.skills.combatStats;

  constructor() {
    // Bei jedem Szenenwechsel die Item-Info-Card und das Levelup-Panel schließen.
    effect(() => {
      const timestamp = this.sceneService.onSceneChange();
      if (timestamp > 0) {
        this.shop.itemInfoCardShow.set(false);
        this.levelUpPanel.close();
        // this.crafting.closeCraftingPanel();
      }
    });
  }

  /**
   * Initialisiert den Spielzustand anhand der Session.
   *
   * Liest die Charakter-ID aus dem SessionStorage, synchronisiert sie mit
   * dem LoginService und lädt anschließend die Charakterdaten — oder leitet
   * zurück zum Login, wenn keine gültige Session existiert.
   */
  init() {
    console.log('GAMESTATESERVICE wird ausgeführt');

    const storedId = sessionStorage.getItem('pixel-quest-currentUser');
    this.profile.charId.set(storedId);

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

  /**
   * Lädt alle Charakterdaten und das Abenteuer.
   *
   * SYNCHRON – kein await mehr nötig, da skills.init() und enrichSpells()
   * komplett synchron arbeiten (JSONs per Build-Time-Import, kein fetch()).
   * Dadurch ist hier auch kein try/catch um async-Fehler mehr nötig.
   *
   * @param charId ID des Charakters, dessen Daten geladen werden sollen.
   */
  public loadCharacterData(charId: string): void {
    const profileKey = `${charId}_profile`;
    const profileData = localStorage.getItem(profileKey);

    if (!profileData) {
      this.createNewCharacter(charId);
    }

    const inventarRaw = localStorage.getItem(`${charId}_inventar`) || '{"items": []}';
    this.inventar.init(JSON.parse(inventarRaw), charId);

    const personalItemsRaw = localStorage.getItem(`${charId}_personal-items`) || '{"items": []}';
    this.personalItems.init(JSON.parse(personalItemsRaw), charId);
    // Persönliche Items können bereits ausgerüstet sein -> Slots neu berechnen.
    this.inventar.refreshEquippedSlots();

    this.profile.init(JSON.parse(localStorage.getItem(profileKey) || '{}'));
    this.skills.profileData = this.currentCharId;

    // Spells werden synchron angereichert – kein await nötig
    this.skills.init(JSON.parse(localStorage.getItem(`${charId}_skills`) || '{}'));

    this.wallet.init(JSON.parse(localStorage.getItem(`${charId}_wallet`) || '{}'), charId);
    this.shop.init(charId);

    // Adventure laden und fortsetzen – alles bereits synchron verfügbar
    const loaded = this.adventureStateService.loadAdventureManually();
    if (loaded) {
      // Guard: NUR resumen, wenn wir noch NICHT in einer Adventure-Action-Szene sind.
      // Sonst feuert loadCharacterData() bei jedem Szenenwechsel innerhalb des
      // Adventures (intro → fight → loot ...) ein weiteres continueAdventure() –
      // und überschreibt damit die laufende Navigation. Das produziert Sprünge
      // bis hin zu Endlos-Schleifen. Step-Hopping läuft eh über IntroScene-Timer
      // und FightService.handleFightEnd → continueAdventure().
      const currentScene = this.sceneService.currentScene();
      const inAdventureScene = currentScene.startsWith('/adventure/');
      if (!inAdventureScene) {
        console.log('✅ Adventure-Save gefunden, springe in den aktuellen Step...');
        this.adventureStateService.continueAdventure();
      } else {
        console.log('ℹ️ Bereits in Adventure-Szene, kein Resume nötig.');
      }
    }
  }

  /**
   * Legt einen komplett neuen Charakter im LocalStorage an.
   *
   * Die Startwerte (Profil, Skills, Wallet, Inventar) kommen aus
   * default-character.data.ts und werden hier nur noch persistiert.
   *
   * @param charId ID, unter der der neue Charakter gespeichert wird.
   */
  private createNewCharacter(charId: string) {
    localStorage.setItem(`${charId}_profile`, JSON.stringify(createDefaultProfile(charId)));
    localStorage.setItem(`${charId}_skills`, JSON.stringify(DEFAULT_SKILLS));
    localStorage.setItem(`${charId}_wallet`, JSON.stringify(DEFAULT_WALLET));
    localStorage.setItem(`${charId}_inventar`, JSON.stringify(DEFAULT_INVENTAR));
  }
}

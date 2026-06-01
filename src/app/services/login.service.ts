import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  
  constructor(
    private router: Router
  ) {
    this.checkIfAllreadyLoggedIn();
  }

  login(charId: string): void {
    
    // Check if character exists - direkter localStorage Zugriff
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
    
    sessionStorage.setItem('pixel-quest-currentUser', `${charId}`);
    // Navigate to village
    this.router.navigate(['/village']);
  }

  checkIfAllreadyLoggedIn() {
    let toLogInUser = sessionStorage.getItem('pixel-quest-currentUser') || null;
    
    if(toLogInUser) {
      console.log(toLogInUser);
      
      this.router.navigate(['/village'])
    }
  }

}

import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  
  loggedInAs = signal<string | null>(null);

  constructor(private router: Router) {
    this.checkIfAllreadyLoggedIn();
  }

  login(charId: string): void {
    // Wir setzen NUR noch den sessionStorage Key.
    // Die Datenprüfung und Erstellung übernimmt der GameStateService beim Laden von /village!
    this.loggedInAs.set(charId);
    sessionStorage.setItem('pixel-quest-currentUser', `${charId}`);

    // Weiterleitung zum Dorf
    this.router.navigate(['/village']);
  }

  checkIfAllreadyLoggedIn() {
    const toLogInUser = sessionStorage.getItem('pixel-quest-currentUser');

    if (toLogInUser) {
      console.log('Bereits eingeloggt als:', toLogInUser);
      this.router.navigate(['/village']);
    }
  }
}

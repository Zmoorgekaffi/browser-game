import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

/**
 * @service LoginService
 * @description Minimaler Session-Login über die Charakter-ID.
 * Merkt sich den eingeloggten Charakter im SessionStorage.
 */
@Injectable({
  providedIn: 'root',
})
export class LoginService {

  /** ID des eingeloggten Charakters oder null. */
  loggedInAs = signal<string | null>(null);

  constructor(private router: Router) {
    this.checkIfAllreadyLoggedIn();
  }

  /**
   * Loggt den Charakter ein und leitet ins Dorf weiter.
   *
   * @param charId Die eingegebene Charakter-ID.
   */
  login(charId: string): void {
    // Wir setzen NUR noch den sessionStorage Key.
    // Die Datenprüfung und Erstellung übernimmt der GameStateService beim Laden von /village!
    this.loggedInAs.set(charId);
    sessionStorage.setItem('pixel-quest-currentUser', `${charId}`);

    // Weiterleitung zum Dorf
    this.router.navigate(['/village']);
  }

  /** Leitet direkt ins Dorf weiter, wenn die Session bereits eingeloggt ist. */
  checkIfAllreadyLoggedIn() {
    const toLogInUser = sessionStorage.getItem('pixel-quest-currentUser');

    if (toLogInUser) {
      console.log('Bereits eingeloggt als:', toLogInUser);
      this.router.navigate(['/village']);
    }
  }
}

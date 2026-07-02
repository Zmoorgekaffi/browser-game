import { Component } from '@angular/core';
import { LoginService } from '../../services/login.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

/**
 * @component Login
 * @description Login-Maske: nimmt eine Charakter-ID entgegen und
 * delegiert den eigentlichen Login an den LoginService.
 */
@Component({
  selector: 'app-login',
  standalone: true, // Falls noch nicht aktiv, hier standalone aktivieren
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  characterId = '';

  constructor(
    private loginService: LoginService,
    private router: Router
  ) {}

  /** Loggt ein, sofern eine nicht-leere Charakter-ID eingegeben wurde. */
  onLogin(): void {
    if (this.characterId.trim()) {
      this.loginService.login(this.characterId.trim());
    }
  }
}
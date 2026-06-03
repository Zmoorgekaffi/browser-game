import { inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SceneService {
  private router = inject(Router);

  // Internes, veränderbares Signal
  private _currentScene = signal<string>('');

  // Öffentliches, schreibgeschütztes Signal für andere Services/Komponenten
  public currentScene = this._currentScene.asReadonly();

  constructor() {
    // Initiale Szene beim Start setzen
    this._currentScene.set(this.router.url);

    // Router-Events für Szenenwechsel abonnieren
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this._currentScene.set(event.urlAfterRedirects);
      });
  }

  /**
   * Hilfsmethode, falls man von außen aktiv die Route wechseln möchte
   */
  public navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
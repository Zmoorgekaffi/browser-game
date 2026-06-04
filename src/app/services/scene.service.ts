import { inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SceneService {
  private router = inject(Router);

  // 1. Dein bestehendes Signal für die aktuelle URL
  private _currentScene = signal<string>('');
  public currentScene = this._currentScene.asReadonly();

  // 2. NEU: Das reine "Feuer"-Signal für den Event-Trigger (gibt die Millisekunden des Wechsels zurück)
  private _onSceneChange = signal<number>(0);
  public onSceneChange = this._onSceneChange.asReadonly();

  constructor() {
    // Initiale Szene beim Start setzen
    this._currentScene.set(this.router.url);

    // Router-Events für Szenenwechsel abonnieren
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // A) Die aktuelle Szene updaten
        this._currentScene.set(event.urlAfterRedirects);
        
        // B) FEUERN: Wir setzen einen neuen Zeitstempel. 
        // Jedes Mal, wenn sich diese Zahl ändert, schlägt das Signal bei allen Lauschenden Alarm!
        this._onSceneChange.set(Date.now());
      });
  }

  /**
   * Hilfsmethode, falls man von außen aktiv die Route wechseln möchte
   */
  public navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
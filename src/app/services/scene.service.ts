import { inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * @service SceneService
 * @description Beobachtet die Router-Navigation und stellt die aktuelle
 * Szene als Signal bereit. Merkt sich außerdem die letzte "echte"
 * Spiel-Szene (kein Menü), damit goBack() dorthin zurückkehren kann.
 */
@Injectable({
  providedIn: 'root',
})
export class SceneService {
  private router = inject(Router);

  private _currentScene = signal<string>('');
  // Wir setzen das initial auf die aktuelle URL, falls wir schon im Spiel sind
  private _previousScene = signal<string>(this.router.url || '/village');
  
  /** Aktuelle Route als Read-Only-Signal. */
  public currentScene = this._currentScene.asReadonly();
  /** Timestamp des letzten Szenenwechsels (für effect()-Trigger). */
  public onSceneChange = signal<number>(0);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const newUrl = event.urlAfterRedirects;
        const menuPages = ['/inventar', '/skills', '/character', '/login'];

        // Logik: Wir merken uns die neue URL als "Rückkehr-Ziel" NUR,
        // wenn es KEIN Menü ist. '/inventar/:category' (z.B. '/inventar/waffen')
        // zählt dabei genauso als Menü wie das reine '/inventar'.
        const isMenuPage = menuPages.some((page) => newUrl === page || newUrl.startsWith(`${page}/`));
        if (!isMenuPage) {
          this._previousScene.set(newUrl);
          console.log(`📌 Neue Rückkehr-Route gespeichert: ${newUrl}`);
        }
        
        this._currentScene.set(newUrl);
        this.onSceneChange.set(Date.now());
      });
  }

  /** Navigiert zurück zur letzten Nicht-Menü-Szene. */
  public goBack(): void {
    const target = this._previousScene();
    console.log('Navigiere zurück zu:', target);
    this.router.navigateByUrl(target);
  }
}
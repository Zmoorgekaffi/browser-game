import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnimationObject } from '../../shared/animation-object/animation-object';
import { LoadingScreen } from '../../shared/loading-screen/loading-screen';
import { RedirectHotspotComponent } from '../../shared/redirect-hotspot/redirect-hotspot.component';
import { AssetPreloaderService } from '../../../services/asset-preloader.service';
import { SCENE_REGISTRY } from '../../../classes/world/scene-registry';
import { Scene } from '../../../classes/world/scene.class';
import { InteractiveObject } from '../../../classes/world/interactive-object.class';

/**
 * @component WorldScene
 * @description Generisches interaktives Standbild der neuen, festen Welt:
 * liest die Scene anhand der `:sceneId` aus der Route aus `SCENE_REGISTRY`,
 * rendert ihren Hintergrund (statisch, Loop-Animation, oder Animation die
 * einmal durchläuft und stehen bleibt — siehe `Scene.background`) und ihre
 * `interactiveObjects` über die bestehende
 * `app-redirect-hotspot`-Komponente. Eine einzige Komponente für JEDE
 * WorldScene statt einer eigenen Komponente pro Ort.
 *
 * 🐛 Wie IntroScene: läuft über `route.paramMap` statt nur ngOnInit, damit
 * ein Szenenwechsel per `:sceneId` auch bei wiederverwendeter Komponenten-
 * Instanz (z.B. Szene A → Szene B über 'navigate') tatsächlich neu lädt.
 *
 * 🎯 Bei `background.type === 'once'` (Kamera schwenkt einmal rein) bleiben
 * die `interactiveObjects` bis zum Ende dieser Animation ausgeblendet —
 * ihre x/y-Positionen passen zum EINGESCHWENKTEN Endbild, während der
 * Animation würden sie an der falschen Stelle bzw. zu früh auftauchen.
 */
@Component({
  selector: 'app-world-scene',
  imports: [AnimationObject, LoadingScreen, RedirectHotspotComponent],
  templateUrl: './world-scene.html',
  styleUrl: './world-scene.scss',
})
export class WorldScene implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private preloader = inject(AssetPreloaderService);

  public isLoading = signal<boolean>(true);
  public scene = signal<Scene | null>(null);
  public objectsVisible = signal<boolean>(false);

  private paramSub?: Subscription;
  private objectsVisibleTimeoutId?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.paramSub = this.route.paramMap.subscribe((params) => {
      void this.loadScene(params.get('sceneId'));
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
    if (this.objectsVisibleTimeoutId) clearTimeout(this.objectsVisibleTimeoutId);
  }

  private async loadScene(sceneId: string | null): Promise<void> {
    if (this.objectsVisibleTimeoutId) clearTimeout(this.objectsVisibleTimeoutId);

    const factory = sceneId ? SCENE_REGISTRY[sceneId] : undefined;

    if (!factory) {
      console.error('WorldScene: unbekannte sceneId:', sceneId);
      return;
    }

    this.isLoading.set(true);
    this.objectsVisible.set(false);
    const scene = factory();
    this.scene.set(scene);

    const framesToPreload =
      scene.background.type === 'static' ? [scene.background.path] : scene.background.frames;
    await this.preloader.preloadImages(framesToPreload);
    this.isLoading.set(false);

    if (scene.background.type === 'once') {
      this.objectsVisibleTimeoutId = setTimeout(() => {
        this.objectsVisible.set(true);
      }, scene.background.duration);
    } else {
      this.objectsVisible.set(true);
    }
  }

  /**
   * Wertet das InteractionResult eines geklickten Objekts aus.
   * TODO: 'reward'/'fight'/'info' brauchen noch echte UI (Toast/Popup/Kampf-Einstieg) —
   * bisher gibt's dafür noch keine InteractiveObject-Subklasse, die das auslöst.
   */
  onInteract(obj: InteractiveObject): void {
    const result = obj.interact();
    switch (result.type) {
      case 'navigate':
        this.router.navigate(['/adventure/scene', result.sceneId]);
        break;
      case 'reward':
        console.log('[WorldScene] TODO reward-UI:', result.item);
        break;
      case 'fight':
        console.log('[WorldScene] TODO fight-Einstieg:', result.monsterPool);
        break;
      case 'info':
        console.log('[WorldScene] TODO info-Popup:', result.text);
        break;
    }
  }
}

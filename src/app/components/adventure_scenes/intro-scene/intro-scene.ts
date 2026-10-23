import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnimationObject } from '../../shared/animation-object/animation-object';
import { LoadingScreen } from '../../shared/loading-screen/loading-screen';
import { AssetPreloaderService } from '../../../services/asset-preloader.service';
import { INTRO_REGISTRY, IntroSceneConfig } from '../../../classes/world/intro-registry';

/**
 * @component IntroScene
 * @description Generische Intro-Szene der neuen, festen Welt: liest ihre
 * Konfiguration (Frames/Duration/nächste Route) anhand der `:introId` aus
 * der Route aus `INTRO_REGISTRY`, preloadet die Frames, spielt sie ab und
 * navigiert danach automatisch weiter — zu einem weiteren Intro ODER direkt
 * zu einer WorldScene. Eine einzige Komponente für JEDEN Intro-Clip im
 * Spiel statt einer eigenen Komponente pro Übergang.
 *
 * 🐛 Läuft NICHT über ngOnInit allein: navigiert man von einem Intro direkt
 * zum nächsten (gleiche Route, nur anderer `:introId`), behält Angular die
 * Komponenten-Instanz bei — ngOnInit feuert dann kein zweites Mal. Deshalb
 * wird stattdessen `route.paramMap` abonniert, das bei JEDEM Params-Wechsel
 * (auch bei reiner Instanz-Wiederverwendung) erneut auslöst.
 */
@Component({
  selector: 'app-intro-scene',
  imports: [AnimationObject, LoadingScreen],
  templateUrl: './intro-scene.html',
  styleUrl: './intro-scene.scss',
})
export class IntroScene implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private preloader = inject(AssetPreloaderService);

  public isLoading = signal<boolean>(true);
  public config = signal<IntroSceneConfig | null>(null);

  private paramSub?: Subscription;
  private navigateTimeoutId?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.paramSub = this.route.paramMap.subscribe((params) => {
      void this.loadIntro(params.get('introId'));
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
    if (this.navigateTimeoutId) clearTimeout(this.navigateTimeoutId);
  }

  private async loadIntro(introId: string | null): Promise<void> {
    if (this.navigateTimeoutId) clearTimeout(this.navigateTimeoutId);

    const config = introId ? INTRO_REGISTRY[introId] : undefined;
    if (!config) {
      console.error('IntroScene: unbekannte introId:', introId);
      return;
    }

    this.isLoading.set(true);
    this.config.set(config);

    await this.preloader.preloadImages(config.frames);
    this.isLoading.set(false);

    this.navigateTimeoutId = setTimeout(() => {
      this.router.navigateByUrl(config.nextRoute);
    }, config.duration);
  }
}

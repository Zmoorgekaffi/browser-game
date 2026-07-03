import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { gsap } from 'gsap';
import { AnimationObject } from '../shared/animation-object/animation-object';
import { LoadingScreen } from '../shared/loading-screen/loading-screen';
import { LevelUpPanel } from '../shared/level-up-panel/level-up-panel';
import { AssetPreloaderService } from '../../services/asset-preloader.service';
import { GameStateService } from '../../services/game-state.service';
import { framePaths, pad } from '../../utils/frame-paths.util';

/**
 * @component Shrine
 * @description Schrein-Szene: betender Pilger (Sprite-Animation) und
 * schwebender Kristall (GSAP-Float-Loop).
 *
 * 🆕 Zeigt einen Ladebildschirm, bis Hintergrund + alle Animations-Frames
 * vorgeladen sind. Der GSAP-Float startet über einen ViewChild-SETTER,
 * weil der crystalContainer erst existiert, sobald der @else-Zweig
 * (also die eigentliche Szene) gerendert wird — ein klassisches
 * ngAfterViewInit würde ins Leere greifen, solange der Ladebildschirm läuft.
 */
@Component({
  selector: 'app-shrine',
  imports: [AnimationObject, LoadingScreen, LevelUpPanel],
  templateUrl: './shrine.html',
  styleUrl: './shrine.scss',
})
export class Shrine implements OnInit {
  private preloader = inject(AssetPreloaderService);
  public gameStateService = inject(GameStateService);

  /** Solange true zeigt das Template nur den Ladebildschirm. */
  public isLoading = signal<boolean>(true);

  /** Merkt sich, ob der GSAP-Float schon läuft (Setter kann mehrfach feuern). */
  private crystalFloatStarted = false;

  @ViewChild('crystalContainer')
  set crystalContainer(el: ElementRef<HTMLDivElement> | undefined) {
    if (!el || this.crystalFloatStarted) return;
    this.crystalFloatStarted = true;

    // Sanftes Auf- und Abschweben des Kristalls in Endlos-Schleife
    gsap.to(el.nativeElement, {
      y: -5,
      scale: 0.95,
      duration: 2.5,
      ease: 'power1.inOut',
      repeat: -1,
      yoyo: true,
    });
  }

  /**
   * Pray-Animation des Pilgers (frame_001 ... frame_018).
   * HINWEIS: Frame 16 beginnt im Original mit 'mgs/...' (fehlendes 'i').
   * Dieser Eintrag bleibt bewusst 1:1 erhalten, damit sich am
   * Laufzeitverhalten nichts ändert — bei Gelegenheit prüfen!
   */
  pilgrimPrayPaths: string[] = [
    ...framePaths(15, (i) => `imgs/shrine/pilgrim/pray/frame_${pad(i, 3)}.png`, 1),
    'imgs/shrine/pilgrim/pray/frame_016.png',
    'imgs/shrine/pilgrim/pray/frame_017.png',
    'imgs/shrine/pilgrim/pray/frame_018.png',
  ];

  /** Kristall-Animation (frame_ (1).webp ... frame_ (18).webp). */
  shrineCrystalPath: string[] = framePaths(
    18,
    (i) => `imgs/shrine/crystal/frame_ (${i}).webp`,
    1,
  );

  async ngOnInit(): Promise<void> {
    // 🆕 Hintergrund + Pilger- und Kristall-Frames vorladen,
    // erst dann die Szene (und damit die Animationen) starten
    await this.preloader.preloadImages([
      'imgs/shrine/shrine_0.webp',
      ...this.pilgrimPrayPaths,
      ...this.shrineCrystalPath,
    ]);
    this.isLoading.set(false);
  }
}

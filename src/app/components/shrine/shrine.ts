import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import { AnimationObject } from '../shared/animation-object/animation-object';
import { framePaths, pad } from '../../utils/frame-paths.util';

/**
 * @component Shrine
 * @description Schrein-Szene: betender Pilger (Sprite-Animation) und
 * schwebender Kristall (GSAP-Float-Loop).
 */
@Component({
  selector: 'app-shrine',
  imports: [AnimationObject],
  templateUrl: './shrine.html',
  styleUrl: './shrine.scss',
})
export class Shrine implements AfterViewInit {
  @ViewChild('crystalContainer')
  crystalContainer!: ElementRef<HTMLDivElement>;

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

  ngAfterViewInit(): void {
    // Sanftes Auf- und Abschweben des Kristalls in Endlos-Schleife
    gsap.to(this.crystalContainer.nativeElement, {
      y: -5,
      scale: 0.95,
      duration: 2.5,
      ease: 'power1.inOut',
      repeat: -1,
      yoyo: true,
    });
  }
}

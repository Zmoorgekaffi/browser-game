import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import { AnimationObject } from '../shared/animation-object/animation-object';

@Component({
  selector: 'app-shrine',
  imports: [AnimationObject],
  templateUrl: './shrine.html',
  styleUrl: './shrine.scss',
})
export class Shrine implements AfterViewInit {
  @ViewChild('crystalContainer')
  crystalContainer!: ElementRef<HTMLDivElement>;

  pilgrimPrayPaths: string[] = [
    'imgs/shrine/pilgrim/pray/frame_001.png',
    'imgs/shrine/pilgrim/pray/frame_002.png',
    'imgs/shrine/pilgrim/pray/frame_003.png',
    'imgs/shrine/pilgrim/pray/frame_004.png',
    'imgs/shrine/pilgrim/pray/frame_005.png',
    'imgs/shrine/pilgrim/pray/frame_006.png',
    'imgs/shrine/pilgrim/pray/frame_007.png',
    'imgs/shrine/pilgrim/pray/frame_008.png',
    'imgs/shrine/pilgrim/pray/frame_009.png',
    'imgs/shrine/pilgrim/pray/frame_010.png',
    'imgs/shrine/pilgrim/pray/frame_011.png',
    'imgs/shrine/pilgrim/pray/frame_012.png',
    'imgs/shrine/pilgrim/pray/frame_013.png',
    'imgs/shrine/pilgrim/pray/frame_014.png',
    'imgs/shrine/pilgrim/pray/frame_015.png',
    'mgs/shrine/pilgrim/pray/frame_016.png',
    'imgs/shrine/pilgrim/pray/frame_017.png',
    'imgs/shrine/pilgrim/pray/frame_018.png',
  ];

  shrineCrystalPath: string[] = [
    'imgs/shrine/crystal/frame_ (1).webp',
    'imgs/shrine/crystal/frame_ (2).webp',
    'imgs/shrine/crystal/frame_ (3).webp',
    'imgs/shrine/crystal/frame_ (4).webp',
    'imgs/shrine/crystal/frame_ (5).webp',
    'imgs/shrine/crystal/frame_ (6).webp',
    'imgs/shrine/crystal/frame_ (7).webp',
    'imgs/shrine/crystal/frame_ (8).webp',
    'imgs/shrine/crystal/frame_ (9).webp',
    'imgs/shrine/crystal/frame_ (10).webp',
    'imgs/shrine/crystal/frame_ (11).webp',
    'imgs/shrine/crystal/frame_ (12).webp',
    'imgs/shrine/crystal/frame_ (13).webp',
    'imgs/shrine/crystal/frame_ (14).webp',
    'imgs/shrine/crystal/frame_ (15).webp',
    'imgs/shrine/crystal/frame_ (16).webp',
    'imgs/shrine/crystal/frame_ (17).webp',
    'imgs/shrine/crystal/frame_ (18).webp',
  ];

  ngAfterViewInit(): void {
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
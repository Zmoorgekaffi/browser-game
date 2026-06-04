import { Component, Input, OnInit, OnDestroy, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animation-object',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './animation-object.html',
  styleUrl: './animation-object.scss',
})
export class AnimationObject implements OnInit, OnDestroy {
  @Input() Name: string = "default";
  @Input() Duration: number = 1000; // Gesamtdauer in ms
  @Input() Delay: number = 0;        // Startverzögerung in ms
  @Input() Loop: boolean = false;
  @Input() spritePaths: any[] = []; // Array aus Bild-Pfaden
  @Input() width: string = "100%";
  @Input() height: string = "100%";

  // Das aktive Bild, das gerade gerendert wird
  public currentFrameIndex = signal<number>(0);
  
  // Computed Signal für den aktuellen Bildpfad
  public currentSpritePath = computed(() => {
    if (this.spritePaths.length === 0) return '';
    return this.spritePaths[this.currentFrameIndex()];
  });

  private intervalId: any = null;

  ngOnInit() {
    // Wenn keine Bilder da sind, brauchen wir nichts tun
    console.log(this.spritePaths);
    
    if (!this.spritePaths || this.spritePaths.length === 0) return;

    // Berechne, wie lange ein einzelner Frame sichtbar sein muss
    const frameDuration = this.Duration / this.spritePaths.length;

    // Startverzögerung (Delay) berücksichtigen
    setTimeout(() => {
      this.startAnimation(frameDuration);
    }, this.Delay);
  }

  private startAnimation(frameDuration: number) {
    this.intervalId = setInterval(() => {
      this.currentFrameIndex.update(currentIndex => {
        const nextIndex = currentIndex + 1;
        
        if (nextIndex >= this.spritePaths.length) {
          if (this.Loop) {
            return 0; // Loop aktiv: Zurück zum ersten Frame
          } else {
            this.stopAnimation(); // Kein Loop: Animation stoppen
            return currentIndex;  // Auf dem letzten Frame stehen bleiben
          }
        }
        return nextIndex;
      });
    }, frameDuration);
  }

  private stopAnimation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  ngOnDestroy() {
    // Memory-Leaks verhindern, falls die Komponente zerstört wird
    this.stopAnimation();
  }
}
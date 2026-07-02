import {
  Component,
  Input,
  HostBinding,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * @component AnimationObject
 * @description Universelle Sprite-Animation: spielt ein Array von
 * Bild-Pfaden (spritePaths) über die angegebene Duration ab — einmalig
 * oder als Loop. Optional absolut positionierbar über Top/Left.
 * Wird überall im Spiel eingesetzt (Händler, Monster, Intros, Hintergründe).
 */
@Component({
  selector: 'app-animation-object',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './animation-object.html',
  styleUrl: './animation-object.scss',
})
export class AnimationObject implements OnInit, OnChanges, OnDestroy {
  @Input() Name: string = 'default';
  @Input() Duration: number = 1000; // Gesamtdauer in ms
  @Input() Delay: number = 0; // Startverzögerung in ms
  @Input() Loop: boolean = false;
  @Input() width: string = '100%';
  @Input() height: string = '100%';

  /**
   * 🆕 Optionale absolute Positionierung. Werden diese NICHT gesetzt
   * (undefined, Standardfall), verhält sich die Komponente exakt wie
   * vorher — kein position:absolute, keine Regression für bestehende
   * Verwendungen (Shrine, Fight-Scene, Loot-Scene etc.), die ihre
   * Positionierung über einen umgebenden Wrapper-Div lösen.
   *
   * Werden sie gesetzt (z.B. im Dialog, wo jede Begegnung ihre eigene
   * Character-Box mitbringt), positioniert sich die Komponente selbst
   * absolut relativ zum nächsten position:relative-Elternelement.
   */
  @Input() Top?: string;
  @Input() Left?: string;

  @HostBinding('style.position')
  get hostPosition(): string | null {
    return this.Top !== undefined || this.Left !== undefined ? 'absolute' : null;
  }
  @HostBinding('style.top')
  get hostTop(): string | null {
    return this.Top ?? null;
  }
  @HostBinding('style.left')
  get hostLeft(): string | null {
    return this.Left ?? null;
  }
  // Spiegelt width/height zusätzlich auf den Host, damit die absolute
  // Box bei gesetztem Top/Left auch die richtige Größe hat (statt sich
  // auf 100% des Elternelements zu verlassen).
  @HostBinding('style.width')
  get hostWidth(): string {
    return this.width;
  }
  @HostBinding('style.height')
  get hostHeight(): string {
    return this.height;
  }

  // 🔥 Steuert das Object-Fit Verhalten: true = contain, false = cover
  @Input() contain: boolean = true;

  /**
   * 🆕 FIX: spritePaths wird jetzt über einen eigenen Setter in ein
   * internes Signal gespiegelt. Vorher war spritePaths ein reines
   * @Input()-Array (kein Signal) — computed() konnte Änderungen daran
   * NICHT als Abhängigkeit erkennen, weil es nur echte Signal-Reads
   * trackt (hier bisher nur currentFrameIndex()).
   *
   * Folge des alten Bugs: Wurde die Komponente initial mit einem LEEREN
   * spritePaths-Array erzeugt (z.B. weil der Wert erst kurz danach über
   * einen Angular effect() gesetzt wurde), brach ngOnInit() sofort ab,
   * das Interval startete nie, currentFrameIndex änderte sich nie — und
   * currentSpritePath() blieb für immer bei '' hängen, selbst nachdem
   * spritePaths später den echten Pfad bekam. Bei Multi-Frame-Animationen
   * fiel das oft nicht auf, bei Single-Frame-Backgrounds (Loop=false,
   * 1 Pfad) sofort.
   */
  private spritePathsSignal = signal<any[]>([]);

  @Input()
  set spritePaths(value: any[]) {
    this.spritePathsSignal.set(value ?? []);
  }
  get spritePaths(): any[] {
    return this.spritePathsSignal();
  }

  // Das aktive Bild, das gerade gerendert wird
  public currentFrameIndex = signal<number>(0);

  // Computed Signal für den aktuellen Bildpfad — hängt jetzt korrekt von
  // spritePathsSignal() UND currentFrameIndex() ab.
  public currentSpritePath = computed(() => {
    const paths = this.spritePathsSignal();
    if (paths.length === 0) return '';
    return paths[this.currentFrameIndex()];
  });

  private intervalId: any = null;
  private hasInitialized = false;

  ngOnInit() {
    this.hasInitialized = true;
    this.setupAnimation();
  }

  ngOnChanges(changes: SimpleChanges) {
    // spritePaths läuft über den eigenen Setter oben (aktualisiert das
    // Signal sofort). Hier müssen wir nur noch die Animation selbst
    // (Frame-Index + Interval) neu starten, wenn sich spritePaths NACH
    // der initialen Bindung nochmal ändert (z.B. Dialog→Dialog mit
    // neuer Encounter, ohne dass die Komponente neu erzeugt wird).
    if (this.hasInitialized && changes['spritePaths'] && !changes['spritePaths'].firstChange) {
      this.setupAnimation();
    }
  }

  private setupAnimation() {
    this.stopAnimation();
    this.currentFrameIndex.set(0);

    const paths = this.spritePathsSignal();
    if (!paths || paths.length === 0) return;

    const frameDuration = this.Duration / paths.length;

    setTimeout(() => {
      this.startAnimation(frameDuration);
    }, this.Delay);
  }

  private startAnimation(frameDuration: number) {
    this.intervalId = setInterval(() => {
      this.currentFrameIndex.update((currentIndex) => {
        const nextIndex = currentIndex + 1;
        const paths = this.spritePathsSignal();

        if (nextIndex >= paths.length) {
          if (this.Loop) {
            return 0; // Loop aktiv: Zurück zum ersten Frame
          } else {
            this.stopAnimation(); // Kein Loop: Animation stoppen
            return currentIndex; // Auf dem letzten Frame stehen bleiben
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
import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AnimationObject } from '../animation-object/animation-object';

/**
 * @component RedirectHotspotComponent
 * @description Unsichtbare (oder im devMode sichtbare) Klickfläche,
 * die auf eine interne Route oder externe URL weiterleitet.
 * Per Enter/Leertaste auch über die Tastatur bedienbar.
 */
@Component({
  selector: 'app-redirect-hotspot',
  standalone: true,
  imports: [AnimationObject],
  templateUrl: './redirect-hotspot.component.html',
  styleUrl: './redirect-hotspot.component.scss'
})
export class RedirectHotspotComponent {
  @Input() x = 0;
  @Input() y = 0;
  @Input() width = 100;
  @Input() height = 100;
  /** true (Default) = position:absolute mit x/y wie bisher; false = normaler Dokumentenfluss (z.B. als Flex-/Grid-Kind), x/y werden dann ignoriert. */
  @Input() absolute = true;
  @Input() redirect = '';
  @Input() devMode = false;
  /** Optionales Bild (z. B. Gebäude-Sprite), das im Hotspot angezeigt wird. Ignoriert, wenn `frames` gesetzt ist. */
  @Input() image = '';
  /** Optionale Sprite-Animation statt eines statischen Bildes (z.B. für InteractiveObject.visual vom Typ 'loop'/'once'). */
  @Input() frames: string[] = [];
  @Input() frameDuration = 1000;
  /** true = Animation läuft endlos, false = läuft einmal durch und bleibt auf dem letzten Frame stehen. */
  @Input() loopAnimation = false;
  /** Wenn true, leuchtet das Hotspot-Bild beim Hovern auf (siehe .glow-image). */
  @Input() hoverHighlight = false;
  /**
   * Wenn true, bleibt `image` selbst IMMER unsichtbar — beim Hovern leuchtet
   * NUR die Kontur der PNG-Alpha-Silhouette auf (echter Rand-Glow via
   * SVG-Filter, keine gefüllte Fläche). Nur für `image` (statisch), nicht
   * für `frames`.
   */
  @Input() hideImage = false;
  /** Wie weit die Kontur-Glow-Linie über den Bildrand hinausragt (SVG feMorphology radius). */
  @Input() outlineGlowRadius = 3;
  /** Weichzeichnung der Kontur-Glow-Linie (SVG feGaussianBlur stdDeviation). */
  @Input() outlineGlowBlur = 5;
  /** Farbe der Kontur-Glow-Linie. */
  @Input() outlineGlowColor = '#fdec00';
  /** Helligkeit des Hotspot-Bildes, z. B. 0.4 für filter: brightness(0.4). */
  @Input() brightness = 1;
  /** Titel für den Hover-Tooltip (z. B. Gebäudename). */
  @Input() tooltipTitle = '';
  /** Feature-Liste, die im Hover-Tooltip aufgelistet wird. */
  @Input() tooltipFeatures: string[] = [];
  /** Ecke, in der die Tooltip-Card erscheint — 'right' (Default, z.B. Dorf-Gebäude) oder 'left' (z.B. WorldScene-Objekte). */
  @Input() tooltipPosition: 'left' | 'right' = 'right';

  /** Feuert bei jedem Klick/Enter/Leertaste, egal ob 'redirect' gesetzt ist — für Hotspots, die statt einer Route eine Komponenten-Aktion auslösen sollen (z.B. Inventar schließen). */
  @Output() hotspotClick = new EventEmitter<void>();

  /** Ob die Maus aktuell über dem Hotspot liegt (steuert den Tooltip). */
  isHovered = signal(false);

  /** Eindeutige SVG-Filter-ID pro Instanz — bei `hideImage` dürfen IDs im DOM nicht kollidieren. */
  private static nextOutlineFilterId = 0;
  public readonly outlineFilterId = `hotspot-outline-glow-${RedirectHotspotComponent.nextOutlineFilterId++}`;

  constructor(private router: Router) {}

  onMouseEnter(): void {
    this.isHovered.set(true);
  }

  onMouseLeave(): void {
    this.isHovered.set(false);
  }

  /** Navigiert zum Ziel: http(s)-URLs extern, alles andere per Router. Feuert daneben immer 'hotspotClick'. */
  onClick(): void {
    this.hotspotClick.emit();

    if (!this.redirect) {
      return;
    }

    const target = this.redirect.trim();

    if (/^https?:\/\//i.test(target)) {
      window.location.href = target;
      return;
    }

    this.router.navigateByUrl(target);
  }

  /** Tastatur-Bedienung: Enter/Leertaste lösen den Klick aus. */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onClick();
    }
  }
}
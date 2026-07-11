import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

/**
 * @component RedirectHotspotComponent
 * @description Unsichtbare (oder im devMode sichtbare) Klickfläche,
 * die auf eine interne Route oder externe URL weiterleitet.
 * Per Enter/Leertaste auch über die Tastatur bedienbar.
 */
@Component({
  selector: 'app-redirect-hotspot',
  standalone: true,
  templateUrl: './redirect-hotspot.component.html',
  styleUrl: './redirect-hotspot.component.scss'
})
export class RedirectHotspotComponent {
  @Input() x = 0;
  @Input() y = 0;
  @Input() width = 100;
  @Input() height = 100;
  @Input() redirect = '';
  @Input() devMode = false;
  /** Optionales Bild (z. B. Gebäude-Sprite), das im Hotspot angezeigt wird. */
  @Input() image = '';
  /** Wenn true, leuchtet das Hotspot-Bild beim Hovern auf (siehe .glow-image). */
  @Input() hoverHighlight = false;
  /** Helligkeit des Hotspot-Bildes, z. B. 0.4 für filter: brightness(0.4). */
  @Input() brightness = 1;

  constructor(private router: Router) {}

  /** Navigiert zum Ziel: http(s)-URLs extern, alles andere per Router. */
  onClick(): void {
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
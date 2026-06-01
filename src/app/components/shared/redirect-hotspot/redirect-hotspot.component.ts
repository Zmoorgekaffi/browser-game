import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

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

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onClick();
    }
  }
}
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-redirect-hotspot',
  standalone: true,
  template: `
    <div
      class="redirect-hotspot"
      [class.dev-mode]="devMode"
      [style.left.px]="x"
      [style.top.px]="y"
      [style.width.px]="width"
      [style.height.px]="height"
      role="button"
      tabindex="0"
      (click)="onClick()"
      (keydown)="onKeydown($event)"
      [attr.aria-label]="'Redirect hotspot to ' + redirect"
    ></div>
  `,
  styles: [
    `
      .redirect-hotspot {
        position: absolute;
        cursor: pointer;
        background-color: transparent;
        outline: none;
      }

      .redirect-hotspot.dev-mode {
        border: 3px solid rgba(59, 130, 246, 0.9);
        background-color: rgba(59, 130, 246, 0.12);
        box-sizing: border-box;
      }
    `
  ]
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

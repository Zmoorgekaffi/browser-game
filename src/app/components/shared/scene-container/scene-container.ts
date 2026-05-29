// src/app/components/shared/scene-container/scene-container.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-scene-container',
  standalone: true,
  template: `
    <section class="block w-full min-h-[calc(100vh-14rem)] rounded-3xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl overflow-auto">
      <div class="w-full h-full">
      <ng-content></ng-content>
      </div>
    </section>
  `,
  styleUrls: ['./scene-container.scss']
})
export class SceneContainerComponent {
}


import { Component } from '@angular/core';
import { RedirectHotspotComponent } from '../shared/redirect-hotspot/redirect-hotspot.component';

@Component({
  selector: 'app-village-scene',
  standalone: true,
  imports: [RedirectHotspotComponent],
  templateUrl: './village-scene.html',
  styleUrls: ['./village-scene.scss']
})
export class VillageSceneComponent {
}

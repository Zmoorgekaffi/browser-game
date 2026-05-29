import { Routes } from '@angular/router';
import { VillageSceneComponent } from './components/village-scene/village-scene';

export const routes: Routes = [
  { path: 'village', component: VillageSceneComponent },
  { path: '', redirectTo: 'village', pathMatch: 'full' }
];


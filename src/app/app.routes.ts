import { Routes } from '@angular/router';
import { VillageSceneComponent } from './components/village-scene/village-scene';
import { MagicShop } from './components/magic-shop/magic-shop';
import { Adventure } from './components/adventure/adventure';
import { GeneralSupplies } from './components/general-supplies/general-supplies';
import { Tavern } from './components/tavern/tavern';
import { Shrine } from './components/shrine/shrine';
import { Smither } from './components/smither/smither';
import { Login } from './components/login/login';
import { Inventar } from './components/inventar/inventar';
import { Character } from './components/character/character';


export const routes: Routes = [
  { path: 'village', component: VillageSceneComponent },
  { path: 'magic-shop', component: MagicShop },
  { path: 'adventure', component: Adventure },
  { path: 'general-supplies', component: GeneralSupplies },
  { path: 'tavern', component: Tavern },
  { path: 'shrine', component: Shrine },
  { path: 'smither', component: Smither },
  { path: 'inventar', component: Inventar },
  { path: 'character', component: Character },
  { path: 'login', component: Login },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];

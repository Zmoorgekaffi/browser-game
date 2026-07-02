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
import { Skills } from './components/skills/skills';
import { IntroScene } from './components/adventure_scenes/intro-scene/intro-scene';
import { FightScene } from './components/adventure_scenes/fight-scene/fight-scene';
import { LootScene } from './components/adventure_scenes/loot-scene/loot-scene';
import { DialogScene } from './components/adventure_scenes/dialog-scene/dialog-scene';

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
  { path: 'skills', component: Skills },
  { path: 'adventure/intro', component: IntroScene },
  { path: 'adventure/dialog', component: DialogScene },
  { path: 'adventure/loot', component: LootScene },
  { path: 'adventure/fight', component: FightScene },
  { path: 'login', component: Login },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];

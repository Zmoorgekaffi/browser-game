// src/app/services/adventure/areas/dark-forest.ts
import { Area } from '../area.class';
import monsterData1o10 from '../../../../../public/mosters/dark-forest/dark-forest.1-10.json';

export class DarkForest extends Area {
  override name = 'Düsterwald';
  override monsterPool: any[] = [];
  override eventSteps: any[] = [];
  override introDuration: number = 2500;
  override introPaths = [
    'imgs/areas/dark-forest/intro/frame_0000.webp',
    'imgs/areas/dark-forest/intro/frame_0001.webp',
    'imgs/areas/dark-forest/intro/frame_0002.webp',
    'imgs/areas/dark-forest/intro/frame_0003.webp',
    'imgs/areas/dark-forest/intro/frame_0004.webp',
    'imgs/areas/dark-forest/intro/frame_0005.webp',
    'imgs/areas/dark-forest/intro/frame_0006.webp',
    'imgs/areas/dark-forest/intro/frame_0007.webp',
    'imgs/areas/dark-forest/intro/frame_0008.webp',
    'imgs/areas/dark-forest/intro/frame_0009.webp',
    'imgs/areas/dark-forest/intro/frame_0010.webp',
    'imgs/areas/dark-forest/intro/frame_0011.webp',
    'imgs/areas/dark-forest/intro/frame_0012.webp',
    'imgs/areas/dark-forest/intro/frame_0013.webp',
    'imgs/areas/dark-forest/intro/frame_0014.webp',
    'imgs/areas/dark-forest/intro/frame_0015.webp',
    'imgs/areas/dark-forest/intro/frame_0016.webp',
    'imgs/areas/dark-forest/intro/frame_0017.webp',
    'imgs/areas/dark-forest/intro/frame_0018.webp',
    'imgs/areas/dark-forest/intro/frame_0019.webp',
    'imgs/areas/dark-forest/intro/frame_0020.webp',
    'imgs/areas/dark-forest/intro/frame_0021.webp',
    'imgs/areas/dark-forest/intro/frame_0022.webp',
    'imgs/areas/dark-forest/intro/frame_0023.webp',
    'imgs/areas/dark-forest/intro/frame_0024.webp'
  ];



  constructor(playerLevel: number) {

    super(playerLevel);
    this.eventSteps = this.generateSteps(4,8)
    this.populateFights(monsterData1o10);
    
    
    console.log('die generierten steps sind: ', this.eventSteps);

  }

}

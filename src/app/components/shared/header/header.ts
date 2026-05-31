import { Component } from '@angular/core';
import { GameStateService } from '../../../services/game-state.service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {

  gold: number = 0;

  constructor(public gameStateService: GameStateService) {
    this.gold = gameStateService.wallet.gold();
    console.log(this.gold);
    
  }

  
}

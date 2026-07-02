import { Component, OnInit, inject, signal } from '@angular/core';
import { LoadingScreen } from '../shared/loading-screen/loading-screen';
import { AssetPreloaderService } from '../../services/asset-preloader.service';

/**
 * @component Tavern
 * @description Taverne im Dorf — aktuell noch reine Platzhalter-Szene.
 *
 * 🆕 Zeigt einen Ladebildschirm, bis das Hintergrundbild vorgeladen ist.
 */
@Component({
  selector: 'app-tavern',
  imports: [LoadingScreen],
  templateUrl: './tavern.html',
  styleUrl: './tavern.scss',
})
export class Tavern implements OnInit {
  private preloader = inject(AssetPreloaderService);

  /** Solange true zeigt das Template nur den Ladebildschirm. */
  public isLoading = signal<boolean>(true);

  async ngOnInit(): Promise<void> {
    await this.preloader.preloadImages(['imgs/tavern/tavern_0.webp']);
    this.isLoading.set(false);
  }
}

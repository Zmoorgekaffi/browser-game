import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetPreloaderService } from '../../../services/asset-preloader.service';

/**
 * @component LoadingScreen
 * @description Vollflächiger Ladebildschirm mit Fortschrittsbalken.
 * Liest den Fortschritt direkt aus dem AssetPreloaderService — die Szene
 * muss ihn nur anzeigen, solange ihr preloadImages()-Promise läuft:
 *
 *   @if (isLoading()) {
 *     <app-loading-screen />
 *   } @else {
 *     ...Szenen-Inhalt...
 *   }
 */
@Component({
  selector: 'app-loading-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-screen.html',
  styleUrl: './loading-screen.scss',
})
export class LoadingScreen {
  public preloader = inject(AssetPreloaderService);

  /** Text unter dem Balken, pro Szene anpassbar. */
  @Input() label: string = 'Lade...';
}

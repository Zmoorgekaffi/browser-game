import { Component, ElementRef, HostListener, effect, inject, signal } from '@angular/core';
import { ScreenSizingService } from '../../../services/screen-sizing.service';
import { AudioService } from '../../../services/audio-object.service';
import { GameStateService } from '../../../services/game-state.service';

/**
 * @component SettingsMenu
 * @description Kleiner Header-Button, der ein Dropdown mit Vollbild-,
 * Mute- und Lautstärke-Reglern öffnet. Persistiert Mute/Lautstärke pro
 * Charakter über ProfileService (`charID_profile`).
 */
@Component({
  selector: 'app-settings-menu',
  standalone: true,
  templateUrl: './settings-menu.html',
  styleUrl: './settings-menu.scss',
})
export class SettingsMenu {
  private elementRef = inject(ElementRef);
  private gameStateService = inject(GameStateService);
  public screenSizingService = inject(ScreenSizingService);
  public audioService = inject(AudioService);

  isOpen = signal(false);
  isFullscreen = this.screenSizingService.isFullscreen;
  isMuted = this.audioService.isMuted;
  volume = this.audioService.masterVolume;

  constructor() {
    // Gespeicherte Einstellungen des aktiven Charakters in den AudioService übernehmen.
    effect(() => {
      const charId = this.gameStateService.currentCharId();
      if (!charId) return;
      this.audioService.setMute(this.gameStateService.profile.muted());
      this.audioService.masterVolume.set(this.gameStateService.profile.volume());
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleOpen(): void {
    this.isOpen.update((open) => !open);
  }

  toggleFullscreen(): void {
    this.screenSizingService.toggleFullscreen();
  }

  toggleMute(): void {
    this.audioService.toggleMute();
    this.persist();
  }

  onVolumeChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.audioService.masterVolume.set(value);
    this.persist();
  }

  private persist(): void {
    this.gameStateService.profile.updateSettings(
      this.audioService.isMuted(),
      this.audioService.masterVolume(),
    );
  }
}

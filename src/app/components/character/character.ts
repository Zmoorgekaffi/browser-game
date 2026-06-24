import { Component, inject, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';
import { RouterLink } from '@angular/router';
import { AnimationObject } from '../shared/animation-object/animation-object';

@Component({
  selector: 'app-character',
  standalone: true,
  imports: [CommonModule, RouterLink, AnimationObject],
  templateUrl: './character.html',
  styleUrl: './character.scss',
})
export class Character {
  public gameStateService = inject(GameStateService);

  public name = this.gameStateService.profile.name;
  public level = this.gameStateService.profile.level;
  public exp = this.gameStateService.profile.exp;

  public combatStats: Signal<any> = this.gameStateService.skills.combatStats;
  public baseStats = this.gameStateService.skills.state;

  characterLookAraoundAnimation = [
    '/imgs/character/character-look-around/frame (1).png',
    '/imgs/character/character-look-around/frame (2).png',
    '/imgs/character/character-look-around/frame (3).png',
    '/imgs/character/character-look-around/frame (4).png',
    '/imgs/character/character-look-around/frame (5).png',
    '/imgs/character/character-look-around/frame (6).png',
    '/imgs/character/character-look-around/frame (7).png',
    '/imgs/character/character-look-around/frame (8).png',
    '/imgs/character/character-look-around/frame (9).png',
    '/imgs/character/character-look-around/frame (10).png',
    '/imgs/character/character-look-around/frame (11).png',
    '/imgs/character/character-look-around/frame (12).png',
    '/imgs/character/character-look-around/frame (13).png',
    '/imgs/character/character-look-around/frame (14).png',
    '/imgs/character/character-look-around/frame (1).png',
  ];

  public displayStats = [
    { key: 'strength', name: 'Stärke' },
    { key: 'intelligence', name: 'Intelligenz' },
    { key: 'dexterity', name: 'Geschick' },
    { key: 'vitality', name: 'Vitalität' },
    { key: 'luck', name: 'Glück' },
    { key: 'hp', name: 'Lebenspunkte (HP)' },
    { key: 'mana', name: 'Mana' },
    { key: 'attack', name: 'Physischer Angriff' },
    { key: 'magicAttack', name: 'Magischer Angriff' },
    { key: 'armor', name: 'Rüstung' },
    { key: 'energy-shield', name: 'Energieschild' },
    { key: 'initiative', name: 'Initiative' },
    { key: 'evasion', name: 'Ausweichen' },
    { key: 'critChance', name: 'Krit. Chance' },
    { key: 'critDamage', name: 'Krit. Schaden' },
    { key: 'magic-find', name: 'Magic Find' },
  ];
}
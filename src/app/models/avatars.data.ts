/**
 * Wählbare Spieler-Avatare für den /profile-Screen (Name & Avatar wählen).
 *
 * Jeder Avatar bündelt alle Bildvarianten (Portrait fürs Auswahl-Grid,
 * Full-Body mit/ohne Hintergrund für spätere Verwendung z.B. im Dialog)
 * sowie Animations-Platzhalter, die befüllt werden, sobald es echte
 * Sprite-Animationen gibt.
 */
export interface AvatarAnimations {
  talk: string;
  attack: string;
  idle: string;
  death: string;
}

export interface Avatar {
  id: string;
  gender: 'male' | 'female';
  portrait: string;
  'full-body': string;
  'full-body-wo-bg': string;
  animations: AvatarAnimations;
}

const FIGHTER_MALE_BASE = 'imgs/player-avatars/fighter_male_0';
const FIGHTER_FEMALE_BASE = 'imgs/player-avatars/fighter_female_0';
const MAGE_MALE_BASE = 'imgs/player-avatars/mage_male_0';
const MAGE_FEMALE_BASE = 'imgs/player-avatars/mage_female_0';

function fighterMaleAvatar(id: string): Avatar {
  return {
    id,
    gender: 'male',
    portrait: `${FIGHTER_MALE_BASE}/portait_fighter_male_avatar_0.webp`,
    'full-body': `${FIGHTER_MALE_BASE}/full-body_fighter_male_avatar_0.webp`,
    'full-body-wo-bg': `${FIGHTER_MALE_BASE}/full-body-wo-bg_fighter_male_avatar_0.webp`,
    animations: {
      talk: `${FIGHTER_MALE_BASE}/talk_fighter_male_avatar_0.webp`,
      attack: `${FIGHTER_MALE_BASE}/attack_fighter_male_avatar_0.webp`,
      idle: `${FIGHTER_MALE_BASE}/idle_fighter_male_avatar_0.webp`,
      death: `${FIGHTER_MALE_BASE}/death_fighter_male_avatar_0.webp`,
    },
  };
}

function fighterFemaleAvatar(id: string): Avatar {
  return {
    id,
    gender: 'female',
    portrait: `${FIGHTER_FEMALE_BASE}/portait_fighter_female_avatar_0.webp`,
    'full-body': `${FIGHTER_FEMALE_BASE}/full-body_fighter_female_avatar_0.webp`,
    'full-body-wo-bg': `${FIGHTER_FEMALE_BASE}/full-body-wo-bg_fighter_female_avatar_0.webp`,
    animations: {
      talk: `${FIGHTER_FEMALE_BASE}/talk_fighter_female_avatar_0.webp`,
      attack: `${FIGHTER_FEMALE_BASE}/attack_fighter_female_avatar_0.webp`,
      idle: `${FIGHTER_FEMALE_BASE}/idle_fighter_female_avatar_0.webp`,
      death: `${FIGHTER_FEMALE_BASE}/death_fighter_female_avatar_0.webp`,
    },
  };
}

function mageMaleAvatar(id: string): Avatar {
  return {
    id,
    gender: 'male',
    portrait: `${MAGE_MALE_BASE}/portait_mage_male_avatar_0.png`,
    'full-body': `${MAGE_MALE_BASE}/full-body_mage_male_avatar_0.png`,
    'full-body-wo-bg': `${MAGE_MALE_BASE}/full-body-wo-bg_mage_male_avatar_0.png`,
    animations: {
      talk: `${MAGE_MALE_BASE}/talk_mage_male_avatar_0.png`,
      attack: `${MAGE_MALE_BASE}/attack_mage_male_avatar_0.png`,
      idle: `${MAGE_MALE_BASE}/idle_mage_male_avatar_0.png`,
      death: `${MAGE_MALE_BASE}/death_mage_male_avatar_0.png`,
    },
  };
}

function mageFemaleAvatar(id: string): Avatar {
  return {
    id,
    gender: 'female',
    portrait: `${MAGE_FEMALE_BASE}/portait_mage_female_avatar_0.png`,
    'full-body': `${MAGE_FEMALE_BASE}/full-body_mage_female_avatar_0.png`,
    'full-body-wo-bg': `${MAGE_FEMALE_BASE}/full-body-wo-bg_mage_female_avatar_0.png`,
    animations: {
      talk: `${MAGE_FEMALE_BASE}/talk_mage_female_avatar_0.png`,
      attack: `${MAGE_FEMALE_BASE}/attack_mage_female_avatar_0.png`,
      idle: `${MAGE_FEMALE_BASE}/idle_mage_female_avatar_0.png`,
      death: `${MAGE_FEMALE_BASE}/death_mage_female_avatar_0.png`,
    },
  };
}

export const AVATARS: Avatar[] = [
  fighterFemaleAvatar('fighter_female_0'),
  fighterMaleAvatar('fighter_male_0'),
  mageFemaleAvatar('mage_female_0'),
  mageMaleAvatar('mage_male_0'),
];

export const DEFAULT_AVATAR_ID = AVATARS[0].id;

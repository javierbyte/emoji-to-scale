import type { EmojiSpeedData } from './db';

// Membership describes the recorded speed, not every way an animal or vehicle
// can move; flying animals and swimmers use the movement in their source.
export const SPEED_CATEGORIES = [
  {
    id: 'animals',
    label: 'Animals',
    includes: (item: EmojiSpeedData) => item.tags.includes('animals'),
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    includes: (item: EmojiSpeedData) => ['🏎️', '🏍️', '🚤', '🚅', '🚁', '🚗', '🚒', '🚝', '🚂', '🚜', '🛩️', '🚎', '🚌', '🚋', '🛫', '🚀', '🛰️'].includes(item.emoji),
  },
  {
    id: 'flying-animals',
    label: 'Flying animals',
    includes: (item: EmojiSpeedData) => ['🦇', '🕊️', '🦅', '🦟', '🪰', '🐞', '🐝', '🦆', '🦉', '🦩'].includes(item.emoji),
  },
  {
    id: 'swimmers',
    label: 'Swimmers',
    includes: (item: EmojiSpeedData) => ['🐊', '🐬', '🦈', '🐡', '🦦', '🫍', '🐋', '🪼'].includes(item.emoji),
  },
  {
    id: 'space',
    label: 'Space',
    includes: (item: EmojiSpeedData) => ['🚀', '☄️', '🛰️', '🌝', '🌎', '🪐', '🌞', '🌌'].includes(item.emoji),
  },
];

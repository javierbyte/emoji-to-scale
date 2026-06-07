/**
 * EMOJI DATA
 *
 * Non exhaustive list of emojis and aproximate physical properties.
 *
 * The main goal of this is to serve as source of data for interesting visualizations, that's why most emojis related to faces are skipped as we only need one for visualizations.
 */

import data from './data.json';

export type DataSource = {
  values: {
    height?: { value: number }; // centimeters
    speed?: { value: number }; // km/h
  };
  url?: string;
  description?: string;
};

export type EmojiEntry = {
  tags?: string[];
  name: string;
  sources: DataSource[];
};

export type EmojiDatabase = Record<string, EmojiEntry>;

export const CATEGORIES = [
  'animals',
  'nature',
  'objects',
  'landmarks',
] as const;

export const emojiDatabase: EmojiDatabase = data as EmojiDatabase;

export type EmojiData = {
  emoji: string;
  height: number; // centimeters
  label: string;
  tags: string[];
};

export function getEmojiData(): EmojiData[] {
  return Object.entries(emojiDatabase)
    .map(([emoji, entry]) => {
      const heightSource = entry.sources.find((s) => s.values.height);
      const height = heightSource?.values.height?.value ?? 0;
      return {
        emoji,
        height,
        label: entry.name,
        tags: entry.tags || [],
      };
    })
    .filter((item) => item.height > 0.01)
    .sort((a, b) => a.height - b.height);
}

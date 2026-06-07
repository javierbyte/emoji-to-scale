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
  isNew?: boolean;
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

export function getEmojiData(): [string, number, string, boolean, string[]][] {
  return Object.entries(emojiDatabase)
    .map(([emoji, entry]) => {
      const heightSource = entry.sources.find((s) => s.values.height);
      const size = heightSource?.values.height?.value ?? 0;
      const label = entry.name;
      const isNew = entry.isNew || false;
      const tags = entry.tags || [];
      return [emoji, size, label, isNew, tags] as [
        string,
        number,
        string,
        boolean,
        string[],
      ];
    })
    .filter(([, size]) => size > 0.01)
    .sort((a, b) => a[1] - b[1]);
}

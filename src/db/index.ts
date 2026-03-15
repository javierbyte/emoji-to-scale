import data from './data.json';

export type EmojiSource = {
  url?: string;
  description?: string;
};

export type EmojiProperty = {
  propertyKey: string;
  value: number;
  source: EmojiSource[];
};

export type EmojiRepresentation = {
  name: string;
  properties: EmojiProperty[];
};

export type EmojiEntry = {
  isNew?: boolean;
  tags?: string[];
  representations: EmojiRepresentation[];
};

export type EmojiDatabase = Record<string, EmojiEntry>;

export const CATEGORIES = ['animals', 'nature', 'objects', 'landmarks'] as const;

export const emojiDatabase: EmojiDatabase = data as EmojiDatabase;

export function getEmojiData(): [string, number, string, boolean, string[]][] {
  return Object.entries(emojiDatabase)
    .map(([emoji, entry]) => {
      const rep = entry.representations[0];
      const prop = rep.properties.find((p) => p.propertyKey === 'height');
      const size = prop ? prop.value : 0;
      const label = rep.name;
      const isNew = entry.isNew || false;
      const tags = entry.tags || [];
      return [emoji, size, label, isNew, tags] as [string, number, string, boolean, string[]];
    })
    .filter(([, size]) => size > 0.01)
    .sort((a, b) => a[1] - b[1]);
}

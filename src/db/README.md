# Emoji Database (`src/db`)

## Schema

Each emoji is keyed by its Unicode character in `data.json`:

```json
{
  "🐜": {
    "representations": [
      {
        "name": "Ant",
        "properties": [
          { "propertyKey": "height", "value": 0.37, "source": [] }
        ]
      }
    ]
  }
}
```

### Types

- **EmojiSource** — `{ url?: string; description?: string }` — citation for a property value
- **EmojiProperty** — `{ propertyKey: string; value: number; source: EmojiSource[] }`
- **EmojiRepresentation** — `{ name: string; properties: EmojiProperty[] }`
- **EmojiEntry** — `{ representations: EmojiRepresentation[] }`
- **EmojiDatabase** — `Record<string, EmojiEntry>`

## Conventions

- All `value` fields are in **centimeters**
- `propertyKey` is currently only `"height"`
- `representations` is an array to support emojis that map to multiple real-world objects (e.g., a Tower emoji could represent both Tokyo Tower and Eiffel Tower)
- `source` is an array of citations (currently empty; can be populated with URLs and descriptions)

## Adding a new emoji

Add a new key to `data.json`:

```json
"🦈": {
  "representations": [
    {
      "name": "Great White Shark",
      "properties": [
        { "propertyKey": "height", "value": 460, "source": [] }
      ]
    }
  ]
}
```

## Accessor

```ts
import { getEmojiData, emojiDatabase } from './db';

// Returns [emoji, sizeInCm, label][] sorted by size, filtered to > 0.01cm
const data = getEmojiData();

// Direct access to the raw database
const ant = emojiDatabase['🐜'];
```

/**
 * migrate-schema.mjs — one-off. Run manually:
 *
 *   node src/db/reference/migrate-schema.mjs
 *
 * Migrates data.json from the old `representations[0].properties[]` shape
 * (each property carrying its own source[]) to the source-centric shape:
 *
 *   { tags?, name, sources: DataSource[] }
 *   DataSource = { values: { height?: {value}, speed?: {value} }, url?, description? }
 *
 * Values that share the same source URL collapse into one DataSource.
 */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(here, '..', 'data.json');

const NO_SOURCE = '__nosource__';

function migrateEntry(entry) {
  const rep = entry.representations[0];

  // group props by source URL (or a single sourceless bucket)
  const groups = new Map();
  for (const prop of rep.properties) {
    const src = prop.source && prop.source[0];
    const key = src ? `url:${src.url || ''}` : NO_SOURCE;
    let g = groups.get(key);
    if (!g) {
      g = { values: {}, url: src && src.url ? src.url : undefined, descs: [] };
      groups.set(key, g);
    }
    g.values[prop.propertyKey] = { value: prop.value };
    if (src && src.description) g.descs.push(src.description);
  }

  const sources = [...groups.values()].map((g) => {
    const ds = { values: g.values };
    if (g.url) ds.url = g.url;
    const desc = [...new Set(g.descs)].join(' ');
    if (desc) ds.description = desc;
    return ds;
  });

  // height-bearing source first for readability
  sources.sort((a, b) => (b.values.height ? 1 : 0) - (a.values.height ? 1 : 0));

  const out = {};
  if (entry.isNew) out.isNew = entry.isNew;
  if (entry.tags) out.tags = entry.tags;
  out.name = rep.name;
  out.sources = sources;
  return out;
}

function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const migrated = {};
  for (const [emoji, entry] of Object.entries(data)) {
    if (!entry.representations) {
      // already migrated — leave as-is
      migrated[emoji] = entry;
      continue;
    }
    migrated[emoji] = migrateEntry(entry);
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(migrated, null, 2) + '\n', 'utf8');
  console.log(`migrated ${Object.keys(migrated).length} entries`);
}

main();

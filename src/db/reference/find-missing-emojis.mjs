/**
 * find-missing-emojis.mjs
 *
 * Throwaway helper — run manually, has NO bearing on the real app.
 *
 *   node src/db/reference/find-missing-emojis.mjs
 *
 * Reports which "eligible" emojis are not yet present in data.json:
 *   - eligible = every emoji in emoji-sequences.txt, deduped (skin tones +
 *     variation selectors collapsed) and with flags removed.
 *   - missing  = eligible emojis whose key is not already in data.json.
 */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SEQUENCES_PATH = join(here, 'emoji-sequences.txt');
const DATA_PATH = join(here, '..', 'data.json');

// Types to drop entirely: flags (country + subdivision) and skin-tone variants.
const SKIP_TYPES = new Set([
  'RGI_Emoji_Flag_Sequence',
  'RGI_Emoji_Tag_Sequence',
  'RGI_Emoji_Modifier_Sequence',
]);

// Collapse variation selectors so "☕" and "☕️" dedupe and compare equal.
const norm = (s) => [...s].filter((c) => c.codePointAt(0) !== 0xfe0f).join('');

function loadEligible() {
  const txt = fs.readFileSync(SEQUENCES_PATH, 'utf8');
  const eligible = new Map(); // normalizedKey -> display emoji

  for (const line of txt.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [cpField, typeField] = trimmed.split(';').map((p) => p && p.trim());
    if (!cpField || !typeField || SKIP_TYPES.has(typeField)) continue;

    if (cpField.includes('..')) {
      // Inclusive range of single code points, e.g. "231A..231B".
      const [start, end] = cpField.split('..').map((h) => parseInt(h, 16));
      for (let cp = start; cp <= end; cp++) {
        const emoji = String.fromCodePoint(cp);
        eligible.set(norm(emoji), emoji);
      }
    } else {
      // Space-separated code point sequence, e.g. "00A9 FE0F".
      const emoji = cpField
        .split(/\s+/)
        .map((h) => String.fromCodePoint(parseInt(h, 16)))
        .join('');
      eligible.set(norm(emoji), emoji);
    }
  }

  return eligible;
}

function main() {
  const eligible = loadEligible();
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const have = new Set(Object.keys(data).map(norm));

  const missing = [...eligible]
    .filter(([key]) => !have.has(key))
    .map(([, emoji]) => emoji);

  console.log(`eligible (deduped): ${eligible.size}`);
  console.log(`in data.json:       ${Object.keys(data).length}`);
  console.log(`missing:            ${missing.length}`);
  console.log('');
  console.log(missing.join(' '));
}

main();

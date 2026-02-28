import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setDictionary } from '../../src/engine/dictionary.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadServerDictionary(): Set<string> {
  const dictPath = resolve(__dirname, '../../public/twl06.txt');
  const text = readFileSync(dictPath, 'utf-8');
  const words = new Set(
    text
      .split('\n')
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length > 0)
  );
  setDictionary(words);
  console.log(`Dictionary loaded: ${words.size} words`);
  return words;
}

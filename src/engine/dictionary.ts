let dictionary: Set<string> | null = null;
let loadingPromise: Promise<Set<string>> | null = null;

export async function loadDictionary(): Promise<Set<string>> {
  if (dictionary) return dictionary;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch(`${import.meta.env.BASE_URL}twl06.txt`)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load dictionary: ${res.status}`);
      return res.text();
    })
    .then(text => {
      const words = new Set(
        text
          .split('\n')
          .map(w => w.trim().toUpperCase())
          .filter(w => w.length > 0)
      );
      dictionary = words;
      return words;
    });

  return loadingPromise;
}

export function isValidWord(word: string): boolean {
  if (!dictionary) return false;
  return dictionary.has(word.toUpperCase());
}

export function isDictionaryLoaded(): boolean {
  return dictionary !== null;
}

export function getDictionary(): Set<string> | null {
  return dictionary;
}

export function setDictionary(words: Set<string>): void {
  dictionary = words;
}

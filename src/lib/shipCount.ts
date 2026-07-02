/**
 * Spell out the number of visible ships for the fleet headings, so "Four ships,
 * one philosophy" always matches how many vessels are actually shown (see
 * src/data/shipVisibility.ts). Falls back to the digit outside the 4–6 range.
 */
const WORDS: Record<string, Record<number, string>> = {
  en: { 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six' },
  el: { 1: 'Ένα', 2: 'Δύο', 3: 'Τρία', 4: 'Τέσσερα', 5: 'Πέντε', 6: 'Έξι' },
};

export function shipCountWord(n: number, lang?: string): string {
  const table = WORDS[(lang ?? 'en').slice(0, 2)] ?? WORDS.en;
  return table[n] ?? String(n);
}

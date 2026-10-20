import { pinyin } from "pinyin-pro";

// Only use this as corroborating evidence for a word whose dictation text
// differs from the question. The ISE result remains the pronunciation judge.
export function countHomophoneRepetitions(heard: string, target: string): number {
  if (!/^[\u3400-\u9fff]+$/u.test(heard) || !/^[\u3400-\u9fff]+$/u.test(target)) return 0;
  const heardSyllables = pinyin(heard, { toneType: "num", type: "array" });
  const targetSyllables = pinyin(target, { toneType: "num", type: "array" });
  if (!targetSyllables.length || heardSyllables.length % targetSyllables.length !== 0) return 0;
  if (![...heardSyllables, ...targetSyllables].every((syllable) => /^[a-zü]+[0-5]$/iu.test(syllable))) return 0;
  return heardSyllables.every((syllable, index) => syllable === targetSyllables[index % targetSyllables.length])
    ? heardSyllables.length / targetSyllables.length : 0;
}

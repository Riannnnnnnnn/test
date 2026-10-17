import type { XfyunIseResult } from "@/services/speech/xfyunIse";

export function strictPronunciationScore(result: XfyunIseResult, referenceText: string): { score: number; stars: number; note: string } {
  const xml = new DOMParser().parseFromString(result.rawXml, "application/xml");
  const syllables = Array.from(xml.getElementsByTagName("syll")).filter((syllable) => !["sil", "silv", "fil"].includes(syllable.getAttribute("content") ?? ""));
  const phones = Array.from(xml.getElementsByTagName("phone"));
  const hasMissingOrSubstitutedPhone = phones.some((phone) => {
    const flags = Number(phone.getAttribute("dp_message") ?? 0);
    return (flags & 16) !== 0 || (flags & 128) !== 0;
  });
  const expectedSyllables = Array.from(referenceText).filter((character) => /\p{Script=Han}/u.test(character)).length;
  if (hasMissingOrSubstitutedPhone || (syllables.length > 0 && syllables.length < expectedSyllables)) {
    return { score: 0, stars: 0, note: "有音节漏读或替换，请放慢速度重新读一遍。" };
  }
  const syllableScores = syllables.map((syllable) => syllable.getAttribute("syll_score") ?? syllable.getAttribute("phone_score"))
    .filter((score): score is string => score !== null)
    .map(Number)
    .filter(Number.isFinite)
    .map((score) => score <= 5 ? score * 20 : score <= 10 ? score * 10 : score);
  const lowestSyllable = syllableScores.length ? Math.min(...syllableScores) : result.pronunciationScore ?? result.totalScore;
  const score = Math.max(0, Math.min(100, Math.round(
    Math.min(result.totalScore, result.pronunciationScore ?? result.totalScore, lowestSyllable + 5),
  )));
  const stars = score >= 97 ? 5 : score >= 92 ? 4 : score >= 85 ? 3 : score >= 75 ? 2 : score >= 60 ? 1 : 0;
  const note = stars >= 4 ? "发音很清楚，继续保持！" : stars >= 2 ? "词语读对了，再留意声母和声调。" : "再慢一些，把每个音说清楚后重测。";
  return { score, stars, note };
}

export function summarizeScores(values: Array<number | undefined>): number | undefined {
  const scores = values.filter((value): value is number => value !== undefined);
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : undefined;
}

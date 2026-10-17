import { SpeechContentMismatchError, type XfyunIseResult } from "@/services/speech/xfyunIse";

const REJECTED_PHONE_FLAGS = 16 | 128;

export function strictPronunciationStars(score?: number): number {
  if (score === undefined) return 0;
  if (score >= 98) return 5;
  if (score >= 88) return 4;
  if (score >= 75) return 3;
  if (score >= 60) return 2;
  return score >= 40 ? 1 : 0;
}

function normalizedDetailScore(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0) return undefined;
  return Math.max(0, Math.min(100, Math.round(score <= 5 ? score * 20 : score <= 10 ? score * 10 : score)));
}

export function scorePronunciation(result: XfyunIseResult, referenceText: string) {
  const xml = new DOMParser().parseFromString(result.rawXml, "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("智能评测结果解析失败，请重新评测。");
  const syllables = Array.from(xml.getElementsByTagName("syll")).filter((syllable) =>
    !["sil", "silv", "fil"].includes((syllable.getAttribute("content") ?? "").toLowerCase()));
  const phones = Array.from(xml.getElementsByTagName("phone"));
  if (phones.some((phone) => (Number(phone.getAttribute("dp_message") ?? 0) & REJECTED_PHONE_FLAGS) !== 0)) {
    throw new SpeechContentMismatchError("有音节漏读或发错，请重新读一遍。");
  }
  const expectedSyllables = Array.from(referenceText).filter((character) => /\p{Script=Han}/u.test(character)).length;
  if (syllables.length > 0 && syllables.length < expectedSyllables) {
    throw new SpeechContentMismatchError("有音节漏读，请完整读出题目。");
  }
  const syllableDetails = syllables.map((syllable) => {
    const ownScore = normalizedDetailScore(syllable.getAttribute("syll_score") ?? syllable.getAttribute("phone_score"));
    const phoneScores = Array.from(syllable.getElementsByTagName("phone"))
      .map((phone) => normalizedDetailScore(phone.getAttribute("phone_score")))
      .filter((score): score is number => score !== undefined);
    const availableScores = [...(ownScore === undefined ? [] : [ownScore]), ...phoneScores];
    return availableScores.length ? Math.min(...availableScores) : undefined;
  });
  const completeDetail = syllableDetails.length >= expectedSyllables && syllableDetails.every((score) => score !== undefined);
  const weakestDetail = completeDetail ? Math.min(...(syllableDetails as number[])) : undefined;
  // 只有完整的分项证据才能拿满星；缺少声调或逐音节结果时最高为四星。
  const detailLimit = weakestDetail === undefined ? 94 : Math.min(100, weakestDetail + 4);
  const pronunciationLimit = result.pronunciationScore ?? Math.min(result.totalScore, 94);
  const toneLimit = result.toneScore ?? Math.min(result.totalScore, 94);
  const initialStrength = Math.min(result.totalScore, pronunciationLimit, detailLimit);
  const vowelFullness = Math.min(result.totalScore, toneLimit);
  const finalClosure = Math.min(result.totalScore, detailLimit);
  const pronunciationClarity = Math.min(initialStrength, vowelFullness, finalClosure);
  return {
    pronunciationClarity,
    initialStrength,
    vowelFullness,
    finalClosure,
    stars: strictPronunciationStars(pronunciationClarity),
  };
}

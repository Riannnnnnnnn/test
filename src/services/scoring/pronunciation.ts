import type { XfyunIseResult } from "@/services/speech/xfyunIse";

// Product display thresholds, not a scientifically calibrated accuracy model.
export function strictPronunciationStars(score?: number): number {
  if (score === undefined) return 0;
  if (score >= 98) return 5;
  if (score >= 88) return 4;
  if (score >= 75) return 3;
  if (score >= 60) return 2;
  return score >= 40 ? 1 : 0;
}

export function scorePronunciation(result: XfyunIseResult) {
  const sentence = ["read_sentence", "read_chapter"].includes(result.category ?? "");
  // Word tasks have no documented accuracy_score. Use the weaker of the two
  // documented pronunciation scores, explicitly labelled as a pronunciation basis.
  const basis = sentence ? result.accuracyScore
    : result.pronunciationScore !== undefined && result.toneScore !== undefined
      ? Math.min(result.pronunciationScore, result.toneScore) : undefined;
  const pronunciationClarity = result.reviewReasons?.length ? undefined : basis;
  const scores: Record<string, number> = {};
  if (pronunciationClarity !== undefined) scores.pronunciationClarity = pronunciationClarity;
  return { scores, stars: strictPronunciationStars(pronunciationClarity), basis };
}

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

const alignmentIssues = new Set(["漏读", "增读", "回读", "替换"]);

export function hasBlockingSpeechReview(result: XfyunIseResult): boolean {
  if (result.contentStatus) return result.contentStatus !== "matched";
  if (result.issues?.some((issue) => alignmentIssues.has(issue.kind))) return true;
  return Boolean(result.reviewReasons?.some((reason) => !reason.startsWith("检测到错读或发音问题") && !reason.startsWith("检测到个别字音问题")));
}

export function speechDimensionStars(result: XfyunIseResult, key: "pronunciationScore" | "toneScore" | "accuracyScore"): number {
  if (hasBlockingSpeechReview(result)) return 0;
  const score = result[key];
  if (score === undefined) return 0;
  const issueKinds = result.issues?.map((issue) => issue.kind) ?? [];
  const related = key === "pronunciationScore" ? issueKinds.filter((kind) => kind.includes("声韵"))
    : key === "toneScore" ? issueKinds.filter((kind) => kind.includes("声调"))
      : issueKinds.filter((kind) => kind.includes("错误"));
  // Engine-level phoneme mistakes should not receive five stars even when the
  // aggregate score is high. The raw engine score remains untouched.
  const maximum = related.length >= 2 ? 3 : related.length === 1 ? 4 : 5;
  return Math.min(strictPronunciationStars(score), maximum);
}

export function scorePronunciation(result: XfyunIseResult) {
  const sentence = ["read_sentence", "read_chapter"].includes(result.category ?? "");
  // Word tasks have no documented accuracy_score. Use the weaker of the two
  // documented pronunciation scores, explicitly labelled as a pronunciation basis.
  const soundBasis = result.pronunciationScore !== undefined && result.toneScore !== undefined
    ? Math.min(result.pronunciationScore, result.toneScore) : undefined;
  const basis = sentence ? soundBasis ?? result.accuracyScore : soundBasis;
  const issueKinds = result.issues?.map((issue) => issue.kind) ?? [];
  const pronunciationIssues = issueKinds.filter((kind) => kind.includes("声韵") || kind.includes("声调"));
  // Preserve the engine evidence, but do not present a flagged sound as perfect.
  const cappedBasis = basis === undefined ? undefined : Math.min(basis, pronunciationIssues.length >= 2 ? 87 : pronunciationIssues.length === 1 ? 97 : 100);
  const pronunciationClarity = hasBlockingSpeechReview(result) ? undefined : cappedBasis;
  const scores: Record<string, number> = {};
  if (pronunciationClarity !== undefined) scores.pronunciationClarity = pronunciationClarity;
  return { scores, stars: strictPronunciationStars(pronunciationClarity), basis };
}

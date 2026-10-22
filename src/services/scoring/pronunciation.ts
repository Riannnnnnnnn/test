import type { XfyunIseResult } from "@/services/speech/xfyunIse";

// Product display thresholds, not a scientifically calibrated accuracy model.
export function strictPronunciationStars(score?: number): number {
  if (score === undefined) return 0;
  if (score >= 99.5) return 5;
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
  const weakWordSound = ["read_word", "read_syllable"].includes(result.category ?? "")
    && key === "pronunciationScore" && Boolean(result.soundConfidenceWarnings?.length);
  const extraSpeech = issueKinds.some((kind) => kind === "增读" || kind === "回读");
  const maximum = related.length >= 2 ? 3 : related.length === 1 || weakWordSound || extraSpeech ? 4 : 5;
  return Math.min(strictPronunciationStars(score), maximum);
}

export function scorePronunciation(result: XfyunIseResult) {
  const sentence = ["read_sentence", "read_chapter"].includes(result.category ?? "");
  // Word tasks have no documented accuracy_score. Use the weaker of the two
  // documented pronunciation scores, explicitly labelled as a pronunciation basis.
  const soundBasis = result.pronunciationScore !== undefined && result.toneScore !== undefined
    ? Math.min(result.pronunciationScore, result.toneScore) : undefined;
  // 整句：声韵、声调、准确度、完整度取最弱的一项，漏读/少读不会拿满星。
  const sentenceScores = [soundBasis, result.accuracyScore, result.integrityScore].filter((value): value is number => value !== undefined);
  const basis = sentence ? (sentenceScores.length ? Math.min(...sentenceScores) : undefined) : soundBasis;
  const issueKinds = result.issues?.map((issue) => issue.kind) ?? [];
  const pronunciationIssues = issueKinds.filter((kind) => kind.includes("声韵") || kind.includes("声调"));
  // Preserve the engine evidence, but do not present a flagged sound as perfect.
  const weakWordSound = !sentence && Boolean(result.soundConfidenceWarnings?.length);
  // These are whole-recording scores, not a separately re-scored audio crop.
  // Retain partial credit for extra speech, but do not certify a perfect take.
  const extraSpeech = issueKinds.some((kind) => kind === "增读" || kind === "回读");
  const incompleteSentenceEvidence = sentence && [result.pronunciationScore, result.toneScore, result.accuracyScore, result.integrityScore].some((value) => value === undefined);
  const cappedBasis = basis === undefined ? undefined : Math.min(basis, pronunciationIssues.length >= 2 ? 87 : pronunciationIssues.length === 1 || extraSpeech || (sentence && issueKinds.some((kind) => alignmentIssues.has(kind))) || incompleteSentenceEvidence ? 97 : weakWordSound ? 99 : 100);
  const pronunciationClarity = hasBlockingSpeechReview(result) ? undefined : cappedBasis;
  const scores: Record<string, number> = {};
  if (pronunciationClarity !== undefined) scores.pronunciationClarity = pronunciationClarity;
  return { scores, stars: strictPronunciationStars(pronunciationClarity), basis };
}

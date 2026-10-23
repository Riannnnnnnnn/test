export function weightedScore(scores: Record<string, number>, weights: Record<string, number>): number {
  const entries = Object.entries(weights);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (!totalWeight) return 0;
  return Math.round(entries.reduce((sum, [key, weight]) => sum + (scores[key] ?? 0) * weight, 0) / totalWeight);
}

export function mergeFinalScores(autoScores?: Record<string, number>, teacherScores?: Record<string, number>): Record<string, number> {
  const keys = new Set([...Object.keys(autoScores ?? {}), ...Object.keys(teacherScores ?? {})]);
  const merged = Object.fromEntries([...keys].map((key) => {
    const automatic = autoScores?.[key];
    const teacher = teacherScores?.[key];
    if (automatic !== undefined && teacher !== undefined) return [key, Math.round((automatic + teacher) / 2)];
    return [key, teacher ?? automatic ?? 0];
  }));
  const teacherArticulation = ["initialStrength", "vowelFullness", "finalClosure"]
    .map((key) => teacherScores?.[key])
    .filter((score): score is number => score !== undefined && Number.isFinite(score));
  if (teacherArticulation.length) {
    const teacherMean = Math.round(teacherArticulation.reduce((sum, score) => sum + score, 0) / teacherArticulation.length);
    const automatic = autoScores?.pronunciationClarity;
    merged.pronunciationClarity = automatic === undefined ? teacherMean : Math.round((automatic + teacherMean) / 2);
  }
  return merged;
}

export function averageScoreRecords(records: Array<Record<string, number> | undefined>): Record<string, number> | undefined {
  const buckets: Record<string, number[]> = {};
  for (const record of records) for (const [key, score] of Object.entries(record ?? {})) {
    if (Number.isFinite(score)) (buckets[key] ??= []).push(score);
  }
  const entries = Object.entries(buckets).map(([key, scores]) => [key, Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)]);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

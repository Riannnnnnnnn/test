export function weightedScore(scores: Record<string, number>, weights: Record<string, number>): number {
  const entries = Object.entries(weights);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (!totalWeight) return 0;
  return Math.round(entries.reduce((sum, [key, weight]) => sum + (scores[key] ?? 0) * weight, 0) / totalWeight);
}

export function mergeFinalScores(autoScores?: Record<string, number>, teacherScores?: Record<string, number>): Record<string, number> {
  const keys = new Set([...Object.keys(autoScores ?? {}), ...Object.keys(teacherScores ?? {})]);
  return Object.fromEntries([...keys].map((key) => {
    const automatic = autoScores?.[key];
    const teacher = teacherScores?.[key];
    if (automatic !== undefined && teacher !== undefined) return [key, Math.round(automatic * .4 + teacher * .6)];
    return [key, teacher ?? automatic ?? 0];
  }));
}

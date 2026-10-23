import type { AssessmentResult } from "@/types";

/** 三个具体观察项汇总为报告表现值；“有待提升”保留为提醒，不重复扣分。 */
export const expressionReviewOptions: Record<string, string[]> = {
  "A5-happy": ["嘴角上扬，笑容明显", "眼睛和脸部能表现开心", "能保持开心表情 3 秒", "有待提升"],
  "A5-sad": ["嘴角向下，难过表情明显", "眉眼能表现难过", "能保持难过表情 3 秒", "有待提升"],
  "A5-shy": ["低头或收起笑容，害羞表情明显", "眼神和动作能表现害羞", "能保持害羞表情 3 秒", "有待提升"],
  "A5-angry": ["眉头皱起，生气表情明显", "眼睛和嘴巴能表现生气", "能保持生气表情 3 秒", "有待提升"],
};

export function expressionReviewLabels(result?: AssessmentResult): string[] {
  const review = result?.rawResult?.expressionReview as { labels?: unknown; reviewedAt?: unknown } | undefined;
  return typeof review?.reviewedAt === "string" && Array.isArray(review.labels)
    ? review.labels.filter((label): label is string => typeof label === "string" && label.length > 0) : [];
}

export const isExpressionReviewed = (result?: AssessmentResult) => expressionReviewLabels(result).length > 0;

/** 只汇总已评价的内置表情；未评价不当成零分，历史星级记录不受影响。 */
export function expressionPerformanceScore(items?: Record<string, AssessmentResult>): number | undefined {
  const scores = Object.entries(expressionReviewOptions).flatMap(([id, options]) => {
    const labels = expressionReviewLabels(items?.[id]);
    if (!labels.some((label) => options.includes(label))) return [];
    return [options.slice(0, 3).filter((label) => labels.includes(label)).length / 3 * 100];
  });
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : undefined;
}

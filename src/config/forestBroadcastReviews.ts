import type { AssessmentResult } from "@/types";

export interface ForestSentenceReview {
  labels: string[];
  sentence: string;
  reviewedAt: string;
}

export const forestReviewOptions = [
  ["着急语气到位", "提醒内容清楚", "表达流畅自然", "有待提升"],
  ["着急语气到位", "提醒对象清楚", "表达流畅自然", "有待提升"],
  ["开心语气到位", "雨停消息清楚", "表达流畅自然", "有待提升"],
  ["开心语气到位", "邀请内容清楚", "表达流畅自然", "有待提升"],
] as const;

export function forestSentenceReviews(result?: AssessmentResult): Array<ForestSentenceReview | undefined> {
  const saved = result?.rawResult?.forestBroadcast;
  const reviews = saved && typeof saved === "object" && "reviews" in saved ? saved.reviews : undefined;
  if (!Array.isArray(reviews)) return Array(4).fill(undefined);
  return Array.from({ length: 4 }, (_, index) => {
    const review = reviews[index];
    if (!review || typeof review !== "object" || !Array.isArray(review.labels) || !review.labels.some((label: unknown) => typeof label === "string")) return undefined;
    return { labels: review.labels.filter((label: unknown): label is string => typeof label === "string"), sentence: typeof review.sentence === "string" ? review.sentence : "", reviewedAt: typeof review.reviewedAt === "string" ? review.reviewedAt : "" };
  });
}

export function forestReviewsComplete(result?: AssessmentResult) {
  return forestSentenceReviews(result).every(Boolean);
}

export function forestPerformanceScore(result?: AssessmentResult) {
  const reviews = forestSentenceReviews(result);
  if (!reviews.every(Boolean)) return undefined;
  return Math.round(reviews.reduce((sum, review) => sum + (review?.labels.filter((label) => label !== "有待提升").length ?? 0) / 3, 0) / 4 * 100);
}

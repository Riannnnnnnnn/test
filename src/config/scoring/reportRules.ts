import { abilityDimensions } from "./index";

export const stageAReportDimensions = [
  "pronunciationClarity",
  "breathAndVoice",
  "logicalOrganization",
  "situationalResponse",
  "performance",
  "languageExpression",
] as const;

const trainingAdvice: Record<(typeof stageAReportDimensions)[number], string> = {
  pronunciationClarity: "每天选择 3 个生活词语，先慢速说清每个音节，再连起来完整表达。",
  breathAndVoice: "每天做 3 轮“小火车呜——”练习，每轮保持声音平稳，记录最长持续时间。",
  logicalOrganization: "用三张生活照片练习“先—然后—最后”，每次说清动作和结果。",
  situationalResponse: "每天模拟一个问候、请求或解释场景，让孩子先听懂问题，再用完整句回答。",
  performance: "选择一种喜欢的动物，用声音、动作、表情完成 20 秒模仿，家长只给予具体肯定。",
  languageExpression: "每天选一件刚发生的小事，用“人物—做了什么—结果怎样”连续说 30 秒。",
};

export function getDimensionAnalysis(dimension: (typeof stageAReportDimensions)[number], score: number) {
  const label = abilityDimensions[dimension];
  if (score >= 80) return { label, current: `${label}表现稳定，能够较自然地完成当前阶段任务。`, strength: "能够较快进入任务，并保持相对完整的表达。", improvement: "可以逐步增加表达细节和任务变化，提高稳定性。", training: trainingAdvice[dimension] };
  if (score >= 60) return { label, current: `${label}已具备基础，在提示下能够完成主要任务。`, strength: "愿意配合，并能呈现部分有效信息。", improvement: "独立完成时的连续性和准确性仍可加强。", training: trainingAdvice[dimension] };
  return { label, current: `${label}仍处于建立阶段，需要通过短时、重复的游戏练习逐步发展。`, strength: "已经愿意参与评测，这是建立能力的重要起点。", improvement: "先降低任务长度，重点建立信心和稳定完成体验。", training: trainingAdvice[dimension] };
}

export type AbilityBand = "突出能力" | "表现较为普通" | "正在发展";

export function getAbilityBand(score: number, highest: number, average: number): AbilityBand {
  if (score >= 70 && score >= highest - 5) return "突出能力";
  if (score >= average - 10) return "表现较为普通";
  return "正在发展";
}

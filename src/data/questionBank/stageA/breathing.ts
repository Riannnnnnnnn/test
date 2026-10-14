import type { AssessmentQuestion } from "@/types";

export const breathingQuestions: AssessmentQuestion[] = [
  {
    id: "A2-001",
    stage: "A",
    moduleId: "A2",
    type: "breathing-game",
    title: "小火车出发",
    prompt: "深吸一口气，持续发出“呜——”，让小火车尽可能平稳地前进。",
    helperText: "有声音时火车前进，停止发声时火车停下。",
    speakingTime: 20,
    scoringDimensions: ["sustainedPhonation", "breathContinuity", "voiceStability"],
  },
];

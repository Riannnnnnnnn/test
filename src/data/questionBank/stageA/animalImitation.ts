import type { AssessmentQuestion } from "@/types";

export const animalImitationQuestions: AssessmentQuestion[] = [
  {
    id: "A5-001",
    stage: "A",
    moduleId: "A5",
    type: "animal-imitation",
    title: "四种表情模仿",
    prompt: "请看着图片，依次模仿开心、难过、害羞和生气的表情。",
    helperText: "重点不是像不像，而是孩子是否愿意大胆表现。",
    assetKeys: ["/assets/v3/emotions/boy-happy-half.webp", "/assets/v3/emotions/girl-happy-half.webp"],
    speakingTime: 30,
    scoringDimensions: ["performance", "languageExpression"],
  },
];

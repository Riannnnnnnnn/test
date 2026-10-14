import type { AssessmentQuestion } from "@/types";

export const animalImitationQuestions: AssessmentQuestion[] = [
  {
    id: "A5-001",
    stage: "A",
    moduleId: "A5",
    type: "animal-imitation",
    title: "神气的小老虎",
    prompt: "请用声音、动作和表情，模仿一只神气的小老虎。",
    helperText: "重点不是像不像，而是孩子是否愿意大胆表现。",
    assetKeys: ["placeholder-tiger"],
    speakingTime: 30,
    scoringDimensions: ["performance", "languageExpression"],
  },
];

import type { AssessmentQuestion } from "@/types";

export const pronunciationQuestions: AssessmentQuestion[] = [
  {
    id: "A1-001",
    stage: "A",
    moduleId: "A1",
    type: "image-naming",
    title: "看图说词",
    prompt: "请看图片，直接说出它的名称。",
    helperText: "",
    assetKeys: ["placeholder-apple"],
    speakingTime: 15,
    scoringDimensions: ["initialStrength", "vowelFullness", "finalClosure"],
  },
];

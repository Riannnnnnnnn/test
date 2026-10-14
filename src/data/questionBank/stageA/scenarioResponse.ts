import type { AssessmentQuestion } from "@/types";

export const scenarioResponseQuestions: AssessmentQuestion[] = [
  {
    id: "A4-001",
    stage: "A",
    moduleId: "A4",
    type: "scenario-response",
    title: "认识新朋友",
    prompt: "今天班里来了一位新朋友，你想认识他，你会怎么说？",
    speakingTime: 30,
    scoringDimensions: ["comprehension", "situationalResponse", "languageExpression"],
  },
];

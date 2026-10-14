import type { AssessmentQuestion } from "@/types";

export const pictureSequenceQuestions: AssessmentQuestion[] = [
  {
    id: "A3-001",
    stage: "A",
    moduleId: "A3",
    type: "picture-sequence",
    title: "种下一颗种子",
    prompt: "拖动或点击按钮把三张图片排好顺序，再用“先、然后、最后”把故事讲出来。",
    assetKeys: ["sequence-seed", "sequence-water", "sequence-flower"],
    preparationTime: 20,
    speakingTime: 45,
    scoringDimensions: ["observation", "logicalOrganization", "languageExpression"],
  },
];

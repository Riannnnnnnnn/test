import { largePronunciationTasks, largeExpressionTask } from "@/config/courseTasks";
import { getStageAQuestion } from "../stageA";
import type { AssessmentQuestion } from "@/types";

export const stageBQuestionBank: AssessmentQuestion[] = [
  ...largePronunciationTasks.map((task) => ({ ...getStageAQuestion("A1")!, stage: "B" as const, id: task.id, title: task.title, prompt: task.text, assetKeys: [] })),
  { ...getStageAQuestion("A2")!, stage: "B", id: "B2-train" },
  { ...getStageAQuestion("A5")!, stage: "B", id: largeExpressionTask.id, title: largeExpressionTask.title, prompt: largeExpressionTask.text, assetKeys: [] },
];

import { animalImitationQuestions } from "./animalImitation";
import { breathingQuestions } from "./breathing";
import { pictureSequenceQuestions } from "./pictureSequence";
import { pronunciationQuestions } from "./pronunciation";
import { scenarioResponseQuestions } from "./scenarioResponse";
import { smallPronunciationTasks, smallExpressionTasks } from "@/config/courseTasks";

const legacyQuestions = [
  ...pronunciationQuestions,
  ...breathingQuestions,
  ...pictureSequenceQuestions,
  ...scenarioResponseQuestions,
  ...animalImitationQuestions,
];

export const stageAQuestionBank = [
  ...smallPronunciationTasks.map((task) => ({ ...pronunciationQuestions[0], id: task.id, title: task.title, prompt: task.text, assetKeys: task.image ? [task.image] : [] })),
  ...breathingQuestions,
  ...smallExpressionTasks.map((task) => ({ ...animalImitationQuestions[0], id: task.id, title: task.title, prompt: task.prompt ?? task.text, assetKeys: task.image ? [task.image] : [] })),
];

export function getStageAQuestion(moduleId: string) {
  return stageAQuestionBank.find((question) => question.moduleId === moduleId) ?? legacyQuestions.find((question) => question.moduleId === moduleId);
}

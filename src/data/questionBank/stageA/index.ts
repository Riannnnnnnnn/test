import { animalImitationQuestions } from "./animalImitation";
import { breathingQuestions } from "./breathing";
import { pictureSequenceQuestions } from "./pictureSequence";
import { pronunciationQuestions } from "./pronunciation";
import { scenarioResponseQuestions } from "./scenarioResponse";

export const stageAQuestionBank = [
  ...pronunciationQuestions,
  ...breathingQuestions,
  ...pictureSequenceQuestions,
  ...scenarioResponseQuestions,
  ...animalImitationQuestions,
];

export function getStageAQuestion(moduleId: string) {
  return stageAQuestionBank.find((question) => question.moduleId === moduleId);
}

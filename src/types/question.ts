import type { StageId } from "./stage";

export type QuestionType =
  | "image-naming"
  | "breathing-game"
  | "picture-sequence"
  | "scenario-response"
  | "animal-imitation";

export interface AssessmentQuestion {
  id: string;
  stage: StageId;
  moduleId: string;
  type: QuestionType;
  title: string;
  prompt: string;
  helperText?: string;
  assetKeys?: string[];
  preparationTime?: number;
  speakingTime?: number;
  scoringDimensions: string[];
}

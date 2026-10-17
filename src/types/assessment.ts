import type { StageId } from "./stage";

export type ResultStatus = "not_started" | "running" | "completed" | "skipped";

export interface AssessmentResult {
  activeItemId?: string;
  items?: Record<string, AssessmentResult>;
  moduleId: string;
  questionId: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  audioFile?: string;
  transcript?: string;
  rawResult?: Record<string, unknown>;
  autoScores?: Record<string, number>;
  teacherScores?: Record<string, number>;
  finalScores?: Record<string, number>;
  status: ResultStatus;
}

export interface AssessmentSession {
  legacyResults?: AssessmentResult[];
  tutorialSeen?: string[];
  courseVersion?: 3;
  id: string;
  studentId: string;
  stage: StageId;
  startTime: string;
  endTime?: string;
  status: "draft" | "running" | "completed";
  results: AssessmentResult[];
}

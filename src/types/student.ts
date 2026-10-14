import type { GradeLevel, StageId } from "./stage";

export type Gender = "male" | "female" | "other";

export interface StudentProfile {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  grade: GradeLevel;
  school?: string;
  phone?: string;
  assessmentDate: string;
  recommendedStage: StageId;
  selectedStage: StageId;
}

export type StudentProfileDraft = Omit<
  StudentProfile,
  "id" | "assessmentDate" | "recommendedStage" | "selectedStage"
>;

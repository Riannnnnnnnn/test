export type StageId = "A" | "B" | "C";

export type GradeLevel =
  | "kindergarten-small"
  | "kindergarten-middle"
  | "kindergarten-large"
  | "preschool"
  | "grade-1"
  | "grade-2"
  | "grade-3"
  | "grade-4"
  | "grade-5"
  | "grade-6"
  | "middle-school-plus";

export interface StageConfig {
  id: StageId;
  name: string;
  fullName: string;
  positioning: string;
  description: string;
  tagline: string[];
  suitableGrades: GradeLevel[];
  moduleIds: string[];
  availability: "available" | "configured";
}

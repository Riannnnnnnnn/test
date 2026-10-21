import type { GradeLevel, StageConfig, StageId } from "@/types";

export const gradeOptions: Array<{ value: GradeLevel; label: string }> = [
  { value: "kindergarten-small", label: "小班" },
  { value: "kindergarten-middle", label: "中班" },
  { value: "kindergarten-large", label: "大班" },
  { value: "preschool", label: "学前班" },
  { value: "grade-1", label: "一年级" },
  { value: "grade-2", label: "二年级" },
  { value: "grade-3", label: "三年级" },
  { value: "grade-4", label: "四年级" },
  { value: "grade-5", label: "五年级" },
  { value: "grade-6", label: "六年级" },
  { value: "middle-school-plus", label: "初中及以上" },
];

export const stageConfigs: Record<StageId, StageConfig> = {
  A: {
    id: "A",
    name: "小阶段",
    fullName: "小阶段｜基础表达",
    positioning: "练习基础正音、气息和模仿表现",
    description: "通过看图读词、小火车气息练习和四种表情模仿，观察孩子的基础表达能力。",
    tagline: ["正音", "气息", "表现力"],
    suitableGrades: ["kindergarten-small", "kindergarten-middle", "kindergarten-large", "preschool"],
    moduleIds: ["A1", "A2", "A5"],
    availability: "available",
  },
  B: {
    id: "B",
    name: "大阶段",
    fullName: "大阶段｜综合表达",
    positioning: "提升复杂正音、气息控制和情境表现力",
    description: "通过针对性句子朗读、小火车气息练习和情境表演，观察更完整的表达表现。",
    tagline: ["句子正音", "气息控制", "情境表现"],
    suitableGrades: ["grade-1", "grade-2", "grade-3", "grade-4", "grade-5", "grade-6", "middle-school-plus"],
    moduleIds: ["A1", "A2", "A5"],
    availability: "available",
  },
  C: {
    id: "C",
    name: "综合表达",
    fullName: "C段｜综合表达",
    positioning: "理解、组织、应变与自主生成",
    description: "关注信息组织、临场回应、内容生成以及更准确、更丰富的表达。",
    tagline: ["信息组织", "临场回应", "内容生成", "精准表达"],
    suitableGrades: ["grade-4", "grade-5", "grade-6", "middle-school-plus"],
    moduleIds: ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"],
    availability: "configured",
  },
};

export const selectableStageConfigs = [stageConfigs.A, stageConfigs.B];

export function recommendStage(grade: GradeLevel): StageId {
  if (stageConfigs.A.suitableGrades.includes(grade)) return "A";
  return "B";
}

export function getGradeLabel(grade: GradeLevel): string {
  return gradeOptions.find((option) => option.value === grade)?.label ?? grade;
}

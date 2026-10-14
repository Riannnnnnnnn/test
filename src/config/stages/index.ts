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
    name: "表达启蒙",
    fullName: "A段｜表达启蒙",
    positioning: "建立表达自信与基础表达秩序",
    description: "通过发音、气息、顺序表达、情境反应和模仿表现，了解孩子是否敢说、能否说清楚。",
    tagline: ["敢说", "说清", "听懂", "排顺", "敢表现"],
    suitableGrades: ["kindergarten-small", "kindergarten-middle", "kindergarten-large", "preschool"],
    moduleIds: ["A1", "A2", "A3", "A4", "A5"],
    availability: "available",
  },
  B: {
    id: "B",
    name: "语言组织",
    fullName: "B段｜语言组织",
    positioning: "从准确表达走向有序、连续表达",
    description: "关注发音准确、看图组织、故事复述、情境应答和持续表达。",
    tagline: ["发音准确", "看图组织", "故事复述", "情境应答", "连续表达"],
    suitableGrades: ["grade-1", "grade-2", "grade-3"],
    moduleIds: ["B1", "B2", "B3", "B4", "B5", "B6", "B7"],
    availability: "configured",
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

export function recommendStage(grade: GradeLevel): StageId {
  if (stageConfigs.A.suitableGrades.includes(grade)) return "A";
  if (stageConfigs.B.suitableGrades.includes(grade)) return "B";
  return "C";
}

export function getGradeLabel(grade: GradeLevel): string {
  return gradeOptions.find((option) => option.value === grade)?.label ?? grade;
}

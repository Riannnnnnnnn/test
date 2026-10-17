import { StageBadge } from "@/assessment/common/StageBadge/StageBadge";
import { Progress } from "@/components/ui";
import { moduleDefinitions } from "@/config/modules";
import { useSiteContent } from "@/content/useSiteContent";
import type { StageId } from "@/types";

interface AssessmentHeaderProps { studentName: string; stage: StageId; moduleId: string; current: number; total: number; }

export function AssessmentHeader({ studentName, stage, moduleId, current, total }: AssessmentHeaderProps) {
  const { content } = useSiteContent();
  const configuredTitle = moduleId in content.modules ? content.modules[moduleId as keyof typeof content.modules].menuTitle : undefined;
  return (
    <header className="assessment-header">
      <div className="assessment-header__meta"><StageBadge stage={stage} /><span>{studentName}</span></div>
      <div className="assessment-header__title"><span>{current} / {total}</span><strong>{({ A1: "正音", A2: "气息", A5: "表现力" } as Record<string, string>)[moduleId] ?? configuredTitle ?? moduleDefinitions[moduleId]?.title ?? "评测项目"}</strong></div>
      <Progress value={current} max={total} label="评测进度" />
    </header>
  );
}

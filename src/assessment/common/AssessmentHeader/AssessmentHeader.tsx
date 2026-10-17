import { StageBadge } from "@/assessment/common/StageBadge/StageBadge";
import { moduleDefinitions } from "@/config/modules";
import { useSiteContent } from "@/content/useSiteContent";
import type { StageId } from "@/types";

interface AssessmentHeaderProps { studentName: string; stage: StageId; moduleId: string; current: number; total: number; }

export function AssessmentHeader({ studentName, stage, moduleId, current, total }: AssessmentHeaderProps) {
  const { content } = useSiteContent();
  const configuredTitle = moduleId in content.modules ? content.modules[moduleId as keyof typeof content.modules].menuTitle : undefined;
  const title = ({ A1: "正音", A2: "气息", A5: "表现力" } as Record<string, string>)[moduleId] ?? configuredTitle ?? moduleDefinitions[moduleId]?.title ?? "评测项目";
  return (
    <header className="pro-header">
      <div className="pro-header__title"><span className="pro-header__step">{String(current).padStart(2, "0")}</span><strong>{title}</strong></div>
      <div className="pro-header__progress" role="progressbar" aria-label="评测进度" aria-valuemin={0} aria-valuemax={total} aria-valuenow={current}>
        {Array.from({ length: total }, (_, index) => <i key={index} className={index + 1 < current ? "is-done" : index + 1 === current ? "is-current" : ""} />)}
        <small>{current} / {total}</small>
      </div>
      <div className="pro-header__meta"><StageBadge stage={stage} /><span>{studentName}</span></div>
    </header>
  );
}

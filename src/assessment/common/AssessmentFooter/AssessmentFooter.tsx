import { Button } from "@/components/ui";
import { TeacherControls } from "@/assessment/common/TeacherControls/TeacherControls";

interface AssessmentFooterProps { canGoBack: boolean; isLast: boolean; hasEvaluation: boolean; intelligentScore?: number; showIntelligentRating?: boolean; onBack: () => void; onNext: () => void; onRetry: () => void; onSkip: () => void; onScore: () => void; }

export function AssessmentFooter({ canGoBack, isLast, hasEvaluation, intelligentScore, showIntelligentRating, onBack, onNext, onRetry, onSkip, onScore }: AssessmentFooterProps) {
  return (
    <footer className="assessment-footer">
      <TeacherControls onRetry={onRetry} onSkip={onSkip} onScore={onScore} hasEvaluation={hasEvaluation} intelligentScore={intelligentScore} showIntelligentRating={showIntelligentRating} />
      <div className="assessment-footer__main"><Button className="assessment-nav assessment-nav--back" variant="secondary" onClick={onBack} disabled={!canGoBack}><span className="assessment-nav__icon" aria-hidden="true">←</span>上一步</Button><span className="autosave-state"><i aria-hidden="true">✓</i>本项数据自动保存</span><Button className="assessment-nav assessment-nav--next" onClick={onNext}>{isLast ? "完成评测" : "下一项"}<span className="assessment-nav__icon" aria-hidden="true">{isLast ? "✓" : "→"}</span></Button></div>
    </footer>
  );
}

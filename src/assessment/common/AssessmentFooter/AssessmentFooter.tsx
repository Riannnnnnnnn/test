import { TeacherControls } from "@/assessment/common/TeacherControls/TeacherControls";

interface AssessmentFooterProps { canGoBack: boolean; isLast: boolean; hasEvaluation: boolean; intelligentScore?: number; showIntelligentRating?: boolean; minimalControls?: boolean; onBack: () => void; onNext: () => void; onRetry: () => void; onSkip: () => void; onScore: () => void; }

export function AssessmentFooter({ canGoBack, isLast, hasEvaluation, intelligentScore, showIntelligentRating, minimalControls, onBack, onNext, onRetry, onSkip, onScore }: AssessmentFooterProps) {
  return (
    <footer className="pro-footer">
      <div className="pro-footer__side">
        <button type="button" className="pro-btn pro-btn--ghost pro-btn--nav" onClick={onBack} disabled={!canGoBack}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>上一步</button>
        <span className="pro-footer__save"><i aria-hidden="true" />本项数据自动保存</span>
      </div>
      <TeacherControls onRetry={onRetry} onSkip={onSkip} onScore={onScore} hasEvaluation={hasEvaluation} intelligentScore={intelligentScore} showIntelligentRating={showIntelligentRating} minimal={minimalControls} />
      <button type="button" className="pro-btn pro-btn--primary pro-btn--nav" onClick={onNext}>{isLast ? "完成评测" : "下一项"}<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{isLast ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M5 12h14M13 6l6 6-6 6" />}</svg></button>
    </footer>
  );
}

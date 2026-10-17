import { StarIcon, StarRating } from "@/components/ui";

interface TeacherControlsProps { onRetry?: () => void; onSkip?: () => void; onScore?: () => void; hasEvaluation?: boolean; intelligentScore?: number; showIntelligentRating?: boolean; minimal?: boolean; }

const retryIcon = <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4.5v4.2h-4.2" /></svg>;
const skipIcon = <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 5l9 7-9 7zM19 5v14" /></svg>;
const checkIcon = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

export function TeacherControls({ onRetry, onSkip, onScore, hasEvaluation = false, intelligentScore, showIntelligentRating = false, minimal = false }: TeacherControlsProps) {
  const intelligentStars = intelligentScore ? Math.max(1, Math.min(5, Math.ceil(intelligentScore / 20))) : 0;
  return <div className={`pro-tools ${minimal ? "pro-tools--minimal" : ""}`} role="toolbar" aria-label="教师操作">
    {!minimal && showIntelligentRating && <span className={`pro-tools__rating ${intelligentStars ? "is-complete" : ""}`}><b>智能评星</b>{intelligentStars ? <StarRating value={intelligentStars} /> : <em>等待发音</em>}</span>}
    <button type="button" className="pro-btn pro-btn--ghost" onClick={onRetry}>{retryIcon}重测</button>
    <button type="button" className="pro-btn pro-btn--ghost" onClick={onSkip}>{skipIcon}跳过本项</button>
    {!minimal && <button type="button" className={`pro-btn pro-btn--ink ${hasEvaluation ? "is-complete" : ""}`} onClick={onScore}>
      <span className="pro-btn__icon" aria-hidden="true">{hasEvaluation ? checkIcon : <StarIcon filled />}</span>{hasEvaluation ? "已完成教师评价" : "教师星级评价"}
    </button>}
  </div>;
}

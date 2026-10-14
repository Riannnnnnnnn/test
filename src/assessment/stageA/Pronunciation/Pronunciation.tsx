import { SmartSpeechEvaluator } from "@/assessment/common/SmartSpeechEvaluator/SmartSpeechEvaluator";
import type { AssessmentModuleProps } from "@/assessment/types";
import { Card } from "@/components/ui";
import { useSiteContent } from "@/content/useSiteContent";
import type { XfyunIseResult } from "@/services/speech/xfyunIse";

export function Pronunciation({ onResultChange, result }: AssessmentModuleProps) {
  const { content } = useSiteContent();
  const module = content.modules.A1;
  const picture = module.imageUrl ? <div className="module-uploaded-image"><img src={module.imageUrl} alt={module.imageAlt} /></div> : <div className="picture-placeholder picture-placeholder--apple" role="img" aria-label={module.imageAlt}><span className="apple-leaf" /></div>;
  const saveEvaluation = (evaluation: XfyunIseResult) => onResultChange(evaluation.sessionId === "preview"
    ? { status: "running", startTime: result.startTime ?? new Date().toISOString(), autoScores: undefined, rawResult: { provider: "smart-preview", evaluatedAt: new Date().toISOString() } }
    : { status: "running", startTime: result.startTime ?? new Date().toISOString(), autoScores: { ...result.autoScores, pronunciationClarity: evaluation.totalScore }, rawResult: { ...result.rawResult, provider: "smart-speech", intelligentStars: evaluation.stars, speechSessionId: evaluation.sessionId, pronunciationScore: evaluation.pronunciationScore, fluencyScore: evaluation.fluencyScore, integrityScore: evaluation.integrityScore, evaluatedAt: new Date().toISOString() } });
  return <Card className="module-card pronunciation-card">
    <div className="pronunciation-card__question">
      <p className="eyebrow">{module.eyebrow}</p>
      <h2>{module.title}</h2>
      <p>{module.prompt}</p>
    </div>
    <div className="pronunciation-card__picture"><div className="pronunciation-card__art">{picture}</div><div className="pronunciation-card__word"><strong>{module.visualText || module.imageAlt}</strong></div></div>
    <div className="pronunciation-card__interaction"><SmartSpeechEvaluator featured referenceText={module.visualText || module.imageAlt} initialScore={result.autoScores?.pronunciationClarity} initialPreview={result.rawResult?.provider === "smart-preview"} dimensionRatings={result.teacherScores} onEvaluated={saveEvaluation} /></div>
  </Card>;
}

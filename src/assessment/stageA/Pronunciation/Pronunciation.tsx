import { SmartSpeechEvaluator } from "@/assessment/common/SmartSpeechEvaluator/SmartSpeechEvaluator";
import type { AssessmentModuleProps } from "@/assessment/types";
import { Card } from "@/components/ui";
import { useSiteContent } from "@/content/useSiteContent";
import type { XfyunIseResult } from "@/services/speech/xfyunIse";
import { scorePronunciation } from "@/services/scoring/pronunciation";
import { getCourseTasks } from "@/config/courseTasks";
import { TaskPicker } from "@/assessment/common/TaskPicker/TaskPicker";

export function Pronunciation({ onResultChange, result, stage, items, onSelectItem }: AssessmentModuleProps) {
  const { content } = useSiteContent();
  const module = content.modules.A1;
  const tasks = stage ? getCourseTasks(stage, "A1") : [];
  const task = tasks.find((item) => item.id === result.questionId);
  const selected = task ? { ...task, ...content.taskOverrides?.[task.id] } : undefined;
  const word = selected?.text ?? (module.visualText || module.imageAlt);
  const characters = Array.from(word);
  const configuredPinyin = module.secondaryText.trim().split(/\s+/).filter(Boolean);
  const fallbackPinyin = word === "苹果" ? ["píng", "guǒ"] : characters.map(() => "");
  const pinyin = configuredPinyin.length === characters.length ? configuredPinyin : fallbackPinyin;
  const imageUrl = selected?.image ?? module.imageUrl;
  const picture = imageUrl ? <div className="module-uploaded-image"><img src={imageUrl} alt={selected?.text ?? module.imageAlt} /></div> : <div className="picture-placeholder picture-placeholder--apple" role="img" aria-label={module.imageAlt}><span className="apple-leaf" /></div>;
  const saveEvaluation = (evaluation: XfyunIseResult) => {
    if (evaluation.sessionId === "preview") return onResultChange({ status: "running", startTime: result.startTime ?? new Date().toISOString(), autoScores: undefined, rawResult: { provider: "smart-preview", evaluatedAt: new Date().toISOString() } });
    const calibrated = stage ? scorePronunciation(evaluation, word) : undefined;
    return onResultChange({ status: "running", startTime: result.startTime ?? new Date().toISOString(), transcript: evaluation.transcript,
      autoScores: { ...result.autoScores, pronunciationClarity: calibrated?.pronunciationClarity ?? evaluation.totalScore, initialStrength: calibrated?.initialStrength ?? evaluation.pronunciationScore ?? evaluation.totalScore, vowelFullness: calibrated?.vowelFullness ?? evaluation.toneScore ?? evaluation.totalScore, finalClosure: calibrated?.finalClosure ?? evaluation.totalScore },
      rawResult: { ...result.rawResult, provider: "smart-speech", intelligentStars: calibrated?.stars ?? evaluation.stars, speechSessionId: evaluation.sessionId, transcript: evaluation.transcript, pronunciationScore: evaluation.pronunciationScore, toneScore: evaluation.toneScore, evaluatedAt: new Date().toISOString() } });
  };
  const resetEvaluation = () => onResultChange({ status: "running", autoScores: undefined, teacherScores: undefined, transcript: undefined, rawResult: undefined });
  return <Card className={`module-card pronunciation-card ${selected ? "course-pronunciation" : ""}`}>
    <div className="pronunciation-card__question">
      {selected ? <TaskPicker tasks={tasks} selectedId={selected.id} items={items} onSelect={onSelectItem} initials={stage === "A"} /> : <><p className="eyebrow">{module.eyebrow}</p><h2>{module.title}</h2><p>{module.prompt}</p></>}
    </div>
    <div className={`pronunciation-card__picture ${stage === "B" ? "pronunciation-card__picture--sentence" : ""}`}>
      {stage !== "B" && <div className="pronunciation-card__art">{picture}</div>}
      <div className="pronunciation-card__word" aria-label={word}>
        {selected ? <strong className={stage === "B" ? "course-sentence" : "course-word"}>{word}</strong> : <div className="pronunciation-card__syllables">
          {characters.map((character, index) => <div className="pronunciation-card__syllable" key={`${character}-${index}`}>
            <span>{pinyin[index]}</span><strong>{character}</strong>
          </div>)}
        </div>}
      </div>
    </div>
    <div className="pronunciation-card__interaction"><SmartSpeechEvaluator featured strictRating={Boolean(stage)} sentence={stage === "B"} referenceText={word} initialScore={result.autoScores?.pronunciationClarity} initialPreview={result.rawResult?.provider === "smart-preview"} dimensionRatings={result.autoScores} onReset={resetEvaluation} onEvaluated={saveEvaluation} /></div>
  </Card>;
}

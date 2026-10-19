import { useEffect, useRef, useState } from "react";
import { SmartSpeechEvaluator, type SmartSpeechEvaluatorHandle } from "@/assessment/common/SmartSpeechEvaluator/SmartSpeechEvaluator";
import type { AssessmentModuleProps } from "@/assessment/types";
import { Button, Card, Dialog, StarRating } from "@/components/ui";
import { useSiteContent } from "@/content/useSiteContent";
import type { XfyunIseResult } from "@/services/speech/xfyunIse";
import { scorePronunciation } from "@/services/scoring/pronunciation";
import { getCourseTasks } from "@/config/courseTasks";
import { TaskPicker } from "@/assessment/common/TaskPicker/TaskPicker";

export function Pronunciation({ onResultChange, result, stage, studentGrade, items, onSelectItem }: AssessmentModuleProps) {
  const [feedback, setFeedback] = useState<{ kind: "correct" | "wrong" | "uncertain"; stars: number; nextId?: string; detail?: string }>();
  const evaluatorRef = useRef<SmartSpeechEvaluatorHandle>(null);
  const advanceTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);
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
  const closeFeedback = () => { window.clearTimeout(advanceTimer.current); setFeedback(undefined); };
  const advanceTo = async (id?: string) => { closeFeedback(); if (id) await onSelectItem?.(id); };
  const retryFromFeedback = () => { closeFeedback(); evaluatorRef.current?.retry(); };
  const saveEvaluation = async (evaluation: XfyunIseResult) => {
    if (evaluation.sessionId === "preview") return onResultChange({ status: "running", startTime: result.startTime ?? new Date().toISOString(), autoScores: undefined, rawResult: { provider: "smart-preview", evaluatedAt: new Date().toISOString() } });
    const calibrated = scorePronunciation(evaluation);
    await onResultChange({ status: "running", startTime: result.startTime ?? new Date().toISOString(), transcript: evaluation.transcript,
      autoScores: calibrated.scores,
      rawResult: { provider: "smart-speech", scoringVersion: "ise-evidence-v2", intelligentStars: calibrated.stars,
        speechSessionId: evaluation.sessionId, transcript: evaluation.transcript, referenceText: word,
        evidence: evaluation, evaluatedAt: new Date().toISOString() } });
    if (stage === "A" && selected) {
      const currentIndex = tasks.findIndex((task) => task.id === selected.id);
      const next = [...tasks.slice(currentIndex + 1), ...tasks.slice(0, currentIndex)].find((task) => {
        const item = items?.[task.id];
        return !item?.rawResult?.evidence && !Object.keys(item?.autoScores ?? {}).length && !Object.keys(item?.teacherScores ?? {}).length;
      });
      const correct = evaluation.contentStatus === "matched" && calibrated.stars > 0;
      const reason = evaluation.reviewReasons?.find((item) => /噪声|音量|截幅|音频输入|拒评|缺少准确度/.test(item));
      const detail = reason ? `评测提示：${reason}。` : evaluation.transcript?.trim()
        ? `语音听写参考：“${evaluation.transcript.trim()}”。${evaluation.contentStatus === "mismatch" ? "评测也检测到读音或错漏读问题。" : "听写与评测结果未能相互确认，不能据此判定孩子读错。"}`
        : "语音听写没有返回可用文字；这不代表孩子读错了。";
      setFeedback({ kind: correct ? "correct" : evaluation.contentStatus === "mismatch" ? "wrong" : "uncertain", stars: calibrated.stars, nextId: next?.id, detail });
      if (correct && next && onSelectItem) advanceTimer.current = window.setTimeout(() => { void advanceTo(next.id); }, 2200);
    }
  };
  const resetEvaluation = () => onResultChange({ status: "running", autoScores: undefined, teacherScores: undefined, transcript: undefined, rawResult: undefined });
  const initialLabel = stage === "A" && selected?.title.startsWith("声母 ") ? selected.title.replace("声母 ", "") : undefined;
  return <Card className={`pro-card pron ${stage === "B" ? "pron--sentence" : stage === "A" ? "pron--initials" : ""}`}>
    <div className="pron__picker">
      {selected ? <TaskPicker tasks={tasks} selectedId={selected.id} items={items} onSelect={onSelectItem} initials={stage === "A"} /> : <><p className="eyebrow">{module.eyebrow}</p><h2>{module.title}</h2><p>{module.prompt}</p></>}
    </div>
    <div className="pron__stage">
      {stage !== "B" && <div className="pron__art" key={`art-${selected?.id ?? "legacy"}`}><span className="pron__halo" aria-hidden="true" /><span className="pron__orbit" aria-hidden="true" />{picture}</div>}
      <div className="pron__word" aria-label={word} key={`word-${selected?.id ?? "legacy"}`}>
        {selected && <span className="pron__tag">{initialLabel ? <><em>目标声母</em><b>{initialLabel}</b></> : <em>{selected.title}</em>}</span>}
        {selected ? <strong className={stage === "B" ? "course-sentence" : "course-word"}>{word}</strong> : <div className="pronunciation-card__syllables">
          {characters.map((character, index) => <div className="pronunciation-card__syllable" key={`${character}-${index}`}>
            <span>{pinyin[index]}</span><strong>{character}</strong>
          </div>)}
        </div>}
      </div>
    </div>
    <div className="pron__console"><SmartSpeechEvaluator ref={evaluatorRef} studentGrade={studentGrade} evidence={result.rawResult?.evidence as XfyunIseResult | undefined} featured strictRating sentence={stage === "B"} referenceText={word} initialScore={result.autoScores?.pronunciationClarity} initialPreview={result.rawResult?.provider === "smart-preview"} dimensionRatings={result.autoScores} onReset={resetEvaluation} onEvaluated={saveEvaluation} /></div>
    <Dialog open={Boolean(feedback)} title={feedback?.kind === "correct" ? "读对啦！" : feedback?.kind === "wrong" ? "读音可能不对" : "这次没听清"} onClose={closeFeedback} footer={<div className="dialog-actions">{feedback?.kind === "correct" ? <Button onClick={() => void advanceTo(feedback.nextId)}>{feedback.nextId ? "立即下一题" : "完成本题"}</Button> : <><Button variant="secondary" onClick={retryFromFeedback}>再试一次</Button><Button onClick={() => void advanceTo(feedback?.nextId)}>跳过</Button></>}</div>}>
      {feedback?.kind === "correct" ? <div className="pron-result pron-result--correct"><span className="pron-result__badge">✨ 闯关成功</span><p><b>“{word}”</b>读得真棒！</p><div className="pron-result__star-card"><span>本题点亮</span><span className="pron-result__stars" aria-label={`${feedback.stars}颗星`}><StarRating value={feedback.stars} /></span><strong>{feedback.stars} / 5 星</strong></div><small>{feedback.nextId ? "马上出发，挑战下一题 →" : "本组题目已完成，真了不起！"}</small></div> : <div className="pron-result__hint"><p>{feedback?.kind === "wrong" ? `“${word}”的读音可能不对，可以再读一次；如果孩子已经读对，请老师确认。` : `系统没能确认“${word}”的读音，可以靠近麦克风再试一次。`}</p><small>{feedback?.detail}</small></div>}
    </Dialog>
  </Card>;
}

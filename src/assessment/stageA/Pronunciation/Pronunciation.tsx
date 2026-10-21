import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { SmartSpeechEvaluator, type SmartSpeechEvaluatorHandle } from "@/assessment/common/SmartSpeechEvaluator/SmartSpeechEvaluator";
import type { AssessmentModuleProps } from "@/assessment/types";
import { Button, Card, Dialog, StarRating } from "@/components/ui";
import { useSiteContent } from "@/content/useSiteContent";
import type { XfyunIseResult } from "@/services/speech/xfyunIse";
import { scorePronunciation } from "@/services/scoring/pronunciation";
import { getCourseTasks } from "@/config/courseTasks";
import { describeIssue, getPronunciationIssues, ISSUE_ACCURATE_ID } from "@/config/pronunciationIssues";
import { TaskPicker } from "@/assessment/common/TaskPicker/TaskPicker";

const AUTO_ADVANCE_MS = 2000;
const BURST_COLORS = ["#ffd44c", "#ff952b", "#ff7ab6", "#7ad7ff", "#9b6bff"];
/** 满星时向四周迸发的星屑（纯 CSS 动画，位置和延迟固定，避免每次渲染变化）。 */
const BURST = Array.from({ length: 14 }, (_, index) => {
  const angle = (index / 14) * Math.PI * 2 + (index % 2) * .2;
  const radius = 120 + (index % 3) * 34;
  return { "--x": `${Math.round(Math.cos(angle) * radius)}px`, "--y": `${Math.round(Math.sin(angle) * radius * .8)}px`, "--c": BURST_COLORS[index % BURST_COLORS.length], "--d": `${(index % 4) * 0.04}s`, "--r": `${index % 2 ? 220 : -220}deg` } as CSSProperties;
});

/** 题图周围缓缓闪烁的小星点（位置固定，避免重渲染时跳动）。 */
const SPARKLES = Array.from({ length: 9 }, (_, index) => ({ "--x": `${(index * 41 + 8) % 86 + 6}%`, "--y": `${(index * 29 + 12) % 78 + 8}%`, "--d": `${(index % 5) * -.8}s`, "--s": `${.6 + (index % 3) * .3}` } as CSSProperties));

export function Pronunciation({ onResultChange, result, stage, studentGrade, items, onSelectItem }: AssessmentModuleProps) {
  const [feedback, setFeedback] = useState<{ kind: "full" | "wrong" | "uncertain" | "sound-review" | "partial"; stars: number; nextId?: string; detail?: string }>();
  const [reasonStep, setReasonStep] = useState(false);
  /** 老师勾选的发音问题；大阶段另支持“本项准确”。 */
  const [issueIds, setIssueIds] = useState<string[]>([]);
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
  const closeFeedback = () => { window.clearTimeout(advanceTimer.current); setFeedback(undefined); setReasonStep(false); setIssueIds([]); };
  const issueSet = getPronunciationIssues(selected?.id);
  const toggleIssue = (id: string) => {
    if (id === ISSUE_ACCURATE_ID) { setIssueIds((current) => current.includes(id) ? [] : [id]); return; }
    setIssueIds((current) => { const rest = current.filter((item) => item !== ISSUE_ACCURATE_ID); return rest.includes(id) ? rest.filter((item) => item !== id) : [...rest, id]; });
  };
  const canConfirmSkip = issueIds.length > 0;
  const confirmSkip = async () => {
    if (!canConfirmSkip) return;
    const nextId = feedback?.nextId;
    // 保存勾选时的话术快照，报告直接引用，之后修改话术库不影响已完成的记录。
    const skipIssues = issueSet ? issueSet.options.filter((item) => issueIds.includes(item.id)).map((item) => ({ id: item.id, reading: item.reading, pattern: item.pattern, hint: item.hint, text: describeIssue(issueSet, item) })) : [];
    await onResultChange({ rawResult: { ...result.rawResult, skipped: true, skipIssues, skipAccurate: issueIds.includes(ISSUE_ACCURATE_ID), skippedStars: feedback?.stars ?? 0, skippedAt: new Date().toISOString() } });
    await advanceTo(nextId);
  };
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
    if (selected) {
      const currentIndex = tasks.findIndex((task) => task.id === selected.id);
      const next = [...tasks.slice(currentIndex + 1), ...tasks.slice(0, currentIndex)].find((task) => {
        const item = items?.[task.id];
        return !item?.rawResult?.evidence && !Object.keys(item?.autoScores ?? {}).length && !Object.keys(item?.teacherScores ?? {}).length;
      });
      // 没听清或读错一律 0 星；只有满星（5 星）才算通过并自动进入下一个字。
      const matched = evaluation.contentStatus === "matched";
      const stars = matched ? calibrated.stars : 0;
      const full = matched && stars >= 5;
      const reason = evaluation.reviewReasons?.find((item) => /噪声|音量|截幅|音频输入|拒评|缺少准确度/.test(item));
      const weakInitial = evaluation.contentStatus === "uncertain" ? evaluation.initialConfidenceWarnings?.[0] : undefined;
      const detail = weakInitial ? `“${weakInitial.text}”的声母${weakInitial.sound ? `“${weakInitial.sound}”` : ""}暂时无法确认；这不代表孩子一定读错。请再读一次或请老师听录音确认。` : reason ? `评测提示：${reason}。` : evaluation.transcript?.trim()
        ? `语音听写参考：“${evaluation.transcript.trim()}”。${evaluation.contentStatus === "mismatch" ? "评测也检测到读音或错漏读问题。" : "听写与评测结果未能相互确认，不能据此判定孩子读错。"}`
        : "语音听写没有返回可用文字；这不代表孩子读错了。";
      setReasonStep(false); setIssueIds([]);
      setFeedback({ kind: full ? "full" : matched && stars > 0 ? "partial" : evaluation.contentStatus === "mismatch" ? "wrong" : weakInitial ? "sound-review" : "uncertain", stars, nextId: next?.id, detail });
      if (full && next && onSelectItem) advanceTimer.current = window.setTimeout(() => { void advanceTo(next.id); }, AUTO_ADVANCE_MS);
    }
  };
  const resetEvaluation = () => onResultChange({ status: "running", autoScores: undefined, teacherScores: undefined, transcript: undefined, rawResult: undefined });
  const initialLabel = stage === "A" && selected?.title.startsWith("声母 ") ? selected.title.replace("声母 ", "") : undefined;
  return <Card className={`pro-card pron ${stage === "B" ? "pron--sentence" : stage === "A" ? "pron--initials" : ""}`}>
    <div className="pron__picker">
      {selected ? <TaskPicker tasks={tasks} selectedId={selected.id} items={items} onSelect={onSelectItem} initials={stage === "A"} /> : <><p className="eyebrow">{module.eyebrow}</p><h2>{module.title}</h2><p>{module.prompt}</p></>}
    </div>
    <div className="pron__stage">
      {stage !== "B" && <div className="pron__art" key={`art-${selected?.id ?? "legacy"}`}><span className="pron__halo" aria-hidden="true" /><span className="pron__orbit" aria-hidden="true" /><span className="pron__sparkles" aria-hidden="true">{SPARKLES.map((item, index) => <i key={index} style={item} />)}</span>{picture}</div>}
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
    <Dialog open={Boolean(feedback)} className={reasonStep ? "dialog-backdrop--pron-skip" : undefined} title={reasonStep ? "孩子哪里还可以更好？" : feedback?.kind === "full" ? "读对啦！" : feedback?.kind === "partial" ? `${feedback.stars} 颗星，再努力一下` : feedback?.kind === "wrong" ? "读音可能不对" : feedback?.kind === "sound-review" ? "声母需要再确认" : "这次没听清"} onClose={closeFeedback}
      footer={<div className="dialog-actions">{reasonStep
        ? <><Button variant="secondary" onClick={() => setReasonStep(false)}>返回</Button><Button disabled={!canConfirmSkip} onClick={() => void confirmSkip()}>确认，下一个字</Button></>
        : feedback?.kind === "full"
          ? <Button onClick={() => void advanceTo(feedback.nextId)}>{feedback.nextId ? (stage === "B" ? "立即下一句" : "立即下一个字") : "完成本题"}</Button>
          : <><Button variant="secondary" onClick={retryFromFeedback}>再试一次</Button><Button onClick={() => { setIssueIds([]); setReasonStep(true); }}>跳过</Button></>}</div>}>
      {reasonStep ? <div className={`skip-reasons ${stage === "A" ? "skip-reasons--word" : ""}`}>
        {issueSet && <><p>{stage === "B" ? "孩子这句读得怎么样？请老师勾选：" : `“${issueSet.word}”哪些发音还可以练习？可多选：`}</p>
          <div className="skip-reasons__list" role="group" aria-label={stage === "A" ? "发音问题，可多选" : "孩子的实际读法"}>{issueSet.options.map((item) => <button type="button" key={item.id} className={`skip-reasons__item ${issueIds.includes(item.id) ? "is-selected" : ""}`} aria-pressed={issueIds.includes(item.id)} onClick={() => toggleIssue(item.id)}>
            <i aria-hidden="true">{issueIds.includes(item.id) ? "✓" : ""}</i>{item.sentence ? <span><b>出现混淆</b><small>{item.reading}</small></span> : stage === "A" ? <span><b>{item.reading}</b></span> : <span><b>读成“{item.reading}”<em className="skip-reasons__pattern">{item.pattern}</em></b><small>{item.hint}</small></span>}</button>)}
            {stage !== "A" && <button type="button" className={`skip-reasons__item skip-reasons__item--ok ${issueIds.includes(ISSUE_ACCURATE_ID) ? "is-selected" : ""}`} aria-pressed={issueIds.includes(ISSUE_ACCURATE_ID)} onClick={() => toggleIssue(ISSUE_ACCURATE_ID)}>
              <i aria-hidden="true">{issueIds.includes(ISSUE_ACCURATE_ID) ? "✓" : ""}</i><span><b>本项准确</b><small>老师听下来孩子读得基本准确</small></span></button>}</div></>}
        <small className="skip-reasons__tip">{canConfirmSkip ? `已选 ${issueIds.length} 项` : "请至少选择一项"}</small></div>
      : feedback?.kind === "full" ? <div className="pron-result pron-result--correct"><span className="pron-burst" aria-hidden="true">{BURST.map((item, index) => <i key={index} style={item} />)}</span><span className="pron-result__badge">✨ 闯关成功</span><p><b>“{word}”</b>读得真棒！</p><div className="pron-result__star-card"><span>本题点亮</span><span className="pron-result__stars" aria-label="5颗星"><StarRating value={5} /></span><strong>5 / 5 星</strong></div>{feedback.nextId && <div className="pron-result__timer" aria-hidden="true"><i style={{ animationDuration: `${AUTO_ADVANCE_MS}ms` }} /></div>}<small>{feedback.nextId ? (stage === "B" ? "马上自动进入下一句 →" : "马上自动进入下一个字 →") : "本组题目已完成，真了不起！"}</small></div>
      : <div className="pron-result__hint"><div className="pron-result pron-result--retry"><div className="pron-result__star-card pron-result__star-card--soft"><span className="pron-result__stars" aria-label={`${feedback?.stars ?? 0}颗星`}><StarRating value={feedback?.stars ?? 0} inactiveGradient /></span><strong>{feedback?.stars ?? 0} / 5 星</strong></div></div>
        <p>{feedback?.kind === "partial" ? `“${word}”还没有拿到满星，可以再试一次；也可以先跳过。` : feedback?.kind === "wrong" ? `“${word}”的读音可能不对，可以再读一次；如果孩子已经读对，请老师确认。` : feedback?.kind === "sound-review" ? `“${word}”的声母需要再确认，可以清楚地重读一次。` : `系统没能确认“${word}”的读音，可以靠近麦克风再试一次。`}</p><small>{feedback?.detail}</small></div>}
    </Dialog>
  </Card>;
}

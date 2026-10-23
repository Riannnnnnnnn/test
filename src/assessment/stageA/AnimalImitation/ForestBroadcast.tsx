import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui";
import type { AssessmentModuleProps } from "@/assessment/types";
import { largeExpressionTask, type CourseTask } from "@/config/courseTasks";
import { forestReviewOptions, forestSentenceReviews, type ForestSentenceReview } from "@/config/forestBroadcastReviews";
import "./forest-broadcast.css";

const SCENES = [
  { file: "rain-start", description: "发现下雨，小兔子和松鼠着急跑向小屋", cue: "哎呀，下雨了！快提醒大家！" },
  { file: "rainy", description: "小兔子和松鼠来到小屋门口躲雨", cue: "快来小屋里，一起躲雨！" },
  { file: "sunny", description: "雨停放晴，小兔子和松鼠开心招手", cue: "雨停了！开心地告诉大家吧！" },
  { file: "rainbow-play", description: "小兔子和松鼠走出来，一起看彩虹", cue: "快出来玩吧！一起看彩虹！" },
];

export function ForestBroadcast({ selected, result, onResultChange }: Pick<AssessmentModuleProps, "result" | "onResultChange"> & { selected: CourseTask }) {
  const sentences = largeExpressionTask.examples!.map((fallback, i) => selected.examples?.[i]?.trim() || fallback);
  const reviews = forestSentenceReviews(result);
  const completed = reviews.findIndex((review) => !review) < 0 ? 4 : reviews.findIndex((review) => !review);
  const [step, setStep] = useState(Math.min(completed, 3));
  const [reviewOpen, setReviewOpen] = useState(false);
  const [choices, setChoices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (reviewOpen) dialog.current?.showModal(); else dialog.current?.close(); }, [reviewOpen]);
  const sunny = step >= 2;
  const done = completed === 4;
  function selectStep(index: number) {
    setStep(index);
  }
  function openReview() {
    setChoices(reviews[step]?.labels ?? []);
    setError("");
    setReviewOpen(true);
  }
  function toggleChoice(label: string) {
    setChoices((current) => {
      if (current.includes(label)) return current.filter((value) => value !== label);
      return label === "有待提升" ? [label] : [...current.filter((value) => value !== "有待提升"), label];
    });
  }
  async function saveReview() {
    if (saving || !choices.length) return;
    setSaving(true); setError("");
    try {
      const nextReviews: Array<ForestSentenceReview | undefined> = [...reviews];
      nextReviews[step] = { labels: choices, sentence: sentences[step], reviewedAt: new Date().toISOString() };
      const allReviewed = nextReviews.every(Boolean);
      const forestBroadcast = { reviews: nextReviews, completed: nextReviews.filter(Boolean).length, sentences, updatedAt: new Date().toISOString() };
      await onResultChange({ status: allReviewed ? "completed" : "running", rawResult: { ...result.rawResult, forestBroadcast },
        teacherScores: allReviewed ? { performance: Math.round(nextReviews.reduce((sum, review) => sum + (review?.labels.filter((label) => label !== "有待提升").length ?? 0) / 3, 0) / 4 * 100) } : undefined });
      setReviewOpen(false);
      if (step === completed && step < 3) setStep(step + 1);
    } catch { setError("评价暂未保存成功，请再试一次。"); }
    finally { setSaving(false); }
  }
  return <Card className={`pro-card forest ${sunny ? "forest--sunny" : "forest--rainy"}`}>
    <header className="forest__header"><h2>{selected.title}</h2><details className="forest__instructions"><summary>任务说明</summary><p>{selected.text}</p></details></header>
    <div className="forest__layout">
      <section className="forest__scene" aria-label={SCENES[step].description}>
        {SCENES.map((scene, index) => <img key={scene.file} className={`forest__art ${step === index ? "is-visible" : ""}`} src={`/assets/v3/forest/${scene.file}.webp`} alt="" aria-hidden="true" />)}
        <div className="forest__rain" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: `${i * 6}%`, animationDelay: `${i % 5 * -.3}s` }} />)}</div>
      </section>
      <section className="forest__reading">
        <nav className="forest__steps" aria-label="四句广播">{sentences.map((_, i) => <button key={i} disabled={saving || i > completed} aria-label={`第 ${i + 1} 句${reviews[i] ? "，已评价" : ""}`} aria-current={step === i ? "step" : undefined} onClick={() => selectStep(i)}>{reviews[i] ? "✓" : i + 1}</button>)}</nav>
        <div className="forest__tone"><span className="forest__speech-icon" aria-hidden="true">{sunny ? "☀" : "☂"}</span><strong>{sunny ? "开心地说" : "着急地说"}</strong></div>
        <p className="forest__sentence" key={step}>{sentences[step]}</p>
        {error && <p role="alert">{error}</p>}
        <button className="pro-btn pro-btn--primary" disabled={saving} onClick={openReview}>{reviews[step] ? "查看或修改本句评价" : "这句读完了 · 请老师评价"}</button>
        {done && <small className="forest__teacher-note" role="status">四句均已评价，可以点击下方“完成评测”。</small>}
      </section>
    </div>
    <dialog ref={dialog} className="forest-review-dialog" aria-labelledby="forest-review-title" onCancel={(event) => { event.preventDefault(); if (!saving) setReviewOpen(false); }}>
      <h2 id="forest-review-title">老师评价 · 第 {step + 1} 句</h2>
      <p className="forest-review-dialog__sentence">{sentences[step]}</p>
      <p>请选择孩子这句的表现，可多选，至少选一项。</p>
      <div className="forest-review-dialog__options" role="group" aria-label="本句教师评价">{forestReviewOptions[step].map((label) => <label key={label}><input type="checkbox" checked={choices.includes(label)} disabled={saving} onChange={() => toggleChoice(label)} /><span>{label}</span></label>)}</div>
      {error && <p role="alert">{error}</p>}
      <div className="forest-review-dialog__actions"><button className="pro-btn pro-btn--ghost" disabled={saving} onClick={() => setReviewOpen(false)}>返回</button><button className="pro-btn pro-btn--primary" disabled={saving || !choices.length} onClick={() => void saveReview()}>{saving ? "保存中…" : step === completed && step < 3 ? "保存评价，下一句" : "保存本句评价"}</button></div>
    </dialog>
  </Card>;
}

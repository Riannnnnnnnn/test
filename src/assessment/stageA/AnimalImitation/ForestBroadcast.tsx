import { useState } from "react";
import { Card } from "@/components/ui";
import type { AssessmentModuleProps } from "@/assessment/types";
import { largeExpressionTask, type CourseTask } from "@/config/courseTasks";
import "./forest-broadcast.css";

const SCENES = [
  { file: "rain-start", description: "发现下雨，小兔子和松鼠着急跑向小屋", cue: "哎呀，下雨了！快提醒大家！" },
  { file: "rainy", description: "小兔子和松鼠来到小屋门口躲雨", cue: "快来小屋里，一起躲雨！" },
  { file: "sunny", description: "雨停放晴，小兔子和松鼠开心招手", cue: "雨停了！开心地告诉大家吧！" },
  { file: "rainbow-play", description: "小兔子和松鼠走出来，一起看彩虹", cue: "快出来玩吧！一起看彩虹！" },
];

export function ForestBroadcast({ selected, result, onResultChange }: Pick<AssessmentModuleProps, "result" | "onResultChange"> & { selected: CourseTask }) {
  const sentences = largeExpressionTask.examples!.map((fallback, i) => selected.examples?.[i]?.trim() || fallback);
  const saved = result.rawResult?.forestBroadcast as { completed?: number; sentences?: string[] } | undefined;
  const completed = Math.max(0, Math.min(4, Number(saved?.completed) || 0));
  const [step, setStep] = useState(Math.min(completed, 3));
  const [showCompletion, setShowCompletion] = useState(completed === 4);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const sunny = step >= 2;
  const done = showCompletion && completed === 4;
  function selectStep(index: number) {
    setStep(index);
    setShowCompletion(false);
  }
  async function advance() {
    if (saving) return;
    setSaving(true); setError("");
    try {
      await onResultChange({ status: "running", rawResult: { ...result.rawResult,
        forestBroadcast: { completed: Math.max(completed, step + 1), sentences, updatedAt: new Date().toISOString() } } });
      setStep(Math.min(3, step + 1));
      setShowCompletion(step === 3);
    } catch { setError("进度暂未保存成功，请再点一次。"); }
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
        <nav className="forest__steps" aria-label="四句广播">{sentences.map((_, i) => <button key={i} disabled={saving || i > completed} aria-label={`第 ${i + 1} 句`} aria-current={step === i ? "step" : undefined} onClick={() => selectStep(i)}>{i < completed ? "✓" : i + 1}</button>)}</nav>
        <div className="forest__tone"><span className="forest__speech-icon" aria-hidden="true">{sunny ? "☀" : "☂"}</span><strong>{sunny ? "开心地说" : "着急地说"}</strong></div>
        <p className="forest__sentence" key={step}>{sentences[step]}</p>
        {error && <p role="alert">{error}</p>}
        <button className="pro-btn pro-btn--primary" disabled={saving} onClick={() => done && step === 3 ? selectStep(0) : void advance()}>{saving ? "保存中…" : done && step === 3 ? "再播一遍" : step === 3 ? "完成广播 ✓" : "这句读完了 →"}</button>
        {done && <small className="forest__teacher-note" role="status">广播完成！请老师进行下方的星级评价。</small>}
      </section>
    </div>
  </Card>;
}

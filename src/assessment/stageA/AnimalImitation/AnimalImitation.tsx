import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { ModuleShell } from "@/assessment/common/ModuleShell/ModuleShell";
import { useSiteContent } from "@/content/useSiteContent";
import { Card } from "@/components/ui";
import type { AssessmentModuleProps } from "@/assessment/types";
import { getCourseTasks, getCourseTaskImage, type CourseTask } from "@/config/courseTasks";
import { expressionReviewLabels, expressionReviewOptions, isExpressionReviewed } from "@/config/expressionReviews";
import { ForestBroadcast } from "./ForestBroadcast";

/** 计时不判断模仿质量；逐个保存老师的观察后才进入下一表情。 */
const COUNTDOWN_SECONDS = 3;
const HOLD_MS = 3000;
// 素材约 1.46 秒；最后一声快门在 1.04 秒左右，闪光对准这一声。
const SHUTTER_FLASH_DELAY_MS = 1050;
const TICK_MS = 100;

type Mood = "happy" | "sad" | "shy" | "angry";
type Phase = "idle" | "counting" | "preparing" | "holding" | "done";

const MOODS: Record<Mood, { color: string; soft: string; deep: string }> = {
  happy: { color: "#ffb81f", soft: "#fff1bd", deep: "#8a5200" },
  sad: { color: "#5b8def", soft: "#dce8ff", deep: "#24479a" },
  shy: { color: "#ff7ab6", soft: "#ffe0ee", deep: "#a02f68" },
  angry: { color: "#ff6a4d", soft: "#ffe1da", deep: "#a02a12" },
};

const moodOf = (id: string): Mood | undefined => {
  const key = id.replace(/^A5-/, "") as Mood;
  return key in MOODS ? key : undefined;
};

/** 背景飘浮的小粒子（位置和节奏固定，避免每次渲染变化）。 */
const FX = Array.from({ length: 12 }, (_, index) => ({
  "--l": `${(index * 37 + 9) % 88 + 6}%`, "--d": `${(index % 6) * -0.75}s`, "--t": `${4.4 + (index % 4) * .9}s`, "--s": `${.7 + (index % 3) * .28}`, "--w": `${index % 2 ? 1 : -1}`,
} as CSSProperties));
const CONFETTI_COLORS = ["#ffd44c", "#ff952b", "#ff7ab6", "#7ad7ff", "#9b6bff"];
const BURST = Array.from({ length: 16 }, (_, index) => {
  const angle = (index / 16) * Math.PI * 2 + (index % 2) * .18;
  const radius = 130 + (index % 3) * 36;
  return { "--x": `${Math.round(Math.cos(angle) * radius)}px`, "--y": `${Math.round(Math.sin(angle) * radius * .8)}px`, "--c": CONFETTI_COLORS[index % 5], "--d": `${(index % 4) * .04}s`, "--r": `${index % 2 ? 220 : -220}deg` } as CSSProperties;
});

function EmotionStage({ tasks, selected, studentGender, onSelectItem, items, result, onResultChange }: Pick<AssessmentModuleProps, "studentGender" | "onSelectItem" | "items" | "result" | "onResultChange"> & { tasks: CourseTask[]; selected: CourseTask }) {
  const mood = moodOf(selected.id) ?? "happy";
  const palette = MOODS[mood];
  const image = getCourseTaskImage(selected, studentGender);
  const girl = studentGender === "female";
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const [held, setHeld] = useState(0);
  const finished = tasks.filter((task) => isExpressionReviewed(items?.[task.id])).map((task) => task.id);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [choices, setChoices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const reviewDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (reviewOpen) reviewDialog.current?.showModal(); else reviewDialog.current?.close(); }, [reviewOpen]);
  const timer = useRef(0);
  const soundContext = useRef<AudioContext | null>(null);
  const shutterBuffer = useRef<AudioBuffer | null>(null);
  const shutterLoadFailed = useRef(false);
  const shutterLoad = useRef<Promise<void> | null>(null);
  const shutterStartedAt = useRef<number | null>(null);
  const activeSounds = useRef(new Set<AudioScheduledSourceNode>());
  const soundRun = useRef(0);
  const lastCue = useRef(0);
  const stop = () => window.clearInterval(timer.current);
  const stopSounds = () => {
    soundRun.current += 1;
    for (const sound of activeSounds.current) { try { sound.stop(); } catch { /* 已结束的短音无需再停止 */ } }
    activeSounds.current.clear();
  };
  const playTone = (frequency: number, duration: number, delay = 0, peak = 0.055) => {
    const context = soundContext.current;
    if (!context) return;
    const startAt = context.currentTime + delay;
    const sound = context.createOscillator();
    const volume = context.createGain();
    sound.type = "sine";
    sound.frequency.setValueAtTime(frequency, startAt);
    volume.gain.setValueAtTime(0.0001, startAt);
    volume.gain.exponentialRampToValueAtTime(peak, startAt + 0.025);
    volume.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    sound.connect(volume).connect(context.destination);
    sound.onended = () => { activeSounds.current.delete(sound); sound.disconnect(); volume.disconnect(); };
    activeSounds.current.add(sound);
    sound.start(startAt);
    sound.stop(startAt + duration + 0.01);
  };
  const playCountdownCue = (number: number) => playTone(({ 3: 523.25, 2: 659.25, 1: 783.99 } as Record<number, number>)[number], 0.18);
  const playFinishCue = () => {
    playTone(523.25, 0.28, 0, 0.04);
    playTone(659.25, 0.38, 0.18, 0.035);
  };
  const playShutterCue = () => {
    const context = soundContext.current;
    if (!context || !shutterBuffer.current) return;
    const shutter = context.createBufferSource();
    const volume = context.createGain();
    shutter.buffer = shutterBuffer.current;
    volume.gain.value = 0.8;
    shutter.connect(volume).connect(context.destination);
    shutter.onended = () => { activeSounds.current.delete(shutter); shutter.disconnect(); volume.disconnect(); };
    activeSounds.current.add(shutter);
    shutter.start();
  };
  const prepareShutterCue = (context: AudioContext) => {
    shutterLoad.current ??= fetch("/assets/v3/audio/camera-shutter.mp3")
      .then((response) => { if (!response.ok) throw new Error("快门音效加载失败"); return response.arrayBuffer(); })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => { shutterBuffer.current = buffer; })
      .catch(() => { shutterLoadFailed.current = true; });
  };

  // 换题或离开页面时，清掉进行中的倒计时。
  useEffect(() => { stop(); stopSounds(); setPhase("idle"); setCount(COUNTDOWN_SECONDS); setHeld(0); return () => { stop(); stopSounds(); }; }, [selected.id]);
  useEffect(() => () => { void soundContext.current?.close(); }, []);

  const start = () => {
    stop(); stopSounds(); shutterStartedAt.current = null;
    const run = soundRun.current;
    try {
      soundContext.current ??= new AudioContext();
      prepareShutterCue(soundContext.current);
      if (soundContext.current.state === "running") playCountdownCue(COUNTDOWN_SECONDS);
      else void soundContext.current.resume().then(() => { if (soundRun.current === run) playCountdownCue(COUNTDOWN_SECONDS); }).catch(() => undefined);
    } catch { /* 不支持声音时仍可使用视觉倒计时 */ }
    setPhase("counting"); setCount(COUNTDOWN_SECONDS); setHeld(0);
    lastCue.current = COUNTDOWN_SECONDS;
    let elapsed = 0;
    timer.current = window.setInterval(() => {
      elapsed += TICK_MS;
      const counting = COUNTDOWN_SECONDS * 1000;
      if (elapsed < counting) {
        const remaining = Math.ceil((counting - elapsed) / 1000);
        if (remaining !== lastCue.current) { lastCue.current = remaining; playCountdownCue(remaining); }
        setCount(remaining);
        return;
      }
      if (shutterStartedAt.current === null) {
        if (shutterBuffer.current || shutterLoadFailed.current || elapsed >= counting + 2000) {
          playShutterCue();
          shutterStartedAt.current = elapsed;
        }
        setCount(0); setPhase("preparing"); return;
      }
      const holding = elapsed - shutterStartedAt.current - SHUTTER_FLASH_DELAY_MS;
      if (holding < 0) { setPhase("preparing"); return; }
      if (holding < HOLD_MS) {
        setPhase("holding"); setHeld(holding / HOLD_MS); return;
      }
      stop(); playFinishCue(); setHeld(1);
      // 完成提示音约 0.57 秒；响完才开放“完成”。
      timer.current = window.setTimeout(() => setPhase("done"), 600);
    }, TICK_MS);
  };
  const cancel = () => { stop(); stopSounds(); shutterStartedAt.current = null; setPhase("idle"); setCount(COUNTDOWN_SECONDS); setHeld(0); };

  const index = tasks.findIndex((task) => task.id === selected.id);
  const next = [...tasks.slice(index + 1), ...tasks.slice(0, index)].find((task) => !finished.includes(task.id));
  const doneCount = finished.length;
  const secondsLeft = Math.max(0, Math.ceil(HOLD_MS / 1000 * (1 - held)));

  const headline = phase === "counting" ? `${count} 秒后开始，准备好` : phase === "preparing" ? "准备拍照，做好表情！" : phase === "holding" ? "保持住，别动！" : phase === "done" ? "跟做完成，请老师评价" : "";
  const running = phase === "counting" || phase === "preparing" || phase === "holding";
  const firstPending = tasks.find((task) => !finished.includes(task.id));
  const openReview = () => { setChoices(expressionReviewLabels(result)); setSaveError(""); setReviewOpen(true); };
  const saveReview = async () => {
    if (saving || !choices.length) return;
    setSaving(true); setSaveError("");
    try {
      await onResultChange({ status: "completed", duration: 3, endTime: new Date().toISOString(),
        rawResult: { ...result.rawResult, expressionReview: { labels: choices, reviewedAt: new Date().toISOString() } } });
      setReviewOpen(false);
      if (next) await onSelectItem?.(next.id);
    } catch { setSaveError("评价暂未保存成功，请再试一次。"); }
    finally { setSaving(false); }
  };
  const style = { "--mood": palette.color, "--mood-soft": palette.soft, "--mood-deep": palette.deep, "--held": held } as CSSProperties;

  return <Card className={`pro-card expr expr--review expr--${mood} is-${phase}`} style={style}>
    <aside className="expr__picker">
      <div className="course-task-picker">
        <p><span className="course-task-picker__title">表情</span>
          <span className="course-task-picker__meter" aria-hidden="true"><i style={{ width: `${tasks.length ? doneCount / tasks.length * 100 : 0}%` }} /></span>
          <small>已评价 <b>{doneCount}</b> / {tasks.length}</small></p>
      </div>
      <div className="expr__moods" role="group" aria-label="选择表情">
        {tasks.map((task) => {
          const key = moodOf(task.id) ?? "happy";
          const thumb = getCourseTaskImage(task, studentGender);
          const isDone = finished.includes(task.id);
          return <button type="button" key={task.id} className={`expr__mood expr__mood--${key} ${task.id === selected.id ? "is-selected" : ""} ${isDone ? "is-done" : ""}`} aria-pressed={task.id === selected.id} aria-label={`${task.title}${isDone ? "，已模仿" : ""}`}
            disabled={running || saving || (!isDone && task.id !== firstPending?.id)}
            style={{ "--mood": MOODS[key].color, "--mood-soft": MOODS[key].soft, "--mood-deep": MOODS[key].deep } as CSSProperties} onClick={() => onSelectItem?.(task.id)}>
            <span className="expr__thumb">{thumb && <img src={thumb} alt="" />}</span>
            <b>{task.title}</b>
            <i aria-hidden="true">{isDone ? "✓" : ""}</i>
          </button>;
        })}
      </div>
    </aside>

    <section className="expr__stage" key={`stage-${selected.id}`}>
      <div className={`expr__portrait ${girl ? "is-girl" : "is-boy"}`}>
        <span className="expr__fx" aria-hidden="true">{FX.map((item, i) => <i key={i} style={item} />)}</span>
        <span className="expr__glow" aria-hidden="true" />
        {image && <img className="expr__figure" src={image} alt={`${girl ? "女孩" : "男孩"}${selected.title}的半身像`} />}
        <svg className="expr__ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="1.5" y="1.5" width="97" height="97" rx="12" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - held * 100} vectorEffect="non-scaling-stroke" /></svg>
        {phase === "counting" && <span className="expr__count" key={count} aria-hidden="true">{count}</span>}
        {phase === "holding" && <span className="expr__shutter" aria-hidden="true"><i /><i /><b /></span>}
        {phase === "done" && <span className="expr__burst" aria-hidden="true">{BURST.map((item, i) => <i key={i} style={item} />)}</span>}
      </div>
      <div className="expr__actions">
        {phase !== "idle" && <p role="status">{headline}{phase === "holding" && held < 1 ? `（${secondsLeft} 秒）` : ""}</p>}
        {running ? <button className="pro-btn pro-btn--ghost" onClick={cancel}>取消跟做</button> : <>
          <button className="pro-btn pro-btn--primary" aria-label="开始跟做表情" onClick={start}>{phase === "done" ? "再做一次" : "开始跟做"}</button>
          {(phase === "done" || finished.includes(selected.id)) && <button className="pro-btn pro-btn--primary" onClick={openReview}>{phase === "done" ? "完成" : "查看评价"}</button>}
        </>}
      </div>
    </section>

    <dialog ref={reviewDialog} className="expr-review-dialog" onCancel={(event) => { event.preventDefault(); if (!saving) setReviewOpen(false); }}>
      <h2>老师评价：{selected.title}</h2>
      <p>请选择孩子的表现，可多选。</p>
      <div className="expr-review-options">
        {(expressionReviewOptions[selected.id] ?? []).map((label) => <label key={label}>
          <input type="checkbox" checked={choices.includes(label)} disabled={saving} onChange={() => setChoices((current) => current.includes(label) ? current.filter((value) => value !== label) : [...current, label])} />
          <span>{label}</span>
        </label>)}
      </div>
      {saveError && <p role="alert">{saveError}</p>}
      <div className="expr__actions">
        <button className="pro-btn pro-btn--ghost" disabled={saving} onClick={() => setReviewOpen(false)}>返回</button>
        <button className="pro-btn pro-btn--primary" disabled={saving || choices.length === 0} onClick={() => void saveReview()}>{saving ? "保存中…" : next ? "保存评价，下一个表情" : "保存评价"}</button>
      </div>
    </dialog>
  </Card>;
}


export function AnimalImitation({ stage, studentGender, result, items, onSelectItem, onResultChange }: AssessmentModuleProps) {
  const { content } = useSiteContent();
  const module = content.modules.A5;
  const tasks = (stage ? getCourseTasks(stage, "A5") : []).map((item) => ({ ...item, ...content.taskOverrides?.[item.id] }));
  const selected = tasks.find((item) => item.id === result.questionId);
  if (selected) return stage === "B" ? <ForestBroadcast selected={selected} result={result} onResultChange={onResultChange} /> : <EmotionStage tasks={tasks} selected={selected} studentGender={studentGender} onSelectItem={onSelectItem} items={items} result={result} onResultChange={onResultChange} />;
  const visual = module.imageUrl ? <div className="module-uploaded-image"><img src={module.imageUrl} alt={module.imageAlt} /></div> : <div className="picture-placeholder picture-placeholder--tiger"><span className="tiger-ear tiger-ear--left" /><span className="tiger-ear tiger-ear--right" />{module.visualText}</div>;
  return <ModuleShell className="module-card--character module-card--animal" visualClassName="module-card__visual--character" eyebrow={module.eyebrow} title={module.title} prompt={module.prompt} visual={visual}>{module.teacherNote && <p className="task-note">{module.teacherNote}</p>}</ModuleShell>;
}

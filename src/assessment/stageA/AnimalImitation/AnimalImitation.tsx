import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { ModuleShell } from "@/assessment/common/ModuleShell/ModuleShell";
import { useSiteContent } from "@/content/useSiteContent";
import { Card } from "@/components/ui";
import type { AssessmentModuleProps } from "@/assessment/types";
import { getCourseTasks, getCourseTaskImage, type CourseTask } from "@/config/courseTasks";

/** 表情模仿只做“看图—跟做—保持”的陪伴式演示，不录音、不改动评分数据；星级仍由老师在底部评分。 */
const COUNTDOWN_SECONDS = 3;
const HOLD_MS = 5000;
const TICK_MS = 100;

type Mood = "happy" | "sad" | "shy" | "angry";
type Phase = "idle" | "counting" | "holding" | "done";

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
const RAIN = Array.from({ length: 16 }, (_, index) => ({ "--l": `${(index * 29 + 5) % 94 + 3}%`, "--d": `${(index % 7) * -.45}s`, "--t": `${1.5 + (index % 4) * .35}s` } as CSSProperties));

function SmileIcon() {
  return <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.2" /><path d="M8.2 14.2c1 1.6 2.3 2.4 3.8 2.4s2.8-.8 3.8-2.4" /><path d="M9 9.6v.6M15 9.6v.6" strokeWidth="2.8" /></svg>;
}
function ReplayIcon() {
  return <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4.5v4.2h-4.2" /></svg>;
}

function EmotionStage({ tasks, selected, studentGender, onSelectItem }: { tasks: CourseTask[]; selected: CourseTask; studentGender?: string; onSelectItem?: (id: string) => void | Promise<void> }) {
  const mood = moodOf(selected.id) ?? "happy";
  const palette = MOODS[mood];
  const image = getCourseTaskImage(selected, studentGender);
  const girl = studentGender === "female";
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const [held, setHeld] = useState(0);
  const [finished, setFinished] = useState<string[]>([]);
  const timer = useRef(0);
  const stop = () => window.clearInterval(timer.current);

  // 换题或离开页面时，清掉进行中的倒计时。
  useEffect(() => { stop(); setPhase("idle"); setCount(COUNTDOWN_SECONDS); setHeld(0); return stop; }, [selected.id]);

  const start = () => {
    stop();
    setPhase("counting"); setCount(COUNTDOWN_SECONDS); setHeld(0);
    let elapsed = 0;
    timer.current = window.setInterval(() => {
      elapsed += TICK_MS;
      const counting = COUNTDOWN_SECONDS * 1000;
      if (elapsed < counting) { setCount(Math.ceil((counting - elapsed) / 1000)); return; }
      const holding = elapsed - counting;
      if (holding < HOLD_MS) { setPhase("holding"); setHeld(holding / HOLD_MS); return; }
      stop(); setHeld(1); setPhase("done");
      setFinished((current) => current.includes(selected.id) ? current : [...current, selected.id]);
    }, TICK_MS);
  };
  const cancel = () => { stop(); setPhase("idle"); setCount(COUNTDOWN_SECONDS); setHeld(0); };

  const index = tasks.findIndex((task) => task.id === selected.id);
  const next = [...tasks.slice(index + 1), ...tasks.slice(0, index)].find((task) => !finished.includes(task.id));
  const doneCount = finished.length;
  const secondsLeft = Math.max(0, Math.ceil(HOLD_MS / 1000 * (1 - held)));

  const headline = phase === "counting" ? `${count} 秒后开始，准备好` : phase === "holding" ? "保持住，别动！" : phase === "done" ? "跟做完成，请老师评价" : "准备好就做出来";
  const hint = phase === "idle" ? "点按钮，跟着图片做表情" : phase === "counting" ? "看着屏幕，慢慢做出表情" : phase === "holding" ? "表情保持 5 秒，老师在旁边观察" : next ? "可以进入下一个表情，或再来一次" : "四种表情都完成啦";
  const chip = phase === "idle" ? "待机" : phase === "counting" ? "倒计时" : phase === "holding" ? "保持中" : "已完成";
  const style = { "--mood": palette.color, "--mood-soft": palette.soft, "--mood-deep": palette.deep, "--held": held } as CSSProperties;

  return <Card className={`pro-card expr expr--${mood} is-${phase}`} style={style}>
    <aside className="expr__picker">
      <div className="course-task-picker">
        <p><span className="course-task-picker__title">表情</span>
          <span className="course-task-picker__meter" aria-hidden="true"><i style={{ width: `${tasks.length ? doneCount / tasks.length * 100 : 0}%` }} /></span>
          <small>已模仿 <b>{doneCount}</b> / {tasks.length}</small></p>
      </div>
      <div className="expr__moods" role="group" aria-label="选择表情">
        {tasks.map((task) => {
          const key = moodOf(task.id) ?? "happy";
          const thumb = getCourseTaskImage(task, studentGender);
          const isDone = finished.includes(task.id);
          return <button type="button" key={task.id} className={`expr__mood expr__mood--${key} ${task.id === selected.id ? "is-selected" : ""} ${isDone ? "is-done" : ""}`} aria-pressed={task.id === selected.id} aria-label={`${task.title}${isDone ? "，已模仿" : ""}`}
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
        {phase === "done" && <span className="expr__burst" aria-hidden="true">{BURST.map((item, i) => <i key={i} style={item} />)}</span>}
      </div>
      <div className="expr__copy">
        <span className="pron__tag expr__tag"><em>表情模仿 · 第 {index + 1} 个</em></span>
        <strong className="expr__word" aria-label={selected.title}>{Array.from(selected.title).map((char, i) => <span key={i} style={{ "--i": i } as CSSProperties}>{char}</span>)}</strong>
        <p className="expr__text">{selected.text}</p>
      </div>
    </section>

    <div className={`vc expr__console vc--${phase === "counting" ? "connecting" : phase === "holding" ? "listening" : phase}`}>
      <div className="vc__mic">
        <div className="vc__orb-wrap">
          <i className="vc__ripple" aria-hidden="true" /><i className="vc__ripple vc__ripple--2" aria-hidden="true" /><i className="vc__ripple vc__ripple--3" aria-hidden="true" />
          <button type="button" className="vc__orb expr__orb" onClick={phase === "counting" || phase === "holding" ? cancel : start} aria-label={phase === "idle" ? "开始跟做表情" : phase === "done" ? "再做一次" : "停止"}>
            {phase === "counting" ? <b className="expr__orb-num">{count}</b> : phase === "holding" ? <b className="expr__orb-num">{secondsLeft}</b> : phase === "done" ? <ReplayIcon /> : <SmileIcon />}
          </button>
        </div>
        <span className="vc__mic-label">{phase === "idle" ? "开始跟做" : phase === "done" ? "再来一次" : "点此取消"}</span>
      </div>
      <div className="vc__main" aria-live="polite">
        <div className="vc__status">
          <span className="vc__chip"><i aria-hidden="true" />{chip}</span>
          <strong className="vc__headline">{headline}</strong>
          <time className="vc__timer">{phase === "holding" ? `${(held * HOLD_MS / 1000).toFixed(1)}s` : phase === "done" ? "5.0s" : "0.0s"}</time>
        </div>
        <div className="expr__scope" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} className={held * 10 > i || phase === "done" ? "is-on" : ""} />)}</div>
        <small className="vc__hint">{hint}</small>
      </div>
      <button type="button" className="pro-btn pro-btn--primary expr__next" disabled={phase !== "done" || !next} onClick={() => next && void onSelectItem?.(next.id)}>
        下一个表情
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
    </div>
  </Card>;
}

/** 大阶段“森林广播员”：同一套舞台语言，背景下起小雨，雨停转晴。 */
function ScenarioStage({ selected }: { selected: CourseTask }) {
  return <Card className="pro-card expr expr--scenario">
    <section className="expr__stage expr__stage--scenario" key={`stage-${selected.id}`}>
      <span className="expr__rain" aria-hidden="true">{RAIN.map((item, i) => <i key={i} style={item} />)}</span>
      <span className="expr__sun" aria-hidden="true" />
      <div className="expr__copy">
        <span className="pron__tag expr__tag"><em>情境表演</em></span>
        <strong className="expr__word expr__word--scenario">{selected.title}</strong>
        <p className="expr__text expr__text--scenario">{selected.text}</p>
      </div>
    </section>
  </Card>;
}

export function AnimalImitation({ stage, studentGender, result, items, onSelectItem }: AssessmentModuleProps) {
  const { content } = useSiteContent();
  const module = content.modules.A5;
  const tasks = (stage ? getCourseTasks(stage, "A5") : []).map((item) => ({ ...item, ...content.taskOverrides?.[item.id] }));
  void items;
  const selected = tasks.find((item) => item.id === result.questionId);
  if (selected) return stage === "B" ? <ScenarioStage selected={selected} /> : <EmotionStage tasks={tasks} selected={selected} studentGender={studentGender} onSelectItem={onSelectItem} />;
  const visual = module.imageUrl ? <div className="module-uploaded-image"><img src={module.imageUrl} alt={module.imageAlt} /></div> : <div className="picture-placeholder picture-placeholder--tiger"><span className="tiger-ear tiger-ear--left" /><span className="tiger-ear tiger-ear--right" />{module.visualText}</div>;
  return <ModuleShell className="module-card--character module-card--animal" visualClassName="module-card__visual--character" eyebrow={module.eyebrow} title={module.title} prompt={module.prompt} visual={visual}>{module.teacherNote && <p className="task-note">{module.teacherNote}</p>}</ModuleShell>;
}

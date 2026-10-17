import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BrowserAudioRecorder } from "@/services/audio";
import { SmartEvaluationUnavailableError, SpeechContentMismatchError, startXfyunIse, type XfyunIseSession } from "@/services/speech/xfyunIse";
import { animalQuestions, initialQuestions, largeExpressionPrompt, sentenceQuestions, type V3Section, type V3Stage } from "./config";
import { strictPronunciationScore, summarizeScores } from "./scoring";
import "./v3.css";

type Rating = { score: number; stars: number; source: "intelligent" | "teacher" | "breath"; note?: string; transcript?: string };
type RatingBook = Record<string, Rating>;
type Section = V3Section | "report";
const storageKey = "starvoice-v3-ratings";

function readRatings(): RatingBook {
  try { return JSON.parse(localStorage.getItem(storageKey) ?? "{}") as RatingBook; }
  catch { return {}; }
}

function stars(value?: number) { return <span className="v3-stars" aria-label={value ? `${value}颗星` : "未评分"}>{Array.from({ length: 5 }, (_, index) => <span className={index < (value ?? 0) ? "is-on" : ""} key={index}>★</span>)}</span>; }

function TeacherRating({ value, onRate }: { value?: Rating; onRate: (stars: number) => void }) {
  return <div className="v3-teacher-rating"><span>教师星级评价</span><div>{Array.from({ length: 5 }, (_, index) => <button type="button" key={index} className={index < (value?.source === "teacher" ? value.stars : 0) ? "is-on" : ""} onClick={() => onRate(index + 1)} aria-label={`教师评${index + 1}颗星`}>★</button>)}</div></div>;
}

function SpeechTask({ taskId, text, prompt, onRating, rating }: { taskId: string; text: string; prompt: string; onRating: (id: string, rating?: Rating) => void; rating?: Rating }) {
  const activeSession = useRef<XfyunIseSession | null>(null);
  const lastVoiceAt = useRef(0);
  const heardAt = useRef(0);
  const finishing = useRef(false);
  const finishCurrent = useRef<() => void>(() => undefined);
  const [status, setStatus] = useState<"idle" | "connecting" | "listening" | "processing">("idle");
  const [volume, setVolume] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (status !== "listening" || finishing.current) return;
      const now = performance.now();
      if (heardAt.current && now - lastVoiceAt.current > 1100) finishCurrent.current();
      if (!heardAt.current && now - lastVoiceAt.current > (text.length > 8 ? 20000 : 12000)) finishCurrent.current();
    }, 120);
    return () => window.clearInterval(timer);
  }, [status, text.length]);
  useEffect(() => () => { activeSession.current?.cancel(); }, []);

  async function start() {
    activeSession.current?.cancel();
    activeSession.current = null;
    finishing.current = false;
    heardAt.current = 0;
    lastVoiceAt.current = performance.now();
    setVolume(0);
    setMessage("");
    setStatus("connecting");
    onRating(taskId, undefined);
    try {
      activeSession.current = await startXfyunIse({
        referenceText: text,
        category: text.length > 8 ? "read_sentence" : "read_word",
        onVolume: (value) => {
          setVolume(value);
          if (value > .08) {
            if (!heardAt.current) heardAt.current = performance.now();
            lastVoiceAt.current = performance.now();
          }
        },
      });
      setStatus("listening");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof SmartEvaluationUnavailableError ? "智能评测服务未就绪，可由教师手动评星。" : error instanceof Error ? error.message : "麦克风暂时无法使用。 ");
    }
  }

  async function finish() {
    if (!activeSession.current || finishing.current) return;
    finishing.current = true;
    setStatus("processing");
    try {
      if (!heardAt.current) { activeSession.current.cancel(); setMessage("没有听到作答，请再试一次。"); return; }
      const result = await activeSession.current.stop();
      const calibrated = strictPronunciationScore(result, text);
      onRating(taskId, { ...calibrated, source: "intelligent", transcript: result.transcript });
      setMessage(calibrated.note);
    } catch (error) {
      setMessage(error instanceof SpeechContentMismatchError ? `读出的内容与“${text}”不一致，请再试一次。` : error instanceof Error ? error.message : "智能评测没有完成，请重测。");
    } finally {
      activeSession.current = null;
      setStatus("idle");
    }
  }
  finishCurrent.current = () => { void finish(); };

  return <div className="v3-speech-task">
    <p>{prompt}</p>
    <div className="v3-speech-controls">
      <button type="button" className="v3-primary" disabled={status !== "idle"} onClick={start}>{status === "connecting" ? "正在连接…" : status === "listening" ? "正在听，请读完" : status === "processing" ? "正在分析…" : rating ? "重新评测" : "按下麦克风开始"}</button>
      <div className="v3-volume" aria-label="实时声音检测"><span style={{ width: `${Math.max(4, volume * 100)}%` }} /></div>
      {rating && <div className="v3-inline-rating">{stars(rating.stars)}<small>{rating.source === "teacher" ? "教师评星" : "智能评星"}</small></div>}
    </div>
    {message && <p className="v3-feedback" role="status">{message}</p>}
    <TeacherRating value={rating} onRate={(value) => { onRating(taskId, { score: value * 20, stars: value, source: "teacher", note: "教师评星" }); setMessage("已记录教师评星。"); }} />
  </div>;
}

function BreathTask({ id, rating, onRating }: { id: string; rating?: Rating; onRating: (id: string, rating?: Rating) => void }) {
  const recorder = useRef(new BrowserAudioRecorder());
  const volumeRef = useRef(0);
  const voicedTicks = useRef(0);
  const lastVoicedAt = useRef(0);
  const startedAt = useRef(0);
  const wasVoiced = useRef(false);
  const interruptions = useRef(0);
  const samples = useRef<number[]>([]);
  const finishing = useRef(false);
  const finishCurrent = useRef<(reason: string) => void>(() => undefined);
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [volume, setVolume] = useState(0);
  const [distance, setDistance] = useState(0);
  const [message, setMessage] = useState("");
  useEffect(() => () => recorder.current.cancel(), []);
  useEffect(() => {
    if (state !== "recording") return;
    const timer = window.setInterval(() => {
      if (finishing.current) return;
      const current = volumeRef.current;
      const voiced = current > .08;
      samples.current.push(current);
      if (voiced) {
        voicedTicks.current += 1;
        lastVoicedAt.current = performance.now();
        setDistance(Math.min(100, voicedTicks.current * .8));
      } else if (wasVoiced.current) interruptions.current += 1;
      wasVoiced.current = voiced;
      if (voicedTicks.current >= 125) finishCurrent.current("到达终点");
      else if (voicedTicks.current >= 6 && performance.now() - lastVoicedAt.current >= 1800) finishCurrent.current("发声停止");
      else if (!voicedTicks.current && performance.now() - startedAt.current >= 5000) finishCurrent.current("没有检测到持续发声");
    }, 100);
    return () => window.clearInterval(timer);
  }, [state]);

  async function start() {
    onRating(id, undefined);
    voicedTicks.current = 0; interruptions.current = 0; lastVoicedAt.current = 0; wasVoiced.current = false; samples.current = []; finishing.current = false;
    setDistance(0); setVolume(0); setMessage("");
    try { await recorder.current.start((value) => { volumeRef.current = value; setVolume(value); }); startedAt.current = performance.now(); setState("recording"); }
    catch { setMessage("无法开启麦克风，请检查权限。"); setState("idle"); }
  }

  async function finish(reason: string) {
    if (finishing.current) return;
    finishing.current = true;
    try {
      await recorder.current.stop();
      const seconds = voicedTicks.current / 10;
      const voicedSamples = samples.current.filter((sample) => sample > .08);
      const mean = voicedSamples.reduce((sum, sample) => sum + sample, 0) / Math.max(1, voicedSamples.length);
      const variance = voicedSamples.reduce((sum, sample) => sum + (sample - mean) ** 2, 0) / Math.max(1, voicedSamples.length);
      const durationScore = Math.min(100, Math.round(seconds / 12.5 * 100));
      const continuityScore = Math.max(0, 100 - interruptions.current * 18);
      const stabilityScore = Math.max(0, Math.min(100, Math.round(100 - Math.sqrt(variance) * 240)));
      const score = Math.round((durationScore * .5) + (continuityScore * .3) + (stabilityScore * .2));
      const stars = score >= 95 ? 5 : score >= 85 ? 4 : score >= 70 ? 3 : score >= 50 ? 2 : score >= 25 ? 1 : 0;
      onRating(id, { score, stars, source: "breath", note: `${reason}，持续发声 ${seconds.toFixed(1)} 秒` });
      setMessage(`${reason}，已自动总结：持续发声 ${seconds.toFixed(1)} 秒，中断 ${interruptions.current} 次。`);
      setState("done");
    } catch { setMessage("这次没有成功记录，请重新测一次。"); setState("idle"); }
  }
  finishCurrent.current = (reason) => { void finish(reason); };

  return <div className="v3-breath">
    <h2>气息 · 小火车</h2><p>深吸一口气，持续发出“呜——”。停声约 2 秒或火车到站后会自动出成绩。</p>
    <div className="v3-train-scene"><div className="v3-train-progress"><span style={{ width: `${distance}%` }} /></div><img className="v3-train" style={{ left: `calc(${Math.min(75, distance * .75)}% - 5px)` }} src="/assets/v2/questions/a2-train-v3.webp" alt="正在前进的小火车" /><div className="v3-rail" /><strong className="v3-station">终点</strong></div>
    <div className="v3-speech-controls"><button type="button" className="v3-primary" disabled={state === "recording"} onClick={start}>{state === "recording" ? "正在听你发声…" : rating ? "再测一次" : "按下麦克风出发"}</button><div className="v3-volume"><span style={{ width: `${Math.max(4, volume * 100)}%` }} /></div>{rating && stars(rating.stars)}</div>
    {message && <p className="v3-feedback" role="status">{message}</p>}
    <TeacherRating value={rating} onRate={(value) => onRating(id, { score: value * 20, stars: value, source: "teacher", note: "教师评星" })} />
  </div>;
}

export function V3Page() {
  const [stage, setStage] = useState<V3Stage>("small");
  const [section, setSection] = useState<Section>("pronunciation");
  const [selectedInitial, setSelectedInitial] = useState("b");
  const [selectedAnimal, setSelectedAnimal] = useState("tiger");
  const [ratings, setRatings] = useState<RatingBook>(readRatings);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(ratings)); }, [ratings]);
  const setRating = (id: string, rating?: Rating) => setRatings((current) => { const next = { ...current }; if (rating) next[id] = rating; else delete next[id]; return next; });
  const prefix = stage === "small" ? "small" : "large";
  const selectedQuestion = initialQuestions.find((question) => question.initial === selectedInitial) ?? initialQuestions[0];
  const completedInitials = initialQuestions.filter((question) => Boolean(ratings[`small-pronunciation-${question.initial}`]));
  const pendingInitials = initialQuestions.filter((question) => !ratings[`small-pronunciation-${question.initial}`]);
  const animal = animalQuestions.find((item) => item.id === selectedAnimal) ?? animalQuestions[0];
  const sectionNames: Record<Section, string> = { pronunciation: "正音", breathing: "气息", expression: "表现力", report: "总结报告" };
  const stageRatings = Object.entries(ratings).filter(([key]) => key.startsWith(`${prefix}-`));
  const stageAverage = summarizeScores(stageRatings.map(([, rating]) => rating.score));
  const bySection = (name: V3Section) => summarizeScores(stageRatings.filter(([key]) => key.includes(`-${name}-`) || key === `${prefix}-${name}`).map(([, rating]) => rating.score));

  return <div className="v3-page"><header className="v3-header"><Link to="/" className="v3-logo">STARVOICE</Link><div><span>新版口才评测</span><Link to="/">返回原版</Link></div></header>
    <main className="v3-shell"><div className="v3-topline"><div><p className="v3-eyebrow">正音 · 气息 · 表现力</p><h1>口才评测新版本</h1><p>选择阶段后，按项目完成评测；进度会保存在这台设备上。</p></div><div className="v3-stage-switch"><button className={stage === "small" ? "is-active" : ""} onClick={() => { setStage("small"); setSection("pronunciation"); }}>小阶段</button><button className={stage === "large" ? "is-active" : ""} onClick={() => { setStage("large"); setSection("pronunciation"); }}>大阶段</button></div></div>
      <nav className="v3-nav" aria-label="评测项目">{(["pronunciation", "breathing", "expression", "report"] as Section[]).map((item, index) => <button type="button" key={item} className={section === item ? "is-active" : ""} onClick={() => setSection(item)}><span>{String(index + 1).padStart(2, "0")}</span>{sectionNames[item]}</button>)}</nav>
      <section className="v3-panel">
        {section === "pronunciation" && stage === "small" && <><div className="v3-section-heading"><div><p className="v3-eyebrow">小阶段 · 正音</p><h2>看图说词 · 23 个声母</h2><p>选择声母，观察图片并读出对应词语。已完成与待评测分开显示。</p></div><strong>{completedInitials.length} / 23 已评测</strong></div>
          <div className="v3-initial-groups"><div><h3>已评测</h3><div className="v3-initial-grid">{completedInitials.length ? completedInitials.map((q) => <button type="button" key={q.initial} className={`v3-initial is-complete ${selectedInitial === q.initial ? "is-selected" : ""}`} onClick={() => setSelectedInitial(q.initial)}>{q.initial}<span>✓</span></button>) : <p>还没有完成的声母</p>}</div></div><div><h3>待评测</h3><div className="v3-initial-grid">{pendingInitials.map((q) => <button type="button" key={q.initial} className={`v3-initial ${selectedInitial === q.initial ? "is-selected" : ""}`} onClick={() => setSelectedInitial(q.initial)}>{q.initial}</button>)}</div></div></div>
          <div className="v3-word-card"><div className="v3-word-image"><img src={selectedQuestion.picture} alt={`${selectedQuestion.word}的例图`} /></div><div className="v3-word-text"><span>声母 {selectedQuestion.initial}</span><strong>{selectedQuestion.word}</strong></div></div>
          <SpeechTask key={selectedInitial} taskId={`small-pronunciation-${selectedInitial}`} text={selectedQuestion.word} prompt={`看左边的图片，清楚地读出“${selectedQuestion.word}”。`} rating={ratings[`small-pronunciation-${selectedInitial}`]} onRating={setRating} />
        </>}
        {section === "pronunciation" && stage === "large" && <><div className="v3-section-heading"><div><p className="v3-eyebrow">大阶段 · 正音</p><h2>两句话，读准关键发音</h2><p>一句练习平舌音和翘舌音，一句练习 d、t、n、l。</p></div></div><div className="v3-sentence-list">{sentenceQuestions.map((question) => <article key={question.id} className="v3-sentence-card"><span>{question.title}</span><h3>{question.text}</h3><small>{question.hint}</small><SpeechTask taskId={`large-pronunciation-${question.id}`} text={question.text} prompt="按下麦克风，完整地读一遍。" rating={ratings[`large-pronunciation-${question.id}`]} onRating={setRating} /></article>)}</div></>}
        {section === "breathing" && <BreathTask key={stage} id={`${prefix}-breathing`} rating={ratings[`${prefix}-breathing`]} onRating={setRating} />}
        {section === "expression" && stage === "small" && <><div className="v3-section-heading"><div><p className="v3-eyebrow">小阶段 · 表现力</p><h2>模仿三位动物朋友</h2><p>老虎、小狗、小鸭的声音和动作差别明显；请让孩子依次模仿。</p></div></div><div className="v3-animal-tabs">{animalQuestions.map((item) => <button type="button" key={item.id} className={selectedAnimal === item.id ? "is-active" : ""} onClick={() => setSelectedAnimal(item.id)}>{item.title}{ratings[`small-expression-${item.id}`] && <span>✓</span>}</button>)}</div><div className="v3-animal-card"><img src={animal.image} alt={animal.title} /><div><span>模仿声音：{animal.sound}</span><h3>{animal.title}</h3><p>{animal.cue}</p><TeacherRating value={ratings[`small-expression-${animal.id}`]} onRate={(value) => setRating(`small-expression-${animal.id}`, { score: value * 20, stars: value, source: "teacher", note: "声音、动作、表情综合观察" })} /></div></div></>}
        {section === "expression" && stage === "large" && <><div className="v3-section-heading"><div><p className="v3-eyebrow">大阶段 · 表现力</p><h2>{largeExpressionPrompt.title}</h2></div></div><div className="v3-expression-prompt"><span>情境题</span><p>{largeExpressionPrompt.prompt}</p><ul>{largeExpressionPrompt.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul></div><TeacherRating value={ratings["large-expression"]} onRate={(value) => setRating("large-expression", { score: value * 20, stars: value, source: "teacher", note: "内容、语气和动作综合观察" })} /></>}
        {section === "report" && <><div className="v3-section-heading"><div><p className="v3-eyebrow">{stage === "small" ? "小阶段" : "大阶段"} · 总结</p><h2>本阶段评测总结</h2><p>只统计已完成项目；教师评星会作为该项目的兜底结果。</p></div></div><div className="v3-report-grid">{(["pronunciation", "breathing", "expression"] as V3Section[]).map((name) => <article key={name}><span>{sectionNames[name]}</span><strong>{bySection(name) === undefined ? "待评测" : `${bySection(name)} 分`}</strong><small>{name === "pronunciation" && stage === "small" ? `${completedInitials.length} / 23 个声母` : "已完成内容自动汇总"}</small></article>)}</div><div className="v3-report-summary">当前平均分 <strong>{stageAverage === undefined ? "待评测" : `${stageAverage} 分`}</strong></div></>}
      </section>
    </main>
  </div>;
}

import { useEffect, useRef, useState } from "react";
import { VoiceConsole } from "@/assessment/common/VoiceConsole/VoiceConsole";
import type { AssessmentModuleProps } from "@/assessment/types";
import { useSiteContent } from "@/content/useSiteContent";
import { BrowserAudioRecorder, warmMicrophone } from "@/services/audio";
import { Card } from "@/components/ui";
import type { CSSProperties } from "react";

type BreathState = "idle" | "connecting" | "recording" | "processing" | "done" | "error";

const breathDimensions = [
  { key: "sustainedPhonation", label: "持续发声" },
  { key: "breathContinuity", label: "发声连贯" },
  { key: "voiceStability", label: "声音稳定" },
] as const;

function stars(score?: number) {
  const value = score === undefined ? 0 : Math.max(1, Math.min(5, Math.ceil(score / 20)));
  return value;
}

export function Breathing({ onResultChange, result }: AssessmentModuleProps) {
  const { content } = useSiteContent();
  const module = content.modules.A2;
  const recorder = useRef(new BrowserAudioRecorder());
  const volumeRef = useRef(0);
  const voicedTicks = useRef(0);
  const interruptionsRef = useRef(0);
  const wasVoiced = useRef(false);
  const volumeSamples = useRef<number[]>([]);
  const mounted = useRef(true);
  const finishing = useRef(false);
  const startedAt = useRef(0);
  const lastVoiceAt = useRef(0);
  const distanceRef = useRef(0);
  const finishRef = useRef<(reason: string) => Promise<void>>(async () => {});
  const [message, setMessage] = useState("");
  const [state, setState] = useState<BreathState>(result.autoScores?.sustainedPhonation !== undefined ? "done" : "idle");
  const [volume, setVolume] = useState(0);
  const [distance, setDistance] = useState(Number(result.rawResult?.trainDistance ?? 0));
  const [sustainedSeconds, setSustainedSeconds] = useState(Number(result.rawResult?.sustainedSeconds ?? 0));
  const [interruptions, setInterruptions] = useState(Number(result.rawResult?.interruptions ?? 0));

  useEffect(() => { void warmMicrophone(); }, []);
  useEffect(() => { const currentRecorder = recorder.current; mounted.current = true; return () => { mounted.current = false; currentRecorder.cancel(); }; }, []);
  useEffect(() => { finishRef.current = finish; });
  useEffect(() => {
    if (state !== "recording") return;
    const timer = window.setInterval(() => {
      const currentVolume = volumeRef.current;
      if (finishing.current) return;
      const now = performance.now();
      const voiced = currentVolume > 0.08;
      volumeSamples.current.push(currentVolume);
      if (voiced) {
        voicedTicks.current += 1;
        setSustainedSeconds(Number((voicedTicks.current / 10).toFixed(1)));
        lastVoiceAt.current = now;
        distanceRef.current = Math.min(100, voicedTicks.current / 120 * 100);
        setDistance(distanceRef.current);
      }
      if (!voiced && wasVoiced.current) {
        interruptionsRef.current += 1;
        setInterruptions(interruptionsRef.current);
      }
      wasVoiced.current = voiced;
      if (distanceRef.current >= 100) void finishRef.current("已到达终点，评测完成");
      else if (voicedTicks.current > 0 && now - lastVoiceAt.current >= 1800) void finishRef.current("发声已停止，评测完成");
      else if (voicedTicks.current === 0 && now - startedAt.current >= 5000) void finishRef.current("没有收到声音，请重试");
      else if (now - startedAt.current >= 30000) void finishRef.current("已自动结束本次评测");
    }, 100);
    return () => window.clearInterval(timer);
  }, [state]);

  function volumeChanged(value: number) {
    volumeRef.current = value;
    setVolume((current) => current * .58 + value * .42);
  }

  async function start() {
    if (state === "connecting" || state === "recording" || state === "processing") return;
    setState("connecting");
    setMessage("");
    try {
      await onResultChange({ status: "running", autoScores: undefined, teacherScores: undefined, rawResult: undefined });
      if (!mounted.current) return;
      setDistance(0);
      setSustainedSeconds(0);
      setInterruptions(0);
      voicedTicks.current = 0;
      interruptionsRef.current = 0;
      wasVoiced.current = false;
      volumeSamples.current = [];
      volumeRef.current = 0;
      distanceRef.current = 0;
      finishing.current = false;
      await recorder.current.start(volumeChanged);
      if (!mounted.current) { recorder.current.cancel(); return; }
      startedAt.current = performance.now();
      lastVoiceAt.current = 0;
      setState("recording");
    } catch {
      if (!mounted.current) return;
      setMessage("无法使用麦克风，请检查浏览器权限");
      setState("error");
    }
  }

  async function finish(reason: string) {
    if (finishing.current || !mounted.current) return;
    finishing.current = true;
    setState("processing");
    try {
      await recorder.current.stop();
      if (!mounted.current) return;
      setVolume(0);
      volumeRef.current = 0;
      setMessage(reason);
      if (!voicedTicks.current) { setState("error"); return; }
      const voicedDuration = Number((voicedTicks.current / 10).toFixed(1));
      const interruptionCount = interruptionsRef.current;
      const samples = volumeSamples.current.filter((value) => value > 0.08);
      const average = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0;
      const variance = samples.length ? samples.reduce((sum, value) => sum + (value - average) ** 2, 0) / samples.length : 1;
      const sustainedPhonation = Math.min(100, Math.round((voicedDuration / 12) * 100));
      const breathContinuity = voicedTicks.current ? Math.max(20, 100 - interruptionCount * 20) : 0;
      const voiceStability = voicedTicks.current ? Math.max(20, Math.min(100, Math.round(100 - Math.sqrt(variance) * 240))) : 0;
      const breathAndVoice = Math.round((sustainedPhonation + breathContinuity + voiceStability) / 3);
      await onResultChange({
        status: "running",
        startTime: result.startTime ?? new Date().toISOString(),
        rawResult: { ...result.rawResult, sustainedSeconds: voicedDuration, interruptions: interruptionCount, trainDistance: Math.round(distanceRef.current), averageVolume: Number(average.toFixed(2)), finishReason: reason },
        autoScores: { ...result.autoScores, sustainedPhonation, breathContinuity, voiceStability, breathAndVoice },
      });
      setState("done");
    } catch {
      if (!mounted.current) return;
      setMessage("收音未完成，请重试");
      setState("error");
    }
  }

  const active = state === "recording";
  const currentScores = result.autoScores;
  const helperText = active ? `已持续 ${sustainedSeconds.toFixed(1)} 秒 · 中断 ${interruptions} 次` : message;
  const consoleState = state === "recording" ? "listening" : state;
  const progress = Math.min(1, Math.max(0, distance / 100));
  const litSegments = Math.round(Math.min(1, volume * 1.9) * 10);
  const dimensionItems = breathDimensions.map(({ key, label }) => ({ key, label, done: currentScores?.[key] !== undefined, stars: stars(currentScores?.[key]) }));
  const micLabel = active ? "正在收音" : state === "connecting" || state === "processing" ? "请稍候" : state === "done" ? "再测一次" : "点击发声";
  const headline = active ? "正在听你持续发声" : state === "connecting" ? "正在准备收音" : state === "processing" ? "正在分析气息" : state === "done" ? "气息评测完成" : state === "error" ? "没有听到声音，再试一次" : "准备好就出发";
  const sceneStyle = { "--p": progress.toFixed(4), "--lv": Math.min(1, volume * 1.6).toFixed(3) } as CSSProperties;

  return <Card className={`pro-card breath ${active ? "is-active" : ""} ${volume > .08 ? "is-voiced" : ""}`}>
    <div className="breath__scene" style={sceneStyle}>
      <div className="breath__hud">
        <div className="breath-stat breath-stat--main"><span>持续发声</span><strong><b>{sustainedSeconds.toFixed(1)}</b><small>秒</small></strong><em className="breath-stat__goal"><i style={{ width: `${Math.min(100, sustainedSeconds / 12 * 100)}%` }} /></em></div>
        <div className="breath-stat"><span>中断次数</span><strong><b>{interruptions}</b><small>次</small></strong></div>
        <div className="breath-stat breath-stat--level"><span>音量</span><div className="breath-led" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} className={index < litSegments ? "is-lit" : ""} />)}</div></div>
      </div>
      <div className="breath__cue" aria-hidden="true"><span>{module.visualText}</span></div>
      <div className="breath__track">
        <div className="breath__rail"><span className="breath__trail" /></div>
        {[3, 6, 9].map((second) => <span className="breath__mark" key={second} style={{ "--k": second / 12 } as CSSProperties}><i />{second}s</span>)}
        <span className={`breath__train ${module.imageUrl ? "has-image" : ""} ${volume > .08 ? "is-moving" : ""}`}>{module.imageUrl ? <><img src={module.imageUrl} alt={module.imageAlt} /><span className="breath__speed" aria-hidden="true"><i /><i /><i /></span><span className="train-smoke train-smoke--one" aria-hidden="true" /><span className="train-smoke train-smoke--two" aria-hidden="true" /><span className="train-smoke train-smoke--three" aria-hidden="true" /></> : <><i />{module.visualText}</>}</span>
        <span className={`breath__goal ${progress >= 1 ? "is-reached" : ""}`} aria-label={module.secondaryText}><span className="breath__flag">{module.secondaryText}</span><span className="breath__pole" aria-hidden="true" /></span>
      </div>
    </div>
    <VoiceConsole className="breath__console" state={consoleState} level={volume} timer={`${sustainedSeconds.toFixed(1)}s`} headline={headline} hint={helperText} micLabel={micLabel} micAria={active ? "正在自动评测气息" : "开始气息评测"} onStart={start} onPrepare={() => { void warmMicrophone(); }} dimensions={dimensionItems} dimensionsAria="三个维度的智能评星" />
  </Card>;
}

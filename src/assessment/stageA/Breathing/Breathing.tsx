import { useEffect, useRef, useState } from "react";
import { ModuleShell } from "@/assessment/common/ModuleShell/ModuleShell";
import type { AssessmentModuleProps } from "@/assessment/types";
import { useSiteContent } from "@/content/useSiteContent";
import { BrowserAudioRecorder } from "@/services/audio";
import { StarRating } from "@/components/ui";

type BreathState = "idle" | "recording" | "done" | "error";

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
  const [state, setState] = useState<BreathState>(result.autoScores?.sustainedPhonation !== undefined ? "done" : "idle");
  const [volume, setVolume] = useState(0);
  const [distance, setDistance] = useState(Number(result.rawResult?.trainDistance ?? 0));
  const [sustainedSeconds, setSustainedSeconds] = useState(Number(result.rawResult?.sustainedSeconds ?? 0));
  const [interruptions, setInterruptions] = useState(Number(result.rawResult?.interruptions ?? 0));

  useEffect(() => () => recorder.current.cancel(), []);
  useEffect(() => {
    if (state !== "recording") return;
    const timer = window.setInterval(() => {
      const currentVolume = volumeRef.current;
      const voiced = currentVolume > 0.08;
      volumeSamples.current.push(currentVolume);
      if (voiced) {
        voicedTicks.current += 1;
        setSustainedSeconds(Number((voicedTicks.current / 10).toFixed(1)));
        setDistance((value) => Math.min(100, value + 1.6));
      }
      if (!voiced && wasVoiced.current) {
        interruptionsRef.current += 1;
        setInterruptions(interruptionsRef.current);
      }
      wasVoiced.current = voiced;
    }, 100);
    return () => window.clearInterval(timer);
  }, [state]);

  function volumeChanged(value: number) {
    volumeRef.current = value;
    setVolume((current) => current * .58 + value * .42);
  }

  async function start() {
    try {
      setDistance(0);
      setSustainedSeconds(0);
      setInterruptions(0);
      voicedTicks.current = 0;
      interruptionsRef.current = 0;
      wasVoiced.current = false;
      volumeSamples.current = [];
      await recorder.current.start(volumeChanged);
      setState("recording");
    } catch {
      setState("error");
    }
  }

  async function finish() {
    try {
      await recorder.current.stop();
      setVolume(0);
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
        rawResult: { ...result.rawResult, sustainedSeconds: voicedDuration, interruptions: interruptionCount, trainDistance: Math.round(distance), averageVolume: Number(average.toFixed(2)) },
        autoScores: { ...result.autoScores, sustainedPhonation, breathContinuity, voiceStability, breathAndVoice },
      });
      setState("done");
    } catch {
      setState("error");
    }
  }

  const active = state === "recording";
  const voiceprint = Array.from({ length: 38 }, (_, index) => Math.max(12, Math.min(100, 16 + volume * 92 * (0.35 + Math.abs(Math.sin(index * 1.72)) * 0.8))));
  const currentScores = result.autoScores;
  const helperText = active ? `已持续 ${sustainedSeconds.toFixed(1)} 秒 · 中断 ${interruptions} 次` : state === "error" ? "无法使用麦克风，请检查浏览器权限" : "";

  const visual = <div className="breathing-game">
    <div className="sound-meter"><span style={{ width: `${Math.max(4, volume * 100)}%` }} /></div>
    <div className="train-track"><span className={`train ${module.imageUrl ? "train--image" : ""} ${volume > .08 ? "is-moving" : ""}`} style={{ left: `calc(${Math.min(73, distance * .73)}% - 8px)` }}>{module.imageUrl ? <><img src={module.imageUrl} alt={module.imageAlt} /><span className="train-smoke train-smoke--one" aria-hidden="true" /><span className="train-smoke train-smoke--two" aria-hidden="true" /><span className="train-smoke train-smoke--three" aria-hidden="true" /></> : <><i />{module.visualText}</>}</span><span className="station" aria-label={module.secondaryText}><span className="station__flag"><i aria-hidden="true" />{module.secondaryText}</span><span className="station__pole" aria-hidden="true" /><span className="station__base" aria-hidden="true" /></span></div>
    <p>{active ? volume > .08 ? "听到声音啦，小火车正在前进！" : `继续发出“${module.visualText}”，小火车在等你` : "按下黄色麦克风，让小火车出发"}</p>
  </div>;

  return <ModuleShell eyebrow={module.eyebrow} title={module.title} prompt={module.prompt} visual={visual}>
    <div className={`smart-evaluator smart-evaluator--featured smart-evaluator--mic breathing-evaluator ${active ? "is-listening" : ""}`}>
      <div className="smart-evaluator__mic-wrap">
        <button type="button" className="smart-evaluator__mic" onClick={active ? finish : start} aria-label={active ? "完成气息评测" : "开始气息评测"}>
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8" /></svg>
        </button>
        <strong className="smart-evaluator__mic-label">{active ? "点击完成" : state === "done" ? "再测一次" : "点击发声"}</strong>
      </div>
      <div className="smart-evaluator__body" aria-live="polite">
        <div className="smart-evaluator__headline"><strong>{active ? "正在听你持续发声" : state === "done" ? "按下麦克风，持续发出“呜——”" : "准备好就出发"}</strong><span>{sustainedSeconds.toFixed(1)}s</span></div>
        <div className={`smart-evaluator__voiceprint ${active ? "is-listening" : "is-idle"} ${volume > .08 ? "has-sound" : ""}`} aria-label={active ? "正在识别声音" : "语音声纹"}>{voiceprint.map((height, index) => <i key={index} style={{ height: `${height}%`, animationDelay: `${index * -.055}s`, animationDuration: `${.88 + (index % 6) * .075}s` }} />)}</div>
        {helperText && <small>{helperText}</small>}
      </div>
      <div className="smart-evaluator__dimensions" aria-label="三个维度的智能评星">
        {breathDimensions.map(({ key, label }) => <div className={`smart-evaluator__dimension ${currentScores?.[key] !== undefined ? "is-complete" : ""}`} key={key}><span>{label}</span><strong aria-label={`${label}智能评星`}><StarRating value={stars(currentScores?.[key])} /></strong></div>)}
      </div>
    </div>
  </ModuleShell>;
}

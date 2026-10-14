import { useEffect, useRef, useState } from "react";
import { StarRating } from "@/components/ui";
import { SmartEvaluationUnavailableError, startPreviewSpeechSession, startXfyunIse, type XfyunIseResult, type XfyunIseSession } from "@/services/speech/xfyunIse";

interface SmartSpeechEvaluatorProps {
  referenceText: string;
  initialScore?: number;
  initialPreview?: boolean;
  dimensionRatings?: Record<string, number>;
  featured?: boolean;
  onEvaluated: (result: XfyunIseResult) => void | Promise<void>;
}

type EvaluationState = "idle" | "connecting" | "listening" | "processing" | "done" | "error";

function getStars(score?: number): number {
  return score === undefined ? 0 : Math.max(1, Math.min(5, Math.ceil(score / 20)));
}

function formatTime(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const dimensions = [
  { key: "initialStrength", label: "字头有力" },
  { key: "vowelFullness", label: "字腹饱满" },
  { key: "finalClosure", label: "字尾收音" },
];

export function SmartSpeechEvaluator({ referenceText, initialScore, initialPreview = false, dimensionRatings, featured = false, onEvaluated }: SmartSpeechEvaluatorProps) {
  const session = useRef<XfyunIseSession | undefined>(undefined);
  const [state, setState] = useState<EvaluationState>(initialScore ? "done" : "idle");
  const [volume, setVolume] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [isPreview, setIsPreview] = useState(initialPreview);
  const voiceprint = Array.from({ length: 38 }, (_, index) => Math.max(12, Math.min(100, 16 + volume * 92 * (0.35 + Math.abs(Math.sin(index * 1.72)) * 0.8))));
  const volumeChanged = (value: number) => setVolume((current) => current * .58 + value * .42);

  useEffect(() => () => session.current?.cancel(), []);
  useEffect(() => {
    if (state !== "listening") return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  async function start() {
    setError("");
    setVolume(0);
    setSeconds(0);
    setIsPreview(false);
    setState("connecting");
    try {
      session.current = await startXfyunIse({ referenceText, category: referenceText.length <= 1 ? "read_syllable" : "read_word", onVolume: volumeChanged });
      setState("listening");
    } catch (reason) {
      if (reason instanceof SmartEvaluationUnavailableError) {
        try {
          session.current = await startPreviewSpeechSession({ onVolume: setVolume });
          setIsPreview(true);
          setState("listening");
          return;
        } catch {
          setError("暂时无法开启语音评星，请允许使用麦克风后再试。");
          setState("error");
          return;
        }
      }
      setError("暂时无法开启语音评星，请检查网络和麦克风权限后再试。");
      setState("error");
    }
  }

  async function finish() {
    if (!session.current) return;
    setState("processing");
    try {
      const result = await session.current.stop();
      session.current = undefined;
      await onEvaluated(result);
      setState("done");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "智能评星生成失败。");
      setState("error");
    }
  }

  const isBusy = state === "connecting" || state === "processing";
  const isListening = state === "listening";
  const isDone = state === "done";
  const microphoneLabel = isListening ? "完成发音并评星" : isBusy ? "正在处理语音" : isDone ? "重新智能评测" : "开始智能评测";
  const helperText = isListening ? `${isPreview ? "体验模式 · " : ""}清晰说出“${referenceText}”，完成后再点麦克风` : isBusy ? "请稍候，正在处理声音" : isDone ? isPreview ? "体验模式只展示交互，不代表真实语音评测" : "语音识别已完成；三个发声细节由老师评星" : "";

  return <div className={`smart-evaluator smart-evaluator--mic ${featured ? "smart-evaluator--featured" : ""} ${isListening ? "is-listening" : ""}`}>
    <div className="smart-evaluator__mic-wrap">
      <button type="button" className="smart-evaluator__mic" disabled={isBusy} onClick={isListening ? finish : start} aria-label={microphoneLabel} title={microphoneLabel}>
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8" /></svg>
      </button>
      <strong className="smart-evaluator__mic-label">{isListening ? "点击完成" : isDone ? "再测一次" : "点击说话"}</strong>
    </div>
    <div className="smart-evaluator__body" aria-live="polite">
      <div className="smart-evaluator__headline"><strong>{isListening ? "正在听你说话" : isBusy ? "正在分析声音" : isDone ? "本次表达观察" : "准备好就说出来"}</strong><span>{formatTime(seconds)}</span></div>
      <div className={`smart-evaluator__voiceprint ${isListening ? "is-listening" : "is-idle"} ${volume > .08 ? "has-sound" : ""}`} aria-label={isListening ? "正在识别声音" : "语音声纹"}>{voiceprint.map((height, index) => <i key={index} style={{ height: `${height}%`, animationDelay: `${index * -.055}s`, animationDuration: `${.88 + (index % 6) * .075}s` }} />)}</div>
      {helperText && <small>{helperText}</small>}
    </div>
    <div className="smart-evaluator__dimensions" aria-label="三个维度的智能评星">
      {dimensions.map(({ key, label }) => {
        const stars = getStars(dimensionRatings?.[key]);
        return <div className={`smart-evaluator__dimension ${stars ? "is-complete" : ""}`} key={key}>
          <span>{label}</span>
          <strong aria-label={stars ? `${label}${stars}颗星` : `${label}待评测`}><StarRating value={stars} /></strong>
        </div>;
      })}
    </div>
    {error && <span className="smart-evaluator__error" role="alert">{error}</span>}
  </div>;
}

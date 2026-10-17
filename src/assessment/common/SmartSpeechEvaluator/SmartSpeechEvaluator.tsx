import { useEffect, useRef, useState } from "react";
import { StarRating } from "@/components/ui";
import { SmartEvaluationUnavailableError, SpeechContentMismatchError, prepareSpeechAuth, startPreviewSpeechSession, startXfyunIse, type XfyunIseResult, type XfyunIseSession } from "@/services/speech/xfyunIse";
import { strictPronunciationStars } from "@/services/scoring/pronunciation";

interface SmartSpeechEvaluatorProps {
  sentence?: boolean;
  strictRating?: boolean;
  referenceText: string;
  initialScore?: number;
  initialPreview?: boolean;
  dimensionRatings?: Record<string, number>;
  featured?: boolean;
  onReset?: () => void | Promise<void>;
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
  { key: "initialStrength", label: "声韵清晰" },
  { key: "vowelFullness", label: "声调自然" },
  { key: "finalClosure", label: "词语准确" },
];

export function SmartSpeechEvaluator({ referenceText, initialScore, initialPreview = false, dimensionRatings, featured = false, sentence = false, strictRating = false, onReset, onEvaluated }: SmartSpeechEvaluatorProps) {
  const mounted = useRef(true);
  const session = useRef<XfyunIseSession | undefined>(undefined);
  const listening = useRef(false);
  const heardSince = useRef(0);
  const silenceSince = useRef(0);
  const autoFinishing = useRef(false);
  const maximumTimer = useRef(0);
  const [state, setState] = useState<EvaluationState>(initialScore !== undefined ? "done" : "idle");
  const [volume, setVolume] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<"mismatch" | "general" | "">("");
  const [isPreview, setIsPreview] = useState(initialPreview);
  const voiceprint = Array.from({ length: 38 }, (_, index) => Math.max(12, Math.min(100, 16 + volume * 92 * (0.35 + Math.abs(Math.sin(index * 1.72)) * 0.8))));
  const volumeChanged = (value: number) => {
    setVolume((current) => current * .58 + value * .42);
    if (!listening.current || autoFinishing.current) return;
    const now = performance.now();
    if (value > .08) {
      if (!heardSince.current) heardSince.current = now;
      silenceSince.current = 0;
      return;
    }
    if (!heardSince.current || now - heardSince.current < 350) return;
    if (!silenceSince.current) silenceSince.current = now;
    if (now - silenceSince.current >= (sentence ? 1500 : 650)) {
      autoFinishing.current = true;
      void finish();
    }
  };

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; listening.current = false; window.clearTimeout(maximumTimer.current); session.current?.cancel(); }; }, []);
  useEffect(() => { void prepareSpeechAuth().catch(() => undefined); }, [referenceText]);
  useEffect(() => {
    if (initialScore !== undefined || initialPreview || state !== "done") return;
    setState("idle");
    setVolume(0);
    setSeconds(0);
  }, [initialPreview, initialScore, state]);
  useEffect(() => {
    if (state !== "listening") return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  async function start() {
    window.clearTimeout(maximumTimer.current);
    listening.current = false;
    heardSince.current = 0;
    silenceSince.current = 0;
    autoFinishing.current = false;
    setError("");
    setErrorKind("");
    setVolume(0);
    setSeconds(0);
    setIsPreview(false);
    setState("connecting");
    try {
      await onReset?.();
      if (!mounted.current) return;
      session.current = await startXfyunIse({ referenceText, category: sentence ? "read_sentence" : referenceText.length <= 1 ? "read_syllable" : "read_word", onVolume: volumeChanged });
      if (!mounted.current) { session.current.cancel(); return; }
      listening.current = true;
      setState("listening");
      maximumTimer.current = window.setTimeout(() => { if (listening.current && !autoFinishing.current) { autoFinishing.current = true; void finish(); } }, sentence ? 30000 : 10000);
    } catch (reason) {
      if (!mounted.current) return;
      if (reason instanceof SmartEvaluationUnavailableError) {
        try {
          session.current = await startPreviewSpeechSession({ onVolume: volumeChanged });
          if (!mounted.current) { session.current.cancel(); return; }
          listening.current = true;
          setIsPreview(true);
          setState("listening");
          maximumTimer.current = window.setTimeout(() => { if (listening.current && !autoFinishing.current) { autoFinishing.current = true; void finish(); } }, 10000);
          return;
        } catch {
          setError("暂时无法开启语音评星，请允许使用麦克风后再试。");
          setErrorKind("general");
          setState("error");
          return;
        }
      }
      setError(reason instanceof DOMException && reason.name === "NotAllowedError" ? "请先允许使用麦克风，再重新评测。" : "语音服务连接失败。请检查网络；若反复出现，请管理员核对讯飞服务配置。");
      setErrorKind("general");
      setState("error");
    }
  }

  async function finish() {
    if (!session.current) return;
    listening.current = false;
    window.clearTimeout(maximumTimer.current);
    setState("processing");
    try {
      const result = await session.current.stop();
      session.current = undefined;
      if (!mounted.current) return;
      await onEvaluated(result);
      setState("done");
    } catch (reason) {
      if (!mounted.current) return;
      session.current = undefined;
      if (reason instanceof SpeechContentMismatchError) {
        setError(sentence ? "有字词读错或漏读，请看清句子，再完整读一次。" : `好像不是“${referenceText}”，请看图再清楚地说一次。`);
        setErrorKind("mismatch");
      } else {
        setError(reason instanceof Error ? reason.message : "智能评星生成失败。");
        setErrorKind("general");
      }
      setState("error");
    }
  }

  const isBusy = state === "connecting" || state === "processing";
  const isListening = state === "listening";
  const isDone = state === "done";
  const microphoneLabel = isListening ? "正在自动识别" : isBusy ? "正在处理语音" : isDone ? "重新智能评测" : "开始智能评测";
  const helperText = isPreview ? "智能服务未就绪，请使用教师评价" : isListening ? "正在收音" : state === "connecting" ? "正在连接麦克风与语音服务" : state === "processing" ? "正在生成评分" : isDone ? "评测完成" : "";

  return <div className={`smart-evaluator smart-evaluator--mic ${featured ? "smart-evaluator--featured" : ""} ${isListening ? "is-listening" : ""}`}>
    <div className="smart-evaluator__mic-wrap">
      <button type="button" className="smart-evaluator__mic" disabled={isBusy || isListening} onPointerEnter={() => { void prepareSpeechAuth().catch(() => undefined); }} onFocus={() => { void prepareSpeechAuth().catch(() => undefined); }} onClick={start} aria-label={microphoneLabel} title={microphoneLabel}>
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8" /></svg>
      </button>
      <strong className="smart-evaluator__mic-label">{isListening ? "正在识别" : isDone ? "再测一次" : "点击说话"}</strong>
    </div>
    <div className="smart-evaluator__body" aria-live="polite">
      <div className="smart-evaluator__headline"><strong>{isListening ? "正在听你说话" : state === "connecting" ? "正在准备收音" : state === "processing" ? "正在分析声音" : isDone ? "本次表达观察" : "准备好就说出来"}</strong><span>{formatTime(seconds)}</span></div>
      <div className={`smart-evaluator__voiceprint ${isListening ? "is-listening" : "is-idle"} ${volume > .08 ? "has-sound" : ""}`} aria-label={isListening ? "正在识别声音" : "语音声纹"}>{voiceprint.map((height, index) => <i key={index} style={{ height: `${height}%`, animationDelay: `${index * -.055}s`, animationDuration: `${.88 + (index % 6) * .075}s` }} />)}</div>
      {helperText && <small>{helperText}</small>}
    </div>
    <div className="smart-evaluator__dimensions" aria-label="三个维度的智能评星">
      {dimensions.map(({ key, label }) => {
        const score = dimensionRatings?.[key];
        const stars = strictRating ? strictPronunciationStars(score) : getStars(score);
        return <div className={`smart-evaluator__dimension ${score !== undefined ? "is-complete" : ""}`} key={key}>
          <span>{label}</span>
          <strong aria-label={score !== undefined ? `${label}${stars}颗星` : `${label}待评测`}><StarRating value={stars} /></strong>
        </div>;
      })}
    </div>
    {error && <div className={`smart-evaluator__error ${errorKind === "mismatch" ? "smart-evaluator__error--mismatch" : ""}`} role="alert">
      <button type="button" className="smart-evaluator__error-retry" onClick={start} aria-label="重新评测" title="重新评测"><img src="/assets/icons/refresh.svg" alt="" /><strong>{errorKind === "mismatch" ? "再试一次" : "重新评测"}</strong></button>
      <small>{error}</small>
    </div>}
  </div>;
}

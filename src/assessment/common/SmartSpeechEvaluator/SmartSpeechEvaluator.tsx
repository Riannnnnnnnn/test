import { useEffect, useRef, useState } from "react";
import { VoiceConsole } from "@/assessment/common/VoiceConsole/VoiceConsole";
import { warmMicrophone } from "@/services/audio/microphone";
import { SmartEvaluationUnavailableError, SpeechContentMismatchError, prepareSpeechAuth, startPreviewSpeechSession, startXfyunIse, type XfyunIseResult, type XfyunIseSession } from "@/services/speech/xfyunIse";
import { strictPronunciationStars } from "@/services/scoring/pronunciation";

interface SmartSpeechEvaluatorProps {
  sentence?: boolean;
  studentGrade?: string;
  evidence?: XfyunIseResult;
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
  { key: "pronunciationScore", label: "声韵清晰" },
  { key: "toneScore", label: "声调准确" },
  { key: "accuracyScore", label: "朗读准确度" },
];

export function SmartSpeechEvaluator({ referenceText, studentGrade, evidence, initialScore, initialPreview = false, dimensionRatings, sentence = false, strictRating = false, onReset, onEvaluated }: SmartSpeechEvaluatorProps) {
  const mounted = useRef(true);
  const session = useRef<XfyunIseSession | undefined>(undefined);
  const listening = useRef(false);
  const heardSince = useRef(0);
  const silenceSince = useRef(0);
  const autoFinishing = useRef(false);
  const maximumTimer = useRef(0);
  const [state, setState] = useState<EvaluationState>(initialScore !== undefined || evidence ? "done" : "idle");
  const [volume, setVolume] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<"mismatch" | "general" | "">("");
  const [isPreview, setIsPreview] = useState(initialPreview);
  const [networkReady, setNetworkReady] = useState(false);
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
  useEffect(() => { void prepareSpeechAuth().catch(() => undefined); void warmMicrophone(); }, [referenceText]);
  useEffect(() => {
    if (evidence || initialScore !== undefined || initialPreview || state !== "done") return;
    setState("idle");
    setVolume(0);
    setSeconds(0);
  }, [evidence, initialPreview, initialScore, state]);
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
    setNetworkReady(false);
    setState("connecting");
    try {
      const sessionPromise = startXfyunIse({ referenceText, studentGrade, category: sentence ? "read_sentence" : referenceText.length <= 1 ? "read_syllable" : "read_word", onVolume: volumeChanged });
      void sessionPromise.catch(() => undefined);
      try {
        await onReset?.();
      } catch (reason) {
        void sessionPromise.then((opened) => opened.cancel(), () => undefined);
        throw reason;
      }
      if (!mounted.current) { void sessionPromise.then((opened) => opened.cancel(), () => undefined); return; }
      session.current = await sessionPromise;
      if (!mounted.current) { session.current.cancel(); return; }
      listening.current = true;
      setState("listening");
      maximumTimer.current = window.setTimeout(() => { if (listening.current && !autoFinishing.current) { autoFinishing.current = true; void finish(); } }, sentence ? 30000 : 10000);
      const activeSession = session.current;
      void activeSession.ready?.then(() => {
        if (mounted.current && session.current === activeSession) setNetworkReady(true);
      }, (reason: unknown) => {
        if (!mounted.current || session.current !== activeSession) return;
        listening.current = false;
        window.clearTimeout(maximumTimer.current);
        activeSession.cancel();
        session.current = undefined;
        setError(reason instanceof SmartEvaluationUnavailableError ? "智能语音服务未就绪，请使用教师评分。" : "语音服务连接失败，请检查网络或联系管理员后重试。");
        setErrorKind("general");
        setState("error");
      });
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
        setError(reason.message);
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
  const micLabel = isListening ? "正在识别" : isBusy ? "请稍候" : isDone ? "再测一次" : "点击说话";
  const micAria = isListening ? "正在自动识别" : isBusy ? "正在处理语音" : isDone ? "重新智能评测" : "开始智能评测";
  const headline = isListening ? "正在听你说话" : state === "connecting" ? "正在准备收音" : state === "processing" ? "正在分析声音" : isDone ? "本次表达观察" : state === "error" ? "没有听清，再来一次" : "准备好就说出来";
  const hint = isPreview ? "智能服务未就绪，请使用教师评价" : isListening ? networkReady ? "说完后停顿一下，系统会自动结束" : "已开始收音，正在连接评测服务" : state === "connecting" ? "正在打开麦克风" : state === "processing" ? "正在生成评分" : isDone ? "评测完成" : "";
  const dimensionItems = dimensions.map(({ key, label }) => {
    const score = evidence ? evidence[key as "accuracyScore" | "pronunciationScore" | "toneScore"] : dimensionRatings?.[key];
    return { key, label, done: score !== undefined && !evidence?.reviewReasons?.length, stars: evidence?.reviewReasons?.length ? 0 : strictRating ? strictPronunciationStars(score) : getStars(score) };
  });

  return <VoiceConsole state={state} level={volume} timer={formatTime(seconds)} headline={headline} hint={hint} micLabel={micLabel} micAria={micAria} onStart={start} onPrepare={() => { void prepareSpeechAuth().catch(() => undefined); void warmMicrophone(); }} dimensions={dimensionItems} dimensionsAria="三个维度的智能评星">
    {error && <div className={`vc__error ${errorKind === "mismatch" ? "vc__error--mismatch" : ""}`} role="alert">
      <button type="button" className="vc__error-retry" onClick={start} aria-label="重新评测" title="重新评测"><img src="/assets/icons/refresh.svg" alt="" /><strong>{errorKind === "mismatch" ? "再试一次" : "重新评测"}</strong></button>
      <small>{error}</small>
    </div>}
  </VoiceConsole>;
}

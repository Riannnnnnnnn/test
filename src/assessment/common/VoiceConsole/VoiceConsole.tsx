import type { CSSProperties, ReactNode } from "react";
import { StarRating } from "@/components/ui";
import { Waveform, type WaveMode } from "./Waveform";

export type VoiceState = "idle" | "connecting" | "listening" | "processing" | "done" | "error";

export interface VoiceDimension { key: string; label: string; stars: number; done: boolean; statusText?: string; statusTone?: "success" | "review" | "pending"; }

interface VoiceConsoleProps {
  state: VoiceState;
  /** 0–1 的实时音量 */
  level: number;
  timer: string;
  headline: string;
  hint?: string;
  micLabel: string;
  micAria: string;
  onStart: () => void;
  onStop?: () => void;
  onPrepare?: () => void;
  dimensions: VoiceDimension[];
  dimensionsAria: string;
  className?: string;
  children?: ReactNode;
}

const chipText: Record<VoiceState, string> = {
  idle: "待机", connecting: "连接中", listening: "收音中", processing: "分析中", done: "已完成", error: "需重试",
};

function MicIcon() {
  return <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="11.5" rx="3" /><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v4.5M8.5 21.5h7" /></svg>;
}
function ReplayIcon() {
  return <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4.5v4.2h-4.2" /></svg>;
}

export function VoiceConsole({ state, level, timer, headline, hint, micLabel, micAria, onStart, onStop, onPrepare, dimensions, dimensionsAria, className = "", children }: VoiceConsoleProps) {
  const busy = state === "connecting" || state === "processing";
  const listening = state === "listening";
  const mode: WaveMode = listening ? "live" : state === "processing" ? "scan" : state === "done" ? "settled" : "idle";
  const style = { "--lv": Math.min(1, level * 1.6).toFixed(3) } as CSSProperties;
  return <div className={`vc vc--${state} ${className}`.trim()} style={style}>
    <div className="vc__mic">
      <div className="vc__orb-wrap">
        <i className="vc__ripple" aria-hidden="true" /><i className="vc__ripple vc__ripple--2" aria-hidden="true" /><i className="vc__ripple vc__ripple--3" aria-hidden="true" />
        <span className="vc__spin" aria-hidden="true" />
        <button type="button" className="vc__orb" disabled={busy || (listening && !onStop)} onClick={listening ? onStop : onStart} onPointerEnter={(event) => { if (event.pointerType === "mouse" && !listening && !busy) onPrepare?.(); }} aria-label={micAria} title={micAria}>
          {listening ? <span className="vc__eq" aria-hidden="true"><i /><i /><i /><i /></span> : state === "done" ? <ReplayIcon /> : <MicIcon />}
        </button>
      </div>
      <span className="vc__mic-label">{micLabel}</span>
    </div>
    <div className="vc__main" aria-live="polite">
      <div className="vc__status">
        <span className="vc__chip"><i aria-hidden="true" />{chipText[state]}</span>
        <strong className="vc__headline">{headline}</strong>
        <time className="vc__timer">{timer}</time>
      </div>
      <div className="vc__scope"><Waveform level={level} mode={mode} /></div>
      <small className="vc__hint">{hint}</small>
    </div>
    <div className="vc__dims" role="group" aria-label={dimensionsAria}>
      {dimensions.map(({ key, label, stars, done, statusText, statusTone }) => <div className={`vc-dim ${done ? "is-complete" : ""} ${statusTone === "review" ? "is-review" : ""}`} key={key}>
        <span className="vc-dim__label">{label}</span>
        {statusText ? <strong className={`vc-dim__result vc-dim__result--${statusTone ?? "pending"}`} aria-label={`${label}：${statusText}`}><span aria-hidden="true">{statusTone === "success" ? "✓" : statusTone === "review" ? "!" : "·"}</span>{statusText}</strong>
          : <strong className="vc-dim__stars" aria-label={done ? `${label}${stars}颗星` : `${label}待评测`}><StarRating value={stars} /></strong>}
      </div>)}
    </div>
    {children}
  </div>;
}

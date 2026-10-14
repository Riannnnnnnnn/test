import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { BrowserAudioRecorder, type AudioRecording } from "@/services/audio";

interface RecorderProps {
  onRecorded?: (recording: AudioRecording) => void | Promise<void>;
  onVolume?: (volume: number) => void;
  onRecordingChange?: (recording: boolean) => void;
  compact?: boolean;
}

export function Recorder({ onRecorded, onVolume, onRecordingChange, compact = false }: RecorderProps) {
  const service = useRef(new BrowserAudioRecorder());
  const [state, setState] = useState<"idle" | "recording" | "ready" | "error">("idle");
  const [recordingUrl, setRecordingUrl] = useState<string>();
  const [duration, setDuration] = useState(0);

  useEffect(() => () => { service.current.cancel(); if (recordingUrl) URL.revokeObjectURL(recordingUrl); }, [recordingUrl]);

  useEffect(() => {
    if (state !== "recording") return;
    const timer = window.setInterval(() => setDuration((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  async function start() {
    try { setDuration(0); await service.current.start(onVolume); setState("recording"); onRecordingChange?.(true); } catch { setState("error"); }
  }

  async function stop() {
    try {
      const recording = await service.current.stop();
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(URL.createObjectURL(recording.blob));
      setState("ready");
      onRecordingChange?.(false);
      await onRecorded?.(recording);
    } catch { setState("error"); }
  }

  return <div className={`recorder ${compact ? "recorder--compact" : ""}`}><Button type="button" variant={state === "recording" ? "danger" : "primary"} onClick={state === "recording" ? stop : start}><span className={`record-dot ${state === "recording" ? "is-live" : ""}`} />{state === "recording" ? `停止录音 · ${duration}s` : state === "ready" ? "重新录音" : "开始录音"}</Button>{recordingUrl && <audio controls src={recordingUrl} />}{state === "error" && <span className="field__error">无法使用麦克风，请检查浏览器权限。</span>}</div>;
}

import { useEffect, useRef, useState } from "react";
import { Waveform } from "@/assessment/common/VoiceConsole/Waveform";
import { Button } from "@/components/ui";
import { acquireMicrophone, releaseMicrophone } from "@/services/audio/microphone";

type Status = "idle" | "requesting" | "listening" | "success" | "error";

interface MicrophoneCheckProps {
  onPassedChange: (passed: boolean) => void;
}

export function MicrophoneCheck({ onPassedChange }: MicrophoneCheckProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("正式评测前，请先检查麦克风是否正常。对着麦克风发出声音即可。");
  const [level, setLevel] = useState(0);
  const generation = useRef(0);
  const release = useRef<() => void>(() => {});

  useEffect(() => () => { generation.current += 1; release.current(); }, []);

  function stop() {
    generation.current += 1;
    release.current();
    onPassedChange(false);
    setLevel(0);
    setStatus("idle");
    setMessage("已停止测试，可以重新测试麦克风。");
  }

  async function start() {
    const run = ++generation.current;
    release.current();
    onPassedChange(false);
    setLevel(0);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage("当前浏览器无法使用麦克风，请通过 HTTPS 链接在 Safari 或 Chrome 中打开。");
      return;
    }
    setStatus("requesting");
    setMessage("请在浏览器提示中允许使用麦克风。");
    let stream: MediaStream | undefined;
    let audio: AudioContext | undefined;
    let frame = 0;
    let timer = 0;
    const cleanup = (keepForAssessment = false) => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      if (stream) {
        if (keepForAssessment) releaseMicrophone(stream);
        else stream.getTracks().forEach((track) => track.stop());
        stream = undefined;
      }
      if (audio && audio.state !== "closed") void audio.close().catch(() => {});
    };
    release.current = cleanup;
    try {
      // Resume during the button gesture so mobile browsers can activate audio.
      audio = new AudioContext();
      await audio.resume();
      if (run !== generation.current) { cleanup(); return; }
      stream = await acquireMicrophone();
      if (run !== generation.current) { cleanup(); return; }
      const analyser = audio.createAnalyser();
      analyser.fftSize = 1024;
      audio.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      let soundSince = 0;
      setStatus("listening");
      setMessage("请对着麦克风发出声音，观察下方音量条是否变化。");
      const finish = (next: Status, text: string) => {
        if (run !== generation.current) return;
        cleanup(next === "success");
        setLevel(0);
        setStatus(next);
        setMessage(text);
        onPassedChange(next === "success");
      };
      timer = window.setTimeout(() => finish("error", "暂未收到明显声音，请靠近麦克风说话，检查系统输入音量或设备后重试。"), 10000);
      const sample = () => {
        if (run !== generation.current) return;
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
        setLevel(Math.min(1, rms * 5));
        if (rms > .015) {
          if (!soundSince) soundSince = performance.now();
          if (performance.now() - soundSince > 300) {
            finish("success", "麦克风正常，已收到声音，可以开始评测。测试已结束。");
            return;
          }
        } else soundSince = 0;
        frame = requestAnimationFrame(sample);
      };
      frame = requestAnimationFrame(sample);
    } catch (error) {
      cleanup();
      if (run !== generation.current) return;
      const name = error instanceof Error ? error.name : "";
      setStatus("error");
      setMessage(name === "NotAllowedError" ? "麦克风权限未开启，请在浏览器或系统设置中允许访问，然后重试。" : name === "NotFoundError" ? "没有找到麦克风，请连接设备后重试。" : name === "NotReadableError" ? "麦克风暂时无法使用，请关闭可能占用麦克风的应用后重试。" : "麦克风测试未能完成，请检查设备或换用 Safari、Chrome 后重试。");
    }
  }

  const active = status === "requesting" || status === "listening";
  return <section className={`microphone-check microphone-check--${status}`} aria-label="评测前麦克风测试">
    <div className="microphone-check__body">
      <strong>{status === "success" ? "✓ 麦克风正常" : "麦克风测试"}</strong>
      <p role="status">{message}</p>
      {status === "listening" && <div className="microphone-check__wave" role="meter" aria-label="麦克风输入音量" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}><Waveform level={level} mode="live" /></div>}
      <small>仅检测收音，不保存录音。收到声音后才能开始正式评测。</small>
    </div>
    <Button variant="secondary" onClick={active ? stop : start}>{active ? "停止测试" : status === "idle" ? "测试麦克风" : "重新测试麦克风"}</Button>
  </section>;
}

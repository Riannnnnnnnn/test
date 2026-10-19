import { acquireMicrophone, releaseMicrophone } from "./microphone";
import type { AudioRecorderService, AudioRecording } from "./types";

export class BrowserAudioRecorder implements AudioRecorderService {
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private audioContext?: AudioContext;
  private animationFrame?: number;

  async start(onVolume?: (volume: number) => void): Promise<void> {
    this.stream = await acquireMicrophone();
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.addEventListener("dataavailable", (event) => { if (event.data.size) this.chunks.push(event.data); });
    this.startedAt = performance.now();
    this.recorder.start();
    if (onVolume) this.watchVolume(onVolume);
  }

  private watchVolume(onVolume: (volume: number) => void) {
    if (!this.stream) return;
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.72;
    source.connect(analyser);
    const values = new Uint8Array(analyser.fftSize);
    const sample = () => {
      analyser.getByteTimeDomainData(values);
      const sum = values.reduce((total, value) => total + Math.pow((value - 128) / 128, 2), 0);
      onVolume(Math.min(1, Math.sqrt(sum / values.length) * 4.2));
      this.animationFrame = requestAnimationFrame(sample);
    };
    sample();
  }

  private releaseMedia() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = undefined;
    void this.audioContext?.close();
    this.audioContext = undefined;
    if (this.stream) releaseMicrophone(this.stream);
    this.stream = undefined;
  }

  stop(): Promise<AudioRecording> {
    return new Promise((resolve, reject) => {
      if (!this.recorder || this.recorder.state === "inactive") { reject(new Error("当前没有进行中的录音。")); return; }
      this.recorder.addEventListener("stop", () => {
        const mimeType = this.recorder?.mimeType || "audio/webm";
        this.releaseMedia();
        resolve({ blob: new Blob(this.chunks, { type: mimeType }), duration: Math.round(performance.now() - this.startedAt), mimeType });
      }, { once: true });
      this.recorder.stop();
    });
  }

  cancel(): void { if (this.recorder?.state === "recording") this.recorder.stop(); this.releaseMedia(); }
}

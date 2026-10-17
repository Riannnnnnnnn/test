export interface XfyunIseResult {
  totalScore: number;
  pronunciationScore?: number;
  toneScore?: number;
  fluencyScore?: number;
  integrityScore?: number;
  stars: number;
  transcript?: string;
  sessionId?: string;
  rawXml: string;
}

interface StartOptions {
  referenceText: string;
  category?: "read_syllable" | "read_word" | "read_sentence";
  onVolume?: (volume: number) => void;
}

interface AuthResponse { appId: string; url: string; iatUrl?: string; message?: string; }

export interface XfyunIseSession {
  stop: () => Promise<XfyunIseResult>;
  cancel: () => void;
}

export class SmartEvaluationUnavailableError extends Error {}
export class SpeechContentMismatchError extends Error {}

const FRAME_BYTES = 1280;

export function normalizeSpeechText(value: string): string {
  return value.normalize("NFKC").replace(/[\s，。！？、,.!?；;：:“”'‘’（）()《》【】—-]/g, "");
}

export function matchesReferenceText(transcript: string, referenceText: string): boolean {
  const normalizedTranscript = normalizeSpeechText(transcript);
  const normalizedReference = normalizeSpeechText(referenceText);
  return normalizedTranscript.length > 0 && normalizedTranscript === normalizedReference;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function downsampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === 16000) return input;
  const ratio = inputRate / 16000;
  const length = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const start = Math.round(index * ratio);
    const end = Math.min(input.length, Math.round((index + 1) * ratio));
    let total = 0;
    for (let sourceIndex = start; sourceIndex < end; sourceIndex += 1) total += input[sourceIndex];
    output[index] = total / Math.max(1, end - start);
  }
  return output;
}

function floatToPcm16(input: Float32Array): Uint8Array {
  const bytes = new Uint8Array(input.length * 2);
  const view = new DataView(bytes.buffer);
  input.forEach((sample, index) => {
    const normalized = Math.max(-1, Math.min(1, sample));
    view.setInt16(index * 2, normalized < 0 ? normalized * 0x8000 : normalized * 0x7fff, true);
  });
  return bytes;
}

function normalizeScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 5) return Math.round(value * 20);
  if (value <= 10) return Math.round(value * 10);
  return Math.max(0, Math.min(100, Math.round(value)));
}

function findXmlScore(xml: XMLDocument, names: string[]): number | undefined {
  const elements = Array.from(xml.getElementsByTagName("*"));
  for (const name of names) {
    for (const element of elements) {
      const attribute = element.getAttribute(name);
      if (attribute !== null && Number.isFinite(Number(attribute))) return normalizeScore(Number(attribute));
      if (element.tagName.toLowerCase() === name && element.getAttribute("value") !== null) return normalizeScore(Number(element.getAttribute("value")));
    }
  }
  return undefined;
}

export function parseXfyunIseResult(rawXml: string, sessionId?: string): XfyunIseResult {
  const xml = new DOMParser().parseFromString(rawXml, "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("智能评测结果解析失败，请重新评测。");
  const rejected = Array.from(xml.getElementsByTagName("*")).some((element) => element.getAttribute("is_rejected") === "true");
  const pronunciationNodes = [...Array.from(xml.getElementsByTagName("word")), ...Array.from(xml.getElementsByTagName("syll"))];
  const hasMissingOrReplacedSyllable = pronunciationNodes.some((element) => {
    const message = Number(element.getAttribute("dp_message") ?? 0);
    return (message & 16) === 16 || (message & 128) === 128;
  });
  if (rejected || hasMissingOrReplacedSyllable) throw new SpeechContentMismatchError("没有识别到与题目匹配的完整词语。");
  const totalScore = findXmlScore(xml, ["total_score", "accuracy_score", "phone_score"]);
  if (totalScore === undefined) throw new Error("未返回有效评分，请重新评测。");
  return {
    totalScore,
    pronunciationScore: findXmlScore(xml, ["phone_score", "accuracy_score"]),
    toneScore: findXmlScore(xml, ["tone_score"]),
    fluencyScore: findXmlScore(xml, ["fluency_score"]),
    integrityScore: findXmlScore(xml, ["integrity_score"]),
    stars: Math.max(1, Math.min(5, Math.ceil(totalScore / 20))),
    sessionId,
    rawXml,
  };
}

export async function startXfyunIse({ referenceText, category = "read_word", onVolume }: StartOptions): Promise<XfyunIseSession> {
  const authResponse = await fetch("/api/xfyun/ise-auth", { cache: "no-store" });
  const auth = await authResponse.json() as AuthResponse;
  if (authResponse.status === 503) throw new SmartEvaluationUnavailableError(auth.message || "智能语音评星服务暂未就绪。");
  if (!authResponse.ok || !auth.appId || !auth.url || !auth.iatUrl) throw new Error(auth.message || "智能语音评星暂时无法开启。");

  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;
  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(audioContext.destination);

  const iseSocket = new WebSocket(auth.url);
  const iatSocket = new WebSocket(auth.iatUrl);
  let stopped = false;
  let firstIseFrame = true;
  let firstIatFrame = true;
  let pendingBytes: number[] = [];
  let resolveResult!: (result: XfyunIseResult) => void;
  let rejectResult!: (error: Error) => void;
  const resultPromise = new Promise<XfyunIseResult>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  void resultPromise.catch(() => undefined);
  let resolveTranscript!: (transcript: string) => void;
  let rejectTranscript!: (error: Error) => void;
  const transcriptPromise = new Promise<string>((resolve, reject) => { resolveTranscript = resolve; rejectTranscript = reject; });
  void transcriptPromise.catch(() => undefined);
  const transcriptParts = new Map<number, string>();

  const cleanupAudio = () => {
    processor.disconnect();
    source.disconnect();
    silentGain.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    void audioContext.close();
    onVolume?.(0);
  };

  const sendAudio = (bytes: Uint8Array) => {
    if (bytes.length === 0) return;
    const audio = bytesToBase64(bytes);
    if (iseSocket.readyState === WebSocket.OPEN) {
      iseSocket.send(JSON.stringify({
        business: { cmd: "auw", aus: firstIseFrame ? 1 : 2, aue: "raw" },
        data: { status: 1, data: audio, data_type: 1, encoding: "raw" },
      }));
      firstIseFrame = false;
    }
    if (iatSocket.readyState === WebSocket.OPEN) {
      iatSocket.send(JSON.stringify(firstIatFrame ? {
        common: { app_id: auth.appId },
        business: { language: "zh_cn", domain: "iat", accent: "mandarin", ptt: 0, eos: 1200 },
        data: { status: 0, format: "audio/L16;rate=16000", encoding: "raw", audio },
      } : {
        data: { status: 1, format: "audio/L16;rate=16000", encoding: "raw", audio },
      }));
      firstIatFrame = false;
    }
  };

  iseSocket.onmessage = (event) => {
    try {
      const response = JSON.parse(String(event.data)) as { code?: number; message?: string; sid?: string; data?: { status?: number; data?: string } };
      if (response.code && response.code !== 0) {
        rejectResult(new Error(`智能评测暂时无法完成：${response.message || response.code}`));
        iseSocket.close(1000);
        return;
      }
      if (response.data?.status === 2 && response.data.data) {
        resolveResult(parseXfyunIseResult(decodeBase64Utf8(response.data.data), response.sid));
        iseSocket.close(1000);
      }
    } catch (reason) {
      rejectResult(reason instanceof SpeechContentMismatchError ? reason : new Error("智能评测返回的数据无法解析。"));
    }
  };
  iseSocket.onerror = () => rejectResult(new Error("无法连接智能评测服务，请稍后重试。"));

  iatSocket.onmessage = (event) => {
    try {
      const response = JSON.parse(String(event.data)) as {
        code?: number;
        message?: string;
        data?: { status?: number; result?: { sn?: number; ws?: Array<{ cw?: Array<{ w?: string }> }> } };
      };
      if (response.code && response.code !== 0) {
        rejectTranscript(new Error(`语音内容校验暂时无法完成：${response.message || response.code}`));
        iatSocket.close(1000);
        return;
      }
      const result = response.data?.result;
      if (result) {
        const text = result.ws?.map((segment) => segment.cw?.[0]?.w ?? "").join("") ?? "";
        transcriptParts.set(result.sn ?? transcriptParts.size, text);
      }
      if (response.data?.status === 2) {
        resolveTranscript([...transcriptParts.entries()].sort(([left], [right]) => left - right).map(([, text]) => text).join(""));
        iatSocket.close(1000);
      }
    } catch {
      rejectTranscript(new Error("语音内容校验返回的数据无法解析。"));
    }
  };
  iatSocket.onerror = () => rejectTranscript(new Error("无法连接语音内容校验服务，请稍后重试。"));

  const waitForSocket = (socket: WebSocket, serviceName: string, onOpen?: () => void) => new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(`连接${serviceName}超时。`)), 10000);
    socket.addEventListener("open", () => {
      window.clearTimeout(timeout);
      onOpen?.();
      resolve();
    }, { once: true });
    socket.addEventListener("error", () => { window.clearTimeout(timeout); reject(new Error(`无法连接${serviceName}。`)); }, { once: true });
  });

  await Promise.all([
    waitForSocket(iseSocket, "智能评测服务", () => {
      iseSocket.send(JSON.stringify({
        common: { app_id: auth.appId },
        business: {
          sub: "ise", ent: "cn_vip", category, cmd: "ssb", tte: "utf-8", ttp_skip: true,
          auf: "audio/L16;rate=16000", aue: "raw", rstcd: "utf8", group: "pupil",
          rst: "entirety", ise_unite: "1", plev: "0", extra_ability: "multi_dimension", text: `\uFEFF${referenceText}`,
        },
        data: { status: 0, data: "" },
      }));
    }),
    waitForSocket(iatSocket, "语音内容校验服务"),
  ]).catch((error: unknown) => {
    cleanupAudio();
    iseSocket.close();
    iatSocket.close();
    throw error;
  });

  processor.onaudioprocess = (event) => {
    if (stopped) return;
    const samples = event.inputBuffer.getChannelData(0);
    const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
    onVolume?.(Math.min(1, rms * 5));
    pendingBytes.push(...floatToPcm16(downsampleTo16k(samples, audioContext.sampleRate)));
    while (pendingBytes.length >= FRAME_BYTES) sendAudio(Uint8Array.from(pendingBytes.splice(0, FRAME_BYTES)));
  };

  return {
    stop: async () => {
      if (!stopped) {
        stopped = true;
        cleanupAudio();
        if (pendingBytes.length) sendAudio(Uint8Array.from(pendingBytes));
        pendingBytes = [];
        if (iseSocket.readyState === WebSocket.OPEN) iseSocket.send(JSON.stringify({ business: { cmd: "auw", aus: 4, aue: "raw" }, data: { status: 2, data: "", data_type: 1, encoding: "raw" } }));
        if (iatSocket.readyState === WebSocket.OPEN) iatSocket.send(JSON.stringify({ data: { status: 2, format: "audio/L16;rate=16000", encoding: "raw", audio: "" } }));
      }
      const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("智能评星生成超时，请重新评测。")), 15000));
      const [result, transcript] = await Promise.race([Promise.all([resultPromise, transcriptPromise]), timeout]);
      if (!matchesReferenceText(transcript, referenceText)) {
        const recognized = normalizeSpeechText(transcript);
        throw new SpeechContentMismatchError(recognized ? `识别到“${recognized}”，不是题目中的“${referenceText}”。` : `没有识别到题目中的“${referenceText}”。`);
      }
      return { ...result, transcript };
    },
    cancel: () => {
      if (stopped) return;
      stopped = true;
      cleanupAudio();
      iseSocket.close(1000);
      iatSocket.close(1000);
    },
  };
}

export async function startPreviewSpeechSession({ onVolume }: Pick<StartOptions, "onVolume">): Promise<XfyunIseSession> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);
  const timer = window.setInterval(() => {
    analyser.getByteTimeDomainData(samples);
    const volume = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
    onVolume?.(Math.min(1, volume * 5));
  }, 60);
  let stopped = false;
  const cleanup = () => {
    window.clearInterval(timer);
    source.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    void audioContext.close();
    onVolume?.(0);
  };
  return {
    stop: async () => {
      if (!stopped) { stopped = true; cleanup(); }
      return { totalScore: 0, stars: 0, rawXml: "", sessionId: "preview" };
    },
    cancel: () => { if (!stopped) { stopped = true; cleanup(); } },
  };
}

import { acquireMicrophone, releaseMicrophone } from "@/services/audio/microphone";

export interface XfyunIseResult {
  totalScore: number;
  accuracyScore?: number;
  emotionScore?: number;
  reviewReasons?: string[];
  issues?: Array<{ text: string; kind: string; position?: string }>;
  category?: string;
  requestParameters?: Record<string, unknown>;
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
  category?: "read_syllable" | "read_word" | "read_sentence" | "read_chapter";
  studentGrade?: string;
  onVolume?: (volume: number) => void;
}

interface AuthResponse { appId: string; url: string; iatUrl: string; message?: string; }

let authCache: { expiresAt: number; promise: Promise<AuthResponse> } | undefined;

function getSpeechAuth(): Promise<AuthResponse> {
  if (authCache && Date.now() < authCache.expiresAt) return authCache.promise;
  const promise = fetch("/api/xfyun/ise-auth", { cache: "no-store" }).then(async (response) => {
    const auth = await response.json() as AuthResponse;
    if (response.status === 503) throw new SmartEvaluationUnavailableError(auth.message || "智能语音评星服务暂未就绪。");
    if (!response.ok || !auth.appId || !auth.url || !auth.iatUrl) throw new Error(auth.message || "智能语音评星暂时无法开启。");
    return auth;
  });
  authCache = { expiresAt: Date.now() + 45_000, promise };
  void promise.catch(() => { if (authCache?.promise === promise) authCache = undefined; });
  return promise;
}

export function prepareSpeechAuth(): Promise<void> {
  return getSpeechAuth().then(() => undefined);
}

export interface XfyunIseSession {
  ready?: Promise<void>;
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

// Keep fractional sample coverage between callbacks (notably 44.1 kHz input).
export function create16kResampler(inputRate: number) {
  if (!Number.isFinite(inputRate) || inputRate <= 0) throw new Error("无效的录音采样率");
  const ratio = inputRate / 16000;
  let covered = 0;
  let sum = 0;
  return (input: Float32Array): Float32Array => {
    if (inputRate === 16000) return input;
    const output: number[] = [];
    for (const sample of input) {
      let remaining = 1;
      while (remaining > 1e-10) {
        const width = Math.min(remaining, ratio - covered);
        sum += sample * width;
        covered += width;
        remaining -= width;
        if (covered >= ratio - 1e-10) {
          output.push(sum / ratio);
          covered = 0;
          sum = 0;
        }
      }
    }
    return Float32Array.from(output);
  };
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

// Only for rst=entirety + ise_unite=1: scores are percentages, including 0–10.
export function parseXfyunIseResult(rawXml: string, sessionId?: string, category?: string): XfyunIseResult {
  const xml = new DOMParser().parseFromString(rawXml, "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("智能评测结果解析失败，请重新评测。");
  const roots = Array.from(xml.querySelectorAll("read_syllable, read_word, read_sentence, read_chapter"))
    .filter((node) => node.hasAttribute("total_score") && (!category || node.tagName === category));
  if (roots.length !== 1) throw new Error("未返回唯一的题目级完整评分，请重新评测。");
  const root = roots[0];
  const score = (name: string) => {
    const value = root.getAttribute(name);
    if (value === null || !value.trim()) return undefined;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 100 ? number : undefined;
  };
  const totalScore = score("total_score");
  if (totalScore === undefined) throw new Error("未返回有效评分，请重新评测。");
  const reviewReasons: string[] = [];
  const nodes = [root, ...Array.from(root.querySelectorAll("*"))];
  if (nodes.some((node) => ["true", "1"].includes(node.getAttribute("is_rejected") ?? ""))) reviewReasons.push("引擎拒评，本次分数不可作为成绩");
  const exceptions: Record<string, string> = { "28673": "未检测到清晰语音或音量过小", "28676": "引擎检测到内容不匹配", "28680": "背景噪声过大", "28690": "录音出现截幅", "28689": "没有音频输入" };
  for (const node of nodes) {
    const exception = node.getAttribute("except_info");
    if (exception && exception !== "0") reviewReasons.push(exceptions[exception] ?? `引擎异常（${exception}），请教师复核`);
  }
  const issues: NonNullable<XfyunIseResult["issues"]> = [];
  for (const node of root.querySelectorAll("syll, phone, word")) {
    const flag = Number(node.getAttribute("dp_message") ?? 0);
    // Prefer the containing syllable/word for duplicate alignment markers.
    const duplicate = [node.parentElement, node.parentElement?.parentElement].some((parent) =>
      parent && ["syll", "word"].includes(parent.tagName) && Number(parent.getAttribute("dp_message") ?? 0) === flag);
    const syllable = node.closest("syll");
    const text = syllable?.getAttribute("content") || node.getAttribute("content") || "未标注字音";
    const position = syllable?.getAttribute("beg_pos") ?? node.getAttribute("beg_pos") ?? undefined;
    if (flag && !duplicate) {
      const kind = ({ 16: "漏读", 32: "增读", 64: "回读", 128: "替换" } as Record<number, string>)[flag] ?? `未识别的增漏标记 ${flag}`;
      issues.push({ text, kind, position });
    }
    const perr = Number(node.getAttribute("perr_msg") ?? 0);
    // Nonzero alignment flags can be copied into perr_msg; do not count as tone errors.
    if (node.tagName === "phone" && flag === 0 && perr !== 0) {
      const kind = ({ 1: "声韵错误", 2: "声调错误", 3: "声韵及声调错误" } as Record<number, string>)[perr] ?? `未识别的发音标记 ${perr}`;
      issues.push({ text, kind, position });
    }
  }
  if (issues.length) reviewReasons.push("检测到错读或发音问题，请结合逐字提示复核；暂不生成自动星级");
  const accuracyScore = score("accuracy_score");
  const pronunciationScore = score("phone_score");
  const toneScore = score("tone_score");
  const basis = ["read_sentence", "read_chapter"].includes(root.tagName) ? accuracyScore
    : pronunciationScore !== undefined && toneScore !== undefined ? Math.min(pronunciationScore, toneScore) : undefined;
  if (basis === undefined) reviewReasons.push("缺少准确度或声韵、声调字段，请教师评分");
  return {
    totalScore,
    category: root.tagName, accuracyScore, pronunciationScore, toneScore,
    emotionScore: score("emotion_score"),
    fluencyScore: score("fluency_score"),
    integrityScore: score("integrity_score"),
    issues, reviewReasons: [...new Set(reviewReasons)],
    stars: reviewReasons.length || basis === undefined ? 0 : Math.ceil(basis / 20),
    sessionId,
    rawXml,
  };
}

export function buildIseBusiness({ referenceText, category = "read_word", studentGrade }: StartOptions) {
  const text = referenceText.replace(/^\uFEFF+/, "").trim();
  if (!normalizeSpeechText(text)) throw new Error("请先设置需要朗读的题目文字。");
  const year = /^grade-([1-6])$/.exec(studentGrade ?? "")?.[1];
  const grade = year ? Number(year) <= 2 ? "junior" : Number(year) <= 4 ? "middle" : "senior" : undefined;
  return {
    sub: "ise", ent: "cn_vip", category, cmd: "ssb", tte: "utf-8", ttp_skip: true,
    auf: "audio/L16;rate=16000", aue: "raw", rstcd: "utf8",
    group: studentGrade === "middle-school-plus" ? "youth" : "pupil",
    ...(grade && ["read_sentence", "read_chapter"].includes(category) ? { grade } : {}),
    check_type: ["read_word", "read_syllable"].includes(category) ? "hard" : "common", rst: "entirety", ise_unite: "1",
    extra_ability: "multi_dimension;syll_phone_err_msg", text: `\uFEFF${text}`,
  };
}

export async function startXfyunIse({ referenceText, category = "read_word", studentGrade, onVolume }: StartOptions): Promise<XfyunIseSession> {
  const business = buildIseBusiness({ referenceText, category, studentGrade });
  const authRequest = getSpeechAuth();
  void authRequest.catch(() => undefined);
  const stream = await acquireMicrophone();
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const resample = create16kResampler(audioContext.sampleRate);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;
  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(audioContext.destination);
  void audioContext.resume().catch(() => undefined);

  let auth: AuthResponse | undefined;
  let iseSocket: WebSocket | undefined;
  let iatSocket: WebSocket | undefined;
  let connected = false;
  let stopped = false;
  let cancelled = false;
  let cleaned = false;
  let finishedSending = false;
  let sendTimer = 0;
  let firstIseFrame = true;
  let firstIatFrame = true;
  let pendingBytes: number[] = [];
  const audioFrames: Uint8Array[] = [];
  let resolveResult!: (result: XfyunIseResult) => void;
  let rejectResult!: (error: Error) => void;
  const resultPromise = new Promise<XfyunIseResult>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  void resultPromise.catch(() => undefined);
  let resolveTranscript!: (transcript: string) => void;
  let rejectTranscript!: (error: Error) => void;
  const transcriptPromise = new Promise<string>((resolve, reject) => { resolveTranscript = resolve; rejectTranscript = reject; });
  void transcriptPromise.catch(() => undefined);
  let resolveSending!: () => void;
  let rejectSending!: (error: Error) => void;
  const sendingPromise = new Promise<void>((resolve, reject) => { resolveSending = resolve; rejectSending = reject; });
  void sendingPromise.catch(() => undefined);
  const transcriptParts = new Map<number, string>();

  const cleanupAudio = () => {
    if (cleaned) return;
    cleaned = true;
    processor.disconnect();
    source.disconnect();
    silentGain.disconnect();
    releaseMicrophone(stream);
    void audioContext.close();
    onVolume?.(0);
  };

  const fail = (error: Error) => {
    window.clearInterval(sendTimer);
    cleanupAudio();
    rejectSending(error);
    rejectResult(error);
    rejectTranscript(error);
  };

  const sendAudio = (bytes: Uint8Array) => {
    if (!iseSocket || !iatSocket || !auth || iseSocket.readyState !== WebSocket.OPEN || iatSocket.readyState !== WebSocket.OPEN) {
      throw new Error("语音连接中断，请重新评测。");
    }
    const audio = bytesToBase64(bytes);
    iseSocket.send(JSON.stringify({
      business: { cmd: "auw", aus: firstIseFrame ? 1 : 2, aue: "raw" },
      data: { status: 1, data: audio, data_type: 1, encoding: "raw" },
    }));
    firstIseFrame = false;
    iatSocket.send(JSON.stringify(firstIatFrame ? {
      common: { app_id: auth.appId },
      business: { language: "zh_cn", domain: "iat", accent: "mandarin", ptt: 0, eos: 1200 },
      data: { status: 0, format: "audio/L16;rate=16000", encoding: "raw", audio },
    } : {
      data: { status: 1, format: "audio/L16;rate=16000", encoding: "raw", audio },
    }));
    firstIatFrame = false;
  };

  const pumpAudio = () => {
    if (!connected || cancelled || finishedSending) return;
    try {
      const frame = audioFrames.shift();
      if (frame) { sendAudio(frame); return; }
      if (!stopped) return;
      if (!iseSocket || !iatSocket || iseSocket.readyState !== WebSocket.OPEN || iatSocket.readyState !== WebSocket.OPEN) throw new Error("语音连接中断，请重新评测。");
      finishedSending = true;
      window.clearInterval(sendTimer);
      iseSocket.send(JSON.stringify({ business: { cmd: "auw", aus: 4, aue: "raw" }, data: { status: 2, data: "", data_type: 1, encoding: "raw" } }));
      iatSocket.send(JSON.stringify({ data: { status: 2, format: "audio/L16;rate=16000", encoding: "raw", audio: "" } }));
      resolveSending();
    } catch (reason) {
      fail(reason instanceof Error ? reason : new Error("语音传输失败，请重新评测。"));
    }
  };

  const onIseMessage = (event: MessageEvent) => {
    try {
      const response = JSON.parse(String(event.data)) as { code?: number; message?: string; sid?: string; data?: { status?: number; data?: string } };
      if (response.code && response.code !== 0) {
        rejectResult(new Error(`智能评测暂时无法完成：${response.message || response.code}`));
        iseSocket?.close(1000);
        return;
      }
      if (response.data?.status === 2 && response.data.data) {
        resolveResult({ ...parseXfyunIseResult(decodeBase64Utf8(response.data.data), response.sid, category), requestParameters: business });
        iseSocket?.close(1000);
      }
    } catch (reason) {
      rejectResult(reason instanceof Error ? reason : new Error("智能评测返回的数据无法解析。"));
    }
  };

  const onIatMessage = (event: MessageEvent) => {
    try {
      const response = JSON.parse(String(event.data)) as {
        code?: number;
        message?: string;
        data?: { status?: number; result?: { sn?: number; ws?: Array<{ cw?: Array<{ w?: string }> }> } };
      };
      if (response.code && response.code !== 0) {
        rejectTranscript(new Error(`语音内容校验暂时无法完成：${response.message || response.code}`));
        iatSocket?.close(1000);
        return;
      }
      const result = response.data?.result;
      if (result) {
        const text = result.ws?.map((segment) => segment.cw?.[0]?.w ?? "").join("") ?? "";
        transcriptParts.set(result.sn ?? transcriptParts.size, text);
      }
      if (response.data?.status === 2) {
        resolveTranscript([...transcriptParts.entries()].sort(([left], [right]) => left - right).map(([, text]) => text).join(""));
        iatSocket?.close(1000);
      }
    } catch {
      rejectTranscript(new Error("语音内容校验返回的数据无法解析。"));
    }
  };

  const waitForSocket = (socket: WebSocket, serviceName: string, onOpen?: () => void) => new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(`连接${serviceName}超时。`)), 10000);
    socket.addEventListener("open", () => {
      window.clearTimeout(timeout);
      onOpen?.();
      resolve();
    }, { once: true });
    socket.addEventListener("error", () => { window.clearTimeout(timeout); reject(new Error(`无法连接${serviceName}。`)); }, { once: true });
    socket.addEventListener("close", () => { window.clearTimeout(timeout); reject(new Error(`连接${serviceName}已关闭。`)); }, { once: true });
  });

  processor.onaudioprocess = (event) => {
    if (stopped) return;
    const samples = event.inputBuffer.getChannelData(0);
    const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
    onVolume?.(Math.min(1, rms * 5));
    pendingBytes.push(...floatToPcm16(resample(samples)));
    while (pendingBytes.length >= FRAME_BYTES) audioFrames.push(Uint8Array.from(pendingBytes.splice(0, FRAME_BYTES)));
  };

  const ready = authRequest.then(async (receivedAuth) => {
    if (cancelled) return;
    auth = receivedAuth;
    iseSocket = new WebSocket(auth.url);
    iatSocket = new WebSocket(auth.iatUrl);
    iseSocket.onmessage = onIseMessage;
    iatSocket.onmessage = onIatMessage;
    iseSocket.onerror = () => fail(new Error("无法连接智能评测服务，请稍后重试。"));
    iatSocket.onerror = () => fail(new Error("无法连接语音内容校验服务，请稍后重试。"));
    await Promise.all([
      waitForSocket(iseSocket, "智能评测服务", () => {
        iseSocket?.send(JSON.stringify({
          common: { app_id: auth?.appId },
          business,
          data: { status: 0, data: "" },
        }));
      }),
      waitForSocket(iatSocket, "语音内容校验服务"),
    ]);
    if (cancelled) return;
    connected = true;
    pumpAudio();
    if (!finishedSending) sendTimer = window.setInterval(pumpAudio, 40);
  }).catch((reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error("语音服务连接失败，请重新评测。");
    fail(error);
    iseSocket?.close();
    iatSocket?.close();
    throw error;
  });
  void ready.catch(() => undefined);

  return {
    ready,
    stop: async () => {
      if (!stopped) {
        stopped = true;
        cleanupAudio();
        if (pendingBytes.length) audioFrames.push(Uint8Array.from(pendingBytes));
        pendingBytes = [];
      }
      await ready;
      pumpAudio();
      await sendingPromise;
      const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("智能评星生成超时，请重新评测。")), 15000));
      const [result, transcript] = await Promise.race([Promise.all([resultPromise, transcriptPromise]), timeout]);
      if (!matchesReferenceText(transcript, referenceText)) {
        const recognized = normalizeSpeechText(transcript);
        return { ...result, transcript, stars: 0, reviewReasons: [...(result.reviewReasons ?? []), recognized ? `听写结果“${recognized}”与题目不同，请教师复核（听写也可能识别错误）。` : "听写没有识别到文字，请教师复核。"] };
      }
      return { ...result, transcript };
    },
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      stopped = true;
      cleanupAudio();
      window.clearInterval(sendTimer);
      iseSocket?.close(1000);
      iatSocket?.close(1000);
      rejectSending(new Error("评测已取消。"));
    },
  };
}

export async function startPreviewSpeechSession({ onVolume }: Pick<StartOptions, "onVolume">): Promise<XfyunIseSession> {
  const stream = await acquireMicrophone();
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
    releaseMicrophone(stream);
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

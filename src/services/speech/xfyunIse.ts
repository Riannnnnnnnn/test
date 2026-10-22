import { acquireMicrophone, releaseMicrophone } from "@/services/audio/microphone";
import { scorePronunciation } from "@/services/scoring/pronunciation";

export interface XfyunIseResult {
  totalScore: number;
  accuracyScore?: number;
  emotionScore?: number;
  reviewReasons?: string[];
  issues?: Array<{ text: string; kind: string; position?: string }>;
  initialConfidenceWarnings?: Array<{ text: string; sound: string; level: number }>;
  soundConfidenceWarnings?: Array<{ text: string; sound: string; level: number; isFinal: boolean }>;
  category?: string;
  requestParameters?: Record<string, unknown>;
  pronunciationScore?: number;
  toneScore?: number;
  fluencyScore?: number;
  integrityScore?: number;
  stars: number;
  transcript?: string;
  contentStatus?: "matched" | "mismatch" | "uncertain";
  repetitionCount?: number;
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
    if (!response.ok || !auth.appId || !auth.url) throw new Error(auth.message || "智能语音评星暂时无法开启。");
    return auth;
  });
  authCache = { expiresAt: Date.now() + 45_000, promise };
  void promise.catch(() => { if (authCache?.promise === promise) authCache = undefined; });
  return promise;
}

export function prepareSpeechAuth(): Promise<void> {
  return getSpeechAuth().then(() => undefined);
}

export function preparePhoneticMatcher(): Promise<void> {
  return import("./phoneticMatch").then(() => undefined);
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

export function countReferenceRepetitions(transcript: string, referenceText: string): number {
  const heard = normalizeSpeechText(transcript);
  const target = normalizeSpeechText(referenceText);
  if (!target || !heard || heard.length % target.length !== 0) return 0;
  const count = heard.length / target.length;
  return target.repeat(count) === heard ? count : 0;
}

// Dictation chooses written characters from context. For a picture-reading
// task, an alternative spelling is acceptable evidence only when every
// syllable AND its tone match the target; ISE still supplies the actual
// pronunciation score and can veto an alignment/audio problem.
export async function countPronunciationRepetitions(transcript: string, referenceText: string): Promise<number> {
  const exact = countReferenceRepetitions(transcript, referenceText);
  if (exact) return exact;
  const heard = normalizeSpeechText(transcript);
  const target = normalizeSpeechText(referenceText);
  const { countHomophoneRepetitions } = await import("./phoneticMatch");
  return countHomophoneRepetitions(heard, target);
}

export async function classifySpeechContent(result: XfyunIseResult, transcript: string, referenceText: string, knownRepetitions?: number): Promise<NonNullable<XfyunIseResult["contentStatus"]>> {
  // Compatibility arguments for historical callers. Dictated spelling is not
  // evidence of how a child pronounced an initial, final or tone.
  void transcript; void referenceText; void knownRepetitions;
  const alignmentIssue = result.issues?.some((issue) => ["漏读", "增读", "回读", "替换"].includes(issue.kind)
    )
    || result.reviewReasons?.some((reason) => reason.includes("引擎检测到内容不匹配"));
  const audioIssue = result.reviewReasons?.some((reason) => /拒评|异常|音量|噪声|截幅|音频输入|缺少准确度/.test(reason));
  const pronunciationIssue = result.issues?.some((issue) => ["声韵错误", "声调错误", "声韵及声调错误"].includes(issue.kind));
  // 整句朗读：听写几乎不可能和原句逐字一致，所以以讯飞评测的分数为准，不再因为
  // 听写文字对不上就判“没听清”。真正的音频问题（拒评、没有声音、截幅）仍然不评分；
  // 背景噪声在评分很高时放行（教室里很常见）；漏读/增读会让完整度和准确度下降，
  // 并在 scorePronunciation 里封顶为 4 星。
  if (result.category === "read_sentence" || result.category === "read_chapter") {
    const hardAudio = result.reviewReasons?.some((reason) => /拒评|异常|音量|截幅|音频输入|缺少准确度/.test(reason));
    const noiseOnly = result.reviewReasons?.some((reason) => /噪声/.test(reason));
    const accuracy = result.accuracyScore ?? 0;
    const integrity = result.integrityScore ?? 100;
    if (hardAudio) return "uncertain";
    if (noiseOnly && !(accuracy >= 70 && integrity >= 80)) return "uncertain";
    if (result.reviewReasons?.some((reason) => reason.includes("引擎检测到内容不匹配")) && accuracy < 70) return "mismatch";
    if (accuracy >= 60 && integrity >= 70) return "matched";
    if (!alignmentIssue) return "uncertain";
    return alignmentIssue || pronunciationIssue || accuracy < 60 ? "mismatch" : "uncertain";
  }
  if (audioIssue) return "uncertain";
  // A word can receive 100/100 from both forced ISE and dictation even when
  // its initial consonant is different. An ISE initial confidence of 2 or 3
  // is not proof of an error, but it is too weak for an automatic five-star pass.
  if (result.initialConfidenceWarnings?.length
    && (result.pronunciationScore ?? 0) >= 98 && (result.toneScore ?? 0) >= 98) return "uncertain";
  if (result.pronunciationScore === undefined || result.toneScore === undefined) return "uncertain";
  // Insertions/repetitions alone must not erase available sound scores. Missing
  // or substituted target syllables still require review; never invent a crop
  // or infer successful pronunciation from a high aggregate score alone.
  if (result.issues?.some((issue) => ["漏读", "替换"].includes(issue.kind))
    || result.reviewReasons?.some((reason) => reason.includes("引擎检测到内容不匹配"))) return "uncertain";
  return "matched";
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
  const initialConfidenceWarnings: NonNullable<XfyunIseResult["initialConfidenceWarnings"]> = [];
  const soundConfidenceWarnings: NonNullable<XfyunIseResult["soundConfidenceWarnings"]> = [];
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
    const confidence = Number(node.getAttribute("perr_level_msg") ?? 0);
    if (node.tagName === "phone" && flag === 0 && perr === 0 && (confidence === 2 || confidence === 3)) {
      const warning = { text, sound: node.getAttribute("content") ?? "", level: confidence, isFinal: node.getAttribute("is_yun") === "1" };
      soundConfidenceWarnings.push(warning);
      if (node.getAttribute("is_yun") === "0") initialConfidenceWarnings.push(warning);
    }
    // Some word results report the sound error on syll rather than phone.
    // Do not duplicate a phone-level error or mistake a copied alignment flag
    // for a pronunciation error.
    const phoneHasError = node.tagName === "syll" && Array.from(node.querySelectorAll("phone"))
      .some((phone) => Number(phone.getAttribute("dp_message") ?? 0) === 0
        && [1, 2, 3].includes(Number(phone.getAttribute("perr_msg") ?? 0)));
    if ((node.tagName === "phone" || node.tagName === "syll" && !phoneHasError)
      && flag === 0 && [1, 2, 3].includes(perr)) {
      const kind = ({ 1: "声韵错误", 2: "声调错误", 3: "声韵及声调错误" } as Record<number, string>)[perr] ?? `未识别的发音标记 ${perr}`;
      issues.push({ text, kind, position });
    }
  }
  if (issues.some((issue) => ["漏读", "增读", "回读", "替换"].includes(issue.kind))) reviewReasons.push("检测到错漏读标记，请结合录音复核");
  if (issues.some((issue) => issue.kind.includes("错误"))) reviewReasons.push("检测到个别字音问题，可参考分项星级练习");
  const accuracyScore = score("accuracy_score");
  const pronunciationScore = score("phone_score");
  const toneScore = score("tone_score");
  const basis = ["read_sentence", "read_chapter"].includes(root.tagName) ? accuracyScore
    : pronunciationScore !== undefined && toneScore !== undefined ? Math.min(pronunciationScore, toneScore) : undefined;
  if (basis === undefined) reviewReasons.push("缺少准确度或声韵、声调字段，请教师评分");
  const parsed: XfyunIseResult = {
    totalScore,
    category: root.tagName, accuracyScore, pronunciationScore, toneScore,
    emotionScore: score("emotion_score"),
    fluencyScore: score("fluency_score"),
    integrityScore: score("integrity_score"),
    issues, initialConfidenceWarnings, soundConfidenceWarnings, reviewReasons: [...new Set(reviewReasons)],
    stars: 0,
    sessionId,
    rawXml,
  };
  return { ...parsed, stars: scorePronunciation(parsed).stars };
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
  let connected = false;
  let stopped = false;
  let cancelled = false;
  let cleaned = false;
  let finishedSending = false;
  let sendTimer = 0;
  let firstIseFrame = true;
  let pendingBytes: number[] = [];
  const audioFrames: Uint8Array[] = [];
  let resolveResult!: (result: XfyunIseResult) => void;
  let rejectResult!: (error: Error) => void;
  const resultPromise = new Promise<XfyunIseResult>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  void resultPromise.catch(() => undefined);
  let resolveSending!: () => void;
  let rejectSending!: (error: Error) => void;
  const sendingPromise = new Promise<void>((resolve, reject) => { resolveSending = resolve; rejectSending = reject; });
  void sendingPromise.catch(() => undefined);

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
  };

  const sendAudio = (bytes: Uint8Array) => {
    if (!iseSocket || !auth || iseSocket.readyState !== WebSocket.OPEN) throw new Error("智能评分连接中断，请重新评测。");
    const audio = bytesToBase64(bytes);
    iseSocket.send(JSON.stringify({
      business: { cmd: "auw", aus: firstIseFrame ? 1 : 2, aue: "raw" },
      data: { status: 1, data: audio, data_type: 1, encoding: "raw" },
    }));
    firstIseFrame = false;
  };

  const pumpAudio = () => {
    if (!connected || cancelled || finishedSending) return;
    try {
      // 网络慢、连接建立晚时，录音会在本地积压；积压较多时每次多发几帧追赶，
      // 避免说完后还要按“真实时长”慢慢补传（整句尤其明显）。
      const batch = audioFrames.length > 6 ? 4 : 1;
      let sent = 0;
      while (sent < batch && audioFrames.length) { sendAudio(audioFrames.shift()!); sent += 1; }
      if (sent) return;
      if (!stopped) return;
      if (!iseSocket || iseSocket.readyState !== WebSocket.OPEN) throw new Error("智能评分连接中断，请重新评测。");
      finishedSending = true;
      window.clearInterval(sendTimer);
      iseSocket.send(JSON.stringify({ business: { cmd: "auw", aus: 4, aue: "raw" }, data: { status: 2, data: "", data_type: 1, encoding: "raw" } }));
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

  const waitForSocket = (socket: WebSocket, serviceName: string, onOpen?: () => void, timeoutMs = 10000) => new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(`连接${serviceName}超时。`)), timeoutMs);
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
    iseSocket.onmessage = onIseMessage;
    iseSocket.onerror = () => fail(new Error("无法连接智能评测服务，请稍后重试。"));
    await waitForSocket(iseSocket, "智能评测服务", () => {
        iseSocket?.send(JSON.stringify({
          common: { app_id: auth?.appId },
          business,
          data: { status: 0, data: "" },
        }));
      });
    if (cancelled) return;
    connected = true;
    pumpAudio();
    if (!finishedSending) sendTimer = window.setInterval(pumpAudio, 40);
  }).catch((reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error("语音服务连接失败，请重新评测。");
    fail(error);
    iseSocket?.close();
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
      let resultTimeout = 0;
      const result = await Promise.race([
        resultPromise,
        new Promise<never>((_, reject) => { resultTimeout = window.setTimeout(() => reject(new Error("智能评星生成超时，请重新评测。")), 15000); }),
      ]).finally(() => window.clearTimeout(resultTimeout));
      const contentStatus = await classifySpeechContent(result, "", referenceText);
      const onlyRepeatMarkers = result.issues?.every((issue) => ["回读", "增读", "声韵错误", "声调错误", "声韵及声调错误"].includes(issue.kind));
      const reviewReasons = (result.reviewReasons ?? []).filter((reason) => !(contentStatus === "matched" && onlyRepeatMarkers && reason.startsWith("检测到错漏读标记")));
      if (contentStatus === "uncertain" && result.initialConfidenceWarnings?.length) {
        const sound = result.initialConfidenceWarnings[0];
        reviewReasons.push(`“${sound.text}”的声母${sound.sound ? `“${sound.sound}”` : ""}暂时无法确认，请重读或请老师确认。`);
      } else if (contentStatus === "uncertain") reviewReasons.push("目标字音的评测证据不足，请完整重读或请老师确认。");
      const evaluated = { ...result, contentStatus, reviewReasons };
      return { ...evaluated, stars: scorePronunciation(evaluated).stars };
    },
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      stopped = true;
      cleanupAudio();
      window.clearInterval(sendTimer);
      iseSocket?.close(1000);
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

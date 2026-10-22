import { getAudioContext } from "./uiSound";

/**
 * 小火车到站庆祝音效：全部用 Web Audio 实时合成，不需要额外音频文件。
 * - playArrivalCelebration：汽笛“呜——呜——”+ 上行欢庆旋律 + 闪亮收尾和弦
 * - playFireworkPop：单颗烟花的“咻—嘭—噼啪”声，由烟花动画在每次绽放时调用，声画同步
 */

let master: GainNode | undefined;
let noiseBuffer: AudioBuffer | undefined;

function output(context: AudioContext): GainNode {
  if (master && master.context === context) return master;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.ratio.value = 4;
  master = context.createGain();
  master.gain.value = 0.9;
  master.connect(compressor).connect(context.destination);
  return master;
}

function noise(context: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === context.sampleRate) return noiseBuffer;
  noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  return noiseBuffer;
}

function ready(): AudioContext | undefined {
  const context = getAudioContext();
  if (!context) return undefined;
  if (context.state === "suspended") void context.resume();
  return context;
}

function tone(context: AudioContext, frequency: number, at: number, duration: number, volume: number, type: OscillatorType = "triangle") {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(gain).connect(output(context));
  oscillator.start(at);
  oscillator.stop(at + duration + 0.02);
}

/** 蒸汽汽笛：两个略带颤音的和声，透过低通滤波听起来更柔和。 */
function whistle(context: AudioContext, at: number, duration: number) {
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1900;
  filter.Q.value = 3;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.07, at + 0.06);
  gain.gain.setValueAtTime(0.07, at + duration - 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  filter.connect(gain).connect(output(context));
  const vibrato = context.createOscillator();
  const vibratoDepth = context.createGain();
  vibrato.frequency.value = 6;
  vibratoDepth.gain.value = 7;
  vibrato.connect(vibratoDepth);
  [587.33, 739.99, 880].forEach((frequency) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(frequency * 0.94, at);
    oscillator.frequency.exponentialRampToValueAtTime(frequency, at + 0.12);
    vibratoDepth.connect(oscillator.frequency);
    oscillator.connect(filter);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
  });
  vibrato.start(at);
  vibrato.stop(at + duration + 0.02);
}

export function playArrivalCelebration(): void {
  const context = ready();
  if (!context) return;
  const now = context.currentTime + 0.03;
  // “呜——呜——”到站汽笛
  whistle(context, now, 0.42);
  whistle(context, now + 0.52, 0.7);
  // 上行欢庆旋律 C5 E5 G5 C6
  const melodyStart = now + 1.15;
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => tone(context, frequency, melodyStart + index * 0.12, 0.34, 0.09));
  // 收尾大和弦 + 高音闪光
  const chordAt = melodyStart + 0.5;
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency) => tone(context, frequency, chordAt, 1.3, 0.05, "sine"));
  [2093, 2637, 3136, 2637, 3520].forEach((frequency, index) => tone(context, frequency, chordAt + 0.08 + index * 0.07, 0.25, 0.022, "sine"));
}

/** 单颗烟花：上升“咻”+ 低频“嘭”+ 一串噼啪火花。 */
export function playFireworkPop(intensity = 1): void {
  const context = ready();
  if (!context) return;
  const at = context.currentTime + 0.01;
  const out = output(context);
  const level = Math.max(0.3, Math.min(1, intensity));

  // 嘭：带通噪声 + 下滑正弦
  const boom = context.createBufferSource();
  boom.buffer = noise(context);
  const boomFilter = context.createBiquadFilter();
  boomFilter.type = "lowpass";
  boomFilter.frequency.setValueAtTime(1600, at);
  boomFilter.frequency.exponentialRampToValueAtTime(180, at + 0.4);
  const boomGain = context.createGain();
  boomGain.gain.setValueAtTime(0.0001, at);
  boomGain.gain.exponentialRampToValueAtTime(0.28 * level, at + 0.008);
  boomGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
  boom.connect(boomFilter).connect(boomGain).connect(out);
  boom.start(at, Math.random() * 0.5);
  boom.stop(at + 0.5);

  const thump = context.createOscillator();
  const thumpGain = context.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(150, at);
  thump.frequency.exponentialRampToValueAtTime(48, at + 0.3);
  thumpGain.gain.setValueAtTime(0.0001, at);
  thumpGain.gain.exponentialRampToValueAtTime(0.22 * level, at + 0.01);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.34);
  thump.connect(thumpGain).connect(out);
  thump.start(at);
  thump.stop(at + 0.36);

  // 噼啪：随机短促高频噪声
  const crackles = 9 + Math.round(Math.random() * 6);
  for (let index = 0; index < crackles; index += 1) {
    const start = at + 0.12 + Math.random() * 0.75;
    const source = context.createBufferSource();
    source.buffer = noise(context);
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 3200 + Math.random() * 3000;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.06 * level, start + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.04);
    source.connect(filter).connect(gain).connect(out);
    source.start(start, Math.random() * 0.8);
    source.stop(start + 0.05);
  }
}

/** 烟花升空的“咻——”声。 */
export function playFireworkLaunch(): void {
  const context = ready();
  if (!context) return;
  const at = context.currentTime + 0.01;
  const source = context.createBufferSource();
  source.buffer = noise(context);
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 9;
  filter.frequency.setValueAtTime(900, at);
  filter.frequency.exponentialRampToValueAtTime(4200, at + 0.5);
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.05, at + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.55);
  source.connect(filter).connect(gain).connect(output(context));
  source.start(at, Math.random() * 0.4);
  source.stop(at + 0.6);
}

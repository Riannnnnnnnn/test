/** 0 星为柔和的下行提示，1–5 星按星数依次点亮不同数量的音符。 */
const NOTES = [392, 493.88, 587.33, 659.25, 783.99] as const;

export function resultCueNotes(stars: number): number[] {
  const count = Math.min(5, Math.max(0, Math.round(stars)));
  return count === 0 ? [392, 329.63] : NOTES.slice(0, count);
}

export function playResultCue(context: AudioContext, stars: number, active: Set<OscillatorNode>): void {
  const notes = resultCueNotes(stars);
  const start = context.currentTime;
  notes.forEach((frequency, index) => {
    const at = start + index * (stars === 0 ? 0.18 : 0.14);
    const duration = stars === 0 ? 0.25 : 0.3;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(stars === 0 ? 0.025 : 0.038, at + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.onended = () => { active.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    active.add(oscillator);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.01);
  });
}

let audioContext: AudioContext | undefined;

declare global {
  interface Window { webkitAudioContext?: typeof AudioContext; }
}

function getAudioContext(): AudioContext | undefined {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return undefined;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

export function playUiClick(emphasis = false): void {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(emphasis ? 560 : 420, now);
  oscillator.frequency.exponentialRampToValueAtTime(emphasis ? 720 : 500, now + .055);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(emphasis ? .045 : .026, now + .008);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .075);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + .08);
}

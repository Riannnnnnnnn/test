import { useEffect, useRef } from "react";

export type WaveMode = "idle" | "live" | "scan" | "settled";

interface WaveformProps {
  /** 0–1 的实时音量 */
  level: number;
  mode: WaveMode;
}

const layers = [
  { color: "255, 212, 76", width: 2.6, freq: 1.9, speed: 2.1, phase: 0, gain: 1, alpha: .98 },
  { color: "125, 227, 255", width: 2, freq: 2.6, speed: -1.6, phase: 1.4, gain: .78, alpha: .7 },
  { color: "183, 155, 255", width: 2, freq: 3.3, speed: 1.2, phase: 2.7, gain: .58, alpha: .62 },
  { color: "255, 255, 255", width: 1, freq: 4.4, speed: -2.4, phase: .6, gain: .38, alpha: .3 },
];

/**
 * 实时声波：多层正弦叠加，振幅由真实麦克风音量驱动。
 * 待机时缓慢"呼吸"，分析时有扫描光带，完成后平稳收束。
 */
export function Waveform({ level, mode }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelRef = useRef(level);
  const modeRef = useRef(mode);
  levelRef.current = level;
  modeRef.current = mode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let amp = .08;
    let phase = 0;
    let scan = -.2;
    let last = performance.now();
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      const currentMode = modeRef.current;
      const t = now / 1000;
      const breathing = .07 + Math.sin(t * 1.4) * .025;
      const target = currentMode === "live" ? Math.min(1, .1 + levelRef.current * 1.05)
        : currentMode === "scan" ? .2
          : currentMode === "settled" ? .1
            : breathing;
      amp += (target - amp) * Math.min(1, dt * 10);
      phase += dt * (currentMode === "live" ? 1.7 : currentMode === "scan" ? 1.1 : .55);
      if (reduced) phase = 0;

      ctx.clearRect(0, 0, width, height);
      const mid = height / 2;

      // 中线
      ctx.save();
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = "rgba(255,255,255,.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(width, mid);
      ctx.stroke();
      ctx.restore();

      ctx.globalCompositeOperation = "lighter";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (const layer of layers) {
        ctx.beginPath();
        const step = 3;
        for (let x = 0; x <= width + step; x += step) {
          const u = x / width;
          const envelope = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 1.5);
          const y = mid + Math.sin(u * Math.PI * 2 * layer.freq + phase * layer.speed + layer.phase)
            * amp * layer.gain * mid * .92 * envelope
            + Math.sin(u * 17 + phase * 3 + layer.phase) * amp * mid * .08 * envelope;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${layer.color}, ${layer.alpha})`;
        ctx.lineWidth = layer.width;
        ctx.shadowColor = `rgba(${layer.color}, .55)`;
        ctx.shadowBlur = layer === layers[0] ? 12 : 8;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // 分析阶段：扫描光带
      if (currentMode === "scan") {
        scan += dt * .55;
        if (scan > 1.2) scan = -.2;
        const x = scan * width;
        const gradient = ctx.createLinearGradient(x - 90, 0, x + 20, 0);
        gradient.addColorStop(0, "rgba(125,227,255,0)");
        gradient.addColorStop(.85, "rgba(125,227,255,.28)");
        gradient.addColorStop(1, "rgba(255,255,255,.7)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - 90, 0, 110, height);
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className="vc__canvas" aria-hidden="true" />;
}

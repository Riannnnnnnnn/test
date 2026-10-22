import { useEffect, useRef } from "react";

type Rocket = { x: number; y: number; vx: number; vy: number; targetY: number; hue: number; trail: Array<{ x: number; y: number }> };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; decay: number; hue: number; size: number; twinkle: boolean };
type Confetti = { x: number; y: number; vx: number; vy: number; rot: number; spin: number; w: number; h: number; color: string; life: number };

type FireworksProps = {
  /** 每次播放烟花时变化的值（例如递增计数）；为 0 时不播放。 */
  playKey: number;
  /** 烟花持续时长（毫秒），之后不再发射新烟花，粒子自然消散。 */
  duration?: number;
  /** 发射与绽放的回调，用于同步音效。 */
  onLaunch?: () => void;
  onBurst?: (intensity: number) => void;
  /** 第一发烟花的水平位置（0–1），例如对准终点站。 */
  focusX?: number;
  className?: string;
};

// 与夜空场景一致的金、青、粉、紫、橙
const HUES = [46, 192, 330, 268, 24, 150];
const CONFETTI = ["#ffd44c", "#7de3ff", "#ff8fc7", "#b79bff", "#ff9e2b", "#8ef0b4"];

export function Fireworks({ playKey, duration = 4200, onLaunch, onBurst, focusX = 0.82, className = "" }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbacks = useRef({ onLaunch, onBurst });
  callbacks.current = { onLaunch, onBurst };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!playKey || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(resize);
    observer?.observe(canvas);

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    const confetti: Confetti[] = [];
    const scale = Math.max(0.6, Math.min(1.3, width / 900));

    const launch = (index: number) => {
      const x = index === 0 ? focusX : 0.12 + Math.random() * 0.76;
      const startX = x * width + (Math.random() - 0.5) * 40;
      const targetY = height * (0.14 + Math.random() * 0.3);
      rockets.push({ x: startX, y: height + 6, vx: (Math.random() - 0.5) * 1.2, vy: -(Math.sqrt(2 * 0.12 * (height - targetY)) + 1.5), targetY, hue: HUES[index % HUES.length], trail: [] });
      callbacks.current.onLaunch?.();
    };

    const burst = (rocket: Rocket, big: boolean) => {
      const count = Math.round((big ? 110 : 76) * scale);
      const speed = (big ? 5.4 : 4.2) * scale;
      const ring = Math.random() < 0.35;
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2 + Math.random() * 0.12;
        const velocity = ring ? speed : speed * (0.25 + Math.random() * 0.75);
        const hue = Math.random() < 0.22 ? 50 : rocket.hue + (Math.random() - 0.5) * 30;
        sparks.push({ x: rocket.x, y: rocket.y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: 1, decay: 0.011 + Math.random() * 0.012, hue, size: (1.4 + Math.random() * 1.6) * scale, twinkle: Math.random() < 0.4 });
      }
      for (let index = 0; index < 14; index += 1) {
        confetti.push({ x: rocket.x, y: rocket.y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 3 - 1, rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.3, w: 6 + Math.random() * 5, h: 3 + Math.random() * 3, color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)], life: 1 });
      }
      callbacks.current.onBurst?.(big ? 1 : 0.7);
    };

    if (reduced) {
      // 减少动态：只绽放一次静态光点，不连续发射
      const rocket = { x: focusX * width, y: height * 0.3, vx: 0, vy: 0, targetY: 0, hue: 46, trail: [] };
      burst(rocket, true);
      sparks.forEach((spark) => { spark.vx *= 0.25; spark.vy *= 0.25; });
    }

    // 发射时间表：开场三连发对准终点附近，随后满屏散开
    const schedule = reduced ? [] : [0, 260, 520, 980, 1280, 1650, 1950, 2350, 2700, 3100, 3400].filter((time) => time < duration);
    const timers = schedule.map((time, index) => window.setTimeout(() => launch(index), time));

    let frame = 0;
    let last = performance.now();
    const startedAt = last;
    const tick = (now: number) => {
      const step = Math.min(2.5, (now - last) / 16.67);
      last = now;
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      for (let index = rockets.length - 1; index >= 0; index -= 1) {
        const rocket = rockets[index];
        rocket.trail.push({ x: rocket.x, y: rocket.y });
        if (rocket.trail.length > 10) rocket.trail.shift();
        rocket.x += rocket.vx * step;
        rocket.y += rocket.vy * step;
        rocket.vy += 0.12 * step;
        context.beginPath();
        rocket.trail.forEach((point, pointIndex) => (pointIndex ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)));
        context.lineTo(rocket.x, rocket.y);
        context.strokeStyle = `hsla(${rocket.hue}, 100%, 78%, .85)`;
        context.lineWidth = 2.4 * scale;
        context.lineCap = "round";
        context.stroke();
        context.fillStyle = "#fff";
        context.beginPath();
        context.arc(rocket.x, rocket.y, 2.4 * scale, 0, Math.PI * 2);
        context.fill();
        if (rocket.vy >= -0.6 || rocket.y <= rocket.targetY) {
          rockets.splice(index, 1);
          burst(rocket, index % 3 === 0);
        }
      }

      for (let index = sparks.length - 1; index >= 0; index -= 1) {
        const spark = sparks[index];
        spark.vx *= 0.975 ** step;
        spark.vy = spark.vy * 0.975 ** step + 0.06 * step;
        spark.x += spark.vx * step;
        spark.y += spark.vy * step;
        spark.life -= spark.decay * step;
        if (spark.life <= 0) { sparks.splice(index, 1); continue; }
        const flicker = spark.twinkle ? 0.45 + Math.random() * 0.55 : 1;
        const alpha = Math.min(1, spark.life * 1.4) * flicker;
        context.fillStyle = `hsla(${spark.hue}, 100%, ${55 + spark.life * 30}%, ${alpha})`;
        context.beginPath();
        context.arc(spark.x, spark.y, spark.size * (0.6 + spark.life * 0.6), 0, Math.PI * 2);
        context.fill();
      }

      context.globalCompositeOperation = "source-over";
      for (let index = confetti.length - 1; index >= 0; index -= 1) {
        const piece = confetti[index];
        piece.vx *= 0.98 ** step;
        piece.vy = Math.min(2.2, piece.vy + 0.08 * step);
        piece.x += (piece.vx + Math.sin(piece.rot * 2) * 0.6) * step;
        piece.y += piece.vy * step;
        piece.rot += piece.spin * step;
        piece.life -= 0.006 * step;
        if (piece.life <= 0 || piece.y > height + 20) { confetti.splice(index, 1); continue; }
        context.save();
        context.globalAlpha = Math.min(1, piece.life * 2);
        context.translate(piece.x, piece.y);
        context.rotate(piece.rot);
        context.scale(1, Math.abs(Math.cos(piece.rot * 1.7)) * 0.8 + 0.2);
        context.fillStyle = piece.color;
        context.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
        context.restore();
      }

      const finished = now - startedAt > duration && !rockets.length && !sparks.length && !confetti.length;
      if (!finished) frame = requestAnimationFrame(tick);
      else context.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      cancelAnimationFrame(frame);
      observer?.disconnect();
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [playKey, duration, focusX]);

  return <canvas ref={canvasRef} className={`fireworks-canvas ${className}`} aria-hidden="true" />;
}

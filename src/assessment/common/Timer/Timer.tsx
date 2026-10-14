import { useEffect, useState } from "react";

export function Timer({ running = false }: { running?: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(timer); }, [running]);
  return <time aria-label={`已用时 ${seconds} 秒`}>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</time>;
}

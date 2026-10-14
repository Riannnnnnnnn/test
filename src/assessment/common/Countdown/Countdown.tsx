import { useEffect, useState } from "react";

interface CountdownProps { seconds: number; active: boolean; onComplete?: () => void; }

export function Countdown({ seconds, active, onComplete }: CountdownProps) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => { setRemaining(seconds); }, [seconds]);
  useEffect(() => {
    if (!active || remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [active, remaining]);
  useEffect(() => { if (active && remaining === 0) onComplete?.(); }, [active, onComplete, remaining]);
  return <span aria-live="polite">{remaining}s</span>;
}

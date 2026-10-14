interface ProgressProps { value: number; max?: number; label?: string; }

export function Progress({ value, max = 100, label = "进度" }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className="progress__bar" style={{ width: `${percentage}%` }} />
    </div>
  );
}

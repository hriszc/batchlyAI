interface ProgressBarProps {
  elapsed: number;
  estimated: number;
  remaining: number;
}

export function ProgressBar({ elapsed, estimated, remaining }: ProgressBarProps) {
  const pct = Math.min(Math.round((elapsed / estimated) * 100), 99);
  const elapsedSec = Math.round(elapsed / 1000);
  const remainingSec = Math.max(0, Math.round((estimated - elapsed) / 1000));

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {pct}% — {elapsedSec}s elapsed
          {remaining > 0 && ` · ${remaining} remaining`}
        </span>
        <span>~{remainingSec}s left</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent-blue transition-all duration-700 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

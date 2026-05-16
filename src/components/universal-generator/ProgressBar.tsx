interface ProgressBarProps {
  elapsed: number;
  estimated: number;
  remaining: number;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function ProgressBar({ elapsed, estimated, remaining }: ProgressBarProps) {
  const pct = Math.min(Math.round((elapsed / estimated) * 100), 99);
  const remainingMs = Math.max(0, estimated - elapsed);

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {pct}% — {formatDuration(elapsed)} elapsed
          {remaining > 0 && ` · ${remaining} remaining`}
        </span>
        <span>~{formatDuration(remainingMs)} left</span>
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

import type { TimerState } from "./types";

export type TimerSnapshot = {
  mode: TimerState["mode"];
  totalSeconds: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  hasReachedZero: boolean;
};

export function computeTimerSnapshot(
  timer: Pick<TimerState, "mode" | "started_at" | "duration_seconds">,
  now: Date = new Date(),
): TimerSnapshot {
  if (
    timer.mode === "idle" ||
    !timer.started_at ||
    !timer.duration_seconds
  ) {
    return {
      mode: timer.mode,
      totalSeconds: 0,
      remainingSeconds: 0,
      elapsedSeconds: 0,
      hasReachedZero: false,
    };
  }
  const startedAtMs = new Date(timer.started_at).getTime();
  const elapsedMs = Math.max(0, now.getTime() - startedAtMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const totalSeconds = timer.duration_seconds;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  return {
    mode: timer.mode,
    totalSeconds,
    remainingSeconds,
    elapsedSeconds,
    hasReachedZero: remainingSeconds === 0,
  };
}

export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

export function formatOverrun(elapsed: number, total: number): string {
  const over = Math.max(0, elapsed - total);
  return `+${formatMMSS(over)}`;
}

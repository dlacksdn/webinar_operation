export type SessionStatus = "idle" | "live" | "break" | "paused";
export type QueueStatus = "waiting" | "current" | "done" | "skipped";
export type TimerMode = "idle" | "qna" | "break";

export type Session = {
  id: string;
  status: SessionStatus;
  started_at: string;
  is_active: boolean;
};

export type QueueEntry = {
  id: string;
  session_id: string;
  name: string;
  question: string;
  position: number;
  status: QueueStatus;
  created_at: string;
};

export type TimerState = {
  id: string;
  session_id: string;
  mode: TimerMode;
  current_entry_id: string | null;
  started_at: string | null;
  duration_seconds: number | null;
};

export const QA_DURATION_SECONDS = 600;

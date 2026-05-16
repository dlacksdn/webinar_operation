"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { QueueEntry, TimerState } from "@/lib/types";
import { computeTimerSnapshot, formatMMSS, formatOverrun } from "@/lib/timer";
import CurrentControl from "./CurrentControl";
import BreakControl from "./BreakControl";
import QueueList from "./QueueList";
import AlarmIndicator from "./AlarmIndicator";

type Props = {
  initialTimer: TimerState | null;
  initialQueue: QueueEntry[];
};

export default function AdminDashboard({ initialTimer, initialQueue }: Props) {
  const [timer, setTimer] = useState<TimerState | null>(initialTimer);
  const [queue, setQueue] = useState<QueueEntry[]>(initialQueue);
  const [now, setNow] = useState<Date>(() => new Date());
  const [alarmTriggered, setAlarmTriggered] = useState(false);
  const lastAlarmKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    const timerChannel = supabase
      .channel("admin-timer")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timer_state" },
        (payload) => {
          const next = payload.new as TimerState | null;
          if (next) setTimer(next);
        },
      )
      .subscribe();

    const queueChannel = supabase
      .channel("admin-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        async () => {
          const { data } = await supabase
            .from("queue_entries")
            .select("*")
            .in("status", ["waiting", "current"])
            .order("position", { ascending: true });
          setQueue((data as QueueEntry[]) ?? []);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(timerChannel);
      supabase.removeChannel(queueChannel);
    };
  }, []);

  const snapshot = useMemo(
    () =>
      computeTimerSnapshot(
        timer ?? { mode: "idle", started_at: null, duration_seconds: null },
        now,
      ),
    [timer, now],
  );

  // fire one alarm per (mode, started_at) transition to zero
  useEffect(() => {
    const key =
      timer?.mode && timer?.started_at ? `${timer.mode}|${timer.started_at}` : null;
    if (!key) {
      setAlarmTriggered(false);
      lastAlarmKeyRef.current = null;
      return;
    }
    if (snapshot.hasReachedZero && lastAlarmKeyRef.current !== key) {
      setAlarmTriggered(true);
      lastAlarmKeyRef.current = key;
    }
    if (!snapshot.hasReachedZero) {
      setAlarmTriggered(false);
    }
  }, [snapshot.hasReachedZero, timer?.mode, timer?.started_at]);

  const currentEntry =
    queue.find((q) => q.status === "current") ??
    queue.find((q) => q.id === timer?.current_entry_id) ??
    null;
  const waitingQueue = queue.filter((q) => q.status === "waiting");

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[1.2fr_1fr]">
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">운영자 대시보드</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Q&A 타이머 · 휴식 · 대기열을 한 곳에서 관리합니다.
          </p>
        </header>

        <CurrentDisplay
          mode={timer?.mode ?? "idle"}
          entry={currentEntry}
          snapshot={snapshot}
          alarmTriggered={alarmTriggered}
          onDismissAlarm={() => setAlarmTriggered(false)}
        />

        <CurrentControl
          mode={timer?.mode ?? "idle"}
          hasCurrent={Boolean(currentEntry)}
          hasWaiting={waitingQueue.length > 0}
        />

        <BreakControl mode={timer?.mode ?? "idle"} />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">대기열</h2>
          <span className="text-sm text-neutral-500">
            {waitingQueue.length}명 대기 중
          </span>
        </div>
        <QueueList entries={waitingQueue} />
      </section>
    </main>
  );
}

function CurrentDisplay({
  mode,
  entry,
  snapshot,
  alarmTriggered,
  onDismissAlarm,
}: {
  mode: TimerState["mode"];
  entry: QueueEntry | null;
  snapshot: ReturnType<typeof computeTimerSnapshot>;
  alarmTriggered: boolean;
  onDismissAlarm: () => void;
}) {
  if (mode === "qna" && entry) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-300">
              현재 답변 중
            </p>
            <p className="mt-2 text-3xl font-bold">{entry.name}</p>
          </div>
          <TimerBlock snapshot={snapshot} />
        </div>
        <p className="mt-4 whitespace-pre-wrap text-base text-neutral-200">
          {entry.question}
        </p>
        <AlarmIndicator
          active={alarmTriggered}
          onDismiss={onDismissAlarm}
          label="Q&A 시간 종료"
        />
      </div>
    );
  }
  if (mode === "break") {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
        <p className="text-xs uppercase tracking-widest text-amber-300">휴식 중</p>
        <TimerBlock snapshot={snapshot} accent="amber" />
        <AlarmIndicator
          active={alarmTriggered}
          onDismiss={onDismissAlarm}
          label="휴식 종료"
        />
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
      <p className="text-xs uppercase tracking-widest text-neutral-500">대기 중</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-300">
        세션이 시작되지 않았습니다
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        대기열에서 다음 사람을 호출하거나 휴식을 시작하세요.
      </p>
    </div>
  );
}

function TimerBlock({
  snapshot,
  accent = "emerald",
}: {
  snapshot: ReturnType<typeof computeTimerSnapshot>;
  accent?: "emerald" | "amber";
}) {
  const color =
    snapshot.hasReachedZero
      ? "text-neutral-400"
      : accent === "amber"
        ? "text-amber-200"
        : "text-emerald-200";
  return (
    <div className="text-right">
      <div className={`font-mono text-5xl font-bold tabular-nums ${color}`}>
        {formatMMSS(snapshot.remainingSeconds)}
      </div>
      {snapshot.hasReachedZero && (
        <div className="mt-1 font-mono text-sm text-red-400">
          초과: {formatOverrun(snapshot.elapsedSeconds, snapshot.totalSeconds)}
        </div>
      )}
    </div>
  );
}

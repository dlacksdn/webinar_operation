"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { QueueEntry, TimerState } from "@/lib/types";
import { computeTimerSnapshot, formatMMSS } from "@/lib/timer";
import QrPanel from "./QrPanel";

type Props = {
  initialTimer: TimerState | null;
  initialCurrentEntry: QueueEntry | null;
  initialWaitingCount: number;
  registerUrl: string;
};

export default function PublicScreen({
  initialTimer,
  initialCurrentEntry,
  initialWaitingCount,
  registerUrl,
}: Props) {
  const [timer, setTimer] = useState<TimerState | null>(initialTimer);
  const [currentEntry, setCurrentEntry] = useState<QueueEntry | null>(
    initialCurrentEntry,
  );
  const [waitingCount, setWaitingCount] = useState(initialWaitingCount);
  const [now, setNow] = useState<Date>(() => new Date());

  // 1Hz tick for countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 250);
    return () => clearInterval(id);
  }, []);

  // realtime subscriptions
  useEffect(() => {
    const supabase = getBrowserSupabase();

    const timerChannel = supabase
      .channel("public-timer")
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
      .channel("public-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        async () => {
          // when queue changes, refetch current entry + waiting count
          const tid = timer?.current_entry_id;
          if (tid) {
            const { data } = await supabase
              .from("queue_entries")
              .select("*")
              .eq("id", tid)
              .maybeSingle();
            setCurrentEntry((data as QueueEntry) ?? null);
          } else {
            setCurrentEntry(null);
          }
          const { count } = await supabase
            .from("queue_entries")
            .select("id", { count: "exact", head: true })
            .eq("status", "waiting");
          setWaitingCount(count ?? 0);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(timerChannel);
      supabase.removeChannel(queueChannel);
    };
  }, [timer?.current_entry_id]);

  // when timer changes mode or current_entry_id, refetch the entry
  useEffect(() => {
    let cancelled = false;
    async function loadEntry() {
      if (!timer?.current_entry_id) {
        setCurrentEntry(null);
        return;
      }
      const supabase = getBrowserSupabase();
      const { data } = await supabase
        .from("queue_entries")
        .select("*")
        .eq("id", timer.current_entry_id)
        .maybeSingle();
      if (!cancelled) setCurrentEntry((data as QueueEntry) ?? null);
    }
    loadEntry();
    return () => {
      cancelled = true;
    };
  }, [timer?.current_entry_id]);

  const snapshot = useMemo(
    () =>
      computeTimerSnapshot(
        timer ?? { mode: "idle", started_at: null, duration_seconds: null },
        now,
      ),
    [timer, now],
  );

  const mode = timer?.mode ?? "idle";

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <div className="flex flex-1 items-center justify-center px-12 py-16">
        {mode === "qna" && currentEntry && (
          <SpeakerView
            entry={currentEntry}
            remaining={snapshot.remainingSeconds}
            hasReachedZero={snapshot.hasReachedZero}
            waitingCount={waitingCount}
          />
        )}
        {mode === "break" && (
          <BreakView remaining={snapshot.remainingSeconds} />
        )}
        {mode === "idle" && (
          <IdleView
            waitingCount={waitingCount}
            registerUrl={registerUrl}
          />
        )}
      </div>
      {mode !== "idle" && (
        <footer className="border-t border-neutral-900 px-12 py-6">
          <QrPanel url={registerUrl} compact />
        </footer>
      )}
    </main>
  );
}

function SpeakerView({
  entry,
  remaining,
  hasReachedZero,
  waitingCount,
}: {
  entry: QueueEntry;
  remaining: number;
  hasReachedZero: boolean;
  waitingCount: number;
}) {
  return (
    <div className="grid w-full grid-cols-[1fr_auto] items-center gap-16">
      <div>
        <p className="text-2xl font-medium uppercase tracking-widest text-emerald-400">
          현재 질문 중
        </p>
        <h2 className="mt-4 text-7xl font-bold leading-tight">
          {entry.name}
        </h2>
        <p className="mt-8 max-w-3xl whitespace-pre-wrap text-3xl leading-snug text-neutral-200">
          {entry.question}
        </p>
        <p className="mt-10 text-xl text-neutral-500">
          대기 중인 다음 질문: {waitingCount}개
        </p>
      </div>
      <div className="flex flex-col items-center">
        <p className="text-xl uppercase tracking-widest text-neutral-500">남은 시간</p>
        <div
          className={`mt-4 font-mono text-9xl font-bold tabular-nums ${
            hasReachedZero ? "text-neutral-500" : "text-white"
          }`}
        >
          {formatMMSS(remaining)}
        </div>
      </div>
    </div>
  );
}

function BreakView({ remaining }: { remaining: number }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-medium uppercase tracking-widest text-amber-400">
        휴식 중
      </p>
      <div className="mt-8 font-mono text-[10rem] font-bold leading-none tabular-nums text-white">
        {formatMMSS(remaining)}
      </div>
      <p className="mt-12 text-2xl text-neutral-400">
        잠시 후 Q&A를 다시 시작합니다.
      </p>
    </div>
  );
}

function IdleView({
  waitingCount,
  registerUrl,
}: {
  waitingCount: number;
  registerUrl: string;
}) {
  return (
    <div className="grid w-full max-w-6xl grid-cols-[1fr_auto] items-center gap-20">
      <div>
        <p className="text-2xl uppercase tracking-widest text-neutral-500">
          Q&A 대기 중
        </p>
        <h2 className="mt-4 text-6xl font-bold leading-tight">
          질문이 있으신가요?
        </h2>
        <p className="mt-6 text-2xl text-neutral-300">
          QR 코드를 스캔하여 이름과 질문을 남겨주세요.
        </p>
        <p className="mt-12 text-xl text-neutral-500">
          현재 대기 중인 질문: <span className="text-white">{waitingCount}개</span>
        </p>
      </div>
      <QrPanel url={registerUrl} />
    </div>
  );
}

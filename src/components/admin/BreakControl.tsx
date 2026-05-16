"use client";

import { useState, useTransition } from "react";
import { endBreakAction, startBreakAction } from "@/app/actions";
import type { TimerState } from "@/lib/types";

export default function BreakControl({ mode }: { mode: TimerState["mode"] }) {
  const [minutes, setMinutes] = useState(10);
  const [pending, startTransition] = useTransition();

  function startBreak() {
    startTransition(async () => {
      await startBreakAction(minutes);
    });
  }
  function endBreak() {
    startTransition(async () => {
      await endBreakAction();
    });
  }

  if (mode === "break") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <span className="text-sm text-amber-200">휴식 진행 중</span>
        <button
          type="button"
          disabled={pending}
          onClick={endBreak}
          className="ml-auto rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300 disabled:opacity-40"
        >
          {pending ? "처리 중..." : "Q&A 재개"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <label className="flex items-center gap-2 text-sm text-neutral-300">
        휴식 시간 (분)
        <input
          type="number"
          value={minutes}
          min={1}
          max={240}
          onChange={(e) => setMinutes(Math.max(1, Math.min(240, Number(e.target.value) || 1)))}
          className="w-20 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-center text-white focus:border-emerald-400 focus:outline-none"
        />
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={startBreak}
        className="ml-auto rounded-lg border border-amber-500/40 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/30 disabled:opacity-40"
      >
        {pending ? "시작 중..." : "휴식 시작"}
      </button>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { skipCurrentAction, startNextSpeakerAction } from "@/app/actions";
import type { TimerState } from "@/lib/types";

type Props = {
  mode: TimerState["mode"];
  hasCurrent: boolean;
  hasWaiting: boolean;
};

export default function CurrentControl({ mode, hasCurrent, hasWaiting }: Props) {
  const [pending, startTransition] = useTransition();

  function callNext() {
    startTransition(async () => {
      await startNextSpeakerAction();
    });
  }
  function skipCurrent() {
    startTransition(async () => {
      await skipCurrentAction();
    });
  }

  const nextLabel =
    mode === "qna" && hasCurrent
      ? hasWaiting
        ? "현재 종료 + 다음 사람 호출"
        : "현재 종료 (대기열 비어있음)"
      : hasWaiting
        ? "다음 사람 호출"
        : "대기열이 비어있습니다";

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        disabled={pending || (!hasWaiting && !hasCurrent) || mode === "break"}
        onClick={callNext}
        className="flex-1 rounded-xl bg-emerald-500 px-6 py-4 text-lg font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "처리 중..." : nextLabel}
      </button>
      {mode === "qna" && hasCurrent && (
        <button
          type="button"
          disabled={pending}
          onClick={skipCurrent}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-6 py-4 text-base text-neutral-200 transition hover:border-neutral-500 disabled:opacity-40"
        >
          스킵 / 강제 종료
        </button>
      )}
    </div>
  );
}

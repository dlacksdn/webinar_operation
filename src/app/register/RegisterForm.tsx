"use client";

import { useState, useTransition } from "react";
import { registerQuestionAction } from "../actions";

export default function RegisterForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await registerQuestionAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="mt-8 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
        <p className="text-lg font-semibold text-emerald-300">등록되었습니다 ✓</p>
        <p className="mt-2 text-sm text-neutral-300">
          순서가 되면 운영자가 호명합니다. 이 창은 닫으셔도 됩니다.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-4 text-sm text-emerald-200 underline"
        >
          질문 더 등록하기
        </button>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-neutral-300">이름</span>
        <input
          required
          name="name"
          maxLength={60}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
          placeholder="예: 홍길동"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-neutral-300">질문</span>
        <textarea
          required
          name="question"
          maxLength={500}
          rows={5}
          className="resize-none rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
          placeholder="궁금하신 점을 적어주세요."
        />
      </label>
      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-500 px-6 py-3 text-base font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
      >
        {pending ? "등록 중..." : "대기열에 등록"}
      </button>
    </form>
  );
}

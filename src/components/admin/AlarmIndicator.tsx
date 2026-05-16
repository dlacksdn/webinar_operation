"use client";

import { useEffect, useRef } from "react";

type Props = {
  active: boolean;
  onDismiss: () => void;
  label: string;
};

export default function AlarmIndicator({ active, onDismiss, label }: Props) {
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!active) return;
    // short, gentle "tink" — single sine pulse, not aggressive
    try {
      const Ctx =
        typeof window !== "undefined" &&
        (window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext);
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 660;
      osc.type = "sine";
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // audio blocked (e.g. autoplay policy) — visual alert still shows
    }
  }, [active]);

  if (!active) return null;

  return (
    <div className="mt-4 flex items-center justify-between rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      <span>⏰ {label} · 운영자만 보이는 알림</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md bg-red-500/30 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/50"
      >
        확인
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Props = {
  url: string;
  compact?: boolean;
};

export default function QrPanel({ url, compact = false }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: compact ? 200 : 480,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, compact]);

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="등록 QR 코드"
            className="h-24 w-24 rounded-md bg-white p-1"
          />
        ) : (
          <div className="h-24 w-24 animate-pulse rounded-md bg-neutral-800" />
        )}
        <div className="text-sm text-neutral-400">
          <p>질문 등록</p>
          <p className="font-mono text-white">{stripProto(url)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="등록 QR 코드"
          className="h-[480px] w-[480px] rounded-2xl bg-white p-4"
        />
      ) : (
        <div className="h-[480px] w-[480px] animate-pulse rounded-2xl bg-neutral-800" />
      )}
      <p className="font-mono text-xl text-neutral-400">{stripProto(url)}</p>
    </div>
  );
}

function stripProto(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

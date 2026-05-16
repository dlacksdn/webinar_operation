"use client";

import { createBrowserClient } from "@supabase/ssr";
import { config } from "@/lib/env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error(
      "Supabase 환경 변수가 설정되지 않았습니다. .env.local.example을 참고하세요.",
    );
  }
  if (!cached) {
    cached = createBrowserClient(config.supabaseUrl, config.supabaseAnonKey);
  }
  return cached;
}

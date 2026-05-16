import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { config } from "@/lib/env";

export async function getServerSupabase() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error(
      "Supabase 환경 변수가 설정되지 않았습니다. .env.local.example을 참고하세요.",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // server-component context: cookies are read-only, ignore
        }
      },
    },
  });
}

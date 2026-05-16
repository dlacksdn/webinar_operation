import { getServerSupabase } from "@/lib/supabase/server";
import { isConfigured, config } from "@/lib/env";
import type { QueueEntry, TimerState } from "@/lib/types";
import PublicScreen from "@/components/public/PublicScreen";

export const dynamic = "force-dynamic";

export default async function PublicScreenPage() {
  if (!isConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-white">설정이 필요합니다</h1>
          <p className="mt-4 text-neutral-400">
            `.env.local` 파일에 Supabase 환경 변수를 설정한 뒤 다시 시도해주세요.
          </p>
        </div>
      </main>
    );
  }

  const supabase = await getServerSupabase();
  const { data: timer } = await supabase
    .from("timer_state")
    .select("*")
    .limit(1)
    .single<TimerState>();

  let currentEntry: QueueEntry | null = null;
  if (timer?.current_entry_id) {
    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("id", timer.current_entry_id)
      .maybeSingle<QueueEntry>();
    currentEntry = data ?? null;
  }

  const { count: waitingCount } = await supabase
    .from("queue_entries")
    .select("id", { count: "exact", head: true })
    .eq("status", "waiting");

  const registerUrl = `${config.appUrl.replace(/\/$/, "")}/register`;

  return (
    <PublicScreen
      initialTimer={timer ?? null}
      initialCurrentEntry={currentEntry}
      initialWaitingCount={waitingCount ?? 0}
      registerUrl={registerUrl}
    />
  );
}

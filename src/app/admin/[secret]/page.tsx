import { notFound } from "next/navigation";
import { isConfigured, verifyAdminSecret } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";
import type { QueueEntry, TimerState } from "@/lib/types";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ secret: string }> };

export default async function AdminPage({ params }: PageProps) {
  const { secret } = await params;
  if (!verifyAdminSecret(secret)) notFound();

  if (!isConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">환경 변수가 설정되지 않았습니다</h1>
          <p className="mt-4 text-neutral-400">
            `.env.local.example` 을 참고하여 Supabase URL/Key 를 설정해주세요.
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

  const { data: queueRaw } = await supabase
    .from("queue_entries")
    .select("*")
    .in("status", ["waiting", "current"])
    .order("position", { ascending: true });

  const queue = (queueRaw ?? []) as QueueEntry[];

  return <AdminDashboard initialTimer={timer ?? null} initialQueue={queue} />;
}

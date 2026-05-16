"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { QA_DURATION_SECONDS } from "@/lib/types";

async function getActiveSessionId(): Promise<string> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select("id")
    .eq("is_active", true)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !data) {
    throw new Error("활성 세션을 찾을 수 없습니다. SQL 마이그레이션이 적용되었는지 확인하세요.");
  }
  return data.id;
}

export async function registerQuestionAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const question = String(formData.get("question") ?? "").trim();

  if (!name || !question) {
    return { ok: false as const, error: "이름과 질문을 모두 입력해주세요." };
  }
  if (name.length > 60) {
    return { ok: false as const, error: "이름은 60자 이하로 입력해주세요." };
  }
  if (question.length > 500) {
    return { ok: false as const, error: "질문은 500자 이하로 입력해주세요." };
  }

  const supabase = await getServerSupabase();
  const sessionId = await getActiveSessionId();

  const { data: maxRow } = await supabase
    .from("queue_entries")
    .select("position")
    .eq("session_id", sessionId)
    .in("status", ["waiting", "current"])
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = (maxRow?.position ?? 0) + 1;

  const { error: insertError } = await supabase.from("queue_entries").insert({
    session_id: sessionId,
    name,
    question,
    position: nextPosition,
    status: "waiting",
  });

  if (insertError) {
    return { ok: false as const, error: insertError.message };
  }

  return { ok: true as const };
}

export async function deleteQueueEntryAction(entryId: string) {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "skipped" })
    .eq("id", entryId)
    .in("status", ["waiting"]);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function reorderQueueAction(orderedIds: string[]) {
  const supabase = await getServerSupabase();
  const sessionId = await getActiveSessionId();
  const updates = orderedIds.map((id, idx) =>
    supabase
      .from("queue_entries")
      .update({ position: idx + 1 })
      .eq("id", id)
      .eq("session_id", sessionId),
  );
  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) throw new Error(firstError.message);
  revalidatePath("/", "layout");
}

export async function startNextSpeakerAction() {
  const supabase = await getServerSupabase();
  const sessionId = await getActiveSessionId();

  // mark previous "current" as done
  await supabase
    .from("queue_entries")
    .update({ status: "done" })
    .eq("session_id", sessionId)
    .eq("status", "current");

  // pick the next waiting entry by position
  const { data: next, error: pickError } = await supabase
    .from("queue_entries")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "waiting")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pickError) throw new Error(pickError.message);
  if (!next) {
    // queue empty → set timer idle
    await supabase
      .from("timer_state")
      .update({
        mode: "idle",
        current_entry_id: null,
        started_at: null,
        duration_seconds: null,
      })
      .eq("session_id", sessionId);
    await supabase.from("sessions").update({ status: "idle" }).eq("id", sessionId);
    revalidatePath("/", "layout");
    return { ok: true as const, started: false };
  }

  await supabase.from("queue_entries").update({ status: "current" }).eq("id", next.id);

  await supabase
    .from("timer_state")
    .update({
      mode: "qna",
      current_entry_id: next.id,
      started_at: new Date().toISOString(),
      duration_seconds: QA_DURATION_SECONDS,
    })
    .eq("session_id", sessionId);

  await supabase.from("sessions").update({ status: "live" }).eq("id", sessionId);
  revalidatePath("/", "layout");
  return { ok: true as const, started: true };
}

export async function skipCurrentAction() {
  const supabase = await getServerSupabase();
  const sessionId = await getActiveSessionId();
  await supabase
    .from("queue_entries")
    .update({ status: "skipped" })
    .eq("session_id", sessionId)
    .eq("status", "current");
  await supabase
    .from("timer_state")
    .update({
      mode: "idle",
      current_entry_id: null,
      started_at: null,
      duration_seconds: null,
    })
    .eq("session_id", sessionId);
  await supabase.from("sessions").update({ status: "idle" }).eq("id", sessionId);
  revalidatePath("/", "layout");
}

export async function startBreakAction(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240) {
    throw new Error("휴식 시간은 1~240분 사이여야 합니다.");
  }
  const supabase = await getServerSupabase();
  const sessionId = await getActiveSessionId();

  // hold the current speaker if any — move them back to waiting at position 0.5
  const { data: current } = await supabase
    .from("queue_entries")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "current")
    .maybeSingle();
  if (current) {
    await supabase
      .from("queue_entries")
      .update({ status: "waiting", position: 0 })
      .eq("id", current.id);
  }

  await supabase
    .from("timer_state")
    .update({
      mode: "break",
      current_entry_id: null,
      started_at: new Date().toISOString(),
      duration_seconds: Math.round(minutes * 60),
    })
    .eq("session_id", sessionId);

  await supabase.from("sessions").update({ status: "break" }).eq("id", sessionId);
  revalidatePath("/", "layout");
}

export async function endBreakAction() {
  const supabase = await getServerSupabase();
  const sessionId = await getActiveSessionId();
  await supabase
    .from("timer_state")
    .update({
      mode: "idle",
      current_entry_id: null,
      started_at: null,
      duration_seconds: null,
    })
    .eq("session_id", sessionId);
  await supabase.from("sessions").update({ status: "idle" }).eq("id", sessionId);
  revalidatePath("/", "layout");
}

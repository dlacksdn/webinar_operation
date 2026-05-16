-- Webinar Q&A Timer — initial schema
-- Run this once against your Supabase project (SQL editor or `supabase db push`).

-- single-session model: there is exactly one active session row
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  status        text not null default 'idle' check (status in ('idle','live','break','paused')),
  started_at    timestamptz not null default now(),
  is_active     boolean not null default true
);

create table if not exists public.queue_entries (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  name          text not null,
  question      text not null,
  position      integer not null,
  status        text not null default 'waiting' check (status in ('waiting','current','done','skipped')),
  created_at    timestamptz not null default now()
);

create index if not exists queue_entries_session_pos_idx
  on public.queue_entries(session_id, position);
create index if not exists queue_entries_status_idx
  on public.queue_entries(session_id, status);

create table if not exists public.timer_state (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null unique references public.sessions(id) on delete cascade,
  mode             text not null default 'idle' check (mode in ('idle','qna','break')),
  current_entry_id uuid references public.queue_entries(id) on delete set null,
  started_at       timestamptz,
  duration_seconds integer
);

-- broadcast all three tables on realtime
alter publication supabase_realtime add table public.queue_entries;
alter publication supabase_realtime add table public.timer_state;
alter publication supabase_realtime add table public.sessions;

-- per spec: no auth, URL-secret protection only. RLS therefore allows all.
-- (RLS still enabled so that future tightening is one policy edit away.)
alter table public.sessions      enable row level security;
alter table public.queue_entries enable row level security;
alter table public.timer_state   enable row level security;

drop policy if exists "sessions read"  on public.sessions;
drop policy if exists "sessions write" on public.sessions;
drop policy if exists "queue read"     on public.queue_entries;
drop policy if exists "queue write"    on public.queue_entries;
drop policy if exists "timer read"     on public.timer_state;
drop policy if exists "timer write"    on public.timer_state;

create policy "sessions read"  on public.sessions      for select using (true);
create policy "sessions write" on public.sessions      for all    using (true) with check (true);
create policy "queue read"     on public.queue_entries for select using (true);
create policy "queue write"    on public.queue_entries for all    using (true) with check (true);
create policy "timer read"     on public.timer_state   for select using (true);
create policy "timer write"    on public.timer_state   for all    using (true) with check (true);

-- bootstrap a single session and its timer_state row if none exist
insert into public.sessions (status)
select 'idle'
where not exists (select 1 from public.sessions);

insert into public.timer_state (session_id, mode)
select s.id, 'idle'
from public.sessions s
where not exists (select 1 from public.timer_state t where t.session_id = s.id);

# Implementation Plan: 세미나 워크숍 Q&A 타이머 대시보드

Source spec: `.omc/specs/deep-interview-webinar-qna-timer.md`

## Stack Decisions

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS v3
- **Backend:** Supabase (Postgres + Realtime)
- **Drag & Drop:** `@dnd-kit/sortable`
- **State:** Server Components + Supabase realtime subscriptions on client. Minimal Zustand/Redux — keep it native React.
- **Audio:** Web Audio API for short beep on operator alarm
- **Package manager:** npm (default, no need to install pnpm/yarn on Windows)

## File Layout

```
webinar-operation/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── postcss.config.mjs
├── tailwind.config.ts
├── .env.local.example
├── README.md
├── supabase/
│   └── migrations/
│       └── 0001_init.sql            # sessions, queue_entries, timer_state + RLS + realtime publication
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── page.tsx                 # 공개 화면 (/)
│   │   ├── register/
│   │   │   └── page.tsx             # 참가자 QR 등록 폼
│   │   └── admin/
│   │       └── [secret]/
│   │           └── page.tsx         # 운영자 대시보드 (URL secret 검증)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # 브라우저용 클라이언트
│   │   │   └── server.ts            # 서버 컴포넌트/액션용
│   │   ├── types.ts                 # DB 타입
│   │   ├── timer.ts                 # 서버 시간 기준 카운트다운 계산
│   │   └── env.ts                   # 환경변수 + admin secret 검증
│   └── components/
│       ├── public/
│       │   ├── PublicScreen.tsx     # 현재 진행 상황 큰 글씨 표시
│       │   ├── CurrentSpeaker.tsx
│       │   ├── TimerDisplay.tsx     # 0:00에서 멈춤
│       │   ├── BreakDisplay.tsx
│       │   └── QrPanel.tsx          # QR 코드 + 등록 URL
│       └── admin/
│           ├── AdminDashboard.tsx   # 전체 컨테이너 + realtime 구독
│           ├── QueueList.tsx        # FIFO + 드래그 + 삭제 (dnd-kit)
│           ├── QueueItem.tsx
│           ├── CurrentControl.tsx   # 다음 사람 / 스킵 버튼
│           ├── BreakControl.tsx     # 휴식 시작/Q&A 재개
│           ├── AlarmIndicator.tsx   # 조용한 시각 알림 (0:00 도달 시)
│           └── ServerActions.ts     # 큐 mutation server actions
```

## Database Schema (supabase/migrations/0001_init.sql)

```sql
-- single-session model: there's always exactly one row in `sessions`
create table public.sessions (
  id            uuid primary key default gen_random_uuid(),
  status        text not null default 'idle' check (status in ('idle','live','break','paused')),
  started_at    timestamptz not null default now(),
  is_active     boolean not null default true
);

create table public.queue_entries (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  name          text not null,
  question      text not null,
  position      integer not null,
  status        text not null default 'waiting' check (status in ('waiting','current','done','skipped')),
  created_at    timestamptz not null default now()
);

create index queue_entries_session_pos_idx on public.queue_entries(session_id, position);
create index queue_entries_status_idx on public.queue_entries(session_id, status);

create table public.timer_state (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null unique references public.sessions(id) on delete cascade,
  mode            text not null default 'idle' check (mode in ('idle','qna','break')),
  current_entry_id uuid references public.queue_entries(id) on delete set null,
  started_at      timestamptz,        -- when current mode started; null when idle
  duration_seconds integer            -- 600 for qna; user-input for break
);

-- Realtime publication: queue + timer broadcast to all clients
alter publication supabase_realtime add table public.queue_entries;
alter publication supabase_realtime add table public.timer_state;
alter publication supabase_realtime add table public.sessions;

-- RLS: open read, open write (URL-secret-only protection per spec)
alter table public.sessions      enable row level security;
alter table public.queue_entries enable row level security;
alter table public.timer_state   enable row level security;

create policy "allow all read sessions"      on public.sessions      for select using (true);
create policy "allow all write sessions"     on public.sessions      for all    using (true) with check (true);
create policy "allow all read queue"         on public.queue_entries for select using (true);
create policy "allow all write queue"        on public.queue_entries for all    using (true) with check (true);
create policy "allow all read timer"         on public.timer_state   for select using (true);
create policy "allow all write timer"        on public.timer_state   for all    using (true) with check (true);

-- bootstrap single session row
insert into public.sessions (status) values ('idle');
insert into public.timer_state (session_id, mode)
  select id, 'idle' from public.sessions limit 1;
```

## Acceptance Criteria Coverage

| AC | Implementation Point |
|----|----------------------|
| AC1 | `QrPanel.tsx` shows QR pointing to `/register`. `register/page.tsx` is the form. |
| AC2 | `register/page.tsx` server action inserts into `queue_entries` with status=`waiting`, position = max+1. |
| AC3 | `QueueList.tsx` uses `@dnd-kit/sortable`. `reorderQueue` server action rewrites positions in a transaction. Public screen subscribes to realtime. |
| AC4 | `QueueItem.tsx` delete button → `deleteQueueEntry` server action sets status=`skipped` (soft-delete to preserve history). |
| AC5 | `CurrentControl.tsx` "다음 사람" → server action: marks current entry done, picks first waiting entry, sets timer_state.mode=`qna`, current_entry_id, started_at=now(), duration_seconds=600. |
| AC6 | `TimerDisplay.tsx` computes remaining = `duration - (now - started_at)`. Floors at 0. On public screen → stop at 0:00. On admin `AlarmIndicator` → quiet pulse + short beep when crossing 0. |
| AC7 | `BreakControl.tsx` "휴식 시작" → input minutes → server action: timer_state.mode=`break`, started_at=now(), duration_seconds = minutes*60. Public screen renders `BreakDisplay.tsx`. |
| AC8 | At 0:00 in break mode → operator alarm only. No auto-transition. "Q&A 재개" button → server action: timer_state.mode=`idle` (or directly to next waiting). |
| AC9 | All state is in Supabase. Refresh → server component re-reads. Realtime keeps clients in sync. |
| AC10 | "다음 사람" / "스킵" both require explicit click. No auto-advance. |
| AC11 | `/admin/[secret]/page.tsx` checks `secret === process.env.ADMIN_SECRET`. Mismatch → 404. |
| AC12 | `PublicScreen.tsx` renders current name, question, timer/break in large font. |

## Timer Synchronization Strategy

All clients (public + admin) compute remaining time from `timer_state.started_at + duration_seconds - now()`. Using the **client clock** is acceptable for second-level accuracy since browsers and the operator are likely on the same room/network and Supabase's `started_at` is the source of truth. Drift between admin and public screen is bounded by the difference in their local clocks, which is irrelevant at 1-second granularity for a 10-minute timer.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| User has no Supabase project yet | `.env.local.example` + README with step-by-step setup instructions. App degrades gracefully with a "환경 변수가 설정되지 않았습니다" placeholder when env is missing. |
| `position` collisions during concurrent reorder | Server action uses a transactional rewrite (delete all → insert all) for simplicity. Single operator, so contention is near-zero. |
| RLS policies too permissive | Spec explicitly chose "no auth, URL secret only". This is the documented decision. README warns to keep admin URL private. |
| QR code generation | Use `qrcode` npm package (simple, server-side render to data URL). |

## Non-Goals (reaffirmed from spec)

- Multi-operator
- Auth / login screens
- Mobile-optimized public screen (designed for projector)
- Persistent session history across multiple events
- Auto-advance between speakers

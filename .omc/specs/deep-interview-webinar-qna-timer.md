# Deep Interview Spec: 세미나 워크숍 Q&A 타이머 대시보드

## Metadata
- Interview ID: webinar-qna-timer-2026-05-16
- Rounds: 7 (Round 0 topology + 7 ambiguity rounds)
- Final Ambiguity Score: 15%
- Type: greenfield
- Generated: 2026-05-16
- Threshold: 0.20
- Initial Context Summarized: no
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.8975 | 0.40 | 0.359 |
| Constraint Clarity | 0.85 | 0.30 | 0.255 |
| Success Criteria | 0.775 | 0.30 | 0.2325 |
| **Total Clarity** | | | **0.8465** |
| **Ambiguity** | | | **15.35%** |

## Topology

| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| Queue | active | 참가자가 QR로 셀프 등록하면 자동 추가되는 FIFO 대기열, 운영자가 드래그로 순서 변경/삭제 | AC1, AC2, AC3, AC4, AC9 |
| Q&A Timer | active | 현재 답변 중인 사람의 10분 고정 카운트다운, 종료 시 운영자에게만 조용한 알림 | AC5, AC6, AC10 |
| Break Timer | active | 운영자 수동 시작/종료, 시간 입력 후 카운트다운, 0:00 도달 시 알림 (자동 복귀 안 함) | AC7, AC8 |
| Dashboard | active | 운영자 제어 대시보드 + 참가자 공개 화면 두 개 뷰, Supabase 실시간 동기화 | AC2, AC3, AC11, AC12 |

## Goal

4시간 동안 진행되는 세미나/워크숍에서, 참가자가 QR 코드로 자신의 이름과 질문을 등록하면 대기열에 자동으로 추가되고, 운영자가 한 명씩 호출하여 각자 10분의 고정된 Q&A 시간을 제공하는 웹 기반 운영 도구를 만든다. 운영자는 단일 대시보드에서 대기열·진행 중 타이머·휴식 타이머를 모두 제어하며, 참가자 및 관객을 위한 별도의 공개 화면에는 현재 진행 상황과 타이머만 크게 표시한다. Supabase를 통해 데이터가 영속화되어 새로고침해도 운영이 끊기지 않는다.

## Constraints

- **백엔드:** Supabase (Postgres + Realtime). 세션 영속성과 다중 클라이언트 동기화에 사용.
- **프론트엔드:** 웹 앱 (브라우저). QR 스캔으로 모바일에서도 등록 폼 사용 가능해야 함.
- **인증:** 없음. 운영자 페이지는 URL 시크릿(예: `/admin?key=...` 또는 `/operator/{uuid}`)으로만 분리. 비밀번호 화면 없음.
- **화면 수:** 2개 — 운영자 대시보드 1개 + 참가자/관객 공개 화면 1개.
- **운영자 수:** 1명 가정. 다중 운영자/권한 모델 없음.
- **타이머 정밀도:** 초 단위. 1초 미만 정밀도 필요 없음.
- **Q&A 시간:** 고정 10분. 사용자별 시간 차등 없음.
- **휴식 동작:** 운영자가 수동으로 시간 입력 후 시작. 0:00 도달 시 알림만 울리고 자동으로 Q&A 모드로 복귀하지 않음 (운영자가 "Q&A 재개" 클릭 필요).
- **알림 방식:** Q&A 타이머 0:00 시 — 공개 화면은 0:00에서 표시만 멈춤 (소리 없음, 깜박임 없음), 운영자 대시보드에는 조용한 알림. Break 타이머 0:00 시 — 운영자에게 알림.
- **이벤트 길이:** 약 4시간 단일 세션 가정.
- **언어:** 한국어 UI.

## Non-Goals

- 다중 운영자 / 권한 관리.
- 인증·회원가입.
- 참가자가 자신의 순번을 실시간으로 보는 모바일 뷰 (공개 화면만 봄).
- Q&A 시간 사용자별 차등.
- 자동 다음 사람 호출 (운영자가 항상 수동 "다음" 클릭).
- 휴식 자동 스케줄링.
- 음성/영상 녹화, 채팅, 화상회의 통합.
- 다국어, 결제, 통계 분석 대시보드.
- 과거 세션 히스토리 보존 (이번 라운드에서 명시적으로 결정하지 않았으나 MVP 범위 밖).

## Acceptance Criteria

- [ ] **AC1** 참가자가 공개 화면에 표시된 QR 코드를 스캔하면 이름·질문 입력 폼이 열린다.
- [ ] **AC2** 폼 제출 즉시 해당 항목이 운영자 대시보드 대기열 끝에 자동으로 추가된다 (승인 단계 없음).
- [ ] **AC3** 운영자가 대기열 항목을 드래그하여 순서를 변경하면 그 변경이 Supabase에 저장되고 공개 화면에도 반영된다.
- [ ] **AC4** 운영자가 대기열 항목의 삭제 버튼을 클릭하면 해당 항목이 즉시 큐에서 제거된다.
- [ ] **AC5** 운영자가 "다음 사람" 버튼을 클릭하면 큐의 첫 번째 항목이 "현재 답변 중"으로 이동하고 10분 카운트다운이 즉시 시작된다.
- [ ] **AC6** Q&A 타이머가 0:00에 도달하면 공개 화면은 0:00에서 멈추고, 운영자 대시보드에만 조용한 시각적 알림이 표시된다. 자동 종료/다음 이동은 일어나지 않는다.
- [ ] **AC7** 운영자가 "휴식 시작" 버튼을 클릭하고 분 단위 시간을 입력하면, 공개 화면이 "휴식 중 · 남은 시간 X:XX" 화면으로 전환된다.
- [ ] **AC8** 휴식 타이머가 0:00에 도달하면 운영자 대시보드에 알림이 울린다. 공개 화면은 자동으로 Q&A 모드로 돌아가지 않고, 운영자가 "Q&A 재개" 버튼을 클릭해야 전환된다.
- [ ] **AC9** 운영자가 브라우저를 새로고침하거나 노트북을 재시작해도, Supabase에 저장된 대기열 상태가 복원된다.
- [ ] **AC10** 운영자가 현재 진행 중인 Q&A를 종료할 때 "다음 사람" 또는 "스킵/종료"를 명시적으로 클릭해야 다음 진행이 가능하다.
- [ ] **AC11** 운영자 페이지는 URL 시크릿이 있어야만 접근 가능하다. 공개 URL을 아는 사람은 운영자 컨트롤을 볼 수 없다.
- [ ] **AC12** 공개 화면은 현재 답변 중인 사람의 이름·질문·남은 시간(또는 휴식 상태)을 큰 글씨로 표시한다.

## Assumptions Exposed & Resolved

| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 모든 사람에게 10분이 똑같이 적용되어야 한다 | Contrarian: "정말 모두 똑같이?" / 가변 시간 옵션 제시 | **고정 10분 확정.** 단순성 우선. 운영자가 분위기로 자연스럽게 종료 시점 조절. |
| 시간 종료 시 자동으로 다음 사람으로 넘어간다 | Contrarian: "자동 종료가 진짜 필요한가?" | **자동 종료 안 함.** 운영자가 "다음 사람" 수동 클릭. 대화 흐름이 끊기지 않도록. |
| 운영자가 큐 항목을 일일이 입력해야 한다 | "다른 입력 방식은?" | **참가자 QR 셀프 등록 채택.** 운영자는 순서/승인이 아닌 큐 통제에만 집중. |
| 등록 시 운영자 승인이 필요하다 | Simplifier: "승인 단계가 정말 필요한가?" | **승인 없음.** 즉시 큐 추가. 필요 시 삭제 버튼으로 제거. |
| 화면이 하나로 충분하다 | "참가자도 볼 화면이 필요하지 않나?" | **2개 화면 확정.** 운영자 대시보드 + 공개 화면 분리. |
| 휴식이 자동 일정으로 들어간다 | "수동 vs 자동?" | **수동.** 운영자가 분위기 보고 결정. |
| 데이터를 메모리에만 저장하면 된다 | Simplifier: "DB가 진짜 필요한가?" | **Supabase로 영속화.** 4시간 운영 중 새로고침/끊김 시 대비. |
| 운영자 페이지에 로그인이 필요하다 | Simplifier: "비밀번호가 진짜 필요한가?" | **URL 시크릿만.** 비밀번호 화면 없음. 미니멀 우선. |
| 시간 종료 시 공개 화면에 강한 알람이 울려야 한다 | "참가자에게 dramatic할 필요가 있는가?" | **공개 화면은 조용히 0:00에서 멈춤.** 운영자에게만 조용한 알림. 소눌자가 자연스럽게 느낄 수 있도록. |

## Technical Context

- **스택 후보:** Next.js + Supabase (가장 자연스러운 조합). Realtime subscription으로 운영자 대시보드 ↔ 공개 화면 동기화. App Router 가정.
- **Supabase 스키마 초안:**
  - `sessions`: id, started_at, status (`live`/`break`/`paused`)
  - `queue_entries`: id, session_id, name, question, position (정수, 드래그 시 재정렬), status (`waiting`/`current`/`done`/`skipped`/`deleted`), created_at
  - `timer_state`: id, session_id, mode (`qna`/`break`/`idle`), current_entry_id, started_at, duration_seconds (Q&A는 600 고정, Break는 운영자 입력값)
- **라우트 구조:**
  - `/` 또는 `/public` — 공개 화면 (QR 코드 + 현재 진행 상황)
  - `/admin/{secret}` 또는 쿠키 기반 시크릿 분기 — 운영자 대시보드
  - `/register?session={id}` — QR 스캔 시 열리는 참가자 등록 폼
- **타이머 동기화:** 클라이언트 타이머는 `timer_state.started_at + duration_seconds`로 서버 시간 기준 카운트다운 계산. 브라우저별 시간 드리프트 방지.
- **알림 음:** 짧은 효과음 1개 + 토스트/배지로 시각 알림 (운영자 화면만).
- **드래그 라이브러리 후보:** `@dnd-kit/sortable`.

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| Session | core domain | id, started_at, status | 1:N QueueEntry, 1:1 TimerState |
| Operator | core domain | (URL secret으로만 식별, 객체 없음) | controls Session |
| Participant | core domain | name, question (제출 시점에만 존재, 별도 테이블 없음) | submits QueueEntry |
| QueueEntry | core domain | id, session_id, name, question, position, status, created_at | belongs to Session |
| QASession | core domain | (실은 TimerState의 mode='qna' + current_entry_id) | references QueueEntry |
| Break | core domain | (TimerState의 mode='break' + duration_seconds) | belongs to Session |
| TimerState | core domain | id, session_id, mode, current_entry_id, started_at, duration_seconds | 1:1 Session |
| OperatorDashboard | view | (UI 뷰, 백엔드 모델 아님) | renders Session + TimerState + QueueEntries |
| PublicScreen | view | (UI 뷰, 백엔드 모델 아님) | renders Session + TimerState + current QueueEntry |
| QRRegistrationForm | view | (UI 뷰, 입력만 함) | creates QueueEntry |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 7 | 7 | - | - | N/A |
| 2 | 9 | 2 (QRRegistrationForm, Operator URL) | - | 7 | 78% |
| 3 | 9 | 0 | 1 (Break: 운영자 수동 시작/종료 구체화) | 8 | 100% |
| 4 | 9 | 0 | 1 (Q&A Timer: 고정 10분/수동 다음 명확화) | 8 | 100% |
| 5 | 9 | 0 | 1 (Queue: FIFO+드래그 명확화) | 8 | 100% |
| 6 | 10 | 1 (TimerState 모델 도입 — Supabase 스키마 시야) | 1 (Session: status 추가) | 8 | 90% |
| 7 | 10 | 0 | 2 (Q&A/Break Timer Criteria) | 8 | 100% |

**관찰:** Round 3부터 핵심 엔티티는 안정. Round 6에서 Supabase 결정이 데이터 모델을 강제하면서 TimerState라는 새 엔티티가 한 번 등장했고, 그 뒤로는 다시 안정. 도메인 모델이 충분히 수렴됨.

## Interview Transcript

<details>
<summary>전체 Q&A (Round 0 + 7 rounds)</summary>

### Round 0 — Topology Confirmation
**Q:** 이 4개 컴포넌트 구성이 맞나요? (Queue / Q&A Timer / Break Timer / Dashboard)
**A:** 4개 모두 맞음.
**Topology locked:** 4 active, 0 deferred.

### Round 1 — Dashboard / Goal
**Q:** 이 소프트웨어는 화면이 몇 개이고, 누가 볼 예정인가요?
**A:** 운영자 대시보드 + 참가자 공개 화면 (2개).
**Ambiguity:** 82% → 78% (Goal 0.1→0.6, Constraints 0.1→0.2)

### Round 2 — Queue / Goal
**Q:** 사람들이 어떻게 대기열(큐)에 들어오나요? 이름/질문을 누가 입력하나요?
**A:** 참가자 QR 셀프 등록.
**Ambiguity:** 78% → 67%

### Round 3 — Break Timer / Goal
**Q:** 휴식 타이머는 언제 시작/종료되고, 공개 화면에 뭐가 표시되나요?
**A:** 운영자 수동 시작/종료.
**Ambiguity:** 67% → 57%

### Round 4 — Q&A Timer / Goal [Contrarian Mode]
**Q:** '10분'이 정말 모두에게 똑같아야 하나요? 끝나면 자동으로 다음? 운영자 결정?
**A:** 고정 10분 + 종료 시 알림만, 운영자가 수동 다음.
**Ambiguity:** 57% → 49%

### Round 5 — Queue / Criteria
**Q:** QR 제출 즉시 큐 추가 vs 승인 필요? 다음 사람 선택은 FIFO vs 자유?
**A:** 제출 즉시 자동 추가 + FIFO 기본 + 드래그 순서변경.
**Ambiguity:** 49% → 38%

### Round 6 — Dashboard / Criteria [Simplifier Mode]
**Q:** 새로고침 시 큐 유지? 로그인 필요?
**A:** Supabase로 영속화. 인증 없이 URL 시크릿으로 미니멀.
**Ambiguity:** 38% → 27%

### Round 7 — Q&A Timer + Break Timer / Criteria
**Q:** Q&A 타이머 0:00 시 무슨 일? 휴식 0:00 시?
**A:** 공개 화면은 0:00에서 멈추고 운영자에게만 조용한 알림. 휴식도 알림만 울리고 복귀는 운영자 수동.
**Ambiguity:** 27% → 15% ✅ (임계값 통과)

</details>

## Status: `pending approval`

명세서는 다음 단계 승인 대기 중. 사용자가 실행 경로를 명시적으로 선택해야 다음 진행 가능.

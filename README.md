# Webinar Q&A Timer 🎤

4시간짜리 세미나/워크숍 운영을 위한 **Q&A 타이머 + 대기열 + 휴식 관리 대시보드**입니다.
참가자는 QR 코드를 스캔해 자기 이름·질문을 등록하고, 운영자는 단일 대시보드에서 모든 흐름을 통제합니다.

## 화면 구성

| 경로 | 누가 보는가 | 무엇을 보는가 |
|------|-------------|---------------|
| `/` | 참가자 / 관객 (큰 디스플레이) | 현재 진행 중인 질문, 남은 시간, QR 코드 |
| `/register` | 참가자 (모바일 QR 스캔) | 이름·질문 입력 폼 |
| `/admin/<ADMIN_SECRET>` | 운영자 (혼자 노트북에서) | 대기열, "다음 사람" 버튼, 휴식 컨트롤, 알림 |

## 사전 준비

### 1. Node.js 설치
- Node.js **18.18 이상** (권장 20 LTS): https://nodejs.org/
- 설치 후 PowerShell 새 창에서 확인:
  ```powershell
  node --version
  npm --version
  ```

### 2. Supabase 프로젝트
1. https://supabase.com/dashboard 에서 새 프로젝트 생성
2. **Settings → API** 에서 다음 두 값 복사:
   - Project URL (`https://xxx.supabase.co`)
   - `anon public` key
3. **SQL Editor** 에서 `supabase/migrations/0001_init.sql` 내용 전체를 붙여넣고 Run

### 3. 환경 변수 설정
프로젝트 루트에 `.env.local` 파일을 만들고 (`.env.local.example` 복사):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
ADMIN_SECRET=긴-랜덤-문자열-아무도-모르게
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> ⚠️ `ADMIN_SECRET` 은 누구나 알면 큐를 통제할 수 있는 키입니다. 충분히 길고 랜덤하게 설정하세요.

## 실행

```bash
npm install
npm run dev
```

- 운영자: http://localhost:3000/admin/&lt;ADMIN_SECRET&gt;
- 공개 화면 (프로젝터/큰 모니터에 띄우기): http://localhost:3000/
- 참가자는 공개 화면의 QR 코드 스캔만 하면 됨

## 운영 시나리오 (4시간 세미나)

1. **준비:** 노트북에서 운영자 대시보드 열기. 빔 프로젝터/모니터에 공개 화면(`/`) 띄우기.
2. **세션 시작:** 공개 화면의 QR을 참가자가 스캔 → 이름·질문 등록 → 대기열에 자동 추가.
3. **첫 질문:** 운영자가 "다음 사람 호출" 클릭 → 10분 타이머 시작, 공개 화면에 이름·질문·타이머 표시.
4. **시간 종료:** 0:00 도달 → 공개 화면은 0:00에서 멈춤 (참가자 안 놀라게), 운영자만 조용한 알림. 자연스럽게 마무리 후 "다음 사람 호출" 클릭.
5. **순서 조정:** 대기열 항목을 드래그하여 우선순위 변경, 부적절한 질문은 삭제.
6. **휴식:** "휴식 시작" → 분 입력 (예: 10) → 공개 화면이 "휴식 중 X:XX" 로 전환. 0:00 도달 시 운영자에게 알림, "Q&A 재개" 클릭으로 복귀.
7. **세션 종료:** 큐가 비면 자동으로 idle 상태. 노트북 닫아도 다음에 새로고침하면 상태가 그대로 복원됨 (Supabase 영속).

## 스택

- **프레임워크:** Next.js 15 (App Router) + React 19 + TypeScript
- **스타일:** Tailwind CSS v3
- **백엔드:** Supabase (Postgres + Realtime)
- **드래그앤드롭:** `@dnd-kit/sortable`
- **QR 코드:** `qrcode` 패키지 (서버에서 data URL 생성)

## 보안 모델 (의도된 결정)

이 앱은 **인증 화면이 없습니다.** Spec에 명시된 미니멀 운영 모델에 따라:

- 운영자 페이지는 `/admin/<ADMIN_SECRET>` URL을 아는 사람만 접근 가능 (서버 측 검증)
- Supabase RLS는 모두 허용 — 보안 경계는 anon key 노출 여부에 의존
- anon key는 브라우저에 노출되는 정상적인 값. 악의적 사용자가 직접 큐를 mutation할 수 있음을 의미.

**프로덕션 사용 시 권장:**
- 사내 네트워크나 VPN 환경에서만 운영
- 또는 spec을 확장해 운영자 액션을 server-side에서만 수행하도록 service_role 키와 RLS를 강화

## 디렉토리 구조

```
.
├── PLAN.md                                # 구현 계획 (.omc/plans/autopilot-impl.md 복사본)
├── SPEC.md                                # Deep-interview 명세서 (.omc/specs/... 복사본)
├── supabase/migrations/0001_init.sql      # DB 스키마 + RLS + realtime publication
├── src/
│   ├── app/
│   │   ├── page.tsx                       # 공개 화면 /
│   │   ├── register/                      # /register (QR 진입 폼)
│   │   ├── admin/[secret]/                # /admin/<secret> (운영자 대시보드)
│   │   └── actions.ts                     # 모든 server actions (큐/타이머/휴식)
│   ├── components/
│   │   ├── public/                        # 공개 화면 UI
│   │   └── admin/                         # 운영자 대시보드 UI
│   └── lib/
│       ├── env.ts                         # 환경 변수 + ADMIN_SECRET 검증
│       ├── types.ts                       # DB 타입 + 상수 (QA_DURATION_SECONDS = 600)
│       ├── timer.ts                       # 서버 시간 기준 카운트다운 계산
│       └── supabase/                      # 브라우저/서버 클라이언트
└── .omc/                                  # 자동화 산출물 (autopilot 상태/계획/명세서)
```

## 알려진 제약 (Non-Goals)

- 다중 운영자 / 권한 관리 없음
- 사용자별 시간 차등 없음 (전원 고정 10분)
- 모바일 최적화 공개 화면 없음 (대형 디스플레이 가정)
- 과거 세션 히스토리 별도 페이지 없음

## 트러블슈팅

- **"환경 변수가 설정되지 않았습니다"**: `.env.local` 파일 있는지, dev 서버를 재시작했는지 확인.
- **"활성 세션을 찾을 수 없습니다"**: SQL 마이그레이션을 적용했는지 확인.
- **/admin이 404**: URL의 secret 부분이 `.env.local`의 `ADMIN_SECRET` 값과 정확히 일치하는지 확인.
- **공개 화면이 업데이트되지 않음**: Supabase 대시보드의 Database → Replication → `supabase_realtime` 퍼블리케이션에 세 테이블이 포함되어 있는지 확인 (마이그레이션이 자동으로 추가).
- **타이머가 클라이언트별로 미세하게 다름**: 정상. 서버의 `started_at` 기준으로 각 클라이언트가 계산. 1초 단위 정확도.

## 라이선스

내부 사용 도구로 작성되었습니다. 자유롭게 수정/배포 가능.

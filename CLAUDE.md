# MoneyBall Score

## ⚠️ AI 에이전트 필수 지시사항 (READ FIRST)

이 리포에서 계획·설계·리뷰·구현 작업을 시작하기 전에 **반드시** 현재 상태를 기계적으로 확인하라. 메모리·체크포인트·대화 맥락은 stale 가능성 상존.

### 세션 시작 시 필수 스캔

```bash
cd ~/projects/moneyballscore
git log --oneline -20                       # 최근 20개 커밋
git status                                  # 미커밋 변경
ls supabase/migrations/ | sort -n           # 최신 마이그레이션 번호
ls packages/kbo-data/src/agents/            # 에이전트 파일들
ls apps/moneyball/src/app/                  # 앱 라우트
cat CHANGELOG.md | head -40                 # 버전 히스토리
cat TODOS.md 2>/dev/null | head -30         # 할 일
```

이 결과를 **메모리·체크포인트에 적힌 상태와 대조**. 드리프트 발견 시 **플래닝 전 사용자에게 먼저 보고**.

### 세션 시작 검증 — 체크포인트 주장을 현실과 대조 (R5)

`/handoff load` 의 기본 drift 감지 (git HEAD 비교) 만으론 부족. 체크포인트·SNAPSHOT 이 주장하는 **구체 사실들을 현실과 대조**:

- "X 가 배포됨" → `git log` + 실제 파일 존재 확인
- "Y env 설정됨" → `vercel env ls` 또는 Sentry/Supabase API 로 실제 조회
- "Z 테스트 통과" → 실제 CI 최신 결과 또는 `pnpm test` 실행
- "Rule/Integration 생성됨" → API 조회로 상태 확인

드리프트 사례 3 (Sentry silent 3건), 사례 4 (homeCode 반쪽 작동), 사례 6 (observability silent) 모두 체크포인트가 "됐다" 고 적혀있어도 현실은 죽어있던 경우. HEAD 만 같다고 안심 금지.

### 커밋 정책 — 묻지 말고 실행 (R4, 기본 정책 override)

**기본 Claude Code 정책**: "NEVER commit unless explicitly asked". 이 프로젝트에선 사용자가 2026-04-23 명시적으로 override — 다음 규칙 적용:

- 논리 단위 완성 시 **묻지 않고 즉시 `git commit`**. "지금 커밋할까요?" 질문 금지.
- 커밋 후 hash + 한 줄 메시지만 보고 (예: `커밋 a1b2c3d: fix(sentry): alert-rule schema 제거`).
- 여러 파일이 누적됐어도 **하나의 논리 단위 = 하나의 커밋**.

**예외 (여전히 사용자 허가 필요)**:
- Secrets/credentials 포함 파일 → 자동 커밋 금지, 먼저 경고
- 대규모 변경 (100+ 파일) → 먼저 내용 요약 후 사용자 확인
- push / force-push / --no-verify / --amend / reset --hard 등 파괴적 작업
- 사용자가 "아직 커밋하지마" 라고 명시한 뒤 그 세션 내

불확실하면 자동 커밋하지 말고 사용자 확인. 상세 규정은 `memory/feedback_session_quality_rules.md` 참고.

### develop-cycle skill (R6 — 2026-04-30 재정의)

agent-loop 자율 cron (`self-develop.yml` + cloudflare worker dispatch) **폐기**. 사용자가 직접 `/develop-cycle [N]` skill 을 호출하는 manual trigger 방식으로 전환.

- 위치: `~/.claude/skills/develop-cycle/SKILL.md` (글로벌)
- 1 cycle = 진단 → 결정 (auto/issue/skip) → 실행 (4 prefix commit + push) → 짧은 회고
- N 인자 = 사이클 수 (기본 1)
- skip 도 1 cycle 카운트
- 컨텍스트 75% 도달 시 handoff save 자동 제안 (잔여 cycle carry-over)

**자율 작업 시 민감 파일 정책** (develop-cycle 안에서도 동일):
- ✅ 자율 가능: `apps/`, `packages/`, `cloudflare-worker/src/`, `supabase/migrations/` (신규만), `tests/`, `*.md`, lesson commit
- ⚠️ 사용자 확인 필요: `.github/workflows/*.yml`, `.github/actions/*`, repo settings, secrets, wrangler.toml — 수정 자체는 가능하나 사용자 승인 후

**관련 메모리**:
- 허브 `feedback_claude_code_action_workflows_write_block` (default 박제)
- 허브 `feedback_question_own_defaults` (자가 의심 적용 결과 보류 결정)
- 허브 `feedback_gh_actions_cron_unreliable` (silent drop risk 가중치 근거)

### 드리프트 사례 1 — 구현된 코드를 그린필드로 간주 (2026-04-15 오전)

메모리에 "Phase 2 완료, Phase 3 예정"만 있었는데, git log에 **Phase C (에이전트 토론 통합) + Phase D (Compound 루프) 이미 구현**되어 있었음. 5시간 "그린필드" 플래닝 후 마지막에 787줄 기존 코드 발견 → 플랜 전면 재조정 필요. 같은 사고 반복 금지.

### 드리프트 사례 2 — 반복된 패턴 (2026-04-15 v4-2 착수 시)

Phase v4-2 Task #5 "Vitest 설치"를 계획했는데 **이미** 설치되어 있었음 (루트 `vitest ^4.1.4`, `packages/kbo-data/vitest.config.ts`, 기존 테스트 2개). 또 한 번 "신규 작업"으로 가정하고 접근하다가 실제 작업 직전 발견.

교훈: **어떤 신규 파일·패키지·설정도 실제로 만들기 직전에 `ls`/`find`로 존재 여부 확인**. 체크포인트/플랜은 이를 보장하지 않음.

### 드리프트 사례 3 — 사전 버그 3건이 "작동 중 기능"처럼 보임 (2026-04-15 v4-2 프로덕션 검증)

Phase C/D는 main에 머지된 상태였지만 **실제로는 3개 사전 버그로 완전히 죽어 있던 상태**였음:
1. **CI pnpm 버전 충돌**: `pnpm/action-setup` `version: 9` vs `packageManager: pnpm@10.33.0` → 모든 daily-pipeline cron 실패
2. **`predictions.model_version VARCHAR(10)` overflow**: `'v2.0-debate'` (11자) 저장 시도 → ERROR 22001 → `daily.ts` upsert에 `.error` 체크가 없어서 silently 무시 → ANTHROPIC_API_KEY 있는 환경에서 새 prediction row 0건 생성
3. **Sonnet 모델 ID 오타**: `'claude-sonnet-4-6-20250514'` (`20250514`는 구 Sonnet 4.0 날짜) → 404 → Sonnet 심판 영구 실패 → blog reasoning이 fallback 한 줄 ("에이전트 토론 불가. 정량 모델 v1.5 결과 사용.")만 저장

세 버그 모두 git log의 debug 커밋 3건 (`25d9107 debug: 환경변수 확인용 임시 로그`, `f60ccd1 debug: 에이전트 토론 에러를 errors 배열에 노출`, `df282ba debug: 토론 결과 디버그 로그 추가`)이 추적하려다 원인을 못 찾고 멈춘 것들.

**교훈**: `git log`에 `feat:` 커밋이 있고 main에 머지됐다고 해서 **실제로 동작한다는 뜻이 아님**. "통합됐다"와 "돌아간다"는 다름. 프로덕션 검증 없는 feat 커밋은 잠재적으로 죽어 있는 코드일 수 있음. v4-2 작업이 이 3건 전부 드러내고 수정함.

### 드리프트 사례 4 — v4-2 머지 이후 retro.ts `homeCode` 하드코딩 숨은 버그 (2026-04-15 v4-3 eng-review)

v4-3 플래닝 중 `/plan-eng-review`가 발견. `retro.ts:121`이 `team_code: homeCode`만 insert하고 `awayCode`를 완전히 무시 → **Phase D Compound 루프가 실질적으로 50% 반쪽만 작동**한 상태. Phase C/D가 머지된 2026-04-14 이후 away 팀 agent_memory는 단 한 건도 생성된 적 없음.

이 버그는 debug 커밋 3건(사례 3)과 **다른 종류**: 사례 3은 "코드가 아예 안 돌았음", 이 버그는 "코드가 반만 돌고 있었음". git log `feat:` 커밋이 있어도 eng-review의 코드 독해가 있어야 발견 가능.

**교훈**: plan-eng-review의 "read through the code" 단계가 체크포인트·메모리·드리프트 스캔으로 안 잡히는 세 번째 종류의 버그(silent 반쪽 작동)를 잡을 수 있음. 머지 전 필수.

### 드리프트 사례 5 — KBO API 필드 불일치로 live-update 완전 사망 (2026-04-16 자연 발화 관찰)

`kbo-live.ts`가 `GAME_SC_HEADER_NM`, `G_ST`, `HOME_SCORE` 등 **실제 API에 존재하지 않는 필드**를 참조. `statusText`가 항상 빈 문자열 → 모든 경기 `status: 'scheduled'` → `liveGames: 0`. v4-3 구현 이후 live-update가 **단 한 번도 경기를 감지한 적 없었음**. 실제 필드는 `GAME_STATE_SC`("2"=진행), `B_SCORE_CN`(홈점수), `GAME_INN_NO`(이닝) 등.

**교훈**: 외부 API 연동 코드는 구현 시점에 **실제 API 응답과 대조** 필수. 테스트에서 mock만 사용하면 필드 불일치를 절대 못 잡음. curl로 실제 호출해보는 게 가장 확실.

### 드리프트 사례 6 — 관측 인프라 silent 실패 (2026-04-19)

Sentry P3 (worker→hub 자동 dispatch) 배선 중 가드 B (PII 스크러빙 검증) 테스트가 **5건 silent 버그 동시 폭로**: 서버 사이드 Sentry 완전 사망 / 대시보드 Sensitive Fields 깊이 매칭 안 됨 / 서버리스 flush 누락 / 이슈 그룹핑으로 새 이벤트 묻힘 / sourcemap 업로드 미배선. CI·빌드·클라이언트 기능 전부 통과했는데 서버 observability 만 조용히 죽어 있던 상태.

참조:
- `memory/content-harness-engineering-guard-test-pattern.md` (메타 패턴 — 의도적 검증 테스트가 N건 동시 폭로)
- `memory/content-context-engineering-nextjs-instrumentation-location.md` (Next.js 16 src/app 에서 instrumentation.ts 위치)
- `memory/content-infrastructure-sentry-pii-scrubbing-beforesend.md` (beforeSend 훅 vs 대시보드)
- `memory/content-infrastructure-sentry-serverless-flush.md` (Vercel 서버리스 captureException flush)

**교훈**: 마이그레이션 커밋이 CI 통과 + 클라이언트 기능 정상 + 빌드 무에러여도 서버 observability 가 silent 죽음 가능. **관측 인프라 배선은 항상 "설정 + 의도적 테스트 이벤트 수신 확인" 짝**. 설정만 해두고 넘어가면 silent 실패 감지 불가.

### 드리프트 사례 7 — 필드 매핑 수정이 숨어 있던 구조적 버그를 드러냄 (2026-04-17~19)

2026-04-16 커밋 2046796 이 `kbo-official` scraper 의 KBO API 필드 매핑 수정 (잘못된 필드 → 정상 필드). 기능적으로는 버그 fix 였으나 **두 개의 숨은 구조 버그를 동시에 노출**:
1. 파이프라인 타이밍: 15 KST predict cron 1회 실행이 주말 낮경기 14:00 (이미 live) 를 스킵 → predictions 미생성
2. UI fragility: 홈/analysis/feed 의 `predictions!inner` 가 predictions 없는 games 를 화면에서 완전 제외

4/17-19 사흘 연속 홈페이지 5경기 편성에도 2-3경기만 노출. 2046796 이전엔 `parseGameStatus` 가 없는 필드만 읽어 **항상 scheduled 리턴** → 우연히 낮경기도 predict 통과 → 버그가 은폐됨.

**교훈**: 기능적 버그 fix 가 구조적 버그의 커버를 제거할 수 있음. 단일 소스 fix 후 관측 가능한 메트릭 (홈페이지 경기 수, pipeline_runs gap) 확인 필수. 사용자 육안 감지 없었으면 운영 데이터 오염이 v2.0 튜닝까지 이어질 뻔함.

해결 (PLAN_v5, 2026-04-20 ship): 이중 방어선 — UI 리질리언스 (LEFT JOIN + PlaceholderCard) + 파이프라인 재설계 (매시간 cron + 경기별 3h 윈도우 + first-write-wins).

### 이미 구현된 주요 모듈 (2026-04-20 v0.5.22 기준)

- `packages/kbo-data/src/agents/` — 에이전트 토론 + 포스트뷰 시스템
  - `debate.ts`: pre-game 오케스트레이터 (홈/원정/회고 병렬 → 심판 순차, fallback 경로)
  - `postview.ts`: **post-game 오케스트레이터** (v4-3 신규) — 양팀 사후 분석 + 심판 factor-level attribution
  - `team-agent.ts`: Haiku. 페르소나 4파일 주입 (v4-2) + rivalry 블록 주입 경로 (v4-3)
  - `judge-agent.ts`: Sonnet, Steelman 원칙, 0.15~0.85 clamp
  - `calibration-agent.ts`: Haiku, ±5% 보정
  - `retro.ts`: Phase D Compound 루프 + **home/away 양쪽 row 생성** (v4-3 버그 수정) + memory_type 4종 분류 + valid_until 7일 + upsert
  - `rivalry-memory.ts`: **(v4-3 신규)** 과거 h2h 5경기 + agent_memories select → 프롬프트 블록. Compound 루프 읽기 경로 완성.
  - `llm.ts`: Claude API wrapper + Ollama dispatcher (v4-2.5). 3x exponential backoff
  - `llm-ollama.ts`: 로컬 Ollama 백엔드 (v4-2.5). exaone3.5 ↔ haiku, qwen2.5:14b ↔ sonnet
  - `llm-deepseek.ts`: DeepSeek 백엔드 (v4-4 테스트용). OpenAI 호환 API wrapper
  - `personas.ts`: BASE_PROMPT + HOME_ROLE + AWAY_ROLE + RESPONSE_FORMAT (v4-2)
  - `validator.ts`: Layer 1 검증 (v4-2) + **mode: strict | lenient** + **NODE_ENV=production strict 강제** (v4-3)
  - `types.ts`: 공통 타입
- `packages/kbo-data/src/pipeline/`:
  - `daily.ts`: predict/verify 모드 + **아침 run fallback postview cleanup** (v4-3)
  - `daily.ts`: **(v0.5.22 재편)** 4-mode 단일 엔트리 — announce/predict/predict_final/verify. finish() helper 모든 exit 로그. shouldPredictGame 윈도우 필터. INSERT + ON CONFLICT DO NOTHING (first-write-wins). Fancy Stats early return. handleDailySummaryNotification idempotent.
  - `schedule.ts`: **(v0.5.22 신규)** `shouldPredictGame()` 결정 함수 (window 0-3h + status + SP + existing set) + `estimateNotificationTime()` announce 알림 예상 시각 계산. 24 unit tests.
  - `live.ts`: live-update + **경기 종료 감지 시 postview 자동 트리거** (v4-3)
  - `postview-daily.ts`: **(v4-3)** 멱등성 postview runner.
- Migrations (prod 모두 적용):
  - `006_agent_memory_calibration.sql` — agent_memories + calibration_buckets
  - `007_v4_debate_metadata.sql` — debate_version + scoring_rule
  - `008_widen_model_version.sql` — VARCHAR(10) → VARCHAR(20)
  - `009_proposals_memories_constraints.sql` — **(v4-3)** agent_memories UNIQUE + proposals 테이블 + RLS
  - `010_factor_error_view.sql` — 팩터별 오차 분석 뷰
  - `011_validator_logs.sql` — validator 로그
  - `012_search_and_query_indexes.sql` — **(v0.5.20)** 검색 인덱스 + pg_trgm GIN
  - `013_predictions_metadata.sql` — **(v0.5.22)** `predictions.predicted_at` + `daily_notifications` 테이블 (하루 요약 idempotent)
  - `019_widen_pipeline_runs_mode.sql` — **(2026-04-27)** mode VARCHAR(10)→VARCHAR(20). 'predict_final' overflow silent fail 차단 (사례 3 재발).
  - `020_sp_confirmation_log.sql` — **(2026-04-27)** SP 확정 시각 측정 로그. Cloudflare Worker 가 매 trigger 마다 KBO 공식 + Naver 양쪽 source 적재.
  - `021_widen_sp_log_state_sc.sql` — **(2026-04-27)** state_sc VARCHAR(2)→VARCHAR(20). Naver statusCode ('BEFORE'/'LIVE'/'RESULT' 7자) overflow silent fail 차단.
- CI / Cron:
  - `.github/workflows/ci.yml` (PR/push@main type-check + test, 현재 382 tests — shared 26 + kbo-data 253 + moneyball 103, **v0.5.23 PLAN_v5 Phase 4 완료**)
  - `.github/workflows/live-update.yml` (cron `*/10 9-15 UTC` = 18:00~00:50 KST)
  - `.github/workflows/daily-pipeline.yml` **(v0.5.22 재편)**: 15회/일 — UTC 00 announce / UTC 01-12 predict 매시간 / UTC 13 predict_final / UTC 14 verify. concurrency 락 추가.
  - **(2026-04-27)** GH Actions schedule high-load skip 7일 측정 결과 daily-pipeline 41% skip / live-update 85% skip. 특히 UTC 00,01,02,05 = 0/7 fire (announce 항상 누락 + 4/26 LG@OB·KT@SK 영구 예측 누락의 환경 원인). Cloudflare Workers Cron 으로 이관 작업 진행 중 (`cloudflare-worker/`). 안정 검증 후 GH Actions schedule 영구 비활성화 예정.
  - `cloudflare-worker/` **(2026-04-27 신규)**: Cloudflare Workers 기반 cron + SP 측정. (1) Phase 1 — 기존 daily-pipeline schedule 그대로 옮김 + mode 명시 호출. (2) Phase 2 — 매 trigger 마다 KBO 공식 (`B_PIT_P_NM`) + Naver (`schedule/games?fields=all`) 양쪽 동시 호출 → `sp_confirmation_log` 에 `source='kbo-official'` / `source='naver'` 양쪽 row 적재. 두 소스 비교로 어느 쪽이 먼저 SP 채우는지 정량 측정 (가설: KBO 만 polling 으론 fallback 가치 검증 불가). 1~2주 누적 후 분석 SQL 5개 (README.md Phase 3 섹션) 실행 → cron 횟수 정밀 축소 + Naver fallback 도입 여부 결정. 무료 tier (Workers Free 100k req/day).
  - `.github/workflows/pat-expiry-check.yml` / `vercel-deploy-error-dispatch.yml` — worker-incident dispatch
  - `.github/workflows/submit-lesson.yml` — worker-lesson dispatch. **(2026-04-29 Phase 4a D4)** `lesson:` + `policy:` / `feedback:` / `memory:` 4 prefix 모두 허브 worker-lesson 채널로 dispatch. lesson 외 prefix 는 payload `subtype=self-policy` 표시. develop-cycle skill 의 commit 도 동일 dispatch.
  - **폐기 (2026-04-30)**: `.github/workflows/self-develop.yml` + cloudflare worker `dispatchSelfDevelop` 분기. agent-loop 자율 cron 라인 끊고 사용자 직접 호출 `/develop-cycle [N]` skill 로 전환 (위 R6 참조).
- UI:
  - `apps/moneyball/src/components/predictions/PlaceholderCard.tsx` — **(v0.5.22 신규)** 예측 없는 경기 플레이스홀더. status 분기 (우천취소/진행중/종료/SP 대기/예측 준비중).
  - `apps/moneyball/src/lib/predictions/estimateTime.ts` — **(v0.5.22)** gameTime → 예측 생성 예상 시각.
  - `apps/moneyball/src/app/debug/pipeline/page.tsx` — **(v0.5.22)** pipeline_runs 30일 관측 대시보드. BASIC auth.
- Scrapers:
  - `kbo-live.ts`: KBO 공식 AJAX API 라이브 스코어 수집 + 이닝별 승리확률 보정 (v4-3, 필드 매핑 수정 2026-04-16)
- 파이프라인: daily.ts → runDebate → DB 저장. postview는 live-update가 자동 트리거.

- **v0.5.18-21 추가** (2026-04-19, AdSense 심사 대비 + 사용자 리텐션 + 운영 안정):
  - `apps/moneyball/src/components/shared/Breadcrumb.tsx` — 시각 + `BreadcrumbList` JSON-LD 동시 출력. 7개 동적 라우트(analysis/matchup/players/teams/reviews/predictions)에 통합.
  - `apps/moneyball/src/app/not-found.tsx` — 디자인 시스템 컬러 + 빠른 링크 6종. `metadata.robots index: false`.
  - `apps/moneyball/src/components/layout/CookieConsent.tsx` — localStorage 1회 dismiss, PIPA-compliant 안내.
  - `apps/moneyball/src/app/about/page.tsx` — FAQ 7개 + `FAQPage` JSON-LD.
  - `apps/moneyball/src/components/shared/FavoriteTeamFilter.tsx` — 홈 페이지 칩 바, localStorage `mb_favorite_teams_v1`. 인라인 `<style>`로 `data-game-id` 카드 숨김.
  - `apps/moneyball/src/app/search/page.tsx` + `SearchForm.tsx` — `/search?q=` 통합 검색 (팀/선수/일자). 헤더 컴팩트 입력 + 모바일 아이콘.
  - `apps/moneyball/src/app/error.tsx` / `global-error.tsx` — 에러 바운더리 + Vercel logs + Sentry.captureException.
  - `apps/moneyball/{instrumentation,sentry.server.config,sentry.edge.config,instrumentation-client}.ts` + `next.config.ts withSentryConfig` — Sentry SDK v10 통합. `NEXT_PUBLIC_SENTRY_DSN` 활성. Onboarding 검증 완료.

**v4-4 착수 조건**: 충족됨 (`/analysis/game/[id]` UI · 빅매치 자동 선정 · A/B flag · `/debug/hallucination` 대시보드 모두 구현). 다음 큰 방향은 사용자 자연 발화 관찰 + AdSense 심사 (사용자 타이밍).

이 구조 위에 **리팩터·보강 관점**으로 접근해야 하며 "새로 만든다" 접근 금지.

## 프로젝트 구조
- 모노레포 (pnpm + turborepo)
- `apps/moneyball`: 승부예측 블로그 (Next.js 16 + App Router)
- PlayBook (`kyusikkim/playbook`): 별도 레포. 개인 지식 허브 + 관제탑 (Next.js 16, MDX, Gemini). 이 리포와 독립.
- `packages/shared`: 공유 타입, 유틸, 상수 (KBO_TEAMS, DEFAULT_WEIGHTS)
- `packages/kbo-data`: 스크래핑 + 파싱 모듈 (Phase 2에서 구현)
- `supabase/`: DB 마이그레이션, 시드 데이터

## 기술 스택
- Next.js 16 (App Router, Server Components, ISR)
- Supabase (PostgreSQL, RLS) — 프로젝트별 분리
- TypeScript (strict mode)
- Tailwind CSS 4
- Cheerio (스크래핑, Phase 2) — 3소스: KBO 공식 + KBO Fancy Stats + FanGraphs
- Vercel (호스팅) + GitHub Actions (Cron)

## 주요 규칙
- 모든 API 라우트는 CRON_SECRET 또는 API_KEY로 보호
- 스크래핑은 rate limiting 준수 (요청 간 2초 딜레이)
- DB 쿼리는 서버 컴포넌트 또는 API 라우트에서만
- 컴포넌트는 기본 Server Component, 인터랙션 필요 시에만 'use client'
- 날짜는 KST 기준, DB 저장은 UTC
- 모든 예측은 정량적 근거(세이버메트릭스 지표) 필수

## 파일 명명 규칙
- 컴포넌트: PascalCase.tsx
- 유틸/라이브러리: kebab-case.ts
- API 라우트: route.ts

## 커밋 메시지
- feat: 새 기능 / fix: 버그 수정 / data: 데이터 / content: 콘텐츠 / refactor: 리팩토링

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Skill routing

When the user's request matches an available skill, suggest it before acting.
Say "I think /skillname might help here, want me to run it?" and wait for confirmation.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → suggest office-hours
- Bugs, errors, "why is this broken", 500 errors → suggest investigate
- Ship, deploy, push, create PR → suggest ship
- QA, test the site, find bugs → suggest qa
- Code review, check my diff → suggest review
- Update docs after shipping → suggest document-release
- Weekly retro → suggest retro
- Design system, brand → suggest design-consultation
- Visual audit, design polish → suggest design-review
- Architecture review → suggest plan-eng-review
- Save progress, checkpoint, resume → suggest checkpoint
- Code quality, health check → suggest health

## 예측 엔진 가중치 (v1.5 — 10팩터, 3소스)
- 선발FIP 15% / 선발xFIP 5% / 타선wOBA 15% / 불펜FIP 10% / 최근폼 10% / WAR 8% / 상대전적 5% / 구장보정 4% / Elo레이팅 8% / 수비SFR 5%
- 홈팀 어드밴티지: +3%
- Elo baseline: KBO Fancy Stats Elo 예측과 비교하여 모델 성능 측정
- v2.0 업그레이드: 운영 2주차 (50경기 축적 후 오차분석 기반)

## 데이터 소스
- **KBO 공식** (koreabaseball.com): 경기일정, 선발확정, 결과, 최근폼, 상대전적, 구장별 기록
- **KBO Fancy Stats** (kbofancystats.com): FIP, xFIP, WAR, wOBA, SFR, Elo (robots.txt 없음)
- **FanGraphs** (fangraphs.com/leaders/international/kbo): wRC+, ISO, BB%/K% (보조/검증)
- ~~statiz.co.kr~~: robots.txt 전체 차단 → 사용 불가

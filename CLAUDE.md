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

### 이미 구현된 주요 모듈 (2026-04-19 v0.5.21 기준)

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
  - `live.ts`: live-update + **경기 종료 감지 시 postview 자동 트리거** (v4-3)
  - `postview-daily.ts`: **(v4-3 신규)** 멱등성 postview runner. live-update/daily morning 둘 다에서 호출 가능.
- Migrations:
  - `006_agent_memory_calibration.sql` — `agent_memories`, `calibration_buckets` 테이블
  - `007_v4_debate_metadata.sql` — `predictions.debate_version` + `scoring_rule`
  - `008_widen_model_version.sql` — `model_version VARCHAR(10) → VARCHAR(20)` (사전 버그 수정)
  - `009_proposals_memories_constraints.sql` — **(v4-3)** `agent_memories` TRUNCATE + `UNIQUE(team_code, memory_type, content)` + `idx_agent_memories_read` + `proposals` 테이블 + RLS
  - `010_factor_error_view.sql` — 팩터별 오차 분석 뷰
  - `011_validator_logs.sql` — validator 검증 로그 테이블
  - `012_search_and_query_indexes.sql` — **(v0.5.20)** `idx_games_date` / `idx_games_home_team` / `idx_games_away_team` / `idx_players_team` + `pg_trgm` GIN on `players(name_ko, name_en)` (검색 ILIKE 가속). prod 적용 완료.
- CI:
  - `.github/workflows/ci.yml` (PR/push@main type-check + test, 현재 185 tests)
  - `.github/workflows/live-update.yml` (**v4-3**: cron `*/10 9-15 UTC` = 18:00~00:50 KST, 2h 확장)
  - `.github/workflows/daily-pipeline.yml` (15 KST predict + 23 KST verify)
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

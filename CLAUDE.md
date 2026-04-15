# MoneyBall + PlayBook Ecosystem

## ⚠️ AI 에이전트 필수 지시사항 (READ FIRST)

이 리포에서 계획·설계·리뷰·구현 작업을 시작하기 전에 **반드시** 현재 상태를 기계적으로 확인하라. 메모리·체크포인트·대화 맥락은 stale 가능성 상존.

### 세션 시작 시 필수 스캔

```bash
cd ~/projects/moneyball-ecosystem
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

### 이미 구현된 주요 모듈 (2026-04-15 v4-2 이후 기준)

- `packages/kbo-data/src/agents/` — 에이전트 토론 시스템 (Phase C/D 통합 + Phase v4-2 리팩터)
  - `debate.ts`: 오케스트레이터 (홈/원정/회고 병렬 → 심판 순차, fallback 경로)
  - `team-agent.ts`: Haiku. `TEAM_PROFILES` 제거 → 페르소나 4파일 주입 (v4-2)
  - `judge-agent.ts`: Sonnet, Steelman 원칙, 0.15~0.85 clamp
  - `calibration-agent.ts`: Haiku, ±5% 보정
  - `retro.ts`: Phase D Compound 루프 (단 `agent_memories` 읽기 경로 **미연결** — v4-3에서 완성 예정)
  - `llm.ts`: Claude API wrapper. 3x exponential backoff (v4-1). Sonnet ID 오타 수정 (v4-2)
  - `personas.ts`: BASE_PROMPT + HOME_ROLE + AWAY_ROLE + RESPONSE_FORMAT (v4-2 신규)
  - `validator.ts`: Layer 1 — 환각·선수명·금칙어·claim-type 검증 (v4-2 신규)
  - `types.ts`: 공통 타입
- Migrations:
  - `006_agent_memory_calibration.sql` — `agent_memories`, `calibration_buckets` 테이블
  - `007_v4_debate_metadata.sql` — `predictions.debate_version` + `scoring_rule`
  - `008_widen_model_version.sql` — `model_version VARCHAR(10) → VARCHAR(20)` (사전 버그 수정)
- 파이프라인: daily.ts → runDebate → DB 저장 (v4-2 이후 정상 작동 확인)
- CI: `.github/workflows/ci.yml` (PR/push@main type-check + test)

**v4-3 착수 조건**: rivalry-memory.ts 신규 + team-agent buildUserMessage에 agent_memories 주입 경로 추가 + postview.ts + migration 009 (proposals 스키마)

이 구조 위에 **리팩터·보강 관점**으로 접근해야 하며 "새로 만든다" 접근 금지.

## 프로젝트 구조
- 모노레포 (pnpm + turborepo)
- `apps/moneyball`: KBO 승부예측 블로그 (Next.js 16 + App Router)
- `apps/playbook`: 방법론 허브 (Phase 3에서 구축)
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

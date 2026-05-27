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

드리프트 사례 3 (Sentry silent 3건), 사례 4 (homeCode 반쪽 작동), 사례 6 (observability silent), 사례 8 (KBO `/ws/Main.asmx` Referer 봇 차단), 사례 11 (predict_final window_too_late silent silent drop) 모두 체크포인트가 "됐다" 고 적혀있어도 현실은 죽어있던 경우. HEAD 만 같다고 안심 금지. cron silent error 시 endpoint 별 curl 진단 필수. predict_final 의 silent silent drop 류 = predictions=0 + games_found>0 mismatch 운영 alert 박제 완료 (cycle 819 PR #1179 `silent-drift-alert.ts` Sentry warning 채널).

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
- **3 차원**: site (사이트개선) / acquisition (사용자유입) / model (분석모듈·적중률). 1 cycle 1 차원
- **Agent Teams 활용** (실험 기능): `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` + `teammateMode: tmux` + `it2` CLI (iTerm2 native 패널 분할)
- 1 cycle = 진단 (풀 스캔) → 차원 선택 (자율) → 팀원 dispatch → 4 prefix commit + branch + PR (`develop-cycle/<slug>`) → 회고
- N 인자 = 사이클 수 (기본 1)
- 컨텍스트 60% 도달 시 handoff save 자동 제안 (잔여 cycle carry-over). **% 자가 측정 X — 메인 자가 추정 (`대화 turn` + `도구 호출 누적` + `system reminders 양`) + 사용자 % 알림 양쪽 사용. 사용자 알림 우선** (2026-05-01 박제, R3 보강)
- 자율 작업 권한 **전부 허용** (사용자 결정) — secrets/credentials 와 100+ 파일 변경만 명시적 경고
- **첫 시범 fire 완료 (2026-05-01)**: `/develop-cycle 1` → PR #31 (site 차원, `/analysis` 어제 경기 진입점, 145 tests, 영역 분리 위반 0). 메커니즘 작동 확인 (TeamCreate / Agent spawn / SendMessage / shutdown_request / TeamDelete). 박제 포인트 3건 (글로벌 SKILL.md "첫 시범 fire 결과" 섹션):
  - iTerm2 native 분할 시각화 X (`teammateMode: tmux` 백엔드만 작동, 사용자 화면 비가시)
  - PR `develop-cycle` label 사전 생성 + dispatch payload 명시 필요
  - shutdown race condition (idle ↔ shutdown_request 14초 차)

**관련 메모리**:
- 허브 `feedback_claude_code_action_workflows_write_block` (default 박제)
- 허브 `feedback_question_own_defaults` (자가 의심 적용 결과 보류 결정)
- 허브 `feedback_gh_actions_cron_unreliable` (silent drop risk 가중치 근거)

### 자동 머지 정책 — 묻지 말고 실행 (R7, R4 PR 차원 확장 — 2026-05-01)

R4 (자동 commit) 의 PR 차원 확장. 본 메인이 만든 PR + CI green → **묻지 않고 즉시 `gh pr merge <#> --squash --auto --delete-branch`** 활성화. develop-cycle 사이클 운영을 사용자 머지 confirm 없이 closed loop 자동화.

- `--auto` → CI green 자동 대기 후 머지 (push 직후 활성화 안전)
- `--squash` default → submit-lesson workflow 의 PR /commits API fallback (#34 머지 후) 로 lesson 차원 PR squash 도 silent skip 차단됨
- `--delete-branch` → 머지 후 head branch 자동 정리 (origin)

**자동 적용 대상**:
- 본 메인이 직접 작성한 PR (4 prefix `lesson:`/`policy:`/`feedback:`/`memory:` + `feat:`/`fix:`/`data:`/`content:`/`refactor:`/`docs:`/`build:`/`ci:`/`perf:`/`test:`/`style:` + Conventional Commit scope 포함)
- develop-cycle 워커가 만든 PR (`develop-cycle/<slug>` branch + `develop-cycle` label)

**예외 (사용자 확인 필요)**:
- 외부 작성자 PR (dependabot, renovate, 사용자 직접) → 자동 진행 X
- main force-push / 충돌 / CI red → 자동 진행 X
- 대규모 변경 (100+ 파일 / breaking change) → 사용자 확인
- PR description 또는 label 에 `do-not-auto-merge` / `draft` / `wip` 표시 → 자동 진행 X
- secrets/credentials 포함 PR → 자동 진행 X

**진행 흐름**:
1. PR 생성 직후 즉시 `gh pr merge <#> --squash --auto --delete-branch` 활성화
2. CI green 자동 대기 → 머지 → branch 자동 정리
3. 결과 보고 — PR # + 머지 commit hash + 다음 단계 한 줄

**역사적 갭 (#34 이전)**: `lesson:` 차원 PR 을 squash 머지하면 head_commit + commits 배열 모두 squash 결과 (PR title) 만 남아 submit-lesson workflow silent skip. 회피 위해 PR #32 가 `--merge` 강제. 본 fix #34 가 `gh api repos/.../pulls/NN/commits` fallback 추가 → squash 도 안전. R7 시점부턴 squash default.


### 드리프트 사례 박제 (사례 1~15) + 박제된 모듈 archive

본 문서 다이어트 (2026-05-27, cycle 986 시점). 분리 박제:
- 사례 1~15 → `memory/drift-cases.md` (351줄, 사례 9 family 26번째 재발 누적 박제)
- 박제된 모듈 archive (cycle 651~986) → `memory/implemented-modules.md` (351줄, 신규 작업 전 "그린필드 가정" 차단 mitigation)
- 원본 풀버전 = `CLAUDE.md.bak-2026-05-27` (rollback path)

**세션 시작 시 권장 로드 순서**:
1. CLAUDE.md (본 문서, 룰 + 메타)
2. AI-AGENT-GUIDE.md (원칙)
3. **memory/implemented-modules.md** (신규 라우트 / 컴포넌트 / 인프라 박제 직전 필수 read — 사례 1 그린필드 가정 차단)
4. memory/drift-cases.md (역사적 silent drift 패턴)
5. git log --oneline -20 (최근 상태)

**carry-over (다음 cycle 박제 필요)**:
- memory/ 디렉토리의 깨진 reference (`feedback_session_quality_rules.md`, `content-*.md` 4건) 재박제 또는 path 정정 — auto-memory (`~/.claude/projects/...`) vs repo memory/ path mismatch 결정 (사용자 영역)
- AI-AGENT-GUIDE.md 와 CLAUDE.md 정합 점검 = 113줄 + drift/silent/family 어구 0건 = 중복 X 확인됨 (cycle 986 박제)

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

## 예측 엔진 가중치 (v1.8 — 10팩터, 3소스)
- 선발FIP 15% / 선발xFIP 5% / 타선wOBA 15% / 불펜FIP 10% / 최근폼 10% / WAR 8% / 상대전적 **3%** / 구장보정 4% / Elo레이팅 **10%** / 수비SFR 5%
- 홈팀 어드밴티지: +1.5% (HOME_ADVANTAGE=0.015, 2026-04-21 N=2180 측정)
- Elo baseline: KBO Fancy Stats Elo 예측과 비교하여 모델 성능 측정
- **v1.8 변경 (cycle 335, 2026-05-12)**: head_to_head 5%→3% (W20/W21 noise, 37.5% 실측) + elo 8%→10% (정보가치 Δ=+0.30 최강)
- v2.0 업그레이드: **n=150 임계** 달성 후 전면 재조정 (real n=94, v1.8 credit-fail 15건 분리, 56건 부족 — cycle 495 측정). cycle 861 측정 = v1.8 n=32 (+2 in 9일, velocity ~0.22/day), n=150 도달 추정 06월 말~07월 초
- **Calibration 현황** (n=126 total / real n=94, cycle 861 갱신): 전체 약 47% / real (v1.8 제외) 48.9% (cycle 775 박제 stale 유지 — credit-fail/real 라벨 cycle 861 lite 미측정) / Brier v1.8 0.4335 winner-centric (cycle 861 측정 방식) — cycle 775 박제 Brier 0.2241 (squared diff) 와 산정 방식 다름, 직접 비교 X

## 데이터 소스
- **KBO 공식** (koreabaseball.com): 경기일정, 선발확정, 결과, 최근폼, 상대전적, 구장별 기록
- **KBO Fancy Stats** (kbofancystats.com): FIP, xFIP, WAR, wOBA, SFR, Elo (robots.txt 없음)
- **FanGraphs** (fangraphs.com/leaders/international/kbo): wRC+, ISO, BB%/K% (보조/검증)
- ~~statiz.co.kr~~: robots.txt 전체 차단 → 사용 불가

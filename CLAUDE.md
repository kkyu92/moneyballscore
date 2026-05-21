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

드리프트 사례 3 (Sentry silent 3건), 사례 4 (homeCode 반쪽 작동), 사례 6 (observability silent), 사례 8 (KBO `/ws/Main.asmx` Referer 봇 차단) 모두 체크포인트가 "됐다" 고 적혀있어도 현실은 죽어있던 경우. HEAD 만 같다고 안심 금지. cron silent error 시 endpoint 별 curl 진단 필수.

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

### 드리프트 사례 8 — KBO `/ws/Main.asmx` Referer 봇 차단 (2026-05-20, cycle 769)

5/20 0~04 UTC daily-pipeline cron 5건 모두 `status=error`. `fetchGames` + `fetchLiveGames` 가 호출하는 `/ws/Main.asmx/GetKboGameList` 가 정상 JSON 대신 KBO 메인 HTML (IE conditional comment) 리턴 → `JSON.parse` 실패 → `"KBO API parse error"` throw. 봇 차단 정책 변화로 추정.

curl 진단:
- Referer 없이 POST → HTML
- `Referer: https://www.koreabaseball.com/Schedule/Schedule.aspx` + POST → 정상 JSON
- `User-Agent` 단독 (MoneyBall) → HTML
- 다른 endpoint (`/Record/TeamRank/*.aspx`) 는 `KBO_USER_AGENT` 단독으로 정상 작동

→ Referer 헤더가 결정적 검증. 차단은 `/ws/Main.asmx` POST endpoint 한정.

최소 scope fix (PR #1101):
- `types.ts:KBO_SCHEDULE_REFERER` 상수 박제
- `kbo-official.ts:fetchGames` + `kbo-live.ts:fetchLiveGames` headers 에 Referer 추가
- `scrapers-kbo-official.test.ts` regression guard 1건

**교훈**: 외부 site 봇 차단 정책은 사전 통지 X — 어느 날 갑자기 endpoint 응답 형식 변경. cron silent error 시 endpoint 별 curl 진단 필수 (UA + Referer + Origin 조합). source-of-truth 단일 상수로 박제하여 향후 다른 endpoint 발생 시 한 줄 추가로 fix.

### 드리프트 사례 9 — Vercel CLI 가 .gitignore 무시 → main push 자동 production deploy silent skip (2026-05-20, cycle 772)

cycle 763~772 (10 PR) 모두 main push 후 production deploy 자동 트리거 X. PR vercel check = `Canceled by Ignored Build Step` (preview ignoreCommand 정상). 단 `vercel ls --prod` 마지막 Ready = cycle 762 retro (a2a73e6) 2h 전. cycle 763 이후 10 retro commit + 9 ship PR 모두 production 미반영 (사용자 가시 X — main push CI green 만 봐선 발견 불가능). cycle 772 IndexNow ping 첫 fire 진단 중 부수 발견.

진단:
- vercel CLI 가 root `.gitignore` 따르지 않음 → `vercel --prod` 강제 시 1.2GB 업로드 시도 → `File size limit exceeded (100 MB)`
- `node_modules` / `.next` / `.turbo` / `dist` 명시 제외 `.vercelignore` 박제로 해소
- 박제 후 `vercel --prod --yes` 정상 deploy (`dpl_35pqXz8sox5WXaYJKDCeUxkQEZYh`)

최소 scope fix (PR #1104):
- `.vercelignore` 박제 — vercel CLI silent `.gitignore` skip 차단
- 모든 cycle 763~772 ship 본 deploy 로 일괄 production 반영 확인

root cause 미확정 (24h carry-over): vercel.com dashboard production branch 설정 / webhook / git connection 점검 필요 (사용자 영역, dashboard 접근 본 메인 X). 임시 해소 = `.vercelignore` + 수동 `vercel --prod` 정착.

**교훈**: CI green + PR merge 만으론 production 반영 단정 X. 운영 인프라 (deploy/webhook) 도 silent drift family — vercel deploy 자동 트리거 ↔ git push 사이 단절 가능. 매 cycle N 시점 `vercel ls --prod` 또는 production URL 의 최신 ship 검증 1회 권장. R5 메타 패턴 silent drift family evidence (사례 3/4/6/7/8 운영 코드 silent — 사례 9 = 운영 인프라 silent 확장).

### 드리프트 사례 10 — twitter-image.tsx `runtime` re-export → Turbopack build fail → production 30 commit silent (2026-05-21, cycle 794 carry-over)

cycle 779 PR #1111 (root OG/Twitter image 박제) 의 `apps/moneyball/src/app/twitter-image.tsx`:

```tsx
export { default, runtime, size, contentType, alt } from "./opengraph-image";
```

Next.js 16 Turbopack 가 route segment config (`runtime`) re-export 를 statically 파싱 불가:

```
Next.js can't recognize the exported `runtime` field in route. It mustn't be reexported.
```

→ cycle 779 머지 (2026-05-20 ~07h) 이후 **30 commit production deploy fail**. main HEAD = 5ace15a (cycle 794) vs production aliased = 3d2e960 (cycle 778 spec). PR #1109/#1112~#1159 30건 production 미반영. 가장 critical = PR #1158 우천취소 silent drift family fix 가 production 미반영 (5/20 사례 사용자 가시 X 자체).

진단:
- `vercel ls --prod | head -8` → 직전 3 deploy 모두 `● Error` (Turbopack build fail)
- `vercel inspect <deploy> --logs | grep "Build error"` → re-export 라인 정확 노출
- 직전 cycle 772 `.vercelignore` 박제 (PR #1104) 는 vercel CLI 파일 크기 제한 회피 fix — **별개 문제**

최소 scope fix (PR #1160):
- `twitter-image.tsx` 의 `default` 만 re-export, `runtime` / `size` / `contentType` / `alt` 명시 박제 (statically parsable). opengraph-image.tsx pattern 그대로 매칭.
- local `pnpm build` 통과 → `/twitter-image` static prerender 정상
- PR #1160 머지 후 production 자동 deploy 0667fa6 Ready (4분), alias swap 완료 → 30 commit 일괄 catch-up

사례 9 carry-over 잘못된 가설 (vercel.com dashboard webhook 점검) 정정: vercel webhook 작동 정상 — 매 push 마다 build trigger fire, Turbopack build fail 로 alias swap 만 skip. silent drift 사례 9 임시 해소 (`.vercelignore`) 가 진짜 root cause 와 무관했음.

**교훈**: build fail 도 deploy silent drift 의 동급 위험. CI green + PR merge 만 아니라 `vercel ls --prod` Ready 상태 + alias swap 양쪽 검증 필수. `vercel inspect <deploy> --logs` build error 진단이 root cause 정확도 100%. 매 cycle N 시점 production alias commit 과 main HEAD 대조 1회 권장. R5 메타 패턴 silent drift family evidence — 사례 3/4/6/7/8 운영 코드 silent + 사례 9 운영 인프라 (deploy quota) silent + 사례 10 = **빌드 시스템 silent** 확장.

### 이미 구현된 주요 모듈 (v0.5.49+ 기준, cycle 651 phase)

**AdSense 심사 인프라 (cycle 651 phase, 2026-05-19, PR #934~940)**:
- `apps/moneyball/src/app/methodology/page.tsx` — 예측 방법론 hub (v1.8 모델 + 10팩터 + AI 토론 + Brier/Calibration + 진화 history, 468 line, Article JSON-LD, AdSense 콘텐츠 보강)
- `apps/moneyball/src/app/guide/page.tsx` — 사용 가이드 hub (예측 카드 해석 + 적중률 차트 + 픽 시작 + 페이지별 활용, 296 line, Article JSON-LD)
- `apps/moneyball/src/app/layout.tsx` — `verification.other['google-adsense-account']: 'ca-pub-9964930444224182'` 메타 태그 박제 + WebSite schema `potentialAction.SearchAction` 추가 (sitelinks search box)
- `apps/moneyball/src/app/robots.ts` — AdSense crawler 명시 (Mediapartners-Google + AdsBot-Google rules 배열)
- `apps/moneyball/src/app/ads.txt/route.ts` — `ADSENSE_PUBLISHER_ID=pub-9964930444224182` Vercel production env 주입 활성 → `google.com, pub-9964930444224182, DIRECT, f08c47fec0942fa0` 반환
- `apps/moneyball/src/app/about/page.tsx` — FAQ 7건 → 15건 (FAQPage JSON-LD 자동 갱신)
- `apps/moneyball/src/app/glossary/page.tsx` — 15 term → 25 term (ERA / WHIP / LOB% / OBP / SLG / OPS / BABIP / Pythagorean / Brier / Calibration) + 검증·평가 신규 카테고리 (DefinedTermSet JSON-LD 자동 갱신). cycle 653 PR #942 "26 term" off-by-one drift fix (cycle 677 PR #966 0324416 머지 완료)
- `apps/moneyball/src/app/privacy/page.tsx` — "도입 예정" → "도입 완료" 갱신
- `apps/moneyball/src/app/{contact,terms,privacy,leaderboard}/page.tsx` — canonical alternates 4 page 보완
- `apps/moneyball/src/app/{predictions,reviews,dashboard,analysis}/page.tsx` — meta description 100자 미만 → 150자 보강 (SEO)
- `apps/moneyball/src/components/layout/Footer.tsx` — 리뷰·서비스 컬럼에 "예측 방법론" + "사용 가이드" 진입점 추가
- `apps/moneyball/src/app/sitemap.ts` — `/methodology` / `/guide` priority 0.6 monthly 추가

**IndexNow 자동 ping 인프라 (cycle 772 phase, 2026-05-20, PR #1103~#1105)**:
- `apps/moneyball/src/app/api/seo/indexnow/ping/route.ts` — sitemap() 직접 호출 → URL 추출 → IndexNow API POST. CRON_SECRET Bearer auth + urlList 10,000 limit + host 필터 (`https://moneyballscore.vercel.app/*` 만). 5 unit test (auth 부재 401 / 잘못된 secret 401 / INDEXNOW_KEY 부재 503 / 정상 호출 IndexNow API POST + urlCount + keyLocation 검증 / IndexNow 422 → ok=false 정확 반환)
- `apps/moneyball/src/app/[indexnowKey].txt/route.ts` — root level key file (Bing IndexNow spec `https://<host>/<key>.txt` 권장 path 강제). path segment 가 `INDEXNOW_KEY` env 와 일치할 때만 200 + key body 반환, mismatch → 404 (brute-force 차단). Next.js 16 type generation 이 `[].txt` segment 인식 X → `params: Promise<Record<string,string>>` 시그니처. cycle 772 첫 fire 시 keyLocation 비표준 path (`/api/seo/indexnow/key.txt`) 422 InvalidRequestParameters 응답 → 본 root level dynamic route 로 fix (PR #1105)
- `.github/workflows/indexnow-ping.yml` — cron `'37 0 * * *'` (KST 09:37) + `workflow_dispatch`. `HTTP_STATUS != 200` 시 `::error::` 명시 (silent skip 차단). sitemap-warmup `'37 * * * *'` 분 정합.
- `.vercelignore` — vercel CLI 가 root `.gitignore` 무시 silent drift 차단 (드리프트 사례 9 임시 해소). `node_modules` / `.next` / `.turbo` / `dist` 명시 제외.
- `INDEXNOW_KEY` env — Vercel production + GH secret 양쪽 박제 완료 (사용자 영역). Google IndexNow 미지원 (2026-05 기준) → 별도 sitemap-warmup workflow 유지. Bing / Naver / Yandex / Seznam 동시 색인 신호 가치 + AdSense 심사 phase 보조.

**루트 OG/Twitter 이미지 박제 (cycle 779 phase, 2026-05-20, PR #1111)**:
- `apps/moneyball/src/app/opengraph-image.tsx` — Next.js 16 File Convention. 1200x630 ImageResponse, dark green gradient (brand color), 라틴 + 이모지 only (satori CJK 폰트 미번들 — 기존 `predictions/[date]/opengraph-image.tsx` 패턴 정합), 5 stat tags (wOBA / FIP / WAR / Elo / 10 Factors). 라우트별 명시 적용 없이 전역 OG image 자동 적용 (File Convention = layout.tsx openGraph.images 부재 자동 채움).
- `apps/moneyball/src/app/twitter-image.tsx` — opengraph-image.tsx re-export (DRY). Twitter card=summary_large_image 대응 image 박제.
- 직전 OG image coverage = `predictions/[date]` / `analysis/game/[id]` 2 동적 라우트 only → 루트 + 정적 hub 라우트는 plain text 폴백 (소셜 공유 시 rich preview 미노출). 본 phase 가 전역 default 박제로 silent drift 해소.

**PWA manifest + 아이콘 박제 (cycle 781 phase, 2026-05-20, PR #1113)**:
- `apps/moneyball/src/app/manifest.ts` — Next.js 16 File Convention `MetadataRoute.Manifest` 자동 생성 (`/manifest.webmanifest`). name="MoneyBall Score - 세이버메트릭스 KBO 승부예측" + short_name="MoneyBall" + description (wOBA/FIP/WAR + AI 토론 + 10팩터) + start_url="/" + scope="/" + display="standalone" + orientation="portrait" + background_color="#0a1f12" + theme_color="#2d6b3f" (DESIGN.md brand-500/900 token 정합) + lang="ko-KR" + categories=["sports","news","entertainment"]. 아이콘 3종 등록 — `/icon/192` (any 192x192) + `/icon/512` (any 512x512) + `/icon/512-maskable` (maskable 512x512 — Android safe area 18% 패딩).
- `apps/moneyball/src/app/icon.tsx` — Next.js 16 multi-size File Convention. `generateImageMetadata()` 로 3 variant 자동 생성 (192/512/512-maskable). ImageResponse 기반 PNG — 다크 그린 gradient (`#0a1f12 → #1a3d24 → #2d6b3f` 135deg DESIGN.md brand 정합) + 흰색 "MB" 텍스트 (fontWeight=900 / letterSpacing=-0.04em / system-ui). maskable 패딩 = `width * 0.18` (Android safe area spec).
- `apps/moneyball/src/app/apple-icon.tsx` — Next.js 16 File Convention. 180x180 ImageResponse (Apple touch icon spec) — icon.tsx 동일 gradient + "MB" 텍스트 (fontSize=82px hardcode 180 px 정합). iOS home screen install 대응.
- 직전 PWA coverage = 0 (manifest 부재 + 아이콘 부재). 본 phase 가 모바일 install prompt 활성 (Android `beforeinstallprompt` + iOS Safari "홈 화면에 추가") + Lighthouse PWA score 0→9+ 잠재 + theme-color 모바일 browser chrome 브랜드 컬러 노출.

**Dynamic OG 5 hub routes 박제 (cycle 783 phase, 2026-05-20, PR #1115)**:
- `apps/moneyball/src/app/methodology/opengraph-image.tsx` — Next.js 16 File Convention. 1200x630 ImageResponse, dark green gradient (`#0a1f12 → #1a3d24 → #2d6b3f` 135deg, root OG 패턴 정합 cycle 779). 라틴 + 이모지 only (satori CJK 폰트 미번들). title="Methodology" + subtitle="v1.8 Sabermetric Model" + 5 tag chip (FIP / wOBA / WAR / Elo / 10 Factors) + footer "10 Factors · AI Debate".
- `apps/moneyball/src/app/guide/opengraph-image.tsx` — 동일 패턴. title="Guide" + subtitle="Beginner's Sabermetrics" + 5 tag chip + footer "5 Sections · Practical Tips".
- `apps/moneyball/src/app/accuracy/opengraph-image.tsx` — 동일 패턴. title="Accuracy" + subtitle="Live Calibration Dashboard" + 5 tag chip + footer (현재 적중률 metric + Brier 노출 — static deterministic 캐시 위해 DB fetch X, 박제 시점 값 hardcode).
- `apps/moneyball/src/app/glossary/opengraph-image.tsx` — 동일 패턴. title="Glossary" + subtitle="Sabermetric Terms" + 5 tag chip + footer "25 Terms · 6 Categories".
- `apps/moneyball/src/app/leaderboard/opengraph-image.tsx` — 동일 패턴. title="Leaderboard" + subtitle="Community Pick Rankings" + 5 tag chip + footer "Weekly · Season · Streak".
- 각 hub 정체성 + 5 tag chip 차별화 — 직접 link 공유 시 hub specific rich preview. 직전 OG image coverage = 루트 (cycle 779) + `predictions/[date]` + `analysis/game/[id]` = 3/38 (8%) → 8/38 (21%) — 5 hub 정적 라우트 plain text 폴백 silent drift 해소. 잔여 D/E/F/G (Person/SportsTeam schema + Web Vitals 등) cycle 778 spec 후보 carry-over.

**Person/SportsTeam schema enrichment 박제 (cycle 785 phase, 2026-05-20, PR #1117)**:
- `apps/moneyball/src/app/players/[id]/page.tsx` — Person JSON-LD 확장. `@id` + `url` (안정적 URL identifier `${SITE_URL}/players/${playerId}`) + `jobTitle` (position 또는 throws 기반 — `"좌완 선발 투수"` / `"우완 선발 투수"` / fallback `"선발 투수"`) + `description` (한글 자연어 — 팀명 + 평균 FIP + 등판 + 적중률, replace `/\s+/g` 단일 공백 정규화) + `nationality` string `"KR"` → Country object (`@type: "Country"` + `name: "South Korea"` + `identifier: "KR"`) + `knowsLanguage: ["ko-KR"]` + `memberOf.@id` + `memberOf.url` (팀 페이지 안정 link). mainEntityOfPage 동일 변수 (playerUrl) 재사용.
- `apps/moneyball/src/app/teams/[code]/page.tsx` — SportsTeam JSON-LD 확장. `@id` + `url` (`${SITE_URL}/teams/${code}`) + `logo` (`${SITE_URL}/logos/${code}.png` 절대 URL) + `description` (한글 자연어 — 팀명 + 평균 선발 FIP + 적중률 + 홈구장 + 파크팩터, replace 정규화) + `memberOf` SportsOrganization 확장 (`@id: "https://www.koreabaseball.com"` + `url` + `name: "KBO 리그"` + `alternateName: "Korea Baseball Organization"`). mainEntityOfPage 동일 변수 (teamUrl) 재사용.
- 기존 schema 작동 변경 X — 필드 추가만. Google Search rich snippet eligibility ↑ (Person athlete + SportsTeam organization markup 강화). 직전 schema coverage = WebSite (root) + SoftwareApplication (분석 라우트) + Article / DefinedTermSet / FAQPage (hub 5종) + ItemList (cycle 764) + Dataset (leaderboard) + Person / SportsTeam minimal (players/teams) → Person + SportsTeam 양쪽 enrichment 박제. 잔여 E/F/G (Web Vitals tracking 2 파일 + 추가 spec 후보) cycle 778 spec carry-over.

**Web Vitals tracking 박제 (cycle 789 phase, 2026-05-20, PR #1119)**:
- `apps/moneyball/src/components/shared/WebVitalsReporter.tsx` (신규 56 line) — Next.js 16 `useReportWebVitals` (`next/web-vitals`) hook + Sentry breadcrumb + GA4 custom event 동시 전송. CLS × 1000 정수화 (`metric.name === 'CLS' ? metric.value * 1000 : metric.value` → `Math.round`) + rating='poor' → `Sentry.addBreadcrumb({ level: 'warning' })`, else `level: 'info'` (category='web-vitals' + data={id,name,value,rating,delta,navigationType}). `window.gtag` 존재 시 `gtag('event', metric.name, {value, event_label: id, event_category: 'web-vitals', metric_rating, non_interaction: true})` 전송 — GA4 distribution 분석 채널. try/catch 로 Sentry DSN 부재 (DNT opt-out 또는 init X) 시 silent skip — 클라이언트 fatal 차단.
- `apps/moneyball/src/app/layout.tsx` — `<WebVitalsReporter />` body 안 wire (SpeedInsights / GoogleAnalytics 뒤). 'use client' boundary 자체 처리 (component 자체 client) — layout server component 영향 0.
- 직전 Web Vitals coverage = `@vercel/speed-insights` `<SpeedInsights />` 자동 수집 only (LCP / FID / CLS / FCP / TTFB Vercel Analytics 대시보드 표시). 본 phase 가 Sentry breadcrumb (디버그 컨텍스트 — production 에러 발생 시 직전 web-vitals 5개 metric trail 자동 포함) + GA4 custom event (distribution 분석 — 사용자 segment / 디바이스 / 라우트별 LCP histogram) 2채널 동시 박제 → 3채널 관측 (Vercel SpeedInsights + Sentry breadcrumb + GA4 event). cycle 778 v12 spec series 5번째 ship (A 루트 OG / B PWA / C dynamic OG / D Person+SportsTeam schema / G Web Vitals). 잔여 E / F cycle 778 spec carry-over (추가 spec 후보 — 다음 explore-idea cycle redirect 대상).

**Viewport themeColor + colorScheme 박제 (cycle 791 phase, 2026-05-20, PR #1121)**:
- `apps/moneyball/src/app/layout.tsx` — Next.js 16 `Viewport` export 신설. `themeColor` array 2-entry (`media: "(prefers-color-scheme: light)" → "#2d6b3f"` (DESIGN.md brand-500) + `media: "(prefers-color-scheme: dark)" → "#0a1f12"` (DESIGN.md brand-900)) + `colorScheme: "light dark"` (브라우저 form controls / scrollbar 자동 다크모드 정합). PWA manifest.ts theme_color (cycle 781 `#2d6b3f` 박제) 와 정합 — PWA 설치 환경 + 비PWA 모바일 브라우저 양쪽 동일 브랜드 컬러 노출.
- 직전 themeColor coverage = PWA manifest theme_color only (Android 설치 PWA 의 status bar 만 적용). 본 phase 가 iOS Safari / Android Chrome 모바일 browser chrome (상단 status bar + bottom nav bar) 의 dynamic theme-color 활성 + prefers-color-scheme media query 자동 분기 (light/dark mode 사용자 환경 별 자동 전환). v12 series 6번째 ship (A 루트 OG / B PWA / C dynamic OG / D Person+SportsTeam schema / G Web Vitals / E viewport). 잔여 F (sitemap priority audit) cycle 796 PR #1161 ship 완료.

**Segment-level not-found.tsx 7 dynamic 라우트 박제 (cycle 799 phase, 2026-05-21, PR #1163 + cycle 800 sweep 22 PR upcoming)**:
- `apps/moneyball/src/app/predictions/[date]/not-found.tsx` — Next.js 16 File Convention. 잘못된 날짜 형식 또는 시즌 외 일자 진입 시 fallback. 404 헤더 (text-7xl brand-500/40) + 최근 7 일자 nav (내일/오늘/어제 + 4 자연 date) + URL 형식 섹션 (`/predictions/{today}` + `YYYY-MM-DD` KST) + hub link (예측 hub / 오늘의 예측) + `robots: index: false, follow: false`. `notFound()` 또는 mismatch 라우트 매칭 시 자동 트리거.
- `apps/moneyball/src/app/analysis/game/[id]/not-found.tsx` — 동일 패턴. 경기 ID 미존재 시 fallback. 최근 7일 경기 예측 nav (오늘/어제 + 5 자연 date) + URL 형식 (`/analysis/game/{gameId}` + 일자별 예측) + hub link (AI 분석 hub / 오늘의 예측).
- `apps/moneyball/src/app/teams/[code]/not-found.tsx` — KBO 10팀 외 team code 진입 시 fallback. KBO 10팀 nav (KBO_TEAM_SHORT_NAME 매핑, grid 2/5 col) + URL 형식 (`/teams/SS` + `사용 가능 코드 — {TEAM_CODES.join(", ")}`) + hub link (팀 목록 hub / 오늘의 예측).
- `apps/moneyball/src/app/players/[id]/not-found.tsx` — KBO 공식 player ID 미존재 시 fallback. 팀별 선수단 nav (KBO_TEAM_SHORT_NAME 매핑) + URL 형식 (`/players/{playerId}` + `선수 ID — KBO 공식 코드, 팀별 선수단에서 진입 권장`) + hub link (선수 리더보드 / 오늘의 예측). **cycle 800 sweep 22 박제**: 6/7 일관성 silent drift fix — URL 형식 섹션 부재였던 단일 파일 (cycle 799 신규 박제 7 파일 중) Layer 1 검증 시 발견 → 다른 6 파일 패턴 정합 박제.
- `apps/moneyball/src/app/reviews/weekly/[week]/not-found.tsx` — `YYYY-Www` ISO 8601 잘못된 주차 또는 시즌 외 주차 fallback. 최근 8주차 nav (이번 주/지난 주 + 6 weekId, grid 2/4 col) + URL 형식 (`/reviews/weekly/{recentWeeks[0]}` + `YYYY-Www` ISO 8601 월요일 시작) + hub link (리뷰 hub / 오늘의 예측).
- `apps/moneyball/src/app/reviews/monthly/[month]/not-found.tsx` — `YYYY-MM` 잘못된 월 또는 시즌 외 월 fallback. 최근 6개월 nav (이번 달/지난 달 + 4 monthId, grid 2/3 col) + URL 형식 (`/reviews/monthly/{recentMonths[0]}` + `YYYY-MM`) + hub link (리뷰 hub / 오늘의 예측).
- `apps/moneyball/src/app/seasons/[year]/not-found.tsx` — `YYYY` 4자리 잘못된 연도 또는 데이터 없는 시즌 fallback. 사용 가능 시즌 nav (CURRENT_YEAR + 2025/2024/2023, "진행 중" badge) + URL 형식 (`/seasons/{CURRENT_YEAR}` + `YYYY` 4자리) + hub link (시즌 hub / 오늘의 예측).
- 직전 not-found.tsx coverage = 루트 1 (`apps/moneyball/src/app/not-found.tsx` cycle 638) only — 7 dynamic 라우트 segment 진입 시 루트 fallback 미동 (라우트 segment 안 not-found.tsx 우선 매칭 Next.js 16 spec). 본 phase 가 8/37 (22%) 까지 segment-level fallback coverage 박제 — 잘못된 URL 입력 시 도메인 navigation + URL 형식 가이드 + hub link 동시 노출. AdSense 심사 phase 보조 (사이트 품질 신호) + SEO (404 페이지 quality factor) + UX (잘못된 URL 진입 시 도움말 path).

**/changelog 페이지 박제 (cycle 803 phase, 2026-05-21, PR #1165)**:
- `apps/moneyball/src/app/changelog/page.tsx` (175 line) — CHANGELOG.md 1805 line source 파싱 + 사이클 단위 release notes timeline + simple markdown render (외부 lib 0 — react-markdown / marked / micromark 미사용). Breadcrumb / canonical alternates / OG / Twitter metadata / JSON-LD Article schema (datePublished 2026-04-13 + dateModified entries.latest) + 3-stat header (총 변경 항목 / 사이클 기록 / 최근 갱신) + nav chip 3종 (methodology / accuracy / glossary) + footer GitHub CHANGELOG.md 출처 link. 각 entry `id` + `scroll-mt-20` (deep link 앵커 진입).
- `apps/moneyball/src/lib/changelog/parse.ts` — CHANGELOG.md 파일 read + `## ` heading 기반 entry split + 메타 추출 (date `YYYY-MM-DD` + cycle `cycle N` 정규식) + slug id 생성 (date + cycle + title 조합).
- `apps/moneyball/src/lib/changelog/renderMarkdown.ts` — simple markdown render 외부 lib 0. 지원 — heading (### / ####) + ordered/unordered list + code block (fenced ```) + inline code (`) + bold (**) + italic (*) + table (markdown table syntax) + paragraph break.
- `apps/moneyball/src/app/sitemap.ts` — `/changelog` URL priority 0.6 weekly 추가 (cycle 796 v12-F audit 패턴 정합).
- `apps/moneyball/src/components/layout/Footer.tsx` — 도움말 group "변경 로그" link 추가 (line 46).
- 직전 release notes coverage = repo GitHub CHANGELOG.md only (외부 link). 본 phase 가 in-site /changelog 페이지 박제 — 사용자 가시 + 검색 색인 + AdSense 콘텐츠 보강 (Article JSON-LD 노출). v13 series 두 번째 ship (v13-A segment-level not-found PR #1163 cycle 799 + v13-B /changelog PR #1165). 잔여 v13-C~v13-F carry-over (/changelog opengraph-image.tsx / RSS alternates / 등).

**/changelog opengraph-image.tsx 박제 (cycle 805 phase, 2026-05-21, PR #1167)**:
- `apps/moneyball/src/app/changelog/opengraph-image.tsx` (103 line) — Next.js 16 File Convention. 1200x630 ImageResponse, dark green gradient (`#0a1f12 → #1a3d24 → #2d6b3f` 135deg, root OG 패턴 정합 cycle 779 + hub OG 5종 정합 cycle 783 v12-C). 라틴 + 이모지 only (satori CJK 폰트 미번들). title="Changelog" + subtitle="Model + Feature History" + 5 tag chip (Model / Feature / Accuracy / SEO / AdSense) + footer `moneyballscore.vercel.app/changelog · Auto-Compounded · Cycle by Cycle`.
- 직전 OG image coverage = 루트 (cycle 779) + `predictions/[date]` + `analysis/game/[id]` + hub 5종 (methodology/guide/accuracy/glossary/leaderboard cycle 783 v12-C) = 8/38 (21%) → **9/38 (24%)**. cycle 803 신규 박제 `/changelog` 페이지의 plain text 폴백 silent drift 해소 — 사용자가 `/changelog` link 직접 공유 시 rich preview 노출 (Twitter/Slack/카톡). v13 series 세 번째 ship (v13-A segment-level not-found PR #1163 cycle 799 + v13-B /changelog 페이지 PR #1165 cycle 803 + v13-C /changelog OG image PR #1167 cycle 805). 잔여 v13-D~v13-F carry-over (unit test / RSS alternates / 등).

**/changelog parse + renderMarkdown unit test 박제 (cycle 808 phase, 2026-05-21, PR #1169)**:
- `apps/moneyball/src/lib/changelog/parse.ts` — `parseChangelogText(raw: string)` pure fn 분리 (I/O vs parsing 책임 분리). `parseChangelog()` wrapper 가 fs.readFile + parseChangelogText 호출 — 기존 behavior 동일 유지. test 가 raw string 직접 진입 가능 (fs mock 불요).
- `apps/moneyball/src/lib/changelog/renderMarkdown.tsx` — `tokenize(md: string): Block[]` fn + `Block` interface export. `renderMarkdown()` wrapper 가 tokenize + render — 기존 render 출력 변경 X. test 가 tokenize block 분류 + 각 Block 렌더 단위 검증.
- `apps/moneyball/src/lib/changelog/__tests__/parse.test.ts` (113 line, 17 test) — h2 boundary split / `YYYY-MM-DD` date 추출 / `cycle N` 숫자 추출 / slug id (date + cycle + title) / body content trim / 빈 입력 safe / multiple entries 순서 유지.
- `apps/moneyball/src/lib/changelog/__tests__/renderMarkdown.test.tsx` (147 line, 21 test) — tokenize block 분류 (h3/h4/hr/ul/ol/code-fence/p) + inline 마크업 (bold/italic/code/link) + 각 Block 렌더 (key prop / className / 자식 구조).
- 직전 unit test coverage = `parse.ts` + `renderMarkdown.tsx` (cycle 803 신규 라이브러리 2 파일) **0 test** → 38 신규 test 박제. CHANGELOG.md format 변경 또는 정규식 튜닝 시 silent break risk 차단 (regression guard). `pnpm vitest run` apps/moneyball 전체 469 test PASS (regression 0). v13 series 네 번째 ship (v13-A segment-level not-found PR #1163 cycle 799 + v13-B /changelog 페이지 PR #1165 cycle 803 + v13-C /changelog OG image PR #1167 cycle 805 + **v13-D unit test PR #1169 cycle 808**). 잔여 v13-E~v13-G carry-over (RSS alternates / 추가 후보 / 등).

**/changelog entries RSS feed 박제 (cycle 810 phase, 2026-05-21, PR #1171)**:
- `apps/moneyball/src/app/feed/route.ts` — `parseChangelog()` 호출 + `date !== null` filter + `slice(0, 10)` 최근 10건 추출 → RSS `<item>` array 박제. 각 entry — title `Cycle N — <title-no-date>` (cyclePrefix `${entry.cycle}` 박제, title 의 leading `YYYY-MM-DD` prefix 정규식 제거) + link `${SITE_URL}/changelog#${entry.id}` (entry.id = slug, /changelog 페이지 anchor 진입 매칭 cycle 803 박제) + guid (link 동일, isPermaLink="true") + description (body markdown 제거 `[#*` `>_~\[\]]` 후 공백 collapse + 240자 slice) + pubDate (entry.date `T23:59:00+09:00` KST). 위치 = review items (주간 3 + 월간 2 + misses 1) 와 game items (predictions inner join 50건) 사이.
- 직전 RSS feed coverage = review items 6건 + game items ≤50건 only — sitemap.ts `/changelog` URL 색인 신호 (cycle 803 priority 0.6 weekly) 와 /changelog OG image (cycle 805 v13-C) 박제 후 RSS reader 채널 부재 silent drift. 본 phase 가 RSS 구독자 (Feedly / Inoreader / NetNewsWire 등) 에 사이클별 변경 이력 (가중치 튜닝 / 신규 기능 / SEO / AdSense / 적중률 분석) 즉시 전달 — 검색 색인 (sitemap) + 소셜 공유 (OG) + 구독 (RSS) 3채널 fully wired. v13 series 다섯 번째 ship (v13-A segment-level not-found PR #1163 cycle 799 + v13-B /changelog 페이지 PR #1165 cycle 803 + v13-C /changelog OG image PR #1167 cycle 805 + v13-D unit test PR #1169 cycle 808 + **v13-E RSS entries PR #1171 cycle 810**). 잔여 v13-F~v13-G carry-over (RSS alternates layout.tsx / 추가 후보 / 등).

**Sitemap priority audit + tune 박제 (cycle 796 phase, 2026-05-21, PR #1161)**:
- `apps/moneyball/src/app/sitemap.ts` — priority 분포 audit + 8 route tune. /accuracy 0.8→0.85 (AI 적중률 대시보드 = AdSense 핵심 콘텐츠) / /methodology 0.6→0.7 (Article schema cycle 651) / /guide 0.6→0.7 (Article schema cycle 651) / /glossary 0.5→0.6 (DefinedTermSet 25 term) / /about 0.5→0.6 (FAQPage 15 entries) / /analysis/game/{id} 0.7→0.75 (individual 경기 분석 = predictions/{date} 동급) / /reviews/misses 0.75→0.7 (다른 reviews subfolder 정합) / /seasons/{currentYear-1} 0.65→0.7 (recent 직전 시즌 vs ancient 분리).
- 직전 sitemap priority coverage = 분포 audit 부재 (cycle 651 AdSense phase 박제 + cycle 654/697 incremental 추가 후 정합성 점검 0). 본 phase 가 콘텐츠 가치 vs priority 신호 정합 — Google Search Console "Pages" 색인 분포에 자연 반영 + AdSense 핵심 콘텐츠 (/accuracy / /methodology / /guide) priority 상향 + secondary hub (/glossary / /about / /reviews/misses) 정합 조정. **v12 series 종결**: A 루트 OG (#1111) / B PWA manifest (#1113) / C dynamic OG 5 hub (#1115) / D Person+SportsTeam schema (#1117) / G Web Vitals (#1119) / E viewport theme-color (#1121) / **F sitemap audit (#1161)** = 7/7 ship 완료. cycle 778 spec 전부 closure. 다음 cycle 800 phase Google Search Console "Pages" 색인 분포 재측정 권장.

**v0.5.40~41 신규 (2026-05-12)**:
- `apps/moneyball/src/app/accuracy/page.tsx` — 공개 AI 적중률 대시보드 (캘리브레이션 SVG / 주별 트렌드 / 팀별 성과, cycle 287)
- 누적 검증 124건 (n=119→124, cycle 775 측정 시점 +5건 모두 v1.8). v2.0 임계 n=150 까지 26건.
- **v1.8 적용 완료 (cycle 335)**: head_to_head 3% + elo 10%. 일요일 Sunday cap — 임계 0.55 초과 시 0.45 강등 (cycle 358 변경). 전면 v2.0 → n=150 도달 후
- **scoring_rule이 실질 가중치 버전 구분자** (cycle 341 확인): model_version='v2.0-debate'(에이전트 고정) vs scoring_rule(v1.5/v1.6/v1.7-revert/v1.8). v1.8 scoring_rule 첫 예측 = 2026-05-13부터
- **scoring_rule 성과 (cycle 775 갱신)**: v1.5(16건,75.0%) / v1.6(46건,37.0%) / v1.7-revert(32건,53.1%) / **v1.8(30건,43.3%, Brier 0.2241)** — credit-fail 22건(40.9%) + **real-debate 8건(50.0%) gap +9.1pp**. cycle 632 17/8 → cycle 775 22/8 라벨 (credit-fail +5 / real-debate +0 — credit timing 가설 강화 + gap 흡수: +20.6pp → +9.1pp credit-fail accuracy 29.4%→40.9% 자연 회복). cycle 775 v1.8 date distribution — 05-13 5/5 real(시즌 첫날) / 05-14 0/5 credit-fail / 05-15 0/5 credit-fail / 05-16 2/5 / 05-17 1/5 / 05-19 0/5 credit-fail
- **요일별 누적 (cycle 542 갱신)**: Tue 45.0%(20) / Wed 53.8%(13) / Thu 45.8%(24) / **Fri 57.1%(21) — 최강** / Sat 54.5%(22) / **Sun 21.1%(19) — Sunday cap 효과 +6.8pp (14.3→21.1)**. cycle 500→542 추가 10건 모두 v1.8 주말 (Sat +5 / Sun +5)

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
  - `014_pipeline_runs_skipped_detail.sql` — **(PLAN_v5 후속)** `pipeline_runs.skipped_detail` JSONB — shouldPredictGame reason enum 보존. skip 사유 사후 판독 가능 (사례: 4/18 LT-HH 17:00).
  - `015_games_weather.sql` — **(2026-04-22)** `games.weather` JSONB — 경기별 날씨 스냅샷. Open-Meteo Historical API 백필 + live-update forward 저장. v2.0 날씨 팩터 연구 source.
  - `016_pitcher_stats_snapshots.sql` — **(2026-04-22)** `pitcher_stats` snapshot — 주간 cron (일요일 자정 KST) Fancy Stats + KBO 공식 upsert + `captured_at`. "경기 시점의 SP FIP" 시점별 팩터 가능. factor-correlation 분석 + v2.0 튜닝 구조적 제약 해소.
  - `017_game_records.sql` — **(2026-04-22)** 경기별 boxscore 테이블 — Naver `/schedule/games/{gameId}/record` 응답 저장 (타자 폼/투수 이닝·투구수/scoreBoard 이닝별 점수). JSONB raw 전체 보존.
  - `018_daily_notifications_flags.sql` — **(2026-04-23)** `daily_notifications` announce_sent + results_sent BOOLEAN — GitHub Actions schedule cron 간헐 2회 fire (UTC 14 → 14:03+14:49) 중복 발송 차단. notifyAnnounce + notifyResults idempotent 장치.
  - `019_widen_pipeline_runs_mode.sql` — **(2026-04-27)** mode VARCHAR(10)→VARCHAR(20). 'predict_final' overflow silent fail 차단 (사례 3 재발).
  - `020_sp_confirmation_log.sql` — **(2026-04-27)** SP 확정 시각 측정 로그. Cloudflare Worker 가 매 trigger 마다 KBO 공식 + Naver 양쪽 source 적재.
  - `021_widen_sp_log_state_sc.sql` — **(2026-04-27)** state_sc VARCHAR(2)→VARCHAR(20). Naver statusCode ('BEFORE'/'LIVE'/'RESULT' 7자) overflow silent fail 차단.
  - `022_validator_logs_agent_passed.sql` — **(cycle 30)** validator_logs 스키마 확장 — `agent` 컬럼 ('team'/'judge' 분리, judge=JudgeVerdict.reasoning 검증 cycle 27 P1+P2) + `passed` 컬럼 (near-miss WARN_LIMIT 이하 통과 박제, 시즌 누적 silent drift 사전 감지). 인덱스 2개 (agent+severity, passed+created_at DESC).
  - `023_develop_cycle_logs.sql` — **(cycle 42)** `develop_cycle_logs` 테이블 — develop-cycle skill 매 사이클 운영 로그 + /debug/develop-cycle 대시보드 source. 진단 단계 첫 step in_progress INSERT, 회고 단계 끝 success/fail/partial UPSERT. cycle_state JSON (로컬 carry-over) 과 책임 분리 — 본 테이블은 운영 시각화 + 추세 분석.
  - `024_user_picks_leaderboard.sql` — **(cycle 312)** `user_picks` 테이블 + 리더보드 뷰 — 픽 게이미피케이션. 닉네임 기반 no-login (`device_id`+`game_id` UNIQUE). RLS public read + anon insert (x-device-id header 검증). leaderboard_weekly / leaderboard_season 뷰 (correct/total/accuracy_pct).
  - `025_pick_poll_events.sql` — **(cycle 327)** `pick_poll_events` 테이블 — 익명 픽 집계 (닉네임 불필요). 모든 사용자 픽을 community poll 에 박제. service role upsert + anon 직접 insert 불허 (API route 통해서만). community 진입 path.
  - `026_leaderboard_views_status_fix.sql` — **(cycle 374)** 리더보드 뷰 status 버그 fix — 기존 'completed' 필터 → 'final' 정정 (games.status 는 'final' / live.ts:282 / daily.ts:534, cycle 741 silent drift sync). cycle 312 이후 리더보드 silent 사망 상태 (항상 0건 리턴) 차단. R5 메타 패턴 silent drift family evidence.
  - `027_leaderboard_views_streak.sql` — **(cycle 377)** 리더보드 뷰 `current_streak` 컬럼 추가 — 게이미피케이션 강화. MyPicks 페이지엔 currentStreak 있었으나 리더보드 부재 → 픽 5개 이상 사용자 간 streak 경쟁 신호 노출. ROW_NUMBER + streak_calc CTE.
- CI / Cron:
  - `.github/workflows/ci.yml` (PR/push@main type-check + test, 현재 1133 tests — shared 80 + kbo-data 627 + moneyball 426, cycle 760 기준)
  - `.github/workflows/live-update.yml` (cron `*/10 9-15 UTC` = 18:00~00:50 KST)
  - `.github/workflows/daily-pipeline.yml` **(v0.5.22 재편)**: 15회/일 — UTC 00 announce / UTC 01-12 predict 매시간 / UTC 13 predict_final / UTC 14 verify. concurrency 락 추가.
  - **(2026-04-27)** GH Actions schedule high-load skip 7일 측정 결과 daily-pipeline 41% skip / live-update 85% skip. 특히 UTC 00,01,02,05 = 0/7 fire (announce 항상 누락 + 4/26 LG@OB·KT@SK 영구 예측 누락의 환경 원인). Cloudflare Workers Cron 으로 이관 작업 진행 중 (`cloudflare-worker/`). 안정 검증 후 GH Actions schedule 영구 비활성화 예정.
  - `cloudflare-worker/` **(2026-04-27 신규)**: Cloudflare Workers 기반 cron + SP 측정. (1) Phase 1 — 기존 daily-pipeline schedule 그대로 옮김 + mode 명시 호출. (2) Phase 2 — 매 trigger 마다 KBO 공식 (`B_PIT_P_NM`) + Naver (`schedule/games?fields=all`) 양쪽 동시 호출 → `sp_confirmation_log` 에 `source='kbo-official'` / `source='naver'` 양쪽 row 적재. 두 소스 비교로 어느 쪽이 먼저 SP 채우는지 정량 측정 (가설: KBO 만 polling 으론 fallback 가치 검증 불가). 1~2주 누적 후 분석 SQL 5개 (README.md Phase 3 섹션) 실행 → cron 횟수 정밀 축소 + Naver fallback 도입 여부 결정. 무료 tier (Workers Free 100k req/day).
  - `.github/workflows/pat-expiry-check.yml` / `vercel-deploy-error-dispatch.yml` — worker-incident dispatch
  - `.github/workflows/submit-lesson.yml` — worker-lesson dispatch. **(2026-04-29 Phase 4a D4)** `lesson:` + `policy:` / `feedback:` / `memory:` 4 prefix 모두 허브 worker-lesson 채널로 dispatch. lesson 외 prefix 는 payload `subtype=self-policy` 표시. develop-cycle skill 의 commit 도 동일 dispatch.
  - `.github/workflows/indexnow-ping.yml` **(cycle 772, 2026-05-20)** — IndexNow 자동 ping cron `'37 0 * * *'` (KST 09:37) + workflow_dispatch. `/api/seo/indexnow/ping` 호출 → sitemap URL 전부 (현재 ~1500 URL) Bing/Naver/Yandex/Seznam 동시 색인 신호. silent skip 차단 가드 (`HTTP_STATUS != 200` → `::error::`).
  - **폐기 (2026-04-30)**: `.github/workflows/self-develop.yml` + cloudflare worker `dispatchSelfDevelop` 분기. agent-loop 자율 cron 라인 끊고 사용자 직접 호출 `/develop-cycle [N]` skill 로 전환 (위 R6 참조).
- UI:
  - `apps/moneyball/src/components/predictions/PlaceholderCard.tsx` — **(v0.5.22 신규)** 예측 없는 경기 플레이스홀더. status 분기 (우천취소/진행중/종료/SP 대기/예측 준비중).
  - `apps/moneyball/src/lib/predictions/estimateTime.ts` — **(v0.5.22)** gameTime → 예측 생성 예상 시각.
  - `apps/moneyball/src/app/debug/pipeline/page.tsx` — **(v0.5.22)** pipeline_runs 30일 관측 대시보드. BASIC auth.
- Scrapers:
  - `kbo-official.ts`: `/ws/Main.asmx/GetKboGameList` POST 로 경기 일정·SP 확정 수집. **(cycle 769, 2026-05-20)** `Referer: KBO_SCHEDULE_REFERER` 헤더 박제 — 5/20 봇 차단 해소 (드리프트 사례 8). 다른 endpoint (`/Record/TeamRank/*.aspx`) 는 `KBO_USER_AGENT` 만으로 정상.
  - `kbo-live.ts`: KBO 공식 AJAX API 라이브 스코어 수집 + 이닝별 승리확률 보정 (v4-3, 필드 매핑 수정 2026-04-16). **(cycle 769)** `fetchLiveGames` 도 동일 `/ws/Main.asmx` endpoint — Referer 헤더 박제.
  - `packages/kbo-data/src/types.ts:KBO_SCHEDULE_REFERER` **(cycle 769 신규)** `'https://www.koreabaseball.com/Schedule/Schedule.aspx'` 상수 — `/ws/Main.asmx` POST 호출 단일 source.
- 파이프라인: daily.ts → runDebate → DB 저장. postview는 live-update가 자동 트리거.

- **v0.5.18-21 추가** (2026-04-19, AdSense 심사 대비 + 사용자 리텐션 + 운영 안정):
  - `apps/moneyball/src/components/shared/Breadcrumb.tsx` — 시각 + `BreadcrumbList` JSON-LD 동시 출력. 7개 동적 라우트(analysis/matchup/players/teams/reviews/predictions)에 통합.
  - `apps/moneyball/src/app/not-found.tsx` — 디자인 시스템 컬러 + 빠른 링크 6종. `metadata.robots index: false`.
  - `apps/moneyball/src/components/layout/CookieConsent.tsx` — localStorage 1회 dismiss, PIPA-compliant 안내.
  - `apps/moneyball/src/app/about/page.tsx` — FAQ 7개 + `FAQPage` JSON-LD.
  - `apps/moneyball/src/components/shared/FavoriteTeamFilter.tsx` — 홈 페이지 칩 바, localStorage `mb_favorite_teams_v1`. 인라인 `<style>`로 `data-game-id` 카드 숨김.
  - `apps/moneyball/src/components/predictions/PredictionsStatusFilter.tsx` — /predictions 상태 필터 칩 (전체/결과확인가능/결과대기, cycle 634, 103 line). localStorage `mb_predictions_status_filter_v1` + useSyncExternalStore + 인라인 `<style>` `data-prediction-status` attr 카드 숨김. 'all' 외 chip count=0 시 disabled + opacity-40 + cursor-not-allowed (cycle 646).
  - `apps/moneyball/src/components/predictions/PredictionsSortControl.tsx` — /predictions 정렬 토글 칩 (최신순/오래된 순, cycle 637, 84 line). localStorage `mb_predictions_sort_v1` + useSyncExternalStore + 인라인 `<style>` `[data-predictions-list]` flex-direction column-reverse 토글.
  - `apps/moneyball/src/components/predictions/PredictionsTierFilter.tsx` — /predictions 티어 필터 칩 (전체/강한 예측/보통/박빙, cycle 641, 102 line). localStorage `mb_predictions_tier_v1` + useSyncExternalStore + 인라인 `<style>` `[data-prediction-tiers]` attr 카드 숨김. FavoriteTeamFilter / PredictionsStatusFilter 동일 패턴. 'all' 외 chip count=0 시 disabled + opacity-40 + cursor-not-allowed (cycle 646).
  - `apps/moneyball/src/components/predictions/AccuracyHeaderCard.tsx` — /predictions 누적 적중률 헤더 카드 (cycle 658, 95 line, cycle 660 갱신). Server Component. 누적 적중률 % + 검증 완료 N/N + 누적 예측 + 최근 N건 trend 4 metric. 색상 ≥60% brand / ≥50% yellow / <50% red (page row 패턴 정합). dates reduce 합산 (추가 SELECT X / DB 비용 X). totalVerified=0 시 null return. trend chip: recentVerified ≥ 10 + totalVerified ≥ 30 시만 렌더 (소표본 차단). Δpp ≥+3 brand / ≤-3 red / else gray (cycle 660 추가).
  - `apps/moneyball/src/components/predictions/PredictionsMonthFilter.tsx` — /predictions 월별 그룹 필터 chip (cycle 661, 97 line). localStorage `mb_predictions_month_v1` + useSyncExternalStore + 인라인 `<style>` `[data-prediction-month]` attr 카드 숨김. months.length > 1 시만 렌더 (단일 cohort noise 차단). 'all' 외 chip count=0 시 disabled + opacity-40 + cursor-not-allowed (cycle 646 패턴 정합). `YYYY-MM` 정규식 가드 + chipLabel `YYYY년 M월` 한국어 자연 시계 형식 (cycle 663 갱신). chip group label `월별` 2-char Korean noun pattern 일관성 (cycle 665 갱신 — sister filter `결과`/`정렬`/`티어` 동일 width).
  - `apps/moneyball/src/components/predictions/PredictionsSearchBox.tsx` — /predictions 검색박스 (cycle 670, 121 line, PR #959). cycle 649 spec § ROI 4순위 후보 H heavy fire — 5/5 후보 모두 ship 완료. localStorage `mb_predictions_search_v1` + useSyncExternalStore + 인라인 `<style>` `[data-prediction-date^=]` + `[data-prediction-teams~=]` attr 카드 숨김. 팀명 (KBO_TEAMS 코드 / KBO_TEAM_SHORT_NAME 단축명 / 정식명) + 날짜 prefix (`YYYY` / `YYYY-MM` / `YYYY-MM-DD`) 양쪽 검색. predictions/page.tsx 데이터 select 에 home_team_code / away_team_code 확장 + 카드에 `data-prediction-date` / `data-prediction-teams` attr 박제. chip group label `검색` span mr-1 사이블링 4 filter (`결과`/`정렬`/`티어`/`월별`) 일관성 fix (cycle 672 갱신).
  - `apps/moneyball/src/components/analysis/YesterdayStatusFilter.tsx` — /analysis 어제 경기 status filter chip (적중/실패/대기, cycle 680, 105 line, PR #969). saturation v3 spec § ROI 1순위 후보 A fire. PredictionsStatusFilter 패턴 재사용 — localStorage `mb_analysis_yesterday_status_v1` + useSyncExternalStore + 인라인 `<style>` `[data-yesterday-status]` attr 카드 숨김. analysis/page.tsx 어제 섹션 wire.
  - `apps/moneyball/src/components/reviews/ReviewsResultFilter.tsx` — /reviews hub 결과 필터 chip (적중/실패/전체, cycle 684, 103 line, PR #972). saturation v3 후보 B carry-over closure (redirect — 원안 /reviews/monthly sort → /reviews hub 100 verified game list status filter 로 영역 redirect). localStorage `mb_reviews_result_v1` + useSyncExternalStore + 카드별 `data-review-result="correct" | "incorrect"` attr 박제. counts={all,correct,incorrect} 전달.
  - `apps/moneyball/src/components/reviews/MissesSortControl.tsx` — /reviews/misses sort chip (확신도순 default / 최신순, cycle 685, 84 line, PR #973). saturation v3 후보 D carry-over closure. /reviews/misses page.tsx — dateRankMap 계산 + 각 카드 inline style 박제. localStorage `mb_misses_sort_v1` + useSyncExternalStore.
  - `apps/moneyball/src/components/leaderboard/LeaderboardClient.tsx` — /leaderboard tab persistence (cycle 681, PR #970, cycle 731 갱신 PR #994). saturation v3 후보 E carry-over closure + saturation v7 후보 A 확장. useState → useSyncExternalStore + localStorage `mb_leaderboard_tab_v1`. SSR safe (getServerSnapshot='weekly' default). cycle 731 추가: useMemo 로 streakRankMap + sampleRankMap precompute + streakCohort (current_streak >= 2) >= 2 시 streak chip enable + entries.length >= 5 시 LeaderboardSortControl wire.
  - `apps/moneyball/src/components/leaderboard/LeaderboardSortControl.tsx` — /leaderboard 정렬 chip 3-mode (정확도순 default / 연속순 / 표본순, cycle 731, 114 line, PR #994). saturation v7 후보 A fire. TeamAccuracySortControl / MonthlyTeamStatsSortControl 2-mode → 3-mode 확장 패턴. localStorage `mb_leaderboard_sort_v1` + useSyncExternalStore + 인라인 `<style>` `[data-leaderboard-list]` flexbox order CSS 토글 (STREAK_ORDER_CSS / SAMPLE_ORDER_CSS 50 row hardcode rule). streakEnabled prop 으로 streak chip 조건부 (cohort < 2 시 chip 숨김). LeaderboardTable row 에 data-streak-rank + data-sample-rank attr 박제 — server→client 변환 회피, SSR 영향 0, flash 0.
  - `apps/moneyball/src/components/seasons/SeasonStandingsSortControl.tsx` — /seasons/[year] 팀 순위 sort chip 3-mode (승률 default / 득실 / 표본, cycle 734, 101 line, PR #1082). saturation v7 후보 B fire. LeaderboardSortControl (cycle 731) / MonthlyTeamStatsSortControl (cycle 721) 3-mode 확장 패턴 재사용. localStorage `mb_season_standings_sort_v1` + useSyncExternalStore + 인라인 `<style>` `[data-season-standings-list]` flexbox order CSS 토글 (RUNDIFF_ORDER_CSS / SAMPLE_ORDER_CSS 12 row hardcode rule). /seasons/[year]/page.tsx 팀 순위 섹션 table → div grid 변환 (10 column, LeaderboardTable 와 동일 패턴 통일). IIFE runDiffRankMap + sampleRankMap precompute + 각 row 에 data-rundiff-rank + data-sample-rank attr 박제 — server→client 변환 회피, SSR 영향 0, flash 0.
  - `apps/moneyball/src/components/glossary/GlossaryCategoryFilter.tsx` — /glossary 카테고리 필터 chip (cycle 699, 125 line, PR #978). saturation v4 후보 A heavy fire (ROI 1순위). localStorage `mb_glossary_category_v1` + useSyncExternalStore + 인라인 `<style>` `[data-glossary-category]` attr term 카드 숨김. 카테고리 슬러그 6종 (지표·통계·기록·전략·검증·평가). chip 'all' 외 count=0 시 disabled.
  - `apps/moneyball/src/components/matchup/MatchupGamesCloseFilter.tsx` — /matchup/[teamA]/[teamB] 접전 필터 chip (cycle 700, 96 line, PR #979). saturation v4 후보 D fire (ROI 2순위). PredictionsStatusFilter 패턴 100% 재사용. localStorage `mb_matchup_close_v1` + useSyncExternalStore + 인라인 `<style>` `[data-matchup-close]` attr 카드 숨김. close = `|home_win_prob - 50| ≤ 5` 정의.
  - `apps/moneyball/src/components/reviews/WeeklyGamesSortControl.tsx` — /reviews/weekly/[week] 주간 리뷰 게임 정렬 chip (cycle 703, 84 line, PR #982). saturation v4 후보 B fire (ROI 3순위). MissesSortControl 패턴 100% 재사용. localStorage `mb_weekly_games_sort_v1` + useSyncExternalStore + 카드 inline style flex-direction column-reverse 토글 (최신순/오래된순).
  - `apps/moneyball/src/components/teams/TeamRecentGamesFilter.tsx` — /teams/[code] 최근 예측 기록 위치+결과 2 group filter chip (cycle 704, 166 line, PR #983). saturation v4 후보 C fire (ROI 4순위). 2 group chip — 위치 (전체/홈/원정) + 결과 (전체/적중/실패). localStorage `mb_team_recent_location_v1` + `mb_team_recent_result_v1` + useSyncExternalStore + 인라인 `<style>` `[data-team-game-location]` + `[data-team-game-result]` attr 카드 숨김.
  - `apps/moneyball/src/components/picks/PicksStatusFilter.tsx` — /picks 픽 이력 status filter chip (전체/적중/실패/대기, cycle 712, 106 line, PR #986). saturation v5 후보 A fire (ROI 1순위, cycle 711 spec). PredictionsStatusFilter / ReviewsResultFilter / YesterdayStatusFilter 3중 검증 패턴 재사용 — localStorage `mb_picks_status_v1` + useSyncExternalStore + 인라인 `<style>` `[data-pick-status]` attr 카드 숨김. MyPicksClient PickRow 에 `data-pick-status` attr + entries.length >= 3 시만 렌더 (소표본 차단). 'all' 외 chip count=0 시 disabled (cycle 646 패턴).
  - `apps/moneyball/src/components/picks/PicksSortControl.tsx` — /picks 픽 이력 sort chip (최신순 default / 오래된 순, cycle 713, 84 line, PR #987). saturation v5 후보 B fire (ROI 2순위). PredictionsSortControl / MissesSortControl / WeeklyGamesSortControl 4번째 sort chip 패턴 재사용. localStorage `mb_picks_sort_v1` + useSyncExternalStore + 인라인 `<style>` `[data-picks-list]` flex-direction column-reverse 토글 (asc 모드만). MyPicksClient list wrapper `data-picks-list` attr + entries.length >= 3 조건 동시 렌더.
  - `apps/moneyball/src/components/picks/WeeklyHistorySortControl.tsx` — /picks WeeklyHistorySection 주간 sort chip (최신순/오래된순, cycle 714, 82 line, PR #988). saturation v5 후보 C fire (ROI 3순위). PicksSortControl 패턴 100% 재사용. localStorage `mb_weekly_history_sort_v1` + useSyncExternalStore + 인라인 `<style>` `[data-weekly-history-list]` column-reverse 토글. pastGroups.length >= 2 시만 렌더 (단일 그룹 무의미).
  - `apps/moneyball/src/components/standings/TeamAccuracySortControl.tsx` — /standings teamAccuracy 2-mode sort chip (정확도순 default / 표본순, cycle 715, 86 line, PR #989). saturation v5 후보 D fire. PicksSortControl / PredictionsSortControl / MissesSortControl / WeeklyGamesSortControl sibling 4 패턴 재사용. localStorage `mb_standings_team_accuracy_sort_v1` + useSyncExternalStore + 인라인 `<style>` data-attr 토글. server 측 sampleRankMap precompute (IIFE) + li 에 `data-accuracy-rank` / `data-sample-rank` 양쪽 attr 박제 — server→client 변환 회피, SSR 영향 0, flash 0. mode='sample' 시 flexbox order CSS 토글 (10 row hardcode rule).
  - `apps/moneyball/src/components/analysis/ThisWeekStatusFilter.tsx` — /analysis 이번 주 archive status filter chip (전체/적중/실패/미결, cycle 720, 107 line, PR #991). saturation v6 후보 A fire (ROI 1순위). YesterdayStatusFilter 패턴 재사용 — localStorage `mb_analysis_thisweek_status_v1` + useSyncExternalStore + 인라인 `<style>` `[data-this-week-status]` attr 카드 숨김 + `[data-this-week-day-group]:not(:has(...))` 일자 그룹 자동 collapse. counts={all,correct,wrong,pending} 전달. 'all' 외 chip count=0 시 disabled (cycle 646 패턴).
  - `apps/moneyball/src/components/reviews/MonthlyTeamStatsSortControl.tsx` — /reviews/monthly teamStats 2-mode sort chip (정확도순 default / 표본순, cycle 721, 89 line, PR #992). saturation v6 후보 B fire (ROI 2순위). TeamAccuracySortControl 패턴 100% 재사용. localStorage `mb_monthly_team_stats_sort_v1` + useSyncExternalStore + 인라인 `<style>` `[data-monthly-team-stats-list]` flexbox order 토글. server 측 sampleRankMap precompute (IIFE) + li 에 `data-sample-rank` attr 박제. mode='sample' 시 SAMPLE_ORDER_CSS (20 row hardcode rule).
  - `apps/moneyball/src/components/layout/Footer.tsx` — 리뷰·시즌 group weekly/monthly hub 진입 path 추가 (cycle 686, PR #974). Header `리뷰·시즌` 과 Footer `리뷰·서비스` mental model mismatch 해소 — label sync + weekly/monthly hub 진입 path 추가 + /search 도움말 이동. info-architecture-review (heavy) 30-cycle 주기 보정 fire.
  - `apps/moneyball/src/components/layout/Header.tsx` — NAV 도움말 group `/glossary` + `/about` 추가 (cycle 687, PR #975). Footer SITEMAP 도움말 column vs Header NAV 도움말 group label mismatch silent drift fix.
  - `apps/moneyball/src/components/predictions/PlaceholderCardLive.tsx` — 라이브 경기 플레이스홀더 (21 line, 2026-04-21). 진행중·우천취소 등 status 라이브 갱신 상태에서 예측 부재 카드 노출.
  - `apps/moneyball/src/components/predictions/PredictionCardLive.tsx` — 라이브 예측 카드 (61 line, 2026-05-12). 진행중 경기의 score + 이닝별 승리확률 보정 노출.
  - `apps/moneyball/src/components/predictions/JudgeReasoningCard.tsx` — judge agent reasoning 카드 (82 line, 2026-05-19, cycle 690 phase). /predictions/[date] 경기 카드 아래 노출 — judge 300-500자 블로그 reasoning + 양팀 에이전트 요약 + QuantOnlyBadge. thin content 회피 + SEO 본문 확보.
  - `apps/moneyball/src/components/predictions/FactorBreakdown.tsx` — factor 분해 시각화 (169 line, 2026-05-19, cycle 690 phase). pre_game factors 가중치 + bias 막대 그래프 + 0% factor 표기 제외. **cycle 756 glossary inline link 추가 (PR #1092)**: `FACTOR_GLOSSARY_ANCHORS` 매핑 + 각 factor label `<Link href="/glossary#<anchor>">` wrap — 사용자 클릭 1회 glossary 진입 path.
  - `apps/moneyball/src/components/shared/EmptyState.tsx` — 공통 EmptyState 컴포넌트 (cycle 759 PR #1093, saturation v10 후보 D). 3 size variant (inline / md / lg) + optional icon / description / cta. 5 location wire — /reviews/weekly/[week] empty / /reviews/monthly/[month] empty / /matchup empty / /teams 미플레이 / /predictions 박빙 0건 placeholder.
  - `apps/moneyball/src/components/shared/RelatedLinks.tsx` — 공통 RelatedLinks 컴포넌트 (45 line, cycle 765 PR #1097, saturation v11 후보 C). `<nav aria-label>` + `<h2>` + 칩 형 link list (label + optional hint). 4 라우트 wire — /analysis/game/[id] (관련 경기/팀/팀) + /players/[id] (소속팀/리그 선수) + /teams/[code] (라이벌/리그 hub/선수단) + /predictions/[date] (어제/내일/예측 hub). dark mode + focus-visible outline + hover brand color 일관.
  - `apps/moneyball/src/components/shared/TableOfContents.tsx` — 공통 TableOfContents 컴포넌트 (42 line, cycle 767 PR #1099, saturation v11 후보 B). `<nav aria-label>` + `<h2>` + 칩 형 `<ol>` 앵커 list (`#id` href + 1. 번호 prefix). 5 장문 라우트 wire — /about (FAQ 15건) + /accuracy (적중률 대시보드) + /glossary (25 term) + /guide (사용 가이드) + /methodology (예측 방법론). 각 섹션 wrapper 에 `id` + `scroll-mt-20` (header sticky offset). TOC 노출 위치 = header 직후 콘텐츠 직전. dark mode + focus-visible outline + hover brand color 일관.
  - `apps/moneyball/src/app/{leaderboard,players,predictions,reviews,teams}/page.tsx` JSON-LD coverage 확장 v11-A — 5 hub 라우트 박제 (cycle 764 PR #1096, saturation v11 후보 A). leaderboard (Dataset) / players (CollectionPage + ItemList) / predictions (CollectionPage) / reviews (CollectionPage) / teams (CollectionPage + ItemList). coverage 12/36 (33%) → 17/36 (47%).
  - `apps/moneyball/src/app/{analysis,leaderboard,picks,predictions,reviews}/loading.tsx` — 5 라우트 loading skeleton (cycle 754 PR #1091, saturation v10 후보 A). Next.js App Router loading.tsx convention. Suspense 자동 fallback — Server Component data fetch 동안 노출.
  - `apps/moneyball/src/components/predictions/YesterdayResultsSection.tsx` — 어제 경기 결과 섹션 (92 line, 2026-05-18). /predictions 페이지 상단 yesterday cohort 표기.
  - `apps/moneyball/src/lib/predictions/judgeReasoning.ts` — judge reasoning 유틸 (37 line, 2026-05-18). predictions 응답에서 judge reasoning + arg summary 추출 + null safe normalize.
  - `apps/moneyball/src/lib/predictions/factorLabels.ts` — factor key → 한국어 라벨 매핑 (62 line, 2026-05-07). sp_fip/bullpen_fip/lineup_woba/recent_form/elo/war/head_to_head/park_factor/sfr/sp_xfip 10팩터 정규화.
  - `apps/moneyball/src/lib/predictions/tierStats.ts` — 티어별 통계 유틸 (31 line, 2026-04-23). 강한 예측/보통/박빙 tier 분류 + 카운트.
  - `apps/moneyball/src/lib/predictions/yesterdayDate.ts` — KST 어제 날짜 유틸 (18 line, 2026-05-01). toKSTDateString 기반 어제 date string.
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

## 예측 엔진 가중치 (v1.8 — 10팩터, 3소스)
- 선발FIP 15% / 선발xFIP 5% / 타선wOBA 15% / 불펜FIP 10% / 최근폼 10% / WAR 8% / 상대전적 **3%** / 구장보정 4% / Elo레이팅 **10%** / 수비SFR 5%
- 홈팀 어드밴티지: +1.5% (HOME_ADVANTAGE=0.015, 2026-04-21 N=2180 측정)
- Elo baseline: KBO Fancy Stats Elo 예측과 비교하여 모델 성능 측정
- **v1.8 변경 (cycle 335, 2026-05-12)**: head_to_head 5%→3% (W20/W21 noise, 37.5% 실측) + elo 8%→10% (정보가치 Δ=+0.30 최강)
- v2.0 업그레이드: **n=150 임계** 달성 후 전면 재조정 (real n=94, v1.8 credit-fail 15건 분리, 56건 부족 — cycle 495 측정)
- **Calibration 현황** (n=124 total / real n=94, cycle 775 갱신): 전체 47.6% / real (v1.8 제외) 48.9% / Brier v1.8 0.2241 (v1.5/v1.6/v1.7-revert 미측정)

## 데이터 소스
- **KBO 공식** (koreabaseball.com): 경기일정, 선발확정, 결과, 최근폼, 상대전적, 구장별 기록
- **KBO Fancy Stats** (kbofancystats.com): FIP, xFIP, WAR, wOBA, SFR, Elo (robots.txt 없음)
- **FanGraphs** (fangraphs.com/leaders/international/kbo): wRC+, ISO, BB%/K% (보조/검증)
- ~~statiz.co.kr~~: robots.txt 전체 차단 → 사용 불가

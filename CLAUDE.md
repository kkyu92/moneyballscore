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
- **커밋 직후 `git push origin main` 도 즉시 실행** (R4 확장, 2026-08-19 cycle 2198 fix-incident — 사례 33 재발 근본 원인). PR/브랜치 아닌 **직접 main 커밋(policy:/docs:/lesson: retro류)도 push 누락 시 로컬-origin silent divergence 누적** → 다음 사이클(들)이 stale 워킹 디렉토리로 감사·작업 (사례 8/11/17/18/33 계열). push 실패(pre-push hook lint/type-check fail 등) 시 그 자리에서 원인 해결 후 재 push, 다음 커밋으로 미루지 않음.
- 여러 파일이 누적됐어도 **하나의 논리 단위 = 하나의 커밋**.

**예외 (여전히 사용자 허가 필요)**:
- Secrets/credentials 포함 파일 → 자동 커밋 금지, 먼저 경고
- 대규모 변경 (100+ 파일) → 먼저 내용 요약 후 사용자 확인
- push / force-push / --no-verify / --amend / reset --hard 등 파괴적 작업
- 사용자가 "아직 커밋하지마" 라고 명시한 뒤 그 세션 내

불확실하면 자동 커밋하지 말고 사용자 확인. 상세 규정 = auto-memory `feedback_session_quality_rules.md` (본 메인 conversation 시작 시 MEMORY.md 통해 자동 로드. repo `memory/` 와 별개 위치).

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

**memory layer 박제 분리 (cycle 986 정합)**:
- repo `memory/` = `drift-cases.md` (역사 silent drift 패턴) + `implemented-modules.md` (cycle 651~986 박제 archive) — 본 메인 세션 시작 시 권장 로드 + 사용자 git history 가시
- auto-memory `~/.claude/projects/-Users-kyusikkim-projects-moneyballscore/memory/` = `MEMORY.md` 인덱스 + `feedback_*.md` / `content-*.md` / `project_*.md` 류 — 본 메인 conversation 시작 시 자동 로드 (사용자 가시 X, 본 메인 직접 read/write)
- 양쪽 별개 박제 layer — repo memory/ = 사용자 보조 가시 archive, auto-memory = 본 메인 자체 기억 source

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
- **v2.0 결정 완료 (2026-07-06)**: v1.8 유지 확정 — n=178 임계 달성 (cycle 1447, > n=150 threshold) + plan #16 expanding window OOS n=178 재입증 (Brier DEFAULT 0.2443 vs Learned 0.2458, 최대 차이 0.15% < 1pp 임계, cycle 1460) + Fable plan 진단 (Brier drift = CREDIT_EXHAUSTED 2026-06-06~ 측정 오류, 실제 모델 정상). 전면 재조정 불필요. v2.1-B rejected (Brier 0.4635, n=52). 가중치 re-fit = 소진된 카드 (v2.1-B 증거). CREDIT_EXHAUSTED 2026-06-06~ 지속 → debate 100% fallback → conf=0.3 (사용자 Anthropic 크레딧 충전 필요). **CE fallback 실측 정정 (cycle 2074 op-analysis heavy)**: `scripts/op-analysis-brier-drift.ts` 가 CE 판별을 `confidence===0.3` 로 하드코딩 — daily.ts 의 debate_fallback_quant 경로는 confidence 를 0.3 고정이 아니라 quant 원본 그대로 흘려보내 (0에 가까운 값 다수), 이 기준이 실제 fallback 을 대량 누락. `debate_version IS NULL` 기준(P4 패턴, cycle 1550 정의)으로 재측정 = 월별 CE율 5월 53.7% → 6월 86.4% → 7월 99.0% → 8월 100.0% (n=294 누적). 기존 39.1%(post) 보고치는 측정 버그 — 실제로는 "100% fallback" 서술이 맞고 개선된 적 없음. 스크립트 fix 완료(`isCE` 단일 정의로 op-analysis-ce-cohort.ts 와 통일), Brier 수치 자체(pre 0.2434/post 0.2514, CI overlap)는 안정 유지.
- **Calibration 현황** (n=178 verified pre_game, cycle 1460 갱신 / DB 실측 n=187 v1.8 only, cycle 1549 실측 재확인): Brier 0.2443 (home_win_prob 기반 DEFAULT_WEIGHTS, cycle 1460) / accuracy 60.9% (cycle 1447 측정) / v1.8 only 실측 acc 59.9% (cycle 1549, n=187) / CREDIT_EXHAUSTED post 구간 winner-centric Brier 0.3568 = 측정 오류 (Fable plan S2c 확인, home_win_prob Brier pre/post = 0.24/0.24 안정). v1.8 유지 확정, Platt scaling 불필요. **n=178/n=165/n=187 원인 규명 (cycle 1549 축 C 완료)**: 각각 시점별 스냅샷 (n=178 = cycle 1460 7/6, n=165 = cycle 1545 7/13 아침, n=187 = cycle 1549 7/13 저녁). 표본 미스매치 X = 자연 시간 흐름. shadow rows (v2.1-B n=52 + v2.0 n=5) = 별개 cohort. v1.8-credit-fail (n=25 acc 60.0%) = CE fallback split (P1 lesson 정합). 사용자 가시 methodology page = 하드코딩 n 제거, /accuracy 실시간 참조 (silent drift 재발 차단, wave-247). CE/비CE 분리: CE 58.8% (97/165) / 비CE 63.8% (30/47, cycle 1550 op-analysis heavy 축 A 재측정, 전체 누적 표본 n=212). **원인 규명 (cycle 1550)**: overlap 월 3/3 (2026-05/06/07) 격차 = 전체 격차 = 5.0pp → temporal bias 배제, **LLM 부가가치 우세 결론**. Brier CE 0.3134 vs 비CE 0.2534 = LLM debate 가 conf 활용 shift 부가가치. `scripts/op-analysis-ce-cohort.ts` 산출. P4 새 패턴: CE 판별 = `scoring_rule='v1.8-credit-fail'` 만 (n=25) 부족. `scoring_rule='v1.8' AND debate_version IS NULL` 조건 추가 → 실제 n=165 (140건 backfill 미완료 = cohort-cleanup.ts 잔여). **cycle 2115 재측정 (op-analysis heavy, ~565 cycle 후속, `scripts/op-analysis-ce-cohort.ts` 동일 harness)**: 전체 n=299 (CE n=252 / 비CE n=47 — 비CE 표본 cycle 1550 이후 완전 동결, 마지막 비CE 예측 2026-07-01, 이후 4+개월 신규 0건). CE 53.2%(134/252) / 비CE 63.8%(30/47) → 격차 10.7pp (cycle 1550 5.0pp 대비 확대). 원인 = 대부분 temporal — CE n 증가분(165→252, +87)이 거의 전부 7월 데이터(n=97, CE acc 44.3% 저조 월)라 pooled CE 정확도가 그 월 실적에 끌려 내려감. LLM 부가가치 결론(비CE > CE) 자체는 방향 유지되나 격차 크기는 CE 표본 구성 변화 영향 큼 — 비CE 표본이 동결된 채라 "LLM 부가가치 vs temporal" 재분리 불가 (여전히 사용자 크레딧 재충전 없인 검증 불가능한 상태). **cycle 2146 재측정 (op-analysis lite, 동일 harness)**: 전체 n=311 (CE n=264 / 비CE n=47 — 비CE 완전 동결 지속, 마지막 예측 2026-07-01 이후 신규 0건, 동결 기간 확대). CE 54.2%(143/264) / 비CE 63.8%(30/47) → 격차 9.7pp (cycle 2115 10.7pp 대비 소폭 축소). overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 → LLM 부가가치 우세 방향 재확인. CE n 증가분(252→264, +12)이 8월 데이터(n=36, CE acc 61.1% 양호 월)라 pooled CE 정확도가 소폭 견인 — 표본 구성 변화가 격차 크기에 계속 영향. CREDIT_EXHAUSTED 지속(사용자 크레딧 재충전 미이행), 비CE 표본 동결로 재분리 불가 상태 변화 없음. **cycle 2191 재측정 (op-analysis lite, 동일 harness)**: 전체 n=316 (CE n=269 / 비CE n=47 — 비CE 동결 지속, 마지막 예측 2026-07-01 이후 신규 0건, 동결 기간 45일 경과). CE 53.9%(145/269) / 비CE 63.8%(30/47) → 격차 9.9pp (cycle 2146 9.7pp 대비 미세 확대, 3-cycle window 9.7~10.7pp 안정 범위). overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 → LLM 부가가치 우세 방향 3회 연속 재확인. CE n 증가분(264→269, +5)이 8월 데이터 소폭 반영. CREDIT_EXHAUSTED 지속(사용자 크레딧 재충전 미이행), 비CE 표본 동결로 재분리 불가 상태 변화 없음 — 사용자 크레딧 충전 전까지 이 항목은 반복 확인만 가능한 상태. **cycle 2309 재측정 (op-analysis lite, 동일 harness)**: 전체 n=321 (CE n=274 / 비CE n=47 — 비CE 동결 지속, 마지막 예측 2026-07-01 이후 신규 0건, 동결 기간 50일 경과). CE 54.0%(148/274) / 비CE 63.8%(30/47) → 격차 9.8pp (cycle 2191 9.9pp 대비 미세 축소, 4-cycle window 9.7~10.7pp 안정 범위 유지). overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 → LLM 부가가치 우세 방향 4회 연속 재확인. CE n 증가분(269→274, +5)이 8월 데이터 소폭 반영. 이번 주(cycle 2309 시점, 8/17~8/20) KBO v1.8 신규 검증 n=10 (화 2/5, 수 3/5) — 표본 과소로 가중치 판단 근거 X, weekly-review 관례상 별도 조정 없음. CREDIT_EXHAUSTED 지속, 비CE 표본 동결 상태 변화 없음. **cycle 2361 재측정 (op-analysis heavy, 동일 harness)**: 전체 n=332 (CE n=285 / 비CE n=47 — 비CE 동결 지속, 마지막 예측 2026-07-01 이후 신규 0건, 동결 기간 53일 경과). CE 53.7%(153/285) / 비CE 63.8%(30/47) → 격차 10.1pp (cycle 2309 9.8pp 대비 미세 확대, 5-cycle window 9.7~10.8pp 안정 범위 유지). overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 → LLM 부가가치 우세 방향 5회 연속 재확인. CE n 증가분(274→285, +11)이 전부 8월 데이터(8월 CE n=57, acc 56.1%)로 pooled CE 정확도에 소폭 영향. CREDIT_EXHAUSTED 지속(사용자 크레딧 재충전 미이행), 비CE 표본 동결로 재분리 불가 상태 변화 없음 — 5-cycle 연속 동일 결론 재확인 국면, 크레딧 충전 전까지 신규 정보 X. **cycle 2448 재측정 (op-analysis heavy, 동일 harness)**: 전체 n=337 (CE n=290 / 비CE n=47 — 비CE 동결 지속, 마지막 예측 2026-07-01 이후 신규 0건, 동결 기간 53일 경과 유지). CE 53.4%(155/290) / 비CE 63.8%(30/47) → 격차 10.4pp (cycle 2361 10.1pp 대비 미세 확대, 6-cycle window 9.7~10.8pp 안정 범위 유지). overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 → LLM 부가가치 우세 방향 6회 연속 재확인. CE n 증가분(285→290, +5)이 8월 데이터(8월 CE n=62, acc 54.8%)로 pooled CE 정확도에 소폭 영향. CREDIT_EXHAUSTED 지속(사용자 크레딧 재충전 미이행), 비CE 표본 동결로 재분리 불가 상태 변화 없음 — 6-cycle 연속 동일 결론 재확인 국면, 크레딧 충전 전까지 신규 정보 X. **cycle 2556 재측정 (op-analysis heavy, 동일 harness)**: 전체 n=337 (CE n=290 / 비CE n=47) — cycle 2448 수치와 완전 동일. 원인 규명: DB 직접 조회로 파이프라인 정상 확인 (KBO v1.8 최신 verified_at 2026-08-23, 최근 verified pre_game 697건 중 debate_version은 여전히 null/`v2-persona4` 둘뿐 — 신규 debate 버전 없음). 동일 수치 = 데이터 drift 아님, cycle 2448↔2556 사이 실제 경과 캘린더 일수가 짧아 KBO 신규 검증 배치가 아직 반영 전 (cycle 처리 속도 ≫ 실제 경기일 간격). CE 53.4%(155/290) / 비CE 63.8%(30/47) → 격차 10.4pp 그대로, LLM 부가가치 우세 결론 7회 연속 재확인. CREDIT_EXHAUSTED·비CE 동결 상태 변화 없음. **cycle 2586 재측정 (op-analysis heavy, 동일 harness, gap=25 trigger 도달)**: 전체 n=337 (CE n=290 / 비CE n=47) — cycle 2556 수치와 완전 동일(8회 연속). DB 직접 조회로 재확인: KBO v1.8 최신 verified_at 2026-08-23(2일 전), league='kbo' 필터 v1.8 verified count=312 + v1.8-credit-fail 25 = 337 일치. 최근 verified 예측 debate_version 여전히 null(=CE) 뿐, 신규 debate 버전 없음 — 파이프라인 정상 작동 확인(drift 아님), cycle 2556↔2586 사이 실제 경과일이 짧아 신규 검증 배치 미반영. CE 53.4%(155/290) / 비CE 63.8%(30/47) → 격차 10.4pp 그대로, LLM 부가가치 우세 결론 8회 연속 재확인. CREDIT_EXHAUSTED·비CE 동결(마지막 비CE 예측 2026-07-01, 55일+ 경과) 상태 변화 없음. **cycle 2608 재측정 (op-analysis heavy, 동일 harness, 22-cycle 자연 재점검 — gap=25 trigger 근접 미도달이나 2-chain lock(review-code/polish-ui 직전8 dominance) redirect 로 자율 선택)**: 전체 n=341 (CE n=294 / 비CE n=47) — CE n 증가분(290→294, +4)만 반영, 비CE 여전히 완전 동결(마지막 예측 2026-07-01, 56일+ 경과). CE 53.4%(157/294) / 비CE 63.8%(30/47) → 격차 10.4pp 그대로, LLM 부가가치 우세 결론 9회 연속 재확인. overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 유지. CREDIT_EXHAUSTED 지속(사용자 크레딧 재충전 미이행) — 크레딧 충전 전까지 이 항목은 반복 확인만 가능한 상태 유지.

## 데이터 소스
- **KBO 공식** (koreabaseball.com): 경기일정, 선발확정, 결과, 최근폼, 상대전적, 구장별 기록
- **KBO Fancy Stats** (kbofancystats.com): FIP, xFIP, WAR, wOBA, SFR, Elo (robots.txt 없음)
- **FanGraphs** (fangraphs.com/leaders/international/kbo): wRC+, ISO, BB%/K% (보조/검증)
- ~~statiz.co.kr~~: robots.txt 전체 차단 → 사용 불가

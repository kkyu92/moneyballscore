# TODOS

## ⚪ review-code (heavy) — /en/mlb/predictions EN mirror 감사, drift 0건 (cycle 2221, 2026-08-19)

open issue 0건, approved plan 0건. 직전 8사이클 distinct=3 (explore-idea/
review-code/operational-analysis) — lock 미충족. lotto 30-gap(gap=46)/
info-arch 30-gap(gap=38) 재확인 결과 둘 다 실익 없음(lotto: 8/22 50세트+8/15
결과 이미 박제, info-arch: 실 IA gap 없음). Feature-Drift Cycle 패턴에 따라
cycle 2220 신규 `/en/mlb/predictions` EN mirror + 6개 shared 컴포넌트
locale prop 주입 감사 채택.

**감사 대상**: `/en/mlb/predictions/page.tsx` (390줄) 를 KO 원본과 라인 대 라인
비교 — 쿼리/티어분류/날짜필터 로직 완전 동일, 문자열+locale prop 만 차이.
6개 shared 컴포넌트(MlbPredictionsSearchBox/PredictionsStatusFilter/
PredictionsSortControl/PredictionsTierFilter/PredictionsMonthFilter/
AccuracyHeaderCard) 전부 `locale?: 'ko'|'en' = 'ko'` prop 정상 구현 확인 —
KO 호출부 무변경, EN 라벨 전부 정확, 하드코딩 한국어 누출 없음. Breadcrumb
locale prop(homeHref `/en/mlb`), sitemap.ts entry, KO↔EN
`alternates.languages` 상호 링크, en-mlb-pages 테스트 predictions 섹션
전부 정합 확인.

**결론**: drift 0건. 코드 변경 없음, PR 없음.

## 🟢 explore-idea (heavy) — /en/mlb/predictions EN mirror (cycle 2220, 2026-08-19)

open issue 0건, approved plan 0건. 직전 8사이클 distinct=4 — lock 미충족. cycle
2218 explore-idea retro 가 명시적으로 "EN mirror 는 다음 explore-idea 후보로
carry-over" 박제했고, `sitemap.ts` 에도 "EN mirror(/en/mlb/predictions) 는
Phase 1 KO 우선 후속(TODOS carry-over)" 주석 존재 — 명확한 carry-over 채택.

**구현**: `/en/mlb/predictions/page.tsx` 신규 (KO 페이지 완전 미러, 문자열만
번역). KO 페이지가 재사용하는 6개 shared 컴포넌트(MlbPredictionsSearchBox /
PredictionsStatusFilter / PredictionsTierFilter / PredictionsMonthFilter /
PredictionsSortControl / AccuracyHeaderCard) 가 전부 한국어 하드코딩이라
`locale?: 'ko'|'en'` prop(default 'ko') 을 6개 전부에 추가 — KO 호출부 변경
없이 EN 페이지만 `locale="en"` 전파. Header.tsx 의 `/mlb/*` → `/en/mlb/*`
generic 치환 로직(cycle 2139/2140)이 이미 존재해 헤더/푸터 nav 는 새 라우트
추가만으로 자동 정상 연결 확인. KO 페이지 metadata 에 `alternates.languages`
추가(기존엔 canonical만). sitemap.ts 에 `/en/mlb/predictions` entry 추가.
기존 KO predictions 테스트의 "EN mirror 미착수" 단정 2건을 반전, en-mlb-pages
공용 테스트 파일에 predictions 섹션 추가.

**검증**: `pnpm --filter moneyball test` 453 files / 3940 tests 전부 pass,
`type-check` clean, `lint` clean. PR #TBD → R7 자동 머지 진행.

## ⚪ review-code (heavy) — /mlb/predictions 신규 코드 감사, drift 0건 (cycle 2219, 2026-08-19)

open issue 0건, approved plan 0건 (19건 전량 completed/archived). 직전 8사이클
distinct=4 — 2-chain lock 미충족. lotto/info-arch 30-gap 재확인 결과 둘 다 실익
없음(lotto: 8/22 회차 50세트+8/15 결과 이미 박제, info-arch: MLB 메가메뉴/푸터
sitemap 컬럼 cycle 2218 커밋에서 이미 동기 완료, breadcrumb 누락 라우트는 전량
redirect/placeholder/debug 성격이라 실제 gap 아님). Feature-Drift Cycle 패턴
(explore-idea → review-code 자연 교대) 따라 cycle 2218 신규 `/mlb/predictions`
hub(377줄) 감사 채택.

**감사 대상**: `apps/moneyball/src/app/mlb/predictions/page.tsx` — mlb_schedule
2-step 매핑, MLB_PRODUCTION_COHORT_RULES 필터, classifyWinnerProb/
deriveMlbOutcome null 처리, MlbPredictionsSearchBox 팀코드 정규화, CE-fallback
배너 부재, revalidate=1800 상수 정합 전부 확인.

**결론**: drift 0건. CE(CREDIT_EXHAUSTED) 배너가 KBO `/predictions` 에는 있고
MLB 버전엔 없는 점이 처음엔 gap 으로 보였으나, MLB 예측 파이프라인 자체가
LLM debate 미사용(순수 quant, `packages/kbo-data/src/agents/` grep 결과 MLB
debate 코드 0건)이라 CE 감지 로직이 애초에 적용 대상 아님 — 의도된 설계.
`cancelled`+`missing` 이중 카운트도 KBO 원본과 동일 컨벤션(정상). 코드 fix
없음 — 커밋/PR 없이 retro-only 마감.

**next_recommended**: operational-analysis or explore-idea (review-code 이번
사이클 포함 최근 8/20사이클 여전히 dominant — Feature-Drift 자연 복귀 전
다양성 우선 권장).

## 🟢 explore-idea (heavy) — /mlb/team/[code] division rank 노출 (cycle 2216, 2026-08-19)

open issue 0건, approved plan 0건 (19건 전량 completed/archived, plan #25 archived).
직전 8사이클 distinct=4 — 2-chain lock 미충족. info-arch/lotto 30-gap 재확인은
cycle 2213/2215 가 이미 처리해 skip 유지. cycle 2215 next_recommended
(explore-idea or review-code) 채택.

**carry-over 확인**: cycle 2213 이 MLB 실 standings(buildMlbDivisionStandings)
구현 후 남긴 next_recommended — "/mlb/team/[code] 페이지가 division rank 를
새 standings 순서와 일치시킬지 검토" — grep 결과 해당 페이지엔 division rank
자체가 아예 없어(league/division 라벨만 존재) 불일치가 아니라 순수 기능 gap
확인. plan#24 dedup 체크리스트(computeMatchupStreak 등) 도 후보로 봤으나 이미
cycle 2034/2036/2055/2064/2071 에서 전량 완료된 false lead 로 판명, 폐기.

**구현**: `buildMlbStandings.ts` 에 `findMlbTeamDivisionRank()` 신규(standings
결과에서 팀 rank/total/gamesBehind 추출) + team/[code] header 배지에
"N위/M팀 · X경기차" 노출. 신규 유닛 테스트 3건(1위 null / 2위 GB 실측 /
division 밖 팀 null). `pnpm type-check`(4 packages)/`pnpm --filter moneyball
lint`/vitest(452 files·3922 tests)/kbo-data vitest(88 files·1139 tests) 전체
통과. PR #2969 → `gh pr merge --squash --auto --delete-branch` → CI green 확인
후 merge 완료(commit `210f942c`, `gh pr view` 실측 확인).

## 🟢 operational-analysis (heavy) — CE/비CE cohort 재측정 + op-analysis-ce-cohort.ts stale cycle label fix (cycle 2215, 2026-08-19)

open issue 0건, approved plan 0건. 직전 8사이클 distinct=4 — 2-chain lock 미충족.
info-arch/lotto 30-gap 트리거 수치상 충족했으나 cycle 2213이 바로 직전에 이미
재확인·skip 처리해 1 cycle 만에 재확인 실익 없음. cycle 2214 next_recommended
(operational-analysis or explore-idea) 채택.

**재측정**: `scripts/op-analysis-ce-cohort.ts` 재실행 — n=316 (CE n=269 / 비CE
n=47), 격차 9.9pp. cycle 2191 (24 cycle 전, 실제 경과 ~14시간)과 수치 동일 —
verify cron 이 1일 1회라 신규 verified row 미발생, drift 아닌 정상 timing.

**발견 + fix**: 재실행 도중 리포트 헤더/푸터가 실행 시점과 무관하게 항상
`cycle 1550` 하드코딩 문자열을 출력하는 self-tooling 버그 확인 (cycle
2115/2146/2191 리포트 전부 동일 stale label). 리포트 소비자가 최신 재측정인지
과거 cycle 1550 원본인지 혼동할 수 있는 지점 — 라인 138/255/260 수정, 날짜
(`${today}`)만 표기하고 가짜 cycle 번호/plan 참조 제거. 원본 spec 출처 주석
(cycle 1547)은 역사 기록이라 유지. 재실행 검증 통과, lint/type-check green.
Commit `47c0d33c` main 직접 push (self-tooling 소규모 fix, PR 불필요 판단).

## 🟢 review-code (heavy) — analysis 페이지 CE-fallback 필터 중복 + WAR=0 가드 불일치 (cycle 2214, 2026-08-19)

open issue 0건, approved plan 0건(19건 전량 completed/archived/superseded/completed
status). GH Actions 최근 실패 0건, DESIGN.md 전일 갱신 fresh. 직전 8사이클
distinct=4 (explore-idea/review-code/operational-analysis/fix-incident) —
2-chain lock 미충족. info-arch/lotto 는 cycle 2213 에서 이미 재확인 skip 처리.
next_recommended(cycle 2213) = "review-code or operational-analysis" 채택.

**타겟 선정**: `analysis/page.tsx` (2802줄, 리포 최대 monolith) — 마이그레이션
히스토리 상 cycle 2150 (~64 cycle 전) 마지막 감사. 그 사이 wave-488~600+ 대량
기능 추가 누적, 인접 accuracy/page.tsx 에서 cycle 2208~2210 연속으로 같은 class
(하드코딩/필터 drift) 버그 3건 발견된 전례 — 재감사 근거 충분.

**발견 1 (agent 감사 확인)**: `analysis-data.ts` 의 `getPeriodStats`/
`getBestPickOfWeek`/`getUpsetPickOfMonth` 3개 함수가 `.match(CURRENT_MODEL_FILTER)`
(`scoring_rule='v1.8'`) 와 `.in('scoring_rule', PRODUCTION_COHORT_RULES)`
(`['v1.8','v1.8-credit-fail']`) 를 같은 쿼리에 체이닝 — PostgREST 는 AND 결합이라
교집합은 `v1.8` 뿐, CE-fallback(`v1.8-credit-fail`) row 를 silent 하게 제외.
같은 파일 안 다른 4개 함수는 `PRODUCTION_COHORT_RULES` 단독 사용 — 그 컨벤션 위반
이자 cycle 1984 monolith-extraction 커밋에서부터 존재한 잠복 버그. cycle 2209/2210
과 동일 CE-fallback silent exclusion family. `.match(CURRENT_MODEL_FILTER)` 제거로
정정 — "이번 주/이번 달 성적", "베스트 픽", "AI 이변 경기" 섹션 undercount 해소.

**발견 2 (백그라운드 서브에이전트 자연 발견)**: `page.tsx` 의 WAR 직접 대결 배지가
3곳(wave-367/508/521) 중복 존재 — wave-535 가 "WAR=0 = KBO Fancy Stats top-50
밖(데이터 미집계), 팀 실력 0 아님" data-gap 가드(`homeWar>0 && awayWar>0`)를
wave-508/521 에는 적용했지만 wave-367 은 누락. 미랭크 팀(WAR=0) 대 상대팀 WAR 격차가
`WAR_DUEL_MIN` 넘으면 wave-367 배지만 false "WAR 강세" 표시. 3곳 모두 가드 통일.

**검증**: 회귀 테스트 3건 신규(`silent-drift-wave-2214.test.ts`) + 전체 452
files/3919 tests green, lint/type-check clean. 커밋 `5748a4c0`, PR #2968
squash 머지(`808759f6`) + branch 자동 삭제.

## 🟢 explore-idea (heavy) — /mlb/standings 실 W-L/GB 순위 구현 (cycle 2213, 2026-08-19)

open issue 0건, approved plan 0건(19건 전량 completed/archived/superseded).
2-chain lock 미충족(직전 8사이클 distinct=4). info-arch 30-gap 트리거 충족(gap=30)
했으나 sitemap.ts 동적 라우트 커버리지·MegaMenu·Footer sitemap 컬럼 모두 이미
구현돼 있어 실익 낮음 판단해 skip. lotto 30+ gap 도 재확인 결과 cron 으로 이미
fresh(다음 회차 픽 08-22 + 직전 OOS 08-15 완결). 대신 cycle 2212 key_findings 에
명시된 "`/mlb/standings` 실 W-L 순위 미구현" carry-over 후보 채택.

**구현**: `/mlb/standings` 는 팀 구성 + 파크팩터만 보여주는 placeholder 였고
"시즌 W/L/GB 등 라이브 record 는 별도 datasource 통합 시" 문구로 고정. 실제로는
`mlb_schedule` 이 이미 MLB statsapi 원본 스코어(`home_score`/`away_score`,
`status='final'`)를 보유(cycle 2212 fix로 신선도 확보) — 별도 스크래퍼 연동 없이
계산만으로 해소 가능하다고 판단.

신규 `buildMlbDivisionStandings()` (`apps/moneyball/src/lib/mlb/buildMlbStandings.ts`)
— final 경기를 팀별 집계해 division 별 W-L/win%/GB 산출. StatsAPI alias 코드
(TB/CWS/KC/SD/SF/AZ/WSH) 는 `normalizeMlbTeamCode` 로 canonical 정합(cycle 2081
발견 패턴 재사용). 페이지는 win% 내림차순 정렬 + 실제 W-L·GB 렌더로 전환, ko/en
양쪽 미러 갱신. 기존 source-grep 테스트 2건(`MLB_DIVISIONS` 직접 import 검증)을
새 아키텍처(MLB_DIVISIONS 가 builder 내부로 이동)에 맞게 수정.

**검증**: 신규 유닛 테스트 5건(정렬/GB 계산/alias 정합/동점 제외/빈 시즌) +
로컬 dev 서버 실측 — `/mlb/standings` 200 렌더, 실제 W-L(8-1/6-0 등)·win%(.684
등)·GB(9.5/11.0 등) 정상 노출 확인. 전체 451 files/3916 tests green, lint/type-check
clean. 커밋 `3de90ac3`, push 완료.

## 🟢 fix-incident (heavy) — mlb_schedule.status 재고착(7일) + 근본원인(CF Worker 미배포) 독립 안전망 (cycle 2212, 2026-08-19)

open issue 0건, approved plan 0건, 2-chain lock 없음(직전 8사이클 distinct=4).
lotto 30-cycle gap trigger(gap=37)는 실제 상태 확인 결과 이미 fresh(다음 회차
픽·직전 회차 OOS 모두 08-18 완료)라 skip, info-arch gap=29(30 미달), MLB
TeamStrengthGrid/AL·NL 실제 순위 parity 후보 조사 중 더 심각한 라이브 버그 발견해
전환.

**발견 (artifact-first)**: `/mlb/standings` 실제 W-L 순위 미구현 gap을 조사하다
`mlb_schedule` 실측 — 2026-08-13~08-19 (7일) 전 경기가 `status='scheduled'`로
영구 고정, 반면 MLB statsapi 라이브 조회는 정상적으로 `Final` 반환 중(같은 경기로
직접 확인). `/api/mlb/pipeline` 라우트를 해당 날짜로 직접 curl 호출하니 즉시
`status='final'`로 정상 갱신 — 라우트/파이프라인 코드 자체는 100% 정상.

**근본원인**: `gh run list --workflow=deploy-cloudflare-worker.yml --log` 로 배포
이력 확인 — `CLOUDFLARE_API_TOKEN` GH secret 미등록(TODOS cycle 2068/2090에 이미
문서화, 사용자 액션 대기 중 — `wrangler whoami` 도 본 세션에서 미로그인 확인,
새 토큰 발급은 Cloudflare 대시보드 필요라 자율 해결 불가) 때문에
`deploy-cloudflare-worker.yml`이 전체 5회 실행 중 실질 배포 성공 0회. 즉
`cloudflare-worker/src/worker.ts`의 3일 재스크랩 backfill 로직(`643dba4e`, 사례
23/24 fix, 08-13 커밋)이 production Worker에 한 번도 반영 안 됨 — 실제 배포본은
그 이전 "당일 단일 날짜만 스크랩" 구버전으로 추정(매일 정확히 1개 run_date만
`pipeline_runs`에 기록되는 패턴과 일치). cycle 2090/2131류 후속이 CI 색깔(YAML
"Fail on missing secret" 승격)만 고쳤을 뿐, 실제 라이브 데이터 공백은 이번에
처음 실측·해소.

**조치**: (1) 즉시 완화 — 2026-08-13~08-19 7일치를 `/api/mlb/pipeline`
직접 curl로 재스크랩, 전량 `final` 정상화 확인(08-19는 당일 경기 미종료라
정상 `scheduled` 잔존). (2) 재발 방지 — 신규
`.github/workflows/mlb-schedule-status-backfill.yml` 추가: `CLOUDFLARE_API_TOKEN`
등록 여부와 완전 무관하게 기존 `CRON_SECRET`만으로 Vercel API를 직접 호출,
매일 UTC 11:47(KST 20:47, Cloudflare scrape 시간대와 안 겹침)에 최근 3일(D,
D-1, D-2)을 재스크랩하는 독립 안전망. `mlb-pipeline.yml`(수동 전용) 과 다른
목적 — 이쪽은 schedule 포함 자동 안전망. idempotent upsert라 Worker가 나중에
재배포돼도 중복 실행 안전, 제거 불필요.

**🔔 사용자 액션 여전히 필요**(변경 없음, cycle 2068/2090부터 반복): 근본 해결은
`gh secret set CLOUDFLARE_API_TOKEN` 등록. 등록 전까지 Cloudflare Worker 자체는
계속 구버전 실행 — 본 신규 workflow는 mlb_schedule.status 항목 하나만의 안전망일
뿐, elo_update/shadow_train 등 worker.ts의 다른 미배포 변경분(643dba4e 이후 전체)
은 이 fix 범위 밖.

`.github/workflows/mlb-schedule-status-backfill.yml` 신규 1개 파일 — YAML만,
코드 변경 없음(코드 자체는 이미 정상 동작 확인됨). 회귀 테스트 대상 없음.
main 직접 commit(R4, 단일 논리 단위).

## 🟢 review-code (heavy) — ScoringRuleDayHeatmap MLB 페이지 phantom KBO 행 fix (cycle 2211, 2026-08-19)

open issue 0건, approved plan 0건, 2-chain lock 없음(직전 8사이클 distinct=4).
TODOS 에 두 번 명시된 backlog("ScoringRuleDayHeatmap.tsx/buildScoringRuleWeekHeatmap
registry 재확인 미착수", cycle 2186/2189/2210) 채택.

**발견**: `SCORING_RULE_HEATMAP_ROWS`(KBO era history: v1.5/v1.6/v1.7-revert/
v1.8/v1.8-credit-fail 하드코딩)를 `ScoringRuleDayHeatmap.tsx`가 무조건 전량
렌더 — 반면 자매 컴포넌트 `CohortComparisonHeatmap.tsx`는 이미 activeRows
필터(silent drift family wave 257, cycle 1563)로 실 데이터 있는 행만 렌더.
두 "자매 view" 사이 parity 가 깨져 있었음. MLB predictions 는 단일
scoring_rule(`mlb_v0.1`)만 써서 KBO 리스트와 전혀 안 겹침 —
`buildScoringRuleDayHeatmap`이 'all' aggregate 만 채우는 것까지는 이미 테스트로
문서화(cycle 2189)돼 있었지만, UI 가 그 나머지 5개 빈 row 를 KBO 버전
라벨(v1.5~v1.8-credit-fail)째로 그대로 렌더 — `/mlb/accuracy` 실측(로컬 dev
서버 렌더 HTML grep) 으로 실제 노출 확인.

**수정**: `CohortComparisonHeatmap.tsx` 와 동일한 activeRows 필터 적용
(`SCORING_RULE_HEATMAP_ROWS.filter(sr => 실제 n>0 cell 존재)`). 데이터 없는
행이면 "데이터 없음" empty state. `buildAccuracyData.ts` 의 stale 주석
("acc null 표시 처리는 UI 책임" → 실제는 `SMALL_SAMPLE_THRESHOLD` 로 빌더가
직접 처리)도 정정. 신규 회귀 테스트 2건(`ScoringRuleDayHeatmap.test.tsx`) —
all-only 데이터는 1행만 / 실 scoring_rule 데이터는 해당 행 렌더.

`pnpm --filter moneyball test`: 450 files/3911 tests green(+1 파일/+2 신규).
tsc/lint clean + 로컬 dev 서버 실측(`/mlb/accuracy` 200, 렌더 HTML 에
v1.5/v1.7-revert/v1.8-credit-fail 미노출 확인, "전체" 행만 렌더). 단일
논리 단위 — main 직접 commit+push(R4/R7, `b74b91e6`).

---

## 🟢 operational-analysis (heavy) — CURRENT_MODEL_FILTER 배포 후 실효 검증 (cycle 2210, 2026-08-19)

cycle 2209 가 `CURRENT_MODEL_FILTER` (config/model.ts) 를 `debate_version`
기준에서 `scoring_rule` 기준으로 정정 (CE fallback row 조용히 배제되던
문제 fix). 본 cycle 은 그 fix 가 실제 배포 후 프로덕션 DB 에 반영됐는지
직접 검증 (구현했다고 적힌 것과 실제로 작동하는 것을 대조 — CLAUDE.md
"체크포인트 주장을 현실과 대조" R5 원칙 적용).

**검증 절차**: 1) `npx vercel ls` 로 최신 프로덕션 배포 확인 — 4분 전 Ready
(fix commit 70613e68 반영 확인). 2) Vercel preview URL 은 SSO 보호로
WebFetch 직접 불가 (deployment protection) → 3) 대신 cycle 2209 와 동일
1회성 스크립트 패턴 (`/tmp/verify-model-filter-fix.ts`, 실행 후 삭제) 으로
프로덕션과 동일 Supabase DB 직접 쿼리.

**결과**: `scoring_rule='v1.8'` verified count **291건** + `v1.8-credit-fail`
**25건** = 합계 **316건** (cycle 2209 pre-deploy 측정치와 일치). 최신
`verified_at` = **2026-08-18** (오늘 기준 최신, 기존 07-01 고정 문제 해소
확인). 결론: fix 정상 작동, 추가 코드 변경 불필요. 배포/DB 양쪽 실측 완료
— "구현함" 주장과 "실제 작동함" 사실이 일치하는 드문 명시적 확인 사례로
기록 (대부분 silent drift 사례는 이 대조를 생략해서 발생).

## 🔴 review-code (heavy) — CURRENT_MODEL_FILTER CE fallback 실측 7주+ silent 배제 fix (cycle 2209, 2026-08-19)

open issue 0건, approved plan 0건(status: approved 매칭 0), 2-chain lock 없음
(직전 8사이클 distinct=4). explore-idea 후속 후보 재검증 결과(MLB 로고
placeholder + accuracy dashboard parity) 실제 코드 확인상 이미 전량 완결됨을
확인(TODOS carry-over 문구가 stale — cycle 2207/2200 커밋에서 이미 처리) —
review-code(heavy) 로 전환, 후보 파일(`apps/moneyball/src/app/analysis/analysis-data.ts`,
cycle 2187/2188 이 남긴 "미감사" 후보) 감사 중 인접 파일에서 더 큰 발견.

**발견**: `analysis-data.ts` 는 `PRODUCTION_COHORT_RULES`(scoring_rule)만
쓰고 `CURRENT_MODEL_FILTER`(config/model.ts)는 안 쓰는데, 같은 디렉토리
밖 `/accuracy`·`/dashboard`·`/reviews`·leaderboard·players·standings·teams
등 14개 파일이 `CURRENT_MODEL_FILTER = { debate_version: CURRENT_DEBATE_VERSION }`
(`.match()`)를 씀. `decideModelVersion`(model-version.ts)은 debate 성공/실패
양쪽 분기 모두 `scoring_rule: CURRENT_SCORING_RULE`을 박제하지만 `debate_version`은
실패(=CE fallback) 시 `null` — `.match({debate_version: 'v2-persona4'})`는
등가 비교라 null row 를 조용히 제외.

DB 실측(`scripts/tmp-check-current-model-filter.ts` 1회성, 삭제 완료):
`debate_version='v2-persona4'` 필터 verified count = **143**, 전체
`scoring_rule in (v1.8, v1.8-credit-fail)` verified count = **316**.
`debate_version` 필터 기준 최신 `verified_at` = **2026-07-01**, 전체 기준
최신 = **2026-08-18**(오늘) — CE(CREDIT_EXHAUSTED) 100% 지속(2026-06-06~)
이후 7주+ 동안의 신규 검증 결과가 `/accuracy`(플래그십 "AI 예측 적중 기록"
페이지) 헤드라인 지표(n/정확도/Brier/캘리브레이션/rolling/브라이어추세/
요일별 히트맵/cohort 비교) 전체에서 조용히 빠져 있었음 — 페이지는 "실제
경기 결과 기준 자동 집계"라 표방하지만 실제로는 7주 전 데이터에 고정.

**근본원인 확인**: `shared/model-version-labels.ts` 가 이미 "baseline 분석
(accuracy/page.tsx / buildAccuracyData) 은 CURRENT_SCORING_RULE 만 사용"
이라고 문서화(line ~56)했는데 실제 구현(`CURRENT_MODEL_FILTER`)은
`debate_version` 기준이라 스펙과 구현이 어긋나 있었음. `buildEloTrend.ts`
(wave-241, 별도 테스트 `buildEloTrend.test.ts` 존재)가 정확히 동일 클래스
버그를 이미 한 곳에서 scoring_rule 기준으로 고쳤지만 그 fix 가
`CURRENT_MODEL_FILTER` 자체엔 전파되지 않은 것으로 확인 — silent drift
family 신규 파생(단일 상수 오정의가 14개 소비처로 부채 전파).

**수정**: `config/model.ts`의 `CURRENT_MODEL_FILTER`를
`{ debate_version: ... }` → `{ scoring_rule: CURRENT_SCORING_RULE }` 로
정정(단일 source 변경 → 14개 파일 자동 전파). 검증: 신규 필터 기준 DB
실측 count=291/316, 최신 verified_at=2026-08-18 확인. 기존
`debate_version` 키를 검증하던 테스트 2건(`players/__tests__/silent-drift.test.ts`,
`standings/__tests__/buildTeamAccuracy.test.ts`) `scoring_rule` 로 정정 +
회귀 테스트 1건 신규(`config/__tests__/model.test.ts`). `CURRENT_DEBATE_VERSION`
export 자체는 `/dashboard` 페이지 표시용으로 그대로 유지(영향 없음).

`pnpm --filter moneyball test`: 449 files/3909 tests green(+1 신규).
`tsc --noEmit`/lint clean. 단일 논리 단위 — main 직접 commit+push
(R4/R7, `70613e68`).

**다음 review-code(heavy) 후보**: `analysis-data.ts` 자체는 이번 감사로
클린 확인(별도 이슈 없음) — 원래 후보였던 `ScoringRuleDayHeatmap.tsx`/
`buildScoringRuleWeekHeatmap` registry 재확인은 아직 미착수, backlog 유지.

---

## 🟢 review-code (heavy) — daily.ts defaultTeamStats.totalWar 매직넘버 정합 (cycle 2208, 2026-08-19)

open issue 0건, approved plan 0건, 2-chain lock 없음(직전 8사이클 distinct=4),
lotto 33-cycle gap trigger 있었으나 cron 자동화(picks 2026-08-22 이미 박제 +
2026-08-15 result 이미 박제)로 이미 커버 확인 — cycle 2207 next_recommended
(review-code/operational-analysis) 우선, explore-idea 3연속 스트릭(2205-2207)
diversity redirect 도 근거.

**발견**: `packages/kbo-data/src/pipeline/daily.ts:643` `defaultTeamStats`
(팀 stats 완전 누락 시 fallback) 가 woba/bullpenFip/sfr 3개 필드는
`FANCY_STATS_DEFAULTS`(fancy-stats.ts:390) 단일 source 참조하는데
totalWar 만 인라인 `12` 매직넘버로 남아 있었음. 해당 상수 블록 주석이
"daily.ts 의 동일 magic number 중복 제거 통일"을 명시했으나 totalWar 필드
자체가 그 객체에 없어 리팩터 당시 누락된 것으로 확인 (fix(context)
wave 219~655 계열과 동일 패턴 — 매치 결과 grep 시 유일 occurrence).

**수정**: `FANCY_STATS_DEFAULTS`에 `totalWar: 12` 추가(주석: "타자 WAR 팀
합산 평균") + `daily.ts` 참조 변경. 값 동일 — 동작 변경 없음, 단일 source
정합만. `packages/kbo-data` type-check 3-package clean(shared/kbo-data/moneyball)
+ vitest 88 files 1139 pass. 단일 논리 단위 — main 직접 commit+push
(R4/R7, `9ad6cbf9`).

---

## 🟢 explore-idea (lite) — MLB 팀 목록/상세 페이지 로고 parity 완결 (cycle 2207, 2026-08-19)

open issue 0건, approved plan 0건, 2-chain lock 없음(직전 8사이클 distinct=4).
cycle 2206 next_recommended + TODOS carry-over 명시 우선.

**발견**: cycle 2206이 매치업 페이지 1곳만 처리하고 남긴 잔여 스코프 —
`mlb/{wild-card,matchup,players,players/[id],standings,team}/page.tsx` KO+EN
6쌍(12파일) 전부 `backgroundColor: team.color` color-circle `<span>` 그대로.

**수정**: 12파일 전량 `<MlbTeamLogo team={code|id} size={16|24|32|40}
className="rounded-full shrink-0" />` 교체 + import 추가. size는 기존 원 지름
그대로(w-4→16px/w-6→24px/w-8→32px/w-10→40px). `MlbMatchupSeasonHeadToHead.tsx`의
backgroundColor 2곳(teamA/teamB)은 승률 stacked-bar 폭(%) 인코딩 — 로고 아님,
스코프 제외 확인.

type-check/lint/build 전부 clean + vitest 448/3908 pass + 로컬 dev 서버
실측(standings/team/players/[id]/en-matchup/wild-card 5개 라우트 타입 200 +
`/logos/mlb/*.svg` 렌더 확인). 단일 논리 단위 — main 직접 commit+push
(R4/R7, `eff7699d`). MLB 로고 parity 마이그레이션(cycle 2205 착수) 전 라우트
완결 — 잔여 placeholder 0건.

---

## 🟢 explore-idea (lite) — MLB 매치업 페이지 실제 로고 parity (cycle 2206, 2026-08-19)

open issue 0건, approved plan 0건, 2-chain lock 없음(직전 8사이클 distinct=4),
lotto 30-gap trigger 있었으나 cron 자동화(#2943/#2956/#2967 등)로 picks/OOS
이미 커버됨 — cycle 2205 next_recommended 명시 carry-over 우선.

**발견**: cycle 2205가 `MlbTeamLogo` 컴포넌트를 신규 박제하고 `/mlb/team/[code]`
헤더에만 배선했지만, `/mlb/matchup/[teamA]/[teamB]` (KO+EN 양쪽) "팀별 성과"
섹션은 여전히 `backgroundColor: teamColor` color-circle `<span>` 그대로 —
같은 시각 아이덴티티 갭 잔존.

**수정**: 두 파일(KO/EN) color-circle span → `<MlbTeamLogo team={s.teamCode}
size={24} className="rounded-full shrink-0" />` 교체 + import 추가. lite
mode — carry-over spec 명확, office-hours/plan 단계 skip, 직접 구현.

type-check/lint/vitest(448/3908) clean + `pnpm build` 성공 + 로컬 dev 서버
실측(`/mlb/matchup/LAD/NYY` 200 + `<img src="/logos/mlb/LAD.svg">` +
`NYY.svg` 렌더). 단일 논리 단위 — main 직접 commit+push (R4/R7, `aac00925`).

**다음 explore-idea 후보 (carry-over, 미착수, 전수 grep 완료)**: MLB 영역
전반에 `backgroundColor: team.color` 색상 원 placeholder 12+개 잔존 —
`mlb/{wild-card,matchup,players,players/[id],standings,team}/page.tsx`
KO+EN 6쌍(12파일) + `MlbMatchupSeasonHeadToHead.tsx`(teamA/teamB) 2곳.
전부 `MlbTeamLogo` 로 교체 가능(타입 `team.code` → `MlbTeamCode` 확인
필요). 범위가 커서 이번 cycle(lite) scope 밖 — 다음 explore-idea 또는
review-code(heavy) 에서 일괄 처리 권장.

---

## 🟢 explore-idea (heavy) — MLB 팀 로고 placeholder + JSON-LD 404 정정 (cycle 2205, 2026-08-19)

open issue 0건, approved plan 0건(plan #24/#25 모두 completed/archived), 2-chain
lock 없음(직전 8사이클 distinct=4), gap-trigger 전부 미충족, CI green. cycle
2204 next_recommended=explore-idea + review-code 2연속 이후 다양성 차원.

**발견**: `/mlb/team/[code]` (KO+EN 양쪽) JSON-LD `SportsTeam.logo` 가
`${SITE_URL}/logos/mlb/${code}.png` 참조하는데 실제 파일/디렉토리 자체가
없음(`apps/moneyball/public/logos/mlb/` 부재) — production 실측
`curl .../logos/mlb/NYY.png` → 404 확인. KBO `TeamLogo.tsx` 는 실제 로고
PNG 보유(네이버 KBO CDN, cycle f2e6b241)하지만 MLB 는 처음부터 placeholder
조차 생성된 적 없음(헤더도 색상 원 div 뿐).

**수정**: `MLB_TEAMS.color`(30팀 각 hex, 사실 데이터·저작권 무관) 기반 SVG
placeholder 30개 신규(`apps/moneyball/public/logos/mlb/{CODE}.svg`, 원형+
팀코드 텍스트) — 공식 로고 스크래핑 없이 법적 리스크 회피, KBO
`TeamLogo.tsx` 원본 설계 코멘트("SVG 플레이스홀더 팀색+약어, 실제 로고는
동일 파일명 덮어쓰기") 그대로 재현. `MlbTeamLogo.tsx` 신규 컴포넌트
(`unoptimized` — next.config `dangerouslyAllowSVG` 없이 기본 optimizer가
로컬 SVG 거부) + KO/EN 헤더 배선 + JSON-LD `logoUrl` 확장자 `.png`→`.svg`
정정.

type-check/lint/vitest(448/3908) clean + `pnpm build` 성공 + 로컬 dev
서버 실측(`/mlb/team/LAD` 200 + `<img src="/logos/mlb/LAD.svg">` 렌더 +
자산 자체 200/`image/svg+xml`). 단일 논리 단위 — PR 생략, main 직접
commit+push (R4/R7, commit `0b7300c9`).

**다음 explore-idea 후보 (carry-over, 미착수)**: `/mlb/matchup/[teamA]/
[teamB]` 헤더도 동일 색상-원 placeholder(line ~213) — `MlbTeamLogo` 재사용
가능한 동일 gap, 본 cycle 스코프 밖(팀 프로필 우선).

## 🟢 fix-incident — deploy-drift-alert 빈 commit_sha silent pass 차단 (cycle 2204, 2026-08-19)

진단 단계에서 GH Actions scheduled workflow 최근 실행 상태 점검(review-code
2연속 후 다양성 확보 차원, fix-incident gap-trigger 는 아직 미충족이었지만
실제 신호 발견) 중 `deploy-drift-alert` 가 2026-08-18 17:39~23:33 KST 사이
main-vs-production 10h+ gap 으로 6회 연속 `::error::` 실패 후 01:50 run 이
"success" 로 표시된 것을 확인. 실제 로그 확인 결과 이 success 는 진짜 drift
해소가 아니라 `/api/version` 이 200 응답하면서 `commit_sha:""` (빈 문자열)
을 반환했을 때 워크플로가 타는 `-z "$PROD_SHA"` 분기(`::warning::` + `exit
0`)를 탄 것.

**근본원인**: `vercel inspect dpl_6TzuEuyVyFQvcyJUstncJz8tnCax` 로 그
deployment 확인 → `moneyballscore-git-main-kkyu92s-projects.vercel.app`
alias 부재 (정상 git-push 배포엔 항상 존재) = git 미연동 CLI/manual deploy
로 production 이 일시 교체됨. main HEAD 대비 실제 drift 여부를 확인할 수
없는 상태였는데 워크플로는 이를 "env 누락" 으로 오판해 조용히 통과시킴 —
사례 9/10 silent drift family 재발 (검증 불가능한 production 상태를
"정상"으로 은폐).

**수정**: `.github/workflows/deploy-drift-alert.yml` 의 빈 PROD_SHA 분기를
`::warning::` + `exit 0` → `::error::` + `exit 1` 로 변경. 현재 production
은 이미 정상 git-linked 배포로 자연 복구된 상태(수동 `gh workflow run` 재검증
확인, run 32210441660 success) — 이 fix 는 재발 시 silent pass 를 막는
목적. type-check/lint(pre-push hook) clean, YAML syntax 검증 완료. 단일
workflow 파일 2-line 변경 — PR 생략, main 직접 commit+push (R4/R7, commit
`73d0f46b`).

## 🟢 review-code (heavy) — 확신도별 분석 CI 임계값 20 → STATS_RELIABLE_MIN_N 정합 (cycle 2203, 2026-08-19)

open issue 0건, approved plan 0건, 2-chain lock 없음(직전 8사이클 distinct=4),
gap-trigger 전부 미충족, CI green. cycle 2202가 이미 감사한 파일과 겹치지 않게
`packages/kbo-data/src/agents/validator.ts`(899줄, LLM 환각·발명선수·금칙어 검증기)
+ `apps/moneyball/src/lib/analysis/convergenceRecord.ts`(733줄, 수렴 픽 streak/
팀별/홈어웨이 성적)를 전체 read — 둘 다 과거 여러 drift fix로 이미 견고, 신규 버그
없음 확인(validator.ts는 MLB가 team-agent/debate 안 거치는 순수 정량 경로라
correctly out-of-scope임도 재확인).

**발견**: `apps/moneyball/src/app/accuracy/page.tsx` 안에서 같은 파일이 이미
import 한 `STATS_RELIABLE_MIN_N`(=30, wave-496/cycle 1862 "3 file 하드코딩 30
swap" 상수 추출) 을 winRateBucket CI 배지(1165줄)는 참조하는데 confidenceTiers
CI 배지(827줄)만 여전히 리터럴 `20` 사용 — wave-496 sweep 당시 같은 파일 안
4번째 지점을 누락한 케이스. TeamBiasTable/TeamMatchupCards 와 동일한
"상수 도입 후 하드코딩 잔존" silent drift family.

**수정**: `tier.n < 20` → `tier.n < STATS_RELIABLE_MIN_N`. type-check/lint/
vitest(448/3908) 전부 clean. 단일 파일 1-line 변경 — PR 생략, main 직접
commit+push (R4/R7, commit `7cebb40f`).

## 🟢 review-code (heavy) — TeamBiasTable footnote 하드코딩 "n≥5" → SMALL_SAMPLE_N 정정 (cycle 2202, 2026-08-19)

open issue 0건, approved plan 0건(전량 completed/archived/pending-user-step),
2-chain lock 없음(직전 8사이클 distinct=4), gap-trigger 미충족(fix-incident/
op-analysis/info-arch/lotto 전부 최근 발화, CI green). cycle 2200이 신규
배선한 TeamBiasTable(MLB 팀별 예측 편향 분석)을 review-code(heavy) 대상으로
선정 — daily.ts results_sent lock 로직(cycle 2179/2199 fix) 재검증도
병행했으나 실제 버그 없음 확인(games.length===0 조기 return 이 vacuous-truth
edge case 를 이미 차단).

**발견**: `TeamBiasTable.tsx` footnote(ko/en 양쪽)가 "n≥5 팀만 표시"/
"Teams with n≥5 only" 를 리터럴 하드코딩. 실제 필터
(`buildTeamAccuracy.ts`/`buildMlbTeamAccuracy.ts` 양쪽 `.filter(r => r.totalN
>= SMALL_SAMPLE_N)`)는 `SMALL_SAMPLE_N`(=5) 상수 참조. 코드베이스 5개
파일(players/page.tsx, teams/[code]/page.tsx, mlb/team/[code]/page.tsx,
reviews/weekly, reviews/monthly)이 이미 확립한 `${SMALL_SAMPLE_N}` copy
interpolation 컨벤션과 불일치 — 향후 상수 값 변경 시 이 footnote 만 silent
하게 stale 해질 silent drift risk (기존 "10팀"/"6개월" 등 하드코딩 주석
drift family 와 동일 구조).

**수정**: `SMALL_SAMPLE_N` import 추가, ko/en footnote 양쪽 template literal
로 정정. `pnpm --filter moneyball type-check`/`lint`/`vitest run`(448 files,
3908 tests) 전부 clean. 단일 파일 3-line 변경 — PR 생략, main 직접 commit+push
(R4/R7, commit `214097eb`).

## 🟢 skill-evolution — phase 31 milestone (cycle 2201, 2026-08-19)

cycle 2200 이 trigger 3(`cycle_n % 50 == 0`) 단독 충족해 skill-evolution-pending 마커
박제 (사례 19 mitigation 5th consecutive OK — cycle 2000 재발 0건 유지). 본 cycle 2201
이 forced skill-evolution 소비. 직전 20 cycle(2181-2200, 분석 범위 제한 룰 준수)
측정: review-code 40%(0pp) + explore-idea 30%(+10pp, MLB parity gap 계열 재점화) +
fix-incident 20%(0pp) + info-arch 5% + op-analysis 5%. alternation pair(review-code+
explore-idea) 70%(+10pp). success 90%(18/20, partial 2건 모두 review-code — fail/
interrupted 0건 유지). watch.sh hang kill 0건.

MLB `/accuracy` vs `/mlb/accuracy` parity 3-cycle 체인(2196/2199/2200)으로 완전 종료
확인. **PASS_ship 누적 재개**: 재구성 비용이 예상보다 저렴(단일 `git log <hash>..HEAD`)
함을 확인해 1회성 재구성 완료 — `93ddb11d`(cycle 1950 retro)..HEAD = +206 ships,
직전 확정 누적 ~1388 + 206 = **누적 ~1594 (cycle 2200 기준)**. 이후 매 50-cycle 창마다
윈도우 실측만 더해 유지 (재구성 반복 불필요, anchor commit hash 하나만 남기면 저비용
재계산 가능한 게 확인됨).

**변경**: `~/.claude/skills/develop-cycle/SKILL.md` 마이그레이션 path 표 (phase 4 행
compact 요약 append) + `MIGRATION-PATH.md` (cycle 2200 항목 full append) — global
skill 파일(repo 밖). repo 안엔 dispatch 기록용 empty commit + PR #2967 (`feat(skill):
cycle 2200 milestone — skill-evolution 65회 (phase 31)`) squash 머지(`b2196654`)
+ R7 자동 branch 삭제.

**다음 milestone = cycle 2250** (PASS_ship ~1594 누적 유지 + MLB parity 종료 후
explore-idea redirect monitor + alternation pair 70% 지속 monitor + 사례 19
mitigation 6th consecutive 확인).

## 🟢 explore-idea (heavy) — MLB 팀별 예측 편향 분석 parity (cycle 2200, 2026-08-19)

open issue 0건, approved plan 0건(plan 10~24 전량 completed/archived/pending-user-step,
plan 25 archive — MLB Elo 소표본 bootstrap CI overlap 으로 phase3 gate 보류 확정).
2-chain lock 없음(직전 8사이클 distinct=3: review-code/explore-idea/fix-incident).
직전 2 cycle next_recommended_chain 힌트(explore-idea or fix-incident) + CI green
(fix-incident trigger 부재) 따라 explore-idea 선택. KBO `/accuracy` vs MLB
`/mlb/accuracy` 컴포넌트 diff grep 결과 팀별 예측 편향(TeamBiasTable, biasGap =
예측승률−실제승률) 섹션만 parity gap 으로 확인(FactorAccuracyTable/TeamMatchupCards
는 이미 완료).

**구현**: `buildMlbTeamBiasAnalysis()` 신규 — KBO 는 `fetchStandings()` 외부
스크랩으로 실제 승률을 구하지만, MLB 는 `mlb_schedule` 테이블에 이미 완료 경기
스코어가 있어 별도 스크래퍼 없이 직접 derive(`deriveMlbOutcome` 재사용, 신규
외부 API 호출 0건 — risk 최소화). `TeamBiasTable` 컴포넌트는 KBO 전용
`TeamBiasRow`/`shortTeamName` 하드코딩을 `TeamMatchupCards`/`FactorAccuracyTable`
이미 확립한 패턴(구조적 타입 + `shortName`/`locale` prop, 기본값으로 KBO 호출부
무변경)으로 일반화. `/mlb/accuracy`+`/en/mlb/accuracy` 양쪽에 bias 섹션 배선
(KBO 순서 정합: teams→bias→matchup→factor-accuracy).

신규 테스트 5건. `pnpm --filter moneyball type-check`/`lint`/
`vitest run`(448 files/3908 tests) + `@moneyball/shared`/`@moneyball/kbo-data`
type-check 전체 통과. PR #2966 squash 머지(`fdce1fbd`) + R7 자동 branch 삭제.

## 🟢 review-code (heavy) — TeamMatchupCards 소표본 임계값 N<3 컨벤션 정합 (cycle 2199, 2026-08-19)

R4 push 재발 검증 (carry-over) 결과 divergence 0 확인 (cycle 2198 fix 정상 작동).
open issue 0건, approved plan 0건, 2-chain lock 없음(직전 8사이클 distinct=4).
Feature-Drift Cycle alternation + 직전 2 cycle next_recommended_chain 힌트
(review-code or explore-idea) 따라 review-code 선택 — 최근 신규 추가된 MLB
컴포넌트(cycle 2196 TeamMatchupCards) 감사.

**발견**: `TeamMatchupCards.tsx` 가 상대팀 목록은 `n===1` 에만 opacity-50 dimming,
홈/원정 split 은 표본 크기 무관 항상 진하게 렌더 — `ScoringRuleDayHeatmap`/
`CohortComparisonHeatmap`/`WinnerProbBucketChart` 등 전체 코드베이스가 일관
적용 중인 N<3 소표본 컨벤션(CLAUDE.md "데이터로만 이야기")과 불일치. 컴포넌트
자체 테스트도 0건(신규 추가 이후 미작성).

fix: 상대팀 임계값 `n===1` → `n<3` 정정 + 홈/원정 split(`homeN`/`awayN`)에도
동일 가드 신규 추가. 회귀 테스트 2건 신규(opponent 소표본 + 홈/원정 소표본).
`pnpm --filter moneyball exec vitest run`(448 files/3903 tests) + lint +
type-check(4 packages) 전체 통과 후 main 직접 커밋(#e662ec08) + 즉시 push
(R4 확장 룰 준수 — 이번 cycle 도 정상 검증).

carry-over: KO `/accuracy` 페이지에서도 동일 컴포넌트 재사용 중이라 KBO
소표본(N=1~2 매치업 다수 예상) 케이스도 자동 수혜.

## 🟢 fix-incident — 로컬 워킹 디렉토리 origin divergence 재발 + 근본 원인 fix (cycle 2198, 2026-08-19)

cycle 2197 이 "해소 SUCCESS" 로 박제한 직후 cycle 2198 시작 스캔에서
즉시 재발 확인 (local 44-ahead / origin 1-behind, `gh pr list` 대조로
cycle ≤2196 은 정상 lockstep 이었음을 확인). 근본 원인 = cycle 2197 merge
후 `git push` 미실행 — CLAUDE.md R4 가 "즉시 commit" 만 명시, push 는
명시한 적 없었음.

fix: `git fetch` → `git merge origin/main` (TODOS.md 1건 conflict, 서로
다른 cycle 항목이라 양쪽 유지) → `git push origin main` (pre-push hook
lint/type-check 통과, `f063815f..e9b58b57` 반영 확인) → **CLAUDE.md R4
자체 수정** (커밋 직후 push 즉시 실행 의무화) → `memory/drift-cases.md`
사례 33 후속 기록 (merge 만으론 부족 — merge+push 가 완결) → 두 번째
커밋도 즉시 push (`e9b58b57..e3248517`).

이전 사례 8/11/17/18/33 계열과 다른 점: 이번엔 증상(divergence) 해소뿐
아니라 재발 차단 장치(R4 문서 수정)까지 완료 — silent drift family 대응
시 "이 순간 동기화" 와 "재발 차단" 은 별개 완료 항목이라는 교훈.

carry-over: R4 push 의무화가 실제로 재발을 막는지는 다음 cycle 이 시작
스캔에서 divergence 0 확인으로 검증.

no forced trigger (open issue 0건, approved plan 0건, 2-chain lock 없음 —
직전 8사이클 distinct=4) — Feature-Drift Cycle alternation (직전 explore-idea
heavy) + cycle 2195/2196 next_recommended_chain 힌트 양쪽 review-code 지목.

cycle 2196 이 구현·PR #2964 R7 머지까지 SUCCESS 로 retro 박제한 MLB
`TeamMatchupCards`/`buildMlbMatchupData` 를 감사하려 열어보니 로컬
워킹 디렉토리엔 해당 코드가 전혀 없었음 (`TeamMatchupCards.tsx` 여전히
KBO_TEAMS 하드코딩, `buildMlbMatchupData` 부재). `git fetch` 로 확인한
실제 상태: 로컬 main 이 origin/main 대비 1-behind(스쿼시된 PR #2964)
+ 40-ahead(cycle 2182~2196 raw 커밋 — `gh pr list` 확인 결과 이미
개별 PR #2955~2963 로 origin 엔 반영돼 있었으나 로컬 main 자체는 한
번도 pull 안 됨) 로 조용히 divergence.

`git merge origin/main` 로 동기화(TODOS.md 중복 항목 1건 conflict →
dedup) 후 실제 코드 재확인 — `buildMlbMatchupData()`/`TeamMatchupCards`
generalize 구조 자체엔 새 버그 없음 (KBO `buildMatchupData()` 와 parity
정확, cycle 2117/2160 기존 버그도 이미 해소 상태). 본 사례를
`memory/drift-cases.md` 사례 33 으로 문서화 — 체크포인트/메모리가 아닌
**git 워킹 디렉토리 자체**가 stale 소스였다는 점에서 사례 8/11/17/18 계열의
새 변형.

`tsc --noEmit` clean 확인. PR #2965 → `gh pr merge --squash --auto
--delete-branch` (R7) → `state=MERGED` 실측 확인 (커밋 `f063815f`, 사례
18 mitigation 적용).

carry-over: 로컬 main 의 잔여 divergence(40+1) 를 이번 cycle 에서 완전
해소하진 않음(대량 과거 커밋 일괄 push 는 CI 우회 리스크) — 다음
fix-incident/skill-evolution 이 "매 cycle 진단 단계에 git fetch+merge
습관화" 여부 결정 필요.

## 🟢 explore-idea(heavy) — MLB 팀별 상대 강약(matchup)/홈원정 parity (cycle 2196, 2026-08-19)

no forced trigger (open issue 0건, approved plan 0건, 2-chain lock 없음 —
직전 8사이클 distinct=4) — cycle 2195 next_recommended_chain 힌트
(explore-idea or fix-incident) + Feature-Drift Cycle alternation 따라
explore-idea(heavy) 선택.

deploy-drift-alert 최근 2건 실패를 먼저 조사했으나 (`gh run list` →
"deploy drift detected — gap 10h") cycle 2194 fix-incident 가 이미
문서화한 side-effect (CLI 수동 `vercel --prod` 재배포는 git commit
메타데이터가 없어 `/api/version` 의 `commit_sha` 가 empty — origin/main
이 다시 git-triggered build 로 배포되기 전까진 drift-check 자체가
blind) 그대로라 중복 조사 회피, explore-idea 로 전환.

KBO `/accuracy` 페이지엔 `TeamMatchupCards`(팀별 상대 강약 분석: 홈/원정
split + 상대팀별 적중 breakdown) 가 있는데 MLB accuracy 대시보드엔
전체 적중률 단순 테이블만 있었음. `buildAllMlbTeamAccuracy()`/
`buildMlbFactorAccuracy()` 등 선행 인프라는 이미 존재 — 이번 cycle 은
남은 매칭업 gap 만 채움.

`buildMlbTeamAccuracy.ts` 에 `buildMlbMatchupData()` 추가 (KBO
`buildMatchupData()` 대응, `mlb_schedule` 직접 컬럼 기반이라 FK join
불필요). `TeamMatchupCards` 를 KBO 하드코딩(KBO_TEAMS/shortTeamName)
에서 `teamCodes`/`shortName` prop 주입 방식으로 일반화 — KBO 호출부는
기존 동작 그대로, MLB `/mlb/accuracy` + `/en/mlb/accuracy` 양쪽에
신규 연결.

회귀 테스트 5건 추가. `tsc --noEmit` clean + 전체 vitest suite
3901/3901 pass (447 files) 확인.

PR #2964 → `gh pr merge --squash --auto --delete-branch` (R7) →
`state=MERGED` 실측 확인 (커밋 `3884f704`, 사례 18/cycle 2001 lesson
정합 — 완료 서술 전 실제 merge state 확인).

## 🟢 review-code(heavy) — Brier trend "3주 이상" 게이트 카피/동작 불일치 fix (cycle 2195, 2026-08-19)

no forced trigger (open issue 0건, approved plan 0건, 2-chain lock 없음 —
직전 8사이클 distinct=4) — Feature-Drift Cycle alternation (fix-incident
2194 는 out-of-band incident, 그 전 explore-idea 2193/review-code 2192)
따라 review-code(heavy) 선택. 최근 4개 explore-idea heavy cycle(2181/
2186/2189/2193)이 연속 추가한 MLB accuracy 대시보드 위젯 클러스터
(RollingAccuracyChart/BrierTrendChart/ScoringRuleDayHeatmap/
CohortComparisonHeatmap) 감사.

먼저 확인한 가설(MLB rows에 scoring_rule 필드 없어 per-rule heatmap
breakdown 이 깨진다) 은 오탐 — cycle 2189 커밋 메시지가 이미 "자연
degradation" 으로 명시했고, activeRows/activeSRs 필터가 'all' aggregate
만 남기는 걸로 이미 우아하게 처리됨 (silent drift wave 255~257 registry
fix 가 이미 이 패턴 방지).

실제 발견: `buildBrierTrend()` 는 주차마다 'all' + scoring_rule 최소
2개 point 를 result 배열에 push — result.length 는 실제 주차 수의 2배
이상. `accuracy/page.tsx`(628줄) + `MlbAccuracyDashboard.tsx`(312줄) +
`BrierTrendChart.tsx` 내부 가드가 모두 `brierTrend.length >= 3` (총
point 수) 로 게이트해, UI 카피("3주 이상 검증되면 Brier score 시계열
그래프가 표시됩니다")와 달리 실제로는 2주차에 이미 차트가 열림 — KBO/MLB
양쪽 accuracy 대시보드 공유 버그(cycle 1999 이전부터 존재, MLB 이식과
무관한 pre-existing 이슈).

조치: `countBrierTrendWeeks()` (distinct week/date count) 신규 export
(`buildAccuracyData.ts`) 후 3개 게이트 지점(`accuracy/page.tsx`,
`MlbAccuracyDashboard.tsx`, `BrierTrendChart.tsx`) 모두 이걸로 교체.
회귀 테스트 3건 추가. `tsc --noEmit` clean + 전체 vitest suite
3897/3897 pass (447 files) 확인.

커밋 `983acd83`. push 는 batch 정책 유지 (사용자 요청 시만, 자율 push
없음) — local main 지금 origin 대비 36 commit ahead.

## 🟢 fix-incident(heavy) — deploy-drift-alert 12h+ silent gap, 수동 재배포 (cycle 2194, 2026-08-19)

no forced trigger (open issue 0건, approved plan 0건, 2-chain lock 없음 —
직전 8사이클 distinct=3) — `gh run list` 로 fix-incident 소스 (scheduled
workflow health) 확인 중 `deploy-drift-alert` 가 2026-08-18 14:49 부터
매시 정각 10건 연속 failure (100% fail rate, 사례 17 cycle 1996 룰:
scheduled workflow 실패는 `pipeline_runs` DB 와 별개 채널이라 curl 진단
필수 — 본 케이스가 그 필요성 재확인).

진단: `vercel ls --meta githubCommitSha=<origin/main HEAD>` 조회 결과
82c6fecd (cycle 2181 retro, `feat(mlb): rolling 적중률 추세 차트 parity`
코드 변경 포함) 에 대한 배포 기록이 전혀 없음 — Vercel 최신 production
배포는 de22a6d (cycle 2180 docs 커밋, 같은 push batch 안 중간 커밋)
에 머물러 있었음. 즉 git push 자체는 origin 에 반영됐으나 (batch-push
정책 그대로 유지, R4 push 예외 — 자율 push 하지 않음) Vercel 쪽 build
트리거가 그 push 에 대해 아예 발화하지 않은 것으로 확인 (canceled/skipped
기록조차 부재 — turbo-ignore 스킵 아님, 웹훅 자체 미착화 추정).

조치: 로컬 main (33 commit ahead, unpushed) 을 건드리지 않고
`git worktree add /tmp/mbs-prod-deploy origin/main` 으로 origin/main
HEAD 상태만 분리 체크아웃 → `.vercel/project.json` (root + apps/moneyball)
복사 → `vercel --prod --yes` 수동 배포. 빌드 성공 + production alias
갱신 확인 (`/mlb/accuracy` 페이지에 cycle 2181 신규 "rolling" 차트 렌더
확인 — 코드 자체는 정상 반영). worktree cleanup 완료.

알려진 부작용 (회귀 아님): CLI 수동 배포는 git 커밋 메타데이터를
싣지 않아 `/api/version` 의 `commit_sha` 가 빈 문자열로 응답 — 다음
`deploy-drift-alert` 실행 시 PROD_SHA 미주입 분기 (`::warning` + exit 0)
로 넘어가 RED 는 해소되나 sha 비교 자체는 무력화됨. 근본 원인 (특정
push 에 대해 Vercel 웹훅이 왜 안 붙었는지) 은 CLI/API 로는 더 이상
진단 불가 (`gh api repos/.../installation` 401, `/user/installations`
403 — GitHub App 토큰 필요, dashboard 접근 필요). 다음 batch push 때
동일 silent skip 재발 여부 monitor 필요 — 재발 시 Vercel dashboard
Git 연동 설정 재확인이 사용자 영역 carry-over 후보.

## 🟢 explore-idea(heavy) — CohortComparisonHeatmap MLB parity (cycle 2193, 2026-08-18)

no forced trigger (open issue/approved plan 0건, 2-chain lock 없음 — 직전
8사이클 distinct=4, saturation 미충족 9/15) — cycle 2192 next_rec
(explore-idea 또는 fix-incident) + fix-incident 는 4개 scheduled
workflow 전부 green + open issue 0 이라 신호 부재 → explore-idea.
cycle 2186/2189 retro backlog 에 두 번 명시된 "CohortComparisonHeatmap
MLB parity 후보" 를 채택 — carry-over spec 명확 (lite 모드 기준 충족)
이나 최근 explore-idea(heavy) 관행 (직접 구현+ship) 따라 진행.

구현: `buildMlbAccuracySummary.ts` 에 기존 `buildScoringRuleWeekHeatmap`
(KBO `/accuracy` 의 scoring_rule × 주차 cohort heatmap 산출 함수) 재사용
→ `cohortWeekHeatmap: ScoringRuleWeekCell[]` 필드 추가. 컴포넌트
`CohortComparisonHeatmap.tsx` 는 완전 data-driven 이라 변경 없이 그대로
재사용. `MlbAccuracyDashboard.tsx` 에 섹션 추가 (guard: `some(c => c.n
>= 3)`, KBO `/accuracy` 동일 threshold), ko/en 페이지(`mlb/accuracy`,
`en/mlb/accuracy`) 양쪽 prop 배선.

`ScoringRuleDayHeatmap` (cycle 2189, 요일 축) 과 동일하게 MLB rows 는
`scoring_rule` 컬럼을 select 하지 않아 `sr ?? ''` 가 'all' aggregate
외 어떤 SCORING_RULE_HEATMAP_ROWS 에도 안 매칭 — 'all' 단일 행만 채워지는
자연 degradation (버그 아님, 기존 day heatmap 과 동일 패턴 확인 후 의도적
수용). parity 테스트 1건 추가 (day heatmap 테스트와 동일 assertion 구조).

tsc clean, lint clean, 447 test files / 3894 tests green (신규 1건 +).
커밋 직접 main (배치 push 정책 유지, 29 unpushed 누적 — 사용자 배치 push
요청 시 일괄 push).

## 🟢 review-code(heavy) — convergenceRecord.ts 감사, UTC/KST cutoff 불일치 fix (cycle 2192, 2026-08-18)

no forced trigger (open issue/approved plan 0건, 2-chain lock 없음 — 직전
8사이클 distinct=4) — cycle 2191 explicit reco (review-code 또는
fix-incident) + fix-incident 는 4개 scheduled workflow 전부 green + open
issue 0 이라 신호 부재 → review-code. 대상 파일 = convergenceRecord.ts
(736줄, wave-546~633 다수 기능 추가/추출 거쳤지만 전체 파일 단독 감사
기록 없음 — 수치 threshold 로직 밀집 = silent drift family 위험 영역).

발견: `getRecentConvergencePickRecord`/`getConvergencePickStreak` 의
startDate 미지정 기본 경로가 `new Date(Date.now() - N*86400000)
.toISOString().slice(0,10)` 로 cutoff 계산 — UTC 캘린더일 기준. 같은
파일의 `fetchConvergencePickDetailedResults` 는 today 경계를
`toKSTDateString()` 으로 KST 기준 계산 — cutoff 만 UTC 로 남아있던
불일치. KST 00:00~08:59 (UTC 15:00~23:59) 구간에 실행되면 cutoff 가
실제 KST 날짜보다 하루 이르게 계산돼 lookback 윈도우
(CONVERGENCE_RECORD_LOOKBACK_DAYS=45) 가 최대 1일 더 넓어짐 — "최근 45일
강수렴 픽 성적"(analysis/game 페이지) 표시치가 실행 시각에 따라
미세하게 흔들릴 수 있는 silent drift.

packages/shared 에 동일 목적으로 이미 존재하던 `kstDateOffset()`
(wave 143, not-found 페이지 3파일 중복 통합 시 박제 — 정확히 이 패턴
차단용) 을 두 콜사이트에 적용해 정정. 나머지 함수 전부 감사 — streak/
home-away/day-of-week/team-stats 순수 함수 로직, MLB pair 매치업 판정,
threshold 상수 사용 모두 일관 확인, 추가 버그 미발견.

tsc clean, 447 test files / 3893 tests green (회귀 없음). 커밋
d13f8584 직접 main (배치 push 정책 유지, 28 unpushed 누적 — 사용자
요청 시 push).

## 🟢 operational-analysis(lite) — v1.8 CE/비CE cohort 재측정 (cycle 2191, 2026-08-18)

no forced trigger (open issue 0, approved plan 0, 2-chain lock 없음 —
직전 8사이클 distinct=4). cycle 2190 explicit reco (explore-idea 또는
operational-analysis) 중 operational-analysis 선택 — explore-idea 후보
parity gap (CalibrationChart/RollingAccuracyChart 는 이미 MLB 포팅 완료
확인, TeamBiasTable/CohortComparisonHeatmap 은 MLB 실시간 standings
데이터 소스 부재로 1 cycle 범위 밖) vs op-analysis 는 기존
`scripts/op-analysis-ce-cohort.ts` harness 로 즉시 실행 가능 + 마지막
발화 cycle 2178 (13 cycle gap, 아직 25-gap trigger 미달이나 "주기적
갱신 필요" 라는 cycle 2190 own note 반영).

`scripts/op-analysis-ce-cohort.ts` 재실행 결과: 전체 n=316 (CE n=269 /
비CE n=47, cycle 2146 n=311 대비 +5, 비CE 45일째 완전 동결 — 마지막
비CE 예측 2026-07-01). CE 53.9%(145/269) vs 비CE 63.8%(30/47) → 격차
9.9pp (cycle 2146 9.7pp 대비 미세 확대, 3-cycle window 9.7~10.7pp 안정
범위). overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 → LLM
부가가치 우세 방향 3회 연속 재확인. 결론/방향 변화 없음 — 신규 코드
변경 X, `CLAUDE.md` 예측 엔진 가중치 섹션 cycle 2191 항목만 append.
CREDIT_EXHAUSTED 지속(사용자 크레딧 재충전 미이행) — 재분리 검증은
여전히 사용자 결정 대기.

## 🟢 review-code(heavy) — predictions/[date]/page.tsx 감사, 취소경기 적중률 불일치 fix (cycle 2190, 2026-08-18)

no forced trigger (open issue/approved plan 0건, gap-chain 전부 미충족, 2-chain
lock 없음 — 직전 8사이클 distinct=4, ship-0 미충족) — cycle 2189 explicit reco
(review-code 또는 fix-incident) + fix-incident 신호 부재(4개 scheduled
workflow 전부 green, open issue 0) → review-code. 대상 파일 선정 = staleness
기준: `analysis/page.tsx`·`accuracy/page.tsx` 는 cycle 2149-2150 이미 감사,
`predictions/[date]/page.tsx` 는 wave-505(cycle ~1872) 이후 318 사이클 미감사
— 가장 오래됨.

613줄 전체 read 후 신규 버그 1건 발견: 페이지 안 적중률 % 노출 5곳 중
헤더 통계줄/footer ShareButtons 문구/`DailyPredictionSummaryBar` props 3곳은
`correct.length / verified.length` (취소 경기 미포함), 나머지 `buildIntro()`/
`buildArticleJsonLd()` 2곳은 `correctN = correct+cancelled, totalN =
verified+cancelled` (기존 코드 주석 "취소 경기는 적중으로 집계 — 경기 자체
무효, 예측 책임 없음" 명시) — 취소 경기 있는 날짜에 같은 페이지 안에서 서로
다른 적중률 %가 동시 노출되는 실사용자 가시 버그.

`PredictionDatePage` 최상단에 `correctN`/`totalN` 단일 source 도입 → 헤더/
footer/`DailyPredictionSummaryBar` props 3곳 모두 교체 (`buildIntro`/
`buildArticleJsonLd` 는 이미 정답이라 변경 X). 회귀 테스트 1건 추가
(`correctN`/`totalN` 패턴 존재 + `correct.length / verified.length` 패턴
부재 assert, 기존 파일 소스-grep 테스트 컨벤션 따름).

`pnpm --filter moneyball test`: 447 files/3893 tests green (+1 신규),
`tsc --noEmit`/lint clean. 커밋 직접 main push(branch/PR 미생성, cycle 2180
이후 직접 push 패턴 유지, origin 대비 누적 ahead, 배포는 사용자 요청 시 batch).

**다음 후보**: `operational-analysis` v1.8 cohort 재측정 (마지막 발화 cycle
2178, gap 누적 중) 또는 `explore-idea` (Feature-Drift Cycle 교대).

## 🟢 explore-idea(heavy) — MLB 요일별 scoring_rule cohort heatmap parity (cycle 2189, 2026-08-18)

no forced trigger (open issue/approved plan 0건, gap-chain 전부 미충족, 2-chain
lock 없음 — 직전 8사이클 distinct=4) — cycle 2188 retro alternation 힌트
(explore-idea 또는 operational-analysis) + cycle 2186 이 남긴 backlog
(ScoringRuleDayHeatmap/CohortComparisonHeatmap/TeamBiasTable/ModelVersionHistory
중 MLB 미구현) 확인.

TeamBiasTable 은 사전 확인 결과 즉시 제외 확정 — `/mlb/standings` 페이지가
"시즌 순위는 추후 라이브 연동 carry-over" 라 명시, 실제 win% 소스 자체가 아직
없음(placeholder). ModelVersionHistory 도 MLB 가 scoring_rule 버전 분화 없어
스킵 유지. ScoringRuleDayHeatmap 은 BrierTrendChart 와 동일한 자연 degradation
패턴(MLB PredRow 에 scoring_rule 필드 자체가 없어 `'all'` aggregate 만 채워짐)
으로 안전하게 이식 가능해 이번 scope 로 선택.

`buildMlbAccuracySummary()` 에 `buildScoringRuleDayHeatmap(rows)` 한 줄
추가(신규 함수 없음, 기존 KBO 로직 그대로 재사용) → `scoringRuleDayHeatmap`
필드 노출. `MlbAccuracyDashboard` 에 섹션 추가(조건:
`scoringRuleDayHeatmap.some(c => c.n > 0) && verifiedN >= 10`, KBO
`/accuracy` 의 `rows.length >= 10` 문턱과 동일 의도) + KO/EN `/mlb/accuracy`·
`/en/mlb/accuracy` 양쪽 배선. `ScoringRuleDayHeatmap` 컴포넌트 자체는 KBO
전용 한글 라벨 하드코딩("소표본"/"전체"/요일명) — locale prop 없음. 기존
`BrierTrendChart` 도 동일 한계(EN 페이지에도 "전체" 노출) 확인 — 신규 결함
아닌 기존 컨벤션 유지, 별도 fix 범위 밖.

회귀 테스트 1건 추가(`scoring_rule 없는 MLB row → all aggregate 만 채워짐`
검증). `pnpm --filter moneyball test`: 447 files/3892 tests green,
`tsc --noEmit`/lint clean. 커밋 직접 main push(branch/PR 미생성, cycle 2180
이후 직접 push 패턴 유지, origin 대비 누적 ahead, 배포는 사용자 요청 시 batch).

**다음 후보(scope 밖, backlog 잔존)**: CohortComparisonHeatmap — 동일 자연
degradation 패턴 적용 가능해 보임(사전 확인 권장), MLB 4주 cohort 비교 wiring.

## 🟢 review-code(heavy) — page.tsx 감사, 신규 버그 1건 fix (cycle 2188, 2026-08-18)

carry-over — cycle 2187 review-code(heavy) 감사 결과 다음 후보로 명시 지목한
`apps/moneyball/src/app/page.tsx` (1081줄, 홈페이지, 최근 감사 이력 없음) 감사.

`getTodayDivergenceGame` (AI vs 커뮤니티 다이버전스 칩) 의 `pick_poll_events`
쿼리만 `assertSelectOk` 가드 누락 — 같은 파일 다른 7개 쿼리는 전부 사용 중.
Supabase 는 `.error` 체크 안 하면 throw 없이 `data=null` 로 silent return —
호출부 `.catch(captureFallback)` 는 throw 안 하면 절대 안 걸림. 즉 RLS/DB 에러
발생 시 다이버전스 칩이 알림 없이 그냥 사라짐 (사례 3/6 Supabase silent .error
family 재발). `assertSelectOk` 추가로 fix (커밋 `6d0b5fa2`).

그 외 홈페이지 전체 read — homeWinProb 필드 우선순위가 함수마다 다름
(`reasoning.homeWinProb` only / `reasoning ?? home_win_prob` / `home_win_prob ?? reasoning`)
이 처음엔 silent drift 후보로 보였으나, `daily.ts` `buildFinalReasoning` 이
`reasoning.homeWinProb` 를 `home_win_prob` 컬럼과 항상 동일값으로 명시 박제하는
설계(주석 확인) — 두 필드가 항상 같은 값이라 우선순위 차이가 실제 버그로
이어지지 않음. 재조사 방지 위해 기록만.

`pnpm --filter moneyball test`: 447 files/3891 tests green. `tsc --noEmit` clean.
Direct main commit (배치 배포 패턴 유지, PR 없음).

**다음 review-code(heavy) 후보**: `ScoringRuleDayHeatmap.tsx`/`buildScoringRuleWeekHeatmap`
(wave-255/256 registry 정합 재확인) 또는 `apps/moneyball/src/app/analysis/analysis-data.ts`
(analysis-data.ts 553줄+ home_win_prob join 로직, 최근 wave-313 배선 이후 미감사).

## 🟡 review-code(heavy) — buildAccuracyData.ts 감사, 신규 버그 미발견 (cycle 2187, 2026-08-18)

no forced trigger — 직전 8 사이클 distinct chain=4 (2-chain lock 없음), gap-chain
전부 미충족. cycle 2186 explore-idea 직후 Feature-Drift Cycle 자연 교대로
review-code(heavy) 선택. 감사 대상 = `apps/moneyball/src/lib/accuracy/buildAccuracyData.ts`
(758줄, 최근 BrierTrendChart 배선(cycle 2186)의 핵심 데이터 함수 — 신규 기능 직후
감사 우선순위).

전체 read 결과 신규 버그 없음. `buildBrierTrend`는 이미 cycle 1999 review-code가
잡은 "raw confidence 대신 resolveWinnerProb 사용" silent drift fix가 정상 반영됨
(테스트로 회귀 방지 중, line 406). 유일하게 의심스러웠던 지점 — `buildConfidenceTiers`가
동일 패턴처럼 `resolveWinnerProb` 아닌 raw `r.confidence`를 그대로 씀 — 은 조사 결과
버그 아님: `packages/kbo-data/src/agents/judge-agent.ts` `runJudgeAgent`의 Sunday cap
(`SUNDAY_CAP_CONFIDENCE`)이 `confidence` 필드만 낮추고 `homeWinProb`는 원본 유지하는
의도된 설계(일요일 medium tier 오분류 방지) — tier 분류는 raw confidence가 맞고,
Brier score류(정밀 calibration 측정)만 resolveWinnerProb 써야 함. 재조사 방지 위해
`buildConfidenceTiers` 위에 clarifying comment 추가(커밋 `7da64ac3`).

`pnpm --filter moneyball test`: 447 files/3891 tests green (회귀 없음). 코드 로직
변경 없음(comment only) — PR/branch 미생성, main 직접 push 없이 커밋만(batch 배포
패턴 유지).

**다음 review-code(heavy) 후보**: `apps/moneyball/src/app/page.tsx`(1081줄, 홈페이지,
최근 감사 이력 없음) 또는 `ScoringRuleDayHeatmap.tsx`/`buildScoringRuleWeekHeatmap`
(wave-255/256 registry 정합 재확인).

## 🟢 explore-idea(heavy) — MLB Brier Score 추이 차트 parity (cycle 2186, 2026-08-18)

no forced trigger (open issue/approved plan 0건, gap-chain 전부 미충족, 2-chain
lock 없음) — 직전 cycle 2185 retro 가 남긴 alternation 힌트(explore-idea 또는
review-code) + cycle 2176 이 남긴 backlog(KBO `/accuracy` 의 BrierTrendChart/
ScoringRuleDayHeatmap/RollingAccuracyChart/WinnerProbBucketChart/
CohortComparisonHeatmap/TeamBiasTable/ModelVersionHistory 중 MLB 미구현 항목,
RollingAccuracyChart·WinnerProbBucketChart 는 cycle 2180/2181 이 이미 완료)
확인 후 BrierTrendChart 를 이번 scope 로 선택.

`buildMlbAccuracySummary()` 가 이미 KBO `PredRow` 형태로 derive 해둔 rows 를
`buildBrierTrend()` 에 그대로 재사용 — 컴포넌트/함수 신규 작성 없이 데이터
배선만으로 parity 달성. MLB predictions 는 scoring_rule 버전 분화가 없어
`BrierTrendChart` 의 `SR_COLOR_MAP`/`SR_ORDER`(KBO 전용 v1.5/v1.6/v1.7-revert
라벨) 엔 안 걸리고 'all' 단일 라인만 표시 — KBO 전용 로직 변경 없이 자연
degradation.

`MlbAccuracyDashboard` 에 `brierTrend` prop 추가(길이 3+ 조건부 렌더, KBO
페이지와 동일 threshold) + KO/EN `/mlb/accuracy`·`/en/mlb/accuracy` 양쪽 배선 +
회귀 테스트 1건 추가. `pnpm --filter moneyball test`: 447 files/3891 tests
green, type-check/lint clean. `pnpm --filter @moneyball/kbo-data test`: 88
files/1139 tests green (회귀 없음 확인). 커밋 직접 main push(`3a23c92c`,
branch/PR 미생성 — cycle 2180 이후 직접 push 패턴 유지, origin 대비 누적 ahead,
배포는 사용자 요청 시 batch).

**다음 후보(scope 밖, backlog 잔존)**: ScoringRuleDayHeatmap/
CohortComparisonHeatmap/TeamBiasTable/ModelVersionHistory — TeamBiasTable 은
MLB 팀 순위(win%) 소스 부재로 KBO 와 동일 방식 이식 어려울 수 있음(사전 확인
필요), ModelVersionHistory 는 MLB 가 scoring_rule 버전 분화 없어 실효성 낮을
가능성(다음 explore-idea heavy fire 전 재확인 권장).

## 🟢 fix-incident — KBO 잔여 9경기 확정 취소 마킹, 사례 33 완전 해소 (cycle 2185, 2026-08-18)

cycle 2184가 남긴 carry-over(6개 날짜 9경기, KBO API가 여전히 'scheduled' 로
응답해 자동 재검증 불가) 를 이어받아 KBO 공식 뉴스 검색(WebSearch)으로 9경기
전부 실제 취소 여부를 확인: 2026-07-05 LG-HH/HT-NC(우천), 2026-07-22·07-23
KT-OB(그라운드 사정 2일 연속), 2026-08-01 LT-SS·NC-HT/2026-08-02 NC-HT/
2026-08-04 OB-NC·HT-KT(폭염 4경기, KBO 폭염 세칙 첫 적용 구간). 재편성 여부와
무관하게 해당 날짜 슬롯 경기는 전부 열리지 않았음을 개별 뉴스 기사로 교차
확인.

**fix**: `scripts/backfill-kbo-confirmed-postponed.ts` 신규(진단/--apply) —
확인된 9개 game id 를 `games.status='postponed'` + `is_canceled=true` 로
직접 마킹(KBO API 재조회 없이, 뉴스 확인 결과를 직접 반영). predictions
테이블 조회 결과 9경기 전부 `is_correct=null`(애초에 채점 미실행)이라 추가
처리 불필요. `daily_notifications` flag 미변경(Telegram 재알림 방지, cycle
2184 와 동일 원칙 유지).

**결과**: 사례 33 (cycle 2184 발견 9개 날짜 24경기) 완전 해소 — 이전 사이클
15경기(3개 날짜, API 재조회로 해소) + 본 사이클 9경기(6개 날짜, 뉴스 확인
직접 마킹) = 24경기 전부 정합 상태 도달. `pnpm --filter @moneyball/kbo-data
test`: 88 files / 1139 tests green, type-check(전체 4 패키지) clean. 커밋
직접 main push (branch/PR 미생성 — cycle 2180 이후 직접 push 패턴 유지,
origin 대비 누적 ahead, 배포는 사용자 요청 시 batch).

## 🟢 fix-incident — KBO games.status 영구 'scheduled' 고착 family 발견 + backfill (cycle 2184, 2026-08-18, 사례 33)

no forced trigger (open issue/approved plan 0건, gap-chain 전부 미충족, 2-chain
lock 없음) — health-check 성격 진단(pipeline_runs 최근 7일 mismatch scan +
mlb_fancy_scrape 최근 에러 확인) 중 announce/verify mode 의 "predictions=0" 은
설계상 정상(games_skipped=0 이지만 애초에 예측 안 하는 모드)임을 확인한 뒤,
`games` 테이블 자체를 직접 스캔해 **status='scheduled' 로 9일+ 고착된 경기가
2026-04-14~2026-08-04 사이 9개 날짜 24경기** 존재함을 발견. 이는 사례 32
(cycle 2179, verify cron 이 그날 게임 전부 안 끝나도 results_sent 영구 세우던
버그)의 **fix 이전 historical fallout** — verify 모드가 구조적으로 "어제" 단
하루만 재검증하고 과거 날짜로 절대 안 돌아가는 설계라, 한번 세팅되면
(sealed 든 안 sealed 든) 재시도 기회가 영구히 없음. MLB 쪽엔 이미 동일 버그
클래스(사례 23, cycle 2067)가 `backfill-mlb-schedule-status.ts` 로 처리된
전례가 있었으나 KBO 쪽엔 대응 스크립트가 없었음.

**fix**: `scripts/backfill-kbo-stuck-verify.ts` 신규(진단/--apply 모드,
`backfill-mlb-schedule-status.ts` 패턴 이식) — 대상 날짜별 KBO API 재조회 →
`games` upsert → 신규 final 경기의 `predictions.is_correct` 재계산
(`buildAccuracyUpdates` 재사용). `daily_notifications` flag 는 건드리지 않음
(Telegram 재알림 방지, 순수 데이터 정합성 fix). `computeWinnerTeamId` /
`buildAccuracyUpdates` 를 `packages/kbo-data/src/index.ts` 에 신규 export
(기존 daily.ts 내부 전용 함수를 스크립트가 재사용할 수 있도록).

**결과**: 9개 날짜 중 3개(04-14/04-15/04-29, 15경기) 완전 해소, 나머지
6개 날짜는 KBO API 자체가 여전히 'scheduled' 로 응답(9경기 잔존 — 우천취소
등으로 재편성 없이 소멸된 경기로 추정, KBO 쪽 자체 데이터 갱신 없인 추가
자동화 불가). `predictions.is_correct` 19건 신규 계산. `pnpm --filter
@moneyball/kbo-data test`: 88 files / 1139 tests green, type-check(root +
app) clean, lint clean. 잔존 9경기는 다음 fix-incident 후속 후보로 carry-over
(KBO 공식 발표/뉴스로 우천취소 확정 여부 수동 확인 후 postponed 로 직접
마킹하거나 영구 미해결로 인정).

## 🟢 info-architecture-review — MLB matchup 진입점 부재 발견 + fix, 435 pairs 도달 불가 상태 해소 (cycle 2183, 2026-08-18)

trigger 9 (마지막 info-architecture-review 발화 이후 ≥30 사이클, 마지막 fire
cycle 2153, gap=30 정확 도달) 자동 권장으로 발화. 진단(라우트 신규 추가/breadcrumb
누락/헤더 메가메뉴/footer sitemap) 결과 대부분 항목은 정상(placeholder 페이지
breadcrumb 제외는 의도된 설계) — 하지만 `/mlb/matchup/[teamA]/[teamB]`(435 pairs,
plan #24 Phase 3b) 동적 라우트가 KBO의 `/matchup` 대응 picker/index page 가 없어
헤더 메가메뉴에도, footer에도, sitemap 정적 목록에도 진입점이 전혀 없었음
발견(en 버전도 동일 — `/en/mlb/team/page.tsx`는 있는데 `/en/mlb/matchup/page.tsx`는
부재). sitemap.xml 크롤러 발견 외엔 사용자가 이 435개 페이지에 도달할 방법이 없던
상태.

**fix**: KBO `/matchup/page.tsx` 패턴 그대로 이식 — `/mlb/matchup/page.tsx` +
`/en/mlb/matchup/page.tsx` 신규(30×30 격자 + 팀별 바로가기, 기존
`mlbCanonicalPair` helper 재사용). `MLB_HEAD_TO_HEAD_PAIRS`(=435) 신규 상수
(`KBO_HEAD_TO_HEAD_PAIRS` wave 107 컨벤션 동일). Header `MLB_NAV`에 "매치업"
항목 추가. `sitemap.ts` 정적 라우트 2건 추가. `sitemap-mlb.test.ts` 검증
테스트 2건 추가. 전체 447 test files / 3890 tests green, type-check/lint
clean. 커밋 직접 main push (branch/PR 미생성 — cycle 2180/2181 직전 feat 커밋과
동일 패턴 유지, origin 대비 4 commits ahead 누적, 배포는 사용자 요청 시 batch).

## 🟡 review-code(heavy) — daily_notifications 영구 lock 버그 클래스 family 감사, 신규 버그 미발견 (cycle 2182, 2026-08-18)

no forced trigger (open issue/approved plan 0건, 2-chain lock 없음, gap-chain 전부
미충족) — cycle 2181 explore-idea 백로그 5개(BrierTrendChart/ScoringRuleDayHeatmap/
CohortComparisonHeatmap/TeamBiasTable/ModelVersionHistory) 전부 실측 확인 결과 모두
차단됨 확인 후(BrierTrendChart/ScoringRuleDayHeatmap/CohortComparisonHeatmap 은
`SR_COLOR_MAP`/`SR_ORDER`/`VERSION_ORDER` 가 KBO era 하드코딩이라 MLB scoring_rule
자체가 그 목록에 없어 데이터 있어도 라인 렌더 자체가 안 됨 — "색상 매핑만 추가하면
된다"던 기존 TODOS 서술보다 스코프 큼. TeamBiasTable 은 `/mlb/standings` 페이지가
"시즌 순위는 추후 라이브 연동 carry-over" placeholder 라 실제 win% 소스 자체 부재.
ModelVersionHistory 는 `MLB_PRODUCTION_COHORT_RULES`=단일 rule 이라 "버전 history"
개념 자체가 무의미), review-code(heavy) 로 전환 — cycle 2179 fix-incident 가 고친
"verify cron 영구 봉인"(사례 32, `daily.ts` results_sent flag 가 게임 미종결 상태에서
0-result 로 영구 세워지는 버그) 과 같은 클래스(notification flag 가 불완전 상태에서
영구 lock)가 형제 flag(`announce_sent`/`summary_sent`) 및 MLB 파이프라인에도
있는지 family sweep.

**감사 결과 (신규 버그 0건)**: `announce_sent`(daily.ts:267-294) 는 게임 종결 여부와
무관한 09시 예고라 "미완결 상태" 개념 자체 없음 — 안전. `summary_sent`(daily.ts:
1190-1258) 는 이미 cycle 884 fix 로 `predict_final` 시 partial(0<n<expected) 도
"last-chance" 로 명시 트리거 + 그 외 모드는 미달 시 flag 미세팅 skip — 사례 32 와
같은 조기 영구 lock 경로 없음, 설계 의도대로 정합. MLB 파이프라인
(`packages/kbo-data/src/pipeline/mlb-pipeline.ts`) 은 `markNotificationFlag`/
`isNotificationSent` 자체를 쓰지 않음(run-once lock 메커니즘 부재, idempotent
재실행 설계) — 이 버그 클래스가 애초에 존재할 수 없는 구조. GH Actions 최근 scheduled
workflow(`health-alert`/`runtime-error-alert`/`deploy-drift-alert`/`heartbeat-stale`)
30건 전부 success, CI 전부 green — 새 incident 신호 0건.

**결론**: 사례 32 는 `daily.ts` verify 분기 국소 버그였고 형제 flag/MLB 파이프라인
으로 전파된 흔적 없음 — family sweep 정상 종료(PARTIAL, 코드 변경 0). 다음
explore-idea heavy 재개 시 BrierTrendChart 등 착수하려면 `SR_ORDER`/`VERSION_ORDER`
generalize(league 별 order+color prop화) 선행 설계 필요 — 스코프 큰 별도 착수 권장.

## ✅ explore-idea(heavy) — MLB rolling 적중률 추세 차트 parity (cycle 2181, 2026-08-18)

no forced trigger (open issue/approved plan 0건, 2-chain lock 없음, review-code
5연속 partial 근접) — cycle 2180 backlog(잔여 5개: BrierTrendChart/
ScoringRuleDayHeatmap/RollingAccuracyChart/CohortComparisonHeatmap/
TeamBiasTable/ModelVersionHistory) 재검토 후 RollingAccuracyChart 선정
(`buildRollingAccuracy()` 가 scoring_rule/era 종속 없이 PredRow[] 만 받아
WinnerProbBucketChart 와 동일하게 가장 이식 쉬움).

`buildMlbAccuracySummary()` 에 `rollingAccuracy` 필드 추가(기존
`buildRollingAccuracy(rows)` 그대로 재사용, 쿼리 중복 없음).
`RollingAccuracyChart` 에 locale prop 신규(default 'ko', KBO 호출부 무변경) →
en/mlb/accuracy 영문 렌더(축 라벨/기준선/툴팁 전부 영문) 정상. 테스트 1건
추가(오늘 날짜 기준 window n=3 non-null 검증), 전체 type-check/lint/
vitest(447/3888) 통과, main 직접 push(commit 6388a554).

**다음 explore-idea heavy 후보 (backlog 잔여 4개)**: BrierTrendChart(KBO era별
색상 매핑 의존 — MLB 전용 scoring_rule 색상 체계 필요, 스코프 큼) /
ScoringRuleDayHeatmap(scoring_rule 축 의존, MLB 버전 정책 확인 필요) /
CohortComparisonHeatmap(scoring_rule × 주차 — 동일 이유) / TeamBiasTable(MLB
standings win% 소스 확인 필요) / ModelVersionHistory.

## ✅ explore-idea(heavy) — MLB 확률 bucket 보정 차트 parity (cycle 2180, 2026-08-18)

no forced trigger (open issue/approved plan 0건, review-code 5연속 partial cooldown 진입,
2-chain lock 없음) — cycle 2176 backlog(KBO `/accuracy` 7개 컴포넌트 중 MLB 미구현)
재검토 후 WinnerProbBucketChart 선정(scoring_rule/era 종속 없어 가장 이식 쉬움).

`buildMlbAccuracySummary()` 기존 PredRow[] 재사용 + `buildWinnerProbBuckets()` 호출로
`winnerProbBuckets` 필드 추가(쿼리 중복 없음). `WinnerProbBucketChart`에 locale prop
신규(default 'ko', KBO 호출부 무변경) → en/mlb/accuracy 영문 렌더 정상. 테스트 1건 추가,
전체 type-check/lint/vitest(447/3887) 통과, main 직접 push(commit febe1de4).

**다음 explore-idea heavy 후보 (backlog 잔여 5개)**: BrierTrendChart(KBO era별 색상
매핑 의존이라 MLB 이식 시 MLB 전용 scoring_rule 색상 체계 필요 — 스코프 큼) /
ScoringRuleDayHeatmap / RollingAccuracyChart / CohortComparisonHeatmap / TeamBiasTable
(MLB standings win% 소스 확인 필요) / ModelVersionHistory.

## ✅ fix-incident 완료 — verify cron 영구 봉인 버그, KBO 25경기 9일+ scheduled 고착 (cycle 2179, PR #2963)

**사례 32** (`memory/drift-cases.md`) 참조. WebSearch 로 08-05~09 KBO 리그
폭염 임시중단(08-11 재개) 확인 → 25게임 `status='postponed'` backfill +
`daily_notifications.results_sent` 5일치 리셋. `daily.ts` verify 분기에
`allGamesTerminal` 가드 추가해 재발 차단 (신규 vitest 2건). **미해소 잔여
1건**: Sentry/Telegram 실제 발화 여부 — API 미인증이라 이번 세션 확인 불가,
다음 세션이 Sentry 대시보드 직접 확인 필요.

## 🟡 review-code(heavy) — silent-drift-family 스코프 감사 3축, 버그 미발견 (cycle 2177, 2026-08-18)

no forced trigger (open issue/approved plan/gap-chain 전부 미충족, 2-chain lock 없음) — 자유
판단. cycle 2173(색상토큰+소표본가드) 이후 남은 축 3개 감사:

1. **josa() 영문 토큰 받침 lookup gap**: `packages/shared/src/korean.ts` 의
   `ENGLISH_TOKEN_HAS_BATCHIM` 은 KBO 팀 약어(SSG/KIA/LG/KT/NC/SK) + 세이버메트릭스
   약어(FIP/XFIP/WOBA/WAR/ELO/SFR) 만 등록 — MLB 팀 short name(Yankees/Dodgers 등) 은
   미등록이라 `?? false` fallback(받침 없음)으로 처리됨. 현재는 MLB 30팀 short name 이
   전부 복수형(-s 로 끝남 → 한국어 표기 시 항상 받침 없는 "스/즈" 로 끝남)이라 결과적으로
   우연히 전부 정답 — **살아있는 버그 아님**, 실사용 josa() 호출부(`MlbGameOverview.tsx`)
   전수 확인 완료. 향후 도시명/구장명 등 비복수형 영단어에 josa() 를 새로 적용할 경우
   재검토 필요(현재 그런 호출부 0건, 예방적 수정은 미시행 — "일어날 수 없는 case 방어"
   회피 원칙 정합).
2. **MLB convergence pick 소표본 gate**: `getMlbConvergencePickTeamStats` →
   `computeConvergenceTeamStats(results, CONVERGENCE_TEAM_STATS_MIN_PICKS)` 로 KBO 와
   동일 min-picks 필터 적용 확인. `/mlb/team/[code]/page.tsx` 호출부도 strong/complete
   양쪽 threshold 정상 배선 — drift 없음.
3. **EN 미러 한국어 누출 grep**: `en/mlb/team/[code]` 2줄, `en/mlb/games/[date]/[slug]`
   10줄에서 한글 매치 — 전부 개발자 주석(wave 번호/KO page.tsx 대응 설명)이고 렌더링되는
   사용자 가시 문자열 아님. false positive, drift 아님.
4. **brand-950 residue**: cycle 2170 fix 이후 전체 재검색 0건 — 완전 정리 확인.

버그 0건 발견 (PARTIAL). josa() gap 은 실사용 영향 없어 fix 없이 문서화만.

## ✅ explore-idea(heavy) — MLB 팩터별 적중률 테이블 parity (cycle 2176, 2026-08-18)

no forced trigger (open issue/approved plan/gap-chain 전부 미충족) — 자유 판단 진단에서
KBO `/accuracy` 의 FactorAccuracyTable(팩터별 적중률) 이 MLB `/mlb/accuracy` 엔
없던 gap 발견. MLB predictions 는 KBO 의 정규화 factors JSONB(0.5 중심) 대신
home_*/away_* 원본 스탯 플랫 컬럼 저장이라 KBO buildFactorAccuracy 재사용 불가
(elo/recent_form/head_to_head/defense_sfr 4팩터는 plan #24/#25 기존 결론대로 계속
제외 — 실데이터 없는 placeholder 재검토 아님).

`buildMlbFactorAccuracy.ts` 신규(home/away 값 직접 비교, 7개 유효 팩터) +
`FactorAccuracyTable.tsx` sport/locale prop 추가(KBO 호출부 기본값 무변경) +
`/mlb/accuracy`·`/en/mlb/accuracy` 양쪽 배선. 테스트 8건 신규, 전체
type-check/lint/vitest(447 files/3887 tests) 통과. PR #2962 머지(cd715282).

**다음 후보(scope 밖, backlog)**: KBO `/accuracy` 의 BrierTrendChart/
ScoringRuleDayHeatmap/RollingAccuracyChart/WinnerProbBucketChart/
CohortComparisonHeatmap/TeamBiasTable/ModelVersionHistory 도 MLB 미구현 —
과다확장 회피 위해 이번 사이클은 1개 컴포넌트만 scope.

## ✅ lotto(lite) — 1237회 OOS 검증 + 1238회 count_smoke (cycle 2175, 2026-08-18)

trigger 6 (마지막 lotto 발화 cycle 2145 → 30-cycle gap 도달) + trigger 3 (직전 1237회
추첨 2026-08-15 이후 OOS 검증 박제 부재, `2026-08-15-result.md` 빈 파일) 동시 충족.

`pnpm tsx scripts/lotto.ts count` 재실행 — 1237회차 캐시 확인, 256규칙 유효조합
7,705,415/8,145,060 (제거 5.40%) 변화 없음. 1237회 당첨번호(10 20 23 34 37 40 +보너스36)
대 cycle 2041 생성 50세트 매칭: 0개 8건 / 1개 28건 / 2개 13건 / **3개 일치 1건**
(31번 세트 `10 34 38 39 40 41`, 5등 수준) / 4개+ 0건. 무작위 기댓값(3개+ 일치 ≈1.87%)
수준 — 256규칙 필터 우위 증거 없음, 기존 결론 유지 (OOS 누적 N=10→11).

1238회(2026-08-22) 50세트는 이미 cycle 2145 가 박제 완료(`2026-08-22-50sets.md`) —
신규 픽 생성 불필요. `2026-08-15-result.md` 작성으로 OOS 검증 공백 해소.

execution.results 5 field: count_smoke=OK(98.6s) / valid_delta=0(규칙 변경 없음) /
new_rules=0 / pick_sample=기존 재사용(신규 생성 X) / self_verify=OK(매칭 분포 위 표).

## ✅ fix-incident(lite) — carry-over 재검증 + 전체 헬스체크, 신규 incident 0건 (cycle 2174, 2026-08-18)

cycle 2140 fix-incident retro 가 남긴 후속 후보("헤더 nav label 자체가 여전히 한국어
하드코딩... aria-label 도 동일 국제화 후속 대상")를 이번 사이클 착수 대상으로 검토 —
`Header.tsx`/`NavLinks.tsx`/`MobileNav.tsx`/`LeagueSelector.tsx`/`SearchForm.tsx`/
`ThemeToggle.tsx` 직접 read 결과 **이미 전부 해소됨** 확인. `git log` 대조 결과
wave-627(`feat(nav): 헤더/모바일메뉴/리그셀렉터 EN 텍스트 i18n`)/wave-628(`fix(nav):
SearchForm 헤더 검색창 EN 텍스트 i18n`)/wave-630(`fix(nav): CookieConsent/ThemeToggle
EN i18n 누락 수정`) 3개 커밋이 cycle 2140 이후 이미 커버 — 신규 작업 불필요
(`feedback_diagnose_existing_artifacts_first` 메모리 룰 적용, 헛수고 회피).

carry-over 소진 확인 후 전체 헬스체크 전환: `gh run list` CI 전부 green, scheduled
workflow(`health-alert`/`runtime-error-alert`/`deploy-drift-alert`/`heartbeat-stale`)
전부 success — cycle 2114 turbo-ignore 배포 fix 의 "다음 관찰 포인트"(deploy-drift-alert
정상 재개) 도 이번에 확인 완료. review-code(heavy) 는 cycle 2173 이 "다음 후보 없음"
명시해 이번엔 회피, fix-incident 재선택 — 신규 incident 0건, 진짜 버그 아님 (cycle
2167/2172 와 동일 패턴).

## ✅ review-code(heavy) — MLB 신규 라우트 silent-drift-family 스코프 감사, 버그 미발견 (cycle 2173, 2026-08-18)

cycle 2170 polish-ui carry-over("brand-950 외 다른 미정의 토큰 없는지 전수 grep")
+ cycle 2149/2150 review-code carry-over(소표본 가드 누락 family) 두 축으로 최근
93 cycle 간 신규 추가된 MLB 라우트(`mlb/standings`, `mlb/calendar`, `mlb/factors`,
`mlb/matchup/[teamA]/[teamB]`, `mlb/team/[code]`) 스코프 감사.

**색상 토큰 축**: `text-/bg-(blue|green|emerald|purple|indigo...)` grep 5건 발견 →
KBO parity 대조 결과 전부 정당: `mlb/calendar` accuracyClass 3-tier(brand/yellow/red)
= KBO `calendar/page.tsx` 와 완전 동일 함수 패턴. `mlb/matchup` yellow-600 rate
tier = KBO matchup 337행과 동일. `mlb/standings` 파크팩터 orange/blue 배지 +
`mlb/factors` 가중치 emerald 배지 = KBO 쪽엔 대응 페이지 자체가 없어(KBO
`teams/page.tsx` 는 파크팩터를 배지 없는 평문으로만 표시) "기존 브랜드 색상에서
이탈"이 아니라 MLB 전용 신규 semantic — silent drift 요건(기존 컨벤션 대비 이탈)
불충족.

**소표본 가드 축**: `mlb/team/[code]` 는 `SMALL_SAMPLE_N` 가드 존재. `mlb/matchup`
predictionAccuracy 표시는 가드 없음 — 그러나 KBO `matchup/page.tsx` 도 동일하게
가드 없음(대조 결과 106~346행 동일 구조) = MLB 전용 regression 아니라 기존
KBO/MLB 공통 pre-existing 패턴. 스코프 밖 별도 이슈로 남길 실익 없음(둘 다 동일
동작이라 이번 사이클 fix 대상 아님).

**결론**: 감사 완료, 신규 버그 0건. carry-over 두 항목(brand-950 후속 grep, 소표본
가드 family) 모두 이번 사이클로 해소. 다음 review-code(heavy) 후보 없으면 진단
free judgment.

## ✅ fix-incident(lite) — 로컬 dev 전역 dynamic route 404 재현+해소, 코드 버그 아님 (cycle 2172, 2026-08-18)

cycle 2171 carry-over("`/mlb/team/LAD` 로컬 404, prod 정상, 조사 필요") 재현 조사.
MLB뿐 아니라 KBO 쪽(`/teams/HH`, `/players/1`, `/matchup/HH/LG`)도 동일하게 전부
404 — valid/invalid 팀코드 무관 = 앱 로직(`notFound()`) 문제가 아니라 라우터 레벨
미매칭. 원인 = stale Turbopack `.next` 캐시. 캐시 삭제 후 재시작 → 전부 200 정상
복구, 코드 변경 0. `memory/drift-cases.md` 사례 31 박제(개별 라우트 1개 404 =
앱 버그 의심 / 여러 무관 라우트 동시 404 = 캐시 의심, 진단 순서 구분).

Tier 3 carry-over(cycle 2171 flag, 미착수): 전체 KBO-parity 강도-등급 서술 MLB
포팅 — 신규 MLB 리그 평균 캘리브레이션 상수 계산이 선행 조건(현재 0건).

## ✅ explore-idea(heavy) — MLB DetailedFactorAnalysis parity (cycle 2171, 2026-08-18)

cycle 2170 retro "review-code 또는 explore-idea free judgment" 따라 시작. KBO
`/analysis/game/[id]` 임포트를 MLB game-detail 페이지와 diff해 4개 컴포넌트 gap 발견:
`AgentArgumentBox`/`JudgeVerdictPanel`/`PostviewPanel`/`DebateTimeline`(LLM debate
파이프라인 산출물 — MLB는 debate 단계 자체가 없어 구조적으로 제외 확인, `mlb-overview.ts`
주석에 이미 명시됨) + `GameAnalysisProse`(이미 cycle 2104 `MlbGameOverview`로 parity
완료 — 최초 진단이 놓쳤던 기존 구현) + `DetailedFactorAnalysis`(진짜 gap, MLB는
raw dl grid만 있고 가중치%/우세 판정/기여도%p/서술 없음).

**당초 계획했던 넓은 스코프(KBO `explainFactor` 급 강도-등급 서술 전체 포팅)는
자가 검증에서 reject** — KBO 서술 임계 상수(`SP_AVG_FIP_DUEL`/`WAR_STRONG` 등)는
KBO 리그 평균으로 캘리브레이션된 값이라 MLB에 그대로 재사용하면 리그 평균이 다른
투수/타자를 잘못된 강도로 서술할 위험(현재 저장소에 MLB 전용 리그평균 상수 0건
확인). 캘리브레이션 없는 재사용은 domain-incorrect 서술을 만들 Tier 3 리스크로
판단해 축소.

**실제 구현(Tier 1, 캘리브레이션 불필요)**: `computeMlbWaterfall`이 이미 산출한
bar(contribution/direction)만 소비하는 사실 비교형 서술로 스코프 축소 — "강함/약함"
같은 등급 주장 없이 "{label}에서 {team} 우세({pp}%p)"만 생성. 신규
`packages/kbo-data/src/factors/mlb-factor-detail.ts::buildMlbFactorDetailRows`
(순수 함수, 신규 계산/DB 조회 없음 — `MlbFactorWaterfallChart`/`MlbGameOverview`와
동일 input 재사용) + `mlb-overview.ts`의 `toSentence`/`NARRATIVE_MIN_PP` export해
문구 재사용(GameOverview 요약과 DetailedFactorAnalysis 개별 행이 다른 wording으로
갈라지는 drift 방지). 신규 `MlbDetailedFactorAnalysis.tsx`가 ko/en MLB game-detail
페이지의 기존 raw dl 그리드(`FactorRow`, park_factor/home_advantage/final 제외
7팩터 — cycle 2108 self-sync 패턴 그대로 유지)를 대체.

**검증**: kbo-data 신규 6 test(비대칭/중립/null pair/포맷팅/en locale), 모노레포
type-check/lint clean, moneyball 3879 tests 유지(회귀 없음). 로컬 dev 서버로 실측
렌더 시도했으나 `/mlb/team/LAD` 등 내 변경과 무관한 기존 nested dynamic route도
전부 로컬에서만 404(prod `moneyballscore.vercel.app` 동일 경로는 200) —
사전 존재하는 로컬 dev 환경 이슈로 확인(내 diff 범위 밖), 다음 fix-incident 후보로
flag만.

**다음 fire 후보**: 로컬 dev 서버 `/mlb/*` nested dynamic route 404(환경 이슈, prod
정상) 원인 조사 — fix-incident. MLB 전용 리그평균 캘리브레이션 상수 신규 도출해
강도-등급 서술(KBO parity 완전판) 확장 여지는 남겨둠(Tier 3, 별도 결정 필요).

## ✅ polish-ui(heavy) — dark mode brand-950 토큰 drift 수정 (cycle 2170, 2026-08-18)

cycle 2169 retro "review-code 또는 polish-ui free judgment" 따라 polish-ui 선택
(신규 MlbRivalryMemorySurface 디자인 점검 목적 + review-code 3연속 partial 이후
diminishing return 회피). 실측: agent_memories MLB row 0건이라 해당 컴포넌트는
현재 렌더 자체가 null(기능 정상, 검증 불가) — 대신 게임 상세 페이지 다크모드
스크린샷 비교 중 바로 아래 "최근 같은 대결"(HistoricalAnalogMatchup parity) 카드가
흰 배경으로 남는 실제 회귀를 발견.

**원인**: `globals.css` 색상 스케일은 `brand-50~900` 까지만 정의(DESIGN.md 표에도
900 까지만 명시) — `brand-950` 은 존재한 적 없는 토큰인데 `dark:bg-brand-950`
클래스가 11개 파일 23곳에서 사용됨(Tailwind 가 매칭 CSS 변수를 못 찾아 유틸리티
자체가 생성 안 됨 → 다크모드에서도 라이트모드 배경 그대로 노출). 소스는 KBO
`HistoricalAnalogMatchup.tsx`(기존 코드, review-code heavy 3연속 감사에서도
미발견 — 다크모드 실측 스크린샷 없이는 grep 만으로 못 잡는 유형) — MLB parity
작업(cycle 2164)이 그대로 복사하며 확산(mlb 허브 2개 언어, 게임 상세, changelog,
LanguageSwitch, v2-shadow-monitor 등).

**해결**: DESIGN.md 가 실제 정의하는 다크모드 카드 배경 토큰 `--color-surface-card`
(코드베이스 전역 기존 패턴)로 일괄 치환. type-check/lint 클린, 3879 tests 전체
통과, 다크모드 전/후 스크린샷 실측 확인(게임 상세 + MLB 허브), 라이트모드 회귀 없음.
PR #2960 squash 머지(eb675e1b).

**교훈**: review-code(heavy) 의 코드 read 기반 감사는 "존재하지 않는 CSS 토큰
참조"를 grep 으로 잡기 어려움(문법상 유효한 Tailwind 클래스 이름이라 정적으로
안 튐) — 실측 다크모드 스크린샷 비교가 유일한 발견 경로. polish-ui 의
디자인 실측 채널이 review-code 의 코드 채널과 다른 버그 클래스를 잡는다는
근거(silent drift family 신규 sub-pattern).

## ✅ explore-idea(heavy) — MLB rivalry-memory parity 신규 구현 (cycle 2169, 2026-08-18)

cycle 2168 retro "review-code 또는 explore-idea free judgment" 따라 explore-idea 선택
(review-code(heavy) 3연속 partial 버그 미발견 — diminishing return, cycle 2164 이후
explore-idea 5 cycle 공백). KBO↔MLB parity 스윕(Feature-Drift Cycle) 지속 — 지난
사이클들이 HistoricalAnalogMatchup/EN summary 는 이식했지만 `RivalryMemorySurface`
(agent_memories 기반 라이벌리 메모리 카드)는 미검토 상태였음(cycle 2165 review-code
가 "다음 explore-idea 가 가치 판단 시 고려 가능"으로 명시적 flag).

**진단 과정에서 발견한 3개 설계 gap** (순수 재사용 불가, 신규 구현 필요했던 이유):
1. MLB `predictions.is_correct` 는 항상 NULL(의도된 설계, deriveMlbOutcome.ts) —
   KBO `generateAgentMemories` 는 `is_correct=false` 필터에 의존해 그대로 재사용 불가.
2. MLB `predictions.factors` JSON 컬럼 자체가 없음 — discrete `home_sp_fip` 등
   breakdown 컬럼만 저장(cycle 2065). 게다가 이 값들은 KBO factors JSON과 달리
   0.5 중심 정규화 값이 아니라 raw stat — `buildMemoryForTeam`(NEUTRAL_FACTOR=0.5
   가정)에 직접 넣으면 무의미한 숫자가 나옴.
3. MLB 는 verify 모드 자체가 없음(mlb_walk_forward_measure 만 존재) — 신규 cron mode
   추가는 Cloudflare Worker dispatch 설정도 손대야 해 스코프 밖.

**해결**: `mlb-base.ts` 를 순수 리팩터(computeMlbFactorContributions 신규 export,
computeMlbProbability 는 동일 결과 유지 — 기존 테스트로 회귀 확인)해 14개 factor
term 을 개별 노출. 신규 `agents/mlb-retro.ts::generateMlbAgentMemories` 가 persisted
breakdown 컬럼으로 contribution 재구성(park_factor 는 MLB_TEAMS 실측 재계산) →
NEUTRAL_FACTOR 중심으로 shift 해 `buildMemoryForTeam` 그대로 재사용. elo/recent_form/
head_to_head/defense_sfr/sp_xwoba_against/woba_std 는 placeholder-neutral이라 후보에서
명시적 제외(elo 는 HOME_ELO_BONUS 고정항 때문에 "항상 같은 가짜 신호"가 될 위험이 있어
별도 제외 처리). 신규 cron 배선 없이 `mlb_walk_forward_measure`(이미 final-game 조인 보유)
안에 얹어 호출.

프론트: `RivalryMemorySurface.tsx` 에 `league` param 추가(default 'kbo', 하위 호환)
+ 신규 `MlbRivalryMemorySurface.tsx`(ko/en locale) → MLB game detail 페이지 ko/en
양쪽에 `MlbHistoricalAnalogMatchup` 앞에 배선(KBO 순서 3a→3b 그대로).

**검증**: kbo-data 신규 6 test(mlb-retro) + 기존 mlb-base/mlb-pipeline 전체 회귀
그린, moneyball 3879 tests 유지, `pnpm run type-check`/`lint` 모노레포 전체 clean.
현재 agent_memories 에 MLB row 0건(신규 기능이라 당연) — 다음 MLB 오답 경기 발생 시
walk-forward 크론이 자동 채움, 렌더 즉시 확인은 불가(경기 결과 대기 필요).

**다음 fire 후보**: review-code(heavy) 또는 다른 explore-idea (2-chain lock 없음,
직전 8사이클 distinct=5 유지 중).

## 📊 operational-analysis(lite) — CE cohort n=311 정체 원인 규명, 실제 incident 아님 (cycle 2168, 2026-08-18)

open issue/승인 plan 0건 + review-code 11/20(55%) dominance + 3연속 partial(2163/2165/2166)
diminishing return + saturation 11/15(<12) → 다양성 redirect 로 operational-analysis 선택.
직전 fire(cycle 2146) 대비 op-analysis 25-gap 미도달(22)이지만 "데이터 신선도" 축으로
`op-analysis-ce-cohort.ts` 재실행해 CE/비CE n 이 22 사이클 (여러 날) 째 정체(n=311, CE=264/
비CE=47 동일)인 원인 조사.

**조사 과정**: predictions 테이블 직접 쿼리 — 오늘(08-18) KBO `scoring_rule='v1.8'` 신규
row 들이 `debate_version='v1-narrative'`(07:18 UTC 최초 null → 10:11 UTC 갱신 시
'v1-narrative') 로 찍혀 있어, CE 스크립트의 CE/비CE 분류(CE=null, 비CE='v2-persona4')
어디에도 안 들어가는 **제3의 값** 발견 — 처음엔 "CE 상태 변화 silent 미반영" 의심.

**실제 원인 (오탐 배제)**: `debate_version='v1-narrative'` row 들의 `reasoning` 필드가
`isTop`/`inning`/`awayScore`/`homeScore`/`scoreDiff`/`preGameHomeProb`/`adjustedHomeProb`
키만 가짐 — pre_game LLM debate 예측이 아니라 **경기 중 실시간 win-prob 갱신 write
경로**(별도 기능, 2026-04-14 부터 존재하는 historical 데이터). 리포 전체 grep(`v1-narrative`)
결과 현재 코드베이스 어디서도 이 문자열을 참조하지 않음 — 과거/외부 기록일 뿐 현재
active write path 아님. CE 코호트 스크립트가 이 row 들을 카운트 안 하는 게 **의도대로
정상 동작**(pre_game 분류 기준과 무관한 데이터가 애초에 안 걸러지는 게 맞음).

n=311 정체 자체도 정상: `op-analysis-ce-cohort.ts` 는 검증 완료(`is_correct` not null)
예측만 집계 — 오늘 생성된 신규 `v1.8`+`debate_version=null` pre_game row(game_id
10277~10281, 07:18 UTC)는 경기가 아직 안 끝나 미검증 상태라 당연히 코호트에 안 잡힘.
CE cohort 성장이 실제로 멈춘 게 아니라 검증 지연(경기 종료 대기)일 뿐.

**결론: incident 아님, 코드 변경 0.** CREDIT_EXHAUSTED 상태 판단(CLAUDE.md "debate 100%
fallback → conf=0.3")도 이번 조사로는 뒤집히지 않음 — `debate_version='v1-narrative'`
는 별개 기능의 레거시 데이터라 CE 해소 evidence 아님. 다음 fire 후보: op-analysis
25-gap 자연 도달 시 재측정(전체 n 재계산) 또는 review-code/explore-idea 자유 판단
(2-chain dominance 완화 목적 redirect 유지).

## 🩺 fix-incident(lite) — 20-cycle gap 헬스체크, 신규 incident 0건 (cycle 2167, 2026-08-18)

fix-incident 마지막 발화 cycle 2147 → gap=20 (trigger 7 충족) + open issue/승인 plan
0건 + 2-chain lock 없음(직전 8사이클 distinct=3) → lite 자동 권장 따라 점검 실행.

점검 항목: (1) `gh run list` 최근 15건 — health-alert/runtime-error-alert/deploy-drift-alert
scheduled workflow 전부 success, CI Failure Dispatch 전부 skipped(트리거 없음) (2)
daily-pipeline.yml 은 2026-04-29 GH Actions schedule 영구 비활성화 후 Cloudflare Worker
cron 이 primary — workflow_dispatch 전용이라 gh run list 공백은 정상 (3) `pipeline_runs`
REST 조회 (오늘 08-18) — predict 모드 predictions=0 다건 관찰됐으나 `shouldAlertSilentDrift`
설계상 predict 모드는 게이트 대상 아님(predict_final/verify/postview 만) + 아침 07:18 UTC
런이 이미 5건 생성 → 후속 predict 런의 0건은 기존 idempotent skip (정상, 사례 11 family
아님) (4) predict_final/verify 최근 5일(08-13~08-17) predictions=0 반복 관찰 — 이는
`existingPredictionsCount` coverage 로직상 아침 predict 5건이 이미 충족해 alert 미발화
= 설계대로 (5) lotto-pick-update 08-07/08-08 failure 2건 발견했으나 cycle 2137 lotto(lite)
헬스체크에서 이미 확인/회복(08-14~08-15 success 재개, 별도 fix 불필요 — stale 과거 실패).

결론: **신규 incident 없음.** 20-cycle 주기 보정 트리거의 목적(장기 미점검 공백 차단)
자체가 충족 — 코드 변경 0. gap counter 리셋.

## 🔍 review-code(heavy) — MLB matchup 라우트 KBO 버그 패턴 이식 점검, 버그 미발견 (cycle 2166, 2026-08-18)

fix-incident(19/20)/op-analysis(20/25)/info-arch(13/30)/lotto(21/30) 전부 gap 미도달 +
open issue/승인 plan 0건 + 2-chain lock 없음(직전 8사이클 distinct=3) → cycle 2165 retro
"explore-idea or fix-incident free judgment" + cycle 2161이 KBO matchup에서 방금 고친
버그 2건(dead FK 컬럼 predicted_winner/winner_team_id 미사용 + EN buildSummaryEn() 4개
절 누락)이 MLB matchup 자매 코드(`buildMlbMatchupProfile.ts`, wave-628 dedup으로 KBO와
공유 리팩터 이력 있음)에도 있는지 pattern-transfer 점검.

점검 결과: **양쪽 다 미해당.** (1) `buildMlbMatchupProfile.ts`는 DB에서
predicted_winner/winner_team_id 같은 raw FK 컬럼 자체를 select 안 함 — `home_win_prob`
+ 실제 스코어로 `deriveMlbOutcome()` 직접 derive(cycle 2066 fix) 구조라 dead 컬럼
자체가 존재 불가. (2) MLB EN summary(`buildSummaryEn()`,
`en/mlb/matchup/[teamA]/[teamB]/page.tsx`)는 이미 recentRecord/blowout/closeGame/
homeAwayEdge 4절 모두 포함 — KBO가 최근까지 갖고 있던 누락이 여기엔 없음(별도
builder라 KBO fix 자동 전파는 안 됐지만 애초에 완전했음). 부수적으로 최신
미감사 파일(`MlbMatchupConvergencePickRecord.tsx` phase 3c wave-633,
`computeMlbCompositeDuel.ts` 6팩터 게이트)도 훑음 — netScore 최대치 6
(woba/bullpen_fip/sp_fip/sp_xfip/war/park_factor) = MLB_FACTOR_PICK_COMPLETE(6)와
정확히 일치, dead threshold 아님. 코드 변경 0.

## 🔍 review-code(heavy) — cycle 2164 신규 MLB historical-analog 파일 감사, 버그 미발견 (cycle 2165, 2026-08-18)

fix-incident(18/20)/op-analysis(19/25)/info-arch(12/30)/lotto(20/30) 전부 gap 미도달 +
open issue/승인 plan 0건 + 2-chain lock 없음(직전 8사이클 distinct=3) → cycle 2164가
막 추가한 `fetchMlbHistoricalAnalogs.ts`/`MlbHistoricalAnalogMatchup.tsx`를 Feature-Drift
Cycle 패턴(explore-idea 직후 review-code 감사) 따라 audit.

점검 항목: (1) KBO `HistoricalAnalogMatchup.tsx` 대비 fetch/derive 로직 parity —
`deriveMlbOutcome`(cycle 2117/2160 이미 감사 완료) 재사용 확인, `toMlbStatsApiCode`/
`normalizeMlbTeamCode` alias 왕복 정합(사례 22/27 회귀 없음) (2) 컴포넌트 내 slug 생성
(`${homeCode}-vs-${awayCode}`)이 `/mlb/games/[date]/[slug]/page.tsx`의 strict
home/away eq 매칭과 순서 일치 — team page(`slugA-vs-slugB`)와 동일 컨벤션 (3) ko/en
페이지 양쪽 배선 props(`homeTeam`/`awayTeam`/`externalGameId`/`asOfDate`) 일치 (4)
KBO vs MLB 페이지 컴포넌트 diff — LLM debate 계열(DebateTimeline/PostviewPanel/
JudgeVerdictPanel/RivalryMemorySurface 등)은 predict_final quant-only 게이트(plan #25
Phase 3)로 의도적 제외, FactorWaterfall/GameOverview/HistoricalAnalog는 parity 확보
확인 (5) 테스트 커버리지(`fetchMlbHistoricalAnalogs.test.ts` 6 case, alias 회귀 가드
포함) 충분.

**결과: 버그 미발견.** cycle 2164 구현이 기존 감사 완료 로직(deriveMlbOutcome,
toMlbStatsApiCode)을 정확히 재사용했고 slug/props 정합도 맞음. 코드 변경 0.
RivalryMemorySurface류 agent-memory 기반 섹션은 MLB parity 범위 밖(별도 스코프 —
강제 아님, 다음 explore-idea가 가치 판단 시 고려 가능).

## ✅ explore-idea(heavy, scoped) — MLB 게임 상세 과거 대결 parity + 미푸시 커밋 발견 (cycle 2164, 2026-08-18)

cycle 2163 review-code(heavy) 가 "다음 fire 후보: explore-idea 또는 fix-incident"로 남긴
carry-over 따라 explore-idea 선택. fix-incident/op-analysis/lotto/info-arch 전부 gap
threshold 미도달(17/18/19/11 각각 20/25/30/30) + CI green + open issue/승인된 plan
0건이라 순수 신규 스코프 탐색. cycle 2107이 KBO analysis/game/[id] 대비 MLB game
detail parity를 점검하며 ShareButtons+RelatedLinks만 추가했었는데,
`HistoricalAnalogMatchup`(같은 두 팀 과거 대결 3건)은 debate/postview류와 달리 순수
팩트(스케줄+확률) 기반이라 MLB predict_final quant-only 게이트와 무관하게 이식 가능함을
재확인 — 그동안 검토 대상에서 빠져 있던 진짜 gap.

`fetchMlbHistoricalAnalogs.ts`(mlb_schedule+predictions 조인, buildMlbMatchupProfile.ts의
or-filter 패턴 재사용 + deriveMlbOutcome 재사용) + `MlbHistoricalAnalogMatchup.tsx`
(KBO 컴포넌트와 동일 UI, ko/en) 신규. KO/EN game detail 페이지 양쪽 배선 + 회귀 가드
테스트(신규 파일 1 + 기존 스케줄-쿼리 테스트 2건 확장). vitest 446/3879(+7) / tsc /
eslint 전부 clean. main 직접 push, CI green 실측 확인(run 32127517749 success).

**부수 발견**: 커밋 전 `git status`에서 cycle 2163의 커밋 2건(policy retro + docs
todos)이 origin에 push 안 된 상태 발견(origin HEAD가 cycle 2162에 멈춰 있었음) —
본 cycle 커밋과 함께 push해 해소. cycle 2163이 "코드 변경 0"이라 판단해 push 스텝을
건너뛴 것으로 추정(R7 자동 머지는 PR 경로 전제라 direct-push 경로엔 명시적 push 스텝이
없어 silent skip 가능 — 사례 18(cycle 2001 R7 --auto 미실행) 과 유사 계열, direct-push
cycle에서도 "코드 변경 0"이면 push 자체를 생략하는 실수가 재발 가능하니 다음 review-code
heavy가 참고).

## 🔍 review-code(heavy) — 감사 결과 버그 미발견, 건강 확인 (cycle 2163, 2026-08-18)

직전 3연속 review-code(heavy) 가 발견한 silent drift family(Barrel% 스케일,
confidence 이중 변환, matchup dead column) 패턴이 인접 영역에도 있는지 폭넓게
재점검. confToWinProb 전체 사용처 재검증(`mlb/games/[date]` 의
`TOP_PICK_MIN_WIN_PCT` 는 임계값 상수 변환용이라 스케일 정상 — false alarm),
`buildMlbMatchupProfile.ts`/`buildMlbTeamProfile.ts` 전문 감사(KBO 대비 dead
column 없음), 타구 프로파일 렌더링 null-safety, KO/EN games/[date] parity,
standings/postseason/wild-card/factors/accuracy quick grep, methodology
하드코딩 n 재확인 — 전부 이상 없음. vitest 445/3872 + tsc + eslint 전부 clean.

버그 없는데 억지 fix 안 만듦. 코드 변경 0, 커밋 0. 다음 fire 후보: explore-idea
또는 fix-incident (gap=17, 다음 cycle 20-gap 임박).

## ✅ polish-ui(heavy) — 색상 토큰 drift + MLB IA 결정 문서 stale (cycle 2162, 2026-08-18)

2-chain alternation lock (직전 8 cycle review-code/explore-idea distinct=2) 발동 →
잠긴 두 chain 제외 후 polish-ui 강제 발화. DESIGN.md 토큰 vs 컴포넌트 grep:
`FactorWaterfallChart.tsx`/`MlbFactorWaterfallChart.tsx` 의 away-direction 바 색상이
하드코딩 `#dc2626`(미문서) — DESIGN.md 명시 semantic error 토큰(`#ef4444`,
`--color-error` CSS var 이미 존재)로 정렬.

grep 확장 중 훨씬 큰 발견: `DESIGN.md ## Future / MLB IA` 섹션 + 결정 1-pager
(`docs/decisions/mlb-vs-kbo-priority.md`) 가 여전히 cycle 1021 결정("(B) KBO 우선
강화 / MLB sub-route 박제 금지 lock")을 현재로 서술 중이었으나, cycle ~1450+
explore-idea(heavy) 다수 fire(plan #24/#25)로 games/team/matchup/factors/standings/
accuracy/players/calendar/wild-card/postseason 전체 sub-route + en/ 미러가 이미
구현·배포됨. `Header.tsx` `MLB_NAV` 도 문서 주장("단일 link")과 달리 이미 3-group
구조. lock 이 escalation 절차(waitlist N≥30/100) 없이 silent superseded — 두 문서
모두 실측 기준 정정(코드 동작 변경 X, 문서 truth-alignment only).

vitest 445 files/3872 tests + tsc + eslint clean. main 직접 push (`69d89f38`),
CI green 실측 확인 (`gh run view` poll to completion, cycle 2001 룰 적용).

다음 fire 후보: lock 해제됨 — review-code/explore-idea 자유 판단. fix-incident
20-gap 근접 (마지막 발화 cycle 2147, cycle 2167 도달 예정).

## ✅ review-code(heavy) — matchup 영역 carry-over 2건 (cycle 2161, 2026-08-18)

cycle 2160 이 스코프 밖으로 미룬 carry-over 2건을 직접 소진.

**dead column 정리**: `buildMatchupProfile.ts`(KBO) 의 `Row.predicted_winner`
(predictions.predicted_winner FK 원본, select 후 할당만 되고 어디서도 read 안 됨 —
실제 승자/예측 팀 코드는 `predicted_winner_team.code` embed 로 이미 사용 중)와
`Row.game.winner_team_id`(games.winner_team_id FK 원본, 마찬가지로 `winner.code`
embed 가 이미 대체 — FK 자체는 embed 구문(`teams!games_winner_team_id_fkey`)에
필요하지만 raw 컬럼 select 는 불필요) 2개를 select 문 + 타입 + 할당 3곳에서 제거.

**EN matchup 요약 문장 4개 절 누락**: `/en/mlb/matchup/[teamA]/[teamB]` 의
`buildSummaryEn()` 이 KO 버전(`packages/shared` 의 `buildMatchupSummaryText`,
cycle 2071 KBO/MLB 통합)과 달리 recentRecord/blowout/closeGame/homeAwayEdge
4개 절이 빠져있었음 — `buildMlbMatchupProfile` 이 이미 4개 필드 모두 계산해
profile 에 담고 있는데 EN 전용 수기 요약 함수만 예전 버전에 멈춰있던 case (KO
쪽은 shared 함수로 리팩터될 때 자동으로 4개 절을 얻었지만 EN 은 별도 함수라
누락). 4개 절 영문 추가(recent record / blowout margin / close game / home-away
split) — `MARGIN_BLOWOUT_THRESHOLD` shared 상수 재사용.

vitest 3872 passed / tsc·eslint clean. main 직접 push 예정, CI green 실측 확인.

다음 fire 후보: open issue / fix-incident 20-cycle gap (cycle 2167 근접, 현재
2161→2147 gap=14) / review-code 자유 판단.

## ✅ review-code(heavy) — MLB confidence 스케일 이중 변환 버그 (cycle 2160, 2026-08-18)

Explore agent 로 matchup 영역(buildMatchupProfile.ts + matchup 페이지) 스카우팅 —
KBO 쪽은 dead column 2개(predicted_winner/winner_team_id, 미사용) + EN matchup
요약 문구 4개 섹션 누락(KO 대비) 발견했으나 스코프 밖(user-facing 영향 없음, 별도
후속). 대신 스카우팅이 짚어준 confToWinProb 단서를 직접 추적해 실제 버그 확정:
`deriveMlbOutcome()` 의 `confidence` 는 `Math.max(homeWinProb, 1-homeWinProb)`
(0.5~1 winnerProb 스케일) 인데, `confToWinProb()` 는 KBO DB `confidence` 컬럼
(predictor.ts: `|homeWinProb-0.5|*2`, 0~1 tossup=0 스케일) 전용 — cycle 1641
wave-310 이 "single source 강제" 스윕 때 MLB 페이지도 KBO 와 같은 스케일로 오인
포함시켜 이중 변환. 결과: 55% 승리확률이 78%로, tossup(50%)도 최소 75%로 표시.

영향 4곳(KO/EN `/mlb/team/[code]`, KO/EN `/mlb/matchup/[teamA]/[teamB]`) 모두
`confToWinProb(r.confidence)` → `r.confidence` 직접 렌더로 수정 + import 제거.
wave-310 가드 테스트(`silent-drift-wave-310.test.ts`) 의 MLB 관련 2개 assertion
(원래 "confToWinProb 써야 함") 을 반대로 정정 + 4페이지 전체 "confToWinProb 쓰면
안 됨" 가드 신규 추가(재발 차단). `deriveMlbOutcome.ts` confidence 필드에 스케일
설명 주석 추가.

vitest 3872 passed / tsc·eslint clean / main 직접 push CI green 실측(run 32123117955).

다음 fire 후보: buildMatchupProfile.ts dead column 2개 정리 + EN matchup 요약
누락 섹션 4개 보강(스코프 밖 carry-over, user-facing 영향 미미 — 낮은 우선순위) /
open issue / fix-incident 20-cycle gap(cycle 2167 근접) 자유 판단.

## ✅ explore-idea(heavy, scoped) — MLB 팀 프로필 타구 프로파일 잔여 4필드 추가 (cycle 2159, 2026-08-18)

cycle 2157 이 mlb_team_stats(migration 044) 의 pull/cent/oppo/gb/fb/hard_hit 6개
dead column 을 노출했으나, 같은 테이블의 ld_pct/iffb_pct/hr_fb_pct/launch_angle
4개는 여전히 select 밖 dead data 였음. buildMlbTeamProfile select + 타입 확장,
KO/EN `/mlb/team/[code]` 페이지 배지 4개 추가 (launch_angle 은 퍼센트 아닌 각도라
신규 fmtDegree 포매터 사용 — fmtRawPct 오용 방지, cycle 2158 스케일 버그 재발 차단
의식적 설계). review-code 관련 dead-end 리드 2건도 확인: KBO teams/[code] 는 batted
ball 필드 자체 없음, mlb/matchup 페이지도 미사용 — family 재발 없음 결론.

vitest 3870 passed / tsc·eslint clean / main 직접 push CI green 실측(run 32121229254).

다음 fire 후보: mlb_team_stats 전체 컬럼 노출 완료로 이 dead-data 시리즈 소진.
다음 진단은 open issue / fix-incident 20-cycle gap(cycle 2167 근접) / review-code
자유 판단.

## ✅ review-code(heavy) — MLB 팀 프로필 Barrel% 표시 스케일 버그 (cycle 2158, 2026-08-18)

cycle 2157 TODOS 기록이 "검증 안 함, 스코프 밖"으로 남긴 의심 — `factorAverages.lineupBarrelPct`
(predictions.home/away_lineup_barrel_pct, migration 034 CHECK 제약 0~30 raw percent)를
`/mlb/team/[code]` 페이지(KO/EN 둘 다)가 `fmtPct()`(0~1 fraction 가정, `v*100`)로 렌더 —
값이 8.5면 "850%"로 100배 부풀려짐. grep + migration 확인 + baseline-savant.ts brl_percent
raw 파싱 확인으로 실측 재현. `MlbMatchupFactorCompare.tsx`는 동일 필드를 이미 올바르게
(`${v.toFixed(1)}%`) 렌더 중이라 팀 프로필 페이지만 별도 버그였음.

같은 파일에 이미 존재하던 `fmtRawPct`(cycle 2157 배틀볼 프로파일 섹션에서 도입)로 교체 —
신규 포매터 불필요. tsc/eslint clean, main 직접 push, CI green 실측 확인(ef830dcc).

다음 fire 후보: 명시적 carry-over 소진. 다음 진단은 open issue / 새 TODOS 후보 / fix-incident
20-cycle gap(다음 도달 ~cycle 2167) 자유 판단.

## ✅ explore-idea(heavy, scoped) — MLB 팀 프로필 타구 프로파일 배지 추가 (cycle 2157, 2026-08-18)

review-code(heavy) monolith 감사 시리즈 소진(analysis/accuracy/home/analysis-game-id
4개 전부 완료, cycle 2154/2155 retro 명시) + fix-incident 트리거 미충족(CI/deploy
전부 green, open issue 0, i18n sweep 직접 재검증 결과 신규 gap 0) + explore-idea
saturation 11/15(<12) 로 진단 결과 explore-idea 자연 선택. TODOS 상단 "다음 X 후보"
포인터 4건은 cycle 2152가 이미 전부 stale(닫힘) 확인한 전례가 있어 재신뢰하지 않고,
Explore agent 로 신규 후보를 처음부터 재탐색.

`mlb_team_stats`(migration 044)가 FanGraphs 스크랩으로 pull_pct/cent_pct/oppo_pct/
gb_pct/fb_pct/hard_hit_pct 등을 매일 채우지만, 유일한 소비 경로(`mlb-pipeline.ts`
`runPredictFinal`)가 woba/fip/xfip/war/xwoba/barrel_pct 만 select — 이 6개 컬럼은
스크래핑만 되고 어디에도 렌더되지 않던 dead data(전체 repo grep 확인). `/mlb/team/
[code]`(KO/EN)에 "타구 프로파일" 섹션으로 신규 노출.

**스케일 버그 회피(코드 작성 중 발견)**: `fangraphs-mlb.ts`가 이 컬럼들을 이미
0~100 스케일로 저장(`* 100`)하는데, 페이지 기존 `fmtPct()`는 0~1 fraction 가정
(`Math.round(v*100)`) — 그대로 쓰면 렌더값이 100배 부풀려짐. 신규 `fmtRawPct()`
헬퍼로 회피. **부가 발견(수정 안 함, 후속 review-code 후보)**: 기존
`factorAverages.lineupBarrelPct`(predictions.home/away_lineup_barrel_pct 평균)도
Savant 스크레이퍼가 동일 0~100 스케일로 저장 — 현재 페이지가 이 값에도 `fmtPct()`를
쓰고 있어 동일 클래스의 표시 버그일 가능성 있음(직접 검증 안 함, 스코프 밖).

buildMlbTeamProfile.ts에 team_code(canonical, mlb_team_stats 저장 컨벤션과 직접
매칭이라 mlb_schedule 과 달리 StatsAPI alias 정규화 불필요 확인) + 현재 연도 기준
단건 조회 추가, 신규 테스트 3건(매핑/null/error). lint/type-check/vitest(445 files/
3870 tests, +3 신규) 전부 clean. main 직접 commit+push(ad97c50b), CI green 실측
확인(사례 15/18 mitigation 준수).

다음 fire 후보: 위 "부가 발견"(lineupBarrelPct 스케일 검증) 을 review-code 후보로
남김, 또는 explore-idea saturation 12/15 도달 시 review-code/fix-incident 자연 전환.

## ✅ review-code(heavy) — analysis/game/[id]/page.tsx postview 사후분석 LLM 실패 fallback dev jargon leak 수정 (cycle 2155, 2026-08-18)

explore-idea 후보(MLB judge-reasoning/postview parity)는 background agent 확인 결과
MLB pipeline 이 debate/postview LLM 스텝 자체를 아예 안 돌려(reasoning/debate_version
컬럼 항상 NULL) — 전면 신규 백엔드(LLM judge/postview agent) 필요한 large 스코프라
1 cycle 안 못 담고, CREDIT_EXHAUSTED 로 LLM debate 100% fallback 인 현재 신규 착수
가치도 낮음(정직한 스코프 판정, 착수 안 함).

대신 리포에 남은 4번째 monolith(analysis/game/[id]/page.tsx, 819줄, 이전 감사에서
tangential 하게만 다뤄짐)를 review-code(heavy)로 정독 — CREDIT_EXHAUSTED fallback
경로와 직결된 실제 버그 1건 발견.

`judgeReasoning.ts` 는 pre_game(`debate.ts` "에이전트 토론 불가...") + post_game
(`postview.ts` "사후 분석 LLM 실패...") 양쪽 fallback 문구를 `FALLBACK_PREFIXES`에
등록해두고 `presentJudgeReasoningWithFallback()` 로 사용자 안전 텍스트(`FALLBACK_USER_TEXT`)
스왑하는 헬퍼를 제공하는데, 실제 콜사이트 6곳(page.tsx/predictions/insights/loader/series)
전부 pre_game verdict.reasoning 경로만 이 헬퍼를 쓰고 post_game judgeReasoning 경로
(`analysis/game/[id]/page.tsx` → `PostviewPanel`)는 raw 값을 그대로 넘기고 있었음 —
헬퍼 도입 시 절반만 적용된 silent drift. postview LLM 호출(Anthropic API, CREDIT_EXHAUSTED
와 동일 실패 원인) 실패 시 "사후 분석 LLM 실패. factor 편향 기반 자동 fallback." 원문이
"AI 심판 종합 분석" 섹션에 그대로 노출 — CLAUDE.md/메모리 `feedback_ui_copy_no_dev_jargon`
룰 위반이자 그 파일 자체 헤더 주석이 명시적으로 경고하던 시나리오.

`postviewJudgeReasoning = presentJudgeReasoningWithFallback(postReasoning?.judgeReasoning)`
계산 후 `PostviewPanel`에 `.text ?? ''` 전달로 수정. 신규 회귀 테스트 1건(source-grep,
기존 wave-* 컨벤션 정합). lint/tsc/vitest(444 files/3865 tests) 전부 clean. main 직접
commit+push(8ae3f1e1), CI green 실측 확인(사례 15/18 mitigation 준수).

다음 fire 후보: explore-idea saturation trigger 11/15(<12, 곧 도달 예상) 또는
fix-incident(CI/이슈 계속 clean 이면 skip).

## ✅ review-code(heavy) — home page.tsx (1081줄) 감사, 버그 미발견 (cycle 2154, 2026-08-18)

review-code(heavy) monolith 감사 시리즈 3번째 (analysis/page.tsx cycle 2149,
accuracy/page.tsx cycle 2150 에 이어 home page.tsx). fix-incident/explore-idea
trigger 미충족(CI clean, open issue 0, saturation 10/15 <12) 이라 review-code
heavy 자연 선택.

전체 1081줄 read — Elo 승률 공식(`1/(1+10^((away-home-HOME_ELO_BONUS)/ELO_DIVIDER))`)
analysis-data.ts/mlb-elo.ts 와 동일 확인, `??` null-guard 전수(0 값 falsy 오판 없음 —
wave-521 WAR=0 sentinel 류 버그 부재), MIN_POLL_TOTAL/COMMUNITY_DIVERGE_MIN/
TOP_STAT_PICK_EDGE_MIN 전부 `@moneyball/shared` import(로컬 하드코딩 없음), CE
fallback 경로(`debate_fallback_quant`) 도 `buildFinalReasoning` 이
`reasoning.homeWinProb` 항상 채우는 걸 daily.ts 코드로 직접 확인해 안전 판정.

`packages/shared/src/index.ts:2149` 주석의 "(local copy, no import)" 문구가
wave-305 fix 이후 stale 해 보였으나, 리포 전역 ~15개 유사 블록이 전부 "발견 당시
상태" 를 기록하는 historical wave-documentation 컨벤션 — 단독 정정은 컨벤션
불일치라 보류.

**결론: 코드 변경 0.** 정직한 clean-audit (버그 없으면 억지로 안 만듦, CLAUDE.md
불필요 리팩토링 금지 원칙). outcome=partial. 다음 fire 후보 = explore-idea
(monolith 감사 시리즈 소진, small-fix saturation 곧 12 도달 예상) 또는
fix-incident (CI/이슈 계속 clean 이면 skip).

## ✅ review-code(lite) — stale "다음 fire 후보" 포인터 4건 재확인, 전부 이미 닫힘 (cycle 2152, 2026-08-18)

open hub-dispatch issue 0건, approved plan 0건 (plan #25 는 phase3_gate_not_passed 로
이미 archive). cycle 2151 retro 가 다양성 redirect 로 explore-idea/info-arch 권장 →
carry-over 를 먼저 확인했으나 후보 4건 전부 이미 shipped 된 stale 포인터였음(실제
Explore agent 조사 + 직접 코드 확인):

1. **MlbMatchupEloChart 배선** (changelog v0.5.62.37/cycle 2083 이 "다음 explore-idea
   heavy fire 후보"로 남김) — 실제로는 `ca2e42e0`(plan #25 Phase 2b step 2, TODOS
   cycle 2085 항목)에서 이미 완료. KO/EN 양쪽 매치업 페이지 배선 확인, 팀코드 정규화
   (사례 27) 가드 포함, 회귀 테스트 존재. **포인터가 자기 자신보다 2단계 앞선 완료
   상태를 못 따라간 사례** — changelog 항목이 순서상 Phase 2b step 1(cycle 2083)
   기준으로 작성돼 같은 날 나중에 완료된 step 2(cycle 2085)를 반영 못 함.
2. **MLB 개별 경기 waterfall/분석 페이지 parity** (TODOS cycle 2098 항목 "다음
   explore-idea heavy fire 후보") — cycle 2099 가 이미 "페이지 자체 부재" 진단이
   틀렸음을 정정(`/mlb/games/[date]/[slug]` 기존 실존)했고, cycle 2104 가 그 페이지에
   `MlbFactorWaterfallChart` 배선까지 완료. 신규 라우트 불필요했던 gap.
3. **MLB 허브 적중률 요약 EN 미러** (TODOS cycle 2118 항목 "다음 explore-idea 또는
   review-code heavy 후보") — 바로 다음 사이클(cycle 2119)이 `buildConfidenceTiers`
   locale 파라미터 추가로 완료. 포인터 수명 1 cycle.
4. **헤더 nav locale 버그**(cycle 2139 발견) — cycle 2140(href)+2141(label/aria-label)
   으로 완료, 그 뒤 SearchForm/CookieConsent/ThemeToggle/ShareButtons 까지 wave-627+
   후속 i18n sweep 으로 이어져 layout 레벨 공용 컴포넌트(Header/Footer/PWAInstallButton/
   KofiWidget) 전수 확인 결과 전부 isEn/usePathname 가드 존재 — 이 축 자체가 포화.

**메타 패턴**: 이 리포의 "다음 X 후보" 포인터는 평균 수명 1~2 cycle — 고빈도 fire
환경(review-code/explore-idea/fix-incident 교대, 하루 20+ cycle)에서 다음 사이클이
같은 영역을 만지며 자연 소비하는 경우가 대부분. 포인터 자체를 안 지우는 관례가
누적되며 진단 단계 재확인 비용(본 cycle 은 Explore agent 1회 + 직접 grep 다수)이
꾸준히 발생 — 단, 오탐(가짜 gap 재작업) 차단 가치가 재확인 비용보다 크다고 판단해
관례 자체는 유지, 단 확인 즉시 TODOS 에서 "이미 닫힘" 표시로 갱신(본 entry).

코드 변경 0 — 문서 정정만. `pnpm test`/`lint` 재실행 없음(코드 변경 없어 skip).

## ✅ review-code(heavy) — accuracy/page.tsx 역전 패턴 배지 소표본 노이즈 가드 누락 수정 (cycle 2150, 2026-08-18)

리포 2번째 monolith(`apps/moneyball/src/app/accuracy/page.tsx`, 1204줄, cycle
2149 analysis/page.tsx 감사 후속) audit — `isInverted`("보통 확신" 역전 패턴 ⚠
배지) 판정이 페이지 안 두 곳에 각각 다른 엄격도로 중복 구현되어 있었음.

카드별 배지(라인 ~798)는 `mid.accuracy < low.accuracy` 만 확인하고 표본 수
가드가 아예 없음 — 반면 바로 아래 요약 문구(라인 ~850)는 `low.n>=5 && mid.n>=3`
가드를 갖고 있음. 결과: mid tier n=1(1경기 표본)에서 우연히 실패하면 카드에
"역전 패턴 ⚠" 배지가 뜨지만, 그 아래 요약 문구는 표본 부족으로 안 뜨는 모순 UI —
CLAUDE.md '데이터로만 이야기' 룰(소표본 노이즈로 결론 금지) 위반.

`buildAccuracyData.ts`에 단일 source `isConfidenceTierInverted(low, mid)`
헬퍼 신규(`CONFIDENCE_INVERSION_LOW_MIN_N=5`/`MID_MIN_N=3`, 기존 요약 문구
임계값 그대로 승격) 추출 후 page.tsx 두 곳 모두 이걸로 교체 — 중복 로직 제거 +
가드 통일. 신규 유닛 테스트 5건(역전 감지/low·mid 표본 부족 차단/비역전/null
accuracy 방어).

lint/type-check/vitest(443 files/3864 tests, +5 신규) 전부 clean. main 직접
push, CI green 실측 확인(사례 15/18 mitigation 준수).

## ✅ review-code(heavy) — analysis/page.tsx WAR=0 sentinel 가드 누락 수정 (cycle 2149, 2026-08-18)

2802줄 monolith(`apps/moneyball/src/app/analysis/page.tsx`, 리포 최대 파일)를
review-code(heavy)로 첫 audit — Explore agent 로 정독(analysis-data.ts 919줄 +
computeCompositeDuel.ts + factor-explanations.ts 포함) 후 실제 버그 1건 발견.

wave-521("이번 주 남은 경기" 6팩터 배지) 의 WAR 직접 대결 배지만
`g.homeWar > 0 && g.awayWar > 0` 가드가 빠져 있었음. WAR=0 은 Fancy Stats
top-50 미수록 sentinel(실측 결측치)인데, 나머지 3곳(wave-508 오늘 AI 예측 /
computeCompositeDuel / factor-explanations)은 모두 이 가드를 갖고 있음 —
이번 주 남은 경기 카드만 결측 sentinel(0)을 실제 값(예: 6.0)과 비교해 가짜
"WAR 우위" 배지를 노출하던 silent drift. 동일 가드 1줄 추가(commit e47b1374)
+ wave-521 테스트 파일에 회귀 assertion 추가.

부가 발견(수정 안 함, 낮은 우선순위 — 후속 후보): `page.tsx` 안 "델타 계산→
임계 비교→우위팀 렌더" 패턴이 팩터×섹션 조합으로 약 30회 수기 복제되어 있어
이번 버그의 근본 원인. 공유 `<DuelBadge>` 컴포넌트로 추출하면 향후 동일 class
버그 재발 차단 가능하나 대규모 리팩터라 별도 cycle 분리 권장. 그 외
`analysis-data.ts`(`getBestPickOfWeek`/`getUpsetPickOfMonth` 90% 중복,
`computeCompositeDuel` 인자 조립 3회 복제)는 저위험 저가치라 보류.

lint/type-check/vitest(443 files/3859 tests) 전부 clean. main 직접 push,
CI green 실측 확인(사례 15/18 mitigation 준수).

## ✅ polish-ui(heavy) — Elo/FIP 차트 카드 다크모드 배경 버그 수정 (cycle 2148, 2026-08-18)

wave 620대 MLB 신규 섹션(page.tsx 15개 + 컴포넌트 21개, 지난 7일) KBO/MLB
parity 감사 — i18n(isEn/locale)·breadcrumb·design token·구조는 전부 정상
확인(추가 gap 없음). 감사 중 카드 배경 클래스를 grep 하다 실제 버그 발견:
`TeamEloChart`/`MatchupEloChart`/`EloTrendChart`/`PitcherFipTrend`(KBO 4개)
+ `MlbTeamEloChart`/`MlbMatchupEloChart`(MLB 포팅 2개) 총 6개 파일이
`dark:bg-gray-50`(거의 흰색 #f9fafb)를 차트 카드 배경으로 사용 — 다크모드에서
카드가 밝게 떠 보이는 버그. 앱 전역 72곳이 이미 쓰는
`dark:bg-[var(--color-surface-card)]`(#151d18, DESIGN.md 다크모드 카드 색)로
통일. KBO 원본에 있던 버그가 MLB 포팅 시 그대로 복제돼 확산된 사례
(silent drift family 정합).

CSS 클래스 1줄 × 6파일, 로직/데이터 변경 없음. lint/tsc/vitest
(443 files/3858 tests) 전부 clean. main 직접 commit+push (R4), 커밋 187b871b.

## ✅ fix-incident(heavy) — ShareButtons EN i18n 누락 수정 (wave-631, cycle 2147, 2026-08-18)

wave 627~630(헤더 nav/SearchForm/Footer/CookieConsent/ThemeToggle) i18n sweep 종료
판단(cycle 2144) 이후 본 cycle 진단 단계에서 별도 컴포넌트 계열 재점검 —
`ShareButtons` 는 `en/mlb/games/[date]/[slug]`, `en/mlb/matchup/[teamA]/[teamB]`
두 EN page.tsx 가 렌더하지만 isEn prop 자체가 부재해 "공유"/"공유하기"/
"Twitter에 공유"/"Facebook에 공유"/"링크 복사"/"복사됨!"/"공유 실패" 가
EN 방문자에게 그대로 노출되던 gap 발견. 동일 drift family 6번째 컴포넌트.

isEn?: boolean(default false) prop 추가 + 두 EN 콜사이트 배선. KO page.tsx
(analysis/game, matchup, mlb/games, mlb/matchup, predictions, reviews/*)
6곳은 isEn 미전달 → 기존 KO 동작 그대로. 테스트 신규 1파일 4 assertion.
lint/tsc/vitest(443 files/3858 tests) 전부 clean. main 직접 commit+push (R4),
커밋 9a87fa01.

nav i18n sweep 은 layout.tsx 직계 자식(CookieConsent/ThemeToggle/Footer/
Header/SearchForm) 범위로 종료 판단했으나 `share/` 계열처럼 페이지 레벨에서
개별 import 되는 공용 컴포넌트는 별도 grep 이 필요했던 사례 — 다음 review-code
후보: `RelatedLinks`/`EmptyState` 외 EN 라우트에서 쓰이는 공용 컴포넌트 전수
isEn grep (본 cycle 확인 결과 이 둘은 이미 isEn 무관 = 텍스트 없음, 통과).

## ✅ review-code(heavy) — CookieConsent/ThemeToggle EN i18n 누락 수정 (wave-630, cycle 2144, 2026-08-18)

cycle 2143 fix-incident(heavy) Footer 수정 후속 후보("layout.tsx 직계 자식
CookieConsent, ThemeToggle 등 전수 isEn grep 완료 확인")를 이번 cycle 진단
단계에서 처리 — 둘 다 isEn prop 자체가 부재해 /en/* 방문자에게 쿠키 배너
본문/버튼/aria-label, 테마 토글 aria-label/title 이 KO 그대로 노출되던 gap.

- CookieConsent: isEn prop 추가, 배너 문구/버튼/aria-label EN 치환. href 는
  /en/privacy 라우트 부재로 /privacy 유지 (Footer legal nav 와 동일 scope).
- ThemeToggle: isEn prop 추가, aria-label/title EN 치환. NavLinks 가 자체
  usePathname 으로 isEn 계산해 전달 (SearchForm 과 동일 client-side 계산
  패턴, prop drilling 없음).
- layout.tsx: `<CookieConsent isEn={isEn} />` 배선.
- 테스트 신규 2파일(CookieConsent/ThemeToggle) 6 assertion. lint/tsc/vitest
  (442 files/3856 tests) 전부 clean. main 직접 commit+push (R4).

MobileNav 는 ThemeToggle 렌더 없음 확인 — layout.tsx 직계 자식 isEn sweep
완료 판단 (nav i18n sweep wave 627~630 4개 cycle 시리즈 종료).

**부수 발견**: cycle 2143 은 코드 작업(fix+docs commit)이 세션 종료로 retro
(cycle_state JSON + policy commit)를 못 남기고 끝남 — 본 cycle 진단 단계에서
발견 후 retroactive 박제 (사례 15 silent retro drift family 재발 evidence
추가, `~/.develop-cycle/cycles/2143.json` + `policy: cycle-retro 2143`
commit e77e7744).

## ✅ fix-incident(heavy) — Footer 전체 EN i18n 누락 수정 (wave-629, cycle 2143, 2026-08-14)

cycle 2142 review-code(heavy) 가 SearchForm i18n 누락을 발견/수정하면서 nav i18n
sweep 을 "헤더 nav 컴포넌트" 로 스코프 좁혀온 흐름의 연장 — 이번 cycle 진단 단계에서
`isEn` grep 을 Header/MobileNav/LeagueSelector/SearchForm 외 shared 컴포넌트로
확장하다가 Footer.tsx 에 isEn 자체가 아예 없는 것 발견. Footer 는 layout.tsx 가
모든 페이지(including `/en/mlb/*`)에 항상 렌더 — nav 와 달리 league/locale 분기
없이 7 column 전체 + tagline + legal nav + disclaimer 가 EN 방문자에게도 KO
그대로 노출되던 더 넓은 범위의 gap.

Footer isEn prop 추가(layout.tsx 배선). MLB column(7 link 전부 `/en/mlb/*` 라우트
실존) 은 href 도 Header withLocale 과 동일 패턴으로 `/en` 접두 치환. 나머지 6
column(AI 예측/커뮤니티/팀·선수/리뷰·시즌/도움말/로또, `/en` 대응 라우트 부재)은
href 유지 + 텍스트만 enLabel/enTitle 치환 — SearchForm(cycle 2142)의 scope 판단과
동일. tagline/사이트맵·법적고지 aria-label/개인정보처리방침·이용약관·문의 텍스트/
disclaimer 전부 EN 치환. Footer 테스트 3건 추가, lotto-routes 테스트 정규식 1건
완화(enTitle 필드 추가로 title→links 사이 문자열 간격 변화). lint/tsc/vitest
(440 files/3852 tests, +3 신규) 전체 green, direct commit+push to main (R4).

**교훈**: nav i18n sweep 범위를 "헤더 nav 컴포넌트" 파일명 기준으로 좁히면 layout.tsx
가 무조건 렌더하는 다른 전역 chrome(Footer 등)이 계속 누락된다 — cycle 2142 교훈
("렌더 트리 기준 grep, 파일명 패턴 의존 금지")이 이번에도 유효했고, 이번엔 그 교훈을
실제로 적용해 header 밖 shared 컴포넌트(Footer/Breadcrumb)로 grep 범위를 넓혀 발견.
다음 후속 후보: layout.tsx 직계 자식(CookieConsent, ThemeToggle 등) 전수 isEn grep
완료 확인 — 이번 cycle 은 Footer/Breadcrumb 2개만 확인, CookieConsent 미확인.


## ✅ review-code(heavy) — SearchForm 헤더 검색창 EN 텍스트 i18n (wave-628, cycle 2142, 2026-08-14)

cycle 2141 explore-idea(heavy) 가 헤더 nav label/description/aria-label EN 치환을
완료했다고 SUCCESS 박제했지만, 데스크톱 헤더에 항상 렌더되는 `SearchForm`(NavLinks
안 `<SearchForm compact />`)은 nav 컴포넌트가 아니라 그 범위에서 누락 — `/en/mlb/*`
페이지에서도 aria-label "사이트 검색"/placeholder "팀, 선수, 일자 검색…"/버튼
"검색" KO 그대로 노출. 코드 직접 read 검증(review-code heavy) 로 발견.

`SearchForm` 이 `usePathname` 으로 자체 isEn 판별(LeagueSelector/MobileNav 기존
패턴 재사용) 후 aria-label/placeholder/버튼 텍스트 EN 치환. href(`/search`) 는
`/en/search` 라우트 자체가 없어 대상 외(KBO/로또와 동일한 기존 스코프 제약 — 변경
없음). 테스트 2건 추가(KO 유지 + EN 치환). lint/tsc/vitest(440 files/3849 tests,
+2 신규) 전체 green, direct commit+push to main (R4, PR 없음).

**교훈**: nav 관련 i18n sweep 시 `Header.tsx`/`NavLinks.tsx`/`MobileNav.tsx`/
`LeagueSelector.tsx` 외에도 헤더 nav 영역에 렌더되는 다른 shared 컴포넌트
(SearchForm 등) 도 grep 대상 포함 필요 — "헤더 nav" 스코프를 파일명 기준으로만
좁히면 실제 렌더 트리 기준 누락 발생.

## ✅ explore-idea(heavy) — 헤더/모바일메뉴/리그셀렉터 EN 텍스트 i18n (wave-627, cycle 2141, 2026-08-14)

cycle 2139/2140 이 헤더 nav href locale 버그(EN 방문자 클릭 시 KO 이탈)를 고쳤지만,
href 만 고쳐지고 화면에 보이는 label/description/aria-label 텍스트는 여전히 KO
하드코딩이던 gap(cycle 2140 retro carry-over) 해소. `NavLink`/`NavGroup` 에
`enLabel`/`enDescription` 옵션 필드 추가 + `localizeNavItems()` 가 EN pathname 일 때
치환(MLB_NAV 만 대상 — KBO/로또는 `/en` 대응 라우트 부재라 실사용 경로 노출 안 됨).
Header 검색 아이콘/MobileNav 햄버거·nav/LeagueSelector tablist aria-label + 로또
pill + MLB 베타 배지도 각 컴포넌트 기존 pathname 기반 isEn 판별로 EN 치환.
layout.tsx 기존 isEn(x-pathname) 을 Header prop 으로 전달. Header/LeagueSelector
테스트 4건 추가. lint/tsc/vitest(439 files/3847 tests) 전체 green, direct
commit+push to main (R4, PR 없음).

## ✅ review-code(heavy) — /mlb/accuracy 검증 + 헤더 nav locale 이슈 발견 (cycle 2139, 2026-08-14)

cycle 2138 신규 배선 `/mlb/accuracy`(KO/EN) 직접 코드 read 검증. `buildAllMlbTeamAccuracy`/
`buildMlbAccuracySummary` 양쪽 cohort 필터(`MLB_PRODUCTION_COHORT_RULES`)+`deriveMlbOutcome`
일관 사용, `MlbAccuracyDashboard` KO/EN STRINGS parity 정상, sitemap/header 배선 정상.
타겟 vitest 재실행 9/9 pass. drift 없음, 코드 변경 불필요.

**신규 발견 (site-wide, 이번 cycle 범위 밖)**: `Header.tsx` 의 `KBO_NAV`/`MLB_NAV` 전체
href 가 로케일 비인식 하드코딩(예: `/mlb/accuracy`, `/accuracy`) — `NavLinks.tsx`/
`MegaMenu.tsx` 어디에도 pathname 기반 `/en` prefix 로직 없음. `/en/mlb` 방문자가 헤더
메가메뉴 클릭 시 KO 페이지로 이동. wave-626 신규 유입 아니라 기존 전체 nav 항목에
이미 있던 구조적 gap. 다음 fix-incident 또는 info-architecture-review 후보로 기록.

## ✅ explore-idea(heavy) — /mlb/accuracy AI 적중 기록 페이지 MVP (wave-626, cycle 2138, 2026-08-14)

KBO `/accuracy`(14 TOC 섹션) 대응이 `/mlb` 허브의 소형 인라인 요약뿐이라 완전히 없던 gap
발견. `buildMlbAccuracySummary`(이미 존재, `/mlb` 허브용)를 재사용해 MVP scope 로
독립 라우트 배선:

- 스탯 카드(검증 완료/적중률/Brier/보정오차) + 캘리브레이션 다이어그램 + 확신도별
  tier 그리드 + 팀별 적중률 테이블 4섹션
- `buildMlbAccuracySummary` 에 `calibrationGap` 기반 `gap` 필드 신규 추가 (KBO 보정오차
  카드 정합, 기존 호출부 `/mlb`, `/en/mlb` 는 추가 필드라 영향 없음)
- `buildAllMlbTeamAccuracy` 신규 — `mlb_schedule` home/away_team_code 직접 컬럼 집계
  (KBO `buildAllTeamAccuracy` 의 games/teams FK join 불필요, `deriveMlbOutcome` 재사용)
- `MlbAccuracyDashboard` 컴포넌트(locale prop, KO/EN 단일 컴포넌트) — 계산 로직은
  `buildAccuracyData.ts` 의 PredRow/Bucket/ConfidenceTier 제네릭 함수 그대로 재사용
  (KBO CalibrationChart/StatCard 는 별도 함수로 독립 작성, 기존 페이지 미변경 — 저risk)
- `/mlb/accuracy`, `/en/mlb/accuracy` 페이지 + `sitemap.ts` + `/mlb` 허브 카드 + 헤더
  메가메뉴("경기·팀" 그룹) 동기

**후속 wave 후보** (Tier 3 large, 한 사이클 scope 초과라 보류): rolling accuracy 추세 /
Brier trend / 요일별 적중률 / 팀별 예측 편향 / 상대팀별 강약 분석 / 팩터별 적중률.

`pnpm lint` / `tsc --noEmit` / `vitest run`(438 files/3839 tests, 신규 9건 포함) 전체
통과. main 직접 commit (R4, 11개 파일 — 신규 5 + 기존 확장 6, PR 없이 바로 merge —
최근 explore-idea heavy 다수와 동일 패턴).

## ✅ lotto(lite) — 30-cycle gap 헬스체크, site 데이터 정합 확인 (cycle 2137, 2026-08-14)

trigger 6 (마지막 lotto 발화 cycle 2106 이후 31 cycle 경과, ≥30 임계) 충족해 발화.

- `pnpm tsx scripts/lotto.ts count`: 유효조합 7,705,415 / 8,145,060 (5.40% 제거, PASS) —
  cycle 2106 실측과 동일값, drift 없음
- 우려했던 1236회(08-08) picks/result 부재는 `~/lotto_picks/` **개인 스크래치 dir 한정**
  착시였음. 실제 site 콘텐츠(`apps/moneyball/data/lotto-picks/2026-08-08.md` +
  `apps/moneyball/data/lotto-results/2026-08-08.md`) 는 cycle 2106 시점부터 이미 존재 —
  256/256 룰 PASS, 5등 27건 매칭 확인 (재검증 결과 동일)
- 1237회(08-15, 내일 21시 KST 추첨) picks 도 `apps/moneyball/data/lotto-picks/2026-08-15.md`
  로 cycle 2041 에서 이미 생성됨 — 신규 pick 불필요
- valid_delta=0 / new_rules=0 — 코드·데이터 변경 없음, 헬스체크만

**다음 lotto 발화 후보**: 1237회(08-15) 추첨 이후 OOS 검증 (내일 이후 cycle).

## ✅ review-code(heavy) — wave-625 MLB 팀 프로필 수렴 픽 기능 정합성 검증 (cycle 2136, 2026-08-14)

직전 cycle 2135 explore-idea(heavy)가 신규 배선한 `/mlb/team/[code]` 수렴 픽 성적 기능
(Feature-Drift Cycle 패턴 — 신규 기능 직후 review-code 자연 교대)을 직접 코드 read로 검증:

- `MlbTeamConvergencePickRecord.tsx` vs KBO 대응 `TeamConvergencePickRecord.tsx` — locale
  분기 구조 동일, 텍스트만 분기 (parity 정상). description 문구가 KBO는 "(8팩터+)"/"(10팩터)"
  명시하지만 MLB는 미명시 — 의도된 차이 (MLB_FACTOR_PICK_STRONG=5/COMPLETE=6, 다른 임계값이라
  하드코딩 라벨 오해 방지)
- `convergenceRecord.ts` `getMlbConvergencePickTeamStats`/`evaluateMlbConvergencePickRow` —
  cycle 2081 silent-empty 버그(7팀 StatsAPI 코드 불일치)와 달리 team-code 필터 자체가 없는
  전체 스캔 쿼리라 해당 버그 재발 경로 없음. `MLB_COMPOSITE_DUEL_MIN_VALID`/`MLB_FACTOR_PICK_STRONG`
  /`MLB_FACTOR_PICK_COMPLETE`(3/5/6) 값이 plan24-phase3c 기존 배선과 일치
- KO/EN 양쪽 `page.tsx` — `Promise.all` + `captureFallback` 패턴 동일, `MlbTeamConvergencePickRecord`
  섹션 위치(factor averages 뒤, Elo 추이 앞) KO/EN 동일, EN은 `locale="en"` 명시 전달 확인
- `wave625-mlb-team-convergence-record.test.ts` 7/7 pass 재확인

**결론: drift 없음, 코드 정상.** 액션 불필요 (cycle 2105 "confirmed intentional" 패턴과 동일 —
PR 없이 검증만으로 outcome=success). skill-evolution trigger 5개 전부 미충족 (직전 20 사이클
표본 19, review-code 10/20 fire — 0회 발화 chain 없음). 2-chain lock 미탐지 (직전 8사이클
distinct=5). ship-0 emergency 미충족 (직전 10사이클 전부 success).

## ✅ explore-idea(heavy) — MLB 팀 프로필 시즌 전체 수렴 픽 성적 (wave-625, cycle 2135, 2026-08-14)

`getConvergencePickTeamStats`/`TeamConvergencePickRecord`(KBO, wave-607)가 `/teams/[code]`에
팀별 강수렴/완전수렴 픽 시즌 성적을 이미 표시하지만 `/mlb/team/[code]`에는 대응 기능이 없던
gap 발견. `/mlb/matchup/[teamA]/[teamB]`에는 이미 두 팀 한정 집계
(`MlbMatchupConvergencePickRecord`, plan #24 Phase 3c)가 있었는데, 팀 프로필 단독 페이지엔
시즌 전체 집계 함수(`getMlbConvergencePickTeamStats`)자체가 없어 완전히 빠져 있었음.

- `fetchMlbConvergencePickDetailedResults` 신규 — `mlb_schedule` 전체 스캔(`status='final'`)
  + `predictions` 조인, KBO `fetchConvergencePickDetailedResults`의 MLB 대응
  (`buildMlbAccuracySummary`와 동일한 cutoff-불필요 전량 스캔 패턴 재사용)
- `evaluateMlbConvergencePickRow`로 판정 로직(duel 계산 → `minFactors` 게이팅 → 승패 산출)을
  기존 pair-한정 fetch와 공유 추출 (KBO wave-608 `evaluateConvergencePickRow`와 동일 리팩터,
  중복 회피)
- `getMlbConvergencePickTeamStats` export — `computeConvergenceTeamStats`가 이미
  generic(`MlbTeamCode` 지원, plan24-phase3c 테스트로 사전 검증됨)이라 로직 재사용만 필요
- `MlbTeamConvergencePickRecord` 컴포넌트 신규 — `MlbMatchupConvergencePickRecord`의
  `locale` prop 패턴 그대로 재사용 (KO/EN 단일 컴포넌트, 텍스트만 분기)
- `mlb/team/[code]`, `en/mlb/team/[code]` 양쪽 페이지 factor averages 섹션 뒤·Elo 추이
  섹션 앞에 배선 (KBO 배치 순서 정합)

`pnpm lint` clean, `pnpm test` 3835/3835 pass(신규 14건 포함, `wave625-mlb-team-convergence-record.test.ts`),
`tsc --noEmit` clean. main 직접 commit (R4, 5개 파일 — 신규 컴포넌트 1 + 신규 테스트 1 +
lib 함수 확장 1 + 페이지 배선 2, PR 없이 바로 merge — 최근 explore-idea heavy 다수가
동일 패턴). 2-chain alternation lock 미탐지(직전 8 사이클 distinct=5: review-code/
operational-analysis/fix-incident/info-architecture-review/explore-idea). skill-evolution
trigger 5개 전부 미충족(milestone 아님, review-code 10/20 fire).

## ✅ review-code(heavy) — wave-624 top-pick 딥링크 직접 코드 read 검증 (cycle 2133, 2026-08-14)

cycle 2132 가 배포한 MLB games/[date] top-pick 딥링크(#2955)를 lint 가 아닌 실제 파일
read 로 검증(heavy 모드 — cycle 2131 lite 성공 직후 heavy 권장 룰 적용):

1. **TOP_PICK_MIN_WIN_PCT 수학 검증** — `confToWinProb(c) = 0.5 + c/2` 와
   `winnerProbOf(homeWinProb) = max(homeWinProb, 1-homeWinProb)` 가 대수적으로 서로
   역함수 관계임을 확인 → KBO 의 confidence-공간 임계값(`TOP_PICK_CONF_MIN=0.1`)을
   MLB 의 win%-공간 임계값(55%)으로 환산한 것이 수치적으로 완전히 동등 — parity 주장이
   근사가 아니라 정확한 등가임을 실측 확인.
2. **KO/EN diff 대조** — `git show` 로 두 파일 diff 를 나란히 비교, 텍스트/href 외
   로직·구조 100% 동일 확인.
3. **wave-624 가드 테스트** 내용 확인 — 필터/정렬/앵커/하이라이트 4개 축 모두
   assertion 존재, 실제 shipped 코드와 문자열 일치.
4. **Breadcrumb 존재 확인** — `mlb/games/[date]`, `mlb/games/[date]/[slug]` KO/EN
   4개 라우트 전부 존재 (`grep -L` 0 hit).
5. Vercel 배포 상태 확인 — production 이 최신 커밋 대비 몇 분 지연이었으나 CI in_progress
   상태였을 뿐 (일반 배포 파이프라인 지연, cycle 2083 quota 소진과는 무관 — 정상).

버그 0건, 코드 변경 0 — heavy 모드로 수학적 정합성까지 검증했지만 실제로 완전히 clean.
open hub-dispatch issue 0건, approved plan 0건 (plan #25 는 phase3_gate_not_passed 로
archived, Phase 2b UI(MlbMatchupEloChart/MlbTeamEloChart)는 이미 별도 커밋으로 shipped
확인 — 재작업 불필요). 2-chain alternation lock 미탐지(직전 8 사이클 distinct=5).

## ✅ review-code(lite) — baseline 재확인, MLB filter/parity/R7 전수 클린 (cycle 2131, 2026-08-14)

cycle 2120 이후 11 사이클 만의 review-code 재점검. open hub-dispatch issue 0건, approved
plan 0건. 6개 축 직접 코드 read 로 재검증, 전부 클린:

1. **MLB scoring_rule 필터 family** (cycle 2124/2125/2127 이 고친 `PRODUCTION_COHORT_RULES`
   filter family gap) — 신규 MLB 라우트 6개(`mlb/page.tsx`, `mlb/games/[date]`,
   `mlb/games/[date]/[slug]`, en 미러 3개) 전부 `.eq('scoring_rule', MLB_SCORING_RULE)`
   로 올바르게 필터링 중 (KBO 전용 `PRODUCTION_COHORT_RULES` 와 별개인
   `MLB_PRODUCTION_COHORT_RULES`/`MLB_SCORING_RULE` 상수가 이미 분리돼 있어 혼동 없음).
2. **KO/EN 컴포넌트 태그 parity 전수 sweep** — `/mlb`, `/mlb/calendar`, `/mlb/team/[code]`,
   `/mlb/matchup/[teamA]/[teamB]`, `/mlb/games/[date]`, `/mlb/games/[date]/[slug]` 6쌍
   전부 `comm -23` grep diff 0 mismatch (cycle 2120 이 3쌍만 확인했던 것을 6쌍 전체로 확장).
3. **R7 자동 머지 Tier 2 후속 후보** (TODOS.md cycle 2088 항목이 남긴 "--auto 활성화
   silent 누락 가능성") — 최근 merged PR 15건(#2940~#2954) 전부 `createdAt`→`mergedAt`
   간격 5~10초로 즉시 머지, open PR 8건 전부 dependabot(정책상 자동 대상 아님, develop-cycle
   산출물 stuck PR 0건) — 실측상 우려 재현 안 됨, cycle 2022 1회성 이슈로 결론 유지.
4. **normalizeMlbTeamCode 20 callsite 전수 확인** — team_code alias family(사례 27) 재발
   없음. `buildMlbTeamFactorAverages.ts` 는 반대 방향 변환(`toMlbStatsApiCode`)을 쓰는
   게 맞는 설계(mlb_schedule = StatsAPI 코드 컨벤션이라 정상).
5. `pnpm lint` 전량 clean (4 packages, cache hit).
6. **비대상 확인** (large scope, 이번 사이클 착수 X): 홈페이지/`picks`/`leaderboard`/
   `insights` 는 KBO 전용으로 MLB 미포함 — 사용자 예측 게임(`leaderboard`)과 오늘의 픽
   위젯 확장은 신규 UI+데이터 설계가 필요한 Tier 3 스코프라 skip, 다음 explore-idea
   heavy 후보로만 기록(수요 신호 없음 — 자율 fire 보류).

코드 변경 0 — 6개 축 전부 "이미 클린"이 성과. `pnpm test` 재실행 없음(코드 변경 없어
skip, lint 만으로 baseline 충분).


`gh secret list` 실측 — `CLOUDFLARE_API_TOKEN` 이 cycle 2068 안내 이후에도 여전히 미등록
(사용자 조치 대기 그대로). 그런데 `deploy-cloudflare-worker.yml`의 최근 workflow_dispatch
run(00:28:25 KST)이 conclusion=`success`로 찍혀있어 처음엔 "배포 됐나?" 오인 위험 —
`gh run view --log` 로 실제 로그 대조한 결과 `has_token=false` → deploy step skip →
"Warn on missing secret" 이 `::warning::`만 찍고 종료해 **job 자체가 success 로 끝나는
구조적 버그**였음. 더 심각한 부수 효과: `if: failure()`인 "Notify playbook on failure"
단계도 이 때문에 한 번도 발화 못 해 hub-dispatch 알림 경로 자체가 죽어있었음 —
2026-06-12 이후 ~2개월 동안 Worker 미배포 상태(사례 25)가 CI 상으로는 계속 초록불이라
아무 알림도 못 갔던 root cause.

`.github/workflows/deploy-cloudflare-worker.yml` "Warn on missing secret" →
"Fail on missing secret"로 개명 + `exit 1` 추가 — secret 미설정 상태를 CI 색깔(빨강)과
알림(playbook dispatch) 양쪽에 정확히 반영하도록 수정. 코드 자체 변경 아닌 workflow
파일 단일 수정, 회귀 테스트 대상 없음(YAML). main 직접 commit (R4, 단일 논리 단위).

**🔔 사용자 조치 여전히 필요**(변경 없음): `gh secret set CLOUDFLARE_API_TOKEN` 등록 —
등록 전까지는 다음 `cloudflare-worker/**` push 때마다 CI 가 (의도대로) 빨간불로 정확히
알려줄 것.

## ✅ operational-analysis(heavy) — MLB Elo backtest, plan #25 Phase 3 게이트 (cycle 2128, 2026-08-14)

plan #25(cycle 2080/2083)가 만든 `mlb_team_elo`/`mlb_team_elo_history`(748경기 재생
1회성 backfill 완료)를 실 예측(`mlb-pipeline.ts` 의 `ELO_NEUTRAL` placeholder 대체)에
반영해도 되는지 — plan #25 self_verification 이 명시한 "op-analysis heavy backtest
게이트 통과 전 자율 flip 금지" 조건 검증.

`scripts/op-analysis-mlb-elo-backtest.ts` 신규 — `mlb_schedule status='final'` 747경기
(올스타 1건 제외)를 시간순 walk-forward 재생, 매 경기 **재생 이전** Elo rating 으로
`expectedHomeWinProb` 계산해 실제 결과와 대조(production 미반영, 순수 backtest).

- 전체 표본(n=747): Elo Brier 0.2478 vs 홈어드밴티지-only Brier 0.2494, accuracy
  54.2% vs 52.5% — 방향은 Elo 우세지만 bootstrap 95% CI(2000회) 겹침
- WARM cohort(양팀 10+경기 재생 후, cold-start 배제, n=595): Elo Brier 0.2471 vs
  0.2494, accuracy 54.6% vs 52.4% — 마찬가지로 CI 겹침
- 판정: 현재 표본에서 통계적으로 구분 불가 (v2.1-B reject 사례와 동일 패턴 — 소표본
  결정 금지, CLAUDE.md "데이터로만 이야기")

**결론**: Phase 3(모델 실 반영) 보류 확정, `ELO_NEUTRAL` placeholder 유지. plan #25
archive(`~/.develop-cycle/plans/moneyballscore/_archive/25.md`) — Phase 1~3 전체
종료, 재개는 시즌 진행에 따른 표본 누적 후 자연 재진단 (임의 재검증 n 목표 미설정).
전체 3817/3817 pass, tsc/lint clean. main 직접 commit (R4, 코드 변경은 분석 스크립트
1개 신규뿐 — production 경로 무변경).

## ✅ explore-idea(heavy) — /en/mlb/calendar EN mirror 신규 (cycle 2126, 2026-08-14)

cycle 2123~2125 3개 사이클 연속 next_recommended_chain 으로 carry-over 된 gap —
cycle 2123 이 신규 만든 `/mlb/calendar` 가 EN mirror 없이 배선됨. 다른 MLB
서브페이지 8개(standings/players/factors/wild-card/postseason/team/games/matchup)
는 모두 en/mlb/* 미러가 있었으나 calendar 만 누락 확인 (find 로 전수 대조).

- `WEEKDAY_LABELS_EN_MON_FIRST` 상수 신규 (packages/shared) — 기존
  `WEEKDAY_LABELS_KO_MON_FIRST` 짝. `MonthInfo.monthLabel` 필드는 KO 전용
  (KBO calendar/page.tsx 와 공유) 이라 건드리지 않고, EN 페이지에서
  `Intl.DateTimeFormat` 으로 로컬 계산하는 `monthLabelEn()` 헬퍼만 추가.
- `en/mlb/calendar/page.tsx` 신규 — KO 페이지와 동일 `monthGrid`/
  `getMlbMonthHeatmap` 재사용, 영문 카피만 별도.
- `en/mlb/page.tsx` hub 카드 + `sitemap.ts` entry 배선.
- KO 테스트(`mlb-calendar-page.test.ts`) parity 맞춘 신규 테스트 9건.

전체 3816/3816 pass, tsc/lint clean. main 직접 commit + push (R4/R7, PR 생략 —
단일 파일 세트, CI 로컬 pre-push hook 이 이미 lint+type-check 통과 확인).

## ✅ review-code(heavy) — MLB PRODUCTION_COHORT_RULES filter family gap fix, 잔여 2곳 (cycle 2125, 2026-08-14)

cycle 2124 가 3곳 fix 했지만 grep 전수 조회(`from("predictions")` 전체 사이트) 결과
`buildMlbMatchupProfile.ts`(매치업 페이지) / `buildMlbTeamFactorAverages.ts`(팀
프로필 팩터 평균) 2곳이 여전히 `league='mlb'` 만으로 필터링 — 동일 gap. page.tsx
6개는 이미 scoring_rule eq 단일 필터 보유해서 안전 확인. 이걸로 MLB predictions
쿼리 전체 sweep 완료 (convergenceRecord.ts 포함 총 6곳 lib 레이어 모두 필터 일관).
동일 패턴(`.in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)` + test mock thenable
교체)으로 fix. 전체 3807/3807 pass, tsc/lint clean. main 직접 commit (R4).

## ✅ review-code(heavy) — MLB PRODUCTION_COHORT_RULES filter family gap fix (cycle 2124, 2026-08-14)

cycle 2123 explore-idea heavy 가 만든 `buildMlbCalendarHeatmap.ts` 를 review 하다가
predictions 쿼리에 `MLB_PRODUCTION_COHORT_RULES`(scoring_rule='mlb_v0.1') 필터가
빠져 있는 걸 발견 — grep 으로 MLB predictions 쿼리 전수 확인한 결과 동일 패턴 3곳:

- `buildMlbAccuracySummary.ts` (/mlb 허브 적중률 요약)
- `buildMlbCalendarHeatmap.ts` (/mlb/calendar)
- `buildMlbTeamProfile.ts` (팀 프로필)

`convergenceRecord.ts` (cycle 2063 fix, plan #24 Phase 3c) 만 이 필터를 갖고
있었고 나머지 3곳은 `league='mlb'` 만으로 필터링해 전체 scoring_rule 을 읽는
상태였음. 현재 MLB 는 scoring_rule 이 `mlb_v0.1` 단일값이라 실제 데이터 오염은
없지만, KBO 쪽이 v1.8-credit-fail / v2.1-B-shadow / v2.0-shadow / tabpfn-shadow 등
shadow cohort 를 반복 도입해 온 이력(PRODUCTION_COHORT_RULES filter family,
cycle 1100 wave 11~17)과 동일 구조 — MLB 에 shadow/backtest scoring_rule 이
생기는 순간 이 3곳의 사용자 가시 accuracy/calendar/team-profile 집계에 silent
로 섞이는 위험. 3곳 모두 `.in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)`
필터 추가로 선제 정합, 관련 test mock 3파일도 이중 `.in()` 체이닝을 지원하는
thenable 패턴으로 교체(실제 supabase-js 빌더 동작과 정합). 전체 3807/3807 pass,
tsc/lint clean. main 직접 commit (R4, 소규모 일관성 fix — PR 없음).

## ✅ explore-idea(heavy) — MLB 월별 캘린더 히트맵 신규 + monthGrid 실측 버그 fix (cycle 2123, 2026-08-14)

KBO `/calendar`(일별 예측 수 + 적중률 히트맵)를 MLB 로 병렬 복제(`/mlb/calendar`).
MLB `predictions.is_correct` 는 전량 NULL(`deriveMlbOutcome.ts` 참조)이라
`mlb_schedule` + `predictions(league=mlb)` 조인 후 직접 derive
(`buildMlbAccuracySummary` 동일 패턴 재사용).

- 월 grid 골격(`getKstMonthInfo`/`buildEmptyGrid`)을 `@/lib/calendar/monthGrid`
  로 추출해 KBO/MLB 양쪽 공유. **추출 중 실제 프로덕션 버그 발견+수정**:
  `new Date(iso + 'T00:00:00+09:00')` 로 KST 자정을 파싱한 뒤 `getUTCDay()`/
  `getUTCDate()` 를 읽으면 그 인스턴트가 "전날 15:00 UTC" 로 변환돼 있어(KST=UTC+9),
  (1) 캘린더 요일 정렬이 매달 1칸씩 밀림(예: 2026-08-01 토요일이 금요일 칸에 렌더)
  (2) 다음달 패딩 로직(`d.setUTCDate(+1)` 후 같은 타임존 파싱 왕복)이 같은 UTC
  날짜로 수렴해 트레일링 6칸이 전부 말일 날짜로 중복 렌더 — 두 결함 모두
  `Date.UTC(y,m-1,d)` 컴포넌트 기반 순수 캘린더 연산으로 교체해 수정. KBO
  `/calendar` 페이지가 이 골격을 그대로 써왔으므로 본 fix 로 KBO 페이지도
  동시에 정정됨(별도 회귀 없음, 기존 `calendar-isr.test.ts` 그대로 pass).
- `getMlbMonthHeatmap`(신규, `buildMlbCalendarHeatmap.ts`) — `mlb_schedule`
  기간 조회 + `predictions` 조인, `status='final'` 경기만 verified/correct 집계,
  미완료 경기는 total 만 카운트.
- `/mlb` 허브에 캘린더 링크 카드 추가, `sitemap.ts` 에 `/mlb/calendar` 등록.
- 테스트 4파일 신규(monthGrid 순수 로직 7건 — 버그 회귀 가드 포함 / MLB 히트맵
  쿼리 mock 4건 / 페이지 source-guard 6건 / sitemap 1건). 전체 3807/3807 pass,
  `tsc --noEmit` clean, lint clean.
- PR #2953 squash 머지 완료(state=MERGED 실측 확인). local main 은 squash 전
  원본 커밋을 이미 갖고 있어 origin/main(squash 커밋)과 hash 만 다르고 내용은
  동일 — merge commit 으로 동기화(cycle 2118 `326ebb20` 과 동일 패턴).
- **EN 미러(`/en/mlb/calendar`) 는 후속 cycle 후보로 남김** — 최근 KO→EN parity
  는 별도 review-code cycle 로 처리해온 기존 패턴(cycle 2118→2119) 정합.

## ✅ review-code(heavy) — validator.ts 환각검사 소수점 percent 동기화 갭 fix (cycle 2122, 2026-08-14)

cycle 2121 이 지목한 두 대형 파일 재점검. `analysis/page.tsx`(2802줄)는 v1.8 가중치
라벨/상수 전부 `@moneyball/shared` 참조 — 로컬 drift 없음(clean). `validator.ts`(887줄)
에서 실제 silent drift 발견 + fix:

- `buildInjectionText`(validator.ts)는 team-agent.ts `buildUserMessage`와 "동일 소스"
  라고 주석에 명시했지만, plan #23 Step 3(cycle 1227/1233)가 prepend 한
  `renderContextForLLM(buildAgentContext(...))` 블록은 recent_form/head_to_head 를
  `.toFixed(1)` 소수점 percent(예: 65.3%, 66.7%)로도 LLM 에 노출하는데, `buildInjectionText`
  는 정수 반올림(`Math.round`)만 동봉 — cycle 1233 이후 한번도 동기화 안 된 갭.
- 결과: LLM 이 실제 노출된 소수점 값을 그대로 인용해도 `checkHallucinatedNumbers` 가
  injection 안에서 못 찾아 `hallucinated_number` 오탐(warn/hard) 처리하던 버그.
- fix: `buildAgentContext` 재사용해 동일 계산으로 소수점 값을 injection text 에 추가
  (로직 복제 대신 단일 source). 회귀 가드 테스트 2건 추가.
- PR #2952 squash 머지 완료(state=MERGED 실측 확인). 전체 테스트 1125/1125 pass,
  tsc --noEmit clean.

## ✅ operational-analysis(lite) — CE 전면 정체 지속 재확인 + predict cron 정상 동작 검증 (cycle 2121, 2026-08-14)

`scripts/op-analysis-cohort.ts` 재실행(env 소싱 후 root 에서 정상 동작, cycle 2093 이
지적한 node_modules desync 워크어라운드 불필요 — 이미 해소된 듯). 결과:

- **전체 pre_game n=299** (v1.8 274 + v1.8-credit-fail 25) — cycle 2115(op-analysis
  heavy, 6 사이클 전)측정 n=299 와 **완전 동일**. 6 사이클(수 일) 동안 신규 pre_game
  예측이 정확히 0건 늘지 않은 것 아니라(cron 은 매일 돎), scoring_rule 분포가 안 변한 것 —
  즉 CE(CREDIT_EXHAUSTED) 100% fallback 지속 확정 재확인. 비CE 표본은 cycle 1550 이후
  n=47 로 계속 동결(신규 0건, 이번 cycle 도 동일). 사용자 Anthropic 크레딧 재충전 전까지
  불변 상태 — 신규 발견 없음, CLAUDE.md 기존 서술과 정합.
- **predict cron 정상 동작 실측 확인**: `pipeline_runs` 2026-08-14 `mode=predict` row
  6건(01~06시 UTC, 매시 정각) 전부 `games_found=5 / predictions=0 / status=success`,
  `skipped_detail` 사유 전부 `window_too_early` — 처음엔 "predictions=0 mismatch"
  실측 alert 패턴(CLAUDE.md 사례 11)처럼 보였으나, KBO 저녁 19시 경기를 새벽 UTC 시간대
  cron 이 매시 폴링하며 예측 생성 window 가 열리기 전이라 정상 skip 하는 설계 동작 —
  실제 silent drop 아님(오탐 배제, 코드 변경 불필요).

가중치 조정 불필요(v1.8 유지 확정 상태 변화 없음). 코드 변경 0 — 데이터 재측정 +
cron 오탐 배제만.

## ✅ review-code baseline 재확인 — 신규 issue/fix 후보 부재, 기존 stale carry-over 4건 정정 (cycle 2120, 2026-08-14, review-code lite)

cycle 2096 이후 24 사이클 만의 review-code 재점검. open hub-dispatch issue 0건, approved
plan 0건(plan #25 Phase 3 은 op-analysis 게이트 대기 확정). 다음 4개 후보를 직접 코드
read 로 재확인한 결과 전부 이미 닫힌 상태였음(신규 fix 불필요, TODOS.md 안 stale
포인터만 존재):

1. **MLB KO/EN 컴포넌트 태그 parity** — `/mlb`, `/mlb/team/[code]`,
   `/mlb/matchup/[teamA]/[teamB]` 3쌍 `comm -23` grep diff 재실행 → 0 mismatch
   (cycle 2119 가 마지막 gap 을 이미 닫음).
2. **cron 문자열 하드코딩 이중화** (TODOS.md 456행 "Tier 2 후속 후보" 텍스트) —
   `cloudflare-worker/src/__tests__/cron-sync.test.ts` 가 이미 cycle 2094 에 병합돼
   wrangler.toml↔worker.ts 구조적 drift 를 CI 에서 가드 중. 456행 텍스트는 cycle 2094
   이전 시점(cycle 2081) 항목 본문 안 stale 포인터.
3. **DEFAULT_WEIGHTS vs CLAUDE.md v1.8 가중치 문서** — `packages/shared/src/index.ts`
   실측 값(sp_fip 0.15/sp_xfip 0.05/lineup_woba 0.15/bullpen_fip 0.10/recent_form 0.10/
   war 0.08/head_to_head 0.03/park_factor 0.04/elo 0.10/sfr 0.05, 합 0.85)이 CLAUDE.md
   서술과 정확히 일치 — drift 없음.
4. **`buildMlbPlayerProfile.ts:131` `teams.code` 컨벤션** (cycle 2081 "범위 밖 미확인,
   낮은 우선순위" 후속) — 실제 코드 확인 결과 이미 `normalizeMlbTeamCode(p.team?.code)`
   로 정규화 적용 중(cycle 2081 5-callsite fix 에 포함돼 있었음). 별도 조사 불필요했던
   항목.

Vercel 배포 quota 도 자연 회복 확인(deploy 목록 실측 — 최근 30~44분 내 Production Ready
3건, `vercel ls`/`vercel inspect`). 코드 변경 0 — 4건 모두 "이미 닫힌 open item" 재확인이
성과. `pnpm lint`/`pnpm test` 재실행 없음(코드 변경 없어 skip).

## ✅ MLB EN 허브 모델 적중률 요약 섹션 parity 정정 (cycle 2119, 2026-08-14, review-code heavy)

cycle 2118 explore-idea heavy 가 KO `/mlb` 허브에 신규 추가한 전체 모델 적중률 요약
섹션이 의도적으로 EN 미러 미배선 상태 (KO/EN parity family 재발, cycle 2085/2091/2099/
2104/2108/2109/2110/2112/2113 series 연속). `buildConfidenceTiers` 에 locale 파라미터
추가(기본 'ko' 유지, KBO `/accuracy` 콜사이트 회귀 없음) 후 `buildMlbAccuracySummary`
로 전파, `/en/mlb` 페이지에 영문 섹션 신규 배선. KBO 상세 대시보드 링크 카드는 EN
미러(`/en/accuracy`) 부재로 제외, 2-column 통계 카드로 단순화. 회귀 테스트 1건 신규,
vitest 430 files/3787 tests 전부 pass. PR #2951 머지 실측 확인(gh pr view state=MERGED,
a57322bf).

## ✅ MLB 허브 전체 모델 적중률 요약 섹션 신규 (cycle 2118, 2026-08-14, explore-idea heavy)

cycle 2117(review-code heavy)이 방금 통합한 `deriveMlbOutcome` 를 재사용해 MLB 허브(`/mlb`)에
전체 팀 무관 적중률 + Brier + 확신도별 3-tier 카드 섹션 신규 추가. `buildMlbAccuracySummary`
가 `mlb_schedule`(status=final) + `predictions`(pre_game, league=mlb) 를 조회해 KBO `/accuracy`
가 쓰는 `bucketize`/`brierScore`/`buildConfidenceTiers` 유틸을 그대로 재사용(PredRow shape 로
매핑) — 로직 재구현 없이 기존 KBO 검증 로직을 그대로 재사용. 회귀 테스트 4건 신규, vitest
430 files/3786 tests 전부 pass. PR #2950 머지 실측 확인(gh pr view state=MERGED, 3af46951).

**의도적으로 EN 미러(`/en/mlb`)엔 미배선** — 지난 waterfall/Elo chart 케이스와 동일 관례,
다음 explore-idea 또는 review-code heavy 후보로 재기록. 텍스트 라벨("적중률"/"확신도" 등)
전량 하드코딩 한글이라 locale 파라미터 추가 필요.

## ✅ MLB predicted/actual home-win 판정 로직 중복 제거 (cycle 2117, 2026-08-14, review-code heavy)

`buildMlbTeamProfile.ts`/`buildMlbMatchupProfile.ts` 가 MLB `predictions.predicted_winner`/
`is_correct`/`confidence` 컬럼(전량 NULL — 팀이 string 코드라 INT FK 컬럼과 안 맞아
파이프라인이 의도적으로 안 씀)을 우회해 `home_win_prob` + 실제 스코어로 직접 correctness
derive 하는 동일 로직을 각자 따로 구현 중이었음. DB 실측(`is_correct` 754/754 final games
NULL)까지 확인하며 "MLB 정확도 검증이 아예 빠졌다"는 fix-incident 급 버그로 오인할 뻔했음 —
실제론 이미 일관된 워크어라운드였을 뿐. 이 근접 오진단 자체가 중복 로직 위험 신호(한쪽만
갱신되면 갈라짐, 다음 사람도 재오인 가능)라 판단해 `deriveMlbOutcome` 순수 함수로 통합,
"버그 아님" 주석 명시. 회귀 테스트 6건 신규, vitest 429 files/3782 tests 전부 pass. PR #2949
머지 실측 확인(gh pr view state=MERGED, bc5af7bc).

## ✅ MLB EN matchup 페이지 Elo 레이팅 추이 비교 차트 parity 정정 (cycle 2113, 2026-08-14, review-code heavy)

cycle 2112(MlbTeamEloChart, team/[code])와 동일 silent-drift family — cycle 2085
(plan#25 Phase 2b step 2)가 KO `/mlb/matchup/[teamA]/[teamB]` 에만
`MlbMatchupEloChart` 추가, EN 미러엔 배선 안 함. KO/EN JSX 태그 grep diff로
발견(`comm -23`로 KO 전용 컴포넌트 태그 나열 → matchup 페이지만 잔여).
`buildMlbMatchupEloTrend` fetch + Promise.all 배선 + "Elo Rating Trend
Comparison" 섹션 추가. 컴포넌트 자체는 팀명/색상만 렌더해 하드코딩 한글
없음 — locale prop 불필요(MlbTeamEloChart 케이스와 차이점). 회귀 테스트
1건 추가, vitest 428/3772 pass. PR #2945 머지 실측 확인(gh pr view
state=MERGED, 7d8443f0).

**다른 MLB KO/EN 페이지 쌍(factors/games/players/postseason/standings/team/
wild-card) grep diff 완료 — 나머지 전부 컴포넌트 태그 일치, 추가 gap 없음.**

## ✅ MLB 개별 경기 페이지(KO) "AI 종합 분석 요약" prose 추가 (cycle 2110, 2026-08-14, explore-idea heavy)

TODOS cycle 2098/2099 항목이 남겨둔 "KBO 의 나머지 parity(waterfall/debate/verdict/postview)"
후보 중 실제로 뜯어보니 debate/verdict/postview 는 KBO 전용 LLM 토론 파이프라인 산출물이고
MLB 예측 파이프라인(`mlb-pipeline.ts`)엔 애초에 `reasoning`/`confidence`/`debate_version` 자체가
없음(순수 정량 모델) — 컴포넌트 wiring 문제가 아니라 신규 LLM 파이프라인이 필요한 훨씬 큰
스코프였음(자가 검증 rubric: 시간비용 large, 별도 plan 후보로 분리).

대신 즉시 착수 가능한 작은 조각으로 스코프 축소: cycle 2104 가 이미 계산해둔
`computeMlbWaterfall` bar(팩터별 기여도 pp + 방향)를 재사용해 KBO `GameAnalysisProse`
패턴과 동일한 "AI 종합 분석 요약" prose 섹션을 순수 함수(`buildMlbGameOverview`,
`packages/kbo-data/src/factors/mlb-overview.ts`) + 컴포넌트(`MlbGameOverview.tsx`)로
신규 작성, MLB KO 게임 상세 페이지에 배선(점수 요약 섹션과 팩터 breakdown 섹션 사이).
신규 DB 조회/계산 없음(bar 서버에서 1회 계산해 prose + 기존 waterfall chart 양쪽 재사용).
회귀 테스트 4건 추가. `pnpm lint`/`tsc --noEmit`/`pnpm test`(427+86 files 전부) pass.

**당시 의도적으로 EN 미러엔 미배선** — waterfall bar label 이 한국어 하드코딩이라 prose 만
영문 번역하면 반쪽 결과라 skip, 다음 explore-idea heavy 후보로 재기록했던 항목.

**✅ cycle 2111 에서 완료됨** — `computeMlbWaterfall`/`buildMlbGameOverview` 에 locale
파라미터 추가 + EN 페이지 배선 완료(PR #2942, 08f1b29e). 본 항목은 stale carry-over였음
(cycle 2115 가 재작업 착수 전 실제 커밋 read 로 발견 — TODOS.md 미정리가 근거 없는
재작업을 유발할 뻔함, silent drift family 유사 패턴).

## ✅ MLB EN 개별 경기 페이지 SportsEvent JSON-LD + Waterfall + ShareButtons/RelatedLinks KO parity 정정 (cycle 2109, 2026-08-14, review-code heavy)

KO page.tsx 가 cycle 2099(SportsEvent JSON-LD)/2104(MlbFactorWaterfallChart)/2107
(ShareButtons+RelatedLinks) 에서 순차 추가한 4개 컴포넌트를 EN 미러(`/en/mlb/games/
[date]/[slug]`)엔 그 중 어느 것도 동기하지 않았음 — cycle 2108 이 games!inner 조인
silent-404 는 고쳤지만 그 사이 KO 에 쌓인 UI parity gap 은 발견 못함 (게시 후 사용자
신고로는 안 드러나고 코드 read 로 두 파일 직접 diff 해야만 보이는 종류).

EN page.tsx 에 4개 그대로 배선 — 텍스트만 영어. mlbCanonicalPair.path 는
locale-agnostic 이라 `/en${pair.path}` prefix 재사용(기존 en/mlb/matchup 페이지
ShareButtons 호출과 동일 관례). MLB_EVENT_STATUS 상수는 KO page.tsx 와 동일하게
페이지 로컬 중복. 회귀 가드 테스트 3건 추가. `pnpm lint`/`tsc --noEmit`/`pnpm test`
(427 files, 3768 tests) 전부 pass. PR #2940 CI green 후 자동 squash merge 완료.

## ✅ MLB EN 개별 경기 페이지 silent 404 정정 + 팩터 카운트 self-sync (cycle 2108, 2026-08-14, review-code heavy)

`/en/mlb/games/[date]/[slug]` 가 `predictions.game_id` 를 KBO 전용 `games!inner` FK 조인으로
조회 — MLB 예측 행은 `game_id=NULL`(migration 038, mlb-pipeline.ts:451)이라 이 조인은 항상
미스매치. **존재하는 모든 MLB 경기에 대해 이 EN 페이지가 silent 404** 였음(KO 페이지는
cycle 2099 에 이미 `mlb_schedule` + `external_game_id` 조인으로 고쳤으나 EN 미러는 그때
동기 안 됨). `mlb_schedule`+`external_game_id`+팀코드 정규화 패턴으로 재작성, KO 와 동일
7팩터 세트로 정렬(기존 4개 → 7개).

부수 발견: KO/EN 양쪽 heading·description 이 "전체 모델 팩터 총합" 상수(14)를 그대로 써서
실제 렌더 행(7개)과 표시 숫자 mismatch — cycle 2102 가 5→7행으로 늘렸지만 카운트 클레임
자체는 안 고쳐 재발. `GAME_DETAIL_FACTOR_ROWS.length` 로 self-sync 시켜 행 추가/삭제 시
자동 반영되도록 리팩터 — 하드코딩 카운트 재발을 구조적으로 차단. 회귀 가드 테스트 추가
(EN 페이지 `games!inner` 재도입 차단 + 양쪽 self-sync 패턴 검증), 기존 `silent-drift-wave-78`
테스트를 새 패턴에 맞춰 갱신. `pnpm lint`/`tsc --noEmit`/`pnpm test`(427 files, 3765 tests)
전부 pass. PR #2939 CI green 후 자동 squash merge 완료.

## ✅ MLB 개별 경기 페이지 FactorWaterfallChart 추가 — 메타데이터 "waterfall" 문구 실제 구현 (cycle 2104, 2026-08-14, explore-idea heavy)

`generateMetadata` description 이 이미 "waterfall" 문구를 박제해뒀지만(cycle 2099 이전부터)
실제 페이지엔 waterfall 시각화가 전혀 없었음 — 문구만 있고 구현 부재 (자체 발견 silent gap).
`computeMlbProbability`(mlb-base.ts) 항들을 그대로 재현하는 순수함수 `computeMlbWaterfall`
(`packages/kbo-data/src/factors/mlb-waterfall.ts`) 신규 작성 — sp_fip/sp_xfip/bullpen_fip/
lineup_woba/war/lineup_xwoba/lineup_barrel_pct(predictions 실측 컬럼, null 이면 fabricate
않고 bar skip) + park_factor(MLB_TEAMS[home].parkPf 정적값) + 홈 어드밴티지(elo 상수항 +
home_elo_bonus 고정) → 최종 bar 는 `pred.home_win_prob` 자체(권위값). recent_form/
head_to_head/elo(팀별)/defense_sfr/sp_xwoba_against/woba_std 는 mlb-pipeline.ts 가 항상
중립 입력(plan #25 Phase 3 게이트, cycle 2097/2103 확인 — 기여도 항상 0)이라 차트 대상에서
제외, 각주로 명시. `MlbFactorWaterfallChart.tsx` 컴포넌트(KBO FactorWaterfallChart.tsx 시각
패턴 재사용)로 `/mlb/games/[date]/[slug]` 페이지에 배선. 회귀 테스트 3건 추가(중립 입력 →
0 기여, null pair skip, 비대칭 매치업 → computeMlbProbability 값과 재구성 일치 확인).
KBO waterfall/debate/verdict/postview 나머지 parity 는 여전히 large 스코프(TODOS cycle
2099 항목 참조, 다음 explore-idea heavy 후보로 유지).

## ✅ MLB 개별 경기 분석 페이지 parity — SportsEvent JSON-LD 추가 + 진단 정정 (cycle 2099, 2026-08-14, explore-idea heavy)

cycle 2098 이 "MLB 는 개별 경기 단위 분석 페이지가 아예 없음" 이라 진단했으나 **부정확** —
`/mlb/games/[date]/[slug]/page.tsx` 가 이미 실존(route + `opengraph-image.tsx` +
`twitter-image.tsx` + Breadcrumb + 5팩터 breakdown, 오늘 커밋 f4796c0b 에서 mlb_schedule
조인 404 버그까지 수정됨). cycle 2098 sweep 이 이 라우트를 놓친 것으로 보임 — 신규 route
family 를 또 만들면 중복이었을 것.

실제 남은 gap 은 KBO `analysis/game/[id]` 대비 훨씬 작음: SportsEvent JSON-LD 부재
(구조화 데이터 리치 결과 후보 누락)만 확인 → 추가 완료 (`MLB_TEAMS` name/stadium +
`mlb_schedule.game_datetime_utc` + status→eventStatus 매핑, KBO 패턴 그대로 재사용).
회귀 가드 테스트 1건 추가. Waterfall/debate/verdict/postview 등 KBO 의 나머지 parity 는
여전히 large 스코프(MLB 전용 weight map/factor label/normalized-factor 빌더 신규 필요 —
elo/sfr/recent_form/park_factor 는 game-row `factors` JSONB 에 아직 없음) — 다음
explore-idea heavy 후보로 재기록, 단 "페이지 자체 부재" 프레이밍은 제거.

## 🔭 explore-idea(lite) — MLB 개별 경기 분석 페이지 parity gap 발견 (cycle 2098, 2026-08-14, ⚠️ 진단 일부 정정 — 위 cycle 2099 항목 참조)

MLB team_code alias family (cycle 2081/2087/2097) 진단 sweep 중 `normalizeMlbTeamCode`
전체 callsite 를 훑어 추가 alias 버그는 없음을 확인(clean — `buildMlbTeamFactorAverages.ts`
는 `toMlbStatsApiCode` 로 이미 올바르게 변환, `mlb-elo.ts` 의 ELO_NEUTRAL placeholder 는
plan #25 Phase 3(예측 반영) 가 의도적으로 미착수 상태로 남겨둔 것 — 버그 아님, backtest
게이트 대기 중).

sweep 중 구조적 parity gap 발견: KBO 는 `/analysis/game/[id]` 개별 경기 상세 분석
페이지(`FactorWaterfallChart` 팩터 기여도 waterfall 시각화 + OG/twitter image + 팀별
공유 가능한 개별 URL)가 있는데, MLB 는 팀-쌍 단위 `/mlb/matchup/[teamA]/[teamB]`
페이지만 있고 **개별 경기 단위 분석 페이지가 아예 없음**. `TopStatPickCard.tsx` 같은
KBO "오늘의 픽" 카드가 `/analysis/game/${gameId}` 로 링크하는 패턴도 MLB 는 대응 없음.

**self_verification** (5축 rubric):
```yaml
rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
가치: medium — parity gap. 사용자 가시 요청/불만 없음, 구조적 완결성 목적
시간비용: large — 신규 route family (external_game_id 키 다이나믹 경로, OG/twitter
  image, loading/not-found 상태, 데이터 빌더, 회귀 테스트) — 단일 cycle heavy 로
  수렴 어려움 (KBO analysis/game/[id] 자체가 opengraph-image.tsx/twitter-image.tsx/
  not-found.tsx/loading.tsx 4개 보조 파일 + FactorWaterfallChart 213줄 포함)
risk: 1 — 순수 additive, 기존 KBO 라우트/데이터 무영향
자율가능: yes — 본 메인 fire 가능, 사용자 결정 불필요
의존성: none — 기존 buildMlbMatchupProfile/factor 빌더 재사용 가능, 외부 결정 대기 X
```

**다음 explore-idea heavy fire 후보** — 위 스코프 그대로 착수 가능. 세부 설계 필요
지점: (1) URL 스킴 (`/mlb/analysis/game/[externalGameId]` 등, team-pair matchup
과 구분) (2) FactorWaterfallChart MLB 7팩터(FIP/xFIP/wOBA/불펜FIP/최근폼/Elo/SFR
대신 MLB 실제 팩터셋: spFip/lineupWoba/bullpenFip/recentForm/elo/xwoba/barrelPct)
재사용 가능성 (3) 완료된 경기만 (post_game) vs 예정 경기(pre_game) 라우팅 분기.

## ✅ MLB team_code alias 미정규화 → 실측 팩터(fip/woba/war 등) 30팀 중 사실상 전량 미반영 (cycle 2097, 2026-08-14, fix-incident/operational-analysis 겸 heavy)

plan #25 Phase 3(MLB Elo 예측 반영) op-analysis heavy backtest 게이트를 착수하려
`predictions` league=mlb 실측 데이터를 조사하다 발견: `home_sp_fip` non-null 이
764건 중 단 1건 — 거의 전량 MLB_STAT_DEFAULTS fallback. 원인 2가지 확인:

1. **진짜 실측 원인 (신규 발견, fix)**: `mlb_team_stats.team_code` 는 canonical
   (Baseball-Reference) 컨벤션으로 저장(DB 실측: CHW/KCR/SDP/SFG/TBR/ARI/WSN)되는데,
   `mlb-pipeline.ts` `runPredictFinal` 의 `statsByTeam.get(g.home_team_code)` 가
   `mlb_schedule` 의 StatsAPI 원본 코드(CWS/KC/SD/SF/TB/AZ/WSH)를 정규화 없이 그대로
   조회 — cycle 2081 사례27 이 이미 발견해 `MlbMatchupEloChart`/park_factor 소비
   경로에선 고쳤던 **동일 7팀 alias 버그가 실제 예측 파이프라인 핵심 조회 지점엔
   미적용** 상태로 남아있었음. `normalizeMlbTeamCode()` 를 홈/원정 양쪽에 적용해 수정
   (`packages/kbo-data/src/pipeline/mlb-pipeline.ts`) + 회귀 테스트 1건 추가
   (WSH↔WSN 케이스, `mlb-pipeline.test.ts`). `scripts/backfill-mlb-factor-breakdown.ts`
   (cycle 2065, 사례21) 도 동일 버그 보유 — 동일 수정.
2. **763/764 건이 null 이었던 진짜 이유는 별개**: `mlb_team_stats` 자체가 최근까지
   비어있었음 — `fancy_synced_at`/`savant_synced_at` 전량이 단일 배치 타임스탬프
   (2026-08-13T19:18/20:18 UTC, 즉 어제 새벽 KST) 로 동일 — FanGraphs/Savant 스크랩이
   최근에야 처음 성공(또는 처음 정상 반영)했다는 뜻. DET(alias 불필요, 정규 코드)
   같은 팀도 그 이전 예측은 null 이었던 건 이 타이밍 때문(정상 동작, 버그 아님).

수정 후 `scripts/backfill-mlb-factor-breakdown.ts --apply` 재실행 → 762/763건
정상 backfill(30/30팀 stats 매칭 확인, DB 실측). `pnpm lint`/`pnpm test`
(kbo-data 1114 + 전체 3750 tests) 전부 pass. plan #25 Phase 3 backtest 는 다음
predict_final cron 실행분(오늘 이후, alias fix 반영) 이 쌓인 뒤 재착수 — 이번
cycle 은 backtest 선행 조건(실측 팩터 데이터 정합성) 을 먼저 복구.

## ✅ review-code (lite) baseline 재확인, 신규 issue 0건 (cycle 2096, 2026-08-14)

풀 스캔 결과 open hub-dispatch issue 0건, approved plan 0건, CI green, Vercel 배포
정상 회복(quota reset 확인, HEAD `358d967b` prod 반영 실측), 2-chain alternation
lock 미충족(직전 8사이클 distinct=4: fix-incident/review-code/explore-idea/
operational-analysis), lotto(gap 23)/info-arch(gap 27)/design-system(23일) 모두
gap 임계 미도달 — 명확한 fire 후보 부재.

`pnpm lint` cache hit(신규 위반 0) + `pnpm test` 425 test files / 3750 tests
전부 pass. TODOS.md 안 Tier 2/3 후속 후보(cron 문자열 dedup, develop-cycle
batch push) 는 이미 "ROI 낮음 / 사용자 결정 필요"로 명시돼 자율 fire 대상
아님. 신규 라우트 mtime -7 grep 이 6개 히트했으나 git log 확인 결과 전부
기존 라우트(4월~5월 최초 추가) 최근 편집일 뿐 — info-arch 트리거 false
positive 로 판정, fire 보류.

## ✅ Cloudflare Worker CI 배포 실패 → 경고 downgrade, 매 push 마다 hub dispatch spam 차단 (cycle 2095, 2026-08-14, fix-incident lite)

cycle 2090 이 root cause 규명(`CLOUDFLARE_API_TOKEN` secret 미설정, 사용자
액션 필요) 했지만 workflow 자체는 그대로 hard fail 구조 — 그 뒤 cloudflare-worker/**
건드리는 커밋(cycle 2089/2090/2094 등)마다 CI 가 매번 빨간 실패 + `Notify
playbook on failure` step 이 매번 허브로 동일 fingerprint(`cron-deploy-cloudflare-worker-failure`)
알림을 반복 dispatch — 이미 알려진 외부 차단 항목(사용자가 Cloudflare
dashboard 에서 토큰 발급 후 `gh secret set` 해야 하는 1회성 액션)에 대해 매
push 마다 동일 알림 재생산하는 노이즈였음.

`.github/workflows/deploy-cloudflare-worker.yml` 에 `Check CLOUDFLARE_API_TOKEN
secret` step 추가 — secret 부재 시 `Deploy worker` step skip + `::warning::`
annotation 만 남기고 job 자체는 성공 처리. secret 있는 상태에서 실제 `wrangler
deploy` 가 진짜로 실패하면 기존처럼 `failure()` 가 여전히 hub dispatch 발동 —
"알려진 외부 블로커"와 "진짜 배포 실패"를 구분. `CLOUDFLARE_API_TOKEN` 등록은
여전히 사용자 액션 필요 (TODOS.md 아래 cycle 2090 항목 참조, 본 fix 는 그
등록 전까지의 CI 노이즈만 제거).

## ✅ cron 문자열 하드코딩 이중화 CI 가드 추가 (cycle 2094, 2026-08-14, review-code heavy)

cycle 2082 가 발견한 근접 사례(TODOS.md 197행, `wrangler.toml` crons 배열과
`worker.ts` dispatch 분기 문자열이 각자 하드코딩되어 한쪽만 바뀌면 전체 MLB/KBO
pipeline 이 silent skip 될 뻔했던 건) 의 Tier 2 후속. 기존엔 production 실행 시
"unknown cron" Sentry alert(cycle 2089) 만 있어 사후 감지 — CI 에서 사전 차단
부재.

`cloudflare-worker` 패키지에 `vitest` 신규 배선(`packages/kbo-data` 와 동일
컨벤션, 명시적 devDependency 없이 root 의 vitest 를 node_modules 워크업으로
재사용) + `src/__tests__/cron-sync.test.ts` 추가 — `wrangler.toml` 의 `crons`
배열과 `worker.ts` 의 `cronExpr === '...'` 문자열 집합을 정규식으로 추출해 정확히
일치하는지 assert. 검증: 임시로 문자열 1개를 어긋나게 만든 후 테스트가 실제로
fail 하는 것 확인 후 원복(`git status` clean 재확인).

`tsc --noEmit` 이 테스트 파일의 Node 내장 모듈(`node:fs` 등)을 타입 인식 못 해
(worker.ts 자체는 edge-only 라 `tsconfig.json` 의 `types` 가
`@cloudflare/workers-types` 만 허용 — 의도적 제한) 실패 — `types` 배열 자체를
넓히면 `worker.ts` 가 실수로 Node API 를 쓰는 걸 막던 안전장치가 깨지므로,
테스트 파일에만 `/// <reference types="node" />` + `@types/node` devDependency
추가로 국한. `turbo test`/`type-check`/`lint` 전량 통과(4 packages, cloudflare-worker
가 test task 신규 참여).

## ✅ CE(CREDIT_EXHAUSTED) 완전 정체 재확인 — cycle 1550 이후 신규 비CE 0건 (cycle 2093, 2026-08-14, operational-analysis lite)

`scripts/op-analysis-ce-cohort.ts` 재실행(cycle 1550 이후 543 사이클 만에 재측정,
전량 스캔 — 날짜 필터/LIMIT 없음, `prediction_type=pre_game` + `scoring_rule IN
('v1.8','v1.8-credit-fail')` + `is_correct NOT NULL`). 결과: 전체 n=299 (CE 252 /
비CE 47) — **비CE 표본이 cycle 1550 측정치(n=47)와 정확히 동일** = 그 사이 543
사이클 (~4개월) 동안 LLM debate 가 정상 작동(비CE)한 예측이 단 1건도 추가 안 됨.
신규 87건(165→252)이 모두 CE. CE 점유율 77.8%→84.3% 상승.

정확도/Brier 은 기존 패턴과 일치 유지: 전체 54.8%(164/299) / CE 53.2%(134/252)
Brier 0.3339 / 비CE 63.8%(30/47) Brier 0.2534 — 격차 10.7pp (기존 10.4~10.8pp
범위 내, 모델 자체 열화 아님). **전체 pooled 정확도가 60.9%→54.8% 로 보이는 건
CE 점유율 상승에 따른 mix-shift 이며 CE/비CE 각 cohort 정확도는 안정** — CLAUDE.md
"CE fallback rate 실측 정정" 결론과 정합.

결론: 사용자 Anthropic 크레딧 미충전 상태가 (cycle 1550 시점 대비) 개선 없이
완전 지속. 스크립트 코드 변경 없음(lite, 기존 harness 재실행만). 사용자 액션:
Anthropic 크레딧 충전 시 LLM debate 정상 복구 예상.

## ✅ 프로덕션 배포 drift 실측 해소 + cycle 2091 회고 silent 누락 복원 (cycle 2092, 2026-08-14, fix-incident)

`gh run list` 진단 — `deploy-drift-alert` 2연속 failure. 실측 확인 결과 main HEAD
(fec9ab2f) 가 production(`6abecb9`) 보다 2 커밋 앞선 채 약 10시간 미배포 상태 —
`vercel ls` 로 지난 10시간 신규 배포 자체가 0건 확인(quota 소진 이후 새 하루
시작 시점과 겹침, cycle 2083 changelog 의 "Vercel 배포 일일 100건 quota 소진"
후속). `vercel deploy --prod --yes` 수동 트리거로 정상 빌드+배포 완료, `/api/version`
실측으로 production=main HEAD(fec9ab2f) 일치 확인.

별도로 진단 중 cycle 2091(explore-idea heavy, MLB Elo 차트)의 `policy: cycle-retro`
커밋 + `~/.develop-cycle/cycles/2091.json` 양쪽이 원래 시점에 박제 안 된 사실
발견 — CLAUDE.md 사례 15(silent retro drift family) 재발, 이번엔 1-cycle 단일
누락. commit `d0ed6c1a` body(subtype/cycle 라인) + TODOS.md 기존 기록으로 증거
복원해 retroactive 커밋(`policy: cycle-retro 2091 ... (retroactive)`) + JSON
양쪽 박제.

## ✅ MLB 팀 프로필 페이지 Elo 추이 차트 parity gap 해소 (cycle 2091, 2026-08-13, explore-idea heavy)

KBO `teams/[code]` 페이지엔 `TeamEloChart`(시즌 경기별 Elo + 리그 평균)가 있지만
MLB `mlb/team/[code]` 페이지는 현재 Elo 숫자 한 값만 노출 — cycle 2083/2085
(plan #25 Phase 2b)가 `mlb_team_elo_history` 테이블을 신설하고 matchup 페이지만
소비했고 팀 프로필 페이지 소비가 빠져있던 parity gap.

`buildMlbTeamEloTrend.ts` (KBO `buildTeamEloTrend` 병렬 구현, `mlb_team_elo_history`
직접 조회 + StatsAPI alias 코드 정규화는 `buildMlbMatchupEloTrend` 패턴 재사용) +
`MlbTeamEloChart.tsx` 신규, `mlb/team/[code]/page.tsx` 에 배선. 기존
`mlb-team-code-page.test.ts` 의 `await buildMlbTeamProfile(code)` 리터럴 가드
때문에 KBO 페이지처럼 `Promise.all` 병렬화 대신 순차 fetch 유지(사소한 성능
trade-off, 가드 테스트 변경 없이 완료).

테스트 4건 신규(빈 결과/에러/정규화/평균 계산) + 전체 스위트 3750건 통과 +
lint/type-check 통과 확인 후 main 직push. CI 결과는 본 cycle retro 이후 확인.

## ⚠️ Cloudflare Worker 자동 배포 CI — 사례 25 재발, node 버전 수정했으나 CLOUDFLARE_API_TOKEN 미설정으로 여전히 미배포 (cycle 2090, 2026-08-13, 사용자 액션 필요)

cycle 2068(사례 25)이 "로컬 wrangler oauth 세션이 2026-06-12 이후 만료돼 그 뒤
worker.ts 변경 3건이 ~2개월 silent 미배포"를 발견하고 push 시 자동
`wrangler deploy` CI(`deploy-cloudflare-worker.yml`)를 신설했으나, 신설 후
첫 실제 실행 2건(cycle 2089 커밋, plan#25 mlb_elo_update 커밋) 모두
`gh run list`로 확인 결과 **failure** — `wrangler requires at least Node.js
v22.0.0`(workflow 가 `node-version: 20` 사용, `cloudflare-worker/package.json`
의 `wrangler ^4.108.0` 은 engines.node >=22.0.0 요구). 즉 사례 25 의 CI 도입
자체가 한 번도 성공한 적 없이 오늘 하루 2연속 실패.

**본 cycle 조치**: `deploy-cloudflare-worker.yml` node-version 20→24 로 수정
(CI 전역 다른 job 들과 정렬)+ push, `gh workflow run` 으로 수동 재실행해
실측 확인 — node 에러는 해소됐으나 **다음 단계에서 새 에러 노출**:
`CLOUDFLARE_API_TOKEN environment variable` 미설정 (`gh secret list` 확인
결과 해당 secret 자체가 리포에 없음). 로컬 `wrangler whoami` 도 "auth token
expired, non-interactive" — 로컬 세션도 여전히 죽어있어 로컬 fallback 배포도
불가.

**사용자 액션 필요 (내가 대신 못 함 — Cloudflare 계정 접근 필요)**:
1. Cloudflare dashboard → My Profile → API Tokens → Create Token
   (권한: Account → Workers Scripts:Edit, 해당 계정 한정)
2. `gh secret set CLOUDFLARE_API_TOKEN` (repo: kkyu92/moneyballscore) 로 등록
3. 등록 후 `gh workflow run "Deploy Cloudflare Worker" --ref main` 으로
   1회 수동 fire → `gh run list --workflow="Deploy Cloudflare Worker"` 로
   success 확인

**영향 범위 실측 필요**: 위 조치 전까진 cycle 2068 이후 worker.ts 를 건드린
모든 커밋(cron Sentry alert 승격 cycle 2089, mlb_elo_update cron dispatch
plan#25)이 production Cloudflare Worker 런타임에 반영 안 된 상태로 추정 —
특히 mlb_elo_update 매일 cron 이 실제로 fire 되는지는 secret 등록 후
재확인 필요 (배포 안 됐으면 해당 cron slot 자체가 아예 없는 것과 동일).

## ✅ worker.ts unknown-cron 분기 silent log → Sentry alert 승격 (cycle 2089, 2026-08-13, 사례 9 family)

`cloudflare-worker/src/worker.ts` scheduled() 최종 else (event.cron 이 4개 알려진
cron 문자열 어디에도 안 맞는 경우) 이 `console.log` 만 하고 끝나던 것을 발견 —
cycle 2081(사례 27) 이 실제로 겪었던 `wrangler.toml` "18-21" vs worker.ts
"18-22" hour range 불일치처럼 두 파일이 drift 나면 해당 cron slot(daily-pipeline
/ sitemap-warmup / live-update / MLB pipeline 중 하나) 전체가 배포 후 영구
silent skip 되고 Cloudflare Worker 로그는 능동 monitor 대상이 아니라 아무도
모름. 다른 실패 경로들(callPipeline/callMlbPipeline/runLiveUpdate)과 동일하게
`env.SENTRY_DSN` 있으면 `captureToSentry` 호출하도록 승격. type-check +
lint 통과. wrangler.toml 실제 값 재확인 결과 현재는 4개 문자열 모두 일치
(cycle 2081 이 이미 동기화) — 본 fix 는 재발 시 즉시 alert 만 추가, 문자열
자체 dedup(진짜 구조적 제거)은 별도 후속 후보로 유지.

**후속 후보 (Tier 3, 별도 cycle)**: wrangler.toml crons 배열과 worker.ts
if/else 문자열 비교가 근본적으로 두 파일 수동 동기화에 의존 — TOML 이라 TS
상수 import 불가. 진짜 제거하려면 event.cron 을 파싱해 최소 minute+hour 로
matching 하거나, wrangler.toml 을 코드 생성 소스로 만드는 tooling 필요. ROI
낮음(alert 승격으로 즉시 위험은 이미 차단), 사용자 판단 시 fire.

## ✅ PR #2887 (Footer 로또 hub 보강) 12일 silent 미머지 — R7 위반 발견+머지 (cycle 2088, 2026-08-13, 사례 18 family)

open PR 진단 중 `develop-cycle/ia-footer-lotto-hub-cycle-2022` (cycle 2022, 2026-08-01
생성)가 CI green + `mergeStateStatus: CLEAN` + `mergeable: true` 상태로 12일간 그대로
방치돼 있었음 — CLAUDE.md R7("본 메인 PR + CI green → 묻지 않고 즉시 머지") 위반,
`memory/drift-cases.md` 사례 18(retro 완료형 서술과 실제 명령 실행 혼동)과 동일
family — 당시 cycle 2022 가 PR 생성 후 `--auto` 플래그 결과를 확인하지 않고 다음
cycle으로 넘어간 것으로 추정(원인 cycle 자체는 로그 부재로 확정 불가). 본 cycle이
`gh pr view --json mergeable,mergeStateStatus` 실측 후 `gh pr merge --squash
--delete-branch` 실행 + `state=MERGED`(commit `0703639`) 확인. 다른 open PR 9건 중
develop-cycle 산출물은 이 1건뿐(나머지 8건은 dependabot — 정책상 자동 진행 대상 아님).

**후속 후보 (Tier 2)**: cycle 2001이 이미 `/commits` API fallback 등으로 사례 18 재발
차단을 시도했으나 이번 건은 애초에 R7 자동 머지 명령 자체가 실행 안 된 케이스 —
PR 생성 직후 `--auto` 활성화가 silent 누락되는 경로가 남아있을 가능성. 다음 review-code
heavy fire 시 develop-cycle 워커의 PR 생성 → auto-merge 활성화 배선 지점 재확인 후보.

## ✅ buildMlbPlayerProfile.ts teams.code 정규화 누락 — 사례 27 family 선제 수정 (cycle 2087, 2026-08-13)

cycle 2081(사례 27)이 5개 callsite에 `normalizeMlbTeamCode()`를 적용하며
`buildMlbPlayerProfile.ts:131`은 "teams.code 컨벤션 미확인"으로 범위 밖에 남겨뒀음.
본 cycle이 DB 실측(service role 쿼리) — `players` 테이블에 MLB row가 아직 0건(현재
미발현, 실제 버그 아님) 확인 후, StatsAPI alias 7팀(TB/CWS/KC/SD/SF/AZ/WSH) 코드로
시딩 시작 시 `teamName`이 silent null 될 잠재 지점을 선제 차단 — 다른 5개 callsite와
동일 패턴으로 `normalizeMlbTeamCode()` 적용 + alias 코드 회귀 테스트 1건 추가.
type-check/lint/test(424 files/3745 tests) 전량 통과. Vercel quota blackout(아래 참조)
기간이라 배포 검증은 무의미 — 코드 정확성 확인만으로 충분(quota reset 후 자동 반영).

## 🚨 최우선 carry-over: Vercel 배포 일일 100건 quota 소진 — production 이 4ab223b0(cycle 2081)에 고정 (cycle 2083, 2026-08-13)

당일 develop-cycle 누적 fire(cycle 2065~2082, 18회 PR merge)가 Vercel free tier 일일
배포 100건 cap 을 소진 — `d3caf0e7`(cycle 2082, mlb_elo_update 파이프라인)/`d757ab0d`/
`b651a3cc` 3개 commit 이 main 에 push 됐지만 Vercel 배포 기록 자체가 없음(canceled 도
아니고 완전 누락, `curl .../api/version` 실측 = 여전히 `4ab223b0`). `vercel deploy --prod`
수동 시도 결과 `"Resource is limited - try again in 24 hours (code: api-deployments-free-per-day)"`
확정 — GH 웹훅/git 연동 문제 아님. 기존 `feedback_deploy_strategy.md`(auto-memory) 경고
("Vercel 일 100회 제한, push는 묶어서") 가 실측으로 소진된 첫 사례.

**영향**: cron(mlb_elo_update 포함 MLB/KBO 파이프라인 전체)이 quota reset 전까지 최신
코드로 갱신 안 됨 — Cloudflare Worker 배포 지연(사례 25, 아래)과 별개의 신규 정지 지점.
Elo history backfill 은 Vercel 우회(Supabase 직접 스크립트)로 완료해 영향 없음.

**예상 quota reset**: 최초 소진 시점(cycle 2082 push, 22:06:55 KST) 기준 24시간 =
~2026-08-14 22:07 KST. 그 전까진 main 에 push 해도 배포 안 됨 — 다음 cycle 들이 이
사실을 인지하고 (1) reset 전엔 배포가 안 되는 걸 전제로 진단할 것(코드는 정상인데
prod 만 stale — false negative 로 "배포됐는데도 반영 안 됨" 오진 방지) (2) reset 후
누적된 여러 commit 이 한꺼번에 배포될 것(순서상 마지막 push 만 실제 반영, 중간
push 들은 스킵되는 Vercel 배치 특성 고려).

**후속 후보 (Tier 2, 별도 cycle)**: develop-cycle 이 PR 마다 매번 개별 push+merge 하는
현 구조가 quota 소진의 구조적 원인 — cycle 다수를 batch 로 묶어 push 빈도를 낮추는
방안(예: N cycle 마다 1회 push)이 근본 완화책이나 develop-cycle skill 의 "1 cycle = 1
commit" 원칙과 충돌 여지 있어 사용자 결정 필요.

### 🔁 재발 확인 (cycle 2134, fix-incident heavy, 2026-08-14 16:59 KST) — "단일 reset 시점" 모델 정정

위 "예상 quota reset ~2026-08-14 22:07 KST" 서술은 **틀린 모델**이었음 — 실측(`vercel ls`)
결과 quota 는 그 전에도 여러 차례 정상 회복돼 프로덕션 배포가 성공(16:12/16:32 KST 등,
2h 내 다수 Ready 기록) 했다가, 오늘 cycle 2114~2133(20 사이클) 고빈도 push 로 **16:32
KST 이후 다시 소진**됨 — `vercel deploy --prod --yes` 직접 실행으로 동일 에러
(`"Resource is limited - try again in 24 hours (code: api-deployments-free-per-day)"`)
재확인. 즉 이 한도는 고정 시각 1회 리셋이 아니라 **rolling 24h window** — 프로젝트가
하루 100회를 넘길 만큼 push 하면 낡은 배포가 window 밖으로 빠질 때마다 슬롯이 열렸다
바로 다시 막히는 상태가 반복됨 (오늘 cycle 수가 20+ 로 매우 높아 상시 포화 상태에 가까움).

**현재 stale 상태**: production = `f7b2b61d`(cycle 2129 commit, `curl .../api/version`
실측). 그 뒤 실제 코드 변경 커밋 2개가 아직 미반영: `270248ee`(cycle 2130, nav 정정)
+ `42235760`(cycle 2132, MLB top-pick 딥링크 feat, #2955). **오진 방지**: 다음 cycle
들은 이 2개 커밋이 "배포됐는데 반영 안 됨" 이 아니라 "quota 로 배포 자체가 안 트리거됨"
임을 전제할 것 — 코드는 정상, prod 만 지연.

**신규 발견 gap**: `vercel-deploy-error-dispatch.yml` (deployment_status 이벤트 리슨) 은
이 케이스를 못 잡음 — git 연동이 quota 로 배포 객체 자체를 생성 못하면 `deployment_status`
webhook 이 애초에 발화 안 함 (실패한 배포가 아니라 "배포 시도 자체가 없음"). 기존
alert 체계의 사각지대 — 별도 cycle 에서 "prod api/version 의 commit_sha 가 main HEAD
대비 N 커밋 이상 뒤처짐" 을 직접 폴링하는 감지 방식 검토 후보 (Tier 2).

## ✅ plan #25 Phase 2b step 2 — MlbMatchupEloChart 배선, Phase 1~2b 전체 완결 (cycle 2085, 2026-08-13)

`mlb_team_elo_history`(migration 047, cycle 2083 backfill 1,472건)를 소비하는
`buildMlbMatchupEloTrend` + `MlbMatchupEloChart`(KBO `MatchupEloChart` 병렬 복제) 신규,
`/mlb/matchup/[teamA]/[teamB]` 페이지 `MlbMatchupFactorCompare` 다음에 배선. 테스트
4건(alias 정규화 merge/편측 null/빈 결과/select error throw) + type-check/lint 전량
통과. Vercel quota 소진(아래 참조)과 무관하게 main merge — 코드 정확성은 배포 상태와
독립, quota reset 후 자동 반영.

**plan #25 전체 종료** (`~/.develop-cycle/plans/moneyballscore/25.md` status:
`phase2b_complete`). 잔여 Phase 3(예측 반영, `ELO_NEUTRAL` placeholder → 실제 rating)는
op-analysis heavy backtest 로 Brier 개선 실측 전 자율 flip 금지 — 별도 사용자 결정
필요한 항목으로 이월, 다음 op-analysis heavy fire 시 후보 재검토.

## ✅ plan #25 Phase 2b step 1 — MLB Elo 히스토리 테이블(matchup Elo 추이 차트용) + 1회성 backfill 완료 (cycle 2083, 2026-08-13)

cycle 2082 가 발견한 blocker(`mlb_team_elo` 가 현재 스냅샷만 저장 — 시계열 없음)를
plan #25.md 권장 옵션 1(히스토리 로그 테이블 신규)로 해소. migration 047
`mlb_team_elo_history`(team_code/game_date/season/elo_rating, UNIQUE(team_code,
game_date)) 신규 + `computeMlbEloHistory()`(mlb-elo.ts, `computeMlbEloRatings()`와
재생 루프 공유) + `runEloUpdate()` 매일 history 도 함께 upsert 배선.

**실측 중 버그 발견+수정**: 더블헤더 시 배치 upsert 가 Postgres
`ON CONFLICT DO UPDATE command cannot affect row a second time` 로 전체 reject —
`computeMlbEloHistory()`가 반환 전 (team_code, game_date) dedupe 하도록 수정.
`scripts/backfill-mlb-elo.ts --apply` 로 748경기 전체 재생 → 1,472건 1회성 backfill
완료(DB 실측 확인, Vercel quota 소진과 무관하게 Supabase 직접 스크립트로 완료).

**Phase 2b step 2 — ✅ cycle 2085 에서 완료됨**: `MlbMatchupEloChart.tsx`
신규(KBO `MatchupEloChart` 병렬 복제) + 매치업 페이지 배선 완료 (위 cycle 2085 항목
참조). 본 pointer 는 stale carry-over였음 (cycle 2116 이 발견 정정 — cycle
2110/2115 와 동일 silent-drift family: 완료된 항목의 "다음 fire 후보" pointer 를
미정리 상태로 남겨 근거 없는 재작업 유발 위험).

## ✅ plan #25 Phase 2 step 1 — MLB Elo 매일 자동 갱신 파이프라인 완료, 매치업 차트는 신규 blocker 발견 (cycle 2082, 2026-08-13)

`mlb_team_elo`(migration 046, cycle 2080) 는 지금까지 1회성 백필 스크립트로만 갱신됐음 — 매일 자동 갱신 경로가 없어 결과가 확정될수록 rating 이 stale 해지는 구조. `packages/kbo-data/src/factors/mlb-elo.ts` 에 `computeMlbEloRatings()` 순수 함수를 추출(backfill 스크립트와 로직 공유, 회귀 테스트 7건)해 신규 pipeline mode `mlb_elo_update` 를 만들고(`mlb-pipeline.ts`), `wrangler.toml`/`worker.ts`/API route 3곳에 배선(cron: UTC 22 = KST 07, 신규 slot 소비 없이 기존 MLB hour range 확장). **매일 전체 재생 방식**(증분 아님)을 택한 이유는 `mlb_team_elo` 에 "이 경기 이미 반영" 처리 로그가 없어 증분 삽입은 cron 재실행 시 이중 반영 위험 — 전체 재생은 팀당 최대 ~162경기라 비용 낮고 항상 idempotent.

**cron 문자열 정확 일치 함정 자체 발견+수정**: `worker.ts` 의 dispatch 분기가 `cronExpr === '17 18-21,10 * * *'` string literal 완전 일치 조건이라, `wrangler.toml` 만 hour range 를 넓히고 이 문자열을 안 바꿨으면 배포 후 MLB pipeline 전체(신규 elo_update 뿐 아니라 기존 scrape/predict_final 도)가 silent 미발화됐을 뻔함 — 기존 `silent-drift-wave-193` 회귀 테스트가 정규식 검증이라 이 이중화 자체는 못 잡았음. 본 cycle 이 코드 리뷰 중 직접 발견해 두 파일 동기화. 후속 후보(Tier 2, 별도 cycle): cron 문자열 하드코딩 이중화 제거.

**Phase 2b(matchup Elo 추이 차트) 는 신규 스키마 blocker 로 보류**: `mlb_team_elo` 가 `UNIQUE(team_code, season)` 현재 스냅샷만 저장 — KBO(`predictions.home_elo`/`away_elo` 가 매 경기 row 에 쌓여 시계열 자연 발생) 와 달리 historical 시계열이 없어 `MlbMatchupEloChart` 를 그대로 복제 불가. 옵션 3개(히스토리 로그 테이블 신규/on-demand 재계산/Phase 3 로 스코프 전환) 를 plan #25.md 에 박제 — 히스토리 테이블 신규 채택, cycle 2083(테이블+backfill)/2085(차트 배선)로 **완료됨** (본 pointer, cycle 2116 정정 — 위 항목과 동일 stale carry-over 재발).

type-check(4 packages)/lint/test(kbo-data 1107 + moneyball 3740, 전체) 전량 통과. PR 머지 대기.

## ✅ MLB_TEAMS StatsAPI/Baseball-Reference 7팀 코드 불일치 — 5개 callsite 정규화 완료 (cycle 2081, 2026-08-13, 사례 27)

cycle 2080 발견 이슈(park factor silent neutral fallback) 실측 확대 조사 결과 — DB 실측(`mlb_schedule` 759 rows)으로 확인한 7팀 alias(`TB`/`CWS`/`KC`/`SD`/`SF`/`AZ`/`WSH` → `TBR`/`CHW`/`KCR`/`SDP`/`SFG`/`ARI`/`WSN`)가 **park factor 뿐 아니라 매치업/팀 페이지 DB 쿼리 필터 전체를 깨뜨리고 있었음** — canonical 코드로 `.or(home_team_code.eq.TBR,...)` 필터링 시 DB 실측(`TB`)과 불일치해 이 7팀이 낀 모든 매치업(`/mlb/matchup/*`)·팀(`/mlb/team/*`) 페이지가 항상 "0경기"만 반환(silent empty, park factor 보다 심각).

`packages/shared/src/mlb-teams.ts`에 `MLB_STATSAPI_TEAM_ALIASES` + `normalizeMlbTeamCode`(DB→canonical)/`toMlbStatsApiCode`(canonical→DB) 양방향 변환 추가 후 5개 callsite 수정: `mlb-pipeline.ts`(park factor), `convergenceRecord.ts`(수렴픽 OR필터+homeCode), `buildMlbMatchupProfile.ts`(매치업 OR필터+homeCode/awayCode), `buildMlbTeamProfile.ts`(팀페이지 OR필터+isHome/opponentCode), `buildMlbTeamFactorAverages.ts`(팩터평균 OR필터+isHome). 회귀 테스트 6건 추가(각 callsite StatsAPI 코드 입력 시 정상 동작 검증). type-check/lint/test(전체 4527 tests) 전량 통과.

**범위 밖 미확인 (낮은 우선순위)**: `buildMlbPlayerProfile.ts:131`의 `teams.code`(curated seed 테이블, 스크래퍼 직접 소비 아님)는 컨벤션 미확인 — 별도 조사 필요 시 후속.

## ✅ lotto cron 자동화 4주 연속 silent 실패 — root cause 해소, 실측 fire 확인만 대기 (cycle 2072, 2026-08-13, 사례 26)

`lotto-pick-update.yml`/`lotto-result-update.yml` 의 `gh pr create --label "automated,lotto"` 가 존재하지 않는 `lotto` label 참조로 4주 연속(`lotto/pick-2026-08-01`, `pick-2026-08-08`, `result-2026-07-25`, `result-2026-08-01`) PR 생성 자체가 실패 — 데이터는 branch 에 push 됐지만 main 에 반영 안 됨. `gh label create lotto` 로 root cause 해소 완료. 데이터 손실 2건(1235회 결과, 1236회 50조합)은 고아 branch 에서 cherry-pick 복구, 나머지 2건(이미 다른 커밋으로 대체)은 branch 삭제.

**남은 확인**: 다음 lotto-pick-update fire(매주 금, cron `19 0,3,6 * * 5`) 또는 lotto-result-update fire(매주 토, cron `19 17,20,23 * * 6`) 때 PR 이 정상 생성 + auto-merge 되는지 실측 확인 — 구조적 fix 는 완료했으나 아직 실제 fire 로 검증 전.

## 🚨 최우선 carry-over: Cloudflare Worker 배포가 ~2개월간 로컬 wrangler 세션 만료로 미배포 (cycle 2068, 2026-08-13, 사례 25)

`cloudflare-worker/` (Worker `moneyballscore-cron`, 모든 cron 의 primary trigger)가 로컬 `wrangler deploy` 단일 경로에만 의존 — `~/Library/Preferences/.wrangler/config/default.toml` 의 oauth `expiration_time`/`refresh_token` 발급일이 **2026-06-12** 로 고정, 이후 refresh 시도 시 `400 Bad Request`("Token refresh failed") 로 non-interactive 환경에서 재인증 불가 확인. git log 대조 결과 `cloudflare-worker/src/worker.ts` 의 마지막 성공 배포 추정 시점 = 2026-06-12 commit `b1be1aac`(MLB cron trigger 추가) — 그 뒤 3개 commit 이 main 에는 있지만 **실제 Worker 런타임엔 미배포 추정**:
  - `6be40626`/`b7380691` (2026-07-06): Sentry capture + cron fire count 정합 fix
  - `643dba4e` (2026-08-13, 이번 cycle 직전, 사례 23/24): `mlb_schedule` KST backfill 로직 — 이 fix 가 배포 안 되면 `mlb_schedule.status` 가 다시 'scheduled' 에 고착될 위험

**이번 cycle 조치 (자율 영역 완료)**:
- root cause 1 = `cloudflare-worker/`가 `pnpm-workspace.yaml` packages glob 밖에 있어 `wrangler` 등 의존성이 root `.pnpm` store 에 정상 hoist 안 됨(symlink dangling, `MODULE_NOT_FOUND`) → `pnpm-workspace.yaml` 에 `cloudflare-worker` 추가 + `package.json` `pnpm.onlyBuiltDependencies: ["workerd"]` 추가로 `wrangler --version`/`whoami` 정상 동작 확인 (`type-check`/`test`/`lint` 전체 통과, turbo 4 packages 인식)
- root cause 2 (auth) = 사용자 영역, 아래 참조
- `.github/workflows/deploy-cloudflare-worker.yml` 신규 — `cloudflare-worker/**` push 시 자동 `wrangler deploy` (CI, `CLOUDFLARE_API_TOKEN` secret 사용). 로컬 세션 만료에 더 이상 의존하지 않는 구조로 전환.

**🔔 사용자 확인/조치 필요**:
1. GH repo secret `CLOUDFLARE_API_TOKEN` 등록 필요 — Cloudflare dashboard → My Profile → API Tokens → Create Token (권한: Account.Workers Scripts:Edit). 등록 전까진 신규 workflow 실행 시 실패.
2. 위 secret 등록 전 급하게 최신 코드를 배포해야 한다면 로컬에서 `cd cloudflare-worker && npx wrangler login`(브라우저 인증) → `npx wrangler deploy` 1회 수동 실행 필요 — 본 메인은 non-interactive 환경이라 브라우저 OAuth 대행 불가.
3. secret 등록 후 다음 `cloudflare-worker/**` 변경 push 시 자동 배포되는지 Actions 탭에서 1회 확인 권장.

## ✅ MLB matchup/team 페이지 teams/games FK gap — 실측 재검증 완료, 화면 정상 렌더 확인 (cycle 2065~2067 fix + cycle 2078 재검증)

`/mlb/matchup/[teamA]/[teamB]`, `/mlb/team/[code]` 가 Phase 1(cycle 2054)부터 항상 빈 화면이던 문제(사례 22/23/24)는 cycle 2066(빌더 재작성)+2067(RLS anon 정책 + KST backfill 스크립트 `scripts/backfill-mlb-schedule-status.ts`) 로 root cause fix. cycle 2078 재검증 결과 — `pipeline_runs` 실측: 위 backfill 스크립트가 `--apply` 로 2026-08-13 10:09 UTC 에 이미 실행 완료(`triggered_by='backfill-script'` 57건), `mlb_schedule` 748/759 `final`(98.5%). prod curl `/mlb/matchup/NYM/PHI`(4승5패 등 실제 데이터) + `/mlb/team/PHI`(예측 경기 52, 적중률 50%) 양쪽 정상 렌더 확인 — **이제 완전히 해소**. 남은 리스크는 Cloudflare Worker 미배포(사례 25, 아래) 로 인해 *향후* 새 경기 날짜가 다시 'scheduled' 에 고착될 가능성뿐 — 과거분 blank-page 문제 자체는 재발 없음.

- Phase 3c 는 이 gap 해소로 재개 가능 (cloudflare 배포와 무관) — 상세 = `~/.develop-cycle/plans/moneyballscore/24.md`. plan #24 전체 phase 완결 + close. 잔여 Phase 2b(MLB Elo rating 신규 구현)는 cycle 2079 (explore-idea lite) 가 `~/.develop-cycle/plans/moneyballscore/25.md` 로 분리 — Explore agent 실측 결과 KBO 도 자체 K-factor 갱신 로직 없음(외부 스크랩 스냅샷뿐, `team_season_stats.elo_rating` 은 dead schema) 확인되어 신규 엔진 설계 필요 (Tier 3, Phase 1 엔진+백필 / Phase 2 자동갱신+UI / Phase 3 예측반영은 op-analysis backtest 게이트 필수)

## 🔔 사용자 확인 필요: PR/issue close 8+1건 (cycle 2009, 2026-07-28)

fix-incident cycle 2009 가 8일 방치된 hub lesson-pending reminder 8건(#2857-2864) + dependabot PR #2840 을 root cause 규명 완료. close 액션은 타 작성자(dependabot)/허브 리마인더 영역이라 자동 진행 대상 아님(Bash 권한 거부 확인).

- PR #2840 (dependabot eslint 9.39.4→10.8.0 bump): close 권장 — eslint-plugin-react peerDep 상한 초과로 CI 항상 실패, `.github/dependabot.yml` 에 ignore 규칙 추가함(PR #2872 merged)
- reminder #2857-2864 (8건): close 권장 — 6건은 2026-07-21 야간 Vercel 배포 지연(외부/일시, 재발 0), 2건은 이미 in-cycle 해소

## ✅ MLB backend migrations 033-037 prod 적용 완료 (cycle 1151, 2026-06-10)

**root cause fix-incident heavy 완료** — cycle 1149 lite mitigation (empty fallback) 위 root cause 정리.

**migration 033 수정 사항** (cycle 1151):
- 3 missing table ALTER 제거 (`team_recent_form` / `head_to_head` / `stadium_stats` — prod 부재, git/코드 안 사용 X, spec design 미실현)
- broken index `idx_predictions_league_date (league, game_date DESC)` 라인 제거 (predictions.game_date 부재 → 037 가 corrected `(league, game_id DESC)` 박제 중)
- `idx_team_season_stats_league_season_team` 컬럼 정정 (`team_code` → `team_id`)

**검증 (REST API, prod)**:
- ✅ predictions.league = "kbo" (default 적용)
- ✅ predictions.home_lineup_xwoba / barrel_pct / hard_hit_pct / launch_angle = null OK
- ✅ shadow_weights table 존재 (row 0)
- ✅ walk_forward_brier table 존재 (row 0)
- ✅ games.game_datetime_utc 박제 (UTC TIMESTAMPTZ backfill 완료)

**잔여 cleanup (별도 cycle)**: `/mlb` hub + `/mlb/games/[date]` empty fallback (cycle 1149) safety layer 유지 (silent drift family wave 13 재발 방지).

## ✅ Resolved Lessons
- `fp:vercel-deploy-1e80b78` (2026-04-22): Sentry /webhook sub-path 3회 실패 → no-relay=true 태그로 해결 (박제 2026-04-29)

## 🎰 Lotto plan #6/7 carry-over (cycle 882, 2026-05-22~, **cycle 885 갱신**)

**상태**: 자율 영역 항목 1, 2, 4-partial **모두 ship 완료**. 잔여 = 사용자 영역 (항목 3) + gating 잔여 (항목 4 Step C/D) + 자연 누적 (항목 5).

**carry-over 항목**:

1. ✅ **plan #6 Step B** ship 완료 (PR #1240 e663fe8, cycle 822) — Header NAV "로또" group 2 link (`/lotto/methodology` + `/lotto/archive`) + `/lotto/archive/page.tsx` index + Footer "로또" column 2 link 박제 확인.
2. ✅ **1225회 OOS 검증** ship 완료 (PR #1246 cf86586, cycle 885) — 256 rules **100% PASS** + 5등 6건 (random 0.89 → 실제 6 = **6.7× over-perform**) + 1등 score breakdown (sum 거리 가중치 약점 80%+ 식별, valid pool top 10.86%) + 누적 OOS **N=2** (1224 + 1225).
3. ✅ **14일 AdSense reject signal monitor** 완료 (2026-06-12, cycle 1163) — 모니터 기간 05-22~06-05 reject 신호 0. plan #6/7 유지. plan #7 Step C/D 이미 ship (cycle 1138). lotto 섹션 자율 영역 완전 closed.
4. ✅ **plan #7 Step C/D** ship 완료 (cycle 1138, 2026-06-10) — `/lotto` hub + `/lotto/archive/[date]` UI 강화 박제.
   - ✅ **Step C** — `/lotto/page.tsx` hub (ISR 1h) + picks-loader.ts + OG image. 추천 5세트 above-the-fold (gold border) + 50조합 default collapse + 통계 표. Header NAV 3 link 완성.
   - ✅ **Step D** — `/lotto/archive/[date]` 번호 ball + gold hero + collapse + 자연어 표기. Breadcrumb /lotto→archive→date.
   - ✅ **Step E (cron 자동 갱신) + Step F partial** 기완료 (cycle 885). fix: pnpm tsx → pnpm exec tsx (CI 실패 4개 workflow 수정, cycle 1138).
   - ✅ **누락 picks 복구** — 2026-06-06 (1227회) + 2026-06-13 (1228회) 수동 박제 (cron 6/5 실패 복구).
5. ✅ **N=10 누적 OOS 달성** (cycle 1842, 2026-07-20) — 256 rules 통계적 우위 "actionable" 임계 최초 도달. 1등 catch 0/10 → score 모델 sum 가중치 저합 구간 약점 확인 (차원별 비교 2026-07-18.md).
   - 1226회 (2026-05-30) `4 6 13 17 26 28` — PASS 256/256, 4 variant 중 balanced #29 3매칭 (5등 tier_3 = 1건)
   - 1227회 (2026-06-06) `1 14 16 34 41 44` — PASS 256/256, 1 variant 0매칭
   - 1228회 (2026-06-13) `24 29 30 31 35 44` — PASS 256/256, **4등 3건 + 5등 3건** (best OOS 결과, ~60× over-perform for 4등)
   - 1229회 (2026-06-20) `12 13 29 34 37 42` — PASS 256/256, 5등 2건 (1.8× over-perform baseline) — cycle 1292 박제
   - 1230회 (2026-06-27) `3 8 9 22 28 42` — PASS 256/256, 최대 2매칭 (무당첨) — cycle 1414 박제
   - 1231회 (2026-07-04) `4 13 14 18 31 38` — PASS 256/256, 최대 2매칭 (무당첨) — cycle 1462 박제
   - 1232회 (2026-07-11) `12 15 19 22 24 36` — PASS 256/256, 최대 2매칭 (무당첨) — cycle 1543 박제
   - 1233회 (2026-07-18) `2 7 20 25 37 40` — PASS 256/256, **5등 1건** (10balanced #7: `5 7 16 25 40 45`), 1등 미포함. 번호 합 131 vs 추천 평균 213.6 (저합 구간 gap -82.6) — cycle 1857 실측 박제 (cycle 1842 retro "5등 7건" = artifact 미생성 hallucination → cycle 1857 정정, `2026-07-18-result.md` 생성)
   - 1234회 (2026-07-25) `1 15 19 31 35 43` — PASS 256/256, main 50세트 최대 2매칭 (무당첨), 1등 미포함. 번호 합 144 vs 추천 평균 207.9 (저합 gap -63.9), 연속쌍 0 vs 추천 평균 3.2 — cycle 2012 실측 박제 (`2026-07-25-result.md` + `apps/moneyball/data/lotto-results/2026-07-25.md` 생성, 직전 사이클 방치 8일치 backlog 아님 — 추첨 직후 최초 검증)

**완료 조건 (MLB 작업 시작 trigger)**: 항목 1, 2, 4-Step E/F partial 자율 영역 closed. 잔존 carry-over = 항목 3 (사용자 영역) + 항목 4 Step C/D (gating) + 항목 5 (자연 누적). MLB 작업 시작 = 사용자 영역 통과 후 사용자 결정.

## 🎯 모델 v2.0 업그레이드 트래킹 (cycle 231 재검토, 2026-05-07, **cycle 1460 최종 갱신 / 결정 완료**)

**✅ 최종 결정 (2026-07-06, cycle 1460)**: **v1.8 유지 확정** — 전면 재조정 불필요. v2.1-B **rejected**. v2.0 트래킹 섹션 closed.

**결정 근거**:
- **n=178 임계 달성** (cycle 1447, > n=150 threshold) — v1.8 real cohort n=178 도달
- **plan #16 2차 fire (cycle 1460)** — expanding window OOS n=178 재입증: Brier DEFAULT 0.2443 vs Learned 0.2458 (최대 차이 0.15% < 1pp 임계) → DEFAULT_WEIGHTS 유지 확정
- **Fable plan 진단 (2026-07-06)** — Brier drift = CREDIT_EXHAUSTED 2026-06-06~ 측정 오류, 실제 모델 정상. home_win_prob Brier pre/post = 0.24/0.24 안정
- **v2.1-B rejected** — n=52 / 51.9% / Brier 0.4635 (전량 백필 아티팩트, SP null → conf≈0 붕괴). 가중치 re-fit = 소진된 카드
- **CREDIT_EXHAUSTED 2026-06-06~ 지속** — debate 100% fallback → conf=0.3. 사용자 Anthropic 크레딧 충전 carry-over

**최종 실측 지표 (cycle 1460 test cohort n=178)**:
- Brier DEFAULT 0.2443 / Brier SHADOW_V20 0.2442 / Brier Learned 0.2458 — 최대 차이 0.15%
- accuracy 60.9% (cycle 1447 측정)
- 가중치 재조정 효과 = 노이즈 수준

**✅ 축 B (HOME_ADVANTAGE 조건부 보정) 종결 (2026-07-22, cycle 1994)**: 착수 조건 N≥100 CE cohort 최초 충족 (n=162). CE(순 quant) 실제 홈승률 49.4% vs 예측 평균 51.9% (상향 근거 없음), 박빙구간[0.47,0.53] 실제 홈승률 50.6% (동전던지기 수준, 조건부 boost 근거 없음) → **B-3 무변경 확정**. 상세: `docs/op-analysis/cohorts/2026-07-22-cycle1994-axis-b-home-advantage.md`. 비CE 홈승률 편향(+13.4pp, n=47)은 표본 부족으로 별도 관찰 항목 이월.

**🧊 비CE 표본 동결 확인 (2026-07-28, cycle 2019 op-analysis lite 재측정)**: 총 n=255 (CE 208 / 비CE 47) — 비CE 표본 cycle 1994 측정 대비 **증가 0건** (여전히 47). CE는 209→255 (+46건 계속 누적) vs 비CE 완전 정체 = CREDIT_EXHAUSTED 지속으로 debate 정직 실행 자체가 발생하지 않고 있음을 재확인 (fallback 100% 지속, conf=0.3 flat). CE 55.3%(115/208, Brier 0.3237) vs 비CE 63.8%(30/47, Brier 0.2534) — 격차 수치 동일 유지(비CE n 불변이라 당연). **결론: 비CE 편향 재평가는 사용자 크레딧 충전 전까지 구조적으로 진전 불가** — 다음 op-analysis 사이클에서 재측정해도 크레딧 미충전 시 동일 결과 반복 예상. 크레딧 충전 신호(사용자 발화 또는 non-CE row 신규 발생) 전까지 이 항목 fire 우선순위 하향 권장.

> 📜 **history 요약** (details = CHANGELOG.md):
> - cycle 1460 (2026-07-06): plan #16 2차 fire n=178 재입증 → v1.8 유지 확정
> - cycle 1447 (2026-07-03): v1.8 n=161 첫 threshold cross, Brier drift 진단 시작
> - cycle 1138 (2026-06-10): v1.8 real n=76 (59.2%, Brier 0.2478)
> - cycle 1098 (2026-06-01): v1.8 n=42 (57.1%, Brier 0.2416)
> - cycle 1038 (2026-05-29): real v1.8 cohort 분리 박제 시작

> ⚠️ **v1.6 anomaly (cycle 387, 2026-05-14, 참고 유지)**: v1.6 scoring_rule n=46 (2026-04-22~05-03) = 37.0% (coinflip 13%p 이하). era별 factor backtest 후보로 유지 (v2.0 결정과 독립).

**실측 정보가치 분석 완료** — cycle 231 operational-analysis heavy (아래 후보 = 역사 참고, 결정과 무관)

> 📜 **credit 이력 (2026-05-16 → 2026-06-06)**: 2026-05-16 credit 복구 후 debate 정직 누적. 2026-06-06~ 재소진 (CREDIT_EXHAUSTED) → debate 100% fallback conf=0.3. Fable plan 진단으로 Brier drift 원인 확정. 사용자 Anthropic 크레딧 재충전 carry-over 대기. 상세 lesson: `docs/lessons/2026-05-14-anthropic-credit-silent-fallback-v18.md`

### v2.0 가중치 후보 (재검토, cycle 231, ⚠️ **역사 참고 — v1.8 유지 확정 후 미채택**)

> ⚠️ cycle 228 후보와 방향 상충. 실측 게임 아웃컴 기반 분석 우선.

| 팩터 | 현재 | v2.0 후보 | 정보가치 Δ | 비고 |
|---|---|---|---|---|
| `elo` | 8% | → **13%** ↑ | +0.30 (최강) | cycle 228 "감소" 번복 |
| `bullpen_fip` | 10% | → **14%** ↑ | +0.26 | 확인됨 |
| `recent_form` | 10% | → **13%** ↑ | +0.20 | 확인됨 |
| `lineup_woba` | 15% | → **12%** ↓ | +0.06 | 방향 일치 |
| `sfr` | 5% | → **5%** = | -0.02 | 중립 ⚠️ cycle 256: 극단값(>0.7) 케이스 편향 발견 — 재검토 필요 |
| `war` | 8% | → **5%** ↓ | -0.12 | |
| `head_to_head` | 5% | → **3%** ↓ | -0.10 | ⚠️ cycle 256: W19 SSG/NC 케이스에서 head_to_head 신뢰도 높았음 — cycle 231 "감소" 방향 재검토 |
| `sp_fip` | 15% | → **8%** ↓ | -0.15 | 최고 가중치 역설 |
| `sp_xfip` | 5% | → **3%** ↓ | -0.15 | |
| `park_factor` | 4% | → **2%** ↓ | -0.15 | 방향 일치 |
| **합계** | 85% | **78%** | | 잔여 7% = 조정 필요 |

> n=72 소표본 경고. 각 Δ의 95% CI ≈ ±15%p. ~~**n=150+ 도달 후 최종 확정 권장.**~~ **← stale (cycle 1460 결정 완료: n=178 재입증, Brier < 1pp → v1.8 유지 확정, v2.0 후보 재조정 자체 불필요)**

**일요일 대응** ✅ **구현 완료 (cycle 309, cycle 358 조정)**:
- `judge-agent.ts` Sunday confidence_clamp — 임계 0.55 초과 시 0.45 강등 (cycle 358 변경: 기존 cap 0.55 → 0.45, medium tier 오염 수정)
- 데이터 근거: 일요일 누적 적중률 n≈20 ~15%, W20 1/5=20% — 선제 단독 적용 확정

**SFR 극단값 대응 후보** ~~(n=150+ 도달 후, cycle 256 신규)~~ **← stale (cycle 1460: v1.8 유지 확정, v2.0 가중치 재조정 불필요 → 본 대응 후보 자체 무기한 postpone. era별 factor backtest 후보로만 유지)**:
- `sfr > 0.7` 케이스에서 SFR 가중치 cap 또는 `head_to_head` 가중치 보정 검토
- W19 SSG vs NC 3연전: SFR=0.72~1.0 극단값이 head_to_head(NC 우세) 오버라이드 → 3연패

**head_to_head 노이즈 심화 (cycle 290, W20 신규)**:
- W20 방향 적중률 35.3% (17건) — 랜덤(50%) 이하, 적극적 하향 필요 신호
- W20 일요일 5/10: 4/5 오답, 고확신(≥55%) 경기 중 3건 모두 실패
- head_to_head 0.0~0.33 낮은 구간에서 오히려 저확신 예측이 정답 (저확신 63.2% vs 고확신 37.5% 역전)

**Action**: ~~n=150 검증 도달 시 operational-analysis heavy 재실행~~ → **cycle 1460 재입증 완료, v1.8 유지 확정. 이 섹션 미채택 (역사 참고).**

**🎯 cycle 354 operational-analysis lite (2026-05-13, 역사 참고)**:
- v1.7-revert 최종: 32건 53.1% (W20=27건 55.6%, W22=5건 40%)
- **확신도 역전**: medium (55-64%) = 37.5% (8건) < low (<55%) = 58.3% (24건) — judge-agent 과보수 신호
- high ≥65% = 0건 — judge-agent 가 고확신 발화 X (Sunday cap 0.45 + 보수적 calibration 누적)
- 팀별 극단값: OB 85.7% (6/7) ↑ / SK 28.6% (2/7) ↓ (소표본 주의)
- v1.8 시작: 2026-05-13 elo 10%↑ + head_to_head 3%↓. **cycle 1460 재입증 완료 (n=178 재입증 → v1.8 유지).**

---

## 🚀 Next-Up (2026-04-25 이후)

### ⭐ develop-cycle 자율 진행 — 사용자 영역 1 line (cycle 41 진행 후, 2026-05-04)

cycle 33~41 진행 후 본 메인 base 구현 완료 (PR #74/#80/#81 + 본 cycle 41 PR). 자동 fire 메커니즘 활성화 위해 사용자 영역 **1 line** 필수:

- [ ] **mcc alias 갱신** — `~/.zshrc` 에 다음 1 line 추가. 기존 alias 가 있으면 교체:

  ```bash
  alias mcc='tmux new -As claude bash -c "trap \"exit 0\" SIGINT; while caffeinate -i command claude; do echo \"[mcc] claude exited normally, restart in 2s...\"; sleep 2; done"'
  ```

  **핵심**: `bash -c "while ... done"` wrapper 가 claude 종료 시 새 claude 자동 시작. watch.sh 의 `/exit` send-keys → 이 wrapper 가 새 cycle 시작.

  적용:
  ```bash
  source ~/.zshrc      # 또는 새 터미널
  mcc                  # tmux session 안 진입
  ```

- [ ] **첫 fire 검증** — mcc 안에서 `/develop-cycle 3` 호출. 1 cycle 끝 → watch.sh fire → claude 종료 → bash 새 iter → 새 claude → /handoff load + /develop-cycle 2 자동 입력 → 새 cycle 진행. 3 cycle 모두 success 확인.

- [ ] **TELEGRAM_WEBHOOK** (optional) — fail 시 알림. 미설정 시 자연 skip.

**자동 fire 메커니즘 의존성**:
- watch.sh send 시퀀스 (cycle 41) = `/exit` slash + Ctrl-D fallback → bash while loop 새 iter
- SKILL.md active-cycle 박제 시 socket+target 자동 감지 (cycle 40)
- watch.sh socket+target 동적 지원 (cycle 39)
- PPID chain 매칭 (cycle 33, 다중 claude 안전)

**관련 spec/plan**:
- plan: `docs/superpowers/plans/2026-05-04-develop-cycle-self-progression-impl.md` (cycle 38, 8 PR 단위)
- spec_v3: `docs/superpowers/specs/2026-05-04-spec-v3-develop-cycle-self-progression-design.md` (cycle 37, dashboard)
- spec v0~v2: cycle 34~36 박제

**남은 본 메인 영역 (cycle 42~46)**:
- cycle 42 PR 4 = migration 023 develop_cycle_logs (R5 prod push)
- cycle 43 PR 5 = retro 안 Supabase INSERT/UPSERT
- cycle 44~45 PR 6+7 = `/debug/develop-cycle` dashboard
- cycle 46 = end-to-end 자동 fire 실측 검증 (verify-only)

### ⭐ AdSense fix-first batch (2026-04-28 D7=A 결정 후)

mid-review 워크플로 (`docs/superpowers/specs/2026-04-28-moneyball-mid-review-workflow-design.md` § 10) archive (실행 안 함). codex outside voice 의 "fix-first 가 직접 path" 채택. 1주 작업 list.

#### ✅ 완료 (2026-04-28)

- **#2 AdSense 스크립트 인프라** (커밋 `5c3588a`): `apps/moneyball/src/app/layout.tsx` head 에 env-driven `<script async>` 추가. `ADSENSE_PUBLISHER_ID` (`pub-\d{16}`) 검증 시 자동 주입, 미설정 시 무동작. ads.txt route 와 동일 패턴.

#### ⏸️ Publisher ID 발급 후 처리 (자연 트리거)

- **#1 ads.txt 활성화**: `vercel env add ADSENSE_PUBLISHER_ID production` (값 `pub-xxxxxxxxxxxxxxxx`). 이후 무코드 변경, 재배포만으로 ads.txt 와 head script 동시 활성
- **#3 privacy 문구 갱신**: `apps/moneyball/src/app/privacy/page.tsx:44, 62` "도입 예정" → "이미 적용" (실제 광고 노출 후라야 정직)

#### 🌱 사용자 영역 (자연 진행)

- **#4 Google Search Console 색인 요청 10건** — 시간 날 때
- **#5 콘텐츠 깊이 보강** — 지속

#### 📌 메타

- 기존 인프라 점검 결과 ads.txt route 는 이미 env-driven (`apps/moneyball/src/app/ads.txt/route.ts`). codex finding #3 "ads.txt placeholder" 의 정확한 진단은 "publisher ID 미발급" 상태였음
- 4/28 17시 cron 자연 검증 — `pipeline_runs?run_date=eq.2026-04-28&mode=eq.predict` 8건 모두 `errors=[]` + `daily_notifications.summary_sent=true` (07:19 UTC). **사례 8 (summary silent fail) CLAUDE.md 추가 1주 누적 후 재평가**로 보류 (D10a 갱신, 단일일 표본)

### ⭐ GH Actions schedule → Cloudflare Worker 이관 backlog (2026-04-29~)

GH high-load skip 측정 → Cloudflare Workers Cron 으로 단계적 이관. 무료 tier (Workers Free 100k req/day, 계정 cron 5 trigger 제한).

#### ✅ 완료 (2026-04-29)

- **daily-pipeline** GH schedule 영구 비활성화 (`21a77b2`). Cloudflare `moneyballscore-cron` Phase 1 이관 (4/27 deploy + 4/28 안정 검증 errors=[] 8/8 + summary_sent=true). workflow_dispatch 보존
- Cloudflare cron 4 → 1 합침 (`03a4867`) — `"17 0-14 * * *"` 단일. `decideMode()` 가 UTC hour 보고 mode 분기. 계정 cron quota 4개 여유 확보
- **sitemap-warmup + live-update Cloudflare 이관** (`a6649c8`). worker.ts `event.cron` 3개 분기 (17 0-14 / 37 * / */10 9-15). SITE_URL var 추가. wrangler version `ef28c350`. 두 GH yml schedule 키 제거, workflow_dispatch 보존. 총 fire/day = 81 (Workers Free 100k 여유)

#### ✅ 완료 (2026-04-30)

- **sync-batter-stats** GH schedule 영구 비활성화. Cloudflare Worker `"17 0-14 * * *"` UTC 03:17 조건 분기에 `runBatterSync()` 추가 — 별도 cron slot 소비 없이 기존 cron 재사용. 총 fire/day = 82 (Workers Free 100k 여유).
- **pitcher-snapshot Cloudflare 분기 통합** — `'37 * * * *'` 분기 내 UTC 토요일 15h 조건 추가 (`runPitcherSnapshot()`). cron 슬롯 4/5 유지 (`03a4867` 정신 보존). `pitcher-snapshot.yml` schedule 키 제거, workflow_dispatch 보존.

#### ✅ 완료 (2026-04-30) — Cloudflare 이관 전체 완료

- **pat-expiry-check.yml GH 유지 결정** — GH Actions 에서 실행 유지.
  - GH PAT 만료일 체크 + `playbook` 리포에 dispatch → GH 컨텍스트(secrets + gh api) 안에서 도는 게 본질에 맞음.
  - CF 이관 시 PAT 를 CF secrets 에도 보관해야 해 보안 표면 증가 + audit trail 저하.
  - 월 1회 빈도 → GH schedule skip 위험 (4/27 측정: 일간 cron 41% skip) 허용 가능.
  - **ROI 없음** — GH 유지가 더 안전하고 자연스러운 위치.

#### ⏹ 폐기 (2026-04-30) — agent-loop 자율 cron 라인

- **self-develop.yml** 삭제 + cloudflare worker `dispatchSelfDevelop` 분기 제거 (commit `cd79274`).
  - 이전엔 UTC 00:17 (KST 09:17) self-develop 자율 fire → 이제 사용자 직접 호출 `/develop-cycle [N]` skill 로 전환.
  - 폐기 이유: 자연발화 cron 의 자율성 매력 < 진단 비용 (runner 휘발 worktree, OAuth 회전, push step 누락 사고). 사용자 직접 trigger 가 더 명확.
  - 후속: `~/.claude/skills/develop-cycle/SKILL.md` (3 차원 + Agent Teams + iTerm2 native 분할). 시범 운행은 다음 세션부터.

#### 검증 path (각 이관 시)

1. worker.ts 분기 추가 + wrangler.toml cron 추가 (계정 quota 1개 소비)
2. `pnpm run deploy` (cloudflare-worker)
3. 자연 fire 1 cycle 검증 (Cloudflare logs + Supabase row 박힘 확인)
4. GH schedule 키 제거 + workflow_dispatch 보존
5. commit

#### 본 세션 (2026-04-29) 자연 fire 검증 path

- sitemap-warmup: KST 10:37 (UTC 01:37) 첫 fire — wrangler tail 또는 Vercel log
- live-update: KST 18:00~ 첫 fire — wrangler tail 또는 Supabase row (postview 자동 트리거 분기 정상 동작 확인 필수)
- 회귀 시 wrangler rollback 가능

### ⭐ 분석 축 — v4-3 자연 발화 관찰 결과 (2026-04-24 실행 + 2026-04-27 후속)

2026-04-24 KST 오전 세션에서 TODOS 체크리스트 A~F 실 DB 조회. **v4-3 핵심은 작동**. 누락 가설은 2026-04-27 후속 조사로 정정 — 대부분 false alarm 이었고 진짜 버그 2건 (스크래퍼 status 오판정 + pipeline_runs.mode VARCHAR overflow) 별도 fix.

#### ✅ 통과 (2026-04-24)
- **A**: 어제(2026-04-23) `predictions.prediction_type='post_game'` row **5건** (경기 수 일치)
- **B**: Sonnet 심판 실제 factor-level reasoning 생성 (fallback 한 줄 아님)
- **C 부분**: 생성된 경기는 **home+away 양쪽 memory 정확히 생성** (v4-3 버그 수정 확인)
- **E**: `agent_memories` UNIQUE 제약 작동, duplicates 0

#### ✅ C1 정정 — false alarm (2026-04-27)

원 가설: "4/23 5경기 중 2726/2727 만 memory 0 row → 누락 버그".
실제 원인: `retro.ts:203` 의 `.eq('is_correct', false)` — **틀린 예측에만 mem 생성** 의도된 동작. 2726/2727 은 예측 적중 → mem 생성 안 함이 정상.

4/23~4/26 4일 검증: wrong 예측 수 × 2 = actual mem 수 100% 일치 (4/23 wrong=3 mem=6, 4/24 wrong=3 mem=6, 4/25 wrong=2 mem=4, 4/26 wrong=3 mem=6). **agent_memory 버그 없음**.

부수 디자인 검토 가치:
- wrong 만 학습 → 적중 패턴(strength) 도 학습할 가치는? 현재는 wrong 에서 추출한 strength/weakness 만 있음
- content 에 date 포함 → UNIQUE 사실상 매번 새 row → 일별 누적

#### ✅ 진짜 버그 2건 fix (2026-04-27)

**버그 1 — `kbo-official.ts:96` status 오판정** (4/26 LG@OB / KT@SK 영구 누락 직접 원인):
- KBO API 가 경기 시작 전에도 `GAME_INN_NO=1` 을 미리 set 하는 케이스 발견
- `state_sc='1' + inn_no=1` raw 가 'live' 로 오판정 → `shouldPredictGame` 이 not_scheduled reject
- Fix: `Number(inn_no) > 0` OR 절 제거. `state_sc='2'` 단독 신뢰. kbo-live.ts 도 동일 수정. regression test 4건 추가 (358 pass)
- 커밋 `5cc001f`

**버그 2 — `pipeline_runs.mode VARCHAR(10)` overflow** (4/25, 4/26 predict_final cron 결과 silent 손실 + 4/26 summary 알림 누락 상위 원인):
- migration 004 의 mode 컬럼 VARCHAR(10) 가 'predict_final' (13자) 거부 → ERROR 22001
- supabase-js .error silent 리턴 → finish() try/catch 안 잡힘 → pipeline_runs 에 한 row 도 안 남음
- CLAUDE.md 사례 3 (`predictions.model_version 'v2.0-debate'`) 와 동일 패턴 재발
- Fix: migration 019 (VARCHAR(10)→VARCHAR(20)) + finish() 의 .insert() .error 가드 추가
- 커밋 `71a1cbc`

#### ⚠️ 다음 세션 과제

**C2. GitHub Actions schedule skip 재발 대응** (잔존)
- `live-update.yml` 2026-04-23 24h 구간 **5회만 실행** (기대 42회)
- 4/23, 4/25, 4/26 announce cron (UTC 00:17) skip — 4/24 만 수동 회복
- 분 17 오프셋만으로 부족. 구조 대응 후보: (a) 오프셋 분산 30 또는 45 (b) 두 시각으로 dual-fire (c) Vercel Cron 이관 (d) 외부 polling
- 결정 전 데이터 필요: 최근 7일 skip 패턴 / 시간대별 skip 비율
- **2026-04-27 진행**: Cloudflare Worker 이관 (Phase 1) deploy 완료. 4/28 09:17 KST 자동 cron fire 자연 검증 대기. Worker 안정 검증 후 GH Actions schedule 영구 비활성화 예정.

**SP 확정 측정 — Naver 이중 source 추가** (2026-04-27 추가, 데이터 누적 대기)
- migration 020 + 021. Worker 가 KBO 공식 + Naver `schedule/games?fields=all` 양쪽 호출 → `source='kbo-official'`/`'naver'` 양쪽 row 적재
- 가설: KBO 만 polling 으론 "Naver 가 SP 더 빨리 채울 수 있는지" 검증 불가. 1주 데이터 후 정량 비교
- 분석 SQL 5종 미리 박음 (`cloudflare-worker/README.md` Phase 3 섹션): Q1 game/source 별 첫 확정 / Q2 KBO vs Naver 비교 / Q3 redundancy 분포 / Q4 lead-time 분포 / Q5 SP 변경 사례
- 결정 기준: Q3 의 `naver_only`+`naver_first` ≥ 5% → fallback 도입. < 1% → redundancy 만 남기고 종료

**F. Layer-1 validator reject 메트릭** (보류, 자연 발생 대기)
- TODOS 원 문구 "validator_logs 테이블" 은 실제로 `violation_type/severity/detail/backend` 구조 — **명예훼손/hallucination 감지용** (`/debug/hallucination`)
- Layer-1 (JSON 파싱 + schema) reject 율은 별도: Vercel Functions 로그에 `[Validator]` prefix grep 만 가능 (1시간 후 휘발)
- **2026-04-27 결정 — 보류**: validator strict mode 가 본래 빡빡한 검증 아님 → 4주 누적해도 reject 율 0~1% 예상. 측정 도구를 데이터 없이 먼저 만드는 패턴은 "데이터로만 이야기" 정신 위배. 진짜 reject 다발 사례 자연 발생 (Sentry alert 또는 사용자 보고) 시 → 그때 DB 기록 path (validator_logs 에 violation_type='layer1_schema' 추가) 30분 작업으로 추가

#### 🎯 분석 축 후속 (C1~F 해결 후 착수)
- **A** `/analysis` 허브 확장 (전날·주간·비-빅매치 경기 진입점) — **(2026-05-01 진행 중)** 어제 경기 진입점 PR #31 (`develop-cycle/20260430-analysis-hub-entries`, develop-cycle 첫 시범 fire). 주간/비-빅매치 진입점은 후속 cycle.
- **B** 모델 성능 분석 사용자 가시화 (`/debug/*` → `/dashboard` 공개 섹션 이식)
- **D** v2.0 튜닝 준비 (50경기 축적 시점 도달 후) ← stale: cycle 1460 v1.8 유지 확정 (n=178 재입증, Brier 0.15% < 1pp). v2.0 upgrade 불필요 결론 — 본 축 종료.
  - **2026-04-28 진행**: verified=37건. 적중률 추세 — 4/15 100% → 4/17~19 80% → 4/21~22 50% → 4/23~26 38%. 명확한 하락 신호 (단 표본 작음, 95%CI ±25%p)
  - **2026-04-28 사전 검증 — 인프라 이미 완성**:
    - `/debug/model-comparison` 페이지 + `compareModels.ts` (`extractPureQuantProb` / `buildShadowRows`) + 테스트 모두 작동 중
    - `daily.ts` 가 v1.6 ship (4/22) 이후 모든 v2.0-debate row 에 `reasoning.quantitativeHomeWinProb` 박는 중. shadow 보존률 v1.5 시기 0% (n=16) / v1.6 시기 100% (n=21)
    - 21건 (v1.6, 4/22~26) 비교 결과: v2.0-debate Accuracy 38.1%(8/21) Brier 0.26817 / v1.6-pure-shadow Accuracy 23.8%(5/21) Brier **0.25768** — debate 가 winner +14%p 우세, shadow Brier 미세 우세, 21건 중 winner 불일치 3건 (확률값 차이 평균 2.26%p)
    - **재예측 함수 작성 작업 무산** (인프라 자동 처리). v1.5 시기 16건 retroactive 는 ROI 낮아 보류
  - **5/1 KST 09:00 자연 트리거** (4/30 verify 완료 후 verified ≥ 50 도달 예상): `/debug/model-comparison` 페이지 한 번 열어 v1.6-pure-shadow vs v2.0-debate 결과 확인 + 아래 H1~H4 가설 검증
  - 결정 기준: v1.5 적중률 ≥ v2.0+5%p → v1.5 회귀 검토 / v2.0 적중률 ≥ v1.5+5%p → v2.0 유지 + 가중치 튜닝 / 차이 < 5%p → 표본 더 축적 후 재평가

#### 🔬 5/1 자연 트리거 가설 후보 4건 (2026-04-28 추출, N=37)

가설 nominate 만. 검증 전 가중치 변경/모델 수정 절대 금지 ("데이터로만 이야기"). 5/1 N≥50 도달 시 아래 SQL 일괄 실행.

**H1. confidence ≥ 0.6 만 가치 있음. 그 이하는 random 수준** ⭐ 강한 신호

| confidence | n | 적중률 |
|---|---|---|
| [0.45, 0.50) | 3 | 33% |
| [0.50, 0.60) | **26** | **50%** ← random |
| [0.60, 0.63] | 8 | **75%** |

전체 70%(26/37)가 random 구간. confidence ≥ 0.6 그룹만 winner 적중 의미 있음.

검증 SQL:
```sql
SELECT
  CASE WHEN confidence >= 0.6 THEN 'high' ELSE 'low' END AS bucket,
  COUNT(*) AS n,
  AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) AS accuracy,
  -- Wald 95%CI 반폭
  1.96 * SQRT(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) *
              (1 - AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END)) / COUNT(*)) AS ci95
FROM predictions WHERE is_correct IS NOT NULL AND scoring_rule = 'v1.6'
GROUP BY 1;
```
결정 기준: high 그룹 적중률 - low 그룹 적중률 ≥ 15%p && 95%CI 비중첩 → H1 확정 → low confidence 예측 사용자 노출 정책 재검토.

**H2. 원정 예측은 random 보다도 약함** ⭐ 강한 신호

- 홈 예측 22건 → 적중 59% (+9%p)
- 원정 예측 15건 → 적중 47% (random 이하)
- 실제 홈 승률 57% (페이지 base 51% 대비 +6%p, 4월 표본 편향)

검증 SQL: `extractHomeWinProb(reasoning) >= 0.5` 그룹 vs `< 0.5` 그룹 Accuracy/Brier 비교.

결정 기준: 원정 예측 그룹 적중률 < 50% && N ≥ 25 → H2 확정 → 원정 신호 보강 (원정팀 recent_form 가중치, away SP 신호 강화 등) 후보.

**H3. 시즌 초 표본 함정 — SP FIP 차이가 거의 0**

|SP FIP diff|: 36/37건이 0.5 미만, 1건만 1.0~2.0. SP FIP 가중치 19% (가중치 1위) 인데 차별화 정보 거의 없음. 4월 초 투수 시즌 표본 5경기 안팎.

검증 SQL: 4/15~5/1 SP FIP 평균 + |diff| 분포 추세. |diff| ≥ 0.5 비율이 시간에 따라 늘면 자연 회복, 안 늘면 구조적 약점.

결정 기준: 5/1 시점 |diff| ≥ 0.5 비율 ≥ 30% → 자연 회복 / < 15% → SP 데이터 갱신 빈도 점검 (KBO Fancy Stats 스크래핑 cron 동기성).

**H4. 시간 추세 — 평균 회귀일 가능성 (가장 큰 의심)**

| 기간 | 적중 | % | binomial(p=0.5) |
|---|---|---|---|
| 4/16-17 | 7/7 | 100% | 0.78% |
| 4/18-21 | 5/9 | 56% | random 근처 |
| 4/22-26 | 8/21 | **38%** | random 이하 |

4/16-17 의 7/7 = binomial(p=0.5) 0.78% 확률. 매우 운 좋은 초기 + 평균 회귀 가능성. 50건 누적 적중률 ≈ 50% 면 **모델 = 동전 던지기** (구조 재설계 필요).

검증 SQL:
```sql
SELECT
  COUNT(*) AS n,
  AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) AS overall_acc,
  -- 95%CI
  1.96 * SQRT(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) *
              (1 - AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END)) / COUNT(*)) AS ci95
FROM predictions
WHERE is_correct IS NOT NULL AND scoring_rule = 'v1.6';
```
결정 기준: N ≥ 50 && overall_acc ∈ [0.45, 0.55] && 95%CI 가 0.5 포함 → H4 확정 (모델 = random) → v3 설계 (다른 데이터 소스, 다른 모델 구조) 검토.

**H5. v1.6 가중치 변경이 prod 에서 v1.5 보다 더 나쁨** ⭐⭐ 가장 강한 신호 (H4 와 함께)

2026-04-28 중간점검에서 추출. v1.5/v1.6 시기 분리 분석 시 발견:

| scoring_rule | 기간 | n | 적중 | acc | binomial(p=0.5) 우연 |
|---|---|---|---|---|---|
| v1.5 | 4/15-21 | 16 | 12 | **75.0%** | 0.11% |
| v1.6 | 4/22-26 | 21 | 8 | **38.1%** | 17% (random 이하) |
| 격차 | | | | **36.9pp** | |

4/22 v1.6 ship (`CHANGELOG v0.5.24` — Wayback 백테스트 wOBA/FIP/SFR 추가, train Brier −0.00319) 이후 prod 적중률이 v1.5 대비 −37%p. CHANGELOG v0.5.26 의 game_records 8-feature backtest 도 이미 null-like 로 v1.7 ship 근거 없음 결론. **즉 wayback 백테스트 + game_records backtest 가 prod 와 정반대 방향 시그널**.

H4 와의 관계: H4 (모델=동전) 와 부분 겹침. 다만 H5 는 **v1.5 자체는 75% 로 동전이 아닐 가능성** + **v1.6 변경이 그 가치를 부순 가능성** 을 분리해서 봄. H4 가 random 이면 v1.5 75% 도 운, H5 가 맞으면 v1.5 회귀가 답.

검증 SQL:
```sql
SELECT
  scoring_rule,
  COUNT(*) AS n,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS hits,
  AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) AS accuracy,
  -- Wald 95%CI 반폭
  1.96 * SQRT(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) *
              (1 - AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END)) / NULLIF(COUNT(*),0)) AS ci95
FROM predictions
WHERE is_correct IS NOT NULL
GROUP BY scoring_rule
ORDER BY scoring_rule;
```

결정 기준 (5/1 N≥50 시점):
- v1.5_acc ≥ v1.6_acc + 10pp && N(v1.6) ≥ 30 && 95%CI 비중첩 → **H5 확정 → v1.5 회귀 + v1.6 변경 폐기 + Wayback/game_records 백테스트 신뢰성 재검토**
- 격차 5~10pp → 표본 추가 (5/15 N≥80 재평가)
- 격차 ≤ 5pp → v1.6 유지 (H4 가설로 재해석 — 둘 다 random)

H4 와 H5 동시 검증: H4 가 N≥50 [0.45, 0.55] 면 v1.5 시기 75% 도 단순 운 → H5 자연 폐기 (v1.6 회귀 의미 없음). H4 가 0.55 초과 또는 0.45 미만이면 H5 유의미 → v1.5/v1.6 격차 분석 가치.

#### 🧪 5/1 09:00 자연 트리거 1차 검증 결과 (develop-cycle 1/1, model 차원)

`develop-cycle/20260501-model-h1-h5-verify-skip` (PR 후속 링크). 사용자 자연 발화는 없었으나 develop-cycle skill 의 5/1 자연 트리거 도달 → model 차원 1 사이클 자율 실행.

**진단 (Supabase REST 직접 조회, predictions 테이블)**:

| 지표 | 값 | 95%CI |
|---|---|---|
| N (전체 verified) | **47** | — |
| Overall acc | 23/47 = 48.94% | [34.6%, 63.2%] |
| H5 v1.5 (4/15-21) | 12/16 = **75.0%** | [53.8%, 96.2%] |
| H5 v1.6 (4/22+) | 11/31 = **35.5%** | [18.6%, 52.3%] |
| H5 격차 | **39.5pp** | CI 비중첩 (간발의 차: 53.8% vs 52.3%) |
| H1 high (≥0.6) | 6/8 = 75% | [42.0%, 100%] |
| H1 low (<0.6) | 17/39 = 43.6% | [28.0%, 59.1%] |
| H1 격차 | 31.4pp | high N=8 너무 작음 → 결론 보류 |
| H2 home pick | 15/26 = 57.7% | [38.7%, 76.7%] |
| H2 away pick | 8/21 = 38.1% | [17.3%, 58.9%] — N<25 미달 |

**결정: 표본 축적 (작업 없음, lesson only)**

근거:
1. N(전체)=47 < 50 게이트 미충족 (dispatch 결정 우선순위 첫 줄)
2. H5 하위 조건 (v1.5_acc ≥ v1.6_acc+10pp && N(v1.6)≥30 && CI 비중첩) 은 충족했으나, v1.5 표본 16건 중 7건이 4/15-17 디버그 시기 (드리프트 사례 3 — debug 커밋 3건과 같은 시기, 100% 적중 후 평균 회귀 의심) 와 겹침. 이 7건 제외하면 v1.5 N=9 로 신뢰도 급락
3. v1.6 적중률 35.5% 는 H4 (random=동전) 의 0.45~0.55 구간에서 벗어남 (lower) → v1.6 가 단순 random 이 아니라 **systematically wrong** 가능성 시그널 — 이게 사실이면 H5 회귀가 답이지만 표본 부족
4. CI 비중첩 격차가 0.5pp (53.8% vs 52.3%) — N 1~2건 추가/감소로 뒤집힐 수 있는 임계점

**메타-finding (5/1 신규)**: v1.6 시기 31건 중 high confidence (≥0.6) **단 1건** (그것도 0/1 적중). v1.5 시기 16건 중 high confidence 7건 (6/7 = 86%). v1.6 가중치 변경이 winner 적중률뿐 아니라 **모델 confidence 분포 자체를 압축** (대부분 0.5~0.6 구간으로 수렴). 이게 H1·H5 의 공통 메커니즘 가설 후보. 향후 검증 가치 높음.

**다음 트리거**: N=50 도달 시 (예상 5/3~5/5). 재검증 SQL 동일 (위 H5 SQL). 도달 시 즉시 v1.5 회귀 결정 가능하도록 `packages/shared/src/constants.ts` v1.5 가중치 git log 추적 미리 표시:
- v1.5 시기 마지막 commit (4/21 이전): TODOS H5 표 참조
- v1.6 ship commit: `CHANGELOG v0.5.24` (4/22) — 실제 dc07463 (`feat(engine): v1.6 가중치 재분배`)
- 회귀 PR 작성 시 `git show <v1.5-last-commit>:packages/shared/src/index.ts` 로 가중치 복원

#### 🎯 5/4 H5 N=62 자연 트리거 검증 결과 (cycle 14, operational-analysis lite)

`develop-cycle/h5-verified-v1.5-vs-v1.6-cycle14`. 5/1 → 5/4 사이 verify cron 으로 N=47 → 62. H5 결정 기준 모두 충족 → H5 확정.

**산출**: `docs/metrics/2026-05-04-h5-verified-cycle14.md` (180 줄, cycle 11/13 finding 과 통합 정리).

| 지표 | v1.5 (n=16) | v1.6 (n=46) | 격차 |
|---|---|---|---|
| Winner acc | 75.00% [53.78, 96.22] | 36.96% [23.01, 50.91] | 38.04pp |
| Brier | 0.2143 (random 이상) | **0.2559 (random 이하)** | +0.0416 |
| High conf (≥0.6) | 6/7 = 86% | **0/2 = 0%** | — |

**H5 결정 기준 (TODOS 박제)**: 격차 ≥ 10pp ✅ / N(v1.6) ≥ 30 ✅ / CI95 비중첩 ✅ (0.0287pp 마진) → **H5 확정**.

**cycle 11/13 통합 결론**: 단순 v1.5 회귀 답 아님. 3 측면 동반 fix —
1. **LLM 측면** (cycle 11→13 carry-over): `judge-agent.ts` / `postview.ts` SYSTEM_PROMPT 에 가중치 0% factor 추론 금지 (cycle 15 1순위, review-code chain)
2. **prod 측면** (본 cycle 14): v1.5 회귀 PR 검토 (cycle 15+ 2순위, fix-incident 또는 explore-idea, 큰 commit)
3. **정량 측면** (cycle 13 박제): Wayback 백테스트 (2023-2024 z-score) vs prod 2026 적중률 정반대 시그널 → 시즌 분포 변화 + 시즌 초 stat noise 가설 검토 (cycle 15+, explore-idea spec)

**cycle 15+ actionable 4건** (lesson md §6):
- 1순위 review-code: LLM prompt constraint → **cycle 15 PR #54 적용 완료** ✅
- 2순위 fix-incident/explore-idea: v1.5 회귀 PR (단 백테스트 재검토 동반)
- 3순위 operational-analysis: cycle ~25 N=100 시점 재측정
- ~~4순위 operational-analysis: 4월 vs 5월 분리 분석~~ → **cycle 16 청산 (H3 반증)** ✅

#### 🎯 5/4 H3 반증 — 시즌 초 stat noise 가설 (cycle 16, operational-analysis lite)

`develop-cycle/h3-disproved-month-split-cycle16`. cycle 14 의 4순위 (4월 vs 5월 분리) 청산. **H3 반증** → 시즌 초 noise 가설 폐기.

**산출**: `docs/metrics/2026-05-04-h3-disproved-cycle16.md` (170 줄, cycle 14 통합 결론 갱신).

| 구간 | N | acc | Brier | high(≥0.6) |
|---|---|---|---|---|
| v1.6 4월 | 31 | 35.48% [21.12, 53.05] | 0.2593 | 1/0 = 0% |
| v1.6 5월 | 15 | 40.00% [19.82, 64.25] | 0.2631 | 1/0 = 0% |
| **격차 (4 − 5월)** | | **−4.52pp** | (CI95 완전 중첩, 의미 X) | |

**4월 only 시간 control**: v1.5 75% vs v1.6 35.48% → **격차 39.52pp** (전체 38.04pp 보다 더 큼).

**판정**:
- H3 (시즌 초 noise) 반증 — 5월에 회복 시그널 없음 + 4월 only 격차 더 큼
- 시간 변수 통제 후에도 격차 유지 → v1.6 의 acc 저하는 **순수 모델 효과** (시즌 효과 X)
- 회귀 PR 결정 보류 사유 4건 중 2건 청산 (시즌 noise + LLM 갭 cycle 15 적용)

**cycle 17+ actionable 재정렬**:
- 1순위 fix-incident/explore-idea: v1.5 회귀 PR + Wayback 백테스트 재검토 (보류 사유 2/4 청산 → 정당성 보강)
- 2순위 operational-analysis cycle ~17: cycle 15 PR #54 prompt constraint 효과 측정 (1주 후)
- 3순위 operational-analysis cycle ~25: N=100 시점 H5 격차 trend 재측정

---

### Day 2 Search Console 색인 요청 (2026-04-25 이후)

Day 1 완료: `/`, `/predictions`, `/dashboard`, `/analysis`. 2026-04-24 재확인 결과 하루 10개 제한 모두 소진 → skip. 2026-04-25 한도 리셋 후 아래 10개 먼저 입력. 팀 프로필 10개는 Day 3 으로:

**Day 2** (이어서 10개):
5. `https://moneyballscore.vercel.app/reviews`
6. `https://moneyballscore.vercel.app/about`
7. `https://moneyballscore.vercel.app/teams`
8. `https://moneyballscore.vercel.app/players`
9. `https://moneyballscore.vercel.app/matchup`
10. `https://moneyballscore.vercel.app/reviews/misses`
11. `https://moneyballscore.vercel.app/privacy`
12. `https://moneyballscore.vercel.app/terms`
13. `https://moneyballscore.vercel.app/contact`
14. `https://moneyballscore.vercel.app/seasons`

**Day 3** (인기 팀 프로필 5개 + 최근 리뷰·경기):
- `/teams/HT`, `/teams/LG`, `/teams/OB`, `/teams/SS`, `/teams/SK`
- `/teams/KT`, `/teams/HH`, `/teams/LT`, `/teams/NC`, `/teams/WO`

**Day 4 이후 불필요**: 허브 색인되면 sitemap + 내부 링크로 Google 자동 발견.

### B3 (not_scheduled 재시도) — **데이터 누적 대기**

Part A 관측 결과 (2026-04-24 확인): **이상 status 발생 無**. 모든 skip 이 scheduler 로직 (`window_too_early/late`) 으로 정상. raw 동봉 케이스 아직 트리거되지 않음. 강제 트리거 어려우니 실제 `not_scheduled`/`sp_unconfirmed` 이벤트 발생 시까지 보류.

### 심화 SEO (우선순위 낮음)

- **`generateSitemaps` 로 sub-sitemap 쪼개기**: 현재 1340 URL 단일 파일. 2시즌 더 쌓이면 3000+. Next 16 `id: Promise<string>` breaking change 있음.
- **OG 이미지 점검**: `/analysis/game/[id]` 공유 시 썸네일 동적 생성 (`opengraph-image.tsx`)
- **Core Web Vitals 감사**: Lighthouse 또는 PageSpeed Insights. 개선 여지 발견 시 다음 세션

---

## ✅ 2026-04-23~24 세션 완료

### B1 / Part A / B2 관측 — **모두 정상**
- **B1**: cron 오프셋 17 적용 후 4-23 **7회 fire** (이전 4/15 대비 ↑). KST 16:02 predict 로 예측 5건 성공 생성. KST 23:14 verify success.
- **4-23 `is_correct`**: 5경기 전부 verified (2승 3패, 40%). 체크포인트 우려 해소.
- **Part A**: 이상 status 발생 無 (정상). raw 동봉 대기.
- **B2 체감**: 2026-04-24 KST 09:17 announce 에서 확인 예정.

### HIGH_CONFIDENCE_THRESHOLD 재정의 → winnerProb 3단계 단일 anchor (커밋 6450f60 외)

debate confidence 주관값 축 폐기, 예측 승자 적중 확률 (winnerProb = max(hwp, 1-hwp)) 로 전면 통일:
- `WINNER_PROB_CONFIDENT = 0.65` / `WINNER_PROB_LEAN = 0.55` (Telegram B2 와 통일)
- `classifyWinnerProb(hwp)` → `'confident' | 'lean' | 'tossup'`
- 3단계 라벨 "적중 / 유력 / 반반" + 이모지 pool 랜덤 (`pickTierEmoji`)
  - 적중 🔥 또는 🎯
  - 유력 📈 (단일)
  - 반반 🤔 또는 ⚖️
- UI 전수 반영: 홈/대시보드/예측기록/주간·월간 리뷰/회고
- 테스트 **519 → 536 pass**

### SEO — Sitemap "가져올수없음" 근본 해결 (커밋 da59de3)

- **원인 확정**: `createClient` → `cookies()` 호출 → Next.js 가 route 를 dynamic 으로 강제 → `revalidate` 무력화 → 매 요청 2500 DB 쿼리 → Googlebot timeout → "유형: 알수없음 / 상태: 가져올수없음"
- **해결**: sitemap 전용 cookie-free anon client 인라인 → **static + ISR** prerender
- `x-vercel-cache: HIT` 확인, Search Console **색인 생성됨** 도달
- 동시 조치: pitcher leaderboard 쿼리 제거, games limit 5000→2500, 전 URL lastmod, revalidate 3600→21600, warmup cron (매시간 37분)

### SEO 추가 보강 (커밋 e3f5cee)

- `robots.txt` — `/debug`, `/api`, `/search` Disallow
- canonical — 홈 + /analysis + dashboard/predictions/reviews/reviews-misses/about/teams/players + /analysis/game/[id]
- **SportsEvent JSON-LD** 추가 — /analysis/game/[id] (Article 과 병기). Google 리치 결과 후보 (팀·일정·구장)

### 외부 웹마스터 등록 (사용자 완료)

- Google Search Console ✅ (Day 1 4개 색인 요청 완료)
- Naver 웹마스터 ✅
- Bing Webmaster ✅
- IndexNow ⏭ 스킵

---

## ✅ PLAN_v5 완료 (v0.5.23, 2026-04-20)

**전체 Phase 완료**:
- ✅ Phase 1 UI (LEFT JOIN + PlaceholderCard + estimateTime) — v0.5.22
- ✅ Phase 2 Pipeline (매시간 cron · shouldPredictGame · ON CONFLICT · daily_notifications · 4-mode) — v0.5.22
- ✅ Phase 2.5 DB 기반 form/h2h (asOfDate 실 필터 구조적 해결) — v0.5.22
- ✅ Phase 3 `/debug/pipeline` 대시보드 — v0.5.22
- ✅ Phase 4 가드 테스트 (382 tests: schedule 24 + scrapers 16 + notify 11 + pipeline-daily 15 + ui-homepage 16 + 기존) — v0.5.23

**다음 단계** — PLAN_v5 후속:
- **자연 발화 관찰** (KST 09:00 부터 첫 사이클):
  - UTC 00 (KST 09) announce → Telegram 수신 + `/debug/pipeline` 기록
  - UTC 01-12 predict 매시간 → 각 경기 시작 3h 이내 처음 cron 에만 row 1건 생성
  - UTC 13 predict_final → gap=0 확인
  - UTC 14 verify → accuracy update + notifyResults
- **Phase 5 v2.0 튜닝** (2주 운영 후): stat 누수 차단된 데이터셋 기반 오차분석. ~50경기 축적 시점부터 별도 세션 플래닝. ← stale: cycle 1460 v1.8 유지 확정 (n=178 재입증, Brier 0.15% < 1pp). v2.0 튜닝 자체 불필요 결론.

---

## 🔍 Phase v4-3 자연 발화 관찰 (2026-04-16 이후)

**목적**: v4-3에서 신규 추가한 자동 postview 트리거·Compound 루프가 실제 KBO 경기 종료 시 작동하는지 확인. 프로덕션 재트리거 1회로는 scheduled 상태만 검증됐고, `post_game` row·`agent_memories` row 생성은 실제 완료 경기가 있어야 검증 가능.

### 체크리스트 (매일 경기 후 1회)

**A) Postview 자동 생성 확인**
```sql
-- 어제 날짜 post_game row 개수 (Supabase SQL Editor)
SELECT count(*) FROM predictions
WHERE prediction_type = 'post_game'
  AND game_id IN (SELECT id FROM games WHERE game_date = CURRENT_DATE - INTERVAL '1 day');
```
- **기대**: 어제 완료 경기 수와 일치 (보통 5)
- **0이면**: live-update.yml 트리거 실패 or runPostviewDaily 에러 → GitHub Actions 로그 확인

**B) Postview 내용 샘플링**
```sql
-- 최근 post_game row 1건의 reasoning 구조 확인
SELECT game_id, reasoning->'factorErrors' AS factor_errors,
       substring(reasoning->>'judgeReasoning', 1, 200) AS reasoning_preview
FROM predictions
WHERE prediction_type = 'post_game'
ORDER BY created_at DESC LIMIT 1;
```
- **기대**: `factorErrors`에 실제 factor 이름(`home_sp_fip` 등), `reasoning_preview` 한 줄 이상 (fallback 한 줄 아님)
- **fallback만 나오면**: Sonnet 호출 실패 → API 크레딧·모델 ID 확인

**C) agent_memories home/away 양쪽 생성 확인**
```sql
-- 어제 경기 기반 memory 개수 + 팀 분포
SELECT team_code, memory_type, count(*)
FROM agent_memories
WHERE source_game_id IN (SELECT id FROM games WHERE game_date = CURRENT_DATE - INTERVAL '1 day')
GROUP BY team_code, memory_type
ORDER BY team_code;
```
- **기대**: 경기당 최대 2개 row (home 팀 + away 팀), memory_type 다양하게 분포
- **한쪽 팀만 보이면**: `retro.ts` home/away 버그 수정이 실제 런타임에서 작동 안 함 → 긴급

**D) live-update.yml cron 윈도 확장 확인**
- GitHub Actions → `Live Game Update` workflow → 18:00~00:50 KST 시간대에 10분 간격 실행 로그
- **기대**: 약 43회 실행 (2h 확장분 포함), 대부분 "no active games" 즉시 종료
- **23:30 이후 실행 없으면**: workflow 파일의 cron이 적용 안 됨

**E) UNIQUE 제약·upsert 멱등성 확인**
```sql
-- 같은 (team_code, memory_type, content) 중복 없는지
SELECT team_code, memory_type, content, count(*)
FROM agent_memories
GROUP BY team_code, memory_type, content
HAVING count(*) > 1;
```
- **기대**: 0 rows (UNIQUE 제약 때문에 구조적으로 불가능)
- **row 있으면**: migration 009 제약이 비활성화됨 → 긴급

**F) validator reject 율 (Claude strict)**
- Vercel/pipeline 로그에서 `[Validator]` 키워드 grep
- **기대**: 0건 또는 극소수 (Claude는 compliance 높음)
- **증가하면**: 프롬프트 튜닝 필요 (페르소나·RESPONSE_FORMAT)

### 우선순위
- **반드시**: A, B, C (postview + Compound 루프 핵심 검증)
- **권장**: D (cron 확장 실제 적용 확인)
- **주간 1회**: E, F (정상 운영 확인)

---

## ✅ Phase v4-4 (사용자 UI 노출) — 구현 완료 (2026-04-16~17)

전체 항목 구현 완료. 운영/검증은 자연 발화 관찰 섹션으로 이관.

- ✅ `/analysis/game/[id]` 페이지 — 홈/원정 에이전트 박스 + 심판 reasoning + factor 분해
- ✅ `/analysis` 인덱스 + 시즌 AI 리더보드 (`/dashboard` 이전)
- ✅ 빅매치 자동 선정 휴리스틱 — `packages/kbo-data/src/big-match/selectBigMatch.ts`
- ✅ `BigMatchDebateCard.tsx` hero 섹션 컴포넌트
- ✅ A/B flag — `apps/moneyball/src/lib/feature-flags.ts isBigMatchEnabled`
- ✅ `/debug/hallucination` 대시보드 + middleware BASIC auth (validator 로그)
- ✅ `docs/defamation-ir.md` 명예훼손 IR 절차 문서

남은 검증 (자연 발화):
- post_game 데이터 UI 렌더링 — Phase v4-3 자연 발화 관찰 섹션 A,B,C 항목으로 검증
- 빅매치 자동 선정 결과 의미 있는지 — 운영 데이터 축적 후 후속 회고

---

## 🛠 v0.5.18-21 후속 운영 (2026-04-19)

### Sentry 모니터링 정기 점검
- **What**: Sentry Issues 탭 주 1회 점검. 같은 에러 패턴 반복 시 fix.
- **Where**: https://sentry.io 본인 계정, 프로젝트 `moneyballscore`
- **When**: 주말 retro 시 함께
- **Free plan 한도**: 월 5K errors. 80% 도달 시 이메일 알림 자동.

### Migration 012 적용 검증
- **Done**: `supabase migration list --linked` — 001~012 모두 동기화 완료 (2026-04-19).
- 남은 검증: prod에서 `/search` 한글 선수 ILIKE 응답 시간이 빠른지 (수동 1회).

### 사용자 리텐션 기능 — 부분 구현 진행도
- ✅ 관심 팀 필터 (`FavoriteTeamFilter.tsx`) — localStorage 기반
- ✅ RSS feed (`/feed`) — 이전 구현
- ⏸ 북마크 (특정 경기 팔로우)
- ⏸ 결과 알림 (이메일/푸시)
- ⏸ 사용자 계정 / 세션
- 우선순위: LOW (트래픽 발생 후 재평가)

---

## ✅ v4-4 후속 — 30일 retention (완료)

- **구현**: `daily.ts` predict 모드 시작 시 `agent_memories` + `validator_logs` 30일 초과 row 자동 삭제
- **pg_cron 불필요**: 기존 daily-pipeline cron이 매일 실행하므로 별도 DB extension 없이 해결

## ✅ v5 이후 deferred — DESIGN.md 작성 (완료)

- DESIGN.md 작성 완료 (2026-04-16, `/design-consultation` 실행).
- 다크 그린 + 골드 팔레트 + Pretendard 타이포 + 8px 스페이싱 시스템 + Decisions Log 포함.

---

## Phase 2a 시작 전

### ~~Statiz 스크래핑 법적 리스크 확인~~ ✓ 완료 (2026-04-14)
- **결과:** statiz.co.kr robots.txt에서 `User-agent: * / Disallow: /` — 전체 차단
- **대안 확정:** 3소스 조합
  - KBO 공식 (koreabaseball.com): 경기일정, 선발확정, 결과, 최근폼, 상대전적
  - KBO Fancy Stats (kbofancystats.com): FIP, xFIP, WAR, wOBA, SFR, Elo (robots.txt 없음)
  - FanGraphs (fangraphs.com): wRC+, ISO, BB%/K% (보조/검증)

## KBO Daily 개발 전

### 애드센스 승인 요건 조사
- **What:** Google AdSense 승인에 필요한 최소 요건 조사
- **Why:** AI 생성 콘텐츠에 대한 구글 최신 정책, 최소 콘텐츠 수, 승인 소요 시간 파악
- **확인 사항:** AI 콘텐츠 허용 범위, 자체 도메인 요건, 트래픽 최소 기준
- **우선순위:** HIGH (KBO Daily 개발 방향에 영향)


## ✅ Vercel 일일 배포 quota 소진 재발 — production 빌드 turbo-ignore 정정 (cycle 2114, 2026-08-14, fix-incident)

deploy-drift-alert 실패(04:58 KST) 발견 → production 3 commit 뒤(7baa84a) 고정,
main HEAD(fc3f5d2f) 미배포. `vercel ls` 로 지난 21시간 85개 배포 확인 — hobby
100/day quota 근접, cycle 2083 quota 소진 family 재발(31 cycle 간격).

근본원인: `apps/moneyball/vercel.json` ignoreCommand 가 `VERCEL_ENV=preview`
일 때만 스킵 — main push (매 cycle 의 `policy: cycle-retro` TODOS.md-only
커밋 포함) 는 항상 풀 production 빌드를 태워 quota 소진. `npx turbo-ignore
moneyball` 추가로 production 도 turborepo affected-package 판정 따라 스킵.
로컬 검증: TODOS.md-only 범위 `packages: []`(스킵) vs app 코드 포함 범위
"affects moneyball"(빌드 진행) 양쪽 확인. PR #2947 머지 실측 확인
(gh pr view state=MERGED, 723c5861).

**다음 관찰 포인트**: 다음 cycle(들)에서 deploy-drift-alert 정상 재개(성공)
확인 — turbo-ignore 배포 후 실효성 monitor.

## ✅ review-code(heavy) — MLB filter family 재검증 + wave 363 가드 테스트 (cycle 2127, 2026-08-14)

cycle 2125/2126 retro carry-over(en/mlb/calendar 회귀 재점검) 를 실제 검증.
결과: 회귀 없음. EN mirror 13/13 mlb 서브페이지 parity 완결 확인(find 전수
대조), monthGrid.ts 의 Dec→Jan/윤년 경계는 이미 유닛테스트 커버(cycle 2123
회귀 테스트로 발견+수정된 버그의 재발 방지 테스트 보유), MLB predictions
쿼리 11개 사이트(page.tsx 6 + lib/mlb 5) 전수 재조회 결과 필터 누락 0곳
(cycle 2124/2125 fix 6곳 모두 유지 확인).

순수 재검증만으로 끝내지 않고 wave 363 가드 테스트 신규 추가 —
lib/mlb + app/mlb + app/en/mlb 디렉토리를 동적 스캔해 `.from('predictions')`
보유 파일이 모두 `MLB_PRODUCTION_COHORT_RULES`/`MLB_SCORING_RULE` 필터를
갖는지 검증. 기존 wave 테스트(cycle 2124/2125)는 "이미 아는 파일" 개별
mock 검증이라 향후 신규 predictions 쿼리 파일 추가 시 필터 누락을 못 잡음 —
본 가드는 그 gap 을 구조적으로 막는다(KBO PRODUCTION_COHORT_RULES filter
family wave 11~17 재발 패턴과 동일 구조 예방).

전체 3817/3817 pass, tsc/lint clean. main 직접 commit + push (R4/R7,
단일 테스트 파일, PR 생략).

## ✅ explore-idea(heavy) — MLB games 리스트 top pick 딥링크 (cycle 2132, 2026-08-14)

cycle 2131 review-code(lite) 회고가 남긴 KBO/MLB parity gap 후속. KBO
`predictions/[date]` 의 "최고 자신감 픽" (`topPick`, `TOP_PICK_CONF_MIN` 기반
`confToWinProb`) 패턴을 MLB `games/[date]` KO/EN 리스트 페이지에 이식.

- `TOP_PICK_MIN_WIN_PCT = round(confToWinProb(TOP_PICK_CONF_MIN) * 100) = 55`
  (KBO 임계값 재사용, 신규 임계값 발명 없음)
- 최고 win% 픽 카드에 앵커 딥링크(`#pick-<id>`) + ⭐ 배지 + ring 하이라이트
- 신규 데이터 모델/마이그레이션 없음 — 기존 `home_win_prob` 로만 계산
- wave-624 가드 테스트 신규 (KO/EN topPick 계산식 + 앵커 + 하이라이트 parity, 9 assertion)
- `pnpm lint` / `tsc --noEmit` / `vitest run`(436 files, 3828 tests) 전부 clean
- PR #2955 squash 머지 완료 (state=MERGED 실측 확인, commit 42235760)

## ✅ fix-incident(heavy) — 헤더 nav EN 이탈 버그 (cycle 2140, 2026-08-14)

cycle 2139 review-code(heavy) 가 발견한 site-wide 버그: `Header.tsx`
`MLB_NAV` href 가 KO 경로(`/mlb/*`) 하드코딩이라 `/en/mlb/*` 방문자가
헤더 메가메뉴 · 모바일 메뉴 · 리그 셀렉터 MLB pill 을 클릭하면 KO
페이지로 이탈.

- `Header.tsx`: `localizeNavItems()` 신규 — pathname 이 `/en/*` 일 때
  MLB nav href 만 `/en` 접두로 치환 (EN 대응 라우트 8개 이미 전부 존재,
  순수 매핑 문제였음). KBO_NAV 는 EN 라우트 부재라 무변경.
- `NavLinks.tsx`/`MobileNav.tsx`: `LEAGUE_NAVS` 조회 후 `localizeNavItems`
  통과하도록 소비 지점 수정.
- `LeagueSelector.tsx`: MLB pill href 도 동일 로직(`leagueHref` 헬퍼).
- `Header.test.ts` 신규 (localizeNavItems 4 case: KO 무변경 / EN 치환 /
  정확 일치 경로 / KBO_NAV 무변경).
- `pnpm lint` / `tsc --noEmit` / `vitest run`(439 files, 3843 tests) 전부
  clean. main 직접 commit + push (R4, PR 생략 — 단일 논리 단위 4파일).

후속 후보(스코프 밖, 이번엔 미포함): 헤더 nav label 자체가 여전히
한국어 하드코딩(`오늘`/`경기·팀` 등) — EN 페이지에서도 KO 라벨 노출.
컴포넌트 레벨(`MlbAccuracyDashboard` 등)엔 이미 `STRINGS[ko/en]` 패턴
있으니 Header 레벨 확장은 후속 explore-idea/polish-ui 후보. aria-label
("메뉴"/"검색"/"모바일 메뉴"/"리그 선택")도 동일 국제화 후속 대상.

## 🟢 review-code (heavy) — /mlb/team/[code] division rank 배지 GB=0 자기모순 문구 fix (cycle 2217, 2026-08-19)

open issue 0건, approved plan 0건. 직전 8사이클 distinct=4 — 2-chain lock 미충족.
cycle 2216 next_recommended (review-code or operational-analysis) 채택, op-analysis
최근(2215) 발화로 review-code 선택.

**전수 재확인**: cycle 2214가 고친 CURRENT_MODEL_FILTER/PRODUCTION_COHORT_RULES 중복
필터 + WAR=0 가드 불일치 family — 전체 코드베이스 grep 재확인 결과 잔존 0건 (family
완전 종료 확정). CURRENT_MODEL_FILTER 단독 사용 11개 파일은 PRODUCTION_COHORT_RULES
미결합이라 문제 없음(scoring_rule='v1.8' 단일 equality가 CE-fallback row도 포함 —
decideModelVersion이 성공/실패 양쪽 분기 모두 scoring_rule=CURRENT_SCORING_RULE 고정
박제하기 때문). WAR duel 3곳 모두 가드 확인.

**신규 발견**: cycle 2216(PR #2969, 본 cycle 시작 40분 전 shipped)이 추가한
`/mlb/team/[code]` division rank 배지의 `fmtGamesBehind()` 함수가 gb=0을
"공동 1위"로 특수 표시 — 하지만 배지 앞부분에 이미 `{rank}위/{total}팀` positional
rank가 노출돼 있어 "2위/5팀 · 공동 1위" 같은 자기모순 문구 발생 가능(GB=0인 팀이
buildMlbDivisionStandings의 총 승수 tiebreak로 2위 이하로 밀릴 수 있음). "공동 1위"
특수케이스 제거 → GB=0도 일반 "0.0경기차"로 표시(/mlb/standings 기존 컨벤션과 정합).

회귀 테스트 1건 추가. type-check(4 packages)/lint/vitest(452 files·3923 tests)
전체 통과. PR #2970 → `gh pr merge --squash --auto --delete-branch` → `gh pr view`
실측 확인(state=MERGED, commit 945b1a59).

## 🟢 explore-idea (heavy) — /mlb/predictions 전체 예측 기록 hub 신규 (KBO parity Phase 1, cycle 2218, 2026-08-19)

open issue 0건, approved plan 0건(19건 전량 완료/archived). 2-chain lock 미충족
(직전 8사이클 distinct=4). lotto(gap=43)/info-arch(gap=35) 30+ 사이클 gap 트리거
수치상 충족했으나 cycle 2213/2215 가 이미 재확인·skip 처리(구현 완료/cron fresh)
한 항목이라 3번째 재확인 실익 없어 이번에도 skip. cycle 2217 next_recommended
(explore-idea or operational-analysis) 채택 — op-analysis 는 cycle 2215 재측정이
14시간 전이라 즉시 재실행해도 신규 verified row 없이 동일 수치 반복될 게 자명해
explore-idea 선택.

**발견**: KBO `/predictions`(날짜별 필터/검색/정렬 가능한 전체 예측 기록 hub, 402줄)
에 대응하는 MLB 라우트가 없음 — `/mlb/games/[date]` 개별 날짜 페이지는 있지만
전체 날짜를 가로지르는 hub 자체가 부재. `/mlb` 앱 라우트 10개 vs KBO 상응 라우트
목록 diff 로 발견(`analysis`/`dashboard`/`insights`/`leaderboard`/`picks`/
`predictions`/`seasons` 7개 후보 중, `insights`는 MLB predictions 에 reasoning
텍스트 컬럼 자체가 전량 미사용(mlb-pipeline.ts 에 reasoning 필드 없음 — LLM
디베이트 자체가 MLB 엔 없음)이라 빈 페이지가 될 게 확실해 제외, `seasons`는
실제 시즌 우승팀 등 사실 콘텐츠 하드코딩이 필요해 조사/할루시네이션 위험이라
제외, `dashboard`/`leaderboard`/`picks`는 리그 무관 사용자 계정 기능이라 parity
갭 아님으로 판단해 제외 — `predictions` 만 순수 DB 쿼리로 채울 수 있는 진짜 갭).

**구현**: KBO predictions/page.tsx 를 템플릿으로 MLB 버전 작성.
- `apps/moneyball/src/app/mlb/predictions/page.tsx` 신규 — KBO 는
  `games`(팀 FK) LEFT JOIN predictions 로 "미기록" 날짜까지 잡지만, MLB 는
  games 모델이 없어 `mlb_schedule` 을 동일 역할(전체 편성 경기 원천)로 두고
  predictions 를 external_game_id 로 map(2-step 조회, mlb/games/[date]/page.tsx
  와 동일 패턴). `deriveMlbOutcome`(predictions.is_correct 전량 NULL 이라 직접
  derive) + `classifyWinnerProb`/`WINNER_TIER_LABEL`/`pickTierEmoji`(리그 무관
  순수 확률 분류라 그대로 재사용) 사용. `MLB_PRODUCTION_COHORT_RULES` 필터로
  CE-fallback family 정합.
- KBO 필터 컴포넌트(PredictionsStatusFilter/SortControl/TierFilter/MonthFilter/
  AccuracyHeaderCard) 5개는 grep 확인 결과 TeamCode 결합 0건이라 그대로 재사용.
  `PredictionsSearchBox` 만 KBO_TEAMS 결합이라 `MlbPredictionsSearchBox.tsx`
  신규(별도 storage key `mb_mlb_predictions_search_v1` — KBO/MLB 검색 상태 분리).
- 헤더 MLB 메가메뉴("경기·팀" 섹션) + 푸터 MLB 컬럼 양쪽 즉시 배선 + sitemap.ts
  KO entry 추가 — 신규 라우트 nav 배선 누락(cycle 2153/e7518e94 family) 재발
  차단, 이번엔 첫 커밋부터 포함.
- CE 배너(KBO `simplifiedMode` 상단 경고)는 미포함 — MLB 파이프라인은 처음부터
  quant-only(LLM 디베이트 없음)라 CREDIT_EXHAUSTED 영향 자체가 없음, 배너 넣으면
  오히려 오해 소지.

**Phase 1 스코프 (의도적 축소, 후속 후보)**: EN mirror(`/en/mlb/predictions`)
는 이번 cycle 미포함 — KO 먼저 검증 후 별도 cycle 에서 병렬 추가하는 기존
phased 관례(calendar/matchup 등) 따름. metadata 에 `languages: {en: ...}`
alternate 를 미리 선언하지 않음(존재 안 하는 페이지 hreflang 404 방지 — 반대
방향 실수도 사례가 있어 이번엔 역방향 점검). sitemap.ts 도 KO entry 만 추가.
회귀 테스트(`mlb-predictions-page.test.ts`)에 EN 부재 상태를 명시적으로
assert(음성 케이스)해 다음 cycle 이 EN 추가 시 이 assert 를 갱신하도록 강제.

테스트 11건 신규(정적 grep 방식, mlb-standings-page.test.ts 패턴). type-check
(4 packages)/lint(moneyball)/`pnpm test`(turbo 전체 4 packages) 전부 통과
확인 완료 후 커밋.

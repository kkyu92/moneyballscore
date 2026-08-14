# TODOS

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

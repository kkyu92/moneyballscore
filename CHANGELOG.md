## v0.5.62.169 — 2026-09-01 (cycle 2699, review-code(heavy): glossary/data.ts 재감사 clean)

### review-code(heavy): TodayGameCard 오도 필드 8개 제거 (cycle 2716, SUCCESS)

- 진단: open issue 0, unprocessed plan 0/23. gap trigger 4종 미도달(fix-incident 19/20 근접, op-analysis 0/25 리셋, info-arch 6/30, lotto 26/30). 직전8 distinct=3 — 2-chain lock 미충족. cycle 2712/2713/2714 carry 잔여 중 `TodayGameCard` badge 8필드 오도 이슈 채택.
- `homeRank`/`awayRank`/`homeRecent10`/`awayRecent10`/`h2hHomeWins`/`h2hAwayWins`/`homeTeamVenue`/`awayTeamVenue` 8필드가 인터페이스에 optional 선언돼있지만 `getTodayAnalysisData()`는 전혀 계산 안 함(항상 undefined) — 유일 caller `analysis/page.tsx`의 `gamesWithRank`가 즉시 재계산·override해 기능 손실은 없었으나 인터페이스가 함수 책임을 오도.
- fix: 8필드 인터페이스에서 제거(commit e6c4ac72). tsc/eslint clean, 전체 테스트 571파일 4483건 green.
- declared-but-never-computed 변종(computed-but-unconsumed 계열의 역방향) 재발 확인.
- 다음 사이클 추천 = matchup/team-profile 수렴픽 카드 컴포넌트 공유화(cycle 2713 carry) 또는 fix-incident gap 자연 도달(20/20) 대기.

### review-code(heavy): analysis-data.ts 미소비 select 컬럼(prediction_type) 제거 (cycle 2714, SUCCESS)

- 진단: open issue 0, unprocessed plan 0/22(전부 status≠approved). gap trigger 4종 전부 미도달(fix-incident 18/20, op-analysis 23/25, info-arch 5/30, lotto 25/30). 직전8 distinct=3 — 2-chain lock 미충족. cycle 2713 추천 carry 중 cycle 2712 항목(`prediction_type` select-only 미사용) 채택.
- `getTodayAnalysisData`/`getYesterdayGames`/`getThisWeekPreviousGames` 3개 쿼리 모두 predictions embed select 에 `prediction_type` 포함하지만 row 처리 코드 어디서도 미참조 확인 — 서버측 `.eq('predictions.prediction_type', 'pre_game')` 필터는 select 없이도 동작(cycle 2678 `buildMlbMatchupProfile.ts`/cycle 2680 `buildMlbTeamProfile.ts` 동일 패턴 precedent 확인).
- fix: 3개 인터페이스 + select절에서 `prediction_type` 제거(commit 5d84bad5). tsc clean + eslint clean + 전체 테스트 571파일 4483건 green.
- computed-but-unconsumed/select-only-unused 패턴 재발(cycle 2661/2678/2680/2690/2708/2710/2711/2712/2713 계열 연장) — review-code(heavy) 대형파일 rotation 지속 확인.
- 다음 사이클 추천 = cycle 2712/2713 carry 잔여(`TodayGameCard` badge 8필드 오도 이슈, matchup/team-profile 수렴픽 카드 컴포넌트 공유화) 중 택1, 또는 gap trigger 자연 대기.

### review-code(heavy): convergenceRecord.ts 미소비 select 컬럼(id/game_time/status) 제거 (cycle 2713, SUCCESS)

- 진단: open issue 0, unprocessed plan 0/23(전부 status≠approved). gap trigger 4종 전부 미도달(fix-incident 17/20, op-analysis 22/25, info-arch 4/30, lotto 24/30). 직전8 distinct=3 — 2-chain lock 미충족. cycle 2712 추천대로 `convergenceRecord.ts`(830줄) 정독.
- 서브에이전트 위임 감사(read-only) — export 함수 36개 전 필드 repo-wide 소비처 교차검증. 인터페이스 필드 자체는 전부 소비 확인(unconsumed 0건) — 이 파일은 이전 계열(teamColor/oldestSeenAt/homeWinProb)과 달리 clean.
- 대신 select-only-for-filter 계열 dead column 2건 발견: `ConvergenceGameRow.id`/`game_time` (두 KBO fetch 함수 모두 select만 하고 `row.id`/`row.game_time` 미참조 — game_time 은 `.order()` 컬럼명 문자열로만 쓰여 select 자체가 불필요) + `fetchMlbConvergencePickDetailedResultsForPair`의 `status` (sibling 함수가 이미 select 없이 `.eq('status','final')` 필터만으로 동작 확인된 패턴, 여기만 select 잔존).
- fix: 3개 컬럼 select문 + 타입 정의에서 제거(commit e2102d9b). tsc clean + eslint clean + 전체 테스트 571파일 4483건 green.
- computed-but-unconsumed 패턴이 이번엔 인터페이스 필드가 아니라 "select-only 미사용 DB 컬럼" 변종으로 재발 — cycle 2712 발견한 `prediction_type` select 미사용 건과 동일 계열.
- 부가 발견(범위 밖, carry) — `MatchupConvergencePickRecord`/`MlbMatchupConvergencePickRecord`, `TeamConvergencePickRecord`/`MlbTeamConvergencePickRecord` 컴포넌트 쌍이 근사 중복(MLB 쪽만 i18n 레이어 추가되며 구조 drift 중) — reviews-hub 카드들은 이미 공유 컴포넌트로 추출됐지만 matchup/team-profile 카드는 미추출.
- 다음 사이클 추천 = 부가 발견 2건(matchup/team 카드 컴포넌트 공유화, cycle 2712 `prediction_type`/`TodayGameCard` badge 8필드) 중 택1 정독, 또는 gap trigger 자연 대기.

### review-code(heavy): BestPickCard.confidence/MlbUpcomingGame.homeWinProb+duelValidCount 미소비 필드 제거 (cycle 2712, SUCCESS)

- 진단: open issue 0, unprocessed plan 0/23. gap trigger 4종 전부 미도달(fix-incident 16/20, op-analysis 21/25, info-arch 3/30, lotto 23/30). 직전8 distinct=3 — 2-chain lock 미충족. cycle 2711 추천대로 `analysis-data.ts`(974줄 KBO)/mlb `analysis-data.ts`(279줄) 정독.
- 서브에이전트 위임 감사(read-only) — 전체 export interface/함수 소비처 repo-wide 교차검증. `BestPickCard.confidence`, `MlbUpcomingGame.homeWinProb`, `MlbUpcomingGame.duelValidCount` 3필드가 계산·리턴되지만 유일 caller(analysis/page.tsx, mlb+en/mlb analysis page.tsx weekRemaining 블록)에서 미소비 확인.
- fix: 3필드 인터페이스 + 계산 로직에서 제거(commit f8d38221). tsc clean + eslint clean + 관련 테스트 28파일 181건 green.
- 부가 발견(이번 범위 밖, carry) — `TodayGameCard` badge 8필드는 `analysis-data.ts`가 실제 계산 안 하고 page.tsx가 즉시 덮어씀(기능 무해, 인터페이스 오도) / `prediction_type` select 컬럼이 filter 용도로만 쓰이고 응답 후 미사용(대역폭만 소모).
- computed-but-unconsumed 패턴 재발(cycle 2661/2690/2708/2710/2711 계열 연장) — review-code(heavy) 대형파일 rotation 지속 확인.
- 다음 사이클 추천 = review-code(heavy) 잔여 미감사 대형파일(`convergenceRecord.ts` 830줄) 정독, 또는 gap trigger 자연 대기.

### review-code(heavy): buildFallbackStats 미소비 oldestSeenAt 필드 제거 (cycle 2711, SUCCESS)

- 진단: open issue 0, unprocessed plan 0/23(전부 status≠approved). gap trigger 4종 전부 미도달(fix-incident 15/20, op-analysis 20/25, info-arch 2/30 리셋, lotto 22/30). 직전8 distinct=3 — 2-chain lock 미충족. cycle 2710 추천대로 잔여 미감사 대형파일 rotation, `buildAccuracyData.ts`(776줄) 정독.
- 전체 정독 — export 함수/상수 22개 소비처 교차검증(accuracyRateColorClass 7파일, bucketize/brierScore/calibrationGap 각 5파일 등 전부 소비 확인). 필드 단위 정밀 검증 중 `FallbackStats.oldestSeenAt`가 `buildFallbackStats()` 안에서 계산·리턴은 되지만 `/accuracy` 페이지(유일 caller)가 `fallbackStats.latestFallbackAt`만 소비하고 `oldestSeenAt`은 앱 전역 grep 0건 확인.
- fix: `FallbackStats` 인터페이스 + `buildFallbackStats` 계산 로직에서 `oldestSeenAt` 제거(커밋 231634e0). tsc/eslint clean, 관련 테스트 8파일 108건 green(buildAccuracyData 전체 + accuracy 페이지). 단일 논리 단위 → main 직접 commit+push(R4/R7).
- computed-but-unconsumed 패턴 재발(cycle 2661/2690/2708/2710 계열 연장) — review-code(heavy) 대형파일 rotation 이 이 계열의 주요 검출 채널로 지속 확인. `SMALL_SAMPLE_THRESHOLD`(=3, 로컬 gating 상수)는 외부 미소비지만 shared `SMALL_SAMPLE_N`(=5, 표시용 hedge 임계)와 목적이 달라(내부 null-gating vs UI 경고 배지) drift 아님 — 오탐 배제.
- 다음 사이클 추천 = review-code(heavy) 잔여 미감사 대형파일(`analysis-data.ts` 974줄/mlb `analysis-data.ts` 279줄) 정독, 또는 fix-incident(16/20)/op-analysis(21/25)/lotto(23/30) gap 자연 대기.

### review-code(heavy): buildMatchupProfile.ts/buildMlbMatchupProfile.ts 미소비 teamColor 필드 제거 (cycle 2710, SUCCESS)

- 진단: 개방 issue 0, unprocessed plan 0/23. gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 18/25, info-arch 0/30 리셋, lotto 20/30). 직전8 distinct=3(review-code(heavy) 5 + polish-ui 1 + info-architecture-review 1 + fix-incident sub 1) — 2-chain lock 미충족. cycle 2709 추천대로 잔여 미감사 대형파일 rotation, `buildMatchupProfile.ts`(594줄) 정독.
- 전체 정독 — DB fail-loud(assertSelectOk), computeMatchup* 전부 packages/shared 단일 source(cycle 2034/2036/2055/2071 계열), scoring_rule 필터(cycle 2408/2409 계열) 등 이미 정합.
- 필드별 소비처 교차검증 중 `MatchupSideStat.teamColor`가 매치업 페이지(`matchup/[teamA]/[teamB]/page.tsx`) 팀별 성과 카드 어디에서도 소비되지 않음 발견(teamCode/teamName/wins/homeWins/awayWins/predictedToWin만 렌더링). MLB 대응 `buildMlbMatchupProfile.ts`의 `MlbMatchupSideStat.teamColor`도 동일 패턴(mlb matchup 페이지 grep 0건) — 양쪽 인터페이스 + `makeSideStat` 함수 + 전체 호출부에서 `teamColor` 제거.
- tsc clean + eslint clean + 관련 테스트 38파일 243건 green(matchup/mlb/teams/wave-610~622/silent-drift-wave-236). 단일 논리 단위 → main 직접 commit+push(R4/R7, 5c0c6314).
- computed-but-unconsumed 패턴 재발(cycle 2661/2690/2708 계열 연장) — review-code(heavy) 대형파일 rotation 이 이 계열의 주요 검출 채널로 지속 확인.
- 다음 사이클 추천 = review-code(heavy) 잔여 미감사 대형파일(`analysis-data.ts`/`buildAccuracyData.ts` 776줄) 정독, 또는 fix-incident(6/20)/op-analysis(19/25)/lotto(21/30) gap 자연 대기.

### info-architecture-review: 30-cycle-gap checkpoint (cycle 2709, RETRO-ONLY)

- 진단: gap trigger 도달(info-arch 마지막 발화 cycle 2679, gap=30). 2-chain lock 미충족(직전8 distinct=4). open issue 0, approved plan 0/23.
- 신규 라우트 0건(cycle 2679 checkpoint commit 02b0c11c 이후), breadcrumb 누락 18건(기존과 완전 일치, 전부 의도된 noindex/redirect-only/utility 페이지), 헤더 메가메뉴/푸터 sitemap 컬럼 변경 없음.
- 코드 변경 없음(감사만) — `docs/design/ia-2026-09-01-cycle-2709-30-cycle-gap-checkpoint.md` 박제.

### review-code(heavy): buildTeamProfile.ts/buildMlbTeamProfile.ts 미소비 color 필드 제거 (cycle 2708, SUCCESS)

- 진단: 개방 issue 0, unprocessed plan 0/23(전부 status≠approved). gap trigger 4종 전부 미도달(fix-incident 12/20, op-analysis 17/25, info-arch 29/30 근접, lotto 19/30). 직전8 distinct=3(review-code(heavy) 6 + skill-evolution 1 + polish-ui 1) — 2-chain lock 미충족. cycle 2707 추천대로 잔여 미감사 대형파일 rotation, `buildTeamProfile.ts`(601줄) 먼저 정독.
- `buildTeamProfile.ts` 전체 정독 — DB fail-loud(assertSelectOk), margin/streak/blowout/closeGame/homeAwayEdge/recentRecord 단일 source(cycle 2034/2036/2399 계열), 명시적 정렬 분리(cycle 2399) 등 이미 정합. 필드별 소비처 교차검증 중 `TeamProfile.color`(meta.color 복사)가 `apps/moneyball/src/app/teams/[code]/page.tsx` 어디에서도 소비되지 않음 발견 — 전체 grep 확인 결과 앱 전역 팀 색상 표시(matchup/dashboard/players/reviews 차트 전부)는 `KBO_TEAMS[code].color`/`MLB_TEAMS[code].color` 를 직접 참조, profile 객체 경유 0건.
- `buildMlbTeamProfile.ts`(MLB 대응 함수) 도 동일 패턴(`MlbTeamProfile.color`) 확인 — 양쪽 인터페이스 + 생성 지점에서 `color` 필드 제거(commit d6620830).
- tsc clean + eslint clean + 관련 테스트 8파일 59건 green(buildTeamProfile/buildMlbTeamProfile/silent-drift-cycle-2288/wave-618·619·622·623/mlb-team-code-page). 단일 논리 단위 → main 직접 commit+push(R4/R7).
- computed-but-unconsumed 패턴 재발(cycle 2661/2690 계열 연장) — review-code(heavy) 대형파일 rotation 이 이 계열의 주요 검출 채널로 지속 확인.
- 다음 사이클 추천 = review-code(heavy) 잔여 미감사 대형파일(`analysis-data.ts`/`buildAccuracyData.ts` 776줄, `buildMatchupProfile.ts` 594줄) 정독, 또는 fix-incident(13/20)/op-analysis(18/25)/info-arch(30/30 도달 예정)/lotto(20/30) gap 자연 대기.

### review-code(heavy): fancy-stats.ts / silent-drift-alert.ts 재감사 — clean (cycle 2707, RETRO-ONLY)

- 진단: gap trigger 4종 전부 미도달(fix-incident 11/20, op-analysis 16/25, info-arch 28/30, lotto 18/30), 2-chain lock 미충족(직전8 distinct=3) → cycle 2706 추천대로 carry-over 대형파일 rotation.
- `fancy-stats.ts`(526줄) 전체 정독 — FANCY_STATS_DEFAULTS/TEAM_NAME_MAP/FS_TEAM_MAP/findPitcher 전부 단일 source, 이중 정의 drift 없음.
- `silent-drift-alert.ts`(440줄) 전체 정독 — 5개 alert dispatcher 중 4개 정상 배선 확인, captureFactorAnomalyAlert 미배선은 cycle 2276 기존 문서화 사실(신규 발견 아님).
- 코드 변경 없음(감사만 — 양쪽 clean).
- 다음 사이클 추천 = review-code(heavy) 잔여 미감사 대형파일(`analysis-data.ts`/`buildAccuracyData.ts` 776줄, `buildTeamProfile.ts` 601줄, `buildMatchupProfile.ts` 594줄) 정독, 또는 fix-incident(12/20)/op-analysis(17/25)/info-arch(29/30 근접)/lotto(19/30) gap 자연 대기.

### polish-ui(2-chain lock fallback): 미소비 semantic CSS 토큰 제거 (cycle 2706, SUCCESS)

- 직전8 사이클 distinct=2(review-code(heavy) 7 + skill-evolution 1) — 2-chain alternation lock 발동. 잔여 chain pool 진단(gap trigger 4종 전부 미도달, explore-idea saturation 2/15 미충족) 전부 organic trigger 부재 → polish-ui 강제 발화.
- `globals.css` `@theme` 블록 `--color-success`/`--color-info` 가 CSS var()·Tailwind utility(`bg-success`/`text-info` 류) 어디서도 소비 안 됨을 grep 확인 — 실제 semantic success/info 컬러는 `lib/design-tokens.ts` 의 JS literal(`semantic.success`/`semantic.info`)로만 recharts SVG prop 에 소비(satori/recharts CSS var 미지원이라 별도 literal source 필요). `--color-warning`(Tailwind `bg-warning`/`text-warning` 다수 실사용)과 `--color-error`(`var(--color-error)`, FactorWaterfallChart 2곳)는 CSS 쪽 실사용 있어 유지.
- tsc --noEmit clean + eslint clean + pre-push hook(type-check + version-sync-guard) 통과. 단일 논리 단위 → 직접 main commit+push(R4/R7, 6c703ee5).
- 다음 사이클 추천 = review-code(heavy) 미감사 대형 파일(`fancy-stats.ts` 526줄, `silent-drift-alert.ts` 440줄, `analysis-data.ts`/`buildAccuracyData.ts` 776줄/`buildTeamProfile.ts` 601줄/`buildMatchupProfile.ts` 594줄, cycle 2653/2690 carry-over) 정독, 또는 fix-incident(gap 10/20)/op-analysis(gap 20/25)/info-arch(gap 27/30)/lotto(gap 17/30) 자연 대기.

### review-code(heavy): DEFAULT_PARK_FACTORS를 KBO_TEAMS.parkPf 단일 source로 통일 (cycle 2705, SUCCESS)

- review-code(heavy) rotation 계속 — cycle 2693 이미 dead-function(`calculateParkFactor`) 제거로 감사된 `kbo-official.ts` 재정독 중 park factor 이중 source drift 발견.
- `DEFAULT_PARK_FACTORS`(kbo-official.ts, stadium명 키, decimal ratio, "2025 시즌 기반 추정" 하드코딩)와 `KBO_TEAMS.parkPf`(shared/index.ts, index-100, 팀 persona yaml 기반 능동 관리) 대조 — 9개 구장 중 4개(인천SSG/광주기아/잠실LG·OB/대전한화)에서 타자/투수 친화 방향 자체가 반대. 잠실이 최악: KBO_TEAMS 기준 KBO 최고 수준 투수친화 구장(parkPf=95)인데 DEFAULT_PARK_FACTORS는 1.02(중립~약간 타자친화). daily.ts pipeline → predictor.ts factors.park_factor(가중치 4%)가 실제 야구 상식과 반대 부호 입력을 받던 상태.
- fix: `DEFAULT_PARK_FACTORS`를 `KBO_TEAMS.parkPf/100` 파생값으로 교체(하드코딩 테이블 제거), 두 시스템 영구 동기화 — 기존 silent drift family 단일 source 패턴 정합.
- tsc clean + eslint clean + vitest kbo-data 92 files/1218 tests 전체 green(무변화).
- 다음 사이클 추천 = review-code(heavy) 멘션횟수 rotation 계속.

### fix-incident: kbo-live 502 fallback 테스트 timeout 수정 (cycle 2704, SUCCESS)

- review-code(heavy) rotation(`backtest-manual-weights-run.ts` 전체 정독, clean — `cycle: 903` 하드코딩 메타데이터는 소비처 0건이라 actionable 아님) 도중 `npx vitest run packages/kbo-data` 전체 실행에서 `scrapers-kbo-live.test.ts` timeout 실패 재현(2회).
- 원인: `fetchWithRetry`(fetch-with-retry.ts) 가 502 응답에 실제 backoff sleep(attempt1 2000ms + attempt2 4000ms = 6000ms) 수행 — mock 이 매번 502 반환하는 테스트가 vitest 기본 5000ms timeout 초과. production retry 로직 자체는 정상(의도된 backoff), 테스트만 실제 소요시간 미반영.
- fix: 해당 테스트 timeout 5000ms→10000ms 조정(`packages/kbo-data/src/__tests__/scrapers-kbo-live.test.ts`, commit f10c33ae, main 직접 push). vitest kbo-data 92 files/1218 tests 전체 green 재확인. tsc clean.

### review-code(heavy): backtest-bootstrap-ci-run.ts / backtest-v2-helpers.ts 신규 감사 — clean (cycle 2703)

- 진단: 개방 issue 0, unprocessed plan 0/23. gap trigger 4종 전부 미도달(fix-incident 7/20, op-analysis 12/25, info-arch 24/30, lotto 14/30). 직전8 distinct=4 — 2-chain lock 미충족. computed-but-unconsumed 계열 소진 후 CHANGELOG mention-count 기준 재조사 — `backtest-bootstrap-ci-run.ts`(360줄)/`backtest-v2-helpers.ts`(370줄) 진짜 0회 언급 발견.
- `backtest-bootstrap-ci-run.ts` 전체 정독 — H1(sample noise) 검증 ad-hoc bootstrap CI 스크립트, WEIGHTS_V15 스냅샷 주석/percentile CI 로직 정상. tsc clean.
- `backtest-v2-helpers.ts` 전체 정독 + 소비처(mlb-elo.ts/walk-forward-helpers.ts/scripts/backtest-v2-candidate.ts) 교차검증 — `formatBacktestMarkdown` 안 하드코딩 가중치 delta 문서(elo/bullpen_fip/recent_form +0.03~0.04, 합계 0.85→0.95)를 실제 `DEFAULT_WEIGHTS`/`SHADOW_V20_WEIGHTS` 상수와 대조해 완전 일치 확인(stale-doc 오탐 배제). `computeEloProb` 는 production `mlb-elo.ts` 와 의도적 이중 구현(주석에 drift 차단 설계 명시). vitest 30/30 green.
- 코드 변경 없음(감사만) — 양쪽 clean. 다음 review-code(heavy) 라운드 = 멘션횟수 기준 다음 최저 후보(backtest-manual-weights-run.ts 1회 등) rotation 계속.

### review-code(heavy): mlb-waterfall.ts 재감사 — clean (cycle 2702)

- 진단: 개방 issue 0, unprocessed plan 0/23. gap trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 11/25, info-arch 23/30, lotto 13/30). 직전8 distinct=4 — 2-chain lock 미충족. 대형파일 backlog 재확인 소진 확정(CHANGELOG 10~28회 언급) + 최근 45일 git log 전체 확인 신규 feat 분기 없음 확정 — 방향 전환.
- TODO/FIXME grep 1건(mlb-waterfall.ts) 발견했으나 cycle 2110/2111 이미 해결된 역사 주석 확인. `mlb-waterfall.ts`(159줄) 전체 재감사 — LABELS(ko/en) vs `MlbWaterfallInput` 10필드 전부 일치, pairTerms 8개 부호(invert 플래그)/multiplier(head_to_head 대칭 인코딩 0.5 상쇄항 포함) 주석과 일치, home/away null 가드 정상, final bar `clampWinnerProb` 정상. computed-but-unconsumed 및 상수 mismatch 재발 없음 — clean, 변경 없음.
- 다음 review-code(heavy) 라운드 = 소규모 pure 계산 파일 rotation 계속 또는 gap trigger 자연 대기.

### review-code(heavy): model-version.ts 신규 전체 감사 + postview scoring_rule shadow row 보존 교차검증 — clean (cycle 2700, milestone)

- 진단: 개방 issue 0, unprocessed plan 0/23(전부 completed/archived/deferred/tier4). gap trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 8/25, info-arch 20/30, lotto 10/30). 직전8 distinct=2(review-code(heavy) 7 + fix-incident 1) — 2-chain lock 형식상 충족이나 잠긴 chain 중 fix-incident 포함 → 안전 우선 무시(룰 명시). explore-idea saturation(12/15) 재도달했으나 plan#29 Tier4 재확인(postseason 10월 미도달). cycle 2699 "대형파일 audit backlog 소진" 후속 — 파일명 자체가 cycle-retro 이력에 없는 신규 대상 탐색.
- `model-version.ts`(102줄) 전체 정독 — 이 파일 자체는 cycle 573(JSDoc stale 정정)에서만 다뤄졌고 이후 추가된 `usingShadowV20Weights` 분기(daily.ts:709 SHADOW_V20_WEIGHTS 연동, cycle 573 이후 신규)는 미감사 상태였음. 신규 감사 결과 `decideModelVersion` 의 shadow row scoring_rule 계산 정상, `decidePostviewModelVersion` 은 shadow 개념이 없어 항상 `CURRENT_SCORING_RULE` 반환 — postview-daily.ts:246 upsert 시 `preGame.scoring_rule ?? versionDecision.scoring_rule` 로 원본 pre_game scoring_rule 우선 보존 확인, shadow v20 row 가 postview 단계에서 CURRENT_SCORING_RULE 로 조용히 덮어써지는 silent drift 없음. clean.
- 코드 변경 없음(감사만) — computed-but-unconsumed 계열 대형파일 backlog 소진 후 review-code(heavy) 는 "파일명 기준 미감사" 신규 탐색 + "신규 분기 로직 소급 감사" 두 방향으로 지속 가능 확인. milestone cycle 2700 — MIGRATION-PATH.md phase 41 정리 대상.

### review-code(heavy): 마지막 미감사 대형파일 소진 — clean 확정

- 진단: 개방 issue 0, unprocessed plan 0/23(전부 completed/archived/deferred/tier4). gap trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 8/25, info-arch 20/30, lotto 10/30). 직전8 distinct=3(review-code(heavy) 우세 + fix-incident 1 + operational-analysis 1) — 2-chain lock 미충족. cycle 2698 추천대로 review-code(heavy) 계속, 마지막 미감사 대형파일 `glossary/data.ts`(323줄, 2026-07-03) 채택.
- `glossary/data.ts` 전체 정독 + 소비처(`glossary/page.tsx`, `methodology/page.tsx`) 교차검증 — `GlossaryEntry` 8개 필드(id/abbr/korean/fullName/definition/range/modelUsage/source) 전부 렌더링에서 소비 확인. `DEFAULT_WEIGHTS` 10개 활성 가중치(sp_fip/sp_xfip/lineup_woba/bullpen_fip/recent_form/war/head_to_head/park_factor/elo/sfr) 전부 glossary entry 에 반영, 0-weight placeholder(park_weather/umpire_sz) 는 의도적으로 제외. `GLOSSARY_TERM_COUNT` derived export 도 methodology/glossary 양쪽 정상 소비. computed-but-unconsumed 계열 재발 없음 — clean.
- 코드 변경 없음(감사만) — cycle 2693~2698 연속 발견된 computed-but-unconsumed select 필드 패턴(10변종)의 대형파일 audit backlog 소진 완료. 다음 review-code(heavy) 라운드는 재감사 rotation 또는 gap trigger(fix-incident/op-analysis/info-arch/lotto) 자연 대기로 전환.

### refactor: loadTargetGames() home/away_team_id 미소비 select 필드 제거

- 진단: 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred/tier4). explore-idea saturation(13/15) 재도달했으나 유일 후보 plan#29(로그인/커뮤니티)가 risk=3+자율불가 Tier4 재확인(오늘 2026-09-01, KBO 포스트시즌 10월 미도달). gap trigger 4종 전부 미도달(fix-incident 2/20, op-analysis 7/25, info-arch 19/30, lotto 9/30). 직전8 distinct≥3 — 2-chain lock 미충족. cycle 2697 추천대로 review-code(heavy) 계속, 미감사 대형파일 중 최고령(`backfill-sp.ts`, 2026-06-24) 채택.
- `backfill-sp.ts`(300줄) 전체 정독 — `loadTargetGames()` 의 `games.home_team_id`/`away_team_id` select 가 `GameRow` 인터페이스에 담기지만 소비처(`matchPitcher` 호출부) 는 Naver 팀명 기반 `teamIdMap`(from `ng.homeTeam`/`ng.awayTeam`) 만 사용, `game.home_team_id`/`away_team_id` 참조 0건. computed-but-unconsumed select 필드 계열 10번째 변종. 나머지(3단계 매칭 fallback, idempotent 갱신 조건, in-memory create cache, assertWriteOk fail-loud)는 clean.
- `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` clean + lint clean + vitest 92 files/1218 tests 전체 green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, e660ec14).

---

## v0.5.62.168 — 2026-09-01 (cycle 2697, review-code(heavy): rivalry-memory.ts 미소비 select 필드 제거)

### refactor: fetchRecentH2H/fetchMemories 미소비 select 필드 제거

- 진단: 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred/tier4). gap trigger 4종 전부 미도달(fix-incident 1/20 방금 발화, op-analysis 6/25, info-arch 18/30, lotto 8/30). 직전8 distinct=4(review-code(heavy) 5 + operational-analysis 1 + lotto 1 + fix-incident 1) — 2-chain lock 미충족. cycle 2696 fix-incident(lite) 전수점검 clean 이후 추천대로 review-code(heavy) 계속, 최고령 미터치 대형파일 `rivalry-memory.ts`(254줄, 2026-06-30) 채택.
- `rivalry-memory.ts` 전체 정독 + 소비처 교차검증(team-agent.ts/debate.ts) — `fetchRecentH2H` 의 `winner_team_id`/`status` select 가 조인 alias(`winner:teams(code)`)/필터(`.eq('status','final')`) 전용으로만 쓰이고 매핑 결과 미반영, `fetchMemories` 의 `valid_until` select 도 필터(`.gte('valid_until', date)`) 전용. computed-but-unconsumed select 필드 계열 9번째 변종.
- `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` clean + lint clean + vitest 92 files/1218 tests 전체 green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, de06676a).

---

## v0.5.62.168 — 2026-09-01 (cycle 2695, review-code(heavy): BacktestGame.id 미소비 필드 제거)

### refactor: loadDecidedGames() id select+할당 미소비 필드 제거

- 진단: 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred/tier4). gap trigger 4종 전부 미도달(fix-incident 12/20, op-analysis 4/25, info-arch 16/30, lotto 6/30). 직전8 distinct=3(review-code(heavy) 6 + lotto 1 + operational-analysis 1) — 2-chain lock 미충족. explore-idea saturation(13/15) 재도달했으나 유일 후보 plan#29(로그인/커뮤니티)가 여전히 risk=3+자율불가 Tier4(postseason 접근 또는 user_picks≥10 재평가 조건 미충족, 오늘 2026-09-01) → review-code(heavy) 재선택. cycle 2694 carry-over 후보 `backtest-grid-run.ts` 재확인 — 이미 자매 파일 cross-check(cycle 2685)로 clean 확정 상태, 다음 후보 `loader.ts` 채택.
- `packages/kbo-data/src/backtest/loader.ts`(250줄) 전체 정독 + 소비처 교차검증(backtest 파이프라인 7종: grid/logistic/wayback/v3/manual-weights/bootstrap-ci/run + runner.ts + harness.ts) — `loadDecidedGames()` 가 `games.id` 를 select+`BacktestGame.id` 필드에 할당하지만 어느 소비처도 `.id` 참조 없음(전부 season/homeTeamId/homeWon 등으로만 매칭). computed-but-unconsumed 죽은 필드 계열(cycle 2677/2678/2680/2681/2682/2684 "games"/기타 변종) 7번째 발견 — 이번엔 파이프라인 스크립트가 아닌 공유 loader 함수 자체. `BacktestGame` interface + select 컬럼 + 테스트 fixture(`backtest-harness.test.ts`) 동기 제거.
- `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` clean + lint clean + vitest 92 files/1218 tests 전체 green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 9f019b18).

---

## v0.5.62.168 — 2026-09-01 (cycle 2693, review-code(heavy): kbo-official.ts calculateParkFactor 죽은 함수 제거)

### refactor: calculateParkFactor() 완전 죽은 함수 제거

- 진단: 개방 issue 0, approved plan 0/22(전부 completed/archived/deferred/tier4). gap trigger 4종 전부 미도달(op-analysis 2/25, info-arch 14/30, lotto 4/30). 직전8 distinct=3(review-code(heavy) 6 + lotto 1 + operational-analysis 1) — 2-chain lock 미충족. explore-idea saturation(13/15) 재도달했으나 유일 후보 plan#29(로그인/커뮤니티)가 risk=3+자율불가 Tier4 확정 상태 재확인 → review-code(heavy) 재선택.
- `buildAccuracyData.ts`(776줄) 전체 정독 — clean(cycle 2670대 이후 이미 다수 정정 상태 재확인). 후속으로 최고령 미터치 대형파일(2026-07-14 이후 미터치) `kbo-official.ts`(323줄) 정독 → `calculateParkFactor()` 완전 죽은 함수 발견. cycle 353 knip cleanup 이 export 키워드만 제거(knip은 미사용 export만 탐지, 미호출 내부 함수는 미탐지)했을 뿐 본문은 그대로 잔존 — 실제 파크팩터는 전부 정적 `DEFAULT_PARK_FACTORS` 테이블 사용, 동적 계산 로직 12줄은 미실행 상태로 방치돼 있었음. 제거.
- `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` clean + lint clean + vitest 92 files/1218 tests 전체 green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 5fd0b1c7).

---

## v0.5.62.168 — 2026-09-01 (cycle 2690, review-code(heavy): convergenceRecord.ts 미소비 id 필드 정리)

### refactor: fetchMlbConvergencePickDetailedResultsForPair 미소비 id select 필드 제거

- 진단: 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred). gap trigger 4종 전부 미도달(fix-incident 7/20, op-analysis 24/25 근접, info-arch 11/30, lotto 1/30 방금 발화). 직전8 distinct=3(review-code(heavy) 6 + fix-incident(lite) 1 + lotto(lite) 1) — 2-chain lock 미충족. explore-idea saturation 14/15 재도달했으나 4-source 재확인 전부 negative(신규라우트 92건=git checkout mtime 부작용, TODOS Next-Up stale, GH issue 0, DESIGN.md 당일 갱신=git checkout 부작용) → review-code(heavy) 재선택, 최고령 미터치 대형파일(`convergenceRecord.ts`, 2026-08-23 11:30) 채택.
- `convergenceRecord.ts`(832줄) 전체 정독 → `fetchMlbConvergencePickDetailedResultsForPair` 의 `mlb_schedule` select 가 `id` 컬럼을 가져오지만 함수 안 scheduleRows 순회·evaluateMlbConvergencePickRow 호출 어디서도 참조되지 않음(external_game_id 로만 매칭) — kbo-live.ts/mlb-shared.ts/buildPicksStats.ts/predictions Row 등과 동일 미소비 select 필드 계열 9번째 변종. 나머지 함수(getConvergencePick* / getMlbConvergencePick* 전체, h2h 게이팅, streak/팀별/홈어웨이/요일 집계)는 clean.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests 전체 green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 2bb1baa1).

---

## v0.5.62.168 — 2026-09-01 (cycle 2688, review-code(heavy): mlb-shared.ts 미소비 status 필드 정리)

### refactor: buildMlbMissReport 미소비 status select 필드 제거

- 진단: 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred). gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 22/25, info-arch 9/30, lotto 29/30). 직전8 distinct=2(review-code(heavy) 7 + fix-incident(lite) 1) — 2-chain lock 조건 충족이나 잠긴 chain 중 하나가 fix-incident 라 안전 우선 규칙으로 lock 무시. cycle 2687 carry-over 추천대로 review-code(heavy) 계속 — `silent-drift-alert.ts`(440줄) 정독 우선.
- `silent-drift-alert.ts` 전체 정독 — 기존 주석(cycle 2276)이 이미 정확히 문서화한 `captureFactorAnomalyAlert` 미배선 상태 재확인, 신규 drift 없음(clean). `postview.ts`(588줄)/`buildTeamProfile.ts`(601줄)도 재확인, clean.
- `mlb-shared.ts` 정독 → `buildMlbMissReport()` 의 `mlb_schedule` select 가 `status` 컬럼을 가져오지만 서버측 `.eq("status","final")` 필터로만 쓰이고 JS 루프에서 재참조 없음 — 같은 파일의 `fetchMlbPredictionRowsInRange()` 가 공유하는 `MlbScheduleRangeRow` 타입은 `status` 를 실제로 쓰기(`hasFinalScore` 판정) 때문에 그대로 유지, `buildMlbMissReport` 전용 `MlbMissScheduleRow`(status 제외) 신설해 분리. kbo-live.ts/buildPicksStats.ts 등과 동일 미소비 select 필드 계열 8번째 변종.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + mlb-shared.test.ts 6 tests + moneyball 571 files/4483 tests 전체 green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 8db19c5f).

## v0.5.62.168 — 2026-09-01 (cycle 2687, review-code(heavy): fancy-stats.ts era/innings stub silent drift 수정)

### fix: 투수 스탯 merge era/innings stub 0 silent drift 수정

- 진단: 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred). gap trigger 4종 전부 미도달(fix-incident 4/20, op-analysis 21/25, info-arch 8/30, lotto 28/30). 직전8 distinct=3(2-chain lock 미충족). 직전20 chain 분포 review-code 계열 70%(14/20) dominance-positive streak 지속. skill-evolution 마커 부재. cycle 2686 carry-over 추천대로 review-code(heavy) 계속 — 미감사 대형파일(`fancy-stats.ts` 526줄, `silent-drift-alert.ts` 440줄) 정독.
- `fancy-stats.ts` 전체 정독 — `parsePitchersFromHtml()` 이 Fancy Stats HTML 에 era/innings 컬럼이 없어 항상 `era: 0, innings: 0` stub 반환. `fetchPitcherStats()` 의 merge 로직(name@team 키 dedup, Fancy Stats 먼저 push)이 KBO 공식 Basic1(실제 ERA/IP 보유)과 겹치는 투수여도 Fancy Stats stub 값을 그대로 채택 — kbo 배열은 이미 fetch 했음에도 버려짐. 파일 안 기존 xfip fallback / winPct=0.5 stub / totalWar=0 stub silent drift family 와 동일 패턴의 신규 인스턴스(era/innings 변종).
- 영향: `snapshot-pitchers.ts` 주간 cron 이 `pitcher_stats` 테이블에 상위(WAR>0, `_source='fancy-stats'`) 투수 다수를 era=0/innings=0 으로 저장 중이었음. 현재 다운스트림 소비자는 없음(factor-correlation 분석 재료 목적, 아직 미착수)이라 사용자 가시 영향 0건이나 향후 분석 시 corrupted 데이터로 이어질 silent trap.
- merge 로직을 `mergePitcherStats()` 순수 함수로 분리(export) + KBO 매칭 시 era/innings 를 실값으로 채우도록 수정, xFIP·WAR·K/9 등 Fancy Stats 고유값은 그대로 보존. 매칭 없으면 기존 stub 0 유지(KBO Basic1 도 top 28 한정이라 완전 보강 불가).
- 단위 테스트 3건 추가(매칭 시 채움/미매칭 시 stub 유지/KBO 전용 투수 추가) — `pnpm --filter @moneyball/kbo-data exec vitest run scrapers-fancy-stats.test.ts` 22 tests green.
- `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` + `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + kbo-data 92 files/1218 tests + moneyball 571 files/4483 tests 전체 green. 단일 논리 단위 → 직접 main commit+push(R4/R7, ff776db9).

## v0.5.62.168 — 2026-09-01 (cycle 2686, review-code(heavy): kbo-live.ts 미소비 필드 정리)

### refactor: KBO 라이브 스크래퍼 RawKboLiveGame 미소비 CANCEL_SC_NM 필드 제거

- 진단: 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred). gap trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 20/25, info-arch 7/30, lotto 27/30). 직전8 distinct=3(2-chain lock 미충족). explore-idea saturation(15/15) 재도달했으나 4-source 재확인 전부 negative(신규라우트 55건=git checkout mtime 부작용, TODOS Next-Up stale, GH issue 0, DESIGN.md 당일 갱신) → review-code(heavy) 재선택.
- 최고령 미터치 대형파일 순서대로 재검증: `backtest-wayback-run.ts`/`backtest-v3-run.ts`(둘 다 2026-05-04) 정독 — 둘 다 clean(모든 변수 실사용). `big-match.ts`/`personas.ts` 정독 — clean. `scrapers/kbo-live.ts`(2026-05-26, 237줄) 정독 → `RawKboLiveGame.CANCEL_SC_NM` 필드가 `fetchLiveGames()` 안 CANCEL_SC_ID 만으로 취소 판정하고 이 필드는 전혀 미참조 — cycle 2677/2678/2680/2681/2682/2684/2685 와 동일 죽은-select-필드 패턴의 스크래퍼 변종, 7번째 발견. 동명 필드가 있는 `kbo-official.ts` 쪽은 DB 저장(`cancel_sc_nm`)에 실사용 중이라 그대로 유지, kbo-live.ts 전용 interface 에서만 제거.
- `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` + `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 5576b1e0).

## v0.5.62.168 — 2026-09-01 (cycle 2685, review-code(heavy): backtest-logistic-run.ts 미소비 필드 정리)

### refactor: logistic 백테스트 CLI extractFeatures 미소비 games 필드 제거

- 진단: 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred). 2차 방어선(cycle 2684 retro commit 존재) OK. gap trigger 4종 전부 미도달(fix-incident 2/20, op-analysis 19/25, info-arch 6/30, lotto 26/30). 직전8 distinct=3(2-chain lock 미충족). explore-idea saturation(15/15) 도달했으나 4-source 재확인 전부 negative(plan#29 REST count 실측 user_picks=1/mlb_user_picks=0/pick_poll_events=5/mlb_pick_poll_events=0 — cycle 2417 이후 완전 무변화, GH issue 0, TODOS Next-Up 섹션 자체 소멸, 신규라우트 92건=git checkout mtime 부작용) → review-code(heavy) 재선택.
- 최고령 미터치 대형파일 재스캔 → `packages/kbo-data/src/pipeline/backtest-run.ts`(168줄, 2026-04-21, 리포 최고령) 정독했으나 clean(단일 CLI, dead field 없음). 동일 연령대 `backtest-logistic-run.ts`(2026-05-04) 후속 정독.
- `extractFeatures()` 반환 객체의 `games`(used 배열)가 train/test 어디서도 참조 안 됨(`X`/`y`/`features`만 실사용) — cycle 2677/2678/2680/2681/2682/2684 와 동일 computed-but-unconsumed 죽은 필드 패턴의 backtest CLI 변종, 6번째 발견. 자매 파일 `backtest-grid-run.ts`도 같은 이름의 `extractFeatures` 보유하나 그쪽은 `features`/`outcomes` 둘 다 실사용 확인(clean).
- `pnpm --filter moneyball exec tsc --noEmit` + `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화 — 수기 실행 CLI 스크립트라 테스트 커버리지 자체 없음). 단일 논리 단위 → 직접 main commit+push(R4/R7, 39a9eec3).

## v0.5.62.168 — 2026-09-01 (cycle 2684, review-code(heavy): picks-loader.ts 미소비 필드 정리)

### refactor: 로또 picks-loader 미소비 필드(avoidScore/generatedAt) 제거

- 진단: 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred). gap trigger 4종 전부 미도달(op-analysis 18/25, info-arch 5/30, lotto 25/30, fix-incident 방금 발화 gap=0). 직전8 distinct=3(2-chain lock 미충족). 직전20 chain 분포 review-code 계열 15/20(75%, dominance-positive streak 정합). cycle 2683 retro 추천대로 review-code(heavy) 복귀, 신규 후보 재탐색.
- 최고령 미터치 대형파일 재스캔(`git log -1 --date`, 150줄+ lib 파일) → `lib/lotto/picks-loader.ts`(166줄, 2026-06-29 이후 미터치, 최고령) 채택. lotto 영역은 review-code(heavy) 대상으로 처음 편입.
- 전체 정독 + 소비 라우트 4개(page.tsx/archive/[date]/page.tsx/opengraph-image.tsx/CopyAllButton.tsx) + 테스트 7개 파일 cross-check. `LottoSet.avoidScore`(markdown 표 6번째 컬럼 파싱)와 `LottoPicks.generatedAt`("생성 시각" 라인 파싱) 둘 다 계산은 되지만 어떤 소비자·테스트도 읽지 않음 — cycle 2677/2678/2680(DB select 필드) + 2681/2682(computed 필드)와 같은 죽은 필드 패턴의 markdown-parse 변종, 5번째 발견.
- 미소비 필드 2개 제거(interface + 파싱 로직). `idx`/`sum`/`oddEven`/`consecutive`는 실사용 확인 후 유지.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 2145b3ba).

## v0.5.62.168 — 2026-09-01 (cycle 2682, review-code(heavy): buildPitcherLeaderboard.ts 미사용 필드 정리)

### refactor: 투수 리더보드 predictions select 미사용 컬럼(confidence) 제거

- 진단: 개방 issue 0, approved plan 0/29(전부 completed/archived/deferred). gap trigger 4종 전부 미도달(fix-incident 19/20, op-analysis 16/25, info-arch 3/30, lotto 23/30). 직전8 distinct=3(2-chain lock 미충족). 직전20 chain 분포 review-code 계열 15/20(75%) dominance-positive streak 정합. GH Actions 최근 run 실패 0건(CI 정상). DESIGN.md 당일 갱신 — design-system trigger 미충족.
- 오래 미터치 대형 파일 스캔(`git log -1 --date`) 결과 `lib/players/buildPitcherLeaderboard.ts`(2026-05-18 이후 미터치, 최고령 후보) 채택. `app/search/page.tsx` (cycle 2680 carry-over 후보)는 전체 정독 결과 STATIC_PAGES 슬러그 47개 전부 실제 라우트 존재 확인 + SearchClient.tsx 필드(sub/meta/teamCode) 전부 소비 확인 — drift 0건, 이미 cycle 2620/2622 에서 정리됨.
- `buildPitcherLeaderboard.ts`: predictions select 절 + `Row` interface 에 `confidence` 존재하나 집계 loop 어디서도 참조 없음(`is_correct`/`predicted_winner` 만 실사용) — cycle 2677/2678/2680 과 동일 죽은-select-필드 패턴 4번째 발견.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 05629a18).

### refactor: 사용자 picks 통계 미소비 필드(agreedResolved/agreedCorrect/neutral) 제거

- 진단: 개방 issue 0, approved plan 0/29(전부 completed/archived/deferred). gap trigger 4종 전부 미도달(fix-incident 18/20, op-analysis 15/25, info-arch 2/30 — cycle 2679 직발화, lotto 22/30). 직전8 distinct=3(2-chain lock 미충족). 직전20 chain 분포 review-code 계열 14/20(70%) dominance-positive streak 정합. cycle 2680 next_rec 후보(`lib/picks/buildPicksStats.ts`, 2026-08-20 이후 미터치) 채택.
- 전체 정독 + 소비 컴포넌트 7개(UserVsAIScorecard/WeeklyPicksSummary/SharePicksButton/WeeklyHistorySection/FactorAgreementCard/MyPicksClient/PicksTrendChart) cross-check. `PicksStats.agreedResolved`/`agreedCorrect` 와 `FactorAgreementRow.neutral` 3개 필드가 계산은 되지만 어떤 소비자도 읽지 않고 단위 테스트에서만 assert됨 — 이전 3개 cycle(2677/2678/2680)의 죽은-DB-select-필드 패턴과 유사하나 이번은 computed 필드(로컬 집계값)라는 차이. `total` 필드는 factor 정렬 키로 실사용 중이라 유지.
- 미소비 필드 제거 + 관련 loop 단순화(else 분기/카운터 제거) + 테스트 assertion 정리.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 23fcf115).

## v0.5.62.168 — 2026-09-01 (cycle 2680, review-code(heavy): buildMlbTeamProfile.ts 미사용 select 필드 정리)

### refactor: MLB team profile predictions select 미사용 컬럼(prediction_type) 제거

- 진단: 개방 issue 0, approved plan 0/29(전부 completed/archived/deferred). gap trigger 4종 전부 미도달(fix-incident 17/20, op-analysis 14/25, info-arch 1/30 — cycle 2679 직발화, lotto 21/30). 직전8 distinct=4(2-chain lock 미충족). 직전20 chain 분포 review-code(heavy 포함) 14/20(70%) dominance-positive streak 정합. cycle 2677/2678 retro 가 공통 carry-over 로 지목한 `lib/mlb/buildMlbTeamProfile.ts`(384줄, 2026-08-24 이후 미터치) 채택.
- `prediction_type` 필드가 `predictions` select 절 + `PredRow` interface 에 존재하지만, 필터는 이미 `.eq('prediction_type', 'pre_game')` 로 서버측 적용 — 반환 데이터에서 `pred.prediction_type` 참조 0건(전체 파일 + 6개 소비자 cross-check). cycle 2677 `buildMissReport.ts`/cycle 2678 `buildMlbMatchupProfile.ts` 와 동일한 죽은-select-필드 패턴 3번째 발견. select 절 + interface 에서 제거.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화 — 동작 변경 없는 정리). 단일 논리 단위 → 직접 main commit+push(R4/R7, 25e105e8).

## v0.5.62.168 — 2026-09-01 (cycle 2678, review-code(heavy): buildMlbMatchupProfile.ts 미사용 select 필드 정리)

### refactor: MLB matchup profile predictions select 미사용 컬럼(prediction_type) 제거

- 진단: 개방 issue 0, approved plan 0/23. 4-source explore-idea saturation 재확인(13/15 충족했으나 4-source negative — plan#29 트리거 미변화/TODOS Next-Up stale/GH issue 0/신규라우트 92건 git checkout 부작용) 및 fix-incident lite check(gh run list 전부 success/skipped) negative — 다양성 전환 실패, review-code(heavy) dominance-positive streak 정합 재선택. carry-over 소진(cycle 2677) 이후 최종 커밋일 기준 재정렬 — 가장 오래 미터치(2026-08-14) 대형 파일 `lib/mlb/buildMlbMatchupProfile.ts`(526줄) 채택.
- 서브에이전트로 전체 정독 + 소비자(`mlb/matchup/[teamA]/[teamB]`/`en/mlb/matchup/[teamA]/[teamB]`) + KBO sibling(`lib/matchup/buildMatchupProfile.ts`) 교차검증. `CURRENT_SCORING_RULE`/`MLB_PRODUCTION_COHORT_RULES` 참조 정상, KST/UTC 날짜 처리 없음(gameDate DATE 컬럼), confidence 0.5~1 스케일 정상(cycle 2160 이중변환 버그 재발 없음) — 전부 clean.
- 유일한 실제 발견: `PredRow` 인터페이스의 `prediction_type` 필드가 select 되지만(서버 필터는 이미 `.eq()` 로 별도 적용) 함수 어디서도 읽히지 않는 죽은 컬럼 — cycle 2677 buildMissReport.ts 와 동일한 죽은-select-필드 패턴. select 절 + interface 에서 제거. sibling `buildMlbTeamProfile.ts` 에도 동일 패턴 잔존 확인(이번 스코프 밖, 다음 cycle 후보로 carry-over).
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화 — 동작 변경 없는 정리). 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.168 — 2026-09-01 (cycle 2677, review-code(heavy): buildMissReport.ts 미사용 select 필드 정리)

### refactor: buildMissReport pre_game select 미사용 컬럼(confidence/predicted_winner) 제거

- 진단: 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 14/20, op-analysis 11/25, info-arch 29/30, lotto 18/30), 직전8 distinct=4(2-chain lock 미충족). cycle 2674/2675/2676 retro 공통 추천(review-code(heavy) 계속) + carry-over 후보 `lib/reviews/buildMissReport.ts`(216줄)/`app/reviews/misses/page.tsx`(249줄) 채택.
- 전체 정독 + `MissesSortControl`/OG·twitter 이미지/관련 테스트(`silent-drift.test.ts`/`silent-drift-wave-296/239`) 교차검증 — `game_date` 는 DATE 컬럼(UTC-slice 이슈 대상 아님), `CURRENT_MODEL_FILTER` 사용은 기존 확립된 "현재 모델 스냅샷" 관례(cycle 2673) 정합, revalidate=1800 은 이미 wave-133/175 가드 존재. CE-fallback(`debate_version IS NULL`) 예측이 `reasoning.debate.verdict.homeWinProb` 부재로 tossup 오분류돼 미스 리포트에서 누락되는지 서브에이전트로 정밀 검증했으나 — `debate.ts` judge 실패 시에도 verdict fallback 객체가 quant `homeWinProb` 를 그대로 채워 넣어(구조상 항상 존재) 실제로는 non-issue 확인.
- 유일한 실제 발견: `PreGameRow`(`confidence`/`predicted_winner`) 두 필드가 select 되지만 함수 어디서도 참조되지 않는 죽은 컬럼(불필요한 payload). select 절 + interface 에서 제거.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화 — 동작 변경 없는 정리라 기존 테스트 그대로 통과). 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.168 — 2026-09-01 (cycle 2676, review-code(heavy): players/page.tsx lastSynced UTC-slice-as-KST 정정)

### fix: 선수 리더보드 "최종 동기화" 날짜 UTC 슬라이스 → KST 변환

- 진단: 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 13/20, op-analysis 10/25, info-arch 28/30, lotto 17/30), 직전8 distinct=3(review-code(heavy)×6 + explore-idea×1 + polish-ui×1, 2-chain lock 미충족). 직전 20 사이클 chain 분포 전부 ≥1회(cycle49 0회 룰 미충족). cycle 2674/2675 retro 공통 추천 미감사 후보(`app/players/page.tsx`/`lib/reviews/buildMissReport.ts`/`app/reviews/misses/page.tsx`) 중 최대 규모 `players/page.tsx`(315줄, 2026-07-14 이후 미터치) 채택.
- 서브에이전트로 전체 정독 + `buildPitcherLeaderboard.ts`/`buildBatterLeaderboard.ts`/`config/model.ts`/`buildSeasonSummary.ts` 교차검증. scoring_rule 필터·KST 시즌 연도 계산은 이미 이전 wave(656/cycle 2647)에서 정정 완료된 상태 확인(clean). 실제 drift 1건: `page.tsx:247` 이 `batters[0].lastSynced`(UTC ISO, `sync-batter-stats.ts` 가 `new Date().toISOString()` 로 기록)를 `slice(0,10)` 으로 그대로 잘라 KST 날짜인 것처럼 표시 — 자동 cron(`'17 0-14 * * *'` UTC = KST 09:17~23:17)은 날짜 경계를 안 넘어 현재는 무해하지만, 무제한 `workflow_dispatch` 수동 실행이 UTC 15:00~23:59(KST 00:00~08:59 다음날)에 발생하면 하루 앞선 날짜가 그대로 노출되는 잠재 버그(compareModels.ts 계열과 동일 UTC-slice-as-KST 패턴).
- `@moneyball/shared` 의 `toKSTDateString()` 으로 교체(신규 유틸 추가 없이 기존 함수 재사용). `players-page.test.ts` 에 소스 grep 회귀 가드 추가(slice(0,10) 패턴 부재 + toKSTDateString 사용 확인).
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(+1). 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.168 — 2026-09-01 (cycle 2675, polish-ui: MLB OG/twitter gradient family drift 3건 정리)

### fix: mlb/team + players + factors OG/twitter 이미지 gradient 토큰 불일치 3건

- 진단: 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 11/20, op-analysis 9/25, info-arch 27/30, lotto 16/30). 직전8 사이클 distinct=2(review-code×7 + explore-idea×1) → **2-chain alternation lock 발동**(SKILL.md cycle 225 룰) — review-code/explore-idea 후보 제외, 다른 trigger 없어 규칙대로 polish-ui 강제 발화.
- 서브에이전트로 DESIGN.md 토큰 체계 + Decisions Log 20건 전체 대조 후 OG/twitter gradient family 재감사(과거 wave-144 가 만든 8종 레지스트리 커버리지 재확인). 실제 drift 3건: (1) `mlb/team/{opengraph,twitter}-image.tsx` 가 `MLB_GRADIENT_TEAM_SKY_135`(en 미러 + `mlb/games/[date]` 가 이미 사용) 대신 다른 블루 리터럴 하드코딩. (2) "선수" OG 패밀리가 동일 role 인데 3갈래 색(KO 보라 / EN 초록 / KO 상세페이지 리터럴 금갈색)로 흩어짐. (3) `mlb/factors` vs `en/mlb/factors` gradient 시작색 1-hex 오탈자(`#1a0f0a` vs `#1a0f00`).
- (1)(3) 은 토큰/원본값으로 정렬. (2) 는 GREEN 토큰(이미 2/4 곳 사용 중)으로 통일, VIOLET 토큰은 사용처 소진돼 `design-tokens.ts` 에서 제거(9→8종 레지스트리). `silent-drift-wave-144.test.ts` 그룹 파일 목록 갱신(TEAM_SKY +2, PLAYERS_GREEN +3, VIOLET 그룹 삭제).
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4482 tests green(+6). DESIGN.md Decisions Log 갱신. 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.168 — 2026-09-01 (cycle 2674, review-code(heavy): compareModels.ts KST 자정 경계 + 하드코딩 'v1.8' 정정)

### fix: dailyByModel KST 미보정 날짜 버킷 + /debug/model-comparison 하드코딩 버전 라벨

- 진단: 개방 issue 0, approved plan 0/23(전부 completed/archived, status: approved 없음), gap trigger 4종 전부 미도달(fix-incident 11/20, op-analysis 8/25, info-arch 26/30, lotto 15/30), 직전8 distinct=3(review-code+operational-analysis+explore-idea, 2-chain lock 미충족). cycle 2673 에서 미감사 컴포넌트 소진 확인 → 신규 대형 파일 재탐색. 최종 커밋일 기준 정렬 결과 `lib/dashboard/compareModels.ts`(299줄, 2026-07-16 이후 미터치) 채택.
- 서브에이전트 전체 정독 감사 + 3개 소비자(`debug/model-comparison/page.tsx`, `CalibrationPlot.tsx`, `buildShadowCalibration.ts`) 교차검증. 실제 drift 2건: (1) `dailyByModel`(compareModels.ts:272)이 `created_at`(UTC 저장)을 `KST_OFFSET_MS` 보정 없이 `slice(0,10)` 으로 날짜 버킷 — `buildAccuracyData.ts`/`buildPicksStats.ts`/`monthGrid.ts` 등 기존 관례와 불일치하던 잔여 케이스, KST 자정 경계(UTC 15~24시) row 가 하루 앞선 날짜로 잘못 집계됨. (2) `/debug/model-comparison` 헤더 문구가 `CURRENT_SCORING_RULE` 대신 리터럴 `'v1.8'` 하드코딩 — cycle 2672 FactorAccuracyTable.tsx 와 동일 버그 클래스, 오늘은 우연히 값이 맞았지만 다음 버전 bump 시 silent stale 확정.
- `dailyByModel` KST 보정 추가 + consumer 14일 cutoff 도 동일 보정. 헤더 문구 `CURRENT_SCORING_RULE` 리터럴 교체. 기존 `silent-drift-wave-251.test.ts` 가 하드코딩 리터럴을 그대로 assert하던 걸 갱신 + 재발 방지 assertion 추가, `compareModels.test.ts` dailyByModel 테스트에 KST 경계 케이스 명시.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4476 tests green(+1). 단일 논리 단위 → 직접 main commit+push(R4/R7, 75864b42).

## v0.5.62.168 — 2026-09-01 (cycle 2672, review-code(heavy): FactorAccuracyTable.tsx 하드코딩 버전 라벨 정정)

### fix: KBO footer 문구가 CURRENT_SCORING_RULE 대신 리터럴 'v1.8' 하드코딩

- 진단: 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 6/25, info-arch 24/30, lotto 13/30), 직전8 distinct=3(2-chain lock 미충족). cycle 2668/2670/2671 retro 공통 추천 미감사 컴포넌트 중 `FactorAccuracyTable.tsx`(170줄) 채택 — `TeamMatchupCards`는 실측 결과 기존 테스트 존재해 제외.
- 서브에이전트 전체 정독 감사 — KBO footer 문구가 "(v1.8 cohort n=...)" 로 `CURRENT_SCORING_RULE` 값을 리터럴 하드코딩. `BrierTrendChart.tsx`(silent drift wave-260, cycle 1566)에서 이미 한 번 고친 동일 버그 클래스이자 `config/model.ts` "버전 전환 시 체크리스트"가 명시 경고하는 재발 패턴. 오늘은 우연히 `CURRENT_SCORING_RULE==='v1.8'`이라 값이 맞았지만 다음 버전 bump 시 silent stale 확정이었음.
- `CURRENT_SCORING_RULE` import + 리터럴 교체. 기존 `silent-drift-wave-663.test.ts` import 정규식을 sibling import 허용하도록 완화 + 신규 회귀 가드(`silent-drift-cycle-2672.test.ts`).
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4475 tests green(+2). 단일 논리 단위 → 직접 main commit+push(R4/R7, 17fbd6fa).

## v0.5.62.168 — 2026-09-01 (cycle 2671, review-code(heavy): MlbAccuracyDashboard.tsx stale MVP-scope 헤더 주석 정정)

### fix: 헤더 주석이 이미 구현된 6개 섹션을 "후속 wave 후보"로 8개월째 잘못 서술

- 진단: 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달, 직전8 distinct=5(2-chain lock 미충족). cycle 2668/2670 retro 공통 추천 미감사 컴포넌트 중 최대 규모 `MlbAccuracyDashboard.tsx`(401줄) 채택.
- 서브에이전트 전체 정독 감사 — wave-626(2026-08-14) 최초 커밋 헤더 주석("rolling accuracy/brier trend/요일별 등 후속 wave 후보로 남김")이 이후 6개 커밋(winner-prob bucket/rolling accuracy/brier trend/scoring_rule day·week heatmap/cohort 비교/team table)으로 전부 구현·렌더링된 뒤에도 갱신 안 돼 파일 본문과 정반대 서술 상태였음. scoring_rule heatmap MLB 'all'-only 동작은 cycle 2189/2193 기존 검증된 의도 동작이라 별도 버그 아님.
- 헤더 주석만 정정, 로직 변경 없음. `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 570 files/4473 tests green. 단일 논리 단위 → 직접 main commit+push(R4/R7, 343cc066).

## v0.5.62.168 — 2026-09-01 (cycle 2670, review-code(heavy): scoring_rule cohort 비교 함수 3개 구조적 죽음 fix)

### fix: buildScoringRuleDayHeatmap/WeekHeatmap/buildBrierTrend 가 v1.8-only rows 받아 era cohort 비교 불가

- 진단: 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 7/20, op-analysis 4/25, info-arch 22/30, lotto 11/30), 직전8 distinct=4(2-chain lock 미충족). cycle 2668/2669 retro 가 명시 추천한 review-code(heavy) 컴포넌트급 미감사 후보(buildAccuracyData.ts 776줄) 채택.
- 서브에이전트 전체 정독 감사 — `buildScoringRuleDayHeatmap`/`buildScoringRuleWeekHeatmap`(SCORING_RULE_HEATMAP_ROWS = 'all'+PRODUCTION_ERA_HISTORY+'v1.8-credit-fail' 다중 era 전제 설계) + `buildBrierTrend`(BrierTrendChart 의 SR_COLOR_MAP 이 v1.5/v1.6/v1.7-revert 색상까지 정의) 세 함수 모두 page.tsx 호출부에서 `CURRENT_MODEL_FILTER`(scoring_rule='v1.8')로 걸러진 `rows` 를 받아왔음 — v1.8 외 scoring_rule 이 입력에 전혀 없어 다른 era cohort 는 영구히 n=0, cohort 비교 기능 자체가 구조적으로 죽어있었음. `buildVersionHistory` 가 동일 문제를 이미 겪고 `versionHistoryRows`(unfiltered)로 교체된 전례(page.tsx:277 주석, review-code heavy 이전 감사)가 있었으나 이 세 함수엔 적용되지 않은 잔여 케이스.
- page.tsx 세 호출부를 `versionHistoryRows` 로 교체(코드 로직 자체 변경 없음, 데이터 소스만 교체). 회귀 가드 테스트(`silent-drift-cycle-2670.test.ts`) 신규.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 570 files/4473 tests green. 단일 논리 단위 → 직접 main commit+push(R4/R7, 81d1d4c3).

## v0.5.62.168 — 2026-08-26 (cycle 2653, review-code(heavy): 일반 LLM 재시도 경로 off-by-one — cycle 2634 carry-over)

### fix: 일반 5xx/네트워크 재시도 경로도 마지막 backoff 값이 실제 sleep 에 안 쓰임 (529 경로와 동일 패턴)

- 진단: open issue 0, approved plan 0/23(전부 completed/archived). gap trigger 4종 전부 미도달(fix-incident 8/20, op-analysis 16/25, info-arch 5/30, lotto 25/30). 직전8 distinct=5 — 2-chain lock 미충족. lotto/polish-ui 둘 다 당장 실행 가치 부재(lotto: 8/29 픽 이미 shipped + 데이터 3일 이내 신선, polish-ui: text-[Npx] sprawl 13건 잔존 = 전부 테스트/globals.css 정의부만이라 실질 소진). cycle 2634 retro 가 명시 추천한 "일반 경로(MAX_ATTEMPTS)/llm-deepseek.ts/llm-ollama.ts 동일 off-by-one 존재 여부 확인" carry-over 채택 — 19 사이클 미처리 확인.
- `llm.ts`(Claude) + `llm-deepseek.ts` 양쪽 `MAX_ATTEMPTS = LLM_RETRY_BACKOFF_MS.length`(3) 이 cycle 2634 에서 529 경로에 고쳤던 것과 동일한 off-by-one — `attempt < maxAttempts - 1` 일 때만 sleep 하므로 마지막 backoff(2000ms) 가 한 번도 실제 대기에 쓰이지 못하고 3번째 시도에서 즉시 실패 반환. 파일 최상단 주석("500ms → 1000ms → 2000ms")과 `packages/shared/src/index.ts` 의 LLM_RETRY_BACKOFF_MS 문서화 주석도 3개 backoff 전량 사용을 전제로 서술돼 있었음(실제 2개만 사용). `llm-ollama.ts` 는 LLM_RETRY_BACKOFF_MS 미사용(재시도 로직 없음) — 스코프 제외.
- 양쪽 `MAX_ATTEMPTS = LLM_RETRY_BACKOFF_MS.length + 1`(3→4) 로 fencepost 정정. `llm.ts`/`index.ts` 주석 갱신. `agents-llm.test.ts` 에 회귀 가드 신규(setTimeout spy 로 일반 5xx 경로 backoff 합 500+1000+2000=3500ms 전량 소비 직접 검증 — 향후 다시 `.length` 로 되돌리면 즉시 탐지).
- `pnpm --filter kbo-data exec tsc --noEmit` + `--filter shared` + `--filter moneyball` clean. vitest kbo-data 92 files/1215 tests(+16, 신규 1) green + lint clean. 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.167 — 2026-08-26 (cycle 2650, review-code(heavy): mlb-pipeline.ts 헤더 docstring stale 정정)

### fix: mlb-pipeline.ts 모듈 헤더 주석이 8-mode 구조/테이블명과 불일치

- 진단: open issue 0, approved plan 0/29. gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 13/25, info-arch 2/30, lotto 22/30). 직전8 distinct=5 — 2-chain lock 미충족. explore-idea saturation 13/15 충족되나 cycle 2647/2649 에서 이미 동일 후보(carry-over 부재) 확인돼 재검토 skip. CI green, `gh run list` scheduled workflow 실패 0건 — fix-incident 후보 부재. review-code(heavy) dominance-positive channel 계속 채택 (cycle 2649 추천).
- validator.ts(1015줄) + mlb-pipeline.ts(875줄) 서브에이전트 전체 정독 감사 — validator.ts 는 clean(신규 발견 0). mlb-pipeline.ts 헤더 docstring(1~14행) 이 "Plan C Task 2 — MLB 7 mode" 라 적혀있지만 실제 `MlbPipelineMode`/`MLB_MODES` 는 8 mode(`mlb_elo_update` 누락, plan #25 Phase 2 cycle 2082 추가분 미반영). 또 `mlb_shadow_train`/`mlb_walk_forward_measure` 주석이 "walk_forward_brier insert" 라 적혀있지만 실제 insert 대상은 migration 049 로 교체된 `mlb_shadow_train_log`/`mlb_walk_forward_log`(구 테이블 스키마 불일치로 100% silent insert 실패 이력 — 파일 내부 564~648행 인라인 주석엔 이미 반영됐으나 파일 최상단 요약만 stale 유지).
- 헤더 주석 정정(코드/동작 변경 없음, docstring only) — mode 수 7→8, `mlb_elo_update` 라인 추가, 테이블명 2곳 정정.
- `pnpm --filter kbo-data exec tsc --noEmit` clean. 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.166 — 2026-08-26 (cycle 2647, review-code(heavy): KST_OFFSET_MS family — buildBatterLeaderboard/sitemap 잔여 getFullYear() off-by-one 정정)

### fix: 서버 로컬(UTC) `getFullYear()` 사용처 2건에 KST 연도 경계 off-by-one 잔존

- 진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 전부 미도달(fix-incident 2/20, op-analysis 10/25, info-arch 29/30, lotto 19/30). 직전 8사이클 distinct=3(review-code(heavy)/polish-ui/fix-incident) — 2-chain lock 미충족. explore-idea saturation 13/15 충족되나 서브에이전트로 검증한 유일 carry-over 후보(TODOS "MLB game detail 모델 메타 정보 배지 이식")가 이미 cycle 2424/2472 에 KO+EN 양쪽 ship 완료된 stale 후속으로 확인 — explore-idea 재선정 폐기.
- cycle 2514(review-code heavy) 가 KST_OFFSET_MS family(서버 로컬 `new Date().getFullYear()` 가 UTC 기준이라 KST 12/31 15:00~23:59 UTC 구간에 연도가 하루 어긋남)를 최초 발견하고 `buildSeasonSummary.ts`/`seasons/[year]/page.tsx` 를 고치며 `computeCurrentKSTYear()` 헬퍼 신설, 잔여 사용처(`seasons/page.tsx`/`not-found.tsx`/`buildMlbTeamProfile.ts`/`buildBatterLeaderboard.ts`/`sitemap.ts`)를 다음 review-code 후보로 carry-over. 재확인 결과 앞 3개는 이미 후속 사이클에서 정정됐으나(`computeCurrentKSTYear` import 확인) `buildBatterLeaderboard.ts:45`(`batter_stats.season` 쿼리 필터, 실사용 — 호출부 `players/page.tsx` 가 season 미지정) 와 `sitemap.ts:121`(연도별 시즌 URL priority 티어링)은 여전히 raw `getFullYear()` 미정정 상태로 잔존.
- 둘 다 기존 `computeCurrentKSTYear()`(`lib/seasons/buildSeasonSummary.ts`) import 재사용으로 정정 — 신규 로직 없음. 회귀 테스트 `players/__tests__/silent-drift.test.ts` 에 KST 연도 경계(UTC 2026-12-31T15:00:00Z → KST 2027) fake timer 케이스 추가.
- `pnpm --filter moneyball exec tsc --noEmit` clean + vitest 569 files/4470 tests green + lint clean. 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.165 — 2026-08-26 (cycle 2646, review-code(heavy): llm.ts 529 확장 attempts 주석 stale 수치 정정)

### fix: 529 Overloaded 재시도 확장 주석의 attempts 수치가 cycle 2634 fix 이후 stale

- 진단: 직전 8사이클 distinct=4(review-code/review-code(heavy)/polish-ui/fix-incident) — 2-chain lock 미충족. open issue 0, approved plan 0/23. review-code(heavy) 최근 5연속(2639~2643) SUCCESS streak — dominance-positive 인정 룰 따라 계속 채택. 첫 타겟(game/[id]/page.tsx, 877줄)은 서브에이전트 정독 감사 결과 이미 cycle 2407/2408·2542 에 감사되어 clean(신규 발견 없음) — TODOS 히스토리 재확인 후 cycle 2634 가 명시적으로 남긴 미처리 후속(`llm.ts` MAX_ATTEMPTS 일반경로/`llm-deepseek.ts`/`llm-ollama.ts` 동일 off-by-one 존재 여부 확인, "1순위 후보")으로 전환.
- 확인 결과: 일반 경로 `MAX_ATTEMPTS = LLM_RETRY_BACKOFF_MS.length`(3, 확장 없음)는 `llm.ts:236` 자체 주석("일반 5xx/네트워크 에러는 3 유지")과 `packages/shared/src/index.ts:1632`("Array length(=3)가 MAX_ATTEMPTS 도출 — derived .length 패턴 그대로 유지") 양쪽에서 의도된 설계로 명시 — evidence-backed 신뢰성 이슈 부재 상태에서 수치 변경은 `feedback_data_only_claims` 원칙 위반이라 범위 제외. `llm-deepseek.ts` 도 동일 패턴(MAX_ATTEMPTS=length, 529 특수 확장 로직 자체가 없음) — 동일하게 의도된 설계, 수정 불필요. `llm-ollama.ts` 는 재시도 로직 자체 부재.
- 대신 진짜 drift 1건 발견: `llm.ts:236` 주석이 "529 발생 시 maxAttempts 동적 확장 (3 → 4)" 라고 적혀 있지만, cycle 2634 fix 로 `MAX_OVERLOADED_ATTEMPTS = OVERLOADED_BACKOFF_MS.length + 1`(4→5)로 이미 바뀐 뒤라 실제 확장값은 5 — 코드 옆 인라인 주석이 자기 파일 안 상수 정의(24~25행)와 불일치하던 stale 수치. "(3 → 5, cycle 2634 fix)"로 정정. 동작 변경 없음, 주석 전용 fix.
- `pnpm --filter kbo-data exec tsc --noEmit` clean + `agents-llm.test.ts` 29 tests green. 단일 논리 단위 → 직접 main commit+push(R4/R7).





### fix: MLB scrape mode total fetch 실패 (gamesFound=0) 시 silent drift alert 미발화 gap

- 진단: fix-incident 마지막 발화(cycle 2615) 이후 gap 30/20 — 장기 미발화 주기 보정 trigger 충족. `pipeline_runs` 최근 7일 error rate 직접 조회 — `mlb_fancy_scrape` mode 가 2026-08-19~21 3일 연속 `fetchFangraphsMlbTeams: fangraphs HTTP 403` 에러(games_found=0, predictions=0), 08-22부터 4일 연속 자동 self-recovery.
- 서브에이전트 조사 — 근본 원인은 이미 commit 1936f6a4(cycle 2278, User-Agent 헤더 추가)로 해결된 이슈의 잔여 tail이라 재발 코드 fix 불필요. 대신 조사 중 진짜 gap 발견: `silent-drift-alert.ts`의 `shouldAlertSilentDrift`가 최상단에서 `gamesFound<=0 → return false` 조기 리턴 — MLB scrape mode가 fetch 자체에서 throw해 `gamesFound:0 + errors:[...]`로 리턴하는 total 실패 케이스가 이 조기 리턴에 걸려 alert 대상에서 완전히 빠짐. 실제 발화 채널은 `fetchLeaderRows` 내부 저심각도 Sentry warning뿐 — Telegram 사용자 가시 채널 부재로, 3일 연속 실패가 DB 밖에서는 안 보이던 상태.
- "경기 없는 정상 날"(teams.length===0, errors=[]) 과는 `errors.length>0` 조건으로 구분 — 정상 0건 날은 영향 없음. `MLB_SCRAPE_MODES.has(mode) && gamesFound===0 && errors.length>0 → alert` 분기 추가. 테스트 5건 신규(`mlb_fancy_scrape`/`mlb_statsapi_scrape` total 실패 alert, 정상 빈 응답 미발화, 기존 rowsInserted=0 분기 보존, non-scrape mode 범위 한정 확인).
- `pnpm --filter kbo-data exec tsc --noEmit` clean + vitest 92 files/1214 tests(+15) green + lint clean. 단일 논리 단위 → 직접 main commit+push(R4/R7).



## v0.5.62.163 — 2026-08-26 (cycle 2644, polish-ui: accuracy 요일별 페이지 일요일 상한 배지 미토큰화 text-[8px] 정정)

### fix: 요일별 적중률 "일요일 상한" 배지 폰트크기 DESIGN.md 타이포 스케일 미토큰화

- 진단: 2-chain lock 탐지(직전 8 사이클 = review-code(heavy) + operational-analysis(lite) 2종만, distinct=2) → 두 chain 후보 제외. fix-incident(CI 전부 green, open issue 0) / info-arch(gap 26/30 미도달) / lotto(gap 16/30, 다음 회차 8/29 picks 이미 박제됨) / explore-idea(최근 2사이클 내 lite 2회 발화) 모두 강한 trigger 부재 → lock 룰 3번 "trigger 없으면 polish-ui 강제 발화" 적용.
- DESIGN.md 타이포 스케일 grep(`text-\[[0-9]*px\]` 전역) — `accuracy/page.tsx:758` "일요일 상한 X%" 배지 1곳만 유일한 미토큰 arbitrary px 값(`text-[8px]`) 발견. DESIGN.md 최소 토큰 3xs(9px)="초미니 배지/타임스탬프" 정의와 역할 정확히 일치(같은 컴포넌트 안 형제 요소 `text-2xs`/`text-3xs` 이미 사용 중) — cycle 2599 (`text-[11px]` 46건 → 2xs 흡수) 와 동일 패턴의 미탐색 잔여 1건.
- `text-[8px]` → `text-3xs`(9px) 정렬. 1px 시각 차이 무의미, 토큰 일관성 확보.
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm lint` clean. 단일 논리 단위 → 직접 main commit+push(R4/R7).



### fix: daily.ts CREDIT_EXHAUSTED alert 블록 — "1회만 발화" 주석과 달리 실제 dedup 장치 부재

- 진단: open issue 0, approved plan 0/23. 직전8 distinct=5 — 2-chain lock 미충족. gap trigger 전부 미도달(fix-incident 5/20, op-analysis 3/25, info-arch 22/30, lotto 12/30). breadcrumb 미커버 grep 2건(`/community`, `/en/mlb/reviews/monthly`) 발견했으나 확인 결과 둘 다 placeholder(noindex)/순수 redirect 라우트라 breadcrumb 무관 — false positive. 직전 2사이클 retro 가 명시 추천한 미탐색 대형 파일 `packages/kbo-data/src/pipeline/daily.ts`(1622줄, injection-validation 스윕 미대상) 서브에이전트 정독 감사.
- `finish()` 안 CREDIT_EXHAUSTED alert 블록 주석이 "predict/predict_final mode 에서 1회만 발화 (최초 발화 cron 에서만)" 이라 주장하지만 실제론 dedup 로직 전무 — `captureCreditExhaustedAlert`(`silent-drift-alert.ts`) 자체도 무조건 `Sentry.captureMessage` + `notifyError`(Telegram) 호출. predict mode 는 10-21시 매시(최대 12회/일) 재실행되고 CREDIT_EXHAUSTED 는 2026-06-06 부터 지속 상태(CLAUDE.md 박제)라, 해당 기간 매 predict 실행마다 CREDIT_EXHAUSTED 에러가 있으면 중복 Telegram/Sentry 알림 발송 가능한 구조였음 — announce_sent/results_sent/summary_sent 는 이미 `daily_notifications` idempotent flag 로 dedup 되는데 이 블록만 누락(같은 파일 안 comment/code mismatch, silent-drift family).
- 수정: migration 052 (`daily_notifications.credit_exhausted_sent` BOOLEAN + `_at` TIMESTAMPTZ) 추가 + `NotificationFlag` 유니온에 `'credit_exhausted_sent'` 추가 + CREDIT_EXHAUSTED 블록을 기존 `isNotificationSent`/`markNotificationFlag` 패턴으로 wiring(alert 발송 전 flag 체크, 발송 후 flag 마킹). 같은 날 반복 predict 실행 시 최초 1회만 발화하도록 실제 코드가 주석 주장과 일치하게 정정.
- `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` + `pnpm --filter moneyball exec tsc --noEmit` clean + `@moneyball/kbo-data` vitest 92 files/1209 tests green + `pnpm lint` clean. migration 052 `supabase db push --linked` 적용 완료. version 161→162 3-way sync(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).

다음 사이클 추천 = review-code(heavy) 계속 시 `analysis/page.tsx`(2833줄) 미탐색 축 / 다양성 전환 시 polish-ui·info-architecture-review(3사이클+ 연속 negative, 신규 trigger 없으면 재확인 스킵 검토) 또는 op-analysis(gap 4/25).



### fix: HOME_ELO_BONUS JSDoc 이 같은 블록 안 자체 도출과 다른 값을 인라인 주장하던 계산 오기 수정

- 진단: open issue 0, approved plan 0/23. 직전8 distinct=5(review-code 계열 5 + operational-analysis 1 + fix-incident(lite) 1 + explore-idea 1) — 2-chain lock 미충족. 직전15 saturation(review-code+fix-incident+polish-ui+info-arch) 10/15 — 임계 미달. gap trigger 전부 미도달(fix-incident 4/20, op-analysis 2/25, info-arch 21/30, lotto 11/30). DESIGN.md 당일 갱신(polish-ui negative) + breadcrumb 미커버 18건 동일(cycle 2632 대비 변화 없음, info-arch negative). injection-validation family(team/judge/postview×2/calibration) 5곳 전부 소진(cycle 2638) — 직전 2사이클 retro 가 명시 추천한 신규 axis(미탐색 대형 파일) 채택, `packages/shared/src/index.ts`(3448줄, injection-validation 스윕 대상 아니었던 상수 monolith) 서브에이전트 정독 감사.
- `HOME_ELO_BONUS` JSDoc(596~618줄 부근) 안 인라인 주장 "x ≈ 11.85 Elo point" 가 5줄 아래 같은 블록의 "자세한 도출" 단계별 계산 결과 "x ≈ 10.43 Elo point" 와 불일치 — 동일 방정식(`1/(1+10^(-x/400))=0.515`)을 두 번 풀어 서로 다른 답을 인라인·상세 도출에 각각 적어둔 자기모순. 직접 재계산(`1/0.515≈1.9417 → log10(0.9417)≈-0.02609 → x=10.43`)으로 상세 도출이 맞고 인라인 값이 오기임을 확인. 인접 문장의 "홈팀 +1.5pp ≈ 0.024 prob shift" 도 별도로 아래 정의된 `HOME_ELO_BONUS_WIN_PROB_PCT=3.4`(24 Elo → +3.4pp, 코드/테스트로 이미 고정됨)와 불일치 — 0.024 는 0.034 오기.
- 수정: 주석 텍스트만 정정(인라인 11.85→10.43, +12 Elo point→+10.43 Elo point, 0.024 prob shift→`HOME_ELO_BONUS_WIN_PROB_PCT` 참조 +3.4pp 로 명시). `HOME_ELO_BONUS=24`/`HOME_ELO_BONUS_WIN_PROB_PCT=3.4` 실제 상수값과 이를 고정하는 기존 테스트(`index.test.ts` silent drift wave 272 가드, `backtest-v2-helpers.test.ts`, `mlb-base.test.ts`)는 전부 이미 정확 — 코드 동작 변경 없음, 주석 전용 fix.
- `pnpm --filter shared exec tsc --noEmit` clean + `@moneyball/kbo-data` vitest 92 files/1209 tests green + `pnpm lint` clean. version 160→161 3-way sync(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).

다음 사이클 추천 = review-code(heavy) 계속 시 `analysis/page.tsx`(2833줄) 또는 `daily.ts`(1622줄) 미탐색 축 / 다양성 전환 시 polish-ui·info-architecture-review 는 3사이클 연속 negative 확인(신규 trigger 없으면 재확인 스킵 검토) — op-analysis(gap 2/25) 또는 dimension-cycle 도 고려.



### fix: calibration-agent 의 recentBias/teamSpecific/modelWeakness — team/judge-agent 와 달리 검증 없이 그대로 사용자 노출되던 gap 수정

- 진단: open issue 0, approved plan 0/23. 직전8 distinct=4(lotto/review-code/explore-idea/fix-incident) — 2-chain lock 미충족. gap trigger 전부 미도달(fix-incident 21/20 이미 전 사이클 점검 완료, op-analysis 10/25, info-arch 18/30, lotto 8/30). 직전 retro 가 명시 추천한 `retro.ts`/`llm.ts` 전문 재확인 — 양쪽 모두 이미 견고(retro.ts 는 assertSelectOk/assertWriteOk 로 silent fail 차단 완료, llm.ts 는 cycle 2634 off-by-one fix 이후 정상). 인접 파일 확인 중 `calibration-agent.ts` 가 team-agent(`validateTeamArgument`)/judge-agent(`validateJudgeReasoning`) 와 달리 validator 호출이 전혀 없는 gap 발견.
- `CalibrationHint.recentBias`/`teamSpecific`/`modelWeakness` 는 `/analysis/game/[id]` 페이지와 `DebateTimeline` 컴포넌트에 그대로 렌더링되는 사용자 가시 자유 텍스트인데, LLM 이 실제 주입받은 `PredictionHistory` 수치(총 예측/적중/팀별 적중률)와 다른 숫자를 지어내도 아무 검증 없이 그대로 저장·노출됨 — team/judge-agent 3곳에 이미 존재하는 injection-validation family (cycle 2630~2632) 와 동일 계열의 미커버 4번째 지점.
- 수정: `validator.ts`에 `validateCalibrationHint(outputText, injectionText, mode)` 신규 export — `checkHallucinatedNumbers`+`checkBannedPhrases` 재사용(GameContext/로스터 없어 `checkInventedPlayerNames`/`checkClaimTypes` 는 validateJudgeReasoning 과 동일 근거로 skip). `ValidationMeta.agent`/`ValidatorAgent` 유니온에 `'calibration'` 추가. `calibration-agent.ts`에 `buildStatsBlock()` 분리(`buildUserMessage`의 `[모델 성과 요약]` 이하 수치 섹션만) — injectionText 로 이 블록만 사용, 도메인 컨텍스트(파크팩터/시즌 등 decorative 숫자, buildInjectionText 가 이미 배제한 것과 동일 이유)는 제외해 arithmetic-derivative false negative 회피(최초 구현에서 buildUserMessage 전체를 넘겨 테스트 1건이 실제로 이 false negative 를 재현 — 발견 즉시 분리). `runCalibrationAgent`가 위반 시 judge-agent 와 동일 패턴(전체 reject 아닌 `maskViolatedReasoning` 필드별 마스킹)으로 처리, `adjustmentSuggestion`(이미 ±5% 클램프)은 그대로 유지.
- `agents-validator.test.ts`에 `validateCalibrationHint` 단위 테스트 4건, 신규 `agents-calibration-validation.test.ts`에 `runCalibrationAgent` 통합 마스킹 테스트 4건(환각숫자 마스킹/정상 통과/금칙어 필드별 마스킹/텍스트 필드 전부 null 시 skip).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `@moneyball/kbo-data` vitest 92 files/1207 tests(+9) green + `pnpm lint` clean. version 159→160 3-way sync(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).

다음 사이클 추천 = injection-validation family 사실상 전 지점(team/judge/postview/calibration 4곳) 소진 — polish-ui/info-architecture-review/op-analysis 다양성 전환 우선 검토 권장.

## v0.5.62.159 — 2026-08-26 (cycle 2634, review-code(heavy): 529 Overloaded 재시도 window 실측 17.5s ≠ 주석 주장 37.5s off-by-one 수정)

### fix: 529 Overloaded 재시도 attempts 가 backoff 배열 길이와 같아 마지막 backoff(20000ms)가 실제 sleep 에 한 번도 안 쓰이던 off-by-one 수정

- 진단: open issue 0, approved plan 0/23. gap trigger 전부 미도달(fix-incident 19/20, op-analysis 8/25, info-arch 16/30, lotto 6/30). 직전8 distinct=6 — 2-chain lock 미충족. DESIGN.md 당일 갱신(polish-ui negative). cycle 2633 explore-idea(lite)가 명시 추천한 신규 축(`retro.ts`/`llm.ts`, validator.ts 환각검증 gap family 완전 소진 이후) 채택.
- `llm.ts` 직독 — cycle 986 fix 주석("529 단독 attempts 4 로 확장: 2.5s→5s→10s→20s = 총 37.5s window")과 실제 동작 불일치 발견. `MAX_OVERLOADED_ATTEMPTS = OVERLOADED_BACKOFF_MS.length`(=4)이고 루프는 `attempt < maxAttempts - 1`일 때만 sleep 하므로, 4회 시도(index 0~3) 중 실제 sleep 은 attempt 0/1/2 3번(2500+5000+10000=17500ms)뿐 — attempt 3(마지막)은 sleep 없이 바로 실패 반환돼 배열의 마지막 값 20000ms 가 사실상 죽은 코드. 2026-05-19 5경기 fallback 재발 evidence 로 "기존 3 attempts(17.5s) 부족 → 확장" 을 명시적으로 의도했는데, 실측 대기시간이 확장 전과 동일한 17.5s 라 529 폭풍 생존율 개선 의도 자체가 무력화된 상태(단순 주석 오기가 아니라 production resilience 실효성 문제).
- 수정: `MAX_OVERLOADED_ATTEMPTS = OVERLOADED_BACKOFF_MS.length + 1`(4→5)로 변경 — backoff N개를 모두 attempt 사이 간격으로 소비하려면 attempts 가 N+1 이어야 하는 표준 fencepost 정정. 테스트가 전부 심볼(`MAX_OVERLOADED_ATTEMPTS`) 참조라 값 변경만으로 기존 회귀 없이 통과. `agents-llm.test.ts`에 `setTimeout` spy 로 실제 backoff 배열 `[2500,5000,10000,20000]` 전량 소비 + 합계 37500ms 를 직접 검증하는 회귀 가드 신규 추가(향후 attempts 를 다시 배열 길이로 되돌리면 이 테스트가 17500 을 보고 즉시 실패).
- 스코프 판단: 동일 off-by-one 패턴이 일반 경로(`MAX_ATTEMPTS`/`LLM_RETRY_BACKOFF_MS`, 3attempts/1.5s 실측)와 `llm-deepseek.ts`/`llm-ollama.ts` 에도 존재하나, 이들은 "N attempts = Ns window" 식 구체적 evidence-backed 수치 주장이 코드/주석에 명시돼 있지 않아(단순 backoff 스케줄 서술) 이번 fix 스코프에서 제외 — 529 경로만 명시적 주장-실측 불일치(37.5s 주장 vs 17.5s 실측) evidence 있어 단일 논리 단위로 한정.
- `pnpm --filter kbo-data exec tsc --noEmit` clean + `@moneyball/kbo-data` vitest 91 files/1199 tests(+1) green + lint clean. version 158→159 3-way sync(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).

다음 사이클 추천 = 일반 경로(`MAX_ATTEMPTS`/`LLM_RETRY_BACKOFF_MS`) + `llm-deepseek.ts`/`llm-ollama.ts` 동일 off-by-one 패턴 존재 여부만 확인(evidence 없어 이번엔 스코프 제외했으나 동일 chain 재진입 시 1순위 후보) 또는 polish-ui/info-architecture-review(dominance 완화 다양성).

## v0.5.62.158 — 2026-08-26 (cycle 2632, review-code(heavy): postview judge 환각검증이 pre_game 전용 주입블록 재사용하던 gap 수정)

### fix: postview judge reasoning 검증이 actual 스코어/original 승률/factor 편향값을 커버 못 하던 gap 수정

- 진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). 직전8 distinct=5(review-code 계열 4 + polish-ui 1 + op-analysis 1 + lotto 1 + explore-idea 1) — 2-chain lock 미충족. gap trigger 전부 미도달(fix-incident 17/20, op-analysis 6/25, info-arch 14/30, lotto 4/30). DESIGN.md 당일 갱신(polish-ui negative) + breadcrumb 미커버 목록 18건 전수 재확인(community=noindex 플레이스홀더, reviews/monthly·weekly 4종=redirect-only stub, debug/*=내부 전용) — 전부 의도된 제외라 info-arch negative. 직전 3사이클(2629/2630/2631) 모두 `validator.ts` rivalryBlock 경로 fix 후 "polish-ui 또는 info-architecture-review" 추천했으나 양쪽 재확인 negative로, dominance-positive streak 룰(cycle 135)에 따라 review-code(heavy) 계속 진행.
- `validateJudgeReasoning` 호출부 3곳(judge-agent.ts/postview.ts/그 자체) 전수 확인 중 `postview.ts:432`가 rivalryBlock 경로와 별개로 동일 함수를 pre_game용 기본 인자로만 호출함을 발견. `buildJudgePostviewMessage`(postview.ts:268)는 judge에게 `actual.homeScore`/`actual.awayScore`(실제 스코어), `original.homeWinProb`(pre_game 홈 승리확률 %), `factorLines`(original.factors 편향값, 소수 3자리)를 직접 노출하는데, `buildInjectionText`는 pre_game 컨텍스트 전용이라 이 세 값이 전혀 없음 — judge가 "pre_game은 65% 확률로 예측했으나 실제 7-3 역전, sp_fip 편향 0.023 과대평가"처럼 정당 인용해도 `checkHallucinatedNumbers`가 환각으로 오탐할 gap(테스트 미커버, 스코어 단일 digit은 NUMERIC_WHITELIST로 우연히 통과하지만 원 승률%·편향값은 대부분 미통과 실측 확인).
- 수정: `buildInjectionText(context, rivalryBlock = '', extraContext = '')` 3번째 인자 추가, `validateJudgeReasoning(..., rivalryBlock = '', extraContext = '')` 5번째 인자로 연결(4번째 rivalryBlock은 cycle 2630/2631 fix 그대로 pre_game 전용 유지 — postview는 항상 빈 문자열 전달해 서로 간섭 없음). `postview.ts`에 `buildPostviewExtraInjection(actual, original)` 신규 export — buildJudgePostviewMessage와 동일 소스(스코어/승률%/factorLines)로 별도 조립해 `validateJudgeReasoning` 호출부에 5번째 인자로 전달. `agents-validator.test.ts`에 회귀 가드 2건 신규(extraContext 전달 시 postview 실측값 인용 오탐 없음 / 미전달 시 오탐 유지 대조).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `@moneyball/kbo-data` vitest 91 files/1198 tests(+2) green + `pnpm lint` clean. version 157→158 3-way sync(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).

다음 사이클 추천 = polish-ui 또는 info-architecture-review(dominance 완화 목적 다양성 유지) — 단 양쪽 3사이클 연속 negative 확인됐으므로 신규 trigger 없으면 dimension-cycle 또는 explore-idea 재점검도 고려.

## v0.5.62.157 — 2026-08-26 (cycle 2631, review-code(heavy): judge 경로 라이벌리 메모리 환각검증 누락 수정)

### fix: judge-agent reasoning 검증이 rivalryBlock 없이 buildInjectionText 호출하던 잔여 gap 수정

- 진단: open issue 0, approved plan 0/23. gap trigger 전부 미도달(fix-incident 16/20, op-analysis 5/25, info-arch 13/30, lotto 3/30). 2-chain lock 미충족(직전8 distinct=6). DESIGN.md 당일 갱신(polish-ui negative) + breadcrumb 미커버 라우트 목록 cycle 2618 대조 동일(info-arch negative) 확인 후, cycle 2630이 명시 추천한 후속 스코프 그대로 진행 — `judge-agent.ts`/`debate.ts`가 rivalryBlock을 team-agent 경유로 흘려받는지 확인.
- `judge-agent.ts:buildUserMessage`는 rivalryBlock을 직접 포함하지 않지만, judge가 종합하는 `homeArg.reasoning`/`awayArg.reasoning`(팀 에이전트 LLM 출력)은 cycle 2630 fix 이후 rivalryBlock 수치를 실제로 노출받은 상태 — judge가 그 수치를 정당 인용해 최종 reasoning(블로그 프리뷰 원문)에 반영해도, `validateJudgeReasoning(reasoning, context, mode)`가 `buildInjectionText(context)`를 rivalryBlock 없이 호출해 동일 환각 오탐 gap이 judge 경로에서 재발함을 확인(테스트 미커버).
- 수정: `validateJudgeReasoning(reasoning, context, mode, rivalryBlock = '')` 4번째 인자 추가 → `buildInjectionText(context, rivalryBlock)` 전달. `runJudgeAgent(..., context, rivalryBlock = '')` 8번째 인자 추가해 `validateJudgeReasoning` 호출부에 연결. `debate.ts`는 team-agent 내부에서 fetch한 promptBlock을 재사용할 API가 없어(AgentResult로 반환 안 함) `getRivalryBlock({ homeTeam, awayTeam, date })`를 기존 `Promise.all` 병렬 호출에 4번째로 추가해 별도 fetch 후 `runJudgeAgent`에 전달. `agents-validator.test.ts`에 회귀 가드 2건 신규(rivalryBlock 전달 시 소수점 수치 인용 오탐 없음 / 미전달 시 오탐 유지 대조).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `@moneyball/kbo-data` vitest 91 files/1196 tests(+2) green + apps/moneyball vitest 568/4465 불변 + `pnpm lint` clean. version 156→157 3-way sync(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).

다음 사이클 추천 = polish-ui 또는 info-architecture-review(dominance 완화 목적 다양성 유지, 둘 다 gap 여유) — review-code(heavy)의 라이벌리 블록 경로(team-agent → judge-agent)는 이번 사이클로 스코프 완료.

## v0.5.62.156 — 2026-08-26 (cycle 2630, review-code(heavy): 라이벌리 메모리 블록 환각검증 누락 수정)

### fix: team-agent 라이벌리 메모리 블록이 환각 숫자 검증 대상에서 빠져있던 silent gap 수정

- 진단: open issue 0, approved plan 0/23. 직전20 review-code 계열 dominance 60%(12/20) 지속 — 직전 두 사이클(2628/2629)이 색상 토큰·dead-code 두 축 모두 소진 확인하며 다음 후보로 명시한 `packages/kbo-data/src/agents/validator.ts`(956줄, agents/ 디렉토리 최대·미착수 파일) 재조준. polish-ui/info-architecture-review 재점검(breadcrumb 18건/sitemap 대조/신규 라우트 7일)도 cycle 2618/2627 checkpoint 와 동일 결과라 신규 액션 없음 확인 후 review-code(heavy) 선택.
- Explore agent 전체 파일 정독 + 2차 자가검증(호출부 grep) 결과: `buildInjectionText()`(환각 검증용 "LLM 실제 노출 텍스트" 재구성 함수, cycle 2122/2241 두 차례 team-agent.buildUserMessage 와 동기화된 이력)가 `team-agent.ts`가 실제로 프롬프트 맨 끝에 직접 append하는 라이벌리 메모리 블록(`getRivalryBlock().promptBlock` — 최근 h2h 스코어 + `agent_memories.content` 문자열, `retro.ts`가 기록하는 실제 숫자 포함)을 전혀 반영하지 않음을 확인. `validateTeamArgument(result.data, context, mode)` 호출부(`team-agent.ts:133`)가 이 블록을 validator 에 전달하지 않아, LLM이 이 블록의 숫자(예: 과거 FIP 갭 수치)를 정당하게 인용해도 `checkHallucinatedNumbers`가 "주입 블록에 없는 수치"로 오탐할 위험이 있었음(테스트 미커버 확인). `packages/shared/src/index.ts` dead-code 후보 7건은 재검증 결과 전부 false positive(TS structural typing으로 실사용)였던 것과 대조적으로, 본 건은 실제 검증 gap.
- 수정: `buildInjectionText(context, rivalryBlock = '')` 2번째 인자 추가해 rivalryBlock 텍스트를 injection text 말미에 포함, `validateTeamArgument(arg, context, mode, rivalryBlock = '')` 4번째 인자로 전달 경로 연결, `team-agent.ts:133` 호출부에서 이미 보유 중이던 `rivalry.promptBlock` 을 넘기도록 수정(신규 API 호출 없음 — 이미 fetch 해둔 값 재사용). `agents-validator.test.ts`에 회귀 가드 7건 신규(agent_memories 소수점 수치 동봉 확인 2건 + 인용 시 환각 오탐 없음/미전달 시 오탐 유지 대조 3건 + `validateTeamArgument` 4번째 인자 레벨 2건 — h2h 스코어 자체는 단일 digit이라 `NUMERIC_WHITELIST`로 이미 통과되는 걸 실측 확인해 테스트 값은 소수점 memory content로 조정).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `@moneyball/kbo-data` 패키지 vitest 91 files/1194 tests(+6) green + `pnpm turbo test` 전체(moneyball 568/4465 불변 + kbo-data/shared/cron) + `pnpm lint` clean. version 155→156 3-way sync(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).

다음 사이클 추천 = review-code(heavy, `judge-agent.ts`/`debate.ts` 등 라이벌리 블록이 team arg reasoning 경유로 judge 프롬프트에도 흘러들어가는지 별도 확인 후보 — 본 사이클은 team-agent 직접 주입 경로만 스코프) 또는 polish-ui/info-architecture-review(둘 다 gap 여유, 다양성 유지).

## v0.5.62.155 — 2026-08-26 (cycle 2627, polish-ui: Ko-fi 플로팅 위젯 쿠키 배너 겹침 수정)

### fix(design): Ko-fi 도네이션 위젯이 쿠키 배너/적중률 스탯 카드와 겹치는 문제 수정

- 진단: open issue 0, approved plan 0/23. 직전20 chain 분포 review-code 계열 12/20(60%) dominance — cycle 2624/2625 retro 양쪽에서 다양성 redirect 명시 제안 + 자체 rounded-*/shadow-* 토큰 grep 감사 결과 새 twin 불일치 없음(축 소진 확인) → polish-ui 선택. gap trigger 전부 미도달(fix-incident 11/20, op-analysis 0/25 방금발화, info-arch 8/30, lotto 28/30). GH Actions 최근 15건 전부 success/skipped, incident 없음.
- 전체 사이트 grep 대신 실 브라우저 감사(`gstack browse`, 1280x720 + 375x812)로 라이브 사이트 dogfooding — 홈페이지 첫 화면(스크롤 전)에서 `KofiWidget.tsx` 플로팅 도네이트 버튼(z-index 99999999, 기본 bottom-left 고정)이 쿠키 동의 배너(`CookieConsent.tsx`, 첫 방문 시 노출)뿐 아니라 그 위 "적중률 현황" 시즌 적중률 스탯 카드 숫자까지 가리는 것을 스크린샷으로 확인·재현. 위젯을 배너 높이만큼 밀어올리는 방식(bottom offset 조정)은 모바일(375x812, 배너 높이 141px)에서 위로 밀린 위젯이 스탯 카드와 새로 겹쳐 재발 — 콘텐츠 밀도 높은 홈페이지 특성상 오프셋 미세조정으로는 해결 불가 확인.
- 실행: 배너 노출 중엔 위젯을 완전히 숨기는 방식으로 전환 — `globals.css`에 기존 `body[data-cookie-shown="true"]` 토글(CookieConsent.tsx가 이미 footer spacer padding 용으로 사용 중이던 패턴 재사용)에 `.floatingchat-container-wrap`/`-mobi` `display: none !important` 규칙 추가. 배너는 일시적 상태(dismiss 시 즉시 사라짐)이므로 위젯은 dismiss 직후 자연 복귀 — 데스크톱/모바일 양쪽 스크린샷으로 겹침 해소 확인 후 적용. `silent-drift-cycle-2627.test.ts` 신규(CSS 규칙 존재 + CookieConsent 토글 의존성 2 tests). `pnpm --filter moneyball exec tsc --noEmit` clean + vitest 568 files/4465 tests(+1/+2) green + lint clean. version 154→155 3-way sync(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).

다음 사이클 추천 = op-analysis(gap 1/25)/lotto(gap 29/30) 자연 대기 또는 review-code(heavy) 신규 축 재탐색. review-code dominance 완화(직전20 기준 12→11/20으로 소폭 하락 예상).

## v0.5.62.154 — 2026-08-26 (cycle 2623, review-code(heavy): dark:border-gray-N 전역 → --color-border 토큰 정렬)

### fix(design): raw `dark:border-gray-N` 리터럴 sitewide → `dark:border-[var(--color-border)]` 토큰 정렬

- 진단: open issue 0, approved plan 0/23. 직전8(2615-2622) distinct=3(review-code(heavy) 6+info-architecture-review 1+fix-incident 1) — 2-chain lock 미충족. op-analysis gap 15/25, fix-incident gap 8/20, info-arch gap 5/30, lotto gap 25/30, explore-idea saturation 11/15, design-system negative(당일 갱신) — 전부 미도달. ship-0 미충족(직전10 success 6). skill-evolution trigger 5개 미충족(milestone 2623%50≠0, review-code 직전20 non-zero).
- DESIGN.md:64 문서화된 컨벤션(라이트모드 `border-gray-N` 리터럴 / 다크모드는 `dark:border-[var(--color-border)]` 단일 토큰, cycle 612~728 여러 사이클에 걸쳐 점진 마이그레이션된 패턴) 대비 sitewide grep — raw `dark:border-gray-N` 잔존 65건/23파일 발견. opacity 변형(`/50`,`/40`, cycle 617 확정 보존 대상 — 8건/7파일)은 제외, 나머지 57건/16파일(`app/insights`, `app/standings`, `app/lotto/*`, `app/accuracy/shadow`, `app/v2-preview`, `app/debug/agent-fallback`, `app/debug/silent-drift`, `FactorAccuracyTable` 등)이 순수 미마이그레이션 잔존으로 확정.
- 실행: perl 기계적 치환(`dark:border-gray-\d+(?!/)` → `dark:border-[var(--color-border)]`, opacity suffix 보존) 57건/16파일. `silent-drift-cycle-2623.test.ts` 신규(sitewide raw 토큰 재발 방지 grep, opacity 변형 명시적 예외 처리 — capture-group 기반, 나이브 negative lookahead의 백트래킹 오탐 회피). `pnpm --filter moneyball type-check` clean + vitest 567 files/4463 tests(+1/+1) green + lint clean. version 153→154 3-way sync(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).

다음 사이클 추천 = op-analysis(gap 16/25)/lotto(gap 26/30) 자연 대기 또는 review-code(heavy) 신규 축 재탐색(opacity 변형 border 계열 별도 role 문서화 후보).



### fix(design): `SearchClient.tsx` 검색결과 행 hover:bg dark 컨벤션 정렬

- 진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). 직전8(2614-2621) distinct=4(review-code(heavy) 5+dimension-cycle 1+fix-incident 1+info-architecture-review 1) — 2-chain lock 미충족. op-analysis gap 14/25, fix-incident gap 7/20, info-arch gap 4/30, lotto gap 24/30 — 전부 미도달. DESIGN.md 당일 갱신(design-system negative). explore-idea saturation 11/15 미도달. ship-0 미충족(직전10 success 4/retro-only 6, success 존재). skill-evolution trigger 5개 미충족(milestone 2622%50≠0, chain-evolution 누적 9건 신규분 없음, review-code 직전20 non-zero 14회).
- arbitrary `text-[Npx]` 축(cycle 239 후보)은 잔여 1건까지 이미 해소돼 소진. `rounded-*`/`duration-*` 축은 이상치 없음. `hover:bg-gray-50 dark:hover:bg-gray-XXX` 조합 sitewide grep — 8개 인스턴스(LeaderboardTable/LeaderboardJoinModal 등, 클릭 가능한 행/버튼 hover) 전부 `dark:hover:bg-gray-800` 계열인데 `SearchClient.tsx` 검색결과 행 링크만 유일하게 `dark:hover:bg-gray-900/40` — 동일 시각적 역할(클릭 가능 행 hover)의 twin 불일치.
- 실행: `SearchClient.tsx` line 276 `dark:hover:bg-gray-900/40` → `dark:hover:bg-gray-800/40` 정렬. `silent-drift-cycle-2622.test.ts` 신규(sitewide `hover:bg-gray-50`+`dark:hover:bg-gray-900` 조합 재발 방지 grep + SearchClient 특정 assertion, 2 tests). `pnpm --filter moneyball type-check` clean + vitest 566 files/4462 tests(+1/+2) green + lint clean. version 152→153 3-way sync(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).



## v0.5.62.152 — 2026-08-26 (cycle 2621, review-code(heavy): LiveScoreboard.tsx 홈 배지 font-semibold → font-bold 정렬)

### fix(design): `LiveScoreboard.tsx` 홈팀 배지 font-weight 컨벤션 정렬

- 진단: open issue 0, approved plan 0/23. 직전8(2613-2620) distinct=5(review-code 3+dimension-cycle 2+review-code(heavy) 1+info-architecture-review 1+fix-incident 1) — 2-chain lock 미충족. op-analysis gap 13/25, info-arch gap 3/30, lotto gap 23/30, fix-incident gap 6/20 — 전부 미도달. CI 최근 워크플로 전부 success. DESIGN.md 당일 갱신(design-system negative). ship-0 미충족(직전10 success 5). skill-evolution trigger 5개 미충족.
- cycle 2620 carry-over(font-weight 3-tier 축, 표본 396건) 는 사이트 전체 audit 하기엔 role 불명확 + 과대 — 대신 known role(`uppercase tracking-wide` 라벨) 소표본 재검사로 축소, `text-3xs` 롤 배지(px-1 py-0.5 rounded, brand-100/900 bg) 그룹 재검사로 전환. 동일 `aria-label="홈팀"` 배지가 `MiniGameCard.tsx`/`PredictionCard.tsx`/`PlaceholderCard.tsx` 3곳 전부 `font-bold` 인데 `LiveScoreboard.tsx` 만 유일하게 `font-semibold` — twin 불일치 확인(`git blame` 상 `text-[9px]→text-3xs` 토큰화 커밋(cycle 2599 계열)이 font-weight 는 그대로 이관, 원 소스 자체가 최초부터 semibold 였던 걸로 추정). `font-bold` 로 정렬 + `silent-drift-cycle-2621.test.ts`(1 test) 신규. tsc clean + vitest 565 files/4460 tests(+1/+1) green + lint clean. version 151→152. main 직접 push.



### fix(design): `SearchClient.tsx` uppercase eyebrow-라벨 tracking 컨벤션 정렬

- 진단: open issue 0, approved plan 0/23. 직전8(2612-2619) distinct=4(review-code 5+dimension-cycle 2+fix-incident 1+info-architecture-review 1) — 2-chain lock 미충족. op-analysis gap 12/25, info-arch gap 2/30, lotto gap 22/30, design-system negative(당일 갱신) — 전부 미도달. explore-idea saturation 12/15 재도달했으나 4-source 재확인(신규라우트 90건=git checkout 부작용 지속/TODOS Next-Up 없음/GH issue 0/plan#29 여전히 spec_only_deferred Tier4) — negative, cycle 2617/2618/2619 과 동일 패턴. ship-0 emergency stop 미충족(직전10 success 5/retro-only 5, success 존재). skill-evolution trigger 5개 전부 미충족(milestone 2620%50≠0, chain-evolution 누적 9건이나 최근 신규분 없음 판단, review-code 직전20 non-zero 12회).
- cycle 2619 가 `text-gray-400 dark:text-gray-400` flat-pair 축을 picks/ 스코프로 해결한 뒤, 본 사이클은 sitewide grep 으로 잔여 확인 — flat pair 0건 잔존(테스트 assertion 제외) 확인 후 나머지 review-code(heavy) 후보 축(font-weight 3-tier 396건 표본 과다, tracking-* 11건 소표본) 순회. `tracking-*` 축에서 uppercase eyebrow/섹션-라벨(작은 대문자 스타일 heading) 역할의 10개 인스턴스(DebateTimeline/AgentVoteCard/MlbMatchupFactorCompare/MatchupFactorCompare/MobileNav/LeagueSelector/Footer/ConvergenceStreakBadges x2)가 전부 `tracking-wide` 사용하는데 `SearchClient.tsx` 검색 결과 그룹 라벨(`<h3>` 그룹명+개수) 만 유일하게 `tracking-wider` 사용 — 동일 시각적 역할의 twin 불일치.
- 실행: `SearchClient.tsx` line 256 `tracking-wider` → `tracking-wide` 정렬. `silent-drift-cycle-2620.test.ts` 신규(sitewide `uppercase`+`tracking-wider` 조합 재발 방지 grep + SearchClient 특정 assertion, 2 tests). `pnpm --filter moneyball exec tsc --noEmit` clean + vitest 564 files/4459 tests(+1/+2) green + lint clean. version 150→151 3-way sync(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.150 — 2026-08-26 (cycle 2619, review-code(heavy): picks/ 모듈 muted-text tier-2 다크모드 역전 정렬)

### fix(design): `components/picks/*.tsx` tier-2 muted-text 다크모드 색상 역전 정렬

- 진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). 직전8(2611-2618) distinct=4(review-code 4+dimension-cycle 2+fix-incident 1+info-architecture-review 1) — 2-chain lock 미충족. op-analysis gap 11/25, info-arch gap 1/30(직전 발화), lotto gap 21/30, design-system negative(당일 갱신) — 전부 미도달. explore-idea saturation 12/15 도달했으나 4-source 재확인(신규라우트 -14d 90건=git checkout 부작용/TODOS Next-Up 신규 리드 없음/GH issue 0/plan#29 트래픽 count 미성장·Tier4 유지) — negative, cycle 2617/2618 과 동일 패턴. ship-0 emergency stop 미충족(직전10 success 6/retro-only 4). skill-evolution trigger 5개 전부 미충족(milestone 2619%50≠0, review-code 직전20 non-zero 11회). cycle 2617 carry-over 명시 추천(muted text-gray-500/400 2-tier 역할 분리 문서화) 채택.
- 발견: 사이트 전체 muted text 관례는 라이트/다크 모드 간 명도를 역전시켜 대비감을 tier 별로 동일하게 유지 — tier 1(primary) `text-gray-500 dark:text-gray-400`, tier 2(secondary) `text-gray-400 dark:text-gray-500`. `text-gray-400 dark:text-gray-400`(flat, no invert) grep 결과 9건 전부 `components/picks/` 모듈(`UserVsAIScorecard.tsx`/`WeeklyPicksSummary.tsx`/`MyPicksClient.tsx`/`PickButton.tsx`)에 집중 — 각 파일 안에서 동일 역할(퍼센트 캡션/타임스탬프/placeholder)의 sibling 라인이 올바르게 `dark:text-gray-500` 로 역전된 것과 직접 대조되는 twin 불일치 확인(예: `WeeklyPicksSummary.tsx` line 30/42/53 정상 vs line 35/58 drift). 다크모드에서 tier 2 텍스트가 tier 1 수준으로 밝게 렌더링되어 의도된 대비 단계 붕괴.
- 실행: 9곳 `dark:text-gray-400` → `dark:text-gray-500` 정렬. DESIGN.md Color 섹션에 "Muted text 2-tier" 관례 신규 문서화(tier 1/tier 2 + flat-pair drift 규칙 명시). `silent-drift-cycle-2619.test.ts` 신규(picks/ 전역 flat-pair 재발 방지 grep + 4개 파일 개별 assertion, 5 tests). `pnpm --filter moneyball exec tsc --noEmit` clean + vitest 563 files/4457 tests(+1/+6) green + lint clean. version 149→150 3-way sync(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.149 — 2026-08-26 (cycle 2613, dimension-cycle(acquisition): /picks sitemap noindex 모순 제거)

### fix(seo): `/picks` sitemap.ts 노출 — page.tsx noindex 모순 제거

- 진단: open issue 0, approved plan 0/23. 직전8(2605-2612) distinct=3(review-code 7 + operational-analysis 1) — 2-chain lock 미충족. fix-incident negative(전부 success/skipped). op-analysis gap 5/25, info-arch gap 26/30, lotto gap 15/30, design-system negative(당일 갱신) — 전부 미도달. explore-idea saturation 11/15 미충족. skill-evolution trigger 5개 전부 미충족(milestone 2613%50≠0, review-code 직전20 non-zero). cycle 2612 retro 명시("review-code 11축 소진, 재진입 저가치 — op-analysis/info-arch/lotto 자연 대기 또는 dimension-cycle acquisition 심화 검토") 따라 dimension-cycle acquisition(SEO) 심화 진입.
- 발견: canonical(19건 누락 전부 noindex 의도) / JSON-LD / OG·twitter-image 페어링(66/66 완전 매칭) / hreflang `languages` alternate(en/mlb 24개 중 2개 미보유 — 둘 다 redirect-only shim, 의도됨) / Header·Footer `/mlb`→`/en/mlb` locale 치환 로직(scope 정확) 전부 clean 확인 후, sitemap.ts 전체 staticRoutes 를 각 페이지 자체 metadata 와 대조하는 스크립트 점검에서 `/picks`(`robots: { index: false }`, 개인화 "내 픽 기록")가 sitemap.ts 에 여전히 등록된 것 발견 — `/search` 가 동일 모순으로 cycle 2579 에 sitemap 제거됐던 것과 완전히 같은 패턴, 그때 `/picks` 는 놓쳤던 gap.
- 실행: `sitemap.ts` staticRoutes 에서 `/picks` 항목 제거 + 사유 주석(`/search` 패턴 참조). `sitemap-mlb.test.ts` 에 회귀 assertion 추가(`/picks` URL 부재 확인). `pnpm --filter moneyball exec tsc --noEmit` clean + vitest 561 files/4451 tests green(+1) + lint clean. version 148→149 3-way sync. 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.148 — 2026-08-26 (cycle 2611, review-code(heavy): "AI" 원형 배지 아이콘 크기 w-5 h-5 → w-6 h-6 정렬)

### fix(design): "AI" 아바타 배지 아이콘 크기 역할 정렬

- 진단: open issue 0, approved plan 0/22. 직전8(2603-2610) distinct=3(review-code 6 + polish-ui 1 + operational-analysis 1) — 2-chain lock 미충족. fix-incident 20+ 사이클 미발화지만 `gh run list --limit 15` 전부 success/skipped, negative. op-analysis gap 3(2608 직발화), info-arch gap 24/30, lotto gap 13/30, design-system negative(DESIGN.md 당일 갱신) — 전부 미도달. skill-evolution trigger 5개 전부 미충족(milestone 2611%50≠0, 직전20 sample=19≥10, review-code만 평가 대상이며 12회 발화로 non-zero). review-code(heavy) 재진입 — cycle 2610 자체 추천대로 아이콘 크기/버튼 높이/line-height 축 신규 탐색.
- 발견: 아이콘 크기(w-4 h-4/w-5 h-5/w-6 h-6) 전역 재점검 중 "AI" 원형 아바타 배지(`inline-flex items-center justify-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 font-bold text-2xs` + "AI" 텍스트) 정확히 동일 역할 3곳 발견 — `DebateTimeline.tsx`/`JudgeReasoningCard.tsx` 는 `w-6 h-6`, `app/predictions/[date]/page.tsx` 헤더만 `w-5 h-5` — 1-notch 이탈. 나머지 icon-square 사용처(순위 뱃지 `w-6 h-6`, 로또 콤보체크 `w-9 h-9` 등)는 역할 상이해 twin 아님, drift 아님 확인. 버튼 높이(h-8/h-9/h-10/h-11) grep은 대부분 `loading.tsx` 스켈레톤 자체 사이즈라 twin 무의미(범위 제외) — line-height(`leading-*`) grep도 페이지별 산문 vs UI 컴포넌트 역할 분기 뚜렷해 drift 없음 확인.
- 실행: `predictions/[date]/page.tsx` AI 배지 `w-5 h-5` → `w-6 h-6`(2/3 다수결). DESIGN.md Decisions Log 항목 추가. `silent-drift-cycle-2611.test.ts` 신규(w-6 h-6 assert + w-5 h-5 AI 배지 전역 재발 방지 grep). `pnpm --filter moneyball exec tsc --noEmit` clean + vitest green + lint clean. version 147→148 3-way sync(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.147 — 2026-08-26 (cycle 2610, review-code(heavy): MobileNav 아코디언 chevron duration-150 → duration-200 motion 토큰 역할 정렬)

### fix(design): `MobileNav.tsx` 아코디언 disclosure chevron duration 정렬

- 진단: open issue 0, approved plan 0/22(전수 재확인, plan #29 회원인증/커뮤니티는 postseason 접근 또는 참여≥10 트리거 미충족 — 재확인 스킵, plan 자체 명시 원칙). 직전8(2602-2609) distinct=3(review-code 6 + operational-analysis 1 + polish-ui 1) — 2-chain lock 미충족. fix-incident negative(`gh run list --limit 15` 전부 success/skipped). op-analysis gap 2(2608 직발화), info-arch gap 22/30, lotto gap 12/30(다음 회차 50세트 이미 8/23 박제) — 전부 미도달/최근 처리. design-system negative(DESIGN.md 당일 갱신). explore-idea saturation 10/15 미충족. review-code(heavy) 재진입 — 기존 spacing/border-radius/shadow/focus-ring/typography 축 재점검(gap-*, z-[], ring-*, rounded-md 잔존, hover:shadow 변형) 전부 clean(drift 없음, twin 구조 확인) 후 motion duration 축 신규 진입.
- 발견: `globals.css`+DESIGN.md motion 토큰(`--motion-fast:150ms` nav hover / `--motion-medium:200ms` dropdown open) 대비, 사이트 전체 hardcoded `duration-150`/`duration-200` literal 2건뿐 — desktop nav(`navigation-menu.tsx`, shadcn/radix vendor) chevron 은 `duration-200`(dropdown open 역할과 정합), 모바일 아코디언(`MobileNav.tsx` `Accordion.Trigger` chevron)은 동일한 "열림/닫힘 토글 disclosure indicator" 역할이면서 `duration-150`(nav hover 용도) 사용 — 역할 불일치.
- 실행: `MobileNav.tsx` chevron `duration-150` → `duration-200`. DESIGN.md Motion 섹션에 "Disclosure chevron rotate" 항목 추가(desktop/모바일 공통 역할 명시). `silent-drift-cycle-2610.test.ts` 신규 2건(chevron duration-200 assert + duration-150 잔존 0건 grep). `pnpm --filter moneyball exec tsc --noEmit` clean + vitest 560 files/4448 tests(+1/+2) green + lint clean. version 146→147 3-way sync. 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.146 — 2026-08-26 (cycle 2609, polish-ui: AgentVoteCard away-color 하드코딩 hex → var(--color-away) 단일 source 정렬)

### fix(design): `AgentVoteCard.tsx` awayColor fallback 리터럴 hex 중복 제거

- 진단: open issue 0, approved plan 0/22. 직전8(2601-2608, missing 2601 제외) distinct=2(review-code 6 + operational-analysis 1) → **2-chain alternation lock 탐지** — review-code/operational-analysis 이번 사이클 후보 제외. fix-incident 재점검(`gh run list --limit 15`) 전부 success/skipped, 실제 incident 없음(negative, 3연속). info-arch gap 22/30, lotto gap 11/30 미도달. design-system(DESIGN.md mtime 당일 갱신, 조건 미충족) negative. explore-idea saturation 10/15 미충족. lock 규칙에 따라 남은 pool 전부 trigger 부재 → polish-ui 강제 발화.
- 발견: transition-duration/badge padding/icon square 축 재점검 clean(twin 구조 확인, drift 없음 — wild-card 뱃지 `w-9 h-7`는 "WC1" 3글자 텍스트용 pill, standings 1-digit 숫자 뱃지 `w-6/w-7 h-7` square와 역할 다른 twin). hardcoded hex 전수 grep(`#[0-9a-fA-F]{6}`) 중 `AgentVoteCard.tsx:85`의 `awayColor` fallback이 `"#c5872a"` 리터럴 — 최초엔 drift 의심됐으나 `globals.css:37 --color-away: #c5872a`로 이미 정의되고 10개+ 파일(`insights/page.tsx`, `about/page.tsx`, `PostviewPanel.tsx`, `AgentArgumentBox.tsx`, `GameOverview.tsx`, `FactorBreakdown.tsx`, `RivalryMemorySurface.tsx` x2, `DetailedFactorAnalysis.tsx` x2, `MlbRivalryMemorySurface.tsx`, `MlbDetailedFactorAnalysis.tsx`)가 `var(--color-away)`로 참조하는 **값 자체는 정상**(색상 오류 아님, 최초 `brand[300]` 치환 시도는 오판이었음 — 즉시 원복). 실제 drift = 값이 아니라 **참조 방식** — 유일하게 이 컴포넌트만 CSS var 대신 raw literal 로 중복 박제(design-tokens.ts 주석의 "단일 source 박제 = silent drift family wave 141 차단" 패턴과 동일 위험군, `--color-away` 팔레트 변경 시 이 컴포넌트만 silent 하게 미반영될 소지).
- 실행: `awayColor` fallback `"#c5872a"` → `"var(--color-away)"` (inline style은 CSS 커스텀 프로퍼티 정상 resolve). `silent-drift-cycle-2609.test.ts` 신규(fallback 값 assert + `#c5872a` 리터럴 전역 재발 방지 grep 테스트). `pnpm --filter moneyball exec tsc --noEmit` clean + vitest 559 files/4446 tests(+1 file/+2 tests) 전부 green + lint clean. version 145→146(root/apps/moneyball package.json + VERSION 3-way sync, `scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7, pre-push hook lint+type-check+version-sync-guard 통과).

## v0.5.62.145 — 2026-08-26 (cycle 2606, review-code(heavy): 카드 padding p-4 compact tier DESIGN.md 문서화)

### docs(design): 카드 padding p-4 213건 중 79건 — drift 아닌 의도된 2번째 tier로 확정 + 스펙 문서화

- 진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). fix-incident gap 20/20 도달 → `gh run list --limit 15` 재점검 전부 success/skipped, 실제 incident 없음(negative). op-analysis gap 20/25 미도달 + cycle 2586 retro 명시("CREDIT_EXHAUSTED 해소 전까지 재발화 불필요") — negative. info-arch gap 19/30 미도달. lotto/design-system/polish-ui 각 gap 8/6/7 — 직발화 근접 다수, negative. 2-chain lock 미충족(직전8 distinct=5). explore-idea saturation 11/12 근접 미충족. cycle 2605 retro 추천대로 border-radius 소진 후 신규 review-code(heavy) 축 탐색 — shadow(cycle 2592 이미 정렬 clean 재확인)/focus-ring(`focus-visible:outline-*` 86건 전수, brand-500 73건 dominant + outline-white 1건(흰 배경 버튼, 의도) + outline-offset-[-2px] 4건(중첩 메뉴 inset, 의도) — drift 없음 clean) 순서로 negative 확인 후 spacing 축 진입.
- 발견: DESIGN.md "Card padding: 20px (p-5)" 단일 값 명시 대비 실제 카드 wrapper(`border`+`rounded-xl`) 시그니처 213건 중 p-4 79건 — 최초엔 drift 의심. `terms/page.tsx:213`·`glossary/page.tsx:108` twin 비교(둘 다 동일 className 패턴의 TOC/목차 nav 카드) 확인 결과 p-4 가 무작위 이탈이 아니라 "보조 유틸리티 카드(TOC/알림 요약)" 전용의 일관된 2번째 tier로 사용되고 있음을 확정 — 코드 수정 불필요, 스펙 문서 공백만 보완.
- 실행: DESIGN.md Spacing 섹션에 "Compact card padding: 16px (p-4)" 항목 추가(용도 + twin 근거 명시). 코드 변경 없음(문서만) — 회귀 테스트 불필요.
- `pnpm --filter moneyball exec tsc --noEmit` 확인 불필요(문서 전용). 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.144 — 2026-08-25 (cycle 2600 milestone, polish-ui: cycle 2599 이연 text-[11px] 46건 → --text-2xs 흡수)

### style(design): text-[11px] 캡션 46건 시각 검토 → 2xs(10px) 토큰 흡수

- 진단: open issue 0, approved plan 0/23 (전수 재확인). 직전8(2592-2599) distinct=5(review-code 4+polish-ui 1+dimension-cycle 1+lotto 1+design-system 1) — 2-chain lock 없음. fix-incident negative(`gh run list --limit 15` 전부 success/skipped). op-analysis gap 14/25, info-arch gap 13/30 미도달. explore-idea saturation 11/15 미충족(직전 12/15→11/15 하향). lotto gap 2, design-system gap 1 — 둘 다 직발화 직후. cycle 2599 retro 가 명시 추천한 carry-over(`text-[11px]` 46건, DESIGN.md "미해결" 항목)를 채택. **cycle_n % 50 == 0 milestone 도달 — retro 단계 skill-evolution 마커 강제 박제 (trigger 3, 다른 trigger 결과 무관, cycle 2051 사례19 룰).**
- 발견: `text-[11px]` 46건(21개 프로덕션 파일, `__tests__` 제외) 실사용 전수 확인 — 전부 서브 라벨/캡션/티어 텍스트 역할(정확도 대시보드 sub-label, 팀 편향 테이블, 배지 hover 텍스트 등). DESIGN.md 2xs(10px) 정의("미니 캡션/보조 라벨 — 실사용 최다 빈도")와 역할이 완전히 동일 — 10px/11px 1px 차이가 시각적으로 구분되는 별도 의미 없음. 신규 토큰 승격 대신 기존 2xs 로 흡수하는 게 스케일 파편화(3xs/2xs/신규/xs 4단 계층 vs 3xs/2xs/xs 3단 유지) 방지에 유리.
- 실행: `text-[11px]` → `text-2xs` 46건 치환(22개 파일, 대괄호 경로(`[id]`/`[date]`/`[slug]`/`[year]`) 포함 — `for f in $FILES` word-splitting 이 대괄호를 glob으로 오인해 최초 시도 실패, `grep -rlZ` + NUL 구분 + `while read` 로 재시도해 해결). DESIGN.md "(미해결)" 항목을 "(해결)"로 갱신 + 흡수 근거 기록. `polish-ui-cycle-2600-11px-absorption.test.ts` 신규(잔존 0건 회귀 가드).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(553 files/4429 tests, +1/+1) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.143 — 2026-08-25 (cycle 2599, design-system: text-[9px]/text-[10px] arbitrary value 193건 → --text-3xs/--text-2xs 정식 토큰화)

### style(design): micro typography scale 토큰화 — DESIGN.md 미문서화 arbitrary text size 전면 치환

- 진단: open issue 0, approved plan 0/23. 직전8(2591-2598) distinct=4(review-code 5+polish-ui 1+lotto 1+dimension-cycle 1) — 2-chain lock 없음. review-code streak(non-success)=1, lite cap 미충족. fix-incident gap 59+/20 이나 `gh run list --limit 15` 전부 success/skipped — negative. op-analysis gap 12/25, info-arch gap 11/30, lotto gap 0(cycle 2598 직발화, 8/29 픽스+8/22 결과 이미 박제) — 전부 미도달/최근 처리. explore-idea saturation 12/15 충족되나 TODOS Next-Up 신규 리드 없음 — negative. design-system 은 cycle 2400~2598 구간 0회 발화이나 cycle 2594·2597 review-code(heavy) 가 두 번 연속 "typography 임의값 165(→193)건, 단일 사이클 범위 초과, design-system 후보로 승격 검토" 로 명시 추천 — carry-over evidence 채택.
- 발견: DESIGN.md Typography Scale 이 xs(12px) 부터 시작하나, 실제 코드에는 `text-[9px]`(26건)/`text-[10px]`(119건)/`text-[11px]`(46건) 총 193건의 arbitrary micro-caption 값이 존재 — Tailwind v4 `@theme` 블록엔 font-size 토큰 자체가 전무(색상/motion 토큰만 정의), 3개 값 모두 미문서화 상태로 30+ 파일에 산발 사용. 9px/10px 는 값이 명확하고 사용빈도 높아(145/193) 즉시 토큰화 안전. 11px(46건)은 3xs(9)/2xs(10)/xs(12) 사이 낀 값이라 신규 토큰 승격 vs 기존 값 흡수가 시각 검토 필요한 결정 — 본 cycle 범위 밖으로 명시 이연.
- 실행: `globals.css` `@theme inline` 에 `--text-3xs: 0.5625rem`(9px)/`--text-2xs: 0.625rem`(10px) + 대응 line-height 신규 정의. DESIGN.md Scale 에 3xs/2xs 추가 + 11px 미해결 상태 명시. 전체 코드베이스 `text-[9px]`→`text-3xs`, `text-[10px]`→`text-2xs` 픽셀 값 보존 치환(52 파일, 순수 클래스명 교체 — 렌더링 변화 0). `design-system-cycle-2599-micro-typography.test.ts` 신규(토큰 정의 확인 + arbitrary value 잔존 0건 회귀 가드).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(552 files/4428 tests, +1/+2) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.142 — 2026-08-25 (cycle 2595, polish-ui — 2-chain lock fallback: contact 문의 유형 메일 쓰기 버튼 rounded-md → rounded-lg 정렬)

### fix(design): contact 페이지 메일 쓰기 CTA border-radius 정렬 — primary 버튼 컨벤션 통일

- 진단: open issue 0, approved plan 0/23(전수 재확인 — status=approved 0건). 직전8(2587-2594) distinct=2(review-code 7+info-arch 1) → **2-chain lock 탐지** (cycle 225 룰). 잠긴 두 chain 제외 후 잔여 pool 재평가: fix-incident negative(`gh run list` 전부 success/skipped), op-analysis gap 9/25, lotto gap 27/30(픽스 8/29 + 결과 8/22 이미 박제), design-system negative(DESIGN.md mtime "당일"은 git checkout 부작용, 실제 마지막 편집 커밋은 이전), explore-idea saturation 14/15 재확인(TODOS Next-Up 신규 리드 없음, plan#29 여전히 postseason 접근/participation≥10 게이트 미충족으로 deferred) — negative. 어떤 chain 도 trigger 없음 → 룰에 따라 polish-ui 강제 발화.
- 발견: 신규 라우트 7일 이내 추가 신호는 `find -mtime` 가 git checkout 부작용으로 신뢰 불가 판단(같은 이유로 이전 cycle들이 negative 처리한 것과 동일 원칙 적용) — 대신 사이트 전역 primary 버튼(`bg-brand-500`/`bg-brand-600`) family 13건 실측: 전부 `rounded-lg`(DESIGN.md "md: 8px — 버튼, 인풋" 스펙과 일치). `contact/page.tsx` 문의 유형 리스트의 "메일 쓰기" CTA(`<a>` mailto 링크)만 유일하게 `rounded-md` — 같은 `<li>` 컨테이너 자체도 `rounded-lg`라 로컬 컨텍스트와도 불일치, family 전체와도 이탈.
- 실행: `rounded-md` → `rounded-lg` 정렬(family 13건과 완전 일치). `silent-drift-cycle-2595.test.ts` 신규(`app/contact/__tests__`).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `npx vitest run`(551 files/4426 tests, +1/+1) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.141 — 2026-08-25 (cycle 2594, review-code (heavy): spacing axis 첫 발견 — FactorBreakdown 카드 bg-gray-50/p-4 → bg-white/p-5 정렬)

### fix(predictions): FactorBreakdown 카드 padding/배경 정렬 — 팩터별 분석 family 정렬

- 진단: open issue 0, approved plan 0/23(전수 재확인 — 전부 completed/archived/superseded, status=approved 0건). 직전8(2586-2593) distinct=3(review-code 6+op-analysis 1+info-arch 1) — 2-chain lock 없음. fix-incident gh run list 전부 success — negative. op-analysis gap 8/25, lotto gap 26/30(픽스 8/29 + 결과 8/22 이미 박제됨), info-arch gap 7/30 미도달. cycle 2593 carry-over 추천대로 focus-ring axis 스윕 완료(잔여 ring 기반 0건) 판단 후 spacing axis 신규 정독.
- 발견: DESIGN.md Spacing 스펙(카드 padding 20px=p-5, 카드 gap 16px=gap-4) 대비 gap-3(180)/gap-4(90) 혼재는 그리드 밀도별 의도된 차이로 판단(raw count 만으론 drift 단정 불가 — Explore 서브에이전트로 sibling family 단위 재검증). "팩터별 분석" 카드 family(`DetailedFactorAnalysis.tsx`/`MlbDetailedFactorAnalysis.tsx`/`FactorBreakdown.tsx`, 각각 analysis/mlb+en/predictions+insights 라우트에서 동일 역할) 전부 `rounded-xl border ... p-5` + `bg-white` 인데 `FactorBreakdown.tsx`(`app/predictions/[date]`, `app/insights/[date]` 공용) 만 유일하게 `bg-gray-50` + `p-4` 로 이탈. 두 라우트 모두 standalone 카드로 렌더링(중첩 sub-card 아님) 확인 — 의도된 컴팩트 변형 아님.
- 실행: `p-4`→`p-5`, `bg-gray-50`→`bg-white` 정렬(sibling 2개와 완전 일치). `silent-drift-cycle-2594.test.ts` 신규(components/predictions/__tests__).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(550 files/4425 tests, +1/+2) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → 직접 main commit+push(R4/R7).

## v0.5.62.140 — 2026-08-25 (cycle 2593, review-code (heavy): focus-ring axis 스윕 — offset-1→2 + LeagueSelector ring→outline + dashboard/error.tsx outline-brand-500 누락 3건 정정)

### fix(a11y): focus-ring axis 3건 정렬 — 인라인 링크 offset / 헤더 LeagueSelector ring→outline / dashboard/error.tsx outline-brand-500 누락

- 진단: open issue 0, approved plan 0/23. 직전8(2585-2592) distinct=3(review-code 6+op-analysis 1+info-arch 1) — 2-chain lock 없음. fix-incident gap 20+/20 재점검(`gh run list --limit 15` 전부 success/skipped) — negative. op-analysis gap 7/25, lotto gap 25/30, info-arch gap 6/30 미도달. explore-idea saturation 14/15 재확인(TODOS Next-Up 신규리드 없음, plan#29 spec_only_deferred, GH issue 0, DESIGN.md mtime 당일=git checkout 부작용) — negative, 6연속 재소진. cycle 2592 carry-over 추천대로 shadow axis 완료 후 focus-ring axis 신규 정독.
- 발견: DESIGN.md 에 focus-ring 명시 스펙 없음 — 실측 컨벤션 대조. `focus-visible:outline-*` 314건 grep, dominant 패턴 = `outline` + `outline-2` + `outline-offset-2` + `outline-brand-500`(71~84건). 이탈 3건: (1) `analysis/page.tsx` line 530 인라인 텍스트 링크만 `outline-offset-1`, 나머지 11건 `offset-2` — 단일 파일 자체 불일치(선행 commit `e337f4c8` 로 정정 완료, VERSION/CHANGELOG 동기 누락 상태로 landing해 본 commit 이 회수). (2) `components/layout/LeagueSelector.tsx`(헤더 리그 탭) 만 유일하게 ring 기반(`focus-visible:ring-2 ring-brand-400`) — 같은 헤더 family(`MegaMenu.tsx` TRIGGER_BASE 주석 "focus-visible: outline-2 outline-brand-500" 명시 + `MobileNav.tsx` 항목들) 는 전부 outline 기반, 다른 ring 기반 잔존 0건. (3) `app/dashboard/error.tsx` 재시도 버튼이 sibling `app/error.tsx`(동일 에러 바운더리 패턴) 와 outline/outline-2/outline-offset-2 는 동일하나 `outline-brand-500` 색상만 누락.
- 실행: LeagueSelector 를 MegaMenu TRIGGER_BASE 와 동일 `focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500` 로 정렬. dashboard/error.tsx 에 `focus-visible:outline-brand-500` 추가. `silent-drift-cycle-2593.test.ts` 신규 2건(layout/__tests__, dashboard/__tests__) — analysis/__tests__ 쪽은 선행 commit 에 이미 포함.
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(549 files/4423 tests, +2/+5 이번 commit 기준) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4/R7). 선행 commit(`e337f4c8`)이 VERSION/package.json/CHANGELOG 동기 없이 landing한 걸 본 commit 이 3-way sync 로 회수(cycle 2592 pre-push guard fix a614ddc5 와 동일 family).

## v0.5.62.139 — 2026-08-25 (cycle 2592, review-code (heavy): 빅매치 카드 hover shadow drift 정정 — border-radius axis 완료 후 신규 shadow axis)

### fix(analysis): 오늘의 빅매치 카드 `hover:shadow-xl` → `hover:shadow-md` 정렬 — DESIGN.md 카드 hover 스펙 정정

- 진단: open issue 0, approved plan 0/23. 직전8(2584-2591) distinct=3(review-code 5+op-analysis 1+info-arch 2) — 2-chain lock 없음. fix-incident gap 20+/20 재점검(`gh run list --limit 15` 전부 success/skipped) — negative. op-analysis gap 5/25, lotto gap 23/30, info-arch gap 4/30 미도달. explore-idea saturation 14/15 재확인(TODOS Next-Up 사용자영역만, plan#29 spec_only_deferred, GH issue 0, DESIGN.md mtime 당일=git checkout 부작용) — negative, 5연속 재소진. cycle 2591 carry-over 추천대로 border-radius axis 스윕 완료 판단 후 신규 축(spacing/shadow/focus-ring) 정독.
- 발견: DESIGN.md Motion 섹션 "카드 hover: transition-shadow (hover:shadow-md)" 대비, 사이트 전체 `hover:shadow-*` 32건 grep — 31건 `hover:shadow-md`(dominant) vs `app/analysis/page.tsx` "오늘의 빅매치" CTA 카드 1건만 `hover:shadow-xl`. 정적 `shadow-*` 클래스도 `shadow-md` 28건 dominant(`shadow-lg` 1건은 skip-link 포커스 상태, 카드 범주 아님 — 범위 밖). 동일 hero-gradient 배경(`from-brand-800 to-brand-700` 계열) 쓰는 `mlb/matchup`/`mlb/accuracy` 헤더는 정적(비클릭) 이라 비교 대상 아니지만, 사이트 유일 인터랙티브 hero 카드가 유일하게 shadow 스펙에서도 이탈 — border-radius family(cycle 2583/2590/2591)와 별개 축, shadow axis 첫 발견.
- 실행: `hover:shadow-xl` → `hover:shadow-md` 정렬. `silent-drift-cycle-2592.test.ts` 신규(positive + negative assertion).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(546 files/4418 tests, +1/+2) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4/R7).

## v0.5.62.138 — 2026-08-25 (cycle 2587, info-architecture-review: 로또 `/lotto/check` 헤더 megamenu·footer sitemap 컬럼 누락 정정)

### fix(nav): `/lotto/check` 를 헤더 로또 megamenu + footer 로또 sitemap 컬럼에 추가 — 3번째 재발 IA gap

- 진단: open issue 0, approved plan 0/23. 직전8(2579-2586) distinct=3(review-code 6+polish-ui 1+op-analysis 1) — 2-chain lock 없음. fix-incident gap 23/20 재점검(`gh run list --limit 15` 전부 success/skipped/in_progress) — negative. op-analysis 방금 발화(gap 1), lotto gap 19/30, info-arch gap 10/30 미도달(주기 trigger 아님). explore-idea saturation 직전15(2572-2586)=13/15 충족되나 4-source 재확인(TODOS Next-Up 사용자영역 1-line, plan#29 Tier4, GH issue 0) 동일 negative. **신규 트리거 발견**: `git log --since="7 days ago" --diff-filter=A` 로 page.tsx 추가 확인 — 최근 7일 내 15개 이상 신규 라우트(EN/MLB 미러 다수 + `/lotto/check` 등) 추가, IA trigger(1) "라우트 신규 추가 ≥3/1주" 충족.
- 발견: 신규 라우트 breadcrumb/헤더/footer 전수 대조 — mlb 계열(analysis/methodology/reviews/misses 등)은 이미 헤더+footer 정합. `/lotto/check`(cycle 2019 `cb21e154` 배선, `/lotto` hub 링크 존재, sitemap.ts에도 cycle 2250에 이미 추가)만 헤더 `LOTTO_LINKS` megamenu + footer 로또 sitemap 컬럼 양쪽에서 빠짐. cycle 2225(`/mlb/matchup` footer 누락) + cycle 2153 과 동일 family — 신규 라우트 배선 시 헤더/footer 동기 누락 반복 패턴 3번째 재발.
- 실행: `Header.tsx` LOTTO_LINKS 에 `/lotto/check`(clipboard-check 아이콘) 추가, `Footer.tsx` 로또 컬럼에 동일 링크 추가 + ASCII sitemap wireframe 주석 갱신. `Footer.test.tsx` 로또 컬럼 assertion 3→4 link 로 갱신.
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball test`(541 files/4406 tests) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4/R7).

## v0.5.62.137 — 2026-08-25 (cycle 2585, review-code (heavy): 주간/월간 리뷰 헤드라인 적중 색상 drift 정정)

### fix(reviews): weekly/monthly 헤드라인 "적중"/"적중률"/"전월 대비" 색상 brand-500 정렬 — 병렬 마이그레이션 drift

- 진단: open issue 0, approved plan 0/23(전부 non-approved). 2-chain lock 없음(직전8=2577-2584 distinct=3: review-code 6+polish-ui 1+info-arch 1). fix-incident gap 21/20 mandatory 재점검(`gh run list --limit 15` 전부 success/skipped/in_progress, CI failure 0건) — negative. op-analysis gap 24/25, lotto gap 17/30, info-arch gap 8/30 미도달. explore-idea saturation 14/15 충족되나 4-source 재확인(TODOS Next-Up = 여전히 사용자 영역 1-line만, plan #29 Tier4 그대로, GH issue 0, 신규라우트 mtime -7 = git checkout 부작용) — negative, 4연속 재소진. DESIGN.md mtime 당일 = 동일 git checkout 부작용. 잔여 chain 전부 미충족 → review-code(heavy) 계속, cycle 2584 carry-over(`reviews/weekly/[week]`(529줄) + `reviews/monthly/[month]`(486줄) 미감사) 정독.
- 발견: 두 파일 헤드라인 "적중"/"적중률" 스탯 색상이 서로 다름 — weekly = `text-brand-500`(cycle 240 도입) vs monthly = `text-brand-600 dark:text-brand-400`(cycle 250 도입). `git log -S`로 확인한 결과 두 사이클이 각각 독립적으로 `text-green-*` → brand 토큰 마이그레이션을 수행하며 서로 다른 shade 로 landing — DESIGN.md "적중 표시 = brand-500" 문서화 규칙(cycle 50/65/456/744/2563 family) 6번째 재발. monthly "강수렴 픽" 라벨(`text-brand-600 dark:text-brand-400`, line 242/277)은 weekly 와 이미 동일해 범위 밖.
- 실행: monthly 헤드라인 3곳(적중/적중률/전월 대비, line 178/190/211) `text-brand-600 dark:text-brand-400` → `text-brand-500` 정정 — weekly + 문서 규칙 정렬. `silent-drift-cycle-2585.test.ts` 신규(양쪽 positive assertion + monthly 헤드라인 섹션 내 구 클래스 잔존 0건 negative assertion).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(541 files/4406 tests, +1/+3) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4/R7).

## v0.5.62.136 — 2026-08-25 (cycle 2583, review-code (heavy): 홈 일반 카드 4곳 rounded-2xl → rounded-xl 정렬)

### refactor(home): 홈 `page.tsx` 일반 카드 섹션 4곳 border-radius drift 정정 — DESIGN.md 히어로 전용 토큰 이탈

- 진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전8=2575-2582 distinct=3: review-code 7 + polish-ui 1). fix-incident gap 57/20 mandatory 재점검(`gh run list` 전부 success/in_progress) — negative. op-analysis gap 22/25, lotto gap 15/30, info-arch gap 6/30 미도달. explore-idea saturation 재확인 8 cycle 전 negative. DESIGN.md mtime 당일 = git checkout 부작용. 잔여 chain 전부 negative → review-code(heavy) dominance-positive streak 정합, cycle 2538/2582 carry-over "대형 미감사 파일" 순회 대상인 홈 `page.tsx`(1090줄) 정독.
- 발견: DESIGN.md border-radius 토큰 스펙(`lg: 12px — 카드(rounded-xl)` / `xl: 16px — 히어로 섹션(rounded-2xl)`) 대비, 홈 `page.tsx` 가 "경기 없음" fallback / "이번 주 일정" / "KBO 팀 순위" / "분석 방법론" 4개 **일반 카드 섹션**에 `rounded-2xl` 을 사용 — 같은 파일 안 "오늘 예측" 카드(744줄)는 이미 `rounded-xl` 로 정합. 사이트 전체 검증: `rounded-xl` 96파일(카드 dominant 컨벤션) vs `rounded-2xl` 12파일(전부 `bg-gradient-to-r from-brand-800 to-brand-700` 브랜드 히어로 헤더 전용 — accuracy/matchup/players 3개 sibling 페이지로 교차 확인) → 홈 page.tsx 만 4곳 이탈 확인.
- 실행: 4곳 `rounded-2xl` → `rounded-xl` 정정(히어로 플레이스홀더 배너는 `rounded-2xl` 유지). `silent-drift-cycle-2583.test.ts` 신규(정정 확인 + count assertion). border-radius 컨벤션 전면 스윕(102파일)은 100+파일 가드 대상이라 범위 밖 — 이번 cycle은 page.tsx 1파일 좁은 스코프만 처리.
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball test`(540 files/4403 tests, +1/+1) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4/R7).

## v0.5.62.135 — 2026-08-25 (cycle 2581, polish-ui — 2-chain lock fallback: "오늘의 탑픽" 배지 accent gold 정렬)

### fix(analysis): "오늘의 탑픽"(`isTopPick`) 배지 3-way 색상 drift 정정 → `var(--color-accent)` 통일

- 진단: open issue 0, approved plan 0/29. **2-chain alternation lock 발동** (직전 8사이클 2573-2580 distinct=2: review-code 7 + info-architecture-review 1) → 둘 다 후보 제외. fix-incident gap 55/20 mandatory 재점검(`gh run list` 최근 15건 전부 success/skipped) — negative. op-analysis gap 20/25, lotto gap 13/30 미도달. explore-idea saturation 12/15 충족되나 TODOS Next-Up/GH issue/plan gating 4-source 재확인이 8 cycle 전(cycle 2572) 이미 negative — 재소진 skip. DESIGN.md mtime 당일(git checkout 영향, 실제 갱신 아님) — design-system negative. 잔여 chain 전부 trigger 미충족 → lock fallback 규칙에 따라 `polish-ui` 강제 채택.
- 발견: DESIGN.md "Accent — 빅매치 뱃지, **승률 하이라이트**, 프리미엄 강조" 문구가 정확히 지칭하는 배지("오늘의 탑픽")가 실제로는 3갈래로 흩어져 있었음 — `app/analysis/page.tsx`(wave-377, KBO 원본) = `amber-300/500`, `mlb/analysis`+`mlb/games/[date]`+`en` 미러 4곳(wave-624/plan28 포팅) = `brand-500/400`. 같은 파일 바로 위 `isBig`("⭐ 빅매치") 배지는 이미 `var(--color-accent)` 정렬돼 있어 인접 대조군 — 두 배지가 같은 조건분기 트리 안에 있는데 색 체계만 서로 다른 채 방치. amber 는 factor 수렴 10/10 tier(2026-07-18 결정, `isTopUpcomingPick`/`isCompleteUpcomingPick` — 별개 문서화된 의미)와 우연히 겹치는 hue 라 혼동 소지도 있었음.
- 실행: 5개 파일(`analysis/page.tsx` + `mlb/analysis`, `mlb/games/[date]`, `en/mlb/analysis`, `en/mlb/games/[date]`) 전부 `border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20~30`(+텍스트 라벨) 정렬. `wave-624-mlb-games-top-pick.test.ts` 옛 `ring-brand-400` assertion 갱신 + `silent-drift-cycle-2581.test.ts` 신규(5파일, positive/negative assertion). DESIGN.md Decisions Log 항목 추가.
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball test`(539 files/4402 tests, +1 file) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4/R7).

## v0.5.62.134 — 2026-08-25 (cycle 2580, review-code (heavy): sitemap-mlb.test.ts 회귀 커버리지 공백 메꾸기)

### test(seo): `sitemap-mlb.test.ts` 에 monthly reviews / en-mlb weekly·monthly mirror / insights series 라우트 assertion 5개 추가 — cycle 2579 carry-over

- 진단: open issue 0, approved plan 0/23(전부 non-approved 재확인). 2-chain lock 없음(직전 8사이클 2572-2579 distinct=3: review-code 5+explore-idea 1+info-arch 1). fix-incident gap 54(마지막 2526) → mandatory 재점검: `gh run list --limit 15` 전부 success/skipped, CI failure 0건 — negative. op-analysis gap 19/25, info-arch gap 3/30, lotto gap 12/30 전부 미도달. explore-idea saturation 12/15 재충족되나 cycle 2572 4-source 재확인이 8 cycle 전 negative(TODOS/superpowers specs/GH issue/plan #29 gating 전부 동일 무성장) — 재소진 skip. cycle 2579 retro 명시적 carry-over(`sitemap-mlb.test.ts` 회귀 커버리지 공백) 그대로 처리.
- 발견: `sitemap.ts` 가 실제 생성하는 `/mlb/reviews/monthly/[month]`(mlbMonthlyReviewRoutes), `/en/mlb/reviews/weekly/[week]`(enMlbWeeklyReviewRoutes, wave-660 cycle 2355), `/en/mlb/reviews/monthly/[month]`(enMlbMonthlyReviewRoutes, cycle 2356), `/insights/series/[topic]`(insightsSeriesRoutes, 45 team-pair) 4개 라우트 그룹이 테스트 파일에 assertion 없이 방치 확인. 앞 3개는 `getRecentWeeks`/`getRecentMonths` 순수함수라 mock 불필요, 이미 존재하는 KBO/mlb weekly 테스트와 동일 패턴으로 즉시 assertion 추가 가능. `insights/series` 는 `listSeriesTopics` mock 이 항상 `[]` 반환하도록 박제돼 있어 실측 불가 상태였음 — 순수함수(DB 의존 없음, KBO_TEAMS 10개 조합 45쌍 고정 생성) 확인 후 `vi.importActual` 로 전환.
- 실행: `sitemap-mlb.test.ts` 에 5개 assertion 추가(mlb monthly reviews / en-mlb weekly mirror / en-mlb monthly mirror / insights series 45개 + redirect-only index 미노출 재확인 2건 포함) + `listSeriesTopics` mock을 `vi.importActual` 로 전환.
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball test`(538 files/4397 tests, +4) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4/R7).

## v0.5.62.133 — 2026-08-25 (cycle 2579, review-code (heavy): sitemap.ts `/search` robots.txt disallow 모순 제거)

### fix(seo): `sitemap.ts` 에서 `/search` URL 제거 — robots.ts disallow + page.tsx noindex 메타와 모순되는 인덱싱 시그널

- 진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전 8사이클 2571-2578 distinct=3: review-code 6+explore-idea 1+info-architecture-review 1). fix-incident gap 53/20 mandatory 재점검 — `gh run list` 최근 15건 전부 success/skipped, CI/lesson dispatch 정상 — negative. op-analysis gap 18/25, lotto gap 11/30, info-arch gap 2/30 전부 미도달. cycle 2576/2577/2578 이 SMALL_SAMPLE_N/PRODUCTION_COHORT_RULES/factor·pipeline comment-drift 3개 카테고리 연속 negative 확인 후 4th 카테고리(sitemap/robots 정합성, 컴포넌트 중복)로 scope 확장.
- 발견: Explore agent 전수 sweep — `sitemap.ts:54` 가 `/search` 를 인덱싱 대상(weekly, priority 0.5)으로 노출하지만, `robots.ts:18/24/31/38` 전체 UA 대상 disallow 설정 + `search/page.tsx:38` 자체 `robots:{index:false,follow:true}` 메타 양쪽 모두 비인덱싱 지시. 3개 신호 중 sitemap 만 역행 — 모순된 크롤 시그널. 다른 disallow 경로(`/debug/*`, `/login`, `/settings`, `/community`)는 이미 sitemap 미노출 정상. 부가 발견(이번 cycle 미처리, 다음 cycle carry-over): `sitemap-mlb.test.ts` 가 monthly reviews/en-mlb weekly·monthly mirror/insights series 라우트 assertion 부재 — 회귀 커버리지 공백. 컴포넌트 중복은 대부분 의도된 분리(주석 명시), `MatchupEloChart`/`MlbMatchupEloChart` 1쌍만 90%+ 동일(자체 주석 "props shape 동일") — 병합 후보이나 이번 cycle scope 밖.
- 실행: `sitemap.ts:54` `/search` entry 제거 + 근거 주석 추가.
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball test`(538 files/4393 tests, 변경 없음 — 회귀 테스트 미신규, `/search` 미테스트 확인됨) 전체 통과. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.132 — 2026-08-25 (cycle 2575, review-code (heavy): 팀/선수 프로필 SEO description 소표본 게이트 신규 — SMALL_SAMPLE_N family 16번째 재발)

### fix(teams,players): `teams/[code]`, `mlb/team/[code]`, `en/mlb/team/[code]`, `players/[id]` generateMetadata description + JSON-LD description에 소표본(n<5) 조건부 힌트 신규 — 페이지 레이어와 별개의 SEO/소셜 미리보기 레이어 desync

- 진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전 8사이클 2567-2574 distinct=3: review-code 5+explore-idea 2+lotto 1). fix-incident mandatory 재점검(gap 30+): `gh run list --status failure` 재확인, `deploy-drift-alert` 마지막 실패 8/24 17:44 이후 6+연속 success 지속 — negative. op-analysis gap 14/25, info-arch gap 28/30, lotto gap 7/30, explore-idea saturation 11/15, DESIGN.md 당일 갱신(design-system 미도달) 전부 미도달. cycle 2574 retro 추천대로 review-code(heavy) 잔여 미감사 후보 순회 — `grep -rl SMALL_SAMPLE_N` 로 게이트 커버리지 전수 매핑, reviews 트리(weekly/monthly index, misses)는 accuracy 헤드라인 자체가 없어 negative, standings.tsx는 이미 `isReliable` 게이트 정상 확인.
- 발견: `players/[id]/page.tsx` generateMetadata description(`예측 적중률 ${fmtPct(...)}`)이 페이지 본문(라인 176-186, `verifiedN < SMALL_SAMPLE_N` 조건부 "소표본" 힌트)과 달리 표본 크기 무관 raw % 노출 확인. 동일 패턴을 `teams/[code]`(generateMetadata description + JSON-LD description 2곳), `mlb/team/[code]`(JSON-LD description), `en/mlb/team/[code]`(JSON-LD description)에서도 재확인 — 총 4파일 7곳. 페이지 본문은 전부 이미 게이트 적용돼 있었으나 SEO 메타/OG/JSON-LD 레이어만 별도 desync — 검색엔진·소셜 미리보기가 n<5 표본의 오해 소지 있는 % 그대로 인덱싱하는 silent drift, SMALL_SAMPLE_N family 16번째 재발이자 첫 메타데이터 레이어 사례.
- 실행: 4파일 7곳에 `verifiedN > 0 && verifiedN < SMALL_SAMPLE_N` 조건부 "(소표본 n<5)"/"(small sample n<5)" 접미사 추가 (페이지 본문 문구 컨벤션 재사용). 회귀 테스트 `silent-drift-cycle-2575.test.ts` 신규(6 assertion, `app/teams/__tests__/`).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `npx vitest run`(538 files/4393 tests, +1 file/+6) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.131 — 2026-08-25 (cycle 2574, review-code (heavy): en/mlb reviews weekly/monthly 헤드라인 accuracy 소표본 게이트 동기화)

### fix(reviews): `en/mlb/reviews/weekly/[week]` + `en/mlb/reviews/monthly/[month]` 헤드라인 "Accuracy" 스탯에 소표본(n<5) 인라인 표시 신규 — SMALL_SAMPLE_N family 15번째 재발 (locale mirror desync)

- 진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전 8사이클 2566-2573 distinct=3: review-code 5+explore-idea 2+lotto 1). fix-incident gap 20+/20 도달 → mandatory 재점검: `gh run list --status failure` 재확인, `deploy-drift-alert` 마지막 실패 8/24 17:44 이후 신규 실패 0건, 9+연속 success 지속 회복 — negative. op-analysis gap 13/25, info-arch gap 27/30, lotto gap 6/30, explore-idea saturation 11/15, design-system(DESIGN.md 당일 갱신) 전부 미도달. cycle 2573 retro 추천대로 en/ 다국어 미러 페이지 순회.
- 발견: cycle 2573 이 KBO `reviews/weekly/[week]`·`reviews/monthly/[month]` 헤드라인 "적중률"에 `verifiedGames < SMALL_SAMPLE_N` 게이트를 추가했지만, en/mlb 미러 페이지(`en/mlb/reviews/weekly/[week]`, `en/mlb/reviews/monthly/[month]`)는 같은 fix 가 반영 안 됨 — 헤드라인 "Accuracy" 스탯이 표본 크기 무관 렌더링. 두 미러 파일 모두 팀별 성과 테이블(`smallSample = t.predicted < SMALL_SAMPLE_N`)엔 게이트가 있으나 헤드라인엔 부재 — KBO 원본과 en 미러 사이 fix 전파 지연 (locale mirror desync) 패턴, SMALL_SAMPLE_N family 15번째 재발.
- 실행: 두 파일 헤드라인 "Accuracy" `<p>` 안 `review.verifiedGames < SMALL_SAMPLE_N` 조건부 "Small sample (n&lt;5)" 인라인 힌트 추가 (KBO 원본 문구 영문 번역 컨벤션 재사용). 회귀 테스트 `silent-drift-cycle-2574.test.ts` 신규(3 assertion, `app/en/mlb/reviews/__tests__/`).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(537 files/4387 tests, +1 file/+3) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.130 — 2026-08-25 (cycle 2573, review-code (heavy): reviews weekly/monthly 헤드라인 적중률 소표본 게이트 추가)

### fix(reviews): `reviews/weekly/[week]` + `reviews/monthly/[month]` 헤드라인 "적중률" 스탯에 소표본(n<5) 인라인 표시 신규 — SMALL_SAMPLE_N family 14번째 재발

- 진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전 8사이클 2565-2572 distinct=3: review-code 5+explore-idea 2+lotto 1). fix-incident gap 20+/20 도달 → mandatory 재점검: `gh run list --status failure` 재확인, `deploy-drift-alert` 8/24 17:44 산발 실패 1건이나 8/24 18:56 부터 지속 회복(9연속 success) — negative. op-analysis gap 12/25, info-arch gap 26/30, lotto gap 5/30, explore-idea saturation 11/15, design-system(DESIGN.md 당일 갱신) 전부 미도달. cycle 2572 retro 추천대로 미감사 후보(`insights/[date]`, `predictions/[date]`, `reviews/weekly|monthly`) 순회.
- 발견: `insights/[date]/page.tsx`(적중률 표시 없음, 대상 아님)와 `predictions/[date]/page.tsx`(SMALL_SAMPLE_N 게이트 이미 적용, cycle 2571 insights/series fix 와 동일 패턴)는 이미 정상. 반면 `reviews/weekly/[week]/page.tsx`·`reviews/monthly/[month]/page.tsx` 는 팀별 성과 테이블(라인 362/352, `smallSample = t.predicted < SMALL_SAMPLE_N`)엔 게이트가 있지만, 페이지 최상단 헤드라인 "적중률"(`review.accuracyRate` 기반 `pctLabel`)엔 표본 크기 무관 렌더링 — 형제 페이지(`predictions/[date]`, `insights/series/[topic]`)와 대조적. ISO 캘린더 주/월 경계(시즌 개막 주 개막일이 주중, 올스타 휴식주, 시즌 종료월 등)엔 `verifiedGames` < 5 가능.
- 실행: 두 파일 헤드라인 "적중률" `<div>` 안 `review.verifiedGames < SMALL_SAMPLE_N` 조건부 "소표본(n&lt;5)" 인라인 힌트 추가(형제 페이지 문구 컨벤션 재사용). 회귀 테스트 `silent-drift-cycle-2573.test.ts` 신규(3 assertion, `app/reviews/__tests__/`).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(536 files/4384 tests) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.129 — 2026-08-25 (cycle 2565, review-code (heavy): `MlbAccuracyDashboard.tsx` 팀 테이블 게이트 로컬 shadow 상수 제거)

### refactor(accuracy): `MlbAccuracyDashboard.tsx` 팀별 성과 테이블 게이트가 로컬 `TEAM_TABLE_MIN_N=3` 대신 import 된 `MIN_TEAM_PREDICTIONS` 재사용 — MIN_TEAM_PREDICTIONS family 재발

- 진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전 8사이클 2557-2564 distinct=3: review-code 6+operational-analysis 1+polish-ui 1). fix-incident negative(`gh run list` 최근 10건 전부 success/skipped). op-analysis(gap 4/25)/design-system(DESIGN.md 당일 갱신)/info-arch(gap 18/30)/lotto 모두 gap 미도달. explore-idea saturation 11/15 미도달. cycle 2562 retro 추천대로 `apps/moneyball/src/components` 대형 파일 순회 계속 — `PredictionCard.tsx`(마지막 터치 cycle 1870, 695 사이클 미터치)/`PredictionCardLive.tsx`/`MlbAccuracyDashboard.tsx` 순차 조사. 앞 둘은 SMALL_SAMPLE_N family 미해당(단일 경기 신뢰도 표시, 통계 rate 아님) 확인 후 제외 — false positive 회피.
- 발견: `MlbAccuracyDashboard.tsx` 가 `@moneyball/shared` 의 `MIN_TEAM_PREDICTIONS`(=3) 를 import 하면서도 팀별 성과 테이블 게이트(구 라인 388/391)엔 별도 로컬 `const TEAM_TABLE_MIN_N = 3` 를 선언해 사용 — cycle 2528 fix 가 동일 파일의 `cohortWeekHeatmap` 섹션은 `MIN_TEAM_PREDICTIONS` 로 swap 했지만 팀 테이블 섹션은 놓침(같은 파일 안 2개 게이트 중 1개만 정정된 partial fix). 현재 값이 우연히 3=3 이라 동작은 동일하지만 공유 상수가 바뀌면 이 섹션만 silent 하게 divergence — MIN_TEAM_PREDICTIONS/SMALL_SAMPLE_N family 재발 패턴.
- 실행: 로컬 `TEAM_TABLE_MIN_N` 상수 선언 제거, 사용처 2곳을 `MIN_TEAM_PREDICTIONS` 로 직접 교체(KBO `/accuracy/page.tsx` 팀 테이블과 동일 패턴 정합). 회귀 테스트 `silent-drift-cycle-2565.test.ts` 신규(3 assertion, `app/accuracy/__tests__/` — cycle 2528 테스트와 동일 위치 컨벤션).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(536 files/4384 tests, +3) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.128 — 2026-08-25 (cycle 2563, polish-ui: 적중 표시 green→brand 토큰 정렬)

### style(design): `mlb/analysis`(KBO+en 미러) + `DailyPredictionSummaryBar` 적중 표시 green→brand-500 정렬 — "적중=brand-500" family 재발

- 진단: 2-chain lock 탐지(직전 8사이클 2555-2562 distinct=2: review-code 6 + operational-analysis 2) → 두 chain 이번 사이클 후보 제외. fix-incident negative(`gh run list` 전부 success/skipped). op-analysis/review-code lock 제외. design-system negative(DESIGN.md 2일 전 갱신, 4주 미달). info-arch(gap 16/30)/lotto(gap 25/30, 다음 토 picks 이미 존재) 모두 gap 미도달. explore-idea saturation 11/12 미도달(근접). 어떤 chain 도 trigger 미충족 → lock 규칙의 fallback `polish-ui` 강제 발화.
- 발견: DESIGN.md Decisions Log(2026-05-05/05-20)가 확립한 "적중 표시 = brand-500, 오답/실패 = red" 컨벤션을 grep 대조한 결과 `app/mlb/analysis/page.tsx`(및 `en/mlb/analysis/page.tsx` 미러) "어제 결과" 리스트의 적중 상태 텍스트와 `DailyPredictionSummaryBar.tsx`(최고 자신감 픽 적중 마크 + 적중률 배지)가 Tailwind 기본 `green-*`(브랜드 그린 `#2d6b3f`과 분리된 별개 hue)을 그대로 사용 — cycle 50/65/456/744에 이은 동일 silent drift family 5번째 재발. lotto ball `green` 키(공식 로또 45번대 볼 색상)와 `AgentVoteCard`의 emerald(홈/원정/심판 5-역할 categorical 색상, 박빙-적중 purple 3rd-tier와 동일 "이분법 밖 허용" 패턴)는 의도된 사용으로 확인 후 제외.
- 실행: 3개 파일 `text-green-600 dark:text-green-400` → `text-brand-600 dark:text-brand-400`, `bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400` → `bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400`. `/debug/*` 내부 전용 페이지는 CLAUDE.md 예외(사용자 비가시)로 범위 제외. DESIGN.md Decisions Log 신규 엔트리 추가. 회귀 테스트 `silent-drift-wave-675.test.ts` 신규(3 assertion).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(533 files/4374 tests, +1) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.127 — 2026-08-25 (cycle 2562, review-code (heavy): `MyPicksClient` 내/AI 적중률 히어로 소표본 게이트 부재)

### fix(picks): `MyPicksClient.tsx` "내 적중률"/"AI 적중률" 히어로 스탯에 소표본(n<5) 인라인 표시 신규 — SMALL_SAMPLE_N family 12번째 재발

- 진단: open issue 0, approved plan 0/23(전부 status≠`approved`). 2-chain lock 없음(직전 8사이클 distinct=3: review-code/operational-analysis/explore-idea). fix-incident negative(`gh run list` 최근 10건 전부 success/skipped). op-analysis(gap 6/25)/info-arch(gap 15/30)/lotto(gap 24/30, 다음 토 picks 이미 존재) 모두 gap 미도달. explore-idea saturation 11/15 미도달. DESIGN.md 1일 전 갱신 — design-system negative. `최초 전체 감사` 전수 grep(66건)으로 미감사 파일 탐색 — analysis/accuracy/home/predictions/teams/matchup/mlb 라우트 다수 재확인했으나 전부 이미 감사 완료. `apps/moneyball/src/components` 대형 파일 재조사 결과 `MyPicksClient.tsx`(435줄, 마지막 터치 cycle 1585, `최초 전체 감사` 이력 0건 — 순수 함수 `buildPicksStats.ts` 만 cycle 2496 감사됨)를 신규 타겟으로 선정.
- 발견: "내 적중률"/"AI 적중률" 히어로 `StatCard` 가 `stats.myRate`/`stats.aiRate` 를 표본 크기 무관 렌더링 — sub 라인에 원본 분수("1/1" 등)는 항상 표시되지만, 코드베이스 전역 컨벤션(`AccuracyHeaderCard`/`TeamMatchupCards`/`AccuracySummary` 등)이 요구하는 `SMALL_SAMPLE_N` 명시적 소표본 힌트(딤 처리 또는 인라인 라벨)는 부재 — 분수만으론 평균 사용자에게 "이 %는 불안정" 신호가 전달 안 됨(TeamMatchupCards fix, cycle 2499 선례와 동일 논리).
- 실행: `SMALL_SAMPLE_N` import, `StatCard` 에 `smallSample` prop 추가 → `stats.resolved < SMALL_SAMPLE_N`(내 적중률)/`stats.aiResolved < SMALL_SAMPLE_N`(AI 적중률) 시 인라인 "소표본(n<5)" 노출. 회귀 테스트 `silent-drift-wave-674.test.ts` 신규(4 assertion).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(532 files/4371 tests, +1) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.126 — 2026-08-25 (cycle 2560, review-code (heavy): `game-record-features.ts` dead export 2건 정리)

### refactor(kbo-data): `bullpenAppearancesLastNDays`/`teamRunDiffLastN` dead code 제거

- 진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전 8사이클 distinct=3: review-code/explore-idea/operational-analysis). fix-incident negative(`gh run list` 최근 10건 전부 success/skipped). op-analysis gap 4/25 미도달 — CE cohort heavy 방금 발화(2556) + lite cohort-split 스크립트 수동 실행 결과 자동 cron 산출물(`apps/moneyball/data/op-analysis/2026-08-24-cohort-split.md`)과 완전 동일 확인, 신규 정보 없음(cron 중복 실행 회피 교훈). explore-idea 5연속 lite 소진 유지. design-system/info-arch/lotto 모두 gap 미도달. cycle 2557/2558/2559 3연속 review-code SMALL_SAMPLE_N family 재확인 권고에 따라 review-code 잔존 재탐색 — cycle 2559 TODOS 에 "fix 가치 낮아 보류" 로 남아있던 dead export 후보 재검토.
- 발견: `game-record-features.ts` 의 `bullpenAppearancesLastNDays`/`teamRunDiffLastN` 두 export 가 자체 테스트 파일 외 어디에서도 (특히 production consumer `backtest/loader.ts`) import 되지 않음 확인 — 형제 함수 4개(`bullpenInningsLastNDays`/`teamRunsPerGameLastN`/`teamRunsAllowedPerGameLastN`/`teamHomeRunsLastN`)는 모두 `loader.ts` 에서 실사용 중이라 대조적. CLAUDE.md "확실히 미사용이면 완전 삭제" 원칙 적용.
- 실행: 두 함수 + 대응 `__tests__/features-game-record.test.ts` describe 블록 삭제(2 테스트 제거). `pnpm --filter @moneyball/kbo-data test`(91 files/1188 tests) + `type-check` + `lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.125 — 2026-08-25 (cycle 2558, review-code (heavy): `agent_memories` 학습 경로 shadow-only 0% factor 미필터)

### fix(agents): `retro.ts` `buildMemoryForTeam` — `park_weather`/`umpire_sz`(DEFAULT_WEIGHTS weight=0) 가 필터 없이 maxBias 후보에 포함되던 gap 정정

- 진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전 8사이클 distinct=4: review-code/skill-evolution/explore-idea/operational-analysis). fix-incident gap 32/20 도달 → 마이너 체크: `pipeline_runs` 최근 7일(166건) error 3건 = `mlb_fancy_scrape` fangraphs HTTP 403 3일 연속(8/19~21) 후 8/22부터 자연 회복, 현재 재발 없음 — negative. op-analysis 방금 발화, info-arch/lotto/design-system 모두 negative(breadcrumb "누락" 2건은 placeholder/redirect 전용 페이지라 오탐, DESIGN.md 2일 전 갱신). explore-idea 5연속 소진 + TODOS Next-Up 신규 리드 없음 재확인 → review-code(heavy) 재탐색, SMALL_SAMPLE_N family(11회) 소진 확정 후 신규 영역 탐색.
- 발견: `postview.ts` 는 cycle 1013 M-F1/M-F2 에서 `isWeightedFactor`(DEFAULT_WEIGHTS weight>0 만) 가드로 "0% factor 가 LLM reasoning 70% 차지" silent drift 를 막았고, MLB 쪽 `mlb-retro.ts` 도 자체 `MEMORY_CANDIDATE_KEYS` 화이트리스트로 elo/placeholder 상수 factor 를 명시적으로 배제 — 그러나 두 함수가 공유하는 `retro.ts` 원본 `buildMemoryForTeam` 은 `Object.entries(factors)` 전체에서 maxBias 를 뽑아, shadow-only factor(`park_weather`/`umpire_sz`, cycle 1013 도입)가 필터 없이 후보에 남아있었음. 현재는 두 factor 모두 symmetric 구현(homeAdj===awayAdj)이라 bias 항상 0 이라 실질 노출은 없었지만, park-weather.ts/umpire-sz.ts 주석의 "비대칭 도입 시" 시나리오가 실현되면 `agent_memories` 에 0% factor 가 학습되어 향후 team-agent 프롬프트에 그대로 노출되는 동일 family 재현 경로였음.
- 실행: `DEFAULT_WEIGHTS` weight=0 키 집합(`ZERO_WEIGHT_FACTOR_BASES`) + `postview.ts` 의 `canonicalizeFactorKey` 재사용(prefix 유무 무관 매칭)으로 `buildMemoryForTeam` maxBias 루프에 제외 가드 추가. 미등록 factor key(향후 predictor 확장 대비 raw fallback) 는 그대로 허용 — `isWeightedFactor` 전체 재사용 대신 exclude-set 방식으로 기존 fallback 테스트 의도 보존. 회귀 테스트 3건 추가(`agents-retro-classify.test.ts`: 비prefix/prefix shadow factor 제외 + shadow factor 만 있을 때 null).
- `pnpm --filter @moneyball/kbo-data test`(91 files/1190 tests) + `type-check` + `lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.124 — 2026-08-25 (cycle 2555, review-code (heavy): predictions 페이지 `AccuracyHeaderCard` 누적 적중률 소표본 게이트 부재)

### fix(predictions): `AccuracyHeaderCard` 헤드라인 "누적 적중률" 스탯에 소표본(n<5) 인라인 표시 신규 — KBO/MLB/영문 predictions 페이지 3곳 공통 사용 컴포넌트에만 관례 부재

- 진단: open issue 0, approved plan 0/23(전부 status≠`approved`). 2-chain lock 없음(직전 8사이클 distinct=4: review-code 4 + skill-evolution/info-arch/explore-idea 각 1). fix-incident negative(`gh run list` 최근 10건 전부 success), op-analysis/info-arch/lotto 모두 gap 미도달. cycle 2554 explore-idea lite 5th 소진 재확인 후 review-code(heavy) 재탐색 권고.
- 발견: `AccuracyHeaderCard.tsx`(predictions/mlb-predictions/en-mlb-predictions 3개 라이브 라우트 공통 사용) 헤드라인 "누적 적중률" %는 `MIN_VERIFIED_GAMES_HEDGE`/`STATS_RELIABLE_MIN_N` 게이트가 최근 트렌드·티어 breakdown 표시 여부에만 쓰이고, 메인 % 자체는 `totalVerified===0` 외 어떤 소표본 안내도 없이 노출 — SMALL_SAMPLE_N family 11번째 연속 재발.
- 실행: `SMALL_SAMPLE_N` import 추가, 헤드라인 % 아래 `totalVerified < SMALL_SAMPLE_N` 조건부 인라인 "소표본(n<5)" 표시 추가(ko/en). 회귀 테스트 `silent-drift-wave-673.test.ts` 신규(3 assertion).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(531 files/4367 tests). 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.123 — 2026-08-25 (cycle 2553, review-code (heavy): 커뮤니티 vs AI 대결 · MLB accuracy 히어로 소표본 게이트 부재)

### fix(accuracy): "커뮤니티 vs AI 대결" AI 정답률 + MLB accuracy 히어로 전체 적중률 스탯에 소표본(n<5) 게이트 신규 — 다른 계열엔 다 있던 관례가 이 두 곳엔 없었음

- 진단: open issue 0, approved plan 0/23(전부 status≠`approved`). 2-chain lock 없음(직전 8사이클 distinct=3: review-code 6 + skill-evolution 1 + info-arch 1). fix-incident gap 20+/20 도달했으나 `gh run list --limit 10` 재확인 — 최근 10건 전부 success, CI 실패 0건, negative. op-analysis 23/25, info-arch 6/30, lotto 15/30 모두 미도달. cycle 2552 retro가 family 지속 또는 소진 시 explore-idea redirect 명시 — 직전 9-cycle family sweep 잔여 재확인.
- 발견: (1) `accuracy/page.tsx`(KBO) 커뮤니티 vs AI 인라인 섹션과 이를 추출한 공유 컴포넌트 `CommunityVsAICard.tsx`(explore-idea cycle 2544, MLB 배선) 모두 `communityGames >= MIN_POLL_TOTAL`(=3)만 게이트, AI 정답률(`aiAccuracyWithPoll`)은 독립적으로 더 적은 `aiGamesWithPoll`(3~4건) 기준으로도 `SMALL_SAMPLE_N` 안내 없이 그대로 노출 — KBO 원본에 이미 있던 부재가 컴포넌트 추출 시 그대로 계승. (2) `MlbAccuracyDashboard.tsx` 히어로 "전체 적중률" StatCard는 `SMALL_SAMPLE_N` import 자체가 없어 verifiedN=1이어도 브랜드색 강조 그대로 노출, 내부 calibration bucket/섹션 게이트는 상수 대신 하드코딩 리터럴 `5` 사용(단일 출처 원칙 위반, 값 자체는 현재 일치).
- 실행: `accuracy/page.tsx` + `CommunityVsAICard.tsx`(ko/en 로케일) AI 정답률 스탯에 `aiGamesWithPoll < SMALL_SAMPLE_N` 조건부 색상/title/인라인 `· 소표본(n<5)` 표시 추가. `MlbAccuracyDashboard.tsx` 히어로 StatCard에 동일 게이트 추가(accent 조건에 `verifiedN >= SMALL_SAMPLE_N` 포함) + 하드코딩 리터럴 `5` 2곳을 `SMALL_SAMPLE_N` 상수로 교체. 회귀 테스트 `silent-drift-wave-672.test.ts` 신규(9 assertion).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(530 files/4364 tests) + `pnpm --filter moneyball run lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.122 — 2026-08-25 (cycle 2548, review-code (heavy): `predictions/[date]` 헤더 적중률 소표본 게이트 부재)

### fix(predictions): 날짜별 예측 페이지 헤더 "적중률 N%" 텍스트에 소표본(n<5) 인라인 표시 신규 — accuracy/matchup/homepage 계열엔 다 있던 관례가 일별 예측 페이지 헤더엔 없었음

- 진단: open issue 0, approved plan 0/29(전부 status≠`approved`). 2-chain lock 없음(직전 8사이클 distinct=3: explore-idea/review-code/info-architecture-review). gap trigger 재계산(fix-incident 20+/20 도달했으나 `gh run list` scheduled workflow 전부 success, CI 실패 0건 — negative) + op-analysis 18/25 + info-arch 1/30(cycle 2547 직후 리셋) + lotto 10/30 모두 미도달. cycle 2547 retro가 review-code(heavy) 재탐색 권고.
- 발견: `predictions/[date]/page.tsx` 헤더의 `적중률 {rate}% ({correctN}/{totalN})` 텍스트는 `SMALL_SAMPLE_N` import 자체가 없어, 하루 1~2경기만 검증된 이른 시각에도 소표본 안내 없이 노출 — matchup/accuracy/WeeklyTrendMini 계열엔 이미 있던 관례 부재.
- 실행: `SMALL_SAMPLE_N` import + `totalN < SMALL_SAMPLE_N` 조건부로 헤더 스탯 옆에 `· 소표본(n<5)` 인라인 표시 추가 (WeeklyTrendMini 툴팁 관례 재사용). 메타 description/OG/공유 텍스트 3곳(line 215/219/252/595)은 색상 강조 없는 요약 문구라 스코프 밖 유지. 회귀 테스트 `silent-drift-wave-668.test.ts` 신규(3 assertion).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(526 files/4339 tests) + `pnpm --filter moneyball run lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.121 — 2026-08-25 (cycle 2546, review-code (heavy): 홈페이지 "최근 4주 성과" 히어로 통계 소표본 게이트 부재)

### fix(dashboard): `WeeklyTrendMini` (홈페이지 "최근 4주 성과" 카드) 히어로 % + 막대그래프 색상 + 툴팁에 소표본(n<5) 게이트 신규 — accuracy/analysis/matchup 계열엔 다 있던 관례가 홈페이지 최상단 통계엔 없었음

- 진단: open issue 0, approved plan 0/23(전부 status≠`approved`). 2-chain lock 없음(직전 8사이클 distinct=3: lotto/review-code/explore-idea). gap trigger 재계산(fix-incident 20/20 도달했으나 `gh run list` scheduled workflow 전부 success, CI 실패 0건 — 실제 인시던트 부재로 lite 체크 negative) + op-analysis 16/25 + info-arch 29/30 + lotto 8/30 모두 미도달. cycle 2545 retro가 소표본 게이트 family 4-cycle 연속 후 신규 target 재탐색 필요 명시 → 아직 감사 안 된 대형 파일(`page.tsx` 홈, `predictions/[date]/page.tsx`) 및 `WeeklyTrendMini` 등 홈페이지 컴포넌트 재탐색.
- 발견: 홈페이지 본문(`page.tsx`)의 팀별 적중률 등은 이미 `SMALL_SAMPLE_N` 게이트가 있었으나, `getRecentWeeksAccuracy()` 결과를 렌더하는 `WeeklyTrendMini` 컴포넌트는 `barColor()`가 `verified === 0`만 확인(1건이어도 색상 강조), 히어로 `currentPct`(이번 주 %)도 `verified > 0`만 확인해 `SMALL_SAMPLE_N` import 자체가 없었음 — 홈페이지 최상단 노출 통계라 노출 빈도상 다른 케이스보다 영향 큼.
- 실행: `SMALL_SAMPLE_N` import + `barColor()` 임계 `verified === 0` → `verified < SMALL_SAMPLE_N` 교체 + 히어로 % 텍스트 색상/title 툴팁 조건부(matchup 관례 재사용) + "이번 주" 라벨에 `· 소표본` 인라인 표시 + 막대 툴팁에 `· 소표본(n<5)` 표시 추가. 회귀 테스트 `silent-drift-wave-667.test.ts` 신규(4 assertion).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(525 files/4336 tests) + `pnpm --filter moneyball run lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.120 — 2026-08-25 (cycle 2545, review-code (heavy): matchup 페이지 3종 "AI 예측 성과" 소표본 게이트 부재)

### fix(matchup): `matchup/[teamA]/[teamB]`, `mlb/matchup/[teamA]/[teamB]`, `en/mlb/matchup/[teamA]/[teamB]` "AI 예측 성과 (이 매치업 한정)" 카드에 소표본(n<5) 흐림 처리 + 안내 신규 — accuracy/analysis 계열 페이지엔 다 있던 관례가 matchup 3종엔 없었음

- 진단: open issue 0, approved plan 0/29. 2-chain lock 없음(직전 8사이클 distinct=3: review-code/explore-idea/lotto). gap trigger 4종 미도달(fix-incident 19/20, op-analysis 15/25, info-arch 28/30, lotto 7/30). CI 최근 실패 0건. cycle 2544 retro가 소표본 게이트 family(2541~2543) 소진 가능성 명시했으나, 대형 파일 3개(`analysis/page.tsx` 2833줄, `accuracy/page.tsx` 1220줄, `teams/[code]/page.tsx` 622줄) 감사 완료 후 인접 미감사 파일(matchup 페이지 3종) 재탐색.
- 발견: `teams/[code]/page.tsx`·`mlb/team/[code]/page.tsx`·`en/mlb/team/[code]/page.tsx`는 이미 `SMALL_SAMPLE_N` 게이트(적중률 카드)를 갖고 있는데, 같은 "예측 정확도 색상 강조" 패턴을 쓰는 matchup 페이지 3종(`AI 예측 성과 (이 매치업 한정)` / `AI Prediction Performance`)은 `predictionAccuracy.verified > 0`만 확인하고 `SMALL_SAMPLE_N` import 자체가 없어, 두 팀 간 검증 경기가 1~2건뿐이어도 100%/0%를 브랜드색/빨강으로 그대로 강조 노출.
- 실행: 3개 파일 각각 `SMALL_SAMPLE_N` import + `predictionAccuracy.verified < SMALL_SAMPLE_N` 시 회색 처리 + title 툴팁 + 인라인 `· 경기 수 적음`(EN `· small sample`) 안내(teams/[code] 관례 재사용). 회귀 테스트 `silent-drift-wave-666.test.ts` 신규(3파일 × 3assertion = 9건).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(524 files/4332 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.119 — 2026-08-25 (cycle 2544, explore-idea (heavy): /mlb/accuracy·/en/mlb/accuracy 커뮤니티 vs AI 대결 섹션 parity 추가)

### feat(mlb): `/mlb/accuracy` · `/en/mlb/accuracy` 에 "커뮤니티 vs AI 대결" 섹션 신규 — KBO `/accuracy` 에는 있던 픽 투표 다수결 vs AI 정확도 비교가 MLB 쪽엔 부재였던 gap

- 진단: EN/KO route parity, JSON-LD 커버리지, PWA/RSS/공유버튼 등 최근 exhausted 항목 재확인 후 KBO vs MLB 페이지 트리·컴포넌트 사용처 전수 비교(convergence badge, streak, H2H, PickButton 계열). `PickButton`(cycle 2540 이후) 은 이미 양쪽 wired. `mlb_pick_poll_events`/`mlb-poll`/`mlb-submit` API 도 이미 존재해 MLB 커뮤니티 투표 자체는 정상 수집 중이었으나, 그 데이터를 소비하는 화면이 `/mlb/accuracy`·`/en/mlb/accuracy` 어디에도 없어 KBO `/accuracy` 대비 명확한 기능 gap 확인.
- 발견: KBO `/accuracy` 는 `computeCommunityVsAI`(game_id 정수 키, `pick_poll_events` + `games` 테이블) 로 인라인 섹션을 렌더하지만, MLB 는 `external_game_id`(VARCHAR) 키 + `predictions.is_correct` 전량 NULL(팀이 string 코드라 INT FK 컬럼이 애초에 안 맞음, `deriveMlbOutcome.ts` 기존 주석) 이라 기존 함수를 그대로 재사용 불가 — 별도 구현 필요했던 게 안 만들어진 채 방치.
- 실행: `computeMlbCommunityVsAI`(`lib/picks/buildCommunityAccuracy.ts`, `deriveMlbOutcome` 로 home_win_prob+실제 스코어에서 AI 정답 여부 derive) + `buildMlbCommunityVsAI`(`lib/mlb/buildMlbCommunityAccuracy.ts`, `mlb_pick_poll_events`+`mlb_schedule`(final)+`predictions`(league=mlb, cohort filter) 조합) + `CommunityVsAICard`(KBO 인라인 UI를 locale-aware 컴포넌트로 추출) 신규 작성, `mlb/accuracy`·`en/mlb/accuracy` 양쪽에 배선. `MIN_POLL_TOTAL`(=3) 미만 소표본은 렌더 안 함(KBO 기존 게이트 그대로 재사용). 단위 테스트 23건 신규(`computeMlbCommunityVsAI` 8건 + `buildMlbCommunityVsAI` 4건 + 기존 KBO 회귀 유지).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(523 files/4323 tests) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.118 — 2026-08-25 (cycle 2543, review-code (heavy): analysis/page.tsx(목록) 팩터 수렴 픽 성적 라인 7개소 소표본 게이트 부재)

### fix(analysis): `analysis/page.tsx`(목록) 팩터 수렴 픽 rolling/월간/시즌 성적 라인 7개소에 소표본(n<5) 흐림 처리 + 안내 신규 — cycle 2541/2542 이 accuracy 표 · game/[id] 상세 라인에 적용한 것과 동일 관례가 목록 페이지엔 없었음

- 진단: open issue 0, approved plan 0/29(전부 status≠`approved`, archived/completed류). 2-chain lock 없음(직전 8사이클 distinct=3: review-code/explore-idea/lotto). gap trigger 4종 미도달(fix-incident 17/20, op-analysis 13/25, info-arch 26/30, lotto 5/30). cycle 2542 retro carry-over(잔존 대형 파일 `analysis/page.tsx` 2803줄, 7개 지점 명시) 감사.
- 발견: `recentConvergenceRecord`(기본 수렴 픽) + `recentStrongConvergenceRecord`/`monthlyStrongConvergenceRecord`/`seasonStrongConvergenceRecord`(강수렴) + `seasonCompleteConvergenceRecord`/`monthlyCompleteConvergenceRecord`/`recentCompleteConvergenceRecord`(완전수렴) 총 7개 라인이 `SMALL_SAMPLE_N` import 자체 없이 승률 %를 그대로 강조 노출 — `weeklyXConvergenceRecord`/`yesterdayXConvergenceRecord` 변형은 %를 표시하지 않아(win/loss 카운트만) 이번 감사 범위 제외.
- 실행: `SMALL_SAMPLE_N` import 1개 추가 + 7개 지점 각각 `total < SMALL_SAMPLE_N` 시 `opacity-60` 조건부 클래스 + 인라인 `· 소표본(n<5)` 안내 추가(FactorAccuracyTable/TeamMatchupCards/cycle 2542 관례 재사용). 회귀 테스트 `silent-drift-wave-665.test.ts` 신규(7개 변수 각각 게이트 확인).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(522 files/4310 tests) + `pnpm --filter moneyball run lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.117 — 2026-08-25 (cycle 2542, review-code (heavy): analysis/game/[id]/page.tsx 팩터 수렴 픽 성적 라인 소표본 게이트 부재)

### fix(analysis): `analysis/game/[id]` 팩터 수렴 픽 "최근 N경기 적중 현황" 라인에 소표본(n<5) 흐림 처리 + 안내 신규 — cycle 2541 이 accuracy 표에 적용한 것과 동일 관례가 이 라인엔 없었음

- 진단: open issue 0, approved plan 0/29(전부 status≠`approved`, archived/completed류). 2-chain lock 없음(직전 8사이클 distinct=3: review-code/explore-idea/lotto). gap trigger 4종 미도달(fix-incident 16/20, op-analysis 12/25, info-arch 25/30, lotto 4/30). CI 최근 실패 0건, DESIGN.md 1일 전 갱신(stale 아님). cycle 2541 retro carry-over(잔존 대형 파일 `analysis/game/[id]/page.tsx` 868줄) 감사.
- 발견: 이 페이지는 `#1338 family`(scoring_rule 필터) 관점에서 이미 3회 정정된 이력이 있어 그 축은 clean. 대신 wave-461 팩터 수렴 픽 "최근 {N}경기 {승}승{패}패 ({pct}%)" 라인이 `getRecentConvergencePickRecord()`(기본 `CONVERGENCE_RECORD_RECENT_LIMIT`=10 window)의 결과를 그대로 표시 — `SMALL_SAMPLE_N` import 자체가 없어 window 안 표본이 1~2건뿐인 시즌 초반/휴식기 이후에도 100%/0%를 그대로 강조 노출. `analysis/page.tsx`(목록 페이지)의 동일 패턴(7개 지점: recent/monthly/season × strong/complete) 도 동일 부재이나 이번 사이클은 감사 대상 파일(detail page) 1개소만 정정, 목록 페이지는 다음 review-code(heavy) 후속 대상으로 carry-over.
- 실행: `SMALL_SAMPLE_N` import 추가 + `convergenceRecord.total < SMALL_SAMPLE_N` 시 `opacity-40`(기존 무조건 `opacity-60`을 조건부로 교체) + 인라인 `· 소표본(n<5)` 안내 추가(FactorAccuracyTable/TeamMatchupCards 관례 재사용). 회귀 테스트 `silent-drift-wave-664.test.ts` 신규.
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(521 files/4301 tests) + `pnpm --filter moneyball run lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.116 — 2026-08-25 (cycle 2541, review-code (heavy): accuracy/page.tsx 팩터별 적중률 표 소표본 게이트 부재)

### fix(accuracy): `FactorAccuracyTable` 소표본(n<5) 행에 흐림 처리 + 안내 문구 신규 — `/accuracy` 페이지 내 유일하게 소표본 표시가 빠진 표

- 진단: open issue 0, approved plan 0/29(전부 archived/completed/status≠approved). 2-chain lock 없음(직전 8사이클 distinct=3: review-code/explore-idea/lotto). gap trigger 4종 미도달(fix-incident 14/20, op-analysis 10/25, info-arch 23/30, lotto 2/30). cycle 2539/2540 retro carry-over(잔존 대형 파일 `accuracy/page.tsx` 1220줄) 순서대로 review-code(heavy) 감사.
- 발견: `accuracy/page.tsx`(및 하위 컴포넌트) 안 팀별 성과 표(`MIN_TEAM_PREDICTIONS`), 팀별 상대 강약(`TeamMatchupCards` — `SMALL_SAMPLE_N`), 요일별 히트맵(`SMALL_SAMPLE_THRESHOLD`), AI 확신도 티어(`STATS_RELIABLE_MIN_N` CI 표시) 등 페이지 내 모든 표가 소표본 caveat 을 갖고 있으나, `FactorAccuracyTable`(팩터별 적중률)만 `SMALL_SAMPLE_N` import 자체가 없어 n=1인 팩터도 100%/0% 정확도로 색상 강조(모델 기여/잡음 가능성)돼 표시 — 페이지 전체 관례에서 벗어난 유일한 예외.
- 실행: `FactorAccuracyTable.tsx` 에 `SMALL_SAMPLE_N`(5) import + `r.n < SMALL_SAMPLE_N` 행 `opacity-50` 처리(TeamMatchupCards 관례 재사용) + KBO/MLB-ko/MLB-en 3개 locale 별 `smallSampleNote` 안내 문구 footer 에 조건부 추가(로케일 미분기로 하드코딩하면 EN 페이지에 한글 노출되는 2차 버그라 COPY 구조 그대로 확장). 회귀 테스트 `silent-drift-wave-663.test.ts` 신규.
- `pnpm --filter moneyball run type-check` clean + `pnpm --filter moneyball run test`(519 files/4296 tests) + `pnpm --filter moneyball run lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.115 — 2026-08-24 (cycle 2540, explore-idea: analysis/page.tsx PickButton parity 추가)

### feat(analysis): `/analysis` "오늘 전체 AI 예측" 카드에 PickButton(내 픽 투표) 신규 추가 — 홈("/") · `/mlb/analysis` 양쪽 다 있던 투표 진입점이 KBO 메인 분석 페이지에만 누락

- 진단: open issue 0, approved plan 0/29. 2-chain lock 재평가 필요(직전 8사이클 review-code 우세). explore-idea heavy 배정 — 이미 소진된 영역(EN/KO parity, JSON-LD, PWA, leaderboard, auth, standings 홈/원정, CE 배너 로직, KST 경계, 배지 시리즈)을 제외하고 페이지 간 기능 parity 재조사.
- 발견: `PickButton` 컴포넌트(투표 제출 + 커뮤니티 분포 + AI 대결 힌트)는 이미 홈("/")과 `/mlb/analysis`, `/mlb/games/[date]` 에 통합돼 있지만, 정작 KBO 사용자가 오늘 경기를 가장 상세히 확인하는 `/analysis` 페이지("오늘 전체 AI 예측" 섹션, 홈페이지와 별개의 독자적 카드 렌더링)에는 빠져 있었음 — `predictions/[date]/page.tsx` 는 의도적으로 `enablePickButton={false}`(기록 열람용, 투표 미대상)이지만 `/analysis` 는 그런 예외 표시가 전혀 없이 그냥 컴포넌트 자체가 없었던 순수 누락.
- 실행: `analysis-data.ts` 의 `games` 쿼리에 `status` 컬럼 select 추가 + `TodayGameCard.status` 필드 신규 (기존엔 경기 상태를 전혀 조회하지 않아 PickButton 노출 게이트(`scheduled`만) 적용 불가능했음). `page.tsx` 게임 카드 `</Link>` 직후에 `g.status === 'scheduled'` 게이트로 `PickButton` 렌더(홈/mlb-analysis 동일 관례), `aiPredictedWinner`/`aiWinProb`/`aiTopFactor` 는 기존 계산값(`predictedWinnerCode`/`homeWinProb`/`topFactors[0]`) 재사용 — 신규 DB 쿼리 없음(컬럼 1개 추가만). 회귀 테스트 `silent-drift-cycle-2540.test.ts` 신규.
- `pnpm --filter moneyball run type-check` clean + `pnpm --filter moneyball run test`(519 files/4295 tests) + `pnpm --filter moneyball run lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.114 — 2026-08-24 (cycle 2535, explore-idea: standings 홈/원정 성적 컬럼 추가)

### feat(standings): `/standings` 테이블에 팀별 홈/원정 성적 컬럼 신규 추가 — `StandingRow.homeWins`/`homeLosses` 는 이미 fetch 중이나 어디서도 표시된 적 없던 필드

- 진단: 2-chain alternation lock 발동 (직전 8사이클 distinct=2: review-code+operational-analysis) → 두 chain 후보 제외. gh run list(CI 실패 0건) / DESIGN.md mtime(1일 전 갱신, stale 아님) / breadcrumb 누락 확인했으나 모두 기존 baseline과 동일해 신규 trigger 아님. explore-idea saturation trigger(직전 15사이클 review-code+fix-incident 13/15) 충족 + 잔여 pool 중 유일한 실질 trigger라 선택. 단, 직전 5회(2417/2477/2486/2494/2498/2515/2524) 모두 retro-only(소진) 이력이라 general-purpose agent 로 EN/KO parity·JSON-LD·PWA·leaderboard·auth 등 기존 소진 영역을 제외한 순수 신규 탐색 위임.
- 발견: `StandingRow.homeWins`/`homeLosses`(`kbo-official.ts` 컬럼 8 파싱, wave-329 이후 870+ cycle 전부터 존재)는 `analysis/page.tsx`(venueMap/게임카드 배지), `teams/[code]/page.tsx`(homeAwayEdge), `matchup/[teamA]/[teamB]/page.tsx` 에서 재사용되지만, 정작 `/standings` 순위표 자체(경기/승/무/패/승률/게임차/최근10/Elo 8열)에는 한 번도 노출된 적 없음 — 홈/원정 split을 가장 자연스럽게 찾을 법한 위치에 정작 없는 gap.
- 실행: `HomeAwayRecord` 컴포넌트 신규(`standings/page.tsx`) — `analysis/page.tsx` wave-329/434 와 동일 패턴(원정 = wins - homeWins, `VENUE_RECORD_MIN_GAMES`(7) 미만 표본은 `-` 대시, `VENUE_WIN_RATE_HIGH/LOW` 임계로 색상 강조) 재사용. 신규 DB 쿼리 0건(이미 fetch 중인 `buildStandings()` 필드 재사용). MLB/EN 미러 페이지는 홈/원정 split 데이터 소스 자체가 없어 parity 대상 아님(KBO 전용 필드 확인). 회귀 테스트 `silent-drift-cycle-2535.test.ts` 신규.
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(518 files/4292 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.113 — 2026-08-24 (cycle 2534, review-code (heavy): analysis/page.tsx CE 배너 감지 기준 통일)

### fix(analysis): `/analysis` simplifiedMode(CREDIT_EXHAUSTED 배너) 가 `todayData.games`(오늘 경기만) 평균 confidence 로 판정 — KBO 휴식일/크론 실행 전엔 games.length < CE_MIN_SAMPLES 라 CE 진행 중이어도 배너 절대 안 뜸

- 진단: open issue 0, approved plan 0/29. gap trigger 4종 미도달(fix-incident 8/20, op-analysis 4/25, info-arch 17/30, lotto 26/30). 직전 8사이클 distinct=3(review-code/fix-incident/operational-analysis) — 2-chain lock 미충족. explore-idea saturation trigger 충족(직전 15사이클 review-code+fix-incident 13/15 ≥12) 이나 직전 4연속(2494/2498/2515/2524) 모두 retro-only(신규 idea 0건) 확인된 상태라 review-code(heavy) dominance-positive streak(2531~2533 3연속 success) 지속 선택. cycle 2533 carry-over("잔존 미감사 대형 파일 재탐색 필요") 따라 fix 이력 0건 대신 최대 monolith(`analysis/page.tsx`, 2803줄, 221 커밋 이력이나 마지막 수정 cycle 2480 = 54사이클 공백) 재감사.
- 발견: `about/page.tsx`(cycle 2533 신규) / `predictions/page.tsx` / `predictions/[date]/page.tsx`(cycle 20fb7994 직전 커밋) 는 모두 "날짜 무관 최근 예측 10건"(`PRODUCTION_COHORT_RULES`, `order by id desc limit 10`) 기준으로 CE 를 감지하는데, `analysis/page.tsx` 만 `todayData.games`(오늘 경기 전용) 평균으로 계산 — 월요일 등 KBO 휴식일이나 당일 크론 실행 전(games.length 0~2 < CE_MIN_SAMPLES=3)엔 CE 상태와 무관하게 `simplifiedMode=false` 로 하드 고정돼, 같은 날 `/about`·`/predictions` 는 배너를 보여주는데 메인 허브인 `/analysis` 만 배너가 빠지는 날짜별 조건부 drift.
- 실행: `analysis-data.ts` 에 `detectSimplifiedMode()` 신규(about/predictions 와 동일 쿼리) + `page.tsx` 인라인 `todayData.games` 기반 계산 제거·해당 함수 호출로 교체. `silent-drift-wave-307.test.ts` 갱신(계산 위치 이동 반영) + `silent-drift-cycle-2534.test.ts` 신규.
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(517 files/4290 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(059c020e)+push(R4), pre-push hook 통과.



### fix(context): `/about` FAQ "AI 에이전트 토론" 설명이 CREDIT_EXHAUSTED(100% quant fallback) 상태를 사용자에게 알리지 않음 — analysis/predictions 계열엔 이미 배너 존재

- 진단: open issue 0, approved plan 0/29(전부 non-approved). gap trigger 4종 미도달(fix-incident 7/20, op-analysis 3/25, info-arch 16/30, lotto 25/30). 직전 8사이클 distinct=3(review-code/fix-incident/operational-analysis) — 2-chain lock 미충족. cycle 2532 carry-over 명시 후보(`analysis-data.ts`/`convergenceRecord.ts`/`about/page.tsx`) 순서대로 감사.
- 발견: `apps/moneyball/src/app/analysis/analysis-data.ts`(942줄) + MLB 미러 + `convergenceRecord.ts`(831줄)는 이미 SMALL_SAMPLE_N/PRODUCTION_COHORT_RULES/h2h 등 정합 상태로 clean. `about/page.tsx`(427줄, 과거 10회 stale-claim fix 이력)의 FAQ "AI 에이전트 토론은 무엇을 기반으로 하나요?" 항목은 홈/원정/심판 에이전트 토론이 상시 가동 중이라 서술하지만, `/analysis`·`/predictions`·`/predictions/[date]`는 이미 `CE_DETECT_THRESHOLD`(0.32) 기반 `simplifiedMode` 배너("AI 에이전트 심층 분석이 일시 중단됩니다")로 CREDIT_EXHAUSTED(2026-06-06~ 지속, 6th recurrence) 상태를 사용자에게 알리는데 `/about`(방법론 레퍼런스 페이지)만 이 배너가 빠져 있어 실제로는 100% quant fallback 인 기간에도 "토론 결합" 을 사실인 것처럼 서술.
- 실행: `about/page.tsx`를 async 서버 컴포넌트로 전환, `predictions` 테이블 최근 10건 confidence 평균 조회로 동일 `simplifiedMode` 감지 로직 재사용(CE_MIN_SAMPLES/CE_DETECT_THRESHOLD) + 동일 배너 UI 추가. `revalidate = 3600` 신규 추가(기존 무기한 정적 캐시 → 배너 신선도 확보). 회귀 테스트는 `silent-drift-wave-307.test.ts`(CE 상수 하드코딩 가드) 에 about 항목 추가.
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(516 files/4286 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

### fix(context): `buildWeeklyReview.ts`/`buildMlbWeeklyReview.ts` 의 `buildFactorInsights`/`buildMlbFactorInsights` 호출이 `minSamples: 3` 하드코딩 — `buildMonthlyReview.ts`/`buildMlbMonthlyReview.ts` 는 `SMALL_SAMPLE_N`(=5, sweep 51 source-of-truth) 참조 중이라 동일 family 미정정 잔존

- 진단: open issue 0, approved plan 0/29(전부 non-approved status). gap trigger 4종 미도달(fix-incident 6/20, op-analysis 2/25, info-arch 15/30, lotto 24/30). 직전 8사이클 distinct=4(review-code/explore-idea/fix-incident/operational-analysis) — 2-chain lock 미충족. explore-idea saturation 13/15 충족되나 직전 4회(2494/2498/2515/2524) 연속 소진 재확인 완료 상태. cycle 2531 retro carry-over("review-code(heavy) 또는 diversity(explore-idea)") 따라 미감사 대형 파일 재탐색 — `reviews/weekly/[week]/page.tsx`/`mlb/reviews/weekly/[week]/page.tsx`(각 524/551줄) 가 fix 이력 0건(git log 전체 grep) 인 유일한 미감사 대형 파일로 확인.
- 발견: 페이지 자체(jsonLd/breadcrumb/SMALL_SAMPLE_N 팀별 게이트 등)는 clean. 소비하는 `buildWeeklyReview.ts`/`buildMlbWeeklyReview.ts` 가 `buildFactorInsights(rows, { minSamples: 3 })` 하드코딩 사용 — 같은 reviews 그룹의 `buildMonthlyReview.ts`/`buildMlbMonthlyReview.ts` 는 이미 `SMALL_SAMPLE_N`(5) 참조 중이라, weekly 만 더 느슨한 임계(3)로 "가장 잘 맞힌/빗나간 팩터" 섹션을 노출 — monthly 대비 소표본 노이즈 가드 약화.
- 실행: 양쪽 파일 모두 `SMALL_SAMPLE_N` import 후 `minSamples: 3` → `minSamples: SMALL_SAMPLE_N` 교체. 회귀 테스트 신규 1건(`silent-drift-cycle-2532.test.ts`, weekly/monthly 4파일 cross-check).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(516 files/4285 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(fix, R4).

## v0.5.62.110 — 2026-08-24 (cycle 2531, review-code (heavy): seasons/page.tsx·not-found.tsx CURRENT_YEAR KST 연도 경계 후속 정정)

### fix(seasons): `seasons/page.tsx`/`seasons/[year]/not-found.tsx` 의 `CURRENT_YEAR` 가 `new Date().getFullYear()`(서버 로컬/UTC) 사용 — cycle 2514 carry-over 잔여 케이스

- 진단: open issue 0, approved plan 0/29. gap trigger 4종 미도달(fix-incident 5/20, op-analysis 1/25, info-arch 14/30, lotto 23/30). 직전 8사이클 distinct=4(review-code/explore-idea/fix-incident/operational-analysis) — 2-chain lock 미충족. cycle 2530 carry-over 추천(review-code heavy, 잔존 후보 재탐색) + cycle 2514 retro 명시 carry-over("`seasons/page.tsx`/`not-found.tsx`/`buildMlbTeamProfile.ts` 등 module-scope `getFullYear()` 사용처 — 다음 review-code 후보") 를 그대로 따라 착수.
- 발견: cycle 2514 가 `buildSeasonSummary.ts`/`seasons/[year]/page.tsx`의 KST 연도 경계 off-by-one은 고쳤지만, 같은 family인 `seasons/page.tsx`(인덱스 페이지 `CURRENT_YEAR`, 시즌 카드 "진행 중" 배지에 사용)와 `seasons/[year]/not-found.tsx`(404 페이지 `AVAILABLE_YEARS`)는 독립적으로 module-scope `new Date().getFullYear()`를 계속 사용 — 동일 KST_OFFSET_MS family 미정정 잔존.
- 실행: 두 파일 모두 기존 `computeCurrentKSTYear`(`buildSeasonSummary.ts` export, cycle 2514 추출) import 재사용으로 교체. 신규 함수/테스트 불필요(기존 `computeSeasonIsOngoing.test.ts` 가 이미 `computeCurrentKSTYear` 커버). `buildMlbTeamProfile.ts`의 `new Date().getFullYear()`(MLB 시즌 stats 조회 fallback)는 KBO-MLB 오프시즌 경계 저영향 + 함수 스코프(요청마다 재평가)라 이번 audit 범위 밖 유지, 다음 review-code 후보로 재-carry-over.
- `pnpm type-check`(4 packages clean) + `pnpm test`(515 files/4281 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.109 — 2026-08-24 (cycle 2528, review-code (heavy): accuracy 섹션 렌더 게이트 MIN_TEAM_PREDICTIONS 미참조 정정)

### fix(accuracy): `accuracy/page.tsx` winnerProbBuckets/cohortWeekHeatmap 섹션 렌더 게이트 + `MlbAccuracyDashboard.tsx` cohortWeekHeatmap 게이트가 `MIN_TEAM_PREDICTIONS` 대신 하드코딩 `n >= 3` 사용 — wave-2463 swap 누락분 정정

- 진단: open issue 0, approved plan 0/29. gap trigger 4종 미도달(fix-incident 2/20, op-analysis 23/25, lotto 20/30, info-arch 11/30). 직전 8사이클 distinct=3(review-code/explore-idea/fix-incident) — 2-chain lock 미충족. explore-idea saturation 13/15 충족되나 직전 4회(2494/2498/2515/2524) 연속 소진 재확인 완료 상태라 skip. 2527 retro carry-over `mlb/buildMlbStandings.ts`(clean 확인) + `accuracy/page.tsx 소비부` 중 후자 감사 착수.
- 발견: `accuracy/page.tsx` 가 팀별 성과 섹션엔 이미 `MIN_TEAM_PREDICTIONS`(=3, wave-113/wave-2463 single source)를 import·사용 중이면서도, 같은 파일 안 winnerProbBuckets 섹션 렌더 게이트(`b.n >= 3`)와 cohortWeekHeatmap 섹션 렌더 게이트(`c.n >= 3`)는 여전히 하드코딩. MLB parity 컴포넌트(`MlbAccuracyDashboard.tsx`)의 cohortWeekHeatmap 게이트도 동일 하드코딩 중복 — 3곳 모두 wave-2463 이 팀별 표 부분만 swap하고 놓친 동일 family 재발.
- 실행: 3곳 모두 `MIN_TEAM_PREDICTIONS` 참조로 교체(`MlbAccuracyDashboard.tsx` 는 import 추가). `MIN_TEAM_PREDICTIONS` 상수 주석에 wave-528 적용 surface 추가. 회귀 테스트 신규 1건(`silent-drift-cycle-2528.test.ts`).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(515 files/4281 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(fix, R4).

## v0.5.62.108 — 2026-08-24 (cycle 2514, review-code (heavy): seasons/[year] 최초 전체 감사 — isOngoing/isCurrent KST 연도 경계 off-by-one 정정)

### fix(seasons): `buildSeasonSummary.ts`/`seasons/[year]/page.tsx` 의 "올해" 판정이 `new Date().getFullYear()`(서버 로컬/UTC) 사용 — KST_OFFSET_MS family 신규 케이스

- 진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4/spec-only-deferred, status=approved 0건). gap trigger 4종 미도달. 직전 8 사이클 distinct=3(fix-incident/review-code/lotto) — 2-chain lock 미충족. `teams/[code]/page.tsx`(622줄)를 대형 미감사 후보로 재확인했으나 cycle 2470 에 이미 최초 전체 감사·clean(RETRO-ONLY) 완료된 파일이었음(변경 이력 0건 확인 후 중복 감사 폐기). cycle 2513 추천 목록(`debug/pipeline`/`debug/factor-correlation`/`search/page`) 도 각각 cycle 2269/2485/2261 에 이미 감사 완료 확인 — 실제 미감사 후보는 `seasons/[year]/page.tsx`(433줄)와 `about/page.tsx`(427줄) 뿐이었음. 전자 선정.
- 발견: `buildSeasonSummary.ts`(`isOngoing` 판정)와 `seasons/[year]/page.tsx`(`generateMetadata`의 `isCurrent`)가 각각 독립적으로 `new Date().getFullYear()`를 사용 — 서버 로컬(Vercel 기본 UTC) 기준이라 KST 12/31 15:00~23:59 UTC(=1/1 00:00~08:59 KST) 구간에 "올해" 판정이 실제 KST 연도보다 하루 늦게 갱신되는 KST_OFFSET_MS family(computeMonthRange/computeAdjacentDates 와 동일 원칙 위반) 신규 케이스. 연 1회 9시간 구간이지만 "진행 중" 배지·시즌 제목·메타 설명이 틀린 연도로 표시되는 매년 재발 버그.
- 실행: `buildSeasonSummary.ts`에 순수 함수 `computeCurrentKSTYear`/`computeSeasonIsOngoing` 추출(`toKSTDateString` 기반, 기존 `computeAdjacentDates`/`computeMonthRange` 추출 패턴과 동일) + `page.tsx`가 동일 함수 재사용. 회귀 테스트 6건(`computeSeasonIsOngoing.test.ts`, 일반 케이스 + KST 연도 경계 양방향 + KS 마감 경계).
- `pnpm type-check`(4 packages clean) + `pnpm test`(512 files/4273 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (R4).

## v0.5.62.107 — 2026-08-24 (cycle 2499, review-code (heavy): accuracy 컴포넌트 최초 전체 감사 — TeamMatchupCards 소표본 threshold 미참조 정정)

### fix(accuracy): `TeamMatchupCards.tsx` 소표본 opacity 처리가 `SMALL_SAMPLE_N`(5, sweep 51 source-of-truth) 대신 하드코딩 `< 3` 사용 — silent drift 정정

- 진단: open issue 0, approved plan 0/22(전부 completed/archived/spec-only-deferred, status=approved 0건). gap trigger 4종 미도달(fix-incident 15/20, op-analysis 20/25, info-arch 13/30, lotto 21/30). 직전 8 사이클 distinct=3(review-code/explore-idea/polish-ui) — 2-chain lock 미충족. explore-idea saturation 13/15 충족되나 직전 2회(2494/2498) 연속 신규 idea 0건 확인된 상태. 2473 retro 가 미감사 후보로 명시한 `/accuracy` 컴포넌트 계층(`FactorAccuracyTable`/`TeamBiasTable`/`ModelVersionHistory`/`TeamMatchupCards`) 최초 전체 감사 착수.
- 발견: `TeamMatchupCards.tsx` 의 홈/원정 split + 상대팀 목록 opacity-50 판정이 하드코딩 `n < 3` 사용, 주석은 "ScoringRuleDayHeatmap/CohortComparisonHeatmap 과 동일 컨벤션"이라 주장. 실측 결과 두 파일 모두 이런 threshold 자체가 존재하지 않음(grep 0건) — cycle 2199 도입 당시부터 근거가 부정확했던 코멘트. `TeamBiasTable.tsx`(같은 accuracy 컴포넌트 그룹)는 이미 `SMALL_SAMPLE_N`(5, cycle 2473 이 `CalibrationChart` 에도 통일한 sweep 51 source-of-truth)을 정확히 참조 — `TeamMatchupCards.tsx` 만 미참조 상태였음.
- 실행: `SMALL_SAMPLE_N` import 후 3곳(`ha.homeN`/`ha.awayN`/`m.n`) 의 `< 3` 을 `< SMALL_SAMPLE_N` 으로 교체 + 부정확한 코멘트 정정. 회귀 테스트(`TeamMatchupCards.test.tsx`) boundary 값을 `SMALL_SAMPLE_N` 참조로 갱신(n=4/5 경계).
- `pnpm type-check`(4 packages clean) + `pnpm test`(509 files/4250 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(fix, R4).

## v0.5.62.106 — 2026-08-24 (cycle 2493, review-code (heavy): factor-explanations.ts 최초 전체 감사 — marginPp 하드코딩 * 200 / 0.5 정정)

### fix(context): `GameAnalysisProse.tsx` / `MlbGameOverview.tsx` 의 marginPp 계산이 `FACTOR_CONTRIBUTION_SCALE`/`NEUTRAL_FACTOR` 단일 source 대신 하드코딩 `* 200` / `- 0.5` 사용 — silent drift 정정

- 진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 9/20, op-analysis 14/25, info-arch 7/30, lotto 15/30). 직전 8 사이클 distinct=3(review-code/fix-incident/info-architecture-review) — 2-chain lock 미충족. 2492 추천대로 review-code(heavy) 계속, 잔존 미감사 대형 파일 중 `factor-explanations.ts`(416줄, `/analysis/game/[id]` + 리스트 카드 전체 팩터 해설·요약 소스, review-code 이력 0건) 선정.
- 발견: 이 파일이 자체적으로 `OVERVIEW_CLOSE_PP`/`OVERVIEW_DOMINANT_PP` 를 `NEUTRAL_FACTOR`+`FACTOR_CONTRIBUTION_SCALE` 단일 source 로 도출(wave-352/356, cycle 2253 fix 로 소비부 하드코딩 10/20 은 이미 정리됨)함에도, 그 threshold 를 소비하는 두 컴포넌트 — `GameAnalysisProse.tsx`(KBO) / `MlbGameOverview.tsx`(MLB) — 는 marginPp 원 계산 자체를 `Math.abs(homeWinProb - ELO_NEUTRAL_WIN_PCT) * 200` / `Math.abs(homeWinProb - 0.5) * 200` 로 별도 하드코딩. `ELO_NEUTRAL_WIN_PCT`(0.5)·`NEUTRAL_FACTOR`(0.5)·`FACTOR_CONTRIBUTION_SCALE`(200) 이 현재 값은 동일하지만, cycle 2253 fix 가 threshold 상수만 단일화하고 marginPp 산식 자체는 두 컴포넌트에 중복 하드코딩으로 남겨 향후 `FACTOR_CONTRIBUTION_SCALE` 또는 `NEUTRAL_FACTOR` 재조정 시 `buildGameOverview`(factor-explanations.ts) 와 두 컴포넌트의 marginPp 가 silent 하게 divergent 해질 위험.
- 실행: 두 컴포넌트 모두 `FACTOR_CONTRIBUTION_SCALE`(+`MlbGameOverview.tsx` 는 `NEUTRAL_FACTOR` 도) import 후 marginPp 계산을 단일 source 참조로 교체. 회귀 테스트 신규 1건(`silent-drift-cycle-2493.test.ts`, 하드코딩 리터럴 부재 + import 존재 검증).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(509 files/4250 tests) + `pnpm lint` clean. 단일 논리 단위 → main 직접 commit(fix, R4).

## v0.5.62.105 — 2026-08-24 (cycle 2490, review-code (heavy): buildAccuracyData.ts 최초 전체 감사 — Version History CURRENT_MODEL_FILTER 오적용 정정)

### fix(accuracy): `/accuracy` 모델 버전 히스토리 표가 v1.5/v1.6/v1.7-revert/v1.8-credit-fail 실측 데이터를 영구 "수집 중"으로 오표시하던 silent drift 정정

- 진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 6/20, op-analysis 11/25, info-arch 4/30, lotto 12/30). 직전 8 사이클 distinct=3(review-code/fix-incident/info-architecture-review) — 2-chain lock 미충족. 잔존 미감사 대형 data builder 중(`buildAccuracyData.ts` 776줄, `/accuracy` 페이지 데이터 소스) 최초 전체 감사 착수 (2489 추천).
- 발견: `accuracy/page.tsx` 가 단일 `predictions` 쿼리(`CURRENT_MODEL_FILTER` = `scoring_rule='v1.8'` 매치)로 가져온 `rows` 를 `buildVersionHistory(rows)` 에 그대로 전달 — `ModelVersionHistory` 컴포넌트는 `ALL_SCORING_RULES`(v1.5/v1.6/v1.7-revert/v1.8/v1.8-credit-fail 등) 전체 버전 진행사를 보여주도록 설계됐지만, 쿼리 자체가 이미 v1.8 외 scoring_rule 을 배제해 다른 버전은 항상 n=0 → UI 가 "수집 중"으로 렌더. DB 실측 결과 v1.5(n=16)/v1.6(n=46)/v1.7-revert(n=34)/v1.8-credit-fail(n=25) 총 121건의 실제 검증된 예측이 존재해 "수집 중"이 아니라 이미 종료된 과거 버전의 실적 미노출이었음. `CURRENT_MODEL_FILTER` 자체는 baseline 지표(brier/gap/buckets 등) 정합을 위해 v1.8 만 쓰는 것이 문서화된 의도(shared model-version-labels.ts)이나, 그 제약이 성격이 다른 buildVersionHistory 호출까지 전파된 것이 문제.
- 실행: Version History 전용 쿼리(`versionHistoryResult`, scoring_rule 필터 없음) 를 Promise.all 에 추가 후 `buildVersionHistory(versionHistoryRows)` 로 분리. 회귀 테스트 신규 1건(`silent-drift-cycle-2490.test.ts`).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(508 files/4246 tests) + `pnpm lint` clean. 단일 논리 단위 → main 직접 commit(fix, R4).

## v0.5.62.104 — 2026-08-24 (cycle 2488, review-code (heavy): analysis-data.ts 최초 전체 감사 — topFactors NEUTRAL dead zone 미적용 정정)

### fix(analysis): `getTodayAnalysisData` topFactors 계산에 NEUTRAL_HI/LO dead zone(0.45~0.55) 미적용 — 중립 팩터 오표시 정정

- 진단: open issue 0, approved plan 0/29. gap trigger 4종 미도달(fix-incident 4/20, op-analysis 9/25, info-arch 2/30, lotto 10/30). 2-chain lock 미충족(직전 8 distinct=3). explore-idea saturation 12/15 충족되나 3회 소진 확인된 상태(2487 retro). page.tsx UI 계층(analysis/page.tsx)은 2480에 전체 감사됐지만 그 데이터 소스인 `analysis/analysis-data.ts`(938줄, data builder 6개 함수) 자체는 review-code 이력 0건 — 이번 사이클 최초 전체 감사 대상 선정.
- 발견: `getTodayAnalysisData` 내 `topFactors` 계산(오늘 경기 카드 "[팩터]: [팀]↑" 배지 source)이 `NEUTRAL_FACTOR`(0.5) 단순 비교(`val > 0.5 ? home : away`)만 사용 — `factorLabels.ts` 가 명시적으로 "FactorBreakdown / determineFavor / topFavoringFactors / selectTopFactors 공유 source"로 지정한 `NEUTRAL_LO`(0.45)/`NEUTRAL_HI`(0.55) dead zone 을 반영하지 않음. `determineFavor`(factor-explanations.ts), `topFavoringFactors`/`countFavoringFactors`(factorLabels.ts, PredictionCard/PredictionCardLive 에서 사용)는 모두 이 dead zone 밖에서만 팀 우세로 판정하지만, `analysis-data.ts` 만 예외 — 실질적으로 중립인 팩터 값(예: 0.51, impact 0.01)도 top-2 안에 들면 "[팀] 우세" 배지로 렌더돼 균형 잡힌 경기에서 사실상 중립 신호를 방향성 있는 것처럼 오표시할 수 있었음.
- 실행: `NEUTRAL_HI`/`NEUTRAL_LO` import 후 topFactors 후보 필터에 `val > NEUTRAL_HI || val < NEUTRAL_LO` 추가 — dead zone 안 팩터는 애초에 후보에서 제외(기존 `topFactors.length > 0` UI 가드가 0건 케이스 이미 처리). 회귀 테스트 신규 추가(`silent-drift-cycle-2488.test.ts`, import + 필터 조건 검증).
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(507 files/4244 tests, 기존 505/4240 + 신규 이 사이클 이전 누적분 + 신규 2) + `pnpm lint` clean. 단일 논리 단위 → main 직접 commit(fix, R4).

## v0.5.62.103 — 2026-08-24 (cycle 2480, review-code (heavy): analysis/page.tsx 최초 전체 감사 — 구장 배지 색상 역전 + 가중치 툴팁 하드코딩 정정)

### fix(analysis): 구장 팩터 배지 색상 반전(오늘 경기 리스트) + "전체 팩터 가중치" 툴팁 하드코딩 `0.85` 정정

- 진단: open issue 0, approved plan 0/23. gap trigger 4종 미도달(fix-incident 16/20, op-analysis 1/25, info-arch 25/30, lotto 2/30). 직전 8 사이클 distinct=5 — 2-chain lock 미충족. 직전 15 사이클 saturation 9/15 미충족. 강한 trigger 부재 상태에서 `apps/moneyball/src/app` 내 최대 monolith(`analysis/page.tsx`, 2803줄, 마지막 전체 감사 cycle 2149 — 331 사이클 stale) 최초 전체 감사 착수.
- 발견 1(real bug): 오늘 경기 리스트 항목(`:1761-1765`, wave-369)의 구장 팩터 배지 색상이 같은 파일 내 동일 조건(`parkPf >= PARK_FACTOR_HITTER_MIN`)을 렌더링하는 다른 3곳(`:909-925`/`:1196-1214`/`:2246-2264`)과 반전 — 타자친화 구장을 `orange`(투수친화 색)로, 투수친화를 `brand`(타자친화 색)로 표시. 같은 경기 카드 내 다른 위치에서 같은 구장이 서로 다른 색으로 렌더되는 시각적 모순.
- 발견 2(silent drift): `:542` 툴팁이 `FACTOR_PICK_WEIGHT_TOTAL`(현재 0.85, `packages/shared`에서 derived) 을 문자열 리터럴 `0.85`로 하드코딩 — 바로 두 줄 위(`:508`)는 이미 상수를 참조해 정확히 계산하는데, `DEFAULT_WEIGHTS` 재조정 시 계산값은 자동 갱신되지만 이 툴팁 텍스트만 stale 하게 남는 silent drift 소지.
- 실행: 색상 조건 스왑(`isHitterFriendly ? brand : orange`로 통일) + 툴팁을 템플릿 리터럴로 변경해 `FACTOR_PICK_WEIGHT_TOTAL` 참조.
- `pnpm type-check`(4 packages clean) + `pnpm test`(505 files/4238 tests 전량 pass) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(fix, R4).

## v0.5.62.102 — 2026-08-24 (cycle 2476, polish-ui: MLB game-detail 레이아웃 폭 회귀 + EN 팀 페이지 division rank 배지 누락 정정)

### fix(mlb): game-detail `max-w-3xl` 레이아웃 폭 회귀 + EN 팀 페이지 division rank 배지 KO/EN parity 정정

- 진단: 2-chain lock 탐지(직전 8 사이클 distinct=2: review-code 7 + operational-analysis 1). 잠긴 두 chain 제외 후 나머지 pool(fix-incident 12/20, info-arch 21/30, explore-idea 11/15, lotto 36/30 이지만 self-heal 이미 최신) 모두 trigger 미충족 → 룰(어떤 chain 도 trigger 없으면 polish-ui 강제 발화) 적용. 최근 7일 신규 MLB UI 7개 파일(team/matchup/game-detail KO+EN) 이 design-review 0회 상태였음도 근거.
- 발견 1(real bug): `mlb/games/[date]/[slug]/page.tsx`(KO+EN) 가 `<main className="max-w-3xl mx-auto px-4 py-6 space-y-6">` 사용 — KBO 원본(`analysis/game/[id]/page.tsx`)과 다른 모든 신규 MLB 페이지(team/matchup)는 전부 `<article className="max-w-4xl mx-auto space-y-6 py-N">` 컨벤션. game-detail 만 ~128px 좁고 여백 다르게 렌더 — team/matchup ↔ game-detail 이동 시 폭이 튀는 시각 회귀.
- 발견 2(content parity): `mlb/team/[code]/page.tsx` KO 는 `buildMlbDivisionStandings`/`findMlbTeamDivisionRank` 로 헤더에 디비전 순위 배지(`N위/M팀 · N경기차`) 노출하지만, EN 미러는 이 조회/렌더가 통째로 빠져있어 EN 사용자만 순위 정보 미노출.
- 실행: game-detail KO+EN 모두 `max-w-4xl`/`<article>` 로 통일. EN 팀 페이지에 KO 와 동일한 `buildMlbDivisionStandings`+`findMlbTeamDivisionRank` 조회 및 배지(`N/M · GB N.N`, EN 표준 GB 표기는 `en/mlb/standings` 컨벤션과 일치) 추가.
- `pnpm type-check`(4 packages clean) + `pnpm test`(505 files/4238 tests 전량 pass) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(fix, R4).

## v0.5.62.101 — 2026-08-24 (cycle 2475, review-code (heavy): mlb/team/[code] KBO parity gap — 예정 경기 · 예측 섹션 부재 해소)

### feat(mlb): `/mlb/team/[code]` (KO+EN) 에 KBO `/teams/[code]` 대응 "예정 경기 · 예측" 섹션이 부재했던 것을 신규 추가

- 진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 11/20, op-analysis 4/25, info-arch 20/30, lotto self-heal 최신 no-op). 직전 8 사이클 distinct=3(review-code/explore-idea/operational-analysis) — 2-chain lock 미충족. 직전 3 사이클 연속 review-code(heavy) success streak(2472~2474, i18n leak + cross-pipeline 오염 + MLB matchup parity gap) — dominance-positive streak(cycle 135 룰) 인정, 같은 family 계속 탐색. cycle 2474 가 matchup 페이지의 "다음 경기 예측" parity gap 을 해소한 직후라, 동일 family(팀 단위 예정 경기) 존재 여부를 `teams/[code]` vs `mlb/team/[code]` 대조로 재확인.
- 발견: KBO `teams/[code]/page.tsx` 는 `buildTeamUpcoming.ts` 로 해당 팀의 예정 경기(최대 7경기) + AI 사전예측을 "예정 경기 · 예측" 섹션으로 노출하지만, MLB `mlb/team/[code]`(KO+EN, 각각 cycle 2087/2097/2112/2268/2418 에 이미 감사됐음에도 이 gap 은 그동안 미발견) 에는 이 섹션이 처음부터 부재 — cycle 2474 matchup gap 과 동일 family(팀/매치업 단위 "예정 경기+예측" 기능이 MLB 확장 시(plan #24) 통째로 누락).
- 실행: `buildMlbTeamUpcoming.ts` 신규(`mlb_schedule`(status='scheduled', game_date ≥ 오늘 KST, 팀 코드 home/away or) + `predictions`(prediction_type='pre_game', league='mlb', scoring_rule ∈ MLB_PRODUCTION_COHORT_RULES) 조인, KBO `TEAM_UPCOMING_LIMIT`(7) 재사용, `deriveMlbOutcome` 으로 home_win_prob 기반 predictedAsWinner/confidence derive — `buildMlbMatchupUpcoming.ts`(cycle 2474) 와 동일 컨벤션). KO+EN 팀 페이지 양쪽 Elo 추이 섹션 직후에 KBO 와 동일 UI(테이블: 일자/상대/홈-원정/모델예측) 삽입. 신규 테스트 4건(빈 배열/홈 예측/원정 예측 반전/예측 부재 시 명시적 fallback).
- `pnpm type-check`(4 packages clean) + `pnpm test`(505 files/4238 tests 전량 pass) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(feat, R4).

## v0.5.62.100 — 2026-08-24 (cycle 2474, review-code (heavy): mlb/matchup/[teamA]/[teamB] KBO parity gap — 다음 경기 예측 섹션 부재 해소)

### feat(mlb): `/mlb/matchup/[teamA]/[teamB]` (KO+EN) 에 KBO `/matchup/[teamA]/[teamB]` 대응 "다음 경기 예측" 섹션이 처음부터 부재했던 것을 신규 추가

- 진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 전부 미도달(fix-incident 10/20, op-analysis 3/25, info-arch 19/30, lotto 34/30 — 실측 확인 결과 `~/lotto_picks/2026-08-29-50sets.md`+`2026-08-22-result.md` 모두 cron self-heal 로 이미 최신, no-op skip). 2-chain lock 미충족(직전8 distinct=3: review-code/explore-idea/operational-analysis). review-code 반복 타겟(accuracy/teams/daily.ts/mlb game-detail 등) 전부 최근 몇 사이클 안 감사 완료 확인 후 인접 monolith `mlb/matchup/[teamA]/[teamB]/page.tsx`(455줄)+EN 미러 대조 감사.
- 발견: KBO `/matchup/[teamA]/[teamB]` 페이지(cycle 1640 wave-309)는 `buildMatchupUpcoming.ts` 로 두 팀의 예정 경기 + AI 사전예측을 "다음 경기 예측" 섹션으로 노출하지만, MLB `mlb/matchup/[teamA]/[teamB]`(KO+EN) 에는 애초에 이 섹션도 이를 위한 데이터 조회 함수도 존재하지 않았음 — `apps/moneyball/src/lib/mlb/` 전체에 "scheduled" 상태의 MLB 경기 예측을 조회하는 코드가 0건(단일 매치업 페이지 기능 격차가 아니라 리그 전체에 이 기능 자체가 미구현). KBO 대비 MLB 확장 시(plan #24) 이 조각만 이식이 빠졌던 feature parity gap.
- 실행: `buildMlbMatchupUpcoming.ts` 신규(`mlb_schedule`(status='scheduled', game_date ≥ 오늘 KST) + `predictions`(prediction_type='pre_game', league='mlb', scoring_rule ∈ MLB_PRODUCTION_COHORT_RULES) 조인 — `buildMlbMatchupProfile.ts` 와 동일 컨벤션, `deriveMlbOutcome` 재사용해 `home_win_prob` 로 predictedWinnerCode/confidence derive). KO+EN 매치업 페이지 양쪽에 KBO 섹션과 동일 UI(승률 바 + 팀로고 + 티어 배지, `classifyWinnerProb`/`winnerProbOf`/`pickTierEmoji`/`WINNER_TIER_LABEL` 재사용 — 이미 MLB 컨텍스트에서 사용 중인 league-agnostic 함수) 삽입. 신규 테스트 3건(빈 배열/예측 있음 derive/예측 부재 시 null) 추가.
- `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(504 files/4234 tests 전량 pass) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(feat, R4).

## v0.5.62.99 — 2026-08-24 (cycle 2472, review-code (heavy): mlb/games/[date]/[slug] EN 미러 최초 전체 감사 — 모델 메타 정보 섹션 통째 누락 정정)

### fix(i18n): `/en/mlb/games/[date]/[slug]` EN 미러가 KO `page.tsx`의 "모델 메타 정보"(정량 모델 버전 / 토론 버전 / 예측 생성 시점) `<details>` 섹션 전체를 안 갖고 있었고, 우세팀 배너도 `mlbShortTeamName` 없이 raw 팀 코드를 그대로 노출하던 것을 정정

- 진단: open issue 0, approved plan 0/29(전부 completed/archived/Tier4). gap trigger 4종 전부 미도달(fix-incident 8/20, op-analysis 1/25, info-arch 17/30, lotto 32/30 — 실측 확인 결과 `~/lotto_picks/2026-08-29-50sets.md`+`2026-08-22-result.md` 모두 cron self-heal 로 이미 최신, 5번째 no-op 재확인 skip). 2-chain lock 미충족(직전8 distinct=4). op-analysis 재실행 시 오늘 하루 안 4번째 연속 zero-change 예상(cycle 2471 과 동일 날짜) — 저가치 판단해 배제. review-code 반복 타겟(`analysis/page.tsx`/`accuracy/page.tsx`/`teams/[code]/page.tsx`/`buildTeamProfile.ts`/`buildMatchupProfile.ts`/`buildPicksStats.ts`/`factor-explanations.ts`/`matchup/[teamA]/[teamB]/page.tsx` 등) 전부 CHANGELOG 상 "최초 전체 감사" 이력 확인 완료 — 신규 unaudited 파일 재탐색 중 `mlb/games/[date]/[slug]/page.tsx`(543줄, context/i18n silent leak wave 다수가 부분 터치했지만 전용 최초 감사 이력 0건) 선정, KO 원본 전체 read + EN 미러와 diff 대조.
- 발견: KO 페이지는 `pred.model_version`/`debate_version`/`predicted_at`(→ `predictionLeadHours`) 를 조회해 하단에 "모델 메타 정보" `<details>` 섹션으로 노출(cycle 2423 도입)하지만, EN 미러(`en/mlb/games/[date]/[slug]/page.tsx`)는 이 3개 컬럼을 select 쿼리에서부터 아예 요청하지 않고, `<details>` 블록 자체가 통째로 없음 — KBO 도메인에서 이미 다수 재발한 "i18n silent leak family"(KO 신규 섹션 추가 후 EN 미러 미동기) 의 MLB game-detail 신규 인스턴스. 부수 발견: 우세팀 배너(`{winnerCode} {conf}%`)가 KO 는 `mlbShortTeamName(...)` 로 팀 약칭(예: "Yankees")을 표시하는데 EN 은 정규화 없이 raw 코드(예: "NYY")를 그대로 노출 — 같은 페이지 h1(`{home} vs {away}`)은 의도적으로 코드를 쓰는 것과 달리 배너는 KO 와 동일하게 이름을 쓰는 게 일관적.
- 실행: EN 페이지에 `HOUR_MS` import 추가 + `PredictionDetailRow`에 3개 필드 추가 + select 쿼리에 3개 컬럼 추가 + `predictionLeadHours` 계산(KO 와 동일 로직) + KO 와 동일 위치(`MlbHistoricalAnalogMatchup` 뒤, footer 앞)에 영문 번역된 "Model metadata" `<details>` 섹션 신규 + `winnerCode` 를 `mlbShortTeamName(...)` 로 감싸 KO 와 표시 일관성 정정. `pnpm type-check`(4 packages clean) + `pnpm test`(503 files/4231 tests 전량 pass) + `pnpm lint` clean.

## v0.5.62.98 — 2026-08-24 (cycle 2469, review-code (heavy): pipeline/daily.ts 최초 전체 감사 — PipelineMode 타입 크로스 파이프라인 오염 정정)

### fix(pipeline): `daily.ts` 가 export 하는 `PipelineMode` 타입이 실제로 처리하는 4개 모드(`announce`/`predict`/`predict_final`/`verify`) 외에 MLB 파이프라인(`mlb-pipeline.ts`) 전용 8개 모드 + `postview` 리터럴까지 떠안고 있어 `runDailyPipeline(date, 'postview')` 같은 잘못된 호출도 타입체크를 통과하던 것을 정정

- 진단: open issue 0, approved plan 0/29(전부 completed/archived/Tier4). gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 3/25, info-arch 14/30, lotto 29/30). 2-chain lock 미충족(직전8 distinct=4). op-analysis 재실행(`op-analysis-ce-cohort.ts`) 결과 n=337 cycle 2448/2466 과 완전 동일(신선 데이터 0) — lite 저가치 판단. review-code heavy pool 소진 경고(cycle 2458/2460/2462/2465/2468) 대응해 리포 전체 파일 크기 재조사 → `daily.ts`(1626줄, 리포 최대 파일)가 수십 건 부분 fix 대비 "최초 전체 감사" CHANGELOG 이력 0건 확인 — 최우선 신규 타겟 선정.
- 발견: `export type PipelineMode`(daily.ts) 이 자기 함수 `runDailyPipeline` 이 실제로 분기하는 4개 모드(announce/predict/predict_final/verify) 외에 `mlb_statsapi_scrape` 등 MLB 8종 + `postview` 를 포함한 13종 union 이었음 — 원인은 `silent-drift-alert.ts` 가 daily.ts/mlb-pipeline.ts/postview-daily.ts 3개 파이프라인 전부에서 호출되는 cross-pipeline alert dispatcher 라 그 `SilentDriftAlertMeta.mode` 필드가 3개 소스 리터럴을 다 받아야 했는데, 이걸 별도 타입으로 안 만들고 daily.ts 의 `PipelineMode` 를 그대로 재사용해 옮겨붙인 것. 결과: `runDailyPipeline` 의 실제 switch 로직은 'announce'/'verify' 만 명시 분기하고 그 외(예: 'postview')는 아무 가드 없이 predict/predict_final 코드 경로(실 DB insert)로 fall-through — 타입 시그니처가 "13개 모드 지원"을 약속하지만 실제로 지원하는 건 4개뿐이라 나머지 9개를 넘기면 조용히 잘못된 동작을 하는 타입 안전 구멍.
- 실행: daily.ts `PipelineMode` 를 실제 처리 4종으로 축소. `silent-drift-alert.ts` 에 자체 `SilentDriftPipelineMode`(13종 전체) 신규 정의 — 진짜 소비처가 직접 소유. `notify-status-predicate.ts::shouldNotifyPipelineStatus` 는 원래도 미인식 모드 문자열을 전부 false 로 방어하는 순수 predicate(테스트가 'mlb_predict_final' 등으로 이미 방어 로직 검증)라 `mode: string` 으로 완화 — daily.ts 좁힌 타입과 충돌 없이 방어 테스트 유지.
- `pnpm type-check`(4 packages clean) + `pnpm --filter @moneyball/kbo-data test`(90 files/1184 tests) + `pnpm test`(503 files/4231 tests 전량 pass) + `pnpm lint` clean. 런타임 동작 변경 없음(현재 유일 caller 인 `/api/pipeline` route 는 이미 4개 값만 허용) — 순수 타입 정합성 fix.

## v0.5.62.97 — 2026-08-24 (cycle 2453, review-code: buildSeasonSummary.ts 신규 감사 — 한국시리즈 동점 우승팀 오판정 정정)

### fix(lib): `findChampionship()`의 docstring 이 "우승 결정 안 난 상태 (동점) → null 반환"을 명시하지만 실제 구현엔 tie 분기가 없어 `winsA <= winsB`이면 무조건 원정팀(idB)을 우승팀으로 오판정하던 것을 정정

- 진단: open issue 0, approved plan 0/29(Tier4 유지). gap trigger 4종 전부 미도달(fix-incident 1/20 방금 발화, op-analysis 5/25, info-arch 28/30, lotto 13/30). 2-chain lock 미충족(직전8 distinct=4). explore-idea saturation 미충족(11/15). cycle 2452가 review-code 신규 타겟 탐색을 추천 — CHANGELOG 언급 0회(감사 이력 없음) 대형 lib 파일 비교(`buildSeasonSummary.ts` 346줄 vs `buildMlbTeamAccuracy.ts` 300줄) 중 KBO 도메인·독자 로직(`findChampionship`) 보유한 전자 선정.
- 발견: `findChampionship()`이 한국시리즈 최근 4+경기를 팀 쌍 기준 역추적해 우승팀을 판정하는데, docstring 은 "동점 → null" 을 계약으로 명시하나 실제 코드는 `winnerId = winsA > winsB ? idA : idB` 한 줄뿐 — `winsA === winsB`(예: 2-2 truncated 데이터) 시에도 idB 를 우승팀으로 확정. 시즌 데이터 수집이 KS 진행 중 중단되는 edge case 에서 재현 가능한 silent 오판정 (이 프로젝트 전형적 comment-vs-code 패턴).
- 실행: `winsA === winsB` 조기 `return null` 가드 추가. 회귀 테스트 2건 신설(`silent-drift.test.ts`) — 4경기 2-2 동점 → `championship=null` 확인 + 4경기 3-1 확정 → 정상 판정 유지 확인 (기존엔 `findChampionship`/`buildSeasonSummary` championship 경로 테스트 자체가 0건).
- `pnpm --filter moneyball test`(4219/4219, 신규 2건) + `type-check`/`lint` clean.

## v0.5.62.96 — 2026-08-23 (cycle 2450, review-code: lotto/methodology 신규 감사 — OOS 표본 caveat 텍스트 stale 정정)

### fix(content): `/lotto/methodology` 페이지 OOS 표본 caveat 문구가 실제 `oos_pass_rate.length` 와 무관하게 `N<10 sample preliminary` 로 하드코딩 — N=14 도달(actionable 임계 N=10 초과, cycle 1842 이미 달성) 이후에도 계속 preliminary 로 오표시되던 것을 정정

- 진단: open issue 0, approved plan 0/29(Tier4 유지). gap trigger 전부 미도달(fix-incident 5/20, op-analysis 2/25, info-arch 25/30, lotto 10/30). 2-chain lock 미충족(직전8 distinct=3). explore-idea saturation 미충족(11/15). cycle 2449 가 review-code #1338 family 3연속 클린 확정 + 신규 unaudited 영역 재탐색 추천 — CHANGELOG 언급 최소(3회) 파일 비교로 `lotto/methodology/page.tsx`(520줄, KBO/MLB family 와 별개 도메인) 선정.
- 발견: `oosSampleCaveat` 부재 상태에서 `N&lt;10 sample preliminary — 단일 회차 PASS 로 검증 단정 차단` 문구가 리터럴로 박제 — 실제 `lottoData.oos_pass_rate.length`(14) 는 이미 actionable 임계(N=10, cycle 1842 달성)를 넘었는데도 페이지는 계속 preliminary 로 오표시. `feedback_data_only_claims`(모델·가중치 주장은 실측 숫자로만) 정신에 반하는 stale 텍스트.
- 실행: `OOS_PRELIMINARY_FLOOR`(5)/`OOS_ACTIONABLE_FLOOR`(10) 상수 + `oosSampleCaveat(n)` 함수로 anecdote/preliminary/actionable 3-tier 문구를 실제 카운트 기반 동적 생성으로 정정.
- `pnpm --filter moneyball test`(4217/4217) + `type-check`/`lint` clean.

## v0.5.62.95 — 2026-08-23 (cycle 2443, review-code: buildAccuracyData.ts 신규 감사 — buildRollingAccuracy 하드코딩 소표본 임계값 정정)

### refactor(lib): `buildRollingAccuracy()`의 `windowAccuracy` 소표본 가드가 `SMALL_SAMPLE_THRESHOLD`(3, 같은 파일 내 이미 존재) 대신 하드코딩 `3` 리터럴을 사용하던 것을 상수 참조로 정정

- 진단: open issue 0, approved plan 0/29(Tier4 유지). gap trigger 전부 미도달(fix-incident 4/20, op-analysis 12/25, info-arch 18/30, lotto 3/30). 2-chain lock 미충족(직전8 distinct=4). cycle 2442가 review-code 반복 타겟 3파일(analysis/page.tsx, accuracy/page.tsx, game/[id]/page.tsx) 완전 소진 확정 + "완전히 새로운 소스 탐색 필요" 추천 — 미감사 lib 파일 크기/CHANGELOG 언급 빈도 비교(analysis-data.ts 6회, buildTeamProfile.ts 11회, buildAccuracyData.ts 3회) 결과 buildAccuracyData.ts(776줄) 최소 감사 이력으로 선정.
- 발견: `buildScoringRuleDayHeatmap`/`buildScoringRuleWeekHeatmap`은 소표본 가드에 `SMALL_SAMPLE_THRESHOLD` 상수를 쓰지만, 같은 파일의 `buildRollingAccuracy`만 `n >= 3` 리터럴 직접 사용 — 값 자체는 현재 동일(3)해 동작 변화는 없으나, 프로젝트 반복 패턴(magic number 하드코딩 → 단일 source 상수화, wave-500 MIN_POLL_TOTAL family 등)과 동일 성격의 silent drift 위험(향후 SMALL_SAMPLE_THRESHOLD 변경 시 이 줄만 누락).
- 실행: `n >= 3` → `n >= SMALL_SAMPLE_THRESHOLD`로 정정. 기존 회귀 테스트(n=5 pass / n<3 null 케이스)가 값 동일성 확인.
- `pnpm --filter moneyball test`(4217/4217) + `type-check`/`lint` clean.

## v0.5.62.94 — 2026-08-23 (cycle 2438, review-code: v2.1-B/v2.0-shadow row reasoning 필드 object stringify silent 버그 수정)

### fix(pipeline): shadow cohort(v2.1-B-shadow/v2.0-shadow) row insert가 `buildFinalReasoning()`의 object 반환값을 template literal로 그대로 interpolate — 매 shadow row마다 `reasoning` 컬럼에 실제 텍스트 대신 literal `"[object Object]"`가 저장되던 것을 정정

- 진단: open issue 0, approved plan 0/29. gap trigger 전부 미도달(fix-incident 1/20 방금 발화, op-analysis 7/25, info-arch 13/30, lotto self-heal 완료). 2-chain lock 미충족(직전8 distinct=4). explore-idea saturation 9/15 미충족. cycle 2436 review-code(heavy)가 WAR/SFR=0 family 4연속 소진 확정 — 동일 family 재검색 저수익 판단, 신규 미감사 파일(`apps/moneyball/src/app/page.tsx`, 홈페이지 1082줄) 직접 감사로 전환.
- 발견: `daily.ts`의 v2.1-B-shadow/v2.0-shadow row insert가 `\`[v2.1-B-shadow quant only] \${finalReasoning}\`` 형태로 `finalReasoning`(object, `.reasoning` string 필드 보유)을 template literal에 그대로 interpolate — JS object-to-string 강제변환으로 항상 `"[object Object]"` 저장. cycle 1013(v2.1-B-shadow)/1019(v2.0-shadow) 도입 이후 전 shadow row 영향. `/accuracy/shadow` page는 `pairProbForRow`가 `factors` JSONB로 재계산한 prob만 쓰므로(cycle 1021 hotfix 이미 이 경로로 우회) 표시값 영향은 없었으나, `reasoning` 컬럼 자체는 계속 무의미한 문자열로 오염되는 silent trap — 향후 이 필드를 직접 읽는 디버깅/분석 코드 추가 시 즉시 재현.
- 실행: 두 callsite 모두 `finalReasoning.reasoning`(실제 quant 서술 문자열)으로 수정. 회귀 테스트 1건 추가(`pipeline-daily.test.ts`) — v2.1-B/v2.0 shadow row 양쪽 reasoning이 `"[object Object]"`를 포함하지 않고 실제 텍스트를 담는지 확인.
- `pnpm --filter kbo-data test`(1182/1182, 신규 1건) + `pnpm --filter moneyball test`(4217/4217) + 양쪽 `type-check`/`lint` clean.

## v0.5.62.93 — 2026-08-23 (cycle 2435, review-code: 게임 상세 페이지 SFR=0 데이터 갭이 내러티브에서 실제 수비값처럼 노출되던 것 정정 — WAR/SFR=0 family 6th occurrence)

### fix(analysis): `factor-explanations.ts`의 `explainFactor()` SFR 케이스가 WAR 케이스와 달리 SFR=0 (Fancy Stats silent-fallback stub, predictor.ts `sfr !== 0` 가드와 동일 의미)에 대한 갭 가드가 없어 게임 상세 페이지(`/analysis/game/[id]`) 및 `GameAnalysisProse` 내러티브에서 "OB 수비가 SFR 2.1점 우위" 처럼 데이터 갭을 실제 수비 우위로 오인시키던 것을 정정

- 진단: open issue 0, approved plan 0/29. gap trigger 전부 미도달(fix-incident 12/20, op-analysis 4/25, info-arch 10/30). 2-chain lock 미충족(직전8 distinct=4). CI/lint/test 전부 clean, lotto self-heal 확인 완료 — 강한 trigger 부재. review-code(heavy)로 WAR/SFR=0 gap guard family 최근 5회(cycle 2427-2430) 수정 지점(FactorBreakdown/computeFactorAveragesFromPerspectives/predictor.ts) 인접 코드 재확장 감사.
- 발견: `analysis/game/[id]/page.tsx`가 `factorDetails`를 만들어 `GameAnalysisProse` → `explainFactor()`에 주입. WAR 케이스는 wave-536에서 `homeWar === 0 || awayWar === 0` 갭 가드 + "WAR 미집계 — 예측에서 중립 처리됨" 서술을 이미 갖췄으나, 바로 아래 SFR 케이스는 `!= null`만 검사하고 `=== 0` 갭을 그대로 실제값으로 diff 계산 — predictor.ts의 `factors.sfr = (homeSfr !== 0 && awaySfr !== 0) ? ... : NEUTRAL_FACTOR` 가드와 내러티브가 불일치.
- 실행: SFR 케이스에 WAR 케이스와 동일한 패턴(`homeSfr === 0 || awaySfr === 0` → "{team} SFR 미집계 — 예측에서 중립 처리됨") 추가. 회귀 테스트 4건 신설(`factor-explanations.test.ts`) — war/sfr 각 갭 케이스 1건 + 정상값 케이스 1건 (기존엔 war/sfr 테스트 자체가 0건이었음).
- `pnpm --filter moneyball test`(4217/4217, 신규 4건) + `type-check`/`lint` clean.

## v0.5.62.92 — 2026-08-23 (cycle 2434, polish-ui: 하락/음수 표시 red 색상 light/dark 대비 방향 불일치 4곳 정정)

### fix(components): light/dark 모드 색상 강도 방향이 dominant 패턴(light=진하게, dark=밝게, `text-red-600 dark:text-red-400`)과 반대(`text-red-400 dark:text-red-500`)로 적용돼 있던 4곳을 정정 — light 모드 white 배경 대비 ~3:1로 WCAG AA(4.5:1) 미달

- 진단: 직전 8 cycle이 review-code/operational-analysis 2개로 고정된 2-chain alternation lock 탐지 → 두 chain 제외 후 나머지 pool 중 강한 trigger 없어 SKILL.md 지정 fallback `polish-ui` 발화. 체크박스성 발화 방지 위해 DESIGN.md 색상 규칙 vs 실제 코드 grep 대조 실측 진행.
- 발견: `text-red-600 dark:text-red-400` 패턴이 전체 40+ 곳에서 일관 사용되나, `app/accuracy/page.tsx`(주간 정확도 표 + 팀별 정확도 스파크라인) 2곳과 `components/analysis/TeamStrengthGrid.tsx`(KBO Elo 변화 화살표) / `components/analysis/MlbTeamStrengthGrid.tsx`(MLB 연패 표시) 2곳만 역방향(`text-red-400 dark:text-red-500`) — MLB 컴포넌트는 KBO 원본을 그대로 이식하며 기존 불일치까지 함께 포팅된 것으로 추정.
- 실행: 4곳 모두 dominant 패턴(`text-red-600 dark:text-red-400`)으로 통일. `pnpm --filter moneyball lint` clean.

## v0.5.62.91 — 2026-08-23 (cycle 2430, review-code: WAR/SFR=0 데이터 갭 sentinel이 FactorBreakdown 팩터별 stat label 에 raw 노출되던 것 정정 — family 5th occurrence)

### fix(components): WAR/SFR=0 (Fancy Stats 데이터 갭 sentinel)이 `FactorBreakdown` 컴포넌트의 팩터별 "away X · home Y" stat label 텍스트엔 gap guard 미적용 상태로 방치돼 예측 상세(`/predictions/[date]`, `/insights/[date]`) 페이지에서 실제 데이터 갭인데도 "home 0.0" 같은 값을 실제 수치로 오인시키던 것을 정정

- 진단: open issue 0, approved plan 0/29. gap trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 2/25, info-arch 4/30, lotto 37/30 재충족이나 실측 확인 결과(`~/lotto_picks/2026-08-29-50sets.md` + `2026-08-22-result.md` 모두 당일 생성) 이미 self-heal 완료 — 6번째 no-op, skip). 2-chain lock 미충족(직전8 distinct=5). explore-idea saturation 미충족(11/15). cycle 2429 retro 가 명시한 잔여 미감사 파일(`predictions/[date]/page.tsx`, `teams/[code]/page.tsx`, `matchup/[teamA]/[teamB]/page.tsx`) 직접 감사.
- 발견: `teams/[code]/page.tsx`는 cycle 2429 에서 이미 수정된 `computeFactorAveragesFromPerspectives` 결과(`profile.factorAverages`)를 그대로 소비해 정합. 그러나 `predictions/[date]/page.tsx` → `FactorBreakdown` 컴포넌트(`insights/[date]/page.tsx` 도 동일 컴포넌트 공유)의 `getStatLabel()` 이 "war"/"sfr" 케이스에서 `pred.home_war_total`/`pred.home_sfr` raw 값을 `!= null` 만 검사해 그대로 텍스트로 노출 — 팩터 막대(bar)는 `predictor.ts` 의 gap guard(WAR: 한쪽이라도 `<=0`, SFR: 한쪽이라도 `===0`)가 이미 적용돼 중립(비슷)으로 정확히 표시되지만, 막대 아래 보조 stat label 텍스트는 별도 raw 값 경로라 "away 2.3 · home 0.0" 처럼 갭을 실제 수치로 오인시키는 불일치 — family 5th occurrence.
- 실행: `FactorBreakdown.tsx` `getStatLabel()` war/sfr 케이스에 predictor.ts 와 동일한 guard 추가 (war: 양쪽 `> 0`, sfr: 양쪽 `!== 0`) — 조건 미충족 시 statLabel `null` 반환으로 텍스트 자체 숨김(막대의 중립 표시와 정합). 회귀 테스트 4건 추가(war 갭 시 숨김/war 정상 노출/sfr 갭 시 숨김/sfr 음수 정상값 양쪽 존재 시 정상 노출).
- `pnpm --filter moneyball test`(4213/4213, 신규 4건) + `type-check`/`lint` clean.

## v0.5.62.90 — 2026-08-23 (cycle 2429, review-code: WAR/SFR=0 데이터 갭 sentinel이 팀 프로필 평균 집계에 raw 노출되던 것 정정 — family 4th occurrence)

### fix(shared): WAR/SFR=0 (Fancy Stats 데이터 갭 sentinel)이 `computeFactorAveragesFromPerspectives` 팀 관점 평균 집계엔 gap guard 미적용 상태로 방치돼 팀 프로필/매치업 페이지 "평균 SFR/WAR" 표시값이 갭 경기 수만큼 0쪽으로 끌려 내려가던 것을 정정

- 진단: open issue 0, approved plan 0/29. gap trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 2/25, info-arch 4/30, lotto 재충족이나 실측 확인 결과 이미 self-heal 완료 — 6번째 no-op, skip). 2-chain lock 미충족(직전8 distinct=5). explore-idea saturation 미충족(11/15). cycle 2428 retro 가 제안한 "review-code 남은 monolith sweep" 방향으로 미감사 파일(`buildTeamProfile.ts`, `buildTeamFactorAverages.ts`) 직접 감사.
- 발견: `predictor.ts`(wave-533/535)와 `computeCompositeDuel.ts` 는 이미 SFR `!== 0` / WAR `> 0` gap guard를 갖고 있으나(2419/2428 에서 확인·보강), 8팩터 평균 단일 source `computeFactorAveragesFromPerspectives`(packages/shared, cycle 2040/2064 통합)는 `v != null` 만 검사해 literal 0(Fancy Stats silent-fallback stub, `fetchEloRatings` `sfr || FANCY_STATS_DEFAULTS.sfr`)을 유효 데이터로 평균에 포함 — `buildTeamProfile.ts`(팀 프로필 페이지) + `buildTeamFactorAverages.ts`(매치업 페이지) 양쪽 callsite 가 이 오염된 평균을 그대로 화면에 표시(`teams/[code]/page.tsx` "평균 SFR"/"평균 WAR" 스탯 카드). MLB 대응 `buildMlbTeamFactorAverages.ts`는 SFR/WAR 필드 자체가 없어 영향 없음.
- 실행: `computeFactorAveragesFromPerspectives` 안에서 평균 계산 전 sfr===0→null, warTotal<=0→null 로 정규화해 `computeNumericAveragesFromPerspectives`(v != null 필터) 가 자연히 제외하도록 단일 지점에서 수정 — 두 callsite 모두 동시 반영. 회귀 테스트 5건 추가(sfr=0 제외/warTotal<=0 제외/음수 sfr 유효 데이터 유지/전 표본 갭 시 null/다른 팩터 미영향).
- `pnpm --filter @moneyball/shared test`(217/217, 신규 5건) + `pnpm --filter kbo-data test`(1181/1181) + `pnpm --filter moneyball test`(4209/4209) + 전체 `type-check`/`lint` clean.

## v0.5.62.89 — 2026-08-23 (cycle 2428, review-code: WAR/SFR=0 데이터 갭 sentinel이 LLM 토론 프롬프트에 raw 노출되던 것 마스킹)

### fix(agents): WAR/SFR=0 (Fancy Stats 데이터 갭 sentinel)이 정량 엔진(predictor.ts)에선 neutral 처리되지만 LLM 토론 프롬프트엔 raw 0 그대로 노출돼 "팀 WAR 0" 같은 실제 없는 서술을 유발할 수 있던 것을 명시적 갭 표기로 정정

- 진단: open issue 0, approved plan 0/29. gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 1/25, info-arch 3/30, lotto self-heal 완료 6번째 no-op — skip). 2-chain lock 미충족(직전8 distinct=5). explore-idea saturation 미충족(11/15). 강한 trigger 부재 상태에서 최근 미감사 영역(`packages/kbo-data/src/agents/personas.ts`, 마지막 터치 2026-05-26) 직접 감사 시작.
- 발견: personas.ts 자체는 정합(팀 wOBA/불펜FIP/WAR/SFR/Elo/최근폼 주입 목록이 team-agent.ts 실제 injection과 일치). 감사를 이어가다 `predictor.ts`(cycle 1904 wave-533 WAR guard, cycle 2419 SFR guard)의 "asymmetric zero = Fancy Stats 데이터 갭 → neutral(0.5)" 처리가 정량 스코어링 엔진(predictor.ts)과 UI duel 배지(computeCompositeDuel.ts)에만 적용돼 있고, 정작 LLM 이 직접 보는 3개 소비처 — `team-agent.ts` buildUserMessage(inline 주입) / `context/agent-context.ts` formatMetricLine(contextBlock 렌더) / `validator.ts` buildInjectionText(환각 검증용 복제본, "team-agent와 동일 소스" 자체 주석) — 는 전부 raw 0 을 그대로 노출하고 있었음. LLM 이 "WAR 0" 을 실제 값으로 인용해도 이는 페르소나가 허용하는 "주입된 수치 직접 인용" 화이트리스트에 해당해 환각 검사도 통과 — 정량 모델의 중립 처리와 LLM 서술 사이 불일치가 은폐된 3rd occurrence.
- 실행: `agent-context.ts` 에 단일 소스 `formatGapAwareStat(slug, value)` 추가 (war/sfr slug + value===0 시 "데이터 없음(집계 갭)" 반환) — `formatMetricLine`(contextBlock) 적용 + `team-agent.ts` inline 주입 2곳(홈/원정) + `validator.ts` buildInjectionText 2곳(홈/원정) 동일 helper 재사용. validator.ts 자체 주석이 이미 "half-applied fix 재발" 위험을 경고하던 지점이라 3곳 모두 단일 source 로 동기화. 회귀 테스트 5건 추가(team-agent 3건: WAR=0/SFR=0 갭 표기 + 정상값 raw 유지, validator 2건: buildInjectionText WAR/SFR=0 갭 표기 동기 확인).
- `pnpm --filter kbo-data test`(1181/1181, 신규 5건) + `pnpm --filter moneyball test`(4209/4209) + 양쪽 `type-check`/`lint` clean.


### fix(predict): 수비 SFR=0 (Fancy Stats silent-fallback stub, `sfr || FANCY_STATS_DEFAULTS.sfr`)이 원정/홈 한쪽만 0일 때 실제 평균 수비력으로 오인되어 duel 승패/예측 팩터에 그대로 반영되던 것을 WAR=0 guard(cycle 1904 wave-533/535)와 동일 family 로 중립 처리

- 진단: open issue 0, approved plan 0/29. gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 3/25, info-arch 24/30, lotto 27/30). 2-chain lock 미충족(직전8 distinct=4). cycle 2417/2418 retro 가 남긴 미감사 monolith `analysis/page.tsx`(2803줄) 직접 감사(agent 위임).
- 발견: `predictor.ts:107` `factors.sfr = normalize(homeSfr, awaySfr, true)` 가 SFR=0 을 실제 리그 평균과 구분 없이 그대로 계산에 사용 — `fetchEloRatings`(`fancy-stats.ts:485`) 의 `sfr || FANCY_STATS_DEFAULTS.sfr`(=0) silent-fallback stub 과 진짜 평균 팀(0)이 원천적으로 구분 불가능한 구조. 동일 파일 WAR 팩터(line 84-90)는 이미 cycle 1904 wave-533 에서 "totalWar=0 on one side = 데이터 갭, asymmetric zero → neutral" guard 를 갖고 있으나 SFR 은 미적용 상태로 방치. `computeCompositeDuel.ts`(sfrResult/valid, line 74-81/160) 와 `analysis/page.tsx` SFR 직접대결 배지 4곳 중 3곳(line 1127/1645/2314, WAR 대응 line 1111/1713/2298 은 모두 `> 0` guard 보유)도 동일 누락.
- 실행: predictor.ts `factors.sfr` 에 home/awaySfr 중 한쪽이라도 0 이면 neutral(0.5) 처리하는 guard 추가(WAR 과 달리 SFR 은 음수가 정상값이라 `> 0` 대신 `!== 0` 사용). computeCompositeDuel.ts sfrResult/valid 양쪽에 동일 guard 반영. page.tsx 3곳 배지에 WAR 과 동일한 `!== 0` guard 추가. 회귀 테스트 4+3건 추가(predictor SFR data-gap guard 4케이스, computeCompositeDuel SFR guard 3케이스) — 기존 computeCompositeDuel.test.ts 안 sfr=0 을 "유효 승리 팩터"로 encoding 하던 2개 테스트값을 nonzero 로 정정.
- 부수 발견: `apps/moneyball/package.json`/루트 `package.json` 이 cycle 2413 커밋(VERSION 0.5.62.87 bump)에서 버전 미동기화된 채 0.5.62.86 로 정체 — `version-sync-guard.test.ts`(cycle 2047) 가 이를 정상 탐지해 테스트 fail 상태였음(이번 전까지 scoped test 만 돌려 미발견). 0.5.62.87 로 캐치업 후 본 사이클 버전(0.5.62.88)과 함께 커밋.
- `pnpm --filter kbo-data test`(1175/1175) + `pnpm --filter moneyball test`(4208/4208) + 양쪽 `type-check`/`lint` clean.

## v0.5.62.87 — 2026-08-23 (cycle 2413, review-code: MLB shadow-train milestone_hit 영구 false 수정)

### fix(mlb): `mlb_shadow_train_log.milestone_hit` 이 samples.length(하루치, 최대 15경기)와 MILESTONE_TRIGGERS([27,60,150,300,1000,2430])를 직접 비교해 어떤 threshold 도 도달 불가능하던 것을 누적치 비교로 수정

- 진단: open issue 0, approved plan 0/22. gap trigger 4종 전부 미도달(fix-incident 19/20, op-analysis 20/25, info-arch 18/30, lotto 21/30). 2-chain lock 미충족(직전8 distinct=3). cycle 2412 retro 추천 fresh target(mlb-shadow-c.ts/mlb-overview.ts/statsapi-mlb.ts) 직접 감사.
- 발견: `mlb-pipeline.ts` `runShadowTrain` 이 `MILESTONE_TRIGGERS.includes(samples.length)` 로 milestone 도달을 판정했는데, `samples.length` 는 이 함수가 매번 단일 `date` 하루치 `mlb_schedule` final 경기 수(MLB 특성상 최대 약 15경기)라 KBO v1.8→v2.0 n=150 패턴을 차용한 threshold 값(27/60/150/300/1000/2430, 모두 "누적 학습 표본 수" 의도)과 절대 일치할 수 없던 구조 — `milestone_hit` 컬럼이 테이블 생성(migration 049) 이후 한번도 true 를 기록한 적 없이 영구 false 로 방치.
- 실행: insert 직전 `mlb_shadow_train_log`(league='mlb') 기존 `sample_count` 합을 조회해 누적치를 구하고, `priorCumulative < threshold <= newCumulative` 로 crossing 판정하도록 수정. `mlb-overview.ts`(toSentence/buildMlbGameOverview, factor 분류 3-set)는 mlb-waterfall.ts 의 defense_sfr/sp_xwoba_against/woba_std 제외 설계(cycle 2402 이미 공개)와 정합 확인 — clean, 변경 없음. 회귀 가드 2건 추가(누적 미달 시 false / 26+1=27 crossing 시 true). `tsc --noEmit`/`eslint`(scoped) clean, `pnpm --filter kbo-data test` 90 files/1171 tests green(신규 2건).
- 후속: `statsapi-mlb.ts` `fetchProbablePitchers` 개인 투수 통계 소스 부재(cycle 2402 Tier 3 기록)는 이번 스코프 밖.

## v0.5.62.86 — 2026-08-23 (cycle 2400, review-code: shared 상수 4개 stale doc comment 정정)

### docs(shared): DEVICE_ID_MAX_LENGTH/MIN_POLL_TOTAL/COMMUNITY_DIVERGE_MIN/CALIBRATION_BUCKET_WIDTH doc comment가 이미 해소된 drift 를 미해결로 오도 서술 중이던 것 정정

- 진단: open issue 0, approved plan 0/22. gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 6/25, info-arch 4/30, lotto 7/30). 2-chain lock 미충족(직전8 distinct=5). cycle 2399 retro 가 남긴 미감사 monolith lead(accuracy/page.tsx 1204줄) 직접 감사.
- 발견: accuracy/page.tsx 자체(쿼리 필터, computeCommunityVsAI, buildFactorAccuracy, 상수 사용)는 전부 정합 — 신규 코드 drift 없음. 대신 `packages/shared/src/index.ts` 안 4개 상수 doc comment 가 각각 wave 303/305/500/305(cycle 1632/1634/1867/1634) 당시 "동일 숫자 N hardcoded/로컬 사본" 미해결 상태를 서술한 채 남아있었으나, 실제 코드(`app/api/picks/submit/route.ts`, `components/picks/PickButton.tsx`, `app/page.tsx`, `app/debug/reliability/page.tsx`)는 이미 전부 해당 상수를 shared 에서 import 해 사용 중 — comment 만 과거 wave 시점 그대로 정지된 채, 실제로는 해소된 drift 를 미해결로 오도 서술하던 stale-comment 케이스.
- 실행: 4개 comment 를 "fix 완료" 서술로 정정 (코드 동작 변경 없음). `pnpm --filter @moneyball/shared type-check` clean, `pnpm --filter @moneyball/shared test` 212 tests green, pre-push lint+type-check(전 패키지) green.

## v0.5.62.85 — 2026-08-23 (cycle 2390, review-code: hub-dispatch Sentry no-relay 태그 no-op 수정)

### fix(observability): `/api/hub-dispatch` 재귀 방지 태그가 실제로 붙지 않던 no-op 수정

- 진단: open issue 0, approved plan 0/22. gap trigger 4종 전부 미도달(fix-incident 7/20, op-analysis 22/25, info-arch 25/30, lotto 28/30). 2-chain lock 미충족(직전8 distinct=3: none/fix-incident/review-code). lite chain cooldown 미충족. cycle 2389 retro 추천대로 cron API routes 미감사 표면 재탐색 — `picks/results/route.ts` (clean, family #1338 패턴은 cycle 2288 이미 의도 확인) 다음 `hub-dispatch/route.ts` 감사.
- 발견: 이 route 는 Sentry webhook 을 받아 playbook 허브로 relay 하는데, 이 route 자체가 던진 예외를 Sentry 가 다시 캡처하면 alert rule 이 재귀적으로 이 route 를 다시 호출할 위험이 있어 캡처된 이벤트에 `no-relay=true` 태그를 붙여 alert rule 에서 제외하는 설계(주석 명시, `fp:vercel-deploy-1e80b78` 2026-04-22 사례 대응). 그러나 실제 코드 `Sentry.withScope((s) => s.setTag('no-relay', 'true'))` 는 콜백 안에서 아무 캡처도 하지 않은 채 즉시 scope 를 버려 — 이후 `composePayload`/`toDispatchBody`/GitHub `fetch` 등에서 발생하는 예외(현재 어느 것도 try/catch 로 감싸지 않음)를 Next.js/Sentry 가 자동 캡처할 때 이 임시 scope 는 이미 소멸된 뒤라 태그가 전혀 붙지 않는 순수 no-op. 재귀 방지 메커니즘이 처음부터 작동한 적 없던 silent 설계 결함(2e8ace67 최초 커밋부터).
- 실행: `Sentry.getCurrentScope().setTag('no-relay', 'true')` 로 교체 — Next.js Sentry 통합이 요청당 유지하는 isolation scope 에 직접 설정해 해당 요청 동안의 모든 캡처(자동/수동)에 태그가 지속되도록 수정. `tsc --noEmit` + `eslint`(scoped) clean, `pnpm --filter moneyball test` 전체 500 files/4203 tests green.
- 후속: `composePayload`/`toDispatchBody`/GitHub `fetch` 호출부를 명시적 try/catch 로 감싸는 방어적 보강은 이번 스코프 밖(태그 지속 수정만으로 자동 캡처 경로는 이미 해소) — 필요 시 별도 review-code 후보.

## v0.5.62.84 — 2026-08-23 (cycle 2380, polish-ui: 강수렴 배지 dark 색상 페이지 간 불일치 해소)

### fix(design): `analysis/page.tsx` 강수렴 레이블 칩 `dark:bg-brand-900/40` → `dark:bg-brand-800/40` (spec 정합)

- 진단: open issue 0건, approved plan 0/22. review-code 직전 5사이클(2374-2378) non-success streak 5/5 도달로 cooldown 진입(2379~2388, 후보 제외). 직전 8사이클(2372-2379) distinct=3(review-code/explore-idea/polish-ui), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 17/20, op-analysis 12/25, info-arch 15/30, lotto 18/30). cycle 2377 polish-ui retro 가 남긴 lead("다음 polish-ui 후보 = convergence-badge-system.md(cycle 1818) 이후 wave-660+ 신규 라우트 배지 스타일 일관성 확인")를 단서로 `docs/design/convergence-badge-system.md` spec 재확인.
- 발견: spec(25행)이 문서화한 "strong" 3-tier 칩 dark 배경 = `dark:bg-brand-800/40`. `analysis/game/[id]/page.tsx`(wave-463, 완전수렴/강수렴 레이블)는 spec 과 일치(`dark:bg-brand-800/40`)하나, `analysis/page.tsx`(wave-465)는 주석에 "game/[id] wave-463 동일 패턴"이라 명시했음에도 실제 코드가 `dark:bg-brand-900/40`으로 달라 다크모드에서 두 페이지 강수렴 배지 색상 톤이 미세하게 어긋나던 silent drift. 완전수렴(amber) 레이블은 두 페이지 모두 `dark:bg-amber-800/40`로 일치 — 강수렴(brand)만 편차.
- 실행: `analysis/page.tsx` 해당 1줄 `brand-900/40` → `brand-800/40` 정정. `tsc --noEmit`/`eslint` clean.
- 후속: convergence-badge-system.md 의 잔여 "다음 cycle 후속 후보"(수렴 배지 컴포넌트 분리 `ConvergenceBadge.tsx`, amber tier CSS 변수화)는 스코프 밖 — 이번 사이클은 spec-vs-코드 색상 편차 1건만 해소.



### fix(design): `--color-surface-dark` dead 토큰 제거 + `--color-border` DESIGN.md 문서화

- 진단: 직전 8사이클(2369-2376) distinct=2 (review-code/explore-idea) → 2-chain alternation lock 탐지. 잠긴 두 chain 제외, 주기 trigger 4종 미도달 → 룰에 따라 polish-ui 강제 발화.
- 실행: globals.css `--color-*` 30개 토큰 전수 grep, DESIGN.md 대조. `--color-surface-dark`(#0f2318) 전체 리포 참조 0건(정의만 존재) 확인 후 제거. `--color-border`(602회 참조, 다크모드 전용 정상 패턴) DESIGN.md 미문서화 보완.
- 검토: twitter-image.tsx 10개 파일의 카테고리별 상이한 그라디언트는 cycle 1212 의도적 박제(silent leak family wave 38) — drift 아님, 변경 안 함.
- `tsc --noEmit` clean, pre-push lint/type-check green.

## v0.5.62.82 — 2026-08-23 (cycle 2363, fix-incident: 3-way version file drift 해소)

### fix(ci): root `package.json`/`VERSION` 이 `apps/moneyball/package.json` 대비 2 버전 뒤처진 drift 해소

- 진단: open issue 0건, approved plan 0/22. 직전 8사이클(2355-2362) distinct=6
  (2-chain lock 미충족). 주기 trigger 4종 전부 미도달. `gh run list --limit 10` 로
  최근 워크플로 실행 확인 — cycle 2360/2361 두 커밋 모두 CI `Test` 스텝이 red
  (`version-sync-guard.test.ts` 2건 실패) 로 5~7분 만에 fail 상태였음을 발견.
- 원인: `docs: cycle 2360/2361 CHANGELOG/TODOS + version bump` 두 커밋이
  `scripts/bump-version.sh` (VERSION + root package.json + apps/moneyball/package.json
  3-way atomic sync 전용, cycle 2068/2070 stale 재발 방지 목적으로 이미 존재) 를
  실행하지 않고 `apps/moneyball/package.json` 만 수동 편집 — root `package.json`/
  `VERSION` 이 `0.5.62.79` 에 멈추고 moneyball 만 `0.5.62.81` 까지 앞서 나감.
  R7 자동 머지 정책상 두 커밋 모두 이미 squash 없이 main 에 직접 push 됐던 policy/docs
  커밋(PR 게이트 없음) 이라 CI red 상태가 사후 감지만 되고 머지 자체는 막히지 않음.
- 실행: `./scripts/bump-version.sh 0.5.62.81` 로 3개 파일 동기화 후
  `pnpm --filter moneyball test` 전체 500 files/4203 tests green 확인, 커밋+push.
  CI Test 스텝 정상 통과 확인.
- 후속: 스크립트 자체는 정상 작동 확인 완료 — 재발 방지는 "docs: cycle N" 커밋 작성 시
  반드시 `bump-version.sh` 경유 (수동 JSON 편집 금지) 원칙 재확인. 자동 pre-commit
  가드 추가는 스코프 밖(별도 review-code 후보로 carry-over).

## v0.5.62.81 — 2026-08-23 (cycle 2361, operational-analysis(heavy): KBO CE/비CE 격차 5-cycle 연속 재확인)

### data(op-analysis): CREDIT_EXHAUSTED(CE) vs 비CE 정확도 격차 재측정 — `scripts/op-analysis-ce-cohort.ts`

- 진단: open issue 0건, approved plan 0/22. 직전 8사이클 distinct=4 (2-chain lock 미충족).
  주기 trigger 4종 중 operational-analysis 만 25/25 gap 도달(마지막 발화 cycle 2336) — 채택.
  cycle 2336(heavy)/2334(lite) 직전 2회 연속 retro-only(완전 정적 상태) 였으나, 갭 트리거
  재도달 시점에 harness 재실행하여 신규 데이터 반영 여부 실측.
- 실행: `pnpm tsx scripts/op-analysis-ce-cohort.ts` 재실행. 전체 n=332 (CE n=285 / 비CE
  n=47 — 비CE 표본 2026-07-01 이후 신규 0건, 동결 53일 경과). CE 53.7%(153/285) / 비CE
  63.8%(30/47) → 격차 10.1pp (cycle 2309 9.8pp 대비 미세 확대, 5-cycle window
  9.7~10.8pp 안정 범위 유지). overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 →
  LLM 부가가치 우세 방향 5회 연속 재확인. CE n 증가분(274→285, +11) 전부 8월 데이터.
- 결론: 코드 변경 없음(측정 전용). 가중치 재조정/Platt scaling 불필요 결론 유지
  (`CLAUDE.md` 예측 엔진 가중치 섹션에 cycle 2361 항목 추가). CREDIT_EXHAUSTED 지속
  (사용자 크레딧 재충전 미이행), 비CE 표본 동결로 재분리 불가 상태 변화 없음.

## v0.5.62.80 — 2026-08-23 (cycle 2360, review-code(heavy): EN mlb/reviews weekly/monthly 날짜 라벨 한글 leak 해소)

### fix(mlb): `computeWeekRange.ts`/`computeMonthRange.ts` 의 `range.label` 에 locale 파라미터 추가 — EN 미러 3개 라우트의 title/h1/OG/JSON-LD/breadcrumb/nav 링크에 한글 날짜 라벨이 노출되던 silent i18n drift 해소

- 발견: cycle 2360 진단 단계에서 open issue/approved plan/주기 trigger 전부 미도달 확인 후,
  직전 cycle(2359) review-code(heavy) 가 감사한 agent 파일들과 별개로 `en/mlb/reviews/weekly`,
  `en/mlb/reviews/monthly` EN 미러 신규 코드(wave-660, cycle 2355/2356 배선)가 아직 review-code
  sweep 대상이 아니었음을 확인, Feature-Drift Cycle 패턴(신규 기능 → 후속 코드 감사)에 따라
  해당 코드 직접 read. `computeWeekRange.ts`/`computeMonthRange.ts` 의 `buildLabel`/
  `buildMonthRange` 가 locale 무관하게 "YYYY년 M월 D일" 한글 포맷을 하드코딩하고 있어,
  `/en/mlb/reviews`(허브 최근 주/월 목록), `/en/mlb/reviews/weekly/[week]`,
  `/en/mlb/reviews/monthly/[month]` 3개 EN 페이지의 title/description/OG/JSON-LD
  headline/h1/breadcrumb 마지막 항목/"Recent Weekly·Monthly Reviews" nav 링크 텍스트 전부에
  한글 날짜 문자열이 그대로 노출되고 있었음을 확인(silent i18n drift — nav 라우팅 자체는
  cycle 2358 에서 이미 정상화됐으나 표시 텍스트 레벨의 누락은 미포착).
- 실행: 두 유틸에 `locale: 'ko'|'en'` 파라미터 추가(기본값 `'ko'`, 기존 KO callsite 전부
  무변경 — `mlb-shared.ts` 의 `FACTOR_LABELS_EN` locale 파라미터 컨벤션과 동일 패턴). EN
  전용 3개 파일(`en/mlb/reviews/page.tsx`, `en/mlb/reviews/weekly/[week]/page.tsx`,
  `en/mlb/reviews/monthly/[month]/page.tsx`)의 `parseWeekId`/`parseMonthId`/
  `getRecentWeeks`/`getRecentMonths` 호출부만 `'en'` 로 배선.
- 검증: `tsc --noEmit`(전체 workspace) clean, `eslint`(전체) clean, `pnpm test`(moneyball
  500 files/4203 tests) all green. 신규 회귀 테스트 4건(주/월 range 각 2건, 한글 미포함
  assertion) 추가.

## v0.5.62.79 — 2026-08-23 (cycle 2358, info-architecture-review: EN nav weekly/monthly stale scope-exception 제거)

### fix(nav): Header/Footer `withLocale`/`withMlbLocale` 의 `/mlb/reviews/weekly`, `/mlb/reviews/monthly` stale 예외 해제 — EN 미러 신규 배선(cycle 2355/2356) 이후 미동기 silent nav drift 해소

- 발견: cycle 2358 진단 단계에서 직전 7일 내 신규 라우트 20건(EN 미러 시리즈) 발견하여
  info-architecture-review trigger(라우트 신규 추가 ≥3/1주) 채택. sitemap/breadcrumb 는 이미
  동기됐지만 `Header.tsx`/`Footer.tsx` 의 `withLocale`/`withMlbLocale` 헬퍼가 여전히
  `/mlb/reviews/weekly`, `/mlb/reviews/monthly` 를 "EN 미러 부재(cycle 2226 의도적 scope
  축소)" 로 blanket 예외 처리 — cycle 2355(weekly)/2356(monthly) 에서 이미 EN 미러가
  배선됐음에도 주석·로직이 stale 상태로 남아 EN 페이지에서 헤더 메가메뉴·푸터 사이트맵의
  Weekly/Monthly Review 링크가 KO 라우트로 계속 이탈(cycle 2139/2226 family 재발, `/mlb/reviews`
  `/mlb/reviews/misses` 는 wave-659(cycle 2339)에서 이미 해제됐던 동일 예외 목록의 잔여 2건).
- 실행: 양쪽 헬퍼에서 weekly/monthly 특례 분기 제거(이제 다른 `/mlb/*` 라우트와 동일하게
  `/en` prefix 치환). 관련 테스트 3파일(`Header.test.ts`, `Footer.test.tsx`,
  `wave-659-en-mlb-reviews-mirror.test.ts`) 의 stale 예외 assertion 도 함께 갱신.
- 검증: `tsc --noEmit`(전체 workspace) clean, `eslint`(전체) clean, `pnpm test`(moneyball
  500 files/4198 tests) all green.

## v0.5.62.78 — 2026-08-23 (cycle 2356, explore-idea: en/mlb/reviews/monthly 영어 미러 신규 배선)

### feat(mlb): `/en/mlb/reviews/monthly` MLB 월간 리뷰 영어 미러 신규 배선 — cycle 2355 weekly 완료 직후 후속(plan #26 phase 분리 관례)

- 발견: cycle 2355 explore-idea retro가 "다음 explore-idea 후보 = `/en/mlb/reviews/monthly`
  동일 패턴 미러(이번 cycle 과 동일 방법론 재사용, buildMlbMonthlyReview 에도 동일 locale
  param 추가 필요)" 로 명시적 carry-over — weekly EN 미러와 완전히 동일한 구조(KO 페이지
  전체 mirror + locale param 배선)라 그대로 재사용.
- 실행: `buildMlbMonthlyReview.ts` 에 `locale?: 'ko'|'en'` 파라미터 추가(기본값 `'ko'`, 기존
  KO callsite 무변경), `buildSummary` 자연어 문장 EN 분기 신규 작성, `buildMlbFactorInsights`
  호출에 locale 전달. `MonthlyTeamStatsSortControl` 에도 `WeeklyGamesSortControl` 과 동일
  패턴으로 `locale` prop 추가. `/en/mlb/reviews/monthly`(redirect index) + `/en/mlb/reviews/monthly/[month]`
  (KO 페이지 전체 mirror, ConvergenceHomeAwayBadges/ConvergenceDayOfWeekBadges/ConvergenceTeamStatsBadges/
  MlbHighlightCard/Breadcrumb 는 기존 `locale` prop 재사용) + opengraph-image(이미 영어라
  URL 경로만 교체)/twitter-image/not-found 신규. `sitemap.ts` 에 `enMlbMonthlyReviewRoutes`
  (최근 6개월) 추가 + stale 주석("monthly EN 미러는 스코프 밖") 정정. `/en/mlb/reviews`
  허브에 월간 리뷰 진입 카드 신규 배선(KO 허브와 동일 구조).
- 결론: MLB weekly + monthly 리뷰 KO/EN parity 완결(cycle 620 최초 언급 → cycle 2355 weekly
  → cycle 2356 monthly, 3-cycle 시리즈 종료). 다음 explore-idea 후보 = 자연 발견.

검증: `tsc --noEmit`(kbo-data+moneyball) clean, `eslint`(양쪽) clean, `pnpm test`(kbo-data
90 files/1165 tests + moneyball 500 files/4198 tests all green).

## v0.5.62.77 — 2026-08-23 (cycle 2355, explore-idea: en/mlb/reviews/weekly 영어 미러 신규 배선)

### feat(mlb): `/en/mlb/reviews/weekly` MLB 주간 리뷰 영어 미러 신규 배선 — cycle 620 최초 언급 이후 다중 cycle carry-over 해소

- 발견: cycle 2338/2341/2342 explore-idea/review-code retro가 반복적으로 "en/mlb/reviews
  weekly/monthly 미러(MLB 주/월 range 유틸 부재로 보류)" 를 다음 후보로 carry-over — 직접
  확인 결과 `computeWeekRange.ts`/`computeMonthRange.ts` 는 이미 league-agnostic(plan #26
  당시 발견)이라 서술이 stale, 실제 미배선 이유는 단순 미착수. `/en/mlb/reviews` 자체도
  cycle 2226/2227 당시 "weekly/monthly 서브페이지는 EN 미러 부재라 index 진입 카드는 스코프
  밖" 으로 명시적으로 미룬 상태였음.
- 실행: `buildMlbWeeklyReview`/`buildMlbFactorInsights`(mlb-shared.ts)에 `locale?: 'ko'|'en'`
  파라미터 추가(기본값 `'ko'`, 기존 KO callsite 무변경 — `buildMlbMissReport` 기존 패턴과
  동일), `buildSummary` 자연어 문장 EN 분기 신규 작성. `MlbHighlightCard`/`WeeklyGamesSortControl`
  에도 동일 패턴으로 `locale` prop 추가(배지/정렬 라벨 번역, badge 원본 3-literal 은 스타일
  분기 키로 유지). `/en/mlb/reviews/weekly`(redirect index) + `/en/mlb/reviews/weekly/[week]`
  (KO 페이지 전체 mirror, ConvergenceHomeAwayBadges/ConvergenceTeamStatsBadges 는 기존
  `locale` prop 재사용) + opengraph-image(이미 영어라 URL 경로만 교체)/twitter-image/not-found
  신규. `sitemap.ts` 에 `enMlbWeeklyReviewRoutes`(최근 12주) 추가, `/en/mlb/reviews` 허브에
  주간 리뷰 진입 카드 신규 배선.
- 스코프: monthly EN 미러는 별도 cycle 후속(plan #26 phase 분리 관례 동일 적용) — 이번
  cycle 은 weekly 단독.
- 잡음 발견: cycle 2354 두 번째 커밋이 `apps/moneyball/package.json` 만 갱신하고 루트
  `package.json`/`VERSION` 갱신을 누락(3-way version-sync-guard drift, cycle 2047 가드
  테스트가 로컬 실행에서 즉시 검출) — 이번 커밋에서 3파일 모두 `0.5.62.77` 로 동기 정정.

검증: `tsc --noEmit`(kbo-data+moneyball) clean, `eslint`(양쪽) clean, `pnpm test`(kbo-data
90 files/1165 tests + moneyball 499 files/4195 tests all green, version-sync-guard 포함).

## v0.5.62.76 — 2026-08-23 (cycle 2354, fix-incident: MLB waterfall/factor-detail/overview recent_form·head_to_head 표시 동기화)

### fix(mlb): waterfall/factor-detail/overview 에 실측 recent_form/head_to_head 델타 반영 — cycle 2353 wiring 이후 미동기 silent drop 해소

- 발견: cycle 2353이 predict_final 에 recent_form/head_to_head 실측을 연결했지만(cycle 2349
  elo 와 동일 패턴), `computeMlbWaterfall`/`buildMlbGameOverview`/`buildMlbFactorDetailRows` 는
  여전히 두 팩터를 "항상 중립값" 가정으로 bar 계산에서 통째로 제외 — cycle 2353 retro가 명시
  남긴 다음 후보(cycle 2349→2352 elo 사례와 동일한 표시 레이어 미동기).
- 수정: `MlbWaterfallInput` 에 recent_form/head_to_head pair 필드 추가. head_to_head 는
  `mlb-base.ts` 계약상 단일 homeWinRate 값이라 `{home: rate, away: 1-rate}` 대칭 pair 로
  인코딩(multiplier 0.5)해 기존 pairTerms 루프 재사용. `GAME_DETAIL_FACTOR_ROWS`(ko/en)
  에 두 팩터 행 추가(8→10) + predictions select 에 `home_recent_form`/`away_recent_form`/
  `head_to_head_rate` 컬럼 추가. `mlb-overview.ts` SITUATIONAL_FACTORS + `mlb-factor-detail.ts`
  퍼센트 포맷 케이스 추가.
- 문서: `MlbFactorWaterfallChart` 캡션 + `buildMlbTeamStrengthSnapshot.ts` 주석 "recent_form/
  head_to_head 미구현" → "실측 반영, defense_sfr 만 미구현" 정정.

검증: tsc --noEmit(kbo-data+moneyball) clean, eslint(양쪽) clean, pnpm test(kbo-data 90
files/1165 tests + moneyball 498 files/4180 tests all green).

## v0.5.62.75 — 2026-08-23 (cycle 2353, fix-incident: MLB recent_form/head_to_head 실측 wiring)

### fix(mlb): mlb_schedule 시즌 종료 경기 실측으로 recent_form/head_to_head 팩터 계산 — 13% 가중치 silent no-op 해소

- 발견: cycle 2349가 elo(10%)를 mlb_team_elo 실측으로 연결했지만, 나머지 미구현 placeholder 3개
  (recent_form 10%/head_to_head 3%/defense_sfr 5%) 는 "Tier 3 규모 — 별도 plan 분리" 로 남겨둠.
  직접 확인 결과 recent_form/head_to_head 는 defense_sfr(KBO 전용 지표, MLB 동등 데이터 소스 자체가
  없음)과 달리 이미 존재하는 `mlb_schedule`(status='final' 행에 home_score/away_score 보유) 만으로
  계산 가능 — 신규 테이블/스크래퍼 불필요한 단순 wiring 누락이었음. `runPredictFinal`이 항상
  `recent_form:{home:50,away:50}`(양팀 동일 중립값), `head_to_head:{homeWinRate:0.5}` 고정 입력해
  `MLB_BASE_WEIGHTS.recent_form`(10%)+`head_to_head`(3%) = 13% 가중치가 모든 MLB 예측에서 상시
  no-op(차이항 항상 0)이었음.
- 수정: `mlb_schedule`에서 시즌 종료 경기(당일 이전, leak 방지) 조회 → 순수 함수
  `calculateMlbRecentForm`/`calculateMlbHeadToHead`(신규 `factors/mlb-form.ts`, KBO
  `engine/form.ts`와 동일 계약이나 team_code string 기준)로 최근 10경기 승률 + 시즌 h2h 계산 →
  계산 입력 및 `predictions.home_recent_form`/`away_recent_form`/`head_to_head_rate`
  컬럼(기존 KBO 공용 스키마, migration 001) 양쪽에 실측 반영. 유효 경기 없으면(시즌 초반 등)
  계산 입력은 중립값 fallback 유지, 영속화는 다른 팩터와 동일하게 null.
- 부수 효과: `buildMlbTeamFactorAverages`/`buildMlbTeamProfile`(둘 다 이미 `home_recent_form`/
  `away_recent_form` 컬럼을 읽고 있었으나 상시 NULL이라 recent_form 이 항상 평균/프로필에서
  제외됐음, elo 와 동일 패턴)가 이번 fix로 자연 복구 — 코드 변경 없이 실측 데이터 흐름만 연결.
- 스코프 밖: waterfall/factor-detail/overview 표시 레이어 동기화(cycle 2349→2352 elo 사례와
  동일 패턴 — 다음 review-code(heavy) 자연 후속 대상). defense_sfr(5%)은 MLB 동등 데이터
  소스 부재로 여전히 미구현.

## v0.5.62.74 — 2026-08-23 (cycle 2349, fix-incident: MLB Elo 팩터 실측 wiring)

### fix(mlb): mlb_team_elo 실측 Elo 레이팅을 predict_final 에 연결 — 10% 가중치 silent no-op 해소

- 발견: cycle 2348 review-code(heavy) audit이 "Elo·최근폼·상대전적·수비SFR 4개는 데이터는 있으나
  예측 가중치엔 미반영"이라 정리했으나, 4개 중 Elo 만은 실제로 매일 갱신되는 저장 테이블
  (`mlb_team_elo`, migration 046, `mlb_elo_update` cron 모드가 매 fire 시 `mlb_schedule` final
  전체를 재생해 upsert)이 이미 존재함에도 `runPredictFinal`(`mlb-pipeline.ts`)이 이 테이블을
  전혀 읽지 않고 항상 `ELO_NEUTRAL`(1500) 고정값을 양팀에 입력 — `MLB_BASE_WEIGHTS.elo`(10%
  가중치, KBO 동등)가 모든 MLB 예측에서 상시 no-op(양팀 동일값이라 차이항 = 0)이었음. 나머지
  3개(최근폼/상대전적/수비SFR)는 계산 로직 자체가 미구현이라 이번 cycle 범위 밖(별도 후속 필요).
- 수정: `runPredictFinal` 이 `mlb_team_elo`를 season 기준 조회(`assertSelectOk` 가드, mlb_team_stats
  wiring 과 동일 안전 패턴) → `g.home_team_code`/`g.away_team_code` raw 코드로 직접 매칭(mlb_team_elo
  는 `runEloUpdate` 가 정규화 없이 원본 코드로 upsert 하므로 mlb_team_stats 의 canonical alias
  매핑 불필요) → `computeMlbProbability` elo 입력 및 `predictions.home_elo`/`away_elo` 컬럼(기존
  KBO 공용 스키마, migration 003) 양쪽에 실측 반영. 팀 row 부재(시즌 첫 경기 등) 시 계산 입력은
  `ELO_NEUTRAL` fallback 유지, 영속화는 가짜 숫자 대신 `null`(다른 팩터와 동일 null-guard 원칙).
- 부수 효과: `buildMlbTeamFactorAverages`/`buildMlbTeamProfile`(둘 다 이미 `home_elo`/`away_elo`
  컬럼을 읽고 있었으나 상시 NULL이라 elo 팩터가 항상 평균/프로필에서 제외됐음)가 이번 fix로
  자연 복구 — 코드 변경 없이 실측 데이터 흐름만 연결.
- 문서 정정: cycle 2348 이 추가한 "/glossary, /mlb/factors, /mlb/methodology" 의 "4개 팩터
  미반영" 문구가 Elo 기준 stale 해지는 걸 막기 위해 3곳 모두 Elo 를 목록에서 제외하고 "실측
  반영됨"으로 갱신(최근폼·상대전적·수비SFR 3개만 미반영 유지).
- 신규 단위 테스트: `mlb_team_elo` 실측/부재 양쪽 케이스에서 계산 입력 + 영속화 값 검증
  (`packages/kbo-data/src/__tests__/mlb-pipeline.test.ts`).

검증: `tsc --noEmit`(kbo-data + moneyball) clean, `eslint`(양쪽) clean, `pnpm test`
(kbo-data 89 files/1148 tests + moneyball 498 files/4180 tests all green).



## v0.5.62.73 — 2026-08-23 (cycle 2348, review-code (heavy): MLB placeholder 팩터 4개 문구 정정)

### fix(mlb): Elo·최근폼·상대전적·수비SFR 4개 "데이터 없음" 문구 → "가중치 미반영" 정정

- 감사 대상: cycle 2347 explore-idea(heavy)가 배선한 온보딩 3페이지(`/about`, `/guide`, `/glossary`)
  중 `/glossary`의 신규 문구 "Elo·최근폼·상대전적·수비SFR 4개는 MLB 쪽 데이터가 아직 없어 KBO
  전용입니다"를 `mlb-pipeline.ts` / `computeMlbCompositeDuel.ts` 대비 대조.
- 발견: 이 4개 팩터는 데이터 자체는 실측 존재(`mlb_team_elo`/`mlb_team_elo_history` 테이블 +
  팀/매치업 페이지의 Elo 추이 차트, 최근 폼 W-L 기록, 시즌별 상대전적 섹션 — 모두 실제 데이터로
  표시 중)하지만, `mlb-pipeline.ts`의 실제 승률 계산(`computeMlbProbability` 호출부, line 297)은
  이 4개 입력을 팀 구분 없는 중립값(`recent_form: {50,50}`, `head_to_head: 0.5`,
  `elo: ELO_NEUTRAL` 양쪽, `defense_sfr: {0,0}`)으로 고정 — "데이터가 없다"가 아니라 "데이터는
  있으나 예측 가중치 계산에는 아직 연결 안 됨"이 정확한 서술. `/mlb/factors`, `/mlb/methodology`
  페이지도 동일 4팩터를 실측 출처(FanGraphs MLB Def, statsapi.mlb.com 등)와 함께 가중치 표에
  나열하면서 이 미반영 사실을 어디에도 disclose 하지 않고 있었음(cycle 2347 이전부터 존재한
  기존 gap, 이번 audit에서 함께 발견).
- 정정: `/glossary` 문구를 "팀/매치업 페이지엔 참고용으로 표시되지만 예측 모델의 승률 계산에는
  아직 반영되지 않아(중립값 고정) KBO 전용"으로 수정. `/mlb/factors` 가중치 표 헤더에 동일 내용
  경고 배너 추가. `/mlb/methodology` 정량 모델 섹션에 Elo 갱신 로직은 실제 동작하나 그 결과가
  예측 가중치로 연결되는 건 다음 단계라는 caveat 문장 추가.

검증: `tsc --noEmit`(moneyball) clean, `eslint` clean, `pnpm test`(498 files/4180 tests all
green — 3페이지 모두 문구 전용 수정, 기존 가드 영향 없음).



### feat(guide): `/about`, `/guide`, `/glossary` 온보딩 3페이지에 MLB 안내 신규

- 진단: open issue 0건, approved plan 0/22, 주기 trigger 4종 전부 미도달, review-code(heavy) 2연속
  clean audit(2343/2346)로 신규 감사 target 소진. explore-idea 자연 발견을 위해 KBO↔MLB 구조
  parity 재점검 중, 라우트/IA 는 이미 완결(cycle 2242 checkpoint)이나 **온보딩 narrative 3페이지
  (`/about`, `/guide`, `/glossary`)에 MLB 언급이 0건**임을 grep 으로 확인 — MLB 는 30+ 라우트를
  갖춘 완결된 섹션(en 미러 포함)인데도 신규 사용자가 처음 읽는 소개/가이드/용어사전 어디서도
  존재를 알 수 없었음.
- `/guide` "페이지별 활용" 그리드에 MLB 카드 신규 (정량 모델 전용, AI 에이전트 토론 미적용 명시).
- `/about` 인트로에 MLB 예측 안내 1줄 추가 (`MLB_FACTOR_COUNTS.total` 팩터 수 실측 인용, AI 토론
  미적용 정확히 서술 — MLB pipeline 은 `reasoning`/`debate` 필드 자체를 생성하지 않음을
  `mlb-pipeline.ts` 확인 후 반영).
- `/glossary` 헤더에 "지표 대부분 MLB 에도 공통 적용, Elo·최근폼·상대전적·수비SFR 4개는 MLB
  데이터 미구현이라 KBO 전용" 안내 추가 (`analysisRoutes` 및 `computeMlbCompositeDuel.ts` 주석의
  "MLB 4팩터 미구현" 사실과 정합).

검증: `tsc --noEmit` clean, `eslint` clean, `pnpm test`(498 files/4180 tests all green — 기존
가드 영향 없음, 3페이지 모두 신규 테스트 파일 부재).

결론: 온보딩 funnel 이 이제 진실되게 사이트 전체 범위를 반영. 잔존 backlog: `/glossary` 개별
term 카드마다 "MLB 적용 여부" 배지는 스코프 확대(데이터 구조 변경 필요) — 별도 cycle.



### feat(mlb): `/mlb/reviews/weekly/[week]`, `/mlb/reviews/monthly/[month]` 수렴 픽(강수렴/완전수렴) 섹션 신규

- `/mlb/reviews/page.tsx`(cycle 2226) 및 weekly/monthly 서브페이지(plan #26 Phase 1b/2, cycle
  2229~2231) 가 공통으로 "MLB convergence 함수들은 시즌 전체 스캔만 지원하고 날짜 range
  파라미터가 없어 주간/월간 페이지에 억지로 태우면 오도된 성적으로 보일 수 있어 의도적으로
  생략" 이라는 stale 주석을 남겨뒀던 gap — KBO `/reviews/weekly`, `/reviews/monthly` 는 이미
  wave-584/594/600/602/603 에서 `startDate`/`endDate` 파라미터를 지원하는데 MLB 대응 함수만
  없었던 것.
- `convergenceRecord.ts` 의 `fetchMlbConvergencePickDetailedResults` 및 이를 소비하는
  `getMlbRecentConvergencePickRecord`/`getMlbConvergencePickStreak`/`getMlbConvergencePickBestStreak`/
  `getMlbConvergencePickHomeAwaySplit`/`getMlbConvergencePickDayOfWeekSplit`/
  `getMlbConvergencePickTeamStats` 6개 함수에 optional `startDate`/`endDate` 파라미터 추가
  (`mlb_schedule` 쿼리에 `.gte`/`.lte` 조건부 적용) — 미지정 시 기존 시즌 전체 스캔 동작 그대로
  유지(add-only, 기존 호출부인 `/mlb/reviews`, `/mlb/team/[code]` 등 무변경).
- `/mlb/reviews/weekly/[week]/page.tsx`, `/mlb/reviews/monthly/[month]/page.tsx` 에 KBO 동일
  구조(수렴 픽 W-L 카드 → 스트리크 → `ConvergenceHomeAwayBadges` → (월간만)
  `ConvergenceDayOfWeekBadges` → `ConvergenceTeamStatsBadges`)로 배선, `range.startDate`/
  `range.endDate` 전달. 배지 컴포넌트들은 이미 generic + `nameResolver`/`locale` prop을
  지원해(cycle 2226/2339) 추가 컴포넌트 변경 없이 `mlbShortTeamName` 넘기는 것만으로 재사용.
- `mlb-reviews-monthly-page.test.ts` 의 기존 "수렴 픽 섹션 부재 — 의도적 생략" 가드를 배선
  확인 가드로 반전.
- `tsc --noEmit` clean, `eslint` clean, `pnpm test`(498 files/4180 tests all green).



### feat(mlb): `PickButton` locale prop + `/en/mlb/games/[date]`, `/en/mlb/analysis` 커뮤니티 픽 투표 UI 배선

- cycle 2338/2341 EN 미러 작업 당시 `PickButton`(커뮤니티 픽 투표 위젯)은 하드코딩 한국어
  텍스트(홈/원정/내 픽/분석 보기 등)라 en 화 범위 밖으로 명시적 생략됐던 컴포넌트 — cycle 2341
  retro 가 "PickButton 현지화(넓은 범위, 별도 cycle)" 를 다음 explore-idea 후보로 남김.
- `PickButton.tsx` 에 `locale?: 'ko' | 'en'` prop 추가(기본 `'ko'`, 기존 callsite 무변경 —
  wave-659 배지 컴포넌트와 동일 패턴). 버튼 라벨/aria-label/커뮤니티 픽 헤더/참여자 수/AI 예측
  라벨 전부 `STRINGS[locale]` 테이블로 분기.
- `/en/mlb/games/[date]` — `status`/`homeWinProb` 필드가 쿼리에서 아예 누락돼 있어(EN 미러
  최초 배선 당시 픽 UI 자체를 고려 안 함) 추가 후 `status === 'scheduled'` 경기에 `PickButton
  locale="en"` 배선.
- `/en/mlb/analysis` — `getTodayMlbAnalysisRows`(analysis-data.ts, ko/en 공유)가 이미
  `status`/`homeWinProb` 를 포함하고 있어 필드 추가 없이 바로 `PickButton locale="en"` 배선.
- `/mlb/games/[date]/[slug]`(경기 상세) 및 KBO `predictions/[date]`(다른 이유로
  `enablePickButton={false}`) 는 원래 KO 도 PickButton 미사용 — scope 밖 확인, 변경 없음.
- `tsc --noEmit` clean + `eslint` clean + `pnpm test`(498 files/4180 tests all green,
  wave-658 가드 테스트의 "PickButton en 미러 scope 밖" stale assertion 정정 포함).



### feat(mlb): `/en/mlb/reviews` + `/en/mlb/reviews/misses` — `/mlb/reviews` 영어 미러 신규 배선

- `/mlb/reviews`(수렴 픽 분석 허브) + `/mlb/reviews/misses`(빗나간 예측 회고) 는
  cycle 2226/2227 에 Header/Footer `withLocale()` 블랭킷 치환 예외로 처리돼 EN
  페이지에서 nav 클릭 시 KO 페이지로 이탈하던 의도적 scope 축소 상태였음(plan #26
  Phase 1/2, weekly/monthly 서브페이지는 여전히 EN 미러 부재). cycle 2338 EN
  analysis 미러 완성 후 다음 구조적 gap으로 carry-over — 실제 페이지 신규 배선.
- `getMlbReviewsData`(reviews-data.ts 신규)로 12개 병렬 조회 로직을
  `mlb/reviews/page.tsx` 에서 추출 — ko/en 양쪽 재사용(analysis-data.ts wave-658
  동일 DRY 패턴).
- `ConvergenceStreakBadges`/`ConvergenceTeamStatsBadges`/`ConvergenceHomeAwayBadges`/
  `ConvergenceDayOfWeekBadges`/`MissesSortControl` 5개 공유 컴포넌트에 `locale`
  prop 추가(기본값 `'ko'` — 기존 KBO/MLB callsite 시그니처 변경 없음). `WEEKDAY_LABELS_EN`
  (packages/shared) 신규 — 기존 `WEEKDAY_LABELS_EN_MON_FIRST`(월요일 시작)와 순서가
  달라 별도 배열 필요.
- `FACTOR_LABELS_EN`(factorLabels.ts) 신규 10종 — `buildMlbMissReport({ locale })`
  파라미터로 팩터 레이블 EN/KO 분기(mlb-shared.ts).
- Header/Footer `withLocale()`/`withMlbLocale()` 예외 범위 축소 — `/mlb/reviews`,
  `/mlb/reviews/misses` 는 예외 해제(정상 `/en` 치환), `/mlb/reviews/weekly`,
  `/mlb/reviews/monthly` 는 EN 미러 여전히 부재라 예외 유지.
- `sitemap.ts` + ko 페이지(index/misses) `alternates.languages` hreflang 양방향
  배선. 신규 guard test `wave-659-en-mlb-reviews-mirror.test.ts`(en 내부 링크 전부
  `/en/mlb/*` prefix + withLocale 예외 범위 검증) + 기존 4개 테스트 파일 갱신
  (mlb-reviews-page/wave-602/Header/Footer — en 미러 부재 가정 stale assertion 정정).
- `tsc --noEmit`(4패키지 clean) + `eslint`(clean) + `pnpm test`(498 files /
  4180 tests all green, 신규 8건 포함) 확인.

## v0.5.62.68 — 2026-08-20 (cycle 2338, explore-idea (heavy): en/mlb/analysis 영어 미러 신규 — 헤더 nav 404 live 버그 해소)

### feat(mlb): `/en/mlb/analysis` — `/mlb/analysis` 영어 미러 신규 배선

- Header/Footer `withLocale()`(cycle 2139 fix) 는 `/mlb/` prefix 전체를 `/en/mlb/`
  로 블랭킷 치환(`/mlb/reviews*` 만 예외) 하는데, `/mlb/analysis`(plan #28,
  cycle 2315~2323 완성) 는 예외 목록에 없어 EN 페이지에서 "Analysis Hub" nav
  클릭 시 `/en/mlb/analysis` 404 — cycle 2227 이 `/mlb/reviews` 를 예외 처리해
  고친 것과 동일 family 의 live 버그(review-code/explore-idea 신선 target
  탐색 중 발견). 예외 추가 대신 실제 페이지를 만들어 해결.
- `getTodayMlbAnalysisRows`(+ `MlbAnalysisRow`) 를 `mlb/analysis/page.tsx` 로컬
  함수에서 `analysis-data.ts` 로 이동 — ko/en 양쪽 재사용, 중복 로직 방지(DRY).
- EN MVP 스코프: 빅매치·팩터 수렴 픽·오늘 전체 예측·이번 주 남은 경기·팀 전력
  현황·어제 결과·적중 기록 CTA. `PickButton`(커뮤니티 픽 투표 UI, 미현지화)과
  주간/월간 리뷰 CTA(en/mlb/reviews 미러 부재, 기존 구조적 gap)는 스코프 밖 —
  KO 버전도 MVP→4-phase 로 점진 확장했던 관례(plan #28) 그대로 적용.
- `MlbTeamStrengthGrid` 에 `locale?: 'ko' | 'en'` prop 추가 — href prefix
  (`/mlb/team` → `/en/mlb/team`) + 승/패 문구("연승/연패" → "W/L streak",
  "최근 N경기 W승 L패" → "Last N: W-L") 현지화.
- `sitemap.ts` + ko 페이지 `alternates.languages` hreflang 양방향 배선. 신규
  guard test `wave-658-en-mlb-analysis-mirror.test.ts` (en 내부 링크 전부
  `/en/mlb/*` prefix 검증 — cycle 2139/2227 family 재발 차단).
- `tsc --noEmit`(4패키지 clean) + `eslint`(clean) + `pnpm test`(497 files /
  4172 tests all green, 신규 8건 포함, 기존 3건 갱신) 확인.

## v0.5.62.67 — 2026-08-20 (cycle 2337, review-code (heavy): silent drift wave 657 — 적중률 yellow 색상 하한 `>= 0.5` 7 callsite 단일 source)

### fix(context): 적중률 3단계 색상(brand/yellow/red) yellow 하한 `ACCURACY_MID_RATE` 단일 source 추출

- `packages/shared/src/index.ts` 에 `ACCURACY_MID_RATE = 0.5` 신규 상수 (기존
  `ACCURACY_GOOD_RATE`/`ACCURACY_OK_RATE`/`ACCURACY_WARN_RATE` 패밀리 옆).
- 팀 프로필 3곳(`teams/[code]`, `mlb/team/[code]`, `en/mlb/team/[code]`) +
  주간/월간 리뷰 4곳(`reviews/weekly`, `reviews/monthly`, `mlb/reviews/weekly`,
  `mlb/reviews/monthly`) — 총 7 callsite 가 동일한 `>= 0.5` 를 하드코딩(단일
  source 부재). `review-code (heavy)` 감사 중 진단(gap-trigger 4종 미도달 +
  review-code/explore-idea 5 cycle 연속 "신규 target 부재" 확정 후 대체 대상
  탐색 — 최근 audit 미도달 파일 `reviews/weekly/[week]/page.tsx` 정독 중 발견).
  wave-360/498 family(같은 파일 내 다른 tier 상수는 이미 추출돼 있었으나 이
  yellow 하한만 미포함)와 동일한 silent drift 패턴.
- 신규 guard test `wave-657-accuracy-mid-rate-swap.test.ts` (7 callsite 임포트 +
  하드코딩 0.5 부재 확인). `accuracy/page.tsx`/`accuracy/shadow/page.tsx` 의
  `>= 0.5` 는 별개 의미(커뮤니티 정답률 baseline / 홈승 확률 50% 분기)라 스코프
  제외.
- `tsc --noEmit`(4패키지 clean) + `eslint`(clean) + `pnpm test`(496 files /
  4164 tests all green, 신규 7건 포함) 확인.

## v0.5.62.66 — 2026-08-20 (cycle 2331, operational-analysis (lite): W34 주간 성과 스냅샷 + MLB is_correct null 오탐 해소)

### data(weekly-review): 2026-W34 (8/17~8/23, KST) KBO v1.8 스냅샷

- KBO v1.8 이번 주 검증 n=29 / 적중률 48.3% (14/29) — 표본 소표본(<30), 단일 결론 금지
  (`feedback_data_only_claims` 원칙 유지).
- 이번 주 검증분 confidence 분포: 29건 중 26건이 0.2 미만(CE fallback quant 원본 그대로
  통과), 3건만 0.3(CE flat) — 고확신(≥0.65) 예측 0건. CREDIT_EXHAUSTED 100% fallback
  지속 재확인(신규 아님, CLAUDE.md v1.8 가중치 섹션 기존 서술과 일치).
- op-analysis-ce-cohort.ts 재실행 결과 총 n=321(CE 274/비CE 47) — cycle 2309(같은 날
  ~3시간 전) 측정치와 동일. 신규 검증 배치가 KST 23:00 1일 1회이므로 같은 날 재측정 시
  숫자 불변은 정상(스톨 아님) — cycle 간격이 실제 하루 단위가 아니라 시간 단위로 빨라진
  현재 페이스(오늘 하루 20+ 사이클) 에서 이 gap-trigger들의 "N-cycle" 단위가 실제 경과
  시간과 느슨하게만 대응한다는 점 참고용 기록.
- 가중치 조정: 불필요 (v1.8 유지 확정 기존 결정 유지, `docs 가중치 섹션` 재조정 조건
  미충족 — n 변화 없음).

### fix(context): MLB `predictions.is_correct` 전량 NULL — 오탐 조사 후 기존 설계 확인

이번 사이클 진단 중 "MLB predictions 858건 전량 verified(is_correct) 0건" 을 실제
버그로 의심해 조사. `deriveMlbOutcome.ts` 헤더 주석(cycle 2117 review-code heavy
통합분)이 이미 "MLB 는 팀 코드가 string 이라 INT FK 컬럼과 안 맞아 `is_correct`/
`predicted_winner`/`confidence` 컬럼을 의도적으로 안 쓰고 `home_win_prob` + 경기
결과를 read-time derive" 라고 명시 — 신규 버그 아님, 기존 감사 완료 아키텍처 재확인.
코드 변경 없음.



### feat(mlb): /mlb/wild-card 라이브 Wild Card race 데이터 통합

cycle 2296 이 남긴 carry-over("와일드카드 매직넘버는 범위 밖... 별도 cycle 후속 후보")와
`/mlb/wild-card`/`/en/mlb/wild-card` 페이지 자체의 "ETA 2026-08" placeholder(오늘 ETA 도달)
양쪽을 해소.

`buildMlbStandings.ts`에 `buildMlbWildcardStandings()` 신규 — 리그별 division 1위 3팀을
제외한 나머지 팀을 승률 내림차순 정렬한 pool 을 만들고, 컷오프(`MLB_WILDCARD_COUNT`=3번째
팀) 기준 게임차(`wcGamesBehind`)를 계산. `computeMagicNumber()`를 KBO standings
`playoffMN`과 동일 패턴(컷오프 팀 vs 첫 탈락 팀)으로 재사용해 Wild Card 매직넘버도 산출 —
신규 DB 쿼리 0건, 기존 `buildMlbDivisionStandings()` 출력만 재가공.

두 페이지의 정적 "후보 pool 그리드"를 실시간 WC1~3 순위 뱃지 + W-L-승률 + GB + 매직넘버로
교체. 상태 섹션 문구를 ETA → "박제 완료"로 갱신. Header NAV 회수 layer로 시작했다는 기존
footer 문구는 유지(wave-240 회귀 테스트 대상).

rubric: 가치 medium(시즌 중 시의성, KBO 가을야구 매직넘버 parity) / 시간비용 small(기존
standings 데이터 + computeMagicNumber 재사용) / risk 0(신규 계산 함수, 기존 데이터 흐름
변경 없음) / 자율가능 yes / 의존성 none → Tier 1 즉시 fire.

`MLB_WILDCARD_COUNT=3` 신규 상수(packages/shared). `buildMlbWildcardStandings` 단위
테스트 2건 신규(정렬+게이팅 케이스, all-zero 케이스). 490 files/4124 tests all pass,
type-check/lint clean.

## v0.5.62.64 — 2026-08-20 (cycle 2296, explore-idea (heavy): MLB standings division 매직넘버 신규)

### feat(mlb): MLB AL/NL standings division 매직넘버 배지 신규

KBO standings(cycle 2287)에 이어 MLB `/mlb/standings`에도 division 우승 매직넘버 parity 제공.
`computeMagicNumber`(KBO 전용으로 작성됐으나 `gamesPerTeam` 파라미터가 이미 일반화돼있어
공식·기존 단위테스트 변경 없이 재사용 가능)를 division 별 1위/2위(`rows[0]`/`rows[1]`, 이미
winPct 내림차순 정렬)에 `MLB_GAMES_PER_TEAM`(162)로 호출 — 신규 DB 쿼리 0건, 순수 계산.

6개 division(AL/NL × East/Central/West) 각각 리더 행에 "지구 우승 매직넘버 N" 또는(확정 시)
"지구 우승 확정" 배지 렌더. 와일드카드 매직넘버는 범위 밖(리더/2위 단순 비교로는 계산 불가 —
3장 와일드카드 슬롯 경쟁 로직 필요, 별도 cycle 후속 후보로 carry).

rubric: 가치 medium(KBO-MLB parity, 시즌 중 시의성) / 시간비용 small / risk 0(기존 검증된 순수
함수 재사용) / 자율가능 yes / 의존성 none → Tier 1 즉시 fire.

`computeMagicNumber.test.ts`에 MLB gamesPerTeam=162 케이스 추가, `mlb-standings-page.test.ts`에
정적 grep 회귀 테스트 추가. 485 files/4098 tests all pass, type-check/lint clean.


### fix(teams): buildTeamProfile.ts games 쿼리 scoring_rule 미필터 → shadow row 오염 가능 상태 정정

`predictions/[date]/page.tsx`(618줄)와 `teams/[code]/page.tsx`(621줄) — 다음 후보로 지목된 두
대형 파일 전체 정독. 두 파일 자체와 직접 의존 모듈(`buildTeamUpcoming.ts`, `buildTeamEloTrend.ts`,
`convergenceRecord.ts`)은 이미 assertSelectOk 전면 적용 완료 상태 확인. 감사 범위를 `teams/[code]`
하위 나머지 데이터 소스(`buildTeamProfile.ts`)로 확장한 결과 실제 drift 발견.

`buildTeamProfile.ts`의 `games` select가 `predictions!inner(...)`에 `prediction_type='pre_game'`
필터만 걸고 `scoring_rule` 필터가 아예 없었음 — `shadow-cohort.ts`가 `daily.ts` 파이프라인에서
매 경기 production(v1.8) row insert 직후 shadow(v2.1-B-shadow/v2.0-shadow) row도 동일
`prediction_type='pre_game'`으로 누적 중(#1338 family, 같은 디렉토리의 `buildTeamUpcoming.ts`/
`teams/[code]/recent/page.tsx`는 이미 `CURRENT_SCORING_RULE` 필터로 이 문제를 회피해왔음). 정렬
없는 `predictions?.[0]`이 production/shadow 중 임의 row를 집어 팀 프로필 페이지의 적중률, 팩터
평균, 선발 투수 FIP, 최근 경기, 연승/연패, 평균 마진, 홈/원정 편차가 shadow 모델 값으로 오염될
수 있는 상태 — daily 파이프라인이 shadow insert를 활성 유지 중이라 매일 재발 가능.

`buildTeamProfile.ts` games 쿼리에 `.eq("predictions.scoring_rule", CURRENT_SCORING_RULE)` 추가
(형제 파일과 동일 컨벤션 정합). 정적 grep 회귀 테스트 `silent-drift-cycle-2288.test.ts` 추가 +
기존 `buildTeamProfile.test.ts` mock의 단일 `.eq()` 체인을 2단 체인으로 갱신(신규 필터 반영).
478 files/4077 tests all pass, `pnpm type-check`/`pnpm lint` clean.



### fix(analysis): getThisWeekRemainingGames elo/factor 쿼리 assertSelectOk 미적용 silent swallow 정정

`analysis-data.ts` (918줄) 재감사 — cycle 2281 이 이미 sp_confirmation_log 쿼리에 assertSelectOk
를 적용했지만, 같은 파일의 `getThisWeekRemainingGames` 안 `Promise.all([scheduleResult, eloResult])`
두번째 쿼리(`eloResult`, 이번 주 남은 경기의 Elo/10팩터 데이터)는 검증 없이 `if (eloResult.data)`
로만 분기 — DB 에러 시 `.error` 를 무시하고 `eloMap`/`factorDataMap` 이 조용히 빈 상태로 남아
"이번 주 남은 경기" 위젯이 크래시나 로그 없이 중립 50% 승률 + 팩터 배지 전무 상태로 저하되는
silent drift. `eloResult` 도 `assertSelectOk` 로 통과시켜 DB 에러 시 fail-loud 전환.

정적 grep 회귀 테스트 `silent-drift-cycle-2282.test.ts` 추가.

버전 3-way sync 정정: 직전 사이클(2281)이 VERSION/CHANGELOG 만 0.5.62.61 로 올리고
`package.json` (root + apps/moneyball) 갱신을 누락 — `version-sync-guard` 테스트 fail 로 발견,
본 사이클 fix 와 함께 0.5.62.62 로 일괄 정합.

## v0.5.62.61 — 2026-08-20 (cycle 2281, review-code (heavy): calibration-agent.ts 최초 전체 감사, parseResponse silent fallback 정정)

### fix(agents): calibration-agent.ts parseResponse JSON 파싱 실패 silent fallback 정정

`packages/kbo-data/src/agents/validator.ts` (909줄, 최초 전체 감사) 부터 시작 — 환각/발명선수/금칙어
검증 로직, 4개 Sentry capture 채널(`notifyValidationViolations`/`captureJudgeParseFallback`/
`captureRivalryMemoryFallback`/`captureAgentFallback`) 전부 콜러(team-agent/judge-agent/postview/
debate/rivalry-memory)와 배선 일치 확인 — drift 없음.

인접 `calibration-agent.ts` (`debate.ts`의 3-agent 병렬 실행 중 하나) 로 감사 범위 확장한 결과
실제 drift 발견: `parseResponse`의 catch 블록이 LLM JSON 응답 파싱 실패 시 all-null
`CalibrationHint` 객체를 정상 데이터처럼 반환 — `judge-agent.ts`가 동일 패턴으로 겪었던
cycle 1400 lesson P2("parseResponse catch 자체가 confidence=0.3 fallback 객체를 정상
데이터처럼 반환 → evaluateAndCaptureAgentFallback 의 `r.data == null` 검사 미감지 → 22일
silent")와 완전히 동일한 family. judge-agent 는 당시 `captureJudgeParseFallback` 전용 Sentry
채널로 patch 됐지만 calibration-agent 는 그 fix 대상에서 누락돼 지금까지 무방비 상태였음.

`validator.ts`에 `captureCalibrationParseFallback` 신규 export (기존 3종 capture 함수와 동일
동적 import + try/catch 패턴, `calibration_parse_fallback` Sentry tag). `calibration-agent.ts`의
`parseResponse` 시그니처에 `homeTeam`/`awayTeam` 추가해 catch 블록에서 호출 + 테스트 export 전환
(judge-agent 패턴과 정렬). 신규 회귀 테스트 3건(`agents-calibration-parse-fallback.test.ts`) —
JSON 없음/깨진 JSON capture 호출 검증 + 정상 JSON capture 미호출 검증. 89 files/1147 kbo-data
tests all pass, `pnpm type-check` clean, `pnpm lint` clean.

## v0.5.62.60 — 2026-08-20 (cycle 2280, info-architecture-review: /mlb/reviews/misses 헤더·푸터 sitemap 누락 정정)

### fix(nav): 신규 MLB 라우트 헤더 메가메뉴 + 푸터 sitemap 컬럼 누락 정정

info-architecture-review 30-cycle 미발화 임계 도달(마지막 fire cycle 2250, gap=30). 실측 결과
cycle 2279 신규 라우트 `/mlb/reviews/misses` 가 Header.tsx `MLB_NAV`/Footer.tsx MLB 컬럼 양쪽에
배선 누락 — KBO 는 `/reviews`+`/reviews/misses` 헤더·푸터 양쪽 존재, MLB 는 `/mlb/reviews` 허브만
있고 `/mlb/reviews/misses` direct entry 부재(Footer.tsx 코드 주석에 이미 명시된 반복 패턴 —
cycle 2153/2225 "MLB 신규 라우트 추가 시 footer sitemap 컬럼 동기 누락" family 재발).

`Header.tsx` MLB_NAV `/mlb/reviews` 다음에 `/mlb/reviews/misses` 항목 추가, `Footer.tsx` MLB
컬럼에도 동일 추가. `withMlbLocale`/`localizeNavItems` 의 startsWith("/mlb/reviews") 가드가
이미 하위 경로 전부 커버하도록 설계돼 있어(cycle 2227 주석 확인) 로직 변경 불필요 — 텍스트
엔트리 추가만. 기존 Header.test.ts EN locale 테스트가 정확 일치(`href === "/mlb/reviews"`)
조건이라 신규 misses href 를 걸러 실패 — startsWith 조건으로 정정 + misses 케이스 명시
assertion 추가. Footer.test.tsx 에도 misses EN 유지 assertion 추가. 475 files/4069 tests all
pass, `tsc --noEmit` clean, lint clean.

## v0.5.62.59 — 2026-08-20 (cycle 2279, explore-idea (heavy): /mlb/reviews/misses 신규 — KBO 회고 페이지 parity gap)

### feat(mlb): MLB "크게 빗나간 예측" 회고 페이지 신규

explore-idea saturation trigger 충족(직전 15 사이클 중 review-code+fix-incident+polish-ui
12회) — review-code(heavy) dominance 75%(직전 20 사이클) 재분배 필요 시점에 KBO `/reviews/misses`
(고확신 실패 사후 분석)의 MLB 대응 페이지가 없다는 gap 발견. MLB `/reviews` 허브는 수렴 픽
성적/스트리크/팀별 분해만 있고 "빗나간 예측" 전용 회고가 부재(주간/월간 리뷰의
`MlbHighlightCard`가 개별 경기 배지로만 노출, 전체 시즌 Top N 집계 없음).

MLB 는 KBO와 달리 사후 심판 에이전트(`postview.ts`)가 없어 `judgeReasoning`/`factorErrors`
컬럼이 전량 미생성(postview-daily.ts 는 KBO 전용) — 동일한 서술형 회고는 불가능해 대안으로
정량 계산 방식 채택: 5개 팩터(FIP/xFIP/wOBA/불펜FIP/WAR) 중 어떤 것이 (틀린) 예측 방향을
가장 강하게 뒷받침했는지 계산해 노출. `buildMlbMissReport()`(`lib/reviews/mlb-shared.ts`)
신규 — `mlb_schedule`(status=final) + `predictions`(league=mlb, scoring_rule 필터) 조인 후
`classifyWinnerProb` tossup 제외 + `deriveMlbOutcome` 오답 필터 + confidence 내림차순 정렬.
기존 `MLB_FACTOR_COLUMN_PAIRS`/`LOWER_IS_BETTER`(private) export 전환해 buildMlbFactorInsights와
동일 소스 재사용(magic-number 중복 방지).

`apps/moneyball/src/app/mlb/reviews/misses/page.tsx` 신규, `/mlb/reviews` 허브에 진입 카드
추가(KBO `/reviews` 동일 레이아웃), `sitemap.ts` + `search/page.tsx` 엔트리 동기(silent-drift
cycle 2262/2263 회귀 가드 통과 확인 — 신규 라우트 추가 시 자동 실패하는 정적 리스트 동기화
테스트). DB 실측: 최종 확정 MLB 827경기 중 고확신(≥55%) 오답 383건 확인 — 빈 페이지 아님.
신규 테스트 6건(`buildMlbMissReport.test.ts`, supabase mock 패턴은 `buildMlbWeeklyReview.test.ts`
동일). 475 files/4069 tests all pass, `tsc --noEmit` clean, lint clean.

## v0.5.62.58 — 2026-08-20 (cycle 2278, fix-incident: mlb_fancy_scrape User-Agent 헤더 누락 정정)

### fix(mlb-pipeline): fangraphs-mlb.ts fetch() User-Agent 헤더 누락 정정 — 24/30일 실패 원인

fix-incident 20-gap trigger 도달(마지막 발화 cycle 2258) — `pipeline_runs` 최근 7일 실측 결과
`mlb_fancy_scrape` mode 가 최근 30일 중 24일 error(HTTP 403 / parse fail 교차 재발). 코드 확인 결과
`fangraphs-mlb.ts`의 `fetchLeaderRows` 가 `fetch(url)` 호출 시 헤더를 전혀 지정하지 않음 — 형제
스크레이퍼 `fangraphs.ts`(KBO 버전)를 포함해 리포 내 모든 다른 fetch 기반 스크레이퍼는
`KBO_USER_AGENT` 헤더를 처음부터 사용 중이었으나 MLB 버전(cycle 1985 신규 wiring)만 누락. User-Agent
헤더 추가로 정정(rate limit/파싱 로직 변경 없음). 실패 시 Sentry warning 캡처는 기존에도 정상 작동
중이었으나(silent 아님), 근본 원인(헤더 누락)은 24일간 미수정 상태였음. 474 files/1144 kbo-data
tests all pass, `pnpm type-check` clean, lint clean.

## v0.5.62.57 — 2026-08-20 (cycle 2277, review-code (heavy): packages/kbo-data/src/scrapers/fancy-stats.ts 최초 전체 감사 — findPitcher stale line 참조 정정)

### fix(kbo-data): findPitcher docstring stale line 번호(daily.ts:563-564) 정정

`packages/kbo-data/src/scrapers/fancy-stats.ts`(527줄, 최초 전체 감사) — 대부분 clean
(팀명 매핑/parseNum NaN fallback/xfip fallback/Elo winPct=0.5 stub 모두 console.warn
가시화 이미 구현, 테이블 인덱스 주석과 실제 코드 일치 확인). `findPitcher` docstring 이
호출자 위치를 `daily.ts:563-564`로 명시했지만 실제 호출부는 `daily.ts:693-694`로 이동한
상태(파일 성장에 따른 stale line 참조). 구체 line 번호 대신 "grep 우선" 안내로 정정
(코드 동작 변경 없음). 부수 확인: Fancy Stats 소스 투수의 `era`/`innings` 하드코딩 0 값은
현재 `pitcher_season_stats` 테이블에 기록되지만 KBO 화면 어디서도 조회되지 않는 dead
column(향후 소비자 추가 시 주의 필요, 이번 cycle scope 밖).

## v0.5.62.56 — 2026-08-20 (cycle 2276, review-code (heavy): packages/kbo-data/src/pipeline/silent-drift-alert.ts 최초 전체 감사 — factor anomaly alert 미배선 stale 주석 정정)

### fix(pipeline): factor anomaly Sentry alert "함께 작동" stale 주석 정정 — 실제론 미배선

`packages/kbo-data/src/pipeline/silent-drift-alert.ts`(407줄, 최초 전체 감사) — 대부분
clean(각 alert dispatcher 의 caller 전수 확인: `captureSilentDriftAlert`/`captureCreditExhaustedAlert`/
`captureSparsePredictionAlert`/`captureConfidenceFlatAlert` 모두 `daily.ts`/`mlb-pipeline.ts`/
`postview-daily.ts` 실제 호출 확인). 단 `captureFactorAnomalyAlert`(cycle 1013 M-D 확장) 는
export 는 되지만 리포 전체에 호출부 0건 + 테스트 0건 확인. 원본 주석이 "cohort wiring (M-V2)
의 evidence 누적 + 본 alert 가 함께 작동"이라 서술해 실제 동작 중인 것처럼 읽혔지만,
`/debug/silent-drift` 대시보드는 순수 계산 함수 `detectFactorAnomalies`만 직접 써서 사람이
페이지를 열람할 때만 시각 표시할 뿐 — 이 Sentry alert dispatcher 자체는 자동 감지 채널로
한 번도 배선된 적 없는 상태. 주석을 실제 배선 현황(미배선, 자동 감지 원하면 caller 추가
필요)에 맞게 정정 (코드 동작 변경 없음, 재구현 아님).

## v0.5.62.55 — 2026-08-20 (cycle 2275, review-code (heavy): packages/shared/src/index.ts 최초 전체 감사 — park factor narrative stale 주석 + dead export 정정)

### fix(shared): park factor narrative 경계값 주석 오류 정정 + dead export 제거

`packages/shared/src/index.ts`(3390줄, 최초 전체 감사) — 검증 결과 대부분 clean(600+ wave
누적 정리 이력). 두 건 발견/수정:
1. `PARK_FACTOR_NARRATIVE_HITTER_MIN` 주석이 "잠실(1.02) 포함 3구장 타자 친화"라 서술했지만
   실제 비교 연산자는 strict `>`라 잠실(정확히 1.02)은 경계값과 같아 중립 처리됨 — 실제 동작은
   대구/광주 2구장. 대칭 설계(인천 0.98도 동일하게 strict `<`로 경계 제외)에 맞춰 주석을
   실제 동작 기준으로 정정 (코드 변경 없음, 경계 대칭 유지).
2. `PostType` — 최초 커밋(Phase 1)부터 정의됐지만 모노레포 전체에서 단 한 번도 참조된 적
   없는 dead export 확인 후 제거.

## v0.5.62.54 — 2026-08-20 (cycle 2274, polish-ui (2-chain lock fallback): 골드 accent 하드코딩 hex → CSS 토큰 정정)

### fix(design): 골드 accent 하드코딩 hex → CSS 토큰 정정

`page.tsx`(홈 오늘 경기 위젯, 예측 배지 골드 강조) + `analysis/page.tsx`(팩터 수렴 픽 강도 표시 3곳)가
DESIGN.md 골드 accent 토큰(`--color-accent`/`--color-accent-light`)이 이미 존재하고
`TopStatPickCard.tsx`가 전용 회귀 테스트까지 갖춘 확립된 컨벤션임에도 라이트/다크 색상을
리터럴 hex(`#c5a23e`/`#e2c96b`)로 하드코딩한 사각지대였음. 4곳 전부 `var(--color-accent)`/
`var(--color-accent-light)` 참조로 정정.

## v0.5.62.53 — 2026-08-20 (cycle 2273, review-code (heavy): agents/postview.ts 최초 감사 — FactorErrorsBars/PostviewPanel dev jargon leak 정정)

### fix(analysis): 사후 분석 패널의 raw factor 키 dev jargon leak 정정

`packages/kbo-data/src/agents/postview.ts`(496줄, 최초 감사) — LLM 오케스트레이션 로직(팀
postview 병렬 실행 → 심판 factor-attribution → validator 검증 → fallback) 자체는 clean,
`canonicalizeFactorKey`/`isWeightedFactor` 일관성도 정상. 다만 `postview.ts`가 만드는
`factorErrors[].factor`/`TeamPostview.keyFactor`는 정규화된 raw snake_case 키
(`bullpen_fip`, `sp_fip` 등)인데, 이 데이터를 사용자 가시 `/analysis/game/[id]` 페이지에
렌더하는 `FactorErrorsBars`/`PostviewPanel` 컴포넌트가 `@/lib/predictions/factorLabels`의
`FACTOR_LABELS_TECHNICAL` 단일 source를 거치지 않고 raw 키를 그대로 표시 — 같은 데이터
타입을 쓰는 `dashboard/FactorErrorTable.tsx`(한글 라벨 + raw 키 보조 표시)와
`reviews/misses/page.tsx`(`factorLabel()` 헬퍼로 번역)는 이미 올바르게 처리하는데
`FactorErrorsBars`/`PostviewPanel` 두 곳만 사각지대였던 dev 용어 leak.

- `apps/moneyball/src/components/analysis/FactorErrorsBars.tsx`: `FACTOR_LABELS_TECHNICAL`
  조회 → 한글 라벨 우선 표시, 번역된 경우만 raw 키를 보조(mono, 작은 글씨)로 병기.
  aria-label도 한글 라벨 기준으로 정정
- `apps/moneyball/src/components/analysis/PostviewPanel.tsx`: 홈/원정 postview의
  `keyFactor` 표시도 동일 헬퍼로 번역
- `FactorErrorsBars.test.tsx`: 미등록 키 raw fallback 유지 확인 + canonical 키
  (`bullpen_fip` → "불펜 FIP") 번역 신규 테스트 추가
- 474 files / 4063 tests all pass (+1, zero regression), `tsc --noEmit` clean, lint clean

## v0.5.62.52 — 2026-08-20 (cycle 2272, review-code (heavy): debug/factor-correlation/page.tsx 최초 감사 — 데이터 범위 주석/UI 문구 stale drift 정정)

### fix(debug): factor-correlation 페이지 데이터 범위 설명이 실제 쿼리와 불일치 정정

`debug/factor-correlation/page.tsx`(543줄, 최초 감사) — 상단 주석이 "2024+2025 시즌
백필 완료 + 2026 진행분 합쳐서 (N ~1458)"라 서술했지만 실제 쿼리(`gte('game_date',
'2023-01-01')`)는 이미 2023 시즌부터 포함하고 있었고, DB 실측 결과 2023~2026 누적
`decided` 표본은 2634건(주석 대비 약 1.8배). 게다가 UI 헤더 문구는 "2025 시즌 +
2026 진행분"이라 2023/2024를 아예 언급 안 했고, 하단 문구는 "2024·2023 백필 시 CI
좁아지면 자동 refine 가능"이라 이미 완료된 백필을 미래형으로 서술 — 3곳 모두 실제
쿼리 범위와 어긋난 stale 문구. 주석/UI 텍스트를 실제 쿼리 범위(2023~2026 누적)에
맞게 정정, 날마다 변하는 정확한 N은 주석에 고정 수치로 박제하지 않고 페이지 실측
표시로 위임.

- `apps/moneyball/src/app/debug/factor-correlation/page.tsx`: 상단 주석 + 헤더 문구 +
  Home Advantage 섹션 하단 문구 3곳 정정
- `apps/moneyball/src/app/__tests__/silent-drift-wave-240.test.ts` 44/44 pass (기존
  가드 무관), `tsc --noEmit` clean
- 이 페이지는 `/debug/*` BASIC auth 뒤 — 사용자 가시 영향은 없으나 운영자가 실제
  표본 범위를 오인할 수 있는 stale drift



### fix(reviews): 월간 리뷰 소표본 게이팅에 하드코딩 `5` 대신 `SMALL_SAMPLE_N` 상수 사용

`reviews/monthly/[month]/page.tsx`(481줄, 최초 감사) — 렌더 로직/수렴 픽 6개 helper
(`convergenceRecord.ts` streak/homeAway/dayOfWeek/teamStats) 호출부 clean, 날짜 범위
`gte`/`lte` 양끝 inclusive 정합 확인. `buildMonthlyReview.ts`(KBO)와 자매 파일
`buildMlbMonthlyReview.ts`(MLB) 양쪽에서 "전월 대비 비교 게이팅"/"최다 정확 팀 표시
기준"/"팩터 인사이트 최소 표본" 4곳씩 총 8곳이 `SMALL_SAMPLE_N`(5) 상수를 import하지
않고 리터럴 `5`로 하드코딩 — 현재 값은 우연히 일치해 동작 차이는 없으나, cycle
91~131 매직넘버 registry sweep(12개 surface 정규화) 당시 `reviews/` 모듈이 스윕
대상에서 빠져있던 사각지대. `SMALL_SAMPLE_N` 변경 시 이 8곳만 silent하게 값이
갈라지는 잠재 drift를 사전 차단.

- `apps/moneyball/src/lib/reviews/buildMonthlyReview.ts`: `SMALL_SAMPLE_N` import,
  topTeam 표시 임계/전월 비교 게이팅 2곳/`buildFactorInsights` minSamples 리터럴 `5`
  → 상수 치환
- `apps/moneyball/src/lib/reviews/buildMlbMonthlyReview.ts`: 동일 4곳 치환 (KBO/MLB
  parity 유지)
- `apps/moneyball` `vitest run src/lib/reviews` 45/45 pass, `tsc --noEmit` clean

## v0.5.62.50 — 2026-08-20 (cycle 2269, review-code (heavy): debug/pipeline/page.tsx 최초 감사 — MLB pipeline duration_ms silent 미기록 발견/수정)

### fix(mlb-pipeline): `runMlbPipeline` 이 `pipeline_runs.duration_ms` 를 한 번도 기록하지 않던 문제

`debug/pipeline/page.tsx`(481줄, 최초 감사) 코드 read — 렌더 로직/reject-reason cohort(M16)
clean. 실 DB 조회(최근 30일 `pipeline_runs`)로 대조한 결과 `mlb_statsapi_scrape` /
`mlb_fancy_scrape` / `mlb_savant_scrape` / `mlb_predict_final` / `mlb_shadow_train` 등
모든 MLB mode row 의 `duration_ms` 가 전부 `null` — 대시보드 "평균 duration" 컬럼이
이 mode 들에서 항상 `0ms` 로 표시됨. Root cause: `packages/kbo-data/src/pipeline/
mlb-pipeline.ts` 의 `runMlbPipeline` orchestrator 가 KBO `daily.ts` (`duration_ms: durationMs`
계측 존재) 와 달리 시작 시각을 계측하지 않고 `pipeline_runs.insert()` payload 에
`duration_ms` 필드 자체를 아예 빠뜨림. `/debug/pipeline` 이 정확히 이런 pipeline 이상을
잡아내야 하는 모니터링 도구인데 MLB 도입(cycle 1900대) 이후 자기 자신의 계측 공백은
못 잡고 있던 사례. `mode 별 30일 합계` 테이블/`cron 무료 티어 사용` 추정치 모두 MLB row
의 duration 을 0 으로 왜곡 반영 중이었음.

수정: `runMlbPipeline` 진입 시 `startedAt = Date.now()` 계측 추가 + insert payload 에
`duration_ms: Date.now() - startedAt` 필드 추가. `mlb-pipeline.test.ts` 19/19 pass (기존
mock 이 payload shape 를 엄격히 assert 하지 않아 회귀 가드 없었음 — 신규 assertion 은
추가하지 않음, 다음 review-code 후속 후보로 carry-over). `packages/kbo-data` 전체
88 files/1144 tests pass, `apps/moneyball` `tsc --noEmit` clean.



### fix(lotto): `apps/moneyball/data/lotto-data.json` 이 cycle 970(2026-05-26) 이후 미갱신 상태로 방치

`lotto/methodology/page.tsx`(520줄, 최초 감사) 코드 read — 가중치/규칙 테이블 렌더 로직은
clean. 하지만 렌더에 쓰이는 데이터 소스 `apps/moneyball/data/lotto-data.json` 자체가
`generated_at: 2026-05-26` 로 멈춰 있음을 발견. Root cause: `data(lotto): ... lotto-data.json
갱신` 커밋들(cycle 1163/1292/1414/1462/1543 등, 45건)이 실제로는 전부 `scripts/lotto-data.json`
(원시 회차 캐시, 별개 파일)만 수정 — 커밋 메시지가 같은 파일명이라 site JSON 갱신으로
오인된 상태로 방치. 결과: 공개 `/lotto/methodology` 페이지가 3개월간 유효조합 수
(7,700,649, 실제 7,705,415) / OOS 검증 4건(1227회까지, 실제 1237회까지 14건) /
사이클 진행 기록(cycle 970까지, 실제 2264까지 78건 fire)을 모두 구식으로 노출.
`LOTTO_RULE_COUNT=256` 상수는 `scripts/lotto.ts` RULES 배열(리터럴 241 + ZONES.map 5 +
끝자리 loop 10 = 256) 대조 결과 정확 — 이 항목은 drift 아님.

수정: `apps/moneyball/data/lotto-data.json` count_valid/generated_at 최신화 +
누락된 draw 1228~1237 OOS 10건 + chain_fire_history 45건 append (실제 커밋/cycle JSON
기록 기준 실측치만 사용, 추정 데이터 0건). `lotto-data-schema.test.ts` 17개 pass 확인.
`VERSION`/root `package.json` 이 이미 이전 사이클(2266)부터 `apps/moneyball/package.json`
과 어긋나 있던 3-way version guard 실패도 함께 정정 (별개의 작은 누락 — 이번 빌드에 흡수).

## v0.5.62.48 — 2026-08-20 (cycle 2266, review-code (heavy): methodology/page.tsx 최초 감사 — AI 토론 fallback 미고지 발견/수정)

### fix(methodology): "AI 에이전트 토론" 섹션이 CREDIT_EXHAUSTED fallback 존재 미고지

`methodology/page.tsx`(506줄, 최초 감사) 코드 read 결과 가중치 테이블/데이터소스 라벨은
`MetricRegistry` 동적 파생이라 clean. 그러나 "AI 에이전트 토론" 섹션이 심판 에이전트의
±5% 보정이 항상 일어나는 것처럼 무조건 서술 — CREDIT_EXHAUSTED fallback 이 2026-06-06
이후 지속(8월 100% 누적 CE율, `/accuracy`가 이미 이 비율을 실시간 공개 중)인데 methodology
페이지엔 캐빗/링크 전무. 사용자가 "AI 3-agent 토론이 항상 일어난다"로 오독 가능.

수정: "AI 에이전트 토론" 섹션 말미에 캐빗 문단 추가 — AI 토론 서버 연결 불가 시 정량
모델만 사용(사후 학습도 미적용)함을 고지 + `/accuracy` 실시간 비율 링크(기존 페이지
"실시간 …참조" 패턴과 동일 스타일). type-check/lint clean, 전체 474 files/4062 tests
all pass.

## v0.5.62.47 — 2026-08-20 (cycle 2263, review-code (heavy): sitemap.ts 최초 감사 — search STATIC_PAGES 와 동일한 수동 동기 구조 확인, 제네릭 회귀 테스트 신규)

### test(sitemap): sitemap.ts 정적 hub 커버리지에 STATIC_PAGES(cycle 2262)와 동일한 제네릭 스캔 가드 부재

cycle 2261/2262 가 `search/page.tsx`의 `STATIC_PAGES` 배열(수동 나열이라 반복 drift 났던 배열)에
제네릭 스캔 회귀 테스트를 추가한 뒤, 같은 "신규 hub page.tsx 추가 시 별도 배열에 수동 등록 필요"
구조를 가진 `sitemap.ts`를 감사. 직접 코드 read 로 전체 non-dynamic hub slug 46개를 스캔해
`sitemap.ts` 리터럴과 대조한 결과 실제 누락은 0건 — 빠진 6개(`/accuracy/shadow`, `/v2-shadow-monitor`,
`/reviews/{weekly,monthly}`, `/mlb/reviews/{weekly,monthly}`) 전부 코드/주석으로 확인된 의도적 제외
(`robots: { index: false }` noindex 내부 archive 2건 + `redirect()` 전용 index 페이지 4건, dynamic
route 블록이 실제 컨텐츠 URL 을 이미 커버). 현재 상태는 clean이나, `sitemap-mlb.test.ts`(214줄)는
경로별 하드코딩 `it()` 케이스만 있어 향후 신규 hub 추가 시 `search/page.tsx`가 겪은 것과 동일한
silent drift(수동 배열 갱신 누락)에 무방비.

수정: 코드 변경 없음(감사 결과 clean) + 재발 방지 목적 제네릭 회귀 테스트 신규
(`silent-drift-cycle-2263.test.ts`) — 모든 non-dynamic hub `page.tsx`를 스캔해 `sitemap.ts` 리터럴
엔트리 존재를 검증하되, `redirect()` 전용 페이지와 `robots: { index: false }` noindex 페이지는
소스 자체에서 패턴 감지해 구조적으로 제외(하드코딩 나열 없이 향후 신규 redirect-only/noindex 페이지도
자동 인식). type-check/lint clean, 전체 474 files/4062 tests all pass(신규 1건 포함).

## v0.5.62.46 — 2026-08-20 (cycle 2261, review-code (heavy): search/page.tsx 최초 감사 — MLB 신규 6개 hub 페이지 STATIC_PAGES 검색 인덱스 누락 발견/수정)

### fix(search): STATIC_PAGES 가 wave 9(cycle 1116) 이후 신규 MLB parity hub 6개를 반영 못한 silent drift

`search/page.tsx`(436줄, 최초 감사) 자체 검색 로직(팀/선수/날짜 fuzzy match)은 클린. `STATIC_PAGES`
배열은 마지막으로 cycle 1116(wave 9)에 MLB 6개(standings/team/players/factors/wild-card/postseason)
+ KBO 3개가 동기됐으나, 그 이후 KBO parity 로 신규 shipped 된 MLB hub 페이지 6개
(`/mlb/predictions`, `/mlb/accuracy`, `/mlb/methodology`, `/mlb/matchup`, `/mlb/reviews`,
`/mlb/calendar` — 전부 실제 페이지 + 테스트 존재)가 검색 인덱스에 한 번도 추가되지 않음. 사용자가
"mlb 예측"/"mlb 방법론" 등으로 검색해도 이 6개 페이지는 결과에 뜨지 않는 silent 기능 누락. `/community`
(noindex placeholder, 인증 layer 대기 중)는 의도적 제외로 확인 — 정상.

수정: 6개 slug 를 `STATIC_PAGES`에 추가 (KBO 대응 엔트리와 동일 라벨/키워드 패턴). 재발 방지 회귀
테스트 신규(`silent-drift-cycle-2261.test.ts`) — `/mlb/*` 디렉토리를 스캔해 자체 `page.tsx` 를 가진
모든 hub 가 `STATIC_PAGES` 에 대응 slug 를 갖는지 제네릭하게 검증 (하드코딩 6개 나열이 아니라 향후
신규 MLB hub 추가 시에도 자동으로 drift 를 잡음). type-check/lint clean, 전체 472 files/4060 tests
pass (신규 1건 포함).



### fix(analysis): GameAnalysisProse/MlbGameOverview 신뢰도 라벨이 wave-352 단일 source(OVERVIEW_CLOSE_PP/OVERVIEW_DOMINANT_PP) 대신 10/20 재하드코딩

`factor-explanations.ts`(409줄, 최초 감사) 자체는 클린 — `buildGameOverview`의 요약 문장 분기(접전/우세)는
이미 wave-352(cycle 1694)가 `NEUTRAL_HI`/`WIN_PROB_DOMINANT_HI`/`NEUTRAL_FACTOR`에서 파생한
`OVERVIEW_CLOSE_PP`(10)/`OVERVIEW_DOMINANT_PP`(20)를 쓴다. 소비 컴포넌트까지 확장 감사한 끝에 발견:
정확히 같은 개념(marginPp 기준 "박빙의 접전"/"소폭 우위"/"명확한 우위" 신뢰도 라벨)을 그리는
`GameAnalysisProse.tsx`(KBO)와 `MlbGameOverview.tsx`(MLB, KO+EN 두 분기)는 파생 상수를 쓰지 않고
`marginPp < 10` / `marginPp < 20` 리터럴을 각자 재하드코딩 — wave-352가 "단일 source 로 격상"한다고
명시했지만 실제로는 `buildGameOverview` 한 곳에만 적용되고 세 소비 지점은 여전히 dark copy. 값 자체는
같아 지금 당장 보이는 버그는 아니지만, `NEUTRAL_HI`/`WIN_PROB_DOMINANT_HI` 튜닝 시 세 곳만 조용히
어긋나는 silent drift 구조.

수정: `OVERVIEW_CLOSE_PP`/`OVERVIEW_DOMINANT_PP`를 `factor-explanations.ts`에서 export, 3개 지점
(`GameAnalysisProse.tsx` 1곳 + `MlbGameOverview.tsx` KO/EN 2곳) 모두 리터럴 대신 import 전환. 회귀
테스트 1건 신규(`silent-drift-cycle-2253.test.ts`, source grep 기반). 부수 발견: cycle 2252 커밋
(#2987)이 VERSION/`apps/moneyball/package.json`만 `.44`로 bump하고 루트 `package.json`은 `.43`에
멈춰 있던 3-way version drift(정확히 `version-sync-guard.test.ts`(cycle 2047)가 지키려던 케이스) —
루트 `package.json`도 함께 `.45`로 동기화해 정정. type-check/lint clean, 전체 470 files/4049 tests
all pass(+5, zero regression). VERSION 0.5.62.44→0.5.62.45.



### fix(picks): 홈 UserVsAIScorecard / 리더보드 는 `currentStreak >= 2` 에 🔥 배지, /picks 페이지 WeeklyPicksSummary 만 `>= 3` 로 어긋남

`buildPicksStats.ts`(410줄, 최초 감사)는 KST 날짜 처리(`toKSTDate`)가 이미 cycle 2248 `kstDateKey` 패턴과 동일 방식
(offset 후 ISO slice)이라 clean — 문제 없음. 소비 컴포넌트까지 확장 감사한 끝에 발견: 동일 개념("🔥 N연속" 픽 스트릭
배지)이 `UserVsAIScorecard.tsx`(홈)와 `LeaderboardTable.tsx`/`LeaderboardClient.tsx`(리더보드) 3곳은 모두
`>= 2` 를 하드코딩했지만, 같은 `stats.currentStreak` 값을 쓰는 `/picks` 페이지의 `WeeklyPicksSummary.tsx` 만 유일하게
`>= 3` 로 어긋나 있었음 — single source 부재로 값이 desync 된 silent drift. 예: 스트릭 2인 유저가 홈에서는 🔥 배지를
보지만 `/picks` 페이지 주간 요약에서는 (beatAI 도 아니면) 배지가 안 뜨는 UX 불일치. `packages/shared`에
`PICKS_STREAK_BADGE_MIN = 2`(다수 3곳 값 따라 통일) 신규 상수 추가 후 4개 파일(`UserVsAIScorecard.tsx`/
`WeeklyPicksSummary.tsx`/`LeaderboardClient.tsx`/`LeaderboardTable.tsx`) 전부 import 전환. 회귀 테스트 1건
신규(`silent-drift-cycle-2252.test.ts`, source grep 기반 — 하드코딩 리터럴 부재 + 상수 사용 검증). type-check/lint
clean, 전체 469 files/4044 tests all pass(+9, zero regression). VERSION 0.5.62.43→0.5.62.44.

## v0.5.62.43 — 2026-08-20 (cycle 2250, info-architecture-review: 신규 라우트 트리거(직전 7일 16개 page.tsx 신규) — /lotto/check sitemap 누락 발견/수정)

### fix(seo): /lotto/check 페이지가 /lotto 허브에서 링크 + canonical URL 도 있지만 sitemap.ts 정적 라우트에 누락

`cb21e154`(조합 검증 페이지 신규)가 canonical/OG/breadcrumb 는 모두 정상 박제했지만 `sitemap.ts` static routes 갱신을
누락 — 사용자 도달 가능(허브 링크)하고 검색엔진 canonical 도 선언된 페이지가 Googlebot sitemap discovery 경로에서만
조용히 빠져있던 silent drift. 3-cycle 연속 diversity 권고(cycle 2247/2248/2249 retro) 따라 진단 chain 을
info-architecture-review 로 전환 — 신규 라우트 트리거(`find ... -mtime -7` 47건 중 git log 실제 신규 16건 확인,
`/mlb/accuracy`/`/mlb/calendar`/`/mlb/matchup`/`/mlb/methodology`/`/mlb/predictions`/`/mlb/reviews` 계열 + EN 미러 +
`/lotto/check` 포함)로 sitemap.ts 전체 대조 — 나머지 15개는 이미 커버, `/lotto/check` 단 1건 누락. `sitemap.ts`
static routes 에 추가(priority 0.5, `/lotto/methodology` 와 동일 tier). 회귀 테스트 1건 신규(`sitemap-mlb.test.ts`).
type-check/lint clean, 전체 468 files/4035 tests all pass(+1, zero regression). VERSION 0.5.62.42→0.5.62.43.

## v0.5.62.42 — 2026-08-20 (cycle 2249, review-code (heavy): buildTeamProfile.ts 등 4개 파일 최초 감사(clean) — team 페이지 3곳 콜드게임/박빙 승부 threshold 하드코딩 silent drift 발견/수정)

### fix(teams): 팀 상세 페이지(KO/MLB KO/MLB EN) 콜드게임·박빙 승부 문구가 MARGIN_BLOWOUT_THRESHOLD/MARGIN_CLOSE_GAME_THRESHOLD 를 리터럴로 중복

`buildTeamProfile.ts`(586줄)/`buildMlbTeamProfile.ts`/`buildMatchupProfile.ts`(579줄)/`buildMlbMatchupProfile.ts`(526줄)/
`deriveMlbOutcome.ts` 5개 파일 최초 감사 — 모두 이미 여러 차례 review-code(heavy) 로 하드닝됨(fail-loud assertSelectOk,
KBO/MLB alias 정규화, sort-then-consume 순서), 문제 없음. 소비 페이지까지 확장 감사 — matchup 페이지(`matchup/[teamA]/[teamB]`,
`mlb/matchup/[teamA]/[teamB]`)는 `profile.summary`(`buildMatchupSummaryText`, threshold 를 파라미터로 전달)를 그대로
렌더해 single source 지만, team 페이지 3곳(`teams/[code]`, `mlb/team/[code]`, `en/mlb/team/[code]`)은 JSX 안에
"10점차"/"1점차"/"10+ run margin"/"one-run games" 를 직접 하드코딩 — `MARGIN_BLOWOUT_THRESHOLD`(10)/`MARGIN_CLOSE_GAME_THRESHOLD`(1)
와 현재는 값이 같지만 single source 가 아니라, 상수가 튜닝되면 필터링 로직은 바뀌어도 문구는 조용히 stale 하게 남는
silent drift 위험. 3개 파일 모두 상수 import + template literal interpolation 으로 정정. 회귀 테스트 6건 신규
(`review-code-cycle-2249.test.ts`, source grep 기반 — 하드코딩 리터럴 부재 + 상수 사용 검증). type-check/lint clean,
전체 468 files/4034 tests all pass(+6, zero regression). VERSION 0.5.62.41→0.5.62.42.

## v0.5.62.41 — 2026-08-20 (cycle 2248, review-code (heavy): convergenceRecord.ts 최초 감사 — buildAccuracyData.ts dateRange KST 자정 오판 silent drift 발견/수정)

### fix(accuracy): buildVersionHistory dateRange 가 toDateString()(host local=UTC) 로 같은-날 판정 — KST 자정 근처 범위가 단일 날짜로 축약

`convergenceRecord.ts`(781줄, 최초 감사, 이번 사이클에선 문제 없음 — 이미 잘 테스트됨)를 감사하다 인접 대형 파일
`buildAccuracyData.ts`(772줄)로 확장. `buildVersionHistory`의 dateRange 표시가 `first.toDateString() ===
last.toDateString()`로 같은 날짜 여부를 판정하는데, 이 함수는 host 런타임 local(=UTC on Vercel) 날짜를 비교 —
파일 안 다른 모든 날짜 경계 계산(`buildDayOfWeek`/`buildRollingAccuracy`/`getWeekStart` 등)이 `KST_OFFSET_MS`를
더해 KST 달력일로 비교하는 것과 불일치. KST 자정 근처(예: verified_at 14:00Z~15:30Z = KST 8/19 23:00~8/20 00:30)에
걸친 범위가 같은 UTC 날짜로 오판돼 실제 이틀 범위가 단일 날짜(8/19)로 조용히 축약되는 silent drift. `kstDateKey`
헬퍼(파일 기존 KST-shift 패턴 재사용)로 비교 방식 통일. 회귀 테스트 1건 신규(`buildAccuracyData.test.ts`, KST
자정 경계 케이스). type-check/lint clean, 전체 467 files/4028 tests all pass(+1, zero regression).

## v0.5.62.40 — 2026-08-20 (cycle 2247, polish-ui: /mlb/factors Statcast 배지 emerald 이탈 정정 + version-sync 3-way drift 재발 fix)

### fix(design): /mlb/factors Statcast 4팩터 가중치 배지 brand 토큰 정렬

`apps/moneyball/src/app/mlb/factors/page.tsx` + `en/mlb/factors/page.tsx` — 신규 라우트(직전 7일 다수 shipped) polish-ui
77-cycle gap(마지막 fire cycle 2170) 트리거로 진단. 같은 페이지 안 동일 컴포넌트(가중치% 배지)가 KBO 10팩터 섹션(line
357)은 `bg-brand-50 text-brand-700`을 쓰는데 Statcast 4팩터 섹션(line 401)만 `bg-emerald-50 text-emerald-700`로 이탈 —
카드 wrapper 는 양쪽 동일(themed 아님)이라 의도된 구분색이 아닌 silent drift로 판단. brand 토큰으로 통일. 회귀 테스트
2건 신규(`polish-ui-cycle-2247.test.ts`, source grep 기반).

### fix(build): 루트 package.json + VERSION 이 apps/moneyball/package.json 버전 미동기화 (cycle 2246 누락분)

cycle 2246 커밋이 `apps/moneyball/package.json` 만 0.5.62.39로 올리고 루트 `package.json`(0.5.62.38 잔존)과
`VERSION`(0.5.62.38 잔존)을 안 올려 `version-sync-guard.test.ts`(cycle 2047 도입) 2건 실패 — 본 사이클 vitest 실행 중
발견. 3개 파일 모두 0.5.62.40으로 동기화. `pnpm --filter moneyball type-check` 통과, `pnpm --filter moneyball exec
vitest run` 467 files/4027 tests 전량 통과(+2, zero regression), `pnpm --filter moneyball lint` clean.

## v0.5.62.39 — 2026-08-20 (cycle 2246, review-code (heavy): analysis-data.ts 최초 감사 — sp_confirmation_log select 에러 silent swallow 발견/수정)

### fix(analysis): sp_confirmation_log 조회 assertSelectOk 누락 — 선발투수 배지 에러 silent swallow

`apps/moneyball/src/app/analysis/analysis-data.ts` (915줄) 최초 감사 — daily.ts/validator.ts/mlb-pipeline.ts
는 이미 review-code(heavy) 로 감사됐지만 이 파일은 처음. `getTodayAnalysisData()` 안 7개 supabase select
쿼리 중 6개는 모두 `assertSelectOk`(에러 시 throw)를 거치는데, `sp_confirmation_log`(오늘 선발투수 이름 조회,
wave-335) 쿼리 1개만 `.data ?? []` 로 직접 사용 — RLS 오류/connection 실패 시 예외 없이 조용히 빈 배열로
처리돼 "선발투수" 배지 전체가 원인 불명으로 사라지는 silent drift 가능성 발견.

`spResult` 를 다른 6개 쿼리와 동일하게 `assertSelectOk` 경유하도록 수정 — 에러 발생 시 명시적 throw (Sentry
가시화) 로 전환. 신규 회귀 테스트 1건(`silent-drift-cycle-2246.test.ts`) 추가. `pnpm --filter moneyball
type-check` 통과, `pnpm --filter moneyball exec vitest run` 466 files/4025 tests 전량 통과(+1, zero
regression), `pnpm --filter moneyball lint` clean. VERSION 0.5.62.38→0.5.62.39.

## v0.5.62.38 — 2026-08-20 (cycle 2245, explore-idea (heavy): /mlb/methodology 신규 — KBO /methodology parity, LLM 토론 layer 부재 명시)

### feat(mlb): /mlb/methodology + /en/mlb/methodology 신규 라우트

KBO 는 `/methodology` 에서 전체 예측 프로세스(데이터 소스·가중치 근거·AI 에이전트 토론·검증 방법·모델 진화
history)를 공개하지만 MLB 는 대응 라우트가 없었음(Footer "도움말" 컬럼에 KBO 만 `/glossary`+`/methodology`+`/guide`
3종, MLB 컬럼엔 `/mlb/factors` 만 존재 — parity gap). 처음엔 `/mlb/glossary` 를 검토했으나 `/mlb/factors`(14팩터
가중치+정의+출처 표)가 이미 그 역할을 완전히 커버하고 있어 순수 중복이라 폐기 — 대신 `/mlb/factors` 가 다루지
않는 영역(전체 프로세스 설명·데이터 소스·검증 방법·한계)에 집중한 `/mlb/methodology` 를 신규 작성.

핵심 차별화 발견: `mlb-pipeline.ts` 실측 확인 결과 MLB 예측엔 KBO 의 judge-agent LLM 토론 layer 가 전혀 없음
(`debate`/`judge` 호출 0건, `scoring_rule='mlb_v0.1'` 단일 quant-only 버전) — 이 사실을 페이지에 명시해 KBO 와의
방법론 차이를 투명하게 공개(30팀 435매치업 규모상 매일 LLM 토론 비용이 KBO 10팀 45매치업 대비 비현실적).
가중치 표는 중복 작성하지 않고 `/mlb/factors` 링크로 위임, Elo K-factor(`MLB_ELO_K=4`/`MLB_ELO_K_POSTSEASON=6`,
FiveThirtyEight 공개 문헌 인용, plan #25 Phase 1 기존 구현)와 검증(`/mlb/accuracy` 링크)만 신규 서술.

Header MLB 메가메뉴 "경기·팀" 그룹 + Footer MLB 컬럼 + `sitemap.ts`(KO/EN 양쪽) 에 배선. 신규 테스트 6건
(`mlb-methodology-page.test.ts` — canonical/alternates, `/mlb/factors` 중복 회피 링크, `MLB_SCORING_RULE`
상수 참조 검증) + `sitemap-mlb.test.ts` 2건 추가. `pnpm --filter @moneyball/shared type-check` /
`pnpm --filter moneyball type-check` 통과, `pnpm --filter moneyball exec vitest run` 465 files/4024 tests
전량 통과(+8), `pnpm --filter moneyball lint` clean.

다음 후보: MLB parity 는 `/mlb/factors`/`/mlb/methodology`/`/mlb/reviews`(weekly+monthly)/`/mlb/matchup`/
`/mlb/team` 6팩터 등 대부분 영역에서 이미 성숙 — 다음 explore-idea 는 신규 product 방향(예: 리더보드 국가
동기화 MLB 지원, cycle 2244 TODOS Tier 3 carry-over) 또는 diversity(polish-ui/info-arch) 검토 권장.

## v0.5.62.37 — 2026-08-13 (cycle 2083, explore-idea (heavy): plan #25 Phase 2b step 1 — MLB Elo 히스토리 테이블 + 1회성 backfill, Vercel 배포 일일 100건 quota 소진 발견)

### feat(mlb): mlb_team_elo_history 신규 — matchup Elo 추이 차트용 팀×경기일 시계열

`mlb_team_elo`(migration 046)가 UNIQUE(team_code, season) 현재 rating 스냅샷만 저장해
KBO(predictions.home_elo/away_elo 가 매 경기 row 에 쌓여 시계열 자연 발생)와 달리
historical 시계열이 없던 blocker(cycle 2082 발견, plan #25 Phase 2b) 해소 — plan 문서가
권장한 옵션 1(히스토리 로그 테이블 신규) 채택.

`packages/kbo-data/src/factors/mlb-elo.ts`에 `computeMlbEloHistory()` 신규 — 기존
`computeMlbEloRatings()`와 동일 재생 루프를 `replayMlbGames()` 내부 함수로 공유(drift
차단)해 경기별 사후 rating 스냅샷을 산출. migration 047 `mlb_team_elo_history`
(team_code/game_date/season/elo_rating, UNIQUE(team_code, game_date), RLS+anon read)
신규. `mlb-pipeline.ts`의 `runEloUpdate()`가 매일 `mlb_team_elo` upsert 와 함께
history row 도 함께 upsert(500건 chunk)하도록 배선.

**실측 중 발견한 버그**: 더블헤더(같은 팀, 같은 game_date 2경기) 시 history 배열에 같은
(team_code, game_date) 키가 2번 들어가 단일 배치 upsert 가 Postgres
`ON CONFLICT DO UPDATE command cannot affect row a second time` 로 전체 배치 reject —
로컬 backfill 1차 시도(`scripts/backfill-mlb-elo.ts --apply`)에서 실측으로 발견.
`computeMlbEloHistory()`가 반환 전에 (team_code, game_date) 키로 dedupe(마지막 경기
rating 유지)하도록 수정 — 소비 시점(DB upsert)이 아니라 산출 시점에 처리해 재발 차단.
회귀 테스트 1건 추가.

`scripts/backfill-mlb-elo.ts --apply` 실행으로 기존 748경기 전체를 재생해
`mlb_team_elo_history`에 1,472건 1회성 backfill 완료(DB 실측 확인) — 이후는 매일
`mlb_elo_update` cron 이 자동 append.

Phase 2b step 2(신규 `MlbMatchupEloChart.tsx` + 매치업 페이지 배선)는 스코프 밖 —
데이터 소스만 확보. 다음 explore-idea heavy fire 후보.

### 🚨 신규 발견: Vercel 배포 일일 100건 quota 소진 — production 이 4ab223b0(cycle 2081)에 고정

본 cycle 이 Phase 2b 실측 검증을 위해 prod API(`/api/mlb/pipeline`)를 호출하려다
`mlb_elo_update` mode 가 "invalid mode"로 거부되는 것을 발견 — `/api/version` 확인 결과
production 이 여전히 `4ab223b0`(cycle 2081 commit)을 서빙 중이었고, 그 이후 push된
`d3caf0e7`(cycle 2082, mlb_elo_update 파이프라인)/`d757ab0d`/`b651a3cc` 3개 commit
모두 Vercel 배포 기록 자체가 없음(Vercel API `deployments` 조회로 확인, canceled 도
아니고 완전 누락). `vercel deploy --prod` 수동 시도 결과 원인 확정:
`"Resource is limited - try again in 24 hours (more than 100, code: api-deployments-free-per-day)"`
— GH 웹훅/git 연동 문제가 아니라 **당일 develop-cycle 누적 fire(cycle 2065~2082, 18회
PR merge = 18+ deploy)가 Vercel free tier 일일 100건 배포 cap 을 소진**한 것.

이미 존재하던 `feedback_deploy_strategy.md`(auto-memory) 경고("Vercel 일 100회 제한,
push는 묶어서 사용자 요청 시만")가 실측으로 처음 확인된 사례 — 지금까지는 우려였을
뿐 실제 소진은 이번이 처음. Elo history backfill 은 Vercel 우회(Supabase 직접 접근
스크립트)로 완료했으나, **cron(mlb_elo_update 등 MLB/KBO 파이프라인 전체)이 quota
reset(추정 ~2026-08-14 22:07 KST, 최초 소진 시점 기준 24시간) 전까지 최신 코드로
갱신되지 않음** — Cloudflare Worker 배포 지연(사례 25)과 별개의 신규 정지 지점.
TODOS.md 최상단에 carry-over 박제.

`pnpm type-check`(4 packages)/`pnpm test`(전체 — kbo-data 1113 + shared 211 + moneyball
3740)/`pnpm lint` 전체 통과.

## v0.5.62.36 — 2026-08-13 (cycle 2081, fix-incident (heavy): MLB_TEAMS StatsAPI/Baseball-Reference 7팀 코드 불일치 — park factor + 매치업/팀페이지 DB 쿼리 silent 버그 5개 callsite 수정)

### fix(mlb): MLB_TEAMS 키(Baseball-Reference) vs mlb_schedule DB 값(StatsAPI) 7팀 불일치 정규화

cycle 2080 이 발견한 park factor silent neutral fallback 이슈(TODOS 범위 밖 flag)를 실측 확대 조사한 결과, 같은 근본 원인(`TB`/`CWS`/`KC`/`SD`/`SF`/`AZ`/`WSH` StatsAPI 코드 vs `TBR`/`CHW`/`KCR`/`SDP`/`SFG`/`ARI`/`WSN` Baseball-Reference 표준 불일치)이 park factor 뿐 아니라 매치업(`/mlb/matchup/*`)·팀(`/mlb/team/*`) 페이지의 DB 쿼리 필터 자체를 깨뜨리고 있음을 확인 — canonical 코드로 `.or(home_team_code.eq.TBR,...)` 필터링 시 DB 실측(`TB`)과 항상 불일치해 이 7팀이 낀 모든 매치업/팀 페이지가 "0경기"만 반환하는 더 심각한 silent 버그(park factor 보다 영향 범위 큼).

`packages/shared/src/mlb-teams.ts` 에 `MLB_STATSAPI_TEAM_ALIASES`(7팀 alias map) + `normalizeMlbTeamCode`(DB→canonical)/`toMlbStatsApiCode`(canonical→DB) 양방향 변환 함수 추가 — DB 실측(`mlb_schedule` 759 rows) 으로 distinct 코드 목록 확인 후 정확히 이 7팀만 alias 필요함을 검증. 5개 callsite 수정: `mlb-pipeline.ts`(park factor lookup), `convergenceRecord.ts`(수렴픽 OR 필터 + homeCode/awayCode 정규화), `buildMlbMatchupProfile.ts`(매치업 OR 필터 + homeCode/awayCode), `buildMlbTeamProfile.ts`(팀페이지 OR 필터 + isHome/isAway + opponentCode), `buildMlbTeamFactorAverages.ts`(팩터평균 OR 필터 + isHome/isAway). `mlbShortTeamName` 도 내부에서 정규화 경유하도록 수정 — 별도 callsite 변경 없이 opponent 이름 표시 오류(raw 코드 노출) 자동 해소.

회귀 테스트 6건 추가(park factor 실측값 사용 확인, DB 쿼리 필터가 StatsAPI 코드로 나가는지 확인, isHome/opponentCode/sideStats 정규화 확인) — 각각 실제 DB 값(`TB`/`SF` 등)을 mock 입력으로 사용해 정규화 없이는 fail 하는 구조로 작성.

`pnpm type-check`(4 packages) / `pnpm test`(전체 — shared 211 + kbo-data 1098 + moneyball 3739, 신규 8 tests) / `pnpm lint` 전체 통과.

**범위 밖 미확인**: `buildMlbPlayerProfile.ts:131` 의 `teams.code`(curated seed 테이블) 컨벤션은 별도 확인 필요 — TODOS.md 에 flag.

## v0.5.62.35 — 2026-08-13 (cycle 2080, explore-idea (heavy): plan #25 Phase 1 — MLB Elo K-factor 엔진 신규 구현)

### feat(mlb): MLB Elo rating 시스템 Phase 1 — K-factor 갱신 엔진 + 백필 스크립트

plan #24 Phase 2b(matchup Elo 추이 차트)가 "MLB 는 팀별 Elo rating 을 계산/저장한 적이 없음"으로 BLOCKED(cycle 2057) → plan #25 로 분리(cycle 2079 explore-idea lite). Explore agent 실측 결과 KBO 도 자체 K-factor 갱신 로직이 리포에 없음(KBO Fancy Stats 외부 스크랩 스냅샷을 그대로 저장하는 구조) 확인되어 신규 설계 필요 — `packages/kbo-data/src/factors/mlb-elo.ts` 신규: `updateMlbElo(homeElo, awayElo, homeWon, k)` 가 `newElo = oldElo + K * (actual - expected)` zero-sum 갱신을 수행, `expected` 는 기존 `computeMlbProbability` 의 elo 팩터와 동일 공식(`ELO_DIVIDER`/`HOME_ELO_BONUS` 재사용) 재구현(backtest 전용 모듈에 대한 production 의존 회피). K 값은 임의 선택 대신 FiveThirtyEight MLB Elo 모델 공개 문헌 인용(`MLB_ELO_K=4`, Nate Silver "a K factor of four is ideal for major league baseball", 포스트시즌 `MLB_ELO_K_POSTSEASON=6`) — CLAUDE.md "데이터로만 이야기" 룰 준수.

신규 테이블 `mlb_team_elo`(마이그레이션 046, team_code/season/elo_rating/games_played, RLS+anon read policy 생성 시점부터 포함 — `mlb_schedule` 038 migration 이 RLS 를 빠뜨렸던 사례 24 재발 차단) + `scripts/backfill-mlb-elo.ts`(`mlb_schedule` status='final' 경기를 시간순 재생해 전 팀 `ELO_NEUTRAL=1500` 출발 rating 도출, `--apply` 플래그 진단/적용 분리, `backfill-mlb-schedule-status.ts` 패턴 정합).

**Phase 1 스코프 한정** — 여기서 만든 rating 은 아직 어디에도 소비되지 않음(mlb-pipeline.ts 의 `ELO_NEUTRAL` placeholder 는 미변경). Phase 2(자동 갱신+UI 차트)/Phase 3(예측 반영, op-analysis heavy backtest 게이트 필수)는 별도 cycle. 상세 = `~/.develop-cycle/plans/moneyballscore/25.md`.

`pnpm type-check`(4 packages) / `pnpm --filter @moneyball/kbo-data exec vitest run`(84 files/1097 tests, 신규 12 tests) / `pnpm lint` / `pnpm lint:scripts` 전체 통과. 신규 migration test(`046_mlb_team_elo.test.ts`, root vitest 직접 실행 — `038_mlb_schedule.test.ts` 와 동일하게 turbo 파이프라인 밖 standalone 컨벤션).

## v0.5.62.34 — 2026-08-13 (cycle 2078, review-code (heavy): pipeline_runs insert 실패 silent — VARCHAR overflow 재발 경로 Sentry 미연동)

### fix(pipeline): daily.ts + mlb-pipeline.ts — pipeline_runs insert `.error` 경로 Sentry capture 추가

TODOS 최우선 carry-over(lotto cron 실측/Cloudflare secret) 재확인은 여전히 시간·사용자 대기라 이번 cycle도 착수 불가. 대신 plan #24 CRITICAL Part 2("`mlb_schedule` 전량 scheduled 고정, backfill 필요")를 실측 재검증하러 프로덕션 `/api/mlb/pipeline` 를 CRON_SECRET(prod, `vercel env pull` 로 실제 값 확인 — `.env.local` 값과 다름)로 직접 호출하다 발견: `mlb_schedule` 은 이미 748/759 `final`(cycle 2067 커밋된 `scripts/backfill-mlb-schedule-status.ts --apply` 가 오늘 10:09 UTC 실행 완료 — `/mlb/matchup/NYM/PHI`, `/mlb/team/PHI` curl 재검증으로 실제 데이터 렌더링 확인됨), TODOS.md/plan #24 의 "CRITICAL 배포 대기" 서술은 stale.

검증 도중 내가 보낸 테스트 호출(`triggeredBy: 'cycle-2078-backfill-test'`, 25자)이 실제 스크랩(games_found:15)은 성공했지만 해당 `pipeline_runs` 로그 행은 DB에 전혀 없음을 발견 — `pipeline_runs.triggered_by` 는 `VARCHAR(20)`(mig 004)인데 `mlb-pipeline.ts`/API route 모두 길이 검증 없이 임의 문자열을 그대로 insert, supabase-js 는 overflow 를 throw 없이 `.error` 로만 리턴해 `console.error` 만 찍히고 종료(사례 3 재발 경로, 이번엔 MLB + `triggered_by` 필드). KBO `daily.ts` 도 동일 경로가 있었으나 그 `insertErr` branch 조차 Sentry 미연동(주석은 "사례 3 재발 차단"이라 적어놓고 실제로는 `catch(e)` 의 thrown-exception 경로만 Sentry, `.error` 경로는 여전히 console.error 뿐이었음) — 두 파일 모두 `insertErr`/`.then(({error})=>...)` branch 에 `Sentry.captureException` 추가(`silent_drift_family: 'wave_177'` 태그 유지, KBO 기존 태그와 통일). `apps/moneyball/src/app/api/mlb/pipeline/route.ts` 는 경계에서 `triggeredBy.slice(0, 20)` clamp 추가해 재발 자체를 차단.

`pnpm type-check`(4 packages) / `pnpm --filter @moneyball/kbo-data exec vitest run`(83 files/1085 tests) / `pnpm --filter moneyball exec vitest run`(mlb/pipeline route, 16 tests) / `pnpm lint` 전체 통과. 신규 테스트 없음(기존 insert 실패 시나리오는 unit test 로 supabase mock error injection 필요해 스코프 초과 — Sentry capture 자체는 로직 분기 추가만, 기존 `insertErr`/`e` 존재 여부 분기 흐름 불변이라 회귀 위험 낮음).



### refactor(mlb): mlb-pipeline.ts — hardcoded `'mlb_v0.1'` 5곳 → `MLB_SCORING_RULE` 상수

`packages/shared/src/model-version-labels.ts` 가 plan #24 Phase 3c(cycle 2063)에서 `MLB_SCORING_RULE`/`MLB_PRODUCTION_COHORT_RULES` 를 신규 정의하면서 주석에 "`mlb-pipeline.ts` 의 단일 hardcoded literal 을 이 상수로 통합" 이라 명시했지만 실제 통합은 누락 — `mlb-pipeline.ts` 는 여전히 5곳(`runPredictFinal` insert/delete, `runShadowTrain`/`runWalkForwardMeasure` select 필터)에 `'mlb_v0.1'` 리터럴을 직접 하드코딩 중이었음. `apps/moneyball/src/lib/analysis/convergenceRecord.ts` 는 이미 상수를 올바르게 사용 중이라 두 소스가 갈라진 상태(KBO `PRODUCTION_COHORT_RULES` 하드코딩 family, wave 11~17 과 동일 구조의 MLB 신규 인스턴스). 값 자체는 동일해 현재 동작 변화 없음 — MLB 가 KBO 처럼 scoring_rule 버전이 분기되는 시점(예: `mlb_v0.1-credit-fail` 같은 cohort 분리)에 5곳 중 일부만 갱신되는 silent drift 재발을 사전 차단.

`pnpm type-check`(4 packages) / `pnpm --filter @moneyball/kbo-data exec vitest run`(83 files/1085 tests) / `pnpm lint` 전체 통과. 신규 테스트 없음(리터럴→상수 치환, 동작 불변).

## v0.5.62.32 — 2026-08-13 (cycle 2074, operational-analysis (heavy): CE fallback 실측 정정 — brier-drift 스크립트 판별 버그)

### fix(scripts): op-analysis-brier-drift.ts — CE fallback 판별을 `confidence===0.3`→`debate_version IS NULL` 로 통일

TODOS carry-over(lotto cron 실측 대기 / Cloudflare secret 사용자 영역) 재확인은 시간 경과 필요해 재확인 가치 낮음 판단 → op-analysis(heavy) 로 신선 데이터 직접 측정. `scripts/op-analysis-brier-drift.ts`(cycle 1456 도입) 재실행 결과 post 구간 CE fallback 39.1% 로 보고 — 직전 cycle 1550 이 이미 정의한 `scoring_rule='v1.8' AND debate_version IS NULL`(P4 패턴) 대신 `confidence===0.3` 하드코딩을 쓰고 있어 실측과 괴리 의심, 직접 diff 쿼리로 확인. daily.ts 의 debate_fallback_quant 경로(`agentsFailed` 시 fall-through)는 confidence 를 0.3 고정이 아니라 quant 원본 그대로 흘려보내(0에 가까운 값 다수) — `confidence===0.3` 기준은 실제 fallback 표본을 대부분 놓침. `debate_version IS NULL` 기준 재측정 = post 99.3%(150/151), 월별 CE율 5월 53.7%→6월 86.4%→7월 99.0%→8월 100.0%(n=294). 기존 CLAUDE.md "debate 100% fallback" 서술이 맞았고, 39.1% 보고치가 측정 버그였음 — 개선된 적 없음. `isCE()` 헬퍼로 `op-analysis-ce-cohort.ts`(cycle 1550) 와 판별 기준 통일. Brier 수치 자체(pre 0.2434 / post 0.2514, bootstrap CI overlap)는 변화 없음 — 모델 자체는 여전히 안정.

`pnpm type-check` (4 packages, 캐시) 통과. 신규 테스트 없음(1회성 분석 스크립트, 기존 컨벤션 동일).

## v0.5.62.31 — 2026-08-13 (cycle 2072, fix-incident (heavy): VERSION 3-way drift 재발 근절 스크립트 + lotto cron silent 실패 (사례 26))

### fix(build): scripts/bump-version.sh — VERSION/root package.json/apps/moneyball/package.json 원샷 동기화

cycle 2068(VERSION stale)·cycle 2070(root package.json stale) 이 2 cycle 만에 재발 — `version-sync-guard.test.ts`(cycle 2047)는 드리프트를 1 cycle 늦게 잡아낼 뿐, 근본 원인(매 ship 시 3개 파일을 손으로 각각 edit)은 그대로였음. `scripts/bump-version.sh <version>` 신규 — VERSION + 루트 `package.json` + `apps/moneyball/package.json` 3개를 한 커맨드로 동기화(Node.js JSON round-trip, key 순서/포맷 보존). `pnpm bump-version` alias 추가. CHANGELOG 상단 헤딩은 산문 콘텐츠라 여전히 수동 — 나머지 3개 machine-checked 필드만 커버.

### fix(cron): lotto 자동화 4주 연속 silent 실패 — repo 에 `lotto` label 부재 (사례 26)

`gh run list` 로 스케줄 workflow 상태 점검(CLAUDE.md 사례 17 재확인 습관) 중 발견 — `lotto-pick-update.yml`/`lotto-result-update.yml` 의 `gh pr create --label "automated,lotto"` 가 매번 label `lotto` 미존재로 실패 → `|| echo ""` fallback 이 에러를 삼켜 PR 자체가 생성 안 됨 → 데이터는 커밋+push 까지만 되고 branch 가 고아로 남아 main 에 영영 반영 안 됨. 4주 연속(`lotto/pick-2026-08-01`, `lotto/pick-2026-08-08`, `lotto/result-2026-07-25`, `lotto/result-2026-08-01`) 재발 확인. `lotto` label 신규 생성으로 root cause 해소. 데이터 자체 손실 2건(1235회 결과, 1236회 50조합)은 고아 브랜치에서 cherry-pick 복구(직접 main push, 커밋 187fb4db/f888a201) — 나머지 2건은 이후 수동 lotto chain 커밋으로 이미 대체돼 폐기(고아 branch 4개 전부 삭제).

`pnpm type-check` (4 packages) / `pnpm --filter moneyball lint` / `pnpm --filter moneyball exec vitest run` 통과.

## v0.5.62.30 — 2026-08-13 (cycle 2071, review-code (heavy): matchup 요약 문장 빌더 KBO/MLB 중복 통합 + VERSION drift 수정)

### refactor(analysis): buildMatchupSummaryText 단일 source 통합 (KBO buildMatchupProfile + MLB buildMlbMatchupProfile)

plan #24 phase 완결(cycle 2070) 이후 review-code(heavy) — cycle 2070 retro 가 명시한 5개 MLB-parallel 빌더 파일 dedup 후보를 직접 read. 대부분(`buildSeasonHeadToHead`/`computeConvergenceTeamStats`/6개 소통계 헬퍼)은 이미 cycle 2055/2064 review-code 로 `packages/shared` 단일 source 통합 완료돼 있었음(추가 조치 불필요). 남은 실제 후보 1건 — 두 파일의 `buildSummary`(맞대결 요약 문장) 함수가 "콜드게임"(KBO) vs "대량득점차 경기"(MLB) 단어 1건만 다르고 나머지 로직 전부 byte-identical. `packages/shared/src/index.ts` 에 `buildMatchupSummaryText<C>` 신규(구조적 타입, `blowoutSuffix` 파라미터로 리그별 표현 차이 처리 — "콜드게임이었습니다." vs "대량득점차 경기였습니다." 조사 conjugation 차이까지 caller 가 전체 접미사로 넘겨 처리) — 양쪽 파일의 `buildSummary` 는 이제 얇은 wrapper. `computeCompositeDuel`(10팩터 vs MLB 6팩터)과 `buildTeamFactorAverages`(다른 DB 조인 스키마: `teams`+`games` FK vs `mlb_schedule`+`predictions` string-code)는 genuine 로직 차이라 병합 보류(risk 판단).

### fix(build): 루트 package.json 이 apps/moneyball/package.json·VERSION·CHANGELOG 대비 1버전 stale (cycle 2070 ship 시 누락)

`pnpm --filter moneyball exec vitest run` 실행 중 `version-sync-guard.test.ts` 실패로 발견 — 루트 `package.json` 이 `0.5.62.28` 로 남아 있고 나머지(VERSION/moneyball/CHANGELOG)는 이미 `0.5.62.29`(cycle 2070). 본 cycle 변경분과 함께 `0.5.62.30` 로 동기화. cycle 2069 (VERSION 파일 stale) 와 동일 family — root package.json 도 매 ship 시 함께 bump 필요.

`pnpm type-check` (4 packages) / `pnpm --filter moneyball lint` 통과.

## v0.5.62.29 — 2026-08-13 (cycle 2070, explore-idea (heavy): plan #24 Phase 3c — MLB 매치업 수렴 픽 H2H)

### feat(analysis): wave-633 — MLB 매치업 수렴 픽 성적 (이 매치업 한정, KO+EN)

plan #24 Phase 3c 잔여(cycle 2063 확인된 blocker) 3-step 착수 — (a) `packages/shared` 에 `MLB_SCORING_RULE`/`MLB_PRODUCTION_COHORT_RULES` 신규(KBO `PRODUCTION_COHORT_RULES` 필터를 MLB predictions 에 그대로 쓰면 항상 빈 배열이던 gap 해소), (b) `computeMlbCompositeDuel.ts` 신규(KBO `computeCompositeDuel` 병렬 복제, `MLB_TEAMS[...].parkPf` 재사용, elo/recent_form/head_to_head/sfr 4팩터는 MLB 미구현이라 파라미터 자체를 뺌), (c) `getMlbConvergencePickHeadToHeadRecord` + `MlbMatchupConvergencePickRecord.tsx`(locale prop) 신규, KO+EN `/mlb/matchup` 페이지 wiring.

구현 중 신규 발견 — KBO `FACTOR_PICK_STRONG`(8)/`FACTOR_PICK_COMPLETE`(10)을 그대로 쓰면 MLB netScore 최대치가 6(유효 팩터 6개 한계)이라 임계를 넘지 못해 항상 빈 배열만 반환하는 dead 게이트가 됨 — `MLB_FACTOR_PICK_STRONG`(5)/`MLB_FACTOR_PICK_COMPLETE`(6)/`MLB_COMPOSITE_DUEL_MIN_VALID`(3)를 KBO 대비 동일 비율로 신규 정의해 해소. `computeConvergenceTeamStats`(KBO 전용 `TeamCode` 하드코딩)를 `<T extends string>` generic 으로 전환(순수 함수, 런타임 동작 변화 없음)해 MLB 재사용 시 중복 함수 작성 회피.

plan #24 전체 phase 완결 — Phase 1/2a/3a/3b/3c 모두 shipped, Phase 2b(MLB Elo 시스템 부재)만 명시적 blocked 잔존.

테스트 12건 신규(`computeMlbCompositeDuel.test.ts` 5건 + `plan24-phase3c-mlb-convergence-record.test.ts` 7건). `pnpm type-check`(4 packages) / `pnpm --filter moneyball lint` / `pnpm --filter moneyball exec vitest run`(423 files/3736 tests) / `pnpm --filter @moneyball/kbo-data exec vitest run`(83 files/1085 tests) 전체 통과.

## v0.5.62.28 — 2026-08-13 (cycle 2069, info-architecture-review (heavy): MLB matchup 435 pairs sitemap 누락 + VERSION/package.json drift 발견+수정)

### fix(seo): MLB 매치업 435쌍 sitemap 미반영 + en 미러 sitemap 누락 (30-cycle gap checkpoint 신규 발견)

info-architecture-review 30-cycle gap trigger(마지막 발화 cycle 2038, gap 31) 진단 중 발견 — `/mlb/matchup/[teamA]/[teamB]` 라우트(plan #24 Phase 3b, cycle 2063~2064 신규 shipped)가 `sitemap.ts` 에 전혀 반영되지 않고 있었음. 크로스링크(`mlbPairsForTeam`, 팀 페이지 RelatedLinks)로 진입은 가능하나 검색엔진 sitemap 발견 경로가 없던 gap. `mlbCanonicalPair.ts` 에 이미 존재하던 `mlbAllPairs()`(30 choose 2 = 435쌍)를 `sitemap.ts` 에 연결 — `mlbMatchupRoutes`(435) + `enMlbMatchupRoutes`(en 미러 435) 신규 추가, 기존 KBO `matchupRoutes`/MLB 팀 프로필 sitemap 패턴과 동일 구조. breadcrumb 누락 grep(14건) + header/footer coverage 재확인 — 전부 기존 확인된 false positive(debug/*, community, login, home, reviews stub), 신규 IA 갭 없음.

### fix(build): VERSION 파일이 package.json 대비 1버전 stale (cycle 2068 ship 시 누락)

`pnpm test` 전체 실행 중 `version-sync-guard.test.ts` 실패로 발견 — 루트 `VERSION` 파일이 `0.5.62.26` 로 남아 있고 `apps/moneyball/package.json` 은 이미 `0.5.62.27`(cycle 2068 ship). 본 cycle 변경분과 함께 `0.5.62.28` 로 동기화.

`pnpm type-check` (4 packages) / `pnpm test` (421 files/3722 tests) 통과 확인.

## v0.5.62.27 — 2026-08-13 (cycle 2068, fix-incident (lite): Cloudflare Worker 배포 toolchain + auto-deploy CI 신규 (사례 25))

### fix(infra): cloudflare-worker pnpm workspace 편입 + workerd build 승인 + wrangler 자동 배포 CI

cycle 2067 retro carry-over — 로컬 `wrangler deploy` 가 `MODULE_NOT_FOUND` 로 실패하던 근본 원인 규명: `cloudflare-worker/`가 `pnpm-workspace.yaml` packages glob(`apps/*`, `packages/*`) 밖에 있어 `wrangler` 의존성이 root `.pnpm` store 에 정상 hoist 되지 않고 dangling symlink 만 남아 있었음. `pnpm-workspace.yaml` 에 `cloudflare-worker` 추가 + `package.json` `pnpm.onlyBuiltDependencies: ["workerd"]` 추가(native postinstall 승인)로 해결 — `wrangler --version`/`whoami` 정상 동작 확인, turbo 가 `moneyballscore-cron` 을 4번째 패키지로 인식(`type-check`/`test`/`lint` 전체 통과).

추가로 로컬 wrangler 자체의 oauth refresh_token 이 2026-06-12 이후 무효화(non-interactive 환경에서 refresh 시 400 Bad Request)되어 있음을 발견 — git log 대조 결과 그 날짜 이후 `cloudflare-worker/src/worker.ts` 변경 3건(cron fire count fix, Sentry capture, 오늘 mlb_schedule KST backfill fix)이 실제 Worker 런타임에 미배포 상태로 추정. 로컬 세션 만료에 더 이상 의존하지 않도록 `.github/workflows/deploy-cloudflare-worker.yml` 신규 — `cloudflare-worker/**` push 시 `CLOUDFLARE_API_TOKEN` secret 으로 자동 `wrangler deploy`. secret 등록 및 급한 수동 배포는 사용자 영역 — `TODOS.md` carry-over 참조.

`pnpm type-check` (4 packages) / `pnpm test` (421 files/3722 tests) / `pnpm lint` 전체 통과.

## v0.5.62.26 — 2026-08-13 (cycle 2065, fix-incident: MLB predictions 팩터 breakdown 컬럼 NULL + teams/games 데이터 모델 gap 발견)

### fix(mlb): predict_final 실측 팩터(fip/xfip/woba/war/xwoba/barrel_pct) breakdown 컬럼 영속화 (사례 21)

plan #24 Phase 3c(수렴 픽 H2H MLB 버전) 착수 전 3-step 실측 확인 중 발견 — `mlb-pipeline.ts` runPredictFinal 이 `mlb_team_stats` 실측값을 `computeMlbProbability` 입력으로만 쓰고 `predictions.home_sp_fip`/`home_lineup_woba`/`home_war_total`/`home_bullpen_fip`/`home_lineup_xwoba`/`home_lineup_barrel_pct` 등 breakdown 컬럼엔 저장하지 않음 — DB 실측 결과 전량(0/755) NULL. `buildMlbTeamFactorAverages`(Phase 2a, `/mlb/matchup` 팩터 비교 섹션)가 이 컬럼을 읽는데 항상 빈 값("-" vs "-")으로 표시되던 원인. fix: predictionRows insert 시 위 14개 breakdown 컬럼을 실측값(팀 stats row 부재 시 가짜 default 대신 null — 기존 `computeCompositeDuel` null-guard 설계와 동일 원칙)으로 함께 저장. elo/recent_form/head_to_head/sfr 은 MLB 미구현 placeholder(계산 입력용 중립값일 뿐 실데이터 아님)라 계속 미저장. 회귀 테스트 신규 1건(`mlb-pipeline.test.ts`) — 실측 stats 보유 팀은 값 영속화, row 부재 팀은 null 유지 검증. 과거 755건 backfill 스크립트(`scripts/backfill-mlb-factor-breakdown.ts`) 작성 + 적용 — `mlb_schedule` 조회를 `.in()` 700+ 항목 단일 쿼리로 시도하면 PostgREST 가 에러 없이 일부만 반환하는 현상 실측 확인(배치 100개로 회피). 적용 결과 578/755건 `home_lineup_xwoba`/`home_lineup_barrel_pct`(Savant 소스) 영속화 완료 — `fip`/`xfip`/`woba`/`war`(FanGraphs 소스)는 cycle 2059 스크레이퍼 수정 이후 첫 정기 스크랩(오늘 야간) 전까지 `mlb_team_stats` 자체가 전량 NULL이라 이번엔 backfill 불가(다음 스크랩 후 재실행 권장).

### 🚨 발견 (fix 범위 밖, TODOS.md + plan #24 carry-over): teams/games 데이터 모델 gap — MLB matchup/team 페이지 프로덕션에서 항상 빈 화면 (사례 22)

위 fix 를 실측으로 검증하던 중 `/mlb/matchup/*`·`/mlb/team/*` 자체가 Phase 1(cycle 2054)부터 지금까지 프로덕션에서 항상 0경기로 렌더링되고 있었음을 발견 — `curl https://moneyballscore.vercel.app/mlb/matchup/NYM/PHI` → "아직 올 시즌 완료된 경기가 없습니다", `/mlb/team/PHI` → "예측 경기: 0"(실제 predictions 755건 존재). 원인: `buildMlbMatchupProfile.ts`/`buildMlbTeamProfile.ts` 가 KBO 패턴(`teams` 테이블 FK)을 그대로 복제했는데 `teams` 테이블에 MLB 팀 row 가 0건(전체 10건 = KBO 10팀뿐)이고, `games` 테이블에도 MLB 경기 row 가 0건(MLB 파이프라인은 `mlb_schedule`+`predictions.external_game_id` 로만 기록하는 별개 모델). 위 breakdown 컬럼 fix 는 정확하지만 이 gap 이 해결되기 전엔 화면에 영향 없음(모든 섹션이 `finalGames>0`/`games.length>0` guard 뒤). Tier 3(large) 스코프 판단 — 이번 cycle 범위 밖, 별도 fix-incident(heavy) 또는 plan 분리로 다음 우선 처리 필요. 상세 = `TODOS.md` 최상단 + plan #24 "🚨 CRITICAL" 섹션.

`pnpm --filter @moneyball/kbo-data type-check` / `pnpm --filter @moneyball/kbo-data exec vitest run`(83 files/1085 tests 전량 통과) / `pnpm --filter moneyball type-check` / `pnpm --filter moneyball lint` 통과.

## v0.5.62.25 — 2026-08-13 (cycle 2063, explore-idea (heavy): plan #24 Phase 3b — MLB matchup 시즌별 상대전적)

### feat(analysis): wave-631 — `/mlb/matchup/[teamA]/[teamB]` 시즌별 상대전적 섹션 (KO+EN)

plan #24 Phase 3 잔여 2건(수렴 픽 기록 / 시즌별 H2H) 중 시즌별 H2H 를 먼저 fire — 실측 확인 결과 `buildSeasonHeadToHead.ts` 는 `MatchupGame[]` 을 입력받는 순수 함수(DB 쿼리 없음, `gameDate`/`actualWinnerCode`/`status` 필드만 사용)라 KBO 코드를 건드리지 않고 `MlbTeamCode` 타입으로 그대로 병렬 복제 가능(`buildMlbSeasonHeadToHead.ts` 신규) — `buildMlbMatchupProfile` 이 이미 조회한 `games` 배열을 그대로 소비해 추가 DB 쿼리 0. UI 는 KBO `MatchupSeasonHeadToHead.tsx` 가 "시즌별 상대전적"/"승" 등 한글 하드코딩이라 EN 라우트 재사용 불가 — `MlbMatchupRecentForm.tsx` 의 `locale` prop 패턴을 그대로 따라 `MlbMatchupSeasonHeadToHead.tsx` 신규 작성, KO/EN 양쪽 `/mlb/matchup` 페이지의 최근 폼 섹션 다음에 배치. 반대로 남은 수렴 픽 기록(`getConvergencePickHeadToHeadRecord`)은 실측 결과 단순 타입 좁히기로 안 됨을 확인 — `computeCompositeDuel` 자체가 `TeamCode`/`KBO_TEAMS` 하드코딩이고, 무엇보다 쿼리 필터 `PRODUCTION_COHORT_RULES = ['v1.8', 'v1.8-credit-fail']` 가 KBO scoring_rule 전용이라 MLB(`scoring_rule='mlb_v0.1'`) 에 그대로 쓰면 항상 빈 배열 반환 — MLB 전용 cohort 상수 + `computeMlbCompositeDuel` 신규 필요(plan #24 Phase 3c 로 carry-over, 3-step 착수 순서 박제). 테스트 3건 신규(`buildMlbSeasonHeadToHead.test.ts`, KBO 원본 테스트 케이스 이식). `pnpm --filter @moneyball/shared type-check` / `pnpm --filter moneyball type-check` 통과, `pnpm --filter moneyball exec vitest run` 421 files/3723 tests 전량 통과, `pnpm --filter moneyball lint` clean.

## v0.5.62.24 — 2026-08-13 (cycle 2060, explore-idea (heavy): plan #24 Phase 3a — MLB matchup 최근 폼)

### feat(analysis): wave-630 — `/mlb/matchup/[teamA]/[teamB]` 최근 폼 섹션 (KO+EN)

cycle 2059 가 남긴 carry-over(cron 재실행 대기)는 아직 검증 불가(mlb_fancy_scrape cron 은 19:17 UTC, mlb_predict_final 은 다음날 — 이번 cycle 시각 08:28 UTC 로 즉시 확인 불가) — 대신 plan #24 Phase 3(최근 폼/수렴 픽 기록/시즌별 H2H) 첫 조각을 fire. `buildTeamRecentForm.ts` 실측 확인 결과 KBO 전용처럼 타입만 `TeamCode` 였지만 실제 로직은 `teams`/`games` 테이블을 team code 문자열로만 조회(리그 분기 전혀 없음) — plan #24 rubric 이 미리 표시한 "구조적 타입 좁히기 패턴" 그대로, 신규 빌더 복제 없이 파라미터 타입만 `TeamCode | MlbTeamCode` 로 넓혀 그대로 재사용(단일 호출부라 회귀 risk 없음, `pnpm --filter moneyball type-check` 로 확인). UI 는 KBO `MatchupRecentForm.tsx` 가 승/패/무 등 한글 하드코딩이라 EN 라우트 재사용 불가 — Phase 2a `MlbMatchupFactorCompare` 의 `locale` prop 패턴을 그대로 따라 `MlbMatchupRecentForm.tsx` 신규 작성, KO/EN 양쪽 `/mlb/matchup` 페이지에 팩터 비교 섹션 다음(KBO 페이지의 elo trend 자리 — Phase 2b 는 MLB Elo 시스템 부재로 block 상태라 스킵) 배치. 부수적으로 cycle 2059 ship 이 놓친 root `VERSION` 파일 drift(0.5.62.22 로 정체, package.json 양쪽은 0.5.62.23) 도 함께 정정(`version-sync-guard.test.ts` 가 잡음). `pnpm --filter @moneyball/shared type-check` / `pnpm --filter moneyball type-check` 통과, `pnpm --filter moneyball exec vitest run` 420 files/3720 tests 전량 통과, `pnpm --filter moneyball lint` clean. Phase 3 잔여(수렴 픽 기록/시즌별 H2H) 는 다음 explore-idea carry-over.

## v0.5.62.23 — 2026-08-13 (cycle 2059, fix-incident: mlb_fancy_scrape 15일 연속 무효 — FanGraphs Next.js SPA 개편 대응)

### fix(mlb): FanGraphs MLB scraper — HTML table selector → `__NEXT_DATA__` JSON 파싱 전환

정상 진단 흐름(open issue 0건, approved plan 0건, gap-trigger 미충족) 도중 `pipeline_runs` 실측 확인 — `mlb_fancy_scrape` 가 2026-07-29 부터 2026-08-13 까지 15일 연속 매일 error(초반 `fangraphs HTTP 403`, 2026-08-06 부터 `parse fail` 로 전환), `mlb_team_stats.fancy_synced_at` 전 row null 로 확인(반면 `savant_synced_at` 은 cycle 2058 수정 후 매일 정상 갱신 — savant 쪽은 무관). status=error 가 가시적이었음에도(silent 아님) 15일 미발견 — cron 상태를 능동적으로 확인하지 않으면 에러도 방치될 수 있음을 보여주는 사례. root cause = FanGraphs 가 major-league leaderboard 페이지를 ASP.NET(`table#LeaderBoard1_dg1_ctl00`) 에서 Next.js SPA(react-query) 로 전면 개편 — 서버 렌더 HTML 에 해당 테이블 자체가 더 이상 없고, 실 데이터는 `<script id="__NEXT_DATA__">` 안 `dehydratedState.queries` 에 JSON 으로 내장. `fetchFangraphsMlbTeams` 를 cheerio HTML 파싱에서 JSON 추출로 재작성 — `stats=bat`(woba/war/타구질 6종) + `stats=pit`(fip/xfip) 두 endpoint 를 팀 코드 기준 merge(배팅 endpoint 에는 애초 FIP/xFIP 가 없어 원 스크레이퍼 설계 자체가 근본적으로 깨져있었음 — KBO 쪽 `totalWar` 관례(타자 WAR 합산만, 투수 WAR 미포함) 와 동일하게 war 필드는 배팅 endpoint 값 그대로 사용). 두 endpoint 가 모듈 전역 rate limiter(`lastFetchAt`) 를 공유하므로 cycle 2058 이 고친 savant TOCTOU race 재발 방지 위해 순차 `await` 직렬화(Promise.all 금지). 실제 FanGraphs 라이브 fetch 로 30개 팀 전량 검증(로컬 sanity script, 커밋 제외). 테스트 5건 재작성(JSON mock 기반, bat/pit 매칭 실패 skip 케이스 추가). `pnpm test` 전량 통과(kbo-data 83 files/1084 tests), `pnpm --filter @moneyball/kbo-data type-check` / `pnpm --filter moneyball type-check` / `pnpm --filter moneyball lint` 통과.

## v0.5.62.22 — 2026-08-10 (cycle 2058, fix-incident: CI red on main — baseball-savant rate-limit race + root package.json version drift)

### fix(mlb): Savant scraper rate-limit race condition + version-sync drift

cycle 2057 이 "Savant scraper 스키마 복구" 를 SUCCESS 로 박제했으나 그 병합 커밋(5bbc8f5c) 자체의 CI 가 red — `baseball-savant.test.ts` 2개 테스트가 간헐적으로 실패(로컬 재현 시 매번 다른 테스트가 실패). 원인 = 스키마가 아니라 `fetchSavantTeamStatcast` 가 `fetchExpectedStats`/`fetchStatcastQuality` 를 `Promise.all` 로 동시 호출하면서 두 함수가 공유하는 모듈 전역 `lastFetchAt`(rate limiter 상태) 을 각자 독립적으로 read-then-write — real timer(`setTimeout`) 기반이라 어느 쪽 `fetch()` 가 먼저 실제로 resolve 되는지 비결정적. 테스트가 `mockResolvedValueOnce` 를 호출 순서대로 쌓아두므로, race 로 순서가 뒤바뀌면 `fetchStatcastQuality` 가 `fetchExpectedStats` 용 CSV(반대로 컬럼 shape 이 다름)를 받아 "CSV format 변경" 오탐. 실제 스키마 문제 아님 — 두 호출을 순차(`await` 직렬)로 바꿔 해결(같은 호스트 호출이라 직렬화가 rate-limit 의도에도 더 부합, 프로덕션에서도 존재하던 TOCTOU race 동시 제거). 부수적으로 `version-sync-guard.test.ts` 가 잡은 루트 `package.json`(0.5.62.20) vs `apps/moneyball/package.json`(0.5.62.21) 버전 drift(cycle 2056 ship 시 루트 미갱신) 도 정정. `pnpm test` 전량 통과(kbo-data savant 테스트 5연속 재실행 flake 0), `pnpm lint` clean, `pnpm --filter @moneyball/shared type-check` / `pnpm --filter moneyball type-check` / `pnpm --filter @moneyball/kbo-data type-check` 통과. 사례 18 (retro "완료" 서술 전 실측 확인 의무) 정합 — 이번 cycle 은 머지 전 CI green 실제 확인 후에만 SUCCESS 박제.

## v0.5.62.21 — 2026-08-10 (cycle 2056, explore-idea (heavy): plan #24 Phase 2a — MLB 매치업 시즌 평균 팩터 비교)

### feat(analysis): wave-629 — `/mlb/matchup/[teamA]/[teamB]` 시즌 평균 팩터 비교 섹션 (KO+EN)

cycle 2055 가 dedup 을 마친 후 명시적으로 남긴 plan #24 Phase 2 carry-over 중 팩터 비교 부분을 fire. KBO `MatchupFactorCompare`(8팩터: FIP/xFIP/wOBA/불펜FIP/최근폼/Elo/SFR/WAR, `buildTeamFactorAverages`)를 그대로 재사용하지 않고 MLB 전용 `buildMlbTeamFactorAverages.ts` + `MlbMatchupFactorCompare.tsx` 를 신규 작성 — `buildMlbTeamProfile.ts` 가 이미 확립한 MLB 7팩터 shape(spFip/lineupWoba/bullpenFip/recentForm/elo/lineupXwoba/lineupBarrelPct, xFIP·SFR·WAR 는 MLB 파이프라인 자체가 미수집)와 `packages/shared`의 KBO 전용 8필드 `FactorPerspective`/`computeFactorAveragesFromPerspectives` 형태가 달라 무리한 공용화 대신 risk 최소화 병렬 구현 선택(plan #24 체크리스트에 명시된 "MLB 전용 복제로 시작 후 review-code(heavy) 로 후속 통합" 순서 그대로 적용). `MetricRegistry`에 xwoba/barrel_pct slug 가 없어(KBO 10팩터 registry 전용) 라벨/힌트는 컴포넌트 로컬로 관리. KBO matchup 은 EN 페이지 자체가 없지만 MLB matchup 은 Phase 1 부터 KO/EN 양쪽 라우트가 있어 `MlbMatchupFactorCompare` 에 `locale` prop(ko/en) 을 추가해 최초부터 parity 유지(KBO 쪽엔 없던 신규 패턴). 신규 테스트 5건 (`buildMlbTeamFactorAverages.test.ts`). `pnpm --filter @moneyball/shared type-check` / `pnpm --filter moneyball type-check` 통과, `pnpm --filter moneyball exec vitest run` 420 files/3720 tests 전량 통과, `pnpm --filter moneyball lint` clean. Elo 추이 차트(Phase 2b)는 MLB 전용 Elo trend 쿼리(scoring_rule cohort 필터 미확정)가 필요해 스코프 절제 — 다음 explore-idea carry-over.

---

## v0.5.62.20 — 2026-08-10 (cycle 2055, review-code (heavy): MLB/KBO 매치업 streak/recentRecord/homeAwayEdge dedup)

### refactor(matchup): streak/recentRecord/homeAwayEdge 3개 계산 함수 packages/shared 단일 source 통합

cycle 2054 가 plan #24 Phase 1 MVP 를 risk 최소화 위해 MLB 전용 병렬 구현으로 fire 하며 명시적으로 남긴 dedup 대상 — `buildMatchupProfile.ts`(KBO) 와 `buildMlbMatchupProfile.ts`(MLB) 양쪽에 `computeMatchupStreak`/`computeMlbMatchupStreak`, `computeMatchupRecentRecord`/`computeMlbMatchupRecentRecord`, `computeMatchupHomeAwayEdge`/`computeMlbMatchupHomeAwayEdge`(+ 내부 `venueSplit` 헬퍼) 가 TeamCode 타입만 다르고 완전히 동일한 로직으로 독립 중복돼있던 것을 확인. cycle 2034/2036 이 확립한 패턴(`computeAvgMarginFromFinalGames`/`computeMarginCountFromFinalGames` generic 함수, `packages/shared/src/index.ts`)을 그대로 따라 `computeMatchupStreakFromGames`/`computeMatchupRecentRecordFromGames`/`computeMatchupHomeAwayEdgeFromGames` 3개 generic 함수(+ 비공개 `matchupVenueSplit` 헬퍼)를 shared 에 신규 추가 — 두 팀 코드 타입을 제네릭 파라미터 `C` 로 좁혀 KBO/MLB 어느 쪽에도 강제 의존하지 않음. 양쪽 builder 의 기존 export 함수 이름/시그니처/동작은 변경 없이 내부만 새 shared 함수로 위임하는 thin wrapper 로 교체 — 호출부(page.tsx, 컴포넌트, 테스트) 수정 0건. `pnpm --filter @moneyball/shared type-check` / `pnpm --filter moneyball type-check` 통과, `pnpm --filter moneyball exec vitest run` 419 files/3715 tests 전량 통과(카운트 변화 없음 — 동작 불변 순수 리팩터), `pnpm --filter moneyball lint` clean.

---

## v0.5.62.19 — 2026-08-10 (cycle 2054, explore-idea (heavy): plan #24 Phase 1 — MLB 팀 간 매치업 신규 라우트)

### feat(analysis): wave-627 — `/mlb/matchup/[teamA]/[teamB]` 신규 라우트 (KBO 매치업 parity Phase 1 MVP)

cycle 2052 가 MLB 팀 프로필 6팩터 parity 를 완결한 뒤 "매치업(2팀 맞대결) 기능이 MLB 에 없다"는 갭을 발견 (KBO `/matchup/[teamA]/[teamB]` 는 709줄 빌더+547줄 페이지+6개 하위 모듈 성숙 기능, MLB 는 0줄). cycle 2053 이 규모(30팀=435pairs, KBO 대비 9.7배)상 1 cycle 완결 불가 판단하고 plan #24 로 Phase 1/2/3 분해 — 이번 cycle 이 Phase 1 MVP 를 fire. risk 최소화 위해 KBO 코드를 건드리지 않는 MLB 전용 병렬 구현으로 시작(후속 review-code(heavy) dedup 대상, cycle 2034/2036/2043/2046/2048 통합 순서 정합): `mlbCanonicalPair.ts`(canonicalPair 병렬, 435 pairs) + `buildMlbMatchupProfile.ts`(buildMatchupProfile 구조 복제, TeamCode 비의존 3개 계산 함수는 packages/shared 단일 source 그대로 재사용) + `/mlb/matchup/[teamA]/[teamB]` KO/EN page.tsx(헤더+요약+팀별 성과+경기 기록 테이블, factor compare/elo trend/recent form/convergence pick/season h2h 는 Phase 2/3 제외) + `/mlb/team/[code]` KO/EN 양쪽 페이지에 진입 링크("다른 팀과 매치업") 추가(orphan page 방지). sitemap.xml 은 435pairs 미포함 유지(plan #24 명시 옵션 — RelatedLinks 크로스링크로 discoverable). 신규 테스트 20건(`mlbCanonicalPair.test.ts` 12건 + `buildMlbMatchupProfile.test.ts` 5건). generateStaticParams 미사용(KBO 매치업과 동일 순수 dynamic + ISR revalidate=3600 패턴).

---

## v0.5.62.18 — 2026-08-10 (cycle 2052, explore-idea: MLB 팀 프로필 avgMargin/blowout/closeGame/homeAwayEdge/recentRecord parity)

### feat(analysis): wave-626 — MLB 팀 프로필에 KBO parity 나머지 5개 팩터 추가

cycle 2050 이 streak 1개만 우선 처리(스코프 절제)하고 남긴 5개 parity gap(avgMargin/blowout/closeGame/homeAwayEdge/recentRecord) 을 한 번에 처리. `computeTeamStreak` 때 확립한 "실제로 읽는 필드만 요구하는 구조적 타입으로 좁혀 KBO/MLB 양쪽 재사용" 패턴을 그대로 반복 — `computeTeamAvgMargin`/`computeTeamBlowoutCount`/`computeTeamCloseGameCount`/`computeTeamRecentRecord` 파라미터를 기존 `StreakGame` 타입으로, `computeTeamHomeAwayEdge` 는 `isHome` 을 더한 신규 `HomeAwayGame` 타입으로 좁힘. 신규 `MLB_` 접두 중복 함수 0건 — KBO buildTeamProfile.ts 안 5개 함수를 MLB 쪽에서 그대로 import 재사용. `/mlb/team/[code]` KO/EN 양쪽 페이지에 4줄 요약 렌더링(마진/콜드게임·박빙/홈원정편차/최근전적). 신규 테스트 assertion 10건 (`buildMlbTeamProfile.test.ts`) — MLB 팀 profile 의 6개 팩터(streak 포함) parity 완결.

---

## v0.5.62.17 — 2026-08-10 (cycle 2050, explore-idea: MLB 팀 프로필 연승/연패 스트릭 parity)

### feat(analysis): wave-625 — MLB 팀 프로필에 KBO parity 연승/연패 스트릭 추가

KBO `buildTeamProfile.computeTeamStreak` (cycle 1834 wave-472) 이후 KBO 쪽 팀/매치업 프로필에 streak/avgMargin/blowout/closeGame/homeAwayEdge/recentRecord 6개 팩터가 순차 추가됐지만, MLB `buildMlbTeamProfile` 은 여전히 recentGames + factorAverages 만 보유 — 6개 팩터 모두 parity gap. 이번 cycle 은 그 중 연승/연패 스트릭 1개만 우선 처리 (스코프 절제, 나머지 5개는 다음 explore-idea carry-over). `computeTeamStreak` 이 실제로 읽는 필드(`status`/`ourScore`/`opponentScore`)만 요구하는 `StreakGame` 구조적 타입으로 파라미터를 좁혀, KBO `TeamRecentGame` 과 MLB `MlbTeamRecentGame` 양쪽이 신규 `MLB_` 접두 중복 함수 없이 동일 함수를 그대로 재사용 (이 리포에서 반복된 "동일 로직 접두어만 다르게 중복" silent drift family 를 애초에 만들지 않는 방향). `/mlb/team/[code]` KO/EN 양쪽 페이지에 한 줄 요약 렌더링. 신규 테스트 2건 (`buildMlbTeamProfile.test.ts`).

---

## v0.5.62.16 — 2026-08-10 (cycle 2049, explore-idea: 투수 프로필 선발 등판 시 팀 실제 승/패 기록)

### feat(analysis): wave-624 — 선수 프로필 페이지에 "이 투수 선발 등판 시 팀 실제 승/패" 추가

`buildPitcherProfile` 이 이미 조회해오던 `ourScore`/`opponentScore`/`status` 를 W/L 집계 없이 방치하고 있던 gap. `accuracyRate`(AI 예측 적중 여부)와는 별개로, 이 투수가 선발 등판했을 때 팀이 실제로 몇 승 몇 패였는지는 없던 지표. `computePitcherTeamRecord` 신규 함수(신규 DB 조회 없이 기존 appearances 배열만 재사용) + `PITCHER_TEAM_RECORD_MIN_GAMES=2` (`packages/shared`, RECENT_RECORD_MIN_GAMES 와 동일 기준) 로 최소 표본 미만은 배제. `/players/[id]` 페이지에 한 줄 요약 문장 렌더링. 신규 테스트 4건 (`computePitcherTeamRecord.test.ts`).

---

## v0.5.62.15 — 2026-08-10 (cycle 2047, fix-incident: VERSION/package.json/CHANGELOG 3-way 재동기화 — wave-615~623 catch-up)

### fix(context): VERSION 파일 213-cycle 미갱신 + wave-615~623 CHANGELOG silent skip 발견 (cycle 2047)

루트 `VERSION` 파일이 wave-472(cycle 1834) 이후 `0.5.54.5` 로 고정된 채 213 cycle 방치 — cycle 1975 catch-up (wave-560~596, v0.5.62.0) 당시에도 package.json 2종만 동기화되고 VERSION 파일은 빠짐. `gstack-version-bump classify --base main` 실행 시 `DRIFT_UNEXPECTED` (VERSION=0.5.54.5 vs package.json=0.5.62.4) 확인 — ship 워크플로 Step 12 가 이 상태를 만나면 STOP 해야 하는 케이스. 동시에 wave-559 catch-up 이후 재개된 "매 wave = CHANGELOG 항목" 관례가 wave-615(cycle 2026)부터 wave-623(cycle 2046)까지 9개 wave + 3개 review-code 상수 통합 refactor 동안 다시 silent skip (루트 package.json 도 wave-600(cycle 1983) 이후 0.5.62.4 에서 정지, apps/moneyball package.json 은 wave-614(cycle 2024) 이후 0.5.62.13 에서 정지 — 서로 다른 시점에 각각 멈춰 3-way 불일치).

**catch-up 요약 (wave-615~623, cycle 2026~2046)**:
- **feat(analysis) 9건**: 강수렴 어제결과 배지 완전수렴 tier 비대칭 gap fix(615) / 매치업 홈·원정 편중 판정(616) / 매치업 박빙 승부 횟수(617) / 팀 프로필 시즌 평균 득점 마진(618) / 팀 프로필 콜드게임·박빙 승부 횟수(619) / 팀 프로필 홈·원정 성적 편차(620) / 팀 시즌 팩터 평균 xFIP·SFR·WAR 추가(621) / 팀 프로필 최근 연승·연패 스트릭(622) / 팀 프로필 최근 5경기 성적(623)
- **refactor(shared) 단일 source 통합 3건 (silent drift family sweep 연장)**: `parseRecent10Record`(wave-617 직후) / `computeAvgMarginFromFinalGames`(wave-618 직후) / `computeFactorAveragesFromPerspectives`(wave-621 직후) / `WIN_LOSS_STREAK_MIN_LENGTH`(wave-622 직후) / `RECENT_RECORD_WINDOW`(wave-623 직후, matchup·team 양쪽 window=5/min=2 통일)

**조치**:
- `package.json`(루트) + `apps/moneyball/package.json` + `VERSION` 3파일 `0.5.62.15` 통일
- 신규 guard test (`version-sync-guard.test.ts`) 추가 — 3파일 버전 문자열 불일치 시 실패, 재발 차단 (cycle 1975 catch-up 이 guard 없이 재발한 것과 동일 실수 방지)

---

## v0.5.62.14 — 2026-08-10 (cycle 2044, op-analysis lite: CE dominance 100% escalation)

### operational-analysis (lite): cycle 2044 — v1.8 성과 측정 + CE dominance 심화 패턴

**현황 (2026-08-10 기준, 25-cycle 주기 트리거 자동 발화 — 마지막 발화 cycle 2019)**
- v1.8 누적: n=259 (+72 vs cycle 1549 n=187), acc=54.4% (-5.5pp vs 59.9%), 신뢰도(confidence) 기반 Brier=0.3211 (home_win_prob 기반 Brier와 다른 산식 — 사례 반복 확인, 측정 오류 아님 별개 지표)
- 최근 50건 / 최근 20건 모두 `debate_version=null` **100%** — cycle 1930 측정 시 최근 20건 중 30% (6/20) 였던 CE 비율이 100%로 심화
- `llm_fallback_events` 테이블 (cycle 1495 박제, `LLM_BACKEND_FALLBACK` 자동 failover 기록용) 전체 기간 **0건** — fallback backend 미설정 또는 미작동, CREDIT_EXHAUSTED 발생 시 순수 quant-only 로 떨어짐 확인

**패턴 P1 후속 (CE-Accuracy Trap 심화, anti_pattern, cycle 1930 최초 박제)**
- CE 비율 30%→100% 심화와 누적 정확도 59.9%→54.4% 하락이 같은 방향 — 인과 단정은 X (여전히 사용자 크레딧 미충전 상태 지속 중이라 신규 evidence 아님), 다만 심화 정도가 이전 측정보다 뚜렷해짐
- 대응 동일: 사용자 Anthropic 크레딧 충전 필요. 가중치 재조정 (v1.8 유지 확정 결정 변경) 은 여전히 부적절 — CE fallback 자체가 원인이라 가중치 문제 아님

**결정 없음 (lite scope)**: 가중치 re-fit 소진된 카드 (v2.1-B 증거) 유지. 측정만 박제, 코드 변경 없음.
- weekly cron (`op-analysis-weekly.yml`, plan #8 Tier 1 M7) 이미 동일 cohort-split 을 매주 자동 측정 중 — 본 cycle 은 25-gap 주기 트리거 재확인 + CE dominance 심화 추세 명시적 박제 목적

---

## v0.5.62.13 — 2026-08-01 (cycle 2024, wave-614: 매치업 페이지 콜드게임 횟수)

### feat(analysis): wave-614 — /matchup/[teamA]/[teamB] 콜드게임(대량 득점차) 횟수 (cycle 2024)

**신규: 매치업 요약 문장에 "콜드게임 몇 번" 빈도**
- 매치업 페이지에 평균 득점차(wave-611)는 있었지만 "몇 번이나 크게 벌어졌는지" 빈도는 없던 gap — 평균은 이상치에 묻혀 "가끔 크게 터지는 맞대결"인지 "항상 비슷하게 갈리는 맞대결"인지 구분이 안 됨
- `buildMatchupProfile.ts`: 신규 순수 함수 `computeMatchupBlowoutCount(games)` — `buildMatchupProfile` 이 이미 조회한 games 배열만으로 계산, 신규 DB 조회 없음. `status==='final'` + 점수 non-null 필터 후 `|home-away| >= 10`(콜드게임 기준) 경기 수 카운트, 최소 3경기 미만 표본은 null (avgMargin/recentRecord 보다 약간 높은 기준 — "빈도"는 표본이 너무 적으면 오해 소지)
- `buildSummary()`: `blowout.count > 0` 일 때만 문장 추가 (0건이면 언급 자체가 노이즈라 skip, 기존 avgMargin 문장 뒤에 배치)
- 테스트: `wave-614-matchup-blowout-count.test.ts` 7 cases (표본 부족/점수 null 제외/경계값 10점/홈원정 무관 절대값/final 필터/count=0 처리)

---

## v0.5.62.12 — 2026-08-01 (cycle 2021, wave-613: 매치업 페이지 최근 N경기 상대전적)

### feat(analysis): wave-613 — /matchup/[teamA]/[teamB] 최근 5경기 한정 상대전적 (cycle 2021)

**신규: 매치업 요약 문장에 "최근 폼" 상대전적**
- 매치업 페이지에 전체 시즌 기록(sideStats)과 연속 연승/연패(streak wave-610)는 있었지만 "최근 5경기만 보면 최근 흐름이 어떤지"는 없던 gap — 시즌 전체 기록에 묻혀 최근 폼 변화가 안 보임
- `buildMatchupProfile.ts`: 신규 순수 함수 `computeMatchupRecentRecord(games, teamACode, teamBCode)` — `buildMatchupProfile` 이 이미 조회한 games 배열만으로 계산, 신규 DB 조회 없음. `status==='final'` 필터 후 game_date 내림차순 정렬된 배열 앞에서부터 최근 5경기(window)만 집계, 최소 2경기 미만 표본은 null (avgMargin 과 동일 기준)
- `buildSummary()`: 전체 시즌 표본과 최근 표본이 다를 때만 (`finalGames > recentRecord.sampleSize`) 문장 추가 — 표본이 같으면 위 "올 시즌 상대전적" 문장과 완전 중복이라 skip
- 테스트: `wave-613-matchup-recent-record.test.ts` 6 cases (표본 없음/1경기 부족/5경기 window/window 초과분 제외/예정 경기 제외/무승부 표본 처리)

---

## v0.5.62.11 — 2026-07-28 (cycle 2020, wave-612: 매치업 페이지 Elo 레이팅 추이 비교)

### feat(analysis): wave-612 — /matchup/[teamA]/[teamB] 두 팀 Elo 레이팅 추이 비교 차트 (cycle 2020)

**신규: 매치업 페이지에 두 팀 Elo 추이 비교선 차트**
- `/teams/[code]` 는 이미 `TeamEloChart` (단일 팀 Elo 추이 + 리그 평균 점선) 를 갖고 있었지만, 매치업 페이지는 FactorCompare 에서 현재 시점 Elo 스냅샷 비교만 있고 "시즌 동안 두 팀 Elo 격차가 어떻게 변해왔는지" 추이는 없던 gap
- `buildMatchupEloTrend.ts`: 신규 함수 `buildMatchupEloTrend(codeA, codeB)` — 기존 `buildEloTrend()` (standings, 전체 팀 Elo 시계열) 재사용, 신규 DB 조회 없음. 두 팀 코드만 추출해 `{date, eloA, eloB}` 매핑, 양쪽 다 없는 날짜만 스킵 (한쪽만 있으면 유지 — 대시보드 연속성)
- `MatchupEloChart.tsx`: 신규 클라이언트 컴포넌트 — `TeamEloChart` 와 동일 recharts LineChart 패턴, 팀 컬러 2선 (connectNulls, 리그 평균선 없음 — 두 팀 비교가 핵심이라 제외)
- `matchup/[teamA]/[teamB]/page.tsx`: `MatchupFactorCompare` 바로 뒤에 배치 (Elo 스냅샷 비교 다음 자연스럽게 추이 이어짐)
- 테스트: `buildMatchupEloTrend.test.ts` 5 cases (빈 데이터/양쪽 있음/한쪽만 있음/양쪽 없음 스킵/에러 catch)

---

## v0.5.62.10 — 2026-07-28 (cycle 2017, wave-611: 매치업 페이지 평균 득점 마진)

### feat(analysis): wave-611 — /matchup/[teamA]/[teamB] 맞대결 평균 득점 마진 (cycle 2017)

**신규: 매치업 요약 문장에 "평균 득점차" 문구**
- 매치업 페이지에 상대전적/스트릭/수렴 픽 성적은 있었지만 "이 두 팀이 맞붙으면 보통 몇 점차로 갈리는지"는 어디에도 없던 gap
- `buildMatchupProfile.ts`: 신규 순수 함수 `computeMatchupAvgMargin(games)` — `buildMatchupProfile` 이 이미 조회한 games 배열만으로 계산, 신규 DB 조회 없음. `status==='final'` + 점수 non-null 경기만 필터해 `|home-away|` 절대값 마진 평균 (승패 방향 무관), 소수 첫째 자리 반올림. 표본 1경기 미만은 null
- `buildSummary()` 에 `avgMargin` 파라미터 추가 — 기존 상대전적/리드팀/예측성과/스트릭 문장 뒤에 "이 맞대결의 평균 득점차는 X.X점입니다" 문장 추가 (신규 UI 섹션·컴포넌트 없이 기존 요약 카드 재사용)
- 테스트: `wave-611-matchup-avg-margin.test.ts` 6 cases (표본 부족/null 점수 제외/반올림/홈원정 무관 절대값/final 필터)

---

## v0.5.62.9 — 2026-07-28 (cycle 2015, wave-610: 매치업 페이지 맞대결 최근 연승/연패 스트릭)

### feat(analysis): wave-610 — /matchup/[teamA]/[teamB] 맞대결 최근 연승/연패 스트릭 (cycle 2015)

**신규: 매치업 요약 문장에 "최근 맞대결 N연승" 스트릭 문구**
- 매치업 페이지에 경기 기록/시즌별 상대전적/수렴 픽 성적은 있었지만 "지금 이 맞대결에서 어느 팀이 몇 연승 중인지"는 어디에도 없던 gap
- `buildMatchupProfile.ts`: 신규 순수 함수 `computeMatchupStreak(games)` — `buildMatchupProfile` 이 이미 조회한 games 배열(game_date 내림차순)만으로 계산, 신규 DB 조회 없음. `status==='final'` 로 먼저 필터해 예정 경기(미래 날짜라 배열 앞쪽에 올 수 있음)를 배제한 뒤 최근 경기부터 연속 동일 승자 카운트. 무승부는 스트릭을 끊음. 최소 길이 2 미만은 null (1승만으론 "스트릭" 아님)
- `buildSummary()` 에 `streak` 파라미터 추가 — 기존 상대전적/리드팀/예측성과 문장 뒤에 "최근 맞대결에서 X가 N연승 중입니다" 문장 추가 (신규 UI 섹션·컴포넌트 없이 기존 요약 카드 재사용)
- 테스트: `wave-610-matchup-h2h-streak.test.ts` 6 cases (무승부/1승/3연승/예정경기 정렬 안전/스트릭 도중 무승부 케이스 포함)

---

## v0.5.62.8 — 2026-07-28 (cycle 2010, wave-608: 매치업 페이지 두 팀 한정 수렴 픽 성적 배지)

### feat(analysis): wave-608 — /matchup/[teamA]/[teamB] 두 팀 맞대결 한정 수렴 픽 성적 (cycle 2010)

**신규: 매치업 상세 페이지 강수렴/완전수렴 픽 "이 두 팀 한정" 성적**
- analysis/seasons/reviews-hub/monthly/weekly/teams 6곳엔 이미 (시즌 전체 기준) 수렴 픽 팀별 분리 성적이 있었지만, `/matchup/[teamA]/[teamB]` 는 AI 예측 정확도(이 매치업 한정)는 있어도 "이 두 팀이 맞붙었을 때 모델의 강수렴/완전수렴 픽 성적"은 없던 gap
- `convergenceRecord.ts`: 신규 `getConvergencePickHeadToHeadRecord(codeA, codeB, minFactors)` — `buildMatchupProfile` 의 team id 조회 + `or()` 필터 패턴 재사용, 두 팀이 맞붙은 경기만 한정 조회. 판정 로직(composite duel 계산 → minFactors 게이팅 → favoredTeam/won 산출)은 `evaluateConvergencePickRow` 공유 헬퍼로 추출해 기존 `fetchConvergencePickDetailedResults` 와 중복 없이 재사용, 집계는 기존 `computeConvergenceTeamStats` 그대로 재사용 (신규 계산 로직 없음)
- `MatchupConvergencePickRecord.tsx`: 신규 컴포넌트 — `TeamConvergencePickRecord`(wave-607) 와 동일 표시 패턴(강수렴 🏅/완전수렴 ★ 배지), 두 팀 모두 표시하되 양쪽 다 표본 없으면 렌더 skip
- `matchup/[teamA]/[teamB]/page.tsx`: "AI 예측 성과 (이 매치업 한정)" 섹션 뒤, 경기 목록 앞에 배치
- 테스트: `wave-608-matchup-head-to-head-convergence-record.test.ts` 6 cases

---

## v0.5.62.7 — 2026-07-22 (cycle 1990, wave-603: 월간/주간 리뷰 수렴 픽 팀별 분리 성적 배지)

### feat(analysis): wave-603 — /reviews/monthly/[month] + /reviews/weekly/[week] 수렴 픽 팀별 분리 성적 배지 (cycle 1990)

**신규: 월간/주간 상세 리뷰 강수렴/완전수렴 픽 팀별 분리 성적**
- `/reviews` 허브(wave-596)에만 존재하던 팀별 분리 성적이 `/reviews/monthly/[month]` + `/reviews/weekly/[week]` 상세 페이지엔 없었던 gap 발견 — 홈/어웨이(wave-600/601)·요일별(wave-599/602)은 이미 monthly/weekly로 확장됐지만 팀별만 허브에 갇혀 있던 마지막 잔여
- `convergenceRecord.ts`: `getConvergencePickTeamStats` 에 `startDate`/`endDate` optional param 추가 (`getConvergencePickHomeAwaySplit` wave-600 동일 패턴) — 순수 함수 `computeConvergenceTeamStats` 변경 없이 재사용, 자체 `minPicks` gating(`CONVERGENCE_TEAM_STATS_MIN_PICKS`)으로 소표본 팀 자동 숨김
- `monthly/[month]/page.tsx` + `weekly/[week]/page.tsx`: 요일별/홈어웨이 섹션 뒤 배치, `range.startDate`/`range.endDate` 로 조회 범위 한정, `UPCOMING_CONVERGENCE_TEAM_LIMIT` 로 표시 개수 제한 — 팀별 분리는 홈/어웨이처럼 표본이 "가끔" 부족한 유형이라 weekly도 monthly와 동일하게 적용 (요일별과 달리 구조적 배제 대상 아님)
- 테스트: `wave-603-monthly-weekly-convergence-team-stats-split.test.ts` 16 cases (순수 함수 2 + monthly/weekly 페이지 wiring 각 7)

---

## v0.5.62.6 — 2026-07-22 (cycle 1988, wave-602: 월간 리뷰 수렴 픽 요일별 분리 성적 배지)

### feat(analysis): wave-602 — /reviews/monthly/[month] 수렴 픽 요일별 분리 성적 배지 (cycle 1988)

**신규: 월간 상세 리뷰 강수렴/완전수렴 픽 요일별(일~토) 분리 성적**
- `/reviews` 허브(wave-599)에만 존재하던 요일별 분리 성적이 `/reviews/monthly/[month]` 상세 페이지엔 없었던 gap 발견 — wave-600/601(홈/어웨이 monthly+weekly 확장) 뒤 이어서 요일별도 monthly 확장
- `convergenceRecord.ts`: `getConvergencePickDayOfWeekSplit` 에 `startDate`/`endDate` optional param 추가 (wave-600 홈/어웨이 동일 패턴) — 순수 함수 `computeConvergenceDayOfWeekSplit` 변경 없이 재사용
- `monthly/[month]/page.tsx`: 홈/어웨이 섹션 뒤 배치, `range.startDate`/`range.endDate` 로 조회 범위 한정 — 표본 부족(`< CONVERGENCE_DAY_OF_WEEK_MIN_PICKS`) 요일은 자동 숨김
- **weekly 확장은 의도적으로 제외**: 한 주엔 요일당 경기가 최대 1~2개뿐이라 `CONVERGENCE_DAY_OF_WEEK_MIN_PICKS`(=3) 문턱을 구조적으로 못 넘음 (홈/어웨이처럼 "가끔" 작은 표본이 아니라 항상 부족) — 섹션이 영구히 숨겨지는 죽은 코드가 되므로 스코프에서 제외
- 테스트: `wave-602-monthly-convergence-day-of-week-split.test.ts` 9 cases (순수 함수 2 + monthly 페이지 wiring 6 + weekly 미도입 확인 1)

---

## v0.5.62.5 — 2026-07-22 (cycle 1986, wave-601: 주간 리뷰 수렴 픽 홈/어웨이 분리 성적 배지)

### feat(analysis): wave-601 — /reviews/weekly/[week] 수렴 픽 홈/어웨이 분리 성적 배지 (cycle 1986)

**신규: 주간 상세 리뷰 강수렴/완전수렴 픽 홈/어웨이 분리 성적**
- wave-600(월간)이 명시적으로 미룬 gap 충족 — 주간 상세는 표본이 작아(강수렴 픽 주당 3~5건) `CONVERGENCE_HOME_AWAY_MIN_PICKS`(=5) 문턱을 못 넘는 주가 많지만, 월간과 동일한 gating(`null` 시 섹션 자동 숨김)이라 표본 부족 주는 그냥 안 보이고 충분한 주만 자연 노출
- `reviews/weekly/[week]/page.tsx`: `getConvergencePickHomeAwaySplit(FACTOR_PICK_STRONG/COMPLETE, range.startDate, range.endDate)` Promise.all 추가 — 월간 wave-600 JSX 섹션 그대로 재사용 (신규 로직 0, 순수 함수/API 변경 없음)
- 테스트: `wave-601-weekly-convergence-home-away-split.test.ts` 9 cases (wave-600 test 구조 동일 이식)

---

## v0.5.62.4 — 2026-07-22 (cycle 1983, wave-600: 월간 리뷰 수렴 픽 홈/어웨이 분리 성적 배지)

### feat(analysis): wave-600 — /reviews/monthly/[month] 수렴 픽 홈/어웨이 분리 성적 배지 (cycle 1983)

**신규: 월간 상세 리뷰 강수렴/완전수렴 픽 홈/어웨이 분리 성적**
- `/reviews` 허브(wave-597)에만 존재하던 홈/어웨이 분리 성적이 `/reviews/monthly/[month]` 상세 페이지엔 없었던 gap 발견 — wave-586(월간 W-L)/wave-594(월간 스트리크) 뒤 이어서 충족. weekly 상세는 월간 대비 표본이 작아(강수렴 픽 주당 3~5건) `CONVERGENCE_HOME_AWAY_MIN_PICKS`(=5) 문턱을 못 넘는 달이 많아 이번엔 monthly 만 우선 적용
- `convergenceRecord.ts`: `fetchConvergencePickDetailedResults` 에 `endDate` optional param 추가 (`fetchConvergencePickResults` wave-584 동일 패턴) + `getConvergencePickHomeAwaySplit` 에 `startDate`/`endDate` optional param 추가 (`getRecentConvergencePickRecord` wave-546/584 동일 패턴) — 순수 함수 `computeConvergenceHomeAwaySplit` 변경 없이 재사용
- `monthly/[month]/page.tsx`: 월간 스트리크 섹션 뒤 배치, `range.startDate`/`range.endDate` 로 조회 범위 한정 — 표본 부족(`< CONVERGENCE_HOME_AWAY_MIN_PICKS`) 달은 자동 숨김
- 테스트: `wave-600-monthly-convergence-home-away-split.test.ts` 9 cases (순수 함수 2 + 페이지 wiring 7)

---

## v0.5.62.3 — 2026-07-22 (cycle 1979, wave-599: /reviews 허브 요일별 수렴 픽 성적 배지)

### feat(analysis): wave-599 — /reviews 허브 수렴 픽 요일별 분리 성적 배지 (cycle 1979)

**신규: `/reviews` 허브 강수렴/완전수렴 픽 요일별(일~토) 성적 분리**
- 본 페이지 metadata 가 이미 "주간·월간·전체 시즌 적중률 추이, 팀별·요일별 분해" 로 공약했지만 요일별 분해는 미구현 상태였던 gap 발견 — wave-596(팀별)/wave-597(홈어웨이) 뒤 이어서 충족
- `convergenceRecord.ts`: `computeConvergenceDayOfWeekSplit`(순수 함수) + `getConvergencePickDayOfWeekSplit` 신규 — `fetchConvergencePickDetailedResults` 반환값에 `gameDate` 필드 추가해 재사용
- `CONVERGENCE_DAY_OF_WEEK_MIN_PICKS`(=3) 신규 상수 — 요일별 소표본 노이즈 차단 (팀별 성적과 동일 임계)
- `reviews/page.tsx`: wave-597(홈/어웨이) 섹션 뒤 배치, `WEEKDAY_LABELS_KO` 라벨 배열로 일~토 배지 표시
- 테스트: `wave-599-convergence-pick-day-of-week-split.test.ts` 8 cases (순수 함수) + `wave-599-reviews-hub-day-of-week-split.test.ts` 6 cases (페이지 wiring)

---

## v0.5.62.2 — 2026-07-22 (cycle 1977, wave-598: 리뷰 하이라이트 배지 silent drift + 중복 통합)

### style(design): wave-598 — 리뷰 하이라이트 "박빙 적중" purple 색상 DESIGN.md 박제 + HighlightCard 중복 통합 (cycle 1977)

**polish-ui — 2-chain alternation lock(explore-idea/review-code) 탈출, 14 신규 라우트 7일 내 추가 + polish-ui 20 cycle 미발화 자연 trigger**

- `/reviews/weekly`, `/reviews/monthly` 두 페이지에 동일 정의된 `HighlightCard` 컴포넌트(배지 3종 색상 로직 포함) 를 `components/reviews/HighlightCard.tsx` 로 통합 — `showResultSuffix` prop 으로 주간 전용 "· 적중/빗나감" 접미사만 분기
- "박빙 적중" 배지의 `purple-500` 색상이 도입 커밋(`81f3b83c`/`6db0459c`) 이후 DESIGN.md Decisions Log 미기재 상태로 방치된 silent drift 발견 — 색상은 의도된 3rd-tier 구분(승패 이분법 밖 "박빙" 상태, wave-452~456 amber tier 와 동일 패턴) 이므로 변경 없이 문서화만 보강
- 테스트: 기존 `reviews-monthly-page`/`reviews-weekly-page` 스위트 4 cases + `/reviews` 전체 11 cases 통과 (회귀 없음)

---

## v0.5.62.1 — 2026-07-22 (cycle 1976, wave-597: /reviews 허브 홈/어웨이 분리 성적 배지)

### feat(analysis): wave-597 — /reviews 허브 수렴 픽 홈/어웨이 분리 성적 배지 (cycle 1976)

**신규: `/reviews` 허브 강수렴/완전수렴 픽 홈 지목 vs 어웨이 지목 성적 분리**
- analysis/page.tsx wave-559(강수렴)/573(완전수렴) `computeConvergenceHomeAwaySplit`/`getConvergencePickHomeAwaySplit` 재사용
- `reviews/page.tsx`: wave-596(팀별 성적) 섹션 뒤 배치 — 🏠홈 지목 vs ✈️원정 지목 각 승률 + 경기 수 컬러 코드
- `CONVERGENCE_HOME_AWAY_MIN_PICKS` 미만 시 null 가드 (소표본 노이즈 차단)
- 테스트: `wave-597-reviews-hub-home-away-split.test.ts` 7 cases

---

## v0.5.62.0 — 2026-07-22 (cycle 1975, review-code: CHANGELOG/version 재동기화 — wave-560~596 catch-up)

### fix(context): CHANGELOG.md silent drift — wave-559 (cycle 1933) 이후 41 cycle 미갱신 발견 (cycle 1975)

`apps/moneyball/package.json` 는 wave-596(cycle 1974) 까지 커밋되며 실제 0.5.61.31 그대로 멈춰있었고, CHANGELOG.md 최신 항목도 wave-559 에서 정지 — 그 사이 37개 wave(560~596, cycle 1934~1974) 가 버전/체인지로그 기록 없이 머지됨. 루트 `package.json` 은 그보다도 앞선 0.5.61.27 에서 멈춰 두 파일 간 불일치까지 존재. ship 워크플로 관례(매 wave = 버전 bump + CHANGELOG 항목) 가 이 구간에서 silent skip.

**catch-up 요약 (wave-560~596, cycle 1934~1974) — 완전수렴 픽(10팩터) 기능 확장 물결**:
- **feat(analysis) 신규 배지 19건**: 완전수렴 시즌/streak/최장streak/이번주/이번달/팀별·홈어웨이/직전N경기 rolling/아카이브 레이블/어제결과/주간·월간·시즌 리뷰 카드/`/reviews` 허브 전체·스트리크·팀별 카드 (wave-561/563/565/567/569/571-573/575/577/579/581/584/586/588/590/592/594/596)
- **fix(context) 상수화/순수함수 추출 17건**: `ACCURACY_GOOD_PCT`/`CONVERGENCE_BADGE_LOW_PCT`/`CONVERGENCE_STREAK_MIN_LENGTH`/`CONVERGENCE_RECORD_ALL_LIMIT`/`REVIEWS_HUB_RECENT_WEEKS`/`MONTHLY_REVIEW_NAV_LOOKBACK_MONTHS`/`WEEKLY_REVIEW_NAV_LOOKBACK_WEEKS` 등 신규 상수 + `computeWinRatePct`/`computeWinRateColorClass`/`computeWinProbPct`/`computeWeeklyConvergenceRecord`/`computeUpcomingPickGameIds`/`computeConvergenceRecordFromIsCorrect`/`computeConvergencePickFlags` 등 순수 함수 추출 (silent drift family sweep, wave-560/562/564/566/568/570/574/576/578/580/583/585/587/589/591/593/595)
- **fix(ia)**: `/teams/[code]/recent` sitemap 누락 수정 (wave-582, cycle 1959)
- 테스트 스위트 wave-559 시점 대비 대폭 증가 (개별 wave 커밋 메시지에 케이스 수 기록)

**조치**: `apps/moneyball/package.json` + 루트 `package.json` 버전 0.5.62.0 로 동기화 통일. 다음 wave 부터 per-wave CHANGELOG 항목 + 버전 bump 관례 재개.

---

## v0.5.61.31 — 2026-07-21 (cycle 1933, wave-559: 강수렴 픽 홈/어웨이 분리 성적 배지)

### feat(analysis): wave-559 — 강수렴 픽 홈/어웨이 분리 성적 배지 (cycle 1933)

**신규: 강수렴 픽 홈 지목 vs 어웨이 지목 성적 분리**
- `packages/shared`: `CONVERGENCE_HOME_AWAY_MIN_PICKS=5` 상수 추가
- `convergenceRecord.ts`: `fetchConvergencePickDetailedResults` 확장 (`favoredHome: boolean` 필드 추가) + `computeConvergenceHomeAwaySplit()` (순수 함수) + `getConvergencePickHomeAwaySplit()` 추가
- `analysis/page.tsx`: wave-559 홈/어웨이 분리 배지 — 🏟️ 홈 지목(🏠) vs 어웨이 지목(✈️) 각 승률 + 경기 수 컬러 코드
- 테스트: `wave-559-convergence-pick-home-away-split.test.ts` 11 cases (빈/소표본/집계/경계값)

---

## v0.5.61.30 — 2026-07-21 (cycle 1931, wave-557: 강수렴 픽 팀별 시즌 성적)

### feat(analysis): wave-557 — 강수렴 픽 팀별 시즌 성적 배지 (cycle 1931)

**신규: 강수렴 픽 팀별 시즌 적중 현황**
- `convergenceRecord.ts`: `computeConvergenceTeamStats()` (순수 함수) + `getConvergencePickTeamStats()` 추가
- `packages/shared`: `CONVERGENCE_TEAM_STATS_MIN_PICKS=3` 상수 추가
- `analysis/page.tsx`: wave-557 팀별 수렴 적중 배지 — 시즌 전체 강수렴 픽 팀별 W/L + 승률(%) 색상 코드
- 테스트: `wave-557-convergence-pick-team-stats.test.ts` 9 cases (집계 정확성 / 정렬 / minPicks 필터)

---

## v0.5.61.29 — 2026-07-21 (cycle 1930, op-analysis lite: CE-Accuracy Trap 패턴 박제)

### operational-analysis (lite): cycle 1930 — v1.8 성과 측정 + CE 패턴 추출

**현황 (2026-07-21 기준)**
- v1.8 누적: n=205, acc=57.1%, Brier≈0.2518
- 최근 50건: debate=null 100% (CREDIT_EXHAUSTED 6th recurrence 지속)
- 최근 20건: 6/20 (30%) — CE fallback 심화 구간

**패턴 P1: CE-Accuracy Trap (anti_pattern)**
- 저확신(<0.3) n=26 acc=38.5% vs 고확신(≥0.5) n=47 acc=61.7% → 23.2pp 격차
- CREDIT_EXHAUSTED → debate disabled → confidence 0.3 flat or quant noise → accuracy crash
- 대응: 사용자 Anthropic 크레딧 충전 필요 (7th recurrence 예방)

**패턴 P2: Debate-less Quant Degradation (ai_agent)**
- debate_version=null 50/50 (최근 전체) — 순수 quant 구간 성능 격리 필요
- CE 기간 별도 cohort 추적 (v1.8-credit-fail scoring_rule)

**패턴 P3: Off-Day False Alarm (quality_guard)**
- 7/20 games=0 → predict preds=0 (정상). alert 전 games count 교차 확인 필요
- pipeline_runs.preds=0 단독 alert = off-day 오탐 위험

---

## v0.5.61.28 — 2026-07-21 (cycle 1927, wave-555: getConvergencePickStreak default param 동기)

### fix(context): wave-555 — getConvergencePickStreak default param 동기 guard test (cycle 1927)

- `convergenceRecord.ts` `getConvergencePickStreak` default `FACTOR_PICK_MIN_FACTORS`(7) → `FACTOR_PICK_STRONG`(8) 정합
  (wave-552 callsite `analysis/page.tsx getConvergencePickStreak(FACTOR_PICK_STRONG)` 명시, wave-554 `getConvergencePickBestStreak` default 동일 기준)
- `computeConvergenceBestStreak` comment: "동점 시 win 우선" 명시 추가 (wave-552 테스트 불변 정합)
- 테스트 6건 추가 (`wave-555-convergence-streak-default-guard.test.ts`)
- v0.5.61.28

## v0.5.61.27 — 2026-07-20 (cycle 1926, wave-554: 강수렴 픽 시즌 최장 streak 기록)

### feat(analysis): wave-554 — 강수렴 픽 시즌 최장 streak 기록 (cycle 1926)

- `convergenceRecord.ts` `computeConvergenceBestStreak(results: boolean[])` 순수 함수 추가
  (전체 배열에서 최장 연속 구간 탐색 — 현재 streak 아닌 시즌 역대 최장)
- `getConvergencePickBestStreak(minFactors?)` async 함수 추가 — `KBO_SEASON_START_DATE` 기준 전체 조회 후 최장 계산
- `analysis/page.tsx` 이번 주 남은 경기 헤더: `convergenceBestStreak !== null` 시 '최장 N연승/패' 배지 표시
  (현재 streak 🔥/❄️ 바로 뒤, 회색 dimmer 스타일 — 시즌 최장 비교 컨텍스트)
- 테스트 19건 추가 (`wave-554-convergence-best-streak.test.ts`)
- v0.5.61.27

## v0.5.61.26 — 2026-07-20 (cycle 1925, wave-553: fetchConvergencePickResults 중복 추출)

### fix(context): wave-553 — fetchConvergencePickResults 중복 추출 guard test (cycle 1925)

- `convergenceRecord.ts`: `getRecentConvergencePickRecord` + `getConvergencePickStreak` 공유 DB 쿼리 + 루프 로직 (~80줄) → `fetchConvergencePickResults` private helper 추출
- `getRecentConvergencePickRecord`: helper 위임 후 `wins = filter(r=>r).length` / `losses = length - wins` (명시적 불변)
- `getConvergencePickStreak`: helper 위임 후 `computeConvergenceStreak` 호출
- 테스트 4건 추가 (`wave-553-convergence-pick-results.test.ts`)
- v0.5.61.26

## v0.5.61.25 — 2026-07-20 (cycle 1924, wave-552: 강수렴 픽 연속 streak 배지)

### feat(analysis): wave-552 — 강수렴 픽 연속 streak 배지 (cycle 1924)

- `convergenceRecord.ts` `computeConvergenceStreak(results: boolean[])` 순수 함수 추가
  (최신순 boolean[] → `{ type: 'win' | 'loss'; length: number } | null`, 2연속 미만 → null)
- `getConvergencePickStreak(minFactors)` async 함수 추가 — DB 조회 후 `computeConvergenceStreak` 호출
- `analysis/page.tsx` 이번 주 남은 경기 헤더: `convergenceStreak !== null` 시 배지 표시
  (`🔥 N연승` amber/warm, `❄️ N연패` sky/cool — streak 2 이상만 표시)
- 테스트 16건 추가 (`wave-552-convergence-streak.test.ts`)
- v0.5.61.25

## v0.5.61.24 — 2026-07-20 (cycle 1922, wave-550: 어제 경기 강수렴 픽 배지)

### feat(analysis): wave-550 — 어제 경기 강수렴 픽 배지 (cycle 1922)

- `analysis/page.tsx` `YesterdayGameCard`: `convergenceNetScore: number | null` 필드 추가
- `YesterdayGameRow`: 팩터 필드 추가 (`home_elo`, `away_elo`, `home_recent_form`, `away_recent_form`, `home_sp_fip`, `away_sp_fip`, `home_sp_xfip`, `away_sp_xfip`, `home_lineup_woba`, `away_lineup_woba`, `home_bullpen_fip`, `away_bullpen_fip`, `home_sfr`, `away_sfr`, `home_war_total`, `away_war_total`)
- `getYesterdayGames`: 팩터 필드 SELECT 추가 + `computeCompositeDuel` 로 `convergenceNetScore` 산출 (`ThisWeekGameCard` wave-405 패턴 동일)
- "어제 경기 분석" 카드: `|convergenceNetScore| >= FACTOR_PICK_COMPLETE(10)` → ★, `>= FACTOR_PICK_STRONG(8)` → ⚡ 배지 표시
- 테스트 13건 추가 (`wave-550-yesterday-convergence-badge.test.ts`)
- v0.5.61.24

## v0.5.61.23 — 2026-07-20 (cycle 1915, wave-544: 강수렴 픽 rolling 성적)

### feat(analysis): wave-544 — 강수렴 픽 rolling 성적 (cycle 1915)

- `convergenceRecord.ts` `getRecentConvergencePickRecord`: `minFactors` 옵션 파라미터 추가 (기본값 FACTOR_PICK_MIN_FACTORS=7, 하위 호환)
- `analysis/page.tsx` Promise.all: `recentStrongConvergenceRecord` 추가 (`FACTOR_PICK_STRONG=8` 필터)
- 강수렴 픽 성적 배지: "이번 주 강수렴 픽" 배지 뒤 "최근 N경기 X승Y패 (Z%)" 표시
- 수렴 픽 없는 구간 `total=0` → UI 표시 안 함 (조건 가드)
- v0.5.61.23

## v0.5.61.22 — 2026-07-20 (cycle 1911, wave-540: groupByDate 더블 map chain fix)

### fix(context): wave-540 — groupByDate 더블 map chain 제거 (cycle 1911)

- `analysis/page.tsx` `groupByDate`: 불필요한 중간 `.map(([date, gs]) => ({ date, gs: gs }))` 제거
- 단일 `.map(([date, gs]) => ({ date, games: gs }))` — `groupUpcomingByDate` 와 동일 패턴
- 테스트 `wave-540-group-by-date-map-chain.test.ts` 3건 추가 (silent drift guard)
- v0.5.61.22

## v0.5.61.21 — 2026-07-20 (cycle 1910, wave-539: 이번 주 강수렴 픽 미리보기 블록)

### feat(analysis): wave-539 — 이번 주 남은 경기 강수렴 픽 미리보기 블록 (cycle 1910)

- `analysis/page.tsx` "이번 주 남은 경기" 섹션: 날짜 그룹 위에 강수렴 픽 compact 카드 추가
- `strongUpcomingPickGameIds` 필터 + TOP픽 우선 정렬 (topUpcomingPickGameId 비교)
- 각 카드: ★/⚡ 배지 + 팀명 + 날짜(mm.dd) + ↗ 수렴 방향 팀명 + gameOverviewSummary
- TOP픽 amber / 강수렴 픽 brand 색상 분기
- `strongUpcomingPickCount > 0` 조건 가드 (수렴 픽 없는 날 빈 블록 차단)
- 테스트 9건 추가 (wave-539-upcoming-pick-preview.test.ts)
- v0.5.61.21

## v0.5.61.20 — 2026-07-20 (cycle 1909, wave-538: summary 생성 조건 FACTOR_PICK_STRONG 정합)

### fix(context): wave-538 — gameOverviewSummary 생성 조건 FACTOR_PICK_STRONG(8) 정합 (cycle 1909)

- `analysis/page.tsx` wave-537 IIFE: `FACTOR_PICK_MIN_FACTORS(7)` → `FACTOR_PICK_STRONG(8)`
- UI 표시 조건 `isTopUpcomingPick||isStrongUpcomingPick`(score≥8) 과 생성 조건 일치
- score=7 경기 불필요 summary 생성 차단
- 테스트 wave-537 test 갱신 (FACTOR_PICK_STRONG 조건 반영)
- v0.5.61.20

## v0.5.61.19 — 2026-07-20 (cycle 1908, wave-537: 이번 주 남은 경기 수렴 픽 카드 buildGameOverview summary)

### feat(analysis): wave-537 — 이번 주 남은 경기 수렴 픽 카드 buildGameOverview summary (cycle 1908)

- `analysis/page.tsx` `UpcomingScheduledGame`: `gameOverviewSummary: string | null` 필드 추가
- `getThisWeekRemainingGames`: 수렴 픽 경기(`|convergenceNetScore| >= FACTOR_PICK_MIN_FACTORS`)에 `buildGameOverview` 호출 → `summary` 생성, 비수렴 경기 `null`
- `analysis/page.tsx` UI: TOP픽(`★ TOP픽`)/강수렴픽(`⚡ 픽`) 카드 왼쪽 하단에 overview summary 한 줄 표시
  - `text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug`
  - wave-536 WAR=0 data gap guard 연계 (buildGameOverview 내부 guard 자동 적용)
- 테스트 (`wave-537-upcoming-pick-overview-summary.test.ts`): 8 PASS
- v0.5.61.19

---

## v0.5.61.18 — 2026-07-20 (cycle 1907, wave-536: factor-explanations WAR=0 data gap guard)

### fix(context): wave-536 — factor-explanations WAR=0 data gap guard (cycle 1907)

- `buildGameOverview`: `homeWar=0 || awayWar=0` 시 "전력 우세" 태그 오출력 차단
- `explainFactor` WAR: WAR=0 팀 → "XXX WAR 미집계 — 예측에서 중립 처리됨." 내러티브
- wave-536 테스트 7 PASS
- v0.5.61.18

---

## v0.5.61.17 — 2026-07-20 (cycle 1906, wave-535: WAR 데이터 갭 guard — computeCompositeDuel WAR=0 UI 일치)

### fix(context): wave-535 — WAR 데이터 갭 guard (computeCompositeDuel WAR=0, cycle 1906)

- `computeCompositeDuel`: `homeWar=0 || awayWar=0` 시 WAR factor `valid=false` + `warResult=null`
  - predictor wave-533 (WAR=0 neutral) 과 UI 일치
  - Fancy Stats top-50 데이터 갭 팀 (Doosan/KT/Lotte/Kiwoom) 맥락에서 WAR 오분류 차단
  - 이전: homeWar=15.0 vs awayWar=0.0 → `warResult='home'` (misleading) → 수렴 점수 영향
  - 이후: WAR=0 시 `valid=false` → 수렴 점수에서 WAR 제외 (예측 엔진과 동일)
- `analysis/page.tsx` 팩터 수렴 픽 섹션: WAR=0 팀 존재 시 "WAR 미집계" 미표시 배지 추가
  - `homeWar === 0 || awayWar === 0` → `"WAR 미집계 (팀명)"` gray 마이크로 텍스트
  - 단일 팀 갭: 팀명 명시 / 양쪽 갭: 팀명 생략
- `analysis/page.tsx` 이번 주 남은 경기 WAR 직접 대결 배지 (wave-508): WAR=0 guard 추가
  - `g.homeWar > 0 && g.awayWar > 0` 조건 → 갭 팀 포함 경기에서 WAR 배지 미노출
- 테스트 (`wave-535-war-data-gap.test.ts`): 9 PASS
- v0.5.61.17

---

## v0.5.61.16 — 2026-07-20 (cycle 1898, wave-529: 이번 주 남은 경기 TOP픽/강수렴 픽 수렴 방향 팀명 표시)

### feat(analysis): wave-529 — 이번 주 남은 경기 TOP픽/강수렴 픽 수렴 방향 팀명 표시 (cycle 1898)

- `isTopUpcomingPick || isStrongUpcomingPick` 카드에 팩터 수렴 방향 팀명 표시
  - `convergenceNetScore > 0` → 홈팀, `<= 0` → 원정팀
  - TOP픽 카드: `↗ [팀명]` amber 색상 (`text-amber-600 dark:text-amber-400`)
  - 강수렴 픽 카드: `↗ [팀명]` brand 색상 (`text-brand-600 dark:text-brand-400`)
  - 일반 경기 카드: 표시 없음 (기존 동일)
  - `convergenceNetScore = null` 시 미표시 (null guard)
- 팩터 N:M 비율 아래 (10팩터 배지 위) 배치 — 수렴 강도 표시 라인 직후
- wave-529 테스트 추가 (`wave-529-upcoming-pick-convergence-direction.test.ts`) — 9 PASS
- v0.5.61.16

---

## v0.5.61.15 — 2026-07-20 (cycle 1894, wave-525: 이번 주 남은 경기 수렴 픽 복수 강조)

### feat(analysis): wave-525 — 이번 주 남은 경기 수렴 픽 복수 강조 (cycle 1894)

- `FACTOR_PICK_STRONG(8)` 이상 모든 예정 경기를 강조 — TOP픽(amber) + 기타 강수렴(brand) 3-tier 구분
  - TOP픽(`★ TOP픽`): amber border + ring, amber 배지 (wave-523 유지)
  - 강수렴 픽(`⚡ 픽`): brand border, brand 배지 (wave-525 신규)
  - 일반 경기: 기존 gray border (변경 없음)
- 섹션 헤더에 `수렴 픽 N개 예정` 카운트 배지 추가 (강수렴 픽 ≥ 1 시)
- `strongUpcomingPickGameIds` (Set) + `strongUpcomingPickCount` (number) 로직 추가
- wave-525 테스트 추가 (`wave-525-upcoming-strong-pick-multi-highlight.test.ts`) — 13 PASS
- v0.5.61.15

---

## v0.5.61.14 — 2026-07-20 (cycle 1892, wave-523: 이번 주 남은 경기 수렴 TOP 픽 배지)

### feat(analysis): wave-523 — 이번 주 남은 경기 수렴 TOP 픽 배지 (cycle 1892)

- "이번 주 남은 경기" 카드 중 `|convergenceNetScore| >= FACTOR_PICK_STRONG(8)` 최대 경기에 `★ TOP픽` 배지 표시
  - 오늘 AI 예측의 `★ 탑픽` 배지와 대칭 구조
  - 상단 찾기 로직: `thisWeekRemainingGames.filter(>= FACTOR_PICK_STRONG).sort(|score| desc).at(0)`
  - 카드 스타일: amber border + ring (오늘 탑픽과 동일 시각 처리)
  - 게임 시간 없는 경우에도 TOP픽 배지 별도 라인 표시
- `topUpcomingPickGameId` null 시 모든 카드 기본 스타일 유지
- wave-523 테스트 추가 (`wave-523-upcoming-top-pick-badge.test.ts`) — 13 PASS
- v0.5.61.14

---

## v0.5.61.13 — 2026-07-20 (cycle 1890, wave-521: 이번 주 남은 경기 카드 6팩터 배지 완성)

### feat(analysis): wave-521 — analysis 이번 주 남은 경기 카드 불펜FIP·Elo·WAR·SFR·최근폼·xFIP 직접 대결 배지 (cycle 1890)

- "이번 주 남은 경기" 카드에 누락 6팩터 직접 대결 배지 추가 (wave-517/519 SP FIP + wOBA + H2H + 구장에 이어 10팩터 완성)
  - `불펜FIP` 배지: |ΔFIP| >= BULLPEN_FIP_DIFF_MIN(1.0) 시 우위 팀명 + 격차 표시
  - `Elo` 배지: |ΔElo| >= ELO_GAP_STRONG(50) 시 우위 팀명 + 격차 표시
  - `WAR` 배지: |ΔWAR| >= WAR_DUEL_MIN(5.0) 시 우위 팀명 + 격차 표시
  - `수비SFR` 배지: |ΔSFR| >= SFR_DUEL_MIN(5.0) 시 우위 팀명 + 격차 표시
  - `최근폼` 배지: |Δ폼| >= RECENT_FORM_DUEL_MIN(0.10) 시 우위 팀명 + 격차 표시
  - `xFIP` 배지: |ΔxFIP| >= SP_XFIP_DUEL_MIN(0.5) 시 우위 팀명 + 격차 표시
- `UpcomingScheduledGame` 인터페이스에 12개 필드 추가 (6쌍 home/away)
- `getThisWeekRemainingGames()` result.push에 factorDataMap + eloMap 데이터 전달
- wave-521 테스트 추가 (`wave-521-upcoming-remaining-6badge.test.ts`) — 26 PASS
- v0.5.61.13

---

## v0.5.61.12 — 2026-07-20 (cycle 1885, wave-518: SP FIP·wOBA 이번 주 남은 경기 카드 JSDoc callsite sync)

### fix(context): wave-518 — SP_FIP_DUEL_MIN·LINEUP_WOBA_DUEL_MIN JSDoc wave-517 이번 주 남은 경기 카드 callsite 미박제 수정 (cycle 1885)

- wave-517 가 analysis/page.tsx 이번 주 남은 경기 카드에 SP_FIP_DUEL_MIN·LINEUP_WOBA_DUEL_MIN 신규 callsite 추가했으나 JSDoc 미박제
  - `SP_FIP_DUEL_MIN`: "변경 시" wave-363/446/499 → wave-363/446/499/517 + wave-517 callsite 주석 추가
  - `LINEUP_WOBA_DUEL_MIN`: "변경 시" wave-355/442/501 → wave-355/442/501/517 + wave-517 callsite 주석 추가
- wave-518 테스트 추가 (`wave-518-upcoming-duel-badge-jsdoc-callsite-sync.test.ts`) — 11 PASS
- v0.5.61.12

---

## v0.5.61.11 — 2026-07-20 (cycle 1883, wave-516: H2H·구장 직접 대결 배지 JSDoc callsite sync)

### fix(context): wave-516 — H2H_DOMINANT_RATE/H2H_WEAK_RATE/PARK_FACTOR_HITTER_MIN/PARK_FACTOR_PITCHER_MAX JSDoc wave-515 callsite 미박제 수정 (cycle 1883)

- wave-515 가 analysis/page.tsx 에 H2H·구장 직접 대결 배지 신규 callsite 추가했으나 JSDoc 미박제
  - `H2H_DOMINANT_RATE`: wave-516 analysis/page.tsx 직접 대결 배지 callsite 추가
  - `H2H_WEAK_RATE`: wave-516 analysis/page.tsx 직접 대결 배지 callsite 추가
  - `PARK_FACTOR_HITTER_MIN`: wave-516 analysis/page.tsx 직접 대결 배지 callsite 추가
  - `PARK_FACTOR_PITCHER_MAX`: 동일 (PARK_FACTOR_HITTER_MIN JSDoc 공유)
- wave-516 테스트 추가 (`wave-516-h2h-park-duel-badge-jsdoc-callsite-sync.test.ts`) — 12 PASS
- v0.5.61.11

---

## v0.5.61.10 — 2026-07-20 (cycle 1881, wave-514: H2H/park factor JSDoc computeCompositeDuel.ts callsite sync)

### fix(context): wave-514 — H2H_DOMINANT_RATE/H2H_WEAK_RATE/PARK_FACTOR_HITTER_MIN/PARK_FACTOR_PITCHER_MAX JSDoc computeCompositeDuel.ts callsite 누락 수정 (cycle 1881)

- wave-509 JSDoc sync 에서 누락된 4개 상수 computeCompositeDuel.ts callsite 박제
  - `H2H_DOMINANT_RATE`: 변경 시 라인 → computeCompositeDuel.ts callsite 추가
  - `H2H_WEAK_RATE`: 변경 시 라인 → computeCompositeDuel.ts callsite 추가
  - `PARK_FACTOR_HITTER_MIN`: 변경 시 라인 + computeCompositeDuel.ts callsite 추가
  - `PARK_FACTOR_PITCHER_MAX`: 동일 (PARK_FACTOR_HITTER_MIN JSDoc 공유)
- wave-514 테스트 추가 (`wave-514-h2h-park-jsdoc-callsite-sync.test.ts`) — 12 PASS
- v0.5.61.10

---

## v0.5.61.9 — 2026-07-20 (cycle 1876, wave-509: 6-constant JSDoc computeCompositeDuel.ts callsite sync)

### fix(context): wave-509 — LINEUP_WOBA_DUEL_MIN/SFR_DUEL_MIN/BULLPEN_FIP_DIFF_MIN/SP_FIP_DUEL_MIN/SP_XFIP_DUEL_MIN/RECENT_FORM_DUEL_MIN JSDoc computeCompositeDuel.ts callsite 누락 수정 (cycle 1876)

- 6개 DUEL 상수 JSDoc "변경 시" 라인에 `computeCompositeDuel.ts` callsite 누락 (silent drift family wave-509)
  - `LINEUP_WOBA_DUEL_MIN`: wave-355/442/501 → wave-355/442/501 + computeCompositeDuel.ts
  - `SFR_DUEL_MIN`: wave-357/446 → wave-357/446 + computeCompositeDuel.ts
  - `BULLPEN_FIP_DIFF_MIN`: wave-359/442/504 → wave-359/442/504 + computeCompositeDuel.ts
  - `SP_FIP_DUEL_MIN`: wave-363/446/499 → wave-363/446/499 + computeCompositeDuel.ts
  - `SP_XFIP_DUEL_MIN`: wave-371 → wave-371 + computeCompositeDuel.ts
  - `RECENT_FORM_DUEL_MIN`: "wave-381 COMPOSITE_DUEL callsite" → computeCompositeDuel.ts (wave-381) 명시
- WAR_DUEL_MIN / ELO_GAP_STRONG 은 기존 정상
- wave-509 테스트 추가 (`wave-509-composite-duel-jsdoc-callsite-sync.test.ts`) — 18 PASS
- v0.5.61.9

---

## v0.5.61.8 — 2026-07-20 (cycle 1872, wave-505: predictions/[date] confToWinProb + TOP_PICK_CONF_MIN 상수 추출)

### fix(context): wave-505 — predictions/[date]/page.tsx confToWinProb 인라인 수식 swap + TOP_PICK_CONF_MIN 추출 (cycle 1872)

- `predictions/[date]/page.tsx` 인라인 수식 → 상수/함수 swap (silent drift family wave 505)
  - `(0.5 + tConf / 2) * 100` → `confToWinProb(tConf) * 100` (tightest 박빙 경기 승률 계산, line ~208)
  - `> 0.1` → `> TOP_PICK_CONF_MIN` (최고 자신감 픽 필터 임계, line ~350)
  - `(0.5 + conf / 2) * 100` → `confToWinProb(conf) * 100` (topPick 승률 계산, line ~356)
- `TOP_PICK_CONF_MIN = 0.1` 신규 상수 (`packages/shared/src/index.ts`) — 예측 페이지 top pick 필터 최소 confidence 단일 source
- wave-505 테스트 추가 (`wave-505-predictions-conftowinprob-swap.test.ts`) — 11 PASS
- v0.5.61.8

---

## v0.5.61.7 — 2026-07-20 (cycle 1871, wave-504: analysis 오늘 AI 예측 불펜FIP 직접 대결 배지)

### feat(analysis): wave-504 — analysis 오늘 AI 예측 카드 불펜FIP 직접 대결 배지 (cycle 1871)

- `analysis/page.tsx` 오늘 AI 예측 카드에 불펜FIP 우위 배지 추가
  - `|homeBullpenFip - awayBullpenFip| >= BULLPEN_FIP_DIFF_MIN(1.0)` 시 우위 팀명 + Δ격차 표시
  - 낮은 FIP = 불펜 우위 — 홈 불펜 우위 = brand-500, 원정 불펜 우위 = orange-500
  - wOBA 타선 배지(wave-501) 직후 위치 — SP FIP(투수)/wOBA(타선)/불펜FIP(불펜) 3-배지 완성
- wave-504 테스트 추가 (`wave-504-analysis-bullpen-fip-duel-badge.test.ts`) — 10 PASS
- v0.5.61.7

---

## v0.5.61.6 — 2026-07-20 (cycle 1868, wave-501: analysis 오늘 AI 예측 wOBA 타선 직접 대결 배지)

### feat(analysis): wave-501 — analysis 오늘 AI 예측 카드 wOBA 타선 직접 대결 배지 (cycle 1868)

- `analysis/page.tsx` 오늘 AI 예측 카드에 wOBA 타선 우위 배지 추가
  - `|homeLineupWoba - awayLineupWoba| >= LINEUP_WOBA_DUEL_MIN(0.020)` 시 우위 팀명 + Δ격차 표시
  - 홈 타선 우위 = brand-500, 원정 타선 우위 = orange-500
  - SP FIP(투수) 배지 직후 위치 — 투수/타선 쌍 완성
- wave-501 테스트 추가 (`wave-501-analysis-woba-duel-badge.test.ts`) — 10 PASS
- v0.5.61.6

---

## v0.5.61.5 — 2026-07-20 (cycle 1867, wave-500: COMMUNITY_DIVERGE_MIN 상수 추출 + MIN_POLL_TOTAL swap)

### fix(context): wave-500 — COMMUNITY_DIVERGE_MIN 상수 추출, MIN_POLL_TOTAL swap (cycle 1867)

- `COMMUNITY_DIVERGE_MIN = 20` 신규 추출 (`packages/shared/src/index.ts`)
  - `· wave-500 community diverge min 상수 swap (cycle 1867): app/page.tsx delta >= 20 → COMMUNITY_DIVERGE_MIN, total < 3 → MIN_POLL_TOTAL. PickButton.tsx showDivergence >= 20 → COMMUNITY_DIVERGE_MIN. 3 file 하드코딩 3건 swap.`
- `app/page.tsx` — `MIN_POLL_TOTAL` + `COMMUNITY_DIVERGE_MIN` import + swap 2건
- `components/picks/PickButton.tsx` — `COMMUNITY_DIVERGE_MIN` import + `showDivergence` swap
- wave-500 테스트 추가 (`wave-500-community-diverge-min-constant-swap.test.ts`) — 11 PASS
- v0.5.61.5

---

## v0.5.61.4 — 2026-07-20 (cycle 1866, wave-499: analysis 오늘 AI 예측 SP FIP 직접 대결 배지)

### feat(analysis): wave-499 — analysis 오늘 AI 예측 카드 SP FIP 직접 대결 배지 (cycle 1866)

- `analysis/page.tsx` 오늘 AI 예측 카드 게임타임 행에 SP FIP 우위 팀 배지 추가
  - `· wave-499 analysis SP FIP 직접 대결 배지 (cycle 1866): analysis/page.tsx — |homeSPFip - awaySPFip| >= SP_FIP_DUEL_MIN(0.5) 시 우위 팀명 + Δ격차 표시. 홈 우위 = brand-500, 원정 우위 = orange-500. wave-347 gameTypeTag (투수전/타격전) 이후 위치 — 투수전/SP우위 상호보완 정보.`
- wave-499 테스트 추가 (`wave-499-analysis-sp-fip-duel-badge.test.ts`) — 9 PASS
- v0.5.61.4

---

## v0.5.61.3 — 2026-07-20 (cycle 1865, wave-498: ACCURACY_GREAT_PCT 상수 추출 — getAccuracyColor 65 swap)

### fix(context): wave-498 — ACCURACY_GREAT_PCT 상수 추출, getAccuracyColor `65` 인라인 swap (cycle 1865)

- `ACCURACY_GREAT_PCT = 65` 신규 추출 (`packages/shared/src/index.ts`)
  - `· wave-498 getAccuracyColor 65 상수 swap (cycle 1865): shared/src/index.ts — getAccuracyColor \`pct >= 65\` → \`pct >= ACCURACY_GREAT_PCT\` + \`pct >= 55\` → \`pct >= ACCURACY_OK_PCT\` 참조. ACCURACY_GREAT_PCT=65 신규 JSDoc 박제.`
- `getAccuracyColor` JSDoc 추가 + 상수 참조 (`packages/shared/src/index.ts`)
- wave-498 테스트 추가 (`wave-498-accuracy-great-pct-constant-swap.test.ts`) — 7 PASS
- v0.5.61.3

---

## v0.5.61.2 — 2026-07-20 (cycle 1854, wave-490: countFavoringFactors JSDoc wave-489 bullet 추가)

### fix(context): wave-490 — countFavoringFactors JSDoc wave-489 bullet 추가 (cycle 1854)

- `countFavoringFactors` JSDoc wave-489 bullet 추가 (`apps/moneyball/src/lib/predictions/factorLabels.ts`)
  - `· wave-489 PredictionCard N:M 색상 정합 (cycle 1853): PredictionCard.tsx — text-gray-300 dark:text-gray-600 → text-gray-400 dark:text-gray-500 (WCAG 대비 개선) + title tooltip 추가 ("예측팀 우세 팩터 N개 · 상대팀 우세 팩터 M개").`
- wave-490 테스트 추가 (`wave-490-prediction-card-nm-color-tooltip-jsdoc.test.ts`)
- v0.5.61.2

---

## v0.5.61.1 — 2026-07-20 (cycle 1850, wave-487: COMPOSITE_DUEL_MIN_VALID JSDoc wave-482/484 bullet 추가)

### fix(context): wave-487 — COMPOSITE_DUEL_MIN_VALID JSDoc wave-482/484 bullet description line 추가 (cycle 1850)

- `COMPOSITE_DUEL_MIN_VALID` JSDoc wave-482/484 bullet 추가 (`packages/shared/src/index.ts`)
  - `· wave-482 analysis/page.tsx 비수렴 LIST 배지 (cycle 1845): analysis/page.tsx — duel.validCount ≥ 본 값 시 factorFavoredCount/factorAgainstCount/convergenceNetScore 박제 (wave-478 game/[id] LIST 대칭).`
  - `· wave-484 analysis/page.tsx 이번 주 남은 경기 비수렴 레이블 (cycle 1847): analysis/page.tsx — duel.validCount ≥ 본 값 시 factorFavoredSlugs 박제 — 비수렴 단축 레이블 gate (wave-480 game/[id] 레이블 대칭).`
  - wave-480/482/484 3-way analysis/page.tsx gate 문서화 완성
- wave-487 테스트 추가 (`wave-487-composite-duel-min-valid-jsdoc.test.ts`)
- v0.5.61.1

---

## v0.5.61 — 2026-07-20 (cycle 1849, wave-486: matchup/[teamA]/[teamB] 팩터 N:M 종합 배지 표시)

### feat(analysis): wave-486 — matchup/[teamA]/[teamB] 팩터 N:M 종합 배지 표시 (cycle 1849)

- `MatchupFactorCompare`: 5팩터 비교 후 우세 팀 + N:M ratio + FACTOR_LABELS_SHORT 인라인 표시
  - wave-480 DETAIL / wave-482 LIST 패턴을 matchup 페이지에 적용
  - `aWinSlugs/bWinSlugs` 집계 → 우세 팀 이름 · 팩터 균형 배지 · 단축 레이블 (gray)
- `FACTOR_LABELS_SHORT` JSDoc wave-486 bullet 추가 (`apps/moneyball/src/lib/predictions/factorLabels.ts`)
- wave-486 테스트 12개 추가 (`wave-486-matchup-factor-duel-badge.test.ts`)
- v0.5.61

---

## v0.5.60.1 — 2026-07-20 (cycle 1848, wave-485: FACTOR_LABELS_SHORT JSDoc wave-484 bullet 추가)

### fix(context): wave-485 — FACTOR_LABELS_SHORT JSDoc wave-484 bullet description line 추가 (cycle 1848)

- `FACTOR_LABELS_SHORT` JSDoc wave-484 bullet 추가 (`apps/moneyball/src/lib/predictions/factorLabels.ts`)
  - `· wave-484 analysis/page.tsx 이번 주 남은 경기 비수렴 LIST 배지 팩터 레이블 표시 (cycle 1847): analysis/page.tsx — !isPickGame: factorFavoredSlugs.slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT) → FACTOR_LABELS_SHORT 매핑 인라인 표시 (wave-480 DETAIL/wave-482 LIST TODAY 3-way 대칭 완성).`
  - wave-480/482/484 3-way 대칭 문서화 완성 (FACTOR_LABELS_SHORT JSDoc에 3개 bullet 전부 박제)
- wave-485 테스트 6개 추가 (`wave-485-factor-labels-short-jsdoc-wave484-bullet.test.ts`)
- v0.5.60.1

---

## v0.5.60 — 2026-07-20 (wave-484: analysis LIST 이번 주 남은 경기 비수렴 N:M 배지 팩터 레이블 표시)

### feat(analysis): wave-484 — 이번 주 남은 경기 비수렴 N:M 배지 우세 팩터 단축 레이블 표시 (cycle 1847)

- `UpcomingScheduledGame.factorFavoredSlugs: string[] | null` 필드 추가 (`analysis/page.tsx`)
  - `getThisWeekRemainingGames()` 에서 `computeCompositeDuel` 결과 `homeFavoredSlugs/awayFavoredSlugs` 추출 박제
- 이번 주 남은 경기 렌더링 비수렴 단축 레이블 표시 (`wave-475` 섹션 확장)
  - `!isPickGame` 분기: `g.convergenceNetScore < FACTOR_PICK_MIN_FACTORS` 시 비수렴 경기에만 적용
  - `g.factorFavoredSlugs.slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT)` → `FACTOR_LABELS_SHORT` 매핑 인라인 표시
  - 형식: `팩터 N:M (선발·Elo·불펜)` — gray text-[10px] font-sans (wave-482 TODAY 대칭)
- `COMPOSITE_DUEL_FACTOR_LABEL_LIMIT` JSDoc wave-484 bullet 추가 (`packages/shared/src/index.ts`)
- wave-484 테스트 12개 추가 (`wave-484-analysis-list-upcoming-nonconvergent-factor-labels.test.ts`)
- v0.5.60 (wave-480 DETAIL / wave-482 LIST TODAY / wave-484 LIST UPCOMING 3-way 대칭 완성)

---

## v0.5.59.1 — 2026-07-20 (cycle 1846, wave-483: COMPOSITE_DUEL_FACTOR_LABEL_LIMIT JSDoc wave-482 bullet 정정)

### fix(context): wave-483 — COMPOSITE_DUEL_FACTOR_LABEL_LIMIT JSDoc wave-482 bullet description line 정정 (cycle 1846)

- `COMPOSITE_DUEL_FACTOR_LABEL_LIMIT` JSDoc wave-482 bullet 정밀화 (`packages/shared/src/index.ts`)
  - `!isPickGame 분기 — 동일 상수 재사용 (wave-480 DETAIL↔LIST 대칭).` → `analysis/page.tsx — !isPickGame: (pickFavoredHome ? compositeDuelHomeSlugs : compositeDuelAwaySlugs).slice(0, 본 값) → FACTOR_LABELS_SHORT 매핑 인라인 표시 (wave-480 DETAIL 대칭).`
- `FACTOR_LABELS_SHORT` JSDoc wave-482 bullet 추가 (`apps/moneyball/src/lib/predictions/factorLabels.ts`)
  - `· wave-482 analysis/page.tsx 비수렴 LIST 배지 팩터 레이블 표시 (cycle 1845): analysis/page.tsx — !isPickGame: (pickFavoredHome ? compositeDuelHomeSlugs : compositeDuelAwaySlugs).slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT) → FACTOR_LABELS_SHORT 매핑 인라인 표시 (wave-480 DETAIL 대칭).`
  - wave-480 DETAIL↔wave-482 LIST 대칭 문서화 완성 (FACTOR_LABELS_SHORT JSDoc에 DETAIL+LIST 양쪽 bullet 박제)
- wave-483 테스트 5개 추가 (`wave-483-composite-duel-factor-label-limit-jsdoc.test.ts`)
- v0.5.59.1

---

## v0.5.59 — 2026-07-20 (wave-482: analysis LIST 비수렴 N:M 배지 팩터 레이블 표시)

### feat(analysis): wave-482 — 분석 목록 비수렴 게임 팩터 N:M 배지에 우세 팩터 단축 레이블 표시 (cycle 1845)

- `analysis/page.tsx` 비수렴 경기 팩터 N:M 배지에 우세 팩터 단축 레이블 추가 (wave-480 DETAIL→LIST 대칭)
  - `!isPickGame` 분기: 비수렴 경기에만 적용 (수렴 픽 경기는 wave-430 픽 섹션에서 이미 레이블 표시)
  - `pickFavoredHome ? compositeDuelHomeSlugs : compositeDuelAwaySlugs` → `FACTOR_LABELS_SHORT` 매핑 인라인 표시
  - `COMPOSITE_DUEL_FACTOR_LABEL_LIMIT = 3` 적용 (wave-480과 동일 상수 재사용)
  - 형식: `팩터 N:M (선발·타선·Elo)` — gray text-[10px] font-sans
- `COMPOSITE_DUEL_FACTOR_LABEL_LIMIT` JSDoc wave-482 bullet 추가 (`packages/shared/src/index.ts`)
- wave-482 테스트 9개 추가 (`wave-482-analysis-list-nonconvergent-factor-labels.test.ts`)
- v0.5.59

---

# Changelog
## v0.5.58.1 — 2026-07-20 (cycle 1844, wave-481: FACTOR_LABELS_SHORT JSDoc wave-480 bullet 추가)

### fix(context): wave-481 — FACTOR_LABELS_SHORT JSDoc wave-480 bullet description line 정정 (cycle 1844)

- `FACTOR_LABELS_SHORT` JSDoc wave-480 bullet 추가 (`apps/moneyball/src/lib/predictions/factorLabels.ts`)
  - `· wave-480 game/[id] 비수렴 N:M 배지 팩터 레이블 표시 (cycle 1843): analysis/game/[id]/page.tsx — favoredSlugs.slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT) → FACTOR_LABELS_SHORT 매핑 인라인 표시 (wave-430 LIST 수렴 패턴 대칭).`
  - wave-430 LIST 수렴 → wave-480 DETAIL 비수렴 대칭 완성 문서화
- wave-481 테스트 5개 추가 (`wave-481-factor-labels-short-jsdoc.test.ts`)
- v0.5.58.1

---

## v0.5.58.0 — 2026-07-20 (wave-480: game/[id] 비수렴 N:M 배지 팩터 레이블 표시)

### feat(analysis): wave-480 — analysis/game/[id] 비수렴 N:M 배지 우세 팩터 단축 레이블 인라인 표시 (cycle 1843)

- `analysis/game/[id]` 상세 페이지 비수렴 N:M 균형 배지에 우세 팩터 단축 레이블 추가 (wave-430 LIST 수렴 패턴 대칭)
  - wave-478 배지 `{favoredName} 우세 · 팩터 N:M` → `{favoredName} 우세 · 팩터 N:M · (선발·타선·Elo)` 형식
  - `convergenceDuel.homeFavoredSlugs` / `awayFavoredSlugs` → `FACTOR_LABELS_SHORT` 매핑
  - `COMPOSITE_DUEL_FACTOR_LABEL_LIMIT = 3` 최대 슬러그 수 (줄바꿈 방지)
- 신규 상수 `COMPOSITE_DUEL_FACTOR_LABEL_LIMIT = 3` 패키지 공유 (`@moneyball/shared`)
- wave-480 테스트 8개 추가 (`wave-480-composite-duel-factor-label-limit.test.ts`)
- v0.5.58.0

---

## v0.5.57.1 — 2026-07-20 (wave-479: COMPOSITE_DUEL_MIN_VALID JSDoc wave-478 bullet 추가)

### fix(context): wave-479 — COMPOSITE_DUEL_MIN_VALID JSDoc wave-478 bullet description line 정정 (cycle 1841)

- `COMPOSITE_DUEL_MIN_VALID` JSDoc wave-478 bullet 추가
  - `· wave-478 game/[id] 비수렴 경기 팩터 N:M 균형 배지 (cycle 1840): analysis/game/[id]/page.tsx — !isConvergencePick 경기에서 validCount ≥ 본 값 시 N:M 균형 배지 표시 (wave-473 LIST 대칭).`
  - wave-473(LIST) → wave-478(DETAIL) 대칭 완성 문서화
- wave-479 테스트 5개 추가 (`wave-479-composite-duel-min-valid-jsdoc.test.ts`)
- v0.5.57.1

---

## v0.5.57.0 — 2026-07-20 (wave-478: game/[id] 비수렴 경기 팩터 N:M 균형 배지)

### feat(analysis): wave-478 — analysis/game/[id] 비수렴 경기에도 팩터 N:M 균형 배지 표시 (cycle 1840)

- `analysis/game/[id]` 상세 페이지에 팩터 수렴 픽 미해당 경기에도 팩터 N:M 균형 배지 추가
  - 조건: `!isConvergencePick && convergenceDuel.validCount >= COMPOSITE_DUEL_MIN_VALID`
  - 표시: `[우세팀 이름] 우세 · 팩터 N:M` (회색 border/bg — wave-473 analysis LIST 스타일 미러)
  - 동점(`netScore === 0`) 시: `균형 · 팩터 N:N` 표시
- wave-473(analysis 목록 비수렴 N:M) → wave-478(game 상세 비수렴 N:M) 대칭 완성

---

## v0.5.56.1 — 2026-07-20 (wave-476: FACTOR_PICK_STRONG JSDoc wave-475 bullet description line 정정)

### fix(context): wave-476 — FACTOR_PICK_STRONG JSDoc wave-475 bullet description line 정정 (cycle 1838)

- `FACTOR_PICK_STRONG` JSDoc wave-475 bullet 정밀화
  - 구 표현 `|convergenceNetScore| ≥ 본 값 시 text-brand-500.` → `(isComplete=false 전제)` 추가
  - brand 색상은 FACTOR_PICK_COMPLETE 미만일 때만 적용 (amber 우선) — 전제 조건 명시
  - description line `(isComplete=false 전제)` 와 bullet 일관성 확보
- wave-476 테스트 4개 추가 (`wave-476-factor-pick-strong-jsdoc.test.ts`)

---

## v0.5.56.0 — 2026-07-20 (wave-475: 예정 경기 팩터 N:M 균형 표시)

### feat(analysis): wave-475 — 이번 주 남은 예정 경기에 팩터 N:M 균형 표시 (cycle 1837)

- `UpcomingScheduledGame` 인터페이스에 `factorFavoredCount`, `factorAgainstCount`, `convergenceNetScore` 추가
- `getThisWeekRemainingGames` 에서 factor 컬럼 쿼리 (home_sp_fip/away_sp_fip/home_sp_xfip 등 8개) 추가
- `computeCompositeDuel` 통해 game_id별 팩터 N:M 계산 — `validCount >= COMPOSITE_DUEL_MIN_VALID(4)` gate
- 예정 경기 카드 UI: `팩터 N:M` 표시, 오늘 경기와 동일 3-tier 색상 적용
  - amber (골드): `|convergenceNetScore| >= FACTOR_PICK_COMPLETE(10)`
  - brand (파랑): `|convergenceNetScore| >= FACTOR_PICK_STRONG(8)`
  - gray: 데이터 있으나 낮은 수렴
- `packages/shared/src/index.ts` JSDoc 3개 상수 wave-475 bullet 추가 (COMPOSITE_DUEL_MIN_VALID / FACTOR_PICK_STRONG / FACTOR_PICK_COMPLETE)
- wave-475 테스트 8개 추가 (`wave-475-upcoming-games-factor-nm.test.ts`)

---



## v0.5.55.1 — 2026-07-18 (wave-474: FACTOR_PICK_MIN_FACTORS JSDoc wave-473 bullet description line 정정)

### fix(context): FACTOR_PICK_MIN_FACTORS JSDoc wave-473 bullet description line 정정 (cycle 1836)

- `FACTOR_PICK_MIN_FACTORS` JSDoc wave-473 bullet 정밀화
  - 구 표현 `"이 임계 미달 경기에도 factorFavoredCount/factorAgainstCount 산출 후 gray 색상으로"` → 두 경로 명시
  - 실제 조건 `factorFavoredCount != null` = homeWins/awayWins non-null 전체 경기 표시 (수렴+비수렴)
  - 수렴(isPickGame) colored·bold / 비수렴 gray 양 경로 명시
  - favored-first 포맷 명시
  - callsite 동시 조정 안내 추가: `변경 시 analysis/page.tsx wave-415·473 factorHasData callsite 동시 조정`
- wave-415 테스트 wave-473 rename 반영: `pickFavoredCount/pickAgainstCount` → `factorFavoredCount/factorAgainstCount`
- wave-474 테스트 6개 추가 (`wave-474-factor-nm-balance-jsdoc.test.ts`)

---

## v0.5.54.5 — 2026-07-18 (wave-472: TOPFACTOR_IMPACT_MIN_DISPLAY JSDoc description line 정정)

### fix(context): TOPFACTOR_IMPACT_MIN_DISPLAY JSDoc description line 정정 (cycle 1834)

- `TOPFACTOR_IMPACT_MIN_DISPLAY` JSDoc description line 정밀화
  - `"impact %p 수치 표시 최소 임계"` → `"수치 노출 임계"` (모호한 "%p" 표현 제거, 중복 "최소" 제거)
  - `"(5pp) 시 '+n' 수치 노출"` → `"(impactPp=Math.round(impact*100) ≥ 5) 시 '+{impactPp}' 표시"` (계산식 + 실제 출력 포맷 명시)
  - callsite 동시 조정 안내 추가: `변경 시 analysis/page.tsx wave-471 impact 수치 callsite 동시 조정`
- wave-472 테스트 5개 추가 (`wave-472-topfactor-impact-min-jsdoc.test.ts`)

---

## v0.5.54.4 — 2026-07-18 (wave-471: 분석 목록 메인 게임 카드 topFactors 배지 impact %p 수치 표시)

### feat(analysis): topFactors 배지 impact %p 수치 표시 (cycle 1833)

- `TOPFACTOR_IMPACT_MIN_DISPLAY = 0.05` 상수 추가 (`packages/shared`)
- topFactors 배지에 impact %p 수치 노출: `선발FIP: 한화 +12↑` (impact ≥ 5pp 시)
- `impactPp = Math.round(f.impact * 100)` — color tier 에 quantitative 수치 추가
- wave-471 테스트 11개 추가 (`wave-471-topfactor-impact-display.test.ts`)

---

## v0.5.54.3 — 2026-07-18 (wave-469: 분석 목록 메인 게임 카드 topFactors 배지 3-tier 색상)

### feat(analysis): topFactors 배지 3-tier 색상 시스템 (cycle 1831)

- `TOPFACTOR_STRONG_IMPACT = 0.18` / `TOPFACTOR_COMPLETE_IMPACT = 0.30` 상수 추가 (`packages/shared`)
- `TodayGameCard.topFactors` 타입에 `impact: number` 필드 박제
- amber tier: `impact >= 0.30` → `text-amber-700 dark:text-amber-300`
- brand tier: `impact >= 0.18` → `text-brand-600 dark:text-brand-400`
- gray tier: default (기존 스타일 유지)
- wave-469 테스트 10개 추가 (`wave-469-topfactor-badge-tier.test.ts`)

---

## op-analysis — 2026-07-18 (cycle 1830, W30 시즌 재개 첫 주 완결)

### 주간 예측 성과 분석 (7/14~7/18)

#### 이번 주 성과 (KBO 재개 첫 주, 7/16~7/17 결과 확정)
- **이번 주 (7/13 주, 9경기)**: 2/9 = **22.2%** ⚠️ — 올스타 브레이크 복귀 첫 주 전체 저조
- **직전 주 (7/6 주, 올스타 직전)**: 7/13 = **53.8%**
- **6월~7월 누적 (154경기)**: 90/154 = **58.4%** — v1.8 baseline 59.9%와 근사 (안정)

#### 올스타 Cold Start 패턴 연장 확인
| 시점 | n | acc | 비고 |
|---|---|---|---|
| 올스타 전 5주 누적 | 145 | 59.4% | baseline |
| 올스타 직후 첫 날 (7/16) | 5 | 40.0% | cycle 1779 박제 |
| 올스타 직후 첫 주 전체 (7/16~7/17) | **9** | **22.2%** | **← 이번 주 신규 측정** |
- cycle 1779: "첫 날 40%, 2-3경기 후 회복 예상" → 실제로는 첫 주 전체 22%로 더 깊음
- Cold Start 기간: 단일 경기가 아니라 **최소 9경기(첫 주 전체)** 지속됨을 확인

#### 이번 주 오예측 패턴
| 예측 | 실제 | 반복 |
|---|---|---|
| HH(한화) 승 | WO(키움) 승 | 2/2 반복 |
| LG 승 | KT 승 | 2/2 반복 |
| NC 승 | OB 승 | 1회 |
| KIA 승 | SSG 승 | 1회 |
- HH vs WO: 모델이 한화를 2연속 과대평가 (브레이크 후 키움 상승세 미반영)
- LG vs KT: 동일. KT의 복귀 후 에이스 선발 순서 리셋 미반영

#### 운영 상태 (pipeline 14일 all-green)
- pipeline_runs: 모두 success, errors=0 (7/4~7/18)
- CREDIT_EXHAUSTED: 6th recurrence 지속 (~6/6~). conf mean=0.271, median=0.300
- 고확신 예측(conf>=0.65): 0/100 (CE fallback으로 제로)
- 가중치 변경: 없음 (v1.8 유지 확정)

#### 가중치 조정 판단
- **변경 없음** — Cold Start 구간은 소표본 노이즈. 7/18+ 추가 데이터 누적 후 재측정
- CREDIT_EXHAUSTED 6th recurrence → Anthropic 크레딧 충전 시 debate 복구 요청

---

## extract-pattern — 2026-07-18 (cycle 1830, anti_pattern + data_pipeline)

### Pattern 1: 올스타 Cold Start 기간 연장 (anti_pattern) — cycle 1779 갱신
- **Problem**: 올스타 복귀 첫 날 40% 기록 → cycle 1779에서 "2-3경기 후 회복" 예상했으나, 실제 첫 주 전체(9경기)가 22%로 더 깊고 길었음
- **Solution**: Cold Start 범위를 "첫 날"이 아닌 **"첫 주 전체(최소 9경기)"**로 정정. UI에 올스타 복귀 첫 주 예측에 "조정 구간" 배지/경고 표시 권고
- **Results**: n=9이라 통계적 확정은 불가. 7/18~7/25 추가 9경기 결과로 패턴 재검증 필요
- **Reusable**: KBO 올스타(7일 휴식) 후 최소 1주 예측 신뢰도 조정 기간. MLB All-Star Break / 한국프로야구 시즌 간격 동일 적용

### Pattern 2: 반복 오예측 팀 쌍 — 브레이크 후 선발 순서 리셋 미반영 (anti_pattern)
- **Problem**: HH vs WO 2연속, LG vs KT 2연속 오예측 → 같은 팀 쌍에서 같은 방향 실수 반복
- **Root cause**: 브레이크 후 에이스 선발 순서 리셋. 최근폼(10%) 가중치가 브레이크 전 6일치 데이터 기반 → 복귀 직후 선발 정보 불일치
- **Solution (carry-over)**: 올스타 복귀 첫 시리즈 경기에서 선발 FIP/xFIP 가중치 임시 상향(15%→20%), recent_form 임시 하향(10%→5%) 고려. 미구현 — 다음 올스타 이전 구현 목표
- **Reusable**: 시즌 중 장기 휴식 있는 스포츠 리그 예측 모델 공통 패턴

### Pattern 3: 파이프라인 멱등성 다중 실행 — preds=0 은 오류 아님 (data_pipeline)
- **Problem**: predict 모드가 하루 10+ 회 실행, 대부분 preds=0 / games=5 → 대시보드에서 "에러처럼" 보임
- **Solution**: upsert 로직이 기존 예측 skip → preds=0 = "이미 존재, skip" (정상). 로깅 개선 권고: `preds_new=0 preds_existing=5` 형태로 구분
- **Results**: pipeline_runs 14일 all-green. 실제 오류 없음
- **Reusable**: idempotent ML prediction pipeline — "생성 건수=0" 과 "오류로 생성 불가" 를 구분하는 로깅 패턴

---

## v0.5.54.2 — 2026-07-18 (cycle 1812)

### feat(analysis): wave-452 — 팩터 수렴 픽 배지 게임 상세 페이지 표시

- `/analysis/game/[id]` 에 팩터 수렴 픽 배지 추가
- `|netScore| >= FACTOR_PICK_MIN_FACTORS(7)` 인 경기: GameOverview 아래 배지 표시
- 가중 우위 70%+ (CONVERGENCE_BADGE_WEIGHT_STRONG_PCT) → brand 색상, 완전수렴(10팩터) → amber 색상
- `CONVERGENCE_BADGE_WEIGHT_STRONG_PCT = 70` 신규 상수 (packages/shared)
- `computeCompositeDuel` game/[id]/page.tsx 에 첫 통합
- wave-452 JSDoc 동기화 테스트 7건 추가 (299/299 PASS)

## op-analysis — 2026-07-17 (cycle 1779, W30 팀별 정확도 분석)

### 예측 캘리브레이션 현황 (n=192 갱신)

#### 모델 성능 요약 (v1.8, 2026-05~07)
| 지표 | 측정값 | 기준선 (cycle 1460) |
|---|---|---|
| 전체 정확도 | **59.4%** (114/192) | 60.9% (baseline) |
| Brier score | **0.2438** | 0.2443 |
| 최근 30경기 | **53.3%** (16/30) | — |
| 고확신 (conf>0.3) | **64.2%** (34/53) | — |
| CE fallback | **60.0%** (15/25) | — |

#### 월별 정확도 트렌드
- 2026-05: 24/42 = **57.1%**
- 2026-06: 69/110 = **62.7%** ← peak
- 2026-07 (to date): 21/40 = **52.5%** ← 올스타 브레이크 + CE 복합 하락

#### 팀별 예측 정확도 (v1.8 pre_game, n≥5 팀만)
| 팀 | 정확도 | n |
|---|---|---|
| 삼성 | **71%** | 28 |
| LG | **70%** | 23 |
| KIA | 61% | 31 |
| 두산 | 59% | 27 |
| 롯데 | 59% | 17 |
| 한화 | 55% | 11 |
| KT | 53% | 15 |
| NC | 52% | 21 |
| 키움 | 50% | 10 |
| SSG | **33%** | 9 |

#### 핵심 발견
- **SSG 예측 저조 (33%, n=9)**: 모델이 SSG 승리를 지속적으로 과소/과대 예측. SSG의 Elo 변동성 또는 최근폼 데이터 불일치 가능성
- **삼성/LG 우수 (71/70%)**: 구장 특성(대구 극단 타자 친화 108, 잠실 투수 친화 95) + Elo 안정성 조합
- **고확신 신호 유효**: conf>0.3 구간에서 64.2% — CE 해소 시 debate 복구로 회복 기대
- **Brier 0.2438**: 기준선 0.2443 대비 -0.0005 (미세 개선, 실질적 동일)

#### 가중치 조정 판단
- **변경 없음** — v1.8 유지 확정 (n=192 OOS 재확인). Brier 0.2438 안정적
- SSG 저조(33%) = n=9 소표본, 통계적 유의성 미달 (N=50+ 도달 시 재분석)
- CREDIT_EXHAUSTED 6th recurrence 지속 → 크레딧 충전 시 debate 복구 → conf 정상화

---

## extract-pattern — 2026-07-17 (cycle 1779, quality_guard + anti_pattern)

### Pattern 1: 팀별 예측 편향 주기 감사 (quality_guard)
- **Problem**: 집계 정확도(59.4%)는 팀별 편향을 숨김. SSG 33% vs 삼성 71% = 38pp 격차가 aggregate 뒤에 숨어있음
- **Solution**: n≥5 팀별 정확도 주기 감사 (25 cycle 간격). 평균 대비 -15pp 이상 이탈 팀 모니터링 플래그
- **Results**: SSG (n=9, 33%) 플래그 — n=50 미달이라 행동 불필요하나 지속 추적 시작
- **Reusable**: 엔티티별 예측 시스템 전반 — 집계 지표만으로 충분하지 않음. 팀/지역/카테고리 세분화 감사 필요

### Pattern 2: 올스타/시즌 브레이크 후 Cold Start (anti_pattern)
- **Problem**: KBO 올스타 브레이크(6일 휴식) 후 첫 날 예측 40% — 5주 평균(59.4%) 대비 -19pp 급락
- **Solution (not yet implemented)**: 브레이크 종료 직후 1-2경기는 recent_form 가중치 다운스케일 또는 "cold start 플래그" 표시. 현재 recent_form(10%)이 브레이크 전 데이터 기반 → 신뢰도 저하
- **Results**: 브레이크 후 2-3경기 이후 회복 예상 (이전 패턴 동일)
- **Reusable**: 시즌 브레이크 있는 스포츠 리그 예측 모델 — "cold start" 구간 명시 + UI 경고 배지 고려

---

## op-analysis — 2026-07-17 (cycle 1753, W30 시즌 재개 직후)

### 주간 예측 성과 분석 (7/13~7/17)

#### 이번 주 성과
- **이번 주 (7/16, 시즌 재개 첫 날)**: 2/5 = **40.0%** — 올스타 복귀 직후 첫 날 저조
- **지난 주 (7/7~7/9, 올스타 직전)**: 7/13 = **53.8%**
- **5주 누적 (6/16~7/17)**: 61/102 = **59.8%** — v1.8 baseline 59.9%와 정합 (안정)

#### 핵심 패턴 발견 — LLM 단일 판단 vs 순수 가중치
| 구분 | n | acc |
|---|---|---|
| `llm=null` (순수 가중치) | 89 | **60.7%** |
| `llm=claude + debate=null` (LLM 단일 판단) | 13 | 53.8% |
| `debate≠null` (LLM debate) | 1 | 0.0% (n=1, 무의미) |

- **발견**: LLM debate 없이 단일 판단 개입 시 순수 가중치 대비 -6.9pp 하락
- **해석**: CREDIT_EXHAUSTED로 debate 불가 → LLM이 단일 판단으로 가중치 보정 시도 → 오히려 노이즈
- **결론**: CE 상태에서 LLM 개입보다 순수 가중치(conf=0.3 flat)가 더 안정적 (anti_pattern 박제)

#### 올스타 복귀 효과 (anti_pattern)
- 시즌 재개 첫 날(7/16): 40% — 6일 휴식 후 팀 상태 불확실성 증가
- 최근폼 10% 가중치가 휴식 전 데이터 기반 → 복귀 직후 신뢰도 저하
- 1~2일 경기 후 폼 데이터 갱신 시 회복 예상

#### 가중치 조정 판단
- **변경 없음** — v1.8 유지 확정 (cycle 1460 n=178 OOS 재입증). 59.8% 5주 누적 = 정상 범위
- CREDIT_EXHAUSTED 6th recurrence 지속 → Anthropic 크레딧 충전 시 debate 복구 → 비CE 66.7% 기준선 회복 예상

#### 운영 상태
- scoring_rule: 100% v1.8 (102/102)
- CREDIT_EXHAUSTED: 지속 (~6/6 이후). debate_version=null 비율 99%
- pipeline_runs: 정상 운영 (올스타 기간 포함)

---

## v0.5.54.1 — 2026-07-17 (cycle 1749)

### wave-404 info-architecture-review: /reviews 헤더 KBO_NAV 리뷰·시즌 그룹
- **IA fix** — 2-chain alternation lock (review-code↔explore-idea 8사이클) 탈출 + trigger 7 발화
- `/reviews` 섹션 (예측 리뷰·빗나간 예측·시즌 기록): Footer "리뷰·시즌"에만 존재, 헤더 KBO_NAV 완전 부재
- `Header.tsx` KBO_NAV: 3그룹→4그룹 (예측·기록 / 팀·선수 / **리뷰·시즌** / 커뮤니티)
- 리뷰·시즌: `/reviews`(예측 리뷰) + `/reviews/misses`(빗나간 예측) + `/seasons`(시즌 기록) 3 items
- MobileNav = `LEAGUE_NAVS` 참조 자동 반영
- `LeagueSelector.test.tsx`: top-level 4→5 업데이트
- 281 test files / 2446 tests PASS. TypeScript clean.

---

## v0.5.54.0 — 2026-07-17 (cycle 1748)

### wave-403 review-code: reviews/misses 편향 지목 팩터 glossary Link
- **silent drift fix** — `reviews/misses/page.tsx` 편향 지목 팩터 레이블 `<strong>` → glossary Link (wave-400 FactorBreakdown + wave-401 FactorAgreementCard 동일 패턴 미적용)
- `FACTOR_GLOSSARY_ANCHORS` import 추가, anchor 존재 시 `<Link href="/glossary#anchor">` 렌더
- 알 수 없는 factor (legacy/shadow) → `<strong>` fallback 유지
- **wave-403-misses-factor-glossary-link.test.ts**: 5 tests 박제
- 281 test files / 2446 tests PASS. TypeScript clean.

---

## v0.5.53.0 — 2026-07-17 (cycle 1747)

### wave-402 explore-idea: 팩터 수렴 픽 상대 강점 팩터 칩
- **unfavoredChips** — 팩터 수렴 픽 섹션에 상대 팀이 이기는 팩터 칩 표시 (`analysis/page.tsx`)
- **방향 로직**: favoredHome=true → unfavoredSlugs=compositeDuelAwaySlugs, false → compositeDuelHomeSlugs
- **glossary 링크**: 상대 칩도 FACTOR_GLOSSARY_ANCHORS 포함 (wave-400 favored 패턴 정합)
- **스타일 대비**: 우세 팩터 brand-100(green), 상대 강점 gray-100(gray) — 즉각적 시각 구분
- **표시 조건**: unfavoredChips.length > 0 (10:0 완전수렴 시 미표시)
- **wave-402-unfavored-chips.test.ts**: 8 tests 박제
- 280 test files / 2441 tests PASS. TypeScript clean.

---

## op-analysis — 2026-07-16 (cycle 1690, W29 시즌 재개 첫 날)

### W29 현황 분석 (올스타 브레이크 종료)
- **시즌 재개**: 7/16 KBO 5경기 (올스타 브레이크 7/10-15 종료). 오늘부터 새 데이터 누적 시작
- **누적 v1.8**: n=187 (올스타 브레이크 동안 frozen), acc=59.9%, Brier=0.2488 — 브레이크 기간 변동 없음
- **CREDIT_EXHAUSTED**: 6th recurrence 지속 (~6/6 이후). debate=None, conf=0.3 flat → CE 구간 예측 정확도 ~56%
- **비CE 성능 기준선**: 66.7% (누적) / 62.5% (W28 비CE) — 크레딧 충전 시 회복 예상 기준
- **Form weight 주의**: 최근폼 10% 가중치가 6일 브레이크 후 첫 주 예측에 사전 freeze 상태. 휴식 후 팀 상태 불확실성 ↑
- **가중치 변경**: 없음 (v1.8 유지 확정 — cycle 1460). W29 결과 축적 후 재측정 예정
- **Feature-Drift Cycle lock**: review-code ↔ explore-idea 8 consecutive → 2-chain lock 탐지, 본 cycle op-analysis로 자연 해제

---

## v0.5.51.8 — 2026-07-14 (cycle 1650)

### wave-319 explore-idea: 팀 전력 Elo 변화 추세
- **TEAM_STRENGTH_ELO_DELTA_WINDOW = 5** — 팀 전력 Elo 변화 윈도우 상수 신규 추가 (`@moneyball/shared`)
- **eloChange 산출** — `buildTeamStrengthSnapshot`: 최근 5경기 기준 Elo delta 계산 (현재 Elo − 5경기 전 Elo)
- **EloDeltaTag** — `TeamStrengthGrid` 팀 카드에 ↑N (green) / ↓N (red) / — (flat) 추세 화살표 추가

---

## extract-pattern — 2026-07-14 (cycle 1636)

### 재사용 패턴 3개 추출
1. **Feature-Drift Cycle** (`quality_guard`) — 신규 기능 추가 → 1 cycle 내 constants 추출. 102+ waves 누적 (cycle 458~1636). `docs/lessons/2026-07-14-feature-drift-cycle-pattern.md`
2. **CE-Fallback Visibility** (`ai_agent`) — LLM 크레딧 소진 시 UI 노티스 + `home_win_prob` fallback. 품질 저하 22.5pp 사용자 가시화.
3. **Accuracy Cohort Split** (`data_pipeline`) — A/B 없이 CE/비CE 자연 실험 코호트로 LLM 기여 +5.0pp 정량화.

---

## op-analysis — 2026-07-14 (cycle 1636, 2026-W28 주간 리뷰)

### 2026-W28 (7/7-7/13) 예측 성과 요약
- **이번 주**: 7/13 = 53.8% (2건 미검증, 올스타 브레이크 7/10-15)
- **CE vs LLM**: 7/7 CREDIT_EXHAUSTED 40% vs 7/8-9 LLM active 62.5% (+22.5pp) — 3번째 재확인
- **홈 예측 우위**: hwp>0.5(홈) 5/7=71% vs hwp<0.5(원정) 2/6=33% (소표본, n=13)
- **누적 v1.8**: n=187, acc=59.9%, Brier=0.2488 (올스타 브레이크 신규 데이터 없음)
- **가중치 변경**: 없음 (v1.8 유지 확정 — cycle 1460)
- **시즌 재개**: 7/16 (5경기, 새 matchup 구성)

---

## v0.5.51.7 — 2026-07-14 (cycle 1634)

### wave-305 silent drift family sweep
- **MIN_POLL_TOTAL** — picks/buildCommunityAccuracy.ts (exported) + components/picks/PickButton.tsx (local copy) → 단일 source (`@moneyball/shared`)
- **CALIBRATION_BUCKET_WIDTH/START/COUNT** — lib/accuracy/buildAccuracyData.ts + app/debug/reliability/page.tsx (identical 3-tuple) → 단일 source (`@moneyball/shared`)

2 constant groups → 4 callsites. 1978 tests PASS.

---

## v0.5.51.6 — 2026-07-14 (cycle 1633)

### wave-304 explore-idea: /standings Elo 레이팅 컬럼 추가
- **현재 Elo 컬럼** — /standings 순위표에 AI 모델 현재 팀 전력 Elo 레이팅 컬럼 신규 추가
- **eloTrend 재활용** — 기존 `buildEloTrend()` 마지막 포인트에서 팀별 Elo 추출 (신규 DB 쿼리 0건)
- **시각적 차별화** — ELO_NEUTRAL(1500) 초과 = brand색, 미만 = gray
- **설명 문구** — "Elo 컬럼 = AI 모델 현재 팀 전력 평가 (1500 기준)"
- **explore-idea-wave-304.test.ts** — 5 tests PASS / 총 1970 tests PASS

---

## v0.5.51.5 — 2026-07-14 (cycle 1632)

### wave-303 silent drift family sweep
- **PIPELINE_STALE_HOURS_DEFAULT** — health/pipelines stale_hours 28 (×3) → 단일 source (`packages/shared`)
- **PIPELINE_PREDICT_STALE_HOURS** — health/pipelines predict stale_hours 15 → 단일 source
- **NICKNAME_MIN_CHARS** — leaderboard/sync nickname 최소 길이 2 → 단일 source
- **NICKNAME_MAX_CHARS** — leaderboard/sync nickname 최대 길이 12 → 단일 source
- **DEVICE_ID_MAX_LENGTH** — picks/submit device_id 최대 길이 64 → 단일 source
- **wave-302 test 보완** — `silent-drift-wave-302.test.ts` 누락 backfill (cycle 1630 ship 미포함)

5 constants → 3 callsites. wave-302 test backfill. 1965 tests PASS.

## v0.5.51.4 — 2026-07-14 (cycle 1630)

### wave-302 silent drift family sweep
- **SEARCH_FUSE_LIMIT** — SearchClient Fuse.js 히트 상한 60 → 단일 source (`packages/shared`)
- **INSIGHTS_SERIES_LIMIT** — insights/series 쿼리 한도 60 → 단일 source
- **PREDICTION_CARD_TOP_FACTORS** — PredictionCard 주요 근거 2개 → 단일 source
- **PREDICTION_CARD_LIVE_TOP_FACTORS** — PredictionCardLive AI 힌트 팩터 1개 → 단일 source
- **ANALOG_MATCHUP_LIMIT** — HistoricalAnalogMatchup 유사 대전 3건 → 단일 source
- **RIVALRY_MEMORY_LIMIT** — RivalryMemorySurface 라이벌 메모리 3건 → 단일 source (2 callsite)
- **PICKS_RESULTS_IDS_LIMIT** — picks/results API ID 상한 200 → 단일 source
- **PICKS_POLL_IDS_LIMIT** — picks/poll API ID 상한 50 → 단일 source

---

## v0.5.51.3 — 2026-07-14 (cycle 1629)

### wave-301 WinProbBar
- **PredictionCard 승률 분할 바** — 예측 카드에 홈/원정 승리 확률 시각화 바 추가 (`home_win_prob` DB 컬럼 fallback 포함)
- **CREDIT_EXHAUSTED 대응** — LLM debate 비활성 시 `home_win_prob` (순수 세이버메트릭스 모델 확률) 를 winProb fallback 으로 사용
- **KBO 관례 준수** — 원정(좌) / 홈(우) 방향 정렬, 바 오른쪽 앵커 채움

---

## v0.5.51.2 — 2026-07-14 (cycle 1613)

### 분석 인사이트
- **op-analysis 25-gap lite** — v1.8 n=187→212 (+25, velocity 1.0/cycle 회복, 0.2 flatline 종료). 정확도 59.9% 안정 (cycle 1613)
- **W28 최종 확정** — 13경기 53.8% (CE 7/7: 40% / 비CE 7/8~7/9: 62.5%) + 홈팀 69.2%. cycle 1545 예비 수치 정합 확인
- **CE fallback 패턴 재확인** — debate=None conf=0.3 flat (7/7) 2/5=40% vs 정상 예측 5/8=62.5%. LLM 부가가치 +22.5pp 이번 주 기준
- **W29 재개 (7/14~)** — 올스타 브레이크 종료. 오늘부터 5게임 예정

---

## v0.5.51.1 — 2026-07-13 (cycle 1545)

### 분석 인사이트
- **W28 최종 weekly-review** — 13경기 53.8% (CE 40% / 비CE 62.5%) + 홈팀 69.2% 강세. 올스타 브레이크(07-10~07-13) 확인 (cycle 1545)
- **v1.8 누적 실측** — n=165, 58.8% 전체 / CE 71/126=56.3% / 비CE 26/39=66.7% (DB 직접 쿼리)
- **패턴 추출 3건** — CE 희석 / Elo fallback 홈보정 미작동 / scoring_rule 필터 quality guard (gstack learnings.jsonl 등록)

---

## 📐 재사용 패턴 — 2026-07-13 extract-pattern (cycle 1545)

| # | 카테고리 | 패턴 키 | 핵심 |
|---|---|---|---|
| P1 | anti_pattern | `credit-exhausted-dilutes-accuracy` | CE conf=0.3 예측이 정상 예측 희석 → scoring_rule 분리 집계 필수 |
| P2 | ai_agent | `elo-fallback-home-advantage-neutralized` | CE fallback에서 hwp 밴드 좁아지면 홈 보정 +1.5%가 방향 역전 못 함 |
| P3 | quality_guard | `db-filter-scoring-rule-not-model-version` | debate_version 필터 → CE 누락. PRODUCTION_COHORT_RULES IN 패턴이 안전 |

→ gstack learnings.jsonl 등록 완료 (`~/.gstack/projects/kkyu92-moneyballscore/learnings.jsonl`)

---

## v0.5.51.0 — 2026-07-08 (cycle 1520)

### 데이터·파이프라인
- **WAR 스크래퍼 복구** — fetchTeamStats: /elo/ stub 0 → /leaders/ 타자 WAR 팀별 합산. Promise.all 병렬 수집 (cycle 1519, PR #2601)
- **park_factor 키 정합** — postview-daily buildMinimalContext: homeCode → `games.stadium` 전체명으로 수정. DEFAULT_PARK_FACTORS 키 미스매치 해소 (cycle 1519)
- **패키지 최신화** — next/react/sentry/supabase/wrangler + TS ES2018 (cycle 1518, PR #2600)

### 분석 인사이트 (cycle 1520)

#### W28 (07-07~07-09) 최종 — 올스타 브레이크 (07-10~07-13)

| 지표 | 수치 |
|---|---|
| 완료 경기 | **13경기** (07-07 화 5경기 + 07-08 수 4경기 + 07-09 목 4경기, 연기 2건 제외) |
| 정확도 | **53.8%** (7/13) |
| CREDIT_EXHAUSTED 구간 (07-07) | **40.0%** (2/5) — Elo 단독 flat |
| 비 CE 구간 (07-08~09) | **62.5%** (5/8) — 팩터 부분 복원 |
| 홈팀 실제 승률 | **69.2%** (9/13) — 이번 주 홈 강세 |

경기별 결과:
- 07-07 [CE] ✗ LT 10-2 KIA (예측:KIA, hwp=0.487 — 홈 어드밴티지 미포착)
- 07-07 [CE] ✓ SS 9-2 LG (예측:SS, hwp=0.555)
- 07-07 [CE] ✓ HH 6-9 NC (예측:NC, hwp=0.458)
- 07-07 [CE] ✗ OB 2-4 SSG (예측:OB홈, hwp=0.555 — SSG 원정 역전)
- 07-07 [CE] ✗ KT 3-0 WO (예측:WO, hwp=0.481 — 홈 어드밴티지 미포착)
- 07-08 ✓ LT 11-3 KIA (예측:LT, hwp=0.502)
- 07-08 ✗ SS 2-8 LG (예측:SS홈, hwp=0.558 — LG 원정 대승)
- 07-08 ✓ OB 7-3 SSG (예측:OB, hwp=0.526)
- 07-08 ✓ KT 7-3 WO (예측:KT, hwp=0.524)
- 07-09 ✓ LT 2-5 KIA (예측:KIA, hwp=0.484)
- 07-09 ✓ SS 6-5 LG (예측:SS, hwp=0.591)
- 07-09 ✗ HH 6-4 NC (예측:NC, hwp=0.47 — 홈 어드밴티지 미포착)
- 07-09 ✗ OB 7-0 SSG (예측:SSG, hwp=0.489 — 홈 어드밴티지 미포착)

**핵심 패턴**: 홈 어드밴티지 예측 실패 4건 모두 hwp=0.47~0.49 (원정 예측 → 홈 승리). CREDIT_EXHAUSTED Elo 단독 상태에서 홈 보정 신호 미약.

#### 팩터 정확도 업데이트 (최근 100경기 v1.8)

| 팩터 | 가중치 | n | 적중률 | 비고 |
|---|---|---|---|---|
| 선발 xFIP | 5% | 33 | **66.7%** | 최강 |
| 선발 FIP | 15% | 40 | **62.5%** | 강력 |
| 상대 전적 | 3% | 70 | 58.6% | 양호 |
| 최근 폼 | 10% | 74 | 54.1% | 마진 |
| 불펜 FIP | 10% | 4 | 50.0% | 소표본 |
| 수비 SFR | 5% | 94 | **48.9%** | 반랜덤 ⚠️ |
| WAR | 8% | — | — | fix 배포 후 측정 예정 |
| 구장 보정 | 4% | — | — | fix 배포 후 측정 예정 |
| Elo | 10% | — | — | 팀 간 차이 미미 → 모두 중립범위 |
| 타선 wOBA | 15% | — | — | 팀 간 차이 미미 → 모두 중립범위 |

**발견**: sfr(수비) 48.9% = 랜덤 이하. 가중치 5% 재검토 근거 누적.
**발견**: elo/lineup_woba 팩터값이 모두 0.45~0.55 내 → 정규화 밴드 좁아 분석 불가.

#### 가중치 조정 결정
**변경 없음** — v1.8 유지 확정 (cycle 1460, n=178 기준).
WAR/park_factor fix 후 재측정 필요. sfr 5% 재검토 = n≥50 확보 후 판단.

---

## v0.5.50.0 — 2026-07-08 (cycle 1517)

### 신규 기능
- **팩터별 적중률 섹션** (`/accuracy`) — v1.8 cohort n=178 기준, 10 팩터 각각의 실측 적중률 바 차트 + 기준선(60.9%) 표 (cycle 1516, PR #2599)

### 데이터·파이프라인
- onConflict 드리프트 방어 Scope D: `scripts/` 경로 `DB_CONSTRAINTS` 참조 + root ESLint 차단 (cycle 1515, PR #2598)
- `apps/moneyball` onConflict `DB_CONSTRAINTS` + ESLint 확장 (cycle 1513, PR #2596)
- `DB_CONSTRAINTS` 단일 소스 + onConflict ESLint 방어 (cycle 1512, PR #2595)

### 분석 인사이트 (cycle 1517)
- W27 최종: 26/26 resolved, 57.7% (CHANGELOG 기재 22/54.5% 갱신)
- 팩터 실측: sp_fip/xFIP 65.7% 최강, sfr 50.0% 노이즈 수준 (n=300)
- **⚠️ WAR (8%) + park_factor (4%) = 12% 가중치 사문화 확인** (데이터 결손 — fix-incident carry-over)

---

## 📊 주간 리뷰 — 2026-W28 최종 / 2026-07-13 weekly-review (cycle 1545)

> W28 = 07-07(화)~07-09(목) 3일 경기 + 07-10~07-13 올스타 브레이크

### W28 최종 성과 요약

| 지표 | 수치 |
|---|---|
| 검증 완료 | **13경기** (연기 2건 제외) |
| v1.8 정확도 | **53.8%** (7/13) |
| CREDIT_EXHAUSTED (07-07) | 40.0% (2/5) |
| 비 CE 구간 (07-08~09) | 62.5% (5/8) |
| 홈팀 실제 승률 | 69.2% (9/13) — 평소 +1.5% 가정 대비 이번 주 홈 강세 |
| v1.8 누적 정확도 | **58.8%** (97/165) |
| v1.8 누적 CE 구간 | 56.3% (71/126) |
| v1.8 누적 非CE 구간 | **66.7%** (26/39) |
| 최근 20경기 | 55.0% (11/20) |

### W28 팩터 진단

**CREDIT_EXHAUSTED (07-07, 5경기 전원 conf=0.3)**:
- Elo 단독 fallback → hwp 모두 0.46~0.56 박빙 범위
- 실질적 coin flip — 정보 없는 예측
- 홈 어드밴티지 (+1.5%) 신호가 Elo 밴드에 묻혀 방향 역전 (3/5 홈 예측 실패)

**비 CE 구간 (07-08~09, 8경기)**:
- conf 0.004~0.182로 낮지만 FIP/wOBA/폼 팩터 부분 복원
- 62.5% = CE 대비 +22.5pp → 팩터 다양성이 성능에 직접 기여

**홈 어드밴티지 예측 실패 4건 공통 패턴**:
- hwp 범위: 0.47~0.49 (원정팀 소폭 우위 예측)
- 실제: 모두 홈팀 승리 (LT, KT, HH, OB)
- CREDIT_EXHAUSTED 상태에서 홈 보정 가산치(+1.5%)가 Elo 기반 박빙 예측을 역전시키지 못함

### 가중치 조정 결정
**변경 없음** — v1.8 유지 확정 (cycle 1460, v2.0 결정 완료 2026-07-06).
CREDIT_EXHAUSTED 지속 → 모든 팩터 분석이 Elo fallback 상태 기준 → 정상 환경 복원 후 재측정 필요.
sfr 5% 재검토 = n≥50 확보 후. WAR/park_factor fix = 별도 cycle.

### 이번 주 학습 포인트 (W28 op-analysis lite, cycle 1545)

1. **CE 구간 홈 보정 미작동**: hwp 0.47~0.49 박빙 게임에서 홈 +1.5% 가중이 방향을 결정할 수 있어야 하지만 Elo 단독 fallback 시 tiebreaker 역할 약화. 크레딧 충전 후 재관찰 필요.
2. **비 CE 성능 기준선**: 66.7% (누적) / 62.5% (W28 비CE) — 정상 모델의 실제 성능은 이 범위. 전체 58.8%는 CE 구간(56.3%) 희석값.
3. **올스타 브레이크 후 첫 경기(W29 07-14 월요일)**: 휴식 후 선발 FIP 데이터 신선도 주의. 팀 폼 리셋 효과 가능 → 최근폼(10%) 신뢰도 일시 하락 예상.
4. **v1.8 누적 n=165**: CLAUDE.md 기재 n=178 (cycle 1460 기준)과 차이 (-13). DB 실측값 165 사용. 측정 기준 불일치 carry-over.

---

## 📊 주간 리뷰 — 2026-W28 (07-06~07-12) / 2026-07-08 weekly-review (cycle 1517)

### 이번 주 성과 요약 (진행 중, 7/6~7/7 2일 기준)

| 지표 | 수치 |
|---|---|
| 검증 완료 | 5 경기 (진행 중, 주 종료 후 업데이트 예정) |
| 정확도 | **40.0%** (2/5) — 소표본, 주 초반 |
| CREDIT_EXHAUSTED | 계속 (32일+) → conf=0.3 flat |
| 동적 리뷰 | `/reviews/weekly/2026-W28` (자동 집계) |

### W27 최종 업데이트 (CHANGELOG 기재 22/54.5% → 최종 26/57.7%)

추가 verify 실행으로 7/5(일) 3경기 + 검증 지연분 총 4경기 추가 확인:
- 최종: 26 resolved, **57.7%** (12+/26 → 15/26)
- 6/29 (월): 0/0 (경기 없음) → 6/30 (화): 3/4 (75%) → 7/1 (수): 0/4 (0%) → 7/2 (목): 5/5 (100%) → 7/3 (금): 2/5 (40%) → 7/4 (토): 3/5 (60%) → 7/5 (일): 2/3 (67%)

### 팩터별 적중률 기준선 갱신 (n=300 resolved with factors)

| 팩터 | 가중치 | n | 적중률 | 상태 |
|---|---|---|---|---|
| 선발 FIP | 15% | 102 | **65.7%** | 최강 신호 |
| 선발 xFIP | 5% | 102 | **65.7%** | 최강 신호 |
| 불펜 FIP | 10% | 101 | 60.4% | 양호 |
| 타선 wOBA | 15% | 51 | 58.8% | 양호 |
| 상대 전적 | 3% | 132 | 54.5% | 약한 신호 |
| 최근 폼 | 10% | 161 | 53.4% | 노이즈 수준 |
| 수비 SFR | 5% | 176 | **50.0%** | 랜덤 수준 |
| WAR | 8% | — | — | **⚠️ 데이터 결손** |
| 구장 보정 | 4% | — | — | **⚠️ 키 미스매치** |
| Elo 레이팅 | 10% | 1 | — | 소표본 (팀 간 Elo 차이 미미) |

### ⚠️ Silent Data Bug 발견 — WAR + park_factor 12% 가중치 사문화

**발견 시점**: 2026-07-08, cycle 1517 op-analysis

**WAR (8% 가중치)**:
- `team_season_stats.total_war = 0.0` 전 팀 공통 → `normalize(0, 0, true) = 0.5` 고착
- 원인: WAR 스크래퍼 미구현 또는 KBO Fancy Stats WAR 파싱 실패
- 영향: 8% 가중치가 완전히 중립값으로 소비 → 무기여

**park_factor (4% 가중치)**:
- `games.stadium` = "고척", "사직", "잠실" 등 **단축명**
- `DEFAULT_PARK_FACTORS` 키 = "서울고척스카이돔", "부산사직야구장", "서울종합운동장 야구장" 등 **전체명**
- 매핑 0% → 항상 default 1.0 → `0.5 + (1.0-1)*2 = 0.5` 고착
- 영향: 4% 가중치 완전 소비 → 무기여

**총 영향**: 12%/85% = **약 14% 유효 가중치 사문화**. v1.8 Brier 0.2443은 이 상태 기준 측정값.
두 버그 수정 시 Brier 개선 기대 (추정 미미~+0.5pp — 별도 fix-incident + 측정 필요).

**carry-over**: fix-incident (heavy) — WAR 스크래퍼 + stadium 키 정합 두 작업 묶음.

### 가중치 조정 결정

**변경 없음** — v1.8 유지 (cycle 1460 확정)
- WAR/park_factor 버그는 가중치 조정 대상 아님 (데이터 수집 문제)
- 수정 후 재측정이 올바른 순서 — 버그 fix → Brier delta 측정 → 필요 시 조정

---

## 🔁 재사용 가능 패턴 — 2026-07-08 extract-pattern (cycle 1517)

### P5: DB_CONSTRAINTS 단일 소스 + ESLint 차단 `quality_guard` `data_pipeline`

**Problem**: Supabase upsert `onConflict` 인자를 raw string literal로 작성 → DB migration이 UNIQUE constraint 컬럼을 바꿀 때 사용처 전체를 직접 grep/수정해야 함. 누락 시 silent drift (실패하지 않고 잘못된 키로 upsert → 중복 삽입). mig 030 이후 12개 사이트 중 2개(postview-daily, live)가 5개 사이클(1509~1513) 동안 미정합.

**Solution**:
1. `packages/kbo-data/src/pipeline/db-constraints.ts` — UNIQUE constraint 컬럼을 `DB_CONSTRAINTS` 상수 딕셔너리로 export (단일 소스)
2. `eslint.config.mjs` `no-restricted-syntax` — `Property[key.name='onConflict'][value.type='Literal']` 패턴을 CI error로 차단
3. CI `pnpm lint` step에 추가 → merge 시 raw string 신규 사용 자동 블록

**Results**: 12개 사이트 일괄 동기화. migration 변경 시 db-constraints.ts 1파일만 수정. CI가 raw string 재발을 자동 차단.

**재사용**: Supabase/PostgreSQL + TypeScript 프로젝트 범용. onConflict뿐 아니라 index name, table name 상수화에도 동일 패턴 적용 가능.

---

### P6: 모델 팩터 실측 적중률 집계 `ai_agent`

**Problem**: 예측 모델에 10개 팩터가 있고 각각 가중치가 있지만, 팩터별 실제 예측 기여도를 측정하는 방법이 없음 → 가중치 조정 근거를 Brier score 하나에만 의존. 어떤 팩터가 진짜 신호이고 어떤 게 노이즈인지 모름.

**Solution**:
- `predictions.factors` JSONB 컬럼에 팩터별 [0,1] 정규화값 저장
- `is_correct` + `home_win_prob`의 XOR로 실제 홈팀 승리 여부 도출
- 중립 범위(0.48~0.52) 팩터 제외, 방향성이 있는 경우만 집계
- `buildFactorAccuracy()` → 팩터별 `correct/total` 비율 + UI 진행 바 테이블

**Results** (n=300 resolved, cycle 1517):
- sp_fip / sp_xfip: **65.7%** (최강 신호)
- bullpen_fip: 60.4%, lineup_woba: 58.8% (양호)
- sfr: **50.0%** (랜덤 수준 → 가중치 5% 재검토 근거)
- WAR/park_factor: 데이터 결손으로 집계 불가 (별도 버그)

**재사용**: 모든 수치 예측 모델 (feature attribution) — DB에 factor breakdown 저장하면 추가 코드 없이 사후 분석 가능. `(model_output >= 0.5) === actual_outcome` XOR 패턴 범용.

---

### Anti-P2: 데이터 수집 결손이 모델 가중치를 사문화 `anti_pattern`

**Problem**: WAR (8% 가중치)와 park_factor (4% 가중치) = 12%가 예측에 기여 0.
- WAR: `team_season_stats.total_war = 0.0` 전 팀 공통 → `normalize(0, 0) = 0.5` (중립)
- park_factor: `games.stadium` = "사직" (단축명) vs `DEFAULT_PARK_FACTORS` 키 = "부산사직야구장" (전체명) → 매핑 실패 → default 1.0 → 0.5 (중립)

**Root cause**: 스크래퍼가 데이터를 수집하지 못해도 파이프라인은 정상 완료 (default fallback 사용). 예측도 정상 생성. 아무런 경고 없음.

**Fix 방향**: (1) DB 조회 후 `totalWar=0` 전 팀 → Sentry warning (2) stadium 키 정합 로직 추가 (단축명 → 전체명 매핑 또는 DB 컬럼 정규화)

**재사용**: 외부 데이터소스를 DB에 캐싱하는 모든 파이프라인. "fallback이 항상 neutral값이면 가중치가 사문화된다"는 패턴 — sparse prediction alert (`countNeutralFactors >= threshold`) 이미 구현됨, WAR/park_factor를 이 임계에 포함해야 함.

---

## 🔁 재사용 가능 패턴 — 2026-07-07 extract-pattern (cycle 1499)

### P1: LLM Provider CREDIT_EXHAUSTED 자동 failover `ai_agent`

**Problem**: Anthropic API credit 소진 → 예측이 conf=0.3 flat 으로 silently degraded. 22일 감지 지연 (2026-06-06~06-28).

**Solution**: `LLM_BACKEND_FALLBACK=deepseek|ollama` env 설정 + `callLLM()` 안 CREDIT_EXHAUSTED 체크 후 secondary backend 자동 재시도 + Sentry warning 캡처.

**Results**: 운영자 개입 없이 자동 복구. Sentry warning alert 즉각 발화.

**재사용**: Anthropic API 사용하는 모든 LLM 파이프라인. env 2개 설정만으로 활성화.

---

### P2: LLM 백엔드 관측성 레이어 (DB 컬럼 + 이벤트 테이블) `ai_agent`

**Problem**: primary vs fallback LLM 품질 차이 측정 불가. Brier drift 원인 진단 불가.

**Solution**: `predictions.llm_backend VARCHAR(16)` + `llm_fallback_events` 이벤트 테이블 (ts, model, fallback_to, pipeline_run_id FK).

**Results**: pre/post-CE Brier 코호트 분리 (Fable S2c — 0.24/0.24 안정). winner-centric Brier drift = 측정 오류 확인.

**재사용**: 멀티 백엔드 LLM 파이프라인 모두. 컬럼 1개 + 이벤트 테이블 1개로 완전 관측성.

---

### P3: LLM 다운그레이드 구간 UI — 팩터 배지 폴백 `content_auto`

**Problem**: CE 구간 conf=0.3 flat → 분석 UI 에 근거 없음 → 사용자 가치 0.

**Solution**: `factors` 컬럼에서 `|score - 0.5|` 기준 상위 2개 팩터를 UI 배지로 렌더링 (debate 없어도 항상 표시).

**Results**: LLM 다운타임 중 정량 분석 근거 유지. UX graceful degradation.

**재사용**: confidence score 기반 예측 UI. LLM outage 구간 폴백 패턴.

---

### Anti-P1: conf=0.3 flat 무음 감지 지연 `anti_pattern`

**Problem**: CREDIT_EXHAUSTED → conf=0.3 + agentError 텍스트만 → 알림 없음 → 22일 미감지.

**Root cause**: 파이프라인 외형 정상 (예측 생성 + 검증 진행) → alert 미발화. "degraded but working" = 가장 감지 어려운 패턴.

**Fix**: conf histogram 이상치 (`conf=0.3 비율 > 80% in 7일`) Sentry alert 추가 권장.

---

## 📊 주간 리뷰 — 2026-W27 (06-29~07-05) / 2026-07-07 weekly-review

### 이번 주 성과 요약

| 지표 | 수치 |
|---|---|
| 총 예측 (검증 완료) | 22 경기 |
| 정확도 | **54.5%** (12/22) |
| CREDIT_EXHAUSTED 비율 | 20/22 (91%) |
| CE 전용 정확도 (conf=0.3) | **60.0%** (12/20) |
| 정상 debate 정확도 | 0/2 (소표본) |

### 요일별 패턴

| 날짜 | 결과 | 비고 |
|---|---|---|
| 07-01 (수) | 0/4 (0%) | 2게임 normal debate (둘 다 틀림) |
| 07-02 (목) | 5/5 (100%) | CE fallback 전 |
| 07-03 (금) | 2/5 (40%) | |
| 07-04 (토) | 3/5 (60%) | |
| 07-05 (일) | 2/3 (67%) | |

### 팩터 인사이트

**SFR(수비) 역신호 관찰 (단기, n=22)**:
- 틀린 예측에서 SFR >0.5(예측팀 수비 우위) 비율: 80%
- 맞춘 예측에서 SFR >0.5 비율: 33%
- 해석: SFR이 높은 팀을 예측했을 때 오히려 더 틀림 → 단기 노이즈 가능성 높음 (n=22)

**나머지 팩터**: elo / bullpen / lineup_woba → 맞춘/틀린 간 차이 미미 (±0.005 이내)

### 가중치 조정 결정

**변경 없음** — v1.8 유지 (cycle 1460 확정, n=178 재입증 근거)

- 이번 주 54.5%는 전체 baseline(60.9%) 대비 -6.4pp
- 원인: CREDIT_EXHAUSTED 20/22 → debate 없는 quantitative-only 주
- CE 전용 정확도(60.0%)는 오히려 baseline 근접 → 모델 자체 이상 없음
- SFR 역신호는 1주 n=22 데이터로 결론 불가 (threshold: n≥50 필요)

### CREDIT_EXHAUSTED 상태 (2026-06-06~)

31일+ 지속 중. 사용자 Anthropic 크레딧 충전 시 debate 복구 + accuracy 재확인 예정.

---

## 🎯 v1.8 유지 확정 결정 — n=178 임계 달성 (2026-07-06, cycles 1447/1450/1460)

### 배경

v1.8 (10팩터, 3소스) 는 2026-05-13 (cycle 355) 론칭 후 pre_game verified 예측 축적 시작. v2.0 upgrade 임계는 `n=150` — 세이버메트릭스 신뢰 구간 확보 표본 수. 42 cycle 만에 3 milestone 순차 도달. ← 최종 결정: cycle 1460 v1.8 유지 확정 (n=178 재입증, Brier DEFAULT 0.2443 vs Learned 0.2458, 차이 0.15% < 1pp) → v2.0 upgrade 불필요.

### 3 milestone 순차 도달

**cycle 1447 (2026-07-03) — n=161 첫 crossing**:
- v1.8 cohort n=150 threshold 첫 crossed (velocity 회복 ~0.87/cycle after phase 13-14 flatline)
- 실측 acc 60.9%, Brier 0.2714 → 0.2995 (calibration drift 관찰)
- v2.1-B shadow n=52 / 51.9% / Brier 0.4635 = 즉시 **reject**

**cycle 1450 (2026-07-03) — 51th skill-evolution milestone (반세기+1)**:
- trigger 3 단독 발화 (`cycle_n % 50 == 0`)
- 20 consecutive milestone metric-only pattern 유지
- silent drift family streak 992 cycle (cycle 458~1450, wave 186 시점)

**cycle 1460 (2026-07-06) — v1.8 유지 확정 최종 결정**:
- plan #16 2차 fire — expanding window OOS n=27→178 재입증
- Brier DEFAULT 0.2443 vs Learned 0.2458 (최대 차이 0.15% < 1pp 임계)
- Fable plan 진단: post-CREDIT_EXHAUSTED (2026-06-06~) Brier drift = 측정 오류 (Fable S2c evidence, home_win_prob Brier pre/post = 0.24/0.24 안정)
- **최종 결정**: v1.8 유지. 전면 가중치 재조정 불필요.

### 정합 sweep (waves 186~196, cycle 1459~1463)

silent drift family sweep 11 wave 순차 정합:

| Wave | Cycle | Surface | 정합 결과 |
|---|---|---|---|
| 186 | 1459 | fix(test): /accuracy guard | methodology v2.0 block 복원 |
| 188 | 1459 | CI red 복원 | 후속 |
| 192 | 1458 | v2.0 "재조정 결정 대기" | v1.8 유지 확정 정합 |
| 193 | 1459 | CF Worker cron fire count + role count | 실제 값 정합 |
| 194 | 1461 | CLAUDE.md v2.0 calibration | v1.8 유지 확정 정합 |
| 195 | 1462 | packages/ src comments v2.0 | v1.8 유지 확정 정합 |
| 196 | 1463 | TODOS.md/memory/dashboard v2.0 tracking | v1.8 유지 확정 정합 |

### v2.1-B rejected 근거

- N=52 소표본 → n=150 임계 미달
- Brier 0.4635 = DEFAULT (0.2443) 대비 2배 열화
- 가중치 re-fit = 소진된 카드 (v2.1-B 증거)

### CREDIT_EXHAUSTED 상태 (2026-06-06~)

- debate.ts judge LLM Anthropic credit 소진 → 100% fallback → confidence=0.3 flat
- 22일간 감지 지연 (cycle 1400 P2 패턴 lesson)
- pre_game Brier 정상 (home_win_prob 기반), post-CREDIT_EXHAUSTED winner-centric Brier drift = 측정 오류
- 사용자 영역: Anthropic 크레딧 충전 pending

### v1.8 유지 확정의 의미

- 42 cycle × 178 예측 축적 = 세이버메트릭스 신뢰 구간 확보 첫 사례
- 정량 evidence 기반 결정 (Brier / accuracy 실측) — 직관 배제
- 다음 upgrade 결정 = 새 데이터 소스 또는 팩터 발견 시. 표본 수 재조건 X

**재사용 가능**: ✅ 다요인 예측 모델의 upgrade 판단 = 표본 수 임계 + Brier delta < 1pp = 유지 확정. re-fit 은 새 신호 발견 시만.

---

## 🔬 패턴 추출 — cycle 1422 (2026-06-30)

### P5 — Team-Level Quantitative Overconfidence (data_pipeline / operational_analysis)

**Problem**: 다요인 예측 모델에서 특정 팀의 정량 스탯(FIP/xFIP/Elo/wOBA)이 실제 시즌 성적보다 과도하게 우수하게 나타날 때, 모델이 해당 팀을 체계적으로 over-predict. 증상: v1.8 SSG 랜더스 예측 1/8 = 12% (거의 역예측 수준). 잘못된 예측 8건 중 7건이 SSG를 이긴다고 예측했으나 상대팀이 승.

**Solution**:
- `teamAccuracyRate(predictions, teamId)` — 팀별 예측 적중률 집계
- 임계 플래그: `model_win_rate(team) > actual_win_rate(team) + 0.20` = overconfidence 경고
- 이번 SSG 케이스: 모델이 SSG를 약 60% 확률로 예측 → 실제 시즌 승률은 ~40%대 추정
- 팀별 보정 계수(team_bias_correction) 적용 후속 검토 (v1.8 유지 확정 별도 layer, cycle 1460)

**Results**: W26 발견 (n=8 소표본). n=178 임계 달성 후 v1.8 유지 확정 (cycle 1447/1460) — 전 팀 체계적 측정은 팀별 표본 확보 후 별도 진행. 지금은 관찰 마커만 박제.

**재사용 가능**: ✅ 모든 스포츠 예측 모델. 팩터 기반 모델에서 개별 팀/선수의 "정량-성과 乖離"는 systematic bias 원인 1순위.

---

### P6 — Weekend Recovery Pattern (operational_analysis)

**Problem**: 토요일(Sat) 이변 집중 → 일요일(Sun) 완벽 회복 패턴이 KBO 시즌 데이터에서 반복. v1.8 이번 주: 토 1/5 = 20% → 일 5/5 = 100%. 누적 요일별: 토 52% vs 일 71%.

**Root cause 가설**: 4연전 구조(화~일)에서 3차전(토)이 심리적 분기점 — 홈 3연패 시 원정 흐름 급전환. 4차전(일) = 정규화.

**Solution**: 
- 요일 보정 계수 `DAY_OF_WEEK_WEIGHT` 상수 후보 (v1.8 유지 확정 후속 별도 layer, cycle 1460)
- 토요일 예측 신뢰도 티어 하향 (-5% 보정) 검토
- 일요일: 보정 불필요 (71% = 전체 평균 이상)

**Results**: 관찰 패턴 박제. n=178 임계 달성 (cycle 1447) 후 v1.8 유지 확정 — 요일 단위 통계 유의성은 요일별 표본 확보 (현 N=25 소표본) 후 재검증.

**재사용 가능**: ✅ 연속 시리즈 구조를 가진 모든 스포츠. NBA 홈/원정 back-to-back, MLB 3~4게임 시리즈에도 동일 패턴 존재 가능.

---

## 🔬 패턴 추출 — cycle 1400 (2026-06-27)

### P1 — Neutral-Factor Sparse Detection (ai_agent / data_pipeline)

**Problem**: `normalize()` 가 homeVal==awayVal 시 0.5 반환. 10팩터 중 5+가 0.5이면 동전던지기 품질 예측이지만 파이프라인은 구별 못 하고 조용히 통과.

**Solution**:
- `countNeutralFactors(factors)` — pure 함수, 0.5 exact 카운트
- `PREDICTION_SPARSE_THRESHOLD = 5` — 50% neutral 임계
- `captureSparsePredictionAlert()` — Sentry warning 별도 채널 (z-score 채널 / silent-drift-family 채널과 분리)
- 7 guard tests in `prediction-sparse.test.ts`

**Results**: predict() 호출부가 ≥5 neutral 시 즉시 Sentry 알림. 시스템 정지 X (non-blocking `.catch(() => {})`).

**재사용 가능**: ✅ 모든 multi-factor 예측 시스템에 적용 가능. threshold는 factor 수 × 50% 기준.

---

### P2 — Silent LLM Fallback Masking (anti_pattern)

**Problem**: `debate.ts`의 `judgeResult.data || fallback` 패턴 — judge LLM 실패 시 confidence=0.3 + 정량 모델 결과로 조용히 대체. 22일간 (2026-06-06~) 감지 안 됨. pipeline_runs.errors=[] (정상처럼 보임).

**신호**: confidence=0.3 flat (모든 예측 동일값) — DB 집계로만 탐지 가능.

**Fix 방향**: `evaluateAndCaptureAgentFallback()` 이미 존재하나 Sentry에 전달 X. 별도 scout issue로 박제 필요.

**재사용 가능**: ✅ LLM-in-pipeline 패턴에서 `data || fallback` 은 항상 anti-pattern. fallback 발화 시 반드시 alerting 채널 연결.

---

### P3 — Registry Sweep Wave (quality_guard)

**Problem**: Literal strings/numbers 산포 — 한 곳 변경 시 나머지 stale. grep으로만 식별 가능.

**Solution**: 1 wave = 1 grep pattern → 해당 리터럴 → `@moneyball/shared` 상수화 → guard test. 현황: wave 163개 누적 (cycle 1350~1400: wave 153-163 = 11 waves).

**패턴 규칙**:
- 파일 3+ = wave 트리거
- 상수화 후 guard test 의무 (wave 156, 163 교훈)
- guard test 빠진 상수 = 다음 cycle 즉시 follow-up (cycle 1398 패턴)

**재사용 가능**: ✅ 모든 모노레포에 적용 가능. `shared` 패키지 + grep-driven wave 방식.

---

### P4 — Alert Cascade by Pipeline Mode (data_pipeline)

**Problem**: 각 cron mode (predict_final, verify, postview, sparse) 가 silent drop 시 별도 채널 없음 — console.log만 존재.

**Solution**: `shouldAlertSilentDrift(meta)` — mode별 분기 + Sentry warning. 현황: predict_final → verify → postview → sparse = 4 coverage layer 누적.

**확장 원칙**: 새 mode 추가 시 `silent-drift-alert.ts` 에 분기 1개 추가 = 자연 확장.

**재사용 가능**: ✅ 모든 multi-mode 데이터 파이프라인 (ETL / ML inference / 검증 등).

---

## 📊 주간 리뷰 2026-W26 완성 (2026-06-23 ~ 2026-06-28, cycle 1421)

> cycle 1400 부분 작성 (화~금) → cycle 1421 완성 (토+일 추가, n=127 갱신)

### 주간 성과 요약

| 지표 | 값 |
|---|---|
| 이번 주 적중률 (v1.8) | **70.0%** (21/30, 6일 전체) |
| 토 (6/27) | 1/5 = **20%** (주간 최저, 4개 이변) |
| 일 (6/28) | 5/5 = **100%** (완벽) |
| 누적 v1.8 | **59.1%** (75/127) |
| 가중치 조정 | **보류** (n=150 미달, 잔여 23건) ← stale: n=178 달성, v1.8 유지 확정 (cycle 1460) |

### 요일별 적중률

| 요일 | 결과 |
|---|---|
| 화 (6/23) | 3/5 = 60% |
| 수 (6/24) | 4/5 = 80% |
| 목 (6/25) | 4/5 = 80% |
| 금 (6/26) | 4/5 = 80% |
| **토 (6/27)** | **1/5 = 20%** ← 이변 집중 |
| **일 (6/28)** | **5/5 = 100%** ← 완벽 회복 |

### 예측 실패 9경기

**화~금 (5건)**
1. **6/23 한화 vs 두산** — 두산 예측 → 한화 3:2 승 (홈 한화)
2. **6/23 LG vs 삼성** — 삼성 예측 → LG 4:3 승 (홈 LG)
3. **6/24 KT vs SSG** — KT 예측 → SSG 원정 승
4. **6/25 롯데 vs NC** — 롯데 예측 → NC 원정 8:2 승
5. **6/26 SSG vs 한화** — SSG 예측 → 한화 원정 9:2 승

**토요일 이변 집중 (4건)**
6. **6/27 SSG vs 한화** — SSG 예측 → 한화 원정 8:1 승 (3연승 한화)
7. **6/27 두산 vs KIA** — KIA 예측 → 두산 홈 8:1 승
8. **6/27 롯데 vs LG** — 롯데 예측 → LG 원정 8:7 승
9. **6/27 NC vs 키움** — NC 예측 → 키움 원정 3:1 승

### 핵심 발견

**1. SSG 예측 취약 (v1.8 전체 1/8 = 12%)**
- 이번 주: 한화전 3경기 모두 SSG 예측 → 3경기 모두 한화 승
- v1.8 전체: SSG 예측 시 적중 1건/8경기 = 거의 역예측 수준
- 원인 가설: SSG 정량 스탯(FIP/xFIP/Elo)이 현 시즌 실제 성적보다 과도하게 우수 → 모델 overconfidence
- SSG 관련 팩터 별도 검토 필요 (v1.8 유지 확정 후속 별도 layer, cycle 1460)

**2. 토요일 이변 패턴 (4/5 = 80% 실패)**
- 4개 경기 모두 원정팀 승리 (홈 어드밴티지 무력화)
- 패턴: 4연전 3차전(토요일) 홈팀 심리적 피로 + 원정 반격?
- v1.8 누적 토요일: 13/25 = 52% (평균 이하)

**3. judge-agent 토론 24일째 비활성 (→ cycle 1421 기준)**
- 2026-06-06 이후 모든 예측 confidence=0.30 (fallback 고정)
- 정량 모델 단독 이번 주 70% — 여전히 기준선 이상
- fix-incident 후속 대상 (판단 LLM 실패 원인 조사)

**4. LG 예측 강점 (9/11 = 82%)**
- v1.8 전체 팀별 최고 적중률
- LG 정량 스탯과 실제 성과가 잘 일치하는 팀

### 팀별 예측 적중률 (v1.8 전체, 8+ 게임)

| 팀 | 적중률 | n |
|---|---|---|
| LG 트윈스 | **82%** | 11 |
| 삼성 라이온즈 | **70%** | 20 |
| KIA 타이거즈 | **67%** | 18 |
| NC 다이노스 | 57% | 14 |
| 두산 베어스 | 56% | 18 |
| 롯데 자이언츠 | 50% | 14 |
| KT 위즈 | 50% | 10 |
| **SSG 랜더스** | **12%** | 8 ← 주의 |

### v1.8 누적 cohort

| 시점 | n | 정확도 |
|---|---|---|
| cycle 1340 측정 | 118 | 58.5% |
| cycle 1400 (6/27) | 117 | 59.0% |
| **cycle 1421 (6/30)** | **127** | **59.1%** |

- 잔여 23경기 → v2.0 임계 n=150 (ETA: 약 4.6일, velocity ~5/day 추정) ← stale: n=178 달성 (cycle 1447), v1.8 유지 확정
- 가중치 조정 **보류** — cycle 1421 시점 기록. cycle 1447 n=161 threshold cross → cycle 1460 n=178 재입증 → **v1.8 유지 확정** (전면 재조정 불필요, SSG 편향 + 토요일 패턴은 별도 후속 layer 로 검토)

---

## 🧪 plan #8 M1 — v2.0-cycle231 backtest harness fire (2026-05-26, cycle 903)

### v2.0-cycle231 후보 baseline simulation 박제

cycle 231 정보가치 분석 후보 (`elo +3pp / bullpen_fip +4pp / recent_form +3pp / sp_fip -7pp / lineup_woba -3pp`, 합 0.85) 를 `backtest-manual-weights-run.ts` harness 에 추가 + Test 2024 (N=727) fire. 결과 `apps/moneyball/data/v2-backtest-results.json` 박제.

**결과 비교 (Test 2024 N=727)**:

| 모델 | Brier | LogLoss | Acc |
|------|-------|---------|-----|
| coin_flip | 0.25000 | 0.69315 | 51.44% |
| Manual v1.5 (현 prod) | 0.24974 | 0.69264 | 52.82% |
| Manual v1.6 | 0.24886 | 0.69086 | 53.37% |
| Manual v2.1-A | 0.24854 | 0.69023 | 52.96% |
| **Manual v2.1-B** | **0.24830** | **0.68975** | 52.82% |
| Manual v2.1-C | 0.24885 | 0.69084 | 53.09% |
| **Manual v2.0-cycle231** | **0.24977** | **0.69271** | 52.82% |
| Logistic 4f | 0.24980 | 0.69276 | 52.41% |
| **Logistic 7f** | **0.24661** | **0.68635** | **56.40%** |

**ΔBrier vs v1.5**:
- v2.0-cycle231: **-0.00003 (미미, evidence 부재)**
- v2.1-B: +0.00143 (backtest 안 가장 우수)
- Logistic 7f: +0.00313

### 한계 명시

- backtest harness 매핑 가능 weight 합 = 0.62 (sp_fip / lineup_woba / recent_form / h2h / park / elo / sfr). 매핑 불가 = 0.23 (sp_xfip / bullpen_fip / war = 0.5 중립).
- v2.0-cycle231 후보 가중치 변화 중 **bullpen_fip +4pp 매핑 불가** → backtest 결과 미반영. 실 prod 적용 시 결과 다를 가능성.
- N=727 wayback test set 결과 = 2024 시즌 데이터. v1.8 prod 누적 n=39 (cycle 886 기준) noise level 다름.

### 결론

- **결론 X (baseline 박제만)**. plan #8 self_verification rubric (risk 1, n=133 noise) 정합.
- v2.0-cycle231 backtest evidence 부재 (Δ -0.00003). 그러나 매핑 불가 영역 (bullpen) 큰 가중치 변화 미반영 → backtest 단독 판단 X.
- 실 prod n≥150 도달 (~2026-06-04) 후 v1.8 → v2.0-cycle231 또는 v2.1-B switch 결정 필요. evidence valuation 신중 (CI ±15%p). ← stale: v1.8 유지 확정 (cycle 1460), switch 불필요 (Brier diff < 1pp)

### plan #8 status 갱신

- Tier 1 (M2/M5/M7/M10/L4) — 100% ship 완료
- Tier 2 M1 — 본 cycle 903 ship 완료
- Tier 2 L1 — cycle 887~898 partial ship
- Tier 2 L3 — cycle 898 closure
- **Tier 2 closure 잔여 = 0** (Tier 3 = plan #9 carry-over, completed cycle 896)

## 🎰 Lotto 1225회 OOS + plan #7 Step E/F partial 박제 (2026-05-23, cycle 885)

### 1225회 OOS 검증 (PR #1246 cf86586) — 256 rules 100% PASS + 5등 6건 + score breakdown

- **추첨 결과**: 8, 9, 19, 25, 41, 42 (보너스 33). 합 144 / 홀:짝 4:2 / 연속쌍 2.
- **256 rules OOS**: PASS 256 / FAIL 0 (100% 통과). 누적 N=2 (1224 + 1225) 모두 PASS = filter robust 입증.
- **50세트 매칭**: 5등 **6건** (random expected 0.89건 → **6.7× over-perform**). 평균 매칭 1.12 (1224회 0.84 → +0.28 향상).
- **1등 score breakdown**: unpopularityScore(1등) = +6.60 (LUCKY 0 / consecPairs +6 / sum 거리 +0.6 / 등차·decade·저번호 0). 50세트 cutoff = 14.40 → **gap 7.80**. valid pool 7.7M 안 추정 rank ~836k (top 10.86%) → 추천 50,000 candidates 진입 fail.
- **약점 dimension 식별**: **sum 거리 가중치 책임 80%+**. 모델 "평균 합 138 멀어진 조합 = 비인기 = 추천" 가정에서 1등 합 144 catch fail. N=2 evidence (1224 합 164 sum 거리 +2.60 / 1225 합 144 sum 거리 +0.60 양쪽 모두 cutoff 미달) = 가설 강화.
- **결론**: rule 제거 0건 / 추가 동기 X. score 모델 sum 가중치 튜닝 evidence 누적 — N≥10 (~07-25 ETA) 후 GO.

### plan #7 Step E + F partial 박제 (PR #1247 b1da036) — cron 자동 갱신

- **scripts/lotto.ts**: `pick-md` mode 신규 (`buildCandidates` + `renderPickMarkdown` + `nextSaturdayKST` + `pickMd`). 기존 `pick` 함수 = `buildCandidates` 재사용 (regression 0).
- **.github/workflows/lotto-pick-update.yml**: cron `'19 0,3,6 * * 5'` (UTC 금 multi-fire 3회 = KST 09:19/12:19/15:19) + idempotent skip + PR auto-merge (R7).
- **.github/workflows/lotto-pick-monitor.yml**: cron `'0 17 * * 5'` (KST 토 02:00) silent skip 감지 `::error::`.
- **apps/moneyball/data/lotto-picks/2026-05-30.md**: pick-md smoke test bootstrap seed (1226회 50조합, 첫 cron fire 전 archive empty 차단).
- **+9 신규 regression test** (cron YAML + pick-md mode + AdSense surface signal grep).
- **AdSense surface risk 0** — archive 만 매주 갱신 (cycle 822 PR #1240 이미 indexable), `/lotto` hub 미박제 (gating 유지).
- **사용자 가치**: 매주 사용자 수동 50조합 박제 부담 제거 + Step C/D ship 시점 PR 부담 사전 분담.

### 잔여 carry-over (자율 영역 외)

- 14일 AdSense reject signal monitor (사용자 영역, ~06-05 ETA) → Step C/D 박제 GO trigger
- plan #7 Step C/D (`/lotto` hub + UI 강화) = gating (AdSense monitor 통과 후)
- N≥10 누적 OOS = 자연 누적 (매주 자동 cron 박제 + 사용자 'oos' mode 수동 fire)
- score 모델 sum 가중치 튜닝 = N≥10 evidence 누적 후 GO

### regression

- `pnpm test`: 587 PASS (54 files, +9 신규) / `pnpm lint` 0 warning / `pnpm exec tsc --noEmit` 0 error / `pnpm tsx scripts/lotto.ts pick-md 2026-05-30 1226` smoke test PASS / `LottoDataSchema` PASS
- **deploy drift**: production /api/version commit_sha = main HEAD = b1da036 (gap=0, 사례 9 family 재발 X)

---

## 📋 /insights 시즌 2 closure (2026-05-22, cycle 872~875)

### plan #5 factor breakdown timeline integration 박제 6/6 Step closure

- **cycle 872 PR #1228** (Step 1, plan write) — `~/.develop-cycle/plans/moneyballscore/5.md` 외부 박제. lite mode 4축 review skip (자동 fire AskUserQuestion hang 차단, cycle 200 박제 정합).
- **cycle 873 PR #1229** (Step 2~3) — `apps/moneyball/src/lib/insights/loader.ts` `InsightEntry.factors: Record<string,number> | null` 확장 + supabase select `factors` column 추가 + null-safe normalize (빈 객체 → null). `apps/moneyball/src/app/insights/[date]/page.tsx` 안 `<FactorBreakdown factors={item.factors} ... />` JudgeReasoningCard 다음 stacked render.
- **cycle 874 PR #1230** (Step 4) — `/insights` hub `selectTopFactors` helper + mini factor preview (상위 3 factor, `Math.abs(value - 0.5)` desc 정렬, "전체 팩터 보기" anchor → `/insights/${date}#game-${gameId}`).
- **cycle 875** (Step 5~6) — `selectTopFactors` helper `apps/moneyball/src/lib/insights/topFactors.ts` 추출 + 5 신규 behavior unit test (null factors → [] / 비정상 값 filter / desc 정렬 + limit 슬라이스 / favorable home/away/neutral 분류 / pct 정수 round). `pnpm test` 549 → 554. CLAUDE.md + CHANGELOG.md sync.
- **사용자 가치**: 정량 (factor breakdown) + 정성 (judge reasoning) 양쪽 archive timeline 동시 비교. 사용자 1 페이지에서 "왜 이 예측인가" + "어떤 factor 가 가중치 얼마였나" 비교 path 박제.
- **AdSense article surface 강화**: factor 한국어 label + percentage 자연어 노출 = thin content 회피 더 강력. glossary inline link (cycle 756 박제) inbound 자연 확장.
- **regression**: `pnpm test` 554 PASS (+5) / `pnpm lint` 0 warning / `pnpm exec tsc --noEmit` 0 error / `pnpm build` /insights + /insights/[date] static prerender 통과.

---

## 📋 W22 마감 노트 (2026-05-17, cycle 516 operational-analysis lite)

### Sat reversion — Thu/Fri 1/10 noise 가설 강화

- **5/16 Sat 측정**: 3/5 = 60.0% (Sat 누적 12/22 = 54.5% 안정 회복).
- **W22 갱신 (n=20→25)**: 30.0% → 36.0%. scoring_rule 분해: v1.7-revert 2/5 (40.0%, 변동 X) + v1.8 7/20 (35.0%, cycle 490 26.7%→+8.3%p).
- **누적 갱신**: n=109→114, 45.9%→46.5%, Brier 0.2469→0.2473.
- **5/17 Sun 10건 verify 대기**: cron 14 UTC = 23:00 KST 대기 중. cycle 517 후속 측정.
- **가중치 결정**: cycle 490 No-go gate 유지 (head_to_head 3% / elo 10%). v1.8 n=20 binomial CI ±21.5%p — 여전히 v1.7-revert 53.1% 와 통계적 분리 X.
- **v2.0 임계 n=150 까지 36건**: W23~W24 2주 후 도달 가능. ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — v2.0 upgrade 불필요.
- **lesson**: `docs/lessons/2026-05-17-w22-saturday-recovery.md`
- **다음 측정**: cycle 517 5/17 Sun verify 후 + W23 (5/19~5/25) 데이터. ← stale: 완료

---

## 📋 W22 운영 노트 갱신 (2026-05-16, cycle 490 operational-analysis lite)

### v1.8 첫 주 측정 — n=15 noise 영역, 가중치 유지

- **fallback 해결 검증**: 5/12~5/15 60건 예측 모두 실제 debate (model_version `v2.0-debate` / `v1.8` / `v1.8-postview`). cycle 362 PR #372 fix 적용 후 silent fallback 0건.
- **W22 적중**: 6/20 = 30.0% (Tue 2/5 / Wed 3/5 / Thu **0/5** / Fri 1/5). scoring_rule 분해: v1.7-revert 2/5 (40%) + v1.8 4/15 (26.7%).
- **v1.8 vs v1.7-revert**: Δ=-26.4%p 큰 격차. 그러나 n=15 binomial CI ±25%p — v1.7-revert 53.1% 가 v1.8 CI 상단 근접. 통계적 분리 X.
- **누적 갱신**: n=99→109, 49.5%→45.9%, Brier 0.2587→0.2469.
- **가중치 결정**: 변경 X (head_to_head 3% / elo 10% 유지). 표본 n<30 시 가중치 회귀 No-go gate 박제.
- **요일별 누적 (n=109)**: Tue 45.0% (9/20) / Wed 53.8% (7/13) / Thu 45.8% (11/24) / Fri 57.1% (12/21) / Sat 52.9% (9/17) / **Sun 14.3% (2/14, cap 적용 중)**. Fri 68.8%→57.1% 하락은 W22 1/5 Fri 영향.
- **lesson**: `docs/lessons/2026-05-16-v18-first-week-downturn-noise.md`
- **다음 측정**: W23 (5/19~5/25) 데이터 누적 후 v1.8 재평가. v2.0 임계 n=150 까지 41건. ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460).

---

## 📋 W22 운영 노트 (2026-05-14, cycle 383 operational-analysis lite)

### v1.8 era silent fallback 발견 (긴급)

- **상황**: 2026-05-13 v1.8 첫 fire 부터 모든 예측이 quant-only fallback. `totalTokens=0` + `reasoning="에이전트 토론 불가. 정량 모델 v1.8 결과 사용."` 10건 모두 동일 패턴 (5 pre_game + 5 postview).
- **시점**: 5/12 (Tue) v1.7-revert 5건 중 4-5번째 부터 fail 시작 (mid-batch credit exhaustion 패턴). 5/13~ 전체 fail.
- **가설**: ANTHROPIC_API_KEY credit 소진. PR #372 (cycle 362) 가 미리 식별한 시나리오 그대로.
- **잔존 silent drift**: PR #372 fix 5/13 17:24 KST merge → 5/13 16:17 KST v1.8 pre_game fire 시점엔 미적용. mv='v2.0-debate' 라벨 silent. postview path 도 동일 silent (`mv='v2.0-postview'`).
- **영향**: v1.8 가중치 효과 (head_to_head 5→3% + elo 8→10%) 측정 불가능. n=99→150 진행 가속 가설 깨짐. AI reasoning UI 노출도 검토 필요.
- **후속 fix-incident heavy chain 권장**: API key 상태 확인 / postview path agentsFailed 가시화 / Sentry captureException 직접 호출 / /accuracy 에 fallback 비율 표시.
- **lesson**: `docs/lessons/2026-05-14-anthropic-credit-silent-fallback-v18.md`

### W22 (5/11~5/18) 부분 데이터

| 날짜 | scoring_rule | 검증 | 적중 | 비고 |
|---|---|---|---|---|
| 5/12 Tue | v1.7-revert | 5 | 2 | 40%. 1~3 게임 정상 토론 / 4~5 게임 fallback 시작 |
| 5/13 Wed | v1.8 | 5 | 3 | 60%. 전부 fallback (quant-only) — 표면 적중률은 fallback quant 모델 성능 측정 |
| 5/14 Thu | — | — | — | SP 미확정 (18:30 게임). 예측 미생성 |

전체 W22 검증 10건 / 5건 적중 = 50%. v1.8 등급화 분석 무효 — fallback 성능만 측정됨.

---

## v0.5.49.0 (2026-05-13, cycles 355-365)

### Added
- **AI 모델 버전별 성과 비교** (PR #373, cycle 363): `/accuracy` 에 scoring_rule별 적중률 비교 테이블 추가. v1.5→v1.6→v1.7-revert→v1.8 성과 추이 + 막대 시각화. `buildVersionHistory()` — scoring_rule 기반 집계.
- **팀별 상대 강약 분석 카드** (PR #371, cycle 360): `/accuracy` 에 10팀 매치업 카드 그리드. 홈/원정 적중률 + 상대팀별 n=1 이상 기록 표시. `buildMatchupData()` 기존 쿼리 재사용.
- **AI 확신도별 분석 섹션** (PR #369, cycle 355): `/accuracy` 에 low/medium/high tier 역전 패턴 가시화. medium 37.5% < low 58.3% 역전 강조.

### Fixed
- **일요일 신뢰도 상한 텍스트 정정** (cycle 364): Sunday cap 수치가 `accuracy` 페이지 표시값에서 55%→45% 불일치 수정 (2곳 + VERSION_META).
- **agentsFailed 플래그** (PR #372, cycle 362): API credit 소진 시 LLM 호출 silent failure → `v2.0-debate` 잘못 라벨링 차단. `agentsFailed` / `agentError` 필드 + 회귀 테스트 4건.
- **Sunday confidence cap 0.55→0.45** (cycle 358): medium tier 역전 오염 수정. judge-agent Sunday 상한을 0.55→0.45로 재조정.

### Changed
- **lockfile sync** (cycle 358): `@testing-library/user-event` 불필요 의존성 제거.

---

## v1.8 론칭 기준선 + v1.7-revert 팩터 완결 분석 (2026-05-13, cycle 365 operational-analysis)

### 누적 현황 (n=94, 2026-05-13 기준)

| 버전 | 건수 | 적중률 | 비고 |
|---|---|---|---|
| v1.5 | 16 | **75.0%** | 소표본 |
| v1.6 | 46 | 37.0% | 과적합 |
| v1.7-revert | 32 | **53.1%** | 개선 확인 |
| v1.8 | 0 | — | 오늘(05-13) 시작 |
| **전체** | **94** | **48.9%** | Brier 0.2549 |

### v1.7-revert 완결 팩터 분석 (n=32)

| 팩터 | 정답 avg | 오답 avg | Δ | 해석 |
|---|---|---|---|---|
| `head_to_head` | 0.391 | 0.341 | **+0.050** | ⚠️ 양의 신호 — v1.8 축소(5→3%) 방향 재검토 필요 |
| `sfr` | 0.265 | 0.319 | **-0.054** | 극단값(0 또는 1.0) = 정확, 중간값 = 노이즈 |
| `sp_fip` | 0.516 | 0.503 | +0.013 | 약한 양의 신호 (의도한 방향) |
| `bullpen_fip` | 0.490 | 0.511 | -0.021 | 약한 반대 신호 |
| `elo` | 0.500 | 0.499 | +0.001 | ≈ 완전 중립 (v1.8 증가 10% 근거 재검토 필요) |
| `recent_form` | 0.486 | 0.491 | -0.005 | ≈ 중립 (W19 "가장 강한 신호"와 상충 — 표본 구간 차이) |
| `war` / `park_factor` | 0.500 | 0.500 | 0.000 | 완전 중립 확인 |

### 핵심 발견

**⚠️ head_to_head vs v1.8 방향 충돌**: v1.7-revert n=32 분석에서 head_to_head Δ=+0.050으로 양의 신호 감지. v1.8은 5%→3% 축소를 적용했으나 이 데이터는 반대 방향 시사. TODOS "W20 35.3% 방향 적중률" 과의 모순 = 표본·집계 방식 차이. **n=150 도달 전까지 양쪽 병행 추적 필요.** ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — 추적 완료, 가중치 재조정 불필요

**elo 거의 중립 (Δ=+0.001)**: v1.8에서 8%→10% 증가했지만, v1.7-revert 실측에서는 방향 신호 없음. 단, 이는 32건 소표본이며 정보가치 분석(Δ=+0.30, cycle 231)은 다른 방법론. 충돌 보류, v1.8 성과로 판단.

**확신도 역전 지속**: medium(55~64%) 37.5% < low(<55%) 58.3%. high tier 0건(judge 고확신 발화 미발화). v1.8 + Sunday cap 0.45 이후 첫 주 모니터링 시작.

**W20 May 12**: 2/5 = 40%. 3건 upset(모두 away 팀 승리). v1.8 시뮬레이션: elo 10% 적용 시 game 3819(NC 높은 elo) 개선 가능성 있음.

### 가중치 조정 결론

**현 상태 유지 + v1.8 모니터링**: v1.8 방금 시작. 3주(~15건) 누적 후 head_to_head + elo 방향 재평가. n=150 도달 시 heavy 재실행. ← stale: n=178 crossed (cycle 1447), v1.8 유지 확정 (cycle 1460) — 재실행 없음

---

## 주간 리뷰 W19~W20 (2026-05-13, cycle 359 weekly-review)

### W19 성과 (2026-05-05~10): 15/27 = 55.6%, Brier 0.2542

| 지표 | 값 |
|---|---|
| 적중률 | 15/27 = **55.6%** |
| Brier | **0.2542** |
| low(<55%) | 12/19 = 63.2% |
| medium(55~64%) | 3/8 = **37.5%** ← 역전 지속 |
| high(≥65%) | 0건 |

### W20 partial (2026-05-12 화요일): 2/5 = 40.0%
- 전 경기 low tier (conf ≤ 0.52, Sunday cap 0.45 이전 예측)
- v1.8 scoring_rule 첫 예측은 2026-05-13 16:17 KST~ 생성 예정

### 핵심 발견

**medium tier 역전 패턴 4주 연속 확인**: medium(55~64%) = 37.5% < low(<55%) = 63.2%.
judge-agent가 확신도 55~64% 구간에서 과보수적으로 발화 → 이 구간 실제 정보 가치 낮음.
cycle 358에서 Sunday cap 0.55→0.45로 1차 대응. 장기 해결: n=150 도달 후 judge calibration 재검토. ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — 가중치 재조정 불필요 결론. judge calibration = 독립 carry-over (CREDIT_EXHAUSTED 구간 측정 제한).

**요일별 패턴 (W19)**:
- 금요일 4/4 = **100%** (표본 소)
- 일요일 1/5 = 20% (cap 적용 이유)
- 화요일 2/3 = 67%, 수요일 3/5 = 60%

**팩터 방향성 분석**:
- `recent_form`: 정답 0.505 vs 오답 0.470 — 가장 강한 방향 신호
- `sp_fip`: 정답 0.516 vs 오답 0.498 — 약한 양의 신호
- `war` / `park_factor`: 항상 0.500 — 완전 중립 (가중치 조정 후보)
- `elo`: 거의 중립 (0.501 vs 0.500)

**팀별 (W19+W20 partial)**:
- OB 6/7 = 85.7% ↑ (과거 패턴 일치)
- SK 2/7 = 28.6% ↓ (지속 예측 어려움)

### 가중치 조정 결론
조정 불필요. n=94/150 (v2.0 임계 56건 부족). 현 v1.7-revert 53.1% 안정. v2.0 트리거는 n=150 도달 시. ← stale: n=178 crossed (cycle 1447), v1.8 유지 확정 (cycle 1460) — v2.0 upgrade 불필요

---

## 재사용 패턴 추출 (2026-05-13, cycle 365 extract-pattern)

### [ai_agent] `api-credit-failure-labeling-guard`

**문제**: 외부 LLM API credit 소진 시 HTTP 400 반환 → 모든 에이전트 호출 실패 → fallback verdict(confidence=0.3)로 예측이 `v2.0-debate` 레이블로 silently 저장. 사후 분석 시 "에이전트 토론 성공" 예측과 "fallback" 예측이 동일 버전으로 혼재 → 버전별 성과 오염.

**해결**:
```ts
// types.ts — DebateResult에 실패 플래그 추가
agentsFailed?: boolean;
agentError?: string;

// debate.ts — HTTP 4xx 감지 → agentsFailed=true
// daily.ts — agentsFailed 시 errors[] push + debateSucceeded=false
if (debateResult.agentsFailed) {
  errors.push(`agents_failed: ${debateResult.agentError}`);
}
```
회귀 테스트 4건: 성공 케이스 / 심판 실패 / 홈팀 실패 / 원정팀 실패.

**결과**: API 실패 시 console.error 로깅 + errors 배열 노출. `v2.0-debate` 레이블은 에이전트 토론 실제 성공 예측만.

**범용성**: LLM 멀티에이전트 파이프라인에서 외부 API 실패가 silent fallback으로 저장되는 모든 케이스에 적용. agentsFailed 플래그 = audit trail.

---

### [anti_pattern] `rolling-window-factor-correlation-contradiction`

**문제**: W19 분석 → `recent_form`이 "가장 강한 방향 신호"(Δ=+0.035). v1.7-revert n=32 분석 → `head_to_head`가 "가장 강한 신호"(Δ=+0.050), `recent_form`은 중립(Δ=-0.005). 두 결과가 모순처럼 보여 가중치 결정에 혼란.

**원인**: 
- W19 분석 = 15건 단기 윈도우, v1.7-revert 분석 = 32건 다른 윈도우
- n<50에서 팩터 Δ의 95% CI ≈ ±15%p → 단기 분석은 noise 가능성 50%+
- head_to_head = null 값 많아 유효 표본이 더 작음

**해결**:
- 팩터 분석은 최소 n=50 이상 누적 후 실행 (n=150 도달 전까지 "방향 신호" 수준으로만 참조 ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460))
- 단기 윈도우 분석은 CHANGELOG 기록하되 가중치 변경 근거로 단독 사용 금지
- 분석 윈도우(W19 vs v1.7-revert 전체) 명시 필수

**결과**: v1.8 head_to_head 축소(5→3%)는 cycle 290의 "W20 35.3% 방향 적중" 근거(다른 방법론). 이번 Δ 분석과의 모순은 방법론 차이로 설명 가능. n=150 이전 판단 유보. ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — 재조정 불필요

**범용성**: 소표본 ML 팩터 중요도 분석 시 윈도우/방법론 명시 없는 상충 결과 처리 패턴.

---

## 재사용 패턴 추출 (2026-05-13, cycle 346 extract-pattern)

### [content_auto] `cjk-safe-og-image-latin-fallback`

**문제**: Next.js `@vercel/og` (Satori)는 CJK 폰트를 번들하지 않음. 한국어 팀명이 OG 이미지에서 ▢▢로 렌더링.

**해결**: 라틴 대체 맵 + route-collocated `opengraph-image.tsx`
```ts
const OG_TEAM: Record<string, string> = {
  SK: "SSG", HT: "KIA", LG: "LG", OB: "Doosan",
  KT: "KT", SS: "Samsung", LT: "Lotte", HH: "Hanwha", NC: "NC", WO: "Kiwoom",
};
```
- 한국어 팀 코드 → 글로벌 인식 라틴명 매핑
- `export const runtime = "nodejs"` (edge 런타임 CJK 제약 회피)
- DB에서 team.code 읽어 OG_TEAM 룩업 → fallback = code 그대로

**결과**: `/analysis/game/[id]` 전 경기 맞춤 소셜 카드. Away vs Home 매치업 + AI Pick 배지. 폰트 로딩 비용 0.

**범용성**: 한국어 콘텐츠 보유 Next.js 앱에서 OG 이미지 구현 시 공통 패턴. CJK 폰트 없는 환경 (Satori, PDF 등) 대응에 동일 라틴 맵 전략 재사용 가능.

---

### [anti_pattern] `accuracy-query-without-prediction-type-filter`

**문제**: ML 파이프라인이 동일 테이블에 다수 예측 타입(pre_game / postview / live) 저장. 필터 없이 accuracy 집계 시 사후 분석 예측까지 포함 → 지표 왜곡.

**발견**: cycle 331 — `predForPoll` accuracy 쿼리가 postview 예측까지 포함 → 커뮤니티 vs AI 정확도 비교 오염.

**해결**: accuracy 관련 모든 쿼리에 `prediction_type = 'pre_game'` 필터 필수화
```sql
-- 잘못된 패턴
SELECT * FROM predictions WHERE game_id = $1

-- 올바른 패턴
SELECT * FROM predictions WHERE game_id = $1 AND prediction_type = 'pre_game'
```

**결과**: 순수 사전예측 적중률 분리. 후처리 분석이 지표를 오염시키지 않음.

**범용성**: output_type / prediction_type / stage 컬럼이 있는 모든 ML 파이프라인. 쿼리 작성 시 타입 필터를 기본값으로.

---

### [data_pipeline] `per-category-accuracy-outlier-detection`

**문제**: 전체 정확도 지표(48.9%)가 카테고리별 극단 성과를 숨김. 특정 팀/요일/선수에서 모델이 체계적으로 실패해도 집계에 묻힘.

**발견**: cycle 346 — 팀별 분리 시 WO(키움) 1/6 = **16.7%** 이상치 발견. 전체 평균 대비 -32pp 격차.

**해결**: 최소 샘플 임계(≥3) + 카테고리별 집계 → 이상치 정렬
```python
team_stats = defaultdict(lambda: {'correct':0,'total':0})
# ... 집계 ...
for team, stat in sorted(team_stats.items(), key=lambda x: -x[1]['total']):
    if stat['total'] >= 3:  # 소표본 제거
        acc = stat['correct']/stat['total']*100
```

**결과**: 키움 팀 특성(빠른 공격형/수비 스타일) 미반영 가능성 식별. n=150 후 팀별 보정 검토 트리거. ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — 팀별 보정 미진행

**범용성**: 분류 모델의 정기 성과 감사. 전체 metric만 추적 시 카테고리 drift 탐지 불가. 팀/지역/시간대별 세그먼트 분해가 ML 모니터링 표준 절차.

---

## W22 팀별 정확도 + v1.8 첫날 (2026-05-13, cycle 346 operational-analysis lite)

### 팀별 예측 적중률 분석 (전체 n=94, 3경기 이상)

| 팀 | 적중 | 예측 건수 | 적중률 | 신호 |
|---|---|---|---|---|
| OB (두산) | 6 | 10 | **60.0%** | ↑ 강세 |
| KT | 8 | 14 | **57.1%** | ↑ 안정 |
| HH (한화) | 5 | 9 | **55.6%** | ↑ 양호 |
| LG | 7 | 13 | **53.8%** | → 보통 |
| SS (삼성) | 6 | 12 | **50.0%** | → 중립 |
| HT (KIA) | 6 | 13 | **46.2%** | ↓ 주의 |
| SK (SSG) | 5 | 11 | **45.5%** | ↓ 주의 |
| NC | 1 | 3 | **33.3%** | ⚠️ 소표본 |
| LT (롯데) | 1 | 3 | **33.3%** | ⚠️ 소표본 |
| **WO (키움)** | **1** | **6** | **16.7%** | 🚨 심각 — 모델 미반영 가능 |

**키움(WO) 분석**: 6경기 예측 중 5경기 오답. 키움 관련 경기에서 모델이 팀 특성(빠른 공격/수비)을 팩터에 제대로 반영 못할 가능성. n=150 이후 팀별 보정 검토. ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — 팀별 보정 불필요 결론

### 요일별 적중률 (전체 n=94)

| 요일 | 적중 | 건수 | 적중률 |
|---|---|---|---|
| 금 | 11 | 16 | **68.8%** ↑ 최강 |
| 목 | 11 | 19 | **57.9%** |
| 토 | 9 | 17 | **52.9%** |
| 수 | 4 | 8 | **50.0%** |
| 화 | 9 | 20 | **45.0%** |
| 일 | 2 | 14 | **14.3%** 🚨 Sunday cap 유지 중 |

### v1.8 첫날 (2026-05-13) 시작 확인

- scoring_rule=v1.8 (head_to_head 3%, elo 10%) 적용 시작
- 블로그 주간 리뷰 URL: `/reviews/weekly/2026-W20` (동적 실시간)
- 가중치 조정 결정: **없음** — v1.8 0건. n=94 (v2.0 임계 n=150까지 56건) ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460)

---

## W22 중간 점검 (2026-05-13, cycle 341 operational-analysis lite)

### 재사용 패턴 추출 (cycles 334~341)

#### anti_pattern: Versioned Label Drift After Model Upgrade
- **문제**: 가중치 파일 변경 후 파이프라인 코드의 version label 하드코딩이 자동 갱신 안 됨
- **사례**: cycle 334 (`scoring_rule='v1.6'` 하드코딩) + cycle 340 (`model_version='v1.7-revert'` fallback)
- **해결**: 버전 라벨 단일 소스 (`CURRENT_SCORING_RULE` 상수) + 파이프라인이 import 참조
- **범용성**: ML 파이프라인에서 weights 파일과 logging 코드 분리 시 공통 패턴

#### quality_guard: Supply Chain Security CI Gate
- **문제**: pnpm/action-setup semver 태그 + transitive 취약점 탐지 미자동화
- **해결**: `pnpm audit --audit-level=high` CI 필수 스텝 + actions SHA 핀 + pnpm overrides
- **결과**: 16개 CVE 차단, 향후 high severity 자동 차단 게이트

#### data_pipeline: Dual Version Field — model_version vs scoring_rule
- **발견**: `model_version='v2.0-debate'` (에이전트 고정) vs `scoring_rule` (가중치 버전) 구분
- **의미**: scoring_rule이 실질적 성과 비교 기준. v1.6(37%) 저성과가 누적 끌어내린 주범
- **범용성**: 메타-버전과 하이퍼파라미터 버전 분리 관리 패턴

### v1.8 scoring_rule 첫 배치 시작 확인

**scoring_rule별 누적 성과** (n=94 전체):
| scoring_rule | 적중 | 건수 | 적중률 | 비고 |
|---|---|---|---|---|
| v1.5 | 12 | 16 | **75.0%** | game_id 81~150 (소표본) |
| v1.6 | 17 | 46 | **37.0%** | game_id 151~3252 |
| v1.7-revert | 17 | 32 | **53.1%** | game_id 3328~3822 (5/5~5/12) |
| **v1.8** | **0** | **0** | **-** | 5/13~부터 첫 배치 (cycle 340 fix 적용) |

**핵심 발견**: cycle 340 v1.8 label fix 이전 모든 예측이 v1.7-revert로 저장됨.
v1.8 가중치 실제 적용일 = 2026-05-12 22:18 KST (cycle 335 deploy). 당일 5/12 경기는 오전 pipeline 실행 → v1.7-revert 라벨. 5/13부터 v1.8 첫 건 시작.

**전체 현황**:
- 누적 n=94, 48.9% / Brier 0.2549 (이전 0.2501에서 소폭 악화 — W22 5/12 40.0% 영향)
- v2.0 임계까지 56건 부족 (n=150 목표) ← stale: n=178 달성, v1.8 유지 확정 (cycle 1460)

**확신도 역설 재확인** (W22 5/12):
- 저확신(≤0.35): 2/2 = **100%** (HH, NC — 모두 0.30)
- 중확신(0.35~0.50): 0/1 = **0%** (KT 0.45)
- 고확신(0.50+): 0/2 = **0%** (LG 0.50, HT 0.52)

**가중치 조정 결정**: 없음 — v1.8 데이터 0건. ~~n=150 도달 후 v2.0 확정~~ ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — Brier diff < 1pp, upgrade 불필요.

---

## W22 성과 업데이트 (2026-05-13, cycle 339 operational-analysis lite)

### 주간 성과 요약

| 주차 | 날짜 | 적중률 | 비고 |
|---|---|---|---|
| **W22** | 5/12(화) | **2/5 = 40.0%** | 원정팀 4/5 압승 패턴 |
| **W22** | 5/13(수) | — | 5경기 예정 (미완료) |
| **W21** | 5/5~5/10 | **15/27 = 55.6%** | 일요일 제외 시 63.6% |
| **누적** | n=94 | **46/94 = 48.9%** | — |

### W21 요일별 분석 (신규 발견)

| 요일 | 날짜 | 적중률 | 비고 |
|---|---|---|---|
| 화 | 5/5 | 3/5 = 60% | — |
| 수 | 5/6 | 3/5 = 60% | — |
| 목 | 5/7 | 2/4 = 50% | — |
| 금 | 5/8 | **4/4 = 100%** | 완벽 적중 |
| 토 | 5/9 | 2/4 = 50% | — |
| **일** | **5/10** | **1/5 = 20%** | ⚠️ Sunday 패턴 확인 |

### 일요일 격리 효과 (핵심 발견)
- **비일요일 누적**: 45/89 = **50.6%** (n=5 일요일 제외)
- **일요일 누적**: 1/5 = **20.0%** (확인된 1개 일요일)
- **해석**: 일요일이 전체 적중률을 48.9%까지 끌어내리는 주범. 비일요일만 보면 baseline(50%) 근접.
- **Sunday cap 0.55 적용 중** — 그럼에도 20% 지속. 추가 조치 검토 필요 (n=150 이후) ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — Sunday cap 추가 조정 불필요

### W22 5/12 원정팀 압승 패턴
- 5경기 중 4경기 원정팀 압승 (5:1, 8:1, 5:1, 5:1 역전) — 비정상적 흐름
- 정답 2경기 모두 **저확신(0.3)**, 오답 3경기 모두 **고/중확신(0.45~0.52)**
- 확신도 역설 재확인: 고확신 48.1% < 저확신 53.3%

### 가중치 조정 결정
- **없음** — v1.8 (head_to_head 3%, elo 10%) 적용 직후 (5/12~). n=94 (v2.0 임계 n=150까지 56건 부족) ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460)
- **모니터링 지속**: sfr 47.3% 유해 패턴 + Sunday 20% + 저확신 역설

---

## v0.5.48.0 (2026-05-13, cycles 340-345)

### Added
- **경기 분석 동적 OG 이미지** (PR #365, cycle 345): `/analysis/game/[id]` 경기별 소셜 미리보기 이미지. AWAY vs HOME 매치업 + AI Pick 배지(predicted_winner + 확신%). CJK 폰트 제약 → 라틴 팀명 맵(OG_TEAM) + nodejs runtime 1200×630.

### Changed
- **model_version 라벨 수정** (cycle 340): pipeline fallback이 v1.7-revert → v1.8 라벨 정확히 기록하도록 수정
- **네비게이션 description 일관화** (PR #364, cycle 344): 팀·선수 / 리뷰·시즌 그룹 설명 추가. "기록" → "예측 기록" 레이블 명확화.

### Fixed  
- **소셜 프루프 가시성** (PR #363, cycle 342): picks 페이지 참여자 수 brand 색상 + CTA 텍스트 대비 강화

---

## v0.5.47.3 (2026-05-13, cycle 338 fix-incident)

### CI/CD 보안 강화 (PR #361, Fixes #360)
- **next@16.2.6**: DoS x3 (high), Middleware bypass x4 (high), SSRF (high), XSS x2 (moderate), Image Opt DoS (moderate), cache poisoning (moderate/low) — 16개 CVE 수정
- **pnpm overrides**: `fast-uri>=3.1.2` + `postcss>=8.5.10` (transitive high/moderate 제거)
- **CI audit 게이트**: `pnpm audit --audit-level=high` — 공급망 취약점 자동 차단
- **pnpm/action-setup SHA 핀**: semver 태그 → commit SHA 고정 (TanStack 공급망 침해 패턴 대응)

## W22 모델 성과 분석 (2026-05-13, cycle 337 operational-analysis lite)

### 주간 성과 요약
- **W22 (5/11~5/12, 진행 중)**: 2/5 = **40.0%** — 초반 5경기 (5/13 경기 미집계)
- **누적 (n=94)**: 46/94 = **48.9%** (n=89 대비 49.4%→48.9%, 5경기 추가)
- v1.7-revert 기준: 17/32 = **53.1%** — 안정 유지
- v1.8 최초 적용: 2026-05-13 경기부터 (W22 후속 데이터 대기 중)

### W22 5/12 주요 관찰
| 경기 | 결과 | 예측 | 확신 | 비고 |
|---|---|---|---|---|
| SS@LG | 9:1 SS 압승 | LG(홈) | 52% | 원정팀 압승 |
| NC@LT | 8:1 NC 압승 | LT(홈) | 45% | 원정팀 압승 |
| SK@KT | 5:1 SK 압승 | KT(홈) | 50% | 원정팀 압승 |
| OB@HT | 5:1 OB 압승 | OB(원정) ✓ | 30% | 적중 |
| HH@WO | 11:5 HH 압승 | HH(원정) ✓ | 30% | 적중 |

**패턴**: 5경기 중 원정팀이 4경기 압승. 저확신(30%) 예측 2개 모두 정답, 고/중확신 3개 모두 오답.

### 팩터별 방향 정확도 (전체 n=94)
| 팩터 | 방향 적중 | 신호 |
|---|---|---|
| `lineup_woba` | **78.7%** | 최강 ↑ |
| `elo` | **77.1%** | 강력 ↑ (v1.8에서 +2%) |
| `bullpen_fip` | **72.9%** | 양호 ↑ |
| `sp_fip/sp_xfip` | 55.3% | 보통 |
| `recent_form` | 54.8% | 보통 |
| `head_to_head` | 52.7% | 낮음 (v1.8에서 -2%) |
| `war` | 50.5% | 중립 |
| `park_factor` | 50.0% | 중립 |
| `sfr` | **47.3%** | 랜덤 이하 ⚠️ |

### 고확신 역전 현상 지속
- 고확신(≥0.5): 38/79 = **48.1%** ← 랜덤 이하
- 저확신(<0.5): 8/15 = **53.3%** ← 역설적으로 더 높음
- v1.6 시절부터 누적된 패턴. calibration 과제.

### 가중치 조정 결정
- **즉각 변경 없음** — v1.8 배포 직후, n=94 (v2.0 임계 n=150까지 56건 부족) ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460)
- **SFR 47.3% 관찰 지속** — 음의 기여 확인. v2.0 시 하향 후보 강화 ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — v2.0 재조정 불필요.
- **lineup_woba + elo 상향 방향 유지** — v2.0 계획 데이터 지지 ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — elo 10% 이미 적용, lineup_woba 상향 불필요.
- **Sunday cap 0.55 유지** — 일요일 14.3% 패턴 불변

---

## v1.8 가중치 조정 — head_to_head 노이즈 감축 (2026-05-12, cycle 335)

### 변경 내용
- `head_to_head`: **5% → 3%** (-2pp) — W20/W21 실측 noise 데이터 기반
- `elo`: **8% → 10%** (+2pp) — 정보가치 Δ=+0.30 최강 팩터로 보상
- `scoring_rule` 버전: `v1.7-revert` → `v1.8`
- 합계 0.85 유지

### 근거
- W20 head_to_head 방향 적중률 **35.3%** (n=17) — 랜덤(50%) 이하
- 낮은 h2h 구간(0.0~0.33)에서 저확신이 오히려 정답 (63.2% vs 37.5% 역전)
- W21 cycle 333 lesson: head_to_head noise 재확인
- cycle 231 정보가치 분석: head_to_head Δ=-0.10 (음의 기여)
- Sunday cap (cycle 309) 선례: n=150 전 방향 명확 시 선제 적용

### ~~미완료 (n=150 도달 후)~~ — 완료: v1.8 유지 확정 (cycle 1460)
- ~~전면 v2.0 재조정 (elo→13%, bullpen_fip→14%, recent_form→13% 등)~~ ← stale: n=178 도달 (cycle 1447) + plan #16 2차 fire → Brier diff 0.15% < 1pp → 재조정 불필요 결론

---

## W21 모델 성과 분석 (2026-05-12, cycle 333 operational-analysis lite)

### 주간 성과 요약
- **W21 (5/4~5/10)**: 15/27 = **55.6%** — W19 36.0% 저점 이후 2주 연속 회복
- **누적 (n=89)**: 44/89 = 49.4%, Brier 0.2501

### 요일별 패턴 (전체 n=89)
| 요일 | 적중 | 비율 | 신호 |
|------|------|------|------|
| 금 | 11/16 | 68.8% | 최강 |
| 목 | 11/19 | 57.9% | 양호 |
| 토 | 9/17 | 52.9% | 보통 |
| 수 | 4/8 | 50.0% | 보통 |
| 화 | 7/15 | 46.7% | 약간 낮음 |
| 일 | 2/14 | **14.3%** | 극단적 약점 |

### 팩터 신뢰도 (홈 우세 신호 시 실제 적중률)
- `lineup_woba`: **58.1%** (n=43) ← 최고 신뢰
- `bullpen_fip`: **55.3%** (n=38) ← 양호
- `elo`: **54.5%** (n=44) ← 양호
- `recent_form`: 51.4% (n=35) ← 보통
- `sp_fip`/`sp_xfip`: 47.4% (n=19) ← 기여 미미
- `head_to_head`: **37.5%** (n=16) ← 랜덤 이하, noise
- `sfr` (홈 우세): **37.9%** (n=29) ← 극단값 편향

### 가중치 조정 판단
- **n=89 (목표 150)**: 전면 v2.0 재조정 보류 (61건 부족) ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460)
- **head_to_head**: 37.5% (홈 우세 신호 시) = 명확한 noise 신호 → 5%→3% 하향 1순위 후보 (n=150 도달 시 즉시 적용) ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — head_to_head 3% 이미 적용, 가중치 재조정 불필요
- **Sunday cap 0.55** (cycle 309): 오늘(5/12) 배포됨 → 5/17 일요일 경기에서 첫 실측 검증 가능
- **lineup_woba**: 성과 근거로 15%→17% 상향 검토 (n=150 이후) ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — lineup_woba 상향 불필요 결론

## v0.5.47.2 (2026-05-12)
- fix(accuracy): predForPoll 쿼리에 prediction_type='pre_game' 필터 추가 — post_game 예측 혼재로 커뮤니티 vs AI 정확도 비결정적 결과 방지

## [0.5.47.1] - 2026-05-12 AI 그룹 분리 — 커뮤니티 nav 재편 (cycle 330 info-architecture-review)

### Changed
- `Header.tsx`: AI 그룹(5개) → AI(3개) + 커뮤니티(2개) 분리. AI: AI 분석/적중 기록/모델 성능. 커뮤니티: 내 픽 기록/픽 리더보드.
- `Footer.tsx`: "분석·예측" 컬럼 → "AI 예측" + "커뮤니티" 분리. "리뷰·시즌"+"서비스" → "리뷰·서비스" 통합으로 4-column 유지.

## [0.5.47.0] - 2026-05-12 커뮤니티 픽 익명 집계 강화 (cycle 327 explore-idea)

### Added
- `pick_poll_events` 테이블 (마이그레이션 025): `device_id` 기반 익명 픽 집계. 닉네임 없는 모든 방문자 참여 가능. RLS: public read / 서비스롤 write.
- `POST /api/picks/submit`: `{game_id, pick, device_id}` 검증 후 `pick_poll_events` upsert. 디바이스당 경기별 1표 보장.
- `PickButton.tsx`: `getOrCreateDeviceId()` + `handlePick()` — 픽 클릭 시 fire-and-forget POST + poll 자동 갱신.

### Changed
- `/api/picks/poll`: 집계 소스를 `user_picks` → `pick_poll_events`로 전환. 익명 사용자 포함 전체 커뮤니티 픽 집계.

## [0.5.46.7] - 2026-05-12 use-user-picks lazy init (cycle 325 review-code)

### Fixed
- `use-user-picks.ts`: `useState` lazy init으로 `setState-in-effect` anti-pattern 제거 — `useEffect`에서 `setPicks()` 호출 패턴을 `useState(() => ...)` 초기화로 교체. ESLint disable 주석 제거. `44947fd` (use-leaderboard 8차 수정)와 동일한 구조적 원인 동시 식별/제거.

## [0.5.46.6] - 2026-05-12 픽 히스토리 트렌드 차트 + 주차별 아코디언 (cycle 324 explore-idea)

### 변경 사항
- `buildPicksStats.ts`: `WeeklyGroup` 타입 추가 + `buildWeeklyHistory()` 함수 — 모든 주차 데이터 최신순 배열 반환
- `PicksTrendChart.tsx` (신규): 주차별 내 적중률 vs AI 적중률 SVG 꺾은선 차트 (의존성 0)
- `WeeklyHistorySection.tsx` (신규): 지난 주차 성과 아코디언 목록 (기본 접힘, AI 격파 배지 표시)
- `MyPicksClient.tsx`: `buildWeeklyHistory` 통합 + 두 신규 컴포넌트 삽입 (폼 도트 아래, 공유버튼 위)
- `buildPicksStats.test.ts`: `buildWeeklyHistory` unit test 6건 추가 (빈 배열/단일주/2주/weekStart=월요일/그룹별 entries/weekLabel 형식)

## [0.5.46.5] - 2026-05-12 주간 픽 요약 카드 폴리시 (cycle 323 polish-ui)

### 변경 사항
- `WeeklyPicksSummary.tsx`: resolved=0 zero-state — "결과 대기 중" 표시 (0/0 제거)
- `WeeklyPicksSummary.tsx`: aiResolved=0 시 "—" 표시 (0/0 제거)
- `WeeklyPicksSummary.tsx`: 구분선 높이 `h-10` → `self-stretch` (컨테이너 전체 높이 신장)
- `WeeklyPicksSummary.tsx`: "AI 격파!" 배지 amber → `bg-[var(--color-accent)] text-white` (DESIGN.md accent token 적용)
- `SharePicksButton.tsx`: 버튼 텍스트 "픽 성적 공유하기" 단일화

## [0.5.46.4] - 2026-05-12 픽 AI 힌트 대비 강화 (cycle 320 polish-ui)

### 변경 사항
- `PickButton.tsx`: AI 힌트 행 2열 레이아웃으로 재설계 — "AI 예측" 브랜드 컬러 레이블 + 확률 배지 + 분석 보기 링크 1행, 주요 팩터 2행
- `PickButton.tsx`: 확률 표시를 `bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300` 배지로 감싸 WCAG 대비 개선
- `SharePicksButton.tsx`: 공유/복사 버튼에 SVG 아이콘 추가 — 공유 그래프 아이콘(기본) + 체크마크 아이콘(복사됨)
- `PickButton.test.tsx`: AI 힌트 텍스트 변경에 맞춰 3개 테스트 어서션 갱신

## [0.5.46.3] - 2026-05-12 UI 폴리시 (cycle 318 polish-ui)

### 변경 사항
- `analysis/page.tsx`: 이번 주 경기 섹션 제목 한자 오기 수정 — `分析`(중국어) → `분석`(한국어)
- `NavLinks.tsx`: nav `onMouseLeave` 추가 — 마우스가 네비게이션 영역을 벗어나면 드롭다운 자동 닫힘

## [0.5.46.2] - 2026-05-12 AI 드롭다운 메가메뉴 (cycle 317 info-architecture-review)

### 변경 사항
- `Header.tsx`: `NavLink` 타입에 optional `description` 필드 추가 — backward compatible
- `Header.tsx`: AI 그룹 5개 항목에 한 줄 설명 박제 (AI 분석 / 적중 기록 / 모델 성능 / 내 픽 기록 / 픽 리더보드)
- `NavLinks.tsx`: description 있는 그룹 단일 컬럼 패널 렌더링 — label(font-medium) + description(text-xs, brand-400) 2행 표시
- `NavLinks.tsx`: 기존 2-col grid 동작 (description 없는 그룹) 유지 — 팀·선수 / 리뷰·시즌 변경 없음

## [0.5.46.1] - 2026-05-12 Sunday confidence cap (cycle 309 explore-idea)

### 변경 사항
- `judge-agent.ts`: 일요일 confidence 상한 0.55 추가 (기존 0.65+ → 0.55 캡)
  - 데이터 근거: 일요일 누적 적중률 n≈20 ~15%, W20 1/5=20% — n=150 전 선제 단독 적용
  - 일요일 게임 시 `calibrationApplied` 에 `'일요일 상한 0.55'` 자동 기록
- `agents-judge-sunday-cap.test.ts`: 신규 테스트 8건 (일요일/평일/context없음/캡 경계값)

## W20 모델 학습 포인트 - 2026-05-12 (cycle 308 operational-analysis)

### W20 성과 (2026-05-05~05-10, n=26 확인)
- **주간 적중률**: 15/26 = **57.7%** (누적 49.4% 대비 +8.3%p)
- **금요일**: 4/4 = 100% (최고)
- **일요일**: 1/5 = **20%** — 누적 일요일 적중률 악화 중 (n=18~20 전체 평균 ~22%)
- **신뢰도 역전 심화**: 0.55-0.59 구간 1/5=20%, 0.60+ 구간 2/3=67% (역전 지속)

### 팀별 패턴 (W20)
- **주목**: 두산(1/4=25%), 키움(0/2=0%) — 과대 가중치 or 최근 하락세 미반영 가능성
- **안정**: 한화(4/4=100%), KIA(2/2=100%) — 예측 신뢰 구간 높음

### 가중치 조정 결정
- **보류**: n=89 (target n=150). 소표본 경고 유효. W21 이후 추가 데이터 누적 후 판단 ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — 판단 완료, 재조정 불필요.
- **선제 검토 후보**: judge-agent `Sunday confidence_clamp` 0.65→0.55 (n=150 전 단독 적용 검토) ← stale: Sunday cap 0.55 이미 적용 (cycle 309), n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460).

### 전체 누적 캘리브레이션 현황 (n=89)
| 신뢰도 구간 | 적중 | 총 | 적중률 |
|---|---|---|---|
| 0.60+ | 8 | 12 | 66.7% ✓ |
| 0.55-0.59 | 10 | 23 | 43.5% ⚠️ 역전 |
| 0.50-0.54 | 20 | 42 | 47.6% |
| 0.40-0.49 | 6 | 12 | 50.0% |

## [0.5.46.0] - 2026-05-12 픽 공유하기 + 연속 픽 참여일 (cycle 306 explore-idea)

### 변경 사항
- `SharePicksButton.tsx`: 신규 — Web Share API + 클립보드 fallback, 내/AI 성과 + 결과 URL 공유 텍스트 생성
- `buildPicksStats.ts`: `pickingStreakDays` 필드 추가 — KST 기준 연속 픽 참여일 계산 (오늘/어제 기준 활성)
- `MyPicksClient.tsx`: 보조 요약 카드 3열 전환 (연속 정답 / 연속 참여일 / 총 픽), 공유하기 버튼 삽입
- `buildPicksStats.test.ts`: `pickingStreakDays` 테스트 6건 추가 (vitest fake timers 활용)

## [0.5.45.2] - 2026-05-12 ESLint CI 수정 (cycle 305 fix-incident)

### 변경 사항
- `use-user-picks.ts`: useEffect 내 localStorage 동기 읽기 후 `setPicks()` — `react-hooks/set-state-in-effect` disable 주석 추가 (유효한 패턴)
- `MyPicksClient.tsx`: picks 빈 배열 조기 반환 경로의 `setLoading(false)` — 동일 규칙 disable 주석 추가 (async fetch 없는 early-return 경로)

## [0.5.45.1] - 2026-05-12 내 픽 기록 UI 개선 (cycle 304 polish-ui)

### 변경 사항
- `/picks` 요약 카드 계층 분리: 내/AI 적중률 히어로 카드(브랜드 보더 + text-3xl) + 연속 정답/총 픽 보조 카드(text-xl)
- 로딩 상태 스켈레톤: `animate-pulse` 기반 구조 일치 스켈레톤 (히어로 2 + 보조 2 + 폼 도트 + 행 4)
- 빈 상태 아이콘: 브랜드 원형 컨테이너 안 야구공 SVG 아이콘 추가
- 픽 목록 AI 픽 컬럼: 모바일에서도 표시 (`hidden sm:inline` 제거)
- 네트워크 오류 소프트 배너: 결과 API 실패 시 앰버색 안내 표시 + 픽 이력 계속 노출

## [0.5.45.0] - 2026-05-12 내 픽 기록 페이지 (cycle 302 explore-idea heavy)

### 변경 사항
- `/picks` 신규 페이지: localStorage 픽 이력 전체 조회 + 성과 분석
- 요약 카드 4종: 내 적중률 / AI 적중률 / 현재 연속 정답 / 총 픽
- 최근 10경기 폼 도트 시각화 + 상승/하락 추세 감지
- 픽 이력 목록: 날짜 / 경기 / 내 픽 / AI 픽 / 결과 비교
- `GET /api/picks/results?ids=...` 엔드포인트: 픽한 경기 결과 배치 조회
- `UserVsAIScorecard` 하단에 "전체 이력 →" 링크 추가 (홈페이지 진입점)
- 헤더 AI 그룹에 "내 픽 기록" 추가, 푸터 분석·예측 컬럼에 추가
- `buildPicksStats.ts` 순수 함수 라이브러리 + 12 unit tests

## [0.5.44.1] - 2026-05-12 헤더 AI 기능 그룹화 (cycle 301 info-architecture-review)

### 변경 사항
- 헤더 내비게이션 재편: `AI 분석` 단일 링크 → `AI ▾` 드롭다운 그룹 (AI 분석 / 적중 기록 / 모델 성능)
- `리뷰·시즌` 그룹 7개 항목 → 5개 (accuracy + dashboard AI 그룹으로 이동)
- 푸터 `분석·예측` 컬럼에 적중 기록 / 모델 성능 추가, `서비스` 컬럼 정리
- `docs/design/ia-2026-05-12-ai-nav-group.md` IA spec 추가

## [0.5.44] - 2026-05-12 Pick vs AI 게임화 기능 (cycle 298 explore-idea heavy)

### 변경 사항
- `useUserPicks` 훅: localStorage `mb_user_picks_v1` 기반 picks CRUD + 30일 만료 자동 정리
- `PickButton` 컴포넌트: 예약 경기 카드 하단 원정/홈 픽 버튼 (PredictionCardLive 통합)
- `UserVsAIScorecard` 컴포넌트: 홈 페이지 "AI와 대결" 섹션 — 어제 내 성적 vs AI 성적 비교 + 시즌 AI 적중률
- 8 unit tests: useUserPicks 초기화/setPick/getPick/만료/손상 JSON 처리 등 전체 경로 커버

## [0.5.43] - 2026-05-12 /accuracy 최근 예측 폼 섹션 추가 (cycle 295 explore-idea heavy)

### 변경 사항
- `/accuracy` 최근 20경기 예측 폼: 적중/실패 도트 시각화 + 전체 적중률 대비 현재 폼 강조
- 추세 감지: 최근 10경기 vs 이전 10경기 비율 차 ±10% 기준 ▲상승/▼하락/flat 표시
- `buildRecentForm()` 순수 함수 추가 (기존 `buildWeeklyTrend` 패턴 동일 구조)

## [0.5.42] - 2026-05-12 /accuracy 요일별 막대차트 50% 기준선 + 컬러 범례 + border 토큰 정렬 (cycle 293 polish-ui)

### 변경 사항
- `/accuracy` 요일별 적중률 섹션: 막대 높이 스케일 `acc*80` → `acc*100` 수정 (정확한 100% 컨테이너 비례)
- 50% 기준선: 점선 절대위치 (`bottom: 50%`) 추가 — 기준 이상/이하 직관적 비교
- 컬러 범례: 텍스트 각주 → 시각 인라인 범례 (brand-500/neutral-400/red-400 + 기준선 기호)
- 주별 트렌드·팀별 성과 테이블 border: `border-gray-100/800` → `border-[var(--color-border)]` 디자인 토큰 정렬

## [0.5.41] - 2026-05-12 W20 주간 분석 + 패턴 추출 4건 (cycle 290 operational-analysis lite)

### 학습 포인트 (W20: 2026-05-05~05-10)

- **W20 적중률**: 15/27 = **55.6%** (Brier 0.2542)
- **전체 누적**: 44/89 = **49.4%** (Brier 0.2501), n=76→89 (+13건)
- **고확신 역전 패턴 지속**: conf≥55% → 37.5%, conf<55% → 63.2%. 모델이 자신있게 예측할수록 오히려 틀림.
- **일요일 취약 심화**: W20 5/10(일) 1/5 = 20%. 누적 일요일 ~2/13 ≈ 15%. 비선발 피로 + 팀 불균형 가중.
- **head_to_head 노이즈 확인**: W20 방향 적중 35.3% (랜덤 이하). v2.0에서 5%→3% 하향 evidence 추가.
- **금요일 강세**: W20 4/4 = 100%. 주중 경기 (화~수 60%) 대비 극단적 차이.
- **팀별**: HT 83.3%, HH 75%, KIA 66.7% 상위 / OB 33.3%, KT·SSG 40% 하위.
- **sp_fip/sp_xfip 데이터 부족**: 30경기 중 8건만 방향 있음. SP 확정 시점 파이프라인 이슈 지속.

### v2.0 진행 상황

- 누적 89건 (목표 n=150+). 잔여 61건 → 예상 4주 추가 관찰 필요. ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460).
- 가중치 변경 없음 (소표본). ~~n=150 도달 시 operational-analysis heavy 재실행 예정~~ ← stale: n=178 도달 (cycle 1447), heavy 재실행 완료 (cycle 1460 plan #16 2차 fire) → v1.8 유지 확정.

### 패턴 추출 (gstack learnings 등록)

- **[quality_guard] new-page-3cycle-cleanup-pipeline**: 신규 페이지 ship 후 design token drift + assertSelectOk 미적용이 매번 2사이클 연속 발생. PR 체크리스트로 예방 가능.
- **[anti_pattern] confidence-inversion-high-conf-underperforms**: 고확신(≥55%) < 저확신 적중률 역전 지속. ~~calibration curve re-fit 필요 (n=150 도달 후)~~ ← stale: v1.8 유지 확정 (cycle 1460) — re-fit 불필요 결론 (Brier diff < 1pp).
- **[data_pipeline] day-of-week-prediction-bias-sunday**: 일요일 ~15% 구조적 취약. judge-agent max_confidence 일요일 cap 0.55 적용 검토.
- **[anti_pattern] head-to-head-factor-systematic-noise**: W20 방향 적중 35.3% — 랜덤 이하. v2.0 가중치 5%→3% 하향 evidence 충분.

## [0.5.40] - 2026-05-12 공개 AI 적중률 대시보드 /accuracy 신규 (cycle 287 explore-idea heavy)

### 추가

- `apps/moneyball/src/app/accuracy/page.tsx` — 공개 AI 적중률 대시보드
  - 캘리브레이션 SVG (신뢰도 0.4~1.0 구간별 실제 적중률 vs 이상적 대각선)
  - 주별 트렌드 테이블 (최근 8주 ISO week 기준, 예측수·정답수·적중률)
  - 팀별 성과 테이블 (`buildAllTeamAccuracy` 재사용, 적중률 내림차순)
  - 4개 요약 stat 카드 (전체 예측수·전체 적중률·최고 주별 적중률·Brier Score)
  - ISR revalidate=3600, 공개 anon client (SUPABASE_SERVICE_ROLE_KEY 미사용)
  - OG/canonical 메타데이터, FAQPage JSON-LD 디스클레이머 footer
- `apps/moneyball/src/app/analysis/page.tsx` — /accuracy CTA 카드 섹션 추가

### 검증

type-check + 876 tests (shared 73 + kbo-data 562 + moneyball 241) PASS.

## [0.5.39] - 2026-05-08 shortName silent drift fix — meta.name.split → shortTeamName 통일 (cycle 274 review-code heavy)

### 수정

- `apps/moneyball/src/lib/teams/buildTeamProfile.ts:113,350`
- `apps/moneyball/src/lib/matchup/buildMatchupProfile.ts:165,171` (+ shortTeamName import)
- `apps/moneyball/src/lib/players/buildPitcherProfile.ts:198`
- `apps/moneyball/src/lib/players/buildBatterLeaderboard.ts:83` (+ shortTeamName import)
- `apps/moneyball/src/lib/players/buildPitcherLeaderboard.ts:189` (+ shortTeamName import)

5 파일 7곳 inline `meta.name.split(" ")[0]` → canonical helper `shortTeamName(code)` 일괄 교체. 페이지 컴포넌트 (`app/teams/[code]/page.tsx:295`) + 다른 lib (reviews/buildMissReport, buildMonthlyReview, buildWeeklyReview) 는 이미 `shortTeamName` 사용 중이었음 — lib (teams/matchup/players) 만 inline split 으로 drift.

### 검증

전체 10팀 `meta.name.split(" ")[0]` vs `KBO_TEAM_SHORT_NAME[code]` 결과 일치 확인 (출력 동일). 사용자 가시 변화 0. type-check + 876 tests (shared 73 + kbo-data 562 + moneyball 241) PASS.

### 의도

cycle 264~271 silent drift family detection 7번째. 같은 패턴 — canonical helper 가 있는데 inline 중복 구현 누적. KBO_TEAMS 메타 또는 KBO_TEAM_SHORT_NAME 테이블 일방 변경 시 7곳이 drift 가능 (예: 팀 리브랜드 — "KT 위즈" → "kt wiz" 변경 시 split 결과 = "kt", short table 갱신 안 하면 mismatch).

## [0.5.38] - 2026-05-08 W19 최종 성과 + SFR 극단값 편향 패턴 박제 (cycle 256 operational-analysis lite)

### 예측 성과 — W19 최종 (2026-05-05~05/07, 14경기)

**W19 최종**: 8/14 = **57.1%** ← 시즌 평균(48.6%) 대비 +8.5%p
**시즌 누적 (76건, v1.5)**: ~48.7% (cycle 231 72건 기준 48.6% + W19 증분)

#### W19 시리즈별 결과

| 시리즈 | 성적 | 비고 |
|---|---|---|
| LG vs 두산 | 3/3 = **100%** | 연속 3경기 완벽 |
| KT vs 롯데 | 2/2 = **100%** | 선발 FIP 신호 정확 |
| KIA vs 한화 | 2/3 = **66.7%** | 1경기 SFR 신호 오류 |
| 삼성 vs 키움 | 1/3 = **33.3%** | head_to_head=0.4 신호 무시됨 |
| SSG vs NC | **0/3 = 0%** | SFR 극단값(0.72~1.0)이 head_to_head(NC 우세) 오버라이드 |

#### 주요 패턴 (박제)

1. **SFR 극단값 편향 (신규)**: SSG vs NC 3연전에서 `sfr=0.72→0.72→1.0` 극단값이 누적되며 홈 SSG 예측을 고착화. 3경기 모두 `head_to_head=0.33` (NC 상대전적 우세) 신호가 존재했으나 SFR에 오버라이드됨.
   - **원인 추정**: SFR(수비효율) 지표가 단기 시계열 노이즈에 민감 — 한 팀의 SFR이 극단적으로 높을 때 모델이 과신하는 패턴.
   - **action**: n=150 도달 후 heavy 분석 시 SFR 임계값(>0.7) 케이스 별도 분류 + 가중치 재검토. ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — SFR 재검토 불필요.

2. **head_to_head 저평가 패턴 지속**: SSG vs NC / 삼성 vs 키움 양 시리즈에서 `head_to_head < 0.45` 신호가 실제 방향을 옳게 가리켰으나 SFR/recent_form에 묻힘. cycle 231 결론("head_to_head 5%→3% 감소 후보")과 **상충** — 이 주 데이터에선 head_to_head가 오히려 더 신뢰할 만함.

3. **일요일 저적중 패턴 지속**: 전체 누적 일요일 적중률 1/8 = 12.5% (4번째 확인). ~~n=150 도달 후 `judge-agent.ts` 일요일 confidence clamp 조정 검토 예정~~ ← stale: n=178 도달 (cycle 1447), v1.8 유지 확정 (cycle 1460) — 이 clamp 조정은 독립 carry-over (가중치 재조정과 무관).

4. **n=76 / 150 (50.7% 진행)**: v2.0 가중치 확정 임계 미달. 이번 주 분석은 soft warning 박제만 — 공식 가중치 변경 없음. ← stale: 최종 n=178 / 178 달성 (cycle 1447) + v1.8 유지 확정 (cycle 1460).

## [0.5.37] - 2026-05-07 /analysis 이번 달 AI 최고 픽 카드 추가 (cycle 249 explore-idea lite)

### Added

- **`/analysis` 이번 달 AI 최고 픽 카드**: 이달 가장 자신 있게 맞춘 예측을 이번 주 최고 픽 카드와 동일한 UI로 표시. `getBestPickOfWeek(month range)` 재사용 — 주간 최고 픽과 동일 경기인 경우 중복 숨김 (`bestPickOfMonth.gameId !== bestPickOfWeek?.gameId`).

## [0.5.36] - 2026-05-07 buildTeamAccuracy + getVerifiedPredictions CURRENT_MODEL_FILTER 누락 수정 (cycle 248 review-code heavy)

### Fixed

- **`buildTeamAccuracy` CURRENT_MODEL_FILTER 누락**: `/standings` 팀별 예측 적중률이 이전 모델 버전 예측까지 포함해 집계하던 silent drift 수정. `buildAllTeamAccuracy()` 쿼리에 `.match(CURRENT_MODEL_FILTER)` 추가.
- **`getVerifiedPredictions` CURRENT_MODEL_FILTER 누락**: `/reviews` 최근 예측 목록이 전 버전 데이터를 섞던 silent drift 수정. `reviews/page.tsx` 인라인 쿼리에 `.match(CURRENT_MODEL_FILTER)` 추가.
- **`buildTeamAccuracy.test.ts` 보강**: `match(CURRENT_MODEL_FILTER)` 호출 검증 테스트 케이스 추가. cycle 245 (getMonthlyStats) / 247 (getSeasonAccuracy) 와 동일 패턴의 세 번째 발견.

## [0.5.35] - 2026-05-07 WeeklyGameResult brand token 정렬 + details/summary 연속성 (cycle 240 polish-ui)

### Changed

- **WeeklyGameResult 디자인 토큰 정렬**: `/reviews/weekly/[week]` 경기 목록 섹션의 "적중" 뱃지·통계·팩터 라벨이 사용하던 `text-green-*`/`bg-green-*` raw Tailwind 클래스를 `brand-500`/`brand-600`/`brand-300` 브랜드 토큰으로 교체. DESIGN.md "적중 표시 = brand-500" 규칙 준수 (cycle 65 박제).
- **팩터 인사이트 카드 완전 이관**: `border-green-500/30` → `border-brand-500/30` 로 best-factor 카드 테두리도 동일 토큰 계열로 통일.
- **WCAG AA 대비율 보정**: 다크 모드 `dark:text-brand-400` (#3d8b54 on #151d18 = 4.11:1) → `dark:text-brand-300` (#5aad70 = ≥4.5:1), xs 텍스트 AA 기준 충족.
- **details/summary 시각 연속성**: 경기 목록 열림 시 summary 헤더와 콘텐츠가 하나의 카드처럼 보이도록 `group-open:rounded-b-none` / `group-open:mt-0 group-open:rounded-t-none group-open:border-t-0` 추가.

## [0.5.34] - 2026-05-07 주간 리뷰 전체 경기 목록 섹션 추가 (cycle 239 explore-idea)

### Added

- **주간 리뷰 전체 경기 목록**: `/reviews/weekly/[week]` 페이지에 접을 수 있는 "이번 주 전체 경기" 섹션 추가. 해당 주의 모든 예측 경기를 날짜 순으로 나열 — 원정/홈 팀 로고·이름·스코어, 예측 승자·신뢰도, 적중/빗나감/미결 badge, 각 경기 분석 페이지 링크.
- **`WeeklyGameResult` 타입**: `buildWeeklyReview` 가 `games: WeeklyGameResult[]` 배열을 반환. 기존 3개 하이라이트 외 전체 경기 데이터를 UI에 노출.
- **native `<details>/<summary>` 접기**: 클라이언트 컴포넌트 없이 Server Component 상태 유지 — 하이드레이션 비용 0.

## [0.5.33] - 2026-05-07 getYesterdayKST off-by-1 수정 (cycle 232 review-code heavy)

### Bug Fix

- **`getYesterdayKST` off-by-1**: UTC 서버에서 `d.getDate()` = UTC day이지만, KST 자정(`T00:00:00+09:00`)은 UTC 전날 15:00 → `setDate(getDate()-1)` 이 2일 소급하는 버그.
  - 영향: `recent form` 필터가 2일치 더 제외됨 (daily.ts 라인 528)
  - 영향: 아침 `postview cleanup` 이 하루 이른 날짜 처리 (daily.ts 라인 256)
  - 수정: `toKSTDateString(new Date(d.getTime() - 86_400_000))` — 정확히 24h 빼고 KST 변환
- **`updateAccuracy` assertSelectOk 통일**: 직접 `.error` 패턴 → `assertSelectOk` try/catch 일관화

## [0.5.32] - 2026-05-07 W19 부분 성과 + 팩터 유효성 재검토 (cycle 231 operational-analysis heavy)

### 예측 성과 — 2026 시즌 누적 (72건, 4/16~5/6)

**W19 진행 중 (5/5~5/6 완료, 5/7~ 미결)**: 6/10 = **60.0%** ← 이번 주 (화·수)
**시즌 누적 (72건)**: 35/72 = **48.6%** (기저율 50% 미만 — 모델 개선 필요)

#### W19 경기별 결과

| 날짜 | 원정 @ 홈 | 예측 | 정답 |
|---|---|---|---|
| 5/5(화) | OB @ LG | LG(0.45) | ✅ |
| 5/5(화) | NC @ SK | SSG(0.52) | ❌ |
| 5/5(화) | WO @ SS | 키움(0.42) | ❌ |
| 5/5(화) | LT @ KT | KT(0.50) | ✅ |
| 5/5(화) | HH @ HT | 한화(0.52) | ✅ KIA 실제 승 |
| 5/6(수) | OB @ LG | LG(0.60) | ✅ |
| 5/6(수) | NC @ SK | NC(0.55) | ❌ |
| 5/6(수) | WO @ SS | 키움(0.45) | ✅ |
| 5/6(수) | LT @ KT | 롯데(0.52) | ✅ |
| 5/6(수) | HH @ HT | KIA(0.58) | ❌ |

#### 팩터 유효성 재검토 — 실측 게임 아웃컴 기반 정보가치 분석 (n=72)

**방법론**: `Δ = 팩터방향일치 적중률 - 팩터방향불일치 적중률` (양수 = 유용한 팩터)

| 팩터 | 현 가중치 | 정보가치 Δ | 결론 |
|---|---|---|---|
| **elo** | 8% | **+0.30** | ✅ 최강 예측팩터 (이전 분석 감소 후보 → 번복) |
| **bullpen_fip** | 10% | **+0.26** | ✅ 2위 유용 팩터 |
| **recent_form** | 10% | **+0.20** | ✅ 3위 유용 팩터 |
| lineup_woba | 15% | +0.06 | 유지 (약한 양의 신호) |
| sfr | 5% | -0.02 | 중립 |
| war | 8% | -0.12 | ⚠️ 약한 마이너스 |
| **head_to_head** | 5% | **-0.10** | ⚠️ 마이너스 (이전 분석 증가 후보 → 번복) |
| **sp_fip** | 15% | **-0.15** | ❌ 최고 가중치인데 마이너스 |
| **sp_xfip** | 5% | **-0.15** | ❌ 마이너스 |
| **park_factor** | 4% | **-0.15** | ❌ 마이너스 |

#### v2.0 가중치 후보 — 기존 vs 재검토

| 팩터 | 현재 | 기존 v2.0 후보 (cycle 228) | 재검토 (cycle 231) |
|---|---|---|---|
| head_to_head | 5% | → 8% ↑ | → 3% ↓ (정보가치 Δ=-0.10) |
| elo | 8% | → 5% ↓ | → 13% ↑ (정보가치 Δ=+0.30 최강) |
| bullpen_fip | 10% | 유지 | → 14% ↑ (Δ=+0.26) |
| recent_form | 10% | 유지 | → 13% ↑ (Δ=+0.20) |
| sp_fip | 15% | 유지 | → 8% ↓ (Δ=-0.15) |
| lineup_woba | 15% | → 12% ↓ | → 12% ↓ (Δ=+0.06 약한 양수) |
| war | 8% | 유지 | → 5% ↓ (Δ=-0.12) |
| sp_xfip | 5% | 유지 | → 3% ↓ (Δ=-0.15) |
| sfr | 5% | → 3% ↓ | → 5% (Δ=-0.02 중립) |
| park_factor | 4% | → 2% ↓ | → 2% ↓ (Δ=-0.15) |

**주의**: n=72 소표본. 95% CI 넓음. elo Δ=+0.30은 강한 신호이나 최종 적용 전 n=150+ 권장.

#### 요일별 적중률 (확인)

| 요일 | 적중률 | 비고 |
|---|---|---|
| 목 | 9/15 = 60% | 최고 |
| 금 | 7/12 = 58% | |
| 토 | 7/13 = 54% | |
| 화 | 7/15 = 47% | |
| 수 | 4/8 = 50% | W19 수요일 4/10 (두 분석 기간 다름) |
| **일** | **1/9 = 11%** | ← 계통적 실패 지속 확인 |

#### 팀별 적중률 (cycle 231 기준, 참여 경기)

| 팀 | 적중률 |
|---|---|
| KT | 9/15 = 60% ↑ |
| OB, HH | 8/14 = 57% |
| LG | 7/13 = 54% |
| HT | 8/15 = 53% |
| WO | 7/17 = 41% |
| **SK, SS** | **5/14 = 36%** ↓ |

### 학습 포인트

1. **elo는 최강 예측팩터** — cycle 228 분석의 "elo 감소" 후보는 방법론 차이로 오도됨. 실측 게임 아웃컴 기반 분석에서 Δ=+0.30으로 1위.
2. **sp_fip 역설** — 가장 높은 가중치(15%)이지만 정보가치 Δ=-0.15로 마이너스. SP FIP 데이터 적시성 문제(당일 확정 선발이 FanGraphs 업데이트 전) 가능성.
3. **일요일 11% 지속** — 3회 일요일 관찰. 3연전 SP 로테이션/불펜 피로 가설 유효. 100건 이후 confidence_clamp 적용 검토.
4. **n=72 경고** — 각 팩터 추정치의 95% CI ≈ ±15%p. v2.0 적용 전 추가 데이터 수집 권장.

---

## [0.5.31] - 2026-05-07 W20 심층 성과 분석 (cycle 228 operational-analysis heavy)

### 예측 성과 — 2026 시즌 누적 (72건, 4/16~5/6)

**시즌 누적 (72건)**: 35/72 = **48.6%** · Brier 0.2494
**W20 진행 중 (5/5~5/6 완료)**: 6/10 = **60.0%** · Brier 0.2562
**W19 (4/28~5/3)**: 9/25 = **36.0%** ← 이상 급락
**W18 (4/21~4/27)**: 11/26 = **42.3%**
**W17 (4/14~4/20)**: 9/11 = **81.8%** ← 초기 고성능 (소표본 효과)

#### 신규 발견 1 — 일요일 계통적 실패 (1/9 = 11%)

| 일요일 | 경기 | 결과 |
|---|---|---|
| 2026-04-19 | 롯데 vs 한화 | X |
| 2026-04-26 | NC vs 삼성 / 한화 vs SSG / KT vs 키움 | XXX |
| 2026-05-03 | SSG vs KT / NC vs 롯데 / KIA vs 삼성 / 두산 vs 키움 / 한화 vs LG | X X X X O |

**전체**: 1/9 = 11.1% (vs 시즌 평균 48.6%). 가설: 일요일 = 3연전 마지막 경기. SP 로테이션 3번째 + 불펜 피로 누적 + 홈팀 주전 휴식 → 정량 팩터가 실제 경기력을 미반영.

**권장 대응**: judge-agent.ts 에서 일요일 경기 `confidence_clamp` 상한을 0.65 → 0.55 로 축소 고려 (통계 임계 100건 도달 후 적용 판단). ← stale: n=178 달성 후 v1.8 유지 확정 — confidence_clamp 조정 미적용 (separate layer 로 검토 예정)

#### 신규 발견 2 — 팀별 적중률 편차

| 팀 | 홈 | 원정 | 전체 |
|---|---|---|---|
| 롯데 | 6/9=67% | 3/6=50% | **9/15=60%** ↑ |
| LG | 3/6=50% | 5/8=62% | **8/14=57%** ↑ |
| KT | 4/6=67% | 4/8=50% | **8/14=57%** ↑ |
| 두산 | 6/9=67% | 1/4=25% | 7/13=54% |
| NC | 5/9=56% | 3/6=50% | 8/15=53% |
| 삼성 | 1/4=25% | 5/9=56% | 6/13=46% |
| 키움 | 2/4=50% | 5/11=45% | 7/15=47% |
| 한화 | 3/9=33% | 4/8=50% | 7/17=41% |
| KIA | **2/8=25%** | 3/6=50% | **5/14=36%** ↓ |
| SSG | 3/8=38% | 2/6=33% | **5/14=36%** ↓ |

KIA 홈 25% / SSG 36% = 구조적 예측 실패. Elo rating stale 가설 (KIA 최근 2시즌 전력 변동 / SSG 장기 슬럼프).

#### 팩터 유효성 — v2.0 후보 확정 (100건 도달 후 적용) ← stale: v1.8 유지 확정 (cycle 1460) — 아래 재배분 미적용

| 팩터 | 방향성 차이 | 현 가중치 | v2.0 후보 |
|---|---|---|---|
| `head_to_head` | **+0.0432** (최고) | 5% | → **8%** ↑ |
| `war` | +0.0135 | 8% | 유지 |
| `sp_fip` | +0.0101 | 15% | 유지 |
| `sp_xfip` | +0.0107 | 5% | 유지 |
| `bullpen_fip` | +0.0106 | 10% | 유지 |
| `recent_form` | +0.0100 | 10% | 유지 |
| `lineup_woba` | +0.0040 | **15%** | → **12%** ↓ |
| `elo` | +0.0031 | **8%** | → **5%** ↓ |
| `sfr` | +0.0009 | 5% | → **3%** ↓ |
| `park_factor` | **+0.0000** | 4% | → **2%** ↓ |

가중치 변경 시 총합 = 100%. 재배분 방향: head_to_head +3% 흡수 (lineup_woba -3% / elo -3% / sfr -2% / park -2% → 합 -10%, 남은 -7% 는 bullpen +2% / recent_form +2% / sp_fip + sp_xfip +1% 씩 흡수 예정). **100건 도달 후 CI95 재측정 후 최종 확정.** ← stale: 이 재배분 미적용. v1.8 유지 확정 (cycle 1460). head_to_head 최종 5%→3% (cycle 335), elo 8%→10%.

#### Calibration 현황 (72건)

| Confidence | 실제 적중률 | 이상적 |
|---|---|---|
| 0.4 | 0/1 = 0% | 40% |
| 0.5 | 19/41 = 46.3% | 50% |
| 0.6 | 16/30 = 53.3% | 60% |

전반적으로 모델이 과신(over-confident) 경향. 특히 conf=0.5 구간이 이상적 대비 3.7%p 부족.

#### 100건 임계 도달 예상

현재 72건 → 잔여 28건 → 일 5경기 기준 → **2026-05-11~5/12** 도달 예상.

### 운영 노트

- **중복 예측 행 발견**: predictions 테이블에 동일 game_id 중복 행 53건 (각각 is_correct null). 이는 다중 predict 파이프라인 run 의 race condition 결과. 정확도 측정에는 영향 없음 (이미 verified 72건 기준 집계). ON CONFLICT DO NOTHING 이 동시 insert 시 race condition 미완전 차단 사례.

## [0.5.30] - 2026-05-07 헤더 드롭다운 접근성 개선 + 브랜드 토큰 정렬

### 변경 사항

- **NavLinks 드롭다운 접근성**: CSS-only `group-hover:block` 방식을 React `useState` 기반으로 전환. `aria-expanded`, `aria-controls`, `role="menu"`, `role="menuitem"`, `aria-labelledby` 추가. Escape 키로 드롭다운 닫기, 외부 클릭 시 닫기, 라우트 변경 시 닫기 지원. 스크린리더 및 키보드 사용자 모두 네비게이션 드롭다운 인식 가능.
- **브랜드 토큰 정렬**: `text-green-600`/`bg-green-100`/`text-green-700` → `text-emerald-600`/`bg-emerald-100`/`text-emerald-700` (DESIGN.md `success: #10b981` = Tailwind emerald-500/600 기준). PredictionCard 적중 배지, ModelTuningInsights 상관계수·가중치 델타 지표 2곳 수정.

## [0.5.29] - 2026-05-07 normalize() 음수 입력값 버그 수정

### 예측 엔진 버그 수정 (cycle 208 fix-incident)

**파일**: `packages/kbo-data/src/engine/predictor.ts`

`normalize()` 함수의 양수 전용 비율 공식(`a/(|a|+|b|)`) 이 `higherIsBetter=true` + `homeVal<0` 시
팩터값 음수 반환하는 버그 수정. KBO SFR 지표는 평균 대비 상대값으로 음수 가능.

**수정 내용**: 차이 기반 정규화 `(home-away)/(|home|+|away|) → [-1,1] → [0,1]` 로 교체.
- 양수 전용 입력과 수학적 동치 증명: `((a-b)/(a+b)+1)/2 = a/(a+b)` ← 완전 backward compatible
- 음수 SFR 입력에서 팩터 [0,1] 범위 보장
- 신규 테스트 4개 추가 (홈열세/홈우세/양팀음수/전체팩터≥0)

**영향**: 72건 중 6건 음수 SFR 팩터 수정 (단일 경기 최대 ±4.2pp). Brier 영향 미미.

557 → 561 tests all pass.

## [0.5.28] - 2026-05-07 주간 성과 분석 (W19)

### 예측 성과 — 2026 시즌 누적 (cycle 207 operational-analysis)

**이번 주 (W19: 5/5~5/6 완료 10경기)**: 6/10 = **60.0%** · Brier 0.2561
**지난 주 (W18: 5/1~5/3)**: 9/25 = **36.0%** ← 이상 급락
**4월 이후 누적 (72건)**: 35/72 = **48.6%** · Brier 0.2494

#### W18 급락 원인 분석

W18 36.0% 급락은 **3개 반복 실패 매치업** 집중:
- **SSG(홈) vs 롯데**: 3연전 전패 예측 (0/3) — 모델이 SSG 우세로 연속 평가했지만 롯데 3연승
- **키움(홈) vs 두산**: 2연전 엇갈림 (1/2) — 방향 혼선
- **KIA(홈) vs KT**: 2경기 1패 — KT 강세 과소평가

매치업 정확도 0% 패턴 3개 (삼성vsSSG / 키움vs삼성 / SSGvs롯데) → **특정 팀 pair 구조적 예측 실패** 신호.

#### 팩터 유효성 진단 (72건)

| 팩터 | 방향성 차이(correct-wrong) | 현 가중치 | 평가 |
|---|---|---|---|
| `head_to_head` | **+0.0432** (최고) | 5% | ↑ 과소평가 가능성 |
| `war` | +0.0135 | 8% | 적정 |
| `sp_fip` / `sp_xfip` | +0.010 | 15% / 5% | 적정 |
| `bullpen_fip` | +0.011 | 10% | 적정 |
| `elo` | +0.003 (최저) | 8% | ↓ 효과 미미 |
| `sfr` | avg=0.202, 범위 -0.833~1.0 | 5% | **이상값 확인 필요** |

#### SFR 팩터 이상값 (버그 후보)

`predictor.ts:normalize(homeVal, awayVal, true)` = `homeVal / (|homeVal|+|awayVal|)`.
SFR 원값이 음수일 때 팩터값도 음수 가능 (예: -5SFR / (-5+3) = -0.625). 72건 중 **6건 음수 SFR 팩터 존재** → normalize 함수가 음수 입력값 미처리. v1.5 가중치에서 SFR 5%이므로 영향 미미하나, 개념적 오류.

#### Calibration 진단

| Confidence 구간 | 실제 적중률 | 이상적 |
|---|---|---|
| 0.4 | 54.5% (6/11) | 40% — **과도하게 높음** |
| 0.5 | 41.9% (13/31) | 50% — 낮음 |
| 0.6 | 53.3% (16/30) | 60% — 낮음 |

전반적으로 confidence 0.5 구간 예측이 실제보다 과신. 모델이 "박빙" 경기를 낮게 확신하면서 오히려 맞추고, "보통" 경기를 중간 확신하면서 못 맞추는 역설적 패턴.

#### 가중치 조정 판단

**현 시점 보류 (72건 < 100건 임계)** ← stale: n=178 달성, v1.8 유지 확정 (cycle 1460). 아래 checkpoint 미적용. 통계적 신뢰구간 너무 넓음. 단, 다음 checkpoint 기준:
- head_to_head 5% → 8% 상향 후보 (가장 높은 방향성 차이) ← stale: 최종 5%→3% (cycle 335, 노이즈 evidence)
- elo 8% → 5% 하향 후보 (방향성 차이 최저) ← stale: 최종 8%→10% (cycle 335, 정보가치 Δ=+0.30)
- SFR 음수값 버그 수정 선행 필요
- 100건 도달 예상 시점: 5월 2주차 (~5/14) ← stale: 완료 (5/14 전후 100건 달성, 최종 n=178)

#### 학습 포인트

1. **반복 실패 매치업 신호**: 같은 pair 3연전 전패는 팩터 데이터 자체가 틀린 신호. recent_form 또는 roster 변동 미반영 가능성.
2. **SFR normalize 음수 처리**: `Math.abs` 없이 음수 SFR 입력 시 팩터값 음수 → 가중합 오염. 데이터로 측정된 영향: Brier ≈ 0.0002 이하 (5% 가중치 × 소수 케이스).
3. **Calibration 역전**: confidence 0.4 구간이 0.5 구간보다 실제 정확도 높음 (54.5% > 41.9%) → 과신 구간(0.5) 존재.
4. **데이터 충분성 기준**: 100건 미만 = 가중치 변경 금지. CI95 범위가 40pp+ 이상이라 측정값 신뢰 불가.

### 추출 패턴 (cycle 207 extract-pattern)

**[quality_guard] `silent-drift-single-source-derive`**
- **문제**: 스크래퍼/파이프라인 여러 호출 site에서 오류 처리 로직 중복 → 각자 다르게 구현 → silent divergence
- **해결**: 단일 소스 helper 추출 + 실패 이유 named enum + console.warn per reason
- **결과**: cycles 125~199에서 20+ 파일 4개 helper로 통합 (`assertResponseOk`, `assertSelectOk`, `assertWriteOk`, `extractReasoningHomeWinProb`)
- **재사용**: TypeScript API fetch/DB query 반복 패턴 어디서나 적용

**[content_auto] `breadcrumb-jsonld-dual-output`**
- **문제**: SEO JSON-LD와 시각적 Breadcrumb nav를 별도 유지 → drift 발생
- **해결**: 단일 `<Breadcrumb>` 컴포넌트가 `<nav>` + `<script type="application/ld+json">` 동시 출력
- **결과**: 2 사이클 안에 breadcrumb 누락 11→actionable 0건 달성
- **재사용**: Next.js App Router + 구조화 데이터 필요한 모든 사이트

**[data_pipeline] `prediction-calibration-confidence-bucket-audit`**
- **문제**: 모델 confidence 0.5가 실제 41.9% 정확도 — calibration 역전 구간 존재, 사용자 레이블 신뢰성 의문
- **해결**: verified 예측을 confidence 0.1 단위 bucket으로 분류 → actual accuracy vs ideal 비교
- **결과**: conf=0.4 → 54.5% (과교정), conf=0.5 → 41.9% (저교정) 발견. 가중치 조정 100건 임계 재확인
- **재사용**: ML/AI 확신도 점수를 사용자에게 노출하는 서비스 모두

**[anti_pattern] `normalize-assumes-nonnegative-inputs`**
- **문제**: `normalize(a, b) = a / (|a|+|b|)` — 입력이 음수면 factor값 0~1 벗어남
- **현상**: SFR 값 음수 6건/72건, predictor.ts sfr factor = -0.833까지 발생
- **영향**: SFR 5% 가중치 + 소수 케이스 → Brier ≈ 0.0002 이하 (minor), 개념적 오류
- **수정 방향**: 음수 가능 지표는 `max(0, val)` 클램핑 또는 `(a-b)/(|a|+|b|+ε)` → [0,1] 재매핑

---

## [0.5.27] - 2026-04-30

### 인프라 신뢰성 — Cloudflare Workers 이관 완료 + agent-loop closed cycle

**배경**: GH Actions schedule 이 high-load skip 으로 41% (daily) / 85% (live) 실패.
전체 cron 을 Cloudflare Workers Free Tier 로 이관 완료. 동시에 Claude agent-loop
자율 개발 cycle 구축.

#### Cloudflare Workers Cron 이관 (GH Actions schedule 완전 대체)

- `cloudflare-worker/src/worker.ts` — 단일 파일에 7가지 역할 통합:
  1. daily-pipeline trigger (`17 0-14 * * *`, UTC hour → mode 분기)
  2. SP 확정 시각 측정 — KBO 공식 + Naver 이중 소스 동시 INSERT
  3. sitemap warmup (`37 * * * *`)
  4. pitcher-snapshot (UTC 토요일 15:37 조건 분기)
  5. live-update (`*/10 9-15 * * *`)
  6. sync-batter-stats (UTC 03:17 조건 분기)
  7. self-develop daily dispatch (UTC 00:17)
- cron 슬롯 5개 중 3개 사용 (Free tier quota 여유). 총 fire/day = 82 (100k 한도 내)
- `pat-expiry-check.yml` GH 유지 결정 — GH PAT 검사는 GH 컨텍스트가 본질에 맞음
- GH Actions yml 에서 schedule 키 제거, workflow_dispatch 보존 (수동 fallback)

#### SP 확정 시각 측정 이중 소스 (Phase 2)

- `supabase/migrations/020_sp_confirmation_log.sql` — sp_confirmation_log 테이블
- `021_widen_sp_log_state_sc.sql` — state_sc VARCHAR(20) (Naver statusCode 7자 overflow 차단)
- KBO 공식 (`B_PIT_P_NM`, `T_PIT_P_NM`) + Naver (`homeStarterName`, `awayStarterName`) 양쪽 적재
- Naver gameId 17자리 → 13자리 normalizeNaverGameId() 로 KBO join 가능
- 1~2주 누적 후 Phase 3 분석: 어느 소스가 먼저 SP 채우는지 정량 비교

#### Agent-loop closed cycle (Phase 5 비전 1 보완)

- `self-develop.yml` → `agent-loop.yml` 네임스페이스 전환
  - label `agent-loop` + branch prefix `agent-loop/` 로 사용자 작업과 분리
  - carry-over chain: 1 cycle = 10 fire. 큰 task 자율 분해 + GH Issue 기반 인계
  - push step 명시 추가 (`git push origin --all`) — commit 후 push 누락 silent drop 방지
- Cloudflare cron `0 0 * * *` (KST 09:00) → `self-develop.yml` workflow_dispatch
- 4 prefix (lesson/policy/feedback/memory) commit → submit-lesson.yml dispatch → 허브 auto-ingest

#### 기타 인프라 / SEO

- `019_widen_pipeline_runs_mode.sql` — mode VARCHAR(20) (predict_final 11자 overflow 차단)
- AdSense 스크립트 인프라: `ADSENSE_PUBLISHER_ID` env-driven `<script async>` 자동 주입
- SEO: sitemap 정적 prerender 전환 / canonical 전수 / SportsEvent 스키마 / robots.txt 보강
- 예측 3단계 (적중/유력/반반) 이모지·레이블 UI+Telegram 통일
- wrangler 3.114 → 4.85 업그레이드

**검증**: tsc pass · 전체 tests pass (shared 42 + kbo-data 358 + moneyball 139 = 539).

## [0.5.26] - 2026-04-22

### v3 backtest 결과 — game_records 기반 feature negative

**목적**: 2163 경기 game_records 백필 후 불펜 피로도·팀 타자 폼·팀 투수 컨디션 feature 의 개별 유의성 측정 → v1.7 가중치 후보 발굴.

**실행**: `backtest-v3-run.ts` (Train 2023-24 N=1449 / Test 2025 N=714)

**계수 유의성** (v3 8-feature, train 기준):
- bullpenInningsL3Diff: coef −0.050, z=−0.35, null-like
- runsL5Diff: coef 0.020, z=0.42, null-like
- runsAllowedL5Diff: coef 0.050, z=1.05, null-like
- **homeRunsL5Diff**: coef 0.069, z=1.43, **borderline** (방향 정확, 95% CI 아슬)
- 기존 4-feature 도 모두 null-like 로 변동 (multicollinearity)

**Test Brier (2025)**:
- coin_flip baseline: 0.25000
- 4-feature: 0.24861
- 8-feature: 0.24902 (Δ +0.00042, **악화**)
- Accuracy 54.20% → 54.06% (−0.14pp)

**결론**: **v1.7 ship 근거 없음**. v1.6 유지. 새 4 feature 중 개별 유의성 달성 못 함 — 팀 집계 수준의 거친 지표로는 signal 포착 부족. 더 정교한 개별 선수 feature (투수 pcode fatigue, 타자 hra 최근) 가 필요하지만 별도 엔지니어링 세션 대상.

### 수집된 데이터 자산

- game_records 2,185건 전체 (2023: 722 + 2024: 727 + 2025: 714 + 2026: 22)
- 타자·투수별 박스스코어 + 이닝별 점수 + 승/패/세/홀 투수
- 4-6주 후 prod 예측 축적과 함께 재분석 가능

### 기타 (UI)

- /about 가중치 표시 active/제외 섹션 분리 (park/h2h/sfr 0% → 별도 "제외된 팩터")
- /predictions: 예측 없는 과거 날짜 숨김 + 고확신 적중률 추가 표시
- 메인 hero: "오늘의 빅매치" (접전/라이벌 휴리스틱) → "오늘의 고확신 예측" (승률 70%+ 최대 confidence)
- shared HIGH_CONFIDENCE_THRESHOLD = 0.4 상수화 + isHighConfidence helper

**검증**: tsc pass · 전체 tests pass (shared 30 + kbo-data 360 + moneyball 116).

## [0.5.25] - 2026-04-22

### 경기별 boxscore 수집 인프라 + /debug/model-comparison

**경기별 boxscore (Naver record API)**:
- 이전 조사에서 "Naver API 과거 조회 불가" 로 결론냈던 것 정정: `fromDate/toDate` 스케줄 검색은 과거 무시되지만, **개별 gameId 로 `/schedule/games/{gameId}/record` 호출은 2023-2026 전체 가능** (Referer 헤더 필수).
- `packages/kbo-data/src/scrapers/naver-record.ts` — fetch + 파싱 + 타입 + unicode 분수 이닝 파서 ("3 ⅔" → 3.6667)
- `packages/kbo-data/src/pipeline/save-game-record.ts` — upsert 로직 (status=BEFORE/CANCEL 또는 빈 데이터 skip)
- `packages/kbo-data/src/pipeline/backfill-records.ts` — 시즌별 백필 CLI (rate limit 1.5s)
- `packages/kbo-data/src/pipeline/live.ts` — 경기 종료 감지 시 record 자동 저장 (best-effort)
- `supabase/migrations/017_game_records.sql` — game_records 테이블 (JSONB 중심, RLS)
- 2026 시즌 22 경기 전부 수집 검증. 2023-2025 백필 별도 실행 중.

**모델 비교 대시보드 (`/debug/model-comparison`)**:
- `lib/dashboard/compareModels.ts` — aggregateByModel + dailyByModel 집계 함수
- scoring_rule + model_version 조합별 N / Accuracy / Brier / LogLoss / Calibration
- 최근 14일 일별 추세 + v1.6 ship 마커 (2026-04-22 하이라이트)

**v1.6 pure shadow run**:
- `daily.ts` 가 debate 실행 전 v1.6 순수 정량 확률을 `reasoning.quantitativeHomeWinProb` 로 병행 저장
- 대시보드의 `buildShadowRows` 가 v2.0-debate row 에서 추출 → `v1.6-pure-shadow` 가상 그룹 생성
- 4-6주 후 **Debate 층이 실제로 prediction 을 개선하는지 vs 노이즈인지** 정량 측정 가능 — Agent API 비용 정당화 근거.

**UI 개선 (앞선 커밋)**:
- 라이브/종료 상태 버그 수정 (Naver STARTED/RESULT 매핑)
- PredictionCard / LiveScoreboard 에 경기 상태 배지 + 승패 강조
- LiveScoreboard 와 메인 카드 간 싱크 차이 해결 (`PredictionCardLive` / `PlaceholderCardLive` client wrapper)

**검증**: tsc pass · kbo-data 265 + shared 28 + moneyball 116 = 409 tests pass.

## [0.5.24] - 2026-04-22

### 예측 엔진 v1.6 — Wayback 백테스트 기반 가중치 재분배

**배경**: 2026-04-21 세션에서 2023-2024 시즌 말 Fancy Stats `/elo/` Wayback 스냅샷 복원으로 팀 wOBA/FIP/SFR feature 추가. Logistic regression 학습 (Train 2023 N=722 / Test 2024 N=727) 으로 각 feature 개별 유의성 측정.

**측정 결과 (test Brier 기준)**:
- 4-feature (Elo+form+h2h+park): 0.24980
- 7-feature (+ wOBA/FIP/SFR): 0.24661 (Δ −0.00319, Acc +3.99pp)
- coin_flip baseline: 0.25000

**계수 유의성**:
- `wobaDiff*20` coef 0.548 z=2.10 ⭐ p<0.05 (유일 유의)
- `fipDiff/2` coef 0.301 z=0.72 borderline 양성 (방향 정확)
- `sfrDiff/20` coef 0.101 z=0.37 **null-like**
- `h2hShift` coef −0.009 z=−0.02 **null-like** (kH2h sweep monotone worsening)
- `parkShift/10` coef −0.022 z=−0.13 **null-like** (CI [-0.34, 0.30])

**변경** (`DEFAULT_WEIGHTS`):
| Factor | v1.5 | v1.6 | 근거 |
|---|---|---|---|
| lineup_woba | 0.15 | 0.20 (+0.05) | 유일 유의 feature 강화 |
| sp_fip | 0.15 | 0.19 (+0.04) | FIP 방향 맞는 신호 강화 |
| elo | 0.08 | 0.13 (+0.05) | wOBA/FIP 신호 흡수 관측 |
| head_to_head | 0.05 | **0.00** | null-like 제거 |
| park_factor | 0.04 | **0.00** | null-like 제거 |
| sfr | 0.05 | **0.00** | null-like 제거 |

합계 0.85 보존, 10팩터 구조 유지 (장기 호환성).

**파일**:
- `packages/shared/src/index.ts` — DEFAULT_WEIGHTS 수정, 근거 주석
- `packages/shared/src/index.test.ts` — v1.6 null-like 3종 0 검증 테스트 추가
- `packages/kbo-data/src/engine/predictor.ts` — doc v1.6
- `packages/kbo-data/src/engine/weights.ts` — reduce 타입 annotate
- `packages/kbo-data/src/__tests__/engine.test.ts` — 양수 → >= 0
- `packages/kbo-data/src/pipeline/daily.ts` — `model_version` v1.5 → v1.6 (agent 없을 때 fallback), `scoring_rule` v1.6
- `packages/kbo-data/src/pipeline/postview-daily.ts` — `scoring_rule` v1.6
- `packages/kbo-data/src/pipeline/live.ts` — `v1.5-live` → `v1.6-live`
- `apps/moneyball/src/app/page.tsx`, `about/page.tsx` — UI 라벨 v1.6
- `apps/moneyball/src/components/analysis/DetailedFactorAnalysis.tsx` — 라벨
- `apps/moneyball/src/lib/reviews/buildMonthlyReview.ts`, `buildWeeklyReview.ts` — 문구
- `apps/moneyball/src/lib/analysis/__tests__/factor-explanations.test.ts` — sp_fip contributionPct 기대값 6 → 8 (weight 0.15 → 0.19)

**한계**: Train 1 시즌 / Test 1 시즌. wOBA CI 하한 0.03 아슬한 유의성. 2025 Wayback 스냅샷 없음. Prod 이식 후 4-6주 데이터 축적 후 재학습 권장.

**검증**: tsc pass · 전체 vitest 103 moneyball + 253 kbo-data + 26 shared = 382 tests pass.

## [0.5.23] - 2026-04-20

### PLAN_v5 Phase 4 완료 — 가드 테스트 잔여 2종

**배경**: v0.5.22 시점 Phase 4 잔여 2건 (pipeline-daily + ui-homepage). ROI 낮다고 판단해 운영 관측으로 보완 중이었으나, PLAN_v5 100% 완료 선언 위해 이번 세션에 마저 작성.

**변경**:
- `packages/kbo-data/src/__tests__/pipeline-daily.test.ts` 신규 (15 tests). `runDailyPipeline` 4-mode 분기 + `finish()` helper 보장 + R2 (notifyPredictions 조건) + 예측 0건 시 `notifyPipelineStatus` 스킵 + setup 실패 에러 경로 전부 커버. 재사용 가능한 Supabase chainable proxy mock builder 를 함께 추가.
- `apps/moneyball/src/__tests__/ui-homepage.test.tsx` 신규 (16 tests). `PlaceholderCard` 5개 status 분기 + SP 미확정 + gameTime fallback + 팀명·SP 라인 표시. R3 (INNER→LEFT JOIN) 가드: mixed LEFT JOIN 결과 (predictions=[] + predictions=[{...}] 혼합) 에서 모든 카드가 목록에 남고, 각각 PlaceholderCard / PredictionCard 로 분기.

**PLAN_v5 최종 상태** (2026-04-20 세션 종료):
- ✅ Phase 1 UI (v0.5.22)
- ✅ Phase 2 Pipeline (v0.5.22)
- ✅ Phase 2.5 DB 기반 form/h2h (v0.5.22)
- ✅ Phase 3 `/debug/pipeline` (v0.5.22)
- ✅ Phase 4 가드 테스트 (v0.5.23, 이번 릴리스)

**검증**: tsc pass · vitest 전체 382 tests pass (shared 26 + kbo-data 253 + moneyball 103). 이번 릴리스 +31 tests.

---

## [0.5.22] - 2026-04-20

### PLAN_v5 Phase 1-2 — 파이프라인 신뢰성 복원 + UI 리질리언스

**배경**: 4/17-19 사흘 연속 홈페이지 5경기 편성에도 2-3경기만 노출. 원인은 15 KST predict cron 1회 실행이 주말 낮경기 14:00 (이미 live 상태) 스킵. 이중 방어선 (Path C) 설계: UI 리질리언스 + 파이프라인 재설계.

**변경 (Phase 1 — UI)**:
- `PlaceholderCard` 컴포넌트 + `estimatePredictionTime` 헬퍼 신규 (`apps/moneyball/src/{components/predictions,lib/predictions}/`).
- 홈 `page.tsx` `predictions!inner` → `predictions` (LEFT JOIN). 예측 없는 경기는 PlaceholderCard 로 "예측 준비중 · 약 HH:MM KST 생성" 표시. games source of truth 보장.

**변경 (Phase 2 — 파이프라인)**:
- **매시간 cron 재설계**: `daily-pipeline.yml` cron 2회/일 → 15회/일. `UTC 00` announce (KST 09) + `UTC 01-12` predict (매시간) + `UTC 13` predict_final + `UTC 14` verify. 각 경기 시작 3시간 이내에만 해당 경기 predict.
- **`shouldPredictGame` 함수 분리** (`packages/kbo-data/src/pipeline/schedule.ts`): 윈도우 필터 (0-3h) + status + SP 확정 + first-write-wins. 24 unit tests.
- **INSERT with UNIQUE 제약** (Codex #1): upsert 덮어쓰기 → INSERT + 23505 catch. first-write-wins 구조적 보장. `concurrency: daily-pipeline` (cancel-in-progress: false) 추가 방어선.
- **`daily_notifications` 테이블 + flag** (Codex #6): 하루 요약 Telegram 알림 idempotent.
- **`notifyAnnounce`** 신규 + 09:00 KST 하루 예고 (`packages/kbo-data/src/notify/telegram.ts`).
- **`finish()` helper**: 모든 exit 경로 `pipeline_runs` 로그 보장 (Codex #7). Telegram status 는 의미 있는 run 에만.
- **`gameIdMap` 배치 조회** (Codex #10): games upsert 응답에서 직접 id Map.
- **Retention/postview cleanup** → `UTC 01` 첫 cron 에만 (Codex #5).
- **revalidate 범위 확장** (Codex #4): `/predictions/[date]`, `/analysis`, `/feed` 추가.
- **사용자-facing "15:00" 문구 4곳 일괄 수정** (Codex #8): about / page / predictions[date].

**Migration 필요** (수동 적용):
- `supabase/migrations/013_predictions_metadata.sql`:
  - `predictions.predicted_at TIMESTAMPTZ` 컬럼
  - `daily_notifications` 테이블 + RLS

**미구현 (별도 스코프)**:
- `fetchRecentForm` / `fetchHeadToHead` `asOfDate` 필터 (Codex #2): KBO TeamRankDaily 가 ASP.NET postback 기반이라 단순 GET 불가. 시그니처·호출부 배선만 완료, 실 필터링은 Phase 2.5.
- `/debug/pipeline` 대시보드 (Phase 3): 다음 세션.
- Fixtures + unit tests 11개 + regression 5건 (Phase 4): 다음 세션.

**검증**: tsc pass · vitest 197 tests pass (24 신규 + 173 기존).

---

## [0.5.21] - 2026-04-19

### Sentry 에러 모니터링 통합

**변경**:
- **`@sentry/nextjs` v10 통합**: 클라이언트(`instrumentation-client.ts`) + 서버(`sentry.server.config.ts`) + edge(`sentry.edge.config.ts`) + `instrumentation.ts` register hook + `next.config.ts` `withSentryConfig` wrapper.
- **에러 바운더리 자동 캡처**: `error.tsx` / `global-error.tsx` 가 `Sentry.captureException` 호출. 클라이언트 React 에러, 서버 RSC 에러, layout 자체 실패 모두 수집.
- **`onRouterTransitionStart`**: App Router 페이지 전환 트레이스 자동 수집 (v10 권장 패턴).
- **DSN 없으면 no-op**: `NEXT_PUBLIC_SENTRY_DSN` env 비어 있으면 init 자체를 안 부르므로 빌드/런타임 영향 0. Sentry 가입 → DSN env 추가 → 자동 활성.
- **Vercel 프로젝트 정리**: 빈 `moneyballscore` 프로젝트 제거 + 진짜 prod 프로젝트를 `moneyball-ecosystem-moneyball` → `moneyballscore` 로 rename. CLI · dashboard 표기 통일.

### 검증

- 라이브 배포에서 client `captureException` → Sentry Issues 탭 도착 확인.
- 무료 Developer Plan 한도(월 5K errors) 충분.

---

## [0.5.20] - 2026-04-19

### 에러 바운더리 + Supabase 풀스캔 제거 + 검색 인덱스

**에러 처리 강화**:
- **`error.tsx`**: 세그먼트 단위 에러 화면. 디자인 시스템 컬러 + "다시 시도" / "홈으로" 버튼 + 오류 ID 표시. Vercel logs 자동 전송.
- **`global-error.tsx`**: layout 자체 실패 fallback. layout 못 쓰는 환경이라 인라인 스타일로 디자인 시스템 컬러만 살림.

**Supabase 페이지 쿼리 최적화 (가장 큰 perf win)**:
- **`buildTeamProfile` / `buildMatchupProfile`**: 매 페이지 hit 시 전체 `pre_game` predictions 풀스캔 후 JS 필터하던 패턴 제거. `from('games')` + `.or()` SQL 필터 + `!inner predictions` 로 전환 → 페이지당 수천 row → 수~수십 row.
- 기존 type shape 유지 → downstream 컴포넌트 코드 변경 0.

**Migration 012 (prod 적용 완료)**:
- `idx_games_date` (단일 컬럼) — 기존 `(league_id, game_date)` 복합 인덱스가 league_id 없이 검색 시 못 잡던 문제 해결.
- `idx_games_home_team` / `idx_games_away_team` — `buildTeamProfile`/`buildMatchupProfile` SQL 필터 인덱스 활용.
- `idx_players_team` — 팀 프로필 투수 leaderboard.
- **`pg_trgm` 확장 + GIN 인덱스 on `players(name_ko, name_en)`** — `/search` 한글/영문 ILIKE 부분 검색 가속.

### 검증

- 스키마: 011 → 012, prod Supabase remote 동기화 (`supabase migration list --linked`).
- 페이지 응답: 정상 (HTTP 200, MoneyBall Score 헤더 응답 확인).

---

## [0.5.19] - 2026-04-19

### 관심 팀 필터 + 통합 검색

**관심 팀 필터** (`FavoriteTeamFilter.tsx`, client):
- 홈 페이지 상단 칩 바. 팀 다중 선택 → localStorage `mb_favorite_teams_v1`.
- "관심 팀만 보기" 토글 → 인라인 `<style>`로 `data-game-id` 카드 숨김. SSR friendly (hydration 후 mount).
- 팀 색상 inline (KBO 공식 컬러 칩).

**통합 검색** (`/search?q=…`):
- 결과 그룹 3종: 팀(in-memory match), 선수(Supabase ILIKE on `name_ko`/`name_en`), 일자(`YYYY-MM-DD` prefix).
- 정확 일자 입력 시 `/predictions/[date]` 직접 링크 표시.
- `SearchForm.tsx` (client): 헤더 데스크톱 컴팩트 입력 + 모바일 검색 아이콘 → `/search` 페이지.
- 검색 페이지에 검색 팁 (팀명 / 선수명 / 날짜 패턴 예시) + Breadcrumb 적용.

### 검증

- 65/65 + 173/173 + 87/87 tests · type-check 3/3 통과.

---

## [0.5.18] - 2026-04-19

### AdSense 심사 대비 — Breadcrumb · 404 · FAQ · 쿠키 안내

**SEO 신호 강화**:
- **`Breadcrumb` 컴포넌트** (`components/shared/Breadcrumb.tsx`): 시각 + `BreadcrumbList` JSON-LD 동시 출력. Server Component (no 'use client').
- **7개 동적 라우트 적용**: `/analysis/game/[id]`, `/matchup/[a]/[b]`, `/players/[id]`, `/teams/[code]`, `/reviews/weekly/[w]`, `/reviews/monthly/[m]`, `/predictions/[date]`. 기존 ad-hoc breadcrumb 4개 통합.

**404 페이지** (`app/not-found.tsx`):
- 디자인 시스템 컬러 + 빠른 링크 6종 (홈/오늘/AI 분석/팀/선수/대시보드) + URL 패턴 힌트.
- `metadata.robots: { index: false }` 로 색인 방지.

**쿠키 동의 배너** (`CookieConsent.tsx`):
- localStorage `mb_cookie_notice_v1` 기반 1회 dismiss. PIPA-compliant 안내 톤 (GA + 광고 식별자 사용 명시 + 개인정보처리방침 링크).
- 반응형 (모바일 column / 데스크톱 row) + 다크모드 호환.

**FAQ schema** (about 페이지):
- 7개 FAQ 추가 + `FAQPage` JSON-LD: 예측 방법론 / 적중률 / 데이터 출처 / 무료 여부 / 사후분석 / 도박 금지 안내 / AI 모델.
- Q/A 펼치기/접기 (`<details>`) UI.

### 검증

- 65/65 + 173/173 + 87/87 tests · type-check 3/3 통과.

---

## [0.5.17] - 2026-04-19

### 타입 안전성 + a11y 개선

**기술 부채 — `any` 타입 전면 제거**:
- 스캔 결과 29개 `any` 위치 중 표준 컴포넌트 경로 전부 구체 타입으로 교체.
- 각 페이지에 Supabase query shape을 interface로 선언 + `as unknown as <T>` 한 번으로 캐스팅. 이후 접근은 타입 추론.
- `/` (홈), `/analysis/game/[id]`, `/predictions/[date]`, `/predictions/[date]/opengraph-image`, `/analysis`, `/reviews`, `/feed`, `TeamPerformanceChart` 모두 정리.
- `eslint-disable` 주석 10+개 제거. `PreGamePrediction` / `PostGamePrediction` discriminated union으로 predictions 배열 타입 안전하게 분기.

**접근성 (a11y) 개선**:
- **Skip-to-main 링크**: `<body>` 최상단에 "본문 바로가기" 링크. 포커스 시에만 시각적으로 표시 (`sr-only → focus:not-sr-only`). 키보드 사용자가 네비 반복 없이 메인 콘텐츠로 바로 이동.
- **`<main id="main" tabIndex={-1}>`**: skip 링크 타겟으로 포커스 수신 가능.
- **전역 focus-visible 스타일**: `a, button, [role="button"], input, select, textarea, summary`에 일관된 outline. 기존 각 컴포넌트별 스타일보다 예측 가능.
- **`prefers-reduced-motion` 지원**: 사용자 시스템 설정 존중. WCAG 2.3.3 Animation from Interactions.

### 검증

- Test suite: 86/86 · kbo-data 173/173 · type-check 3/3 통과.
- eslint: `no-explicit-any` 규칙 위반 0건 (주석 포함).

## [0.5.16] - 2026-04-19

### 소셜 공유 버튼

**변경**:
- **`ShareButtons` 컴포넌트** (client): Web Share API (모바일 네이티브) + Twitter / Facebook intent + 링크 복사. 사용자 취소(AbortError) 무시 + clipboard 실패 방어. 아이콘 inline SVG (외부 아이콘 라이브러리 의존성 없음).
- **6개 콘텐츠 페이지 footer 통합**: `/analysis/game/[id]`, `/predictions/[date]`, `/reviews/weekly/[week]`, `/reviews/monthly/[month]`, `/reviews/misses`, `/matchup/[a]/[b]`. 각 페이지마다 제목·설명 자동 생성 (자동 요약·날짜·팀명 기반).

**의도**: 독자가 쉽게 공유할 경로 확보. AdSense 심사엔 직접 영향 없지만 유기적 유입 경로 확장.

### 검증

- Test suite: 86/86 · kbo-data 173/173 · type-check 3/3 통과.

## [0.5.15] - 2026-04-19

### Head-to-head 매치업 페이지 — +45 엔티티 페이지

**배경**: 팀 × 팀 교차점이 공백. 10팀 조합 45개를 개별 페이지로 만들면 엔티티 그래프 크게 확장 + 내부 링크 풍부화 + AdSense 심사 콘텐츠 깊이 시그널.

**변경**:
- **`canonicalPair.ts` + 테스트 10건**: `canonicalPair(a, b)` 두 팀 코드를 알파벳 순 정렬된 쌍으로 정규화. 같은 팀/유효하지 않은 코드는 null. `pairsForTeam(code)` 특정 팀의 9 상대, `allPairs()` 전체 45. 중복 없음·canonical 동등성 테스트.
- **`buildMatchupProfile.ts`**: `predictions × games` 조인 → 두 팀이 맞붙은 경기만 필터링. 각 팀의 승수(홈/원정 분리), AI 예측 지목·적중 카운트, 예측 정확도, 경기 리스트(최신순), 자동 요약 문장.
- **`/matchup/[teamA]/[teamB]` 페이지**: 헤더(팀 컬러 vs) → 요약 → 팀별 성과 카드 2개 → 예측 정확도 → 경기 리스트 → 다른 매치업 네비(양 팀 각 8개). 비-canonical URL은 canonical로 301 redirect. SportsEvent JSON-LD.
- **`/matchup` 인덱스**: 10×10 격자 (대각선 제외)로 45개 조합 한 눈에 + 팀별 바로가기.
- **`/teams/[code]` 연동**: "주요 매치업" 섹션 추가 — 9 상대 팀을 컬러 닷 + 칩으로 네비.
- **sitemap**: `/matchup` 정적 + 45 canonical URL 자동 편입.

**결과**: 45 신규 엔티티 페이지 + 팀 프로필 ↔ 매치업 ↔ 경기 분석 3단 링크 그래프 완성.

### 검증

- Test suite: **86/86** (기존 76 + 신규 `canonicalPair` 10) · kbo-data 173/173 · type-check 3/3 통과.

## [0.5.14] - 2026-04-19

### AdSense 심사 대비 작은 정리들

- **ads.txt 동적 라우트**: `/app/ads.txt/route.ts`. `ADSENSE_PUBLISHER_ID` env 있으면 `google.com, pub-xxxxxxxxxxxxxxxx, DIRECT, f08c47fec0942fa0` 자동 서빙, 없으면 placeholder 주석. 승인 후 Vercel env 변수만 추가하면 즉시 적용. `pub-` + 16자리 검증.
- **Footer 서비스 네비 확장**: 기존 5개 (홈·예측·AI 분석·대시보드·소개)에 `/reviews`·`/players`·`/teams` 3개 추가하여 총 8개. 모바일 `flex-wrap` 정리.
- **RSS 피드 확장** (`/feed`): 기존 게임별 50개 items에 리뷰 페이지 items 6개 추가:
  - 최근 3 주간 리뷰
  - 최근 2 월간 리뷰
  - 회고 페이지 1개
  - 각 item에 pubDate, title, description, guid 포함.
- **MobileNav는 NAV_ITEMS 재사용 확인** — Header에서 `/teams` 이미 추가했으므로 자동 동기화됨 (별도 수정 불요).

### 검증

- Test suite: 76/76 · kbo-data 173/173 · type-check 3/3 통과.

## [0.5.13] - 2026-04-18

### 월간 리뷰 라우트 (퀄리티 C1 확장)

**배경**: 주간 리뷰(v0.5.6)에 이어 월 단위 집계 페이지 추가. 시즌 누적 콘텐츠 타입 +1 — 심사 관점에서 "주간·월간·회고" 3가지 리뷰 형태로 다양성 확보.

**변경**:
- **`computeMonthRange.ts` + 테스트 11건**: `parseMonthId("2026-04")`, `getMonthRangeFromDate`, `getRecentMonths(n)`, `getPreviousMonth`. 윤년 2월(2/29), 평년 2월(2/28), 12월 경계 검증. 연도 경계 (2026-01 → 이전 2025-12) 테스트.
- **`buildMonthlyReview.ts`**: 주간 빌더 패턴 재사용 + 월간 특성 반영:
  - `pickHighlights`는 박빙 적중 2 + 고확신 적중 2 + 대역전 실패 2 (주간은 각 1개)
  - 전월 대비 적중률 diff (`previousAccuracyRate`, 최소 5경기 충족 시)
  - `factorInsights` minSamples 5 (주간은 3)
  - 팀별 성과는 적중률 DESC로 정렬 (주간은 예측 수 DESC)
- **`/reviews/monthly/[month]` 페이지**: 4 지표 카드 (검증·적중·적중률·전월대비), 하이라이트 6개 3열 그리드, 팀별 바, 팩터 best/worst, 최근 4개월 네비.
- **`/reviews/monthly`**: 현재 월 redirect.
- **`/reviews` 허브 3단 그리드**: 주간 + 월간 + 회고 카드. 월간 카드는 accent(골드) 컬러로 구분.
- **sitemap**: `/reviews/monthly` 정적 + 최근 6개월 `/reviews/monthly/[yyyy-mm]` 동적 URL.

### 검증

- Test suite: apps/moneyball **76/76** (기존 65 + 신규 `computeMonthRange` 11) · kbo-data 173/173 · type-check 3/3 통과.

## [0.5.12] - 2026-04-18

### Core Web Vitals 최적화 1단계

**배경**: AdSense 심사 기술 요건 + SEO·체류시간에 CWV 직접 영향. 도메인 이전 전에 70+ 페이지 전체 자산에 적용해두어 기반 마련.

**변경**:

1. **Vercel Speed Insights 추가**: `@vercel/speed-insights` 설치 후 `layout.tsx`에 `<SpeedInsights />` 통합. 기존 `@vercel/analytics`와 병렬로 LCP/CLS/INP/FCP/TTFB 실시간 측정 + Vercel 대시보드에 자동 기록. 심사 대기 기간 동안 regression 감시 기반 마련.

2. **Pretendard 폰트 self-hosting 전환**: 기존 `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/...` 외부 CDN `<link>` 제거. `pretendard` npm 패키지 설치 + `globals.css`에서 `@import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css"`. 효과:
   - 외부 도메인 DNS 조회 + TLS handshake 제거 (LCP -100~300ms 예상)
   - `as="style"` + `rel="stylesheet"` 잘못된 조합 제거
   - 빌드 시 CSS 번들에 포함되어 FOUT/FOIT 감소
   - 외부 CDN 장애에서 독립

**미적용 (다음 단계 후보)**:

- `next build` 번들 사이즈 세부 점검 → recharts 등 차트 라이브러리 dynamic import (현재는 'use client' 컴포넌트 5개만 사용 중이라 우선순위 낮음)
- 큰 JSON-LD 인라인 (`/analysis/game/[id]` articleBody) 크기 최적화
- a11y WCAG AA 보강

### 검증

- Test suite: 65/65 + kbo-data 173/173 · type-check 3/3 통과.
- Dev server smoke: `/` HTML에서 CDN jsdelivr 링크 제거 확인, `speed-insights` 스크립트 주입 확인. `Ready in 233ms`.
- `pnpm build` 28개 라우트 모두 성공.

## [0.5.11] - 2026-04-18

### 스크래퍼 안정성 (드리프트 사례 6 예방)

**배경**: 오늘 세션에서 Fancy Stats `/leaders/` 셀렉터 변경으로 타자/투수 모두 fetched=0 → `daily-pipeline`의 `findPitcher` fallback으로 silent failure. 두 차례 fix 커밋 후에야 수정됨. 심사 대기 기간 중 동일 사고가 나면 적중률 급락으로 이어질 수 있음 — 조기 감지 장치 필요.

**변경**:

1. **Fixture 기반 유닛 테스트 추가 (`scrapers-fancy-stats.test.ts`)**:
   - `fetch`를 모킹하지 않고 파싱 로직만 순수 함수로 분리 — `parsePitchersFromHtml`, `parseBattersFromHtml`.
   - 실제 Fancy Stats `/leaders/` HTML을 `__tests__/fixtures/fancy-stats-leaders.html`에 스냅샷.
   - 13건 테스트: 행 수 최소 임계, 한글 이름/팀 코드 포맷, FIP/WAR 합리적 범위, 중복 선수 없음, 팀 코드 10개 유효성, 회귀 감지 (0명 fail).
   - CI에서 배포 전 구조 변경 자동 감지.

2. **런타임 헬스 체크 + Telegram 알림**:
   - `daily-pipeline`: `fetchPitcherStats/TeamStats/EloRatings` 반환값 검증 → 임계 미만 시 `notifyError` + errors 배열 기록.
   - `syncBatterStats`: fetched=0 (CRITICAL), fetched<8 (WARNING), upsertedStats=0 with fetched>0 (CRITICAL) 3단계 알림.
   - `SyncBatterStatsResult`에 `warnings` 필드 추가.

3. **Fixture HTML 59KB 저장** — 현재 시점 /leaders/ 스냅샷. 사이트 구조 변경 시 fixture 업데이트 + parser 수정이 한 쌍.

### 검증

- Test suite: apps/moneyball 65/65 · kbo-data **173/173** (기존 160 + fixture 13) · type-check 3/3 통과.

## [0.5.10] - 2026-04-18

### v4-4 Phase 1-3 후속: 타자 스크래퍼 + Top 10 (퀄리티 C2-B 완결)

**문제**: C2-A에서 투수 Top 10만 공개하고 타자는 "준비 중" placeholder. 사용자 요청인 "Top 10 × 2 = 20명" 달성을 위해 타자 스탯 수집 인프라 필요.

**발견**: KBO Fancy Stats `/leaders/` 페이지(기존 투수 스크래퍼가 이미 크롤링하는 단일 URL)에 타자 테이블 4종 (WAR·wRC+·OPS·ISO)도 포함되어 있음. 별도 페이지 스크래핑 불필요 → 공수 4-6h → ~1.5h로 단축.

**변경**:
- **`BatterStats` 타입 + `fetchBatterStats` 스크래퍼**: `fancy-stats.ts`에 타자 테이블 인덱스 0-3 파싱. 타자 행은 rank·eng·kor·team·age·**position**·stat (투수보다 position 1컬럼 더) → cells.eq(6) stat 읽기. 4 테이블 Map 조인 후 team 코드 해석.
- **`syncBatterStats` 파이프라인**: 기존 getOrCreatePlayerId 패턴 재사용, players upsert (position 비어있으면 채움) + batter_stats upsert (war·wrc_plus·ops, season unique).
- **`/api/sync-batter-stats` endpoint**: CRON_SECRET 보호, 동기화 후 `/players` revalidate 트리거.
- **`.github/workflows/sync-batter-stats.yml`**: 매일 KST 12:00 (UTC 03:00) cron. daily-pipeline predict(15 KST) 전에 실행. 별도 workflow로 분리 — 기존 daily-pipeline 건드리지 않음 (드리프트 사례 1 회피).
- **`buildBatterLeaderboard.ts`**: `batter_stats` season 필터 + WAR DESC. position='P' 방어 필터.
- **`/players` 타자 Top 10 섹션 활성화**: 기존 "준비 중" placeholder를 실제 테이블로 교체. 컬럼: 순위·선수·팀(컬러 닷)·포지션·WAR·wRC+·OPS. last_synced 날짜 표시.

**주의**: 이번 커밋에는 스크래퍼 코드만 들어감. 실제 `batter_stats` 첫 적재는 workflow cron(내일 12:00 KST) 또는 수동 `gh workflow run sync-batter-stats.yml` 필요.

### 검증

- Test suite: 65/65 · kbo-data type-check 통과 · app type-check 통과.
- 스크래퍼 대상 URL(fancy-stats `/leaders/`) 실제 HTML 구조 curl로 확인 (테이블 0-3 타자, 4-7 투수).
- 스크래퍼 유닛 테스트 생략 (외부 HTML 모킹 비용 대비 이득 적음, DB integration도 성격상 별도).

## [0.5.9] - 2026-04-18

### v4-4 Phase 1-3 후속: "크게 빗나간 예측" 회고 페이지 (퀄리티 C4)

**문제**: 틀린 예측을 숨기지 않고 사후 분석과 함께 노출하는 페이지가 없었음. 이미 `predictions.reasoning` jsonb의 post_game row에 사후 에이전트 분석(`judgeReasoning`, `factorErrors[]`, `homePostview.missedBy`, `awayPostview.missedBy`)이 저장되어 있지만 개별 경기 페이지(`/analysis/game/[id]`)의 PostviewPanel에만 노출. 허브·목록 형태의 "투명성 페이지"가 없어 E-E-A-T 점수와 브랜드 신뢰 신호로 활용 못 함.

**변경**:
- **`buildMissReport.ts`**: confidence ≥ 0.55로 예측했는데 틀린 경기를 confidence DESC로 Top N 수집 → 각 항목에 pre_game verdict reasoning + post_game `judgeReasoning` + `factorErrors[]` + 양팀 `missedBy` 통합. pre_game과 post_game을 각 game_id로 재조인.
- **`/reviews/misses` 페이지**: 서문(왜 공개하는가) + 고확신 실패 카드 Top 10. 각 카드에 날짜·스코어·예측 vs 실제·사후 심판 분석·편향 지목 팩터 bullet(±%p 배지 + diagnosis)·양팀 관점 "놓친 것"·경기 상세 링크. JSON-LD Article.
- **`/reviews` 허브 2단 그리드**: 좌 주간 리뷰(기존) + 우 회고(신규) 카드. 허브 → 리뷰 타입별 분기 구조로 확장.
- **sitemap**: `/reviews/misses` 정적 URL 추가 (daily changeFrequency, priority 0.75 — 실시간성 높음).

**의도**: AdSense 심사에서 "콘텐츠 독창성·투명성·E-E-A-T" 점수. 단순 스탯 나열 사이트와 차별화되는 시그널.

### 검증

- Test suite: 65/65 · kbo-data 160/160 · type-check 3/3 통과.
- 회고 유틸은 DB integration 성격이라 유닛 테스트 생략. post_game reasoning 파싱 실패 시 fallback 분기로 안전.

## [0.5.8] - 2026-04-18

### v4-4 Phase 1-3 후속: 팀 프로필 10팀 (퀄리티 C3)

**문제**: 엔티티 단위 내부 링크가 선수(`/players`)만 있어 사이트 구조가 얇음. 팀은 KBO 10개 고정이라 정적 라우트로 즉시 가능하고, 예측 데이터를 팀 관점으로 재조합하면 선수 프로필과 상호 링크로 그래프 확장.

**변경**:
- **`buildTeamProfile.ts`**: `predictions × games × players` 조인. 팀 홈/원정 관점으로 팩터값 집계 (선발 FIP · 타선 wOBA · 불펜 FIP · 최근 폼 · Elo 시즌 평균), 예측 승자 비율, 검증 적중률, 팀 선발 투수 Top 5 (평균 FIP 낮은 순), 최근 8경기 예측 기록.
- **`/teams/[code]`**: 헤더(팀명+컬러+구장+파크팩터+파크 타입 자동 분류), 4지표 카드, 팩터 평균 5칸, 주요 선발 투수 링크 (→ /players/[id]), 최근 경기 테이블 (→ /analysis/game/[id]). JSON-LD SportsTeam schema.
- **`/teams`**: 10팀 카드 그리드 (컬러 닷 · 구장 · 파크팩터 태그).
- **Header 네비**: "팀" 항목 추가.
- **sitemap**: `/teams` + 10팀 프로필 URL 편입. `KBO_TEAMS` 키 기반 dynamic import로 정적 생성 안정.

**결과**: 엔티티 페이지 +11 (인덱스 1 + 팀 10). 투수 프로필 ↔ 팀 프로필 ↔ 경기 분석 페이지 상호 링크 그래프 형성.

### 검증

- Test suite: 65/65 · kbo-data 160/160 · type-check 3/3 통과.
- 팀 집계 로직은 DB integration 성격이라 유닛 테스트 생략 (ISR + 스모크).

## [0.5.7] - 2026-04-17

### v4-4 Phase 1-3 후속: 투수 프로필 + Top 10 리더보드 (퀄리티 C2 · A안)

**문제**: 선수 개별 페이지가 없어 경기 분석·날짜 페이지 외엔 내부 링크 확장이 제한적. AdSense 심사에서 "깊이 있는 콘텐츠"는 엔티티 단위 페이지(선수/팀)도 중요.

**제약**: DB 스키마엔 `players`/`pitcher_stats`/`batter_stats` 테이블 존재하지만 stats 테이블 적재 코드 0건. 예측 엔진에 입력된 경기별 `home_sp_fip`/`away_sp_fip`만 실데이터. 따라서 C2 "Top 10×2 = 20명" 중 투수 10명만 먼저 공개하고 타자는 스크래퍼 추가 후 별도 phase로 분리.

**변경**:
- **`buildPitcherLeaderboard.ts`**: `predictions + games` 조인 → home_sp/away_sp 각각을 등판으로 집계 → 평균 FIP/xFIP, 등판 수, 해당 선수 팀이 예측 승자였는지 비율, 검증 N + 적중률. FIP ASC, 동률 시 등판 수 DESC로 Top N.
- **`buildPitcherProfile.ts`**: 개별 `player_id` 기준 시즌 누적 + 최근 10경기 등판 기록 (일자, 상대, 홈/원정, FIP, 점수, 예측 적중 여부). Profile Page JSON-LD Person + SportsTeam schema 반영.
- **`/players` 리더보드**: 투수 Top 10 테이블 (선수명 링크, 팀 컬러 닷, 등판·FIP·xFIP·적중률). 타자 섹션은 "준비 중" placeholder로 명시.
- **`/players/[id]` 프로필**: 헤더(이름+팀+throws), 4지표 카드 (등판 / 평균 FIP / 평균 xFIP / 예측 적중률), 최근 10경기 테이블 (각 행에 /analysis/game/[id] 링크), FanGraphs·Fancy Stats와 차이 고지 문구.
- **Header 네비**: "선수" 항목 추가 (AI 분석과 대시보드 사이).
- **sitemap**: `/players` 정적 + Top 10 `/players/[id]` 동적 URL 추가. 리더보드 실패 시에도 static 라우트는 노출 (try/catch 분기).

**향후 C2 · B안** (별도 phase): 타자 스크래퍼 신규 (KBO Fancy Stats wOBA/wRC+) + `batter_stats` 적재 cron → 타자 Top 10 공개.

### 검증

- Test suite: 65/65 (기존 유지) · kbo-data 160/160 · type-check 3/3 통과.
- 리더보드/프로필 집계는 DB 의존 integration 성격이라 유닛 테스트는 생략 (ISR + 스모크 검증).

## [0.5.6] - 2026-04-17

### v4-4 Phase 1-3 후속: 주간 리뷰 라우트 (퀄리티 C1)

**문제**: 사이트에 매주 주기적으로 새로 생성되는 콘텐츠 타입이 없었음. 개별 경기 페이지는 일회성 — AdSense 심사 시 "살아있는 블로그" 인상을 주려면 시즌 내내 축적되는 주간 단위 집계 페이지가 필요.

**변경**:
- **`computeWeekRange.ts` + 테스트 12건**: ISO 8601 (월요일 시작, 1월 4일이 week 1에 포함) 주차 계산. `getWeekRangeFromDate`, `parseWeekId("2026-W16")`, `getRecentWeeks(n)`. 연말/연초 경계, week 53 유효 연도 검증 (2026 OK, 2025 reject) 포함.
- **`buildWeeklyReview.ts`**: 주간 predictions×games 집계. `pickHighlights`가 박빙 적중 / 고확신 적중 / 대역전 실패 3종 자동 선정. `buildTeamStats`는 예측 승자 기준 팀별 적중률. `buildFactorInsights`는 최소 3경기 기준 상관계수 기반 best/worst 팩터. `buildSummary`로 자동 요약 문장 생성.
- **`/reviews/weekly/[week]/page.tsx`**: 동적 주간 라우트. 요약 + 3지표 카드 + 하이라이트 카드 + 팀별 바 + 팩터 인사이트 + 최근 주 네비. JSON-LD Article + articleBody.
- **`/reviews/weekly`**: 현재 주로 redirect.
- **`/reviews` 허브 개편**: 상단에 "주간 리뷰" 섹션 추가 — 이번 주 CTA + 최근 4주 칩. 기존 경기 목록은 그대로.
- **sitemap**: `/reviews/weekly` + 최근 12주 `/reviews/weekly/[yyyy-Www]` URL 동적 추가. 매주 +1 URL 자동 축적.

**결과**: 2026-W16 기준 리뷰 페이지 자동 생성됨. 시즌 진행에 따라 매주 월요일 00:00 UTC (월 09:00 KST) 이후 새 주차 URL이 자동으로 sitemap 편입.

### 검증

- Test suite: 65/65 (기존 53 + 신규 `computeWeekRange` 12) · kbo-data 160/160 · type-check 3/3 통과.
- ISO 주차 엣지: 2024-12-30 → 2025-W01, 2023-01-01 → 2022-W52, 2026-W53 OK, 2025-W53 reject.

## [0.5.5] - 2026-04-17

### v4-4 Phase 1-3 후속: 모델 v2.0 튜닝 진단 (퀄리티 B)

**문제**: v1.5 고정 가중치 (선발 FIP 15%, 타선 wOBA 15%, …)가 실제 예측 결과와 얼마나 일치하는지 측정할 객관적 지표가 없음. migration 010의 `factor_error_summary`는 postview 심판이 "틀렸다"고 **의견**을 낸 빈도만 집계 — 정량 방향성·correlation은 미측정.

**변경**:
- **`factor-accuracy.ts` + 테스트 8건**: verified prediction의 `factors` JSONB와 `actual_home_win`을 대조하여 팩터별 (a) n, (b) directional accuracy (중립 ±0.05 제외), (c) signed mean bias, (d) MAE, (e) Pearson correlation 계산. 팩터 유용성 점수 = 현재 가중치 × max(correlation, 0)로 **제안 가중치**를 기존 가중치 합 내에서 재분배.
- **`buildModelTuningInsights.ts`**: `predictions` × `games` 조인으로 `FactorSample[]` 구성 → `analyzeFactorAccuracy` 호출. 샘플 < 30이면 proposed weight = null (수집 중 표시).
- **`ModelTuningInsights` 컴포넌트**: 팩터별 진단 표 (N · 방향 정확률 · 편향 · 상관계수 · 현재/제안 가중치 diff). 색상으로 correlation 수준(녹: ≥0.2, 적: ≤-0.1), bias 크기(주: |≥0.1|) 강조. 해석 가이드 details.
- **`/dashboard` 통합**: 팩터 오답 Top 5 바로 아래 신규 섹션.

**의도**: 샘플 30+ 달성 시 수동 가중치 조정의 **객관적 근거**. v1.5 → v2.0 튜닝 시 이 리포트를 보고 `DEFAULT_WEIGHTS` 재설정. 현재 ~20경기이므로 당장 제안은 null이지만 인프라·지표 먼저 구축.

### 검증

- Test suite: 53/53 (기존 45 + 신규 `factor-accuracy` 8) · kbo-data 160/160 · type-check 3/3 통과.
- `analyzeFactorAccuracy` 엣지 케이스: 완벽 ±correlation, 중립 영역 제외, 샘플 < minSamples gating, factor 누락, proposedWeightsDelta 합계 검증.

## [0.5.4] - 2026-04-17

### v4-4 Phase 1-3 후속: 경기 분석 본문 확장 (AdSense 퀄리티 대응 A)

**문제**: `/analysis/game/[id]` 페이지의 정량 모델 섹션이 팩터 숫자 10개만 표시(해설 0자)되고 있어 AdSense 심사에서 "얇은 콘텐츠" 판정 위험. `/predictions/[date]`에서 상세 페이지로의 CTA도 subtle variant로 묻혀 있음.

**변경**:
- **`GameOverview` 컴포넌트 + `buildGameOverview` 유틸**: 헤더 직후 자동 분류 태그(투수전/타격전/박빙/우세 뚜렷) + 1-2줄 경기 요약. 승률 격차·h2h 강세 여부에 따라 서술 분기.
- **`DetailedFactorAnalysis` 컴포넌트 + `explainFactor` 유틸**: 10팩터 각각에 (a) 원정/홈 수치, (b) 격차 기반 한국어 1-2줄 해설, (c) 예측 기여도 %p 계산. 팀 컬러 보더 + 가중치 내림차순 정렬. 기존 raw 숫자 블록은 `<details>` 메타 정보로 강등.
- **`/predictions/[date]` CTA 강화**: 경기 카드 끝에 `AnalysisLink variant="primary"` 버튼 — "팩터별 심층 해설 · 에이전트 토론 전문 보기" 명확한 유도.
- **JSON-LD `articleBody` 추가**: overview + verdict + home/away reasoning을 단일 필드로 합쳐 검색 엔진에 본문 시그널 노출.

**결과**:
- `/analysis/game/[id]` 본문: 기존 ~1650-2650자 → **약 2500-3500자** (팩터 해설 600-1000자, 개요 100-200자 추가)
- `/predictions/[date]`: 카드 요약은 그대로, CTA만 강조 (중복 콘텐츠 회피)
- AdSense 심사 기준 "thin content" 판정 회피 강화, SEO 본문 시그널 확대

### 검증

- Test suite: 45/45 (기존 33 + 신규 `factor-explanations` 12) · kbo-data 160/160 · type-check 3/3 통과.
- `buildGameOverview`, `explainFactor` 단위 테스트로 태그 분류·해설 생성·기여도 계산 검증.

## [0.5.3] - 2026-04-17

### v4-4 Phase 1-3 후속: GA4 + GSC 연결

- **Google Analytics 4**: `@next/third-parties/google` 설치 + `<GoogleAnalytics gaId="G-2886XKWG4Y" />` layout.tsx 통합. 기존 Vercel Analytics와 병렬 수집(역할 분담 — Vercel은 퍼포먼스/실시간, GA4는 AdSense 심사·장기 퍼널·사용자 속성). 서비스 측정 ID 하드코딩 (public 값 — 추후 도메인 이전 시 `NEXT_PUBLIC_SITE_URL`과 함께 env 추출 예정).
- **Google Search Console**: `metadata.verification.google` 필드로 소유권 확인 meta 태그 렌더. property `https://moneyballscore.vercel.app` 등록 + sitemap.xml 제출 완료.

### 검증 결과

- Test suite: 33/33 · 160/160 · type-check 3/3 통과.
- dev server smoke: `/` HTML에 `G-2886XKWG4Y` gtag + `googletagmanager` 스크립트 + GSC verification meta 모두 렌더 확인.

### 다음 단계 (퀄리티 확보)

콘텐츠 본문 확장 → 모델 v2.0 오차분석 → 특집 콘텐츠(주간 리뷰·프로필) 순으로 품질 올린 뒤 자체 도메인 + AdSense 심사 일괄 진행.

## [0.5.2] - 2026-04-17

### v4-4 Phase 1-3: AdSense 심사용 법적 페이지 3종

- **`/privacy`**: 개인정보처리방침. Vercel Analytics 쿠키리스 수집 범위 명시, 서버 로그 30일 보관, 회원 개인정보 미수집. 제3자 서비스 고지(Vercel/Supabase/Anthropic) + 데이터 출처 3개(KBO/Fancy Stats/FanGraphs). Google AdSense 쿠키 선제 포함 — 승인 후 즉시 유효, 사용자 옵트아웃 경로(adssettings.google.com, aboutads.info) 링크 제공.
- **`/terms`**: 이용약관 10개 조항. 서비스 성격(정보 제공·교육 목적), 스포츠 베팅 관련 고지(국민체육진흥법 언급 + 사설 도박 무관 명시), 예측 정확성 면책, 지적 재산권, 금지 행위, 서비스 중단 권한, 책임 제한(AS IS), 준거법(대한민국).
- **`/contact`**: 문의 페이지. `moneyballscore777@gmail.com` 공개, 5개 문의 유형별 mailto 프리필 링크 (데이터 오류 / 예측 해석 / 협업 / 개인정보 / 기타). 자주 묻는 질문은 about·dashboard·terms 링크로 우회.
- **Footer 2단 분리**: 서비스 네비(기존) + 법적 네비(신규 privacy/terms/contact) 분리. disclaimer 강화 — "스포츠 토토·사설 베팅·금전 거래 일체 권유·중개·조장하지 않음" 명시.
- **sitemap 업데이트**: 3개 정적 URL 추가 (yearly changeFrequency, priority 0.3).

### 의도

Google AdSense 심사 거부 사유 중 "개인정보처리방침·연락처 누락"·"콘텐츠 성격 불분명"을 해소. 스포츠 예측 도메인은 gambling 카테고리에 근접해 엄격 심사되므로 Terms에 베팅 조장 거부 명시가 특히 중요. 심사 통과율을 30~40% → 60%+ 수준으로 끌어올리는 것이 목표.

### 검증 결과

- Test suite: apps/moneyball 33/33 · kbo-data 160/160 · type-check 3/3 통과 (변경 없음).
- dev server smoke: `/privacy` `/terms` `/contact` 전부 200 OK.
- `sitemap.xml` 3개 신규 URL 포함 확인.

## [0.5.1] - 2026-04-17

### v4-4 Phase 1-2: SEO + 콘텐츠 자동화

- **동적 OG 이미지**: `apps/moneyball/src/app/predictions/[date]/opengraph-image.tsx` — 날짜별 1200×630 PNG 자동 생성. 브랜드·날짜·경기 수·적중률 뱃지. 소셜 공유 링크가 이제 고유 썸네일.
- **SportsEvent + Article JSON-LD**: `/predictions/[date]`에 경기별 SportsEvent 스키마 + 페이지 전체 Article 스키마. Google rich result 후보 등록. (기존 /analysis/game/[id]의 Article과 층위 다름.)
- **sitemap에 날짜별 URL 추가**: `/predictions/2026-04-17` 같은 일자 페이지를 sitemap.xml에 포함. 기존 `/analysis/game/[id]` 외에 일별 묶음 페이지도 크롤링 대상.
- **심판 reasoning 카드 per game**: `JudgeReasoningCard` 컴포넌트 — 경기 카드 아래 judge agent의 300-500자 한글 분석 + 양팀 에이전트 요약 2줄. AdSense "thin content" 회피, 실제 본문 확보.
- **intro 카피 자동 생성**: 날짜·경기 수·적중률·가장 박빙 매치업 기반 intro 한 줄. 검증 상태별로 문구 분기 (예정 / 진행중 / 최종).
- **저자 바이라인**: "MoneyBall AI · YYYY-MM-DD HH:MM KST" 표기 + Article JSON-LD의 `author` 필드. 블로그 포스트 외형.
- **metadata 강화**: Open Graph `type=article` + `publishedTime` + canonical, Twitter summary_large_image. 공유 메타 전면 정비.

### 수정

- `/predictions/[date]` verified 카운트 버그: `predictions: []`일 때 `is_correct`가 `undefined`라 기존 `!== null` 필터를 통과하던 문제. `predicted`(예측 존재) → `verified`(is_correct != null) → `correct`(is_correct === true) 3단 분리로 정확히 세도록 수정.

### 검증 결과

- Test suite: apps/moneyball 33/33 · kbo-data 160/160 · type-check 3/3 통과.
- dev server smoke: `/predictions/2026-04-16` 200 OK, JSON-LD 7블록(WebSite + Article + 5 SportsEvent), intro "최종 결과 100% (5/5) 가장 박빙 KT vs NC" 자동 생성.
- `/predictions/2026-04-17/opengraph-image` 200 OK 95KB PNG 1200×630.
- sitemap.xml 30 URL (6 static + 4 prediction dates + 20 games).

## [0.5.0] - 2026-04-17

### v4-4 Phase 1-1: 적중률 공개 대시보드 강화

- **`/dashboard` 권위 성과 페이지로 통합**: 기존 3섹션(누적·팀별·요약) 위에 일자별 적중률, 확신 구간별 캘리브레이션, 팩터 오답 Top 5 신규 추가. 베터에게 "이 시스템의 성과"를 한 곳에서 완결된 답 형태로 제공.
- **모수 일관성 config 상수화**: `apps/moneyball/src/config/model.ts`의 `CURRENT_DEBATE_VERSION = 'v2-persona4'` 단일 진실 소스. 버전 전환 시 한 줄만 바꾸면 대시보드 모수가 새 세대로 리셋, 과거 성과는 archive 페이지로 분리 가능.
- **`/analysis` 역할 분리**: 시즌 AI 리더보드 섹션 제거, '오늘 빅매치' 전용 페이지로. `/dashboard`와의 수치 중복·불일치 리스크 제거.
- **ISR 통일**: `/dashboard` 300s → 3600s. `/analysis`와 맞춤. verify가 하루 1회 23시 KST에만 돌아서 5분 TTL은 과잉.
- **AccuracySummary 라벨 정합성**: 기존 "고확신(70%+)" 표기가 실제 필터(confidence ≥ 0.4)와 불일치하던 pre-existing 버그를 60%+ 기준 + 라벨로 정리.
- **Pure 함수 + 유닛테스트**: `buildDailyAccuracy` (날짜 집계 + gap skip + 정렬 보장), `buildConfidenceBuckets` (4버킷 경계값 + N<10 게이팅). Vitest 8건 신규.
- **에러 바운더리**: `apps/moneyball/src/app/dashboard/error.tsx`로 Supabase 실패 시 사용자 안내 + 재시도 버튼.

### 검증 결과

- `/plan-eng-review` CLEARED: 11 findings 전부 반영 (스코프 축소 1 + 자명한 수정 10). MINOR 결정은 v4-4 Phase 진입 + user-facing 신규 섹션 3개 기준.
- Test suite: apps/moneyball 33/33 · packages/kbo-data 160/160 · type-check 3/3 packages 통과 (신규 193건 포함).
- dev server localhost 검증: `/dashboard` 200 OK, 7섹션 렌더, empty state 게이팅 작동 (일자별 "3일 이상 검증되면", 확신 구간 "10경기 이상 쌓이면"), 실데이터와 일치 (5/5 적중률, 팩터 Top 3 = 수비 SFR / 최근폼 / 불펜 FIP).

## [0.4.3] - 2026-04-15

### Phase v4-3: Compound 루프 완성 + 포스트뷰 시스템

- **rivalry-memory.ts 신규**: 과거 h2h 5경기 + `agent_memories` 읽기 경로 → team-agent 프롬프트 주입. Compound 루프의 빠진 절반을 닫아 에이전트가 과거 학습 내용을 실제로 참조할 수 있게 됨.
- **포스트뷰 시스템**: 경기 종료 후 홈/원정 사후 분석 에이전트 + 심판 factor-level attribution. `predictions.post_game` row로 저장. "왜 틀렸나"가 factor 이름으로 지목됨 (예: `home_bullpen_fip +0.15 편향으로 오예측`).
- **🔴 숨은 버그 수정**: `retro.ts`가 `homeCode`만 insert하고 away 팀 메모리를 완전히 무시하던 버그 수정. Phase C/D 머지 이후 2026-04-15까지 Compound 루프가 실질적으로 50% 반쪽만 작동하던 상태 종료.
- **Validator lenient 모드**: 로컬 Ollama 개발에서 `WARN_LIMIT=5`, 선수명 발명 hard→warn 강등. `NODE_ENV=production`에서는 무조건 strict 강제(프로덕션 환각 leak 차단).
- **자동 postview 트리거**: `live-update.yml` cron 윈도를 2시간 확장(18:00~00:50 KST)하고 내부에서 경기 종료 감지 시 `runPostviewDaily` 자동 호출. 00:50 이후 종료 극단 경기는 다음날 아침 daily-pipeline fallback으로 cleanup.
- **migration 009**: `agent_memories` TRUNCATE + `UNIQUE(team_code, memory_type, content)` + `idx_agent_memories_read` 인덱스 + `proposals` 테이블 신규 (백테스트 스키마 준비, v5에서 자동화).
- **memory_type 분류 휴리스틱**: strength/weakness/pattern/matchup 4종 분류 + valid_until 7일 유효기간 + source_game_id FK + upsert(onConflict) 중복 방지.
- **dev-postview.ts 스크립트**: Ollama 로컬 드라이런 ($0, 60s, 3010 tokens). factorErrors가 실제 factor 이름 정확히 지목하는 것 확인.
- **테스트 32건 추가** → 총 129/129 통과

### 검증 결과

- `/plan-eng-review`: 8 findings 전부 플랜 반영 (A1~A5 architecture + C1~C3 code quality)
- Ollama dev-debate + dev-postview 드라이런: Claude API 크레딧 0원으로 전체 경로 검증
- 프로덕션 Claude strict 경로 재트리거 1회 성공: 5경기 모두 `v2.0-debate` row 생성, validator reject 0건, Sonnet 분석문 정상 저장

## [0.2.0] - 2026-04-14

### Phase 2 전체 구현 + 프로덕션 배포

- **3소스 데이터 파이프라인**: KBO 공식 API + Fancy Stats + FanGraphs에서 매일 자동 수집
- **예측 엔진 v1.5**: 10팩터 가중합산 (FIP, xFIP, wOBA, 불펜, 최근폼, WAR, Elo, SFR, 상대전적, 구장)
- **이닝별 라이브 업데이트**: 경기 중 10분 간격 승리확률 보정
- **대시보드**: Recharts 누적 적중률 + 팀별 성과 차트
- **예측 투명성**: 팩터별 기여도 시각화 (FactorBreakdown 컴포넌트)
- **Telegram 봇**: 예측 생성 + 결과 적중률 자동 알림
- **파이프라인 모니터링**: 실행 히스토리 DB + 헬스체크 API
- **디자인 리뷰**: 다크 그린 컬러 시스템, 승리확률 표시, 히어로 그라데이션

### 인프라

- GitHub Actions cron 2회/일 (KST 15:00 + 23:00)
- Vercel 배포: moneyballscore.vercel.app
- Supabase 마이그레이션 001~005
- 팀 코드 KBO 공식 API 코드로 통일

## [0.1.0] - 2026-04-14

### Phase 1 초기 구축

- 모노레포 셋업 (pnpm + turborepo)
- Next.js 16 App Router UI 셸
- Supabase 스키마 + RLS
- 예측 카드 컴포넌트, 적중률 요약, 방법론 페이지

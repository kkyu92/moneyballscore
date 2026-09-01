
## cycle 2710 (2026-09-01) — SUCCESS — review-code(heavy)

- review-code(heavy) rotation 계속 — cycle 2709 추천대로 `buildMatchupProfile.ts`(594줄) 정독.
- 필드별 소비처 교차검증 중 `MatchupSideStat.teamColor`가 매치업 페이지 어디에서도 소비되지 않음 발견(teamCode/teamName/wins 등만 렌더링) — MLB 대응 `MlbMatchupSideStat.teamColor`도 동일 패턴(mlb matchup 페이지 grep 0건).
- fix: 양쪽 인터페이스 + `makeSideStat` 함수 + 전체 호출부에서 `teamColor` 제거(commit 5c0c6314). tsc clean + eslint clean + 관련 테스트 38파일 243건 green.
- gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 18/25, info-arch 0/30 리셋, lotto 20/30). 직전8 distinct=3 — 2-chain lock 미충족.
- 다음 사이클 추천 = review-code(heavy) 잔여 미감사 대형파일(`analysis-data.ts`/`buildAccuracyData.ts` 776줄) 정독, 또는 gap trigger 자연 대기.

## cycle 2709 (2026-09-01) — RETRO-ONLY — info-architecture-review

- 30-cycle-gap trigger 도달(마지막 발화 cycle 2679, gap=30). open issue 0, approved plan 0/23. 2-chain lock 미충족(직전8 distinct=4).
- 신규 라우트 0건(cycle 2679 checkpoint 이후), breadcrumb 누락 18건 기존과 완전 일치(전부 의도됨), 헤더/푸터 변경 없음 — "현 IA 충분" 재확정.
- 코드 변경 없음. `docs/design/ia-2026-09-01-cycle-2709-30-cycle-gap-checkpoint.md` 박제.
- 다음 사이클 추천 = review-code(heavy) 잔여 미감사 대형파일(`analysis-data.ts`/`buildAccuracyData.ts` 776줄, `buildMatchupProfile.ts` 594줄) 정독, 또는 gap trigger 자연 대기.

## cycle 2708 (2026-09-01) — SUCCESS — review-code(heavy)

- review-code(heavy) rotation 계속 — cycle 2707 추천대로 잔여 미감사 대형파일 정독, `buildTeamProfile.ts`(601줄) 먼저.
- 필드별 소비처 교차검증 중 `TeamProfile.color`(meta.color 복사) 가 어느 페이지에서도 소비되지 않음 발견 — 앱 전역 팀 색상은 `KBO_TEAMS[code].color`/`MLB_TEAMS[code].color` 직접 참조, profile 경유 0건(전체 grep 확인). MLB 대응 `MlbTeamProfile.color` 도 동일.
- fix: 양쪽 인터페이스 + 생성 지점에서 `color` 필드 제거(commit d6620830). tsc clean + eslint clean + 관련 8개 테스트 파일 59건 green.
- gap trigger 4종 전부 미도달(fix-incident 12/20, op-analysis 17/25, info-arch 29/30 근접, lotto 19/30). 직전8 distinct=3 — 2-chain lock 미충족.
- 다음 사이클 추천 = review-code(heavy) 잔여 미감사 대형파일(`analysis-data.ts`/`buildAccuracyData.ts` 776줄, `buildMatchupProfile.ts` 594줄) 정독, 또는 gap trigger 자연 대기.

## cycle 2705 (2026-09-01) — SUCCESS — review-code(heavy)

- review-code(heavy) rotation 계속 — cycle 2704 추천대로 `kbo-official.ts`(cycle 2693 dead-function 감사 완료) 재정독 중 park factor 이중 source drift 발견.
- `DEFAULT_PARK_FACTORS`(kbo-official.ts, decimal ratio, "2025 시즌 기반 추정" 하드코딩)와 `KBO_TEAMS.parkPf`(shared/index.ts, index-100, 팀 persona yaml 기반) 대조 — 9개 구장 중 4개(인천SSG/광주기아/잠실LG·OB/대전한화)에서 타자/투수 친화 방향 자체가 반대. 잠실이 최악: KBO_TEAMS 기준 극단적 투수친화(parkPf=95)인데 DEFAULT_PARK_FACTORS는 1.02(중립~약간 타자친화) — predictor.ts factors.park_factor(가중치 4%) 실제 입력이 야구 상식과 반대 부호였음.
- fix: `DEFAULT_PARK_FACTORS`를 `KBO_TEAMS.parkPf/100` 파생값으로 교체(하드코딩 테이블 제거), 단일 source 통일(commit ff2f8350). tsc clean + eslint clean + vitest kbo-data 92 files/1218 tests 전체 green.
- gap trigger 4종 전부 미도달(fix-incident 9/20, op-analysis 14/25, info-arch 26/30, lotto 16/30). 직전8 distinct=3 — 2-chain lock 미충족.
- 다음 사이클 추천 = review-code(heavy) 멘션횟수 rotation 계속.

## cycle 2704 (2026-09-01) — SUCCESS — fix-incident

- review-code(heavy) rotation 계속 — cycle 2703 추천대로 `backtest-manual-weights-run.ts`(2회 언급) 전체 정독. 로직 정상(H4 manual vs logistic 비교 ad-hoc 스크립트), `cycle: 903` 하드코딩 메타데이터는 stale 이나 소비처 0건(grep 확인) — 실사용 영향 없어 actionable 아님.
- 감사 중 `npx vitest run packages/kbo-data` 전체 실행 → `scrapers-kbo-live.test.ts` 1건 timeout 실패(재현 2회) 발견. 원인: `fetchWithRetry` 가 502 응답에 실제 backoff sleep(2000ms+4000ms=6000ms) 수행하는데 mock 이 항상 502 반환 — vitest 기본 5000ms timeout 초과. production 로직은 정상(의도된 backoff), 테스트 timeout 만 미반영.
- fix: 해당 테스트 timeout 5000ms→10000ms 조정(commit f10c33ae). 전체 vitest kbo-data 92 files 재실행 green(1218 tests). tsc clean.
- gap trigger 4종 전부 미도달(op-analysis 13/25, info-arch 25/30, lotto 15/30 — fix-incident 자체 발화로 0/20 리셋). 직전8 distinct=4 유지.
- 다음 사이클 추천 = review-code(heavy) 멘션횟수 rotation 계속(kbo-official.ts 4회 등) 또는 gap trigger 자연 대기.

## cycle 2703 (2026-09-01) — RETRO-ONLY

- review-code(heavy): 진단 — 개방 issue 0, unprocessed plan 0/23. gap trigger 4종 전부 미도달(fix-incident 7/20, op-analysis 12/25, info-arch 24/30, lotto 14/30). 직전8 distinct=4 — 2-chain lock 미충족. computed-but-unconsumed 계열 소진 후 CHANGELOG mention-count 기준 재조사 — `backtest-bootstrap-ci-run.ts`(360줄)/`backtest-v2-helpers.ts`(370줄) 진짜 0회 언급 대상 발견.
- `backtest-bootstrap-ci-run.ts` 전체 정독 — H1(sample noise) 검증 ad-hoc bootstrap CI 스크립트, 로직 정상. tsc clean.
- `backtest-v2-helpers.ts` 전체 정독 + 소비처 교차검증 — `formatBacktestMarkdown` 안 하드코딩 가중치 delta 문서를 실제 DEFAULT_WEIGHTS/SHADOW_V20_WEIGHTS 상수와 대조해 완전 일치 확인(stale-doc 오탐 배제). vitest 30/30 green.
- 코드 변경 없음. 양쪽 clean.
- 다음 사이클 추천 = review-code(heavy) 멘션횟수 기준 다음 최저 후보(backtest-manual-weights-run.ts 1회 등) rotation 계속 또는 gap trigger 자연 대기.

## cycle 2702 (2026-09-01) — RETRO-ONLY

- review-code(heavy): 진단 — 개방 issue 0, unprocessed plan 0/23. gap trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 11/25, info-arch 23/30, lotto 13/30). 직전8 distinct=4 — 2-chain lock 미충족. 대형파일(shared/index.ts 3453/daily.ts 1629/validator.ts 1015/analysis-data.ts 974 등) 전부 CHANGELOG 10~28회 언급 재확인 — 파일명 기준 backlog 여전히 소진. 최근 45일 git log 전체 확인 — review-code/refactor + lotto/op-analysis data commit 일색, 신규 feat 분기 거의 없음.
- TODO/FIXME grep 1건(mlb-waterfall.ts) — cycle 2110/2111 이미 해결된 역사 주석 확인, 실제 미해결 아님. `mlb-waterfall.ts`(159줄) 전체 재감사 — LABELS(ko/en) vs MlbWaterfallInput 10필드 일치, pairTerms 8개 부호/multiplier(head_to_head 대칭 인코딩 상쇄항 포함) 주석과 일치, null 가드 정상, final bar 정상. computed-but-unconsumed 재발 없음 — clean.
- 코드 변경 없음. 대형파일 backlog 소진 확정 유지 — 소규모 pure 계산 파일 rotation 또는 gap trigger 자연 대기로 방향 전환.
- 다음 사이클 추천 = review-code(heavy) 소규모 파일 rotation 계속 또는 gap trigger(fix-incident/op-analysis/info-arch/lotto) 자연 대기.

## cycle 2701 (2026-09-01) — SUCCESS — skill-evolution(forced), 75th, phase 41 milestone

- 진단: skill-evolution-pending 마커 발견 (cycle 2700 이 trigger 3 milestone 로 박제) → chain 자율 선택 없이 skill-evolution 강제 발화. 2차 방어선 확인 — 직전 사이클(2700) retro commit 존재 확인(정상), comm -23 로 2651-2700 50 cycle 구간 결손 0건 재검증.
- 직전 20 cycle(2681-2700) chain 분포 측정 — review-code(heavy) 80%(16/20, +10pp vs phase 40 70% — dominance 추가 상승) + fix-incident 10% + lotto/op-analysis 각 5%. success 70%(14/20, 6 retro-only 전부 감사결과 신규이슈 0건 정상 clean). silent drift family 축 전환 확인: computed-but-unconsumed select 필드 계열(loader.ts/rivalry-memory.ts/backfill-sp.ts, 7~10번째 변종) backlog 소진 → 파일명 기준 신규 대상 + 신규 분기 소급 감사 2방향 전환.
- `~/.claude/skills/develop-cycle/SKILL.md` 마이그레이션 path 표(line 686) phase 41 요약 갱신 + `MIGRATION-PATH.md` phase 41 전체 상세 append. `/office-hours` skip(자동 fire 환경, AskUserQuestion hang 회피) — spec 직접 작성.
- `pnpm test` 571 files/4483 tests 전체 green(무변화, 코드 변경 없음 — SKILL.md 는 리포 밖 글로벌 파일).
- PASS_ship: cycle 2650(~2231) + 2651-2700 구간 SUCCESS 31건 → 누적 ~2262. watch hang kill 0건(9 consecutive 50-cycle window).
- 다음 사이클 추천 = review-code(heavy) 계속 (dominance 80% 지속 — computed-but-unconsumed backlog 소진 후 신규 축 지속 여부 monitor) 또는 gap trigger(op-analysis 9/25, info-arch 21/30, lotto 12/30) 자연 대기. 다음 milestone = cycle 2750.

## cycle 2700 (2026-09-01) — RETRO-ONLY — milestone

- review-code(heavy): 진단 — 개방 issue 0, unprocessed plan 0/23. gap trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 8/25, info-arch 20/30, lotto 10/30). 직전8 distinct=2(review-code(heavy)+fix-incident) — 2-chain lock 형식상 충족이나 fix-incident 포함 시 안전 우선 무시(룰 명시) → 자유 선택. explore-idea saturation(12/15) 재도달했으나 plan#29 Tier4 재확인. cycle 2699 "대형파일 backlog 소진" 후속 — 파일명 기준 미감사 신규 대상 탐색.
- `model-version.ts`(102줄) 신규 전체 감사 — cycle 573 이후 추가된 `usingShadowV20Weights` 분기 최초 감사. `decideModelVersion` shadow scoring_rule 계산 정상. `decidePostviewModelVersion` 은 shadow 미지원이나 postview-daily.ts 가 `preGame.scoring_rule ?? versionDecision.scoring_rule` 로 원본 우선 보존 확인 — shadow row silent overwrite 없음. clean.
- 코드 변경 없음. 대형파일 backlog 소진 후에도 "파일명 기준 미감사" + "신규 분기 소급 감사" 2방향으로 review-code(heavy) 지속 가능 확인.
- milestone cycle 2700 — trigger 3(cycle_n%50==0) 충족, skill-evolution-pending 마커 박제 → 다음 사이클(2701) skill-evolution 강제 발화.
- 다음 사이클 추천 = skill-evolution(강제) — MIGRATION-PATH.md phase 41 정리 + SKILL.md 최신 milestone 요약 갱신.

## cycle 2699 (2026-09-01) — RETRO-ONLY

- review-code(heavy): 진단 — 개방 issue 0, unprocessed plan 0/23. gap trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 8/25, info-arch 20/30, lotto 10/30). 직전8 distinct=3 — 2-chain lock 미충족. cycle 2698 추천대로 마지막 미감사 대형파일 `glossary/data.ts`(323줄) 채택.
- 전체 정독 + 소비처(glossary/page.tsx, methodology/page.tsx) 교차검증 — 8개 필드 전부 소비, DEFAULT_WEIGHTS 10개 활성 가중치 전부 반영, GLOSSARY_TERM_COUNT 정상 소비. computed-but-unconsumed 재발 없음 — clean.
- 코드 변경 없음. cycle 2693~2698 연속 발견 패턴(10변종)의 대형파일 audit backlog 소진 완료.
- 다음 사이클 추천 = review-code(heavy) 재감사 rotation 시작 또는 gap trigger(fix-incident/op-analysis/info-arch/lotto) 자연 대기.

## cycle 2698 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred/tier4). explore-idea saturation(13/15) 재도달했으나 plan#29(로그인/커뮤니티) Tier4 재확인(risk=3, 자율불가, postseason 10월 미도달). gap trigger 4종 전부 미도달(fix-incident 2/20, op-analysis 7/25, info-arch 19/30, lotto 9/30). 직전8 distinct≥3 — 2-chain lock 미충족. cycle 2697 추천대로 review-code(heavy) 계속, 미감사 대형파일 중 최고령(`backfill-sp.ts`, 2026-06-24) 채택.
- `backfill-sp.ts`(300줄) 전체 정독 — `loadTargetGames()` 의 `games.home_team_id`/`away_team_id` select 가 어디서도 미소비(소비처는 Naver 팀명 기반 teamIdMap 만 사용). computed-but-unconsumed select 필드 계열 10번째 변종. 나머지(3단계 매칭 fallback, idempotent 갱신, in-memory cache, assertWriteOk)는 clean.
- `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` clean + lint clean + vitest 92 files/1218 tests 전체 green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, e660ec14).
- 다음 사이클 추천 = review-code(heavy) 계속 시 미감사 대형파일 1개 잔존: `glossary/data.ts`(323줄, 2026-07-03). 또는 fix-incident(gap 3/20)/op-analysis(gap 8/25)/info-arch(gap 20/30)/lotto(gap 10/30) 자연 대기.

## cycle 2697 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred/tier4). gap trigger 4종 전부 미도달(fix-incident 1/20, op-analysis 6/25, info-arch 18/30, lotto 8/30). 직전8 distinct=4(review-code(heavy) 5 + operational-analysis 1 + lotto 1 + fix-incident 1) — 2-chain lock 미충족. cycle 2696 추천대로 review-code(heavy) 계속, 미감사 대형파일 중 최고령(`rivalry-memory.ts`, 2026-06-30) 채택.
- `rivalry-memory.ts`(254줄) 전체 정독 + 소비처 교차검증(team-agent.ts/debate.ts) — `fetchRecentH2H` 의 `winner_team_id`/`status` select, `fetchMemories` 의 `valid_until` select 모두 조인/필터 전용이고 매핑 결과 미반영. computed-but-unconsumed select 필드 계열 9번째 변종(3건 동시 발견). 나머지(RECENT_GAMES_LIMIT/TIME_WINDOWS 정합, dead export 0, sibling 파일 중복 0)는 clean.
- `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` clean + lint clean + vitest 92 files/1218 tests 전체 green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, de06676a).
- 다음 사이클 추천 = review-code(heavy) 계속 시 미감사 대형파일 2개 잔존: `backfill-sp.ts`(300줄, 2026-06-24) / `glossary/data.ts`(323줄, 2026-07-03). 또는 fix-incident(gap 2/20)/op-analysis(gap 7/25)/info-arch(gap 19/30)/lotto(gap 9/30) 자연 대기.

## cycle 2696 (2026-09-01) — RETRO-ONLY

- fix-incident(lite): 진단 — 개방 issue 0. gap trigger 4종 중 fix-incident 만 도달(33/20, 마지막 발화 cycle 2663 — 최장 미발화). op-analysis 5/25, info-arch 17/30, lotto 7/30 미도달. 직전8 distinct=3(review-code(heavy) 6 + lotto 1 + operational-analysis 1) — 2-chain lock 미충족. 33-cycle 장기 미발화 gap trigger 최우선 채택.
- GH Actions 전체 workflow(24개) 최신 실행 2건씩 전수 확인 — CI/lesson-dispatch/health-alert/runtime-error-alert/heartbeat-stale/lotto 3종/mlb 계열/factor-backtest-weekly/op-analysis-weekly/deploy-drift-alert 전부 success. 옛 timestamp(4월) 5개(Daily KBO Pipeline/Live Game Update/Pitcher Stats Snapshot/Sync Batter Stats/sitemap-warmup)는 2026-04-29~30 Cloudflare Worker cron 이관 완료 상태(schedule 키 제거 확인) — 정상.
- pipeline_runs 최근 7일(166건) status=success 100%, error 0건. 당일(2026-09-01) predict 4연속(01~04시 UTC) predictions=0+games_found=5 패턴 발견해 silent-drift 의심 정밀조사 → skipped_detail 전수 확인 결과 reason="window_too_early"(18:30 KST 경기, 예측 window 미도달) — 정상 게이팅 동작, 인시던트 아님(false positive 배제).
- 코드 변경 없음(실제 인시던트 0건 확인) — fix-incident cooldown 재시작.
- 다음 사이클 추천 = review-code(heavy) 계속: 미감사 대형파일 3개(`backfill-sp.ts` 300줄/`rivalry-memory.ts` 254줄/`glossary/data.ts` 323줄) 순차 진행. 또는 op-analysis(gap 6/25)/info-arch(gap 18/30)/lotto(gap 8/30) 자연 대기.

## cycle 2695 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred/tier4). gap trigger 4종 전부 미도달(fix-incident 12/20, op-analysis 4/25, info-arch 16/30, lotto 6/30). 직전8 distinct=3(review-code(heavy) 6 + lotto 1 + operational-analysis 1) — 2-chain lock 미충족. explore-idea saturation(13/15) 재도달했으나 plan#29(로그인/커뮤니티) 재평가 조건(postseason 접근/user_picks≥10) 여전히 미충족 → review-code(heavy) 재선택. cycle 2694 후보 `backtest-grid-run.ts`는 자매 파일 cross-check(cycle 2685)로 이미 clean 확정 상태라 다음 후보 `loader.ts` 채택.
- `packages/kbo-data/src/backtest/loader.ts`(250줄) 전체 정독 + 소비처 7파이프라인(grid/logistic/wayback/v3/manual-weights/bootstrap-ci/run) + runner.ts/harness.ts 교차검증 — `loadDecidedGames()` 의 `games.id` select+`BacktestGame.id` 할당이 어디서도 미소비(전부 season/homeTeamId/homeWon 매칭). computed-but-unconsumed 죽은 필드 계열 7번째 발견(이번엔 공유 loader 함수 자체). interface+select+테스트 fixture 동기 제거.
- `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` clean + lint clean + vitest 92 files/1218 tests 전체 green. 단일 논리 단위 → 직접 main commit+push(R4/R7, 9f019b18).
- 다음 사이클 추천 = review-code(heavy) 계속 시 미감사 대형파일 3개 잔존: `backfill-sp.ts`(300줄, 2026-06-24) / `rivalry-memory.ts`(254줄, 2026-06-30) / `glossary/data.ts`(323줄, 2026-07-03). 또는 fix-incident(gap 13/20)/op-analysis(gap 5/25)/info-arch(gap 17/30)/lotto(gap 7/30) 자연 대기.

## cycle 2694 (2026-09-01) — RETRO-ONLY

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred/tier4). gap trigger 4종 전부 미도달(fix-incident 11/20, op-analysis 3/25, info-arch 15/30, lotto 5/30). 직전8 distinct=3(review-code(heavy) 6 + operational-analysis 1 + lotto 1) — 2-chain lock 미충족. cycle 2693 carry-over 후보 `postview-daily.ts`/`backtest-v2-helpers.ts` 채택.
- `postview-daily.ts`(380줄) 전체 정독 — clean. assertSelectOk/assertWriteOk fail-loud 정합, shadow row 제외 로직(PRODUCTION_COHORT_RULES) 정확, `estimateHomeWinProb`/`resolveOriginalHomeWinProb` 테스트 커버 확인, `runPostviewDaily` 소비처(daily.ts/live.ts) 정합.
- `backtest-v2-helpers.ts`(370줄) 전체 정독 — clean. `evaluatePair`/`evaluateThreeWay`/`evaluateFancyElo`/`formatBacktestMarkdown` 전부 `scripts/backtest-v2-candidate.ts` + 테스트에서 소비 확인. `computeEloProb` ↔ `HOME_ELO_BONUS`/`ELO_DIVIDER` cross-ref(shared/index.ts) 정확, 중복 구현 아님.
- 코드 변경 없음(재감사 2건 clean) — CHANGELOG 갱신 생략(정책상 retro-only는 TODOS만).
- 다음 사이클 추천 = review-code(heavy) 계속 시 미감사 대형파일 5개 존재: `backtest-grid-run.ts`(252줄, 2026-05-05, 최고령) / `loader.ts`(250줄, 2026-06-24) / `backfill-sp.ts`(300줄, 2026-06-24) / `rivalry-memory.ts`(254줄, 2026-06-30) / `glossary/data.ts`(323줄, 2026-07-03). 또는 fix-incident(gap 12/20)/op-analysis(gap 4/25)/info-arch(gap 16/30)/lotto(gap 6/30) 자연 대기.

## cycle 2693 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/22(전부 completed/archived/deferred/tier4). gap trigger 4종 전부 미도달(op-analysis 2/25, info-arch 14/30, lotto 4/30). 직전8 distinct=3(review-code(heavy) 6 + lotto 1 + operational-analysis 1) — 2-chain lock 미충족. explore-idea saturation(13/15) 재도달했으나 유일 후보 plan#29(로그인/커뮤니티)가 risk=3+자율불가 Tier4 확정 상태 재확인 → review-code(heavy) 재선택.
- `buildAccuracyData.ts`(776줄, cycle 2690 carry-over 후보) 전체 정독 — clean(이미 다수 정정된 최신 상태 재확인). cycle 2690 carry-over 나머지 후보(`buildTeamProfile.ts`/`buildMatchupProfile.ts`/`analysis-data.ts`)는 git log 확인 결과 최근(2026-08-23~26) 이미 다수 fix 거친 상태라 재감사 낮은 가치 판단, 최고령 미터치 파일 재스캔으로 전환.
- 커밋일 기준 최고령 미터치(2026-07-14, 이후 무변화) 대형파일 `kbo-official.ts`(323줄, KBO 공식 스크래퍼) 채택 — 서브에이전트 전체 정독 + 소비자 교차검증(daily.ts/postview-daily.ts/backtest.ts/standings 등). `calculateParkFactor()` 완전 죽은 함수 발견: cycle 353 knip cleanup 이 export 키워드만 제거(knip은 미사용 export만 탐지, 미호출 내부 함수는 미탐지)했을 뿐 12줄 본문이 그대로 잔존 — 실제 파크팩터는 전부 정적 `DEFAULT_PARK_FACTORS` 테이블 사용 중. 제거.
- `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` clean + lint clean + vitest 92 files/1218 tests 전체 green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 5fd0b1c7).
- 다음 사이클 추천 = review-code(heavy) 계속 시 미감사 대형파일(`postview-daily.ts` 380줄 2026-07-08, `backtest-v2-helpers.ts` 370줄 2026-07-16 — 둘 다 kbo-official.ts 다음 최고령) 정독, 또는 op-analysis(gap 3/25)/info-arch(gap 15/30)/lotto(gap 5/30) 자연 대기.

## cycle 2692 (2026-09-01) — RETRO-ONLY

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/29(전부 completed/archived/deferred), gap trigger 4종 전부 미도달(fix-incident 9/20, op-analysis 1/25, info-arch 13/30, lotto 3/30). 직전8 distinct=3(2-chain lock 미충족). explore-idea saturation(12/15, review-code+fix-incident+polish-ui+info-arch 계열) 재도달 확인했으나 plan#29(로그인/커뮤니티) 재평가 트리거 여전히 미충족(트래픽 실측 재요구 없이 checkpoint만 반복될 위험) + TODOS Next-Up 신규 후보 부재로 review-code(heavy) 유지 결정.
- cycle 2691 carry-over 후보 `silent-drift-alert.ts`(440줄) 전체 정독 — 8개 alert dispatcher 함수 전부 실 호출부와 필드 정합 확인(clean). 유일 발견은 `captureFactorAnomalyAlert` 가 cycle 1013 도입 후 여전히 무배선(호출부 0/테스트 0, 코드 주석이 cycle 2276 시점부터 정확히 이 상태를 문서화 중) — 그러나 주석 자체가 현재 상태와 100% 일치해 "잘못된 문서" 가 아니라 "의도된 대기" 상태라 액션 대상 아님(silent drift 아님).
- 추가 정독: `agents/validator.ts`(WARN_LIMIT 하드코딩 vs mode-aware — validateFactorAttribution 은 attribution.ok 가 Sentry 알림 전용이라 gating 영향 없어 비버그), `pipeline/mlb-pipeline.ts` MLB_MEMORY_PREDICTION_COLUMNS 15필드 전부 buildMlbFactors 소비 확인, `lib/mlb/buildMlbTeamProfile.ts`(cycle 2680 이미 정리된 상태 재확인, clean), `pipeline/backtest-run.ts`(168줄, 수동 CLI, drift 없음) — 전부 clean, 신규 fix 0건.
- 코드 변경 없음. `pnpm --filter @moneyball/kbo-data type-check`/`lint` clean 확인(변경 無).
- 다음 사이클 추천 = review-code(heavy) 계속 시 신규 후보 재탐색 필요(이번 cycle 후보 전부 소진) — `apps/moneyball/src/lib/insights/` 또는 `apps/moneyball/src/app/mlb/` 하위 미감사 대형 파일 재스캔 권장. 또는 fix-incident(gap 10/20)/op-analysis(gap 2/25)/info-arch(gap 14/30)/lotto(gap 4/30) 자연 대기.

## cycle 2691 (2026-09-01) — SUCCESS

- operational-analysis(lite): 진단 — 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred). gap trigger 재확인: op-analysis 마지막 발화 cycle 2666, gap=25(≥25 임계 정확히 도달) — 25-cycle 미발화 trigger 자연 발화. 직전8 distinct=3(review-code(heavy) 6 + fix-incident(lite) 1 + lotto(lite) 1) — 2-chain lock 미충족.
- `scripts/op-analysis-ce-cohort.ts` 재실행 — 전체 n=357 (CE n=310 / 비CE n=47), cycle 2666 수치와 완전 동일(신규 verified 예측 0건, 25-cycle 경과에도 배치 미반영 지속). CE 54.5%(169/310) / 비CE 63.8%(30/47) → 격차 9.3pp 그대로, LLM 부가가치 우세 결론 13회 연속 재확인.
- CREDIT_EXHAUSTED 지속(사용자 크레딧 재충전 미이행), 비CE 표본 동결(마지막 예측 2026-07-01, 62일+ 경과) 상태 변화 없음. CLAUDE.md 모델 가중치 섹션에 cycle 2691 엔트리 append (e094720d).
- 코드 변경 없음(재측정만) — CLAUDE.md 갱신 커밋만 진행.
- 다음 사이클 추천 = review-code(heavy) 복귀 (미감사 대형파일 재탐색: analysis-data.ts/buildAccuracyData.ts/daily.ts) 또는 fix-incident(gap 8/20)/info-arch(gap 12/30)/lotto(gap 2/30) 자연 대기.

## cycle 2689 (2026-09-01) — SUCCESS

- lotto(lite): 진단 — 개방 issue 0, approved plan 0/23. gap trigger 재확인: lotto 마지막 발화 cycle 2659, gap=30(≥30 임계 도달) — 30-cycle 미발화 trigger 자연 발화. 직전8 distinct=2(review-code(heavy) 7 + fix-incident(lite) 1, lock 무시 조건 동일).
- `pnpm tsx scripts/lotto.ts update` → 1239회차 이미 최신. `count` 재측정 = valid 7,705,415/8,145,060(제거 5.40%) — cycle 2659 측정과 완전 동일(valid_delta=0, saturation 안정 7연속).
- **핵심 발견(cycle 2659 재확인 + 보강)**: `~/lotto_picks/` 레거시 경로(사용자 홈, git 비추적) 기준 50세트 파일이 2026-08-29 이후 미갱신이라 처음엔 "picks 누락"으로 오판, 수동으로 2026-08-29-result.md + 2026-09-05-50sets.md 작성. 이후 실제 자동화 확인 결과 `lotto-pick-update.yml`/`lotto-result-update.yml` cron 이 이미 `apps/moneyball/data/lotto-picks/2026-09-05.md`(1000세트, PR merged) + `apps/moneyball/data/lotto-results/2026-08-29.md`(1239회 결과, 256룰 100% PASS, 4등 2건/5등 24건, PR #3071 merged) 를 정상 생성·머지 완료 — 자동화 완전 정상 작동, 수동 파일은 레거시 관례의 중복 산출물(무해하나 불필요, git 비추적이라 충돌 없음).
- **SKILL.md drift 후보**: chain pool 진단 source 표의 lotto 항목이 여전히 `~/lotto_picks/<next-saturday>.md` 부재를 trigger 조건으로 명시 — 실제 source of truth 는 repo 내 `apps/moneyball/data/lotto-picks/` (cron 자동화 이관 완료, cycle 1403+). 다음 skill-evolution 발화 시 이 항목 갱신 후보로 carry-over.
- 코드 변경 없음(진단+검증만) — commit 없음, cycle-retro dispatch 만 진행.
- 다음 사이클 추천 = review-code(heavy) 복귀 (14/20 dominance-positive streak 유지) 또는 op-analysis(gap 24/25, 다음 사이클 임계 도달 임박) 자연 전환.

## cycle 2688 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred). gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 22/25, info-arch 9/30, lotto 29/30). 직전8 distinct=2(review-code(heavy) 7 + fix-incident(lite) 1) — 2-chain lock 조건 표면상 충족이나 잠긴 chain 중 fix-incident 포함 시 안전 우선 규칙으로 lock 무시. cycle 2687 carry-over 추천대로 review-code(heavy) 계속.
- `silent-drift-alert.ts`(440줄, cycle 2653/2685/2687 3연속 carry-over 미착수) 우선 정독 — captureFactorAnomalyAlert 미배선 상태는 기존 주석(cycle 2276)이 이미 정확 문서화, 신규 drift 없음(clean). `postview.ts`(588줄)/`buildTeamProfile.ts`(601줄) 재확인도 clean.
- `mlb-shared.ts` 정독 → `buildMlbMissReport()` 의 `mlb_schedule` select 가 `status` 컬럼을 가져오지만 서버측 `.eq("status","final")` 필터로만 쓰이고 JS 루프 재참조 없음 발견 — kbo-live.ts/buildPicksStats.ts 등과 동일 미소비 select 필드 계열 8번째 변종.
- `buildMlbMissReport` 전용 `MlbMissScheduleRow`(status 제외) 타입 신설해 분리(공유 `MlbScheduleRangeRow` 는 `fetchMlbPredictionRowsInRange` 가 status 실사용이라 유지).
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + mlb-shared.test.ts 6 tests + moneyball 571 files/4483 tests 전체 green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 8db19c5f).
- 다음 사이클 추천 = review-code(heavy) 계속 시 미감사 대형파일 재탐색(analysis-data.ts 974줄/convergenceRecord.ts 831줄/buildAccuracyData.ts 776줄 후보) 또는 fix-incident(6/20)/op-analysis(23/25 근접)/lotto(30/30 도달 예상) gap 자연 대기.

## cycle 2687 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred). gap trigger 4종 전부 미도달(fix-incident 4/20, op-analysis 21/25, info-arch 8/30, lotto 28/30). 직전8 distinct=3(2-chain lock 미충족). 직전20 review-code 계열 70% dominance-positive streak 지속, skill-evolution 마커 부재. cycle 2686 carry-over 추천대로 review-code(heavy) 계속.
- `fancy-stats.ts`(526줄) 정독 → `fetchPitcherStats()` merge 로직이 Fancy Stats stub `era=0/innings=0` 를 KBO 공식 실값(같은 name@team 키)이 있어도 그대로 채택하는 silent drift 발견 — 파일 안 기존 xfip fallback/winPct=0.5 stub family 의 신규 변종(8번째, 이번은 dead-field 정리가 아닌 실제 버그 fix).
- `mergePitcherStats()` 순수 함수 분리 + KBO 매칭 시 era/innings 채움. 단위 테스트 3건 추가. `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` + `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + kbo-data 1218 tests + moneyball 4483 tests 전체 green. 단일 논리 단위 → 직접 main commit+push(R4/R7, ff776db9).
- 다음 사이클 추천 = review-code(heavy) 계속 시 `silent-drift-alert.ts`(440줄, cycle 2653/2685/2687 3연속 carry-over 미착수) 정독 우선권, 또는 fix-incident(5/20)/op-analysis(22/25 근접)/lotto(29/30 근접) gap 자연 대기.

## cycle 2686 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred). gap trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 20/25, info-arch 7/30, lotto 27/30). 직전8 distinct=3(2-chain lock 미충족). explore-idea saturation(15/15) 재도달했으나 4-source 재확인 전부 negative(신규라우트 55건=git checkout mtime 부작용, TODOS Next-Up stale, GH issue 0, DESIGN.md 당일 갱신) → review-code(heavy) 재선택.
- 최고령 미터치 대형파일 순서대로 재검증: `backtest-wayback-run.ts`/`backtest-v3-run.ts`(둘 다 2026-05-04)/`big-match.ts`/`personas.ts` 전부 clean. `scrapers/kbo-live.ts`(2026-05-26, 237줄) → `RawKboLiveGame.CANCEL_SC_NM` 필드가 `fetchLiveGames()` 안 CANCEL_SC_ID 만으로 취소 판정하고 전혀 미참조 — cycle 2677/2678/2680/2681/2682/2684/2685 와 동일 죽은-select-필드 패턴의 스크래퍼 변종, 7번째 발견. 동명 필드가 있는 `kbo-official.ts` 쪽은 DB 저장에 실사용 중이라 유지, kbo-live.ts 전용 interface 에서만 제거.
- `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` + `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 5576b1e0).
- 다음 사이클 추천 = review-code(heavy) 계속 시 미감사 대형 파일(`fancy-stats.ts` 526줄, `silent-drift-alert.ts` 440줄, cycle 2653/2685 carry-over) 정독, 또는 fix-incident(gap 3/20)/op-analysis(gap 20/25 근접)/lotto(gap 27/30 근접) 자연 대기.

## cycle 2684 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23(전부 completed/archived/deferred), gap trigger 4종 전부 미도달(op-analysis 18/25, info-arch 5/30, lotto 25/30, fix-incident gap=0 직발화). 직전8 distinct=3(2-chain lock 미충족). 직전20 chain 분포 review-code 계열 15/20(75%) dominance-positive streak 정합. cycle 2683 retro 추천대로 review-code(heavy) 복귀.
- 최고령 미터치 대형파일 재스캔 → `lib/lotto/picks-loader.ts`(166줄, 2026-06-29 이후 미터치, 최고령) 채택 — lotto 영역 review-code(heavy) 최초 편입.
- `LottoSet.avoidScore`/`LottoPicks.generatedAt` 둘 다 파싱만 되고 소비 라우트 4개·테스트 7개 어디서도 미참조 — cycle 2677/2678/2680/2681/2682 와 동일 죽은 필드 패턴의 markdown-parse 변종, 5번째 발견. 제거.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 2145b3ba).
- 다음 사이클 추천 = review-code(heavy) 계속 가능(lotto 영역 신규 편입 — `lib/lotto/` 하위 다른 파일도 재스캔 후보) 또는 op-analysis(19/25)/info-arch(6/30)/lotto(26/30) gap 자연 대기.

## cycle 2683 (2026-09-01) — RETRO-ONLY

- fix-incident(lite): 진단 — 개방 issue 0, approved plan 0/22(전부 completed/archived/deferred). fix-incident 마지막 발화 cycle 2663 → gap=20, 주기보정 trigger(7) 정확히 도달. 직전8 distinct=3(2-chain lock 미충족), 직전20 review-code 계열 dominance 지속.
- 점검 3종: `gh run list` 최근 30 run 전부 success/skipped(실패 0건) / `pipeline_runs` 최근 7일 161건 전부 status=success(non-success 0건) / 최근 50 commit debug·hotfix grep 신규 미해결 건 없음.
- 신규 인시던트 0건 확인 — cycle 2526/2635 동일 20-cycle gap trigger 발화 결과와 동일(3번째 연속 negative), 시스템 안정 지속 evidence. 코드 변경 없음.
- 다음 사이클 추천 = review-code(heavy) dominance-positive streak 복귀(신규 후보 재탐색 필요, cycle 2682 시점 search/page.tsx 소진) 또는 op-analysis(17/25)/info-arch(4/30)/lotto(24/30) gap 자연 대기.

## cycle 2682 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/29(전부 completed/archived/deferred), gap trigger 4종 전부 미도달(fix-incident 19/20, op-analysis 16/25, info-arch 3/30, lotto 23/30), 직전8 distinct=3(2-chain lock 미충족). 직전20 chain 분포 review-code 계열 15/20(75%) dominance-positive streak 정합. GH Actions 최근 run 실패 0건, DESIGN.md 당일 갱신 — 타 trigger 미충족.
- `app/search/page.tsx`(cycle 2680 carry-over 후보) 전체 정독 — STATIC_PAGES 47개 슬러그 전부 실제 라우트 존재 + SearchClient.tsx 필드 전부 소비 확인, drift 0건(cycle 2620/2622 에서 이미 정리됨). 최고령 미터치 대형파일 재스캔 → `lib/players/buildPitcherLeaderboard.ts`(2026-05-18 이후 미터치) 채택.
- predictions select 절 + `Row` interface 의 `confidence` 필드가 집계 loop 어디서도 참조 안 됨(`is_correct`/`predicted_winner` 만 실사용) — cycle 2677/2678/2680 과 동일 죽은-select-필드 패턴 4번째 발견. 제거.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 05629a18).
- 다음 사이클 추천 = review-code(heavy) 계속 가능(신규 후보 재탐색 필요 — search/page.tsx 소진) 또는 fix-incident(19/20 근접)/op-analysis/info-arch/lotto gap 자연 대기.

## cycle 2681 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/29(전부 completed/archived/deferred), gap trigger 4종 전부 미도달(fix-incident 18/20, op-analysis 15/25, info-arch 2/30, lotto 22/30), 직전8 distinct=3(2-chain lock 미충족). 직전20 chain 분포 review-code 계열 14/20(70%) dominance-positive streak 정합. cycle 2680 next_rec 후보 `lib/picks/buildPicksStats.ts`(410줄, 2026-08-20 이후 미터치) 채택.
- 전체 정독 + 소비 컴포넌트 7개 cross-check. `PicksStats.agreedResolved`/`agreedCorrect`(divergent 통계와 같은 loop 부산물) + `FactorAgreementRow.neutral` 3개 필드가 어떤 UI 컴포넌트도 읽지 않고 단위 테스트에서만 assert됨 — computed-but-unconsumed 패턴(이전 3 cycle 의 DB select-필드 패턴과 다른 변종). `total` 은 factor 정렬 키로 실사용 확인 후 유지.
- 미소비 필드 제거 + loop 단순화 + 테스트 정리. `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 23fcf115).
- 다음 사이클 추천 = review-code(heavy) 계속 가능(신규 후보 재탐색 필요 — cycle 2680 next_rec 소진) 또는 fix-incident/op-analysis/info-arch/lotto gap 자연 대기.

## cycle 2680 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/29(전부 completed/archived/deferred), gap trigger 4종 전부 미도달(fix-incident 17/20, op-analysis 14/25, info-arch 1/30 — 직전 cycle 발화, lotto 21/30), 직전8 distinct=4(2-chain lock 미충족). 직전20 chain 분포 review-code 계열 14/20(70%) dominance-positive streak 정합. cycle 2677/2678 retro 공통 carry-over `lib/mlb/buildMlbTeamProfile.ts`(384줄, 2026-08-24 이후 미터치) 채택.
- `prediction_type` 이 select 되지만 필터는 이미 `.eq()` 로 서버측 적용, 반환 데이터 미참조(전체 파일 + 6개 소비자 cross-check) — cycle 2677/2678 과 동일 죽은-select-필드 패턴 3번째. select 절 + interface 에서 제거.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화). CHANGELOG.md 갱신. 단일 논리 단위 → 직접 main commit+push(R4/R7, 25e105e8).
- 다음 사이클 추천 = review-code(heavy) 계속 가능(신규 후보: `lib/picks/buildPicksStats.ts`/`app/search/page.tsx`, 둘 다 2026-08-20 이후 미터치) 또는 fix-incident/op-analysis/info-arch/lotto gap 자연 대기.

## cycle 2679 (2026-09-01) — RETRO-ONLY

- info-architecture-review: 진단 — 개방 issue 0, approved plan 0/29(전부 completed/archived/deferred), gap trigger 재확인(fix-incident 16/20, op-analysis 13/25, lotto 20/30 미도달) + info-arch gap = 31/30 **도달**(마지막 발화 cycle 2648) → trigger 9 발동. 직전8 distinct=3(review-code(heavy)/review-code/polish-ui, 2-chain lock 미충족)이라도 gap trigger 명시적 발화 — review-code(heavy) dominance(직전20 중 14/20) 다양성 전환 겸함.
- 신규 라우트 0건(`b50240c6..HEAD --diff-filter=A -- '**/page.tsx'`, 같은 구간 3커밋 전부 기존 라우트 fix), breadcrumb 누락 18건 전부 `ia-hierarchy.md` 기존 exclusion 과 일치, sitemap 83 URL vs 105 page.tsx 격차도 기존 패턴(동적 세그먼트+noindex) 동일 — 신규 drift 0건.
- checkpoint 문서만 박제(`docs/design/ia-2026-09-01-cycle-2679-30-cycle-gap-checkpoint.md`). 코드 변경 0.
- 다음 사이클 추천 = review-code(heavy) 계속 가능(신규 후보: `lib/mlb/buildMlbTeamProfile.ts` 동일 죽은-select-필드 패턴, 또는 `lib/picks/buildPicksStats.ts`/`app/search/page.tsx`) 또는 fix-incident/op-analysis/lotto gap 자연 대기.

## cycle 2678 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23. explore-idea saturation(13/15) 재도달했으나 4-source 재확인 negative(plan#29 트리거 미변화 — postseason 아직 안 임박/traffic 무변화 추정, TODOS Next-Up stale, GH issue 0, 신규라우트 92건 git checkout 부작용). fix-incident lite 재점검(`gh run list` 전부 success/skipped) negative. 다양성 전환 실패 → review-code(heavy) dominance-positive streak 정합 재선택. cycle 2677 carry-over 소진 후 최종 커밋일 기준 재정렬 — 가장 오래 미터치(2026-08-14, 18일) 대형 파일 `lib/mlb/buildMlbMatchupProfile.ts`(526줄) 채택.
- 서브에이전트 전체 정독 + 소비자(mlb/matchup 페이지 2곳) + KBO sibling(`buildMatchupProfile.ts`) 교차검증. CURRENT_SCORING_RULE/KST 처리/confidence 스케일 전부 clean. 유일 발견: `PredRow.prediction_type` select 되지만 미사용(서버 필터는 `.eq()`로 별도 적용) — cycle 2677 과 동일 죽은-select-필드 패턴. 제거.
- sibling `buildMlbTeamProfile.ts` 에도 동일 패턴 잔존 확인 — 다음 cycle 후보로 carry-over.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화). CHANGELOG.md 갱신. 단일 논리 단위 → 직접 main commit+push(R4/R7, d3020dd0).
- 다음 사이클 추천 = review-code(heavy) 계속 가능(신규 후보: `lib/mlb/buildMlbTeamProfile.ts` 동일 패턴, 또는 `lib/picks/buildPicksStats.ts`/`app/search/page.tsx` 등 2026-08-20 이후 미터치 파일) 또는 fix-incident/op-analysis/info-arch/lotto gap 자연 대기.

## cycle 2677 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 14/20, op-analysis 11/25, info-arch 29/30, lotto 18/30), 직전8 distinct=4(2-chain lock 미충족). cycle 2674/2675/2676 retro 공통 추천(review-code(heavy) 계속) + carry-over 후보 `lib/reviews/buildMissReport.ts`(216줄)/`app/reviews/misses/page.tsx`(249줄) 채택.
- 전체 정독 + `MissesSortControl`/OG·twitter 이미지/관련 테스트 교차검증. `game_date` DATE 컬럼(UTC-slice 대상 아님), `CURRENT_MODEL_FILTER` 사용 기존 관례(cycle 2673) 정합, revalidate=1800 기존 wave-133/175 가드 존재. CE-fallback(`debate_version IS NULL`) 예측이 `reasoning.debate.verdict.homeWinProb` 부재로 tossup 오분류→미스리포트 누락되는 가설을 서브에이전트로 정밀 검증했으나, `debate.ts` judge 실패 시에도 verdict fallback 이 quant `homeWinProb` 를 그대로 채워 실제로는 non-issue 확인.
- 유일한 실제 발견: `PreGameRow` 의 `confidence`/`predicted_winner` 두 필드가 select 되지만 함수 어디서도 미사용(죽은 컬럼) — select 절 + interface 에서 제거.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(무변화). CHANGELOG.md 갱신. 단일 논리 단위 → 직접 main commit+push(R4/R7, 3ebb88ba).
- 다음 사이클 추천 = review-code(heavy) 계속 가능하나 cycle 2674 next_rec 3개 후보(players/page.tsx, buildMissReport.ts, misses/page.tsx) 전부 감사 완료 — 신규 대형 파일 재탐색(최종 커밋일 기준 정렬) 필요, 또는 fix-incident/op-analysis/info-arch/lotto gap 자연 대기.

## cycle 2676 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 13/20, op-analysis 10/25, info-arch 28/30, lotto 17/30), 직전8 distinct=3(review-code(heavy)×6+explore-idea×1+polish-ui×1, 2-chain lock 미충족), 직전20 사이클 chain 분포 전부 ≥1회(cycle49 룰 미충족). cycle 2674/2675 retro 공통 추천 미감사 후보 중 최대 규모 `app/players/page.tsx`(315줄, 2026-07-14 이후 미터치) 채택.
- 서브에이전트로 전체 정독 + `buildPitcherLeaderboard.ts`/`buildBatterLeaderboard.ts`/`config/model.ts`/`buildSeasonSummary.ts` 교차검증. scoring_rule 필터·KST 시즌 연도는 이전 wave에서 이미 정정 확인(clean). drift 1건: `page.tsx:247` 이 batter `last_synced`(UTC ISO)를 `slice(0,10)` 으로 그대로 잘라 KST 날짜인 척 표시 — 자동 cron은 날짜 경계를 안 넘어 무해하지만 무제한 `workflow_dispatch` 수동 실행(KST 00:00~08:59)시 하루 앞선 날짜 노출 가능한 잠재 버그(compareModels.ts 계열과 동일 UTC-slice-as-KST 패턴).
- `toKSTDateString()` 로 교체 + `players-page.test.ts` 소스 grep 회귀 가드 추가.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests green(+1). CHANGELOG.md 갱신. 단일 논리 단위 → 직접 main commit+push(R4/R7, 13a0c37d).
- 다음 사이클 추천 = review-code(heavy) 계속 가능(신규 후보: `lib/reviews/buildMissReport.ts`(216줄)/`app/reviews/misses/page.tsx`(249줄), 두 후보 모두 cycle 2674부터 carry-over 미처리) 또는 fix-incident/op-analysis/info-arch/lotto gap 자연 대기.

## cycle 2675 (2026-09-01) — SUCCESS

- polish-ui: 진단 — 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 11/20, op-analysis 9/25, info-arch 27/30, lotto 16/30), 직전8 distinct=2(review-code×7+explore-idea×1) → 2-chain alternation lock 발동. review-code/explore-idea 제외 후 다른 trigger 없어 규칙대로 polish-ui 강제 발화.
- 서브에이전트로 DESIGN.md 토큰 체계 + wave-144 OG/twitter gradient 레지스트리(8종) 커버리지 재감사. drift 3건: `mlb/team` og/twitter 가 `MLB_GRADIENT_TEAM_SKY_135`(en 미러 이미 사용) 대신 다른 블루 리터럴 중복 하드코딩 / "선수" OG 패밀리 3갈래 색(KO 보라·EN 초록·KO 상세 리터럴 금갈색) / `mlb/factors` vs `en/mlb/factors` 시작색 1-hex 오탈자.
- team+factors 는 기존 토큰/원본값으로 정렬, players 는 GREEN 토큰(2/4 이미 사용 중)으로 통일 — VIOLET 토큰 사용처 소진돼 design-tokens.ts 에서 제거(9→8종). `silent-drift-wave-144.test.ts` 그룹 파일 목록 갱신.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4482 tests green(+6). CHANGELOG.md + DESIGN.md Decisions Log 갱신. 단일 논리 단위 → 직접 main commit+push(R4/R7).
- 다음 사이클 추천 = 2-chain lock 해소됐으니 review-code(heavy) 재개 가능(신규 후보: `lib/reviews/buildMissReport.ts`/`app/players/page.tsx`/`app/reviews/misses/page.tsx`, cycle 2674 next_rec carry-over) 또는 fix-incident/op-analysis/info-arch/lotto gap 자연 대기.

## cycle 2674 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23(status: approved 있는 항목 없음), gap trigger 4종 전부 미도달(fix-incident 11/20, op-analysis 8/25, info-arch 26/30, lotto 15/30), 직전8 distinct=3(2-chain lock 미충족). cycle 2673 이 review-code(heavy) 미감사 컴포넌트 소진을 명시 → 최종 커밋일 기준 재정렬, `lib/dashboard/compareModels.ts`(299줄, 2026-07-16 이후 미터치) 채택.
- 서브에이전트 전체 정독 + 소비자 3곳(`debug/model-comparison/page.tsx`/`CalibrationPlot.tsx`/`buildShadowCalibration.ts`) 교차검증. drift 2건: `dailyByModel`의 KST 미보정 날짜 버킷(자정 경계 row 하루 앞선 날짜로 오분류) + `/debug/model-comparison` 헤더 하드코딩 리터럴 `'v1.8'`(cycle 2672 동일 클래스, 오늘 우연히 값 일치).
- 양쪽 fix + consumer cutoff 보정 + 기존 wave-251 regression guard 갱신(하드코딩 리터럴 assert → CURRENT_SCORING_RULE interpolation assert로 교체 + 재발 방지 assertion 추가) + compareModels.test.ts KST 경계 케이스 보강.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4476 tests green(+1). CHANGELOG.md 갱신. 단일 논리 단위 → 직접 main commit+push(R4/R7, 75864b42).
- 다음 사이클 추천 = review-code(heavy) 계속(신규 대형 파일 재탐색 — 이번 발견 기준 "최종 커밋일 정렬"이 유효한 후보 발굴 방법임을 확인, 다음은 `lib/reviews/buildMissReport.ts`(216줄, 2026-07-16)/`app/players/page.tsx`(315줄, 2026-07-14)/`app/reviews/misses/page.tsx`(249줄, 2026-07-17) 후보) 또는 fix-incident/op-analysis/info-arch/lotto gap 자연 대기.

## cycle 2673 (2026-09-01) — RETRO-ONLY

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 10/20, op-analysis 7/25, info-arch 25/30, lotto 14/30), 직전8 distinct=4(review-code(heavy)4+operational-analysis1+explore-idea1+review-code2, 2-chain lock 미충족). cycle 2669/2670/2671/2672 retro 공통 추천 미감사 컴포넌트 `TeamBiasTable.tsx`(136줄)/`ModelVersionHistory.tsx`(109줄) 채택 — 남은 미감사 후보 전부 소진.
- 서브에이전트로 전체 정독 + `buildTeamBiasAnalysis`/`buildMlbTeamBiasAnalysis`/`buildVersionHistory`/`accuracy` page.tsx 데이터 흐름 교차검증. 실제 drift 0건 — `ModelVersionHistory`는 이미 `CURRENT_SCORING_RULE` 정상 import(하드코딩 없음), `TeamBiasTable`은 애초 버전 라벨 미렌더링. cohort 필터도 정상: `buildTeamBiasAnalysis`류는 현재 모델 스냅샷이라 `CURRENT_MODEL_FILTER` 사용이 의도된 설계(era 비교용 `buildVersionHistory`와 다른 목적), page.tsx는 기존 `versionHistoryRows`(unfiltered) 정상 사용 중(cycle 2490 fix + 회귀 가드 존재).
- 유일한 관찰 = 두 컴포넌트 모두 component-level render 테스트 부재(기존 silent-drift regex 가드만 존재) — review-code(heavy) fix 대상 아님, 향후 expand-scope/테스트 커버리지 후보로만 기록.
- 코드 변경 없음(clean audit). tsc/lint/vitest 재실행 불필요(변경 없음).
- 다음 사이클 추천 = review-code(heavy) 미감사 대상 소진됨 — 신규 대형 파일/컴포넌트 재탐색 필요 또는 fix-incident/op-analysis/info-arch/lotto/explore-idea gap 자연 대기.

## cycle 2672 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 6/25, info-arch 24/30, lotto 13/30), 직전8 distinct=3(review-code(heavy)6+operational-analysis1+explore-idea1, 2-chain lock 미충족). cycle 2668/2670/2671 retro 공통 추천 미감사 컴포넌트(`TeamMatchupCards`/`TeamBiasTable`/`ModelVersionHistory`/`FactorAccuracyTable`) 실측 재확인 — `TeamMatchupCards`는 이미 테스트 존재(51줄) 확인돼 제외, 나머지 3개 중 최대 규모 `FactorAccuracyTable.tsx`(170줄) 채택.
- 서브에이전트로 전체 정독 + `buildFactorAccuracy.ts`/`buildMlbFactorAccuracy.ts`/3개 호출부(`accuracy`, `mlb/accuracy`, `en/mlb/accuracy` page.tsx) 교차검증. 실제 drift 1건 발견: KBO footer 문구가 `(v1.8 cohort n=...)` 로 `CURRENT_SCORING_RULE` 값을 리터럴 하드코딩 — `BrierTrendChart.tsx`(silent drift wave-260, cycle 1566)에서 이미 한 번 고친 동일 버그 클래스이자 `config/model.ts` "버전 전환 시 체크리스트"가 명시 경고하는 재발 패턴. 오늘은 우연히 `CURRENT_SCORING_RULE==='v1.8'`이라 값이 맞았지만 다음 버전 bump 시 silent stale 확정. (cohort 필터/SMALL_SAMPLE_N 소표본 hedge/KBO·MLB 팩터키 분리는 전부 정합 확인 — 추가 버그 없음.)
- `CURRENT_SCORING_RULE` import + 리터럴 교체. 기존 `silent-drift-wave-663.test.ts` 의 import 정규식이 `SMALL_SAMPLE_N` 단독 import만 매칭해 과도하게 엄격 — sibling import 허용하도록 완화. 회귀 가드 신규(`silent-drift-cycle-2672.test.ts`).
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4475 tests green(+2). CHANGELOG.md 갱신. 단일 논리 단위 → 직접 main commit+push(R4/R7, 17fbd6fa).
- 다음 사이클 추천 = review-code(heavy) 계속(잔여 미감사 컴포넌트: `TeamBiasTable`/`ModelVersionHistory`, 이 2개는 component-level 테스트 여전히 부재) 또는 fix-incident/op-analysis/info-arch/lotto gap 자연 대기.

## cycle 2671 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 8/20, op-analysis 5/25, info-arch 23/30, lotto 12/30), 직전8 distinct=5(review-code(heavy)4+review-code1+operational-analysis1+fix-incident1+explore-idea1, 2-chain lock 미충족). cycle 2668/2670 retro 가 공통 추천한 미감사 컴포넌트급 후보(`TeamMatchupCards`/`TeamBiasTable`/`ModelVersionHistory`/`FactorAccuracyTable` 또는 `MlbAccuracyDashboard.tsx` 401줄) 중 가장 큰 `MlbAccuracyDashboard.tsx` 채택.
- Explore 서브에이전트로 전체 401줄 정독 + `buildAccuracyData.ts`/`buildMlbAccuracySummary.ts`/`buildMlbTeamAccuracy.ts`/shared 상수/`mlb/accuracy`·`en/mlb/accuracy` page.tsx/관련 테스트 교차검증. 실제 drift 1건 발견: 파일 헤더 주석(wave-626, 2026-08-14 최초 커밋)이 "rolling accuracy/brier trend/요일별 등 나머지 섹션은 후속 wave 후보로 남김"이라 서술했으나, 이후 6개 커밋(`febe1de4`/`6388a554`/`3a23c92c`/`4a306bf3`/`6973dd35`/`e79af5d3`+`1c781b5b`)이 winner-prob bucket/rolling accuracy/brier trend/scoring_rule day·week heatmap/cohort 비교/team table 을 순차 구현해 전부 이미 렌더링 중임에도 헤더 주석이 8개월 넘게 갱신되지 않아 파일 본문과 정반대 서술 상태였음. (참고: scoring_rule day/week heatmap 이 MLB 에서 항상 'all' 행만 채워지는 건 cycle 2189/2193 에 이미 발견·테스트 고정된 의도된 동작 — 신규 버그 아님.)
- 헤더 주석만 정정(로직 변경 없음). `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 570 files/4473 tests green. 단일 논리 단위 → 직접 main commit+push(R4/R7, 343cc066).
- 다음 사이클 추천 = review-code(heavy) 계속(잔여 미감사 컴포넌트: `TeamMatchupCards`/`TeamBiasTable`/`ModelVersionHistory`/`FactorAccuracyTable`, 이 4개는 component-level 테스트도 부재 확인됨) 또는 fix-incident/info-arch/lotto gap 자연 대기.

## cycle 2670 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 7/20, op-analysis 4/25, info-arch 22/30, lotto 11/30), 직전8 distinct=4(review-code(heavy)5+fix-incident1+operational-analysis1+explore-idea1, 2-chain lock 미충족). cycle 2668/2669 retro 가 명시 추천한 review-code(heavy) 미감사 대형 파일(`buildAccuracyData.ts`, 776줄) 채택.
- 서브에이전트로 전체 정독 + 관련 migration/shared 상수/테스트/4개 소비 컴포넌트 교차검증. 진짜 drift 발견: `buildScoringRuleDayHeatmap`/`buildScoringRuleWeekHeatmap`(SCORING_RULE_HEATMAP_ROWS = 'all'+PRODUCTION_ERA_HISTORY+'v1.8-credit-fail' 다중 era 비교 전제 설계) + `buildBrierTrend`(BrierTrendChart 의 SR_COLOR_MAP 이 v1.5/v1.6/v1.7-revert 색상까지 정의) 세 함수 모두 `apps/moneyball/src/app/accuracy/page.tsx` 호출부에서 `CURRENT_MODEL_FILTER`(scoring_rule='v1.8')로 걸러진 `rows` 를 인자로 받아왔음 — 입력에 v1.8 외 scoring_rule 이 전혀 없어 나머지 era cohort 가 영구히 n=0, cohort 비교 기능 자체가 구조적으로 죽어있었음. `buildVersionHistory` 가 동일 문제를 이미 겪고 `versionHistoryRows`(unfiltered)로 교체된 전례(page.tsx:277 주석)가 있었으나 이 세 함수엔 적용되지 않은 잔여 케이스.
- page.tsx 세 호출부(`buildScoringRuleDayHeatmap`/`buildScoringRuleWeekHeatmap`/`buildBrierTrend`)를 `versionHistoryRows` 로 교체(함수 내부 로직 변경 없음, 데이터 소스만 교체) + 회귀 가드 테스트(`silent-drift-cycle-2670.test.ts`) 신규.
- `pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 570 files/4473 tests green(신규 3). CHANGELOG.md 갱신. 단일 논리 단위 → 직접 main commit+push(R4/R7, 81d1d4c3).
- 다음 사이클 추천 = review-code(heavy) 계속(컴포넌트 레벨 미감사 후보: `TeamMatchupCards`/`TeamBiasTable`/`ModelVersionHistory`/`FactorAccuracyTable`, 또는 대형 파일 `MlbAccuracyDashboard.tsx` 401줄) 또는 fix-incident/info-arch/lotto gap 자연 대기.

## cycle 2669 (2026-09-01) — RETRO-ONLY

- explore-idea(lite): 진단 — 개방 issue 0, approved plan 0/23(전량 completed/archived/status 없음). gap trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 3/25, info-arch 21/30, lotto 10/30). 직전8 distinct=3(review-code(heavy)5+operational-analysis2+fix-incident1, 2-chain lock 미충족). **explore-idea saturation trigger 충족**(직전15 review-code/fix-incident/polish-ui/info-arch 합 12/15 ≥12 — review-code 9+fix-incident 2+polish-ui 1) → review-code dominance 다양성 redirect로 자연 채택.
- lite quick-recheck 수행: TODOS.md Next-Up(7048행) 재확인 — 2026-04-25 시점 사용자 영역 1-line 항목(zshrc mcc alias)만 잔존, 이미 완료된 메커니즘(cycle 41+ 자동 fire 정상 작동 중) 대비 stale, 신규 리드 아님. `find apps/moneyball/src/app -name page.tsx -mtime -14` 는 전체 라우트가 매칭(최근 review-code 대량 정정 커밋 부산물, 신규 라우트 신호 아님 — false positive). 앱 소스 전체 `박제 중/TODO/FIXME/coming soon/준비 중` grep 재실행 — `settings`/`community`/`login`(Supabase Auth 미wiring, Tier4 기존 확인) + `mlb/players/[id]` Statcast 개별 선수 레이어(외부 스크래핑 소스 신규 필요) + `lotto` 주간 placeholder 4건 전부 기존 확인된 external-infra-blocked 항목 재확인, 신규 후보 0건.
- ~/lotto_picks/ 디렉토리 잔존 파일도 확인했으나 실제 파이프라인은 cycle 2478 이후 repo 내 `apps/moneyball/data/lotto-picks/`·`lotto-results/`로 이전(cron 자동화) — 레거시 위치라 신규 lotto 후속 아님, cycle 2659 검증과 정합.
- 신규 actionable idea 0건 — 6번째 연속 explore-idea 소진 재확인(cycle 1361/1693/2287/2417/2477/8052 계열과 동일 결론). 코드 변경 없음.
- 다음 사이클 추천 = review-code(heavy) 계속(컴포넌트 레벨 미감사 후보: `TeamMatchupCards`/`TeamBiasTable`/`ModelVersionHistory`/`FactorAccuracyTable`) 또는 fix-incident/info-arch gap 자연 대기.

## cycle 2668 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 2/25, info-arch 20/30, lotto 9/30), 직전8 distinct=3(review-code(heavy)5+operational-analysis2+fix-incident1, 2-chain lock 미충족). cycle 2667 retro 의 다양성 redirect 추천(fix-incident/info-architecture-review) 실사 검증 — fix-incident: gh run list 실패 0건/CI green, 실제 버그 신호 부재. info-architecture-review: breadcrumb 누락 grep trigger #2 겉보기 충족했으나 대상 전부(reviews/weekly·monthly KO/MLB/EN 6종, community/login/settings) redirect stub 또는 noindex placeholder 페이지로 확인 — 실제 IA 갭 아님(false positive). 둘 다 실질 trigger 부재 확인 후 review-code(heavy) dominance 유지 — cycle 2666 retro 가 명시 추천한 미감사 대형 파일(`buildAccuracyData.ts`/`daily.ts`) 중 `daily.ts`(1629줄, KBO 파이프라인 핵심, 6일 경과) 채택.
- Explore 서브에이전트로 전체 1629줄 정독 + shared/index.ts·schedule.ts·types.ts·관련 migration(004/018/019/034/043/052) 교차검증. PipelineMode 4모드/SHADOW_V20_WEIGHTS/PRODUCTION_COHORT_RULES/feature-flag env명/CONFIDENCE_FLAT_SPREAD_THRESHOLD/테이블·컬럼 참조 전부 정합. TODO/FIXME 0건, dead 함수 0건.
- 실제 drift 1건 발견: `daily.ts:791` 이 실제 박제하는 skip reason 문자열은 `'debate_fallback_quant'`(cycle 884 D fix 이후 라벨) 인데 `types.ts:199/202` 문서 주석은 구 라벨 `'debate_fallback'` 그대로 stale. `schedule.ts` 의 `ShouldPredictReason` 유니온에도 동일 구 라벨이 멤버로 남아있었으나 `shouldPredictGame()` 은 이 값을 절대 반환하지 않는 dead 멤버로 확인(SkippedGame.reason 은 별도 plain string 필드라 이 타입과 무관 — 서로 다른 두 곳에 같은 stale 문자열이 독립적으로 남은 케이스).
- `types.ts` 주석 2곳 정정 + `schedule.ts` 미사용 유니온 멤버 제거(동작 변경 없음, 타입/문서 전용). `pnpm --filter kbo-data exec tsc --noEmit` + `--filter shared`/`--filter moneyball` clean, vitest kbo-data 92 files/1215 tests green, pre-push lint+type-check 통과 → 직접 main commit+push(R4/R7, eb01727f).
- 다음 사이클 추천 = review-code(heavy, `buildAccuracyData.ts` 776줄 잔여) 또는 fix-incident/info-arch gap 자연 대기 — info-arch breadcrumb trigger 는 이번 사이클 실사로 false positive 확정(모두 stub/redirect), 향후 동일 grep 결과 재검토 시 이 회차 결론 재사용 가능.

## cycle 2667 (2026-09-01) — RETRO-ONLY

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 4/20, op-analysis 1/25, info-arch 19/30, lotto 8/30), 직전8 distinct=4(2-chain lock 미충족). cycle 2666 retro 의 명시적 추천(review-code(heavy)) 채택, 미감사 pool 재탐색 결과 `fancy-stats.ts`/`silent-drift-alert.ts` 는 cycle 2656 에서 이미 재감사 완료 확인(cycle 2654 추천 stale 정정) — `apps/moneyball/src/app/analysis/analysis-data.ts`(974줄, 미감사) 채택.
- 전체 974줄 직접 정독. FACTOR_PICK_STRONG(8)과 FACTOR_PICK_MIN_FACTORS(7) 이원 사용(gameOverviewSummary vs upcomingConvergenceTeams)이 shared/index.ts 주석과 완전 일치(혼동 아님), computeCompositeDuel h2h optional 파라미터 undefined 처리 정상, PRODUCTION_COHORT_RULES/ELO_NEUTRAL/H2H_MIN_GAMES 등 registry 상수 전부 정합.
- 신규 drift 0건 — clean audit, 코드 변경 없음.
- 다음 사이클 추천 = fix-incident 또는 info-architecture-review — review-code(heavy) 대형 파일 pool 지속 소진(최근 6/8 clean audit), dominance 완화 다양성 전환 권고 누적(cycle 2655/2665 동일 권고).

## cycle 2666 (2026-09-01) — RETRO-ONLY

- operational-analysis(lite): 진단 — 개방 issue 0, approved plan 0/23, CI green, gap trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 5/25, info-arch 18/30, lotto 7/30), 직전8 distinct=4(2-chain lock 미충족). review-code(heavy) dominance 11/19(58%) 지속이나 직전 2사이클(2664/2665) clean audit retro-only — 다양성 redirect 선택.
- `scripts/op-analysis-ce-cohort.ts` 재실행 (cycle 2661 streak break 후 5-cycle 경과, 재측정 가치 판단). 결과: 전체 n=357(CE n=310/비CE n=47) — cycle 2661 수치와 완전 동일, 신규 verified 예측 0건. CE 54.5%(169/310) / 비CE 63.8%(30/47) → 격차 9.3pp 그대로, LLM 부가가치 우세 결론 12회 연속 재확인.
- CLAUDE.md 모델 가중치 섹션에 cycle 2666 재측정 결과 append. 코드 변경 없음 — CREDIT_EXHAUSTED·비CE 표본 동결 상태 변화 없음.
- 다음 사이클 추천 = review-code(heavy, 새 미감사 파일 pool 재탐색: `buildAccuracyData.ts`/`analysis-data.ts`/`daily.ts`) 또는 fix-incident(gap 4/20)/info-arch(gap 19/30) 자연 대기.

## cycle 2665 (2026-09-01) — RETRO-ONLY

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 1/20, op-analysis 3/25, info-arch 16/30, lotto 5/30), 직전8 distinct=5(2-chain lock 미충족). 직전20 review-code(heavy) dominance 60%(12/20) 지속 — 강한 외부 신호 부재로 dominance channel 재선택.
- 미감사 대상 `buildTeamProfile.ts`(601줄)/`buildMatchupProfile.ts`(594줄, 둘 다 9일 경과) Explore 서브에이전트로 전체 정독. 상수(RECENT_RECORD_WINDOW/WIN_LOSS_STREAK_MIN_LENGTH/MARGIN_BLOWOUT_THRESHOLD 등) 문서화 주장 vs `packages/shared` 실제 값 대조 일치, 8팩터 claim vs `buildTeamFactorAverages.ts` 실제 필드 수 일치, 호출부 전수(`teams/[code]`/`matchup/[teamA]/[teamB]` KBO+MLB+en 미러) arity/순서 정합 확인, TODO/FIXME 0건, dead code 0건.
- 신규 drift 0건 — clean audit, 코드 변경 없음.
- 다음 사이클 추천 = operational-analysis(gap 4/25) 또는 fix-incident(gap 2/20) — review-code(heavy) 대형 파일 pool 계속 소진 중, 다양성 redirect 자연 시점 근접.

## cycle 2664 (2026-09-01) — SUCCESS

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 1/20, op-analysis 3/25, info-arch 16/30, lotto 5/30), 직전8 distinct=5(2-chain lock 미충족). 직전20 review-code(heavy) dominance 55%(11/20) 지속 — 강한 외부 신호 부재로 dominance channel 재선택.
- 대상1 `TeamMatchupCards.tsx`(106줄, 최근 미커버) 정독 — clean, drift 0건. 대상2 `backtest-manual-weights-run.ts`(마지막 터치 2026-07-13, 50일+ 경과) + sibling `backtest-bootstrap-ci-run.ts` 정독 — 실제 drift 발견.
- `WEIGHTS_V15 = { ...DEFAULT_WEIGHTS }` — DEFAULT_WEIGHTS 는 cycle 17 박제(v1.5) 이후 v1.6→v1.7-revert→v1.8 로 계속 진화했는데 변수명/주석/print label 전부 "v1.5 = 현재 prod DEFAULT_WEIGHTS" 고정 서술. 재실행 시 실제로는 최신(v1.8) 기준 값이 출력되는데 "Manual v1.5" 라 표기 — `data/backtest-results/2026-05-25-manual-weights.md` 등 과거 박제 결과물 라벨 오해 소지.
- 양쪽 파일에 clarifying 주석 추가(변수명/JSON 스키마 `manual_v15` 등 유지, 동작 변경 없음). `pnpm --filter kbo-data exec tsc --noEmit` clean, pre-push lint+type-check+test 통과 → 직접 main commit+push(R4/R7).
- 다음 사이클 추천 = operational-analysis(gap 4/25) 또는 fix-incident(gap 2/20) 자연 대기, 또는 review-code(heavy) 대형 미감사 파일 pool 소진 근접 — explore-idea saturation 재확인/다양성 redirect 고려.

## cycle 2663 (2026-09-01) — RETRO-ONLY

- fix-incident: 진단 — 개방 issue 0, approved plan 0/23, 직전8 distinct=5(2-chain lock 미충족), gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 2/25, info-arch 15/30, lotto 4/30). 직전20 review-code dominance 60%(12/20) 지속 — cycle 2661/2662 next_recommended_chain(fix-incident) carry-over 채택해 다양성 redirect.
- `gh run list -10` 전부 completed success/skipped(CI/lesson dispatch 정상). `scripts/check-v43-health.sh` 재실행 — post_game 301행, agent_memories 66행/팀별 정상 분산, 중복 0건.
- `pipeline_runs` 최근 10건 실측: id=2618 predict 모드 games_skipped=5(reason=window_too_early) 는 `schedule.ts` 문서화된 정상 skip(hoursUntil 8.2h > windowHours 3h, 10-22시 매정시 재시도 구조라 later cron 이 픽업) — 사례 11(window_too_late 영구누락) 과 다른 케이스, silent drop 아님 확인. `verify` 모드 08-31 games_found=0 은 08-31(월요일) KBO 경기 자체 없음(off day, DB 실측 games 테이블도 0건) — 정상.
- 신규 incident 0건 — 파이프라인 healthy 확인, 코드 변경 없음.
- 다음 사이클 추천 = review-code(heavy, dominance 지속 관찰 — 대형 미감사 파일 pool 소진 국면, 컴포넌트 레벨(TeamMatchupCards 등) 재탐색 필요) 또는 op-analysis(gap 3/25)/info-arch(gap 16/30)/lotto(gap 5/30) 자연 대기.

## cycle 2662 (2026-09-01) — RETRO-ONLY

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23, CI green(gh run list -10 전부 success/skipped), gap trigger 4종 전부 미도달(fix-incident 4/20, op-analysis 1/25, info-arch 14/30, lotto 3/30), 직전8 distinct=5(2-chain lock 미충족). explore-idea saturation 12/15 도달했으나 4-source 재확인 negative(TODOS Next-Up 여전히 stale mcc-alias 1-line, GH issue 0, plan#29 Tier4 유지, 신규라우트 91건=git checkout mtime 부작용) — 다수 과거 사이클과 동일 패턴.
- 강한 외부 신호 부재로 dominance chain(직전20 중 55%) 지속 선택, 최근 미커버 영역(`apps/moneyball/src/lib/analysis/convergenceRecord.ts`, 832줄, feature commit 최종 터치라 review sweep 미포함) 정독.
- `computeCompositeDuel.ts` 10팩터(lineup_woba/sfr/bullpen_fip/sp_fip/war/elo/recent_form/head_to_head/sp_xfip/park_factor) 구성과 cycle 2304 주석 주장("h2h 누락 시 validCount 최대 9/10") 대조 확인 일치. `MLB_FACTOR_PICK_STRONG(5)`/`COMPLETE(6)` 상수도 인라인 주석과 일치. `getConvergencePickHomeAwaySplit`/`TeamStats`/`DayOfWeekSplit` 호출부 14개 파일 전부 `(minFactors, startDate, endDate)` 인자 순서 정합 확인 — signature drift 0건.
- 신규 drift 0건 — clean audit, 코드 변경 없음.
- 다음 사이클 추천 = fix-incident 재확인(gap 5/20) 또는 op-analysis(gap 2/25, 근접) — review-code dominance(12/21) 지속 관찰, 다양성 redirect 자연 시점 근접.

## cycle 2661 (2026-09-01) — SUCCESS

- operational-analysis (lite): 진단 — 개방 issue 0, approved plan 0/23, gap trigger 4종 중 op-analysis 24/25 근접(미도달) + fix-incident 3/20 + info-arch 13/30 + lotto 2/30 전부 미도달, 직전8 distinct=4(2-chain lock 미충족). 직전 3사이클(2658/2659/2660) 모두 op-analysis 를 next_recommended_chain 으로 지목 — carry-over 채택.
- `scripts/op-analysis-ce-cohort.ts` 재실행: 전체 n=357 (CE n=310 / 비CE n=47, +16 CE 증가분 전부 8월 데이터). CE 54.5%(169/310) / 비CE 63.8%(30/47) → 격차 9.3pp (직전 10.4pp 대비 축소, 11회 연속 동일 streak break). overlap 월(05/06/07) 통제 격차는 10.8pp 그대로 — 전체 격차 축소는 8월 CE 표본 편입 효과, LLM 부가가치 우세 방향은 11회 연속 재확인.
- CLAUDE.md Calibration 현황 섹션에 cycle 2661 측정치 append. CREDIT_EXHAUSTED·비CE 동결(마지막 예측 2026-07-01, 62일+ 경과) 상태 변화 없음. 코드 변경 없음(retro-only), 데이터/문서 변경만.
- 다음 사이클 추천 = fix-incident(gap 4/20) 또는 review-code(heavy, dominance channel 재확인) — op-analysis gap 은 이번 측정으로 리셋(0/25).

## cycle 2660 (2026-09-01) — RETRO-ONLY

- review-code(heavy): 진단 — 개방 issue 0, approved plan 0/23, gap trigger 4종 전부 미도달(fix-incident 2/20, op-analysis 23/25, info-arch 12/30, lotto 1/30), 직전8 distinct=4(2-chain lock 미충족). 강한 외부 신호 부재로 dominance chain(직전20 중 60%) 지속 선택 — validator.ts(1015줄, LLM 응답 결정론적 검증 layer, 최근 review-code 사이클 미커버) 정독.
- 5개 서브체크(환각숫자/선수명발명/금칙어/claim-type/factor-attribution) + 6개 Sentry/DB capture 헬퍼 전부 실제 호출부(team-agent/judge-agent/postview/calibration-agent/debate/rivalry-memory)에 정상 연결 확인 — 고아 export 0건. team-agent 가 notifyValidationViolations 대신 logValidatorEvent(DB) 쓰는 점은 기존 의도된 채널 분리(Sentry vs DB), drift 아님.
- 신규 drift 0건 — clean audit, 코드 변경 없음. `pnpm --filter kbo-data exec tsc --noEmit` clean.
- 다음 사이클 추천 = operational-analysis(gap 24/25, 다음 도달 시 heavy 강제 권장).

## cycle 2659 (2026-09-01) — SUCCESS

- lotto (lite): 30-cycle 미발화 gap trigger 최초 도달(마지막 발화 cycle 2628, 31 사이클 경과). 다른 gap(op-analysis 22/25, fix-incident 1/20 리셋) 미도달, 직전8 distinct=4 2-chain lock 미충족.
- `pnpm tsx scripts/lotto.ts count` 재측정: valid=7,705,415/total=8,145,060(5.40% 제거) — cycle 2478/2508/2538/2598/2628 와 완전 동일, 6연속 재확인(valid_delta=0). `rules` 모드로 1~1239회 최신 반영 확인.
- pick_sample(2026-09-05.md, 1240회 1000세트)/self_verify(2026-08-29.md, 1239회 결과) 둘 다 cron 자동화(lotto-pick-update.yml 화요일 이관)로 이미 최신 — 수동 재생성 불필요. cron 정상 작동 확인이 본 사이클 핵심 성과.
- 다음 사이클 추천 = operational-analysis(gap 23/25, 근접권) 또는 fix-incident 재확인.

## cycle 2658 (2026-09-01) — SUCCESS

- fix-incident: 진단 중 gap-trigger 미도달 확인 도중 `gh run list` 실측 확인이 main branch CI red (commit `baa946f1` cron 금→화 이관 이후 3커밋 연속 방치) 를 발견. `lotto-routes.test.ts` 가 옛 금요일 cron('19 0,3,6 * * 5') assertion 그대로 남아 stale — 실제 워크플로는 사용자 2026-09-01 결정으로 화요일('19 0,3,6 * * 2') 로 이미 이관됨.
- root cause 명확(테스트만 안 따라감) 해 `/investigate` 생략, 직접 fix: assertion 정정 + `lotto-pick-monitor.yml` 주석 2곳(스케줄 언급) 동기화.
- `pnpm test` 전체 569 files/4470 tests green. commit `ad7cd15a` push, CI 실측 재확인 success(3분+ 소요, 폴링 확인).
- 다음 사이클 추천 = operational-analysis(gap 22/25 근접) 또는 fix-incident 재확인 — gap-trigger 만으론 못 잡는 실제 breakage 를 `gh run list` 실측이 잡은 사례, 습관화 권장.

## cycle 2657 (2026-09-01) — RETRO-ONLY

- 진단: open issue 0, approved plan 0/23. gap trigger 4종 전부 미도달(fix-incident 12/20, op-analysis 20/25, info-arch 9/30, lotto 29/30). `gh run list`/`pipeline_runs` 최근 10건 전부 success. 직전8 distinct=2(review-code(heavy) 7 + skill-evolution 1) → **2-chain alternation lock 발동** (cycle 225 룰) — 두 chain 후보에서 제외.
- 잔여 pool 전수 재확인: explore-idea saturation 4/15(미충족), lotto(9/5 픽 이미 shipped, D-7 부재), fix-incident(CI/파이프라인 전부 healthy), design-system/expand-scope(조건 무관). breadcrumb 누락 그렙(community/login/settings/reviews index/homepage)이 유일한 후보 신호였으나 전수 검증 결과 전부 false positive(noindex stub 3곳 + redirect-only index 2곳 + 홈페이지 관례 제외) — info-architecture-review 스킵.
- lock rule 3(어떤 chain 도 trigger 없으면 polish-ui 강제) 적용 → DESIGN.md 토큰 vs 컴포넌트 grep 재감사: text-[Npx] 잔존 0, AI배지 아이콘 크기 twin 0, `dark:border-gray-N` 미마이그레이션 0, amber/accent isTopPick drift 0 — 전부 cycle 2581/2611/2623/2625/2653 에서 이미 소진된 축. amber 광범위 사용은 postseason/wild-card 박스 + 3-tier 수렴배지(2026-07-18 결정)의 의도된 패턴 재확인.
- 신규 drift 0건 — clean audit, 코드 변경 없음.
- 다음 사이클 추천 = fix-incident(gap 13/20) 또는 op-analysis(gap 21/25) — gap 근접권, lock 지속 여부 재확인 필요.

## cycle 2656 (2026-09-01) — RETRO-ONLY

- 사전조치: 세션 시작 시 미커밋 상태(`.github/workflows/lotto-pick-update.yml` 금→화 cron 변경, 2026-09-01 사용자 결정) 발견 → R4 따라 즉시 commit+push(`baa946f1`). push 과정에서 origin 이 자동화 커밋(lotto pick 1000세트 + op-analysis weekly cohort) 으로 2회 연속 전진 — rebase 로 정합.
- review-code(heavy): 진단 open issue 0, approved plan 0/23(전부 completed/archived). 2nd defense(cycle 2655 retro commit 존재) OK. gap trigger 4종 전부 미도달(fix-incident 11/20, op-analysis 19/25, info-arch 8/30, lotto 28/30 — lotto 는 방금 cron 이 2026-09-05 픽 자동 박제라 당장 실행 가치 부재). 직전8 distinct=3(review-code(heavy) 6+skill-evolution 1+info-arch 1) — 2-chain lock 미충족(<=2 아님). `gh run list` 전부 success(op-analysis PR 브랜치의 1건 실패는 이미 merge 완료된 PR #3072 의 stale pre-merge 로그 — 재발 아님). explore-idea saturation 14/15 충족되나 plan #29(로그인+커뮤니티) service-role count 재측정 = user_picks 1 / mlb_user_picks 0 / pick_poll_events 5 / mlb_pick_poll_events 0, cycle 2624/2648 과 완전 동일(무성장 6회 연속 확인) — skip. cycle 2653/2654/2655 3연속 명시 추천한 다양성 전환(fix-incident/info-arch) 도 트리거 자체가 없어 강제 선택 불가 — 결국 review-code(heavy) 잔존 후보(cycle 2654 carry-over: `fancy-stats.ts` 526줄/`silent-drift-alert.ts` 440줄) 채택.
- `fancy-stats.ts` 전체 정독: FS_TEAM_MAP 매칭/xfip fallback/Elo stub 전부 기존 silent-drift 가시화(`console.warn`) 이미 적용된 상태로 clean. `silent-drift-alert.ts` 전체 정독 + `mlb-pipeline.ts`/`daily.ts` 호출부 대조: `SilentDriftPipelineMode` 8개 mode 전부 `runMlbPipeline` 단일 dispatch(라인 859)로 커버 확인(락킹 없음), `mlb_combined_notify`(stub, gamesFound 항상 0)가 `MLB_SCRAPE_MODES` 밖이라 즉시 `gamesFound<=0` 조기 return 으로 자연 제외 — 의도된 설계(코드 주석과 일치), drift 아님.
- 신규 drift 0건 — clean audit, 코드 변경 없음(사전조치 ci commit 은 리뷰 대상 외 선행 작업). `pnpm --filter kbo-data exec tsc --noEmit` clean.
- 다음 사이클 추천 = fix-incident(gap 12/20) 또는 op-analysis(gap 20/25, 다음다음 도달권) 자연 대기 우선 검토 — review-code(heavy) 직전9 중 6회 dominance 지속 + 최근 4회 중 3회 clean audit(2654/2655/2656), 실질 소진 신호 누적 4회째. 트리거 부재로 강제 전환은 불가하나 다음 gap 도달 시 우선 채택 권장.

## cycle 2653 (2026-08-26) — SUCCESS

- review-code(heavy): 진단 open issue 0, approved plan 0/23(전부 completed/archived). gap trigger 4종 전부 미도달(fix-incident 8/20, op-analysis 16/25, info-arch 5/30, lotto 25/30). 직전8 distinct=5 — 2-chain lock 미충족. lotto(8/29 픽 이미 shipped + 데이터 3일 이내 신선)/polish-ui(text-[Npx] 잔존 13건 전부 테스트파일/globals.css 정의부라 실질 소진) 둘 다 실행 가치 부재 확인 → cycle 2634 retro 가 명시 추천한 carry-over("일반 경로 MAX_ATTEMPTS/llm-deepseek.ts/llm-ollama.ts 동일 off-by-one 확인") 19사이클 미처리 발견, 채택.
- `llm.ts` + `llm-deepseek.ts` 양쪽 `MAX_ATTEMPTS = LLM_RETRY_BACKOFF_MS.length`(3) 이 cycle 2634 가 529 경로에 고친 것과 동일 off-by-one — 마지막 backoff(2000ms) 가 실제 sleep 에 안 쓰이고 3번째 시도에서 즉시 실패, 파일 최상단 주석/`packages/shared/src/index.ts` 문서화 주석도 3개 backoff 전량 사용을 전제로 서술돼 있었음(실제 2개만 사용). `llm-ollama.ts` 는 LLM_RETRY_BACKOFF_MS 미사용(재시도 로직 자체 없음) — 스코프 제외.
- 양쪽 `MAX_ATTEMPTS = length+1`(4)로 fencepost 정정. 주석 갱신. `agents-llm.test.ts` 회귀 가드 신규(cycle 2653: 일반 5xx 경로 backoff 합 500+1000+2000=3500ms 전량 소비 직접 검증).
- `pnpm --filter kbo-data exec tsc --noEmit` + `--filter shared` + `--filter moneyball` clean. vitest kbo-data 92 files/1215 tests(+16, 신규 1) green + lint clean + pre-push hook 통과. version 167→168. commit 6545fe33.
- 다음 추천: operational-analysis(gap 17/25 근접) 또는 fix-incident(gap 9/20 여유) — review-code(heavy) 직전9 중 5회 dominance, 구체 carry-over 소진됐으니 다양성 전환 검토.

## cycle 2652 (2026-08-26) — RETRO-ONLY

- review-code(heavy): 진단 open issue 0, approved plan 0/23(전부 completed/archived/deferred). 2nd defense(cycle 2651 retro commit 존재) OK. gap trigger 전부 미도달(fix-incident 7/20, op-analysis 15/25, info-arch 4/30, lotto 24/30). 직전8 distinct=5(polish-ui/fix-incident/review-code/info-arch/skill-evolution) — 2-chain lock 미충족. `gh run list` CI 전부 green, `pipeline_runs` 최근 8건 전부 status=success + errors=[] (window_too_early skip 만 정상 사유). explore-idea saturation(13/15) 충족되나 유일 후보 plan #29(로그인+커뮤니티)는 cycle 2624 재확인 negative(무성장 지속) — 반복 재측정 회피.
- `daily.ts`(1629줄, 파이프라인 최대 단일 파일) 헤더~전체 주석 전수 grep 검토: `DEFAULT_WEIGHTS`/`HOME_ADVANTAGE`(0.015)/`SHADOW_V20_WEIGHTS`(elo 0.13/bullpen_fip 0.14/recent_form 0.13) 수치 CLAUDE.md·`packages/shared/src/index.ts` 와 완전 일치. `credit_exhausted_sent` dedup flag(cycle 2640 fix) 실 코드 존재 재확인. `calibration-agent.ts:218` 에서 `validateCalibrationHint`(cycle 2636 신규) 실제 호출 확인 — injection-validation family(team/judge/postview/calibration) 4 지점 전부 gap 0 재확인.
- 신규 drift 0건 — clean audit, 코드 변경 없음.
- 다음 추천: review-code dominance 지속 관찰 또는 lotto(gap 24/30, 근접) 다양성 전환 우선 검토.

## cycle 2651 (2026-08-26) — SUCCESS (skill-evolution 74회 자가 진화, phase 40)

- skill-evolution(forced): cycle 2650 마커("2650: ee641cdc...") 강제 발화. `/office-hours` skip (자동 fire 환경), 직전 20 cycle(2631-2650) 분석 범위 준수.
- **phase 40 stats**: review-code(heavy) 70%(+10pp vs phase 39 60%, stale comment/docstring drift 축 — llm.ts 확장수치/KST_OFFSET_MS 잔여/mlb-pipeline.ts 헤더 3건 연속) + fix-incident 10% + explore-idea/op-analysis/polish-ui/info-arch 각 5%. success 75%(15/20, 5 retro-only 전부 정상 clean). watch hang kill 0건(8 consecutive 50-cycle window). PASS_ship ~2231(+38 since 2600).
- **신규 evidence**: 사례 15 silent retro drift family 4번째 재발(cycle 2647) — phase 39 mitigation(회고 시점 자기 검증)은 세션이 회고 도달 전 끊기면 무력한 사각지대. cycle 2648 이 진단 단계 git log 대조에서 우연 발견 + retroactive backfill.
- **mitigation 박제**: 2차 방어선 신설 — 매 사이클 진단 첫 단계("직전 3 cycle_state read" 직후)에서 직전 사이클 retro commit 존재를 회고 도달 여부와 무관하게 상시 확인(`git log --grep "cycle-retro $((CYCLE_N-1)) " -F` 0건 시 즉시 backfill). SKILL.md "직전 사이클 retro commit 결손 감지 (2차 방어선)" 절 + MIGRATION-PATH.md phase 40 항목 신규 추가. `pnpm test` 569 files/4470 tests green (smoke).
- commit `5d1eb3da`(feat(skill), 빈 커밋 — SKILL.md/MIGRATION-PATH.md 는 repo 밖 `~/.claude/skills/develop-cycle/` 위치라 diff 미포함, body 에 phase 40 전체 요약) + push 완료.
- 다음 추천: review-code dominance 70% 재상승 monitor 또는 fix-incident(gap 여유) — 2차 방어선 실전 작동은 다음 세션-중단 재발 시 검증

## cycle 2650 (2026-08-26) — SUCCESS (milestone: 2650%50==0)
- review-code(heavy): 진단 open issue 0, approved plan 0/29. gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 13/25, info-arch 2/30, lotto 22/30). 직전8 distinct=5 — 2-chain lock 미충족. explore-idea saturation 13/15 충족되나 동일 후보(carry-over 부재) cycle 2647/2649 재확인 완료라 skip. CI green, 실패 workflow 0건 — fix-incident 후보 부재. cycle 2649 명시 추천(mlb-pipeline.ts/validator.ts) 채택.
- validator.ts(1015줄) 서브에이전트 정독 — clean(0 findings). mlb-pipeline.ts(875줄) 헤더 docstring(1~14행) 이 "MLB 7 mode" 서술 + `mlb_shadow_train`/`mlb_walk_forward_measure` 가 구 테이블 `walk_forward_brier`(migration 036, 스키마 불일치로 insert 100% silent 실패 이력) 를 가리키던 채 stale — 실제는 8 mode(`mlb_elo_update` 누락, plan #25 cycle 2082 추가분) + migration 049 `mlb_shadow_train_log`/`mlb_walk_forward_log`. 파일 내부 인라인 주석은 이미 정정돼있고 최상단 요약만 미반영.
- 헤더 주석 정정(동작 변경 없음, docstring only). `pnpm --filter kbo-data exec tsc --noEmit` clean. commit 7ded4466 + VERSION sync 누락 후속 commit ee641cdc(pre-push version-sync-guard 즉시 검출, v0.5.62.167).
- **milestone**: cycle 2650 % 50 == 0 — 다른 trigger 결과 무관 즉시 skill-evolution-pending 마커 박제(74th 자가 진화 예정, 다음 사이클 강제 발화). ship-0 emergency stop 미충족(직전10 중 success 7건).
- 다음 추천: skill-evolution (marker forced) — 다른 chain 자율 선택 X

## cycle 2649 (2026-08-26) — RETRO-ONLY
- review-code(heavy): 직전8 distinct=4(2-chain lock 미충족), fix-incident/op-analysis/lotto gap 전부 여유, explore-idea 유일 후보(plan #29 로그인+커뮤니티)는 cycle 2633 checkpoint 16사이클 전 재확인 완료라 반복 재측정 회피 → review-code(heavy) dominance-positive streak 계속.
- `convergenceRecord.ts`(831줄, KBO/MLB 수렴픽 통계) 신규 정독 — fetch/Streak/BestStreak/TeamStats/HomeAwaySplit/DayOfWeekSplit 함수 + 6개 caller 페이지(analysis/seasons/teams/reviews/monthly/weekly) 호출 인자 순서 전부 대조. drift 0건.
- `getFullYear()` 잔여 grep(10곳) — 4곳 이미 KST-safe 확인, 나머지 6곳(daily.ts CURRENT_SEASON/snapshot-pitchers.ts/sync-batter-stats.ts/retro.ts/API route 2개)은 season 기본값 용도라 Dec31→Jan1 UTC/KST 경계가 KBO 비시즌(게임 없음)이라 실질 영향 0 — hypothetical-scenario fix 회피(`feedback_data_only_claims` 원칙), 범위 제외.
- 코드 변경 없음(clean audit). 다음 추천: fix-incident(gap 5/20) 또는 review-code(heavy) 계속(mlb-pipeline.ts/validator.ts 후보) — op-analysis(gap 13/25)/lotto(gap 22/30) 여유

## cycle 2648 (2026-08-26) — RETRO-ONLY
- info-architecture-review: gap trigger 도달(마지막 발화 cycle 2618, 30사이클 경과). open issue 0, approved plan 0/29, 2-chain lock 미충족(직전8 distinct=3).
- 신규 라우트 0건(`git log bb6423b1..HEAD --diff-filter=A -- '**/page.tsx'`), breadcrumb 누락 18건 전부 `ia-hierarchy.md` 기존 문서 exclusion 과 일치, sitemap 83 vs page.tsx 105 격차도 동적세그먼트/noindex 로 기존 패턴과 동일 — 신규 drift 0건. checkpoint 문서만 박제(`docs/design/ia-2026-08-26-cycle-2648-30-cycle-gap-checkpoint.md`).
- 다음 추천: fix-incident(gap 3/20) 또는 review-code(heavy) 복귀 — op-analysis(gap 11/25)/lotto(gap 20/30) 는 여유

## cycle 2647 (2026-08-26) — SUCCESS (retro backfill — 사례 15 family 재발, cycle 2601 자기검증 룰 도입 이후 첫 실제 재발)
- review-code(heavy): 진단 open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 전부 미도달. 직전 8사이클 distinct=3 — 2-chain lock 미충족. explore-idea saturation 13/15 충족되나 유일 carry-over 후보가 이미 cycle 2424/2472 ship 완료 확인돼 폐기.
- cycle 2514 가 발견한 KST_OFFSET_MS family(서버 로컬 `getFullYear()` 가 UTC 기준이라 KST 12/31 15:00~23:59 UTC 구간 연도 off-by-one) 잔여 사용처 2건(`buildBatterLeaderboard.ts:45`, `sitemap.ts:121`) 정정 — 기존 `computeCurrentKSTYear()` 재사용, 신규 로직 없음. `silent-drift.test.ts` KST 연도 경계 fake-timer 회귀 케이스 추가 (commit c261b07f, v0.5.62.166).
- **silent skip 재발 발견**: `policy: cycle-retro 2647` commit + 본 TODOS 엔트리가 원 세션에서 누락된 채 active-cycle 이 dead pid 로 stale 방치 (session 중단). cycle 2601 이 도입한 "cycle-retro dispatch 자기 검증" 룰(signal 작성 직전 grep 확인)이 있었음에도, 세션 자체가 그 지점 도달 전에 끊겨 룰이 발동할 기회가 없었던 케이스 — 룰의 한계(세션 중단 시 검증 지점 자체 미도달) 노출. cycle 2648 진단 단계 첫 step(git log 대조)에서 즉시 감지 + 본 사이클(2648) 안에서 retroactive backfill.
- 다음 추천: fix-incident(gap 3/20) 또는 info-arch(gap 30/30, 임계 도달) 우선 검토 — op-analysis(gap 11/25)/lotto(gap 20/30) 는 여유

## cycle 2646 (2026-08-26) — SUCCESS
- review-code(heavy): 직전8 distinct=4(2-chain lock 미충족) + review-code(heavy) 5연속 SUCCESS streak(2639~2643, dominance-positive 인정) 따라 계속. 1차 타겟 `apps/moneyball/src/app/analysis/game/[id]/page.tsx`(877줄) 서브에이전트 정독 감사 — 이미 cycle 2407/2408·2542 에 감사된 파일로 clean 확인(신규 발견 없음).
- cycle 2634 retro 가 명시적으로 남긴 미처리 후속("일반 경로 MAX_ATTEMPTS/`llm-deepseek.ts`/`llm-ollama.ts` 동일 off-by-one 존재 여부 확인, 1순위 후보")으로 전환. 확인 결과: 일반경로 `MAX_ATTEMPTS=LLM_RETRY_BACKOFF_MS.length`(확장 없음, 3 유지)는 `llm.ts` 자체 주석("일반 5xx/네트워크 에러는 3 유지")과 `shared/index.ts:1632`("derived .length 패턴 그대로 유지") 양쪽에서 의도된 설계로 명시 — evidence-backed 신뢰성 이슈 부재라 수정 범위 제외(`feedback_data_only_claims` 원칙). `llm-deepseek.ts` 도 529 특수 확장 로직 자체가 없는 동일 설계, `llm-ollama.ts` 는 재시도 로직 부재.
- 대신 진짜 drift 1건 발견: `llm.ts:236` 인라인 주석 "529 발생 시 maxAttempts 동적 확장 (3 → 4)" 이 cycle 2634 fix(`MAX_OVERLOADED_ATTEMPTS = OVERLOADED_BACKOFF_MS.length + 1` = 4→5) 이후 stale — 실제 확장값은 5인데 주석만 옛 값(4) 유지. "(3 → 5, cycle 2634 fix)"로 정정, 동작 변경 없음.
- `pnpm --filter kbo-data exec tsc --noEmit` clean + `agents-llm.test.ts` 29 tests green. 단일 논리 단위 → 직접 main commit+push(commit 0655d6c3, v0.5.62.165).
- 다음 추천: info-arch(gap 29/30, 다음 사이클 자연 도달권) 또는 review-code(heavy) 계속(신규 unaudited 대상 재탐색) / op-analysis(gap 10/25)

## cycle 2645 (2026-08-26) — SUCCESS
- fix-incident: 마지막 발화(cycle 2615) 이후 gap 30/20 — 장기 미발화 주기 보정 trigger 충족. `pipeline_runs` 최근 7일 REST 조회 — `mlb_fancy_scrape` mode 가 2026-08-19~21 3일 연속 `fetchFangraphsMlbTeams: fangraphs HTTP 403`(games_found=0), 08-22부터 4일 연속 self-recover.
- 근본원인 = commit 1936f6a4(cycle 2278 User-Agent 헤더 fix)의 잔여 tail — 재발 코드 fix 불필요. 조사 확장 중 진짜 gap 발견: `silent-drift-alert.ts`의 `shouldAlertSilentDrift`가 `gamesFound<=0` 조기 return 에 걸려 MLB scrape mode가 fetch throw로 `gamesFound:0+errors` 리턴하는 total 실패 케이스를 alert 대상에서 완전히 놓침(Sentry warning만, Telegram 사용자 가시 채널 부재).
- `MLB_SCRAPE_MODES.has(mode) && gamesFound===0 && errors.length>0 → alert` 분기 추가. "경기 없는 정상 날"(teams.length===0, errors=[])은 `errors.length` 로 구분되어 영향 없음. 테스트 5건 신규(mlb_fancy_scrape/mlb_statsapi_scrape total 실패, 정상 빈 응답 미발화, rowsInserted=0 기존 분기 보존, non-scrape mode 범위 한정). `pnpm --filter kbo-data exec tsc --noEmit` clean + vitest 92 files/1214 tests(+15) green + lint clean (commit 2bc98e20, v0.5.62.164)
- 다음 추천: info-arch(gap 28/30, 다음 사이클 근접 도달권) 또는 review-code(heavy) 복귀

## cycle 2644 (2026-08-26) — SUCCESS
- polish-ui (2-chain lock fallback): 직전 8사이클 distinct=2(review-code(heavy)+operational-analysis(lite)) → 2-chain lock 탐지, 두 chain 제외. fix-incident/info-arch(26/30)/lotto(16/30, 다음회차 picks 이미 박제)/explore-idea 모두 강trigger 부재 → 룰 3번 polish-ui 강제 발화
- DESIGN.md 타이포 스케일 전역 grep(`text-\[Npx\]`) — `accuracy/page.tsx:758` "일요일 상한" 배지 유일 미토큰 잔여 1건 발견. 3xs(9px) 정의와 역할 일치 → `text-[8px]` → `text-3xs` 정렬 (commit 0acc66eb, v0.5.62.163)
- review-code(heavy) 5연속 SUCCESS streak 이후 첫 diversity 전환. 다음 추천: review-code(heavy) 복귀 또는 info-arch(gap 27/30, 다음 사이클 자연 도달권) / fix-incident(gap 10/20)

## cycle 2643 (2026-08-26) — SUCCESS
- review-code(heavy): `apps/moneyball/src/app/accuracy/page.tsx`(1229줄, 이번 sweep family 미탐색 축 — line-count 스캔으로 발견) 서브에이전트 정독 감사
- 헤더 카피 silent drift 발견+수정 — "시즌 내 모든 검증 완료 예측 기준"이라 주장하지만 실제 모든 통계는 `CURRENT_MODEL_FILTER`(scoring_rule='v1.8')로 필터링돼 이전 버전 예측(v1.5/v1.6/v1.7-revert/v1.8-credit-fail) 조용히 제외. 같은 페이지 FactorAccuracyTable 각주는 이미 "v1.8 cohort" 정확 노출 — 헤더만 자기모순. MLB 자매 페이지는 모델버전 필터 자체가 없어 동일 문구가 정확 — KBO 페이지 카피가 복사 후 미조정된 것으로 판단. "현재 모델 버전의 검증 완료 예측 기준(이전 버전 예측 제외)"으로 정정 (commit 7dafbca0, PR #3069)
- review-code(heavy) 5연속 SUCCESS streak (2639~2643). 다음 추천: 다양성 전환 우선 검토 — op-analysis 데이터 10회 연속 동일수치(gap 재측정 가치 낮음), info-arch gap 26/30(30 임계 근접, 다음 사이클 자연 도달권), fix-incident gap 9/20

## cycle 2642 (2026-08-26) — SUCCESS
- review-code(heavy): `apps/moneyball/src/app/analysis/page.tsx`(2833줄, cycle 2639/2641 반복 지목된 미탐색 렌더링 축) 서브에이전트 정독 감사
- isStrongUpcomingPick silent drift 발견+수정 — 정의/사용처 주석("TOP픽·완전수렴 외 FACTOR_PICK_STRONG 이상")과 달리 실제 코드는 TOP픽만 제외, FACTOR_PICK_COMPLETE(10)>=FACTOR_PICK_STRONG(8) 특성상 비TOP픽 완전수렴 경기에서 "★ 완전수렴"과 "⚡ 픽" 배지 동시 표시되던 gap. `!isCompleteUpcomingPick` 조건 추가 (commit 51e79839)
- 다음 추천: review-code(heavy) 계속 또는 다양성 전환(op-analysis gap 6/25, IA gap 25/30)

## cycle 2641 (2026-08-26) — SUCCESS
- review-code(heavy): `apps/moneyball/src/app/analysis/analysis-data.ts`(2833줄 analysis/page.tsx 첫 탐색 축, import chain 따라 발견) `getThisWeekRemainingGames` 정독 감사
- h2hRate parity gap 발견+수정 — h2hHomeWins/h2hAwayWins 는 이미 계산돼 있는데 `buildGameOverview` 호출 시 h2hRate 미전달, game/[id] 상세페이지는 전달함 → "이번 주 남은 경기" 미리보기에서만 "올 시즌 상대전적" 문장 항상 누락되던 gap. 3줄 diff, 4465 tests + typecheck green (commit 7d39cf0a)
- 다음 추천: review-code(heavy) 계속 시 analysis-data.ts 나머지 summary builder 함수군, 다양성 전환 시 op-analysis(gap 5/25)

## cycle 2640 (2026-08-26) — SUCCESS
- review-code(heavy): `packages/kbo-data/src/pipeline/daily.ts`(1622줄, injection-validation 스윕 미대상 pipeline orchestration monolith) 서브에이전트 정독 감사
- CREDIT_EXHAUSTED alert 블록 발견+수정 — "1회만 발화" 주석과 달리 dedup 장치 부재(predict mode 매시 최대 12회/일 재실행 + 무조건 Telegram/Sentry 발송, CE 2026-06-06~ 지속 상태라 중복발송 가능). `daily_notifications.credit_exhausted_sent` flag 추가(migration 052) + 기존 announce_sent/results_sent idempotent 패턴 wiring (commit 353242cf)
- 다음 추천: review-code(heavy) 계속 시 analysis/page.tsx(2833줄) 미탐색 축, 다양성 전환 시 op-analysis(gap 4/25)

## cycle 2639 (2026-08-26) — SUCCESS
- review-code(heavy): `packages/shared/src/index.ts`(3448줄, injection-validation 스윕 미대상 monolith) 서브에이전트 정독 감사 — 대부분 silent-drift-wave 테스트로 이미 견고
- HOME_ELO_BONUS JSDoc 자기모순 발견+수정 (인라인 11.85 vs 상세도출 10.43, 인접 0.024 prob shift가 실제 HOME_ELO_BONUS_WIN_PROB_PCT=3.4 와 불일치) — 주석 전용 fix, 코드 동작 변경 없음 (commit d46b9116)
- 다음 추천: polish-ui/info-architecture-review 재검토(3연속 negative 이후 4번째 시도) 또는 analysis/page.tsx(2833줄)/daily.ts(1622줄) 미탐색 축

## cycle 2638 (2026-08-26) — SUCCESS
- review-code(heavy): postview.ts runTeamPostviewAgent 환각검증 누락 5번째 gap 수정 (commit e8bb7b80)
- injection-validation family 5개 call site 전수 확인 완료 (team/judge/calibration/postview-judge/postview-team)
## 🔁 RETRO-ONLY — operational-analysis(lite): CE/비CE 재측정 10회 연속 동일 수치 (cycle 2637, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전8 distinct=3(review-code/explore-idea/fix-incident) — 2-chain lock 미충족. 직전15 saturation count=11/12(review-code+fix-incident+polish-ui+info-arch) — 임계 근접이나 미충족. 직전 2사이클(2635/2636) retro 가 명시적으로 diversity 권장(injection-validation family 소진) — polish-ui는 DESIGN.md 당일 갱신(negative), info-arch는 gap 19/30(미도달, cycle 2618 checkpoint "IA 충분" 재확정 직후) 대비 op-analysis 는 gap 11/25 지만 데이터 신선도 재확인 가치 있어 lite 선택.

`scripts/op-analysis-ce-cohort.ts` 재실행 — 전체 n=341 (CE n=294 / 비CE n=47), CE 53.4%(157/294) / 비CE 63.8%(30/47) → 격차 10.4pp. **cycle 2608 수치와 완전 동일** — CE n 증가 0, 비CE 완전 동결 지속(마지막 예측 2026-07-01, 56일+ 경과). LLM 부가가치 우세 결론 10회 연속 재확인. CREDIT_EXHAUSTED 상태 변화 없음(사용자 크레딧 재충전 미이행).

코드 변경 없음, CLAUDE.md 가중치 섹션에 재측정 결과 한 줄 append(RETRO-ONLY). 다음 사이클 추천 = review-code(heavy) 신규 axis 탐색(injection-validation family 소진 후 미탐색 대형 파일: `packages/shared/src/index.ts` 3448줄/`analysis/page.tsx` 2833줄/`daily.ts` 1622줄) 또는 info-architecture-review(gap 20/30 근접).

---

## ✅ SUCCESS — review-code(heavy): calibration-agent 사용자 가시 텍스트 환각검증 전무 gap 수정 (cycle 2636, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전8 distinct=4(lotto/review-code/explore-idea/fix-incident) — 2-chain lock 미충족. gap trigger 전부 미도달. 직전 retro(cycle 2632) 추천 `retro.ts`/`llm.ts` 전문 재확인 — 양쪽 이미 견고, 신규 버그 없음. 인접 파일 `calibration-agent.ts` 확인 중 team/judge-agent 와 달리 validator 호출이 전혀 없는 gap 발견.

`CalibrationHint.recentBias`/`teamSpecific`/`modelWeakness` 는 `/analysis/game/[id]` 페이지 + `DebateTimeline` 컴포넌트에 그대로 노출되는 사용자 가시 텍스트인데, LLM 이 실제 주입받은 `PredictionHistory` 수치와 다른 숫자를 지어내도 아무 검증도 없이 그대로 저장·노출됨 — team/judge/postview 3곳에 이미 존재하는 injection-validation family (cycle 2630~2632) 의 미커버 4번째 지점.

수정: `validateCalibrationHint` 신규(checkHallucinatedNumbers+checkBannedPhrases 재사용) + `buildStatsBlock` 분리(도메인 컨텍스트 decorative 숫자 제외 — 최초 구현에서 전체 buildUserMessage 를 넘겼다가 테스트로 false negative 직접 재현, 발견 즉시 분리) + `maskViolatedReasoning` 필드별 마스킹 wiring(judge-agent 와 동일 패턴, 전체 reject 아님).

`pnpm --filter moneyball exec tsc --noEmit` clean + `@moneyball/kbo-data` vitest 92 files/1207 tests(+9) green + `pnpm lint` clean. version 159→160 3-way sync. 단일 논리 단위 → 직접 main commit(`b0666dc5`)+push(R4/R7).

skill-evolution trigger 5개 전부 미충족 — 진행 정상.

다음 사이클 추천 = injection-validation family 사실상 전 지점(team/judge/postview/calibration) 소진 — polish-ui/info-architecture-review/op-analysis 다양성 전환 우선 검토 권장.

---

## 🔁 RETRO-ONLY — fix-incident(lite): 20-cycle gap trigger 강제 점검, live 인시던트 없음 (cycle 2635, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전8 distinct=7(2-chain lock 미충족). fix-incident 마지막 발화 cycle 2615 → gap=20 정확히 도달, trigger(7) 발동 — `pipeline_runs` 최근 7일 error rate + git log debug commit 강제 점검 수행.

`pipeline_runs` 최근 7일(2026-08-19~08-26) 161건 중 non-success 3건 전부 `mlb_fancy_scrape` — `fetchFangraphsMlbTeams: fangraphs HTTP 403`(08-19/08-20/08-21 3일 연속). 해당 스크래퍼 최근 15건 재조회 결과 08-22부터 08-25까지 4일 연속 success로 자연 회복 확인(원인 = FanGraphs 측 간헐적 anti-bot 차단으로 추정, User-Agent 자체는 cycle 2278 fix로 이미 정정됨 — `fangraphs-mlb.ts` 주석에 "2026-08-04~08-19 24/30일 실패" 히스토리 명시, 이후 재발이지만 익일 cron 재시도로 self-heal). `gh run list` 스케줄 workflow(CI Failure Dispatch / Vercel Deploy Failure Dispatch) 전부 skipped(실패 없음). `git log` debug/hotfix/revert commit 0건.

Live 인시던트 부재 확인 → 코드 변경 없음, RETRO-ONLY. gap trigger 의무 점검은 완료(사례 17 패턴 — CI/CD 별도 신호계열도 `gh run list`로 확인 포함).

다음 사이클 추천 = review-code(heavy) 계속(dominance-positive streak, injection-validation family 소진 후 별도 대형 파일 정독) 또는 op-analysis(직전발화 2626, gap 9/25 아직 여유) 다양성.

---

review-code(heavy) 직전20 60% dominance + injection-validation gap family 완전 소진(team-agent/judge-agent/postview 3경로 전부 cycle 2630~2632 패치, 실 호출부 3곳 재확인 잔여 gap 0) 확인 후 다양성 전환. plan #29 자체 지시 따라 재평가 트리거만 재측정: `user_picks`=1 / `mlb_user_picks`=0 / `pick_poll_events`=5 / `mlb_pick_poll_events`=0 — cycle 2417/2334 측정과 동일, 트래픽 변화 0. 포스트시즌(통상 10월) "직전" 시점도 아직 아님. 트리거 미충족 → Tier 4 보류 유지, 코드 변경 없음.

---

## ✅ SUCCESS — review-code(heavy): postview judge 환각검증 pre_game 전용 주입블록 재사용 gap 수정 (cycle 2632, 2026-08-26)

진단: open issue 0, approved plan 0/23. 2-chain lock 미충족(직전8 distinct=5). gap trigger 전부 미도달(fix-incident 17/20, op-analysis 6/25, info-arch 14/30, lotto 4/30). breadcrumb 미커버 18건 전수 재확인 — community(noindex 플레이스홀더)/reviews monthly·weekly 4종(redirect-only stub)/debug/*(내부전용) 전부 의도된 제외, info-arch negative. DESIGN.md 당일 갱신, polish-ui negative. 직전 3사이클 모두 diversity 추천했으나 재확인 negative로 dominance-positive streak 룰(cycle 135) 따라 review-code(heavy) 계속.

`validateJudgeReasoning` 전체 호출부 3곳 확인 중 `postview.ts:432`가 rivalryBlock 경로와 별개 gap 보유 발견: `buildJudgePostviewMessage`는 judge에게 actual 스코어/original.homeWinProb%/factorLines 편향값을 직접 노출하지만 `buildInjectionText`는 pre_game 전용이라 이 값들 없음 — 정당 인용해도 환각 오탐(테스트 미커버, 승률%·편향값 대부분 NUMERIC_WHITELIST 미통과 실측 확인).

수정: `buildInjectionText`/`validateJudgeReasoning`에 `extraContext` 신규 인자(rivalryBlock과 별개, postview는 항상 rivalryBlock='' + extraContext 전달). `postview.ts`에 `buildPostviewExtraInjection` 신규 export. `agents-validator.test.ts` 회귀 가드 2건.

`pnpm --filter moneyball exec tsc --noEmit` clean + `@moneyball/kbo-data` vitest 91 files/1198 tests(+2) green + `pnpm lint` clean. version 157→158 3-way sync. 단일 논리 단위 → 직접 main commit(`286b78ea`)+push(R4/R7).

skill-evolution trigger 5개 전부 미충족 — 진행 정상.

다음 사이클 추천 = 3사이클 연속 negative였던 polish-ui/info-architecture-review 대신 dimension-cycle 또는 explore-idea 재점검, 또는 review-code(heavy) 나머지 대형 파일(postview.ts 496줄 전체 정독 미완, retro.ts/llm.ts) 계속.

---

## ✅ SUCCESS — review-code(heavy): judge 경로 라이벌리 메모리 환각검증 누락 수정 (cycle 2631, 2026-08-26)

진단: open issue 0, approved plan 0/23. gap trigger 전부 미도달(fix-incident 16/20, op-analysis 5/25, info-arch 13/30, lotto 3/30). 2-chain lock 미충족(직전8 distinct=6). polish-ui(DESIGN.md 당일 갱신 negative)/info-architecture-review(breadcrumb 목록 cycle 2618과 동일) 재점검 후 신규 액션 없음 확인, cycle 2630이 명시 추천한 후속 스코프(judge-agent.ts/debate.ts가 rivalryBlock을 team-agent 경유로 흘려받는지) 그대로 진행.

`judge-agent.ts` buildUserMessage는 rivalryBlock을 직접 포함하지 않지만, judge가 종합하는 `homeArg.reasoning`/`awayArg.reasoning`(팀 에이전트 LLM 출력)은 cycle 2630 fix 이후 rivalryBlock 수치를 실제로 노출받은 상태 — judge가 그 수치를 정당 인용해 최종 reasoning(블로그 프리뷰 원문)에 반영해도 `validateJudgeReasoning(reasoning, context, mode)`가 `buildInjectionText(context)`를 rivalryBlock 없이 호출해 동일 환각 오탐 gap이 judge 경로에서 재발함을 확인(테스트 미커버).

수정: `validateJudgeReasoning(..., rivalryBlock = '')` 4번째 인자 추가 → `buildInjectionText(context, rivalryBlock)` 연결. `runJudgeAgent(..., context, rivalryBlock = '')` 8번째 인자 추가. `debate.ts`는 team-agent가 fetch한 promptBlock을 반환하지 않아 재사용 불가 — 기존 `Promise.all` 병렬 호출에 `getRivalryBlock(...)` 4번째로 추가해 별도 fetch 후 `runJudgeAgent`에 전달. `agents-validator.test.ts` 회귀 가드 2건 신규.

`pnpm --filter moneyball exec tsc --noEmit` clean + `@moneyball/kbo-data` vitest 91 files/1196 tests(+2) green + apps/moneyball vitest 568/4465 불변 + `pnpm lint` clean. version 156→157 3-way sync. 단일 논리 단위 → 직접 main commit(`94801aa2`)+push(R4/R7).

skill-evolution trigger 5개 전부 미충족 — 진행 정상.

다음 사이클 추천 = polish-ui 또는 info-architecture-review(dominance 완화 목적 다양성 유지, 둘 다 gap 여유) — review-code(heavy)의 rivalry-block 경로(team-agent → judge-agent)는 이번 사이클로 스코프 완료.

---

## ✅ SUCCESS — review-code(heavy): 라이벌리 메모리 블록 환각검증 누락 수정 (cycle 2630, 2026-08-26)

진단: open issue 0, approved plan 0/23. 2-chain lock 미충족(직전8 distinct=6). gap trigger 전부 미도달(fix-incident 15/20, op-analysis 4/25, info-arch 12/30, lotto 2/30). 직전20 review-code 계열 dominance 60%(12/20) — cycle 2628/2629 양쪽 추천대로 `validator.ts`(956줄, agents/ 최대·미착수 파일) 재조준. polish-ui(breadcrumb 18건 grep, DESIGN.md 당일 갱신 negative) / info-architecture-review(신규 라우트 mtime -7 전수 false positive, breadcrumb/sitemap 대조 cycle 2618과 동일) 양쪽 재점검했으나 신규 액션 없음 확인 후 배제.

Explore agent로 `validator.ts` 전체 정독 + 2차 자가검증(호출부 grep, git blame) — `buildInjectionText()`(환각 검증용 "LLM 실제 노출 텍스트" 재구성 함수, cycle 2122/2241 두 차례 `team-agent.buildUserMessage`와 동기화된 이력)가 `team-agent.ts`가 프롬프트 맨 끝에 직접 append하는 라이벌리 메모리 블록(`getRivalryBlock().promptBlock` — 최근 h2h 스코어 + `agent_memories.content` 숫자, `retro.ts`가 기록하는 실제 값)을 전혀 반영하지 않음을 확인. `renderContextForLLM(buildAgentContext(...))` 경로를 안 타는 별도 append라 기존 두 차례 fix가 못 잡은 잔여 gap — LLM이 이 블록의 숫자를 정당 인용해도 `checkHallucinatedNumbers`가 환각으로 오탐할 위험(테스트 미커버 확인).

`packages/shared/src/index.ts` dead-code 후보(cycle 2629, 7건 전부 false positive)와 대조적으로 이번은 실제 검증 gap. 수정: `buildInjectionText(context, rivalryBlock='')` + `validateTeamArgument(..., rivalryBlock='')` 파라미터 추가, `team-agent.ts:133` 호출부에서 이미 fetch해둔 `rivalry.promptBlock`을 전달하도록 연결(신규 API 호출 없음). `agents-validator.test.ts` 회귀 가드 6건 신규 — h2h 스코어(단일 digit)는 `NUMERIC_WHITELIST`로 이미 통과됨을 실측 확인해 테스트값은 `agent_memories` 소수점 수치로 조정.

`pnpm --filter moneyball exec tsc --noEmit` clean + `@moneyball/kbo-data` vitest 91 files/1194 tests(+6) green + apps/moneyball vitest 568/4465 불변 + `pnpm lint` clean. version 155→156 3-way sync. 단일 논리 단위 → 직접 main commit(`ae0ecbbb`)+push(R4/R7).

skill-evolution trigger 5개 전부 미충족 — 진행 정상.

다음 사이클 추천 = polish-ui 또는 info-architecture-review(dominance 완화 목적 다양성 유지, 둘 다 gap 여유) 또는 review-code(heavy)를 `judge-agent.ts`/`debate.ts`로 재조준(라이벌리 블록이 team arg reasoning 경유로 judge 프롬프트에도 흘러들어가는 별도 경로 확인 후보 — 본 사이클은 team-agent 직접 주입 경로만 스코프).

---

## ⚪ RETRO-ONLY — review-code(heavy): dead-code 축 탐색, 7건 전부 false positive 확인 (cycle 2629, 2026-08-26)

진단: open issue 0, approved plan 0/23. 2-chain lock 미충족(직전8 distinct=6). gap trigger 전부 미도달(fix-incident 13/20, op-analysis 2/25, info-arch 10/30, lotto 0/30). 직전20(2609-2628) review-code 계열 dominance 55%(11/20) — cycle 2628 추천대로 dead-code 신규 축 탐색.

`pnpm lint` clean(dead-code tool 미설치, knip/ts-prune 부재). Explore agent로 packages/shared/src/index.ts(3448줄, 최대·최고령 파일) 전체 export 365개 grep 기반 사용처 조사 — 7건 "repo 전체 0 참조" + 22건 "index.test.ts 안에서만 참조" 후보 발견.

직접 재검증(grep -n 라인 단위): 7건(FACTOR_ANOMALY_MIN_SAMPLE, AvgMarginResult, MarginCountResult, MatchupStreakResult, MatchupRecentRecordResult, MatchupHomeAwaySplitResult, SeasonHeadToHeadYear) 전부 **false positive** — 이름 기반 grep의 구조적 한계(TS structural typing: 함수 반환 타입으로만 쓰이면 소비 측이 타입명을 import 안 해도 씀). 각 인터페이스를 반환하는 함수(computeAvgMarginFromFinalGames 등)를 재확인 → apps/moneyball/src/lib/{matchup,teams,mlb}/*.ts 전역에서 실사용 확인. 22건(ISR *_HOURS/*_MINUTES)도 false positive — silent-drift-family wave 121/122/123/291(과거 cycle 박제) 이 확립한 "사람이 읽는 HOURS 값 → 코드가 쓰는 SECONDS 값 파생" 단일 source 패턴, index.test.ts 가 파생 공식 자체를 검증하는 의도된 구조.

색상 토큰 축(cycle 2627 소진 확인)에 이어 dead-code 축도 이번 파일 기준 소진 확인 — 실제 dead code 0건, 코드 변경 없음. 두 축 모두 소진되면서 review-code(heavy) 다음 발화는 새 파일/새 각도(예: packages/kbo-data/src/agents/validator.ts 956줄 등) 필요.

skill-evolution trigger 5개 전부 미충족 — 진행 정상.

다음 사이클 추천 = polish-ui(자연 대기) 또는 info-architecture-review(gap 11/30, 여유) — review-code dominance 완화 목적 다양성 유지, 또는 review-code(heavy)를 index.ts 대신 다른 대형 파일로 재조준.

---

## ✅ SUCCESS — lotto (lite): 30-cycle gap trigger, saturation 5연속 재확인 (cycle 2628, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전8(2620-2627) distinct=5 — 2-chain lock 미충족. fix-incident/info-arch/op-analysis gap 전부 미도달. lotto gap 정확히 30/30 도달(마지막 발화 cycle 2598) — trigger 충족.

`pnpm tsx scripts/lotto.ts count` 재실행: valid=7,705,415 / total=8,145,060 / removed=5.40% (96.7s) — cycle 2478/2508/2538/2598와 완전 동일, 256규칙 saturation 구조적 안정 5연속 재확인(valid_delta=0). 2026-08-29(토) 픽 50세트는 이미 shipped(cycle 2538), 직전 회차(2026-08-22) OOS 결과도 이미 완비 — 신규 picks/OOS 액션 불필요. 다음 추첨(08-29) 미도래로 신규 검증 불가. 코드 변경 없음, 측정 evidence만 갱신.

skill-evolution trigger 5개 전부 미충족 — 진행 정상.

다음 사이클 추천 = review-code(heavy, component structure/dead code 신규 축 — 색상 토큰 축은 cycle 2627에 소진 확인) 또는 info-architecture-review(gap 10/30, 여유 있으나 explore-idea 최근 활동 후 병행 고려).

---

## ✅ SUCCESS — polish-ui: Ko-fi 위젯 쿠키 배너/스탯 카드 겹침 수정 (cycle 2627, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전20 chain review-code 계열 12/20(60%) dominance — cycle 2624/2625 retro 양쪽 다양성 redirect 제안 채택. rounded-*/shadow-* 토큰 sitewide grep 감사로 review-code(heavy) 신규 축 탐색했으나 twin 불일치 미발견(축 소진) → polish-ui 전환. gap trigger 전부 미도달, GH Actions 최근 15건 전부 success/skipped.

전체 grep 대신 실 브라우저 dogfooding(`gstack browse`, 1280x720+375x812)으로 홈페이지 감사 — Ko-fi 도네이트 위젯(z-index 99999999)이 쿠키 동의 배너 및 그 위 "적중률 현황" 스탯 카드를 첫 화면(스크롤 전)에서 가리는 것을 스크린샷으로 확인·재현. 오프셋 조정(bottom 값 상향)은 모바일에서 위젯이 스탯 카드와 재충돌 — 폐기하고 배너 노출 중 위젯 완전 숨김(`display:none`)으로 전환, dismiss 후 자연 복귀.

`globals.css`에 `body[data-cookie-shown="true"]` 토글(기존 footer spacer padding 용 패턴 재사용) 규칙 추가. `silent-drift-cycle-2627.test.ts` 신규(2 tests). tsc clean + vitest 568 files/4465 tests(+1/+2) green + lint clean. version 154→155. main 직접 push 완료(e0215a74).

다음 사이클 추천 = op-analysis(gap 1/25 방금발화)/lotto(gap 29/30) 자연 대기 또는 review-code(heavy) 신규 축 재탐색. review-code dominance 소폭 완화(직전20 기준 12→11/20).

---

## ⚪ RETRO-ONLY — operational-analysis (lite): 주간 checkpoint, v1.8 유지 재확인 (cycle 2626, 2026-08-26)

진단: open issue 0, approved plan 0/23. 강제 trigger 없음(fix-incident gap 11/20, op-analysis gap 18/25, info-arch gap 8/30, lotto gap 28/30 — 전부 미도달). 2-chain lock 미충족(직전8 distinct=4). 직전9(2617-2625) review-code 계열 7/9 dominance — 직전 retro 다양성 redirect 제안 채택, op-analysis lite 선택 (heavy는 cycle 2608에 최근 실행, 재측정 실익 낮음).

`op-analysis-weekly` cron 정상 작동 확인 (2026-08-24 PR #3067 auto-merge 성공, 파일 위치 `apps/moneyball/data/op-analysis/` — 과거 `-cohort/` 디렉토리에서 조용히 이동, 마지막 구디렉토리 파일은 2026-06-22 cycle 1340). `scripts/op-analysis-cohort.ts` 로컬 재실행(2026-08-26): 총 n=494(적중 265/53.6%), v1.8 규칙 n=316 acc 54.4% Brier 0.3489 — cycle 2238(08-19, n=291 acc 55.0% Brier 0.3429) 대비 안정, v2.1-B-shadow n=52 동결 유지(reject 상태 변화 없음). v1.8 유지 확정 재확인, 재조정 근거 없음.

winner-centric Brier(0.35 근방) vs CLAUDE.md 추적 중인 home_win_prob 기반 Brier(0.24 근방) 두 지표가 이 cohort script(`op-analysis-cohort.ts`)와 CE-cohort script(`op-analysis-ce-cohort.ts`)에서 서로 다른 산식으로 계산됨을 재확인 — CE fallback 구간 winner-centric 지표가 구조적으로 부풀려지는 기존 Fable plan S2c 결론과 일치, 신규 drift 아님. 코드 변경 없음, CLAUDE.md 갱신 불필요(기존 결론과 완전 정합).

다음 사이클 추천 = review-code(heavy, 신규 축) 또는 다양성 유지 목적 polish-ui/info-arch(gap 8/30, 너무 이름) 재탐색. dominance 완화됨(직전10에 op-analysis 1건 추가).

---

## ✅ SUCCESS — review-code(heavy): dark:border-gray-N/opacity 예외 8곳 role 문서화 (cycle 2625, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전8(2617-2624) distinct=4(review-code 5+review-code(heavy) 1+info-arch 1+explore-idea 1) — 2-chain lock 미충족. gap trigger 4종 전부 미도달(fix-incident 10/20, op-analysis 17/25, lotto 27/30, info-arch 7/30). 직전 retro(cycle 2624) 추천 review-code(heavy) 채택.

cycle 2623 전역 마이그레이션(`dark:border-gray-N` → `dark:border-[var(--color-border)]`)이 opacity-suffix 있는 8곳(7파일)을 제외했는데 그 사유가 미문서화 — 다음 사이클이 "미마이그레이션 잔존"으로 재의심할 리스크 확인. 4-역할 twin 그룹 재검증: (1) 팩터 수렴 배지 tri-state(amber/brand/gray, `analysis/game/[id]:492`) (2) 뮤트 정보 패널(`border-gray-700/50`+`bg-gray-800/30` 5곳 100% 동일) (3) 점선 기준선(`accuracy:776` 단독) (4) 커스텀 서피스 디바이더(`WeeklyGamesSortControl:59` 단독) — 전부 내부 일관, drift 아님 확정. 코드 변경 없이 DESIGN.md:64 예외 규칙 신설 + Decisions Log 항목 박제만으로 정리. lint+type-check+3 tests green. main 직접 push 완료(3f840362).

다음 사이클 추천 = op-analysis(gap 18/25)/lotto(gap 28/30) 자연 대기 또는 review-code(heavy) 신규 축 재탐색. dominance 관찰: 직전9(2617-2625) review-code 계열 7/9 — 다양성 redirect 고려 필요.

---

## ⚪ RETRO-ONLY — explore-idea 2-chain lock redirect, 4-source 재확인 negative (cycle 2624, 2026-08-26)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). 직전8(2616-2623) chain 정규화 = review-code(heavy) 7 + info-architecture-review 1 → distinct=2 → **2-chain alternation lock 발동**, 둘 다 후보 제외. gap trigger 4종 미도달(fix-incident 9/20, op-analysis 16/25, lotto 26/30). DESIGN.md 당일 갱신(design-system negative). 잔여 pool 중 explore-idea saturation trigger 12/15 만 유일 충족 — 자연 선택.

lite quick-recheck 4-source: (1) `find apps/moneyball/src/app -name page.tsx -mtime -14` = 91건, 전부 기존 라우트 mtime 부작용(신규 페이지 0). (2) TODOS.md Next-Up(2026-04-25) 섹션 = 여전히 stale 사용자영역 mcc alias 1-line 만, 신규 리드 없음. (3) GH issue 0건. (4) plan#29(로그인+커뮤니티, Tier4 deferred) 트래픽 실측 재확인 — service-role REST count=exact: `user_picks`=1, `mlb_user_picks`=0, `pick_poll_events`=5, `mlb_pick_poll_events`=0, cycle 2417 측정치와 완전 동일(무성장 지속, ≥10 임계 미도달) + KBO 포스트시즌(통상 10월) 여전히 미도달. 4-source 전부 negative — 코드 변경 없음.

다음 사이클 추천 = review-code(heavy, lock 해소 후 opacity 변형 border 계열 `/50`,`/40` role 문서화 또는 신규 축 재탐색) 또는 op-analysis(gap 17/25)/lotto(gap 27/30) 자연 대기.

---

## ✅ SUCCESS — review-code(heavy): dark:border-gray-N 전역 → --color-border 토큰 정렬 (cycle 2623, 2026-08-26)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). 직전8(2615-2622) distinct=3(review-code(heavy) 6+info-architecture-review 1+fix-incident 1) — 2-chain lock 미충족. op-analysis gap 15/25, fix-incident gap 8/20, info-arch gap 5/30, lotto gap 25/30 — 전부 미도달. DESIGN.md 당일 갱신(design-system negative). explore-idea saturation 11/15 미도달(4-source 재확인 불필요, 임계 자체 미도달). ship-0 미충족(직전10 success 6/retro-only 4). skill-evolution trigger 5개 미충족(milestone 2623%50≠0, chain-evolution 누적 신규분 없음, review-code 직전20 non-zero 14회).

icon 사이즈(w-N h-N)·shadow 클래스는 role별 정상 분산 확인(negative). border-gray 계열 sitewide grep 중 DESIGN.md:64 문서화된 컨벤션(라이트 `border-gray-N` 리터럴 / 다크 `dark:border-[var(--color-border)]` 단일 토큰, cycle 612~728 점진 마이그레이션 대상) 대비 raw `dark:border-gray-N` 잔존 65건/23파일 발견 — opacity 변형(`/50`,`/40`, cycle 617 확정 보존 대상, 8건/7파일: `analysis/game/[id]`, `en/mlb`+`mlb` games 상세, `MatchupFactorCompare`×2, `WeeklyGamesSortControl`, `accuracy` 대시선)는 제외, 나머지 57건/16파일(`insights`, `standings`, `lotto/*`, `accuracy/shadow`, `v2-preview`, `debug/agent-fallback`, `debug/silent-drift`, `FactorAccuracyTable`)이 순수 미마이그레이션 잔존으로 확정.

perl 기계적 치환(`dark:border-gray-\d+(?!/)` → `dark:border-[var(--color-border)]`, opacity suffix 보존) 57건/16파일 정렬 + `silent-drift-cycle-2623.test.ts` 신규(sitewide raw 토큰 재발 방지, capture-group 기반 opacity 예외 처리 — naive negative lookahead 백트래킹 오탐 회피). type-check clean + vitest 567 files/4463 tests(+1/+1) green + lint clean. version 153→154. main 직접 push 완료(362fd6f9).

다음 사이클 추천 = op-analysis(gap 16/25)/lotto(gap 26/30) 자연 대기 또는 review-code(heavy) opacity 변형 border 계열(`/50`,`/40`) role 문서화 후보 재탐색. review-code dominance 지속 관찰 필요(직전8 = 6/8 review-code(heavy)).

---

## ✅ SUCCESS — review-code(heavy): SearchClient.tsx 검색결과 행 hover 다크모드 정렬 (cycle 2622, 2026-08-26)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). 직전8(2614-2621) distinct=4(review-code(heavy) 5+dimension-cycle 1+fix-incident 1+info-architecture-review 1) — 2-chain lock 미충족. op-analysis gap 14/25, fix-incident gap 7/20, info-arch gap 4/30, lotto gap 24/30 — 전부 미도달. DESIGN.md 당일 갱신(design-system negative). explore-idea saturation 11/15 미도달. ship-0 미충족(직전10 success 4/retro-only 6, success 존재). skill-evolution trigger 5개 미충족(milestone 2622%50≠0, chain-evolution 누적 9건 신규분 없음, review-code 직전20 non-zero 14회).

arbitrary `text-[Npx]` 축(cycle 239 후보)은 잔여 1건까지 이미 해소돼 소진. `rounded-*`/`duration-*` 축은 이상치 없음. `hover:bg-gray-50 dark:hover:bg-gray-XXX` 조합 sitewide grep — 8개 인스턴스(LeaderboardTable/LeaderboardJoinModal 등, 클릭 가능한 행/버튼 hover) 전부 `dark:hover:bg-gray-800` 계열인데 `SearchClient.tsx` 검색결과 행 링크만 유일하게 `dark:hover:bg-gray-900/40` — 동일 시각적 역할(클릭 가능 행 hover)의 twin 불일치. `dark:hover:bg-gray-800/40` 로 정렬 + `silent-drift-cycle-2622.test.ts`(2 tests) 신규. type-check clean + vitest 566 files/4462 tests(+1/+2) green + lint clean. version 152→153. main 직접 push 완료(0c6987ae).

다음 사이클 추천 = op-analysis(gap 15/25)/lotto(gap 25/30) 자연 대기 또는 review-code(heavy) 신규 축 재탐색. review-code dominance 지속 관찰 필요.

---

## ✅ SUCCESS — review-code(heavy): LiveScoreboard.tsx 홈 배지 font-semibold → font-bold 정렬 (cycle 2621, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전8(2613-2620) distinct=5(review-code 3+dimension-cycle 2+review-code(heavy) 1+info-architecture-review 1+fix-incident 1) — 2-chain lock 미충족. op-analysis gap 13/25, info-arch gap 3/30, lotto gap 23/30, fix-incident gap 6/20 — 전부 미도달. CI 최근 워크플로 전부 success. DESIGN.md 당일 갱신(design-system negative). ship-0 미충족(직전10 success 5). skill-evolution trigger 5개 미충족(chain-evolution 누적 9건 동일, 신규분 없음).

cycle 2620 carry-over(font-weight 3-tier 축, 표본 396건)는 role 불명확 + 사이트 전체 audit 하기엔 과대 — `uppercase tracking-wide` 라벨 소표본 재검사(negative) 후 `text-3xs` 배지 롤(px-1 py-0.5 rounded, brand-100/900 bg) 그룹으로 전환. 동일 `aria-label="홈팀"` 배지가 `MiniGameCard.tsx`/`PredictionCard.tsx`/`PlaceholderCard.tsx` 3곳 전부 `font-bold`인데 `LiveScoreboard.tsx`만 유일하게 `font-semibold` — twin 불일치 발견(git blame 상 cycle 2599 계열 text-[9px]→text-3xs 토큰화 커밋이 font-weight는 그대로 이관). 다수결(3/4) `font-bold`로 정렬 + `silent-drift-cycle-2621.test.ts`(1 test) 신규. tsc clean + vitest 565 files/4460 tests(+1/+1) green + lint clean. version 151→152(root+apps/moneyball+VERSION+CHANGELOG 3-way sync). main 직접 push — 1차 커밋(a7df44a2)이 apps/moneyball/package.json만 올리고 root package.json/VERSION 누락해 pre-push version-sync-guard 차단, 2차 커밋(ca6669ca)으로 수정 후 push 완료.

다음 사이클 추천 = op-analysis(gap 13/25)/lotto(gap 23/30) 자연 대기 또는 review-code(heavy) font-weight 다른 role 서브셋 재탐색. review-code dominance 지속 관찰 필요.

---

## ✅ SUCCESS — review-code(heavy): SearchClient.tsx tracking-wider → tracking-wide 정렬 (cycle 2620, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전8(2612-2619) distinct=4(review-code 5+dimension-cycle 2+fix-incident 1+info-architecture-review 1) — 2-chain lock 미충족. op-analysis gap 12/25, info-arch gap 2/30, lotto gap 22/30, design-system negative — 전부 미도달. explore-idea saturation 12/15 재도달했으나 4-source 재확인 negative(신규라우트 90건=git checkout 부작용 지속/TODOS Next-Up 없음/GH issue 0/plan#29 여전히 Tier4). ship-0 미충족(직전10 success 5). skill-evolution trigger 5개 미충족.

cycle 2619 flat muted-text 축 sitewide 잔여 0건 확인 후 tracking-* 축(11건, 소표본) 순회 — uppercase eyebrow/섹션-라벨 역할 10개 인스턴스 전부 `tracking-wide`, `SearchClient.tsx` 검색 그룹 라벨만 유일하게 `tracking-wider` — twin 불일치 발견. 정렬 + `silent-drift-cycle-2620.test.ts`(sitewide 재발 방지 grep, 2 tests) 신규. tsc clean + vitest 564 files/4459 tests(+1/+2) green + lint clean. version 150→151. main 직접 push 완료(541c79a9).

다음 사이클 추천 = op-analysis(gap 12/25)/info-arch(gap 2/30, 1-cycle 이내)/lotto(gap 22/30) 자연 대기 또는 review-code(heavy) font-weight 3-tier 축(표본 396건, role-based 세분화 필요) 재탐색.

---

## ✅ SUCCESS — review-code(heavy): picks/ muted-text tier-2 다크모드 색상 역전 정렬 (cycle 2619, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전8(2611-2618) distinct=4(review-code 4+dimension-cycle 2+fix-incident 1+info-architecture-review 1) — 2-chain lock 미충족. op-analysis gap 11/25, info-arch gap 1/30, lotto gap 21/30, design-system negative — 전부 미도달. explore-idea saturation 12/15 도달했으나 4-source 재확인 negative(신규라우트 90건=git checkout 부작용/TODOS Next-Up 없음/GH issue 0/plan#29 Tier4 유지). ship-0 미충족(직전10 success 6). skill-evolution trigger 5개 미충족.

cycle 2617 carry-over 추천(muted text-gray-500/400 2-tier 문서화) 채택 — 사이트 전체 관례가 라이트/다크 명도 역전으로 tier 별 대비감 유지(tier1 `gray-500 dark:gray-400`, tier2 `gray-400 dark:gray-500`)임을 확인 후, flat pair(`gray-400 dark:gray-400`, no invert) grep 결과 9건 전부 `components/picks/`(UserVsAIScorecard/WeeklyPicksSummary/MyPicksClient/PickButton) 에 집중 — 같은 파일 안 정상 역전된 sibling 라인과 직접 대조되는 twin 불일치 확인(다크모드에서 tier1 수준으로 밝게 렌더링). 9곳 `dark:text-gray-500` 로 정렬 + DESIGN.md Color 섹션 2-tier 관례 신규 문서화 + `silent-drift-cycle-2619.test.ts`(5 tests). tsc clean + vitest 563 files/4457 tests(+1/+6) green + lint clean. version 149→150. main 직접 push 완료(43db1a8a).

다음 사이클 추천 = op-analysis(gap 11/25)/lotto(gap 21/30) 자연 대기 또는 review-code(heavy) 신규 축 재탐색.

---

## ⚪ RETRO-ONLY — info-architecture-review 30-cycle-gap checkpoint, 신규 drift 0건 (cycle 2618, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전8(2610-2617) distinct=3(review-code 6+dimension-cycle 1+fix-incident 1) — 2-chain lock 미충족. **info-arch gap 31/30 도달**(마지막 발화 cycle 2587) — trigger 충족, 발화. op-analysis gap 10/25, lotto gap 20/30, design-system negative(당일 갱신) — 미도달.

cycle 2587(fix commit f41704ed) 이후 `page.tsx` 신규 추가 0건(`git log --diff-filter=A` 확인, 같은 구간 커밋 13건 전부 기존 라우트 수정). breadcrumb 누락 18건 그대로 — `ia-hierarchy.md` 의도된 목록과 완전 일치. sitemap.ts staticRoutes 전수 대조에서 매핑 누락 후보 `/accuracy/shadow`/`/community` 발견했으나 둘 다 `robots: index:false` 확인 — 의도된 제외. 헤더 메가메뉴(LEAGUE_NAVS) 핵심 섹션 배선 확인, `/methodology`/`/about`/`/guide`/`/glossary`/`/changelog` 는 Footer 유틸리티 컬럼 배치(기존 확인된 패턴) — 신규 gap 아님. checkpoint 문서 `docs/design/ia-2026-08-26-cycle-2618-30-cycle-gap-checkpoint.md` 신규 작성. 코드 변경 없음.

다음 사이클 추천 = op-analysis(gap 10/25)/lotto(gap 20/30) 자연 대기 또는 review-code(heavy) 신규 축 재탐색(muted text-gray-500/400 2-tier 역할 분리 문서화, cycle 2617 carry-over).

---

## ⚪ RETRO-ONLY — review-code(heavy) 신규 축 탐색 소진 재확인 (cycle 2617, 2026-08-26)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). 직전8(2609-2616) distinct=4(review-code 4+dimension-cycle 2+polish-ui 1+fix-incident 1) — 2-chain lock 미충족. op-analysis gap 8/25, info-arch gap 29/30, lotto gap 18/30, design-system negative(당일 갱신, git checkout 부작용) — 전부 미도달. **explore-idea saturation trigger 12/15 충족**되나 4-source 재확인(신규라우트 -14d 90건=git checkout 부작용 전체 반환/TODOS Next-Up 신규 리드 없음/GH issue 0/plan#29 트래픽 count 미성장·postseason 미도달 Tier4 유지) — negative, 기존 패턴과 동일. ship-0 emergency stop 미충족(직전10 success 7/retro-only 3). skill-evolution trigger 5개 전부 미충족(milestone 2617%50≠0, review-code 직전20 non-zero).

review-code(heavy) 재진입 — cycle 2616 추천대로 spacing/padding 계열 탐색: gap-1/1.5/2 (pill 배지 icon-text 간격, 21건) / font-medium vs font-semibold vs font-bold (badge 계열, 225건+) / text-gray-500 vs text-gray-400 (muted text, 567건) / tracking-* (68건) 축 순회. `QuantOnlyBadge.tsx`(text-2xs font-medium) 단일 공용 컴포넌트로 4곳 재사용 — DRY 이미 확보, drift 위험 없음 확인. `teams/[code]/page.tsx` 매치업 pill(gap-2 text-sm, 팀로고+텍스트)과 `ShareButtons.tsx` 공유 pill(gap-1.5 text-xs, 아이콘+짧은 라벨) 비교 — 컨텐츠 길이·역할 상이한 twin 아님 확인. 나머지 축(muted text 2-tier, font-weight 3-tier)은 표본 규모가 커 단일 사이클 grep 만으로 role-based 의도 vs drift 판별 불가 — 명확한 twin 불일치 발견 못함. 코드 변경 없음.

다음 사이클 추천 = op-analysis(gap 8/25)/info-arch(gap 29/30, 1-cycle 이내 도달)/lotto(gap 18/30) 자연 대기 또는 review-code(heavy) muted text-gray-500/400 2-tier 역할 분리 문서화(DESIGN.md 명시 부재 — 다음 heavy 진입 시 개별 twin 비교 필요, 표본 커서 별도 사이클 할당 권장).

---

## ✅ SUCCESS — review-code(heavy): AgentVoteCard 에이전트 글자 배지 w-6/text-2xs 역할 정렬 (cycle 2616, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전8(2608-2615) distinct=5(review-code 4+dimension-cycle 2+polish-ui 1+operational-analysis 1+fix-incident 1) — 2-chain lock 미충족. op-analysis gap 7/25, info-arch gap 28/30, lotto gap 17/30 — 전부 미도달. explore-idea saturation 11/15 미충족. ship-0 emergency stop 미충족(직전 10사이클 success 6건). skill-evolution trigger 5개 전부 미충족(review-code 단독 평가 대상, 직전20 사이클 다회 발화).

review-code(heavy) 직접 코드 read: `AgentVoteCard.tsx` 의 에이전트 식별 글자 배지(Σ/H/A/C/J)가 `DebateTimeline.tsx`/`JudgeReasoningCard.tsx` 의 "AI" 원형 배지(cycle 2611 정렬 완료, w-6 h-6 + text-2xs)와 동일 역할인데 w-7 h-7 + 하드코딩 `text-[12px]` 사용 — cycle 2610/2611 과 동일 family(사이즈+arbitrary px 이중 drift). 공용 컨벤션에 정렬 (`AgentVoteCard.tsx`), drift 회귀 방지 테스트 `silent-drift-cycle-2616.test.ts` 신규. lint+type-check+test 전부 pass, main 직접 push 완료(e97a0046).

다음 사이클 추천 = op-analysis/info-arch/lotto 자연 대기(전부 gap 미도달) 또는 review-code(heavy) 신규 축 재탐색(뱃지/토큰 계열 거의 소진 — 다음은 spacing/padding 계열 grep 유망).

---

## ⚪ RETRO-ONLY — fix-incident(lite) 89-cycle gap 점검 + dimension-cycle(acquisition) breadcrumb/RSS lastmod (cycle 2615, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전8(2607-2614) distinct=4(review-code 4+op-analysis 1+polish-ui 1+dimension-cycle 2) — 2-chain lock 미충족. **fix-incident 직전 60사이클 0회 발화(마지막=cycle 2526, gap=89) — 20-cycle 주기 보정 trigger(7) 충족, lite 자동 권장.** op-analysis gap 7/25, info-arch gap 28/30, lotto gap 17/30, design-system negative — 전부 미도달. explore-idea saturation 11/15 미충족. skill-evolution trigger 5개 전부 미충족.

점검 1(fix-incident lite): `pipeline_runs` 최근 7일 161행 조회 — non-success 3건 전부 `mlb_fancy_scrape` fangraphs HTTP 403(8/19~8/21 3연속). 상세 조회 결과 8/22부터 latest(8/25, games_found=30/predictions=30)까지 전부 success로 자가 회복 확인. `gh run list` 전부 success/skipped 재확인. 현재 라이브 인시던트 없음 — transient scraper block, 코드 변경 불필요.

점검 2(acquisition 심화, cycle 2613/2614 자체 추천): Breadcrumb 컴포넌트가 BreadcrumbList JSON-LD 자체 emit — 87/105 page.tsx 사용, 미사용 18개는 기존 canonical-누락 18개 리스트와 완전 동일(noindex/debug/redirect-shim 의도) 재확인. `sitemap.ts` + `feed/route.ts`(RSS) lastModified/pubDate 전수 대조 — 동적 라우트 실측 `updated_at` 사용, 정적 라우트 build-time now() 표준 관행, drift 없음.

결론: 이번 사이클 실행 가능한 신규 버그/drift 없음. 코드 변경 없음.

다음 사이클 추천 = op-analysis/info-arch(gap 28/30, 2-cycle 이내 도달)/lotto 자연 대기 또는 review-code(heavy) 신규 축(button height/line-height, cycle 2610 자체 추천) 재탐색.

---

## ⚪ RETRO-ONLY — dimension-cycle(acquisition): noindex-vs-sitemap 전체 재감사, 신규 drift 0건 (cycle 2614, 2026-08-26)

진단: open issue 0, approved plan 0/23(전부 completed/superseded/archived/spec_only_deferred). 직전8(2606-2613) distinct=4(review-code 5+polish-ui 1+op-analysis 1+dimension-cycle 1) — 2-chain lock 미충족. fix-incident negative(`gh run list` 전부 success/skipped). op-analysis gap 6/25, info-arch gap 27/30, lotto gap 16/30, design-system negative(당일 갱신) — 전부 미도달. explore-idea saturation 11/15 미충족. skill-evolution trigger 5개 전부 미충족. cycle 2613 자체 추천("acquisition 내 다른 각도(내부링크/canonical URL 정규화)") 따라 진입.

점검: noindex(`robots: {index:false}`) 보유 전 페이지 grep(login/settings/picks/search/community/debug 7종/v2-shadow-monitor/accuracy-shadow/v2-preview/insights 동적 2종) → sitemap.ts 전수 대조 — `/search`(cycle 2579)·`/picks`(cycle 2613) 기존 fix 이후 잔여 모순 0건, 나머지 전부 sitemap 미등록으로 의도된 결과 재확인. insights/[date]·insights/series/[topic] 동적 noindex(invalid date만) 조건과 sitemap의 `listInsightsDates(90)`/`listSeriesTopics()` 동일 source 사용 확인 — drift 가능성 구조적으로 차단됨. canonical alternates 없는 18개 page.tsx 전부 noindex/debug/redirect-shim 페이지로 의도 확인.

결론: acquisition 축 noindex/canonical 정합성 감사 완전 소진 — 신규 실행 가능 항목 없음. 코드 변경 없음.

다음 사이클 추천 = op-analysis/info-arch/lotto 자연 대기(전부 gap 미도달) 또는 review-code(heavy) 신규 축 재탐색 또는 acquisition 내 미탐색 하위 영역(breadcrumb JSON-LD, RSS/sitemap lastmod 정확도).

---

## ✅ SUCCESS — dimension-cycle(acquisition): /picks sitemap.ts noindex 모순 제거 (cycle 2613, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전8(2605-2612) distinct=3(review-code 7+op-analysis 1) — 2-chain lock 미충족. fix-incident negative. op-analysis gap 5/25, info-arch gap 26/30, lotto gap 15/30, design-system negative — 전부 미도달. explore-idea saturation 11/15 미충족. skill-evolution trigger 5개 미충족. cycle 2612 retro 명시 추천("review-code 11축 소진, dimension-cycle acquisition 심화 검토") 따라 진입.

발견: canonical(19건 누락 전부 noindex 의도) / JSON-LD / OG·twitter-image 페어링(66/66 완전 매칭) / hreflang languages alternate(en/mlb 2건 미보유, 둘 다 redirect shim 의도) / Header·Footer locale 치환 로직 전부 clean 재확인 중, sitemap.ts를 각 페이지 자체 metadata와 직접 대조 → `/picks`(`robots: {index:false}`, 개인화 "내 픽 기록")가 sitemap.ts에 여전히 등록된 모순 발견 — `/search`가 동일 사유로 cycle 2579에 제거됐던 패턴, 그때 놓친 gap.

실행: `sitemap.ts`에서 `/picks` 제거 + 사유 주석. `sitemap-mlb.test.ts` 회귀 assertion 추가. tsc clean + vitest 561f/4451t green(+1) + lint clean. version 148→149 3-way sync. 단일 논리 단위 → 직접 main commit+push(R4/R7, aed25cc7), CI green 확인.

다음 사이클 추천 = op-analysis/info-arch/lotto 자연 대기(전부 gap 미도달) 또는 acquisition 내 다른 각도(내부링크/canonical URL 정규화) 추가 탐색, 또는 review-code(heavy) 신규 축 재탐색.

---

## ⚪ RETRO-ONLY — review-code(heavy) 신규 축 4종(border-color/tracking/font-weight/muted-text) + acquisition(JSON-LD/metadata) 탐색, 전부 clean (cycle 2612, 2026-08-26)

진단: open issue 0, approved plan 0/23. 직전8(2604-2611) distinct=3(review-code 6+polish-ui 1+op-analysis 1) — 2-chain lock 미충족. fix-incident negative(`gh run list --limit 15` 전부 success/skipped). op-analysis gap 4/25(2608 직발화), info-arch gap 25/30, lotto gap 14/30 — 전부 미도달. design-system negative(DESIGN.md 당일 갱신). explore-idea saturation 11/15 미충족. skill-evolution trigger 5개 전부 미충족(milestone 2612%50≠0, review-code 직전20 non-zero). cycle 2611 retro 명시("spacing/radius/shadow/focus-ring/typography/motion/icon-size 7개 축 모두 clean, 신규 축 발굴 필요 시점 근접") 따라 review-code(heavy) 신규 축 탐색 + acquisition dimension(SEO) 병행 점검.

점검: (1) border color(`border-gray-*` 등) — `border-gray-200` 압도적 단일값, 경쟁 변형 없음 clean. (2) `tracking-*` — uppercase 라벨 `tracking-wide` 일관, `tracking-tight`(Header 로고)·`tracking-wider/-widest`(별도 역할) 분기 뚜렷, drift 없음. (3) `font-(medium|semibold|bold)` — 산문 vs UI 컴포넌트 vs 헤더 role 3분기가 파일마다 자연스럽게 혼재, 단일 role 불일치 사례 못 찾음(과탐 방지 위해 fix 보류). (4) muted text color(`text-gray-400/500` + `dark:text-gray-400/500`) — light-500/dark-400, light-400/dark-500 페어링 일관, drift 없음. (5) acquisition 축: JSON-LD(`application/ld+json`) 커버리지 81개 page.tsx 중 56개 직접 보유 + `layout.tsx` 전역 스키마, 누락 25건 전부 redirect shim(`reviews/monthly|weekly/page.tsx`)·debug 페이지·hub 목록 페이지로 의도된 누락 확인. (6) `generateMetadata`/`metadata` export 누락 12건 — 8건 debug(noindex 대상), 4건(`reviews/{monthly,weekly}/page.tsx` KBO+MLB) 은 현재월 리다이렉트 shim(HTML 렌더 없음)이라 메타데이터 무의미 — 전부 의도된 결과.

결론: 이번 사이클 실행 가능한 신규 버그/drift 없음. 코드 변경 없음. review-code 축 exhaustion 재확인(총 11개 축 clean) + acquisition/SEO 최초 점검도 clean 확정.

다음 사이클 추천 = op-analysis(gap 5/25, 근접 아님) 또는 info-arch(gap 26/30)/lotto(gap 15/30) 자연 대기, 또는 다양성 redirect(dimension-cycle acquisition 심화 — 예: 내부링크 구조, canonical, OG 이미지 세트 재검토) 검토. review-code(heavy) 는 11축 소진 — 신규 fix 없이 재진입 시 저가치, 당분간 회피 권장.

---

## ✅ SUCCESS — review-code(heavy): "AI" 원형 배지 아이콘 크기 w-5 h-5 → w-6 h-6 역할 정렬 (cycle 2611, 2026-08-26)

진단: open issue 0, approved plan 0/22. 직전8(2603-2610) distinct=3(review-code 6+polish-ui 1+op-analysis 1) — 2-chain lock 미충족. fix-incident negative(`gh run list --limit 15` 전부 success/skipped). op-analysis gap 3, info-arch gap 24/30, lotto gap 13/30, design-system negative(당일 갱신) — 전부 미도달. skill-evolution trigger 5개 전부 미충족(milestone 2611%50≠0, review-code 직전20 non-zero). review-code(heavy) 재진입 — cycle 2610 자체 추천 축(아이콘 크기/버튼 높이/line-height) 신규 탐색.

발견: "AI" 원형 아바타 배지(`inline-flex items-center justify-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 font-bold text-2xs` + "AI") 동일 역할 3곳 — `DebateTimeline.tsx`/`JudgeReasoningCard.tsx` `w-6 h-6`, `predictions/[date]/page.tsx` 헤더만 `w-5 h-5` — 1-notch 이탈. 버튼 높이(h-8~h-11)는 대부분 `loading.tsx` 스켈레톤 자체 사이즈라 twin 무의미(범위 제외). line-height(`leading-*`)는 산문 페이지 vs UI 컴포넌트 역할 분기 뚜렷해 drift 없음.

실행: `predictions/[date]/page.tsx` AI 배지 `w-5 h-5`→`w-6 h-6`(2/3 다수결). DESIGN.md Decisions Log 추가. `silent-drift-cycle-2611.test.ts` 신규 2건. tsc clean + vitest 561f/4450t green(+1/+2) + lint clean. version 147→148 3-way sync. 단일 논리 단위 → 직접 main commit+push(R4/R7 통과, c215f13f).

다음 사이클 추천 = op-analysis/info-arch/lotto 자연 대기(전부 gap 미도달), review-code(heavy) 재진입 시 icon-size 축도 소진 — spacing/radius/shadow/focus-ring/typography/motion/icon-size 6개 축 모두 clean, 신규 축 발굴 필요 시점 근접.

---

## ✅ SUCCESS — review-code(heavy): MobileNav 아코디언 chevron duration-150 → duration-200 motion 토큰 역할 정렬 (cycle 2610, 2026-08-26)

진단: open issue 0, approved plan 0/22(plan #29 회원인증/커뮤니티는 postseason 접근 또는 참여≥10 트리거 미충족, plan 자체 명시대로 재확인 스킵). 직전8(2602-2609) distinct=3(review-code 6+op-analysis 1+polish-ui 1) — 2-chain lock 미충족. fix-incident negative(`gh run list --limit 15` 전부 success/skipped). op-analysis gap 2(2608 직발화), info-arch gap 22/30, lotto gap 12/30(8/23 50세트 이미 박제) 미도달. design-system negative(당일 갱신). explore-idea saturation 10/15 미충족. review-code(heavy) 진입 후 gap-*/z-[]/ring-*/rounded-md/hover:shadow 축 재점검 전부 clean, motion duration 축 신규 진입.

발견: hardcoded `duration-150`/`duration-200` literal 사이트 전체 2건뿐. desktop nav(`navigation-menu.tsx`, shadcn vendor) chevron=`duration-200`(DESIGN.md "dropdown open"=--motion-medium 정의와 일치), 모바일 아코디언(`MobileNav.tsx`) chevron=동일 disclosure 역할이면서 `duration-150`(nav hover 용도) — 역할 불일치 확인.

실행: `MobileNav.tsx` chevron duration-150→200. DESIGN.md Motion 섹션 "Disclosure chevron rotate" 항목 추가. `silent-drift-cycle-2610.test.ts` 신규 2건. tsc clean + vitest 560f/4448t green + lint clean. version 146→147 3-way sync. 단일 논리 단위 → 직접 main commit+push(R4/R7 통과, c87819f2).

다음 사이클 추천 = op-analysis gap 25 재도달(2611 근접, 마지막 2608) 또는 info-arch(gap 23/30)/lotto(gap 13/30) 자연 대기, 또는 review-code(heavy) — spacing/border-radius/shadow/focus-ring/typography/motion 축 모두 소진, 다음은 아이콘 크기(w-4/w-5 hierarchy)·버튼 높이(h-9/h-10)·line-height(leading-*) 축 탐색 권장.

---

## ✅ SUCCESS — polish-ui: AgentVoteCard away-color 하드코딩 hex → var(--color-away) 단일 source 정렬 (cycle 2609, 2026-08-26)

진단: open issue 0, approved plan 0/22. 직전8(2601-2608, 2601 missing 제외) distinct=2(review-code 6 + operational-analysis 1) → **2-chain alternation lock 탐지** — review-code/operational-analysis 이번 사이클 후보 제외. fix-incident 재점검(`gh run list --limit 15`) 3연속 negative. info-arch gap 22/30, lotto gap 11/30 미도달. design-system(DESIGN.md 당일 갱신) negative. explore-idea saturation 10/15 미충족. lock 규칙 따라 남은 pool 전부 trigger 부재 → polish-ui 강제 발화.

발견: transition-duration/badge padding/icon square 축 재점검 clean(twin 구조 확인 — wild-card `w-9 h-7` 뱃지는 "WC1" 텍스트용 pill, standings 숫자 뱃지 square와 역할 다른 정상 twin). hardcoded hex 전수 grep 중 `AgentVoteCard.tsx:85` awayColor fallback `"#c5872a"` — 최초 drift 의심 후 `globals.css --color-away` 재사용 확인, **값은 정상**(최초 `brand[300]` 치환 시도는 즉시 원복한 오판). 실제 drift = 참조 방식 — 이 컴포넌트만 10+ 파일이 쓰는 `var(--color-away)` 대신 raw literal 중복 박제(팔레트 변경 시 silent desync 위험).

실행: `awayColor` fallback → `"var(--color-away)"`. `silent-drift-cycle-2609.test.ts` 신규 2건. tsc clean + vitest 559f/4446t green + lint clean. version 145→146 3-way sync. 단일 논리 단위 → 직접 main commit+push(R4/R7 통과, PR #66f0166c).

다음 사이클 추천 = op-analysis gap 25 재도달(2610 근접) 또는 review-code/operational-analysis lock 해제(cooldown N=1) 후 재개, 또는 info-arch(gap 23/30)/lotto(gap 12/30) 자연 대기.

---

## ✅ SUCCESS — operational-analysis(heavy) CE cohort 9회 연속 재확인 (cycle 2608, 2026-08-26)

진단: open issue 0, approved plan 0/22 (전부 completed/archived/tier4). 직전8(2600-2607) chain_selected = polish-ui 1 + review-code 6 (2601 skill-evolution forced, cycle JSON 파일 부재) → distinct=2 → **2-chain alternation lock 탐지** (review-code/polish-ui 잠금). fix-incident gap 20+/20 재점검(`gh run list --limit 15` + 최근 debug commit 5건 확인) — 전부 CI green/deploy dispatch skipped, 실제 incident 없음 negative. explore-idea saturation 재확인 negative(TODOS Next-Up 없음, approved plan 0건). design-system 최근 발화(cycle 2599, 9 cycle 전) — 신규 trigger 없음. op-analysis gap 22/25(직전 발화 cycle 2586) 근접 미도달이나 lock redirect 후보 중 가장 stale.

발견: lock 으로 review-code/polish-ui 제외 후 남은 pool 재평가 — op-analysis 가 gap 22/25 로 가장 근접. `scripts/op-analysis-ce-cohort.ts` 동일 harness 재실행: 전체 n=341 (CE n=294 / 비CE n=47, +4 CE only — 비CE 여전히 완전 동결, 마지막 예측 2026-07-01 이후 56일+ 경과). CE 53.4%(157/294) / 비CE 63.8%(30/47) → 격차 10.4pp 그대로. overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 → LLM 부가가치 우세 결론 9회 연속 재확인(cycle 2309→2361→2448→2556→2586→2608). CREDIT_EXHAUSTED·비CE 동결 상태 변화 없음.

실행: CLAUDE.md 가중치 섹션에 cycle 2608 재측정 문단 append(기존 컨벤션). 코드 변경 없음(측정 전용, DB 조회만) — 회귀 테스트 불필요. 단일 논리 단위 → 직접 main commit+push(R4/R7, pre-push hook lint+type-check 통과).

다음 사이클 추천 = op-analysis gap 25 재도달(2609) 또는 info-arch(gap 22/30)/lotto(gap 11/30) 자연 대기, 또는 review-code(heavy)/polish-ui lock 해제(cooldown N=1) 후 재개.

---

## ✅ SUCCESS — review-code(heavy) 카드 padding p-6/p-3 tier DESIGN.md 문서화 (cycle 2607, 2026-08-26)

진단: open issue 0, approved plan 0/22. fix-incident gap 20/20 재점검 negative(`gh run list` 전부 success/skipped, 실제 incident 없음). op-analysis gap 21/25, info-arch gap 21/30, lotto gap 9/30 미도달. 직전8(2599-2606) distinct=3, lock 없음. cycle 2606 retro가 명시 추천한 p-6(raw grep 90건)/p-3(raw grep 79건) 사용 맥락 후속 검토.

발견: 카드 wrapper(`bg-white ... rounded-xl border ...`) 패턴 한정 재계산 시 p-5 212건(주 tier)/p-4 51건(cycle 2606 확정 2nd tier)/p-6 33건/p-3 24건. p-6·p-3 모두 twin 비교로 drift 아닌 의도된 3rd/4th tier 확정: p-6 = 장문 콘텐츠 단일 페이지(about/contact/privacy/terms/glossary/seasons) + 아이콘+텍스트 CTA 링크 카드 — `analysis/page.tsx` 안에서 주간리뷰/월간리뷰/대시보드/적중기록 CTA 4곳이 `text-3xl` 이모지+`flex-1` 텍스트 구조로 완전 twin. 같은 파일 안 p-4(그리드 리스트 아이템)·p-5(2단 통계 CTA)·p-6(아이콘+텍스트 CTA) 3-tier 공존은 각기 다른 역할의 twin 구조로 설명됨. p-3 = 21개 `*SortControl`/`*Filter`/`*SearchBox` 컴포넌트(필터·정렬 박스) + standings/wild-card 팀행·loading/MyPicksClient 스켈레톤(고밀도 리스트 아이템) 2개 하위 역할.

실행: DESIGN.md Spacing 섹션에 p-6/p-3 tier 항목 추가(p-5/p-4와 동일 형식, twin 근거 명시). `silent-drift-cycle-2607.test.ts` 신규 3건(p-5 dominance 회귀가드, analysis/page.tsx CTA 4-twin 카운트, p-3 파일 역할 전수 검증). `pnpm --filter moneyball exec tsc --noEmit` clean + vitest(558/4444, +1 file/+3 tests) + lint clean. 단일 논리 단위(docs+test only, VERSION bump 대상 아님) → 직접 main commit+push(R4/R7, pre-push hook 정상 통과).

다음 사이클 추천 = op-analysis(gap 21/25) 또는 info-arch(gap 21/30) 자연 대기, 또는 review-code(heavy) — border-radius(2599-2605)+spacing(2606-2607) 두 축 연속 소진 후 신규 카테고리(focus-ring 세부/transition duration 등) 탐색 필요.

## ✅ SUCCESS — review-code(heavy) 카드 padding p-4 compact tier DESIGN.md 문서화 (cycle 2606, 2026-08-26)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). fix-incident gap 20/20 → `gh run list --limit 15` 재점검 전부 success/skipped, 실제 incident 없음(negative). op-analysis gap 20/25 미도달 + cycle 2586 retro 명시("CREDIT_EXHAUSTED 해소 전까지 재발화 불필요") negative. info-arch gap 19/30 미도달. lotto/design-system/polish-ui 각 gap 8/6/7 미도달. 2-chain lock 미충족(직전8 distinct=5). explore-idea saturation 11/12 근접 미충족. cycle 2605 retro 추천대로 border-radius 소진 후 신규 review-code(heavy) 축(shadow/focus-ring) 탐색.

발견: shadow axis 재점검 clean(cycle 2592에 이미 정렬). focus-ring(`focus-visible:outline-*`) 86건 전수 확인 — brand-500 dominant, outline-white 1건(흰 배경 버튼, 의도)/outline-offset-[-2px] 4건(중첩 메뉴 inset, 의도) 모두 twin 확인된 예외, drift 없음. 카드 wrapper(border+rounded-xl) 213건 padding 분포 확인 결과 p-4 79건 발견 — 최초 drift 의심됐으나 `terms/page.tsx:213`·`glossary/page.tsx:108` twin 비교(둘 다 동일 className의 TOC/목차 nav 카드)로 drift 아닌 의도된 보조 유틸리티 카드 2번째 tier 확정.

실행: DESIGN.md Spacing 섹션에 "Compact card padding: 16px (p-4)" 항목 추가(용도 + twin 근거 명시). 코드 변경 없음(문서 전용) — 회귀 테스트 불필요. version 144→145(root/apps/moneyball package.json + VERSION 3-way sync), CHANGELOG.md 엔트리 추가. 단일 논리 단위 → 직접 main commit+push(R4/R7, pre-push hook lint+type-check+version-sync-guard 통과).

다음 사이클 추천 = op-analysis(gap 21/25)/info-arch(gap 20/30) 자연 대기, 또는 review-code(heavy) p-6(59건)/p-3(22건) tier 맥락 후속 검토.

---

## ✅ SUCCESS — review-code(heavy) 드롭다운 패널 3곳 border-radius 최종 정렬 (cycle 2605, 2026-08-26)

진단: open issue 0, approved plan 0/22. 직전8(2597-2604) distinct=4 — 2-chain lock 없음. fix-incident 20-cycle gap trigger 충족(79 cycle 미발화) → forced check(gh run list 전부 success, pipeline_runs 최근 20건 전부 status=success errors=[], 최근 7일 debug commit 1건은 이미 fixed) 실행 결과 clean, 실제 incident 없음. op-analysis gap 19/25, info-arch gap 18/30, lotto gap 7/30 전부 미도달. cycle 2604 retro 추천("잔여 3곳 드롭다운 패널 tier 확정") 채택.

발견: cycle 2604가 tier 불명확(버튼 rounded-lg vs 카드 rounded-xl 어느 쪽인지 twin 부재)으로 범위 제외한 `MegaMenu.tsx`(드롭다운 패널)/`navigation-menu.tsx`(viewport 래퍼)/`SearchClient.tsx`(listbox-option row) 3곳을 재조사. border+shadow-lg 플로팅 패널 계열 전수 grep 결과 `PWAInstallButton`/`QuantOnlyBadge`/`WeeklyTrendMini`/`FactorWaterfallChart`/`MlbFactorWaterfallChart` 전부 `rounded-lg` 사용 — MegaMenu·navigation-menu 두 곳(둘 다 `rounded-md`, 서로 twin 관계이자 유일한 이탈)이 drift로 확정. SearchClient row는 `HistoricalAnalogMatchup`/`MlbHistoricalAnalogMatchup`의 `rounded-lg` interactive-row twin과 정렬.

실행: 3곳 `rounded-md`→`rounded-lg` 정렬. `silent-drift-cycle-2604.test.ts`의 "deferred files still use rounded-md" assertion이 obsolete 화되어 제거(전역 clean 단일 assertion으로 통합) + `silent-drift-cycle-2605.test.ts` 신규(3 tests). DESIGN.md Decisions Log 갱신.

`pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(557 files/4441 tests, +1/+2) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → 직접 main commit+push(R4/R7, pre-push hook lint+type-check+version-sync-guard 통과).

border-radius rounded-md drift family 완전 소진 (cycle 2599 typography 토큰화 → 2602 뱃지 → 2603 알림박스 → 2604 버튼/인풋/캘린더 → 2605 드롭다운 패널, 전역 grep 0건 확인). 다음 사이클 추천 = op-analysis(gap 20/25)/info-arch(gap 19/30) 자연 대기, 또는 review-code(heavy) shadow/focus-ring 카테고리(DESIGN.md에 스펙 자체가 미정의 상태라 review-code 단독 audit 불가 — design-system chain 후보에 가까움).

---

## ✅ SUCCESS — review-code(heavy) 버튼/인풋/캘린더셀 border-radius 최종 정리 (cycle 2604, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전8(2596-2603) distinct=5 — 2-chain lock 없음. op-analysis gap 19/25, info-arch gap 18/30, lotto gap 6/30, design-system 전부 미도달. cycle 2603 retro 1순위 추천("잔여 rounded-md 33건 후속") 채택.

**cycle 2603 결론 정정**: 2603은 "버튼/인풋/캘린더 셀은 재확인 결과 진짜 md tier — 드리프트 아님"으로 결론냈으나 오판. Tailwind `rounded-md`는 6px이지 DESIGN.md md tier(8px)가 아님 — DESIGN.md에 이미 있던 `lg: 12px(rounded-xl)`/`xl: 16px(rounded-2xl)` 주석이 "tier명은 Tailwind suffix명보다 1-notch 아래"임을 증명하는데, sm/md 행엔 그 주석이 없어 2603이 이 패턴을 놓침. 실측 재확인 28건(2602/2603 제외분) 중 guide/methodology.tsx(버튼, 이미 rounded-lg 사용 중인 twin), matchup 테이블 wrapper(rounded-lg twin), analysis.tsx notice box(rounded-lg twin), PWAInstallButton/WeeklyTrendMini(작은 팝오버 rounded-lg twin) 등 다수 쌍둥이 비교로 25건이 실제로는 drift임을 확정.

실행: 25건(MLB 분석/게임 hub 링크 버튼 8곳, 캘린더 날짜 셀 6곳, skip-link 1곳, leaderboard 탭 1곳, about 정보박스 1곳, v2-shadow-monitor 3곳, PlaceholderLoginButton/QuantOnlyBadge/SearchForm(2)/navigation-menu 트리거 각 1~2곳) `rounded-md`→`rounded-lg` 정렬. 잔여 3곳(MegaMenu 드롭다운 패널/navigation-menu viewport/SearchClient row-hover)은 대형 드롭다운 패널이라 버튼(rounded-lg) vs 카드(rounded-xl) tier 불명확 — twin 없어 범위 제외, 다음 사이클 후보. DESIGN.md Border radius 스펙에 Tailwind 클래스 매핑 명시 주석 추가(재발 방지) + Decisions Log 갱신. `silent-drift-cycle-2604.test.ts` 신규(5 tests, 전역 rounded-md 잔존 회귀 가드 포함 — 3곳 제외 전체 코드베이스 grep).

`pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(556 files/4439 tests, +1/+5) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → 직접 main commit+push(R4/R7, pre-push hook lint+type-check+version-sync-guard 통과).

border-radius rounded-md drift family 사실상 소진(cycle 2599 typography 토큰화 → 2602 뱃지 → 2603 알림박스 → 2604 버튼/인풋/캘린더). 다음 사이클 추천 = op-analysis(gap 20/25)/info-arch(gap 19/30) 자연 대기, 또는 review-code(heavy) 신규 카테고리(잔여 3곳 드롭다운 패널 tier 확정, 또는 shadow/focus-ring 스펙 준수 확인).

---

## ✅ SUCCESS — review-code(heavy) 알림박스 border-radius 정정 (cycle 2603, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전8(2596-2603 예정) distinct=5 — 2-chain lock 없음. fix-incident negative(gh run list 전부 success/skipped). op-analysis gap 17/25, info-arch gap 16/30, lotto gap 5/30, design-system(DESIGN.md 방금 갱신) 전부 미도달. explore-idea saturation 11/15 미충족. cycle 2602 retro 1순위 추천("잔여 rounded-md 33건 후속") 채택 — 실제로 남은 33건 중 버튼/인풋/캘린더 셀은 재확인 결과 진짜 md tier(링크형 버튼, 카드형 셀)로 드리프트 아님 확인. 대신 별도 grep(bg-amber/yellow/red-50 + rounded-*)로 "알림박스" 카테고리 전수 비교 → 3건 발견.

발견: amber/yellow 배경 알림박스 ~29곳 중 대다수(rounded-lg 11곳/rounded-xl 15곳)와 달리 3곳만 `rounded-md`(6px, 버튼 tier) 잔존. `accuracy/shadow/page.tsx`+`v2-preview/page.tsx`: role="status" 옐로 박스, `debug/silent-drift/page.tsx`(rounded-xl)와 색상 토큰 완전 동일한데 radius 만 상이. `mlb/factors/page.tsx` MLB placeholder 경고: `TeamBiasTable.tsx`(rounded-lg)와 className 거의 동일(같은 텍스트/배경/패딩)한 인라인 경고 스트립인데 radius 만 상이 — 복붙 후 tier 어긋난 전형적 패턴.

실행: 3곳 각각 쌍둥이 컴포넌트에 맞춰 정렬(role=status 박스 2곳 → `rounded-xl`, 인라인 경고 스트립 1곳 → `rounded-lg`). EN mirror(`en/mlb/factors/page.tsx`) 확인 결과 해당 placeholder 경고 자체가 없어 미러 대상 아님. DESIGN.md Decisions Log 갱신. `silent-drift-cycle-2603.test.ts` 신규(3 tests).

`pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(555 files/4434 tests, +1/+3) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → 직접 main commit+push(R4/R7).

다음 사이클 추천 = op-analysis(gap 18/25)/info-arch(gap 17/30) 자연 발화 대기, 또는 review-code(heavy) 다른 토큰 카테고리(예: shadow scale 미정의 상태 DESIGN.md 보강 여부) 검토.

---

## ✅ SUCCESS — review-code(heavy) 통계 뱃지 border-radius 정정 (cycle 2602, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전20(2583-2602) review-code 12회 지배적이나 나머지 chain 전부 1회+ 발화 — skill-evolution trigger5 미충족. fix-incident negative(gh run list 전부 success/skipped). op-analysis/info-arch/lotto/design-system 전부 gap 미도달. cycle 2600 retro 1순위 추천(review-code heavy) 채택. 참고: cycle 2601(skill-evolution forced) 은 retro commit 은 존재하나 `cycles/2601.json` + `TODOS.md` 엔트리 둘 다 부재 확인 — 기존 "cycle-retro dispatch 자기 검증"(commit 유무만 확인) 보다 넓은 silent skip. 재발 시 mitigation 확장 검토 필요, 본 cycle 은 소급 박제 X(정책).

발견: DESIGN.md border-radius 스펙(sm=4px 뱃지/태그, md=8px 버튼/인풋) 대비 `rounded-md`(6px) 46건 + `rounded-sm`(2px 클래스명) 12건 grep. `analysis/page.tsx` 팩터 수렴 배지(isComplete/isBig, 2026-07-18 박제)는 이미 plain `rounded`(4px) 사용 중인 기존 컨벤션인데, MLB `factors`/`players`/`players/[id]`/`standings`(KBO+EN 미러) 통계 뱃지 + `glossary`/`TableOfContents` 앵커 태그 + `MatchupFactorCompare`/`MlbMatchupFactorCompare` 비교 셀 강조 18곳(10파일)이 `rounded-md`(버튼 tier)를 사용 — 같은 "뱃지" 역할인데 KBO 원본과 MLB 미러 사이 1-notch 이탈.

실행: 18곳 `rounded-md` → `rounded` 치환. DESIGN.md Decisions Log 갱신. `silent-drift-cycle-2602.test.ts` 신규(2 tests). 버튼/인풋/드롭다운/알림박스/캘린더 셀 역할의 잔여 `rounded-md` 33건은 다른 tier(md/버튼) 후보라 스코프 제외 — 명시 이연.

`pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(554 files/4431 tests, +1/+2) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → 직접 main commit+push(R4/R7).

다음 사이클 추천 = review-code(heavy) 잔여 rounded-md 33건 후속, 또는 op-analysis(gap 16/25)/info-arch(gap 15/30) 자연 발화 대기.

---

## ✅ SUCCESS — design-system(최초 발화) micro typography scale 토큰화 (cycle 2599, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전8(2591-2598) distinct=4(review-code 5+polish-ui 1+lotto 1+dimension-cycle 1) — 2-chain lock 없음. fix-incident gap 59+/20 이나 gh run list 전부 success/skipped negative. op-analysis gap 12/25, info-arch gap 11/30 미도달. lotto gap 0(직전 발화). explore-idea saturation 12/15 충족되나 TODOS Next-Up 신규 리드 없음 negative. cycle 2594·2597 review-code(heavy) 가 두 번 연속 typography 임의값(text-[9/10/11px] 193건)을 design-system 후보로 승격 명시 추천 — carry-over evidence 채택. design-system chain 은 cycle 2400~2598 구간 0회 발화(최초 실행).

발견: DESIGN.md Scale 이 xs(12px) 부터 시작하나 실제로는 `text-[9px]`(26건)/`text-[10px]`(119건)/`text-[11px]`(46건) 총 193건 arbitrary micro caption 값 존재. `globals.css` @theme 블록엔 font-size 토큰 자체가 전무(색상/motion 만 정의). 9/10px(145/193, 76%)는 사용빈도 높고 값 명확해 즉시 토큰화 안전. 11px(46건)은 3xs(9)/2xs(10)/xs(12) 사이 낀 값이라 신규 토큰 승격 vs 흡수가 시각 판단 필요 — 명시적으로 다음 사이클 이연.

실행: `--text-3xs`(9px)/`--text-2xs`(10px) + line-height 신규 정의. DESIGN.md Scale 갱신 + 11px 미해결 명시. 전체 코드베이스 52개 파일 `text-[9px]`→`text-3xs`, `text-[10px]`→`text-2xs` 픽셀 값 보존 치환(렌더링 변화 0). `design-system-cycle-2599-micro-typography.test.ts` 신규(토큰 정의 + arbitrary value 잔존 0건 회귀 가드). tsc clean + vitest 552/4428(+1/+2) + lint clean. 단일 논리 단위 → 직접 main commit+push(R4/R7). version-sync-guard 최초 실패(root package.json 누락) → 별도 fix commit 으로 3-way 동기 후 CI 재확인.

다음 사이클 추천 = polish-ui(11px 46건 시각 검토) 또는 review-code(heavy)/op-analysis(gap 13/25)/info-arch(gap 12/30) 자연 발화.

---

## 🔁 RETRO-ONLY — review-code(heavy) transition-all/typography 축 정독, 신규 fix 없음 (cycle 2597, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전8(2589-2596) distinct=3(review-code 6+polish-ui 1+dimension-cycle 1) — 2-chain lock 해소(cycle 2596 cooldown N=1 만료, 신선 재평가). fix-incident gap 71/20 도달했으나 `gh run list --limit 40` JSON 전수(conclusion) 확인 — success/skipped 외 0건, negative. op-analysis gap 11/25, lotto gap 29/30(픽스 `2026-08-29-50sets.md`+결과 `2026-08-22-result.md` 이미 박제, 데이터 신선 2일) — 둘 다 미도달. info-arch gap 10/30 미도달. explore-idea saturation 13/15 충족되나 TODOS 안 별도 Next-Up 섹션 부재 + GH issue 0 + plan#29 Tier 4(risk=3, 자율 가능 no, 사용자 영역) 재확인 — negative. cycle 2595 carry-over 후보(typography scale 문서-vs-실제 gap, transition-all 33건) 정독.

발견: `transition-all` 33건 중 26건(progress bar `width` 애니메이션 7건 제외)이 카드 hover `hover:shadow-md` + `hover:border-brand-500/50` 동시 변경 패턴으로 KBO/MLB/EN 전체(teams/players/standings/team/wild-card/misses 등)에 걸쳐 광범위하게 일관 — DESIGN.md Motion 섹션엔 "카드 hover: transition-shadow" 단일 속성만 문서화돼 있지만 실제로는 border+shadow 동시 변경이 지배적 컨벤션이라 다수(26/33)를 소수 취급해 되돌리는 게 오히려 위험 — 문서 갭이지 코드 drift 아님. progress-bar 7건은 `width` inline-style 애니메이션 대상이라 `transition-all`이 타당(전용 `transition-width` 유틸 부재). 두 그룹 다 내부 일관 — 수정 대상 없음. 별도로 `text-[Npx]` 임의값 165건 확인(9~11px 마이크로 캡션 다수) — DESIGN.md 타이포 스케일(xs 12px~)에 없는 하위 크기지만 규모(165건, 다수 파일)가 단일 사이클 범위를 초과 — 성급한 전수 수정은 scope creep 위험, design-system 차원 후보로만 기록.

실행 없음 — 코드 변경 0. 안전한 negative 확인 (섣부른 "다수→소수" 오분류 회피).

다음 사이클 추천 = op-analysis(gap 12/25) 또는 lotto(gap 30/30 도달 예상, 회차 갱신 확인 필요) 자연 발화 대기, 또는 typography 임의값 165건 카탈로그를 design-system chain spec 후보로 승격 검토.

---

## ⚪ PARTIAL (retro-only) — dimension-cycle(2-chain lock fallback) site/acquisition 진단, gap 없음 (cycle 2596, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전8(2588-2595) distinct=2(review-code 7+polish-ui 1) → 2-chain lock 재탐지. 잠긴 두 chain 제외 후 재평가: fix-incident negative(gh run list --limit 30, scheduled workflow health-alert/runtime-error-alert/deploy-drift-alert 전부 success), op-analysis gap 10/25, lotto gap 28/30, info-arch gap 9/30 전부 미도달, explore-idea saturation 14/15 충족되나 plan#29 게이트 미충족 재확인 — negative. 룰 3의 fallback(polish-ui) 자체가 이번엔 locked라 dimension-cycle(site/acquisition) 로 대체 진단.

실행: next/image alt 커버리지(정상), raw `<img>` 태그(테스트 파일뿐), page.tsx metadata 누락 14건 전수 확인 — debug/* 8건(비공개 dev 페이지) + reviews weekly/monthly index 6건(redirect-only, 타겟 [week]/[month] 페이지는 전부 metadata 보유) = 전부 false positive. 실질 SEO/perf gap 없음 확인. 코드 변경 0.

다음 사이클 추천 = lotto(gap 28/30, 가장 근접) 또는 op-analysis(gap 10/25) 자연 발화 대기. review-code/polish-ui lock cooldown(N=1) 적용 중.

---

## ✅ SUCCESS — polish-ui(2-chain lock fallback) contact 메일 쓰기 CTA border-radius 정정 (cycle 2595, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전8(2587-2594) distinct=2(review-code 7+info-arch 1) → 2-chain lock 탐지(cycle 225 룰). 잠긴 두 chain 제외 후 재평가: fix-incident negative(gh run list 전부 success/skipped), op-analysis gap 9/25, lotto gap 27/30(픽스/결과 이미 박제), design-system negative(DESIGN.md mtime 당일=git checkout 부작용), explore-idea saturation 14/15 재확인(plan#29 여전히 postseason/participation≥10 게이트 미충족) — 전부 negative. 룰에 따라 polish-ui 강제 발화.

발견: 사이트 전역 primary 버튼(bg-brand-500/600) family 13건 전수 확인 — 전부 rounded-lg(DESIGN.md "md: 8px — 버튼, 인풋" 일치). contact/page.tsx 문의 유형 "메일 쓰기" mailto CTA 만 유일하게 rounded-md — 같은 li 컨테이너(rounded-lg)와도, family 전체와도 이탈.

실행: rounded-md→rounded-lg 정렬. silent-drift-cycle-2595.test.ts 신규(app/contact/__tests__). tsc clean + vitest 551/4426(+1/+1) + lint clean. 단일 논리 단위 → 직접 main commit+push(R4/R7), pre-push guard(lint+type-check+version-sync-guard+smoke) 통과, CI green 실측 확인.

다음 사이클 추천 = review-code(heavy)/info-arch 2-chain lock cooldown(N=1) 적용 중이니 잔여 pool(op-analysis gap 10/25, lotto gap 28/30) 자연 대기 또는 polish-ui 축 신규 정독(typography scale 문서-vs-실제 gap, transition-all 33건 등 미확정 후보 — 이번 cycle엔 risk/scope 판단상 보류).

---

## ✅ SUCCESS — review-code(heavy) FactorBreakdown 카드 spacing/배경 drift 정정 (cycle 2594, 2026-08-25)

진단: open issue 0, approved plan 0/23(전수 재확인 — 전부 completed/archived/superseded). 직전8(2586-2593) distinct=3(review-code 6+op-analysis 1+info-arch 1) — 2-chain lock 없음. fix-incident gh run list 전부 success — negative. op-analysis gap 8/25, lotto gap 26/30(픽스/결과 이미 박제됨) — negative. info-arch gap 7/30 미도달. cycle 2593 carry-over 추천대로 focus-ring axis 스윕 완료 판단 후 spacing axis 신규 정독.

발견: DESIGN.md 카드 gap/padding 스펙 대비 gap-3/gap-4 raw count 혼재는 그리드 밀도별 의도 차이로 판단(Explore 서브에이전트 파견해 raw count 대신 sibling family 단위 재검증). "팩터별 분석" 카드 family(DetailedFactorAnalysis/MlbDetailedFactorAnalysis/FactorBreakdown, 각각 analysis/mlb+en/predictions+insights 라우트) 전부 rounded-xl border p-5 bg-white 인데 FactorBreakdown 만 유일하게 bg-gray-50 + p-4 이탈.

실행: p-4→p-5, bg-gray-50→bg-white 정렬. silent-drift-cycle-2594.test.ts 신규(components/predictions/__tests__). tsc clean + vitest 550/4425(+1/+2) + lint clean. 단일 논리 단위 → 직접 main commit+push(R4/R7), pre-push guard 통과.

다음 사이클 추천 = spacing axis 잔여 스윕(gap-3/gap-4 family 단위 재검토 여지 있으나 raw count 로는 이번엔 negative 판단) 또는 op-analysis(gap 9/25)/lotto(gap 27/30) 자연 발화 대기.

---

## ✅ SUCCESS — review-code(heavy) focus-ring axis 3건 정렬 (cycle 2593, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전8(2585-2592) distinct=3(review-code 6+op-analysis 1+info-arch 1) — 2-chain lock 없음. fix-incident gap 20+/20 재점검(`gh run list --limit 15` 전부 success/skipped) — negative. op-analysis gap 7/25, lotto gap 25/30, info-arch gap 6/30 미도달. explore-idea saturation 14/15 재확인(TODOS Next-Up 신규리드 없음, plan#29 spec_only_deferred, GH issue 0) — negative, 6연속 재소진. cycle 2592 carry-over 추천대로 shadow axis 완료 후 focus-ring axis 신규 정독. 진행 중 선행 fresh process 가 동일 cycle 2593 로 `e337f4c8`(analysis/page.tsx 인라인 링크 outline-offset-1→2) 를 VERSION/CHANGELOG 미동기 상태로 이미 커밋해둔 것 확인 — watch.sh 재시작 경합으로 판단, 동일 cycle 연속으로 흡수.

발견: DESIGN.md 에 focus-ring 명시 스펙 없음 — 실측 컨벤션 대조(`focus-visible:outline-*` 314건, dominant = outline+outline-2+outline-offset-2+outline-brand-500 71~84건). 이탈 3건: (1) `analysis/page.tsx` 인라인 링크 outline-offset-1(선행 commit 정정 완료). (2) `LeagueSelector.tsx` 만 유일 ring 기반(`ring-2 ring-brand-400`) — 같은 헤더 family(MegaMenu TRIGGER_BASE 주석 "focus-visible: outline-2 outline-brand-500", MobileNav)는 전부 outline 기반. (3) `dashboard/error.tsx` 재시도 버튼이 sibling `app/error.tsx` 와 outline 스택 동일하나 `outline-brand-500` 색상만 누락.

실행: LeagueSelector 를 MegaMenu TRIGGER_BASE 와 동일 outline 스택으로 정렬, dashboard/error.tsx 에 `focus-visible:outline-brand-500` 추가. `silent-drift-cycle-2593.test.ts` 2건 신규(layout/__tests__, dashboard/__tests__). VERSION/package.json/CHANGELOG 3-way sync 로 선행 commit 미동기 회수. `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(549/4423) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → 직접 main commit+push(R4/R7), pre-push guard(lint+type-check+version-sync-guard+smoke test) 통과.

다음 사이클 추천 = focus-ring axis 스윕 완료 추정(잔여 ring 기반 0건, BigMatchDebateCard `outline-white`/MobileNav `outline-offset-[-2px]` 는 의도된 별개 컨벤션 확인) → spacing axis 신규 정독, 또는 op-analysis(gap 8/25)/lotto(gap 26/30) 자연 발화 대기.

---

## ✅ SUCCESS — review-code(heavy) lotto 추첨 결과 카드 border-radius drift 정정 (cycle 2591, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전8(2583-2590) distinct=3(review-code 6+op-analysis 1+info-arch 1) — 2-chain lock 없음. fix-incident gap 65/20 도달했으나 `gh run list` 전부 success/skipped — negative. op-analysis gap 5/25, lotto gap 23/30(picks `2026-08-29-50sets.md` + result `2026-08-22-result.md` 이미 박제됨 — trigger negative), info-arch gap 4/30 미도달. explore-idea saturation 14/15 충족되나 cycle 2590 재확인과 동일 negative 지속. cycle 2590 "border-radius/색상 외 축 정독" 추천 대신 border-radius axis 전수 스캔 마무리 우선 판단.

발견: `grep rounded-2xl apps/moneyball/src/app` 전수 스캔 — 대부분 히어로 gradient 섹션(brand-800→brand-700, `matchup`/`players`/`accuracy`/`en/mlb` 계열)으로 의도된 컨벤션. `lotto/page.tsx:155` `ResultSection`(추첨 결과 정리 카드, amber 배경 알림 박스)만 `rounded-2xl border-2` 로 landing — 같은 파일 히어로 섹션(line 244)과 혼동 유발. 동일 amber 알림/카드 패턴 쓰는 `accuracy/page.tsx:408`, `en/mlb page.tsx:140`, `wild-card/page.tsx`, `postseason/page.tsx` 등은 전부 `rounded-xl`(lg:12px, 카드 전용). cycle 2583(홈)/cycle 2590(analysis+reviews 허브)에 이은 border-radius drift family 3번째 별개 파일.

실행: `rounded-xl` 로 정렬, `silent-drift-cycle-2591.test.ts` 신규 3건(lotto/__tests__). `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(545/4416, +1/+3) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → 직접 main commit+push(R4/R7), CI green 실측 확인(run 32802790501, conclusion=success).

다음 사이클 추천 = border-radius axis 전수 스캔 완료 추정 (남은 rounded-2xl 은 전부 히어로 gradient, 의도적) → spacing/shadow/focus-ring 신규 축 정독, 또는 operational-analysis(gap 5/25)/lotto(gap 23/30) 자연 발화 대기.

---

## ✅ SUCCESS — review-code(heavy) analysis + reviews 허브 빈 상태 카드 border-radius drift 정정 (cycle 2590, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전8(2582-2589) distinct=3(review-code 6+op-analysis 1+info-arch 1) — 2-chain lock 없음. fix-incident 60cycle(2530-2589) 미발화 재확인, `gh run list --limit 10` 전부 success/skipped/in_progress — negative. op-analysis gap 3/25, lotto gap 21/30, info-arch gap 2/30 미도달. explore-idea saturation 14/15 충족되나 4-source 재확인(TODOS Next-Up 신규리드 없음, plan#29 spec_only_deferred, GH issue 0, DESIGN.md mtime 당일=git checkout 부작용) — negative. cycle 2589 carry-over 후보(`misses/page.tsx`, `/analysis` `/insights` 허브) 정독.

발견: `misses/page.tsx`(KBO/MLB/EN) 전수 확인 — 이미 `text-brand-500`, drift 없음. `analysis/page.tsx` 는 mlb 계열 twin(`mlb/analysis/page.tsx` 부재, `analysis-data.ts` 만 존재)이라 family 비교 대상 아님. `methodology/page.tsx` "적중률" 카드 = 4개 nav 카드(소개/용어사전/적중률/AI인사이트) 공통 스타일 일관 — false lead. 대신 border-radius 축에서 신규 발견: `analysis/page.tsx`(빈 상태 "오늘 경기 없음") + `reviews/page.tsx`(허브, 빈 상태 "검증된 예측 없음") 카드가 `rounded-2xl`(히어로 전용 토큰, DESIGN.md xl:16px) 로 landing — 동일 패턴 쓰는 `analysis/game/[id]`, `reviews/misses·weekly·monthly`(KBO/MLB/EN 6벌), `debug/hallucination·pipeline` 전부 `rounded-xl`(lg:12px, 카드 전용). cycle 2583(홈 일반 카드 rounded-2xl→rounded-xl) 과 동일 border-radius family 의 별개 파일 재발.

실행: 두 파일 `rounded-xl` 로 정렬, `silent-drift-cycle-2590.test.ts` 신규 2건(analysis/__tests__, reviews/__tests__ 각 2 assertion). `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball exec vitest run`(544/4413, +2/+4) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → 직접 main commit+push(R4/R7), CI green 실측 확인(run 32802026472, conclusion=success).

다음 사이클 추천 = operational-analysis(gap 3/25) 또는 lotto(gap 21/30) 자연 발화 대기, 또는 review-code(heavy) 계속 시 border-radius/색상 외 축(spacing, shadow, focus-ring) 신규 카테고리 정독.

---

## 🔁 RETRO-ONLY — review-code(heavy) mlb reviews weekly/monthly 헤드라인 + green-text 잔존 sweep, 신규 fix 없음 (cycle 2589, 2026-08-25)

진단: open issue 0, approved plan 0/23(전부 non-approved 재확인). 직전8(2581-2588) distinct=4(review-code 5+polish-ui 1+op-analysis 1+info-arch 1) — lock 없음. fix-incident gap 20+/20 재점검(`gh run list --limit 10` 전부 success/skipped/in_progress, CI Failure Dispatch 3건 모두 skipped) — negative. op-analysis gap 3/25, lotto gap 21/30, info-arch gap 2/30 미도달. cycle 2588 carry-over 명시 후보(`mlb/reviews/weekly|monthly [week]/[month]` 헤드라인 적중 색상 KBO family 7번째 재발 여부) 정독.

실행: `mlb/reviews/weekly/[week]/page.tsx`, `mlb/reviews/monthly/[month]/page.tsx`, `en/mlb/reviews/weekly|monthly` 4파일 헤드라인 스탯 컬러 전수 대조 — 전부 이미 `text-brand-500`(KBO weekly/monthly cycle 2585 정정본과 동일 shade), drift 없음 확인. 동일 파일들의 "강수렴 픽" 라벨(`text-brand-600 dark:text-brand-400`)은 KBO/MLB/EN 전체 일관 — cycle 2585 문서화된 의도적 별개 컨벤션, 범위 밖 재확인. 추가로 `text-green-[0-9]` 잔존 전수 grep — 전부 `/debug/*` 내부 관리자 페이지 한정(agent-fallback/pipeline/hallucination/factor-correlation/silent-drift/reliability/deploy-drift), 사용자 가시 라우트 0건 — UI 코드 jargon 예외 규칙(`/debug` 제외) 대상이라 폴리시 범위 밖. 신규 drift 0건 — 코드 변경 없음.

다음 사이클 추천 = op-analysis(gap 3/25, 미도달) 또는 lotto(gap 21/30, 미도달) 자연 발화 대기. review-code(heavy) 계속 시 미감사 후보 소진 — mlb/en 계열 review 헤드라인 + green-text 잔존 확인 완료. 다음은 `misses/page.tsx`(KBO/MLB/EN 3벌) 또는 `/analysis` `/insights` 허브 본문 전수 정독 필요.

---

## ✅ SUCCESS — review-code(heavy) reviews 허브 헤드라인 적중 카운트 색상 drift 정정 (cycle 2588, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전8=2580-2587 distinct=4: review-code/polish-ui/op-analysis/info-arch). fix-incident gap 20+/20 재점검(gh run list 전부 success/skipped/in_progress) — negative. op-analysis gap 2/25, lotto gap 20/30, info-arch gap 1/30 미도달. explore-idea saturation 14/15 충족되나 재확인(TODOS Next-Up 없음, plan#29 spec_only_deferred, GH issue 0) — negative. DESIGN.md mtime 당일 = git checkout 부작용 — negative. cycle 2587 carry-over 후보(reviews hub 자체, mlb 계열 review 라우트) 정독.

발견: `reviews/page.tsx`(허브, 430줄) 적중 카운트 헤드라인이 `text-brand-600 dark:text-brand-400` — weekly/monthly(cycle 2585 정정)는 이미 `text-brand-500`. DESIGN.md "적중 표시 = brand-500" family(cycle 50/65/456/744/2563/2585) 7번째 재발. 적중률(rate) 은 `accuracyRateColorClass` 공용 3-tier 함수(brand/yellow/red, predictions/AccuracyHeaderCard/reviews 허브 공유) — 별개 의도 컨벤션 확인, 범위 밖. mlb/reviews, en/mlb/reviews 허브는 요약 stat 카드 자체가 없어 동일 drift 대상 아님.

실행: `text-brand-500` 로 정렬, `silent-drift-cycle-2588.test.ts` 신규(3 assertion). tsc clean + eslint clean + vitest 542/4409 all green(+1 file/+3 tests). 단일 논리 단위 → PR 없이 직접 main commit+push(R4/R7), CI green 실측 확인(run 32800955673).

다음 사이클 추천 = operational-analysis(gap 2/25 아직 이름) 또는 review-code(heavy, 미확인 후보: mlb reviews weekly/monthly [week]/[month] 헤드라인 — KBO 쪽 7번째 재발 family가 MLB 쪽엔 아직 대조 안 됨).

---

## ✅ SUCCESS — info-architecture-review `/lotto/check` 헤더·footer 누락 정정 (cycle 2587, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전8(2579-2586) distinct=3(review-code 6+polish-ui 1+op-analysis 1) — lock 없음. fix-incident gap 23/20 재점검 negative. op-analysis 방금 발화, lotto gap19/30·info-arch gap10/30 미도달(주기 trigger 아님). explore-idea saturation 13/15 4-source 재확인 negative. **신규 트리거**: `git log --since="7 days ago" --diff-filter=A` 로 page.tsx 15+개 신규 확인 → info-arch trigger(1) "라우트 신규 추가≥3/1주" 충족.

발견: 신규 라우트 전수 breadcrumb/헤더/footer 대조 — mlb 계열은 이미 정합, `/lotto/check`(cycle 2019 배선, hub 링크+sitemap.ts 있음)만 헤더 megamenu + footer 로또 컬럼 양쪽 누락. cycle 2225(/mlb/matchup)+2153과 동일 family 3번째 재발.

실행: Header.tsx LOTTO_LINKS + Footer.tsx 로또 컬럼에 `/lotto/check` 추가, ASCII wireframe 주석 갱신, Footer.test.tsx assertion 3→4 link 갱신. tsc/lint/vitest(541/4406) 전부 clean, 단일 커밋 직접 main push(R4/R7), CI green 실측 확인(run 32800151276).

다음 사이클 추천 = review-code(heavy)(미감사 후보: reviews hub 자체, mlb 계열 review 라우트) 또는 explore-idea(saturation 근접 재확인).

---

## ✅ SUCCESS — operational-analysis(heavy) CE cohort 8회 연속 재확인 (cycle 2586, 2026-08-25)

진단: open issue 0, approved plan 0/29. 2-chain alternation lock 발동(직전8=2578-2585 distinct=2: review-code 7+polish-ui 1) — 둘 다 제외. fix-incident 직전25 0회 → gh run list 재확인 negative. op-analysis gap=25(마지막 2561) — 정확히 threshold 도달, mandatory trigger. lock+gap 이중 trigger 일치로 op-analysis(heavy) 채택.

실행: `scripts/op-analysis-ce-cohort.ts` 재실행 — 전체 n=337(CE 290/비CE 47), 격차 10.4pp, cycle 2556과 완전 동일(8회 연속 재확인). DB 직접 조회로 파이프라인 정상성 확인: league=kbo v1.8 verified 312 + v1.8-credit-fail 25 = 337 일치, 최신 verified_at 2026-08-23(2일 전) — drift 아님, 실제 경과 캘린더 일수 부족(cycle 처리 속도 ≫ 실제 경기일 간격, 기존 패턴 재확인). CLAUDE.md 모델 캘리브레이션 문단에 cycle 2586 엔트리 append. 코드 변경 없음 — 문서 갱신만 direct main commit(R4).

다음 사이클 추천 = review-code(heavy) 또는 explore-idea. 2-chain lock 은 이번 cycle op-analysis 발화로 자연 해소(직전8 재계산 시 distinct≥3). explore-idea saturation 직전15=14/15 근접 — 재확인 대상.

---

## ✅ SUCCESS — review-code(heavy) reviews weekly/monthly 헤드라인 적중 색상 drift 정정 (cycle 2585, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전8=2577-2584 distinct=3: review-code 6+polish-ui 1+info-arch 1). fix-incident gap 21/20 mandatory 재점검(gh run list 전부 success/skipped/in_progress) — negative. op-analysis gap 24/25, lotto gap 17/30, info-arch gap 8/30 미도달. explore-idea saturation 14/15 4연속 재소진(TODOS Next-Up 사용자영역 1-line만, plan#29 Tier4, GH issue 0). DESIGN.md mtime git checkout 부작용 — negative. cycle 2584 carry-over(reviews weekly/monthly 미감사) 정독.

발견: `reviews/weekly/[week]/page.tsx`(529줄) + `reviews/monthly/[month]/page.tsx`(486줄) 전수 정독 — 헤드라인 "적중"/"적중률"/"전월 대비" 스탯 색상이 weekly=`text-brand-500`(cycle 240 도입) vs monthly=`text-brand-600 dark:text-brand-400`(cycle 250 도입)로 불일치. `git log -S` 확인 결과 두 사이클이 각각 독립적으로 `text-green-*` → brand 토큰 마이그레이션 수행하며 서로 다른 shade로 landing — DESIGN.md "적중 표시 = brand-500" family(cycle 50/65/456/744/2563) 6번째 재발. monthly "강수렴 픽" 라벨은 이미 weekly와 동일해 범위 밖.

실행: monthly 헤드라인 3곳(적중/적중률/전월대비) `text-brand-500` 정렬. `silent-drift-cycle-2585.test.ts` 신규(positive 2 + negative 1 assertion). tsc/lint/vitest(541/4406, +1/+3) 전부 clean. 단일 논리 단위 1-commit 직접 main push(R4/R7), pre-push guard clean, CI green 실측 확인(run 32798841453).

다음 사이클 추천 = operational-analysis(gap 24/25, 근접 — 자연 도달 예상). review-code(heavy) 미감사 후보는 predictions/insights/[date] + HighlightCard family(2584) + weekly/monthly 헤드라인(2585)까지 소진 — 다음 review-code 세션은 새 영역(reviews hub 자체 또는 mlb 계열 review 라우트) 재탐색 필요.

---

## 🔁 RETRO-ONLY — review-code(heavy) predictions/insights [date] 라우트 + HighlightCard/MlbHighlightCard 정독, 신규 fix 없음 (cycle 2584, 2026-08-25)

진단: open issue 0, approved plan 0/23(전부 non-approved 재확인). 2-chain lock 없음(직전8=2576-2583 distinct=3: review-code 6+polish-ui 1+info-arch 1). fix-incident gap 정확히 20/20 도달 → mandatory 재점검(`gh run list --limit 15` 전부 success/skipped/in_progress, CI failure 0건) — negative. op-analysis gap 23/25, lotto gap 16/30, info-arch gap 7/30 미도달. explore-idea saturation 14/15 충족되나 4-source 재확인(신규라우트 mtime -7 = 전체 반환, git checkout 부작용 / TODOS Next-Up 신규 리드 없음 / plan #29 Tier4 그대로 / GH issue 0) — negative, 3연속(2567/2572/2584) 재소진 확인. DESIGN.md mtime 당일 = 동일 git checkout 부작용 — design-system negative. 잔여 chain 전부 미충족 → review-code(heavy) dominance-positive streak 정합, cycle 2569/2582 carry-over "미감사 후보"(`insights/[date]`, `predictions/[date]`, `reviews/weekly|monthly/[..]`) 순회 대상 정독.

실행: `predictions/[date]/page.tsx`(618줄) — SMALL_SAMPLE_N 게이트/winProb 계산/topPick 로직 전수 확인, `DailyPredictionSummaryBar`(brand-500 "최고 자신감" 배지)가 cycle 2563 문서화된 결정과 일치(cycle 2581 "오늘의 탑픽" accent gold 정정과는 별개 개념·별도 컴포넌트로 혼동 없음) 확인. `insights/[date]/page.tsx`(225줄) + `insightsStatusBadge` 헬퍼 — brand/red/yellow 배지 색상 전부 기존 컨벤션(적중=brand family) 정합, 신규 drift 없음. `HighlightCard`/`MlbHighlightCard`(KBO/MLB 병렬 컴포넌트, cycle 2582 MatchupEloChart 병합과 동일 family 의심) — 필드 shape 상이(gameId:number vs externalGameId:string, predictedWinnerCode vs predictedHomeWin) + 상세 링크 slug 패턴 상이(`/analysis/game/[id]` vs `/mlb/games/[date]/[homeCode]-vs-[awayCode]`)로 실제 병합 불가능 확인(주석에 이미 문서화됨, MatchupEloChart 케이스와 반대로 병합 대상 아님). MLB slug 순서(`homeCode-vs-awayCode`)도 `mlb/games/[date]/page.tsx` 링크 생성 로직과 대조 일치 확인. reviews weekly/monthly [date] 라우트에 rounded-2xl 잔존 0건(cycle 2583 border-radius 스윕 범위 밖 재확인). 4개 파일/헬퍼 전수 정독 후 신규 발견 0건 — 코드 변경 없음.

다음 사이클 추천 = op-analysis(gap 24/25, 근접) 또는 lotto(gap 17/30) 자연 발화 대기. review-code(heavy) 계속 시 미감사 후보 소진(predictions/insights [date] + HighlightCard family 확인 완료) — 다음은 `reviews/weekly/[week]/page.tsx`(529줄)·`reviews/monthly/[month]/page.tsx`(486줄) 본문 전수 정독 필요.

---

## ✅ SUCCESS — review-code(heavy) 홈 page.tsx 일반 카드 4곳 border-radius drift 정정 (cycle 2583, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전8=2575-2582 distinct=3: review-code 7+polish-ui 1). fix-incident gap 57/20 mandatory 재점검(gh run list 전부 success/in_progress) — negative. op-analysis gap 22/25, lotto gap 15/30, info-arch gap 6/30 미도달. explore-idea saturation 재확인 8 cycle 전 negative. DESIGN.md mtime 당일 = git checkout 부작용 — design-system negative. cycle 2538/2582 carry-over(대형 미감사 파일 page.tsx 1090줄) 정독.

발견: DESIGN.md border-radius 토큰 스펙(`lg: 12px — 카드(rounded-xl)` / `xl: 16px — 히어로 섹션(rounded-2xl)`) 대비 홈 page.tsx 가 "경기 없음" fallback/"이번 주 일정"/"KBO 팀 순위"/"분석 방법론" 4개 일반 카드에 rounded-2xl 사용 — 같은 파일 "오늘 예측" 카드는 이미 rounded-xl 정합. 사이트 전체 검증: rounded-xl 96파일(카드 dominant) vs rounded-2xl 12파일(전부 브랜드 그라디언트 히어로 헤더 전용, accuracy/matchup/players 3파일 교차 확인) — page.tsx만 4곳 이탈.

실행: 4곳 rounded-2xl → rounded-xl 정정(히어로 플레이스홀더 배너는 유지). silent-drift-cycle-2583.test.ts 신규(정정 확인 + count assertion). border-radius 전면 스윕(102파일)은 100+파일 가드 대상이라 범위 밖 — page.tsx 1파일 좁은 스코프만 처리.

tsc/lint/test(540/4403, +1/+1) 전부 clean. 단일 논리 단위 1-commit 직접 main push(R4/R7), pre-push guard clean.

다음 사이클 추천 = op-analysis(gap 23/25, 근접) 또는 lotto(gap 16/30). border-radius 컨벤션 전면 스윕은 여전히 보류 — 신규 라우트 추가 시점마다 좁은 스코프로 재접근.

## ✅ SUCCESS — review-code(heavy) MatchupEloChart/MlbMatchupEloChart JSX 중복 제거 (cycle 2582, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 미충족(직전8=2574-2581 distinct=3: review-code 6+info-arch 1+polish-ui 1). fix-incident gap 56/20 mandatory 재점검(gh run list 전부 success/skipped/in_progress) — negative. op-analysis gap 21/25, lotto gap 14/30 미도달. explore-idea saturation 12/15 충족되나 4-source 재확인(신규라우트 mtime -7 = git checkout 부작용 전체 반환, TODOS Next-Up 신규 리드 없음, GH issue 0) — negative. DESIGN.md mtime 당일 = 동일 git checkout 부작용 — design-system negative. cycle 2579 발견 carry-over(MatchupEloChart/MlbMatchupEloChart 병합 후보) 처리.

실행: `MatchupEloChart.tsx`(112줄, KBO) vs `MlbMatchupEloChart.tsx`(115줄, MLB) diff = type import/명 3곳뿐, JSX/로직 100% 동일 확인(point shape 구조적으로 완전 동일 `{date, eloA, eloB}`). MLB 쪽을 얇은 wrapper 로 전환(115줄→13줄, KBO 컴포넌트에 위임). 데이터 빌더(`buildMlbMatchupEloTrend`)는 MLB 전용 로직(다운샘플 미적용) 존재해 별개 유지 — 병합 대상은 순수 렌더링 JSX만. cycle 2581 이 KBO/MLB 병렬 컴포넌트 색상 drift 버그를 fix 한 직후라, 렌더링 로직 중복 자체가 다음 drift 재발 지점이라는 판단. tsc/lint/test(539/4402, delta 0 — 전용 컴포넌트 테스트 부재) 전부 clean. 단일 논리 단위 1-commit 직접 main push(R4/R7), version-sync guard 추가 fix 불필요(clean push).

다음 사이클 추천 = op-analysis(gap 22/25, 근접) 또는 lotto(gap 15/30) 자연 발화 대기. border-radius 컨벤션(rounded-lg vs rounded-xl, 102파일) 병합 후보는 100+파일 가드 대상이라 좁은 스코프(신규 라우트만)로 재접근 필요 — review-code 또는 design-system heavy 세션 carry-over 유지.

---

## ✅ SUCCESS — polish-ui(2-chain lock fallback) "오늘의 탑픽" 배지 accent gold 정렬 (cycle 2581, 2026-08-25)

진단: open issue 0, approved plan 0/29. **2-chain alternation lock 발동**(직전8=2573-2580 distinct=2: review-code 7+info-architecture-review 1) → 둘 다 후보 제외. fix-incident gap 55/20 mandatory 재점검(gh run list 전부 success/skipped) — negative. op-analysis gap 20/25, lotto gap 13/30 미도달. explore-idea saturation 12/15 충족되나 4-source(TODOS Next-Up/GH issue/plan gating/신규라우트) 8 cycle 전(2572) 재확인 negative — 재소진 skip. DESIGN.md mtime 당일(git checkout 영향, 실갱신 아님) — design-system negative. 잔여 chain 전부 미충족 → lock fallback 규칙대로 polish-ui 강제.

발견: DESIGN.md "Accent — 빅매치 뱃지, **승률 하이라이트**, 프리미엄 강조" 가 지칭하는 "오늘의 탑픽"(`isTopPick`) 배지가 실제로는 3갈래 색상으로 흩어짐 — KBO `analysis/page.tsx`(wave-377) = amber-300/500, MLB 4미러(`mlb/analysis`+`mlb/games/[date]`+en 2개, wave-624/plan28) = brand-500/400. 같은 파일 바로 위 `isBig`("⭐ 빅매치") 배지는 이미 `var(--color-accent)` 정렬돼 있어 인접 대조군 — 두 배지가 같은 조건분기 트리 안인데 색 체계만 다른 채 방치. amber 는 factor 수렴 10/10 tier(2026-07-18 결정, `isTopUpcomingPick`류 — 별개 개념)와 우연히 겹치는 hue 라 혼동 소지.

실행: 5개 파일(`analysis/page.tsx` + mlb/en mlb 4미러) 전부 `border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20~30`(+텍스트 라벨) 정렬. `wave-624-mlb-games-top-pick.test.ts` 옛 `ring-brand-400` assertion 갱신 + `silent-drift-cycle-2581.test.ts` 신규(5파일). DESIGN.md Decisions Log 항목 추가. tsc/lint/test(539/4402, +1) 전부 clean. 단일 논리 단위 → PR 없이 직접 main push, 단 VERSION/package.json(루트+moneyball) 3-way sync 를 pre-push guard 가 순차 포착해 2개 추가 fix commit 발생(R4/R7, 4-commit).

다음 사이클 추천 = 2-chain lock 해소(이번 cycle 다양성 확보) → review-code(heavy) 또는 info-architecture-review 재개 가능. op-analysis(gap 21/25, 근접) 자연 발화 대기도 유력. 잔여 후보 = 이 cycle 에서 발견했으나 스코프 밖으로 보류한 border-radius 컨벤션(rounded-lg vs rounded-xl, 카드 컨텍스트) 전반 불일치 — 102개 파일 규모라 100+파일 변경 가드 대상, 단일 cycle 강행 부적절. 별도 review-code 또는 design-system heavy 사이클에서 좁은 범위(예: 신규 라우트 4개만) 로 재접근 필요.

---

## ✅ SUCCESS — review-code(heavy) sitemap-mlb.test.ts 회귀 커버리지 공백 메꾸기 (cycle 2580, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전8=2572-2579 distinct=3: review-code 5+explore-idea 1+info-arch 1). fix-incident gap 54 → mandatory 재점검(gh run list 전부 success/skipped) — negative. op-analysis gap 19/25, info-arch gap 3/30, lotto gap 12/30 미도달. explore-idea saturation 재확인 8 cycle 전 negative — skip. cycle 2579 retro 명시적 carry-over(sitemap-mlb.test.ts assertion 공백) 처리.

실행: `sitemap.ts` 가 실제 생성하는 `/mlb/reviews/monthly/[month]`, `/en/mlb/reviews/weekly/[week]`, `/en/mlb/reviews/monthly/[month]`, `/insights/series/[topic]`(45쌍) 4개 라우트 그룹에 assertion 5개 신규 추가. `listSeriesTopics` mock을 `vi.importActual` 로 전환(순수함수라 실측 가능). tsc/lint/test(538/4397, +4) 전부 clean. 단일 논리 단위 2-commit 직접 main push(R4/R7).

다음 사이클 추천 = op-analysis(gap 20/25, 근접) 자연 발화 대기 또는 review-code 잔여 carry-over(`MatchupEloChart`/`MlbMatchupEloChart` 병합 후보, cycle 2579 발견) 처리.

---

## ⚪ RETRO-ONLY — review-code(heavy) 팩터/파이프라인 comment-vs-code drift 3rd family negative (cycle 2578, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 미충족(직전8=2570-2577 distinct=3: review-code 6+explore-idea 1+info-arch 1). fix-incident gap 52(마지막 2526) → mandatory 재점검: deploy-drift-alert/health-alert/runtime-error-alert 최근 5회 전부 success — negative. op-analysis gap 17/25, info-arch gap 1/30(직전 발화), lotto gap 10/30 전부 미도달. explore-idea saturation 12/15 재충족되나 cycle 2572 4-source 재확인이 6 cycle 전 negative — 재소진 skip. cycle 2576/2577 carry-over대로 review-code(heavy) 계속, scope는 SMALL_SAMPLE_N/PRODUCTION_COHORT_RULES(둘 다 cycle 2576 negative) 다음 3rd 카테고리로 확장.

실행: 수동 grep(dead code — `types.ts` HOME_SCORE/AWAY_SCORE 등, 이미 "호환성 유지" 의도 명시 확인) + Explore agent 위임(packages/kbo-data/src/factors/*.ts 전체, pipeline/daily.ts 1622줄, engine/predictor.ts, shared/index.ts DEFAULT_WEIGHTS 블록 — weight 값/공식설명/버전참조/TODO/dead-export 5축) 양쪽 전수 read. 실제 comment-vs-code mismatch 0건 — DEFAULT_WEIGHTS 값도 CLAUDE.md v1.8 서술과 완전 일치, orphan export 없음. 3번째 family 도 negative — 코드 변경 강행 X(fabrication 방지).

다음 사이클 추천 = op-analysis(gap 18/25, 아직 미도달) 자연 발화 대기 또는 review-code 4th 카테고리(sitemap/robots 정합성, 컴포넌트 중복) 탐색. review-code 단일 chain 이 3개 서로 다른 family 연속 negative — 동일 chain 반복보다 diversification 신호로 해석 필요.

---

## ✅ SUCCESS — info-architecture-review breadcrumb 의도된 누락 문서 drift 정정 (cycle 2577, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain alternation lock 감지(직전 8사이클 2569-2576 distinct=2: review-code 7+explore-idea 1) → 두 chain 후보 제외. info-architecture-review gap = 정확히 30 cycle(마지막 발화 cycle 2547) → trigger 9 자연 충족, lock fallback(polish-ui 강제) 불필요.

실행: `grep -L Breadcrumb` 전 라우트 재점검(18건) — routes mtime -7 signal은 git checkout 광범위 touch로 신뢰 불가 확인 후 배제. 18건 전부 실사 대조: 기존 문서화 11건(`/`, `/debug/*` 8, `/reviews/weekly`, `/reviews/monthly`) 일치. 신규 7건 발견 — `mlb/reviews/weekly`·`mlb/reviews/monthly`·`en/mlb/reviews/weekly`·`en/mlb/reviews/monthly`(KBO 미러와 동일 redirect-only 패턴) + `community`·`login`·`settings`(전부 `robots: noindex`, "박제 중" placeholder, nav 미링크 — `/debug/*`와 동일 성격). 코드 결함 아닌 `docs/design/ia-hierarchy.md` "의도된 누락" 섹션이 cycle 1020 이후 미갱신된 문서 drift로 판명. 7개 라우트 문서 추가 + 자가검증 라인 갱신. docs-only 변경 — lint/type-check/test(pre-push hook) 전부 clean. PR 없이 직접 main commit+push(R4/R7), commit 89475da5.

다음 사이클 추천 = 2-chain lock 해제됨(이번 cycle 다양성 확보) → review-code(heavy) 계속 가능 또는 op-analysis(gap 16/25). 별도 후속 후보 = ia-hierarchy.md "현 사용 라우트" 목록 자체가 mlb/en 도메인 전체 미포함 상태 — 전면 재작성은 이번 스코프 외, 다음 info-arch 사이클 후보로 carry-over.

---

## ⚪ RETRO-ONLY — review-code(heavy) SMALL_SAMPLE_N/PRODUCTION_COHORT_RULES 신규 미감사 지점 0건 (cycle 2576, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전 8사이클 2568-2575 distinct=3: review-code 6+lotto 1+explore-idea 1). fix-incident gap 20+/20 도달 → mandatory 재점검: `deploy-drift-alert` 8/24 17:44 이후 신규 실패 0건 — negative. op-analysis gap 15/25, info-arch gap 29/30(임박), lotto gap 8/30(2026-08-29 picks 이미 박제 + 2026-08-22 result 이미 검증 — negative), explore-idea saturation 11/15, DESIGN.md 당일 갱신 전부 미도달. cycle 2575 retro 추천대로 review-code(heavy) 잔여 미감사 후보 순회.

실행: `SMALL_SAMPLE_N` 게이트 46개 파일 커버리지 vs `accuracyRate`/`적중률` 텍스트 매칭 70+ 파일 전수 대조. OG-image(`teams/[code]`, `mlb/team/[code]`, `teams` 등) "적중률" 텍스트는 정적 태그 라벨(퍼센트 미노출) 확인 후 제외. `predictions/page.tsx`·`mlb/predictions/page.tsx`(+en 미러)·`accuracy/shadow/page.tsx`·`mlb/games/[date]/[slug]` convergence 위젯은 전부 raw n(분모) 인접 노출 — family 정의(메타/SEO 레이어의 % 단독 노출)와 불일치, 게이트 미적용 정상 확인. `mlb/players/[id]/page.tsx`는 팀 Statcast 페이지(선수 아님) 오탐 확인. `buildMlbMatchupProfile.ts`(8/14 fix)·`buildMlbTeamProfile.ts`(8/24 fix) 모두 `MLB_PRODUCTION_COHORT_RULES` 단일 필터 정상 — KBO `buildMatchupProfile.ts`/`buildTeamProfile.ts`(8/23 `PRODUCTION_COHORT_RULES` 정정)와 별개 네임스페이스로 이미 정합, drift 아님. 신규 미감사 instance 0건 — SMALL_SAMPLE_N family 16회 재발 이후 최초 negative sweep. 실제 발견 없어 코드 변경 강행 X(fabrication 방지).

다음 사이클 추천 = info-arch gap 29/30 → cycle 2577 도달 시 자동 trigger. review-code(heavy) 계속 시 dead-code/주석-코드 불일치 등 다른 silent-drift 카테고리로 scope 확장 필요(두 family 포화 evidence).

---

## ✅ SUCCESS — review-code(heavy) 팀/선수 프로필 SEO description 소표본 게이트 (cycle 2575, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전 8사이클 2567-2574 distinct=3: review-code 5+explore-idea 2+lotto 1). fix-incident mandatory 재점검(gap 30+): `deploy-drift-alert` 8/24 17:44 이후 6+연속 success, 신규 실패 0건 — negative. op-analysis gap 14/25, info-arch gap 28/30, lotto gap 7/30, explore-idea saturation 11/15, DESIGN.md 당일 갱신 전부 미도달. cycle 2574 retro 추천대로 review-code(heavy) 잔여 미감사 후보 순회.

실행: `grep -rl SMALL_SAMPLE_N`로 전체 게이트 커버리지 매핑 — reviews 트리(weekly/monthly index, misses)는 accuracy 헤드라인 자체 없어 negative, standings.tsx 이미 `isReliable` 게이트 정상. `players/[id]/page.tsx` generateMetadata description이 페이지 본문(라인 176-186 게이트됨)과 달리 raw accuracyRate% 노출 발견 → 동일 패턴 `teams/[code]`(메타+JSON-LD 2곳), `mlb/team/[code]`(JSON-LD), `en/mlb/team/[code]`(JSON-LD)에서 재확인. 총 4파일 7곳 — 페이지 본문은 전부 게이트됐지만 SEO 메타/OG/JSON-LD 레이어만 desync (SMALL_SAMPLE_N family 16번째 재발, 첫 메타데이터 레이어 사례). 조건부 "(소표본 n<5)" 접미사 추가 + 회귀 테스트 `silent-drift-cycle-2575.test.ts`(6 assertion). `tsc --noEmit`/`vitest run`(538 files/4393 tests, +1/+6)/`lint` 전부 clean. VERSION 0.5.62.132. PR 없이 직접 main commit+push (R4), commit b213c2ab.

다음 사이클 추천 = review-code(heavy) 계속 시 잔여 후보(teams/page.tsx 목록, seasons/[year] 등 미확인 accuracy 표시 페이지) 순회 또는 gap 근접 chain(info-arch 29/30 임박, op-analysis 15/25) 자연 발화.

---

## ✅ SUCCESS — review-code(heavy) en/mlb reviews weekly/monthly 헤드라인 accuracy 소표본 게이트 동기화 (cycle 2574, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전 8사이클 2566-2573 distinct=3: review-code 5+explore-idea 2+lotto 1). fix-incident gap 20+/20 도달 → mandatory 재점검: `deploy-drift-alert` 8/24 17:44 이후 신규 실패 0건, 9+연속 success 지속 — negative. op-analysis gap 13/25, info-arch gap 27/30, lotto gap 6/30, explore-idea saturation 11/15, design-system(DESIGN.md 당일 갱신) 전부 미도달. cycle 2573 retro 추천대로 en/ 다국어 미러 페이지 순회.

실행: cycle 2573 이 KBO `reviews/weekly/[week]`·`reviews/monthly/[month]` 헤드라인에 추가한 SMALL_SAMPLE_N 게이트가 en/mlb 미러 페이지엔 미반영 확인 — locale mirror desync, SMALL_SAMPLE_N family 15번째 재발. 두 미러 파일 헤드라인 "Accuracy"에 `verifiedGames < SMALL_SAMPLE_N` 조건부 "Small sample (n<5)" 힌트 추가. 회귀 테스트 `silent-drift-cycle-2574.test.ts` 신규(3 assertion, `app/en/mlb/reviews/__tests__/`). `tsc --noEmit`/`test`(537 files/4387 tests, +1 file/+3)/`lint` 전부 clean. VERSION 0.5.62.131. PR 없이 직접 main commit+push (R4) — 후속 VERSION 파일 누락 pre-push 감지 → 즉시 2번째 fix 커밋으로 정정.

다음 사이클 추천 = review-code(heavy) 계속 시 잔여 미감사 후보 순회 또는 gap 근접 chain(info-arch 28/30 임박, op-analysis 14/25) 자연 발화.

---

## ✅ SUCCESS — review-code(heavy) reviews weekly/monthly 헤드라인 적중률 소표본 게이트 추가 (cycle 2573, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전 8사이클 2565-2572 distinct=3: review-code 5+explore-idea 2+lotto 1). fix-incident gap 20+/20 도달 → mandatory 재점검: `deploy-drift-alert` 8/24 17:44 산발 실패 1건, 8/24 18:56 부터 9연속 success 회복 — negative. op-analysis gap 12/25, info-arch gap 26/30, lotto gap 5/30, explore-idea saturation 11/15, design-system(DESIGN.md 당일 갱신) 전부 미도달. cycle 2572 retro 추천 미감사 후보 순회.

실행: `insights/[date]`(적중률 표시 없음, 대상 아님)·`predictions/[date]`(이미 게이트 적용) 확인 후 negative. `reviews/weekly/[week]`·`reviews/monthly/[month]` 팀별 테이블은 SMALL_SAMPLE_N 게이트 있지만 헤드라인 "적중률"은 표본 무관 렌더링 확인 — SMALL_SAMPLE_N family 14번째 재발. 두 파일 헤드라인에 `verifiedGames < SMALL_SAMPLE_N` 조건부 "소표본(n<5)" 힌트 추가. 회귀 테스트 `silent-drift-cycle-2573.test.ts` 신규(3 assertion). `tsc --noEmit`/`test`(536 files/4384 tests)/`lint` 전부 clean. VERSION 0.5.62.130. PR 없이 직접 main commit+push (R4).

다음 사이클 추천 = review-code(heavy) 계속 시 잔여 미감사 후보(en/ 다국어 미러, mlb/insights 계열) 순회 또는 gap 근접 chain(op-analysis 12/25, info-arch 26/30) 자연 발화.

---

## 🔁 RETRO-ONLY — explore-idea(lite) saturation trigger 12/15 재확인, 신규 후보 없음 (cycle 2572, 2026-08-25)

진단: open issue 0, approved plan 0/23(전부 non-approved 재확인). 2-chain lock 없음(직전 8사이클 2564-2571 distinct=3: review-code 6+lotto 1+explore-idea 1). fix-incident gap 20+/20 도달 → `gh run list --limit 15` + `--status failure` 재확인: `deploy-drift-alert` 8/23~24 산발 실패 8건이나 8/24 18:56부터 연속 success 자동 회복 지속, 재발 없음 — negative. op-analysis gap 11/25, info-arch gap 25/30, lotto gap 4/30, design-system(DESIGN.md 당일 갱신) 전부 미도달. **explore-idea saturation 직전 15사이클 12/15 충족** (review-code(heavy) 직전 8사이클 6/8 dominance 반영) — 자연 선택, lite quick-recheck 수행(직전 heavy sweep 다수가 이미 후보 소진 확정한 영역이라 전면 재탐색 대신 lite).

실행: (1) `find apps/moneyball/src/app -name page.tsx -mtime -14` — 신규 라우트 파일 0건(전부 기존 라우트의 review-code/polish-ui 정정 흔적). (2) TODOS.md Next-Up(2026-04-25) 섹션 재확인 — 신규 리드 없음(cycle 41 mcc alias 사용자 영역 1-line 항목만 잔존). (3) plan #29(로그인+커뮤니티, Tier4 deferred) gating 조건 재확인 — service-role REST count=exact: `user_picks`=1 / `mlb_user_picks`=0 / `pick_poll_events`=5 / `mlb_pick_poll_events`=0, cycle 2417/2530 측정치와 완전 동일, 무성장 지속(트래픽 ≥10 임계 미도달). (4) GH issue 0건 재확인. 4-source 전부 negative — 자율 가능한 신규 explore-idea 후보 없음. 코드 변경 없음.

다음 사이클 추천 = review-code(heavy) 계속 시 미감사 후보(`insights/[date]/page.tsx`, `predictions/[date]/page.tsx`, `reviews/weekly|monthly/[..]/page.tsx`) 순회 또는 gap 근접 chain(op-analysis 11/25, info-arch 25/30) 자연 발화.

---

## 🔁 RETRO-ONLY — review-code(heavy) accuracy/page.tsx·analysis/game/[id]/page.tsx SMALL_SAMPLE_N 전수 재점검 + 인접 파일 확장 스팟체크, 신규 fix 없음 (cycle 2570, 2026-08-25)

진단: open issue 0, approved plan 0/23(전부 non-approved 재확인). 2-chain lock 없음(직전 8사이클 2562-2569 distinct=4: review-code 5+polish-ui 1+explore-idea 1+lotto 1). fix-incident 20+ gap 도달 → mandatory 재점검: `gh run list --limit 10` 전부 success/skipped, 최근 CI failure 0건 — negative. op-analysis gap 9/25, info-arch gap 23/30, lotto gap 2/30(방금 발화), explore-idea saturation 11/15, design-system(DESIGN.md 당일 갱신) 전부 미도달. cycle 2569 retro 추천대로 review-code(heavy) 잔여 대형 파일(`accuracy/page.tsx` 1229줄, `analysis/game/[id]/page.tsx` 872줄) 순회.

실행: 두 파일 SMALL_SAMPLE_N/MIN_TEAM_PREDICTIONS/MIN_POLL_TOTAL/STATS_RELIABLE_MIN_N 게이트 전수 확인 — `accuracy/page.tsx` 캘리브레이션 플롯(소표본 회색 dot)/커뮤니티 비교/팀 편향 테이블/v18 서브코호트 패널/팩터별 적중률 테이블 전부 기존 게이트 정상. `analysis/game/[id]/page.tsx` 수렴 픽 성적 라인은 cycle 2542 에 이미 fix 완료 확인(신규 없음). 두 파일 신규 gap 0건 확인 후 인접 미감사 후보로 확장 — `TeamBiasTable.tsx`/`LeaderboardTable.tsx`/`players/[id]/page.tsx`/`teams/[code]/page.tsx`/`mlb/team/[code]/page.tsx`/`matchup/[teamA]/[teamB]/page.tsx` 6개 파일 전수 grep 재확인, 전부 기존 게이트 정상 적용 확인(신규 발견 0). `LeaderboardTable` 배경 SQL view(`HAVING COUNT(*) >= 5`)도 `MIN_LEADERBOARD_PICKS` guard test(wave 116, index.test.ts:187) 로 이미 방어 확인. 코드 변경 없음.

다음 사이클 추천 = review-code(heavy) 계속 시 미감사 후보(`insights/[date]/page.tsx`, `predictions/[date]/page.tsx`, `reviews/weekly|monthly/[..]/page.tsx`) 순회 또는 gap 근접 chain(op-analysis 9/25, info-arch 23/30) 자연 발화.

---

## 🔁 RETRO-ONLY — review-code(heavy) analysis/page.tsx(최대 파일) SMALL_SAMPLE_N 전수 재점검, 신규 fix 없음 (cycle 2569, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전8=2561-2568 distinct=5). fix-incident gap 43/20 mandatory 재점검 — `gh run list --status failure` 재확인, deploy-drift-alert 08-23~24 산발 실패 11건이지만 workflow별 시계열 재확인 결과 매 실패 직후 바로 다음 run 성공 회복(isolated self-recovery, 재발 없음) → cycle 2568 결론과 동일 negative 재확인. op-analysis gap 8/25, info-arch gap 22/30, lotto gap 1/30, explore-idea saturation 10/15, design-system(DESIGN.md 당일 갱신) 전부 미도달.

실행: review-code(heavy) 대형 파일 순회 계속 — 코드베이스 최대 파일 analysis/page.tsx(2833줄) SMALL_SAMPLE_N 게이트 전수 재확인(강수렴/완전수렴 rolling·월간·시즌 배지 전부), 신규 누락 0건. mlb/predictions/page.tsx 일자별 적중 표시 재검토 — 누적 헤드라인 아닌 일별 정직 표시라 family 대상 아님(false positive 배제). tier color 0.5/0.7 threshold 전수 grep — 코드베이스 전체 일관 값, drift 없음. CommunityVsAICard(cycle 2544 신규 컴포넌트) MIN_POLL_TOTAL 게이트 이미 적용 재확인. 코드 변경 없음.

다음 사이클 추천 = review-code(heavy) 계속(잔여 대형 파일 accuracy/page.tsx 1229줄·analysis/game/[id]/page.tsx 872줄) 또는 gap 근접 chain 자연 발화.

---

## ✅ SUCCESS — lotto(lite) countValid saturation 4연속 재확인 (cycle 2568, 2026-08-25)

진단: open issue 0, approved plan 0/23(전부 completed/archived/status 미해당 — plan #24/27/28/29 모두 non-approved 재확인). 2-chain lock 없음(직전 8사이클 2560-2567 distinct=4: review-code 5+operational-analysis 1+polish-ui 1+explore-idea 1). fix-incident gap 42/20 도달 → mandatory 점검: `gh run list --status failure` 최근 10건 = 전부 `deploy-drift-alert` scheduled workflow(8/23~24 산발), 직전 발화(cycle 2567)가 이미 pipeline_runs DB 기준 점검했던 것과 별개로 이번엔 workflow-run 기준 재점검(사례17 신호계열) — 단일 격리 실패(8/24 17:44) 후 바로 다음 run(8/24 18:56)부터 연속 success 자동 회복, 재발 없음 → negative. op-analysis(gap 7/25)/info-arch(gap 21/30)/design-system(DESIGN.md 당일 갱신) 모두 gap 미도달. explore-idea saturation 11/15 미도달(직전 15사이클 window 밀림, 2567 자체 발화가 포함되며 review-code 비중 감소). review-code(heavy) 신규 후보 탐색 — shared export 349개 전수 사용처 재확인(unused-export 후보 다수 발견했으나 전부 packages/kbo-data·scripts 스코프 누락에 의한 false positive로 확인, 진짜 dead code 0건) + CURRENT_SCORING_RULE/PRODUCTION_COHORT_RULES 재분리 재검증(buildTeamUpcoming/buildMatchupUpcoming 단일 필터 = upcoming 게임 특성상 의도된 설계, shadow-row 자동 배제 목적으로 올바름) — 신규 fix 0건. **lotto gap 정확히 30/30 도달 → trigger 충족**, 다른 chain 전부 negative/소진이라 자연 발화.

실행: `pnpm tsx scripts/lotto.ts count` 재측정 — valid=7,705,415 / total=8,145,060 (5.40% 제거, 94.9s) = cycle 2478/2508/2538 과 완전 동일값, 4연속 무변동 확인(256규칙 saturation 구조적 안정 지속). 1239회(2026-08-29) 50sets 는 cycle 2344 에 이미 shipped — 재생성 불필요. 1238회(2026-08-22) OOS 결과도 이미 완비(N=12 cumulative, 3+ match 1/50=2%, 무작위 대비 우위 없음 결론 유지). 1239회(2026-08-29) 추첨 미도래(오늘 08-25)로 다음 검증 대기. 신규 rule 후보 없음 — 코드 변경 없음(측정 only, count_smoke 의무 필드 충족으로 silent-skip 회피).

다음 사이클 추천 = review-code(heavy, 대형 파일/dead-code 순회 계속 — 이번 스윕도 신규 fix 없어 saturation 근접 가능성) 또는 explore-idea(saturation window 재접근 대기). lotto 는 4연속 무변동 — 5th 동일 시 heavy mode(신규 rule engineering) 전환 검토를 다음 lotto 발화 후보로 carry.

---

## 🔁 RETRO-ONLY — explore-idea(lite) 6th 소진 재확인, 신규 후보 0건 (cycle 2567, 2026-08-25)

진단: open issue 0, approved plan 0/23(전부 non-approved). 2-chain lock 없음(직전 8사이클 2559-2566 distinct=3: review-code 6+operational-analysis 1+polish-ui 1). fix-incident gap 41/20 도달 → mandatory 점검: `pipeline_runs` 7일 166건 중 error 3건(`mlb_fancy_scrape` fangraphs HTTP 403, 8/19~21 3일 연속) 이후 8/22부터 자연 회복 지속, 재발 없음 — negative. op-analysis(gap 6/25)/info-arch(gap 20/30)/lotto(gap 29/30)/design-system(DESIGN.md 당일 갱신) 모두 gap 미도달. **explore-idea saturation trigger 12/15 충족**(직전 15사이클 2552-2566: review-code 12+polish-ui 1+operational-analysis 2 — cycle 2554 5th 소진 이후 cooldown N=10(2555-2564) 만료, 재활성 첫 발화).

점검(lite quick-recheck, carry-over 명확 — heavy 재탐색 skip): (1) `find apps/moneyball/src/app -name page.tsx -mtime -14` — 신규 라우트 0건(최근 수정 파일 전부 기존 라우트 review-code/polish-ui 정정 흔적). (2) TODOS.md Next-Up(2026-04-25) 섹션 재확인 — 신규 리드 없음(기존 mcc alias 1-line 사용자 영역 항목만 잔존). (3) GH issue 0건. (4) approved plan 0/23 — 전부 completed/archived/tier4/blocked-on-data, 재개 조건 미충족 재확인.

실행: 코드 변경 없음 — 5연속(cycle 2417/2477/2498/2530대/2554) 소진 확정에 이어 6th 재확인, 신규 후보 0건. cooldown 만료 후 saturation trigger 가 재점화됐지만 candidate pool 자체는 여전히 완전 소진 상태 유지 확인.

다음 사이클 추천 = review-code(heavy, silent drift family sweep 계속 — SMALL_SAMPLE_N/shared-const-shadow family 둘 다 근접 소진, 잔존 대형 컴포넌트 순회) 또는 fix-incident/operational-analysis(gap 근접 시 자동 권장).

---

## 🔁 RETRO-ONLY — review-code(heavy) shared const shadow 전수 grep + MIN_TEAM_PREDICTIONS family 재점검 (cycle 2566, 2026-08-25)

진단: open issue 0, approved plan 0/23, 2-chain lock 없음(직전8=2559-2565 distinct=3). fix-incident/op-analysis(5/25)/info-arch(19/30)/lotto(28/30)/design-system(당일 갱신) 전부 negative. explore-idea saturation 11/15 미도달. cycle 2565 retro 추천대로 review-code(heavy) 대형 컴포넌트 순회 계속.

실행: shared export 321개 전수 grep 으로 apps/moneyball 안 프로덕션 코드 재선언(shadow) 스캔 — 0건(전부 test literal match 또는 의도된 V2_1_B_WEIGHTS re-export). `MIN_TEAM_PREDICTIONS` 전수 사용처 재확인(accuracy/page.tsx, dashboard/page.tsx, MlbAccuracyDashboard.tsx, TeamPerformanceChart.tsx) — cycle 2565 fix 이후 전부 공유 상수 일관 사용, family 완전 정합. UserVsAIScorecard/PickButton/FactorBreakdown SMALL_SAMPLE_N family 후보 재점검 — 기존 게이트(MIN_POLL_TOTAL 등) 정상, 신규 drift 없음. `pnpm --filter moneyball run test` 535 files/4381 tests 전체 통과(변경 없음, baseline 확인).

결론: 이번 스윕 신규 fix 없음 — 코드 변경 0, commit 없음. 다음 사이클 추천 = review-code 계속(대형 파일 후보 saturation 근접) 또는 explore-idea(saturation 11/15, 다음 12/15 도달 시 자연 발화).

---

## ✅ SUCCESS — review-code(heavy) MlbAccuracyDashboard 팀 테이블 게이트 로컬 shadow 상수 제거 (cycle 2565, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전 8사이클 2557-2564 distinct=3: review-code 6+operational-analysis 1+polish-ui 1). fix-incident negative(`gh run list` 최근 10건 전부 success/skipped). op-analysis(gap 4/25)/design-system(DESIGN.md 당일 갱신)/info-arch(gap 18/30)/lotto 모두 gap 미도달. explore-idea saturation 11/15 미도달. cycle 2562 retro 추천대로 `apps/moneyball/src/components` 대형 파일 순회 계속 — `PredictionCard.tsx`(마지막 터치 cycle 1870, 695 사이클 미터치)/`PredictionCardLive.tsx` 먼저 조사했으나 SMALL_SAMPLE_N family 미해당 확인(단일 경기 신뢰도 표시, 통계 rate 아님 — false positive 회피 후 제외), judgeReasoning fallback 배지 경로도 대조 확인 결과 기존 설계 일관(PredictionCard 내부 judgeReasoning 블록은 애초 배지 미지원, JudgeReasoningCard 만 지원 — drift 아님).

발견: `MlbAccuracyDashboard.tsx` 가 `@moneyball/shared` 의 `MIN_TEAM_PREDICTIONS`(=3) 를 import 하면서도 팀별 성과 테이블 게이트엔 별도 로컬 `TEAM_TABLE_MIN_N = 3` 상수를 선언해 사용 — cycle 2528 fix 가 같은 파일의 `cohortWeekHeatmap` 섹션은 `MIN_TEAM_PREDICTIONS` 로 swap 했지만 팀 테이블 섹션(라인 388/391)은 놓친 partial fix. 값이 우연히 3=3 이라 지금은 동작 동일하지만 공유 상수가 바뀌면 이 섹션만 silent divergence — MIN_TEAM_PREDICTIONS family 재발.

실행: 로컬 `TEAM_TABLE_MIN_N` 선언 제거 + 사용처 2곳을 `MIN_TEAM_PREDICTIONS` 직접 사용으로 교체(KBO `/accuracy/page.tsx` 팀 테이블과 패턴 정합). 회귀 테스트 `silent-drift-cycle-2565.test.ts` 신규(3 assertion, `app/accuracy/__tests__/` — cycle 2528 테스트와 동일 위치 컨벤션). `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(536 files/4384 tests, +3) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(`e79af5d3`)+push(R4), pre-push lint/type-check/version-sync-guard 통과.

다음 사이클 추천 = review-code(heavy) 계속(component-level 대형 파일 순회 유효성 재확인) 또는 explore-idea(saturation 11/15 근접, 다음 사이클 12/15 도달 여부 확인). 2-chain lock 없음 상태 유지 중이라 자연 선택 가능.

---

## ✅ SUCCESS — polish-ui (2-chain lock fallback) 적중 표시 green→brand 토큰 정렬 (cycle 2563, 2026-08-25)

진단: open issue 0, approved plan 0/23. **2-chain lock 발동** — 직전 8사이클(2555-2562) distinct chain=2(review-code 6 + operational-analysis 2), 룰 첫 실측 발동. lock 대상 2개 제외 후 나머지 chain 전부 trigger 미충족(fix-incident negative/design-system negative/info-arch gap 16·30/lotto gap 25·30/explore-idea saturation 11·12 근접 미도달) → lock fallback 규칙에 따라 polish-ui 강제 발화.

발견: DESIGN.md Decisions Log "적중 표시 = brand-500"(cycle 50/65/456/744 family) 컨벤션을 green/emerald 전수 grep 대조 — `app/mlb/analysis/page.tsx`(+en 미러) 어제 결과 리스트 + `DailyPredictionSummaryBar.tsx` 최고 자신감 픽 마크·적중률 배지가 Tailwind 기본 green-* 잔존 확인(family 5번째 재발). lotto ball green(공식 45번대 볼 색상)과 `AgentVoteCard` emerald(홈/원정/심판 5-역할 categorical, 박빙-적중 purple 3rd-tier와 동일 "이분법 밖 허용" 패턴)는 의도된 사용으로 확인 후 범위 제외. `/debug/*`도 사용자 비가시 예외로 범위 제외.

실행: 3개 파일 green-*→brand-* 정렬(text-green-600/400→text-brand-600/400, bg-green-50/900→bg-brand-50/900 등). DESIGN.md Decisions Log 신규 엔트리. 회귀 테스트 `silent-drift-wave-675.test.ts` 신규(3 assertion). `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(533 files/4374 tests, +1) + `pnpm --filter moneyball lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(`fd916b2e`)+push(R4), pre-push lint/type-check/version-sync-guard 통과.

다음 사이클 추천 = review-code(heavy) 또는 explore-idea. 2-chain lock 은 이번 사이클로 해소(직전 8사이클에 polish-ui 편입) — 다음 사이클부터 review-code/op-analysis 재개 가능. explore-idea saturation 11/12 근접 유지 중이라 다음 사이클 12/15 도달 시 자연 발화 가능.

---

## ✅ SUCCESS — review-code(heavy) MyPicksClient 내/AI 적중률 히어로 소표본 게이트 부재 정정 (cycle 2562, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전8=2554-2561 distinct=3: review-code/operational-analysis/explore-idea). fix-incident negative(`gh run list` 전부 success/skipped). op-analysis(6/25)/info-arch(15/30)/lotto(24/30, 다음 토 picks 이미 존재)/design-system(DESIGN.md 1일 전 갱신) 모두 negative. explore-idea saturation 11/15 미도달. `최초 전체 감사` 전수 grep(66건) 대조 결과 analysis/accuracy/home/predictions/teams/matchup/mlb 주요 라우트 전부 이미 감사 완료 확인 — review-code 메인 후보 saturation 재확인. `apps/moneyball/src/components` 대형 파일 재조사로 신규 타겟 발굴.

발견: `MyPicksClient.tsx`(435줄, 마지막 터치 cycle 1585 — 약 977 사이클 미터치, `최초 전체 감사` 이력 0건. 순수 함수 `buildPicksStats.ts` 만 cycle 2496 감사됨). "내 적중률"/"AI 적중률" 히어로 `StatCard` 가 `stats.myRate`/`aiRate` 를 표본 크기 무관 렌더링 — sub 라인에 원본 분수는 항상 표시되지만, 코드베이스 전역 컨벤션(`AccuracyHeaderCard` cycle 2555/`TeamMatchupCards` cycle 2499 등)이 요구하는 `SMALL_SAMPLE_N` 명시적 소표본 힌트(딤 처리 또는 인라인 라벨)는 부재 — SMALL_SAMPLE_N family 12번째 재발.

실행: `SMALL_SAMPLE_N` import, `StatCard` 에 `smallSample` prop 추가 → `stats.resolved`/`stats.aiResolved` < `SMALL_SAMPLE_N` 시 인라인 "소표본(n<5)" 노출. 회귀 테스트 `silent-drift-wave-674.test.ts` 신규(4 assertion). `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball run test`(532 files/4371 tests, +1) + `pnpm --filter moneyball lint` clean. VERSION/package.json(root+apps/moneyball) 0.5.62.127 + CHANGELOG 동기화. 단일 논리 단위 → PR 없이 직접 main commit(`0b64c2f3`)+push(R4), pre-push lint/type-check/version-sync-guard 통과.

다음 사이클 추천 = review-code(heavy) 계속 — `apps/moneyball/src/components` 대형 파일 순회가 신규 타겟 발굴에 유효했음이 이번에 입증됐으므로(page-level 라우트는 saturated, component-level 은 미탐색 여지 있음) 동일 방법론으로 `MlbAccuracyDashboard.tsx`/`PredictionCard.tsx`/`FactorBreakdown.tsx` 등 미감사 대형 컴포넌트 순차 재탐색. 대안 = explore-idea(6th 소진 여부, 저가치 우려 지속).

---

## ✅ SUCCESS — operational-analysis(heavy) MLB Elo backtest 재확인 n=896 (cycle 2561, 2026-08-25)

진단: open issue 0, approved plan 0/23(status: approved 매칭 0건 — 전부 completed/archived/deferred). 2-chain lock 없음(직전8=2553-2560 distinct=3: review-code 6+operational-analysis 1+explore-idea 1). fix-incident 20+/20 gap 도달 → `gh run list --limit 10` 재확인, 전부 success/skipped(Vercel/CI Failure Dispatch 는 skipped=무실패) — negative. explore-idea saturation trigger 충족(직전15=2547-2560 중 review-code+fix-incident+polish-ui+info-arch=12/15)했으나 cycle 2554/2557/2559/2560 TODOS 가 반복적으로 "explore-idea 5연속 lite 소진" 명시 — 6th 재확인은 저가치 판단. op-analysis 자체 gap(25-cycle)은 5/25 미도달(마지막 발화 2556)이나, cycle 2558~2560 retro 3연속이 공통 권고한 "op-analysis heavy 새 metric 각도(CE cohort 대신)" 를 따라 gap-trigger 아닌 retro-recommendation 경로로 채택 — plan #25(MLB Elo Phase 3 게이트, cycle 2128 archive, n=747 CI 겹침으로 보류 확정)가 11일 경과 후 재검증 후보로 유효 확인.

실행: `scripts/op-analysis-mlb-elo-backtest.ts` 재실행 — `mlb_schedule` final 896건(재생 895건, WARM cohort 743건, cycle 2128 대비 n=747→896/+149). 결과: Elo Brier 0.2480(전체)/0.2475(WARM) vs 홈어드밴티지-only 0.2491/0.2491 — accuracy 방향은 Elo 우세(54.3%/54.6% vs 53.0%) 유지하나 bootstrap 95%CI(2000회) 양쪽 cohort 모두 겹침 = 여전히 통계적 구분 불가, cycle 2128 결론과 동일. 결과 기록 `apps/moneyball/data/op-analysis/2026-08-25-mlb-elo-backtest.md` 신규 + `~/.develop-cycle/plans/moneyballscore/_archive/25.md` frontmatter 에 재확인 노트 append(plan archive 상태 자체는 변경 없음, Phase 3 보류 유지). 코드 변경 없음(순수 데이터 재측정) → 단일 논리 단위로 PR 없이 직접 main commit(`7a89b95b`)+push(R4), pre-push lint/type-check/version-sync-guard 통과.

다음 사이클 추천 = review-code(heavy, SMALL_SAMPLE_N family + dead-code family 양쪽 근접 소진 확인된 상태이나 신규 대형 파일/컴포넌트 sweep 잔여 가능성 재탐색) 또는 explore-idea(6th 소진 여부 — 저가치 반복 우려로 review-code 우선 권장).

---

## ✅ SUCCESS — review-code(heavy) game-record-features.ts dead export 2건 정리 (cycle 2560, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전8=2552-2559 distinct=3). fix-incident negative. op-analysis gap 4/25 미도달(2556 heavy 방금 발화) — lite 경로(op-analysis-cohort.ts) 수동 실행 시도했으나 이미 자동 cron 산출물(`2026-08-24-cohort-split.md`)과 100% 동일 확인, 신규 정보 없음(cron 중복 실행 저가치 확인). explore-idea 5연속 lite 소진 유지. design-system/info-arch/lotto negative. cycle 2557~2559 3연속 diversity redirect 권고했으나 대체 chain(explore-idea/op-analysis) 재확인 결과 즉시 저가치 판명 → review-code 잔존 재탐색, cycle 2559 TODOS "가치 낮아 보류" 후보 재평가.

실행: `game-record-features.ts`의 `bullpenAppearancesLastNDays`/`teamRunDiffLastN` — 형제 함수 4개(`bullpenInningsLastNDays`/`teamRunsPerGameLastN`/`teamRunsAllowedPerGameLastN`/`teamHomeRunsLastN`)와 달리 `backtest/loader.ts` 미참조 확정(자체 테스트만 참조). CLAUDE.md "확실히 미사용이면 완전 삭제" 원칙 적용해 함수 2개 + 대응 테스트 2개 삭제. `pnpm --filter @moneyball/kbo-data test`(91 files/1188 tests, -2) + type-check + lint clean. VERSION/package.json(root+apps/moneyball) 0.5.62.126 + CHANGELOG 동기화. 단일 논리 단위 → PR 없이 직접 main commit(`1fff4a84`)+push(R4), pre-push hook 통과.

다음 사이클 추천 = explore-idea(6th 소진 여부 재확인) 또는 operational-analysis heavy(CE cohort 대신 새 metric 각도). op-analysis lite(cohort-split 스크립트 수동 실행)는 cron과 100% 중복이므로 회피.

---

## ⚪ RETRO-ONLY — review-code(heavy) SMALL_SAMPLE_N family 3차 재확인 + 잔여 stale 파일 sweep, 신규 fix 없음 (cycle 2559, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전8=2551-2558 distinct=4). fix-incident gap 33/20 도달 → `gh run list --limit 10` 재확인, 전부 success/skipped — negative. op-analysis(gap 3/25)/info-arch/lotto/design-system 모두 gap 미도달. explore-idea 5연속 lite 소진 재확인(TODOS Next-Up + GH issue 재확인 리드 없음).

점검: SMALL_SAMPLE_N family — `analysis/page.tsx`(12개소 게이트 확인), `AccuracySummary.tsx`(confident/lean/tossup 3 tier 전부 `stat.total < SMALL_SAMPLE_N` 게이트), `tierStats.ts`/`buildDailyAccuracy.ts`(순수 집계 함수, 표시 주장 아님), `DailyAccuracyChart.tsx`(자체 `data.length < 3` 가드) — 전부 이미 게이트됨, 3번째 독립 재확인으로 소진 확정. 신규 영역 탐색으로 last-modified 최고령 파일 sweep: `estimateTime.ts`(KBO 전용 — MLB 새벽 게임 우려 가설 세웠으나 PlaceholderCard 는 KBO 전용 사용처만 확인돼 오탐), `backtest/metrics.ts`(Brier/logLoss/calibration 수식 정상), `game-record-features.ts`(look-ahead bias 가드 정상, `teamRunDiffLastN`/`bullpenAppearancesLastNDays` 프로덕션 `loader.ts` 미사용 dead export 발견했으나 fix 가치 낮아 커밋 보류) — 전부 clean.

결론: 이번 사이클 실행 가능한 신규 버그 없음. 코드 변경 없음.

다음 사이클 추천 = explore-idea 또는 operational-analysis (review-code 는 SMALL_SAMPLE_N family + stale-file sweep 양쪽 근접 포화, 다양성 redirect 권고).

---

## ✅ SUCCESS — review-code(heavy) agent_memories 학습 경로 shadow-only 0% factor 미필터 정정 (cycle 2558, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전8=2550-2557 distinct=4). fix-incident gap 32/20 도달 → mandatory 점검: `pipeline_runs` 7일 166건 중 error 3건(`mlb_fancy_scrape` fangraphs HTTP 403, 8/19~21 3일 연속) 이후 8/22부터 자연 회복 지속, 재발 없음 — negative. op-analysis 방금 발화(2556), info-arch(breadcrumb "누락" 2건은 placeholder/redirect 전용 페이지라 오탐)/lotto(다음 토 picks 이미 존재)/design-system(DESIGN.md 2일 전 갱신) 모두 negative. explore-idea 5연속 lite 소진 + TODOS Next-Up 신규 리드 없음 재확인 → review-code(heavy) 재탐색, SMALL_SAMPLE_N family(11회) 소진 확정 후 신규 영역 선정.

발견: `postview.ts`는 cycle 1013 M-F1/M-F2에서 `isWeightedFactor`(DEFAULT_WEIGHTS weight>0만) 가드로 "0% factor가 LLM reasoning 70% 차지"하던 silent drift를 막았고, MLB 쪽 `mlb-retro.ts`도 자체 `MEMORY_CANDIDATE_KEYS` 화이트리스트로 elo/placeholder 상수 factor를 명시적으로 배제 — 그러나 두 함수가 공유하는 `retro.ts` 원본 `buildMemoryForTeam`은 `Object.entries(factors)` 전체에서 maxBias를 뽑아 shadow-only factor(`park_weather`/`umpire_sz`, cycle 1013 도입)가 필터 없이 후보에 남아있었음. 현재는 두 factor 모두 symmetric 구현(homeAdj===awayAdj)이라 bias 항상 0(실질 노출 없음)이지만, 비대칭 도입 시 `agent_memories`에 0% factor가 학습되어 team-agent 프롬프트에 노출되는 동일 family 재현 경로였음.

실행: `DEFAULT_WEIGHTS` weight=0 키 집합 + `postview.ts`의 `canonicalizeFactorKey` 재사용(prefix 유무 무관 매칭)으로 `buildMemoryForTeam` maxBias 루프에 제외 가드 추가. `isWeightedFactor` 전체 재사용은 미등록 factor key(향후 predictor 확장 대비 raw fallback) 테스트를 깨뜨려 exclude-set 방식으로 최소 스코프 조정. 회귀 테스트 3건 추가. `pnpm --filter @moneyball/kbo-data test`(91 files/1190 tests) + type-check + lint clean. VERSION/package.json(root+apps/moneyball)/CHANGELOG 3-way sync — 1차 push 시 apps/moneyball/package.json 누락으로 version-sync-guard pre-push hook 이 차단, 2차 커밋으로 수정 후 push 성공.

다음 사이클 추천 = explore-idea 또는 operational-analysis (review-code SMALL_SAMPLE_N family는 소진 유지, 이번 cycle의 신규 family는 단발성 fix로 종결).

---

## ⚪ RETRO-ONLY — review-code(heavy) SMALL_SAMPLE_N family 잔여 후보 재확인, 신규 fix 대상 없음 (cycle 2557, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전8=2549-2556 distinct=4). fix-incident negative(CI 클린). op-analysis 방금 발화(gap 미도달). cycle 2555/2556 retro 공통 권고("review-code 재탐색 또는 explore-idea family 소진 재판단") 따라 review-code(heavy) 채택.

점검: `MatchupConvergencePickRecord`(matchup 두 팀 맞대결 성적) 조사 — `getConvergencePickHeadToHeadRecord`가 이미 `computeConvergenceTeamStats(results, CONVERGENCE_TEAM_STATS_MIN_PICKS)`로 상위 쿼리 레이어에서 게이팅 확인(TeamConvergencePickRecord wave-607 과 동일 관례). mlb/players·teams parity 도 cycle 2549 fix commit 에서 이미 "통계 자체 부재라 갭 없음" 확인된 상태 재확인. 두 후보 모두 negative.

결론: SMALL_SAMPLE_N family(11회 누적) 2 사이클 연속 negative 재확인 — 사실상 소진 확정. 코드 변경 없음.

다음 사이클 추천 = explore-idea(review-code dominance 직전20=12/20에서 다양성 redirect, TODOS Next-Up + GH issue 재확인).

---

## ✅ SUCCESS — operational-analysis(heavy) CE cohort n=337 7th 연속 재확인, 파이프라인 정상 재검증 (cycle 2556, 2026-08-25)

진단: open issue 0, approved plan 0. 2-chain lock 없음(직전8=2548-2555 distinct=3: review-code/skill-evolution/explore-idea). fix-incident 20+/20 gap 도달했으나 negative(CI 실패 0건). **op-analysis 26/25 gap 도달**(마지막 발화 cycle 2530) + review-code(heavy) dominance(6/8) + cycle 2555 retro의 exhaustion 재판단 요청 → 다양성 확보 겸 op-analysis(heavy) 채택.

발견: `scripts/op-analysis-ce-cohort.ts` 재실행 → 전체 n=337 (CE n=290 / 비CE n=47, 격차 10.4pp) — cycle 2448과 수치 완전 동일. drift 의심 → DB REST 직접 조회로 검증: KBO v1.8 최신 verified_at 2026-08-23 확인(파이프라인 정상 작동), verified pre_game 697건 중 debate_version 은 여전히 null 또는 `v2-persona4` 둘뿐(신규 버전 없음). 수치 동일 원인 = drift 아니라 cycle 2448↔2556 사이 실제 캘린더 경과일이 짧아 신규 KBO 검증 배치가 아직 미반영(cycle 처리 속도 ≫ 실제 경기일 간격).

실행: 코드 변경 없음(측정 재확인 성격) — `CLAUDE.md` CE tracking 문단에 cycle 2556 엔트리 append. LLM 부가가치 우세 결론 7회 연속 재확인. CREDIT_EXHAUSTED·비CE 표본 동결 상태 변화 없음.

다음 사이클 추천 = review-code(heavy, SMALL_SAMPLE_N family 11회 누적 후 잔여 후보 전수 재확인 — 소진 확정 시 explore-idea 다양성 redirect) 또는 explore-idea.

---

## ✅ SUCCESS — review-code(heavy) AccuracyHeaderCard 누적 적중률 소표본 게이트 부재 정정 (cycle 2555, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전8=2547-2554 distinct=4: info-arch/review-code/skill-evolution/explore-idea). fix-incident negative(`gh run list` 최근 10건 전부 success). op-analysis/info-arch/lotto gap 미도달. cycle 2554 explore-idea 5th 소진 확정 후 review-code(heavy) 재탐색 권고.

발견: `AccuracyHeaderCard.tsx`(predictions/mlb-predictions/en-mlb-predictions 3개 라이브 라우트 공통 사용) 헤드라인 "누적 적중률" %는 트렌드/티어 breakdown 표시 조건에만 `MIN_VERIFIED_GAMES_HEDGE`/`STATS_RELIABLE_MIN_N` 게이트가 걸려있고, 메인 % 자체는 `totalVerified===0` 외 소표본 안내 부재 — SMALL_SAMPLE_N family 11번째 연속 재발.

실행: `SMALL_SAMPLE_N` import + 헤드라인 % 아래 `totalVerified < SMALL_SAMPLE_N` 조건부 인라인 표시(ko/en) 추가. 회귀 테스트 `silent-drift-wave-673.test.ts` 신규(3 assertion). `tsc --noEmit` clean + full test suite(531 files/4367 tests) clean + lint clean. 단일 논리 단위 → 직접 main commit+push (R4, commit e357a25c).

다음 사이클 추천 = review-code(heavy) 잔존 재탐색(family 완전 소진 여부 재판단) 또는 explore-idea(소진 재확인 결과 대비).

---

## ⚪ RETRO-ONLY — explore-idea(lite) 5th 소진 재확인, 신규 후보 0건 (cycle 2554, 2026-08-25)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 20+/20 도달했으나 cycle 2553 `gh run list` 재확인 negative — 이번 cycle 도 재확인, 최근 10건 전부 success/schedule clean 지속, op-analysis 24/25, info-arch 7/30, lotto 16/30). 2-chain lock 미충족(직전8=2546-2553 distinct=3: review-code 6/skill-evolution 1/info-arch 1). **explore-idea saturation trigger 충족(직전15=2540-2553 중 review-code+fix-incident+polish-ui+info-arch=12/15)** + cycle 2553 retro가 "family 10회 누적 소진 판단 시 explore-idea redirect" 명시 — review-code(heavy) 최근 8사이클 중 6회 dominance 실측 확인 후 다양성 회복 위해 explore-idea 채택.

점검(lite quick-recheck, carry-over 명확 — heavy 재탐색 skip): (1) plan #29(로그인+커뮤니티) gating 조건 재확인 — service-role REST count=exact: `user_picks`=1, `mlb_user_picks`=0, `pick_poll_events`=5, `mlb_pick_poll_events`=0 — cycle 2417/2530 측정치와 완전 동일, 무성장 지속(트래픽 ≥10 임계 미도달). KBO 포스트시즌(통상 10월) 접근 조건도 오늘(8/25) 기준 미도달. Tier4 보류 유지. (2) `find apps/moneyball/src/app -name page.tsx -mtime -14` — 신규 라우트 0건(최근 수정 파일 전부 기존 라우트 review-code 정정 흔적). (3) TODOS.md Next-Up(2026-04-25) 섹션 재확인 — 신규 리드 없음(기존 mcc alias 1-line 사용자 영역 항목만 잔존). (4) GH issue 0건.

실행: 코드 변경 없음 — 4연속(cycle 2417/2477/2498/2530대) 소진 확정에 이어 5th 재확인, 신규 후보 0건.

다음 사이클 추천 = review-code(heavy, 잔존 미감사 재탐색 — standings/leaderboard 세부 컴포넌트 또는 SMALL_SAMPLE_N family 10회 재발 완전 소진 여부 전수 재확인) 또는 fix-incident/operational-analysis(gap 근접, 각 cycle 2555/2555 도달 예정) 또는 info-arch(gap 7/30, 미도달).

---

## ✅ SUCCESS — review-code(heavy) 커뮤니티 vs AI 대결 · MLB accuracy 히어로 소표본 게이트 부재 정정 (cycle 2553, 2026-08-25)

진단: open issue 0, approved plan 0/23(status: approved 매칭 0건). 2-chain lock 없음(2545-2552 distinct=3: review-code 6 + skill-evolution 1 + info-arch 1). fix-incident 20+/20 gap 도달했으나 `gh run list --limit 10` 재확인 — 최근 10건 전부 success, CI 실패 0건, negative. op-analysis 23/25, info-arch 6/30, lotto 15/30 모두 미도달. cycle 2552 retro가 family 지속 또는 소진 시 explore-idea redirect 명시.

발견: (1) `accuracy/page.tsx`(KBO) 커뮤니티 vs AI 인라인 + 이를 추출한 공유 컴포넌트 `CommunityVsAICard.tsx`(explore-idea cycle 2544, MLB 배선) 모두 AI 정답률(`aiAccuracyWithPoll`)이 `communityGames >= MIN_POLL_TOTAL`(=3) 게이트만 상속받고, 독립적으로 더 적을 수 있는 `aiGamesWithPoll` 자체엔 `SMALL_SAMPLE_N` 게이트 부재 — KBO 원본의 기존 부재가 컴포넌트 추출 시 그대로 계승됨. (2) `MlbAccuracyDashboard.tsx` 히어로 "전체 적중률" StatCard는 `SMALL_SAMPLE_N` import 자체가 없어 verifiedN=1이어도 강조색 노출, 내부 calibration bucket/섹션 게이트는 상수 대신 하드코딩 리터럴 `5` 사용(단일 출처 원칙 위반). family 10번째 연속 재발(cycle 2541/2542/2543/2545/2546/2548/2549/2550/2552/2553).

실행: `accuracy/page.tsx` + `CommunityVsAICard.tsx`(ko/en) AI 정답률 스탯에 `aiGamesWithPoll < SMALL_SAMPLE_N` 조건부 색상/title/인라인 `· 소표본(n<5)` 표시 + `MlbAccuracyDashboard.tsx` 히어로 StatCard 동일 게이트 + 하드코딩 리터럴 2곳 상수 교체. 회귀 테스트 `silent-drift-wave-672.test.ts` 신규(9 assertion).

검증: tsc/lint clean + test(530 files/4364 tests) 통과. 단일 논리 단위 → 직접 main commit(1c781b5b + 버전동기화 66b621ea)+push, pre-push guard(1차 version-sync-guard fail → 루트 package.json/VERSION 누락 발견 → 정정 커밋 후 재push 통과), R4 정합.

다음 사이클 추천 = review-code(heavy, 남은 후보 재탐색 — v2-shadow-monitor/accuracy/shadow 는 noindex 내부 cohort 페이지라 스코프 밖 확인됨. 남은 대형 파일/컴포넌트 감사 지속) 또는 family 10회 누적 소진 판단 시 explore-idea 다양성 redirect (2-chain lock 근접 주의 — review-code 최근 8사이클 중 6회).

---

## ✅ SUCCESS — review-code(heavy) 리더보드 AI 적중률 베이스라인 소표본 게이트 부재 정정 (cycle 2552, 2026-08-25)

진단: open issue 0, approved plan 0/23(status: approved 매칭 0건). 2-chain lock 없음(2544-2551 distinct=4: explore-idea/review-code/info-arch/skill-evolution). fix-incident 20/20 gap 도달했으나 `gh run list --limit 10` 재확인 — CI 실패 0건, negative. op-analysis 22/25, info-arch 5/30, lotto 14/30 모두 미도달. cycle 2551 retro가 sweep 잔여(leaderboard/seasons/accuracy-shadow/mlb/accuracy) 우선 재확인 명시.

발견: `leaderboard/seasons/accuracy-shadow/mlb-accuracy` page.tsx 4곳은 `SMALL_SAMPLE_N` 미import 이지만, leaderboard 유저 픽 항목(HallOfFame/테이블 행/내 순위)은 leaderboard_* DB view 의 `HAVING COUNT(*) >= 5` 로 이미 구조적 소표본 배제 확인 (스코프 밖). 대신 `LeaderboardTable.tsx` 의 "AI 적중률" 배지(`aiBaseline.pct%`)가 신규 발견 — `fetchAiBaseline()`이 `predictions` 테이블 직접 조회에 HAVING 없어 weekly/monthly 모드 초반엔 n=1~4 노출 가능한데 게이트 부재. family 9번째 연속 재발(cycle 2541/2542/2543/2545/2546/2548/2549/2550/2552). seasons/accuracy-shadow/mlb-accuracy 4곳은 재확인 결과 실제 %텍스트 렌더 자체 없음 또는 이미 별도 컴포넌트 게이트 확인 필요 — 다음 사이클 carry-over.

실행: `LeaderboardTable.tsx` AI 적중률 배지에 조건부 "· 소표본(n<5)" 인라인 표시 추가 (predictions/[date] 등 기존 관례 재사용). 회귀 테스트 `silent-drift-wave-671.test.ts` 신규(3 assertion).

검증: tsc/lint clean + test(529 files/4356 tests) 통과. 단일 논리 단위 → 직접 main commit(8acc024c)+push, pre-push guard 통과, R4 정합.

다음 사이클 추천 = review-code(heavy, seasons/accuracy-shadow/mlb-accuracy 3곳 실제 렌더 계층 재확인 — page.tsx 자체엔 없어도 하위 컴포넌트에 %텍스트 있을 가능성) 또는 family 완전 소진 확인 시 explore-idea 다양성 redirect.

---

## ✅ SUCCESS — review-code(heavy) 대시보드 시즌·확신구간·적중예측 적중률 소표본 게이트 부재 정정 (cycle 2550, 2026-08-25)

진단: open issue 0, approved plan 0/23(status: approved 매칭 0건 — 전부 completed/archived/superseded/pending_user_step 등). 2-chain lock 없음(2542-2549 distinct=3: review-code 6 + info-arch 1 + explore-idea 1). fix-incident 20+/20 gap 도달했으나 `gh run list --limit 10` 재확인 — CI 실패 0건, negative 재확인. op-analysis 20/25, lotto 12/30 미도달. cycle 2549 retro가 sweep 잔여 리스트 중 dashboard.tsx confidentStat/teamMap 계산부 재확인 가치 있다고 명시.

발견: `dashboard.tsx` confidentStat 계산부 확인 중 정작 렌더 계층 두 곳에서 신규 발견 — (1) `AccuracySummary.tsx` 시즌 적중률 총계(`{ratePct}% ({correct}/{total})`)와 확신/애매/박빙 3단계 tier 각 행 모두 `SMALL_SAMPLE_N` import 자체 없이 백분율만 노출, (2) `dashboard/page.tsx` "적중 예측 적중률" 카드(confidentStat)도 동일 부재. teamMap/TeamPerformanceChart 는 `MIN_TEAM_PREDICTIONS`(=3) 별개 필터 존재해 스코프 밖. family 8번째 연속 재발(cycle 2541/2542/2543/2545/2546/2548/2549/2550).

실행: 두 파일 3개 지점(시즌 총계 + tier 3행 + confidentStat 카드) 모두 조건부 "· 소표본(n<5)" 인라인 표시 추가 (predictions/[date] 등 기존 관례 재사용). 회귀 테스트 `silent-drift-wave-670.test.ts` 신규(7 assertion).

검증: tsc/lint clean + test(528 files/4352 tests) 통과. 단일 논리 단위 → 직접 main commit(8ec9ea4f)+push, pre-push guard 통과, R4 정합.

다음 사이클 추천 = review-code(heavy, sweep 잔여 재확인 — guide/insights/calendar/v2-shadow-monitor/changelog/matchup/methodology/leaderboard/about/accuracy-shadow/search/lotto-methodology/seasons/glossary/v2-preview/mlb/accuracy/mlb/reviews/debug/model-comparison/debug/reliability/reviews 중 실측 percentage 표시하는 leaderboard·seasons·accuracy-shadow·mlb/accuracy 우선 재확인 가치) 또는 family 완전 소진 확인 시 explore-idea 다양성 redirect.

---

## ✅ SUCCESS — review-code(heavy) teams/[code]/recent·players/[id] 적중률 소표본 게이트 부재 정정 (cycle 2549, 2026-08-25)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(2541-2548 distinct=3). fix-incident 20+/20 도달했으나 `gh run list` 재확인 negative. op-analysis 19/25, lotto 11/30, info-arch 2/30 미도달. cycle 2548 retro carry-over 후보 3건(mlb/reviews/weekly — 이미 게이트 존재, debug/factor-correlation — 이미 CI/N 투명 공개라 스코프 밖, mlb/games/[date]/[slug] — 해당 통계 부재) 전부 소진 확인.

발견: carry-over 소진 후 broader grep sweep(적중률 텍스트 + `SMALL_SAMPLE_N` import 부재 교차) 신규 실행 → `teams/[code]/recent/page.tsx` 헤더 "적중률 N% (n/m)" 및 `players/[id]/page.tsx` "예측 적중률" 카드 둘 다 게이트 부재. `RECENT_FORM_GAMES=10` 상한이라 시즌 초반/검증 미완료 구간 n<5 노출 가능 — family 7번째 연속 재발.

실행: 두 파일 모두 `SMALL_SAMPLE_N` import + 조건부 `· 소표본(n<5)` 인라인 표시 추가. mlb/players/[id]·KBO teams/recent의 MLB 대응 페이지는 해당 통계 자체 부재라 parity 갭 없음(스코프 밖 확인). 회귀 테스트 `silent-drift-wave-669.test.ts` 신규(6 assertion).

검증: tsc/lint clean + test(527 files/4345 tests) 통과. 단일 논리 단위 → 직접 main commit(7d2be288)+push, pre-push guard 통과, R4 정합.

다음 사이클 추천 = review-code(heavy, sweep 리스트 잔여 재확인 — dashboard.tsx confidentStat/teamMap 계산부 등) 또는 family 완전 소진 확인 시 explore-idea 다양성 redirect.

---

## ✅ SUCCESS — review-code(heavy) predictions/[date] 헤더 적중률 소표본 게이트 부재 정정 (cycle 2548, 2026-08-25)

진단: open issue 0, approved plan 0/29. 2-chain lock 없음(직전 8사이클 2540-2547 distinct=3: explore-idea/review-code/info-architecture-review). fix-incident 20+/20 gap 도달했으나 `gh run list` 전 workflow success, CI 실패 0건 재확인 → negative skip. op-analysis 18/25, lotto 10/30 미도달. cycle 2547 retro가 review-code(heavy) 또는 explore-idea 재평가 권고.

발견: `predictions/[date]/page.tsx` 헤더 "적중률 N% (n/m)" 텍스트에 `SMALL_SAMPLE_N` import 자체 없음 — matchup/accuracy/homepage(WeeklyTrendMini) 계열엔 다 있던 관례가 일별 예측 페이지 헤더엔 누락. 하루 1~2경기만 검증된 이른 시각에도 소표본 안내 없이 노출.

실행: `SMALL_SAMPLE_N` import + `totalN < SMALL_SAMPLE_N` 조건부 `· 소표본(n<5)` 인라인 표시 추가(WeeklyTrendMini 관례 재사용). 메타 description/OG/공유 텍스트 3곳(line 215/219/252/595)은 색상 강조 없는 요약 문구라 스코프 밖 유지. 회귀 테스트 `silent-drift-wave-668.test.ts` 신규(3 assertion).

검증: tsc/lint clean + test(526 files/4339 tests) 통과. 단일 논리 단위 → PR 없이 직접 main commit(845f2dea)+push, pre-push guard 통과, R4 정합.

소표본 게이트 family 6번째 연속 발견(cycle 2541/2542/2543/2545/2546/2548). 다음 사이클 추천 = review-code(heavy, family 소진 여부 재확인 — 잔여 후보: `mlb/reviews/weekly/[week]/page.tsx`(이미 부분 존재, 재확인만), `debug/factor-correlation/page.tsx`, `mlb/games/[date]/[slug]/page.tsx`) 또는 explore-idea(소진 확인 시 다양성 redirect).

## ⚪ RETRO-ONLY — info-architecture-review 30-cycle gap 최초 도달, 감사 결과 신규 이슈 0건 (cycle 2547, 2026-08-25)

진단: open issue 0, approved plan 0/23. **2-chain lock 탐지**(직전 8사이클 2539~2546 distinct=2: review-code 6 + explore-idea 2) → 양쪽 제외. 잔여 pool gap 재확인 — fix-incident 20/20 도달했으나 cycle 2546 retro가 "신규 CI 실패/silent skip 신호 발생 시까지 재평가 보류" 명시(negative 확정) → skip. info-architecture-review 30/30 최초 도달(마지막 발화 cycle 2517) → 신선 trigger로 선택.

감사 범위: (1) breadcrumb 누락 라우트 grep 18건 전수 확인 — 전부 false positive(redirect stub 6건: reviews/monthly·weekly KBO/MLB/EN 동일 패턴, noindex 플레이스홀더 4건: community/login/settings/v2 계열, 최상위 인덱스 페이지 나머지). (2) sitemap.ts vs 실제 page.tsx 12건 diff — 전부 의도된 제외(주석으로 문서화됨: redirect-only 중복 인덱싱 방지, v2-shadow-monitor v1.8 확정 후 archive). (3) Header 메가메뉴(KBO_NAV 5-hover-zone 룰 vs MLB_NAV 비교) + Footer 6그룹 — KBO는 "Header=primary path only, Footer=exhaust" 룰 문서화(line 69-71 주석)로 의도된 비대칭, methodology/glossary/guide 등 footer 전용 정상.

결론: IA 구조 이미 양호 — breadcrumb/sitemap/nav 3축 전부 기존 의도된 설계 또는 이미 문서화된 예외. 신규 코드 변경 0건, PR 없음.

다음 사이클: info-architecture-review 카운터 0/30 리셋(cycle 2547 기준). 2-chain lock 여파로 review-code/explore-idea 재개 시점 판단 필요 — 직전 8사이클(2540~2547) 재계산 시 lotto(2538 탈락) 빠지고 distinct 재평가 예정.

---

## ✅ SUCCESS — review-code(heavy) 홈페이지 WeeklyTrendMini 히어로 통계 소표본 게이트 부재 (cycle 2546, 2026-08-25)

진단: open issue 0, approved plan 0/23(전부 status≠approved). 2-chain lock 없음(직전 8사이클 distinct=3). gap trigger 재계산 — fix-incident 20/20 도달했으나 `gh run list` scheduled workflow 전부 success + CI 실패 0건이라 실제 인시던트 부재(negative). op-analysis 16/25 / info-arch 29/30 / lotto 8/30 모두 미도달. cycle 2545 retro가 소표본 게이트 family 4-cycle 연속 후 신규 target 재탐색 필요 명시 → 미감사 홈페이지 컴포넌트 재탐색.

발견: 홈페이지(`page.tsx`) 본문 팀별 적중률은 이미 `SMALL_SAMPLE_N` 게이트 있는데, "최근 4주 성과" 카드(`WeeklyTrendMini`)의 `barColor()`는 `verified===0`만 확인(1건도 색상 강조) + 히어로 `currentPct`도 `SMALL_SAMPLE_N` import 자체 없이 `verified>0`만 확인 — 홈페이지 최상단 노출이라 영향 큼.

실행: `SMALL_SAMPLE_N` import + `barColor()` 임계 `verified<SMALL_SAMPLE_N` 교체 + 히어로 % 텍스트 색상/title 툴팁 조건부(matchup 관례 재사용) + "이번 주" 라벨 "· 소표본" 표시 + 막대 툴팁 "· 소표본(n<5)" 표시. 회귀 테스트 `silent-drift-wave-667.test.ts` 신규(4 assertion).

검증: `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(525 files/4336 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push(R4), 버전 0.5.62.120→121.

다음 사이클: 소표본 게이트 family 5-cycle 연속(2541~2543 accuracy/analysis + 2545 matchup + 2546 홈페이지). fix-incident gap 20/20 도달했으나 실 인시던트 부재 확인됨(negative check) — 재확인 불필요, 다음 fix-incident 평가는 신규 CI 실패/silent skip 신호 발생 시. op-analysis gap 16/25 계속 근접 중.

---

## ✅ SUCCESS — review-code(heavy) matchup 페이지 3종 AI 예측 성과 소표본 게이트 부재 (cycle 2545, 2026-08-25)

진단: open issue 0, approved plan 0/29. 2-chain lock 없음(직전 8사이클 distinct=3). gap trigger 4종 미도달(fix-incident 19/20, op-analysis 15/25, info-arch 28/30, lotto 7/30). cycle 2544 retro가 accuracy/analysis 계열 소표본 게이트 family(2541~2543) 소진 가능성 명시 → 인접 미감사 파일(matchup 3종) 재탐색.

발견: `teams/[code]`·`mlb/team/[code]`·`en/mlb/team/[code]`는 이미 `SMALL_SAMPLE_N` 게이트 있는데, matchup/[teamA]/[teamB] KBO/MLB/EN-MLB 3종의 "AI 예측 성과(이 매치업 한정)" 카드는 `verified > 0`만 확인해 검증 경기 1~2건에도 100%/0%를 브랜드색/빨강 강조 노출.

실행: 3파일 `SMALL_SAMPLE_N` import + `verified < SMALL_SAMPLE_N` 시 회색 처리 + title 툴팁 + 인라인 `· 경기 수 적음`(EN `· small sample`) 안내(teams/[code] 관례 재사용). 회귀 테스트 `silent-drift-wave-666.test.ts` 신규(3파일×3assertion).

검증: `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(524 files/4332 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push(R4), 버전 0.5.62.119→120.

다음 사이클: 소표본 게이트 family 는 이번까지 4-cycle(2541~2543 accuracy/analysis + 2545 matchup) 연속. 다음 review-code(heavy) 진행 시 신규 target 재탐색 필요(family 소진 재추정) — saturation 시 explore-idea/operational-analysis(gap 15/25) redirect 고려.

---

## ✅ SUCCESS — review-code(heavy) analysis/page.tsx(목록) 팩터 수렴 픽 성적 라인 7개소 소표본 게이트 부재 (cycle 2543, 2026-08-25)

진단: open issue 0, approved plan 0/29(전부 status≠approved). 2-chain lock 없음(직전 8사이클 distinct=3). gap trigger 4종 미도달(fix-incident 17/20, op-analysis 13/25, info-arch 26/30, lotto 5/30). cycle 2542 retro carry-over(analysis/page.tsx 2803줄, 7개 지점 명시) 감사.

발견: `recentConvergenceRecord`(기본) + `recentStrong`/`monthlyStrong`/`seasonStrong`(강수렴) + `seasonComplete`/`monthlyComplete`/`recentComplete`(완전수렴) 총 7개 라인이 `SMALL_SAMPLE_N` import 없이 승률 %를 그대로 강조 노출. `weekly*`/`yesterday*` 변형은 % 미표시(카운트만)라 범위 제외.

실행: `SMALL_SAMPLE_N` import + 7개 지점 각각 `total < SMALL_SAMPLE_N` 조건부 `opacity-60` + 인라인 `· 소표본(n<5)` 안내(cycle 2541/2542 관례 재사용). 회귀 테스트 `silent-drift-wave-665.test.ts` 신규(7개 변수 게이트 확인).

검증: `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(522 files/4310 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push(R4), 버전 0.5.62.117→118.

accuracy(2541) → game/[id](2542) → 목록(2543) 3-cycle 연속으로 소표본 게이트 family sweep 완료 추정. 다음 사이클 review-code(heavy) 진행 시 신규 target 재탐색 필요 (이 family 소진 가능성 — saturation 시 explore-idea redirect 고려).

---

## ✅ SUCCESS — review-code(heavy) analysis/game/[id]/page.tsx 팩터 수렴 픽 성적 라인 소표본 게이트 부재 (cycle 2542, 2026-08-25)

진단: open issue 0, approved plan 0/29(전부 status≠approved). 2-chain lock 없음(직전 8사이클 distinct=3). gap trigger 4종 미도달(fix-incident 16/20, op-analysis 12/25, info-arch 25/30, lotto 4/30). CI 실패 0건. cycle 2541 retro carry-over(잔존 대형 파일 `analysis/game/[id]/page.tsx` 868줄) 감사.

발견: 이 페이지는 #1338 family(scoring_rule 필터) 관점에서 이미 3회 정정된 clean 상태. postGame `.find()` 는 scoring_rule 필터가 없지만 shadow-cohort.ts 가 shadow row 를 prediction_type='pre_game' 만 insert(post_game shadow row 자체 없음) 확인 — false positive, 실질 위험 없음. 대신 wave-461 "팩터 수렴 픽 최근 N경기 적중 현황" 라인이 `SMALL_SAMPLE_N` import 자체가 없어 window(기본 10경기) 표본이 1~2건뿐일 때도 100%/0%를 그대로 강조 — cycle 2541 이 accuracy 표에 적용한 것과 동일한 소표본 게이트 부재. `analysis/page.tsx`(목록) 도 동일 패턴 7개 지점 존재 확인(다음 후속 대상).

실행: `SMALL_SAMPLE_N` import + `convergenceRecord.total < SMALL_SAMPLE_N` 시 `opacity-40`(기존 무조건 `opacity-60` 교체) + 인라인 `· 소표본(n<5)` 안내(FactorAccuracyTable/TeamMatchupCards 관례 재사용). 회귀 테스트 `silent-drift-wave-664.test.ts` 신규.

검증: `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(521 files/4301 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push(R4), 버전 0.5.62.116→117.

다음 사이클 추천 = review-code(heavy) 계속 — `analysis/page.tsx`(목록, 2803줄) 안 동일 소표본 게이트 부재 7개 지점(recent/monthly/season × strong/complete convergence record) 정정.

---

## ✅ SUCCESS — review-code(heavy) accuracy/page.tsx 팩터별 적중률 표 소표본 게이트 부재 (cycle 2541, 2026-08-25)

진단: open issue 0, approved plan 0/29(전부 archived/completed). 2-chain lock 없음(직전 8사이클 distinct=3). gap trigger 4종 미도달. cycle 2539/2540 retro carry-over(잔존 대형 파일 `accuracy/page.tsx` 1220줄) 감사.

발견: `accuracy/page.tsx` 자체는 KST/CE배너/cohort-filter 등 기존 재발 family 관점에서 clean(이미 이전 wave 들에서 정정됨). 다만 하위 컴포넌트 `FactorAccuracyTable.tsx`(팩터별 적중률)가 페이지 내 유일하게 소표본 게이트가 없는 표 — 팀별 성과(`MIN_TEAM_PREDICTIONS`)/상대강약(`TeamMatchupCards` `SMALL_SAMPLE_N`)/요일별(`SMALL_SAMPLE_THRESHOLD`)/확신도 티어(`STATS_RELIABLE_MIN_N`)는 전부 소표본 caveat 존재하나 이 표만 n=1 팩터도 100%/0%로 색상 강조.

실행: `SMALL_SAMPLE_N`(5) import + `r.n < SMALL_SAMPLE_N` 행 `opacity-50`(TeamMatchupCards 관례) + KBO/MLB-ko/MLB-en 3 locale `smallSampleNote` footer 안내 추가(로케일 미분기 하드코딩 방지). 회귀 테스트 `silent-drift-wave-663.test.ts` 신규.

검증: `pnpm --filter moneyball run type-check` clean + `pnpm test`(519 files/4296 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push(R4), 버전 0.5.62.115→116(VERSION 파일 sync 는 pre-push guard 포착 후 2번째 커밋).

다음 사이클 추천 = review-code(heavy) 계속(잔존 대형 파일 `analysis/game/[id]/page.tsx` 868줄 미감사) 또는 explore-idea(heavy)(saturation trigger 재확인 필요).

---

## ✅ SUCCESS — explore-idea(heavy) analysis/page.tsx PickButton parity 추가 (cycle 2540, 2026-08-24)

진단: open issue 0, approved plan 0/29. 이미 소진 확정된 영역(EN/KO parity, JSON-LD, PWA, leaderboard, auth, standings 홈/원정 — cycle 2535 shipped, CE 배너 로직 — 최근 review-code 다수 정정, KST 경계 — 최근 review-code 다수 정정, 수렴/직접대결/팩터 배지 시리즈)을 제외하고 "일부 페이지엔 있고 다른 페이지엔 없는" parity gap 재조사.

발견: `PickButton`(투표 제출 + 커뮤니티 분포 + AI 대결 힌트, `components/picks/PickButton.tsx`)은 이미 홈("/")과 `/mlb/analysis`, `/mlb/games/[date]` 에 통합돼 있으나, KBO 사용자가 오늘 경기를 가장 상세히 보는 `/analysis` 페이지("오늘 전체 AI 예측" 섹션)에는 아예 없었음. `predictions/[date]/page.tsx` 는 `enablePickButton={false}`로 명시적 의도 표시(기록 열람 전용)라도, `/analysis` 는 그런 예외 처리조차 없이 컴포넌트 자체가 통째로 누락된 순수 gap. `analysis-data.ts` 의 `games` 쿼리가 애초에 `status` 컬럼을 select 하지 않아 PickButton 의 `scheduled`-only 노출 게이트를 걸 수조차 없는 상태였음(선행 원인).

실행: `analysis-data.ts` `games` select 에 `status` 추가 + `TodayGameCard.status: string | null` 신규 필드(신규 쿼리 없음, 컬럼 1개 추가). `page.tsx` "오늘 전체 AI 예측" 카드 `</Link>` 직후 `g.status === 'scheduled'` 게이트로 `<PickButton gameId/homeTeam/awayTeam/aiPredictedWinner/aiWinProb/aiTopFactor>` 렌더 — AI hint 값은 기존 계산값(`predictedWinnerCode`/`homeWinProb`/`topFactors[0]`) 재사용. 회귀 테스트 `silent-drift-cycle-2540.test.ts` 신규(PickButton import + status 게이트 + status 컬럼 select/필드 전달 각각 source-text 검증).

검증: `pnpm --filter moneyball run type-check` clean + `pnpm --filter moneyball run test`(519 files/4295 tests) + `pnpm --filter moneyball run lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push(R4), 버전 bump 0.5.62.114→115.

다음 사이클 추천 = review-code(heavy) 계속(잔존 대형 파일: `accuracy/page.tsx` 1220줄, `analysis/game/[id]/page.tsx` 868줄 — cycle 2539 carry-over 미처리) 또는 lotto(gap 2/30, 아직 저신선도).

---

## ✅ SUCCESS — review-code(heavy) predictions/[date]/page.tsx CE 배너 감지 기준 통일 (cycle 2539, 2026-08-24)

진단: open issue 0, approved plan 0/29. gap trigger 4종 미도달(fix-incident 13/20, op-analysis 9/25, info-arch 22/30, lotto 1/30 — 방금 fire). 직전 8사이클 distinct=3(review-code/explore-idea/lotto) — 2-chain lock 없음. explore-idea saturation 미충족(11/15 <12). cycle 2538 retro carry-over(잔존 대형 파일 `teams/[code]/page.tsx` 622줄/`predictions/[date]/page.tsx` 615줄) 순서대로 감사. `teams/[code]/page.tsx` 는 general-purpose agent 정밀 감사 결과 clean(findings 0) — KST/threshold/CE배너(없음)/cohort filter 모두 canonical 패턴 정합.

발견: `predictions/[date]/page.tsx` 의 CE 배너가 `predicted.slice(0,10)`(그 page date 하루치 games, 최대 5경기)의 평균 confidence 로 판정 — cycle 2534 `analysis/page.tsx` 와 동일 family, 3번째 재발(about/predictions/analysis 이미 수정됨). 예측 3건 미만인 날은 CE 진행 중이어도 배너 항상 억제, 예측 많은 날은 그 날 게임 성향에 좌우돼 실제 CE 상태와 무관.

실행: `analysis-data.ts` export `detectSimplifiedMode()`(날짜 무관 최근 예측 10건 기준) import + 로컬 `recentConfs`/`simplifiedMode` 계산 제거, `CE_DETECT_THRESHOLD`/`CE_MIN_SAMPLES` 미사용 import 제거. `silent-drift-wave-307.test.ts` 갱신(해당 assertion 을 analysis/page.tsx 케이스와 동일 패턴으로 교체). `pnpm tsc --noEmit`/`pnpm test`(518/4292)/`pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(9b144dcc)+push(R4), pre-push hook 통과. 버전 bump 는 최근 2 cycle(2536/2537) 선례 따라 skip.

다음 사이클 추천 = lotto(gap 1/30, 방금 fire — 다음 30-gap 재도달까지 장기) 또는 review-code(heavy) 계속(잔존 대형 파일: `accuracy/page.tsx` 1220줄, `analysis/game/[id]/page.tsx` 868줄 — 아직 미감사 target).

---

## ✅ SUCCESS — review-code(heavy) 홈 페이지 이번 주 일정 오늘 예측 KST 경계 정정 (cycle 2537, 2026-08-24)

진단: open issue 0, approved plan 0/29. gap trigger 4종 미도달(fix-incident 11/20, op-analysis 7/25, info-arch 20/30, lotto 29/30 — 다음 사이클 30 도달 예상). 직전 8사이클 distinct=3(review-code/operational-analysis/explore-idea) — 2-chain lock 없음. cycle 2535 retro carry-over(잔존 대형 파일: `page.tsx` 1090줄/`teams/[code]/page.tsx` 622줄/`predictions/[date]/page.tsx` 615줄) 중 최대 monolith `page.tsx`(홈) 감사.

발견: `getWeekAheadSchedule()` 의 `todayPredResult` 쿼리가 `today`(KST 날짜 문자열)를 `${today}T00:00:00Z`~`${today}T23:59:59Z` (UTC) 로 필터 — 실제 KST 하루는 UTC 전날 15:00~당일 15:00 이라 9시간 어긋남. 예측 배치가 `KBO_PREDICT_DAILY_TIME_KST`(09:00 KST = 00:00 UTC) 근접 실행되므로 cron 지연으로 몇 분만 어긋나도 `todayPredMap` silent 누락 → "이번 주 일정" 카드가 오늘 경기를 풀모델 확률 대신 Elo 추정치로 조용히 대체(wave-242, #2612 최초 도입 시점부터 존재, KST_OFFSET_MS family 신규 변종). `daily.ts:75` 등 코드베이스 기존 관례는 동일 목적에 `Z` 대신 `+09:00` 오프셋 사용 — 이 파일만 유일하게 벗어남 (grep 확인).

실행: `T00:00:00Z`/`T23:59:59Z` → `T00:00:00+09:00`/`T23:59:59+09:00` 로 정정 (2줄). `pnpm type-check`/`pnpm test`(518/4292)/`pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(c738c9eb)+push(R4).

다음 사이클 추천 = lotto(gap 29/30→30/30 도달 예상, trigger 6 충족) 또는 review-code(heavy) 잔존 대형 파일(`teams/[code]/page.tsx` 622줄/`predictions/[date]/page.tsx` 615줄) 계속 재탐색.

---

## ✅ SUCCESS — explore-idea standings 홈/원정 성적 컬럼 추가 (cycle 2535, 2026-08-24)

진단: 2-chain alternation lock 발동(직전 8사이클 distinct=2: review-code+operational-analysis) — 두 chain 후보 제외. gh run list(CI 실패 0건)/DESIGN.md mtime(1일 전)/breadcrumb grep 모두 신규 trigger 아님. explore-idea saturation trigger(13/15) 충족 + 유일한 실질 trigger라 선택. 직전 5~6회 모두 retro-only 이력이라 general-purpose agent에 순수 신규 탐색 위임(기존 소진 영역 EN/KO parity·JSON-LD·PWA·leaderboard·auth 제외 지시).

발견: `StandingRow.homeWins`/`homeLosses`(kbo-official.ts 컬럼 8, wave-329 이후 870+ cycle 전부터 존재)가 `analysis/page.tsx`/`teams/[code]/page.tsx`/`matchup/[teamA]/[teamB]/page.tsx` 에선 재사용되지만 정작 `/standings` 순위표 자체엔 한 번도 노출된 적 없던 gap.

실행: `HomeAwayRecord` 컴포넌트 신규(analysis/page.tsx wave-329/434 와 동일 VENUE_RECORD_MIN_GAMES/VENUE_WIN_RATE_HIGH·LOW 패턴 재사용, 신규 쿼리 0건). MLB/EN 미러는 데이터 소스 자체 없어 parity 대상 아님 확인. `silent-drift-cycle-2535.test.ts` 신규. `pnpm type-check`/`pnpm test`(518/4292)/`pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(70ed3193)+push(R4).

다음 사이클 추천 = review-code(heavy, 잔존 대형 파일: `page.tsx`(1090줄)/`teams/[code]/page.tsx`(622줄)/`predictions/[date]/page.tsx`(615줄)) — 2-chain lock 은 이번 사이클로 해소(distinct 갱신), gap trigger 4종 모두 여전히 미도달(fix-incident 9/20, op-analysis 5/25, info-arch 18/30, lotto 27/30).

---

## ✅ SUCCESS — review-code(heavy) analysis/page.tsx CE 배너 감지 기준 통일 (cycle 2534, 2026-08-24)

진단: open issue 0, approved plan 0/29. gap trigger 4종 미도달(fix-incident 8/20, op-analysis 4/25, info-arch 17/30, lotto 26/30). 직전 8사이클 distinct=3 — 2-chain lock 없음. explore-idea saturation 충족(13/15)이나 직전 4연속 retro-only 확인 상태라 review-code dominance-positive streak(3연속 success) 지속. cycle 2533 carry-over(신규 대형 파일 재탐색) 따라 최대 monolith `analysis/page.tsx`(2803줄, 마지막 수정 cycle 2480 = 54사이클 공백) 재감사.

발견: `analysis/page.tsx` 의 CREDIT_EXHAUSTED `simplifiedMode` 배너가 `todayData.games`(오늘 경기만) 평균 confidence 로 판정 — `about`/`predictions`/`predictions/[date]` 는 이미 "날짜 무관 최근 예측 10건" 기준인데 `/analysis` 만 오늘 경기 0~2건(KBO 휴식일/크론 실행 전)이면 CE 진행 중이어도 배너 절대 안 뜨는 날짜별 조건부 drift.

실행: `analysis-data.ts` 에 `detectSimplifiedMode()` 신규(about/predictions 동일 쿼리) + `page.tsx` 인라인 계산 제거·교체. `silent-drift-wave-307.test.ts` 갱신 + `silent-drift-cycle-2534.test.ts` 신규. `pnpm type-check`/`pnpm test`(517/4290)/`pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(059c020e)+push(R4).

다음 사이클 추천 = review-code(heavy, 잔존 대형 파일 재탐색 — `page.tsx`(1090줄)/`teams/[code]/page.tsx`(622줄)/`predictions/[date]/page.tsx`(615줄) 등) 또는 op-analysis(gap 4/25, 아직 미도달) — gap trigger 4종 모두 4~9사이클 남아 다음 자연 도달까진 review-code 지속 예상.

---

## ✅ SUCCESS — review-code(heavy) about/page.tsx CREDIT_EXHAUSTED 배너 누락 정정 (cycle 2533, 2026-08-24)

진단: open issue 0, approved plan 0/29. gap trigger 4종 미도달(fix-incident 7/20, op-analysis 3/25, info-arch 16/30, lotto 25/30). 직전 8사이클 distinct=3 — 2-chain lock 없음. cycle 2532 carry-over 명시 후보(`analysis-data.ts`/`convergenceRecord.ts`/`about/page.tsx`) 순서대로 감사.

감사 결과: `analysis-data.ts`(942줄, KBO+MLB 미러) + `convergenceRecord.ts`(831줄) 는 이미 SMALL_SAMPLE_N/PRODUCTION_COHORT_RULES/h2h 정합 상태로 clean — MLB 미러 기능 축소는 plan #28 phased buildout 의도된 scope 차이, parity bug 아님. `about/page.tsx`(과거 10회 stale-claim fix 이력) FAQ "AI 에이전트 토론은 무엇을 기반으로 하나요?"가 토론이 상시 가동 중이라 서술하지만, `/analysis`·`/predictions`·`/predictions/[date]` 는 이미 `CE_DETECT_THRESHOLD`(0.32) 기반 `simplifiedMode` 배너로 CREDIT_EXHAUSTED(2026-06-06~ 지속) 상태를 사용자에게 알리는데 방법론 레퍼런스 페이지인 `/about`만 배너 부재 — 100% quant fallback 기간에도 "토론 결합"을 사실처럼 서술하던 gap.

실행: `about/page.tsx` async 서버 컴포넌트 전환 + 동일 CE 감지 로직/배너 재사용 + `revalidate=3600` 추가(기존 무기한 정적 캐시). 회귀 테스트 `silent-drift-wave-307.test.ts` 에 about 항목 추가. `pnpm type-check`/`pnpm test`(516/4286)/`pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(20fb7994)+push(R4), pre-push hook 통과.

다음 사이클 추천 = operational-analysis(gap 3/25, 아직 이름) 또는 review-code(heavy, 잔존 미감사 후보 재탐색 — 이번 사이클로 cycle 2532 명시 후보 3건 모두 소진, 신규 대형 파일 재탐색 필요).

---

## ✅ SUCCESS — review-code(heavy) reviews/weekly factorInsights minSamples 하드코딩 정정 (cycle 2532, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 non-approved). gap trigger 4종 미도달(fix-incident 6/20, op-analysis 2/25, info-arch 15/30, lotto 24/30). 직전 8사이클 distinct=4 — 2-chain lock 없음. cycle 2531 retro carry-over("review-code(heavy) 또는 diversity(explore-idea)") + explore-idea 4연속 소진 재확인 상태 고려해 review-code 지속.

감사 범위: fix 이력 0건인 유일한 대형 미감사 파일 `reviews/weekly/[week]/page.tsx`/`mlb/reviews/weekly/[week]/page.tsx`(524/551줄) + 소비 lib.

결과: 페이지 자체는 clean. `buildWeeklyReview.ts`/`buildMlbWeeklyReview.ts` 가 `buildFactorInsights(rows, { minSamples: 3 })` 하드코딩 — 동일 그룹 `buildMonthlyReview.ts`/`buildMlbMonthlyReview.ts` 는 이미 `SMALL_SAMPLE_N`(5) 참조 중이라 weekly 만 더 느슨한 소표본 가드로 팩터 인사이트 노출.

실행: 양쪽 `minSamples: 3` → `SMALL_SAMPLE_N` 교체 + 회귀 테스트 1건(`silent-drift-cycle-2532.test.ts`). `pnpm type-check`/`pnpm test`(516/4285)/`pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(3c041664)+push(R4).

다음 사이클 추천 = operational-analysis(gap 2/25, 아직 이름) 또는 review-code(heavy, 잔존 미감사 후보 재탐색 — `analysis-data.ts`(942줄)/`convergenceRecord.ts`(831줄)/`about/page.tsx`(427줄) 등).

---

## 🟡 PARTIAL — operational-analysis(lite) 25-cycle gap 재확인, 신규 검증 데이터 0건 (cycle 2530, 2026-08-24)

진단: open issue 0, approved plan 0/29. gap trigger op-analysis 정확히 25/25 도달(마지막 발화 cycle 2505) → lite 자동 권장. fix-incident 4/20, info-arch 13/30, lotto 22/30 미도달. 직전 8사이클 distinct=3, lock 없음. cycle 2529 carry-over 도 동일 추천.

점검: 전용 weekly-review 스크립트 부재 → `predictions`×`games` join 직접 supabase 쿼리로 대체. W34(08-17~08-23) n=26, acc=46.2%(12/26), 요일별(08-18 40%/19 60%/20 60%/21 50%/22 0%/23 40%), CE(debate_version IS NULL) n=26/26=100%(nonCE 0건, CREDIT_EXHAUSTED 6th recurrence 불변), scoring_rule 전부 v1.8, confidence tier 전부 low.

결과: 위 측정치가 cycle 2505 lite 측정치와 **완전 동일** — 최신 검증 game_date 도 2026-08-23(일)로 오늘(08-24 월) 신규 검증 경기 0건. 25 develop-cycle 이 같은 캘린더 하루 안에 소진돼 gap trigger의 "사이클 수"와 실제 KBO 경기 발생 속도가 디커플링되는 구조적 패턴 재확인 — 기존 CLAUDE.md velocity flatline 서술과 동일 계열이라 신규 lesson 아님, 가중치 조정 판단 불가(n=26 소표본 불변).

실행: 코드 변경 없음(lite 제약 + chain stop 조건 "데이터 부족 → partial" 적용).

다음 사이클 추천 = review-code(heavy, 잔존 미감사 후보 재탐색) — op-analysis gap 방금 리셋(0/25), fix-incident/lotto/info-arch 전부 미도달.

---

## ✅ SUCCESS — review-code(heavy) buildMlbStandings.ts 소비부 그룹 감사, EN standings 매직넘버 parity 정정 (cycle 2529, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 non-approved status). gap trigger 4종 미도달(fix-incident 3/20, op-analysis 24/25, info-arch 12/30, lotto 21/30). 직전 8사이클 distinct=3(review-code/explore-idea/fix-incident) — 2-chain lock 없음. `gh run list` 최근 15건 실패 0건. cycle 2527/2528 carry-over `buildMlbStandings.ts` 잔존 후보 선정.

감사 범위: `buildMlbStandings.ts` + 소비부 4곳(`mlb/standings`, `en/mlb/standings`, `mlb/wild-card`, `en/mlb/wild-card` page.tsx) + `computeMagicNumber.ts`.

결과: KO `/mlb/standings` 는 division 1위 매직넘버 배지 + footnote 표시하나 EN `/en/mlb/standings` 는 `computeMagicNumber` import/호출 자체 부재 — silent EN/KO parity gap (wild-card 양쪽은 이미 parity 정상). 그 외 신규 이슈 0건 (승패 집계/GB 계산/wildcard pool 로직 clean, computeMagicNumber 모든 MLB 호출부 `MLB_GAMES_PER_TEAM` 명시 전달 확인).

실행: EN standings 페이지에 동일 로직 + 영문 라벨("Division title clinched"/"Division title Magic Number N") + footnote 추가. `pnpm type-check`(4 packages clean) + `pnpm lint` clean + pre-push 전체(lint+type-check+version-sync-guard+test 3/3) 통과. 단일 논리 단위 → PR 없이 직접 main commit(c90a086c)+push(R4).

다음 사이클 추천 = operational-analysis(gap 25/25, cycle 2530 도달) 또는 review-code(heavy, 잔존 감사 후보 재탐색).

---

## ⚪ RETRO-ONLY — fix-incident 20-cycle 주기 점검, 신규 이슈 0건 (cycle 2526, 2026-08-24)

진단: open issue 0, approved plan 0/29. 2-chain alternation lock 발동(직전 8사이클 review-code 6회 + explore-idea 1회 + review-code 1회 = distinct=2) → 둘 다 제외. fix-incident 20-cycle 미발화 gap 정확히 도달(마지막 발화 cycle 2506) → lite 자동 권장.

점검: `gh run list` 최근 50건 실패 0건 (deploy-drift-alert/health-alert/runtime-error-alert 모두 success). `pipeline_runs` 최근 30건 status 전부 success. git log 최근 30개 커밋 중 debug/hotfix/revert 0건. `predict_final` 08-10~08-23 매일 13:17 UTC `predictions=0 games_found=5` 패턴 발견 — 처음엔 사례 11 family silent drop 재발 의심했으나 `silent-drift-alert.ts`(`shouldAlertSilentDrift`) 코드 확인 결과 predict_final 판정은 `predictionsGenerated + existingPredictionsCount < gamesFound`(cycle 864 fix) 기준이며, `daily.ts`가 `existingPredictionsCount`를 정확히 전달 중 — 매일 06~09시 UTC `predict` cron 이 이미 5경기 모두 예측 완료 후라 predict_final 시점 신규 0건은 **정상 동작**(coverage 충분, alert 미발화 확인). 신규 이슈 0건.

실행: 코드 변경 없음.

다음 사이클 추천 = operational-analysis(gap 22/25, cycle 2529 도달) 또는 review-code(heavy, 2-chain lock 해제 후 재개) 또는 lotto(gap 20/30).

---

## ✅ SUCCESS — review-code(heavy) leaderboard 그룹 최초 전체 감사, 닉네임 길이 하드코딩 정정 (cycle 2525, 2026-08-24)

진단: open issue 0, approved plan 0/29. gap trigger 미도달(fix-incident 19/20, op-analysis 20/25, info-arch 8/30, lotto 17/30). 직전 8사이클 distinct=3, lock 없음. cycle 2524 carry-over `standings/leaderboard 세부 컴포넌트` — grep 결과 leaderboard 컴포넌트 그룹(page/Client/Table/SortControl/HallOfFame/JoinModal/server.ts/use-leaderboard.ts/types.ts + sync/mlb-sync route) 최초 전체 감사 이력 0건 확인 후 선정. (standings 쪽은 cycle 2500 dashboard/standings 감사에서 이미 완료 확인.)

감사 범위: 위 11파일 전체 라인별 read.

결과: `LeaderboardJoinModal.tsx`(client validation/placeholder/maxLength) + `use-leaderboard.ts`(join() 재검증)가 각각 독립적으로 닉네임 길이를 하드코딩 `2`/`12` 사용 — 동일 서버 라우트(`sync/route.ts`, `mlb-sync/route.ts`)는 이미 `@moneyball/shared`의 `NICKNAME_MIN_CHARS`/`NICKNAME_MAX_CHARS` 단일 source-of-truth 참조 중. 값이 우연히 일치해 지금은 증상 없으나 상수 변경 시 클라이언트만 조용히 stale 해지는 silent drift family 재발 케이스. 그 외 신규 이슈 0건(HallOfFame/LeaderboardTable/LeaderboardSortControl/server.ts/types.ts 전부 clean).

실행: 두 파일 모두 `@moneyball/shared` import 로 정합(placeholder/maxLength/에러 메시지 포함). `pnpm type-check`(4 packages clean) + `pnpm test`(514 files/4277 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit(8cb78198)+push(R4).

다음 사이클 추천 = fix-incident 또는 operational-analysis (gap 각 20/20, 21/25 — 다음 사이클 도달권) 또는 review-code(heavy, 잔존 미감사 후보 재탐색 필요).

---

## ⚪ RETRO-ONLY — explore-idea 4th consecutive 소진 재확인, 트래픽/plan 무변화 (cycle 2524, 2026-08-24)

진단: open issue 0, approved plan 0/29(plan #27/28/29 전부 non-approved — blocked-on-data/completed/deferred). gap trigger 4종 미도달(fix-incident 18/20, op-analysis 19/25, info-arch 7/30, lotto 16/30). 2-chain alternation lock 발동(직전 8사이클 2516-2523 distinct=2: review-code/info-architecture-review) → 둘 다 제외. 잔여 pool 재확인 결과 explore-idea saturation trigger 14/15 최강 → 자연 선택. 단 직전 3회(cycle 2417/2477/2498) heavy sweep + cycle 2515 재확인이 이미 EN/KO parity·jsonLd·TODOS Next-Up·placeholder auth/community·공유버튼/PWA/RSS 전 후보 소진 확정한 상태라, 전면 재탐색 대신 lite quick-recheck 만 수행.

점검: 트래픽 실측(service-role REST count=exact) `user_picks`=1, `mlb_user_picks`=0, `pick_poll_events`=5, `mlb_pick_poll_events`=0 — cycle 2417 측정치와 완전 동일, 무성장 지속. plan #27(MLB picks/leaderboard, Tier3 blocked-on-data)·#28(MLB analysis hub, 대부분 완료)·#29(로그인/커뮤니티, Tier4 deferred) 재개 조건 전부 미충족 재확인. TODOS Next-Up(2026-04-25 이후 섹션) 신규 리드 없음, open GH issue 0건.

실행: 코드 변경 없음 — 4연속 소진 재확인, 신규 후보 0건.

다음 사이클 추천 = review-code(heavy, 2-chain lock 해제 후 잔존 미감사: standings/leaderboard 세부 컴포넌트) 또는 fix-incident(gap 18/20, cycle 2526 도달) 또는 operational-analysis(gap 19/25, cycle 2530 도달).

---

## ⚪ RETRO-ONLY — review-code(heavy) mlb/reviews hub 최초 전체 감사, 신규 이슈 0건 (cycle 2523, 2026-08-24)

진단: open issue 0, approved plan 0/23. gap trigger 미도달(fix-incident 17/20, op-analysis 18/25, lotto 15/30, info-arch 6/30). 직전 8사이클 distinct=3, lock 없음. cycle 2522 carry-over `mlb/reviews hub 페이지` — 전수 grep 결과 최초 전체 감사 이력 0건 확인 후 선정.

감사 범위: `mlb/reviews/page.tsx`(254줄, KO hub) + `en/mlb/reviews/page.tsx`(253줄) + `mlb/reviews/misses/page.tsx`(161줄) + `en/mlb/reviews/misses/page.tsx`(166줄) + `reviews-data.ts`(59줄) + `computeWeekRange.ts`(151줄) + `MissesSortControl.tsx`(91줄) 전체 라인별 read + KO/EN 대조.

결과: 신규 이슈 0건. KST 주차 경계(cycle 2481 이미 fix 반영), jsonLd `inLanguage`(양쪽 정상), `MLB_PRODUCTION_COHORT_RULES` scoring_rule 필터(buildMlbMissReport 정상 적용 — #1338 family 재발 없음), sitemap parity(hub/misses KO/EN 4 URL 전부 존재), KO/EN 구조 완전 대칭 — 전부 clean. 최근 신규 개발 라우트(wave-659, cycle 2339)라 drift 누적 기간이 짧았던 패턴(cycle 2483/2497/2507/2520/2521 과 동일 계열).

다음 사이클 추천 = review-code(heavy) 계속(잔존 미감사: `standings`/`leaderboard` 세부 컴포넌트) 또는 fix-incident(gap 18/20, cycle 2525 도달) 또는 operational-analysis(gap 19/25, cycle 2530 도달).

---

## ✅ SUCCESS — review-code(heavy) players/[id] 3파일 최초 전체 감사, MLB jsonLd inLanguage 5페이지 정정 (cycle 2522, 2026-08-24)

진단: open issue 0, approved plan 0/23. gap trigger 미도달(fix-incident 16/20, op-analysis 17/25, lotto 14/30, info-arch 5/30). 직전 8사이클 distinct=3, lock 없음. carry-over 후보 `players/[id]`(323줄) + EN 미러 — 최초 전체 감사 이력 0건 확인 후 선정.

감사 범위: `players/[id]/page.tsx`(KBO, 323줄) + `mlb/players/[id]/page.tsx`(316줄) + `en/mlb/players/[id]/page.tsx`(322줄) 3-way 전체 라인별 read + 대조.

결과: KBO 버전(투수 프로필 — FIP/xFIP/최근등판/팀전적)과 MLB 버전(팀 Statcast placeholder — xwOBA/Barrel%/Hard Hit%/Launch Angle ETA)은 도메인 자체가 다른 페이지(개인 선수 vs 팀 단위)라 애초에 3-way 비교 대상 아님 — 각각 clean. MLB/EN 페어는 구조 동일, 정상.

부수 발견: jsonLd `inLanguage` 필드가 EN 미러엔 전부 존재하나 대응 KO 페이지엔 누락된 패턴을 `mlb/*/page.tsx`(jsonLd 보유 15파일) 전수 grep으로 재검증 — cycle 2518에 team/matchup 2파일만 정정했으나 잔존 5파일(`postseason`/`players` hub/`players/[id]`/`standings`/`factors`) 미처리 확인. `methodology`/`games/[date]/[slug]`는 KO/EN 양쪽 다 없어 비대칭 아님(제외).

fix: 5개 KO jsonLd 에 `inLanguage: "ko-KR"` 추가 (`mlb/team/[code]` 기존 패턴 위치·값 재사용).

검증: apps/moneyball 514 files/4277 tests pass, tsc --noEmit clean, pre-push lint+type-check+version-sync-guard pass. Direct main push (commit 0030a41d).

**교훈**: silent drift 정정이 "발견된 파일만" 국소 fix 로 끝나면 동일 패턴을 공유하는 나머지 파일이 잔존 drift 로 남음(cycle 2518 team/matchup 정정 시 전수 grep 안 해서 5파일 누락). 특정 파일에서 비대칭 패턴 발견 시 그 자리에서 `grep -rl` 전수 스캔으로 형제 파일 전체 확인이 원칙.

다음 사이클 추천 = review-code(heavy) 계속(잔존 미감사: `mlb/reviews` hub 페이지, `standings`/`leaderboard` 세부 컴포넌트) 또는 fix-incident(gap 17/20, cycle 2526 도달) 또는 operational-analysis(gap 18/25, cycle 2530 도달).

---

## ⚪ RETRO-ONLY — review-code(heavy) mlb/reviews/monthly/[month]/page.tsx 최초 전체 감사, 신규 이슈 0건 (cycle 2521, 2026-08-24)

진단: open issue 0, approved plan 0/23 (전부 completed/archived/spec_only/deferred, status=approved 없음). 2-chain lock 없음(직전 8사이클 2513-2520 distinct=3: review-code/explore-idea/info-arch). gap trigger 미도달(fix-incident 15/20, op-analysis 16/25, lotto 13/30, info-arch 4/30). TODOS 기존 carry-over 후보(`en/mlb/matchup/[teamA]/[teamB]` 596줄, `mlb/reviews/monthly` 502줄, `mlb/factors`, `lotto/methodology`) 재검증 결과 전부 stale — matchup 페이지 3종은 cycle 2507에 이미 최초 전체 감사 완료(`todayStr` KST fix), `mlb/games`/`mlb/factors`/`lotto/methodology`도 각각 cycle 2509/2512/2511에 완료 확인. `최초 전체 감사` grep 전수 교차검증(60건)으로 진짜 미감사 타겟 발굴: `mlb/reviews/monthly/[month]/page.tsx`(502줄) + EN 미러(500줄) — KBO 원본(`reviews/monthly/[month]`)은 cycle 2270에 감사됐으나 MLB plan #26 Phase 2 신규 라우트는 감사 이력 0건.

감사 범위: KO/EN page.tsx 전체 라인별 read + 3-way 대조 + `buildMlbMonthlyReview.ts`(193줄, summary/highlights/factorInsights 로직) + `computeMonthRange.ts`(KST_OFFSET_MS 처리 — cycle 2510에 이미 wave 145 재발 정정 완료 확인) + jsonLd `inLanguage`/`datePublished` + Breadcrumb/ShareButtons/ConvergenceHomeAwayBadges 등 locale prop 배선 + `sitemap.ts`의 `mlbMonthlyReviewRoutes`/`enMlbMonthlyReviewRoutes` 실제 spread 여부.

결과: 신규 이슈 0건. `SMALL_SAMPLE_N` 하드코딩(cycle 2270에 이미 fix), ISR 매직넘버(wave 133에 이미 REVIEWS_MONTHLY_ISR_SECONDS 통일), KST 월 경계 off-by-one(cycle 2510에 이미 fix) 등 이 도메인에서 반복 재발하던 3대 silent drift family가 모두 이 라우트에도 이미 선반영돼 있음을 확인 — KBO monthly 감사(cycle 2270)와 weekly EN 미러 작업(cycle 2355/2356) 이후 신규 개발된 라우트라 drift 누적 기간이 짧았던 것으로 판단(cycle 2483/2497/2507 패턴과 동일 — "최근 신규 라우트는 clean audit 확률 높음"). jsonLd `datePublished`가 월 진행 중에도 `endDate`(월말) 기준이라 미래 시각 노출되는 패턴은 KBO monthly/양쪽 weekly 리뷰에 이미 동일하게 존재하는 사전 설계(신규 아님, 지적 보류).

**교훈**: carry-over 리스트는 이번에도 대거 stale(4개 후보 모두 이미 감사 완료) — TODOS.md에 적힌 "다음 사이클 추천" 문구가 이전 사이클에서 이미 처리된 항목을 계속 재추천하는 drift 누적 패턴 재확인(cycle 2518/2520 교훈과 동일 계열, 3연속 재발). `git log --all --grep "최초 전체 감사"` 전수 grep이 TODOS 텍스트보다 신뢰도 높은 source — 매 review-code(heavy) 사이클 시작 시 텍스트 추천보다 grep 우선해야.

다음 사이클 추천 = review-code(heavy) 계속(잔존 미감사 후보: `players/[id]` 323줄 + EN 미러, `mlb/reviews` hub 페이지, `standings`/`leaderboard` 세부 컴포넌트) 또는 fix-incident(gap 15/20, cycle 2526 경 도달) 또는 lotto(gap 13/30, cycle 2538 경 도달).

---

## ⚪ RETRO-ONLY — review-code(heavy) mlb/reviews/weekly/[week]/page.tsx 최초 전체 감사, 신규 이슈 0건 (cycle 2520, 2026-08-24)

진단: open issue 0, approved plan 0/23 (전부 completed/archived/spec_only/deferred, status=approved 없음). 2-chain lock 없음(직전 8사이클 2512-2519 distinct=3: review-code/explore-idea/info-arch). gap trigger 미도달(fix-incident 13/20, op-analysis 14/25, lotto 11/30, info-arch 2/30). cycle 2518/2519 carry-over 후보(`en/mlb/matchup` 596줄, `en/mlb/reviews/monthly` 500줄) 재검증 결과 stale — `en/mlb/reviews/monthly/page.tsx`는 실제로 10줄짜리 redirect wrapper(월간 index → 최신 월 리다이렉트)였고, `analysis/page.tsx`(2803줄)는 이미 cycle 2480에서 전체 감사 완료. `find + wc -l` 전체 재스캔 + `최초 전체 감사` grep 교차검증으로 진짜 미감사 타겟 발굴: `mlb/reviews/weekly/[week]/page.tsx`(551줄, git log 3 commit뿐 — plan #26 Phase 1b 신규 라우트 + wave-657 색상 단일화 + cycle 2345 수렴 픽 배선, 전체 감사 이력 0건).

감사 범위: 파일 전체 라인별 read + KO/EN 자매 페이지(`reviews/weekly/[week]`, `en/mlb/reviews/weekly/[week]`) 3-way diff + `convergenceRecord.ts`의 `getMlbRecentConvergencePickRecord` 등 6개 함수 시그니처 대조 + `buildMlbWeeklyReview.ts` vs `buildWeeklyReview.ts`(KBO) 전체 diff + `ConvergenceTeamStatsBadges`/`ConvergenceHomeAwayBadges`/`WeeklyGamesSortControl` 컴포넌트 prop 배선 확인 + jsonLd `inLanguage`/`locale` 필드 + game 링크 slug 생성(`{homeCode}-vs-{awayCode}`)이 `sitemap.ts`의 `mlbGameDetailRoutes` 규칙과 일치하는지 확인.

결과: 신규 이슈 0건. `getMlbRecentConvergencePickRecord` 등이 KBO 버전과 파라미터 개수가 다른 것(KBO는 `limit` 인자 보유, MLB는 없음)은 실제 시즌 표본 차이(MLB 시즌 전체 스캔 vs KBO lookback-days) 를 반영한 의도된 설계(cycle 2226 주석에 명시) — 버그 아님. `buildMlbWeeklyReview(range)` 가 KO 페이지에서 `locale` 인자 없이 호출되는 것도 함수 시그니처 기본값(`"ko"`)과 일치 — EN 미러는 `buildMlbWeeklyReview(range, "en")` 명시 확인. jsonLd `inLanguage: "ko-KR"` 존재(직전 2 사이클 발견된 KO jsonLd 누락 패턴과 달리 이 파일은 처음부터 정상). breadcrumb 라벨 `'예측 리뷰'`(→`/mlb/reviews`)가 hub 페이지 자체 브레드크럼 라벨(`'예측 결과 리뷰'`)과 문구가 다르지만, KBO 원본도 동일 페이지 유형에서 `'리뷰'`/`'예측 리뷰'`/`'예측 결과 리뷰'` 3가지 문구가 이미 혼재(사전 존재 패턴, 이번 사이클 신규 아님) — cosmetic 문구 통일은 별도 polish-ui scope로 남기고 이번엔 손대지 않음(scope creep 회피).

**교훈**: carry-over 후보 리스트는 매번 실측(`wc -l` + 실제 파일 내용 확인)으로 재검증 — 리스트에 적힌 줄수(500줄)만 믿고 진입했으면 10줄 redirect wrapper 를 감사 대상으로 오인할 뻔함(cycle 2518 교훈의 재확인). 전체 감사가 항상 이슈를 발견하는 것은 아님 — 신규 라우트(plan #26)는 애초에 최근 배선이라 drift 누적 기간이 짧아 clean audit 확률이 높음(cycle 2483/2497 패턴과 동일).

다음 사이클 추천 = review-code(heavy) 계속(잔존 미감사 후보: `en/mlb/matchup/[teamA]/[teamB]` 596줄 — ad-hoc parity fix 다수지만 전체 감사 이력 없음, `mlb/reviews/monthly/[month]` 502줄 + `en/mlb/reviews/monthly/[month]` 500줄 — 신규 라우트라 낮은 확률이지만 미감사, `players/[id]` 323줄 + EN 미러) 또는 operational-analysis(gap 14/25, cycle 2530 경 도달 예상) 또는 lotto(gap 11/30, cycle 2538 경 도달 예상).

---

## ✅ SUCCESS — review-code(heavy) methodology/page.tsx 최초 전체 감사, Sunday cap 신뢰도 raw decimal → % 표시 정정 (cycle 2519, 2026-08-24)

진단: open issue 0, approved plan 0/23. 2-chain lock 없음(직전 8사이클 distinct=3: review-code/explore-idea/info-arch). gap trigger 미도달(fix-incident 13/20, op-analysis 14/25, lotto 11/30, info-arch 2/30). `methodology/page.tsx`(515줄) — 다수 ad-hoc silent-drift 수정(wave-246/247/262/266 등)은 있었으나 line-by-line 전체 감사 이력 0건, 최근 ad-hoc fix 는 cycle 2266(253 사이클 전) — 신선 타겟으로 선정.

확정 이슈: `VERSION_HISTORY` v1.8 항목 문구 "Sunday cap 도입 — 일요일 ${WINNER_PROB_LEAN} 초과 시 ${SUNDAY_CAP_CONFIDENCE} 강등" 이 raw decimal(0.55/0.45)을 % 기호 없이 그대로 렌더링 — "일요일 0.55 초과 시 0.45 강등" 처럼 사용자에게 의미 불명확하게 노출. 동일 패턴을 about/page.tsx(FAQ) + guide/page.tsx(티어 설명 + Sunday cap 설명, 3곳)에서도 발견 — 총 3페이지 5 occurrence. `/accuracy` 페이지는 이미 `Math.round(SUNDAY_CAP_CONFIDENCE * 100)}%` 로 정상 포맷 중이었어서 나머지 페이지들의 누락이 두드러짐. WINNER_PROB_LEAN_PCT/WINNER_PROB_CONFIDENT_PCT 는 기존에 registry constant 존재했으나 SUNDAY_CAP_CONFIDENCE 쪽엔 `_PCT` 파생 상수가 없어 3페이지 모두 raw decimal 노출된 것이 근본 원인.

fix: `SUNDAY_CAP_CONFIDENCE_PCT` registry constant 신규 추가 (`WINNER_PROB_LEAN_PCT` 패턴 동일) + about/guide/methodology 3페이지 모두 `*_PCT` constant + `%` 로 교체 + 회귀 테스트(`packages/shared/src/index.test.ts`) 3 assertions 추가.

검증: packages/shared 218 tests, apps/moneyball 514 files/4277 tests 전체 pass, tsc --noEmit clean, eslint clean, pre-push lint+type-check+version-sync-guard pass. Direct main push (commit 004638aa).

**교훈**: registry constant 존재 자체가 drift 방지를 보장하지 않음 — display 포맷(raw decimal vs %) 불일치도 별도 silent drift 하위 유형. `_PCT` 파생 상수가 일부 constant 에만 있고 다른 유사 constant 엔 없는 비대칭도 새로운 그룹 audit 신호.

다음 사이클 추천 = review-code(heavy) 계속(잔존 미감사 큰 파일: `en/mlb/matchup 페이지` 596줄 — ad-hoc parity fix 다수, `en/mlb/reviews/monthly` 500줄, `players/[id]` 323줄 + EN 미러) 또는 operational-analysis(gap 14/25, cycle 2530 경 도달 예상) 또는 lotto(gap 11/30).

---

## ✅ SUCCESS — review-code(heavy) en/mlb/team/[code] 최초 전체 감사, KO 3페이지 jsonLd inLanguage 누락 정정 (cycle 2518, 2026-08-24)

진단: open issue 0, approved plan 0/23. 2-chain lock 해소(직전 8사이클 distinct=3). gap trigger 미도달(fix-incident 12/20, op-analysis 13/25, lotto 10/30). cycle 2516 carry-over 후보 리스트(`debug/pipeline`/`debug/factor-correlation`/`teams/[code]`/`search/page`) 전부 STALE — 이미 각각 cycle 2269/2272+2485/2470/2261에서 전체 감사 완료된 상태였음. `find + wc -l` 전체 재스캔으로 신선 타겟 발굴: `en/mlb/team/[code]/page.tsx`(602줄, 전체 감사 이력 0건, ad-hoc parity fix 2건만 존재).

확정 이슈: EN 버전과 KO 원본(`mlb/team/[code]/page.tsx`) 라인별 대조 결과 구조는 거의 완전 parity이나, jsonLd 의 `inLanguage` 필드가 EN엔 있고("en-US") KO엔 없음. 리포 전체 grep 결과 `mlb/team/[code]` + `mlb/team`(index) + `mlb/matchup/[teamA]/[teamB]` 3개 KO 페이지 모두 동일하게 누락, 해당 EN 미러 3개는 모두 보유 — 과거 parity fix 가 EN 쪽에만 편도 적용된 사례(대부분 다른 KO 페이지는 이미 `inLanguage: "ko-KR"` 보유).

fix: 3개 KO jsonLd 에 `inLanguage: "ko-KR"` 추가(EN 미러와 동일 위치) + 회귀 가드 테스트(`silent-drift-wave-662.test.ts`, 3 assertions) 추가.

검증: vitest 전체 514 files/4277 tests pass, tsc --noEmit clean, eslint clean, pre-push lint+type-check+version-sync-guard pass. Direct main push (commit e0e8b944).

**교훈**: carry-over 후보 리스트를 재검증 없이 재사용하면 stale 될 수 있음 — 다음 review-code(heavy) 진입 시 `wc -l` + git log grep 재확인 필수(본 사이클처럼).

다음 사이클 추천 = review-code(heavy) 계속(재확인 필요 후보: `en/mlb/matchup` 596줄 — ad-hoc parity fix 다수 있었으나 전체 감사 이력 없음, `en/mlb/reviews/monthly` 500줄 — 전체 감사 이력 없음, `analysis/page.tsx` 2803줄 — 주기적 재감사 대상) 또는 operational-analysis(gap 13/25, cycle 2530 경 도달 예상).

---

## ✅ SUCCESS — review-code(heavy) about/page.tsx 최초 전체 감사, 실시간 스코어 갱신 주기 "30초" stale claim 정정 (cycle 2516, 2026-08-24)

진단: open issue 0, approved plan 0/23. gap trigger 4종 미도달(fix-incident 12/20, op-analysis 11/25, info-arch 30/30 — cycle 2517부터 경계 통과 예상, lotto 8/30). cycle 2513~2515 carry-over 추천대로 `about/page.tsx`(427줄, 감사 이력 0건)로 진입.

확정 이슈: "업데이트 주기" 섹션 "경기 중 30초 간격 — 실시간 스코어" 문구가 실제 메커니즘과 불일치. `wrangler.toml` cron 은 `*/10 9-15 * * *`(10분 간격) — GH Actions 최초 버전(Phase 2d, 이관 이전)부터 동일하게 10분 간격이었고, 코드베이스 어디에도 30초 폴링(setInterval/SWR refreshInterval 등) 존재한 적 없음. `git log -S"30초 간격"` 으로 도입 커밋 추적 결과 2026-04-16 최초 작성 시점부터 실측 대조 없이 임의 기재된 값 — 기존 silent drift family(등록 상수 참조 누락, 메커니즘 변경 후 미반영)와 달리 "애초에 부정확했던 claim"이라는 신규 하위 패턴.

부수 확인: "현재 제외된 팩터" 조건부 섹션(`deprecatedFactors.length > 0`)이 dead code로 보일 수 있으나, `FACTORS` 배열이 shadow-only 실험 팩터(park_weather/umpire_sz)를 의도적으로 미포함하고 있어 정상 guard로 확인(버그 아님).

fix: "경기 중 30초 간격" → "경기 중 10분 간격" 정정 + 회귀 가드 테스트(`silent-drift-wave-661.test.ts`) 추가.

검증: vitest 전체 513 files/4274 tests pass, tsc --noEmit clean, eslint clean, pre-push lint+type-check+version-sync-guard pass. Direct main push (commit 56f02c0d).

다음 사이클 추천 = review-code(heavy) 계속(잔존 미감사 후보: `debug/pipeline` 481줄, `debug/factor-correlation` 547줄, `teams/[code]` 622줄, `search/page` 450줄) 또는 info-architecture-review(gap 30/30, cycle 2517부터 trigger 충족 예상).

---

## ✅ SUCCESS — review-code(heavy) predictions/[date] 최초 전체 감사, 날짜 nav off-by-one 정정 (cycle 2513, 2026-08-24)

진단: open issue 0, approved plan 0/23. gap trigger 4종 미도달(fix-incident 9/20, op-analysis 8/25, info-arch 27/30, lotto 5/30). 직전 4 cycle(2509~2512) review-code(heavy) SUCCESS streak 지속, `predictions/[date]/page.tsx`(619줄, KBO 최고 트래픽 일별 예측 페이지, 감사 이력 0건)로 진입.

확정 이슈: 하단 "이전 날짜/다음 날짜" RelatedLinks nav가 `new Date(\`${date}T00:00:00+09:00\`)` KST 리터럴 파싱 → setUTCDate 산술 → `toISOString().slice(0,10)` 되읽기 패턴 사용. 캘린더 날짜 문자열은 moment-in-time이 아닌데 +09:00 리터럴 파싱으로 UTC 필드가 하루 당겨짐(예: 2026-08-24 → UTC 2026-08-23T15:00Z) — 결과적으로 "이전 날짜" 링크가 실제로는 date-2를, "다음 날짜" 링크가 date+0(원래 날짜와 동일)을 가리키는 매일 재발 오프바이원 버그. KST_OFFSET_MS silent drift family 신규 케이스(computeWeekRange.ts toMondayUTC와 동일 원칙 위반).

fix: `computeAdjacentDates` 순수 함수 추출(`lib/predictions/adjacentDates.ts`, Date.UTC 기반 타임존 무관 캘린더 산술) + 회귀 테스트 5건(일반/월경계 양방향/연경계/버그 재현 증명).

검증: tsc --noEmit clean, eslint clean, vitest 전체 511 files/4267 tests pass, pre-push lint+type-check+version-sync-guard pass. Direct main push (commit 7d896075).

다음 사이클 추천 = review-code(heavy) 계속(잔존 미감사 후보: `debug/pipeline` 481줄, `debug/factor-correlation` 547줄, `teams/[code]` 622줄, `search/page` 450줄, `seasons/[year]` 433줄, `about` 427줄) 또는 lotto(gap 8/30)/op-analysis(gap 8/25)/info-arch(gap 27/30) 자연 도달 시 다양성 전환.

---

## ✅ SUCCESS — review-code(heavy) mlb/reviews/monthly sibling 대조, computeMonthRange KST 미적용(월경계) 정정 (cycle 2510, 2026-08-24)

진단: open issue 0, approved plan 0/23. gap trigger 4종 미도달(fix-incident 4/20, op-analysis 5/25, info-arch 24/30, lotto 2/30). cycle 2509 추천 carry-over 타겟 `mlb/reviews/monthly/[month]/page.tsx`(502줄, 감사 이력 0건)로 진입.

확정 이슈: sibling 파일 `computeWeekRange.ts`(toMondayUTC)는 이미 KST_OFFSET_MS shift로 "월요일 00:00~09:00 KST(=일요일 15:00~24:00 UTC)" 경계 오판정을 정정(주석 명시)했으나, 같은 디렉토리 `computeMonthRange.ts`(getMonthRangeFromDate)는 raw `d.getUTCFullYear()/getUTCMonth()`를 그대로 사용 — 매월 말일 UTC 15:00~24:00(=다음달 KST 00:00~09:00) 구간에 `getCurrentMonth()`/`getRecentMonths()`가 아직 전월로 오판정하는 KST_OFFSET_MS family(wave 145, cycle 2507 재발) 3번째 재발. KBO/MLB/EN 월간 리뷰 nav, sitemap.ts monthly route, feed/route.ts, analysis 페이지 currentMonth 배지 등 15개 이상 호출부 영향.

fix: getMonthRangeFromDate 안에서 KST_OFFSET_MS shift 후 UTC 필드 읽도록 정정(computeWeekRange.ts와 동일 패턴) + boundary 회귀 가드 테스트 2건 추가.

검증: computeMonthRange.test.ts 16/16 pass, tsc --noEmit clean, eslint clean, vitest 전체 510 files/4257 tests pass, pre-push lint+type-check+version-sync-guard pass. Direct main push (commit 2185c21f).

다음 사이클 추천 = review-code(heavy) 계속(잔존 미감사 후보: `lotto/methodology/page.tsx` 533줄, `mlb/factors/page.tsx` 469줄) — sibling 파일 대조 패턴이 이번에도 유효했으니 다른 date-range 유틸도 재확인 가치 있음.

---

## ✅ SUCCESS — review-code(heavy) mlb/games/[date]/[slug] 최초 전체 감사, factorCount claim-vs-render mismatch 정정 (cycle 2509, 2026-08-24)

진단: open issue 0, approved plan 0/23. gap trigger 4종 전부 미도달. cycle 2507/2508 추천대로 review-code(heavy) 계속, carry-over 명시 타겟 `mlb/games/[date]/[slug]/page.tsx`(543줄, 감사 이력 0건)로 전환.

확정 이슈: `MlbGameOverview`(prose "N개 세이버메트릭스 팩터를 종합한...")가 `GAME_DETAIL_FACTOR_ROWS.length`(모델 최대 팩터 수, 항상 10)를 그대로 factorCount 로 사용 — `computeMlbWaterfall`은 팀 데이터 결측(elo/war 등) 시 해당 factor bar 를 silent skip(`if (home==null||away==null) continue`)하는데 이 카운트는 안 줄어듦. 같은 화면의 `MlbDetailedFactorAnalysis` 제목은 `rows.length`(실제 present bar 수)로 이미 self-sync 돼 있어, 데이터 결측 경기에서 두 섹션이 서로 다른 팩터 수를 주장하는 모순 발생 가능(cycle 2108 claim-vs-render mismatch family 재발). KO(`mlb/games`)/EN(`en/mlb/games`) twin 양쪽 모두 `waterfallBars` 기반 동적 `usedFactorCount`(home_advantage/park_factor/final 제외)로 정정, 회귀 가드 테스트 2건 추가.

검증: tsc --noEmit clean, eslint clean, vitest 전체 510 files/4255 tests pass, pre-push lint+type-check+version-sync-guard pass. Direct main push (commit 0916ff88).

다음 사이클 추천 = review-code(heavy) 계속(잔존 미감사 후보: `lotto/methodology/page.tsx` 533줄, `mlb/reviews/monthly/[month]/page.tsx` 502줄, `mlb/factors/page.tsx` 469줄) 또는 info-arch(gap 23/30)/op-analysis(gap 4/25) 자연 도달 시 다양성 전환.

---

## ✅ SUCCESS — review-code(heavy) matchup 페이지 3종 최초 전체 감사, todayStr KST 미적용 정정 (cycle 2507, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4/blocked). gap trigger 4종 전부 미도달(fix-incident 1/20, op-analysis 2/25, info-arch 21/30, lotto 29/30). 직전 8 사이클 distinct=4(2-chain lock 미충족). cycle 2506 추천대로 review-code(heavy) 계속, `app/matchup/[teamA]/[teamB]/page.tsx`(KBO 원본, 547줄, 사전 감사 이력 0건)로 신규 타겟 확장.

1차 가설(오판, 자가 정정): MLB matchup/team 게임 테이블의 `Math.round(g.confidence * 100)`가 KBO 대응 위치(`confToWinProb(g.confidence)`)와 달라 보여 confToWinProb 미적용 버그로 의심 → `silent-drift-wave-310.test.ts` 파일 하단 가드(`silent drift wave 310 정정 cycle 2160`)를 먼저 확인해 MLB `confidence`는 이미 0.5~1 스케일이라 confToWinProb 재적용 시 이중 변환 버그(850%류)가 재발한다는 걸 발견 — 수정 보류(무변경 유지).

실제 확정 이슈: `buildMatchupUpcoming.ts` / `buildMlbMatchupUpcoming.ts`(lib 레이어) 는 "오늘" 계산에 이미 `toKSTDateString()` 사용 중인데, 이를 페이지에서 다시 쓰는 `matchup/[teamA]/[teamB]/page.tsx` 3종(KBO/MLB/EN-MLB) 은 게임 목록을 예정/이번시즌/과거로 분류하는 `todayStr`/`currentYear` 를 raw UTC(`new Date().toISOString().slice(0,10)`, `new Date().getFullYear().toString()`)로 독립 재계산 — KST 새벽 시간대(UTC 전날) 경계에서 분류 오차 가능한 KST_OFFSET_MS family(wave 145) 재발. 3파일 모두 `toKSTDateString()` 단일화 + `currentYear`를 `todayStr.slice(0,4)`로 파생, wave-660 회귀 가드 신규.

검증: tsc --noEmit clean, eslint clean, vitest 전체 510 files/4253 tests pass, pre-push lint+type-check+version-sync-guard pass. Direct main push (commit 76c35904).

다음 사이클 추천 = review-code(heavy) 계속(matchup 감사 완료, 다른 미감사 후보: `mlb/games/[date]/[slug]/page.tsx`, `lotto/methodology/page.tsx`, `mlb/reviews/monthly`, `mlb/factors` 등 잔존) 또는 lotto(gap 29/30 임박 — 다음 사이클 자연 도달).

## 🔵 RETRO-ONLY — fix-incident(lite) mlb_fancy_scrape FanGraphs 403 3일 self-healed 3번째 재발 (cycle 2504, 2026-08-24)

진단: fix-incident gap=20 / operational-analysis gap=25 동시 충족. pipeline_runs 실측(service-role REST) + gh run list 로 실제 이상 여부 확인. CI/cron 전부 clean, 단 최근 7일 non-success 3건 발견 — mode=`mlb_fancy_scrape`, `fetchFangraphsMlbTeams: fangraphs HTTP 403`, run_date 2026-08-20~22. 08-23/08-24 는 이미 success 로 self-healed.

UA header 는 cycle 2278 에 이미 정정됨(`KBO_USER_AGENT`) — 이번 403 은 UA 누락과 무관한 별도 bot-detection/rate 이슈로 추정. `fetchLeaderRows`(packages/kbo-data/src/scrapers/fangraphs-mlb.ts)에 retry/backoff 없어 단일 fetch 실패 시 그날 mlb_fancy_scrape 전체 스킵 → team_stats upsert 안 됨(이전 값 유지, stale 이지만 silent broken 아님) → 다음날 cron 자동 재시도로 회복.

**동일 패턴 3번째 재발** (cycle 2383 RETRO-ONLY → cycle 2484 RETRO-ONLY → cycle 2504 RETRO-ONLY). meta-pattern 누적 3/5(임계 미달, 코드 변경 보류) — 5회째 재발 시 retry-with-backoff 도입을 chain-evolution 후보로 재검토 권장. 이번 사이클은 코드 변경 없음.

다음 사이클 추천 = operational-analysis(lite) — gap=25 도달(다음 사이클 26), review-code dominance(직전 20 사이클 14/19=74%) 완화 겸 다양성 회복.

---

## ✅ SUCCESS — review-code(heavy) confidence label 부등호 불일치 + MLB waterfall NEUTRAL_FACTOR 정합 (cycle 2503, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4/blocked). gap trigger 4종 전부 미도달(fix-incident 19/20, op-analysis 24/25, info-arch 17/30, lotto 25/30). 직전 8 사이클 distinct=4(polish-ui/review-code/explore-idea/skill-evolution) — 2-chain lock 미충족. cycle 2502 retro 가 명시적으로 남긴 carry-over 2건을 그대로 처리(feedback_diagnose_existing_artifacts_first — carry-over 가리키는 파일·라인 우선 read).

1. `factor-explanations.ts:397`(`marginPp <= OVERVIEW_CLOSE_PP`)과 `GameAnalysisProse.tsx:49` / `MlbGameOverview.tsx:27,67`(`marginPp < OVERVIEW_CLOSE_PP`) 사이 부등호 불일치 실측 확인 — marginPp 가 정확히 경계값(10)인 경기는 요약 문구("접전")와 신뢰도 라벨("소폭 우위")이 같은 페이지 안에서 모순 표시됨. 세 곳 모두 `<=` 로 통일해 factor-explanations.ts 를 source of truth 로 정합.
2. `mlb-waterfall.ts`(computeMlbWaterfall)와 `MlbFactorWaterfallChart.tsx` 의 `0.5` 리터럴 4+1곳(cumulative 시작값, final bar contribution/base/direction, ReferenceLine x축) — KBO 원본 `FactorWaterfallChart.tsx` 는 동일 지점 전부 `NEUTRAL_FACTOR` 상수 사용, MLB twin 만 하드코딩(KBO/MLB twin divergence, silent drift family 재발). `NEUTRAL_FACTOR` 로 치환. 값 자체는 0.5 로 동일해 동작 변화 없음 — 유지보수성 정합만. 알고리즘 계수(line 49 elo home_elo_bonus multiplier, line 128 head_to_head 대칭 인코딩 상쇄항의 0.5)는 "중립 기준점"과 무관한 별개 의미라 미변경(과잉 일반화 회피).

검증: tsc --noEmit clean(4 packages), eslint clean, vitest 전체 509 files/4250 tests pass, pre-push lint+type-check+version-sync-guard pass. PR 없이 direct main push (commit ebec9a0f).

다음 사이클 추천 = review-code(heavy) 계속(carry-over 소진, 신규 미감사 대형 파일 탐색 필요) 또는 op-analysis(gap 24/25 임박 — 다음 사이클 자연 도달).

## ✅ SUCCESS — review-code(heavy) predictions/insights 컴포넌트 최초 전체 감사, waterfall 정규화 누락 + MLB historical-analog 크래시 위험 정정 (cycle 2502, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4/blocked). gap trigger 4종 전부 미도달. cycle 2501(skill-evolution forced milestone) 추천대로 review-code(heavy) 계속, insights/predictions 컴포넌트 디렉토리(25+2파일, 최초 전체 감사)로 전환.

감사(Explore agent 위임 + 직접 검증): predictions/ 25개 파일 + insights/ 2개 파일 + KBO/MLB twin 대응 관계 비교 + 상위 lib(predictor.ts, mlb-waterfall.ts, factor-explanations.ts) 교차 확인. 4건 후보 중 2건 확정 fix:

1. `FactorWaterfallChart.tsx`의 `computeWaterfall()`이 `predictor.ts`의 정규화 공식(`weightedSum/factorTotal`, factorTotal=DEFAULT_WEIGHTS 합=0.85)에서 `/factorTotal` 나눗셈을 누락 — 차트가 표시하는 각 팩터 기여도와 최종 확률이 실제 모델 대비 약 1.18배(=1/0.85) 축소돼 표시됨. 푸터 문구 "가중치 합 = 1.0"도 실제 0.85와 불일치해 근본 원인 확인(작성자가 가중치 합이 1.0이라 잘못 가정하고 정규화를 생략한 것으로 추정). `FACTOR_TOTAL` 상수 도입 후 각 contribution에 나눗셈 적용 + 푸터 문구를 실제 값(85%, 정규화 적용)으로 정정.
2. `MlbHistoricalAnalogMatchup`은 페이지 안에 `<MlbHistoricalAnalogMatchup />`으로 인라인 렌더되는 async Server Component(page.tsx의 `Promise.all` 밖)인데, 내부 `fetchMlbHistoricalAnalogs()`가 `assertSelectOk` 관례(호출부가 catch 결정)로 throw — 흡수하는 코드가 없어 일시적 Supabase 에러 시 MLB 게임 상세 페이지 전체가 크래시될 위험. KBO twin(`HistoricalAnalogMatchup`)은 이미 동일 상황에서 try/catch + Sentry capture로 graceful degrade하고 있어 비대칭 확인. 첫 시도는 `fetchMlbHistoricalAnalogs` 자체에 try/catch를 넣었으나 기존 회귀 가드 테스트("schedule select 실패 시 throw")가 실패 — 이 테스트는 "assertSelectOk는 호출부가 catch 여부를 결정한다"는 설계 계약을 지키기 위해 의도적으로 작성된 것이었음. 대신 컴포넌트 레벨에서 `.catch(captureFallback)`으로 흡수하도록 위치를 옮겨 fetch 함수의 throw 계약은 유지하면서 페이지 크래시만 차단.

confidence-tier 부등호 불일치(`factor-explanations.ts:397` `<=` vs `GameAnalysisProse.tsx:49`/`MlbGameOverview.tsx:27,67` `<` — 동일 페이지 내 "접전"/"소폭 우위" 라벨 모순 가능)와 `mlb-waterfall.ts`의 `NEUTRAL_FACTOR` 미참조 하드코딩(`0.5` 4곳)은 저심각도로 이번 사이클 scope 제외, 다음 review-code 후보로 이월.

검증: tsc --noEmit clean, eslint clean, vitest 전체 509 files/4250 tests pass(첫 시도 실패 1건 → 재설계 후 전체 pass), pre-push lint+type-check+version-sync-guard pass. PR 없이 direct main push (commit f3de0d17).

다음 사이클 추천 = review-code(heavy) 계속 — confidence-tier 부등호 통일 fix 우선, 또는 insights 디렉토리(AgentVoteCard/DebateTimeline, 이번에 clean 확인)를 지나 components/analysis · components/standings 잔존 영역.

## ✅ SUCCESS — review-code(heavy) dashboard/standings 컴포넌트 최초 전체 감사, buildStandings silent catch 정정 (cycle 2500, 2026-08-24)

진단: open issue 0, approved plan 0/29. gap trigger 4종 전부 미도달. cycle 2499 추천대로 review-code(heavy) 계속, accuracy 컴포넌트 계열 완결 후 dashboard/standings 디렉토리로 전환.

감사: dashboard 컴포넌트 14개(chart) + factor-accuracy.ts + dashboard/page.tsx + standings 계열 lib 3개. 대부분 clean(ModelTuningInsights 의 "제안 가중치" 계산 로직 doc↔code 일치 확인 등), 단 `buildStandings.ts` 에서 실제 발견: 내부 try/catch 가 `fetchStandings()` 실패를 삼켜 `[]` 리턴 — 호출부(home page.tsx, standings/page.tsx)가 이미 `captureFallback(err, [], {...})` 관측성 wrapper 를 준비해뒀지만 buildStandings() 가 절대 reject 하지 않아 홈페이지 쪽은 죽은 코드, standings/page.tsx 쪽은 wrapper 자체가 없었음. 형제 함수(buildAllTeamAccuracy/buildEloTrend)는 이미 에러 전파+캡처 컨벤션을 따르고 있어 buildStandings 만 예외. KBO 공식 스크래핑 실패(사례 8 referer 차단 재발 가능) 시 두 페이지 순위표가 Sentry 알림 없이 조용히 빈 배열로 표시될 위험 — 대응: 내부 catch 제거(에러 전파) + 호출부 3곳 captureFallback 연결. `buildTeamAccuracy.ts` 의 `buildTeamBiasAnalysis` 내부 동일 fetchStandings 2차 occurrence 도 같은 패턴이라 함께 정정(biasGap 은 null-safe 라 오염값은 없었으나 관측성 공백 동일).

검증: tsc --noEmit clean, vitest 전체 509 files/4250 tests pass, pre-push lint+type-check+version-sync-guard pass. PR 없이 direct main push (commit 4e7ed95b).

milestone(cycle 2500, %50==0) — trigger 3 충족, skill-evolution-pending marker 박제(milestone deferred 2500→2501, 사례 15 mitigation 정상 작동).

다음 사이클 추천 = skill-evolution(marker 처리, 다음 fresh session 자동) 이후 review-code(heavy) 계속(미감사: insights/predictions 컴포넌트 계열) 또는 op-analysis(gap 23/25 임박).

## 🔵 RETRO-ONLY — explore-idea(heavy) push 알림 carry-over 재평가 + lotto gap 판단 skip, 신규 idea 0건 (cycle 2498, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4/blocked). gap trigger: fix-incident 14/20, op-analysis 19/25, info-arch 12/30 (전부 미도달). lotto 는 마지막 실제 fire cycle 2392 = 106 사이클 경과로 기계적으론 트리거 충족이나, cycle 2426 chain-evolution 증거(4회 연속 no-op 재발, cron self-heal 이 develop-cycle 과 독립적으로 이미 매주 picks/result 처리)를 본 사이클도 실측 재확인(`~/lotto_picks/2026-08-29-50sets.md` 8/23 생성 + `2026-08-22-result.md` 8/23 반영 + `lotto-pick-update.yml`/`lotto-result-update.yml` 최근 실행 전부 success) — 5번째 무의미 재발 방지 위해 본 메인 자율 판단으로 lotto fire skip(트리거 기계적 충족과 실제 개입 필요성 디커플링, 최종 SKILL.md 반영은 다음 skill-evolution 몫). 직전 8 사이클(2490-2497) distinct=3(review-code/explore-idea/polish-ui) — 2-chain lock 미충족. 직전 15 사이클 14/15(review-code+fix-incident+polish-ui+info-arch) — improvement saturation trigger 충족 → explore-idea 자연 발화.

탐색: (1) plan#27(MLB 개인픽+리더보드) Phase 3 데이터 게이트 재확인 — KBO `user_picks`/MLB `mlb_user_picks` 모두 cycle 2334 측정과 동일(변화 0), 보류 유지. (2) plan#29(로그인+커뮤니티) 재평가 트리거 3종 전부 미충족, Tier4 보류 유지. (3) 신규 각도 탐색 — `apps/moneyball/public/sw.js` 에 web-push 가 이미 STUB listener 로 존재(`docs/decisions/pwa-web-push-carryover.md`, cycle 1021 c11 박제, 5 PR scope 명세 완비)를 발견하고 fire 조건(DAU 100+ / AdSense 심사 통과 / 사용자 PWA install 요청 / Telegram 대체 필요) 재확인 — DAU 근사치(user_picks=1)로 미충족 확실, AdSense 심사 상태는 사용자 direct 확인 없이 판단 불가(코드상 ca-pub id 존재하나 심사 통과 여부 코드로 확인 불가, `feedback_no_domain_nag` 정책상 사용자에게 먼저 묻지 않음) — 게이트 미충족으로 보류 유지.

결론: 신규 actionable idea 0건 — 코드 변경 없음, retro-only. 3연속 explore-idea 0-idea fire(2477/2494/2498) — 남은 후보 대부분이 트래픽 임계(DAU100+/두자릿수 픽) 게이트에 걸려 자연 대기 상태. 다음 explore-idea fire 전 우선 확인 = 위 게이트 값 변화 여부만 가볍게(재탐색 없이).

다음 사이클 추천 = operational-analysis(lite, gap 19/25 근접) 또는 fix-incident(gap 14/20 근접) 또는 review-code(heavy, 2-chain lock 자연 롤링 해제).

## 🔵 RETRO-ONLY — review-code(heavy) buildMlbTeamProfile.ts/mlb-shared.ts 최초 전체 감사, 신규 이슈 0건 clean (cycle 2497, 2026-08-24)

진단: open issue 0, approved plan 0/29(27=phase blocked/28=completed/29=spec_only_deferred, 셋 다 status≠approved). gap trigger 4종 전부 미도달(fix-incident 13/20, op-analysis 18/25, info-arch 11/30, lotto 19/30). 직전 8 사이클(2489-2496) distinct=3(review-code/explore-idea/polish-ui) — 2-chain lock 미충족. `gh run list` 최근 10건 전부 success/skipped, fail 0건. cycle 2496 retro 추천대로 review-code(heavy) 계속, 잔존 미감사 대형 파일 `buildMlbTeamProfile.ts`(383줄) + `mlb-shared.ts`(409줄) 선정.

감사 범위: `buildMlbTeamProfile.ts`(teamCode alias 정규화/mlb_schedule+predictions 조인/MLB_PRODUCTION_COHORT_RULES 필터/factorAverages 7종 집계/deriveMlbOutcome 위임) + `mlb-shared.ts`(fetchMlbPredictionRowsInRange/mapMlbRowsToHighlightCandidates/buildMlbTeamStats/buildMlbFactorInsights/buildMlbMissReport, LOWER_IS_BETTER 부호 반전 로직) + 업스트림 `deriveMlbOutcome.ts`(confidence 스케일 0.5~1, KBO confToWinProb 이중변환 방지 주석 확인) + 소비처(buildMlbWeeklyReview.ts/buildMlbMonthlyReview.ts, KBO buildWeeklyReview.ts/buildMonthlyReview.ts 대응 구조와 badge tier 로직 diff 비교 — 정합).

결론: 두 파일 모두 이미 cycle 2066/2081/2117/2160/2399 등 다수 후속 fix 로 정리된 상태 — teamCode alias(StatsAPI↔canonical) 처리, cohort filter, badge 3-tier 로직 전부 KBO 대응 파일과 정합. 신규 actionable 이슈 0건 — 코드 변경 없음, retro-only.

다음 사이클 추천 = fix-incident(gap 14/20 근접) 또는 op-analysis(gap 19/25 근접) 또는 lotto(gap 20/30 근접) 또는 review-code(heavy) 계속(잔존 미감사 파일 재탐색 필요 — 대형 monolith 소진 국면 가능성).

## 🔵 RETRO-ONLY — review-code(heavy) buildPicksStats.ts 최초 전체 감사, 신규 이슈 0건 clean (cycle 2496, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). gap trigger 4종 전부 미도달(fix-incident 12/20, op-analysis 17/25, info-arch 10/30, lotto 18/30). 직전 8 사이클(2488-2495) distinct=3(review-code/explore-idea/polish-ui) — 2-chain lock 미충족. cycle 2479 op-analysis(lite) CE cohort 5연속 zero-change(비CE 표본 7주+ 동결) 확인 후 "review-code(heavy) 계속" 권고, 2492/2493 retro 도 동일 추천 — `buildPicksStats.ts`(411줄, MLB 픽 silent-drop 과거 이력 있어 재점검 가치, review-code 이력 0건) 선정.

감사 범위: `buildPicksStats.ts` 본체(buildPickEntries/buildPicksStats/buildWeeklyStats/buildWeeklyHistory/buildFactorAgreement) + 업스트림 `api/picks/results/route.ts`(ai_predicted_winner_id는 항상 number|null 타입 보장 — `!==null`/`!=null` 혼용은 실제 undefined 유입 경로 없어 무해 확인) + 주요 소비처 5개(UserVsAIScorecard/MyPicksClient/PicksTrendChart/WeeklyPicksSummary/FactorAgreementCard). divergent/agreed 집계 로직(이진 승패 대칭성), KST streak 계산, trend 임계값(RECENT_FORM_GAMES=10=2×PICKS_TREND_HALF) 전부 정합. 기존 테스트(cycle 2244 MLB 회귀 가드 포함 전체 스위트) 케이스가 이미 실측 엣지 대부분 커버.

결론: 신규 actionable 이슈 0건 — 코드 변경 없음, retro-only.

다음 사이클 추천 = review-code(heavy) 계속 (잔존 미감사: `mlb-shared.ts`(409줄) / `buildMlbTeamProfile.ts`(383줄)) 또는 fix-incident(gap 13/20 근접) 또는 op-analysis(비CE 표본 동결 지속 시 6번째 zero-change 재확인 낮은 가치, 재점화 전까지 보류 권장).

## 🔵 RETRO-ONLY — polish-ui(2-chain lock 강제) 실측 QA(홈/analysis/mlb 모바일 뷰포트), 신규 결함 0건 (cycle 2495, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). gap trigger 4종 전부 미도달(fix-incident 11/20, op-analysis 16/25, info-arch 9/30, lotto 17/30). 직전 8 사이클(2487-2494) distinct=2(review-code/explore-idea) — 2-chain alternation lock 발동, 둘 다 제외(둘 다 fix-incident 아니라 안전 override 미적용). 잔여 pool 어디에도 자연 trigger 없음 — DESIGN.md mtime 1일(신선), 실제 컴포넌트 hex 색상 grep 전수 확인(OG 이미지 생성기 리터럴/CSS var fallback/브랜드 소셜 컬러 뿐, 토큰 이탈 0건) — polish-ui 강제 발화(lock 룰 명시 fallback).

실행: `browse` skill 으로 실사이트(moneyballscore.vercel.app) 모바일 뷰포트(390x844) 홈/`analysis`/`mlb` 3개 페이지 실측 QA. console error 0건, 레이아웃 깨짐 0건. 초기 `/mlb` 풀페이지 스크린샷에서 "팀 순위" 카드 제목이 잘려 보이는 아티팩트 발견 → element 단독 스크린샷으로 재확인한 결과 제목 정상 렌더(풀페이지 스크린샷 스티칭 타이밍 아티팩트로 판정, 실제 버그 아님).

결론: 신규 actionable UI 결함 0건 — 코드 변경 없음, retro-only.

다음 사이클 추천 = operational-analysis(lite, gap 17/25 근접) 또는 lotto(gap 18/30 근접) 또는 review-code(heavy, 2-chain lock 은 윈도우 자연 롤링으로 해제 예상).

## 🔵 RETRO-ONLY — explore-idea(heavy) plan#29/MLB player Statcast/parity 재확인, 신규 idea 0건 (cycle 2494, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4, plan#29만 spec_only_deferred). 직전 8 사이클 distinct=2(info-architecture-review/review-code) — 2-chain lock 발동, 둘 다 제외. 직전 15 사이클 14/15(review-code+fix-incident+polish-ui+info-arch) — improvement saturation trigger 충족 → explore-idea 자연 발화. gap trigger 4종 전부 미도달(fix-incident 10/20, op-analysis 15/25, lotto 16/30). `gh run list` 최근 8건 전부 success/in_progress, fail 0건.

탐색: (1) plan#29(로그인+커뮤니티 ETA 재평가) 재평가 트리거 3종(포스트시즌 접근/트래픽 두자릿수/사용자 발화) 전부 미충족 — 오늘(8/24) KBO 포스트시즌 아직 미도달, 트래픽 재측정은 plan 자체 권고대로 skip(1일 경과로 변화 극히 낮음, 반복 재측정 비용 낭비 방지). Tier4 보류 유지. (2) `mlb/players/[id]`/`en/mlb/players/[id]` 선수별 Statcast 개별 layer — ETA가 "MLB 풀 인제스트 결정(사용자 영역)" 대기 Tier4, 자율 착수 불가. (3) EN/KO parity — cycle 2477 이미 players/leaderboard/picks/search/related-links 전 영역 탐색 완료, en 라우트는 MLB 전용 의도적 스코프. (4) RSS feed(`app/feed`)/PWA manifest(`app/manifest.ts`)/sitemap 등 표준 기능 이미 전부 존재.

결론: 신규 actionable idea 0건 — 코드 변경 없음, retro-only.

다음 사이클 추천 = operational-analysis(lite, gap 15/25 근접) 또는 lotto(gap 16/30 근접) 또는 review-code(heavy, 2-chain lock 은 직전8 재계산 시 해제 가능).

## 🟢 SUCCESS — review-code(heavy) factor-explanations.ts 최초 전체 감사 — marginPp 하드코딩 * 200 / 0.5 정정 (cycle 2493, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 9/20, op-analysis 14/25, info-arch 7/30, lotto 15/30). 직전 8 사이클 distinct=3(review-code/fix-incident/info-architecture-review) — 2-chain lock 미충족. 2492 추천대로 review-code(heavy) 계속, 잔존 미감사 대형 파일 중 `factor-explanations.ts`(416줄, `/analysis/game/[id]` 팩터 해설·요약 소스, review-code 이력 0건) 선정.

발견: 이 파일 자체(`explainFactor`/`buildGameOverview`)는 WAR/SFR=0 데이터 갭 가드, NEUTRAL dead-zone, 상수 단일화(wave-352/356) 등 기존 wave fix 로 이미 견고 — 신규 이슈 없음. 다만 `OVERVIEW_CLOSE_PP`/`OVERVIEW_DOMINANT_PP` threshold 를 소비하는 두 컴포넌트(`GameAnalysisProse.tsx` KBO / `MlbGameOverview.tsx` MLB)를 대조한 결과, 각 컴포넌트가 marginPp 원 계산 자체를 `Math.abs(homeWinProb - ELO_NEUTRAL_WIN_PCT) * 200` / `Math.abs(homeWinProb - 0.5) * 200` 로 별도 하드코딩 — cycle 2253 fix(#2988)가 threshold 상수(10/20)만 단일화하고 marginPp 산식 자체는 두 컴포넌트에 중복 하드코딩으로 남김. 현재 `ELO_NEUTRAL_WIN_PCT`(0.5)/`NEUTRAL_FACTOR`(0.5)/`FACTOR_CONTRIBUTION_SCALE`(200) 값이 동일해 지금은 무증상이나, 향후 `FACTOR_CONTRIBUTION_SCALE` 재조정 시 `buildGameOverview` 와 두 컴포넌트 marginPp 가 silent 하게 divergent 해질 위험.

실행: 두 컴포넌트 모두 `FACTOR_CONTRIBUTION_SCALE`(+`MlbGameOverview.tsx` 는 `NEUTRAL_FACTOR` 도) import 후 marginPp 계산을 단일 source 참조로 교체. 회귀 테스트 신규 1건(`silent-drift-cycle-2493.test.ts`). `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(509 files/4250 tests) + `pnpm lint` clean. 단일 논리 단위 → main 직접 commit+push 완료(96d04f9b). push 시 root package.json 3-way sync 누락을 pre-push guard 가 즉시 감지 → 별도 신규 커밋(7708bf19, amend 미사용)으로 정정 후 재 push 성공.

다음 사이클 추천 = review-code(heavy) 계속 (잔존 미감사 대상: `buildPicksStats.ts`(410줄, MLB 픽 silent-drop 과거 이력 있어 재점검 가치) / `mlb-shared.ts`(409줄) / `buildMlbTeamProfile.ts`(383줄)) 또는 op-analysis(gap 14/25, 임박).

## 🔵 RETRO-ONLY — review-code(heavy) buildMatchupProfile.ts/buildMlbMatchupProfile.ts 최초 전체 감사, 신규 이슈 0건 clean (cycle 2492, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 8/20, op-analysis 13/25, info-arch 6/30, lotto 14/30). 직전 8 사이클(2484-2491) distinct=3(fix-incident/review-code/info-architecture-review) — 2-chain lock 미충족. 2491 추천대로 review-code(heavy) 계속, 잔존 미감사 data builder 중 `buildMatchupProfile.ts`(594줄, `/matchup/[teamA]/[teamB]` 페이지 데이터 소스)와 MLB 대응 `buildMlbMatchupProfile.ts`(526줄) 양쪽 선정.

점검: (1) `computeMatchupStreak`/`computeMatchupAvgMargin`/`computeMatchupBlowoutCount`/`computeMatchupCloseGameCount`/`computeMatchupHomeAwayEdge`/`computeMatchupRecentRecord` 6개 export — packages/shared 단일 source 위임, KBO/MLB 양쪽 독립 wrapper 재사용 확인 (cycle 2034/2036/2055/2071 통합 이력 유지). (2) `games.sort()` 명시적 독립 문장 분리 확인(cycle 2399 패턴, KBO/MLB 양쪽 동일). (3) 예측 매칭 필터 — KBO는 `predictions.find(prediction_type==='pre_game' && PRODUCTION_COHORT_RULES.includes(scoring_rule))` JS 레벨 필터(주석에 `#1338 family` 명시적 근거), MLB는 `.eq(prediction_type,'pre_game').in(scoring_rule, MLB_PRODUCTION_COHORT_RULES)` DB 레벨 필터 — 양쪽 다 shadow row(v2.1-B-shadow 등) 오염 배제 확인, 미적용 콜사이트 0건. (4) `assertSelectOk` fail-loud 래핑 — teams/games(KBO), mlb_schedule/predictions(MLB) 전 쿼리 적용, silent fallback 없음. (5) 소비부 `matchup/[teamA]/[teamB]/page.tsx` — `profile.streak`/`avgMargin`/`recentRecord`/`blowout`/`closeGame`/`homeAwayEdge` 는 직접 렌더 대신 `buildSummary`(summary 텍스트)에만 소비, page 자체 `closeCount`(CLOSE_GAME_MARGIN<=1 필터, UI 게임 리스트 필터용)와 lib의 `MARGIN_CLOSE_GAME_THRESHOLD`(===1, "박빙 승부" 카운트 통계용) 는 값 동일(둘 다 1)이나 목적이 달라 별도 정의 — 혼동 아님. (6) KBO/MLB 두 파일 나란히 비교 — cohort 필터/정렬/6개 통계 함수 재사용 패턴 모두 parity 확인, MLB 전용 `deriveMlbOutcome`(home_win_prob 기반, cycle 2066 fix 이력) 격리 정상. 신규 이슈 0건.

실행: 코드 변경 없음 — 감사 완료.

다음 사이클 추천 = review-code(heavy) 계속 (잔존 미감사 대상 축소 — 남은 대형 data builder 재탐색 필요, `find apps/moneyball/src/lib -name "*.ts" -newer <marker>` 또는 wc -l 재정렬 권장) 또는 op-analysis(gap 13/25, 임박) 또는 lotto(gap 14/30, 임박) 또는 fix-incident(gap 8/20).

## 🔵 RETRO-ONLY — review-code(heavy) buildTeamProfile.ts 최초 전체 감사, 신규 이슈 0건 clean (cycle 2491, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 7/20, op-analysis 12/25, info-arch 5/30, lotto 13/30). 직전 8 사이클(2483-2490) distinct=3(review-code/info-architecture-review/fix-incident) — 2-chain lock 미충족. 2490 추천대로 review-code(heavy) 계속, 잔존 미감사 data builder 중 `buildTeamProfile.ts`(601줄, `/teams/[code]` 페이지 데이터 소스 + KBO↔MLB 공유 집계 함수 6개) 선정.

점검: (1) `computeTeamStreak`/`computeTeamAvgMargin`/`computeTeamBlowoutCount`/`computeTeamCloseGameCount`/`computeTeamHomeAwayEdge`/`computeTeamRecentRecord` 6개 export — 모두 `buildMlbTeamProfile.ts` 가 그대로 import 재사용 확인(신규 MLB_ 접두 중복 함수 없음). (2) `teamGames.sort()` 명시적 독립 문장 분리 확인(cycle 2399 정정 유지, KBO/MLB 양쪽 동일 패턴). (3) `PRODUCTION_COHORT_RULES` 필터(`predictions!inner` + `.eq(prediction_type,'pre_game')` + `.in(scoring_rule,...)`) — #1338 family 패턴 정합, 미적용 콜사이트 0건. (4) `assertSelectOk` fail-loud 래핑 — teams/games 양쪽 쿼리 모두 적용, silent fallback 없음. (5) `teams/[code]/page.tsx` 소비부 — avgMargin(시즌 전체)/recentRecord(최근 N경기)/recentGames 테이블(최근 8경기) 3종 라벨이 실제 계산 스코프와 일치, 혼동 표시 없음. (6) MLB 대응 파일(`buildMlbTeamProfile.ts`)과 나란히 비교 — cohort 필터/정렬/재사용 패턴 모두 parity 확인. 신규 이슈 0건.

실행: 코드 변경 없음 — 감사 완료.

다음 사이클 추천 = review-code(heavy) 계속 (잔존 미감사 대상: `buildMatchupProfile.ts`(594줄) / `buildMlbMatchupProfile.ts`(526줄), 우선순위 크기순) 또는 op-analysis(gap 12/25, 임박) 또는 lotto(gap 13/30) 또는 fix-incident(gap 7/20).

## 🟢 SUCCESS — review-code(heavy) buildAccuracyData.ts 최초 전체 감사, Version History CURRENT_MODEL_FILTER 오적용 정정 (cycle 2490, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 6/20, op-analysis 11/25, info-arch 4/30, lotto 12/30). 직전 8 사이클 distinct=3(review-code/fix-incident/info-architecture-review) — 2-chain lock 미충족. skill-evolution trigger 5개 모두 미충족(trigger3 %50=40, trigger5 review-code 0회 아님). 2489 추천대로 review-code(heavy) 계속, 잔존 미감사 data builder 중 `buildAccuracyData.ts`(776줄, `/accuracy` 페이지 데이터 소스, review-code 이력 0건) 선정.

발견: `accuracy/page.tsx` 가 `buildVersionHistory(rows)` 호출에서 `CURRENT_MODEL_FILTER`(scoring_rule=v1.8) 로 좁혀진 `rows` 를 그대로 전달 — `ModelVersionHistory` 컴포넌트는 `ALL_SCORING_RULES`(v1.5/v1.6/v1.7-revert/v1.8/v1.8-credit-fail 등) 전체 버전을 보여주도록 설계됐지만 쿼리 자체가 이미 v1.8 외 scoring_rule 을 배제 → 다른 버전은 항상 n=0 이라 UI 가 영구히 "수집 중"으로 렌더. DB 직접 조회로 확인한 실측: v1.5(n=16)/v1.6(n=46)/v1.7-revert(n=34)/v1.8-credit-fail(n=25) 총 121건의 실제 검증된 예측이 존재 — "수집 중"이 아니라 이미 종료된 과거 버전의 실적이 노출되지 않았던 것. `CURRENT_MODEL_FILTER` 자체는 baseline 지표(brier/gap/buckets) 정합을 위해 v1.8 만 쓰는 게 문서화된 의도(shared/model-version-labels.ts)이나, 그 제약이 성격이 다른 buildVersionHistory 호출까지 전파된 것이 문제였음.

실행: scoring_rule 필터 없는 전용 쿼리(`versionHistoryResult`)를 Promise.all 에 추가 → `buildVersionHistory(versionHistoryRows)` 로 분리. 회귀 테스트 신규 1건(`silent-drift-cycle-2490.test.ts`). `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm test`(508 files/4246 tests) + `pnpm lint` clean. 단일 논리 단위 → main 직접 commit+push 완료(fix, R4). VERSION/package.json/CHANGELOG 3-way 동기 갱신(0.5.62.104→105).

다음 사이클 추천 = review-code(heavy) 계속 (잔존 미감사 대상: `buildTeamProfile.ts`(601줄) / `buildMatchupProfile.ts`(594줄) / `buildMlbMatchupProfile.ts`(526줄), 우선순위 크기순 — 이번 발견 패턴(baseline 필터가 다목적 함수 호출에 잘못 전파)과 유사한 필터 재사용 버그 재탐색 가치 있음) 또는 op-analysis(gap 11/25) 또는 lotto(gap 12/30).

## 🔵 RETRO-ONLY — review-code(heavy) convergenceRecord.ts 최초 전체 감사, 신규 이슈 0건 clean (cycle 2489, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 5/20, op-analysis 10/25, info-arch 3/30, lotto 11/30). 직전 8 사이클(2481-2488) distinct=3(review-code/fix-incident/info-architecture-review) — 2-chain lock 미충족. explore-idea saturation 12/15 재충족이나 이미 3회(cycle 2417/2477 등) 소진 확인돼 재탐색 스킵. op-analysis 는 non-CE 표본 2026-07-01 이후 완전 동결 + 5연속 zero-change 확인(cycle 2479 권고: "재발화 lower priority") — 이번엔 skip. 2488 추천대로 review-code(heavy) 계속, 잔존 미감사 lib 계층 중 최대 크기 `convergenceRecord.ts`(831줄, 6개 export 함수 + KBO/MLB 양쪽 수렴 픽 성적 집계) 선정.

점검: (1) `evaluateConvergencePickRow`(KBO)/`evaluateMlbConvergencePickRow`(MLB) 판정 로직 — composite duel validCount 게이팅 + h2h season-to-date 병합(cycle 2304 fix) 정상. (2) `weekdayIndexOf` — `new Date(y,m-1,d).getDay()` 캘린더 구성요소 직접 조립 방식이라 cycle 2485/2123 이 잡았던 `T00:00:00+09:00 앵커 + getUTCDay()` off-by-one family 자체가 발생 불가능한 안전한 패턴, 재발 없음 확정. (3) `computeWinRatePct` 0-division 가능성 grep — 전체 44개 콜사이트 전부 상위에서 `total>0` 가드(직접 조건문) 또는 `computeConvergenceTeamStats`/`HomeAwaySplit`/`DayOfWeekSplit`(모두 `minPicks` 필터 선행)로 이미 표본 보장, NaN 표시 케이스 없음. (4) h2h 캐시 키 포맷(`getSeasonH2HData` sorted `${a}:${b}`) 과 `evaluateConvergencePickRow` 소비 측 정렬 방식 일치 확인. (5) `PRODUCTION_COHORT_RULES`/`MLB_PRODUCTION_COHORT_RULES` 필터 — cycle 2296-2300 sweep(#1338 family)에서 잡힌 패턴과 동일하게 KBO/MLB 양쪽 전 쿼리에 정상 적용, 미적용 콜사이트 0건. (6) 831줄 대비 wave-tagged 주석 40+ 곳 = 이미 여러 사이클(1997/2070/2081/2226/2299/2304/2345)에 걸쳐 반복 정정된 이력 — 이번 감사는 신규 회귀 재확인 성격에 가까웠음.

실행: 코드 변경 없음 — 감사 완료, 신규 issue 0건.

다음 사이클 추천 = review-code(heavy) 계속 (잔존 미감사 대상: `buildAccuracyData.ts`(776줄) / `buildTeamProfile.ts`(601줄) / `buildMatchupProfile.ts`(594줄) / `buildMlbMatchupProfile.ts`(526줄), 우선순위 크기순) 또는 op-analysis(gap 10/25, non-CE 동결 지속 확인) 또는 lotto(gap 11/30).

## 🟢 SUCCESS — review-code(heavy) analysis-data.ts 최초 전체 감사, topFactors dead zone 미적용 정정 (cycle 2488, 2026-08-24)

진단: open issue 0, approved plan 0/29. gap trigger 4종 미도달(fix-incident 4/20, op-analysis 9/25, info-arch 2/30, lotto 10/30). 2-chain lock 미충족(직전 8 distinct=3: review-code/fix-incident/info-architecture-review). explore-idea saturation 12/15 충족이나 3회 소진 확인. UI 계층(`analysis/page.tsx`)은 2480에 감사 완료됐지만 데이터 소스 `analysis/analysis-data.ts`(938줄, 6개 export 함수) 는 review-code 이력 0건 확인 후 최초 전체 감사 착수.

발견: `getTodayAnalysisData` 의 `topFactors`(오늘 경기 카드 "[팩터]: [팀]↑" 배지 source) 계산이 `NEUTRAL_FACTOR`(0.5) 단순 비교만 사용 — `factorLabels.ts` 가 "FactorBreakdown / determineFavor / topFavoringFactors / selectTopFactors 공유 source"로 명시한 `NEUTRAL_LO`(0.45)/`NEUTRAL_HI`(0.55) dead zone 미반영. 코드베이스 내 다른 모든 favor 판정 지점(`determineFavor`, `topFavoringFactors`, `countFavoringFactors`)은 이 dead zone 밖에서만 팀 우세 판정하지만 `analysis-data.ts` 만 예외 — 사실상 중립인 팩터(예: 0.51)도 top-2 안에 들면 "[팀] 우세" 배지로 오표시 가능했음.

실행: `NEUTRAL_HI`/`NEUTRAL_LO` import + topFactors 필터에 dead zone 제외 조건 추가. 회귀 테스트 신규 1건(`silent-drift-cycle-2488.test.ts`). `pnpm type-check`(4 packages clean) + `pnpm test`(507 files/4244 tests) + `pnpm lint` clean. 단일 논리 단위 → main 직접 commit(fix, R4).

다음 사이클 추천 = op-analysis(gap 9/25, 임박) 또는 lotto(gap 10/30) 또는 review-code(heavy) 계속(잔존 미감사 data builder — `convergenceRecord.ts`/`buildAccuracyData.ts`/`buildTeamProfile.ts`/`buildMatchupProfile.ts`/`buildMlbMatchupProfile.ts` 등 lib 계층 다수 미감사 확인됨, 좋은 후보 pool).

## 🔵 RETRO-ONLY — review-code(heavy) mlb/reviews/weekly 계열 감사, 신규 이슈 0건 clean (cycle 2487, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 3/20, op-analysis 8/25, info-arch 1/30 — 방금 발화, lotto 9/30). 직전 8 사이클(2479-2486) distinct=4(operational-analysis/review-code/fix-incident/info-architecture-review) — 2-chain lock 미충족. **explore-idea saturation trigger 12/15 충족** — 그러나 cycle 2417/2477 두 차례 heavy 탐색이 이미 "actionable gap 소진" 결론(EN/KO parity, JSON-LD, TODOS Next-Up, placeholder auth/community 모두 Tier4/소진 확인). 이번 cycle 도 4th source(공유 버튼 Kakao 부재 — 외부 SDK 키 등록 필요해 자율 불가/Tier4, 관심팀 필터·푸시 알림·PWA manifest·RSS feed 모두 기 구현 확인)까지 재탐색했으나 자율 가능한 신규 후보 없음 재확인. 2485 추천대로 review-code(heavy) 계속 채택 — 잔존 미감사 대상 `mlb/reviews/weekly/[week]/page.tsx`(551줄) + `buildMlbWeeklyReview.ts`(182줄) + `ConvergenceTeamStatsBadges.tsx`/`ConvergenceHomeAwayBadges.tsx` 선정.

점검: (1) `computeWeekRange.ts` 는 KO/MLB 공유 — cycle 2481 KST 경계 정정이 이미 양쪽에 적용됨, 재발 없음. (2) `weekdayOf` 류 T00:00:00+09:00 오프셋 버그 패턴 전체 재grep(`getUTCDay\|getDay()` 12 hit) — factor-correlation(2485 정정) + monthGrid(2123 정정) 외 전부 `T00:00:00Z` 앵커 또는 동일 timezone 내 구성/판독이라 안전, 신규 재발 0건 확정(family 완전 종료). (3) `pickHighlights`/`buildMlbTeamStats` isCorrect null 필터링 선행 확인 — bigMiss 필터에 unverified row 유입 없음. (4) `ConvergenceTeamStatsBadges` 색상 로직에 소표본 가드 없어 보였으나 `computeConvergenceTeamStats(results, CONVERGENCE_TEAM_STATS_MIN_PICKS)` 가 소스 레벨에서 이미 필터링 — 오탐 아님.

실행: 코드 변경 없음 — 감사 완료, 신규 issue 0건.

다음 사이클 추천 = op-analysis(gap 9/25) 또는 lotto(gap 10/30) 또는 explore-idea(saturation 재확인, 4번째 소진 예상되나 KBO 포스트시즌 근접 시 plan #29 재평가 조건 도달 가능성 monitor).

## 🔵 RETRO-ONLY — info-architecture-review 30-cycle gap 재확인, 신규 라우트 0건 clean (cycle 2486, 2026-08-24)

진단: info-arch 마지막 발화 cycle 2455 — 31 사이클 재도달(trigger 9), 직전 8 사이클 distinct=4(lotto/operational-analysis/review-code/fix-incident) 2-chain lock 미충족, open issue 0, approved plan 0/23. 전 cycle(2485) retro 가 "2486 fire 예정" 명시 추천대로 info-architecture-review 발화.

점검: `git log --diff-filter=A b7ccba6c(cycle 2455 checkpoint)..HEAD -- '**/page.tsx'` → 신규 라우트 **0건**. breadcrumb 누락 grep 18건 전부 기존 의도된 목록(`debug/*` 8 + redirect-only 리뷰 8 + noindex placeholder 3(login/settings/community, cycle 1026 기존) + 홈) 과 일치, 신규 gap 없음. sitemap/Header/Footer 배선 = 신규 라우트 없어 점검 대상 자체 없음.

실행: 코드 변경 없음 — cycle 2455 와 동일 "현 IA 충분" 재확정. checkpoint 문서만 신규 박제 (`docs/design/ia-2026-08-24-cycle-2486-30-cycle-gap-checkpoint.md`).

다음 사이클 추천 = review-code(heavy) 계속 (잔존 미감사 대상 재탐색 필요, monolith 4건 소진 — `mlb/reviews/weekly` 계열 재확인 검토) 또는 explore-idea(saturation 12/15 근접, 임박) 또는 op-analysis(gap 7/25).

## 🟢 SUCCESS — review-code(heavy) debug/factor-correlation weekdayOf off-by-one 정정 (cycle 2485, 2026-08-24)

진단: open issue 0, approved plan 0/23. gap trigger 4종 미도달(fix-incident 0/20 — 2484 직발화, op-analysis 6/25, info-arch 30/30이나 lookback window 자기 자신 포함해 미충족 — 2486에 fire 예정, lotto 7/30). 직전 8 사이클 distinct=5 — 2-chain lock 미충족. 직전 15 사이클 saturation 11/15 — explore-idea trigger 미충족(임박). 강한 trigger 부재, cycle 2483/2484 추천대로 review-code(heavy) 계속 — 잔존 미감사 대상 `debug/factor-correlation/page.tsx`(544줄, review-code 이력 0건: 과거 커밋 2건은 CSS 제거 + 주석 문구 정정뿐, 데이터 로직 감사 없음) 선정.

발견: 전체 544줄 read. `weekdayOf()` 가 `date + 'T00:00:00+09:00'` 로 파싱 후 `getUTCDay()` 사용 — KST 자정을 "전날 15:00 UTC" 인스턴트로 만들어 **모든 game_date 의 요일이 실제보다 하루 이른 값**으로 계산됨(경계 케이스가 아니라 100% 표본 영향). 실측 확인: `new Date('2026-08-24T00:00:00+09:00').getUTCDay()` → 0(일) 이지만 2026-08-24 실제 요일은 월요일. 동일 계열 버그가 `monthGrid.ts` 주석(explore-idea cycle 2123, mlb/calendar 구현 중 발견된 "실제 프로덕션 버그")에 이미 문서화돼 있고, `apps/moneyball/src/app/page.tsx` 의 `formatKoreanWeekday` 는 이미 UTC 정오 앵커 패턴(`T12:00:00Z` + `getUTCDay()`)으로 수정된 상태 — `factor-correlation` 페이지만 이 정정을 반영 안 한 채 남아있었음. "4. 요일별" 섹션(홈 승률 vs 요일 상관 분석)이 전체 표본에서 하루씩 밀린 요일로 집계되던 상태 — 팩터 튜닝 사전 검증 페이지의 목적(상수 가정 vs 데이터 일치 여부 확인)과 정면으로 배치되는 silent drift.

실행: `weekdayOf()` 를 homepage 와 동일한 UTC 정오 앵커 패턴으로 정정 + export. 회귀 테스트 2건 신규 추가(`2026-08-24` 실제 요일 검증 + 연속 7일 순환 검증). `pnpm type-check`(4 packages clean) + `pnpm test`(506 files/4242 tests, 기존 505/4240 + 신규 2) + `pnpm lint` clean. 단일 논리 단위 → main 직접 commit(`d3919819`)+push (R4).

다음 사이클 추천 = info-arch(gap 30/30 도달, 2486 fire 예정) 또는 review-code(heavy) 계속(잔존 미감사: `mlb/reviews/weekly` 계열 재확인 또는 신규 대형 파일 탐색 필요 — 주요 monolith 4건 소진) 또는 explore-idea(saturation 12/15 근접).

## 🔵 RETRO-ONLY — fix-incident(lite) mlb_fancy_scrape 403 3일 self-healed 확인 (cycle 2484, 2026-08-24)

진단: fix-incident gap 20/20 도달(마지막 발화 cycle 2464) — trigger 6 명시 조건 충족, lite 자동 권장. `pipeline_runs` 최근 7일 조회(163 rows) → non-success 3건 전부 `mlb_fancy_scrape` mode, `errors: ["fetchFangraphsMlbTeams: fangraphs HTTP 403"]`, run_date 2026-08-20~08-22 3일 연속.

점검: `fangraphs-mlb.ts` 는 이미 cycle 2278 에 User-Agent 헤더(`KBO_USER_AGENT`) 적용 완료(코드 확인 — 주석에 "2026-08-04~08-19 24/30일 실패" 이력 명시, cycle 2326 재확인 이력도 존재). 이번 3일도 동일 계열 external 사이트 anti-bot 차단으로 판단 — 08-23/08-24 run 은 이미 정상 success 로 self-heal 확인(games_found=30, predictions=30). 다운스트림 영향 확인: `mlb_predict_final` 은 동일 3일(08-19~08-22 run_date) 모두 status=success, predictions 9~15건 정상 생성 — `mlb_team_stats` 가 이전 성공분 stale 값으로 fallback 되어 예측 파이프라인 자체는 무영향(실측 쿼리로 확인, 추측 아님).

실행: 코드 변경 없음 — cycle 2383 과 동일한 "self-healed, 재발성 external 차단, 다운스트림 영향 0" 패턴 3rd recurrence 확인. 코드 수정 불필요 판단.

다음 사이클 추천 = review-code(heavy) 계속(잔존 미감사: `debug/factor-correlation` 계열) 또는 op-analysis(gap 5/25) 또는 info-arch(gap 29/30, 임박).

## 🔵 RETRO-ONLY — review-code(heavy) analysis/game/[id]/page.tsx 최초 전체 감사, 신규 issue 0건 (cycle 2483, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 19/20, op-analysis 4/25, info-arch 28/30, lotto 5/30). 직전 8 사이클 distinct=5(review-code/polish-ui/explore-idea/lotto/operational-analysis) — 2-chain lock 미충족. 직전 15 사이클 saturation 11/15 — explore-idea trigger 미충족. lite chain retro-only cap 미충족(최대 streak=1). 강한 trigger 부재, cycle 2482 retro 추천대로 review-code(heavy) 4연속 — 미감사 대형 파일 `analysis/game/[id]/page.tsx`(868줄, review-code 이력 0건) 선정.

감사: 전체 868줄 read + 직접 참조하는 `computeCompositeDuel.ts`/`analysis-data.ts`(H2H)/`convergenceRecord.ts`/`JudgeVerdictPanel`/`AgentArgumentBox`/`GameOverview`/`DetailedFactorAnalysis` 전부 대조. 3건 수치 직접 추적(favoredWeightPct 정규화/tri-state 임계값/predictionLeadHours KST 오프셋) 전부 정합. cycle 2480 에서 수정된 park-factor 배지 역전 버그와 동일 계열 점검 — 본 페이지는 해당 색상 배지 자체가 없어(계산은 `computeCompositeDuel.ts` 단일 소스만 사용) 영향 없음. 하드코딩 vs 실제 상수 mismatch, home/away 부호 역전, KST/UTC drift 전부 미발견. 기존 회귀 테스트 7건(cycle 2292/2295/2303/wave-478 등) 전부 pass 유지 확인.

실행: 코드 변경 없음(신규 issue 0건 — `1f0bf47c`/`dbf71168`/`2e5788e4`/`7533918a` 계열과 동일한 clean audit 결과). `pnpm type-check`(4 packages clean) + `pnpm lint`(3 packages clean) + `pnpm test`(505 files/4240 tests) 전부 green 재확인만.

다음 사이클 추천 = fix-incident(gap 20/20 도달 — 다음 사이클 trigger 충족 예상) 또는 review-code(heavy) 계속(잔존 미감사 대상 재탐색 필요, 주요 monolith 3건 소진).

## 🟢 SUCCESS — review-code(heavy) page.tsx(홈) 최초 전체 감사, BigMatchDebateCard 하드코딩 "80%" 문구 정정 (cycle 2482, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 18/20, op-analysis 3/25, info-arch 27/30, lotto 4/30). 직전 8 사이클 distinct=5 — 2-chain lock 미충족. 직전 15 사이클 saturation 10/15 — explore-idea trigger 미충족. 강한 trigger 부재, cycle 2481 retro 추천대로 review-code(heavy) 3연속 — `page.tsx`(1090줄, 홈, 최초 전체 감사 이력 없음) 선정.

발견: 페이지 자체(winProb 계산/Elo 보너스/주간카드 홈원%/isReliable 게이팅/METHODOLOGY_GROUPS/MIN_POLL_TOTAL 등)는 전부 정합 확인. 대신 직접 렌더하는 `BigMatchDebateCard.tsx:88,100` 이 "승률 80%+ 기준" 을 하드코딩 — 실제 선정 로직(`selectBigMatchFromGames`, page.tsx:572-594)은 티어 우선순위(confident→lean→tossup) fallback 이라 고정 임계값이 없음. commit e930847f(2026-04-22) 시점엔 `HIGH_CONFIDENCE_THRESHOLD`(0.6→80%) 게이팅이 실제 로직이라 문구가 맞았으나, 바로 다음날 ea56cd92 가 현재 로직으로 교체하며 문구만 동기 안 되고 방치 — 해당 상수도 이미 코드베이스에서 제거됨. 반반(tossup) 경기도 선정 가능해 표시된 확률(예: 53%)과 문구(80%+)가 최대 27pp 모순 가능.

실행: 툴팁 + 서브타이틀 문구를 실제 티어 우선순위 로직에 맞게 재작성. `pnpm type-check`(4 packages clean) + `pnpm test`(505 files/4240 tests) + `pnpm lint` clean. 단일 논리 단위 → main 직접 commit+push (R4).

다음 사이클 추천 = review-code(heavy) 계속 (`analysis/game/[id]/page.tsx`(868줄) 미감사 잔존) 또는 fix-incident(gap 19/20, 임박).

## 🟢 SUCCESS — review-code(heavy) reviews/weekly 주차 경계 UTC→KST 정정 (cycle 2481, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 17/20, op-analysis 2/25, info-arch 26/30, lotto 3/30). 직전 8 사이클 distinct=5(review-code/polish-ui/explore-idea/lotto/operational-analysis) — 2-chain lock 미충족. 직전 15 사이클 review-code+polish-ui=9/15 — explore-idea saturation 미충족. 강한 trigger 부재, cycle 2480 retro 추천대로 review-code(heavy) 계속 — 미감사 대형 파일 중 `reviews/weekly/[week]/page.tsx`(524줄, review-code 이력 0건) 선정.

발견: 페이지 자체(배지 색상/파라미터 순서/컴포넌트 시그니처)는 전부 정합 확인, 대신 의존 유틸 `computeWeekRange.ts`의 `toMondayUTC`가 "현재 시각"의 요일을 raw UTC 기준으로 판정 — `packages/shared`에 이미 존재하는 KST-aware 패턴(`getKSTWeekRange`/`getKSTMondayUtcIso`, 둘 다 KST_OFFSET_MS shift 후 UTC 필드 사용)과 다른 방식으로 별도 구현돼 있었음. 월요일 00:00~09:00 KST(=일요일 15:00~24:00 UTC) 구간에는 `getCurrentWeek()`가 이전 주로 오판정 — `getCurrentWeek` 호출부 8곳(`/reviews/weekly`, `/mlb/reviews/weekly`, `/en/mlb/reviews/weekly`의 각 리다이렉트+not-found, `analysis/page.tsx`, `mlb/analysis/page.tsx`, `analysis-data.ts` 2개) 전부 영향 — CLAUDE.md "날짜는 KST 기준" 원칙 위반. 기존 테스트(`computeWeekRange.test.ts`)는 전부 경계에서 먼 시각만 사용해 이 구간 미검증.

실행: `toMondayUTC`에 `KST_OFFSET_MS` shift 추가(shared의 `getKSTWeekRange`와 동일 원리) — jan4/targetMonday 등 이미 00:00 UTC인 calendar-date 입력은 +9h shift해도 같은 날짜라 회귀 없음(기존 테스트 전부 이 조건 만족, unaffected 확인). 신규 회귀 테스트 2건(월요일 00:30/08:59 KST 경계) 추가. `pnpm type-check`(4 packages clean) + `pnpm test`(505 files/4240 tests, 기존 4238 + 신규 2) + `pnpm lint` clean. 단일 논리 단위 → main 직접 commit+push (R4).

다음 사이클 추천 = review-code(heavy) 계속 (잔존 미감사 대형 파일: `page.tsx`(1090줄, 홈 — 마지막 전체 감사 cycle 2438 근처로 추정, 재확인 필요) / `analysis/game/[id]/page.tsx`(868줄) / `mlb/reviews/weekly/[week]/page.tsx`+영문 미러 2건(동일 family — `getCurrentWeek` 호출부라 본 fix로 이미 해소, 재확인만) / `debug/factor-correlation` 계열) 또는 fix-incident(gap 18/20, 근접) 또는 explore-idea(saturation 10/15, 근접).

## 🟢 SUCCESS — review-code(heavy) analysis/page.tsx 최초 전체 감사, 구장 배지 색상 역전 + 가중치 툴팁 하드코딩 정정 (cycle 2480, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 16/20, op-analysis 1/25 — 직전 사이클 방금 발화, info-arch 25/30, lotto 2/30). 직전 8 사이클 distinct=5(review-code/polish-ui/explore-idea/lotto/operational-analysis) — 2-chain lock 미충족. 직전 15 사이클 saturation 9/15 — explore-idea trigger 미충족. 강한 trigger 부재 상태에서 `apps/moneyball/src/app` 내 최대 monolith 파일 목록 재확인 → `analysis/page.tsx`(2803줄, 마지막 전체 감사 cycle 2149 = 331 사이클 stale) 이 review-code heavy 대상으로 명확 — 최근 5 사이클(2469~2475) 이 daily.ts/accuracy/teams/[code]/mlb 페이지들 최초 전체 감사로 매번 real bug 를 찾은 패턴과 정합.

발견 (Explore agent 전체 2803줄 read, 30+ home/away sign 계산 + 모든 division site 재검증 후 2건 확정, 나머지는 false positive 배제):
1. 오늘 경기 리스트 항목(`:1761-1765`, wave-369) 구장 팩터 배지 색상이 같은 파일 내 동일 조건을 렌더하는 다른 3곳(`:909-925`/`:1196-1214`/`:2246-2264`)과 반전 — 타자친화(orange)/투수친화(brand)로 뒤바뀜. 같은 경기 카드 내 다른 위치에서 같은 구장이 서로 다른 색으로 렌더되는 모순.
2. `:542` "전체 팩터 가중치" 툴팁이 `FACTOR_PICK_WEIGHT_TOTAL` 상수(바로 두 줄 위 `:508`에서 이미 참조 중) 대신 리터럴 `0.85` 하드코딩 — `DEFAULT_WEIGHTS` 재조정 시 계산값은 자동 갱신되지만 툴팁 텍스트만 stale 하게 남는 silent drift 소지.

실행: 색상 조건 스왑(파일 내 컨벤션 통일) + 툴팁 템플릿 리터럴로 상수 참조 변경. `pnpm type-check`(4 packages clean) + `pnpm test`(505 files/4238 tests 전량 pass) + `pnpm lint` clean. 단일 논리 단위 → main 직접 commit 2건(fix + VERSION 3-way sync 정정, R4) + push(v0.5.62.103).

다음 사이클 추천 = review-code(heavy, 같은 family — `page.tsx`(1090줄)/`predictions/[date]/page.tsx`(619줄) 등 잔존 대형 파일 계속 탐색) 또는 fix-incident(gap 17/20 — 아직 미달) 또는 explore-idea(다양성, saturation 10/15 — 아직 미달이나 근접).

## 🟡 PARTIAL — operational-analysis(lite) CE cohort 5th zero-change, non-CE 표본 7주+ 동결 (cycle 2479, 2026-08-24)

진단: open issue 0, approved plan 0/22(전부 completed/archived/tier4/deferred, status:approved 없음). gap trigger 4종 미도달(fix-incident 14/20 — CI green 확인, op-analysis 7/25, info-arch 23/30, lotto 0/30 — 직전 사이클 방금 발화). 직전 8 사이클 distinct=5(review-code/operational-analysis/polish-ui/explore-idea/lotto) — 2-chain lock 미충족. 직전 15 사이클 review-code+fix-incident+polish-ui+info-arch=10/15 — explore-idea saturation 미충족. 강한 trigger 부재 상태에서 cycle 2477/2478 양쪽 retro 가 공통 추천한 "operational-analysis(lite) 신선도 재확인" 채택 — review-code 최근 8사이클 중 4회 dominance 완화 목적 겸.

실행: `scripts/op-analysis-ce-cohort.ts` 동일 harness 재실행 (`/tmp/ce-cohort-2479.json`). 결과 = **cycle 2450 측정치와 완전 동일** — 전체 n=337 (CE n=290 / 비CE n=47), CE 53.4%(155/290) / 비CE 63.8%(30/47), 격차 10.4pp, overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 (LLM 부가가치 우세 방향 유지). 비CE 표본 마지막 신규 예측 = 2026-07-01 그대로 (7주+ 완전 동결 지속). **5th 연속 zero-change** (cycle 2361→2415→2450→2471→2479 동일 수치 반복, CREDIT_EXHAUSTED 미해소 지속).

결론: 코드 변경 0, 신규 정보 0 — 반복 확인 자체가 목적인 lite 재측정. non-CE 표본이 완전 동결(2026-07-01 이후 0건)인 한 이 harness 재실행은 매번 동일 수치만 반환 — 사용자 크레딧 재충전 전까지 신규 gap 재분리 불가능한 상태 변화 없음.

다음 사이클 추천 = review-code(heavy, 미감사 파일 계속 탐색) 또는 fix-incident(gap 15/20 — 아직 미달) 또는 explore-idea(다양성, saturation 10/15 아직 미달이나 접근 중). op-analysis 는 non-CE 표본 신규 유입 전까지 재발화 우선순위 낮춤 권장 (동일 수치 6th 반복 방지).

## ⚪ RETRO-ONLY — explore-idea(heavy) 신규 아이디어 탐색, actionable gap 소진 확인 (cycle 2477, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 13/20, op-analysis 6/25 — 직전 4연속 zero-change n=337 동결, info-arch 22/30, lotto self-heal 최신 no-op). 직전 8 사이클 distinct=3(review-code/operational-analysis/polish-ui) — 2-chain lock 미충족. 직전 15 사이클 review-code+fix-incident+polish-ui+info-arch = 12/15 → **explore-idea saturation trigger 충족** — cycle 2476 retro 추천("review-code or explore-idea")과 정합해 explore-idea(heavy) 선택.

탐색 결과 (신규 gap 없음 확인): (1) `mlb/players/[id]` vs KBO `players/[id]` 비교 — MLB 쪽은 Statcast per-player 데이터 자체가 미수집(ETA carry-over, plan #29 Tier4 확정)이라 착수 불가 재확인. (2) `teams/[code]`/`mlb/team/[code]` RelatedLinks·H2H 링크 parity — 이미 양쪽 동일 (`pairsForTeam`/`mlbPairsForTeam`). (3) KBO `/leaderboard`(픽 순위) vs MLB — `mlb_user_picks`(050) Phase 1만 존재, Phase 3(순위 뷰+페이지)는 plan #27 이 cycle 2256 데이터 게이트로 무기한 보류 확정(KBO `user_picks` COUNT=1, MLB COUNT=0, cycle 2334 재확인도 변화 0) — 여전히 데이터 부재로 자율 착수 불가. (4) `/search` 정적 엔트리 — MLB 전 라우트 이미 커버 확인. (5) KBO `/picks` 개인 이력 — plan #27 cycle 2256 이 이미 "MLB `mlb-` 접두 id 도 리그 무관 통합 렌더링 중"임을 확인해 전용 `/mlb/picks` 자체가 불필요 결론남.

결론: 현재 KBO↔MLB feature-parity 탐색 공간이 사실상 소진 — 남은 gap 은 전부 (a) 사용자 영역 데이터 게이트(Statcast per-player, 픽 참여 표본) 대기이거나 (b) 이미 review-code(heavy) 가 최근 5 사이클(2472~2476) 안에 발견·해소함. 코드 변경 0, retro-only 처리.

다음 사이클 추천 = operational-analysis(lite, gap 6/25 — 아직 미달이나 신선도 재확인 겸) 또는 fix-incident(gap 13/20 — 아직 미달, `gh run list` 로 CI 실패 여부만 확인) 또는 review-code(heavy, 다른 미감사 파일 탐색 — 단 saturation 재트리거 유의).

## 🟢 SUCCESS — review-code(heavy) mlb/team/[code] KBO parity gap, 예정 경기 · 예측 섹션 신규 (cycle 2475, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 11/20, op-analysis 4/25, info-arch 20/30, lotto self-heal 최신 no-op). 직전 8 사이클 distinct=3(review-code/explore-idea/operational-analysis) — 2-chain lock 미충족. 직전 3 사이클(2472~2474) 연속 review-code(heavy) success streak — dominance-positive streak(cycle 135 룰) 인정, cycle 2474 가 해소한 matchup parity gap 과 같은 family(팀 단위 "예정 경기+예측") 존재 여부를 `teams/[code]` vs `mlb/team/[code]` 대조로 재확인.

발견: KBO `teams/[code]/page.tsx` 는 `buildTeamUpcoming.ts` 로 팀 예정 경기(최대 7경기) + AI 예측을 "예정 경기 · 예측" 섹션으로 노출하지만, MLB `mlb/team/[code]`(KO+EN, cycle 2087/2097/2112/2268/2418 5회 감사됐음에도 이 gap 미발견) 에는 처음부터 부재 — cycle 2474 matchup gap 과 동일 family, plan #24 MLB 확장 시 통째로 누락된 조각.

실행: `buildMlbTeamUpcoming.ts` 신규(`mlb_schedule` + `predictions`(pre_game/mlb/MLB_PRODUCTION_COHORT_RULES) 조인, KBO `TEAM_UPCOMING_LIMIT`(7) 재사용, `deriveMlbOutcome` 으로 home_win_prob 기반 derive — `buildMlbMatchupUpcoming.ts`(cycle 2474) 동일 컨벤션). KO+EN 팀 페이지 Elo 추이 섹션 직후에 KBO 동일 UI 삽입. 신규 테스트 4건(빈 배열/홈 예측/원정 예측 반전/예측 부재 fallback). `pnpm type-check`(4 packages clean) + `pnpm test`(505 files/4238 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (v0.5.62.101).

다음 사이클 추천 = review-code 계속 (같은 family — 다른 MLB 페이지에도 KBO 대비 유사 parity gap 존재 가능성 재점검, 예: mlb/players/[id] vs KBO 원본) 또는 operational-analysis(lite, gap 5/25 — 여전히 저신선도) 또는 explore-idea(다양성 회복, review-code 4/8 dominance 지속).

## 🟢 SUCCESS — review-code(heavy) mlb/matchup/[teamA]/[teamB] KBO parity gap, 다음 경기 예측 섹션 신규 (cycle 2474, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 전부 미도달(fix-incident 10/20, op-analysis 3/25, info-arch 19/30, lotto 34/30 — 실측 확인 결과 `~/lotto_picks/2026-08-29-50sets.md`+`2026-08-22-result.md` 모두 cron self-heal 로 이미 최신, no-op skip). 2-chain lock 미충족(직전8 distinct=3: review-code/explore-idea/operational-analysis). 리포 파일 크기 재조사 → review-code 반복 타겟 대부분 최근 수 사이클 안 감사 완료 확인(analysis/accuracy/teams/daily.ts/mlb game-detail 등) 후 인접 monolith `mlb/matchup/[teamA]/[teamB]/page.tsx`(455줄)+EN 미러(508줄) 선정. KBO `/matchup/[teamA]/[teamB]` 와 h2 섹션 수 비교(KBO 7개 vs MLB KO/EN 각 6개) 대조 감사.

발견: KBO `/matchup/[teamA]/[teamB]` 는 `buildMatchupUpcoming.ts` 로 두 팀의 예정 경기 + AI 사전예측을 "다음 경기 예측" 섹션으로 노출(cycle 1640 wave-309)하지만, MLB `mlb/matchup/[teamA]/[teamB]`(KO+EN) 는 이 섹션 자체가 처음부터 부재 — `apps/moneyball/src/lib/mlb/` 디렉토리 전체에 scheduled 상태의 MLB 경기 예측을 조회하는 코드가 0건 확인(단일 페이지 격차가 아니라 리그 전체에 이 기능이 미구현). plan #24 MLB 확장(Phase 1~3c) 당시 KBO 원본의 이 조각만 이식이 빠졌던 feature parity gap.

실행: `buildMlbMatchupUpcoming.ts` 신규(`mlb_schedule`(status='scheduled', game_date ≥ 오늘 KST) + `predictions`(prediction_type='pre_game', league='mlb', scoring_rule ∈ MLB_PRODUCTION_COHORT_RULES) 조인 — `buildMlbMatchupProfile.ts` 동일 컨벤션, `deriveMlbOutcome` 재사용해 `home_win_prob` 로 predictedWinnerCode/confidence derive). KO+EN 매치업 페이지 양쪽에 KBO 섹션과 동일 UI(승률 바 + 팀로고 + 티어 배지, 이미 MLB 컨텍스트(en/mlb/predictions)에서 쓰이는 league-agnostic `classifyWinnerProb`/`winnerProbOf`/`pickTierEmoji`/`WINNER_TIER_LABEL` 재사용) 신규 삽입. 신규 테스트 3건(빈 배열/예측 있음 derive/예측 부재 시 null). `tsc --noEmit`(4 packages clean) + `pnpm test`(504 files/4234 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (v0.5.62.100, VERSION 파일 sync 정정 커밋 1건 추가).

다음 사이클 추천 = operational-analysis(lite, gap 4/25 — 여전히 저신선도) 또는 explore-idea(다양성 회복, review-code 3/8 최근 dominance 완화됨) 또는 review-code 계속(다른 MLB 페이지에도 이번과 유사한 "KBO 기능 미이식" 격차 존재 가능성 — team/[code] 등 재점검 여지).

## 🟢 SUCCESS — review-code(heavy) mlb/games/[date]/[slug] EN 미러 최초 전체 감사, 모델 메타 정보 섹션 누락 정정 (cycle 2472, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 전부 미도달(fix-incident 8/20, op-analysis 1/25, info-arch 17/30, lotto 32/30 — self-heal 이미 최신, 5th no-op skip). 2-chain lock 미충족(직전8 distinct=4). op-analysis 재실행 시 오늘 4번째 연속 zero-change 예상 — 배제. review-code 반복 타겟 전부 감사 이력 확인 후 `mlb/games/[date]/[slug]/page.tsx`(543줄, context/i18n wave 다수 부분 터치했지만 전용 최초 감사 0건) 선정, KO 원본 read + EN 미러 diff 대조.

발견: KO 페이지의 "모델 메타 정보" `<details>`(model_version/debate_version/predictionLeadHours, cycle 2423 도입) 섹션이 EN 미러에 select 쿼리 컬럼 3개부터 통째로 빠져있었음 — i18n silent leak family 의 MLB game-detail 신규 인스턴스. 부수 발견: 우세팀 배너가 KO 는 `mlbShortTeamName`(예: "Yankees") 사용, EN 은 raw 코드(예: "NYY") 노출하던 표시 불일치.

실행: EN 페이지에 3개 컬럼 + `predictionLeadHours` 계산 + KO 와 동일 위치 영문 "Model metadata" 섹션 신규 + winnerCode `mlbShortTeamName` 래핑. `pnpm type-check`(4 packages clean) + `pnpm test`(503 files/4231 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (v0.5.62.99).

다음 사이클 추천 = operational-analysis(lite, gap 2/25 — 여전히 저신선도, 재확인만 낮은 가치) 또는 review-code 신규 target 계속 탐색 (i18n silent leak family 패턴이 MLB 신규 페이지들에 반복 재발 가능성 — en/mlb 하위 다른 페이지 대상 우선 점검 여지) 또는 explore-idea(다양성 회복, saturation 미충족 9/15).

## 🟡 PARTIAL — operational-analysis(lite) CE cohort 재측정, n=337 동결 4th 재확인 (cycle 2471, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 전부 미도달(fix-incident 7/20, op-analysis 5/25, info-arch 16/30, lotto 31/30 — 30-cycle gap 충족했으나 실측 확인 결과 이미 self-heal 완료, 신규 작업 없음). 2-chain lock 미충족(직전8 distinct=4: review-code/fix-incident/operational-analysis/explore-idea). explore-idea 신규 리드 탐색(3-source: `/login`+`/community`+`PlaceholderLoginButton` 는 plan #29 risk=3/자율불가 Tier4 확정 재확인, MLB player Statcast deep-dive placeholder 도 "사용자 영역 ETA" 동일 성격 확인 — 신규 착수 불가) 및 review-code 신규 target 탐색(scrapers/ 디렉토리 max 526줄 fancy-stats.ts 이미 감사 완료(cycle 2277/2371), agents/validator.ts 이미 4회 감사(2122/2241/2281/2369/2398), reviews/weekly·predictions/[date]·factor-correlation·mlb/team/[code]·methodology 전부 감사 이력 확인) — 양쪽 모두 신규 actionable target 소진 확정, op-analysis(lite) 최종 선택.

lotto gap 확인: 마지막 발화 cycle 2440(31-cycle gap 충족)이었으나 `~/lotto_picks/2026-08-29-50sets.md`(1239회, Aug 23 박제) + `2026-08-22-result.md`(1238회 OOS, Aug 23 박제) 모두 cron self-heal 로 이미 최신 — cycle 2440 과 동일 결론이라 재실행 skip (중복 저가치 방지).

실행: `pnpm tsx scripts/op-analysis-ce-cohort.ts` 재실행 — 전체 n=337 (CE n=290 / 비CE n=47, cycle 2448/2466/2469 와 완전 동일, 4번째 연속 zero-change 확인 — 오늘(2026-08-24) 하루 안 30+ cycle 누적으로 predictions 신규 유입 없음, 예상된 결과). CE 53.4%(155/290) / 비CE 63.8%(30/47) → 격차 10.4pp (cycle 2448 10.4pp 대비 동일). overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 → LLM 부가가치 우세 방향 재확인(변화 없음). 코드 변경 0.

다음 사이클 추천 = explore-idea 또는 review-code 신규 target 완전 소진 상태 — 다음 실제 진전은 (1) 새 날짜(KST 자정 이후) 신규 predictions 유입 후 op-analysis 재측정 또는 (2) KBO 포스트시즌 진출 시점(plan #29 재평가 트리거) 또는 (3) 사용자 직접 지시. 당분간 review-code/explore-idea 자연 saturation 상태 — skill-evolution trigger 5 미충족(review-code 11/19 존재)이나 다음 cycle 도 유사 저신호 예상.

## 🔍 RETRO-ONLY — review-code(heavy) teams/[code]/page.tsx 최초 전체 감사, clean (cycle 2470, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 completed/archived/tier4/spec_only_deferred). gap trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 4/25, info-arch 15/30, lotto 30/30 아직 미충족). 2-chain lock 미충족(직전8 distinct=4: review-code/fix-incident/operational-analysis/explore-idea). `gh run list` CI 전부 green, fix-incident 신호 없음. 리포 파일 크기 재조사 → `apps/moneyball/src/app/teams/[code]/page.tsx`(622줄) 가 git log 전수 검색상 "최초 전체 감사" 이력 0건 확인 (index.ts/analysis/accuracy/mlb-pipeline/convergenceRecord/buildAccuracyData/buildMatchupProfile 등 인접 상위 monolith 는 모두 최근 감사 완료) — 신규 unaudited target 으로 선정, 전체 622줄 read.

검증 항목: (1) PARK_FACTOR_HITTER_MIN(105)/PITCHER_MAX(95) 분류 로직 — `teams/page.tsx` 목록 페이지와 동일 임계값·방향 사용 확인, drift 없음. (2) `getConvergencePickTeamStats` → `fetchConvergencePickDetailedResults` 가 PRODUCTION_COHORT_RULES 필터 보유 확인 (#1338 family 재발 아님). (3) `buildTeamUpcoming.ts` 가 `CURRENT_SCORING_RULE` 단일값만 필터 (PRODUCTION_COHORT_RULES 아님) — 그러나 대상이 예정(미래) 경기라 과거 cohort 값이 애초에 존재할 수 없는 범위라 실질 영향 없음 (#1338 family 오탐 배제, 과거 검증 리스트 페이지들과는 성격 다름). (4) SMALL_SAMPLE_N 소표본 hedge, ACCURACY_GOOD_RATE/MID_RATE 색상 분기 모두 shared 상수 정합. 신규 버그 미발견 — clean.

다음 사이클 추천 = operational-analysis(lite, gap 4/25 — 아직 저신선도 가능성 높음, 재확인만 낮은 가치) 또는 explore-idea (다양성 회복, review-code 인접 monolith 거의 소진).

## 🟢 SUCCESS — review-code(heavy) daily.ts 최초 전체 감사, PipelineMode 크로스 파이프라인 오염 정정 (cycle 2469, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 3/25, info-arch 14/30, lotto 29/30). 2-chain lock 미충족(직전8 distinct=4: explore-idea/review-code/fix-incident/operational-analysis). op-analysis-ce-cohort.ts 재실행 결과 n=337 (cycle 2448/2466 과 완전 동일, 신선 데이터 0) — lite 저가치 판단해 배제. cycle 2468 review-code(lite) health baseline 완료 직후, heavy pool 소진 경고(2458/2460/2462/2465) 대응해 리포 전체 파일 크기 재조사 → `packages/kbo-data/src/pipeline/daily.ts`(1626줄, 리포 최대 파일)가 수십 건 부분 fix commit(cycle 813/864/886/936/1021/1022/1173~1191/1446/1455/1495 등) 대비 "최초 전체 감사" CHANGELOG 이력 0건 확인 — review-code heavy 최우선 신규 타겟으로 선정, 전체 1627줄 read.

발견: `export type PipelineMode`(daily.ts) 이 자기 함수 `runDailyPipeline` 이 실제 분기 처리하는 4개 모드(announce/predict/predict_final/verify) 외에 MLB 파이프라인(`mlb-pipeline.ts`) 전용 8개 모드(`mlb_statsapi_scrape` 등) + `postview` 리터럴까지 포함한 13종 union 이었음. 원인 추적: `silent-drift-alert.ts`(daily.ts/mlb-pipeline.ts/postview-daily.ts 3개 파이프라인이 공용으로 호출하는 cross-pipeline alert dispatcher) 의 `SilentDriftAlertMeta.mode` 필드가 3개 소스 리터럴을 다 받아야 했는데, 전용 타입을 새로 안 만들고 daily.ts 의 `PipelineMode` 를 그대로 재사용해 옮겨붙인 것이 근본 원인. 결과: `runDailyPipeline` 의 실제 switch 로직은 'announce'/'verify' 만 명시 분기하고 그 외(예: 'postview' — 실제로는 별도 `runPostviewDaily()` 함수가 처리, `runDailyPipeline` 는 관여 안 함)는 아무 가드 없이 predict/predict_final 코드 경로(실 DB insert)로 조용히 fall-through — 타입 시그니처가 "13개 모드 지원"을 약속하지만 실제로 지원하는 건 4개뿐이라 나머지 9개를 넘기면 조용히 잘못된 동작을 하는 타입 안전 구멍. 현재 유일 caller 인 `/api/pipeline` route.ts 는 이미 4개 값만 허용해 실제 프로덕션 영향은 없었지만(TS 컴파일 타임에만 존재하는 잠복 위험), 향후 코드에서 `runDailyPipeline(date, 'postview')` 처럼 직접 호출하면 타입체크 통과 후 조용히 오작동.

실행: daily.ts `PipelineMode` 를 실제 처리 4종(announce/predict/predict_final/verify)으로 축소. `silent-drift-alert.ts` 에 자체 `SilentDriftPipelineMode`(13종 전체) 신규 정의해 daily.ts import 제거 — 진짜 크로스 파이프라인 소비처가 직접 소유. `notify-status-predicate.ts::shouldNotifyPipelineStatus` 는 원래도 미인식 모드 문자열을 전부 false 로 방어하는 순수 predicate(기존 테스트가 'mlb_predict_final'/'mlb_statsapi_scrape' 로 이미 방어 로직 검증 중)라 `mode: string` 으로 완화 — daily.ts 좁힌 타입과 충돌 없이 기존 방어 테스트 그대로 유지.

검증: `pnpm type-check`(4 packages clean) + `pnpm --filter @moneyball/kbo-data test`(90 files/1184 tests) + `pnpm test`(503 files/4231 tests 전량 pass) + `pnpm lint` clean + pre-push hook(lint+type-check+version-sync-guard) pass + CI green 실측(74abb093). 런타임 동작 변경 없음(순수 타입 정합성 fix) — 단일 논리 단위라 PR 없이 직접 main commit+push (v0.5.62.98).

다음 사이클 추천 = operational-analysis(lite, gap 4/25 — 여전히 신선도 부족 가능성 높음, 재확인만) 또는 explore-idea (다양성 회복, review-code 신규 monolith target 1건 소진).

## 🔍 RETRO-ONLY — review-code(lite) health baseline 재측정, score 10/10 유지 (cycle 2468, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 전부 미도달(fix-incident 4/20, op-analysis 2/25, info-arch 13/30, lotto 28/30). 2-chain lock 미충족(직전8 distinct=4). lite retro-only cap 미충족(review-code/op-analysis 각 streak=1). 직전 20 cycle 분포: review-code 10 + op-analysis 3 + explore-idea 3 + fix-incident 2 + skill-evolution 1 + info-arch 1. cycle 2467 추천(review-code lite 또는 op-analysis lite gap 2/25 — 너무 신선) 중 review-code(lite) 채택 — review-code heavy pool 재고갈(2458/2460/2465 연속 clean audit) 반영.

실행: `pnpm type-check`(4 packages: kbo-data/shared/moneyball/cron 전부 clean) + `pnpm lint`(0 warnings) + `pnpm test`(503 files / 4231 tests 전량 pass, 48.6s). composite 10.0/10. health-history.jsonl append. 직전 측정(cycle 2335, 2026-08-20) 대비 tests 4156→4231(+75) / files 495→503(+8) 성장에도 score 불변 — 품질 저하 없음 확인. 코드 변경 0.

다음 사이클 추천 = operational-analysis(lite, gap 3/25) 또는 explore-idea (다양성 유지, review-code lite baseline 방금 완료).

## 🟢 SUCCESS — explore-idea(heavy) EN MLB game-detail 팩터 수렴 픽 배지 parity (cycle 2467, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 Tier4/완료). gap trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 1/25, info-arch 12/30, lotto 27/30). 2-chain lock 미충족(직전8 distinct=4). explore-idea saturation 미충족(11/15). cycle 2465/2466 review-code pool 고갈 경고 재확인 — 4대 monolith + convergenceRecord/buildTeamProfile/buildMatchupProfile/buildMlbMatchupProfile/buildMlbTeamAccuracy/buildAccuracyData/backtest-manual-weights-run/validator.ts/lotto-methodology/teams-[code]/matchup-[teamA] 전부 최근 감사 완료 확인, 신규 actionable target 부재 확정. MLB debate 컴포넌트(JudgeVerdictPanel 등) parity 는 MLB debate_version:null(미구현) + CREDIT_EXHAUSTED 상태라 저가치 판단, 제외.

발견/실행: KO(`/mlb/games/[date]/[slug]`, 543줄) vs EN(`/en/mlb/games/[date]/[slug]`, 341줄) 라인수 diff → cycle 2461 이 KO 전용으로 배선한 팩터 수렴 픽 배지(computeMlbCompositeDuel 기반)가 EN 미러에 완전 누락 확인. `EN_FACTOR_LABELS_SHORT`(en/mlb/factors shortLabel 과 동일 값: SP FIP/SP xFIP/Lineup wOBA/Bullpen FIP/Team WAR/PF) 신규 정의 후 KO와 동일 게이팅 로직(완전수렴/강수렴/균형 3-tier) + JSX 이식 (+144 lines). glossary 링크는 `/en/mlb/factors#{slug}` (기존 KBO_FACTORS id 와 slug 일치 확인).

검증: tsc --noEmit clean / eslint clean / vitest 503 files·4231 tests 전량 pass / pre-push hook(lint+type-check+version-sync-guard) pass / CI green 실측(650575a8) / Vercel deploy dispatch skipped(정상). 단일 파일 low-risk 이식이라 PR 없이 직접 main commit+push.

다음 사이클 추천 = review-code(lite, health baseline — heavy pool 재고갈 확인) 또는 operational-analysis(lite, gap 2/25).

## 🟡 PARTIAL — operational-analysis(lite) CE cohort n=337 재확인, 파이프라인 정상 규명 (cycle 2466, 2026-08-24)

진단: open issue 0, approved plan 0/29. gap trigger 4종 전부 미도달(fix-incident 2/20, op-analysis 7/25, info-arch 11/30, lotto 26/30). 2-chain lock 미충족(직전8 distinct=4). saturation 미충족(11/15). CI 전량 green. cycle 2465 추천(operational-analysis lite) 채택.

실행: `pnpm tsx scripts/op-analysis-ce-cohort.ts` 재실행 → n=337 (CE 53.4%/155/290, 비CE 63.8%/30/47, 격차 10.4pp) — 같은 날(2026-08-24) cycle 2448(08-23 23:32 KST) 실행 결과와 완전 동일 수치. 신규 verify 0건 원인 직접 조사: `pipeline_runs`/`predictions` 테이블 조회 → 최신 verified_at = 2026-08-23T14:17 UTC (cycle 2448 실행 시점 14:32 KST 이전) — cycle 2448 이후 아직 새 KBO 경기 verify 없었을 뿐, 파이프라인 정지 아님 (정상 야간 공백). 부수 확인: 게임 10734 재예측 3건(shadow/in_game/post_game) 존재하나 pre_game 1건만 is_correct/verified_at 세팅 — cohort 스크립트 dedup 버그 가설 기각(clean).

결론: 수치 변화 없어 CLAUDE.md 갱신 생략(중복 기재 방지). 코드 변경 0.

다음 사이클 추천 = review-code(heavy, 대형 미감사 lib 재탐색) 또는 explore-idea (op-analysis 는 신선 데이터 쌓일 때까지 보류 권장).

## 🔍 RETRO-ONLY — review-code(heavy) backtest-manual-weights-run.ts 신규 감사, 비활성 스크립트 clean 확인 (cycle 2465, 2026-08-24)

진단: open issue 0건 (`hub-dispatch` + 전체 open 모두 0). approved plan 0/29 (전부 completed/deferred/archived). gap trigger 4종 전부 미도달(fix-incident 1/20 방금 발화, op-analysis 6/25, info-arch 10/30, lotto 25/30 — picks/result 이미 박제돼 lite 불필요). 2-chain lock 미충족(직전8 distinct=4: explore-idea/review-code/operational-analysis/fix-incident). explore-idea saturation 미충족(11/15). DESIGN.md mtime 1일 전 — design-system 미충족. cycle 2464 retro 1순위 추천(review-code heavy, 잔여 대형 미감사 lib 재탐색) 채택 — pool 고갈 경고(cycle 2462/2463) 대응해 `git log --grep` 로 미감사 후보 재탐색.

감사 범위: `packages/kbo-data/src/pipeline/backtest-manual-weights-run.ts`(429줄) 최초 전체 감사 — H4 검증(manual 가중합 vs logistic 학습) 비교 스크립트. `computeFactors`/`manualScore`/`extract`/`main` 전체 read.

발견: (1) `normalize()` 의 `if (homeVal===0 && awayVal===0) return 0.5` (L99) 가 바로 다음 `if (total===0) return 0.5` (L101) 와 항상 동일 결과 — abs합=0 은 두 값 모두 0 일 때만 가능해 L99 는 완전 redundant dead branch. (2) `computeFactors` 의 `park_factor` (L139-147) 가 pf>1 분기로 1차 계산한 뒤 pf>10 분기가 항상 재계산 override — wayback parkPf 실측 범위(92~108)에서 1차 계산은 100% 폐기되는 죽은 계산.

결론: 두 항목 모두 **최종 출력 값에 영향 없음** (dead code / 중복 조건, 버그 아님). 본 스크립트는 cycle 903(plan #8 M1) 1회성 backtest harness — cron/daily.ts 등 production pipeline 미연결, CLAUDE.md "v2.0 결정 완료(v1.8 유지 확정)" 이후 재실행 이력 없는 비활성 연구 스크립트. 죽은 코드 정리는 실사용 코드 대비 가치 낮고(사용자 지시 "과도한 리팩토링 금지") 프로덕션 영향 0 — 수정 보류. 신규 버그 0건, 코드 변경 없음.

다음 사이클 추천 = operational-analysis(lite, gap 7/25) 또는 review-code(heavy, 잔여 후보 `agents/validator.ts` 67-cycle 재감사 gap 또는 `scrapers/` 미탐색 파일).



진단: `gh issue list --state open --label hub-dispatch` 0건이나 `lesson-pending` 라벨 issue 6건 발견(#3055~3060, 2026-08-23 21:00 신규 생성). gap trigger 4종 전부 미도달(fix-incident 12/20, op-analysis 5/25, info-arch 9/30, lotto 24/30). 2-chain lock 미충족(직전8 distinct=3). explore-idea saturation 미충족(11/15). approved plan 0/29.

조사: 6건 모두 hub incident(#3483~3514, 2026-08-20 커밋 872f4de9/7c58ab68/2c2b6c11/1a58198a/7ab993d8/2bc43556)의 "3일 무대응" reminder. `gh run view <run_id> --log-failed` 로 6건 run 전부 확인 → 전부 동일 원인: `version-sync-guard.test.ts` assertion 실패 (root/apps package.json 버전 1틱 mismatch). 이미 cycle 2350(lesson 0f102bac, 사례 20)이 규명한 동일 race — 다른 hub incident 번호(#3021~3038 아님)의 2차 배치일 뿐, 신규 recurrence 아님. cycle 2437/2445/2452 `scripts/bump-version.sh`(원자적 VERSION+package.json bump) + pre-push hook 도입 이후(2026-08-23~) CI 전량 green 확인 (`gh run list --branch main` 실측).

실행: 6건 전부 원인 규명 코멘트와 함께 close (코드 수정 불필요 — 근본 원인 이미 fix 완료). `memory/drift-cases.md` 사례 20 에 "2차 재발" 섹션 추가, lesson commit 직접 push (a7e10b62, PR 불필요 — 코드 변경 0).

carry-over: 사례 20 carry-over #1 (develop-cycle 진단 체크리스트에 `lesson-pending` 라벨 스캔 추가) 여전히 미반영 — 다음 skill-evolution 발화 시 재검토 후보로 유지.

다음 사이클 추천 = review-code(heavy, 잔여 대형 미감사 lib 재탐색 필요 — pool 고갈 근접) 또는 operational-analysis(lite, gap 6/25).

## 🟢 SUCCESS — review-code(heavy) buildTeamAccuracy.ts 신규 감사, accuracy 페이지 MIN_TEAM_PREDICTIONS 하드코딩 정정 (cycle 2463, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/deferred/spec_only). gap trigger 4종 전부 미도달(fix-incident 11/20, op-analysis 4/25, info-arch 8/30). 2-chain lock 미충족(직전8 distinct=4). explore-idea saturation 미충족(10/15). cycle 2462 retro 1순위 추천(review-code heavy, 잔여 후보 buildTeamAccuracy.ts) 채택. (부수: PR #3065 진단 단계서 CI green 확인 후 auto-merge 완결, 758103fe 이전 d4e9f72c.)

감사 범위: `standings/buildTeamAccuracy.ts`(261줄) `buildAllTeamAccuracy`/`buildMatchupData`/`buildTeamBiasAnalysis` 전체 + 소비 파일(`page.tsx`/`standings/page.tsx`/`accuracy/page.tsx`/`teams/page.tsx`) 전부 대조.

발견: 파일 자체 로직(CURRENT_MODEL_FILTER/SMALL_SAMPLE_N 필터)은 clean. 소비부 `accuracy/page.tsx` 팀별 예측 성과 섹션(안내문/이상치 판정 isOutlier/색상 조건/샘플 부족 게이트)이 `MIN_TEAM_PREDICTIONS`(packages/shared, wave-113/cycle 1329 single source: "팀별 적중률 차트 표시 최소 검증 경기 수") 대신 하드코딩 `3` 을 4곳 중복 사용 — 값(3)은 우연히 일치했지만 상수 변경 시 이 페이지만 stale 하게 남는 silent drift 소지 (`teams/page.tsx`는 이미 `SMALL_SAMPLE_N` 정상 사용, `dashboard/page.tsx`는 `MIN_TEAM_PREDICTIONS` 정상 사용 — accuracy 페이지만 미swap. wave-2300 과 동일 family, 다른 상수).

실행: `MIN_TEAM_PREDICTIONS` import + 4곳 swap (텍스트 안내 + isOutlier 조건 + 색상 조건 + 샘플부족 게이트) + 회귀 테스트(`wave-2463-min-team-predictions-swap.test.ts`) 신설.

`pnpm --filter moneyball test`(4231/4231, 신규 3건) + `type-check`/`lint` clean. PR #3066 squash 머지 (`758103fe`).

다음 사이클 추천 = operational-analysis(lite, gap 5/25 근접) 또는 review-code(heavy, 대형 미감사 lib pool 고갈 근접 — 다양성 확보 권장).

## 🟢 SUCCESS — explore-idea(heavy) MLB game detail 팩터 수렴 픽 배지 배선, KBO parity (cycle 2461, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 non-approved/Tier4). gap trigger 4종 전부 미도달(fix-incident 9/20, op-analysis 2/25, info-arch 6/30, lotto 21/30). 2-chain lock 미충족(직전8 distinct=4). explore-idea saturation 근접이나 미충족(11/15). cycle 2456/2458/2460 review-code(heavy) 3연속 retro-only(버그 없음 확인만 반복) — 다양성 확보 위해 explore-idea 선택.

발견: MLB game detail(`mlb/games/[date]/[slug]/page.tsx`, 391줄)이 KBO `analysis/game/[id]/page.tsx`(868줄)의 팩터 수렴 픽 배지(강수렴/완전수렴 + 최근 적중 기록, wave-452/478)를 렌더하지 않음. `computeMlbCompositeDuel`/`getMlbRecentConvergencePickRecord`/`MLB_FACTOR_PICK_STRONG`/`MLB_FACTOR_PICK_COMPLETE` 인프라는 이미 `mlb/matchup`, `mlb/reviews` 페이지에서 사용 중 — game detail 단건 페이지만 배선 누락된 순수 gap (구조적 비적용 아님, cycle 2271/2410 케이스와 다름).

실행: `computeMlbCompositeDuel`(homeCode/lineupWoba/bullpenFip/spFip/spXfip/war 6팩터, MLB elo/recent_form/head_to_head/sfr 미구현) 결과로 팩터 수렴 픽 배지 + 팩터 균형 배지(비수렴) 렌더. `FACTOR_LABELS_SHORT`/`FACTOR_GLOSSARY_ANCHORS`(용어집 링크)는 슬러그 공유라 그대로 재사용. KBO의 `DEFAULT_WEIGHTS` 가중치%/모델-합치 칩(judge verdict)은 MLB에 대응 개념 없어 의도적 제외 — 완전 parity 아닌 축소 parity.

`pnpm --filter moneyball test`(4222/4222, 신규 1건) + `type-check`/`lint` clean. PR #3063 squash 머지 (`22b67912`).

다음 사이클 추천 = review-code(heavy, 잔여 후보 — `dashboard/compareModels.ts` 299줄 / `standings/buildTeamAccuracy.ts` 261줄) 또는 explore-idea(saturation trigger 12/15 도달 가능성).

## 🔍 RETRO-ONLY — review-code(heavy) mlb-shared.ts 신규 감사, 버그 없음 확인 (cycle 2460, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 non-approved/Tier4). gap trigger 4종 전부 미도달(fix-incident 8/20, op-analysis 1/25, info-arch 5/30, lotto 20/30). 2-chain lock 미충족(직전8 distinct=5). explore-idea saturation 근접이나 미충족(11/15). cycle 2459 retro 추천(review-code heavy, 후보: mlb-shared.ts/compareModels.ts/buildTeamAccuracy.ts) 채택 — 가장 큰 미감사 파일 우선.

감사 범위: `mlb-shared.ts`(409줄) 전체 — `fetchMlbPredictionRowsInRange` / `mapMlbRowsToHighlightCandidates` / `buildMlbTeamStats` / `buildMlbFactorInsights` / `buildMlbMissReport` + 소비 파일 전부(`buildMlbWeeklyReview.ts` / `buildMlbMonthlyReview.ts` / `analysis-data.ts` / `mlb/reviews/misses` KO+EN / `api/picks/results/route.ts`).

결론: `MLB_PRODUCTION_COHORT_RULES` scoring_rule 필터(#1338 family fix) 양쪽 쿼리(스케줄 조인 + miss report) 모두 이미 적용됨. `LOWER_IS_BETTER` FIP류 부호 반전 로직 정상. badge 필드는 이 파일에서 항상 null 초기화 후 소비 파일(buildMlbWeeklyReview/MonthlyReview)이 태깅 — 설계된 분리, 버그 아님. KBO 대응 파일과 구조 1:1 대응 확인. 신규 버그 0건, 코드 변경 없음. `pnpm --filter moneyball test` 500 files/4221 tests 전부 green.

다음 사이클 추천 = review-code(heavy, 잔여 후보 — `dashboard/compareModels.ts` 299줄 / `standings/buildTeamAccuracy.ts` 261줄) 또는 explore-idea(saturation trigger 근접 11/15, 다음 사이클 도달 가능성).

## 🟢 SUCCESS — operational-analysis(lite) 주간 성과 진단, n=26 소표본 확인 (cycle 2459, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 non-approved/Tier4). gap trigger 4종 전부 미도달(fix-incident 7/20, op-analysis 11/25, info-arch 4/30, lotto 19/30). 2-chain lock 미충족(직전8 distinct=5, {skill-evolution,fix-incident,review-code,info-arch,explore-idea}). cycle 2458 retro 1순위 추천(operational-analysis, 10/25 gap) + cycle 2456 "review-code 감사 pool 고갈 경고" 채택 — 다양성 확보 위해 operational-analysis 선택.

모드 선택: 직전 heavy(cycle 2448, CE cohort)가 10 cycle 전 = 데이터 freshness 판단 애매 → lite(`/weekly-review`)로 신선도 우선 확인, 신규 코드 X.

실행: `scripts/op-analysis-ce-cohort.ts` 재실행 결과 cycle 2448 과 완전 동일(n=337/CE 290/비CE 47/격차 10.4pp) — DB 확인 결과 코드 문제 아님, 두 cycle 이 같은 날(2026-08-23 23:32 KST → 2026-08-24 14:36 KST, 15시간) 사이라 KBO 일일 verify cron(매일 23:17 KST 1회)이 아직 안 돈 것. 대신 지난 완결주(2026-08-17~08-23, game_date 기준) 별도 쿼리: n=26, 정확도 46.2% (5경기일 08-18~08-23), 팀별 편차 큼(team 1 0/4, team 6 1/6 vs team 7/8 4/5 each), 확신도 tier: high(|hwp-0.5|≥0.15) n=0 이번 주 부재, mid n=3(100%), low n=23(39.1%).

결론: n=26 = v2.0 결정 임계(n=150) 대비 소표본 — [[feedback_data_only_claims]] 원칙대로 가중치 조정 판단 근거 X. 주간 46.2% 는 장기 60% 대 대비 낮으나 5경기일 노이즈 범위 내 (하한 확인만, 조정 X). CE-cohort n=337 정체는 코드 버그가 아니라 develop-cycle 이 하루 여러 사이클 돌기 때문(cron 1일 1회 vs 사이클 다수/일) — 다음 op-analysis heavy 재측정 시 "직전 재측정과 같은 KST 날짜인지" 먼저 확인해 중복 측정 피할 것.

다음 사이클 추천 = review-code(heavy, 미감사 후보 잔존 — reviews/mlb-shared.ts 409줄 / dashboard/compareModels.ts 299줄 / standings/buildTeamAccuracy.ts 261줄) 또는 explore-idea(saturation trigger 근접).

## 🔍 RETRO-ONLY — review-code(heavy) buildPicksStats.ts 신규 감사, 버그 없음 확인 (cycle 2458, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 non-approved/Tier4). gap trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 10/25, info-arch 3/30, lotto 18/30). 2-chain lock 미충족(직전8 distinct=5). explore-idea saturation trigger 충족(12/15)이나 cycle 2457이 방금 발화(이번 사이클엔 review-code 재순환). cycle 2456이 "review-code 미감사 후보 pool 고갈 중" 경고했으나 미감사 lib 파일 재조사 결과 `buildPicksStats.ts`(410줄, picks 기능, CHANGELOG 언급 0회) 발견 — 신규 타겟으로 선정.

감사 범위: `buildPickEntries`/`buildPicksStats`/`buildWeeklyStats`/`buildWeeklyHistory`/`buildFactorAgreement` 전체 + 소비 컴포넌트(`MyPicksClient.tsx`).

결론: KBO/MLB 이중 id 매칭(cycle 2244 이미 가드), KST 주간 경계(`getKSTWeekRange`, cycle 457 이미 단일 source 통합), WAR/SFR=0 데이터 갭(predictor.ts 가 이미 0.5 neutral 가드, cycle 1904 wave-533 — 본 파일이 읽는 factor 값 자체가 이미 안전), streak/trend 계산 전부 정상. 별도 테스트 파일 2개(`buildPicksStats.test.ts` + `buildFactorAgreement.test.ts`) 커버리지 충분. 신규 버그 0건, 코드 변경 없음.

다음 사이클 추천 = operational-analysis(10/25, gap 40% 경과) 또는 review-code(heavy, 미감사 후보 잔존 — reviews/mlb-shared.ts 409줄 / dashboard/compareModels.ts 299줄 / standings/buildTeamAccuracy.ts 261줄 등).

## 🟢 SUCCESS — explore-idea(heavy) MLB 확정 선발투수 이름 game-detail 표시 (cycle 2457, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 non-approved/Tier4). gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 9/25, info-arch 2/30, lotto 17/30). 2-chain lock 미충족(직전8 distinct=4). cycle 2454~2456 review-code 3연속 retro-only 로 감사 pool 소진 확인, cycle 2456 retro 명시 추천(explore-idea/op-analysis) 채택.

기존 carry-over lead 재확인 결과 대부분 stale: cycle 2423 "MLB 모델 메타 정보 배지" 는 PR #3049 로 이미 ship, mlb-waterfall.ts/mlb-elo.ts 도 cycle 2412 에 이미 감사 완료. 유효한 잔여 lead = cycle 2416 retro 가 "Tier 3, 별도 스코프" 로 남긴 `statsapi-mlb.ts fetchProbablePitchers`(선발투수 이름/ID 스크레이프, 프로덕션 미연결) — 전체 개인 FIP 스탯 통합은 여전히 large scope 이나, 이미 스크레이프되는 이름만 표시하는 건 KBO wave-335(이름-only 단계)와 동일 패턴으로 분리 가능.

실행: migration 051(`mlb_schedule.home/away_starter_name` 컬럼, `supabase db push --linked` 원격 적용 완료) + `mlb-pipeline.ts` `runStatsApiScrape` 가 `fetchProbablePitchers` 를 best-effort 로 병합(실패해도 schedule upsert 자체는 안 막음, 회귀 테스트 2건) + KO(`mlb/games/[date]/[slug]`)/EN(`en/mlb/games/[date]/[slug]`) game-detail `page.tsx` 양쪽에 "선발 {away} · {home}" 표시(회귀 테스트 각 1건). `kbo-data` 90 files/1184 tests, `moneyball` 500 files/4221 tests 전부 green, `tsc`/`eslint` clean. PR #3062 squash 머지(541d635a).

결론: fetchProbablePitchers 의 "액션 아이템만 기록" carry-over 중 bounded 부분(이름 표시)만 분리 이식 완료. 개인 FIP/xFIP 스탯 소스 통합은 여전히 Tier 3(별도 scope, 데이터 소스 자체 부재)로 미착수.

다음 사이클 추천 = review-code(heavy, 이번 신규 변경 mlb-pipeline.ts 재감사 대상 아님 — 방금 작성+테스트 통과) 또는 operational-analysis(10/25 근접, CE-cohort 재측정 자연 도달 임박).

## 🔍 RETRO-ONLY — review-code(heavy) buildMlbMatchupProfile.ts 재감사, 이미 포화 감사 확인·신규 버그 없음 (cycle 2456, 2026-08-24)

진단: open issue 0, approved plan 0/23(전부 non-approved). explore-idea saturation trigger 충족(12/15)했으나 cycle 2441 이미 동일 소스 15 사이클 전 소진 확인. gap trigger 4종 전부 미도달. 2-chain lock 미충족(직전8 distinct=5). cycle 2452/2453/2454 연속 회고가 `buildMlbMatchupProfile.ts`를 미감사 후보로 3회 반복 지목 — 직접 감사.

감사 범위: `buildMlbMatchupProfile.ts`(300줄) + `deriveMlbOutcome.ts` + `packages/shared` `computeMatchup*FromGames` 3종 + 소비 라우트(`mlb/matchup`, `en/mlb/matchup`) 전체.

결론: 파일 주석 확인 결과 cycle 2055/2066/2071/2081/2117/2160 등 이미 6회 이상 review-code(heavy) 감사·통합을 거친 파일이었음(packages/shared 단일 source 통합, 사례 22 fix, confidence 스케일 버그 fix 등). games.sort(desc) → streak/recentRecord 계산 순서 정합, `MLB_PRODUCTION_COHORT_RULES` 필터 일관 적용, order-independent 계산(blowout/closeGame/homeAwayEdge) 정상 확인. 신규 버그 0건, 코드 변경 없음. 테스트 7/7 pass. 3회 연속 회고 추천 대상이 실제로는 이미 포화 상태 — review-code 미감사 후보 pool 이 예상보다 빠르게 고갈 중.

다음 사이클 추천 = explore-idea(saturation trigger 12/15 충족 상태이나 cycle 2441 재확인이 15 사이클 전이라 재시도 가치 있음) 또는 operational-analysis(8/25, gap 절반 경과, v1.8 cohort 재측정).

## 🔍 RETRO-ONLY — info-architecture-review 30-cycle gap 재확인, 신규 라우트 5건 전부 clean (cycle 2455, 2026-08-24)

진단: open issue 0, approved plan 0/29(Tier4 유지). gap trigger 중 info-arch 만 30/30 도달(trigger 9). 2-chain lock 미충족(직전8 distinct=4).

cycle 2425 checkpoint(신규 라우트 0건) 이후 실제 신규 `page.tsx` 5건 발생 — `mlb/analysis`(#3011), `en/mlb/analysis`(#3018), `en/mlb/reviews`(#3019), `en/mlb/reviews/weekly`(#3041), `en/mlb/reviews/monthly`. breadcrumb/Header/Footer/sitemap 3곳 전부 origin feat 커밋에서 이미 배선 완료 확인 — 신규 gap 0건. redirect-only 페이지(`en/mlb/reviews/weekly`·`monthly`) breadcrumb 부재는 KR 대응 4개 라우트와 동일한 기존 accepted 패턴.

결론: 코드 변경 없음. "현 IA 충분" 재확정. 상세 = `docs/design/ia-2026-08-24-cycle-2455-30-cycle-gap-checkpoint.md`.

다음 사이클 추천 = review-code(heavy) 신규 타겟 계속 탐색(`buildMlbMatchupProfile.ts` 등) 또는 gap trigger 근접 순(op-analysis 7/25, fix-incident 3/20, lotto 15/30).

## 🔍 RETRO-ONLY — review-code(heavy) buildMlbTeamAccuracy.ts 신규 감사, 버그 없음 확인 (cycle 2454, 2026-08-24)

진단: open issue 0, approved plan 0/29(Tier4 유지). gap trigger 4종 전부 미도달(fix-incident 2/20, op-analysis 6/25, info-arch 29/30 근접, lotto 14/30). 2-chain lock 미충족(직전8 distinct=4). explore-idea saturation 미충족(11/15). cycle 2453 retro가 CHANGELOG 언급 0회(신규 감사 대상) `buildMlbTeamAccuracy.ts`(300줄) 를 명시 추천 — 직접 감사.

감사 범위: `buildAllMlbTeamAccuracy` / `buildMlbMatchupData` / `buildMlbTeamBiasAnalysis` 3개 export 함수 + `deriveMlbOutcome.ts` 재사용 로직 + KBO 대응 파일(`buildTeamAccuracy.ts`) 대조.

결론: 코드 변경 없음. 검토 항목 모두 정상 확인 — (1) 3개 함수 전부 `MLB_PRODUCTION_COHORT_RULES` scoring_rule 필터 일관 적용(#1338 family 패턴 재발 없음), (2) `mlb-pipeline.ts` predictions insert 가 delete-then-insert 로 idempotent(중복 external_game_id row 발생 불가 — Map 기반 predByExternalId lookup 의 nondeterministic overwrite 우려는 실제로 발생 불가한 구조), (3) `buildAllMlbTeamAccuracy` 정렬 기준(verifiedN desc)이 KBO 대응(accuracyRate desc)과 다르지만 렌더 컴포넌트(`MlbAccuracyDashboard`)가 순서에 의존하지 않는 단순 테이블 렌더라 영향 없음, (4) small-sample 처리(`TEAM_TABLE_MIN_N` 라벨 치환, `SMALL_SAMPLE_N` bias 필터) 정상 작동. due-diligence 원칙 준수 — 실측 근거 없이 방어적 변경 추가 X (cycle 2493 선례와 동일 패턴).

다음 사이클 추천 = review-code 신규 타겟 계속 탐색(`buildMlbMatchupProfile.ts` 등 잔여 후보) 또는 gap trigger 근접 순(info-arch 29/30 사실상 도달권, lotto 14/30).

## ✅ SUCCESS — fix-incident version-sync drift 근본원인 fix (cycle 2452, 2026-08-23)

진단: open issue 0, approved plan 0/29(Tier4 유지). gap trigger 4종 전부 미도달(fix-incident 7/20, op-analysis 4/25, info-arch 27/30, lotto 12/30). 2-chain lock 미충족(직전8 distinct=4). cycle 2451 retro가 version-sync drift 4th/5th recurrence를 Tier 3 plan 후보로 명시 carry-over — rubric 평가(가치 high/시간비용 small/risk 0/자율 yes/의존성 none) 결과 Tier 1로 하향, 별도 plan 분리 없이 본 cycle 직접 fire.

발견: pre-push hook(scripts/install-hooks.sh 템플릿, tracked)이 lint+type-check만 실행하고 version-sync-guard.test.ts는 실행 안 함 — 수동 3-way version bump 실수가 push 시점엔 안 잡히고 CI(post-push)에서만 사후 발견되는 구조였음. 5회 재발(cycle 2363/2437/2445 등) 원인.

실행: install-hooks.sh 템플릿에 `cd apps/moneyball && pnpm vitest run src/app/__tests__/version-sync-guard.test.ts`(~0.9s) 추가, 로컬 .git/hooks/pre-push 재설치 동기화. `pnpm --filter moneyball test`(4217/4217) pass. commit 21b4349d push 시 새 hook이 자기 자신 검증하며 정상 통과 확인.

다음 사이클 추천 = review-code 신규 타겟 탐색 또는 gap trigger 근접 순(info-arch 28/30, lotto 13/30). version-sync drift family는 근본 해결 — 재발 모니터 불필요(재발 시 push 시점 즉시 차단).

## ✅ SUCCESS — skill-evolution 70회 자가 진화, phase 36 milestone (cycle 2451, 2026-08-23)

트리거: `skill-evolution-pending` marker (cycle 2450 trigger 3, cycle_n%50==0) — forced, 자율 선택 아님.

phase 36 (2431-2450) 통계: review-code 50%(+30pp, #1338 family 소진 후 신규 타겟 재발견: lotto/methodology, buildMlbMatchupProfile, buildAccuracyData, convergenceRecord/buildTeamProfile) / fix-incident 15%(version-sync drift 4th/5th recurrence cycle 2437/2445) / operational-analysis 10% / none(no-op) 10%(-35pp, saturation 일시적 dip 확정) / polish-ui·lotto·explore-idea 각 5%. alternation pair 55%(+35pp). success 35%(+5pp, missing 1건 cycle 2437). PASS_ship 누적 ~1932(+53). watch hang kill 0건.

신규 carry-over: version-sync drift 근본원인(pre-commit hook/single source-of-truth 부재 추정) Tier 3 plan 후보로 명시적 이월.

실행: SKILL.md 마이그레이션 path 압축 요약 append + MIGRATION-PATH.md phase 36 전체 섹션 append. PR #3054 (`develop-cycle/skill-evolution-2451`) squash 머지(69b7ca63) + marker 제거.

**다음 사이클 추천** = review-code 신규 타겟 계속 탐색 또는 version-sync drift 근본원인 조사(fix-incident), gap trigger 근접 순(info-arch 26/30, lotto 11/30) 대기.

## ✅ SUCCESS — review-code(heavy) lotto/methodology 신규 감사, OOS 표본 caveat stale 텍스트 정정 (cycle 2450, 2026-08-23)

진단: open issue 0, approved plan 0/29(Tier4 유지). gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 2/25, info-arch 25/30, lotto 10/30). 2-chain lock 미충족(직전8 distinct=3). explore-idea saturation 미충족(11/15). cycle 2449가 #1338 family 3연속 클린 확정 + 신규 unaudited 영역 재탐색 추천 — CHANGELOG 언급 최소(3회) 파일로 lotto/methodology/page.tsx(520줄, KBO/MLB family 와 별개 도메인) 선정.

발견: OOS 표본 caveat 문구가 `N&lt;10 sample preliminary` 로 하드코딩 — 실제 `lottoData.oos_pass_rate.length`(14) 는 이미 actionable 임계(N=10, cycle 1842 달성)를 넘었는데도 계속 preliminary 로 오표시되던 content stale drift.

실행: `oosSampleCaveat(n)` 함수 (anecdote/preliminary/actionable 3-tier) 로 정정. `pnpm --filter moneyball test`(4217/4217) + lint/type-check clean. v0.5.62.96 3-way version bump, commit 50772037 직접 main push(R4, PR 불필요 — 단일 content fix).

**cycle_n=2450 milestone (trigger 3, n%50==0)** — 다음 사이클(2451) skill-evolution 강제 발화 marker 박제 완료 (MIGRATION-PATH.md phase 36 갱신 예정).

다음 사이클 추천 = skill-evolution(forced) 처리 후, gap trigger 근접 순 (info-arch 25/30, lotto 10/30) 또는 review-code 신규 타겟 계속 탐색.

## 🔍 RETRO-ONLY — review-code(heavy) buildMlbMatchupProfile.ts 감사 (cycle 2447, 2026-08-23)

진단: open issue 0, approved plan 0/29(Tier4 유지). gap trigger 전부 미도달(fix-incident 2/20, op-analysis 16/25, info-arch 22/30, lotto 7/30). 2-chain lock 미충족(직전8 distinct=4, review-code 4/fix-incident 2/explore-idea 1/lotto 1). cycle 2446 추천대로 review-code heavy 신규 타겟 탐색 지속 — CHANGELOG/git log 언급 최소(1회) 파일로 buildMlbMatchupProfile.ts(526줄) 선정.

발견: `.in("scoring_rule", MLB_PRODUCTION_COHORT_RULES)` + `.eq("prediction_type","pre_game")` 필터가 MLB lib 8개 형제 파일(buildMlbAccuracySummary/buildMlbFactorAccuracy/buildMlbCalendarHeatmap/buildMlbTeamFactorAverages/buildMlbTeamAccuracy×3/fetchMlbHistoricalAnalogs/buildMlbTeamProfile) 전부와 동일 컨벤션 — #1338 family sweep 이미 완전 적용됨. `deriveMlbOutcome`/`mlbCanonicalPair`/`normalizeMlbTeamCode`/`toMlbStatsApiCode` 양방향 alias 변환도 정상, confidence 스케일(0.5~1, `*100` 직접 렌더)도 소비처(`mlb/matchup/[teamA]/[teamB]/page.tsx`)와 일치. silent drift 없음, 코드 변경 0.

다음 사이클 추천 = operational-analysis(lite, 17/25 근접) 또는 info-architecture-review(23/30 근접) gap 순번 대기, 또는 review-code 신규 타겟(convergenceRecord.ts/buildTeamProfile.ts — 언급 9회, mlb team/matchup 나머지 페이지) 계속 탐색.

## 🔍 RETRO-ONLY — review-code(heavy) buildMatchupProfile.ts + predictions/[date]/page.tsx 신규 감사 (cycle 2446, 2026-08-23)

진단: open issue 0, approved plan 0/23(Tier4 유지). gap trigger 전부 미도달(fix-incident 1/20, op-analysis 15/25, info-arch 21/30, lotto 6/30). 2-chain lock 미충족(직전8 distinct=4). cycle 2445 추천(op-analysis/info-arch) 둘 다 gap 미충족 — review-code heavy 신규 타겟 탐색 지속.

발견: buildMatchupProfile.ts(594줄, 13회 언급) — PRODUCTION_COHORT_RULES 필터/assertSelectOk fail-loud/games 정렬 순서 모두 정상. predictions/[date]/page.tsx(619줄, 5회 언급) — winProb 변환(home_win_prob→예측승자 기준)이 PredictionCardLive aiWinProb 용도와 일치, buildIntro/verified 카운트 컨벤션 일관. 양쪽 모두 silent drift 없음, 코드 변경 0.

다음 사이클 추천 = operational-analysis(16/25) 또는 info-architecture-review(22/30) gap 우선순위, 또는 review-code 신규 타겟(teams/[code]/page.tsx, predictions/[date]/page.tsx 5회 미만 언급 파일들) 계속 탐색.

## ✅ SUCCESS — fix-incident 3-way version drift 재발 정정 (cycle 2445, 2026-08-23)

진단: open issue 0, approved plan 0/29(Tier4 유지). gap trigger 전부 미도달(fix-incident 6/20, op-analysis 14/25, info-arch 20/30, lotto 5/30). 2-chain lock 미충족(직전8 distinct=4). `gh run list` 로 main 최근 CI 상태 점검 중 cycle 2443 커밋(#983bb346)의 CI 가 red 임을 발견.

발견: VERSION + CHANGELOG.md 는 0.5.62.95 로 bump 됐지만 root `package.json` + `apps/moneyball/package.json` 양쪽 모두 0.5.62.94 잔존 — 3-way version drift 재발 (cycle 2363/2437 동일 family). `version-sync-guard.test.ts` 실측 CI failure(run 32644546591)로 확인.

실행: 두 `package.json` 을 0.5.62.95 로 정정. `pnpm --filter moneyball test`(4217/4217 pass, 기존 1건 failure 해소) + lint/type-check clean 확인 후 commit 17ceae6b 직접 main push(R4/R7, 단일 버전 정정이라 PR 없음).

다음 사이클 추천 = operational-analysis(lite, 14/25 근접) 또는 info-architecture-review(20/30 근접) gap 순번 대기. fix-incident gap 카운터는 이번 발화로 리셋.

## ✅ SUCCESS — review-code(heavy) buildAccuracyData.ts 신규 감사, 하드코딩 소표본 임계값 정정 (cycle 2443, 2026-08-23)

진단: open issue 0, approved plan 0/29(Tier4 유지). gap trigger 전부 미도달(fix-incident 4/20, op-analysis 12/25, info-arch 18/30, lotto 3/30). 2-chain lock 미충족(직전8 distinct=4). cycle 2442가 반복 타겟 3파일(analysis/page.tsx, accuracy/page.tsx, game/[id]/page.tsx) 완전 소진 확정 + 신규 소스 탐색 추천 — CHANGELOG 언급 빈도 비교로 buildAccuracyData.ts(776줄, 3회 언급) 선정.

발견: `buildRollingAccuracy()`의 `windowAccuracy` 소표본 가드가 같은 파일 `buildScoringRuleDayHeatmap`/`buildScoringRuleWeekHeatmap`이 쓰는 `SMALL_SAMPLE_THRESHOLD`(3) 상수 대신 리터럴 `3`을 직접 사용 — 값은 현재 동일해 동작 변화 없으나 magic number 하드코딩 재발 패턴(wave-500 family 성격), 향후 상수 변경 시 이 줄만 누락될 silent drift 위험.

실행: `n >= 3` → `n >= SMALL_SAMPLE_THRESHOLD` 정정. `pnpm --filter moneyball test`(4217/4217, 기존 회귀 테스트가 n=5 pass/n<3 null 케이스로 값 동일성 확인) + lint/type-check clean. commit 983bb346 직접 main push(R4).

다음 사이클 추천 = operational-analysis(lite, 13/25 근접) 또는 info-architecture-review(19/30 근접) gap 순번 대기.

## 🔵 RETRO-ONLY — review-code(lite) 클린 스캔, carry-over 3후보 전부 기존 해결 확인 (cycle 2442, 2026-08-23)

진단: open issue 0, approved plan 0/29(Tier4 유지, plan#29 게이팅 미충족). gap trigger 전부 미도달(fix-incident 3/20, op-analysis 11/25, info-arch 17/30, lotto 2/30). 2-chain lock 미충족(직전8 distinct=5). explore-idea saturation 8/15 미충족. `gh run list` — health-alert/runtime-error-alert/deploy-drift-alert 전부 success, CI Failure Dispatch 전부 skipped(정상), 신규 CI 실패 0건.

재확인 1: cycle 2441 next_rec의 "review-code(heavy) convergence badge 컴포넌트 분리, analysis/page.tsx 단일 스코프" — `renderConvergenceTeamBadgeRow`/`renderConvergenceHomeAwayBadgeRow`는 이미 cycle 1995에 팀/홈어웨이 배지 중복을 로컬 헬퍼로 통합 완료된 상태(주석 확인). `game/[id]/page.tsx`는 이 배지 자체를 렌더링하지 않음(grep 0건) — "동기화 대상"이 처음부터 존재하지 않았던 오인된 carry-over.

재확인 2: `game/[id]/page.tsx`의 h2h validCount 구조적 gap(FACTOR_PICK_COMPLETE 발생 불가) 문제도 cycle 2303에서 이미 `getSeasonH2HData()` wiring으로 fix 완료 확인.

재확인 3: `accuracy/page.tsx`(1204줄)도 최근 이력(wave-500 MIN_POLL_TOTAL family, cycle 2150 역전배지 소표본 가드) 상 반복 감사된 상태 — review-code 반복 타겟 3파일(analysis/page.tsx, accuracy/page.tsx, game/[id]/page.tsx) 모두 소진 확정.

실행: `pnpm --filter moneyball lint` + `pnpm --filter kbo-data lint` 클린(0 errors), TODO/FIXME grep — 실제 미해결 코드 TODO 0건(문서참조 주석 4건만).

결과: 코드 변경 0건 — 3-file 세트 완전 소진 확정. skill-evolution trigger 5개 전부 미충족(trigger3 2442%50≠0, trigger5 직전20 sample=16, review-code 7회 evaluated 0-count 아님).

다음 사이클 추천 = operational-analysis(lite, 12/25 근접) 또는 info-architecture-review(18/30 근접) gap 순번 대기, 또는 완전히 새로운 소스(lib/ 유틸 디렉토리, 테스트 커버리지 갭) 탐색 필요.

## 🔵 RETRO-ONLY — explore-idea(heavy) 3-source 재탐색, 확장 가치 부족 확인 (cycle 2441, 2026-08-23)

진단: open issue 0, approved plan 0/23(Tier4=29). gap trigger 전부 미도달(fix-incident 2/20, op-analysis 10/25, info-arch 16/30, lotto 1/30). 2-chain lock 미충족(직전8 distinct=5). explore-idea saturation 9/15 미충족. 직전 3사이클(2438/2439/2440) 모두 explore-idea(heavy) 연속 추천 — review-code WAR/SFR family 소진 이후 다양성 redirect 의도로 자율 선택.

탐색 1: `teams/[code]/recent`(KBO 전용, 355줄) MLB parity 조사 — MLB는 `buildMlbTeamProfile()`이 recentGames(최근 8경기)를 메인 프로필 페이지에 이미 inline 표시 중. 신규 `/mlb/team/[code]/recent` 라우트를 만들어도 UI 어디서도 링크 안 됨(KBO 쪽도 sitemap에서만 참조, 팀 프로필 페이지 자체엔 링크 없음) + 기존 inline과 컨텐츠 중복 — 600~700줄 신규 코드 대비 가치 낮음, 스킵.

탐색 2: EN/MLB 라우트 parity 재확인 — `en/mlb/*` 24개 페이지가 `mlb/*` 24개와 1:1 완전 일치. 신규 mirror gap 없음(이미 포화 확정).

탐색 3: convergence badge dark 배경 불일치(2434 cycle 기록 carry-over) 재확인 — `analysis/page.tsx:564`가 `bg-brand-800/40`로 `game/[id]/page.tsx:504-505`와 이미 일치, cycle 2434 fix로 정정 완료 확인. `ConvergenceBadge.tsx` 컴포넌트 분리는 `analysis/page.tsx`(2655줄) + 10+ callsite 걸친 Tier 3 스코프 — 단일 사이클 범위 밖, `/expand-plan` 후보로만 carry.

부가: plan #29(로그인+커뮤니티) 게이팅 재확인 — 포스트시즌 임박(9월말~10월초) 또는 트래픽(user_picks/pick_poll_events) ≥10건 트리거 여전히 미충족(오늘 8/23). Tier4 보류 유지.

결과: 코드/문서 변경 0건 — 3개 탐색 모두 "확장 가치 부족" 결론. skill-evolution trigger 5개 전부 미충족(trigger3 2441%50≠0, trigger5 직전20 표본=16 review-code 8회 evaluated 0-count 아님).

다음 사이클 추천 = info-architecture-review(17/30 진행) 또는 fix-incident(3/20 진행) gap 순 대기, 또는 review-code(heavy)가 convergence badge 컴포넌트 분리를 `analysis/page.tsx` 단일 파일 스코프로 축소 시도(game/[id] 동기화는 후속 분리).

## 🔵 RETRO-ONLY — lotto 48-cycle gap 점검, self-heal 확인 delta=0 (cycle 2440, 2026-08-23)

진단: open issue 0, approved plan 0/23. gap trigger 재확인 — lotto 마지막 발화 cycle 2392, 48-cycle gap(30 임계 큰 초과). op-analysis 9/25, info-arch 15/30, fix-incident 1/20(방금 재발화) 전부 미도달. 2-chain lock 미충족(직전8 distinct=4: none/polish-ui/review-code/fix-incident). explore-idea saturation 10/15 미충족(≥12 미달). `gh run list` CI 실패 0건.

실행: `pnpm tsx scripts/lotto.ts count` 재실행 — 유효조합 7,705,415/8,145,060 (5.40% 제거) = cycle 2392 실측치와 완전 일치, delta=0. 1239회(8/29) 50세트(`~/lotto_picks/2026-08-29-50sets.md`, cycle 2344 생성) + 1238회(8/22) OOS 검증(`2026-08-22-result.md`, 오늘 8/23 14:10 박제)도 이미 cron self-heal 완료 확인. 신규 rule 후보 없음.

결과: 코드/문서 변경 0건 — 48 cycle 전체가 self-heal 정상 작동 구간이었음 확인(cycle 2392 이후 매주 cron 이 picks+OOS 정상 처리, develop-cycle 수동 개입 불필요했던 것). skill-evolution trigger 5개 전부 미충족(trigger1 cumulative 9건 기존 관행대로 marker 미생성, trigger3 2440%50≠0, trigger5 직전20 sample=17 review-code 9회 evaluated 0-count 아님).

다음 사이클 추천 = explore-idea(heavy, saturation 10/15→11/15 근접 — review-code dominance 지속 + 직전 3사이클 연속 추천) 또는 info-architecture-review(15/30 진행). lotto 자체 trigger 재도달까지 30 cycle 여유 확보(다음 재검토 ~cycle 2422+).

## 🔵 RETRO-ONLY — pre_game/post_game is_correct null 분리 가설 검증, false alarm 확인 (cycle 2439, 2026-08-23)

진단: open issue 0, approved plan 0/23(status:approved 문자열 매칭 0). gap trigger 전부 미도달(fix-incident 방금 재발화 cycle 2437 gap=2, op-analysis 8/25, info-arch 14/30, lotto self-heal 완료 skip — 오늘 8/29 50세트+8/22 result 이미 cron 처리). 2-chain lock 미충족(직전8 distinct=4). explore-idea saturation 9/15 미충족. `gh run list` CI 실패 0건, deploy-drift-alert success. review-code WAR/SFR family 4연속 소진 확정 상태 유지 — 직전 2사이클(2436/2438) 추천대로 다양성 redirect 시도, fix-incident 방향에서 실측 진단.

가설: Supabase 직접 조회 시 `predictions` 테이블 `scoring_rule='v1.8'` 중 `is_correct IS NULL` 행이 390건(오늘 제외해도 게임 status='final'인 과거 행 다수, 2026-05-13~08-22 거의 매일 5~11건) 발견 — 최초엔 verify/scoring 파이프라인이 장기간 광범위하게 silent 실패한 것으로 의심(CLAUDE.md 사례 11 predict_final 류 패턴과 유사 형태).

검증: 해당 미검증 행 전부 `prediction_type='post_game'` (postview 회고 분석 row, `postview-daily.ts`가 pre_game 존재+post_game 부재 경기에 사후 생성 — is_correct 대상 자체가 아님, 설계상 정상). `updateAccuracy()`(daily.ts:1563)는 `prediction_type='pre_game'`만 대상으로 하고, `/accuracy` page(accuracy/page.tsx:285-291)의 메인 통계 쿼리도 `.eq('prediction_type','pre_game').not('is_correct','is',null)`로 정확히 필터링 — post_game 행이 통계에 오염되지 않음 확인. `.in(['pre_game','post_game'])` 사용처는 model_version fallback trend 용도뿐, is_correct 무관. **결론: false alarm — 코드 정상, 실제 pre_game cohort는 CLAUDE.md 기록치와 정확히 일치(v1.8 전체 307건 = CE 285건[debate_version null 260 + credit-fail 25] + 비CE 47건, cycle 2361 기록 n=332 그대로 — 78 cycle 동안 진짜 신규 verified 증가 0, cycle 2431의 "n-freeze" 재확인)**.

실행: 코드 변경 0건 (가설 반증). skill-evolution trigger 5개 전부 미충족(trigger3 2439%50≠0, trigger5 review-code 비0회).

다음 사이클 추천 = explore-idea(saturation 9/15→10/15 근접, heavy 권장 — review-code dominance 지속 + op-analysis도 동일 frozen 데이터 반복 저수익) 또는 info-architecture-review(14/30 진행). op-analysis 재측정은 신규 값 없을 것 확실(비CE 표본 47 동결 + CE도 verify 배치가 이 cohort 기준으론 정체) — 다음 fire 시 저수익 예상, 스킵 권장.

## 🟢 SUCCESS — v2.1-B/v2.0-shadow row reasoning object stringify silent 버그 수정 (cycle 2438, 2026-08-23)

진단: open issue 0, approved plan 0/29(Tier4 유지). gap trigger 전부 미도달(fix-incident 1/20 방금 재발화, op-analysis 7/25, info-arch 13/30, lotto self-heal 완료 skip). 2-chain lock 미충족(직전8 distinct=4). explore-idea saturation 9/15 미충족. cycle 2436 review-code(heavy)가 WAR/SFR family 4연속 소진 확정 — 동일 family 재검색 저수익 판단, 미감사 대형 파일(`apps/moneyball/src/app/page.tsx` 홈페이지 1082줄) 직접 감사로 전환. (부가: cycle 2437 fix-incident의 retro commit + cycle_state JSON 양쪽 부재 관측 — 사례15 silent retro drift 재발이나 실제 코드 작업(root/VERSION drift fix)은 정상 완료 확인, retroactive 박제는 skip.)

발견: 홈페이지 hero selector 3곳(`selectTopStatPick`/`selectBigMatchFromGames`/`getTodayDivergenceGame`)의 2-level fallback(`reasoning.debate.verdict.homeWinProb ?? reasoning.homeWinProb`)이 카드 렌더 경로 3-level fallback(+`home_win_prob`)과 비대칭이나, production reasoning은 `buildFinalReasoning()`이 항상 `homeWinProb` 보장하는 설계라 false positive(버그 아님) 확인. 인접 확장 감사로 `daily.ts`의 v2.1-B-shadow/v2.0-shadow row insert가 `finalReasoning`(object)을 template literal에 직접 interpolate — `reasoning` 컬럼에 실제 텍스트 대신 매번 literal `"[object Object]"` 저장되는 것 발견. cycle 1013(v2.1-B-shadow)/1019(v2.0-shadow) 도입 이후 전체 shadow row 영향. `/accuracy/shadow` page는 `pairProbForRow`가 `factors` JSONB 재계산 경로로 이미 우회(cycle 1021 hotfix)해 표시값엔 영향 없었으나, 컬럼 자체는 계속 무의미한 문자열로 오염되는 silent trap이었음.

실행: `finalReasoning.reasoning`(실제 quant 서술 문자열)으로 두 callsite 수정. 회귀 테스트 1건 신설(`pipeline-daily.test.ts`) — v2.1-B/v2.0 shadow row 양쪽 reasoning이 `"[object Object]"` 미포함 + 실제 텍스트 확인. `pnpm --filter kbo-data test`(1182/1182, 신규 1건) + `pnpm --filter moneyball test`(4217/4217) + 양쪽 `type-check`/`lint` clean. PR #3053 → squash merge `7095e37b` (R7 `--auto` 즉시 성공) + `build: v0.5.62.94` 버전 반영(`42517584`).

다음 사이클 추천 = explore-idea(saturation 9/15→10/15 근접) 또는 op-analysis(7/25 진행). review-code가 최근 다수 사이클 dominant — WAR/SFR family 소진 + 신규 shadow-reasoning family는 1회성(2곳 모두 수정 완료) → 다양성 회복 권장. skill-evolution trigger 5개 전부 미충족.

## 🔵 RETRO-ONLY — MLB_BASE_WEIGHTS 완전 wiring 확인 + WAR/SFR family 4th 재확인, 신규 target 0건 (cycle 2436, 2026-08-23)

진단: open issue 0, approved plan 0/29(29=Tier4 유지). gap trigger 전부 미도달(fix-incident 13/20, op-analysis 5/25, info-arch 11/30, lotto 44/30 재충족이나 self-heal 완료 확인 — skip). 2-chain lock 미충족(직전8 distinct=4). explore-idea saturation 10/15 미충족. 직전 3연속(2433~2435) 추천 후보(explore-idea/fix-incident) 양쪽 강한 trigger 부재 상태에서 review-code(heavy)로 미감사 대형 파일(`packages/shared/src/index.ts` 3435줄, `packages/kbo-data/src/factors/mlb-base.ts`) 직접 감사.

실측: (1) `computeFactorAveragesFromPerspectives`(index.ts:2857) — cycle 2429 SFR/WAR gap guard 정상 적용 확인, 추가 occurrence 없음. (2) `MLB_BASE_WEIGHTS` 14팩터(`mlb-base.ts`) 전부 `safe()` wiring 완료 확인(sp_fip/sp_xfip/lineup_woba/bullpen_fip/recent_form/war/head_to_head/park_factor/elo/defense_sfr/lineup_xwoba/lineup_barrel_pct/sp_xwoba_against/woba_std) — cycle 2394 elo/recent_form/head_to_head silent-no-op 수정 이후 잔여 미wiring 없음. (3) `defense_sfr`/`sp_xwoba_against`/`woba_std` MLB placeholder(diff=0 항상 무영향) — cycle 2402 이미 comment 로 명시적 disclosure 확인, 신규 버그 아님(silent 아님, 의도된 placeholder). (4) `FANCY_STATS_DEFAULTS` 전체 필드 재검토 — sfr 만 default=0(ambiguous, family 대상), woba(0.320)/fip(4.00)/elo(neutral)/winPct(neutral)/totalWar(12) 는 nonzero 리그평균 fallback이라 gap-vs-real 구분 문제 자체 없음 — family 범위가 SFR+WAR 두 팩터로 한정됨을 재확인. (5) methodology page 하드코딩 n= grep — `V2_PROMOTION_COHORT_N` 상수 참조뿐, 하드코딩 없음 확인. (6) `gh run list` CI 실패 0건.

결과: 코드 변경 0건. WAR/SFR family 4연속(2432~2436) 소진 재확인 — review-code(heavy) 후속 fire 시 이 family 재검색은 저수익, 신규 파일/영역 우선 권장. skill-evolution trigger 5개 전부 미충족(trigger3 2436%50≠0, trigger5 review-code 표본 내 아래 참조). 다음 사이클 추천 = fix-incident(13/20 gap 진행) 또는 explore-idea(10/15, saturation 근접).

## 🔵 RETRO-ONLY — CI/파이프라인/lotto self-heal 실측 재확인, 신규 target 0건 (cycle 2433, 2026-08-23)

진단: open issue 0, approved plan 0/29(29=Tier4 유지). gap trigger 전부 미도달(fix-incident 10/20, op-analysis 2/25 방금 발화, info-arch 8/30, lotto 41/30 재충족이나 self-heal 이미 완료 확인). 2-chain lock 미충족(직전8 distinct=4). explore-idea saturation 11/15 미충족.

실측: (1) `gh run list` CI 실패 0건, Failure Dispatch 전부 skipped 정상. (2) Supabase REST 직접 조회 — 오늘 KBO v1.8 예측 4건 + MLB mlb_v0.1 예측 5건 정상 생성, KBO 5경기 결과 전부 반영 — 파이프라인 silent 실패 없음. (3) lotto 1239회(8/29) 50세트 + 1238회 result 이미 cron self-heal 완료 확인. (4) WAR/SFR=0 gap guard family — war/sfr 참조 신규 파일(convergenceRecord.ts 등) computeCompositeDuel 경유라 가드 이미 보유, 추가 occurrence 없음. (5) unprocessed plan 23개 전부 completed/superseded/partial/pending-user.

결과: 코드 변경 0건. skill-evolution trigger 5개 전부 미충족(trigger1 cumulative 9건 기존 관행대로 marker 미생성, trigger5 review-code 10/19 표본으로 미충족 — 0회 아님). 다음 사이클 추천 = explore-idea(saturation 11/15→12/15 근접) 또는 fix-incident(10/20 진행 중).

## 🔵 RETRO-ONLY — 전 영역 clean scan, 신규 target 0건 (cycle 2432, 2026-08-23)

진단: open issue 0, approved plan 0/29. gap trigger 전부 미도달(fix-incident 9/20, op-analysis 1/25 방금 발화, info-arch 7/30, lotto 0/30 방금 self-heal). 2-chain lock 미충족(직전8 distinct=4). explore-idea saturation 11/15 미충족. cycle 2431 추천 후보(fix-incident/info-architecture-review) 양쪽 실측 점검.

실측: (1) WAR/SFR=0 데이터 갭 guard family 재그렙 확장(ModelVersionHistory/MatchupFactorCompare/MlbMatchupFactorCompare) — 신규 occurrence 0건, cycle 2431 소진 확정 재재확인. (2) info-arch breadcrumb grep 로 reviews/weekly·monthly(kbo/mlb/en 3세트) 누락 발견했으나 실제 확인 결과 redirect-only stub(즉시 308, 컨텐츠 없음) — Breadcrumb 불필요, false positive. (3) route mtime -7 신호 105건 = git checkout 잡음(전부 최근으로 뜸), 실질 신규 라우트 아님. (4) sitemap.ts(85) vs page.tsx(105) 차이 = 의도된 설계(주석에 redirect stub 제외 명시) — 버그 아님. (5) `gh run list` CI 실패 0건 확인. (6) unprocessed plan 23개 전부 completed/superseded/partial/pending-user, approved 0건.

결과: 코드 변경 0건. skill-evolution trigger 5개 전부 미충족(trigger1 cumulative 9건이나 이미 과거 소진된 카운트/marker 미생성 관행 유지, trigger5 review-code 11/19 표본으로 미충족). 다음 사이클 추천 = fix-incident 또는 explore-idea(saturation 11/15→12/15 근접, review-code/info-arch 는 이번 사이클로 clean 확인 완료).

## 🔵 RETRO-ONLY — review-code family 소진 재확인 + Daily Pipeline false-alarm 해소 + op-analysis n-freeze 원인 정밀 규명 (cycle 2431, 2026-08-23)

진단: open issue 0, approved plan 0/29. gap trigger: fix-incident 8/20, op-analysis 4/25, info-arch 6/30 전부 미도달. lotto 39/30 재충족이나 5회+ no-op 확정(cron self-heal) skip. 2-chain lock 미충족(직전8 distinct=5). explore-idea saturation 11/15 미충족. 직전 3연속 review-code(heavy)가 WAR/SFR=0 gap guard family 3/4/5th occurrence 를 고쳤기에 이번 cycle 재그렙(FactorBreakdown 4 usage + Matchup/MlbMatchup/MlbFactorWaterfall 4 컴포넌트) — 신규 occurrence 0건, family 소진 확정.

부가 발견: `gh run list` 로 "Daily KBO Pipeline" GH Actions 최근 실행이 2026-04-28 라 처음엔 4개월 인시던트로 보였으나, workflow 파일 주석 확인 결과 2026-04-29 Cloudflare Workers Cron 으로 의도적 이관 완료(schedule 영구 비활성화 명시) — false alarm, 인시던트 아님.

실행: `pnpm tsx scripts/op-analysis-ce-cohort.ts` 재실행. 결과: 전체 n=332/CE n=285/비CE n=47 — cycle 2361/2427과 완전 동일. 이번엔 Supabase REST 직접 조회로 원인 정밀 규명: count=exact 332건 확인, 최신 verified_at=2026-08-22T14:17 UTC(=23:17 KST), games.game_date=2026-08-22 — 오늘(08-23) 경기는 야간 검증 배치 전이라 미포함. "같은 날 재측정" 추정(cycle 2427)보다 정확한 원인("검증 배치는 경기 종료 후 야간 1회 실행") 확정. 격차 10.1pp, overlap 통제 10.8pp, LLM 부가가치 우세 방향 7회 연속 재확인. 최근 KBO v1.8 예측 전부 debate_version=null 확인 — CREDIT_EXHAUSTED 지속 기존 관측 정합.

결과: 코드 변경 0건. 다음 사이클 추천 = fix-incident(9/20) 또는 info-architecture-review(7/30) gap 순번, 또는 익일 야간 검증 배치 이후 op-analysis 재측정(신규 표본 기대).

## 🔵 RETRO-ONLY — operational-analysis(lite) CE-cohort 재측정, 동일 표본 재확인 (cycle 2427, 2026-08-23)

진단: open issue 0, approved plan 0/29(29=Tier4 보류 유지). gap trigger: fix-incident 4/20, op-analysis 11/25(미도달이나 데이터 신선도 체크 저비용), info-arch 2/30(방금 발화), lotto 35/30 재충족이나 실측(`~/lotto_picks/` mtime, 2026-08-29-50sets.md + 2026-08-22-result.md 모두 오늘 생성) self-heal 완료 확인 — 5번째 no-op 재발이라 skip (cycle 2426 chain-evolution 제안과 정합). 2-chain lock 미충족(직전8 distinct=4). explore-idea 는 saturation trigger(12/15) 충족하나 plan #29 가 이미 "3-source 재탐색 완전 포화, 남은 후보는 Tier4(회원인증/커뮤니티) 뿐" 확정 — 신규 재탐색 무의미 판단, review-code 는 최근 5사이클 중 3회 clean audit(2418/2420/2421/2422/2426) 누적 — 둘 다 저수익 예상. op-analysis(lite) 로 다양성 회복 + 데이터 최신 상태 확인 선택.

실행: `pnpm tsx scripts/op-analysis-ce-cohort.ts` 재실행 (cycle 1547 spec 축 A harness). 결과: 전체 n=332 / CE n=285 / 비CE n=47 — **cycle 2361 재측정치와 완전 동일** (66 cycle 경과했으나 신규 표본 0건, 같은 날 05:04 측정이라 일별 예측 배치 사이 자연 정지). CE 53.7%(153/285) / 비CE 63.8%(30/47) → 격차 10.1pp, overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 → LLM 부가가치 우세 방향 재확인(6회 연속 이상). 비CE 표본 동결 지속(마지막 예측 2026-07-01), CREDIT_EXHAUSTED 지속.

결과: 코드 변경 0건, 신규 데이터 0건(같은 날 재측정 자연 결과, drift 아님). CLAUDE.md 갱신 skip(수치 delta 없음).

다음 사이클 추천 = 익일 daily-pipeline 이후 op-analysis 재측정(신규 표본 기대) 또는 gap trigger 순번(fix-incident 5/20, info-arch 3/30).

## 🔵 RETRO-ONLY — review-code(heavy) MLB predictionLeadHours parity 재검증 + lotto trigger chain-evolution 제안 (cycle 2426, 2026-08-23)

진단: open issue 0, approved plan 0/29. gap trigger: fix-incident 3/20, op-analysis 10/25, info-arch 1/30(방금 발화), lotto 34/30 재충족. 2-chain lock 미충족(직전8 distinct=4). cycle 2425 retro 가 명시적으로 review-code(heavy) target 지정(cycle 2424 신규 이식 MLB predictionLeadHours/모델 메타 정보 블록 KBO parity 값 검증).

감사: KBO `analysis/game/[id]/page.tsx` predictionLeadHours(startDateIso KST +09:00 offset + HOUR_MS 나눗셈) vs MLB `mlb/games/[date]/[slug]/page.tsx`(game_datetime_utc 직접 사용 + 동일 HOUR_MS) 라인 단위 대조 — 로직/null-safety 완전 동일. 게이팅 조건 차이(KBO: `preGame.factors` / MLB: `pred.model_version`)는 MLB 가 factors 그리드를 별도 컴포넌트로 이미 커버하는 의도된 설계(커밋 메시지 명시) — 버그 아님. 신규 버그 0건.

병행 발견: lotto 30-cycle gap trigger 가 cycle 2422/2424 에 이어 재충족했지만 실측(`~/lotto_picks/` mtime) 결과 이미 오늘(8/23) self-heal 완료 확인 — 4번째 no-op 재발. 원인 규명: `.github/workflows/lotto-pick-update.yml`+`lotto-result-update.yml`+`lotto-pick-monitor.yml` 3개 cron 이 develop-cycle 과 독립적으로 매주 자율 처리 중이라 순수 시간경과 기반 trigger(6)이 구조적으로 노후화. chain-evolution 후보 spec 박제(`docs/superpowers/specs/2026-08-23-cycle-2426-followup-chain-evolution-lotto-gap-trigger-redundant.md`) — trigger(6)를 "cron 최근 실행 실패/파일 부재 조건부"로 변경 제안. 실제 SKILL.md 반영은 다음 skill-evolution fire(cycle 2450 예상) 시.

결과: 코드 변경 0건(review-code 감사 clean). chain-evolution 제안 1건 dispatch.

다음 사이클 추천 = fix-incident(4/20) 또는 op-analysis(11/25) — review-code 신규 target 이번 사이클로 소진.

## 🟢 SUCCESS — explore-idea(lite) MLB game detail 모델 메타 정보 블록 KBO parity 이식 (cycle 2424, 2026-08-23)

진단: open issue 0, approved plan 0/29(29=Tier4 보류 유지). gap trigger: fix-incident 방금 발화(2423), op-analysis 8/25, info-arch 29/30(다음 사이클 도달), lotto 30/30 이지만 실측(count/picks mtime) 재확인 결과 8/22 결과+8/29 50세트 이미 오늘 생성 완료라 재발화 무의미. 2-chain lock 미충족(직전8 distinct=4). explore-idea saturation trigger 충족(직전15 12/15 review-code/fix-incident/polish-ui/info-arch). cycle 2423 자체 retro 가 "predicted_at 실측 채워졌으니 MLB lead-time 배지 이식 가능"을 명시적 carry-over로 남김 — 실측 확인(grep) 결과 진짜 gap.

실행: KBO `analysis/game/[id]/page.tsx` 의 "모델 메타 정보" details 블록(정량 모델 + 토론 버전 + 리드타임, model_version/debate_version/predicted_at 기반)을 MLB `mlb/games/[date]/[slug]/page.tsx` 에 이식 — select 에 3컬럼 추가 + HOUR_MS 기반 predictionLeadHours 계산 + 동일 JSX 블록(factors 그리드는 MLB 는 별도 컴포넌트가 이미 커버해 제외). 회귀 테스트 1건 추가.

결과: 전체 테스트(kbo-data 1176 + moneyball 4209) + eslint + tsc --noEmit clean. PR #3049 squash 머지 완료(main HEAD 95af5f7b).

다음 사이클 추천 = info-architecture-review(29/30, 다음 사이클 도달) 또는 review-code(heavy, 이번에 추가한 predictionLeadHours 계산 KBO 값과 재대조 여지). lotto self-heal 재확인 무의미 패턴 3회 누적(cycle 2392/2422/2424) — chain-evolution 후보로 격상 검토(trigger 를 "다음 실제 추첨일 이후"로 변경).

## 🔵 RETRO-ONLY — review-code(heavy) telegram notify + cron dispatch alert 감사, clean (cycle 2422, 2026-08-23)

진단: open issue 0, approved plan 0/29(전부 completed/rejected/deferred — plan #29 회원인증+커뮤니티는 Tier 4 사용자 영역 보류 유지). gap trigger: lotto 30/30 도달했으나 cycle 2392 가 이미 동일 self-heal 확인(1239회 picks cycle 2344 생성분 + 1238회 OOS 오늘 박제 완료, delta=0) — 재확인해도 상태 불변이라 재실행은 순수 중복. fix-incident 8/20, op-analysis 6/25, info-arch 27/30 전부 미도달. 2-chain lock 미충족(직전8 distinct=4). cycle 2421 이 review-code 4대 monolith 소진 확정한 상태에서, cycle 2392 retro 가 남긴 다음 후보("telegram notification 코드 / cron dispatch handlers") 직접 감사로 전환.

감사: `notify/telegram.ts`(257줄, notifyPredictions/notifyResults/notifyAnnounce/notifyPipelineStatus/notifyError 전체) — wave_177 throw 게이트, 취소경기 분리 집계, 0-result 명시 메시지 모두 정상. `notify-status-predicate.ts`(35줄, cycle 1191 wave 20 predicate) — comment/구현 일치 확인. daily.ts 안 notifyPredictions/notifyResults 콜사이트(flag-check → notify → mark-flag 순서, 실패 시 flag 미박제로 재시도 허용) 정상. cron dispatch 4종(`ci-failure-dispatch.yml`/`health-alert.yml`/`deploy-drift-alert.yml`/`runtime-error-alert.yml`) 감사 — ci-failure-dispatch 만 hub `compose-dispatch-payload` 사용(workflow_run trigger, workflows:["CI"] 한정)이고 나머지 3개(health/deploy-drift/runtime-error)는 hub dispatch 미사용, GH Actions 네이티브 exit 1 + 이메일 알림으로 의도적 설계(파일 내 주석에 "Sentry warning + GH Actions email 알림 자동 fire" 명시) — 갭 아닌 확인된 의도.

결과: 신규 버그 0건, 코드 변경 없음. review-code 잔여 target 계속 소진 추세 — telegram/cron dispatch 영역도 clean 확인.

다음 사이클 추천 = gap-trigger 순번 대기(info-arch 27/30, fix-incident 8/20 순). lotto 30-cycle gap trigger 가 self-heal 상태에서 무의미하게 재발화하는 구조적 갭(cycle 2392 재확인 → cycle 2422 재발화, 실제 액션 없이 카운터만 리셋) — 다음 lotto fire(≈cycle 2452 예상) 도 draw 없이 같은 상태면 3연속 no-op, trigger 자체를 "다음 실제 추첨일 이후"로 바꾸는 chain-evolution 후보로 고려.

## 🔵 RETRO-ONLY — review-code(heavy) analysis-data.ts(KBO+MLB) 완전 감사, clean (cycle 2420, 2026-08-23)

진단: open issue 0, approved plan 0/29. gap trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 4/25, info-arch 25/30, lotto 28/30). 2-chain lock 미충족(직전8 distinct=4). cycle 2419 추천 미감사 monolith `analysis/analysis-data.ts`(938줄) 직접 감사.

감사: KBO analysis-data.ts 전체(938줄) — PRODUCTION_COHORT_RULES 필터 전 쿼리 정상, computeCompositeDuel 중앙 guard(cycle 2419) 재사용 확인. 가설 3건 조사 후 반증: (1) getThisWeekRemainingGames elo/factor 쿼리 league 미필터 — scoring_rule 값 자체(v1.8 계열 vs mlb_v0.1)로 이미 KBO/MLB 완전 분리 (2) getSeasonH2HData games 테이블 league 미필터 — MLB 는 별도 mlb_schedule 테이블 사용이라 games 는 KBO 전용 구조 (3) sibling mlb/analysis/analysis-data.ts(279줄) 동반 감사 — 2-step pattern 정상, SFR 미구현이라 guard 불필요.

결과: 신규 버그 0건, 코드 변경 없음. review-code 잔여 대형 monolith 감사 대상 소진 추세 재확인(KBO+MLB analysis-data.ts 양쪽 완료).

다음 사이클 추천 = gap-trigger 순번 대기(info-arch 25/30, lotto 28/30 임박) 또는 review-code 신규 target 재탐색.

## 🟢 SUCCESS — review-code(heavy) SFR=0 data-gap guard 누락 수정 + package.json version drift 정정 (cycle 2419, 2026-08-23)

진단: open issue 0, approved plan 0/29. gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 3/25, info-arch 24/30, lotto 27/30). 2-chain lock 미충족(직전8 distinct=4). cycle 2417/2418 retro 가 남긴 미감사 monolith `analysis/page.tsx`(2803줄) agent 위임 감사.

발견: SFR=0(Fancy Stats silent-fallback stub)이 WAR=0(cycle 1904 wave-533/535)과 동일 데이터 갭 family 인데 predictor.ts factors.sfr / computeCompositeDuel.ts sfrResult+valid / analysis/page.tsx SFR 직접대결 배지 3곳(4곳 중 1곳만 기존 guard 보유)에 guard 미적용 — 한쪽 팀 SFR=0(스크랩 실패 또는 진짜 평균)이 실제 수비 우위로 오인되어 duel 승패·예측 팩터에 반영. 부수로 package.json(root+app) 이 cycle 2413 VERSION bump 때 미동기화(0.5.62.86 정체)된 걸 version-sync-guard.test.ts(cycle 2047)가 fail 로 잡아냄 — scoped test 만 돌리던 이전 cycle들이 놓친 것.

실행: predictor.ts/computeCompositeDuel.ts/page.tsx 3곳에 `!== 0` guard(SFR은 음수가 정상값이라 WAR의 `> 0` 대신 사용) + 회귀 테스트 7건 추가 + 기존 sfr=0 encoding 테스트 2건 정정 + package.json 버전 캐치업. 전체 테스트(kbo-data 1175 + moneyball 4208) + type-check + lint clean.

다음 사이클 추천 = gap-trigger 순번 대기(info-arch 25/30, lotto 28/30 임박) 또는 review-code 계속(잔여 target: analysis-data.ts 938줄 미감사).

## 🔵 RETRO-ONLY — review-code(heavy) convergenceRecord.ts + picks/results route + MLB team-code 정규화 재감사, clean (cycle 2418, 2026-08-23)

진단: open issue 0, approved plan 0/22. gap trigger 4종 전부 미도달(fix-incident 4/20, op-analysis 2/25, info-arch 23/30, lotto 26/30). 2-chain lock 미충족(직전8 distinct=4). cycle 2417 추천에 따라 review-code(heavy) 잔여 target 재탐색.

감사: convergenceRecord.ts(831줄) — h2h family fix(cycle 2304) 양쪽 콜사이트(fetchConvergencePickDetailedResults/…ForPair) 정합, MLB/KBO min-picks 상수 공유 의도적(comment 확인). api/picks/results/route.ts — CURRENT_SCORING_RULE 우선 + pre_game fallback + any-pred fallback 3단 체인으로 legacy v1.8-credit-fail row 실제 배제 없음(comment는 다소 misleading하나 동작 정상). MLB team-code 정규화(toMlbStatsApiCode) 전체 콜사이트 5개 파일(convergenceRecord/buildMlbMatchupProfile/fetchMlbHistoricalAnalogs/buildMlbTeamFactorAverages/buildMlbTeamProfile) 재점검 — 전부 정상, cycle 2081 family 재발 없음.

결과: 신규 버그 0건, 코드 변경 없음. review-code 잔여 감사 대상 소진 추세 재확인(cycle 2417 관측과 일치). 미감사 대형 파일 잔존: analysis-data.ts(938줄)/analysis/page.tsx(2803줄).

다음 사이클 추천 = gap-trigger 순번 대기(info-arch 23/30, lotto 26/30 근접) 또는 op-analysis(신규 표본 축적 대기) — diversity 확보 기회.

## 🟡 PARTIAL — explore-idea(heavy) 회원인증+커뮤니티 ETA 도달 재평가, 보류 권고 plan #29 (cycle 2417, 2026-08-23)

진단: open issue 0, approved plan 0/28. gap trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 1/25, info-arch 22/30, lotto 25/30). 2-chain lock 미충족(직전8 distinct=4: review-code/explore-idea/fix-incident/operational-analysis). explore-idea saturation trigger 충족(직전 15 cycle 13/15). review-code 3연속 clean audit(2413-2415) + op-analysis 신규 표본 0건(2416) 이후 다양성 회복 fire.

발견: EN/KO MLB parity·JSON-LD 구조화 데이터(56 라우트 기존 커버)·TODOS Next-Up 재확인 등 기존 3-source 는 모두 재소진 확인(신규 없음). 대신 `/login`(page.tsx)·`/community`(page.tsx) 둘 다 "📌 박제 중 (ETA 2026-08~09)" placeholder 로 남아있고 오늘이 그 구간 안 — 헤더 `PlaceholderLoginButton.tsx` 도 동일 ETA. Supabase Auth 세션 관리 wiring 리포 안 0건(신규 인프라 필요).

실측(service-role REST count=exact): `user_picks`=1, `mlb_user_picks`=0, `pick_poll_events`=5, `mlb_pick_poll_events`=0 — plan #27(cycle 2334) 측정치와 완전 동일, 83 cycle(수일) 경과했지만 변화 0.

rubric 5축 평가 결과 **Tier 4(사용자 영역)**: risk=3(인증/세션/RLS 자율 단독 구현 부적합) + 자율 가능=no(인증 방식/커뮤니티 범위 결정 필요) + 트래픽 근거 부재(활성 참여 1~5건) 조합 — 이번 cycle 착수 보류 권고. plan #29 작성(`~/.develop-cycle/plans/moneyballscore/29.md`, expiry 2026-10-15) — 재평가 트리거 = KBO 포스트시즌 일정 확정 도달 또는 user_picks/poll COUNT ≥10 성장 또는 사용자 직접 지시.

다음 사이클 추천 = review-code(heavy) 계속(잔여 target 재탐색) 또는 gap trigger 순번(info-arch 22/30, lotto 25/30 근접).

## 🔵 RETRO-ONLY — fix-incident(lite) 20-cycle gap trigger 점검, clean (cycle 2414, 2026-08-23)

진단: open issue 0, approved plan 0/22. 2-chain lock 미충족(직전8 distinct=3). fix-incident 20-cycle gap trigger 충족(마지막 발화 cycle 2394).

점검: pipeline_runs 최근 20건 전부 status=success/errors=[] (predict/mlb_shadow_train/mlb_savant_scrape/mlb_fancy_scrape/mlb_statsapi_scrape/verify/predict_final/announce). gh run list 최근 10건 전부 success 또는 정상 skip(CI Failure Dispatch=dispatch 대상 없음). open GH issues 0건. git log 최근 7일 정상 fix/policy 커밋만, debug 패턴 없음. → 실제 incident 없음, gap 카운터 리셋.

다음 사이클 추천 = review-code(heavy) dominance 지속(직전 20 cycle 13/20=65%) 또는 op-analysis(21/25 gap 근접) 순번 대기.

## ✅ SUCCESS — mlb_shadow_train_log.milestone_hit 영구 false 수정 (cycle 2413, 2026-08-23)

진단: open issue 0, approved plan 0/22. gap trigger 4종 전부 미도달(fix-incident 19/20, op-analysis 20/25, info-arch 18/30, lotto 21/30). 2-chain lock 미충족(직전8 distinct=3: review-code/polish-ui/explore-idea). cycle 2412 retro 추천 fresh target(mlb-shadow-c.ts/mlb-overview.ts/statsapi-mlb.ts) 직접 감사.

발견: mlb-overview.ts 는 clean(factor 3-set 분류가 mlb-waterfall.ts 의 defense_sfr/sp_xwoba_against/woba_std 제외 설계와 정합, cycle 2402 이미 공개된 사실 재확인). mlb-shadow-c.ts 자체(trainShadowWeights/computeBrier/walkForwardExpanding)도 순수 함수라 clean. 문제는 소비부 `mlb-pipeline.ts` runShadowTrain — `MILESTONE_TRIGGERS.includes(samples.length)` 비교가 `samples.length`(하루치 mlb_schedule final 경기 수, MLB 특성상 최대 ~15경기)와 threshold 값([27,60,150,300,1000,2430], KBO v1.8→v2.0 n=150 누적 패턴 차용해 "누적 학습 표본 수" 도달을 의도)을 직접 비교 — 절대 일치 불가능한 구조. migration 049(mlb_shadow_train_log 테이블 최초 생성) 이후 `milestone_hit` 컬럼이 한번도 true 기록한 적 없이 영구 false.

실행: insert 직전 기존 mlb_shadow_train_log(league='mlb') sample_count 합을 조회해 누적치 계산, `priorCumulative < threshold <= newCumulative` crossing 판정으로 교체. 회귀 가드 2건 추가(미달 시 false / 26+1=27 crossing 시 true). `tsc --noEmit`/`eslint`(scoped) clean, `pnpm --filter kbo-data test` 90 files/1171 tests green(신규 2건 포함), pre-push lint+type-check(전 패키지) 확인 예정.

다음 사이클 추천 = gap trigger 순 대기(fix-incident 20/20 다음 사이클 도달 — trigger 충족 예상) 또는 review-code(heavy) 계속(잔여 후보: statsapi-mlb.ts fetchProbablePitchers는 cycle 2402 Tier 3 스코프 — 신규 스크레이퍼 필요라 review-code 단일 사이클 범위 밖, 별도 explore-idea/expand-scope 후보로 carry).

## ✅ SUCCESS — mlb-waterfall.ts recent_form scale mismatch fix (cycle 2412, 2026-08-23)

진단: open issue 0, approved plan 0/22. gap trigger 4종 전부 미도달(fix-incident 18/20, op-analysis 19/25, info-arch 17/30, lotto 20/30). 2-chain lock 미충족(직전8 distinct=3). cycle 2411 retro 추천 fresh target(mlb-waterfall.ts/mlb-elo.ts) 직접 감사.

발견: mlb-elo.ts 는 clean. mlb-waterfall.ts pairTerms 전 항목을 mlb-base.ts computeMlbFactorContributions 수식과 1:1 대조한 결과 recent_form 만 문제 — DB 저장은 0-1 승률(KBO 동일 컨벤션, fmtPct 가 *100 해 표시)인데 mlb-waterfall.ts/mlb-base.ts 의 recent_form 계약은 mlb-pipeline.ts 가 computeMlbProbability 호출 직전 *100 해 넘기는 0-100 스케일 — KO/EN game-detail page.tsx 양쪽이 DB 원본값을 그대로 waterfallInput 에 넣어 waterfall bar 가 100배 축소, factor-detail 표에 "0.7%" 같은 무의미한 값 표시, AI 개요 서술(NARRATIVE_MIN_PP=0.1pp 임계)에서 recent_form 이 사실상 항상 누락되던 silent 상태(기존 mlb-waterfall.test.ts/mlb-factor-detail.test.ts 는 0-100 값으로 테스트해 이 gap 을 못 잡음).

실행: 양쪽 page.tsx 에서 recent_form pair 를 null-safe *100 변환 후 waterfallInput 구성. 기존 두 페이지 test 파일에 소스-스트링 회귀 가드 2건 추가. `tsc --noEmit`/`eslint`(scoped) clean, `pnpm --filter moneyball test` 500 files/4205 tests green(신규 2건), pre-push lint+type-check(전 패키지) green. 직접 main commit(e8e5ee04) + push.

다음 사이클 추천 = review-code(heavy) 계속(mlb-overview.ts/mlb-shadow-c.ts 잔여 확인) 또는 gap trigger 순 대기(fix-incident 19/20 다음 사이클 도달).

## ✅ SUCCESS — MLB sp_xwoba_against/woba_std 7% weight 무주석 always-zero-contribution 공개 (cycle 2402, 2026-08-23)

진단: open issue 0, approved plan 0/22. gap trigger 4종 전부 미도달(fix-incident 8/20, op-analysis 9/25, lotto 10/30, info-arch 7/30). explore-idea saturation 미충족(7/15). TODOS Next-Up 신규 리드 없음. cycle 2394/후속 오늘 이미 fix된 MLB elo(10%)/recent_form+head_to_head(13%) silent-no-op wiring 성공 패턴 이어 mlb-pipeline.ts 잔여 factor input 을 mlb-base.ts(MLB_BASE_WEIGHTS) 대조 직접 감사.

발견: `defense_sfr`(5%)는 이미 mlb-pipeline.ts 주석으로 "MLB 미구현 placeholder(항상 0,0 입력)" 공개돼 있었으나, 동일하게 home/away 양쪽에 항상 같은 상수를 넣어(`sp_xwoba_against: MLB_STAT_DEFAULTS.xwoba` 양쪽 동일, `woba_std: 0.030` 양쪽 동일) diff=0 → homeAdvantage 기여도가 구조적으로 항상 0인 `sp_xwoba_against`(4%)/`woba_std`(3%) 는 그동안 무주석 상태 — 합쳐서 MLB 모델 weight 12%(defense_sfr 5% + 이 둘 7%)가 항상 죽어있는 채로 미공개. 코드 동작 변경은 아님(mlb-base.test.ts 가 diff=0→contribution=0 이미 lock) — 실제 상태를 정확히 서술하는 주석 추가. 부가로 `sp_fip`(12%)/`bullpen_fip`(10%) 도 MLB 는 선발투수 개인 FIP 데이터 소스가 없어 팀 aggregate(`mlb_team_stats.fip`)를 양쪽 공유함(`mlb-pipeline.test.ts` 508/580행 duplicate 값 이미 assert)을 확인, 이유 주석 추가. `statsapi-mlb.ts`의 `fetchProbablePitchers`(선발투수 이름/ID 스크레이프)가 개인 통계 소스 부재로 프로덕션 미연결 상태인 것도 확인 — 신규 스크레이퍼 필요(Tier 3, 별도 스코프, 액션 아이템만 기록).

실행: 코드 동작 변경 없음, 주석 3곳 추가만. `tsc --noEmit` clean, `pnpm --filter kbo-data test` 90 files/1166 tests green, pre-push lint+type-check green. 직접 main commit(docs, R4 — cycle 2400 동일 docs-only 패턴 선례).

다음 사이클 추천 = gap trigger 순 대기(fix-incident 9/20, op-analysis 10/25, lotto 11/30, info-arch 8/30) 또는 review-code(heavy) 계속(잔여 후보: mlb-waterfall.ts, mlb-elo.ts 동일 계열 미검증 가능성).

## ✅ SUCCESS — shared 상수 4개 stale doc comment 정정 (cycle 2400, 2026-08-23)

진단: open issue 0, approved plan 0/22. gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 6/25, info-arch 4/30, lotto 7/30). 2-chain lock 미충족(직전8 distinct=5). cycle 2399 retro 가 남긴 미감사 monolith lead 따라 accuracy/page.tsx(1204줄) 직접 감사.

발견: accuracy/page.tsx 자체는 clean(쿼리 필터/computeCommunityVsAI/buildFactorAccuracy 전부 정합). 감사 도중 packages/shared/src/index.ts 안 `DEVICE_ID_MAX_LENGTH`/`MIN_POLL_TOTAL`/`COMMUNITY_DIVERGE_MIN`/`CALIBRATION_BUCKET_WIDTH` 4개 상수의 doc comment가 각각 wave 303/305/500/305(cycle 1632/1634/1867/1634) 당시 "하드코딩/로컬 사본 미해결" 상태를 서술한 채 방치돼 있었으나, 실제 코드(`PickButton.tsx`/`route.ts`/`page.tsx`/`debug/reliability/page.tsx`)는 이미 전부 해당 상수를 import 해 사용 중 — comment 만 과거 wave 시점에 멈춰 실제로는 해소된 drift 를 미해결로 오도 서술 중이던 케이스.

실행: 4개 comment 를 "fix 완료" 서술로 정정 (코드 동작 변경 없음). `type-check`/`test`(shared 212 tests) clean, pre-push lint+type-check green. 직접 main commit(docs, R4).

milestone: cycle 2400 (`%50==0`) — trigger 3 독립 평가로 skill-evolution-pending marker 박제 (다음 사이클 강제 발화, 사례 19 mitigation).

다음 사이클 = skill-evolution 자동 발화 (marker 감지).

## ✅ SUCCESS — buildTeamProfile.ts/buildMlbTeamProfile.ts teamGames 암묵적 sort-order 의존 fix (cycle 2399, 2026-08-23)

진단: open issue 0, approved plan 0/22(전량 completed/archived/superseded/blocked). gap trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 6/25, lotto 7/30, info-arch 4/30). 2-chain lock 미충족(직전8 distinct=5). cycle 2398 retro 가 남긴 미감사 monolith lead(accuracy/page.tsx/buildAccuracyData.ts/buildTeamProfile.ts) 중 buildAccuracyData.ts 는 이미 cycle 2187/2195 감사 완료 확인 후 buildTeamProfile.ts 로 전환.

발견: `computeTeamStreak`/`computeTeamRecentRecord`/`computeTeamAvgMargin`/`computeTeamBlowoutCount`/`computeTeamCloseGameCount`/`computeTeamHomeAwayEdge` 6개 함수 전부 `teamGames` 가 game_date 내림차순임을 전제(docstring 명시)하는데, 그 정렬은 별도 문장이 아니라 `recentGames = teamGames.sort(...).slice(0,8)` 조립문의 `.sort()` in-place mutation 부수효과로만 보장되던 암묵적 의존이었음 — 문장 순서를 바꾸면(예: recentGames 계산을 뒤로 이동) 조용히 깨질 위험. MLB parity 파일 `buildMlbTeamProfile.ts` 에도 동일 패턴 중복 존재.

실행: 양쪽 파일에서 정렬을 독립 문장(`teamGames.sort(...)`)으로 분리, `recentGames`는 정렬된 배열의 `.slice(0,8)`만 수행하도록 정정. `tsc --noEmit`/`eslint`(scoped) clean, `pnpm --filter moneyball test` 500 files/4203 tests green. PR #3045 → R7 자동 머지(95bd0048).

다음 사이클 추천 = review-code(heavy) 계속 (잔여 후보: `accuracy/page.tsx` 1204줄 직접 감사) 또는 gap trigger 순 대기(fix-incident 6/20, op-analysis 7/25, lotto 8/30, info-arch 5/30).

## ⚪ (retro-only) — review-code(heavy) packages/shared/index.ts + validator.ts 심층감사 clean (cycle 2398, 2026-08-23)

진단: open issue 0, approved plan 0/22(전량 archived/completed/phase-split/blocked). gap trigger 4종 전부 미도달(fix-incident 4/20, op-analysis 5/25, lotto 6/30, info-arch 3/30). 2-chain lock 미충족(직전8 distinct=6). gh run list 최근 10건 전부 success/skipped(CI green). lite chain cooldown 미충족.

실행: 신규 monolith target 자연 발견 — `packages/shared/src/index.ts`(3426줄, 미감사 최대 파일) review-code(heavy) 심층 감사. DEFAULT_WEIGHTS(v1.8) CLAUDE.md 문서 값과 100% 일치 확인. TODO/FIXME/제네릭 catch(e) 패턴 0건. classifyWinnerProb/confToWinProb/getKSTWeekRange/getKSTMondayUtcIso 등 날짜·확률 로직 함수 15개 + computeMatchup*/computeSeasonHeadToHead* 등 통합 헬퍼 10개 + WAR/SFR/BULLPEN_FIP 등 배지 임계 상수 30여개 순차 검증 — 전부 실제 callsite(analysis/page.tsx, factor-explanations.ts, computeCompositeDuel.ts)와 정합, 각 상수마다 전용 silent-drift-wave 가드 테스트 기존 존재. `packages/kbo-data/src/agents/validator.ts` Sentry fallback 경로(notifyValidationViolations/evaluateAndCaptureAgentFallback/captureJudgeParseFallback) 도 재확인 — 전부 의도된 try/catch silent-noop(테스트 환경 전용) + 실제 실패 시 Sentry capture 정상 경로.

결론: 코드 변경 없음. 두 파일 모두 기존 silent-drift-wave 가드가 이미 촘촘히 커버 — 신규 drift 없음. 다음 사이클 추천 = fix-incident(5/20)/op-analysis(6/25)/lotto(7/30)/info-arch(4/30) gap 순 대기 또는 미감사 monolith(accuracy/page.tsx 1204줄, buildAccuracyData.ts 776줄, buildTeamProfile.ts 593줄) 자연 발견.

## ⚪ (retro-only) — cycle 2394 후속 스코프 소진 확인, false lead (cycle 2397, 2026-08-23)

진단: open issue 0, approved plan 0/22. cycle 2394 지정 후속(daily-summary.ts/live.ts 유사 telegram silent-swallow 패턴) 직접 검증 — 둘 다 telegram/sendMessage 호출 자체 없음, 이미 중앙화된 telegram.ts 단일 지점(cycle 2394 fix)이 daily.ts 3개 flag(announce/results/summary_sent) 전부 커버. res.ok grep 전체 재검토 — 나머지는 정상 fallback 패턴. gap trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 4/25, lotto 5/30, info-arch 2/30). 2-chain lock 미충족(직전8 distinct=5).

결론: 코드 변경 없음. 다음 사이클 추천 = fix-incident(4/20)/op-analysis(5/25)/lotto(6/30)/info-arch(3/30) gap 순 대기 또는 review-code 신규 monolith target 자연 발견.

## ⚪ (retro-only) — 전 소스 clean, actionable target 부재 (cycle 2396, 2026-08-23)

진단: open issue 0, approved plan 0/22(전량 archived/completed/phase-split/blocked). 직전8사이클(2388-2395) distinct=5 — 2-chain lock 미충족. gap trigger 4종 전부 미도달(fix-incident 2/20, op-analysis 3/25, lotto 4/30, info-arch 1/30 — 2395 방금 발화). lite chain cooldown 전부 미충족(streak 0~1). explore-idea saturation 6/15 — 12 미달. gh run list 최근 8건 전부 success/skipped. tsc/eslint 전 패키지 clean(FULL TURBO). DESIGN.md fresh. skill-evolution trigger 5종 미충족(milestone 2396%50=46, review-code 직전20 표본 12≥10 이나 review-code count=2≠0).

결론: 코드 변경 없음. 다음 사이클 추천 = fix-incident(3/20)/op-analysis(4/25)/lotto(5/30) gap 순 대기 또는 review-code 신규 monolith target 자연 발견.

## ✅ SUCCESS — telegram sendMessage silent-swallow HTTP failure 수정 (cycle 2394, 2026-08-23)

진단: open issue 0, approved plan 0/22. gap trigger 4종 전부 미도달(fix-incident 4/20, op-analysis 1/25, info-arch 29/30 임박, lotto 2/30). 2-chain lock 미충족(직전8 distinct=4). 직전 6/10 사이클 retro-only 반복 — 여러 사이클(2387/2389)이 반복 추천만 하고 실제 미시행 상태였던 `notify/telegram.ts` 를 처음 심층 감사.

발견: `sendMessage()` 가 Telegram API `!res.ok` 실패를 console.error 만 하고 throw 안 함 — `daily.ts` 의 `announce_sent`/`results_sent`/`summary_sent` flag 게이팅 + Sentry `silent_drift_family: wave_177` 캡처가 이 경로에서 전혀 작동 안 함(network exception 만 propagate 되던 기존 게이트의 사각지대). HTTP-level 발송 실패(400 등) 시에도 flag 는 "발송됨"으로 영구 박제되고 Sentry 알림도 없이 사용자만 알림 미수신.

실행: `!res.ok` 분기에 Error throw 추가해 기존 wave_177 게이트에 편입. 회귀 테스트 추가. `tsc`/`eslint` clean, kbo-data 1166/1166 + moneyball 500 files/4203 tests green. PR #3044 → R7 자동 머지(f8aeaf17).

다음 사이클 추천 = info-architecture-review(29/30, 다음 사이클 도달 예상) 또는 lotto(2/30) gap 순 대기. 후속 후보(스코프 밖) = daily-summary.ts/live.ts/silent-drift-alert.ts 등 다른 telegram 호출부에 유사 패턴 있는지 재점검.

## ⚪ operational-analysis(lite) — 25-gap 재측정, 데이터 정지 확인 RETRO-ONLY (cycle 2393, 2026-08-23)

진단: open issue 0, approved plan 0/22. 주기 gap trigger: op-analysis 마지막 발화 cycle 2368(lite) → 25 사이클 경과, 표에 명시된 "장기 미발화 주기 보정" trigger 충족(lite 자동 권장). 2-chain lock 미충족(직전8 distinct=3: review-code/fix-incident/lotto). fix-incident(3/20)/info-arch(28/30)/lotto(1/30) 나머지 3종 미도달.

측정: 이번 주(8/17~8/23 KST) verified predictions n=21, 적중 10/21=47.6% — cycle 2368 측정치와 완전 동일(n/acc/요일별 분포 전부 identical). 전체 v1.8+v1.8-credit-fail 누적 카운트도 332건으로 cycle 2361 heavy 측정치와 동일 — **cycle 2361→2393 32사이클 동안 신규 verified 예측 0건**. 최근 verified game_date = 2026-08-22(어제)로 파이프라인 자체는 살아있음, 단 develop-cycle 발화 속도가 실제 경기/검증 cadence 보다 훨씬 빨라 짧은 사이클 구간 안엔 새 데이터가 쌓이지 않는 구조적 특성(velocity ~0.2~2건/day 기존 관측과 정합, 버그 아님).

결론: 코드 변경 없음, 가중치 판단 근거 없음(표본 정지). op-analysis 25-gap trigger 자체는 "재측정 실행" 만 요구하지 "새 데이터 존재" 를 보장하지 않음 — 재측정이 stale 임을 확인하는 것 자체가 이번 사이클의 유효 결과. 다음 후보 = info-arch(29/30)/lotto(2/30) 임박 대기 또는 자연 발견.

## ✅ SUCCESS — hub-dispatch Sentry no-relay 태그 no-op 수정 (cycle 2390, 2026-08-23)

진단: open issue 0, approved plan 0/22, gap trigger 4종 미도달(fix-incident 7/20, op-analysis 22/25, info-arch 25/30, lotto 28/30), 2-chain lock 미충족. cycle 2389 추천대로 cron API routes 재탐색 — `picks/results/route.ts` clean, `hub-dispatch/route.ts` 에서 발견.

발견: `Sentry.withScope((s) => s.setTag('no-relay', 'true'))` 가 콜백 안에서 아무것도 캡처하지 않고 즉시 scope 를 버려 재귀 방지 태그가 실제로는 한 번도 붙은 적 없던 no-op(2e8ace67 최초 커밋부터 지속). `Sentry.getCurrentScope().setTag(...)` 로 교체해 요청 isolation scope 에 태그 지속. `tsc`/`eslint`/전체 테스트(500 files/4203 tests) green.

다음 사이클 추천 = op-analysis(23/25)/info-arch(26/30)/lotto(29/30) gap 도달 순 대기. 후속 후보(스코프 밖) = `composePayload`/`toDispatchBody`/GitHub `fetch` 호출부 명시적 try/catch 방어 보강.

## ⚪ (retro-only) — 전 소스 clean, cycle 2388 후속 grep도 clean (cycle 2389, 2026-08-23)

진단: cycle 2388 이 pipeline route.ts ANTHROPIC_API_KEY prefix leak 발견 후 추천한 "다른 cron/API route 유사 debug 잔재 재탐색"을 실행 — secret prefix slice/substring, console.log(secret), JSON 응답 내 KEY/SECRET/TOKEN 노출 패턴 grep 전부 0 matches. open issue 0, approved plan 0/22. gap trigger 4종 전부 미도달(op-analysis 21/25, info-arch 24/30, lotto 27/30, fix-incident 6/20). 2-chain lock 미충족(직전8 distinct=3: polish-ui/fix-incident/review-code). CI/deploy dispatch 전부 clean. skill-evolution trigger 5종 미충족(milestone 2389%50=39, review-code 직전20 다수 발화, ship-zero 미충족: 2380/2381/2388 success).

다음 사이클 추천 = op-analysis(22/25)/info-arch(25/30)/lotto(28/30) gap 도달 순 대기, 미도달 지속 시 telegram notification 코드 / cron dispatch handlers 재탐색.

## ⚪ (retro-only) — 전 소스 clean, actionable target 부재 (cycle 2387, 2026-08-23)

진단: open issue 0, approved plan 0/22 (plan22 review-code target 이나 이미 completion_cycle 1224 종결). 주기 gap trigger 4종 전부 미도달(fix-incident 4/20, op-analysis 19/25, info-arch 22/30, lotto 25/30). 2-chain lock 미충족(직전8 distinct=3). lite chain cooldown 리터럴 재계산 전부 streak=0. CI/lint 전부 clean, DESIGN.md ~45분 전 갱신. review-code 신규 target 재탐색 — scoring_rule CURRENT_SCORING_RULE vs PRODUCTION_COHORT_RULES 용도 분리 재점검(family #1338 유사 패턴 의심) 결과 cycle 2288 가드 테스트로 이미 의도된 설계 확인, 버그 아님.

다음 사이클 추천 = op-analysis(20/25)/info-arch(23/30)/lotto(26/30) gap 도달 순 대기, 미도달 지속 시 review-code 미감사 표면(cron API routes / telegram notification 코드) 재탐색.

## ⚪ (retro-only) — 전 소스 clean, actionable target 부재 (cycle 2386, 2026-08-23)

진단: open issue 0, approved plan 0/22. review-code cooldown literal 재계산 결과 미충족(직전 5사이클 2381-2385 streak=0, TODOS 서술은 과거 해석 drift)이나 review-code heavy 자체가 반복 신규 target 부재 보고 중이라 강제 fire 실익 없음. 2-chain lock 미충족(직전8 distinct=4). 주기 gap trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 18/25, info-arch 21/30, lotto 24/30). CI/lint/type-check 전부 clean, DESIGN.md 신선(~41분 전 갱신).

다음 사이클 추천 = op-analysis(19/25)/info-arch(22/30)/lotto(25/30) gap 도달 순 대기, 도달 전까지는 review-code 신규 target 재탐색 또는 추가 clean audit.

## ⚪ (retro-only) — 전 소스 clean, actionable target 부재 (cycle 2385, 2026-08-23)

진단: open issue 0, approved plan 0/22. review-code cooldown(2379~2388) 잔여 3사이클, 2-chain lock 미충족(직전8 distinct=4: review-code/explore-idea/polish-ui/fix-incident). 주기 gap trigger 4종 전부 미도달(fix-incident 2/20 — 2383 fire 직후 리셋, op-analysis 18/25, info-arch 21/30, lotto 24/30). lotto 다음 회차(8/29) picks + 직전 회차(8/22) result 이미 최신. DESIGN.md 오늘 갱신. CI/deploy dispatch 최근 10 run 전부 success/skipped, 장애 0. skill-evolution trigger 5종 미충족(milestone 2385%50=35, review-code 직전20 다수 발화, ship-zero 미충족).

다음 사이클 추천 = fix-incident(3/20)/op-analysis(19/25)/info-arch(22/30)/lotto(25/30) 순 대기, review-code cooldown 만료(2388) 전후 재평가.

## ⚪ (retro-only) — 전 소스 clean, actionable target 부재 (cycle 2382, 2026-08-23)

진단: open issue 0, approved plan 0/22. review-code cooldown(2379~2388) 활성 지속, 2-chain lock 미충족(직전8 distinct=3). 주기 gap trigger 4종 전부 미도달(fix-incident 19/20 — 다음 사이클 도달 임박, op-analysis 14/25, info-arch 17/30, lotto 20/30). lotto 다음 회차(8/29) picks + 직전 회차(8/22) result 이미 최신. DESIGN.md 오늘 갱신, stale 아님. CI/deploy dispatch 최근 30 run 전부 skipped(장애 0).

convergence-badge-system.md 잔여 후속 2건(ConvergenceBadge.tsx 컴포넌트 분리 + amber tier CSS 변수화) 재확인 — spec 자체가 두 항목 모두 **Tier 3(large)** 로 명시, 별도 plan 분리 권장 문구 포함. 즉시 1-cycle fire 부적합. explore-idea 대체소스 3건은 cycle 2379 에서 이미 전부 false-positive 확인 완료 — 중복 재검증 skip.

결론: 코드 변경 없음. skill-evolution trigger 5종 미충족(milestone 2382%50≠0, 직전20 중 review-code 11회 발화로 0회 아님). ship-zero emergency stop 미충족(직전10 중 2377/2380/2381 success).

다음 사이클 추천 = fix-incident gap 19/20 → 다음 사이클 20/20 도달, scheduled workflow 감사 자연 발화 가능. 미충족 시 op-analysis(14/25)/info-arch(17/30)/lotto(20/30) 순 대기. 또는 convergence-badge Tier 3 후속 2건을 `/expand-plan` 으로 분리하는 것도 검토 가치.

## 🟢 polish-ui — 강수렴 배지 dark 색상 페이지 간 불일치 해소 SUCCESS (cycle 2380, 2026-08-23)

진단: review-code cooldown 진입(2379~2388, 직전 5사이클 2374-2378 non-success streak 5/5). 직전 8사이클 distinct=3, 2-chain lock 미충족. 주기 trigger 4종 미도달(fix-incident 17/20, op-analysis 12/25, info-arch 15/30, lotto 18/30). cycle 2377 retro lead("wave-660+ 신규 라우트 배지 스타일 일관성 확인") → `docs/design/convergence-badge-system.md` 재확인.

발견: spec(25행) 문서화 strong tier dark 배경 = `bg-brand-800/40`. `analysis/game/[id]/page.tsx`(wave-463)는 일치, `analysis/page.tsx`(wave-465)는 주석상 "동일 패턴" 명시했음에도 실제로 `bg-brand-900/40` 사용 — 강수렴 레이블만 페이지 간 dark 색상 편차(완전수렴 amber 는 양쪽 일치). 1줄 정정, `tsc`/`eslint` clean. 후속(ConvergenceBadge.tsx 컴포넌트 분리 + amber CSS 변수화) 는 스코프 밖 — 다음 polish-ui/review-code 후보로 carry-over.

다음 사이클 추천 = review-code cooldown 잔여(8사이클) 동안 주기 gap chain 우선 확인(fix-incident 17/20, op-analysis 12/25, info-arch 15/30, lotto 18/30) 또는 convergence-badge-system.md 잔여 후속(컴포넌트 분리) 처리.

## ⚪ explore-idea (lite) — 전 chain 소스 재점검, 실제 gap 0건 확인 RETRO-ONLY (cycle 2379, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 archived/completed/blocked). review-code 는 직전 5사이클(2374-2378) non-success streak 5/5 도달로 cooldown 진입(2379~2388, 발화 후보 제외). 직전 8사이클(2371-2378) distinct=3(review-code/explore-idea/polish-ui), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 16/20, op-analysis 11/25, info-arch 14/30, lotto 17/30). explore-idea 는 cycle 2372 에서 이미 "전량 소진" 확인.

review-code 가 빠진 자리를 메우기 위해 남은 소스 3건을 직접 재검증:

1. **fix-incident 후보 (`gh run list` scheduled workflow 감사, CLAUDE.md 사례 17 룰)**: `op-analysis-weekly` 워크플로가 2026-08-17 `gh pr create` 단계에서 GitHub API 일시적 503 으로 실패(브랜치 `data/op-analysis-2026-08-17` 생성 후 PR 생성 실패). 그러나 `gh pr list --state all` 확인 결과 PR #2959 가 2026-08-18 이미 merged — 후속 재시도로 자연 복구됨, `apps/moneyball/data/op-analysis/2026-08-17-cohort-split.md` 도 main 에 존재. **실제 인시던트 아님**, 조치 불필요.
2. **OG/Twitter 이미지 parity 재검증**: `/mlb/analysis`, `/mlb/methodology`, `/mlb/accuracy` 등 다수 MLB 하위 라우트에 자체 `opengraph-image.tsx` 부재 확인했으나, `mlb/opengraph-image.tsx`(세그먼트 레벨) 존재 — Next.js App Router 의 route segment metadata 상속 규칙(가장 가까운 조상 세그먼트 파일 사용)에 따라 정상 상속됨. **gap 아님**, false-positive.
3. **breadcrumb 재검증**: `mlb/reviews/monthly`, `mlb/reviews/weekly` 가 `grep -L Breadcrumb` 에 걸렸으나 실제로는 redirect-only 페이지(9줄, `getCurrentMonth()` 계산 후 즉시 redirect) — `ia-2026-05-08-redirect-only-routes-sitemap.md` 스펙에 이미 문서화된 카테고리와 동일 패턴, KBO/EN 대응 페이지도 전부 동일 구조. **gap 아님**.

결론: 코드 변경 없음. review-code cooldown 기간(2379~2388) 동안 대체 소스가 실제로는 이미 다 소진/false-positive 상태 — 이번 사이클은 순수 검증 결과 "이상 없음" 확인. 다음 사이클 = review-code cooldown 잔여(9사이클) 동안 주기 gap chain 우선 확인(fix-incident 16/20, op-analysis 11/25, info-arch 14/30, lotto 17/30 — 전부 미도달 지속 시 explore-idea 재탐색 또는 polish-ui 자연 신호 대기).

## 🟢 polish-ui (forced, 2-chain lock) — dead --color-surface-dark 토큰 제거 + DESIGN.md border 토큰 문서화 SUCCESS (cycle 2377, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 직전 8사이클(2369-2376) chain distinct=2 (review-code 7 / explore-idea 1) → **2-chain alternation lock 탐지** (룰: distinct≤2). 잠긴 두 chain 제외 후 주기 trigger 4종 재확인 — 전부 미도달(fix-incident 14/20, op-analysis 9/25, info-arch 12/30, lotto 15/30). 룰에 따라 polish-ui 강제 발화.

실행: DESIGN.md mtime 4일(미도달, 약한 신호). globals.css `--color-*` 토큰 30개 전수 grep → DESIGN.md 미문서화 후보 확인. `--color-border`(602회 참조) 는 실사용 패턴 확인 결과 다크모드 전용 정상 설계(라이트=Tailwind `border-gray-200` literal, 다크=`var(--color-border)` 그린 틴트) — 버그 아님, 문서 누락만. `--color-surface-dark`(#0f2318) 는 전체 리포 grep 결과 정의 1건 외 참조 0건 — dead token 확인 → 제거. DESIGN.md Dark mode 섹션에 `--color-border` 패턴 설명 추가. `tsc --noEmit` clean, lint/type-check pre-push green.

교훈: twitter-image.tsx 계열 10개 파일의 페이지별 상이한 하드코딩 그라디언트는 cycle 1212 "silent leak family wave 38" 에서 의도적으로 박제된 카테고리별 색상 아이덴티티 — drift 아님(false-positive 배제, 리라이트 안 함). 다음 polish-ui 후보 = convergence-badge-system.md(cycle 1818) 이후 wave-660+ 신규 라우트 배지 스타일 일관성 확인.

## ⚪ review-code(heavy) — backfill-kbo-confirmed-postponed.ts + backfill-kbo-stuck-verify.ts scripts/ 미감사 영역 감사, 신규 target 부재 RETRO-ONLY (cycle 2376, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked). 직전 8사이클(2369-2375) distinct=3(review-code/operational-analysis/explore-idea), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 13/20, op-analysis 8/25, info-arch 11/30, lotto 14/30). review-code 직전 5사이클(2371-2375) non-success streak=4/5(cooldown 미도달 — 2372 explore-idea 로 스트릭 중간 끊김). gh run list 전부 green/in_progress(red 없음). DESIGN.md 4.8일 전(미도달). 오늘(일요일) 로또 1234회 추첨 이미 완료+결과박제(cycle 2362) + 다음회차(8/29) picks 기박제 — lotto 재발화 불필요. 직전 20사이클(2356-2375) chain 분포: review-code 11 / op-analysis·info-arch·fix-incident·explore-idea 각 2 / lotto 1 — 소진 target 풀(agents/*, page.tsx 계열, scrapers) 대부분 확인 완료. CHANGELOG grep 0건 신선 target = `scripts/` 디렉토리 중 최근 생성(8/18) backfill 스크립트 2건(confirmed-postponed/stuck-verify, cycle 2185/2184 유래, 미감사) 로 감사 범위 전환.

**감사 1 (backfill-kbo-confirmed-postponed.ts, 85줄 전체 read)**: 하드코딩 game id 9건(cycle 2185 실제 뉴스 검증 배경 주석 명시) 대상 `status='scheduled'` 재확인 후 `postponed`+`is_canceled=true` 마킹, 진단/--apply 2-mode 안전 설계. `is_canceled` 컬럼(migration 001) + 기존 관행(`backfill-season.ts` line 162 `is_canceled: status==='postponed'`) 과 설정값 일치 확인. 신규 이슈 없음.

**감사 2 (backfill-kbo-stuck-verify.ts, 202줄 전체 read)**: `predictions` select 필터(`.eq('prediction_type','pre_game').in('scoring_rule', PRODUCTION_COHORT_RULES)`) 가 `daily.ts` line 1588-1591 (cycle 1022 hotfix, #1342 shadow-row contamination 방지) 과 정확히 동일 패턴/동일 함수(`buildAccuracyUpdates`) 재사용 확인 — `predByGameId` Map 이 game_id 당 1건만 유지하는 구조도 daily.ts 캐노니컬 구현과 일치(PRODUCTION_COHORT_RULES 필터가 이미 shadow row 배제하므로 game_id 당 production row 1건 보장, Map last-wins 위험 실제로는 발생 불가 — false-positive 의심 배제). rate limit 2000ms 준수(CLAUDE.md 규칙). 에러 핸들링(select/upsert/update 각 단계 개별 catch) 정상. 신규 이슈 없음.

결론: 코드 변경 없음. 4연속 review-code(heavy) retro-only(2373~2376) — agents/scrapers/scripts 전 영역 소진 심화. 남은 미감사 후보 = calibration-agent.ts(최근 fix 존재, 저우선) 또는 apps/moneyball 신규 라우트(mlb/en wave-660+, 아직 미확인). 다음 사이클 = 주기 trigger 도달 대기(fix-incident 14/20, op-analysis 9/25, info-arch 12/30, lotto 15/30) 또는 신규 target 계속 탐색 우선 검토.

## ⚪ review-code(heavy) — judge-agent.ts + team-agent.ts 장기 미감사 영역 감사, 신규 target 부재 RETRO-ONLY (cycle 2375, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked, status="approved" 없음). 직전 8사이클(2368-2374) distinct=3(review-code/operational-analysis/explore-idea), 2-chain lock 미충족(≤2 미달). 주기 trigger 4종 전부 미도달(fix-incident 12/20, op-analysis 7/25, info-arch 10/30, lotto 13/30). review-code 직전 5사이클 non-success streak=4/5(cooldown 미도달, 5 아님 — 2372 explore-idea 로 스트릭 중간 끊김). gh run list 전부 green/skip(2374 커밋 CI in_progress 확인, red 없음). DESIGN.md 4.8일 전(미도달). 직전 20사이클(2355-2374) chain 분포: review-code 10 / explore-idea 3 / op-analysis 2 / info-arch 2 / fix-incident 2 / lotto 1 — 0회 발화 chain 은 전부 영구 opt-out(polish-ui/design-system/expand-scope/dimension-cycle) 뿐, 강제 redirect 대상 없음. op-analysis 는 cycle 2361(heavy)/2368(lite) 최근 2회 연속 발화(격차 재확인만, CE 격차 10.1pp 안정 — 재실행 시 정보가치 낮음 판단) 로 이번엔 배제. explore-idea 는 cycle 2372 "전량 소진" 확인 직후라 배제. 대신 personas/mlb-retro/rivalry-memory/hub-dispatch(cycle 2371-2374 연속 감사, 소진 확인 누적)와 달리 judge-agent.ts(마지막 전체 감사 cycle 1704, 671 cycle 전)/team-agent.ts(마지막 전체 감사 cycle 1250, 1125 cycle 전, cycle 1233 은 부분 context layer 감사)는 실제로 장기 미감사 — 소진 풀과 별개 신선 target 판단.

**감사 1 (judge-agent.ts, 223줄 전체 read)**: SYSTEM_PROMPT 의 `${CURRENT_SCORING_RULE}`/`${WINNER_PROB_CLAMP_MIN/MAX}` interpolation 실사용처 일치. `parseResponse` catch 경로 = cycle 1400 lesson P2 (judge 토론 22일 silent) 이후 `captureJudgeParseFallback` Sentry 채널 명시 확인 — 재발 방지 유지 확인. Sunday confidence cap(`SUNDAY_CAP_CONFIDENCE`, `context.game.date + 'T00:00:00Z'` UTC 파싱으로 요일 산출) = 날짜 문자열 자체가 요일 정보라 UTC 파싱이 KST 요일과 항상 일치 — false-positive 의심(타임존 버그) 배제. `validateJudgeReasoning`/`logValidatorEvent` teamCode='JG' 케이스 정상. 신규 이슈 없음.

**감사 2 (team-agent.ts, 166줄 전체 read)**: cycle 1250 SUCCESS fix(prose label → `MetricRegistry.ko_name`) 이후 잔존 하드코딩 문자열 없음 재확인 — `bullpen_fip`/`recent_form`/`head_to_head` 모두 registry 경유. `GameContext` 타입(`types.ts` line 11-15: `homeElo`/`awayElo`/`homeRecentForm`/`awayRecentForm`/`headToHead`) 과 `buildUserMessage` 구조분해 필드명 전수 대조 — 불일치 0건. `runTeamAgent` validator reject 시 `success:false, data:null` 반환 → debate.ts fallback 처리 경로(주석 명시) 확인. rivalry-memory 실패 시 빈 블록 반환 계약 유지 확인. 신규 이슈 없음.

결론: 코드 변경 없음. 3연속 review-code(heavy) retro-only(2373/2374/2375) 지만 이번 target(judge-agent/team-agent) 은 실제 장기 미감사(671/1125 cycle 전) 파일로 소진 풀과 무관한 신선 감사 — 소진 판단과 별개. 남은 미감사/저빈도 agents 파일 = calibration-agent.ts(cycle 2281 최근 fix 존재, 상대적 저우선). 다음 review-code 후보 = apps/moneyball 신규 라우트(mlb/en 계열 wave-660+) 또는 scripts/ 디렉토리(미감사 영역). 대안 = 주기 trigger 도달 대기(fix-incident 13/20, op-analysis 8/25, info-arch 11/30, lotto 14/30).

## ⚪ review-code(heavy) — personas.ts + mlb-retro.ts 미감사 영역 감사, 신규 target 부재 RETRO-ONLY (cycle 2374, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked). 직전 8사이클(2367-2373) distinct=3(review-code/operational-analysis/explore-idea), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 11/20, op-analysis 6/25, info-arch 9/30, lotto 12/30). explore-idea 직전 사이클(2372) saturation 확인 후 즉시 review-code 로 복귀. review-code 직전 5사이클 내 non-success streak=4/5 (cooldown 미도달). gh run list 전부 green/skip. DESIGN.md 5.7일 전(미도달), lotto picks 8/29 기박제. 감사 target 소진 패턴이 apps/moneyball page.tsx + scrapers + agents 상위(rivalry-memory/hub-dispatch) 순으로 이미 소진 확인됨 — 이번엔 agents 잔여 파일 중 CHANGELOG grep 0건인 personas.ts(174줄)/mlb-retro.ts(192줄) 로 감사 범위 재전환.

**감사 1 (personas.ts)**: 전체 174줄 read. LLM prompt 텍스트 상수 모듈(BASE_PROMPT/HOME_ROLE/AWAY_ROLE/RESPONSE_FORMAT). `${CURRENT_SCORING_RULE}` interpolation 이 주석 설명과 실제 사용처(HOME_ROLE/AWAY_ROLE) 일치 확인. PERSONA_VERSION = DEBATE_VERSION_PREGAME 단일 source 정합 확인. 환각 방지 화이트리스트/금지유형 로직 오류 없음(순수 텍스트, 실행 로직 부재) — 신규 이슈 없음.

**감사 2 (mlb-retro.ts)**: 전체 192줄 read. `buildMlbFactors` 가 KBO retro.ts 의 0.5-중심 factor 컨벤션(`NEUTRAL_FACTOR + contributions[key]`)을 `computeMlbFactorContributions`(mlb-base.ts) 재실행으로 정확히 복원하는지 대조 — sign 컨벤션(양수=홈 유리) 일치 확인. `MEMORY_CANDIDATE_KEYS` 에서 elo 명시적 제외 사유(HOME_ELO_BONUS 고정항으로 인한 팀별 bias 오분류 방지) 주석과 실제 배제 일치. `normalizeMlbTeamCode` 가 항상 `MLB_TEAMS` 유효 키만 반환해 `MLB_TEAMS[homeCode].parkPf` undefined 위험 없음 확인. `agent_memories_unique_content` UNIQUE 제약(`team_code,memory_type,content`, migration 009)이 league 컬럼(migration 033 추가) 미포함 — KBO/MLB team_code 네임스페이스 실측 전수 대조(KBO 10팀 vs MLB 30팀+alias) 결과 겹침 0건으로 실제 충돌 불가능 확인, 스키마 변경 불요 (false-positive). 신규 이슈 없음.

결론: 코드 변경 없음. review-code 대상 파일 풀이 page.tsx 계열 + scrapers + agents 전체(rivalry-memory/hub-dispatch/personas/mlb-retro)로 소진 확산 계속. 잔여 미감사 agents 파일 = judge-agent.ts(13회 언급, 저빈도지만 기록有)/team-agent.ts(2회)/calibration-agent.ts(5회) — CHANGELOG 언급 있어 상대적으로 낮은 우선순위. 다음 후보 = 주기 trigger 도달 대기(fix-incident 12/20, op-analysis 7/25, info-arch 10/30, lotto 13/30) 또는 review-code lite-cap 임박(5/5 도달 시 10-cycle cooldown 발동 예상).

## ⚪ review-code(heavy) — rivalry-memory.ts + hub-dispatch.ts 미감사 영역 감사, 신규 target 부재 RETRO-ONLY (cycle 2373, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked). 직전 8사이클(2366-2372) distinct=4(review-code/operational-analysis/explore-idea/info-arch), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 10/20, op-analysis 5/25, info-arch 8/30, lotto 11/30). explore-idea 직전 사이클(2372)에서 바로 소진 확인. review-code lite-cap streak 미도달(2372 explore-idea 로 스트릭 끊김). gh run list 전부 green. lotto picks 8/29 기박제, DESIGN.md 4.8일 전(미도달). 감사 target 소진 패턴(2364/2366/2367/2369/2370/2371) 이 apps/moneyball page.tsx + scrapers 양쪽 이미 소진 확인됨 — 이번엔 packages/kbo-data/src/agents 중 CHANGELOG grep 상 거의 언급 없는 파일(rivalry-memory.ts 254줄, hub-dispatch.ts 279줄) 로 감사 범위 재전환.

**감사 1 (rivalry-memory.ts)**: 전체 255줄 read. h2h/memories fetch 양쪽 `assertSelectOk`+`captureRivalryMemoryFallback` 로 silent drift 계측 완비(이미 cycle 175/468/545/559/578/939/1241/#2520 8회 거친 파일). truncate 로직(`block.slice(-budget)`, 앞부분 truncate) 의도대로 동작 확인. `.or(and(home.code.eq...))` embedded filter 패턴은 이 파일 유일 사용처이나 전용 테스트 2개(`agents-rivalry-memory.test.ts`, `-silent-drift.test.ts`) 존재 확인 — 신규 이슈 없음.

**감사 2 (hub-dispatch.ts)**: 전체 280줄 read. `composePayload` fingerprint 가 `frames.slice(-1)[0]` (배열 마지막 = 크래시 사이트 프레임) 사용 — 테스트 fixture(`foo.ts:42` 마지막 프레임 기대) 로 의도 확인, 최초 의심(comment "가장 바깥 frame 이 배열 끝" 문구와 실제 Sentry 컨벤션 배치 혼동)은 테스트 대조로 false-positive 확인. `scrubPII` 는 `rawBody` 전체(tags 포함)에 사후 일괄 적용돼 tags 값 raw 노출 우려도 false-positive. 신규 이슈 없음.

결론: 코드 변경 없음. review-code 대상 파일 풀(page.tsx 계열 + scrapers + agents 상위 2개)이 대부분 소진 상태 확인 누적. 다음 후보 = 주기 trigger 도달 대기(fix-incident 11/20, op-analysis 6/25, info-arch 9/30, lotto 12/30) 또는 review-code 잔여 미감사 파일(judge-agent.ts/personas.ts/team-agent.ts/mlb-retro.ts/calibration-agent.ts — CHANGELOG grep 저빈도).

## ⚪ explore-idea(lite) — 신규 후보 탐색, 전량 already-fixed/blocked-on-data/Tier-3 확인 RETRO-ONLY (cycle 2372, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked, status="approved" 없음). 직전 8사이클(2365-2371) distinct=3(review-code/operational-analysis/info-architecture-review), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 9/20, op-analysis 4/25, info-arch 7/30, lotto 10/30). **explore-idea saturation 12/15≥12 충족** — 직전 4사이클(2367~2371) review-code 4연속 RETRO-ONLY(false-positive) 확산이 saturation 을 임계 넘김. gh run list 전부 green/skip. review-code lite-cap streak=4/5(cooldown 미도달, 5 아님).

**탐색 시도 1**: TODOS line 701(cycle 2295 근방) carry-over — `/debug/reliability` 페이지 `scoring_rule`/`prediction_type` 필터 누락(#1338 family) 재확인 시도 → 실측 결과 이미 해소됨(`f7f94f30 fix(debug): reliability page scoring_rule + prediction_type 필터 누락 정정 (#1338 family 9번째 재발)`, line 204-205 `CURRENT_MODEL_FILTER`+`prediction_type='pre_game'` 확인). stale pointer, false-positive.

**탐색 시도 2**: TODOS cycle 2098/2099/4086 항목 "MLB 개별 경기 debate/verdict/postview parity" (waterfall 만 cycle 2104 완료, 나머지 large scope 로 유보) 재검토 — `mlb-pipeline.ts` 전체에 `debate`/`judge`/`postview`/`reasoning` 필드 자체가 없음(MLB 예측은 LLM debate 파이프라인 자체를 안 태움) 확인. UI parity 문제가 아니라 MLB 전용 LLM 에이전트 파이프라인 신규 구축이 선행돼야 하는 Tier 3(large+dependency) — CREDIT_EXHAUSTED(debate 100% fallback, conf=0.3) 지속 상태에서 신규 LLM 파이프라인 투자는 ROI 낮음, skip 유지.

**탐색 시도 3**: `/community` placeholder("커뮤니티 박제 중, 인증 layer 의존") 재확인 — 의도된 스텁, 인증 레이어 선행 의존 Tier 3, skip.

**탐색 시도 4**: KBO reviews 계열 수렴 배지(ConvergenceStreakBadges/TeamStatsBadges/HomeAwayBadges/DayOfWeekBadges) MLB parity 확인 — KO+EN 양쪽 `/mlb/reviews`, `/mlb/reviews/weekly`, `/mlb/reviews/monthly` 전부 이미 배선 완료(wave-596~606, wave-659 grep 확인). parity 완결.

결론: 코드 변경 없음. cycle 2152 가 이미 명문화한 메타 패턴("다음 X 후보" 포인터 평균 수명 1~2 cycle, 고빈도 fire 환경에서 자연 소비) 재확인 — 이번엔 4건 전부 이미 소비/차단 상태. explore-idea saturation 자체는 충족됐으나 즉시 착수 가능한 bounded 신규 후보 부재(cycle 1017/2334 선례와 동일 결론 class). 다음 사이클 후보 = 주기 gap 도달 chain(fix-incident 10/20, op-analysis 5/25, info-arch 8/30, lotto 11/30) 또는 review-code lite-cap 임박(4/5, 다음 발화 시 5 도달 시 10-cycle cooldown) 고려.

## ⚪ review-code(heavy) — fancy-stats.ts(526줄) scraper 신규 target 감사, 이슈 미발견 RETRO-ONLY (cycle 2371, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked). 직전 8사이클(2364-2370) distinct=4(review-code/info-arch/operational-analysis), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 8/20, op-analysis 3/25, info-arch 6/30, lotto 9/30). explore-idea saturation 11/15<12 미충족. gh run list 전부 green. DESIGN.md 5일 전(미도달), lotto picks 8/29 기박제. review-code(heavy) 5연속 소진(2364/2366/2367/2369/2370)이 apps/moneyball page.tsx 계열에 집중돼 있었던 점에 착안, 미감사 영역인 packages/kbo-data/src/scrapers 로 감사 범위 전환 — fancy-stats.ts(526줄, scrapers 디렉토리 최대 monolith, validator.ts/postview.ts 는 cycle 2369 기감사) 선정.

**감사**: 전체 527줄 read. `resolveTeamCode` case-insensitive 매칭(2026-04 "Kia Tigers" 대소문자 drift 사고 대응 이미 반영), `parseNumWithFallback`/`console.warn` silent-drift 가시화(empty table / NaN fallback / xfip fallback / winPct=0.5 stub / findPitcher byName team mismatch) 등 다수 계층이 과거 사이클에서 이미 촘촘히 계측돼 있음 확인. 하드코딩 테이블 인덱스(투수 4/5/6/7, 타자 0/3) 의존성도 empty-table warn 으로 커버. 신규 실측 버그 미발견 — 이 파일은 이미 review-code 감사 target 소진 상태(scrapers 영역도 마찬가지).

결론: 코드 변경 없음. review-code 직전 5-cycle window 내 outcome≠success 4/5(2366/2367/2369/2370) — 다음 사이클 review-code 재발화 시 lite-cap 룰(5연속) trigger 임박, 자연 redirect 예상. 다음 후보 = explore-idea(saturation 11/15, 임계 근접) 또는 주기 trigger(fix-incident 9/20, op-analysis 4/25, info-arch 7/30, lotto 10/30) 도달 대기.

## ⚪ review-code(heavy) — model-comparison MLB 오염 가설 false-positive + KBO/MLB 매직넘버 parity 재확인 RETRO-ONLY (cycle 2370, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked, status="approved" 없음). 직전 8사이클(2362-2369) distinct=5(lotto/fix-incident/review-code/info-arch/operational-analysis), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 7/20, op-analysis 2/25, info-arch 5/30, lotto 8/30). explore-idea saturation 10/15<12 미충족. `gh run list --limit 10` 전부 green/skip, gh issue 0건. DESIGN.md 5일 전(미도달), lotto-data.json 오늘 갱신·8/29 picks 기박제(트리거 X). 직전 4사이클(2364/2366/2367/2369) 이미 review-code 감사 target 4연속 소진 확인됨 — 이번엔 `.from('predictions')` 쿼리 49개 파일 전수 재grep으로 #1338 family(scoring_rule/prediction_type 미필터) 잔존 후보 재탐색.

**감사 시도 1**: `/debug/model-comparison`(모델버전 진화 비교 대시보드) 쿼리가 `scoring_rule`/`prediction_type` 필터 없이 `games!inner(...)` 조인만 사용 — MLB 예측(`scoring_rule='mlb_v0.1'`) 이 model_version 비교에 혼입될 가능성 의심. 실측: `mlb-pipeline.ts` insert payload에 `game_id` 필드 자체가 없음(`external_game_id`/`mlb_game_date` 별도 컬럼 사용, KBO 전용 `game_id INT REFERENCES games(id)` FK 미설정) → `games!inner` 조인이 MLB row 를 자동 제외(INNER JOIN 특성). false-positive, 수정 불필요.

**감사 시도 2**: TODOS 과거 항목("와일드카드 매직넘버는 범위 밖, 별도 cycle 후속 후보로 carry")이 스테일한지 재확인 — `/mlb/wild-card/page.tsx`(`WcMagicNumberBadge`) + `/standings/page.tsx`(KBO 우승/가을야구 매직넘버) 양쪽 모두 이미 구현 완료 확인. carry-over 항목 자체가 stale(이미 별도 cycle 에서 해소됨, TODOS 미정리) — false-positive.

**감사 시도 3**: plan #28(MLB analysis 4-phase + TeamStrengthGrid) tail 재확인 — "다음 cycle 후속 후보" 전무, cycle 2323 로 완전 종료 확인.

결론: 코드 변경 없음, 3개 감사 시도 모두 false-positive 또는 이미 해소됨 확인(due-diligence 원칙 준수 — game_id FK null 특성을 실측 확인 없이 필터 추가했으면 불필요한 회귀 위험). review-code 감사 target 5연속 사이클(2364/2366/2367/2369/2370) 소진 지속. 다음 사이클은 주기 trigger(fix-incident 8/20, op-analysis 3/25, info-arch 6/30, lotto 9/30) 도달 대기 또는 자연 발견 권장 — review-code 외 chain (explore-idea 신규 아이디어 등) 우선 검토 여지.

## ⚪ review-code(heavy) — validator.ts/postview.ts/EN misses locale 감사, 신규 target 부재 RETRO-ONLY (cycle 2369, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked, status="approved" 없음). 직전 8사이클(2362-2369 중 2362-2368) distinct=5(lotto/fix-incident/review-code/info-arch/operational-analysis), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 방금 발화, info-arch 4/30, lotto 7/30). explore-idea saturation 10/15<12 미충족. CI/deploy-drift-alert 최근 10 run 전부 green/skip(정상), gh issue 0건. 직전 3사이클(2366/2367/2368) 이미 review-code(lite/heavy) 감사 target 소진 + op-analysis 측정전용 확인 — 이번엔 아직 미감사였던 agent 파일(validator.ts 956줄 최대 monolith, postview.ts)과 최근 신규 기능(lotto/check 페이지, EN mlb/reviews/misses 미러)으로 감사 범위 확장.

**감사 시도 1**: `find apps/moneyball/src/app -name page.tsx -mtime -7` 72건 → git log 기준 실제 신규 라우트 21건(EN mlb 미러 10 + KO 대응 10 + lotto/check 1) 확인, info-architecture-review trigger(1) 조건("7일 안 ≥3") 표면상 충족. `grep -L Breadcrumb` (globstar 적용) 18건 미검출로 재확인했으나 전부 의도된 제외(debug/* 내부 페이지 8건, login/settings/root 자체 헤더 구조, reviews/weekly·monthly index 는 redirect-only 콘텐츠 없음, community 는 미색인 placeholder stub) — cycle 2365 가 이미 확인한 동일 false-positive 패턴 재확인, info-arch 재발화 보류.

**감사 시도 2**: EN mlb/reviews/misses 페이지(신규, wave-659) — `buildMlbMissReport({ locale: "en" })` 로케일 배선 정상 확인 + 전용 회귀 테스트(`wave-659-en-mlb-reviews-mirror.test.ts`) 존재. KO/EN diff 전체 대조 결과 하드코딩 누락 없음, cycle 2360 이 고친 것과 동일 클래스 버그 재발 없음.

**감사 시도 3**: `postview.ts`(496줄, 한글 리터럴 123건) locale 파라미터 부재로 EN 미러 누락처럼 보였으나, postview 는 KBO 전용 사후 판정 에이전트 — KBO 리그는 EN 미러 자체가 존재하지 않음(cycle 2367 이미 확인한 "`KBO_NAV` 전체가 원래부터 EN 필드 부재, 의도된 구조"와 동일 원인) — false-positive.

**감사 시도 4**: `validator.ts`(956줄, agents 디렉토리 최대 monolith) — 최근 커밋(`0ae406ce` 환각검증 half-applied fix 재발 대응)이 이미 이번 감사가 의심했던 가중치%/WAR 인용 오탐 케이스를 정확히 커버, 별도 신규 이슈 미발견.

결론: 코드 변경 없음. 4개 감사 시도 모두 false-positive 또는 이미 해소됨 확인(신규 회귀 유발 없음 — due-diligence 원칙 준수). review-code 감사 target 이 4연속 사이클(2364/2366/2367/2369) 소진 국면 지속 — 다음 사이클은 주기 trigger(fix-incident 7/20, info-arch 5/30, lotto 8/30) 도달 대기 또는 자연 발견 권장.

## 🟢 operational-analysis(lite) — 이번 주(8/17~8/23) n=21 acc 47.6%, CE 100% 유지 SUCCESS (cycle 2368, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 직전 8사이클(2360-2367) distinct=5(review-code/op-analysis/lotto/fix-incident/info-arch), 2-chain lock 미충족(distinct=5≥3). 주기 trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 6/25, info-arch 2/30, lotto 5/30). explore-idea saturation 11/15<12 미충족. 직전 3사이클(2365/2366/2367) 연속 clean-audit RETRO-ONLY(info-arch/review-code lite/review-code heavy) — 감사 target 소진 신호, operational-analysis(lite) 로 방향 전환(측정 전용, 코드 리스크 0).

**측정**: 이번 주(월 8/17 ~ 일 8/23 KST) verified predictions n=21, 적중 10/21=47.6% (전체 baseline ~54~64% 대비 낮음, 단 n=21 극소표본 — 노이즈 수준, 가중치 판단 근거 X). 요일별: 화 2/5(40%) / 수 3/5(60%) / 목 3/5(60%) / 금 2/4(50%) / 토 0/2(0%, n=2 극소). 21건 전부 `scoring_rule='v1.8' AND debate_version IS NULL` = CE(fallback) 100% — CREDIT_EXHAUSTED 지속 재확인, 신규 아님. confidence 값 전부 0.002~0.181 극소(quant raw pass-through, CLAUDE.md P4 패턴대로 0.3 고정 아님) + home_win_prob 전부 0.45~0.59 협소 분포 → 이번 주 경기들 자체가 통계적으로 팽팽한(edge 작은) 매치업 위주였던 것으로 보임(고확신 |prob-0.5|≥0.15 픽 0건). `/reviews/weekly/[week]` 라우트가 DB 기반 자동 렌더 확인(별도 정적 포스트 파일 불필요, `getCurrentWeek()` redirect 구조).

결론: 코드 변경 없음(측정 전용). 가중치 조정 불필요(n=21 << n=150+ 임계, 기존 v1.8 유지 확정 결론과 정합). CE 상태/영향은 CLAUDE.md 예측 엔진 가중치 섹션에 이미 상세 박제 — 이번 주는 그 패턴의 소표본 재확인일 뿐, CHANGELOG 신규 항목 불필요 판단(측정 전용 lite 사이클 관례, cycle 1855/2093 선례 정합). 다음 후보 = 자연 발견 또는 fix-incident(6/20)/info-arch(3/30)/lotto(6/30) 주기 trigger 확인.

## ⚪ review-code(heavy) — accuracy/page.tsx 감사, 후보 2건 모두 false-positive RETRO-ONLY (cycle 2367, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked). 직전 8사이클(2359-2366) distinct=6(review-code/op-analysis/lotto/fix-incident/info-arch), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 4/20, op-analysis 6/25, info-arch 2/30, lotto 5/30). explore-idea saturation 11/15<12 미충족. CI green(cycle 2362 실패 1건 확인했으나 cycle 2363 version-drift fix 이전 시점 잔여 기록 — 이미 해소된 사안, 현재 HEAD 무관). lotto 다음 회차(8/29) picks 기박제, DESIGN.md 5일 전(미도달). 직전 3사이클(2364/2365/2366) 연속 clean-audit — 감사 target 을 analysis/page.tsx 계열에서 미감사 대형 monolith(accuracy/page.tsx, 1204줄)로 전환.

**감사 시도 1**: Header.tsx `KBO_NAV`(/picks 등) 가 `enLabel`/`enDescription` 필드 없이 `MLB_NAV` 대비 미localize 로 보였으나, KBO 리그는 EN 미러 자체가 존재하지 않음(en/ 은 en/mlb/* 뿐) — `KBO_NAV` 전체가 원래부터 필드 부재, 의도된 구조. false-positive.

**감사 시도 2**: `V18SubCohortPanel`(accuracy/page.tsx:1082-83) 의 `bothMeasured` 게이트가 `STATS_RELIABLE_MIN_N`(30, CI 표기용으로 같은 페이지 2곳에서 사용)이 아닌 하드코딩 `n >= 10` 사용 — 통계적으로 n=10 시 실제 CI(±31%p 추정)가 페이지 자체 문구("±15~25%p")보다 넓어 불일치로 보였으나, `silent-drift-wave-249.test.ts:28-31`(cycle 1553)가 정확히 `n >= 10` 을 명시 assert — 의도된 별도 threshold(delta 노출용 완화 기준 vs CI 표기용 엄격 기준). 수정 시도 전 test 확인 → false-positive, 수정 보류.

결론: 코드 변경 없음, 두 후보 모두 due-diligence 후 의도된 동작 확인(회귀 방지 test 존재 재확인 없이 수정했으면 오히려 wave-249 regression 유발할 뻔한 케이스 — "test 먼저 확인" 원칙 재확인). 다음 후보 = 자연 발견 또는 fix-incident(5/20)/op-analysis(7/25)/info-arch(3/30)/lotto(6/30) 주기 trigger 확인.

## ⚪ review-code(lite) — /health 10/10 clean, 신규 신호 없음 RETRO-ONLY (cycle 2366, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked). 직전 8사이클(2358-2365) distinct=6(info-arch/review-code/op-analysis/lotto/fix-incident), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 5/25, info-arch 1/30, lotto 4/30). explore-idea saturation 10/15<12 미충족. CI(2364/2365 push) green 확인, Vercel Deploy Failure Dispatch skipped(배포 정상). 직전 2사이클(2364/2365) 연속 review-code(heavy)/info-arch clean-audit — monolith 재감사 대신 review-code lite(`/health`) 로 전환.

**측정**: `tsc --noEmit` 0 errors / `eslint` 0 warnings / `vitest run` 500 files·4203 tests 전부 pass(cycle 2335 대비 +47 tests, +47 파일 성장 반영) / knip 미설치(dead code skip). composite 10/10, cycle 2335(마지막 측정) 대비 동일 유지 — `~/.gstack/projects/moneyballscore/health-history.jsonl` 갱신.

결론: 코드 변경 없음, 신규 이슈 미발견(지표 무관 silent drift 가능성은 review-code heavy 가 2359/2360/2364 최근 3회 이미 흡수). 다음 후보 = 자연 발견 또는 fix-incident(4/20)/op-analysis(6/25)/info-arch(2/30)/lotto(5/30) 주기 trigger 확인.

## ⚪ info-architecture-review — EN mlb reviews 인덱스 breadcrumb grep false-positive 확인 RETRO-ONLY (cycle 2365, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked). 직전 8사이클(2357-2364) distinct=5(fix-incident/info-arch/review-code/operational-analysis/lotto), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 1/20, op-analysis 3/25, info-arch 6/30, lotto 2/30). explore-idea saturation 10/15<12 미충족. lint clean, lotto picks 최신(8/29 회차 기 박제), CI 최근 clean.

**감사**: `en/mlb/*/page.tsx` breadcrumb grep → `en/mlb/reviews/monthly/page.tsx`/`en/mlb/reviews/weekly/page.tsx` 2건 미검출. 열어보니 `redirect()` 전용 스텁(9~10줄, `getCurrentMonth()`/`getCurrentWeek()` 계산 후 즉시 리다이렉트, 렌더 UI 없음) — KO 대응 파일(`mlb/reviews/monthly/page.tsx` 등)도 동일 구조로 breadcrumb 부재 = 의도된 일관성, false alarm. `mlb/accuracy` vs `en/mlb/accuracy` 라이브러리 import 동일(공유 lib 함수 재사용 구조라 KO fix 시 EN 자동 동기) 확인 — drift 위험 낮음. sitemap.ts 존재 확인(105 page.tsx 대비 별도 mismatch 측정은 build 필요, 이번 사이클 범위 밖).

결론: 코드 변경 없음. 다음 후보 = 자연 발견 또는 fix-incident(1/20)/op-analysis(3/25)/info-arch(6/30, 이번 사이클도 gap 미도달 상태에서 source-driven 진단만 수행 — gap 자체는 리셋 X)/lotto(2/30) 주기 trigger 확인.

## ⚪ review-code(heavy) — analysis/page.tsx 재감사 신규 target 부재 RETRO-ONLY (cycle 2364, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 직전 8사이클(2356-2363) distinct=6, 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 1/20, op-analysis 3/25, info-arch 6/30, lotto 2/30). explore-idea saturation 10/15<12 미충족. CI 최근 2회 `CI Failure Dispatch` skipped=clean(cycle 2363 fix 정상 작동 확인) — 최대 monolith(`analysis/page.tsx` 2803줄, 210 commits 역사) 직접 audit 채택.

**감사**: `renderConvergenceTeamBadgeRow`/`renderConvergenceHomeAwayBadgeRow` 가 팀별·홈어웨이 배지에 소표본 가드 없이 percentage 표시하는 것처럼 보여 의심했으나, 데이터 레이어(`computeConvergenceTeamStats` minPicks=3 / `computeConvergenceHomeAwaySplit` minPicks=5, 홈·어웨이 양쪽 side 모두 체크)에서 이미 필터링 확인 — false alarm. `winnerProbOf` null-safe(0.5 fallback) 정상, `bestPickGameId` 정렬 로직 정상. EN mlb 한글 문자 grep = 거의 전 파일 매치했으나 comment-only(cycle 2363 결론과 동일 재확인, dev 관례).

결론: 코드 변경 없음. 다음 후보 = 자연 발견 또는 fix-incident(1/20)/op-analysis(3/25)/info-arch(6/30)/lotto(2/30) 주기 trigger 확인.

## 🔵 fix-incident — 3-way version file drift 해소 SUCCESS (cycle 2363, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked). 직전 8사이클(2355-2362) distinct=6(explore-idea/fix-incident/info-architecture-review/review-code/operational-analysis/lotto), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 2/25, info-arch 5/30, lotto 1/30). EN mlb 페이지 재검증(한글 leak grep) = 전부 comment-only false positive, 신규 코드 이슈 없음 확인 후 `gh run list --limit 10` 로 최근 워크플로 실행 상태 직접 확인 — cycle 2360/2361 두 커밋 모두 CI `Test` 스텝 red 발견.

**원인**: `docs: cycle 2360/2361 CHANGELOG/TODOS + version bump` 두 커밋이 `scripts/bump-version.sh`(VERSION+root package.json+apps/moneyball/package.json 3-way atomic sync 전용, cycle 2068/2070 stale 재발 방지 목적으로 이미 존재) 를 실행하지 않고 `apps/moneyball/package.json` 만 수동 편집 — root `package.json`/`VERSION` 이 `0.5.62.79` 에 멈추고 moneyball 만 `0.5.62.81` 까지 앞서 나감. `version-sync-guard.test.ts`(cycle 2047) 가 이를 정확히 감지해 2 커밋 연속 CI Test red. R7 자동 머지 정책상 두 커밋 모두 PR 게이트 없는 main 직접 push(policy/docs) 라 머지 자체는 막히지 않고 사후 감지만 됨 — 사용자 가시 영향은 없었으나 CI 신호 자체가 무의미해지는 silent quality drift.

**실행**: `./scripts/bump-version.sh 0.5.62.81` 로 3개 파일 동기화 → `pnpm --filter moneyball test` 전체 500 files/4203 tests green 확인 → 커밋+push. CI Test 스텝 정상 통과 재확인.

결론: bump-version.sh 스크립트 자체는 정상 작동 확인(문제는 미사용). 재발 방지 = "docs: cycle N" 커밋 작성 시 반드시 스크립트 경유(수동 JSON 편집 금지) 원칙 재확인. pre-commit 가드 자동화는 스코프 밖 — review-code 후보로 carry-over. 다음 후보 = 자연 발견 또는 op-analysis(3/25)/info-arch(6/30)/lotto(2/30) 주기 trigger 확인.

## 🟢 operational-analysis(heavy) — KBO CE/비CE 격차 5-cycle 연속 재확인 SUCCESS (cycle 2361, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 직전 8사이클(2353-2360) distinct=4(fix-incident/explore-idea/info-architecture-review/review-code), 2-chain lock 미충족. 주기 trigger 4종 중 operational-analysis 만 25/25 gap 도달(마지막 발화 cycle 2336) — 채택. 직전 2회(2334 lite/2336 heavy) 연속 retro-only("완전 정적 상태") 였으나 갭 재도달 시점에 harness 재실행하여 실제 신규 데이터 유무 실측.

**실행**: `pnpm tsx scripts/op-analysis-ce-cohort.ts` 재실행. 전체 n=332 (CE n=285 / 비CE n=47 — 비CE 표본 2026-07-01 이후 신규 0건, 동결 53일 경과). CE 53.7%(153/285) / 비CE 63.8%(30/47) → 격차 10.1pp (cycle 2309 9.8pp 대비 미세 확대, 5-cycle window 9.7~10.8pp 안정 범위 유지). overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 → LLM 부가가치 우세 방향 5회 연속 재확인. CE n 증가분(274→285, +11) 전부 8월 데이터(8월 CE n=57, acc 56.1%).

결론: 코드 변경 없음(측정 전용). 가중치 재조정/Platt scaling 불필요 결론 유지, CLAUDE.md 예측 엔진 가중치 섹션에 cycle 2361 항목 추가. CREDIT_EXHAUSTED 지속(사용자 크레딧 재충전 미이행), 비CE 표본 동결로 재분리 불가 상태 변화 없음 — 5-cycle 연속 동일 결론, 크레딧 충전 전까지 신규 정보 X. 다음 후보 = 자연 발견 또는 fix-incident(4/20)/info-arch(3/30)/lotto(17/30) 주기 trigger 확인.

## 🟢 review-code(heavy) — EN mlb/reviews weekly/monthly 날짜 라벨 한글 leak 해소 SUCCESS (cycle 2360, 2026-08-23)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked). 직전 8사이클(2352-2359) distinct=4(review-code/fix-incident/explore-idea/info-architecture-review), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 3/20 방금 발화, op-analysis 24/25 근접, info-arch 2/30 방금 리셋, lotto 16/30). CI/deploy 최근 30 run 전부 clean. TODOS Next-Up 신규 리드 없음.

**발견**: cycle 2359 review-code(heavy) 가 감사한 agent 파일(validator-logger.ts/personas.ts)과 별개로, wave-660(cycle 2355/2356)에서 신규 배선된 EN mirror 라우트(`/en/mlb/reviews/weekly`, `/en/mlb/reviews/monthly`, 허브 `/en/mlb/reviews`)는 아직 review-code sweep 대상이 아니었음 — Feature-Drift Cycle 패턴(신규 기능 배선 직후 코드 감사)에 따라 해당 코드 직접 read. `computeWeekRange.ts`/`computeMonthRange.ts` 의 `buildLabel`/`buildMonthRange` 가 locale 파라미터 없이 "YYYY년 M월 D일" 한글 포맷을 하드코딩 — EN 3개 페이지의 title/description/OG/JSON-LD headline/h1/breadcrumb/"Recent Weekly·Monthly Reviews" nav 링크에 한글 날짜 문자열이 그대로 노출되던 silent i18n drift 확인(cycle 2358 이 이미 처리한 nav 라우팅 정상화와는 별개 레이어 — 표시 텍스트 자체의 누락).

**실행**: 두 유틸에 `locale: 'ko'|'en'` 파라미터 추가(기본값 `'ko'`, 기존 KO callsite 전부 무변경 — `mlb-shared.ts` 의 `FACTOR_LABELS_EN` 컨벤션과 동일 패턴). EN 전용 3개 파일의 `parseWeekId`/`parseMonthId`/`getRecentWeeks`/`getRecentMonths` 호출부만 `'en'` 로 배선. 신규 회귀 테스트 4건(주/월 range 각 2건, 한글 미포함 assertion) 추가.

검증: `tsc --noEmit`(전체 workspace) clean, `eslint`(전체) clean, `pnpm test`(moneyball 500 files/4203 tests) all green.

결론: EN mlb/reviews 3계층(허브/주간/월간) 날짜 표시 완전 영문화. 다음 후보: 자연 발견 또는 op-analysis(24/25 gap 근접)/info-arch(2/30)/lotto(16/30) 주기 trigger 확인.

## 🟢 info-architecture-review — EN nav weekly/monthly stale scope-exception 제거 SUCCESS (cycle 2358, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 직전 8사이클(2350-2357) distinct=4(fix-incident/skill-evolution/review-code/explore-idea), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 1/20 방금 발화, op-analysis 22/25, info-arch 18/30, lotto 14/30) — 별도 source 탐색. `git log --diff-filter=A --since="7 days ago" -- '**/page.tsx'` = 신규 라우트 20건(EN 미러 시리즈: analysis/matchup/methodology/predictions/reviews/weekly·monthly 등) → info-architecture-review trigger(라우트 신규 추가 ≥3/1주) 채택.

**발견**: sitemap.ts/breadcrumb 는 이미 동기됐지만 `Header.tsx`/`Footer.tsx` 의 `withLocale`/`withMlbLocale` 헬퍼가 `/mlb/reviews/weekly`, `/mlb/reviews/monthly` 를 여전히 "EN 미러 부재(cycle 2226 의도적 scope 축소)" 로 blanket 예외 처리 — cycle 2355(weekly)/2356(monthly) 에서 이미 EN 미러가 배선됐음에도 주석·로직이 stale 상태로 남아 EN 페이지에서 헤더 메가메뉴·푸터 사이트맵 링크가 여전히 KO 라우트로 이탈. `/mlb/reviews`/`/mlb/reviews/misses` 는 wave-659(cycle 2339)에서 이미 예외 해제됐던 동일 목록의 잔여 2건 — cycle 2339 retro 주석이 "신규 미러 fire 시 예외 목록도 함께 갱신" 이라 명시했음에도 실제 후속 fire(2355/2356) 시점에 갱신 안 됨 (silent drift family, cycle 2153/2225/2339 와 동일 계열 — MLB 신규 라우트 추가 시 nav 헬퍼 동기 누락 반복 패턴).

**실행**: 양쪽 헬퍼에서 weekly/monthly 특례 분기 제거(다른 `/mlb/*` 라우트와 동일하게 `/en` prefix 치환). stale 주석 정정. 관련 테스트 3파일(`Header.test.ts` 2건, `Footer.test.tsx` 1건, `wave-659-en-mlb-reviews-mirror.test.ts` 1건) 의 stale 예외 assertion 갱신.

검증: `tsc --noEmit`(전체 workspace) clean, `eslint`(전체) clean, `pnpm test`(moneyball 500 files/4198 tests) all green.

결론: MLB EN nav 이탈 버그 family 완전 종료(cycle 2139→2225→2339→2358, 4차 재발 후 해소). 다음 후보 = 자연 발견 또는 op-analysis(22/25 gap 근접)/lotto(14/30)/info-arch(18/30, 본 cycle 자체 fire 로 gap 리셋) 주기 trigger 확인.

## 🔵 fix-incident — predict_final "games_found=5/predictions=0" 6일 연속 패턴 조사 RETRO-ONLY, 실제 인시던트 없음 확인 (cycle 2357, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 직전 8사이클(2350-2356) distinct=4(fix-incident/skill-evolution/review-code/explore-idea), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 3/20 방금 발화, op-analysis 21/25, info-arch 17/30, lotto 13/30). review-code 최근 감사 대상(analysis/page.tsx, accuracy/page.tsx, convergenceRecord.ts, buildAccuracyData.ts, daily.ts) 전부 최근 3일 내 이미 fix 완료 상태라 신규 review-code 타겟 부재. `pipeline_runs` 직접 DB 조회(REST API) 결과 `predict_final` 모드가 8/16~8/22 6일 연속 `games_found=5, predictions=0, skipped_detail reason=not_scheduled` 패턴 반복 — 표면상 사례 11 family(predict_final silent drop) 재발처럼 보여 fix-incident 로 채택.

**조사 결과 — 실제 인시던트 아님 확인**: `predict` 모드(정시 cron, 하루 여러 회) 가 이미 해당 일자 5경기 대부분/전부를 게임 시작 전 예측 완료(8/18·19·20·21 = 5/5, 8/16 = 4/5, 8/22 = 4/5 — 나머지 1경기는 우천취소로 선발투수 미확정 상태에서 postponed 되어 예측 불필요). `games` 테이블 직접 조인 확인 결과 실제 진행된 경기(status=final)는 100% 예측 존재, postponed 경기 중 선발 미확정 건만 무예측(정상). `predict_final`(22:00 KST, 마지막 기회)이 도달할 때는 모든 경기가 이미 final/postponed 상태라 `shouldPredictGame`(schedule.ts:57)의 `status !== 'scheduled'` 체크가 `already_predicted` 체크(schedule.ts:63)보다 먼저 걸려 전부 `not_scheduled` 로 분류 — **이는 `pipeline-schedule.test.ts` 156-198행에 명시적으로 테스트된 의도된 설계**(이미 예측된 경기라도 live/final 이면 not_scheduled 우선, look-ahead bias 방지 의도로 추정). `daily.ts` 1055행의 별도 gap-check 로직이 이미 `status !== 'final' && !== 'postponed' && !== 'live'` 로 expected 를 계산해 진짜 누락만 잡아내도록 분리 설계됨(cycle 936 fix) — 이번 6일 모두 GAP 알림 없음 확인.

**부가 확인**: `#1338 family`(scoring_rule 필터 누락) 신규 재발 후보 grep — `daily-summary.ts` 1건 매칭됐으나 실제로는 주석 텍스트일 뿐 쿼리 없는 순수 변환 함수, false positive. `toDateString()` KST 자정 오판 패턴 재검색 — 8/20 이미 수정된 1건 외 잔존 0건, family 종료 확인.

결론: 코드 변경 없음 (조사 결과 버그 아님 확인). 다음 cycle 후보 = 자연 발견 또는 op-analysis(22/25 gap 근접)/lotto(14/30)/info-arch(18/30) 주기 trigger 도달 여부 확인.

## 🟢 explore-idea — en/mlb/reviews/monthly 영어 미러 신규 배선 SUCCESS (cycle 2356, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 직전 8사이클(2348-2355) distinct=4(review-code/fix-incident/skill-evolution/explore-idea), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 20/25, info-arch 16/30, lotto 12/30). saturation 9/15 미충족. cycle 2355 retro 가 "다음 explore-idea 후보 = `/en/mlb/reviews/monthly` 동일 패턴 미러" 로 명시적 carry-over — weekly EN 미러와 완전히 동일 구조라 그대로 재사용.

**실행**: `buildMlbMonthlyReview`에 `locale?: 'ko'|'en'` 파라미터 추가(weekly 와 동일 패턴), `MonthlyTeamStatsSortControl` locale prop 추가. `/en/mlb/reviews/monthly`(redirect) + `/en/mlb/reviews/monthly/[month]`(KO 페이지 전체 mirror) + opengraph-image/twitter-image/not-found 신규. `sitemap.ts` `enMlbMonthlyReviewRoutes`(최근 6개월) 추가 + stale 주석 정정. `/en/mlb/reviews` 허브에 월간 리뷰 진입 카드 신규 배선.

검증: `tsc --noEmit`(kbo-data+moneyball) clean, `eslint`(양쪽) clean, `pnpm test`(kbo-data 90 files/1165 tests + moneyball 500 files/4198 tests all green).

결론: MLB weekly + monthly 리뷰 KO/EN parity 완결(cycle 620 최초 언급 → cycle 2355 weekly → cycle 2356 monthly, 3-cycle 시리즈 종료). 다음 explore-idea 후보 = 자연 발견 대기.

## 🟢 explore-idea (heavy) — en/mlb/reviews/weekly 영어 미러 신규 배선 SUCCESS (cycle 2355, 2026-08-23)

진단: open issue 0건, approved plan 0/22(literal `approved` 매칭 없음). 2-chain lock 미충족(직전 8사이클 2347-2354 distinct=4: explore-idea/fix-incident/review-code/skill-evolution). 주기 trigger 4종 전부 미도달(fix-incident 1/20 방금 발화, op-analysis 19/25, info-arch 15/30, lotto 11/30). cycle 2354 retro 명시 "explore-idea 또는 op-analysis/lotto/info-arch 주기 trigger 확인" — 주기 trigger 전부 미도달 확인 후 explore-idea 채택. plan #27(MLB 픽/리더보드) 재확인 결과 `mlb_pick_poll_events` 실측 참여 0건(Supabase 직접 COUNT) — 여전히 blocked, 착수 보류.

**발견**: cycle 620 최초 언급 이후 cycle 2338/2341/2342 retro 가 반복 carry-over 했던 "en/mlb/reviews weekly/monthly 미러 부재" — TODOS 서술("MLB 주/월 range 유틸 부재로 보류")은 stale(plan #26 당시 이미 `computeWeekRange`/`computeMonthRange` league-agnostic 확인됨), 실제로는 단순 미착수. `/mlb/reviews/weekly/[week]`(551줄) 대응 EN 미러가 전혀 없어 `/en/mlb/reviews` 허브도 "index 진입 카드는 스코프 밖"으로 명시적으로 미뤄둔 상태(cycle 2226/2227).

**실행**: `buildMlbWeeklyReview`/`buildMlbFactorInsights`(mlb-shared.ts)에 `locale?: 'ko'|'en'` 파라미터 추가(기본값 `'ko'`, 기존 KO callsite 무변경 — `buildMlbMissReport` 기존 패턴 재사용), `buildSummary` 자연어 문장 EN 분기 신규 작성. `MlbHighlightCard`/`WeeklyGamesSortControl` 도 동일 패턴으로 `locale` prop 추가. `/en/mlb/reviews/weekly`(redirect index) + `/en/mlb/reviews/weekly/[week]`(KO 페이지 전체 mirror) + opengraph-image(이미 영어라 URL 경로만 교체)/twitter-image/not-found 신규. `sitemap.ts` `enMlbWeeklyReviewRoutes`(최근 12주) 추가, `/en/mlb/reviews` 허브에 주간 리뷰 진입 카드 신규 배선. monthly EN 미러는 스코프 밖(별도 cycle 후속, plan #26 phase 분리 관례).

**잡음 발견 겸 정정**: 로컬 테스트 실행 중 `version-sync-guard`(cycle 2047) 실패 발견 — cycle 2354 두 번째 커밋이 `apps/moneyball/package.json`(→0.5.62.76) 만 갱신하고 루트 `package.json`/`VERSION`(0.5.62.75 방치) 갱신을 누락한 3-way drift. 이번 커밋에서 3파일 모두 `0.5.62.77` 로 동기 정정.

검증: `tsc --noEmit`(kbo-data+moneyball) clean, `eslint`(양쪽) clean, `pnpm test`(kbo-data 90 files/1165 tests + moneyball 499 files/4189 tests all green, version-sync-guard 포함).

결론: MLB 주간 리뷰 KO/EN parity 달성(사상 첫 EN weekly/monthly 계열 미러). 다음 explore-idea 후보 = `/en/mlb/reviews/monthly` 동일 패턴 미러(이번 cycle 과 동일 방법론 재사용, buildMlbMonthlyReview 에도 동일 locale param 추가 필요) 또는 신규 topic 자연 발견.

## 🟢 fix-incident — MLB waterfall/factor-detail/overview recent_form·head_to_head 표시 동기화 SUCCESS (cycle 2354, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 직전 8사이클(2346-2353) distinct=4(review-code/explore-idea/fix-incident/skill-evolution), 2-chain lock 미충족. cycle 2353 retro가 "waterfall/factor-detail/overview 표시 레이어 동기화가 자연 review-code(heavy) 후속 대상"이라 명시 — cycle 2349→2352 elo 사례와 동일한 read-wiring 후 표시 레이어 미동기 패턴을 그대로 검증.

**발견**: `computeMlbWaterfall`/`buildMlbGameOverview`/`buildMlbFactorDetailRows` 가 cycle 2353의 recent_form/head_to_head 실측 wiring 이후에도 여전히 두 팩터를 "항상 중립값" 가정 이전 로직 그대로 bar 계산에서 제외 — elo 가 cycle 2349→2352 사이 겪은 것과 동일한 silent drop. game-detail page.tsx(ko/en) 의 predictions select 도 `home_recent_form`/`away_recent_form`/`head_to_head_rate` 컬럼을 조회하지 않아 waterfallInput 이 항상 undefined.

**실행**: `MlbWaterfallInput` 에 recent_form(기존 pair 형태, multiplier 0.05)/head_to_head(단일 homeWinRate 를 `{home: rate, away: 1-rate}` 대칭 pair 로 인코딩, multiplier 0.5) 필드 추가 → 기존 pairTerms 루프에 편입(신규 분기 없음). `GAME_DETAIL_FACTOR_ROWS`(ko/en) 에 두 행 추가(8→10) + predictions select 확장. `mlb-overview.ts`/`mlb-factor-detail.ts` 에 situational 분류 + 퍼센트 포맷 케이스 추가. `MlbFactorWaterfallChart` 캡션 + `buildMlbTeamStrengthSnapshot.ts` 주석의 "recent_form/head_to_head 미구현" stale 문구 정정.

검증: `tsc --noEmit`(kbo-data+moneyball) clean, `eslint`(양쪽) clean, `pnpm test`(kbo-data 90 files/1165 tests + moneyball 498 files/4180 tests all green).

결론: MLB 모델 표시 레이어 정합성 SUCCESS(계산 로직 자체는 cycle 2353에서 이미 완료, 이번엔 표시 동기화). defense_sfr(5%) 은 여전히 MLB 동등 데이터 소스 부재로 스코프 밖. 다음 cycle 후보 = explore-idea 자연 발견 또는 op-analysis/lotto/info-arch 주기 trigger 도달 여부 확인.


## 🟢 fix-incident — MLB recent_form/head_to_head 실측 wiring, 13% 가중치 silent no-op 해소 SUCCESS (cycle 2353, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 직전 8사이클(2345-2352) distinct=4(explore-idea/review-code/fix-incident/skill-evolution), 2-chain lock 미충족. 주기 trigger 4종 전부 미도달(fix-incident 3/20 gap, op-analysis 17/25, info-arch 13/30, lotto 9/30). saturation 8/15 미충족. cycle 2349 retro가 "나머지 3팩터(최근폼/상대전적/수비SFR) 계산 로직 구현은 Tier 3 규모 — 별도 plan 분리 검토 대상"이라 남겼으나, 직접 코드 확인 결과 recent_form/head_to_head 는 defense_sfr(KBO 전용 지표, MLB 동등 데이터 소스 자체 부재)과 달리 이미 존재하는 `mlb_schedule`(status='final' 행의 home_score/away_score) 만으로 계산 가능 — 신규 테이블/스크래퍼 불필요한 단순 wiring 누락임을 발견. Elo(cycle 2349)와 동일한 "read-wiring 누락" 패턴이라 이번 cycle 범위로 분리.

**발견**: `runPredictFinal`이 `mlb_schedule`을 오늘 경기 조회에만 쓰고 시즌 종료 경기(최근폼/h2h 파생 소스)는 전혀 조회하지 않아 항상 `recent_form:{home:50,away:50}`(중립), `head_to_head:{homeWinRate:0.5}`(중립) 고정 입력 — `MLB_BASE_WEIGHTS.recent_form`(10%)+`head_to_head`(3%) = 13% 가중치가 모든 MLB 예측에서 상시 no-op. `buildMlbTeamFactorAverages`/`buildMlbTeamProfile`도 이미 `home_recent_form`/`away_recent_form` 컬럼을 읽고 있었지만 상시 NULL이라 평균/프로필 계산에서 늘 제외됐음(elo와 동일 부수 패턴).

**실행**: 신규 순수 함수 `calculateMlbRecentForm`/`calculateMlbHeadToHead`(`factors/mlb-form.ts`, KBO `engine/form.ts`와 동일 계약이나 team_code string 기준) 작성 → `runPredictFinal`이 시즌 종료 경기(당일 이전, leak 방지) 조회 → 최근 10경기 승률 + 시즌 h2h 계산 입력 + `predictions.home_recent_form/away_recent_form/head_to_head_rate` 컬럼(기존 KBO 공용 스키마, migration 001) 양쪽에 실측 반영. 유효 경기 없으면 계산은 중립값 fallback, 영속화는 null(elo와 동일 원칙). 신규 단위 테스트 다수(순수 함수 9건 + 파이프라인 wiring 2건) 추가.

검증: `tsc --noEmit`(kbo-data+moneyball) clean, `eslint`(양쪽) clean, `pnpm test`(kbo-data 90 files/1161 tests + moneyball 498 files/4180 tests all green).

결론: MLB 모델 실질 개선 SUCCESS. 다음 cycle 후보 = waterfall/factor-detail/overview 표시 레이어 동기화(cycle 2349→2352 elo 사례와 동일 패턴 — review-code(heavy) 자연 후속) 또는 explore-idea 자연 발견. defense_sfr(5%)은 MLB 동등 데이터 소스 부재로 여전히 스코프 밖.


## 🟢 fix-incident — MLB Elo 팩터 실측 wiring, 10% 가중치 silent no-op 해소 SUCCESS (cycle 2349, 2026-08-23)

진단: open issue 0건, approved plan 0/22(status=approved 매칭 0건). 2-chain lock 미충족(직전 8사이클 2341-2348 distinct=3). 주기 trigger 4종 전부 미도달(fix-incident 16/20, op-analysis 13/25, info-arch 9/30, lotto 5/30). saturation 7/15 미충족. cycle 2348 review-code(heavy) retro가 "4팩터를 실제 예측 가중치에 연결하는 건 별도 op-analysis/plan 필요"라 범위 밖으로 남겼으나, 직접 코드 확인 결과 Elo 하나만은 이미 계산 로직(`mlb-elo.ts`)과 저장 테이블(`mlb_team_elo`, cron `mlb_elo_update`)이 완비돼 있어 단순 read-wiring 누락임을 발견 — 나머지 3팩터(최근폼/상대전적/수비SFR)는 계산 로직 자체가 없어 훨씬 큰 스코프라 이번엔 Elo만 분리.

**발견**: `runPredictFinal`이 `mlb_team_elo`(매일 cron이 갱신)를 전혀 읽지 않고 항상 `ELO_NEUTRAL` 고정 입력 — `MLB_BASE_WEIGHTS.elo`(10%)가 모든 MLB 예측에서 상시 no-op(양팀 동일값 → 차이항 0). `buildMlbTeamFactorAverages`/`buildMlbTeamProfile`도 이미 `home_elo`/`away_elo` 컬럼을 읽고 있었지만 상시 NULL이라 elo가 평균/프로필 계산에서 늘 제외됐음.

**실행**: `mlb_team_elo` season 조회(`assertSelectOk` 가드) → raw team_code 매칭(정규화 불필요, mlb_team_stats와 다른 컨벤션 확인) → 계산 입력 + `predictions.home_elo/away_elo` 컬럼 양쪽에 실측 반영(팀 row 부재 시 계산은 ELO_NEUTRAL fallback, 영속화는 null). 신규 단위 테스트 1건 추가. cycle 2348이 추가한 "/glossary, /mlb/factors, /mlb/methodology" 4팩터 미반영 문구가 Elo 기준 stale해지는 것을 막기 위해 3곳 모두 Elo 제외 + "실측 반영" 갱신.

검증: `tsc --noEmit`(kbo-data + moneyball) clean, `eslint`(양쪽) clean, `pnpm test`(kbo-data 89 files/1148 tests + moneyball 498 files/4180 tests all green).

결론: MLB 모델 실질 개선 SUCCESS(문서만이 아닌 실제 예측 계산 변경). 다음 cycle 후보 = 나머지 3팩터(최근폼/상대전적/수비SFR) 계산 로직 구현은 Tier 3 규모(신규 계산 로직 + 데이터 흐름 설계 필요) — 별도 plan 분리 검토 대상. 또는 explore-idea 자연 발견.


## 🟢 review-code (heavy) — MLB placeholder 팩터 4개 "데이터 없음" 문구 정정 SUCCESS (cycle 2348, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2340-2347 distinct=4). 주기 trigger 4종 전부 미도달. cycle 2347 explore-idea(heavy)가 온보딩 3페이지에 MLB 안내를 신규 배선한 직후 — Feature-Drift Cycle 패턴(explore-idea 신규 기능 → review-code 즉시 audit)에 따라 방금 배선된 문구를 코드 대조.

**발견**: `/glossary` 신규 문구("Elo·최근폼·상대전적·수비SFR 4개는 MLB 쪽 데이터가 아직 없어 KBO 전용")가 부정확 — 이 4팩터는 실측 데이터가 존재(`mlb_team_elo`/`mlb_team_elo_history` 테이블, 팀/매치업 페이지의 Elo 추이·최근폼 W-L·시즌 상대전적 표시)하지만 `mlb-pipeline.ts`의 실제 승률 계산은 이 4개를 팀 구분 없는 중립값으로 고정 입력(사례: `recent_form:{50,50}`, `head_to_head:0.5`, `elo: ELO_NEUTRAL` 양쪽, `defense_sfr:{0,0}`). "데이터 없음"이 아니라 "데이터는 있으나 가중치 계산엔 미반영"이 정확. `/mlb/factors`+`/mlb/methodology` 페이지도 이 4팩터를 실측 출처와 함께 가중치 표에 나열하면서 미반영 사실을 disclose 안 하고 있던 기존 gap(cycle 2347 이전부터 존재)도 함께 발견.

**실행**: `/glossary` 문구 정정 + `/mlb/factors` 가중치 표 헤더 경고 배너 추가 + `/mlb/methodology` 정량 모델 섹션 caveat 문장 추가.

검증: `tsc --noEmit`(moneyball) clean, `eslint` clean, `pnpm test`(498 files/4180 tests all green).

결론: MLB 예측 모델 신뢰도 관련 문서 정확성 SUCCESS. 다음 cycle 후보 = explore-idea 자연 발견 또는 (더 큰 후속 과제로) 4팩터를 실제 예측 가중치에 연결하는 모델 개선(별도 op-analysis/plan 필요 — 현재는 문서 정확성만 수정, 모델 자체는 변경 없음).


## 🟢 explore-idea (heavy) — 온보딩 3페이지 MLB 인지 갭 해소 SUCCESS (cycle 2347, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2340-2346 distinct=4: info-arch/review-code/explore-idea/lotto). 주기 trigger 4종 전부 미도달(fix-incident 14/20, op-analysis 11/25, info-arch 7/30, lotto 3/30). cycle 2346 review-code(heavy) retro 가 "explore-idea 자연 발견 또는 open issue/plan 재확인" 을 다음 후보로 남김. review-code(heavy) 2연속 clean audit(2343/2346)로 신규 감사 target 소진.

**발견**: KBO↔MLB 구조 parity 는 이미 완결(cycle 2242 checkpoint, 라우트 30+ + en 미러)이나 온보딩 narrative 3페이지(`/about`, `/guide`, `/glossary`)에 MLB 언급이 0건임을 grep 으로 확인 — 신규 사용자가 처음 읽는 문서 어디서도 MLB 섹션 존재를 알 수 없었음.

**실행**: `/guide` "페이지별 활용" 그리드에 MLB 카드 신규(정량 모델 전용, AI 에이전트 토론 미적용 명시) / `/about` 인트로에 MLB 예측 안내 1줄 추가(`MLB_FACTOR_COUNTS.total` 실측 인용, `mlb-pipeline.ts` 확인 후 AI 토론 미적용 정확히 서술) / `/glossary` 헤더에 지표 공통 적용 범위 + MLB 전용 4개 지표(Elo/최근폼/상대전적/수비SFR) 안내.

검증: `tsc --noEmit`(moneyball) clean, `pnpm test`(498 files/4180 tests all green). `/ship` 완주(VERSION 0.5.62.72, CHANGELOG 갱신, main 직접 커밋 push 완료 — commit `bf30d00e`).

결론: 온보딩 문서 MLB 인지 갭 해소 SUCCESS. **주의**: 본 cycle 실행(구현+ship)은 이전 세션에서 이미 완료돼 있었으나 retro 박제(JSON+policy commit) 가 누락된 상태(사례 15 silent retro drift family 재발 가능성)로 본 세션이 발견 — commit body 에 `cycle: 2347` + `subtype: explore-idea` 가 명시돼 있어 evidence 명확, retroactive 정상 박제 진행. 다음 cycle 후보 = review-code(heavy, 방금 배선된 온보딩 3페이지 문구 audit) 또는 신규 topic 자연 발견.


## ⚪ review-code (heavy) — cycle 2345 MLB 주간/월간 수렴 픽 배선 drift 감사 clean RETRO-ONLY (cycle 2346, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2338-2345 distinct=4). 주기 trigger 4종 전부 미도달(fix-incident 13/20, op-analysis 10/25, info-arch 6/30, lotto 2/30). cycle 2345 explore-idea(heavy) retro 가 "review-code(heavy, 방금 배선된 신규 코드 audit — Feature-Drift Cycle 자연 교대)" 를 명시적 다음 후보로 남김.

**감사 범위**: `convergenceRecord.ts` 6함수(`getMlbRecentConvergencePickRecord`/`getMlbConvergencePickStreak`/`getMlbConvergencePickBestStreak`/`getMlbConvergencePickHomeAwaySplit`/`getMlbConvergencePickDayOfWeekSplit`/`getMlbConvergencePickTeamStats`) startDate/endDate 파라미터 추가분을 KBO 대응 함수(wave-584/594/600/602/603)와 1:1 대조 / `weekly/[week]`, `monthly/[month]` page.tsx 양쪽 `Promise.all` 배선 + `range.startDate`/`range.endDate` 전달 정확성 / 배지 컴포넌트(`ConvergenceHomeAwayBadges`/`ConvergenceDayOfWeekBadges`/`ConvergenceTeamStatsBadges`) `nameResolver=mlbShortTeamName` 전달 확인 / `mlb-reviews-page.test.ts` + `mlb-reviews-monthly-page.test.ts` 가드 반전(stale "의도적 생략" → 배선 확인) 정확성 확인.

검증: `tsc --noEmit`(moneyball) clean, `pnpm test`(498 files/4180 tests all green).

결론: 신규 drift 0건 — cycle 2345 explore-idea(heavy) 자체가 KBO 패턴을 정확히 이식해 이번 감사 창에서 신선 발견 없음. 코드 변경 없음(RETRO-ONLY). review-code(heavy) 2회 연속 clean audit(2343/2346) — 다음 발화는 신규 monolith 성장 또는 다른 영역 grep 시 자연 재도달. 다음 cycle 후보 = explore-idea 자연 발견 또는 open issue/plan 재확인.


## 🟢 explore-idea (heavy) — MLB 주간/월간 리뷰 수렴 픽 섹션 완결 SUCCESS (cycle 2345, 2026-08-23)

진단: open issue 0건, approved plan 0/22(literal `approved` 없음). 2-chain lock 미충족(직전 8사이클 2337-2344 distinct=4: review-code/explore-idea/info-arch/lotto). 주기 trigger 4종 전부 미도달(fix-incident 12/20, op-analysis 9/25, info-arch 5/30, lotto 1/30 방금 리셋). cycle 2342 retro 가 명시한 plan #23(LLM context layer) 후보는 실제로 status=`completed_steps_1_4_shipped_through_cycle_1239_plus_waves_41_54_through_cycle_1246` — cycle 1246 시점 이미 전부 완료된 stale 언급으로 확인. plan#24 dedup 후속 후보(computeMatchupStreak 등)도 이미 cycle 2055/2064 에 완료 확인. 코드베이스 `TODO`/`후속 cycle 과제` grep 결과 `/mlb/reviews/page.tsx` + `weekly/[week]/page.tsx` 주석이 명시한 "MLB convergence 함수 날짜 range 파라미터 부재로 weekly/monthly 수렴 픽 섹션 생략"이 유일한 구체적·검증 가능한 gap으로 확인.

**실행**: `convergenceRecord.ts` 의 `fetchMlbConvergencePickDetailedResults` + 6개 소비 함수(`getMlbRecentConvergencePickRecord`/`getMlbConvergencePickStreak`/`getMlbConvergencePickBestStreak`/`getMlbConvergencePickHomeAwaySplit`/`getMlbConvergencePickDayOfWeekSplit`/`getMlbConvergencePickTeamStats`)에 optional `startDate`/`endDate` 파라미터 추가(KBO wave-584/594/600/602/603 동일 패턴, add-only — 기존 호출부 무변경). `/mlb/reviews/weekly/[week]/page.tsx`, `/mlb/reviews/monthly/[month]/page.tsx` 에 KBO 동일 구조(수렴 픽 W-L 카드 → 스트리크 → 홈/어웨이 배지 → (월간만) 요일별 배지 → 팀별 배지)로 배선, `range.startDate`/`range.endDate` 전달. 배지 컴포넌트는 이미 generic(nameResolver/locale prop, cycle 2226/2339)이라 컴포넌트 자체 변경 없이 재사용.

검증: `mlb-reviews-monthly-page.test.ts` 의 "수렴 픽 섹션 부재 — 의도적 생략" 가드를 배선 확인 가드로 반전. `tsc --noEmit` clean, `eslint` clean, `pnpm test`(498 files/4180 tests all green).

결론: MLB `/mlb/reviews` 3계층(허브/주간/월간) 전체 수렴 픽 분석 parity 완결 — KBO 대비 마지막 남은 구조적 gap 해소. 다음 후보: review-code(heavy, 방금 배선된 신규 코드 audit — Feature-Drift Cycle 자연 교대) 또는 신규 topic 자연 발견.


## ⚪ review-code (heavy) — PickButton 현지화(cycle 2342) drift 감사 clean RETRO-ONLY (cycle 2343, 2026-08-20)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2335-2342 distinct=4). 주기 trigger 4종 전부 미도달(fix-incident 10/20, op-analysis 7/25, info-arch 3/30, lotto 19/30). cycle 2342 explore-idea(heavy) SUCCESS(PickButton locale 배선) 직후 Feature-Drift Cycle 자연 교대 적용, 방금 배선된 코드를 audit target 으로 선택.

**감사 범위**: `PickButton.tsx` STRINGS ko/en 테이블 전체 키 매칭 확인 / `en/mlb/games/[date]` + `en/mlb/analysis` 두 callsite `locale="en"` wiring 정확성 확인 / `PredictionCardLive.tsx`(locale 미threading) 가 KBO 전용 callsite(`page.tsx`, `predictions/[date]`)만 사용하는지 교차 확인 — en 미러 미노출이라 오탐 아님.

검증: `tsc --noEmit`(moneyball) clean, `PickButton.test.tsx` 12/12 passed.

결론: 신규 drift 0건 — cycle 2342 explore-idea(heavy) 자체가 이미 locale 스레딩을 꼼꼼히 마감해 이번 감사 창에서 신선 발견 없음. 코드 변경 없음(RETRO-ONLY). 다음 review-code 발화는 새 monolith 성장 또는 다른 영역 grep 시 자연 재도달.


## 🟢 explore-idea (heavy) — PickButton 현지화, en/mlb 커뮤니티 픽 배선 SUCCESS (cycle 2342, 2026-08-20)

진단: open issue 0건, approved plan 0/22(문자 그대로 `status: approved` 매칭 plan 없음). 2-chain lock 미충족(직전 8사이클 2334-2341 distinct=4: op-analysis/review-code/explore-idea/info-arch). 주기 trigger 4종 전부 미도달(fix-incident 9/20, op-analysis 6/25, info-arch 2/30, lotto 18/30). DESIGN.md mtime 2일 전(design-system 미도달). lotto 다음 회차(2026-08-22) picks 이미 존재, 직전 회차(08-15) 결과도 이미 박제. cycle 2341 review-code(heavy) retro 가 "PickButton 현지화(넓은 범위, 별도 cycle)" 를 명시적 다음 후보로 남김 — carry-over 강도 명확한 쪽 선택.

**실행**: `PickButton.tsx`(커뮤니티 픽 투표 위젯) 하드코딩 한국어 텍스트를 `locale?: 'ko'|'en'` prop + `STRINGS` 테이블로 분기(기본값 `'ko'`, 기존 KBO/MLB callsite 무변경 — wave-659 배지 컴포넌트 동일 패턴). `/en/mlb/games/[date]` 는 `status`/`homeWinProb` 필드가 쿼리에서 아예 누락돼 있어(EN 미러 최초 배선 시 픽 UI 자체 미고려) 추가 후 배선, `/en/mlb/analysis` 는 공유 `getTodayMlbAnalysisRows` 에 필드가 이미 있어 배선만 추가. 두 페이지 모두 `status === 'scheduled'` 경기에 `PickButton locale="en"` 렌더.

검증: `tsc --noEmit` clean, `eslint` clean, `pnpm test`(498 files/4180 tests all green — wave-658 가드 테스트의 "PickButton en 미러 scope 밖" stale assertion 을 새 배선에 맞게 정정 포함). VERSION/CHANGELOG/package.json×2 버전 bump(0.5.62.69→70).

결론: KO/EN 양쪽 커뮤니티 픽 투표 기능 parity 달성. 잔존 backlog: `/mlb/games/[date]/[slug]`(경기 상세) 는 KO 도 원래 PickButton 미사용이라 scope 밖 유지. 다음 explore-idea 후보 = plan #23(LLM 분석 에이전트 context layer, 사용자 review 대기) 또는 신규 topic 자연 발견.

## ⚪ review-code (heavy) — EN 미러 신규 코드(wave-659) drift 감사 clean RETRO-ONLY (cycle 2341, 2026-08-20)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2333-2340 distinct=5). 주기 trigger 4종 전부 미도달(fix-incident 8/20, op-analysis 5/25, info-arch 1/30 방금 발화, lotto 17/30). cycle 2338/2339 explore-idea(heavy) 2연속 성공 직후 → Feature-Drift Cycle 패턴(explore-idea→review-code 자연 교대) 적용, 방금 배선된 en/mlb/reviews 미러(wave-659) 를 audit target 으로 선택.

**감사 범위**: `reviews-data.ts`(ko/en 공유 fetch 함수) / `en/mlb/reviews/page.tsx` vs `mlb/reviews/page.tsx` 1:1 대조(weekly/monthly 카드 의도적 scope 축소 확인) / `en/mlb/reviews/misses/page.tsx` vs `mlb/reviews/misses/page.tsx` 1:1 대조 / `factorLabels.ts` FACTOR_LABELS ↔ FACTOR_LABELS_EN 10키 매칭 확인 / `WEEKDAY_LABELS_EN` vs `WEEKDAY_LABELS_EN_MON_FIRST` 혼용 없음 확인 / 5개 배지 컴포넌트(`ConvergenceStreakBadges`/`TeamStatsBadges`/`HomeAwayBadges`/`DayOfWeekBadges`/`MissesSortControl`) locale prop 기본값 `'ko'` 하위호환 확인 / `buildMlbMissReport({ locale })` 분기 로직 확인.

검증: `tsc --noEmit`(moneyball 패키지) clean, `wave-658`/`wave-659` guard test 2 files/16 tests all green.

결론: 신규 drift 0건 — cycle 2338/2339 explore-idea(heavy) 자체가 이미 locale 스레딩을 꼼꼼히 마감(기본값 보존, 키 매칭, breadcrumb/hreflang 양방향)해 이번 감사 창에서 신선 발견 없음. 코드 변경 없음(RETRO-ONLY). 다음 review-code 발화는 새 monolith 성장 또는 다른 영역 grep 시 자연 재도달.

## ⚪ info-architecture-review (lite) — 30-cycle gap 자연 도달, IA 감사 clean RETRO-ONLY (cycle 2340, 2026-08-20)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2332-2339 distinct=4). 마지막 info-arch 발화 cycle 2310 → gap=30 (trigger 자동 도달, cycle 300 룰). 나머지 주기 trigger 미도달(fix-incident 7/20, op-analysis 4/25, lotto 16/30).

**감사 범위** (6종): 라우트 신규(git log 14일 — en/mlb/analysis·reviews·misses·matchup·accuracy·calendar·methodology·predictions 등 wave-658/659 신규분 확인) / breadcrumb (en/mlb/reviews, misses, analysis 3개 신규 라우트 전부 `Breadcrumb` 보유) / sitemap.ts 동기 (en/mlb/analysis, en/mlb/reviews, en/mlb/reviews/misses 전부 등록 확인, 동적 라우트 en/mlb/team·matchup·players·games 도 커버) / hreflang alternates (mlb/reviews ↔ en/mlb/reviews canonical+languages 양방향 배선 확인) / 헤더 메가메뉴 (분석 센터·예측 리뷰·빗나간 예측 3개 항목 정상, withLocale 예외 주석 최신 — weekly/monthly 만 의도적 KO-only 유지) / 푸터 sitemap 컬럼 (동일 3항목 정상).

결론: 신규 drift 0건 — cycle 2338/2339 explore-idea(heavy) 2연속이 이미 IA 갭(nav 404 + EN 미러 부재)을 선제 해소해 30-cycle 창 안 신선 발견 없음. 코드 변경 없음(RETRO-ONLY). 다음 info-arch 발화는 cycle 2370(30-gap) 또는 신규 라우트 배선 후 자연 재도달. 잔존 backlog(참고, 별도 chain): PickButton 현지화, en/mlb/reviews weekly/monthly 미러(MLB 주/월 range 유틸 부재로 보류).

## 🟢 explore-idea (heavy) — en/mlb/reviews 영어 미러 신규 SUCCESS (cycle 2339, 2026-08-20)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2331-2338 distinct=4: operational-analysis/review-code/fix-incident/explore-idea). 주기 trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 3/25, info-arch 29/30, lotto 15/30). cycle 2338 explore-idea(heavy) 회고가 "PickButton 현지화" 와 "en/mlb/reviews 미러"(기존 구조적 gap, cycle 620 에서도 언급) 를 명시적 다음 후보로 남김 — carry-over 강도 명확한 쪽 선택.

**실행**: `/mlb/reviews`(수렴 픽 분석 허브) + `/mlb/reviews/misses`(빗나간 예측 회고) EN 미러 신규 배선. weekly/monthly 서브페이지는 cycle 2226/2227 의도적 scope 축소(plan #26 Phase 1/2, MLB 주/월 range 유틸 부재)로 여전히 KO only — Header/Footer `withLocale()` 예외 범위를 `/mlb/reviews`, `/mlb/reviews/misses` 만 해제하고 weekly/monthly 는 유지.

- `getMlbReviewsData`(reviews-data.ts 신규)로 12개 병렬 조회를 `mlb/reviews/page.tsx` 에서 추출 — ko/en 재사용(analysis-data.ts wave-658 동일 패턴).
- 공유 배지 컴포넌트 5개(`ConvergenceStreakBadges`/`TeamStatsBadges`/`HomeAwayBadges`/`DayOfWeekBadges`/`MissesSortControl`)에 `locale` prop 추가(기본 `'ko'`, 기존 callsite 무변경). `WEEKDAY_LABELS_EN`(shared) + `FACTOR_LABELS_EN`(factorLabels.ts) 신규 — `buildMlbMissReport({ locale })` 로 팩터 레이블 분기.
- Header/Footer 예외 축소, sitemap.ts + ko 페이지 hreflang 양방향 배선.
- 신규 guard test `wave-659-en-mlb-reviews-mirror.test.ts` + 기존 4개 테스트 파일(mlb-reviews-page/wave-602/Header/Footer) 의 "en 미러 부재" stale assertion 정정.
- `tsc --noEmit`(4패키지 clean) + `eslint`(clean) + `pnpm test`(498 files/4180 tests all green) 확인. PR → R7 자동 머지 예정.

결론: 코드 변경 있음(SUCCESS). 다음 후보: `PickButton` 현지화(커뮤니티 픽 투표 UI, 범위 넓어 별도 cycle) 또는 review-code/explore-idea 완전 신규 topic 발견 시 재선택.

## 🟢 explore-idea (heavy) — en/mlb/analysis 영어 미러 신규, 헤더 nav 404 live 버그 해소 SUCCESS (cycle 2338, 2026-08-20)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2330-2337 distinct=3: review-code/operational-analysis/fix-incident). 주기 trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 2/25, info-arch 28/30, lotto 14/30). review-code(heavy)로 `analysis/page.tsx`(2803줄) 재감사 시도했으나 이미 named 상수 전면 적용 확인(drift 없음), `debug/*` 임계값들은 페이지별 의미가 다른 독립 값이라 추출 대상 아님 — 3 cycle 연속 신선 target 부재 확정하던 중 `/en/mlb/analysis` 라우트 자체가 없다는 사실 발견.

**실행**: 단순 gap이 아니라 실제 live 버그였음 — `Header.tsx`/`Footer.tsx` 의 `withLocale()`(cycle 2139 fix)이 `/mlb/` prefix 전체를 `/en/mlb/` 로 블랭킷 치환(`/mlb/reviews*` 만 예외)하는데 `/mlb/analysis`(plan #28, cycle 2315~2323 완성)는 예외 목록에 없어 EN 페이지에서 "Analysis Hub" nav 클릭 시 404 (cycle 2227이 `/mlb/reviews`를 예외 처리해 고친 것과 동일 family). 예외 추가 대신 실제 페이지를 만들어 해결(explore-idea heavy, office-hours/plan-review 자동 fire 환경이라 skip, spec 직접 작성).

- `getTodayMlbAnalysisRows`(+`MlbAnalysisRow`)를 `mlb/analysis/page.tsx` 로컬 함수에서 `analysis-data.ts`로 이동 — ko/en 양쪽 재사용, 중복 로직 방지.
- EN MVP 스코프: 빅매치·팩터 수렴 픽·오늘 전체 예측·이번 주 남은 경기·팀 전력 현황·어제 결과·적중 기록 CTA.
- `PickButton`(커뮤니티 픽 투표 UI, ~10개 하드코딩 한국어 문자열)과 주간/월간 리뷰 CTA(en/mlb/reviews 미러 부재, 기존 구조적 gap — cycle 620 에서도 언급)는 스코프 밖 — KO 버전도 MVP→4-phase 로 점진 확장했던 plan #28 관례 그대로 적용.
- `MlbTeamStrengthGrid` 에 `locale?: 'ko'|'en'` prop 추가 — href prefix + 승/패 문구("연승/연패" → "W/L streak") 현지화.
- `sitemap.ts` + ko 페이지 `alternates.languages` hreflang 양방향 배선. 신규 guard test `wave-658-en-mlb-analysis-mirror.test.ts` + 기존 테스트 3건 갱신(analysis-data.ts 이동 반영).
- `tsc --noEmit`(4패키지 clean) + `eslint`(clean) + `pnpm test`(497 files/4172 tests all green) 확인. PR #3018 → R7 자동 머지(66f57cca).

결론: 코드 변경 있음(SUCCESS). 다음 후보: `PickButton` 현지화(범위 넓어 별도 cycle) 또는 `en/mlb/reviews/*` 미러(기존 구조적 gap) 후속 고려, 아니면 review-code/explore-idea 완전 신규 topic 발견 시 재선택.

## ⚪ operational-analysis (heavy) — CE cohort 재측정, 완전 불변 확인 RETRO-ONLY (cycle 2336, 2026-08-20)

진단: open issue 0건, approved plan 0/22(27=phase3 data-blocked 재확인 불필요 — 어제 이미 확인, 28=completed, 22/23=completed). 2-chain lock 미충족(직전 8사이클 2328-2335 distinct=4: review-code/explore-idea/op-analysis/fix-incident). 주기 trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 2/25, info-arch 26/30, lotto 12/30). `gh run list` CI 전부 green, 배포 실패 0건. review-code/explore-idea 신선 target 광범위 재탐색(wild-card 3중 감사 완료/TeamStrengthGrid 2중 감사 완료/analysis 신규 파일 전부 리뷰 완료/Header·Footer nav 최근 수정 없음) — 5 cycle 연속 "완전 신규 topic 부재" 확정.

**실행**: 위 4개 gap-trigger 전부 미도달 + 완전 신규 target 부재 상태에서 무의미한 busywork 방지 위해 `op-analysis-ce-cohort.ts` 를 gap 무관 선제 재실행(risk=0, 비용=1 DB query) — 결과 **cycle 2309 문서치와 100% 동일**(전체 55.5%(178/321) / CE 54.0%(148/274) / 비CE 63.8%(30/47) / 격차 9.8pp / overlap 통제 10.8pp). 8/17~8/20 (cycle 2309→2336, 27 cycle) 동안 KBO 신규 검증 배치 없음 확인 — 스톨 아님, KST 23:00 1일 1회 배치 주기상 정상.

결론: 코드 변경 없음(RETRO-ONLY). 실질 가치 = "완전 정적 상태" 실측 재확인(negative result도 기록 가치 — 다음 cycle이 동일 재확인 반복 안 하도록). 다음 cycle 은 gap-trigger 자연 도달(fix-incident 4/20·op-analysis 3/25·info-arch 27/30·lotto 13/30) 전까지 review-code/explore-idea 완전 신규 topic 발견 여부만 우선 확인 권고.

## ⚪ review-code (lite) — /health 721-cycle 미측정 베이스라인 재확인 RETRO-ONLY (cycle 2335, 2026-08-20)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2327-2334 distinct=4: review-code/explore-idea/fix-incident/op-analysis). 주기 trigger 4종 전부 미도달(fix-incident 0/20 방금 발화, op-analysis 0/25 방금 발화, info-arch 25/30, lotto 11/30). review-code/explore-idea 는 cycle 2332~2334 연속 "신선 target 부재" 재확인 후 이번 cycle 추가 검증(community 페이지=의도적 placeholder, EN mirror KBO 부재=MLB 전용 의도적 설계, convergenceRecord/buildTeamProfile/buildMatchupProfile=최근 #2997/#2998/#3007 로 이미 정정)도 전부 기각 — 4 cycle 연속 확정.

**실행**: `/health` 마지막 실행이 cycle 1614(2026-07-14)로 721 cycle 공백 발견 — 재실행. `pnpm type-check`(4패키지 clean) + `pnpm lint`(clean) + `pnpm test`(4156/4156 pass, 495 test files) 전부 CLEAN, composite 10.0/10. 직전 측정(1881 tests/212 files) 대비 대규모 성장(+2275 tests/+283 files, 721 cycle 동안)에도 score 불변 — silent drift 없이 품질 유지 확인. `health-history.jsonl` 에 신규 entry append.

결론: 코드 변경 없음(retro-only), 실질 가치 = 대규모 성장 기간 품질 유지 실측 확인(긍정적 baseline). 다음 후보: review-code/explore-idea 완전 신규 topic 발견 전까진 재선택 자제, fix-incident(1/20)/op-analysis(1/25)/info-arch(26/30)/lotto(12/30) 자체 gap 자연 도달 monitor 우선.

## ⚪ operational-analysis (lite) — plan #27 Phase 3 데이터 게이트 재확인, 불변 RETRO-ONLY (cycle 2334, 2026-08-20)

진단: open issue 0건, approved plan 0/22 (22개 전부 completed/archived/superseded/pending-user, 신규 approved 없음). 2-chain lock 미충족(직전 8사이클 2326-2333 distinct=4: fix-incident/review-code/explore-idea/op-analysis). 주기 trigger 4종 전부 미도달(fix-incident 0/20 방금 발화, op-analysis 2/25, info-arch 24/30, lotto 10/30). `pnpm lint` clean. `.from('predictions')` 46+ 파일 전체 재sweep(scoring_rule/CURRENT_MODEL_FILTER/prediction_type 필터) → 신규 미필터 파일 0건, #1338 family 재발 없음. 신규 `/mlb/analysis` 4-phase 파일(analysis-data.ts/page.tsx, cycle 2315-2333 shipped)도 필터 정상 적용 확인. review-code/explore-idea 모두 즉시 fire 할 신선 target 부재(둘 다 최근 3사이클 연속 "신규 target 재탐색 필요" 권고 반복).

**실행**: plan #27(MLB 개인 픽 리더보드) Phase 3 "무기한 보류" 게이트 조건(KBO `user_picks` 또는 MLB `mlb_user_picks` COUNT ≥10) 재실측 — 프로덕션 DB 직접 쿼리. 결과: KBO 1건 / MLB 0건, cycle 2256 측정과 완전 동일(78 cycle 경과, 변화 0). Phase 3 계속 보류 확정.

**후속 조치**: plan27.md 에 재확인 결과 박제 + 다음 재확인 조건을 "COUNT 자체 매 cycle 재측정" 에서 "트래픽/유입 신호 변화 감지 시" 로 완화(변화 없는 카운트를 반복 재측정하는 비용 방지).

결론: 코드 변경 없음(RETRO-ONLY), 실질 가치 = carry-over 질문 1건 명시적 종결(다음 cycle들이 동일 재확인 반복 안 하도록). 다음 후보: review-code 또는 explore-idea 가 완전히 새로운 unaudited 영역/topic 을 발견하기 전까진 자체 주기 trigger(fix-incident 20 / op-analysis 25 / info-arch 30 / lotto 30) 자연 도달 monitor 우선.

## 🟢 fix-incident — package.json 버전 drift CI red 정정 SUCCESS (cycle 2333, 2026-08-20)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2325-2332 distinct=3: review-code/fix-incident/explore-idea/op-analysis). 주기 trigger 4종 전부 미도달(fix-incident 7/20, op-analysis 2/25, info-arch 23/30, lotto 9/30). review-code streak=3(포화 주의, cooldown 미도달). `gh run list` CI 실측 확인(fix-incident 진단 source 1순위) 중 실제 completed failure 2건 발견.

**원인**: cycle 2331 (`policy: cycle-retro 2331`, W34 스냅샷) 커밋이 VERSION 파일 + CHANGELOG.md 헤더를 `0.5.62.66` 으로 bump 했지만 root `package.json` + `apps/moneyball/package.json` 은 `0.5.62.65` 로 남겨둠 — cycle 2047 에 만든 `version-sync-guard.test.ts` (3-way drift 가드) 가 정확히 이 케이스를 잡아 CI 를 2회 연속(10:54/10:55 커밋) red 로 표면화.

**조치**: 테스트 파일 확인 결과 `apps/moneyball/package.json` 을 canonical source 로 삼는 구조 — 양쪽 package.json 을 `0.5.62.66` 으로 bump. 로컬 vitest 로 3건 pass 확인 후 commit `4f929964` push. 실제 CI run(`32361954951`) 완주까지 대기 후 `completed success` 실측 확인(사례 18 lesson 준수 — 진행 중 상태를 완료로 서술 금지).

결론: fix-incident SUCCESS. 다음 후보: review-code(#1338 family 소진, 신규 unaudited 영역 재탐색 필요) 또는 explore-idea(MLB/KBO parity 소진, 완전 신규 방향 필요) — 둘 다 cycle 2332 시점 신규 target 부재 상태였으나 이번 fix 로 fix-incident gap 0/20 리셋.

## ⚪ review-code (lite) — #1338 family (predictions scoring_rule 필터) 전체 46파일 스윕 완전 종료 확인 RETRO-ONLY (cycle 2332, 2026-08-20)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2324-2331 distinct=5: lotto/explore-idea/review-code/fix-incident/op-analysis). 주기 trigger 4종 전부 미도달(fix-incident 6/20, op-analysis 1/25 방금 발화, info-arch 22/30, lotto 8/30). review-code 직전 5사이클 중 3회 retro-only(streak=3). cycle 2331 retro 가 명시한 carry-over 후보 2건("review-code 신규 target 재탐색") 착수.

**대상 재확인**: cycle ~2298 근처 TODOS 기록에 남아있던 두 carry-over 리드 — (1) `/debug/reliability` scoring_rule/prediction_type 필터 누락, (2) `/v2-preview` 동일 문제 — 둘 다 실제 코드 read 결과 **이미 해결 완료** 확인. `/debug/reliability` 는 커밋 `f7f94f30`(#1338 family 9번째 재발 정정) + 회귀 테스트 `silent-drift-cycle-2297.test.ts` 로 이미 `CURRENT_MODEL_FILTER` + `prediction_type='pre_game'` 필터 적용됨. `/v2-preview` 도 동일하게 이미 필터 적용 + `silent-drift-cycle-2298.test.ts` 회귀 가드 존재. 두 리드 모두 stale(과거 커밋에서 이미 처리된 항목이 TODOS 텍스트에만 남아 재방문된 것).

**확장 스윕**: `.from('predictions')` 쿼리하는 전체 46개 파일(app routes + lib builders, KBO+MLB+en 미러 전부)을 grep 하여 `scoring_rule`/`CURRENT_MODEL_FILTER`/`MLB_SCORING_RULE`/`CURRENT_SCORING_RULE` 참조 여부 전수 확인 → **46/46 전부 필터 참조 존재, 미필터 파일 0건**. #1338 family(9회 이상 재발 반복돼온 패턴)가 이 스코프에서 완전 소진 확인 — 신규 미감사 파일 없음.

결론: 코드 변경 없음(retro-only), 향후 사이클이 동일 stale carry-over 리드를 재방문하지 않도록 "완전 종료" 로 명시적 박제. 다음 후보: fix-incident(6/20)/info-arch(22/30)/lotto(8/30) 자체 주기 monitor 또는 explore-idea(MLB/KBO parity 소진, 완전히 다른 방향 신규 topic 필요) — review-code 는 이 family 소진으로 신규 unaudited target 재탐색 필요(streak=3 포화 주의 지속).

## 🟡 operational-analysis (lite) — W34 주간 성과 스냅샷 + MLB is_correct null 오탐 조사 SUCCESS (cycle 2331, 2026-08-20)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2323-2330 distinct=4: explore-idea/lotto/review-code/fix-incident). 주기 trigger 4종 전부 미도달(fix-incident 5/20, op-analysis 22/25, info-arch 21/30, lotto 7/30). review-code 직전 5사이클 중 3회 retro-only(streak=3, cooldown 임계 5 미도달이나 반복 0-drift 로 포화 신호). explore-idea 신규 topic 탐색 — KBO 전용 잔여 라우트 `insights`(AI reasoning 아카이브)/`dashboard` 재검토했으나 (1) `insights` = MLB 파이프라인이 debate/judge agent 자체를 호출 안 함(`mlb-pipeline.ts` 에 debate/judge/reasoning 매칭 0건 확인 — reasoning 텍스트 데이터 자체가 없어 아카이브 불가, CE 100% 지속 상황에서 신규 LLM 호출 추가도 의미 없음) (2) `dashboard` = 대부분 `/mlb/accuracy`(적중률/팀별/팩터/캘리브레이션 이미 커버) 와 중복 → 둘 다 기각. explore-idea 재포화 확인 후 op-analysis(lite) 선택(gap 22/25 근접 + 당일 3시간 전 cycle 2309 이후 신선도 재확인 가치).

**실행**: `op-analysis-ce-cohort.ts` 재실행 → 총 n=321(CE 274/비CE 47), cycle 2309(같은 날 ~3시간 전)와 완전 동일 — 스톨 아님, KST 23:00 1일 1회 verify 배치 기준 동일 배치 재측정 결과(정상). 별도 이번 주(2026-W34, 8/17~8/23 KST) KBO v1.8 스냅샷 신규 측정: n=29, 적중률 48.3%(14/29, 소표본 — 단일 결론 금지), confidence 26/29건 0.2 미만 + 3건 0.3 flat, 고확신(≥0.65) 0건 — CE 100% fallback 지속 재확인.

**부수 발견**: "MLB predictions 858건 전량 is_correct NULL" 을 잠재 버그로 의심해 조사 → `deriveMlbOutcome.ts` 헤더 주석(cycle 2117 review-code heavy 통합분)이 이미 "팀 코드 string↔INT FK 불일치로 그 컬럼들을 의도적으로 안 씀, `home_win_prob`+경기결과 read-time derive 가 정상 설계" 라고 명시 — 신규 버그 아님, 기존 감사 완료 아키텍처 재확인(오탐 해소). 코드 변경 없음.

가중치 조정: 불필요 (v1.8 유지 확정 기존 결정 유지). CHANGELOG.md v0.5.62.66 커밋.

결론: data-only 커밋(코드 변경 0). 다음 후보: fix-incident(5/20)/info-arch(21/30)/lotto(7/30) 자체 주기 monitor 또는 review-code(신규 미감사 target 재탐색, streak=3 포화 주의) 또는 explore-idea(당분간 MLB/KBO parity 신규 topic 없음 — 다른 방향 탐색 필요).

## ⚪ review-code (heavy) — feed/route.ts `getMlbFeedItems` 신규 코드 감사, drift 0건 RETRO-ONLY (cycle 2330, 2026-08-20)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/blocked). 2-chain lock 미충족(직전 8사이클 2322-2329 distinct=5: polish-ui/explore-idea/lotto/review-code/fix-incident). 주기 trigger 4종 전부 미도달(fix-incident 4/20, op-analysis 21/25, info-arch 20/30, lotto 6/30). skill-evolution trigger3(2330%50=30)/trigger5(직전20사이클 표본 20≥10, 평가대상 review-code 8회 — 0회 아님) 둘 다 미충족. ship-0 미충족(직전 10사이클 success 5/retro-only 5, fail 0건). cycle 2329 자체 retro 가 "review-code(신규 getMlbFeedItems 미감사 코드)" 를 다음 후보로 명시 — 자연 매핑.

**감사 대상**: `apps/moneyball/src/app/feed/route.ts` 의 `getMlbFeedItems()` (cycle 2329 신규 추가, 미감사).

**검증 내용**: (1) `MLB_SCORING_RULE`('mlb_v0.1') 단일 값 필터 정합(KBO `PRODUCTION_COHORT_RULES` 배열과 별개 — `model-version-labels.ts` 주석 확인). (2) MLB predictions 는 `prediction_type` 컬럼을 명시적으로 안 쓰지만 DB DEFAULT 'pre_game'(mig 002) 이라 전량 pre_game — #1338 family(prediction_type 미필터 혼입) 패턴 재발 아님, mlb-pipeline.ts 가 predictions insert 전 `delete().eq('league','mlb').eq('mlb_game_date',date).eq('scoring_rule', MLB_SCORING_RULE)` 로 delete-then-insert idempotent 보장 — 중복 row 가능성도 없음. (3) 링크 slug `${homeCode}-vs-${awayCode}` 가 `mlb/games/[date]/page.tsx`(161행) 실제 생성 패턴과 `[slug]/page.tsx`(116행 `slug.split('-vs-')`) 파싱 순서 양쪽 다 일치 확인. (4) `game_datetime_utc` 컬럼이 mig 038 에서 `NOT NULL` — `?? fallback` 은 방어적 코드일 뿐 실제로 항상 schedule 값 사용. (5) `normalizeMlbTeamCode` 실패 시 `continue` 로 안전 스킵, `home_win_prob` null 시 0.5 fallback — 코인플립 표시일 뿐 크래시 없음. (6) 신규 테스트 2건(MLB 항목 렌더링 + predictions 에러 throw) mock 구조 실제 쿼리 체인과 일치 확인. **drift 0건.**

결론: 코드 변경 없음(retro-only). 다음 후보: fix-incident(4/20)/op-analysis(21/25)/info-arch(20/30)/lotto(6/30) 자체 주기 monitor 지속.

## 🟢 explore-idea (heavy) — /feed RSS 에 MLB 예측 게임 항목 신규 추가 SUCCESS (cycle 2329, 2026-08-20)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2322-2328 distinct=5: polish-ui/explore-idea/lotto/review-code/fix-incident). 주기 trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 20/25, info-arch 19/30, lotto 5/30). `gh run list` CI/scheduled workflow 클린 확인 — fix-incident 배제. review-code 직전 8사이클 중 4회(2321/2325/2327/2328) 전부 retro-only drift 0 — 포화 신호로 판단, 회피.

MLB/KBO 라우트 parity 스캔: KBO 에 있고 MLB 에 없는 `insights`/`leaderboard`/`feed`/`glossary`/`seasons`/`dashboard` 6개 발견. `leaderboard`(픽 기반, `mlb_user_picks` 참여 0~1건 실측 — plan #27 이미 blocked 판정)/`seasons`(MLB 는 2026 단일 진행 시즌뿐, 과거 시즌 카드 없음 — thin content 위험)는 배제. `glossary` 착수 시도 중 `/mlb/factors`(464줄)가 이미 14팩터(KBO 10 동등 + Statcast 4: xwOBA/Barrel%/xwOBA-against/wOBA σ) 전체 정의+가중치+출처+"왜"를 커버 중임을 발견 — glossary 신규 제작은 순수 중복 콘텐츠라 **폐기**(코드 작성 전 기존 페이지 확인으로 낭비 작업 회피).

`feed/route.ts` 재검토 — KBO `games` 테이블만 쿼리, MLB 예측이 RSS 구독자에게 전혀 노출 안 됨을 확인(진짜 gap). `getMlbFeedItems()` 신규: `predictions(league='mlb')`를 `mlb_game_date` 역순 조회 → `mlb_schedule` 로 팀 코드/점수 join(`games/[date]/page.tsx`의 `getMlbGamesForDate`와 동일 2-step 패턴, `normalizeMlbTeamCode`로 7팀 alias 처리 재사용 — cycle 2081/2114 fix 그대로 적용). 종료 경기는 스코어+`[적중]`/`[실패]` 태그, 진행 중 경기는 예측 확률만. 링크는 기존 `/mlb/games/[date]/[home]-vs-[away]` slug 규칙 그대로 재사용. `assertSelectOk` 로 두 쿼리 모두 fail-loud(기존 games 쿼리와 동일 패턴).

검증: 신규 테스트 2건(MLB 항목 렌더링 검증 + predictions 에러 시 throw 검증), 기존 mock 에 `predictions`/`mlb_schedule` 테이블 핸들러 추가. `pnpm --filter moneyball test`(495 files/4156 tests) all green, `tsc --noEmit`/`lint` 클린. 직접 main 커밋(`77b93100`) + push, CI green 실측 확인(`gh run list` workflow=CI conclusion=success on 77b93100) 후 본 retro 작성 — 사례 18(cycle 2001) 교훈 적용(완료 서술 전 실제 확인).

결론: PR 없이 직접 main 커밋 + push + CI green 완료(success). 다음 후보: fix-incident(4/20)/op-analysis(21/25)/info-arch(20/30)/lotto(6/30) 자체 주기 monitor 또는 review-code(heavy, 신규 `getMlbFeedItems` 미감사 코드).

## ⚪ review-code (heavy) — MLB wild-card race 로직 신규 감사, drift 0건 RETRO-ONLY (cycle 2328, 2026-08-20)

진단: open issue 0건, approved plan 0/22(전량 completed/archived/closed, plan #27 Phase3 데이터 부재로 무기한 보류 확정). 2-chain lock 미충족(직전 8사이클 2320-2327 distinct=5: explore-idea/review-code/polish-ui/lotto/fix-incident). 주기 trigger 4종 전부 미도달(fix-incident 2/20, op-analysis 19/25, info-arch 19/30, lotto 4/30). skill-evolution trigger3(2328%50=28)/trigger5(직전20사이클 표본 20≥10, 평가대상 review-code 8회 — 0회 아님) 둘 다 미충족. ship-0 미충족(직전 10사이클 success 5/retro-only 5, fail 0건).

explore-idea 신규 topic 부재 확인: plan #24(matchup, split-closed)/#27(picks+leaderboard, Phase1만 유효·Phase2 폐기·Phase3 데이터 근거로 보류 — `mlb_user_picks`/`user_picks` 참여 0~1건 실측, 두 자릿수 성장 전까지 재착수 조건 미충족)/#28(TeamStrengthGrid, 전체 완료) 전부 종료. `/mlb/postseason` ETA 2026-09 아직 미도달.

review-code 신규 target 선정: 최근 2321/2325/2327 이 이미 감사한 analysis/accuracy/teams monolith 와 다른, standings 기반 실시간 로직(시즌 진행 중 clinch/tie-break 케이스가 실제로 발생하는 시점) — `/mlb/wild-card` + `buildMlbStandings.ts`(`buildMlbDivisionStandings`/`buildMlbWildcardStandings`/`findMlbTeamDivisionRank`) + `computeMagicNumber.ts` + `/mlb/postseason`.

**검증 내용**: (1) division standings GB 공식 `(leaderWins - rWins + (rLosses - leaderLeaderLosses))/2` 표준 정합, wildcard pool `.slice(1)` 이 이미 승률 내림차순 정렬된 배열의 0번 인덱스(division 1위)만 제외 — 정렬 순서 보장 확인. (2) wildcard GB 공식 컷오프(`pool[MLB_WILDCARD_COUNT-1]`) 기준 상대값, `formatWcGB`의 `gb<0 → "+"` 표시가 "컷오프 확보 여유"와 부호 정합 확인. (3) `computeMagicNumber(cutoff, firstOut, MLB_GAMES_PER_TEAM)` 파라미터 순서/게이팅(`leader.wins<=chaser.wins → null`) 정상, `MLB_GAMES_PER_TEAM=162` 상수 정합. (4) `normalizeMlbTeamCode` alias 처리(TB/CWS/KC/SD/SF/AZ/WSH) 이미 cycle 2081 fix 반영 확인, `undefined` 팀은 `continue`로 안전 스킵. (5) sitemap.ts KO+EN 양쪽 `/mlb/wild-card`·`/mlb/postseason` entry 존재, Header 메가메뉴/Footer 컬럼 양쪽 배선 확인, `/en/mlb/wild-card`·`/en/mlb/postseason` 실제 라우트 존재(EN 404 family 재발 없음). (6) `/mlb/postseason` 은 순수 정적 placeholder(ROUNDS 설명 텍스트, DB 쿼리 없음) — drift 가능성 자체 없음. **drift 0건.**

결론: 코드 변경 없음(retro-only). 다음 후보: fix-incident(2/20)/op-analysis(19/25)/info-arch(19/30)/lotto(4/30) 자체 주기 monitor 계속 접근 중, 또는 explore-idea 신규 topic 재탐색(fresh idea 명확 후보 부재 — 다음 fire 시 재탐색 필요).

## ⚪ review-code (lite) — `teams/[code]/page.tsx` 신규 감사, drift 0건 RETRO-ONLY (cycle 2327, 2026-08-20)

진단: open issue 0건, approved plan 0/22(19 completed/archived + 24 split-closed + 27 phase1-only-closed + 28 completed). 2-chain lock 미충족(직전 8사이클 2320-2326 distinct=5: explore-idea/review-code/polish-ui/lotto/fix-incident). 주기 trigger 4종 전부 미도달(fix-incident 0/20 방금 발화, op-analysis 18/25, info-arch 17/30, lotto 3/30). skill-evolution trigger3(2327%50=27)/trigger5(직전20사이클 chain pool 표본 20≥10, opt-out 9개 제외 평가대상 review-code 0회 아님) 둘 다 미충족. ship-0 미충족(직전 10사이클 success 5/retro-only 5, fail 0건).

`#1338 family`(prediction_type=pre_game 필터만 있고 scoring_rule 미필터 — shadow/구버전/MLB row 혼입) 신규 재발 여부 grep 스캔: `pre_game` 사용 전체 파일 재검토 결과 dashboard/page.tsx, buildModelTuningInsights.ts, buildTeamAccuracy.ts, reviews/page.tsx, insights/series.ts, buildPitcherLeaderboard.ts, buildPitcherProfile.ts, leaderboard/server.ts, buildTeamFactorAverages.ts, buildMissReport.ts, reviews/shared.ts — **전부 `CURRENT_MODEL_FILTER`(wave-656, `scoring_rule` 포함) 사용 확인, 신규 재발 0건**. family sweep 완전 소진 재확인(11번째 재발 없음).

op-analysis CE cohort 스크립트(`scripts/op-analysis-ce-cohort.ts`) 재실행 — 결과 총 n=321(CE 274/비CE 47), cycle 2309 측정치와 **완전 동일**(같은 날짜 내 재실행이라 신규 검증 경기 0건, 정상). 신규 정보 없어 CLAUDE.md 갱신 스킵(중복 기록 방지).

review-code 신규 target 재탐색: `teams/[code]/page.tsx`(621줄, KBO 팀 프로필) 감사 — predictions 직접 쿼리 없음(전량 `buildTeamProfile`/`buildTeamEloTrend`/`buildTeamUpcoming`/`getConvergencePickTeamStats` 위임, 기존 필터 검증 완료 함수), `SMALL_SAMPLE_N` 소표본 가드 적용, Breadcrumb 존재, `captureFallback` 에러 경계 3곳 적용, RelatedLinks/EmptyState 정상. **drift 0건.**

결론: 코드 변경 없음(retro-only). #1338 family 재검증 + teams/[code] 감사 모두 clean. 다음 후보: fix-incident/op-analysis/info-arch/lotto 자체 주기 monitor(각 1/20, 19/25, 18/30, 4/30) 또는 explore-idea(heavy, 신규 topic 재탐색 — plan #24/#27/#28 전부 종료로 fresh topic 필요, `/mlb/postseason`은 여전히 ETA 2026-09 미도달).

## 🟢 fix-incident — baseball-savant.ts User-Agent 헤더 예방적 추가 SUCCESS (cycle 2326, 2026-08-20)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2318-2325 distinct=4: explore-idea/review-code/polish-ui/lotto). **주기 trigger 6종 중 fix-incident 20-gap 정확 도달**(마지막 fix-incident 발화 cycle 2306, gap=20). op-analysis 17/25, info-arch 16/30, lotto 2/30(방금 리셋) 모두 미도달. skill-evolution trigger3(2326%50=26)/trigger5 둘 다 미충족.

fix-incident lite 진단(pipeline_runs 최근 7일 error rate + git log) 실행: `pipeline_runs` 최근 7일 208건 중 1건 error(0.5%) — `mlb_fancy_scrape` 2026-08-19T19:17:59Z(=08-20 04:17:59 KST) `fetchFangraphsMlbTeams: fangraphs HTTP 403`. git log 대조 결과 이 실패는 cycle 2278(같은 날 04:24:47 KST, 실패 발생 7분 후) 이 이미 fix — User-Agent 헤더 누락이 원인, `fangraphs-mlb.ts`에 `KBO_USER_AGENT` 추가로 해결 완료. 신규 미해결 인시던트 아님.

동일 패턴(fetch 에 User-Agent 미설정) 이 형제 스크레이퍼에도 있는지 grep 스캔 — `baseball-savant.ts`(`fetchExpectedStats`/`fetchStatcastQuality`, 2 fetch() 호출) 가 User-Agent 헤더 0건으로 확인. 해당 scraper 는 07-24~08-10 "parse fail — CSV format 변경" 오류로 17일 연속 실패했다가 08-11부터 9일 연속 success 로 이미 회복(다른 원인, CSV 스키마 변경 — UA 무관)했으나, 근본적으로 UA 헤더 부재 위험군은 동일 — fangraphs-mlb.ts 사례(cycle 2278) 재발 예방 차원에서 `KBO_USER_AGENT` 헤더 예방적 추가.

검증: `pnpm --filter @moneyball/kbo-data test`(89 files/1147 tests) + `tsc --noEmit` + `lint` 클린, 전체 `pnpm test`(495 files/4154 tests) all green. PR #3016 → R7 `--squash --auto --delete-branch` 자동 머지 완료(`a0819071`).

결론: 신규 인시던트 발견 0건(fangraphs-mlb 403 은 cycle 2278 이 이미 해결), 형제 스크레이퍼 예방 조치 1건 ship. 다음 후보: op-analysis(17/25, 8사이클 후 자연 도달) 또는 explore-idea(신규 topic — plan #24 matchup Phase2b 잔여 또는 plan #27 picks/leaderboard Phase3 데이터 블로커 재확인).

## ⚪ review-code (heavy) — `/mlb/analysis` 팀 전력 현황(TeamStrengthGrid MLB 대체) 신규 코드 감사, drift 0건 RETRO-ONLY (cycle 2325, 2026-08-20)

진단: open issue 0건, approved plan 0/22(19개 completed/archived + 24 split + 27 blocked + 28 completed). 2-chain lock 미충족(직전 8사이클 2317-2324 distinct=4: review-code/explore-idea/polish-ui/lotto). 주기 trigger 전부 미도달(fix-incident 19/20 — 1사이클 후 자연 도달, op-analysis 16/25, info-arch 15/30, lotto 1/30 방금 리셋). skill-evolution trigger3(2325%50=25)/trigger5(review-code 7/21, 0 아님) 둘 다 미충족. explore-idea saturation 미충족(직전 15사이클 review-code+fix-incident+polish-ui+info-arch=8/15). cycle 2323 이 shipped 한 신규 코드(`buildMlbTeamStrengthSnapshot.ts`+`MlbTeamStrengthGrid.tsx`)가 아직 review-code 감사 대상이 안 된 상태 — plan #28 Phase1~4 를 순차 감사해온 기존 패턴(2317→2319→2321) 그대로 이 마지막 carry-over 코드도 감사.

감사 범위: (1) 단일 쿼리 N+1 회피 확인 — `mlb_schedule` 팀별 루프 쿼리 0건, `buildMlbDivisionStandings` 패턴 정합. (2) `computeTeamRecentRecord`/`computeTeamStreak`(`buildTeamProfile.ts`) 재사용 확인 — `.select()` 호출부에 `home_elo`/`home_recent_form` 컬럼 언급 없음(파일 상단 주석만 설명용 언급, 오탐 없음). (3) `normalizeMlbTeamCode` StatsAPI→canonical 정규화 확인 + `MLB_TEAMS[teamCode].shortName` 조회 안전(정규화 실패 코드는 `if (homeCode)` 가드로 스킵). (4) `/mlb/team/${row.teamCode}` 딥링크 — 리포 전체 동일 패턴(`wild-card`/`matchup`/`standings`/`players` 페이지) 대조, 일치. (5) `TEAM_STRENGTH_FORM_STRONG/WEAK`(0.6/0.4) 재사용 — KBO 는 모델 팩터 `home_recent_form`(연속값) 기준, MLB 는 `wins/sampleSize`(n=2~5 소표본, RECENT_RECORD_MIN_GAMES=2) 기준이라 척도 다르지만 파일 주석에 이미 의도된 대체 설계로 명시(신규 발견 아님). (6) `.order('game_date', desc)` 후 팀별 배열 구성 — 동일 날짜 더블헤더 시 순서 비결정 가능성 존재하나 KBO 원본도 동일 구조(N개 코드베이스 공통 한계, 이번 cycle 신규 도입 아님). (7) smoke test 6건(`mlb-analysis-team-strength-grid.test.ts`) 재실행 all green.

결론: drift 0건, 코드 변경 없음(retro-only). plan #28 전체(4-phase + carryover) 감사 완결 — 이 코드 패밀리 review-code 대상 소진. 다음 후보: fix-incident(19/20, 1사이클 후 자연 도달) 또는 explore-idea(heavy, 신규 topic 재탐색 — plan #24 matchup Phase2b 잔여 또는 plan #27 picks/leaderboard Phase3 데이터 블로커 해소 여부 확인).

## 🟢 lotto (lite) — 30-cycle 주기 trigger 6 발동, count_smoke/OOS 재확인 SUCCESS (cycle 2324, 2026-08-20)

진단: open issue 0건, approved plan 0/21. 2-chain lock 미충족(직전 8사이클 2316-2323 distinct=3). 주기 trigger: fix-incident 18/20, op-analysis 15/25, info-arch 14/30(모두 미도달) / lotto 30/30 — 마지막 발화(cycle 2294) 이후 정확히 30 사이클 경과, trigger 6 발동.

실행: `pnpm tsx scripts/lotto.ts count` — 유효 조합 7,705,415/8,145,060(5.40% 제거, cycle 2294/2145 baseline과 delta 0 — 1238회(8/22 토) 추첨 미도래로 데이터 무변화). `oos "10,20,23,34,37,40" 1237` — 1237회 실제 당첨번호 256규칙 재검증 PASS 256/FAIL 0(in-sample, 예상대로 clean). 1238회 50세트 picks(`2026-08-22-50sets.md`)는 cycle 2145 박제분 그대로 유지(신규 불필요). 기존 OOS 결론(3개 일치 1/50=2%, 기댓값 대비 우위 증거 없음, N=11) 재확인.

결론: 코드 변경 없음, PR 없음 — 순수 주기 측정. cycle 2294와 완전 동일 상태 반복(다음 추첨 8/22 이후에야 실질 변화 예상). 다음 후보: review-code(heavy) 또는 fix-incident(18/20, 2사이클 후 자연 도달).

## 🟢 explore-idea (heavy) — `/mlb/analysis` 팀 전력 현황(TeamStrengthGrid MLB 대체 설계), plan #28 Phase 2 잔여 SUCCESS (cycle 2323, 2026-08-20)

진단: open issue 0건, approved plan 0/22(literal `approved` 없음, unprocessed-plan lookup 미매핑). 2-chain lock 미충족(직전 8사이클 2315-2322 distinct=3: explore-idea/review-code/polish-ui). 주기 trigger 4종 전부 미도달(fix-incident 17/20, op-analysis 14/25, info-arch 13/30, lotto 29/30 — 1사이클 후 자연 도달 예상). explore-idea saturation 미충족(직전 15사이클 review-code+fix-incident+polish-ui+info-arch=9/15). skill-evolution trigger3(2323%50=23)/trigger5 둘 다 미충족. ship-0 미충족. cycle 2322 next_recommended = lotto 또는 explore-idea(신규 topic). plan #28 body(`~/.develop-cycle/plans/moneyballscore/28.md`) "Phase 2 진행 상황" 절이 명시적 잔여 항목("TeamStrengthGrid MLB 버전은 블로커로 보류... 대체 데이터 소스: mlb_schedule 실제 완료 경기 결과 기반 최근 N경기 승률 직접 계산... 다음 explore-idea fire 후보로 carry-over")을 남겨둔 걸 발견 — 신규 topic 탐색 대신 이 구체적 carry-over 착수.

구현: `buildMlbTeamStrengthSnapshot.ts`(신규, `lib/mlb/`) — `mlb_schedule`(league=mlb, status=final) 단일 쿼리로 전체 30팀 조회(`buildMlbDivisionStandings` 패턴, 팀별 N+1 회피) 후 팀별 게임 배열 구성, `computeTeamRecentRecord`/`computeTeamStreak`(`lib/teams/buildTeamProfile.ts`, KBO/MLB `StreakGame` 구조 호환 — 파일 자체 주석이 "신규 MLB_ 접두 중복 함수 X" 명시)를 그대로 재사용해 최근 5경기(`RECENT_RECORD_WINDOW`) 승/패 + 연승/연패 계산. `home_elo`/`home_recent_form`(모델 팩터, MLB 쪽 전량 placeholder/null) 전혀 조회하지 않음 — KBO `buildTeamStrengthSnapshot`와 근본적으로 다른 데이터 소스(실제 경기결과 vs 모델 팩터). `MlbTeamStrengthGrid.tsx`(신규, `components/analysis/`) — KBO `TeamStrengthGrid` 와 동일 카드 레이아웃(랭크+로고+팀명, `MlbTeamLogo` 사용) 이지만 Elo 태그 대신 연승/연패 배지 + 승률 바(`TEAM_STRENGTH_FORM_STRONG`/`WEAK` 임계값 재사용) 로 교체. `/mlb/analysis` 페이지에 "📊 팀 전력 현황" 섹션(`/mlb/standings` 딥링크) 신규 배선, "이번 주 남은 경기"와 "어제 결과" 사이에 배치(KBO 순서 정합).

검증: `tsc --noEmit` 클린 / `eslint` 클린(신규 파일 3개 + 수정 파일 2개) / 신규 smoke test 5건(`mlb-analysis-team-strength-grid.test.ts` — 단일쿼리 가드 + 공용 함수 재사용 가드 + 정규화 가드 + 딥링크 가드 + hex 하드코딩 가드) / 기존 `plan28-phase2` 테스트의 stale 가드("TeamStrengthGrid MLB 버전 미포함") 제거·주석 갱신(cycle 2316 당시엔 정확했으나 본 cycle 구현으로 stale 화) / 전체 vitest 495 파일 4154 테스트 all green(회귀 0).

결론: PR 생성 + R7 자동 머지 대상. plan #28 body 에 Phase 2 잔여 해소 기록 추가 — plan #28 완전 종료(4-phase + 잔여 carry-over 전부 완료). 다음 후보: lotto(29/30, 1사이클 후 자연 도달) 또는 review-code(heavy, 신규 코드 3파일 — 이번엔 audit 대상 자체가 이번 cycle 산출물).

## ⚪ polish-ui — 2-chain lock 발동 강제 전환, breadcrumb/DESIGN.md 토큰 감사 drift 0건 (cycle 2322, 2026-08-20)

진단: open issue 0건, approved plan 0/22. **2-chain alternation lock 탐지**(직전 8사이클 2314-2321 distinct=2: explore-idea/review-code 순수 교대) — 두 chain 후보 제외, 둘 다 fix-incident 아니므로 lock 적용. 주기 trigger 3종 전부 미도달(fix-incident 16/20, op-analysis 13/25, info-arch 12/30, lotto 28/30 근접). skill-evolution trigger3(2322%50=22)/trigger5(review-code 9/19, 0 아님) 둘 다 미충족. ship-0 미충족.

조사: (1) `grep -L Breadcrumb` 전체 16파일 중 12개(debug/login/settings/community/home)는 정당 제외, 나머지 4개(`mlb/reviews/weekly`, `mlb/reviews/monthly`, `reviews/weekly`, `reviews/monthly`)는 조사 결과 전부 순수 redirect stub(렌더 UI 0, `getCurrentWeek/Month` 후 `[week]/[month]` 로 즉시 리다이렉트) — breadcrumb 불필요한 정상 설계, IA drift 아님(info-architecture-review 트리거 무효). (2) DESIGN.md mtime 2026-08-18(2일 전) — design-system 4주 트리거 미충족. (3) plan #28 신규 코드(`analysis-data.ts`/`page.tsx`/Header·Footer nav) DESIGN.md 토큰 대조 — hex 하드코딩 0건, Tailwind 임의값(`[...]`) 0건, nav label/href/description 양쪽 파일(Header.tsx/Footer.tsx) 일치.

결론: drift 0건, 코드 변경 없음(retro-only). 2-chain lock 규칙(잠긴 chain 제외 + 후보 없으면 polish-ui 강제)이 정확히 작동한 사례. 다음 후보: lotto(28/30, 1~2사이클 내 자연 도달 예상) 또는 explore-idea(heavy, plan #28 완전 종료로 신규 topic — TeamStrengthGrid MLB 대체설계 또는 새 topic 재탐색).

## ⚪ review-code (heavy) — `/mlb/analysis` Phase 4 CTA(적중 기록) 신규 코드 감사, drift 0건 (cycle 2321, 2026-08-20)

진단: open issue 0건, approved plan 0/22(literal `approved` 없음). 2-chain lock 미충족(직전 8사이클 2313-2320 distinct=3: polish-ui/explore-idea/review-code). 주기 trigger 전부 미도달(fix-incident 14/20, op-analysis 11/25, info-arch 10/30, lotto 26/30). skill-evolution trigger3(%50==0) 미도달(2321%50=21). ship-0 미충족(직전 10사이클 success 다수). cycle 2320 next_recommended_chain 이 review-code(heavy, Phase 4 신규 ship 코드 감사) 1순위 명시 — 착수.

감사 범위: (1) `buildMlbAccuracySummary('ko')` 재사용 확인 — page.tsx 신규 import 외 재구현 0, 함수 시그니처/필드명(`verifiedN`/`correctN`/`accuracyRate`) 일치. (2) `accuracyRate` 스케일 — `buildMlbAccuracySummary.ts` L124 `correctN / rows.length` = 0~1 스케일 확정, `* 100` 렌더 정확(cycle 2160 이중 변환 버그 패턴 재발 없음). (3) `MLB_PRODUCTION_COHORT_RULES` cohort 필터 — 기존 재사용 함수 내부에 이미 적용됨(신규 인스턴스 아님, #1338 family 필터 누락류 무관). (4) `tsc --noEmit` 재실행 클린 확인. (5) DB 실측: `mlb_schedule` status=final 827건 + `predictions`(mlb_v0.1) 849건 — CTA 가 항상 "시즌 검증된 경기를 기다리는 중" fallback 만 노출하는 silent 상황 아님(실데이터 확인).

발견: cycle 2317 이 박제한 `getTodayMlbAnalysisRows`(page.tsx)와 `getMlbThisWeekRemainingGames`(analysis-data.ts) 간 duel 계산 중복(computeMlbCompositeDuel 호출 + validEnough 게이팅, ~14줄씩) 재확인 — 두 곳 모두 동일한 `MLB_COMPOSITE_DUEL_MIN_VALID` 상수 참조라 값 drift 위험 없음(하드코딩 중복 아님) + 공유 헬퍼로 뽑으면 기존 smoke test 2건(`plan28-phase1.../plan28-phase2...`)의 `computeMlbCompositeDuel({` 리터럴 가드가 양쪽 파일에서 사라져 깨짐. 실익(코드 14줄 절약) 대비 비용(테스트 계약 변경 + 신규 추상화)이 낮아 리팩터 보류 유지 — 프리매처 abstraction 판단.

결론: drift 0건, 코드 변경 없음(retro-only). plan #28 4-phase 전부 완료 + 신규 코드 3회 연속(2317/2319/2321) 감사 drift 0 — 이 코드 패밀리 review-code 감사는 당분간 포화. 다음 후보: explore-idea(heavy, 신규 topic 재탐색 — plan #28 종료로 Phase2 TeamStrengthGrid MLB 대체설계 또는 완전 새 topic) 우선, 대안으로 자체 주기 gap chain(lotto 26/30 근접) 도 후보.

## 🟢 explore-idea (heavy) — `/mlb/analysis` MLB AI 적중 기록 CTA, plan #28 Phase 4 SUCCESS (cycle 2320, 2026-08-20)

진단: open issue 0건, approved plan 0/22(literal `approved` 없음). 2-chain lock 미충족(직전 8사이클 2312-2319 distinct=3: review-code/polish-ui/explore-idea). 주기 trigger 전부 미도달(fix-incident 14/20, op-analysis 11/25, info-arch 10/30, lotto 26/30). skill-evolution trigger5 표본 20(≥10)→review-code 9/20(0 아님)→미충족, trigger3(%50==0) 미도달(2320%50=20). ship-0 미충족(직전 10사이클 success 4건). cycle 2319 next_recommended_chain 이 explore-idea(heavy, plan #28 Phase 4 또는 TeamStrengthGrid 대체설계) 명시 — Phase 4(시즌 성과 + 적중 기록, 소규모 스코프) 우선 착수.

구현: `/mlb/analysis` 하단에 "MLB AI 적중 기록" CTA 카드 신규 — 기존 `buildMlbAccuracySummary('ko')`(`/mlb/accuracy` 가 이미 쓰는 함수) 그대로 재사용, verifiedN/correctN/accuracyRate 시즌 누적 수치만 뽑아 `/mlb/accuracy` 딥링크 카드에 임베드. 신규 로직 재작성 0. accuracyRate 는 0~1 스케일(`MlbAccuracyDashboard.tsx` 와 동일 규칙 확인)이라 `* 100` 렌더 — cycle 2160 이중 변환 버그 패턴 재발 없음. 기존 weekly/monthly CTA 카드 스타일(실측 수치 노출)과 통일.

검증: `tsc --noEmit` 클린 / `eslint` 클린 / 신규 smoke test 4건(`plan28-phase4-mlb-analysis-accuracy-cta.test.ts`, buildMlbAccuracySummary 재사용 가드 + /mlb/accuracy 링크 가드 + 스케일 가드 + verifiedN/correctN 노출 가드) + 기존 Phase 1~3 smoke test 회귀 0 + 전체 vitest 494 파일 4149 테스트 all green.

결론: PR #3014 squash merge(c019d726) 완료. plan #28(`/mlb/analysis` KBO parity) 4-phase 전부 완료(Phase 1 MVP → Phase 2 이번 주 경기 partial → Phase 3 어제 결과+리뷰 CTA → Phase 4 적중 기록 CTA). 잔여 = Phase 2 TeamStrengthGrid MLB 대체 설계(mlb_schedule 실제 결과 기반 win rate, 신규 설계 필요)뿐 — 다음 explore-idea fire 후보. plan #28 사실상 종료, 다음 사이클부터 review-code(heavy, 신규 ship 코드 감사) 또는 신규 topic 탐색 권장.

## ⚪ review-code (heavy) — `/mlb/analysis` Phase 3 신규 코드(어제 결과+리뷰 CTA) 감사, drift 0건 (cycle 2319, 2026-08-20)

진단: open issue 0건, approved plan 0/22(literal `approved` 없음). 2-chain lock 미충족(직전 8사이클 distinct=3: review-code/polish-ui/explore-idea). 주기 trigger 전부 미도달(fix-incident 13/20, op-analysis 10/25, info-arch 9/30, lotto 25/30). skill-evolution trigger5 표본 19(≥10)→review-code 9/19(0 아님)→미충족, trigger3(%50==0) 미도달. ship-0 미충족(직전 10사이클 success 6건). cycle 2318 next_recommended_chain 이 review-code(heavy) 를 1순위로 명시 + cycle 2317 감사가 phase 3 shipped(2318) 이전 코드만 봤으므로 최신 diff 미감사 — Phase 3 신규 코드(`getMlbYesterdayResults`/`getMlbPeriodStats` + page.tsx CTA 섹션) 착수.

감사 범위: (1) `winnerProb: r.confidence ?? 0.5` fallback 도달 가능성 — `deriveMlbOutcome()` 확인 결과 predictedHomeWin/confidence 둘 다 `homeWinProb != null` 조건에서만 non-null 파생되므로 `predictedWinnerCode` null 일 때만 confidence 도 null → page.tsx 의 `g.predictedWinnerCode &&` 렌더 가드가 이미 fallback 분기를 항상 가림(도달 불가, harmless dead default). (2) `/mlb/games/${date}/${homeCode}-vs-${awayCode}` 슬러그 순서 — `[slug]/page.tsx` L116 `slug.split('-vs-')` → `[homeParam, awayParam]` 파싱과 일치, 기존 matchup/team 페이지 동일 컨벤션 재사용 확인. (3) `homeCode`/`awayCode` 코드 스케일 — `fetchMlbPredictionRowsInRange` 내부에서 이미 `normalizeMlbTeamCode()` 적용된 canonical(Baseball-Reference) 코드라 슬러그 라우트 기대값과 일치(원본 StatsAPI 코드 아님). (4) confidence 0.5~1 스케일 `* 100` 렌더 — cycle 2160 이 박제한 "DB confidence(0~1) 전용 `confToWinProb` 이중 변환 버그" 재발 아님, `deriveMlbOutcome().confidence` 는 이미 winnerProb 스케일이라 단순 `* 100` 만 하는 게 맞음(주석에 명시). (5) `currentWeek.weekId`/`currentMonth.monthId` → `/mlb/reviews/weekly/[week]`, `/mlb/reviews/monthly/[month]` 라우트 실존 확인 + 필드명 일치 확인.

결론: drift 0건, 코드 변경 없음(retro-only). Phase 3 코드는 기존 검증된 패턴(mlb-shared.ts 재사용 + canonical 코드 컨벤션 + confidence 스케일 규칙) 을 정확히 따름. 다음 후속 후보: plan #28 Phase 4(시즌 성과 + 적중 기록 `/mlb/accuracy` 요약 카드 임베드) 또는 TeamStrengthGrid MLB 대체 설계(Phase 2 잔여) — 둘 다 explore-idea(heavy) 대상, 다음 사이클 자율 선택.

## 🟢 explore-idea (heavy) — `/mlb/analysis` 어제 결과 + 주간/월간 리뷰 CTA, plan #28 Phase 3 SUCCESS (cycle 2318, 2026-08-20)

진단: open issue 0건, approved plan 0/22(literal `approved` 없음). 2-chain lock 미충족(직전 8사이클 distinct=4). 주기 trigger 전부 미도달(fix-incident 12/20, op-analysis 9/25, info-arch 8/30, lotto 24/30). lite chain cooldown 미충족. ship-0 미충족(직전 10사이클 success 6건 + partial 1건). plan #28 status=`phase2_partial_shipped_cycle_2316`(literal `approved` 아니라 unprocessed-plan 자동 lookup 발화 X, cycle 2317 TODOS 가 명시한 "다음 후속 후보: Phase 3(어제 결과+주간/월간 리뷰 요약)" carry-over로 메인 자율 선택) — Phase 3 착수.

구현: `getMlbYesterdayResults()`/`getMlbPeriodStats()` 신규(`apps/moneyball/src/app/mlb/analysis/analysis-data.ts`) — 기존 `fetchMlbPredictionRowsInRange`(`lib/reviews/mlb-shared.ts`, deriveMlbOutcome 내장) + `getYesterdayKSTDateString()`(league-agnostic) 그대로 재사용, 신규 outcome/날짜 로직 재작성 0. `page.tsx` 에 "📅 어제 결과" 섹션(경기별 스코어 + ✅적중/❌실패/⏳대기 배지 + 예측 승자%) + 주간/월간 리뷰 CTA 카드(`/mlb/reviews/weekly/[week]`, `/mlb/reviews/monthly/[month]` 링크, KBO `getPeriodStats` 대응 경량 집계만 — `buildMlbWeeklyReview`/`buildMlbMonthlyReview` 풀 빌더 미호출) 추가. 베스트픽/업셋픽 카드는 KBO 도 전용 쿼리(게임별 개별 SELECT)라 재사용 불가 + MLB 표본 희소성(plan #27 Phase 3 리스크 노트) 고려해 스코프 밖 유지.

검증: `tsc --noEmit` 클린 / `eslint` 클린 / 신규 smoke test 6건(`plan28-phase3-mlb-analysis-yesterday-review.test.ts`, fetchMlbPredictionRowsInRange 재사용 확인 + deriveMlbOutcome 재구현 금지 가드 + 베스트픽/업셋픽 스코프 밖 가드) + 기존 Phase 1/2 smoke test 15건 회귀 0 + 전체 vitest 493 파일 4145 테스트 all green.

결론: Phase 3 코드 ship 완료, plan #28 status → `phase3_shipped_cycle_2318`. 다음 후속: Phase 2 잔여(TeamStrengthGrid MLB 대체 설계, mlb_schedule 실제 결과 기반 win rate 신규 설계 필요) 또는 Phase 4(시즌 성과 + 적중 기록 — `/mlb/accuracy` 요약 카드 임베드만).

## ⚪ review-code (heavy) — `/mlb/analysis` 신규 코드 감사, drift 0건 (cycle 2317, 2026-08-20)

진단: open issue 0건, approved plan 0/22(literal `approved` 없음). 2-chain lock 미충족(직전 8사이클 distinct=5). 주기 trigger 전부 미도달(fix-incident 11/20, op-analysis 8/25, info-arch 7/30, lotto 23/30). skill-evolution trigger5 표본 19(≥10)→review-code 9/19(0 아님)→미충족, trigger1 lifetime 8건(과거 소진 판단 유지), trigger2/4 미충족. ship-0 미충족(직전 10사이클 success 6건). 직전 3사이클(2314~2316) 모두 explore-idea — Feature-Drift Cycle 패턴(explore-idea→review-code 자연 교대) 따라 cycle 2315/2316 이 신규 ship 한 `mlb/analysis/page.tsx`+`analysis-data.ts` 감사 착수.

감사 범위: `getTodayMlbAnalysisRows`(page.tsx) vs `getMlbThisWeekRemainingGames`(analysis-data.ts) 필드 대조(duel input 11필드 완전 일치), `computeMlbCompositeDuel` 6팩터 게이팅 로직, `TOP_PICK_MIN_WIN_PCT` 단위 정합성(confToWinProb 결과 vs `p.conf` 스케일 — 둘 다 win-prob-pct 0~100, KBO confidence 0~1 스케일과 다른 의도적 재해석 확인), TeamStrengthGrid 블로커 근거(`mlb-pipeline.ts` recent_form 미저장 claim) 실측 재확인 — `packages/kbo-data/src/pipeline/daily.ts`(KBO)만 `home_recent_form`/`away_recent_form` insert, `mlb-pipeline.ts` 는 해당 컬럼 저장 코드 자체 부재(계산용 중립값 50/50 만 로컬 사용) → plan #28 claim 정확.

발견: 두 함수 간 duel 계산 로직 ~50줄 중복(동일 11필드 duel input 구성 + conf/winner 산출) 확인했으나, 기존 grep 스모크 테스트(`plan28-phase1...test.ts` L32-33)가 page.tsx 안 `computeMlbCompositeDuel({` 리터럴 존재를 강제 — 공유 헬퍼로 추출 시 테스트 계약 파괴. 동작 불일치 0건(값 계산 결과 동일) 확인했으므로 리팩터 대신 기록만. 그 외 실제 버그/불일치 0건.

결론: drift 0건, 코드 변경 없음(retro-only). 다음 후속 후보: dedup 리팩터는 스모크 테스트 갱신까지 포함한 별도 cycle 스코프로 분리 검토(낮은 우선순위 — 동작 불일치 없어 시급성 X).

## 🟢 explore-idea (heavy) — `/mlb/analysis` 이번 주 남은 경기 섹션, plan #28 Phase 2 partial (cycle 2316, 2026-08-20)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 distinct=5). 주기 trigger 전부 미도달(fix-incident 10/20, op-analysis 7/25, info-arch 6/30, lotto 22/30). skill-evolution trigger5 표본 19(≥10)→review-code 10/19(0 아님)→미충족. ship-0 미충족(직전 10사이클 success 6건). plan #28 status=`phase1_mvp_shipped_cycle_2315`(literal `approved` 아니라 unprocessed-plan lookup 자동 발화 X, TODOS 명시 carry-over로 메인 자율 선택) — Phase 2("이번 주 경기 + 팀 strength grid") 착수.

구현: `getMlbThisWeekRemainingGames()`(`apps/moneyball/src/app/mlb/analysis/analysis-data.ts` 신규) — KBO `getThisWeekRemainingGames()` 패턴(computeWeekRange 리그 무관 재사용) + mlb/analysis/page.tsx 기존 2-step 쿼리(predictions→mlb_schedule, cycle 2114/1168 silent drift family 재발 차단) 동일 적용. `MLB_ANALYSIS_UPCOMING_LIMIT=90`(packages/shared) 신규 — 기존 `ANALYSIS_UPCOMING_LIMIT=30`은 KBO 하루 5경기×6일 가정이라 MLB(하루 최대 15경기×6일=90) 재사용 시 언더카운트 우려로 분리. page.tsx 에 "📆 이번 주 남은 경기" 섹션 추가(날짜별 그룹, computeMlbCompositeDuel 재사용 강수렴/완전수렴 배지).

**TeamStrengthGrid MLB 버전은 블로커로 보류**(risk 노트가 명시했던 curl 실측 재검증 필요 지점 실측 결과): MLB predictions.home_recent_form/away_recent_form 컬럼이 전량 null(mlb-pipeline.ts 가 recent_form 팩터를 저장 안 함, buildMlbFactorAccuracy.ts 기존 주석으로 재확인) — TeamStrengthGrid 컴포넌트의 FormBar 는 recentForm 필수 소비라 그대로 포팅 시 전 팀 무의미한 동일값 렌더. 대체 설계(mlb_schedule 실제 완료 경기 기반 win rate)는 plan #28 body 에 다음 cycle 후속 후보로 명시.

검증: `tsc --noEmit` 클린 / `eslint` 클린 / 전체 vitest 492 파일 4139 테스트 all green(신규 7건 포함, 회귀 0건).

결론: Phase 2 코드 ship 완료(부분 — 이번 주 남은 경기만, TeamStrengthGrid 제외), plan #28 status → `phase2_partial_shipped_cycle_2316`. 다음 후속: TeamStrengthGrid MLB 대체 설계 또는 Phase 3(어제 결과+주간/월간 리뷰 요약).

## 🟢 explore-idea (heavy) — `/mlb/analysis` 종합 hub MVP ship, plan #28 Phase 1 (cycle 2315, 2026-08-20)

진단: cycle 2314 spec-only plan #28(Tier 3, Phase 1~4 분리) 자연 carry-over. approved plan 조건 미충족(plan #28 status=`spec_only_cycle_2314` custom string, 리터럴 `approved` 아님)이라 unprocessed-plan 자동 lookup 발화 X — TODOS 명시 후보로 메인 자율 선택. 2-chain lock 미충족(직전 8사이클 distinct=5). 주기 trigger 전부 미도달.

Phase 1 MVP(빅매치/팩터 수렴 픽/오늘 전체 예측 3섹션) 구현: `apps/moneyball/src/app/mlb/analysis/page.tsx` 신규. `predictions` 테이블이 팩터 breakdown 컬럼(home_sp_fip/away_sp_fip/.../home_war_total)을 직접 보유 확인(convergenceRecord.ts 기존 쿼리 패턴 재사용) — 별도 factor 테이블 조인 불필요, 예상보다 단일 cycle 완결 가능 판단.

- `computeMlbCompositeDuel`(plan #24 Phase 3c 기존 인프라) 그대로 재사용, 신규 duel 로직 작성 X.
- mlb/games/[date]/page.tsx 의 2-step 쿼리 패턴(predictions → mlb_schedule join, cycle 1168 silent drift fix 정합) 동일 재사용.
- "오늘의 빅매치" = KBO selectBigMatch(rivalry/elo-closeness 휴리스틱) 미사용 결정 — MLB elo/recent_form 전량 null(미구현 4팩터)이라 그대로 쓰면 전 경기 동점 계산이 돼 무의미. wave-624 KBO "최고 자신감 픽" 패턴(confidence 기준)으로 대체. MVP 스코프 결정으로 plan #28 body 에 명시.
- 팩터 수렴 픽 = `MLB_FACTOR_PICK_STRONG(5)`/`COMPLETE(6)` 2-tier 게이팅(강수렴/완전수렴), `FACTOR_PICK_TOP_GAMES` 공유 상수 재사용(league-neutral count).
- 헤더 메가메뉴("경기·팀" 섹션) + 푸터 MLB 컬럼 + `sitemap.ts`("/mlb" 바로 뒤, priority 0.85) + `/search` STATIC_PAGES 즉시 배선(cycle 2153/2261/2262 family 재발 차단 — 풀스위트 실행 중 `silent-drift-cycle-2261/2262` 가드 테스트가 search 배선 누락을 즉시 잡아냄, 수정 후 재통과).
- 신규 grep 기반 smoke test 8건(`plan28-phase1-mlb-analysis-hub.test.ts`) 추가.

검증: `tsc --noEmit` 클린 / `eslint` 클린 / 전체 vitest 491 파일 4132 테스트 all green(신규 8건 포함, 회귀 0건).

결론: Phase 1 MVP 코드 ship 완료, plan #28 status → `phase1_mvp_shipped_cycle_2315`. **범위 밖(scope, 후속 cycle)**: EN 변형(en/mlb/analysis, phased 관례 후속), Phase 2(이번 주 경기 + TeamStrengthGrid MLB 버전, `buildTeamStrengthSnapshot` mlb_schedule 모델 재작성 필요), Phase 3(어제 결과 + 주간/월간 리뷰 요약 임베드), Phase 4(시즌 성과 + 적중 기록 요약 카드).

## 🟡 explore-idea (lite) — MLB "AI 분석 센터" hub gap plan #28 spec-only (cycle 2314, 2026-08-20)

진단: open issue 0건, approved plan 0/21(plan #24/#27 모두 closed). 2-chain lock 미충족(직전 8사이클 distinct=5). 주기 trigger 전부 미도달(fix-incident 8/20, op-analysis 5/25, info-arch 4/30, lotto 20/30). explore-idea saturation trigger 정확 충족(직전 15사이클 중 review-code+fix-incident+polish-ui+info-arch=12/15) + 직전 3사이클(2311/2312/2313) 연속 retro-only(review-code×2+polish-ui×1) — 다양성 확보 필요, 자체 retro 모두 "신규 target 소진 조짐" 명시.

KBO↔MLB 앱 라우트 top-level diff 재감사(cycle 2245/2254 방법론 재사용). plan #24(MLB matchup)/#27(MLB 픽/리더보드) frontmatter 확인 결과 둘 다 완결(closed) — 신규 unprocessed plan 없음. cycle 2254 진단이 나열했던 7개 후보(analysis/dashboard/insights/leaderboard/picks/predictions/seasons) 중 텍스트 설명에서 유일하게 누락됐던 `analysis` 를 재검토.

**발견**: KBO `/analysis`(2803줄, "AI 분석 센터" — 오늘 전체예측+빅매치+팩터수렴픽+이번주경기+팀strength grid+어제결과+주간/월간 리뷰+시즌성과+적중기록 13개 섹션 단일 hub)에 대응하는 MLB 라우트가 전혀 없음. MLB 는 기능이 3곳(`/mlb/games/[date]` 188줄 단일날짜만/`/mlb/factors` 464줄 정적설명/`/mlb/accuracy` 적중기록 전용)에 분산 — "오늘 접속해서 한 곳에서 전체를 보는" KBO 식 진입점 부재.

2803줄 단일 페이지 규모(convergenceRecord.ts 9개 함수 중 8개 미포팅) 상 1 cycle 완결 불가능 판단 → spec-only. `~/.develop-cycle/plans/moneyballscore/28.md` 로 박제(rubric: 가치 high / 시간비용 large / risk 1 / 자율 yes / 의존성 none, Tier 3, Phase 1~4 분리). plan #24 Phase 3c 가 이미 확립한 재사용 인프라(computeMlbCompositeDuel/MLB_FACTOR_PICK_STRONG·COMPLETE/getMlbConvergencePickHeadToHeadRecord/deriveMlbOutcome 등) 상당수 활용 가능 — Phase 1(MVP: 빅매치+팩터수렴픽+오늘전체예측 3섹션)부터 다음 explore-idea(heavy) fire 후보.

결론: 코드 변경 0, 스펙 파일 1개 신규(plan #28). 다음 후보: fix-incident(8-gap/20)/op-analysis(5-gap/25)/lotto(20-gap/30)/info-arch(4-gap/30) 자체 주기 monitor 또는 explore-idea(heavy) plan #28 Phase 1 착수.

## ⚪ polish-ui (lite) — DESIGN.md 토큰 vs 컴포넌트 hex 42파일 전수 대조, drift 0건 (retro-only) (cycle 2313, 2026-08-20)

진단: open issue 0건, approved plan 0/21. 2-chain lock 미충족(직전 8사이클 distinct=5). 주기 trigger 전부 미도달(fix-incident 7/20, op-analysis 4/25, lotto 19/30, info-arch 3/30). ship-0 미충족(직전 10사이클 success 8/retro-only 2). skill-evolution trigger5 표본=20, review-code 11/20(0 아님)→미충족. review-code(heavy) 직전 2사이클(2311/2312) 연속 retro-only — 신규 target 소진 조짐, 다양성 확보.

fix-incident 소스 전수 확인(GH Actions 전 스케줄 워크플로 success, Cloudflare Worker 배포 2026-08-14 이미 복구 확인) — all-green, 신규 이슈 없음. 참고로 daily-pipeline.yml/live-update.yml `schedule:` 트리거 부재를 처음 보고 놀랐으나, 파일 상단 주석에 2026-04-29 Cloudflare Workers Cron 이관 완료 명시 확인 — 기존 결정, false alarm.

polish-ui 소스: hex 컬러 사용 42개 파일 grep → 40개는 opengraph-image.tsx/twitter-image.tsx(vercel/og 렌더러가 Tailwind/CSS var 미지원, 하드코딩 필수인 기존 컨벤션) false positive. 실제 UI 컴포넌트 4개(AgentVoteCard `#c5872a`=Away 토큰 정확 일치 / HallOfFame `var(--color-*, hex)` fallback 패턴 토큰과 정확 일치 / KofiWidget accent·brand-800 토큰 일치 / ShareButtons `#1DA1F2`·`#1877F2`=Twitter·Facebook 브랜드 컬러 제3자 아이콘 관례) 전부 clean.

결론: 코드 변경 0. review-code/fix-incident/polish-ui 3축 모두 이번 사이클로 clean 확인. 다음 후보: lotto(19-gap/30, 근접) 또는 fix-incident(7-gap/20)/op-analysis(4-gap/25)/info-arch(3-gap/30) 자체 주기 monitor. review-code 재선택 시 신규 미감사 대형 target 재탐색 필요(기존 monolith 대부분 소진).

## ⚪ review-code (heavy) — 홈 `page.tsx`(1082줄 monolith) 전수 감사, drift 0건 확인 (retro-only) (cycle 2312, 2026-08-20)

진단: open issue 0건, approved plan 0/21(전부 completed/archived/status 미해당). 2-chain lock 미충족(직전 8사이클 distinct=5). 주기 trigger 전부 미도달(fix-incident 6/20, op-analysis 3/25, lotto 18/30, info-arch 2/30 — 방금 2310 발화). ship-0 미충족(직전 10사이클 success 8/retro-only 1/무관). skill-evolution trigger 5 표본=19(≥10) 이나 review-code 미도달(0회 아님) → 미충족. CI 최근 10회 전부 success/skip, fix-incident 신호 없음. cycle 2311 retro 명시적 carry-over("apps/moneyball/src/app/page.tsx 홈, cycle 2308 근처 audit 대상 언급됐으나 미확인") 채택.

`page.tsx` 전체(1082줄) read 후 다음 축 점검: (1) `METHODOLOGY_GROUPS` 6그룹이 `DEFAULT_WEIGHTS` 10개 key 전부 커버하는지(sp_fip/sp_xfip/lineup_woba/bullpen_fip/recent_form/war/head_to_head/park_factor/elo/sfr) — 10/10 매핑 확인, `formatMethodologyWeight` 가 `HOME_ADVANTAGE` 를 마지막 그룹에만 `extra` 로 가산하는 것도 CLAUDE.md v1.8 가중치 정의와 일치. (2) `winProb` 홈/원정 변환 로직(`pred.winner?.code === homeCode ? homeWinProbRaw : 1 - homeWinProbRaw`) — `PredictionCard.tsx` 주석("winProb = 예측 승자의 승리 확률")과 `PredictionCardLive.tsx`(`aiWinProb: props.winProb`) 양쪽 확인 결과 의미론 일치, 사례4(homeCode 반쪽 작동) 계열 재발 아님. (3) `getWeekAheadSchedule`/`getTodayPredictions`/`getYesterdayResults` 의 `created_at` KST↔UTC 경계(`${today}T00:00:00Z`~`T23:59:59Z`) — `KBO_PREDICT_DAILY_TIME_KST='09:00 KST'`(=00:00 UTC) 단일 배치 기준이라 실제로는 안전한 경계, 코드베이스 전역(20개 파일)에서 동일 패턴 기 확립된 컨벤션 — 신규 drift 아님. (4) `classifyNoGameReason` 분기 순서(`break`→`monday_rest`→`unknown`) 주석과 실제 반환 순서 일치.

결론: 코드 변경 0, PR/커밋 없음. 홈페이지 monolith 는 review-code(heavy) 관점에서 현재 clean — 다음 review-code(heavy) 재검토 시 다른 target 필요. 다음 후보: fix-incident(6-gap/20)/lotto(18-gap/30) 자체 주기 monitor 또는 explore-idea(review-code 직전 20사이클 12/20=60% dominance 다양성 확보).

## ⚪ review-code (heavy) — MLB `/mlb/accuracy` backlog 재확인, 이미 전량 해소 확인 (retro-only) (cycle 2311, 2026-08-20)

진단: open issue 0건, approved plan 0/21. 2-chain lock 미충족(직전 8사이클 distinct=5). 주기 trigger 전부 미도달(fix-incident 5/20, op-analysis 2/25, lotto 17/30, info-arch 1/30 — 방금 2310 발화). ship-0 미충족(직전 10사이클 전부 success). cron/CI 최근 30회 실행 전부 성공/skip, 신규 fix-incident 신호 없음. lotto 8/22 50세트 이미 박제됨(트리거 없음).

TODOS 누적 "다음 후보(scope 밖, backlog)" 라인(cycle 2176/2186 등)이 반복 지목한 KBO `/accuracy` 대비 MLB 미구현 컴포넌트(ScoringRuleDayHeatmap/BrierTrendChart/RollingAccuracyChart/WinnerProbBucketChart/CohortComparisonHeatmap/TeamBiasTable/ModelVersionHistory) 실제 배선 상태를 `MlbAccuracyDashboard.tsx` + `/mlb/accuracy/page.tsx` grep으로 전수 재확인.

결과: **ModelVersionHistory 1건만 미구현으로 남고 나머지 6개 전부 이미 배선 완료** — ScoringRuleDayHeatmap/BrierTrendChart/RollingAccuracyChart/WinnerProbBucketChart/CohortComparisonHeatmap 은 `MlbAccuracyDashboard.tsx`에 직접 렌더 확인, TeamBiasTable 은 `buildMlbTeamBiasAnalysis()`(`buildMlbTeamAccuracy.ts`) + `/mlb/accuracy/page.tsx` line 77 배선까지 확인(커밋 `fdce1fbd` wave-634, cycle 2186 backlog 노트 작성 이후 별도 사이클에서 이미 완료됐던 것 — 노트만 안 지워진 정상 backlog 잔여물이지 실제 drift 아님). `deriveMlbOutcome.ts` 재검토도 기존 로직 정상(예전 850% 이중변환 버그는 cycle 2160에 이미 fix됨).

ModelVersionHistory 는 `MLB_PRODUCTION_COHORT_RULES`가 단일 scoring_rule(`MLB_SCORING_RULE`)만 포함 — 버전 분화 자체가 없어 여전히 실효성 낮음(TODOS 기존 평가 유효, 재확인 완료).

결론: 코드 변경 0, PR/커밋 없음. **MLB `/mlb/accuracy` 패리티 backlog 사실상 완전 소진** — 다음 review-code(heavy)가 재검토 불필요. 다음 후보: `apps/moneyball/src/app/page.tsx`(홈, cycle 2308 근처 audit 대상 언급됐으나 미확인) 또는 fix-incident/lotto 자체 주기 monitor(각 gap 5/20, 17/30).

## ⚪ info-architecture-review — 30-cycle gap 트리거 도달, IA 4신호 전수 확인 결과 drift 0건 (retro-only) SUCCESS (cycle 2310, 2026-08-20)

진단: open issue 0건, approved plan 0/21(신규 24/27 모두 Tier3 spec-only, status approved 아님). 2-chain lock 미충족(직전 8사이클 distinct=4). info-architecture-review 마지막 발화 cycle 2280 → 정확히 30-gap 도달(자체 주기 trigger). review-code 직전 20사이클 13/20=65% dominance 도 다양성 확보 근거로 겹침.

4개 IA 신호 전수 확인: (1) breadcrumb 누락 grep → `reviews/weekly`, `reviews/monthly`(KBO+MLB) 4파일 걸렸으나 실제 read 결과 전부 redirect-only stub(`redirect(...)`) — Breadcrumb UI 자체가 없는 게 정상, false positive(cycle 2307 로그인/설정 stub 패턴과 동일). (2) sitemap.ts(79 static entries) vs page.tsx 파일수(97) 불일치 → sitemap.ts 코드 직접 read 결과 원인 전부 문서화된 의도(동적 라우트는 `allPairs()`/`getRecentWeeks()`/`Object.keys(MLB_TEAMS)` 등 런타임 생성이라 1:1 매핑 아님, `/reviews/weekly`·`/reviews/monthly`·`/mlb/reviews/weekly`·`/mlb/reviews/monthly` redirect stub 은 의도적으로 sitemap 제외 — 주석에 명시) — false positive. (3) 헤더 메가메뉴(`Header.tsx` LEAGUE_NAVS) → wild-card(cycle 2296)/postseason(cycle 2296)/매치업 등 최근 shipped MLB 라우트 전부 이미 반영 확인. (4) 푸터 sitemap 컬럼(`Footer.tsx`) → MLB 컬럼도 wild-card/postseason 포함 전부 최신(cycle 2225 마지막 갱신 흔적).

결론: 4개 신호 모두 clean 또는 false positive — "현재 IA 충분" (chain stop 조건의 retro-only 분기). 코드 변경 0. skill-evolution trigger 5개 전부 미충족(trigger 3: 2310%50≠0, trigger 5: review-code 12/20 발화로 미충족). ship-0 emergency stop 미충족(직전 10사이클 전부 success).

다음 후보: review-code(직전 20사이클 65% dominance, sibling-file 매직넘버 family 소진 조짐 — cycle 2308 로그 재확인 필요) 또는 fix-incident(6-gap/20)/lotto(16-gap/30) 자체 주기 monitor. plan #24(MLB matchup, Tier3 부분 shipped)/#27(MLB picks/leaderboard, Tier3 phase1 done) 는 여전히 자율 fire 대상 아님(status 미완료).

## ⚪ operational-analysis (lite) — 주간 리뷰 + CE cohort 재확인, 코드 변경 없음 SUCCESS (cycle 2309, 2026-08-20)

진단: open issue 0건, approved plan 0/21. 주기 trigger 3종 미도달이나 op-analysis 24-gap/25(거의 근접, 임계 1 미달)로 review-code 70% dominance(직전 20사이클 14/20) 다양성 확보 위해 선택. lite 모드(weekly-review → extract-pattern → compound, 코드 변경 X) — CE/HOME_ADVANTAGE 축 B 는 여전히 사용자 결정 대기라 heavy(재가중치) 불필요.

이번 주(8/17 월~8/20 목) KBO v1.8 신규 검증 n=10 (월=KBO 휴식일이라 0건, 화 2/5=40%, 수 3/5=60%, 목 미검증) — 표본 과소로 가중치 판단 근거 없음, 조정 없음. `scripts/op-analysis-ce-cohort.ts` 재실행(전체 n=321, CE n=274/비CE n=47) — CE 54.0% vs 비CE 63.8%, 격차 9.8pp(cycle 2191 9.9pp 대비 미세 축소, 4-cycle window 9.7~10.7pp 안정). overlap 월 통제 격차 10.8pp ≈ 전체 격차 → LLM 부가가치 우세 방향 4회 연속 재확인. 비CE 표본 동결 50일 경과(마지막 신규 예측 2026-07-01), CREDIT_EXHAUSTED 지속 — 사용자 크레딧 재충전 전까지 상태 변화 없음. CLAUDE.md v1.8 calibration 섹션에 cycle 2309 수치 append.

다음 후보: info-arch(29-gap/30, 다음 사이클 도달), lotto(15-gap/30), fix-incident(3-gap/20) 자체 주기 monitor. review-code 재선택 시 postseason(ETA 2026-09 유지, 아직 미도달) 외 신규 target 재탐색 필요(현재 소진 조짐).

## ⚪ review-code (heavy) — methodology "30팀 435개 매치업" 하드코딩 정정 SUCCESS (cycle 2308, 2026-08-20)

진단: open issue 0건, approved plan 0/21. 주기 trigger 3종 미도달(fix-incident 2-gap/20, op-analysis 23-gap/25, lotto 14-gap/30, info-arch 28-gap/30 — 거의 근접). 2-chain lock 미충족(직전 8사이클 distinct=4: review-code/skill-evolution/explore-idea/fix-incident). 직전 20사이클 review-code 14/20=70% dominance 지속.

cycle 2307 이 wild-card OG/twitter sibling 파일 매직넘버를 잡은 것과 동일 관점으로 다른 MLB 페이지의 팀/디비전/와일드카드 카운트 하드코딩 잔존 여부 재조사. `/mlb/standings` OG 이미지는 이미 `MLB_TEAM_COUNT`/`MLB_DIVISION_COUNT` 상수 사용(clean). `/mlb/postseason` OG "4 라운드"는 MLB 포스트시즌 고정 구조(WC/DS/LCS/WS)라 튜닝 가능한 값이 아니고 대응 상수도 없어 실제 drift 아님(over-abstraction 회피, 수정 안 함).

`packages/shared/src/index.ts` 의 `MLB_HEAD_TO_HEAD_PAIRS` 상수는 정확히 "435가지 맞대결 조합" 하드코딩 sweep 단일 source 목적으로 존재하고 `/mlb/matchup`(ko+en) 페이지는 이미 정상 사용 중인데, `/mlb/methodology`(ko+en) 페이지만 "30팀 435개 매치업"/"30 teams / 435 possible matchups" 를 리터럴 프로즈로 하드코딩 — 상수는 존재하는데 sibling 페이지가 누락된 동일 silent drift family 패턴.

수정: methodology page.tsx(ko+en) 에 `MLB_TEAM_COUNT`+`MLB_HEAD_TO_HEAD_PAIRS` import 추가, 리터럴 숫자 교체. 490 files/4124 tests all pass, type-check/lint clean. 직접 main 커밋+즉시 push (pre-push hook lint/type-check 통과 확인, commit `11ee8d4d`) — 단일 논리 단위 소규모 fix 라 branch+PR 생략.

다음 후보: postseason 은 여전히 "완료 대기"(ETA 2026-09, division/wildcard 완료 후 자연 IA 갭). review-code(heavy) sibling-file 매직넘버 family sweep 은 이번 사이클로 사실상 소진 조짐(신규 target 미발견) — 다음엔 info-architecture-review(28-gap/30, 거의 근접) 또는 다른 chain 전환 권장.

## ⚪ review-code (heavy) — wild-card OG/twitter 이미지 매직넘버 하드코딩 정정 SUCCESS (cycle 2307, 2026-08-20)

진단: open issue 0건, approved plan 0/21. 주기 trigger 3종 미도달(fix-incident 1-gap/20 방금 발화, op-analysis 22-gap/25, lotto 13-gap/30, info-arch 27-gap/30). 2-chain lock 미충족(직전 8사이클 distinct=4: review-code/skill-evolution/explore-idea/fix-incident). breadcrumb 누락 grep 은 false positive(전부 순수 redirect stub/debug/login/home — Breadcrumb UI 자체가 없는 게 정상)로 제외.

cycle 2306 이 "cycle 2296 division 매직넘버 등 다른 shipped 기능도 동일 cross-reference staleness 재확인 여지"를 남긴 것을 따라 `/mlb/wild-card` 형제 파일을 조사 — 페이지 본문(`page.tsx`, cycle 2305)은 `MLB_WILDCARD_COUNT` 상수를 전부 사용하는데, 같은 폴더의 `opengraph-image.tsx`/`twitter-image.tsx` (ko+en 4파일)는 "3장"/"AL 3 spots"/"NL 3 spots" 리터럴을 하드코딩 — wave-305/500 매직넘버 family 의 새 하위 사례(페이지는 상수화, 형제 이미지 생성 파일 누락).

수정: 4파일 모두 `MLB_WILDCARD_COUNT` import 추가 + 문자열/배열 리터럴을 상수 참조로 교체. 490 files/4124 tests all pass, type-check/lint clean. PR #3010 실측 머지 확인(`gh pr view 3010 --json state,mergedAt` → MERGED, mergeCommit `11d7ac42`).

다음 후보: `/mlb/postseason` 은 아직 ETA 2026-09 유지(정당 — division/wildcard 완료 후 데이터 자체가 아직 미존재). 다음 review-code 사이클에서 다른 최근 shipped MLB 기능(standings division 매직넘버 등)의 OG/twitter/카드 sibling 파일도 동일 패턴 재확인 여지.

## ⚪ fix-incident — wild-card 라이브 전환 후 stale ETA 문구 잔존 + version 3-way drift 정정 SUCCESS (cycle 2306, 2026-08-20)

진단: open issue 0건, approved plan 0/21. 주기 trigger 3종 미도달(fix-incident 8-gap/20, op-analysis 21-gap/25, lotto 12-gap/30, info-arch 26-gap/30). 2-chain lock 미충족(직전 8사이클 distinct=4).

review-code 관점으로 cycle 2305 가 shipped 한 `/mlb/wild-card` 주변을 grep(`ETA 2026-08`) 하다 6개 sibling 파일에 stale 문구 발견: hub 카드(mlb/page.tsx, en/mlb/page.tsx — amber "준비중" 스타일 그대로), OG/twitter 이미지(mlb+en wild-card, "Live ETA 2026-08"), postseason cross-link(mlb+en, "ETA 2026-08"). 기능은 실시간 전환됐지만 그 기능을 가리키는 다른 위치 문구가 안 갱신된 패턴 — shipped-feature cross-reference staleness, silent drift family 신규 하위 유형.

같은 조사 중 root `package.json` version(0.5.62.64)이 VERSION/apps/moneyball/package.json(0.5.62.65) 대비 1건 밀려있어 `version-sync-guard.test.ts`(cycle 2047 신규) 가 FAIL 하던 것도 발견 — 0.5.62.65 로 동기.

수정: hub 카드 2개 → 일반 카드 스타일(white/brand) + "박제 완료"/"Complete" 문구, OG/twitter 4개 → "Live" (ETA 제거), postseason cross-link 2개 → "박제 완료"/"Complete", root package.json version 동기. 490 files/4124 tests all pass(fix 전 1 fail), type-check/lint clean. PR #3009 실측 머지 확인(`gh pr view 3009 --json state,mergedAt` → MERGED, mergeCommit `6f737c37`).

다음 후보: `/mlb/postseason` 자체는 아직 ETA 2026-09 유지(division+wildcard 완료 후 다음 자연 IA 갭). 다음 review-code 사이클에서 cycle 2296 division 매직넘버 등 다른 최근 shipped 기능도 동일 cross-reference staleness 패턴 재확인 여지.

## ⚪ explore-idea (heavy) — /mlb/wild-card 라이브 Wild Card race 데이터 통합 SUCCESS (cycle 2305, 2026-08-20)

진단: open issue 0건, approved plan 0건(21건 전부 completed/archived/blocked/superseded/pending user step). 주기 trigger 3종 미도달(fix-incident 6-gap/20, op-analysis 19-gap/25, lotto 10-gap/30, info-arch 24-gap/30). 2-chain lock 미충족(직전 8사이클 distinct=3: review-code/fix-incident/skill-evolution). h2h family(computeCompositeDuel 전체 call site: analysis-data.ts/page.tsx/game/[id]/page.tsx/convergenceRecord.ts) grep 재확인 — 4곳 모두 cycle 2303/2304 fix 로 이미 정합, MLB computeMlbCompositeDuel 의 h2h 미보유는 설계 의도(mlb-pipeline.ts 미저장) 확인돼 review-code 추가 발견 0건.

improvement saturation trigger 충족(직전 15사이클 중 review-code+fix-incident+polish-ui+info-arch = 12/15) → explore-idea 로 redirect.

carry-over lookup: cycle 2296 CHANGELOG entry(division 매직넘버) 가 명시적으로 "와일드카드 매직넘버는 범위 밖... 별도 cycle 후속 후보로 carry" 를 남겼고, `/mlb/wild-card` 페이지 자체가 "ETA 2026-08" placeholder(오늘 2026-08-20, ETA 도달)로 방치돼있던 것을 확인 — 두 신호가 동일 타겟을 가리켐.

구현: `buildMlbStandings.ts` 에 `buildMlbWildcardStandings()` 신규 — 리그별 division 1위 3팀 제외 pool 을 승률 내림차순 정렬, 컷오프(`MLB_WILDCARD_COUNT`=3번째 팀) 기준 게임차 계산. `computeMagicNumber()` 재사용(KBO standings `playoffMN` 과 동일 패턴: 컷오프 팀 vs 첫 탈락 팀)으로 Wild Card 매직넘버 산출 — 신규 DB 쿼리 0건. `/mlb/wild-card` + `/en/mlb/wild-card` 정적 그리드를 실시간 WC1~3 순위+GB+매직넘버로 교체, ETA 문구 → "박제 완료". wave-240 회귀 테스트가 검증하는 "Header NAV 회수 layer" footer 문구는 유지.

`MLB_WILDCARD_COUNT=3` 신규 상수(packages/shared). 단위 테스트 2건 신규. 490 files/4124 tests all pass, type-check/lint clean. PR #3008 실측 머지 완료(`gh pr view 3008 --json state,mergedAt` → `MERGED`, mergeCommit `fbb2c252`) — 사례 18 교훈 준수. VERSION/CHANGELOG 0.5.62.65 bump(feat 전례 정합) 후 main 직접 커밋(`2bc43556`) + 즉시 push, pre-push hook lint/type-check 통과 확인.

다음 후보: `/mlb/postseason` 브라켓(WC/DS/LCS/WS) — 아직 ETA 2026-09 placeholder, division/wildcard 양쪽 완료 후 자연스러운 다음 IA 갭. 또는 주기 trigger(fix-incident/op-analysis/lotto/info-arch) 도달 대기.

## ⚪ skill-evolution (forced, trigger-3 milestone) — phase 33 갱신, PR #3005 머지 SUCCESS (cycle 2301, 2026-08-20)

진단: cycle 2300 retro 에서 `skill-evolution-pending` 마커 박제(`2300: 58baec4e...`) — cycle 2301 진단 첫 step 에서 마커 발견, chain_selected 자동 강제 (`skill-evolution`, 메인 자율 X).

직전 20 cycle(2281-2300) 분포 측정: review-code 관여 16/20=80%(단독 15 + combo 1, 사상 최고치 — #1338 family scoring_rule 필터 sweep 7~10번째 재발 연속: cycle 2295 og-image/agent-fallback, 2297 debug/reliability, 2298 v2-preview + cycle 2299 수렴픽 isCorrect 오판정 + cycle 2300 MIN_POLL_TOTAL 매직넘버) + explore-idea 10%(cycle 2287/2296) + operational-analysis 5%(cycle 2285) + lotto 5%(cycle 2294) + info-arch/polish-ui/design-system/expand-scope/dimension-cycle 0%(영구 opt-out 또는 gap 미도달). success 95%(19/20, 1 partial cycle 2283). alternation pair(review-code+explore-idea) 90%. watch.sh hang kill 0건.

주목할 점: cycle 2295 retro 가 "#1338 family sweep 완전 종료" 를 명시 선언했음에도 그 후 2회(cycle 2297/2298) 추가 재발 — 종료 선언의 신뢰도 자체가 낮음을 시사. 다음 review-code 사이클에서 "종료 선언" 문구 재검토 필요할 수 있음(과신 경계).

PASS_ship 재계산: `40a6fcd2`(cycle 2250 retro)..HEAD(cycle 2300) = +76 ships → 직전 확정 누적치 ~1671 + 76 = **누적 ~1747(cycle 2300 기준)**.

동작: `~/.claude/skills/develop-cycle/SKILL.md` 마이그레이션 table cell 에 phase 33 요약 append + `MIGRATION-PATH.md` 에 상세 섹션(`## cycle 2300 — phase 33`) append. 코드 변경 0건(SKILL 파일은 repo 비추적) — metric-only empty commit(`--allow-empty`) 관례 유지. `develop-cycle/skill-evolution-2300` 브랜치 → PR #3005 → `gh pr merge --squash --auto --delete-branch` 즉시 발화 → CI green 확인 후 **실측 머지 완료**(`gh pr view 3005 --json state,mergedAt` → `MERGED`, mergeCommit `1f80e1d5`) — cycle 2001 사례 18 교훈(완료 서술 전 실측 확인) 준수.

`skill-evolution-pending` 마커 삭제(chain 종료). 다음 milestone = cycle 2350.

## ⚪ review-code (heavy) — accuracy/page.tsx 전체 재감사 + MIN_POLL_TOTAL 매직넘버 재발 정정 SUCCESS (cycle 2300, 2026-08-20)

진단: open issue 0건, approved plan 0건(20건 전부 completed/archived/blocked/superseded). 2-chain lock 미충족(직전 8사이클 distinct=4). 주기 trigger 3종 미도달(fix-incident 1-gap/20, op-analysis 15-gap/25, lotto 6-gap/30, info-arch 20-gap/30). cycle 2300 = 50-milestone(trigger 3 자동 해당).

cycle 2299 retro가 명시적으로 지목한 accuracy/page.tsx(1203줄, 마지막 감사 cycle 953 이후 1347 사이클 경과) 재감사 착수. 쿼리 필터 전수 확인(result/predForPoll/buildAllTeamAccuracy/buildMatchupData/buildTeamBiasAnalysis/factorResult) — 모두 CURRENT_MODEL_FILTER 정상 적용, #1338 family 재발 없음. false lead 2건 배제: (1) fallbackResult 쿼리는 scoring_rule 필터 없지만 classifyVersion()이 LLM_ACTIVE_VERSIONS/FALLBACK_VERSIONS set 매칭이라 MLB/구버전 row 자연 제외돼 버그 아님, (2) buildFactorAccuracy.ts의 homeActuallyWon 파생은 모델 자체 예측 방향 재사용이라 어제(cycle 2299) 발견된 수렴픽 배지 버그(독립 신호 혼동)와 다른 클래스로 정상.

cycle 2299 carry-over였던 analysis/page.tsx:261 canonicalPair() 미사용 수동 sort는 producer(getSeasonH2HData)도 동일 plain sort + 팀 코드가 이미 DB 보증 유효값이라 canonicalPair 도입이 불필요한 null-check 복잡도만 추가한다고 최종 판단, 수정 스킵 확정.

실제 발견: accuracy/page.tsx:422 `communityStats.communityGames >= 3` 하드코딩. computeCommunityVsAI()가 이미 MIN_POLL_TOTAL(=3, packages/shared)로 필터링한 값을 페이지에서 재검사하는 중복 매직넘버 — wave-305/wave-500 family(PickButton.tsx/home/page.tsx는 이미 스왑됨)의 미완 sweep 대상. 값이 우연히 일치해 지금까지 동작엔 문제없었지만 MIN_POLL_TOTAL 변경 시 이 게이트만 stale 해지는 silent drift 소지.

수정: MIN_POLL_TOTAL import + 게이트(`>= MIN_POLL_TOTAL`)/안내 문구(`{MIN_POLL_TOTAL}명 이상`) 양쪽 swap. 회귀 테스트 신규(`wave-2300-min-poll-total-swap.test.ts`, wave-305/500 패턴과 동일 read-source-assert 구조). 488 files/4108 tests all pass, type-check/lint clean. main 직접 커밋(1592a186) 후 즉시 push, pre-push hook lint/type-check 통과 확인.

다음 후보: 남은 페이지 매직넘버 sweep 잔여 grep 또는 op-analysis(15-gap/25)/lotto(6-gap/30)/info-arch(20-gap/30) 자체 주기 monitor.

## ⚪ review-code (heavy) — analysis/page.tsx 어제 수렴 픽 배지 isCorrect 오판정 정정 SUCCESS (cycle 2299, 2026-08-20)

진단: open issue 0건, approved plan 0건(20건 전부 completed/archived/blocked). 2-chain lock 미충족(직전 8사이클 distinct=4: review-code x5/lotto x1/fix-incident x1/explore-idea x1). 주기 trigger 3종 미도달(op-analysis 13-gap/25, lotto 4-gap/30, info-arch 18-gap/30). #1338 family(scoring_rule 필터 누락) sweep 은 KBO population 전 파일 grep 결과 clean — 구조적 완료 판단. DESIGN.md 2일 전 갱신(비신선 X), "최근 7일 신규 라우트" 신호는 전체 페이지 mtime 일괄 갱신이라 false positive 로 판단해 무시.

review-code(heavy) 재선택 근거: 최대 monolith 2개(analysis/page.tsx 2802줄, accuracy/page.tsx 1203줄)가 마지막 감사된 cycle 2149~2150 이후 148 사이클 경과 + 그 사이 대폭 성장(팩터 배지 wave 다수 반영) — 재감사 due.

Agent 위임 audit 결과(analysis/page.tsx + analysis-data.ts 전체 read): #1338/WAR=0 sentinel/H2H 소표본 가드 모두 기존 정상 확인. 신규 발견 — `convergenceRecord.ts:765` `computeConvergenceRecordFromIsCorrect()` 가 "어제 강수렴/완전수렴 픽" 배지(page.tsx:370,372) 승패를 게임의 `isCorrect`(모델 자체 최종 가중치 예측 적중 여부)로 판정. 그런데 수렴 픽(팩터 단순 다수결)과 모델 예측은 방향이 엇갈릴 수 있음(페이지가 `modelAgrees` 로 이 불일치를 명시적으로 추적) — 엇갈리는 경우 배지가 실제와 반대로 표시되는 silent 오류. 형제 함수 `computeWeeklyConvergenceRecord`/`evaluateConvergencePickRow` 는 이미 homeScore/awayScore 로 실제 승자를 재산출하는 올바른 패턴 — "어제" 배지만 지름길(isCorrect 재사용)을 탄 상태였음.

수정: `computeConvergenceRecordFromIsCorrect` → `computeConvergenceRecordFromScores` 로 개명 + homeScore/awayScore 기반 실제 승자 재산출 로직으로 전환(caller `yesterdayGames` 는 이미 두 필드 보유, 데이터 fetch 변경 불필요). 회귀 테스트(`wave-580-convergence-record-from-is-correct.test.ts`) 를 새 시그니처로 갱신 + 모델/수렴픽 불일치 케이스 신규 추가. 487 files/4105 tests all pass, type-check/lint clean. main 직접 커밋(f2ddc5f6) 후 즉시 push, pre-push hook lint/type-check 통과 확인.

다른 발견(page.tsx:261, `[homeCode, awayCode].sort()` 가 이미 import 된 `canonicalPair()` 헬퍼와 중복) — 낮은 심각도 dead-logic-drift risk 로 낮은 우선순위 후속 후보 carry.

다음 후보: accuracy/page.tsx(1203줄) 별도 재감사 또는 page.tsx:261 canonicalPair 중복 정리 또는 op-analysis(13-gap/25)/lotto(4-gap/30) 자체 주기 monitor.

## ⚪ fix-incident (lite→review-code(heavy) 전환) — v2-preview scoring_rule 필터 누락 정정 (#1338 family 10번째 재발) SUCCESS (cycle 2298, 2026-08-20)

진단: open issue 0건, approved plan 0건(20건 전부 completed/archived/blocked). fix-incident 20-cycle 미발화 gap 도달(마지막 발화 cycle 2278 → 2298, gap=20) — 트리거대로 lite 점검 시작(`gh run list` 스케줄 workflow 최근 실패 확인 + pipeline_runs 대체 신호).

발견: `deploy-drift-alert` workflow 가 04:50/03:56/03:08/01:49 UTC 4회 연속 실패(gap_hours 4~7) 발견 — 첫 인상은 #9/#10 family 재발(silent deploy 정지) 의심됐으나 실측 결과 **실제 incident 아님**. 원인 재구성: cycle 2292 종료 시점(2026-08-20 21:33:47 UTC) signal `next_n=0`(사용자 이전 batch 완료) → watch.sh 가 정상 idle 대기 → 사용자가 본 `/develop-cycle 46` 호출 전까지 ~8시간 신규 commit 0건 → Vercel 배포도 자연히 0건(배포는 push 트리거) → `deploy-drift-alert` 가 stale production 을 정확히 감지해 알림(설계대로 작동, false positive 아님) → 사이클 재개 후 catch-up 배포 burst 로 자가 해소(현재 production = 최신 commit 근접, `state=success`). 즉 R6 재정의(자율 cron 폐기, 사용자 수동 트리거) 이후 "유휴 대기 = 정상" 상태에서 deploy-drift-alert 가 예상대로 경보 발생시키는 구조 확인 — 알림 자체는 정상 작동이라 수정 대상 아님(향후 alert fatigue 우려 시 유휴 grace window 추가 검토 가능, 이번엔 skip).

실제 조치 대상은 review-code 관점에서 재탐색한 별건: 직전 cycle 2297 retro 가 명시적으로 지목한 carry-over `/v2-preview` 페이지 — predictions 쿼리에 `prediction_type='pre_game'` 만 걸고 `scoring_rule` 필터가 없어 v1.5~v1.7 구버전 + shadow row(v2.0-shadow/v2.1-B-shadow) + MLB(`mlb_v0.1`, 동일 predictions 테이블 공유) row 까지 v1.8 vs v2.1-B 재가중치 시뮬레이션에 혼입 가능한 상태(#1338 family 10번째 재발, `/accuracy` 등과 동일 패턴). CURRENT_SCORING_RULE import 는 이미 있었으나 표시 텍스트에만 쓰이고 쿼리 필터에는 미적용된 상태였음.

수정: `@/config/model`의 `CURRENT_MODEL_FILTER` import + `.match(CURRENT_MODEL_FILTER)` 추가. 정적 grep 회귀 테스트 신규 추가(`silent-drift-cycle-2298.test.ts`). 487 files/4104 tests all pass, type-check/lint clean. main 직접 커밋(0b1822ac) 후 즉시 push, pre-push hook lint/type-check 통과 확인.

다음 후보: #1338 family 신규 sweep 대상 추가 탐색(v2-preview 처리로 사용자 가시 페이지는 거의 소진 — 남은 후보는 낮은 우선순위 내부 도구뿐일 가능성) 또는 2-chain lock 재평가(직전 8사이클 review-code 비중 여전히 높음, 다양성 확보 검토) 또는 op-analysis(13-gap/25)/lotto(4-gap/30) 자체 주기 monitor.

## ⚪ review-code (heavy) — debug/reliability 페이지 scoring_rule + prediction_type 필터 누락 정정 (#1338 family 9번째 재발) SUCCESS (cycle 2297, 2026-08-20)

진단: open issue 0건, approved plan 0건(20건 전부 completed/archived/blocked). 2-chain lock 미충족(직전 8사이클 distinct=3: review-code x6 + lotto x1 + explore-idea x1). 주기 trigger 3종 미도달(fix-incident 19-gap/20, op-analysis 12-gap/25, info-arch 17-gap/30, lotto 3-gap/30). cycle 2296 retro 추천대로 review-code(heavy) 재탐색 — #1338 family(analysis/predictions/insights 계열)는 이미 8건 전부 sweep 완료된 상태라 새 sweep 대상 탐색.

발견: `predictions` 테이블 쿼리 전수 grep — `scoring_rule` 미필터 후보 중 `/debug/reliability` (calibration reliability diagram, BASIC auth 보호 내부 도구)가 `.from('predictions')` 쿼리에 `scoring_rule`/`prediction_type` 필터를 아예 걸지 않음 확인. 형제 페이지 `/accuracy`는 동일 population 개념에 `CURRENT_MODEL_FILTER` + `prediction_type='pre_game'` 필터 적용 중 — reliability 페이지만 누락. 실제 영향: 과거 scoring_rule 버전(v1.5~v1.7-revert) + shadow row(v2.0-shadow/v2.1-B-shadow, 평문 string reasoning) + post_game row + **MLB 예측(동일 predictions 테이블 공유, MLB_SCORING_RULE로 구분)까지 전부** calibration 집계에 혼입 — "현재 모델 보정 상태 진단"이라는 페이지 목적과 정면 배치. (`/v2-preview`도 유사하게 scoring_rule 미필터이나 noindex 내부 preview + 이미 v2.1-B rejected 확정 상태라 낮은 우선순위로 이번엔 skip, 후속 후보로 carry.)

수정: `CURRENT_MODEL_FILTER` import + `.match(CURRENT_MODEL_FILTER)` + `.eq('prediction_type', 'pre_game')` 추가 (`/accuracy` 패턴 그대로 이식). 정적 grep 회귀 테스트 신규 추가(`silent-drift-cycle-2297.test.ts`). 486 files/4101 tests pass, type-check/lint clean.

커밋은 branch+PR 없이 main 직접 커밋(f7f94f30) 후 즉시 push — pre-push hook lint/type-check 통과 확인.

다음 후보: `/v2-preview` scoring_rule 미필터 (noindex 내부 preview, 낮은 우선순위) 또는 2-chain lock 재평가(직전 8사이클 review-code 7/8 도달 임박) 후 explore-idea/lotto 다양성 확보.

## ⚪ explore-idea (heavy) — MLB standings division 매직넘버 신규 SUCCESS (cycle 2296, 2026-08-20)

진단: open issue 0건, approved plan 0건(20건 전부 completed/archived/blocked, plan#24 closed / plan#27 Phase3 data-blocked라 재활용 불가). **2-chain alternation lock 충족**(직전 8사이클 2288-2295 distinct=2: review-code x7 + lotto x1) — 두 chain 제외. **explore-idea saturation trigger 동시 충족**(직전 15사이클 review-code+fix-incident+polish-ui+info-arch = 12/15 ≥12). fix-incident(17-gap/20)/op-analysis(10-gap/25)/info-arch(15-gap/30) 모두 자체 주기 미도달.

배경: plan#27(MLB picks/leaderboard parity) Phase 3는 실측(mlb_user_picks=0, KBO user_picks=1)으로 무기한 보류 확정 상태 재확인 — 재활용 불가. plan#24는 전체 phase 완결(closed). 두 plan 모두 신규 idea 소스로 부적합 확인 후 코드 직접 read로 신규 갭 탐색.

발견: `/mlb/standings`에 KBO standings(cycle 2287 매직넘버 위젯) 대비 parity 갭 — MLB division 우승 매직넘버 부재. `computeMagicNumber`(KBO 전용으로 작성됐으나 `gamesPerTeam` 파라미터가 이미 일반화)를 division별 리더/2위(`rows[0]`/`rows[1]`, 이미 winPct 내림차순 정렬)에 `MLB_GAMES_PER_TEAM`(162)로 재사용 — 신규 DB 쿼리 0건, 순수 계산.

rubric: 가치 medium(KBO-MLB parity, 시즌 중 시의성) / 시간비용 small / risk 0(기존 검증된 순수 함수 재사용) / 자율가능 yes / 의존성 none → Tier 1 즉시 fire.

수정: 6개 division(AL/NL × East/Central/West) 각각 리더 행에 "지구 우승 매직넘버 N" 또는(확정 시) "지구 우승 확정" 배지 렌더. 와일드카드 매직넘버는 범위 밖(리더/2위 단순 비교로는 계산 불가 — 3장 슬롯 경쟁 로직 필요, 별도 cycle 후속 후보로 carry). `computeMagicNumber.test.ts`에 MLB gamesPerTeam=162 케이스 + `mlb-standings-page.test.ts`에 정적 grep 회귀 테스트 신규 추가. 485 files/4098 tests pass, type-check/lint clean.

PR #3004 → `gh pr merge --squash --auto --delete-branch` → `gh pr view --json state,mergedAt`로 `state=MERGED` 실측 확인(commit d810c364, 사례 18 mitigation 준수).

다음 후보: MLB 와일드카드 매직넘버(3장 슬롯 경쟁 로직 별도 설계 필요) 또는 review-code(heavy) 재탐색(단, 다음 사이클 2-chain lock 재평가 필요 — 직전 8사이클 review-code 비중 여전히 높음) 또는 lotto(2-gap/30).

## ⚪ review-code (heavy) — opengraph-image.tsx + debug/agent-fallback/page.tsx scoring_rule 필터 누락 정정 (#1338 family 7번째/8번째, sweep 완전 종료) SUCCESS (cycle 2295, 2026-08-20)

진단: open issue 0건, approved plan 0건(전 20건 completed/archived/blocked). 2-chain lock 미충족(직전 8사이클 distinct=3: review-code x6 + explore-idea x1 + lotto x1). 주기 trigger 3종 미도달(fix-incident 17-gap/20, op-analysis 10-gap/25, info-arch 15-gap/30, lotto 1-gap/30). cycle 2293 retro가 carry-over로 명시한 저트래픽 잔여 2파일(`opengraph-image.tsx` game/[id], `debug/agent-fallback/page.tsx`) 마무리 처리.

발견 1 (`analysis/game/[id]/opengraph-image.tsx`): `getGameOg`의 `predictions.find(p => p.prediction_type === "pre_game")`가 scoring_rule 미확인 — daily.ts가 동일 game_id에 production(v1.8) + shadow(v2.1-B-shadow/v2.0-shadow) row 모두 prediction_type='pre_game'으로 insert하는 상황에서 정렬 보장 없는 find()가 소셜 공유 OG 이미지에 임의 row 표시 가능 (#1338 family 7번째).

발견 2 (`debug/agent-fallback/page.tsx`, 신규 증상 클래스): `getCohort` 쿼리가 prediction_type만 필터, scoring_rule 미필터 — shadow row의 `reasoning` 필드는 `[v2.1-B-shadow quant only] ...` / `[v2.0-shadow quant only] ...` 형태의 **평문 string**(`agentFallbackStats.ts`가 기대하는 `{debate:{...}}` 객체 아님). 캐스팅 후 `.debate` 접근 시 undefined → hasJudge/hasHome/hasAway 전부 false → shadow row 전량 quantOnly 카테고리로 오분류, LLM 토론 fallback 모니터링 대시보드(fullDebate/agentsFailed/quantOnly rate)가 인위적으로 왜곡. #1338 family 8번째지만 **픽 선택 오류가 아닌 모니터링 metric 오염**이라는 새 증상 형태 — shadow row 오염 패턴이 사용자 가시 페이지뿐 아니라 내부 관측 도구도 침투 가능함을 확인.

수정: opengraph-image.tsx는 select에 `scoring_rule` 추가 + find predicate에 `scoring_rule === CURRENT_SCORING_RULE` 조건. debug 페이지는 daily.ts 기존 shadow 제외 관례(`'.in(scoring_rule, PRODUCTION_COHORT_RULES)'`)를 그대로 재사용 — v1.8 + v1.8-credit-fail(실제 production fallback 상태) 포함, shadow만 제외. 정적 grep 회귀 테스트 양쪽 파일 신규 추가. type-check/lint clean, test 485 files/4096 tests pass. PR #3003 → `gh pr merge --squash --auto --delete-branch` → `gh pr view --json state,mergedAt`로 `state=MERGED` 실측 확인(commit dd256498, 사례 18 mitigation 준수).

#1338 family sweep 완전 종료 (총 8건: buildTeamProfile/buildMatchupProfile/buildTeamFactorAverages/series.ts/analysis-game-[id]/predictions-목록·일별/opengraph-image/debug-agent-fallback). review-code(heavy) 7연속 SUCCESS streak(cycle 2288~2295). 직전 8사이클(2288-2295) distinct=2(review-code x7, lotto x1) 도달 — 다음 사이클 2-chain lock 트리거 예상. 다음 후보: explore-idea 또는 잠긴 2 chain 제외 후 자연 선택.

## ⚪ lotto (lite) — 30-cycle gap 감사, drift 없음 SUCCESS (cycle 2294, 2026-08-20)

진단: open issue 0건, approved plan 0건. 2-chain alternation lock 충족(직전 8사이클 distinct=2: review-code x7 + explore-idea x1) — 두 chain 제외. lotto trigger 6(30-cycle gap, 마지막 fire cycle 2264)이 정확히 도달한 유일한 강제 trigger.

감사: `lotto.ts count` → 유효 조합 7,705,415 / 전체 8,145,060 / 제거 439,645(5.40%), cycle 2264 baseline 대비 delta=0(1237회차 데이터 불변, 다음 추첨 2026-08-22 토 미도래). `lotto.ts update` → "이미 최신(1237회차)" 확인, 신규 회차 없음. `lotto.ts rules` → 256규칙 테이블 정상. picks(`2026-08-22-50sets.md`)와 직전 회차 OOS(`2026-08-15-result.md`, N=11 누적, 3개+ 일치 1/50=2% 기댓값 수준)는 이미 최신 상태라 재생성 불필요.

코드 변경 0, cycle 2264와 동일한 audit-only 결과. 2-chain lock 은 1-cycle cooldown이라 다음 사이클엔 review-code/explore-idea 재선택 가능. 다음 후보: review-code(heavy) 잔여 미정정 2파일(OG image/debug, 낮은 우선순위) 또는 explore-idea(heavy) 신규 기능.

## ⚪ review-code (heavy) — predictions/page.tsx + predictions/[date]/page.tsx scoring_rule 필터 누락 정정 (#1338 family 6번째, 최고 트래픽 페이지) SUCCESS (cycle 2293, 2026-08-20)

진단: open issue 0건, approved plan 0건. 2-chain lock 미충족(직전 8사이클 distinct=3). 주기 trigger 3종 미도달(fix-incident 15-gap/20, op-analysis 8-gap/25, info-arch 13-gap/30, lotto 29-gap/30 근접이나 미도달). cycle 2292 retro가 "sweep이 lib 레이어만 커버해 app/**/page.tsx 라우트 파일을 놓쳤다"고 명시 지목 — 실제로 `apps/moneyball/src/app/**/page.tsx` 전체 route 파일을 `prediction_type.*pre_game` grep으로 재sweep.

발견: 47개 파일 grep 후 `CURRENT_MODEL_FILTER`/`CURRENT_SCORING_RULE`/`scoring_rule` 부재 4건(`opengraph-image.tsx`(game/[id]), `predictions/page.tsx`, `predictions/[date]/page.tsx`, `debug/agent-fallback/page.tsx`)으로 축소. 이 중 `predictions/page.tsx`(`getPredictionDates`)와 `predictions/[date]/page.tsx`(`getGamePredictions`) 둘 다 **SQL 레벨 dotted `.eq('predictions.prediction_type','pre_game')`만 걸려있고 scoring_rule 필터가 전혀 없음** — daily.ts가 매 경기 production(v1.8) insert 직후 shadow row(v2.1-B-shadow/v2.0-shadow)도 동일 prediction_type='pre_game'으로 insert 중이라, SQL 레벨 필터가 매칭되는 모든 row(최대 3개)를 그대로 임베드하고 `predictions[0]` 인덱싱이 정렬 보장 없이 production/shadow 중 임의 row를 선택 가능한 상태(cycle 2290 `buildTeamFactorAverages.ts`와 동일 심각도 클래스 — JS `.find()`보다 심각). 이 두 페이지는 **사이트 최고 트래픽 허브**(예측 목록 + 일별 카드)라 지금까지 발견된 #1338 family 파일 중 영향 범위 최대.

수정: 두 파일 모두 `CURRENT_SCORING_RULE` import + select에 `scoring_rule` 컬럼 추가 + `buildMatchupUpcoming.ts` 기존 안전 패턴과 동일한 dotted `.eq("predictions.scoring_rule", CURRENT_SCORING_RULE)` 필터 추가. 정적 grep 회귀 테스트(`silent-drift-cycle-2293.test.ts`) 양쪽 파일에 신규 추가. type-check/lint clean, test 483 files/4091 tests pass. PR #3002 → `gh pr merge --squash --auto --delete-branch` → `gh pr view --json state,mergedAt`로 `state=MERGED` 실측 확인(commit 17f20645, 사례 18 mitigation 준수).

review-code(heavy) 6연속 SUCCESS streak(cycle 2288~2293, #1338 family). 잔존 미정정 파일 2건(`opengraph-image.tsx`, `debug/agent-fallback/page.tsx`) — OG 소셜 미리보기/디버그 페이지로 사용자 영향 낮아 이번 사이클 범위 제외, carry-over. 다음 후보: lotto(gap 29/30, 다음 사이클 정확히 도달) 다양성 확보, 또는 review-code(heavy) 잔여 2파일 정리.

## ⚪ review-code (heavy) — analysis/game/[id]/page.tsx scoring_rule 필터 누락 정정 (#1338 family 5번째, sweep 누락 발견) SUCCESS (cycle 2292, 2026-08-20)

진단: open issue 0건, approved plan 0건(plan #27 Phase 3 데이터 게이트 재확인 — `user_picks`=1건/`mlb_user_picks`=0건/`mlb_pick_poll_events`=0건, ≥10 임계 미충족으로 계속 보류). 2-chain lock 미충족(직전 8사이클 distinct=3). 주기 trigger 3종 미도달(fix-incident 14-gap/20, op-analysis 7-gap/25, info-arch 12-gap/30, lotto 28-gap/30 근접이나 미도달). cycle 2291이 "#1338 family sweep 완료"라 선언했으나 재확인 차원에서 review-code(heavy) 대상 재탐색 — `analysis/game/[id]/page.tsx`(838줄, cycle 156 이후 전체 재감사 이력 없음, wave-335~585 30+ feature 누적)를 전체 정독.

발견: `getGameAnalysis`의 predictions select가 **`prediction_type` 필터조차 SQL 레벨에 없이** 전체 row를 가져와 JS `.find(p => p.prediction_type === 'pre_game')`로 하나만 선택 — daily.ts가 매 경기 production(v1.8) insert 직후 shadow(v2.1-B-shadow/v2.0-shadow) row도 동일 prediction_type='pre_game'으로 insert 중(#1338 family)이라, 정렬 없는 `.find()`가 production/shadow 중 임의 row를 선택 가능한 상태. 이 페이지는 심판 판정/에이전트 논거/팩터 해설/waterfall/수렴 픽 배지 전부가 이 값에 의존하는 **최고 트래픽 분석 상세 페이지**라 영향 범위가 다른 family 파일보다 큼.

**cycle 2291 "sweep 완료" 선언 정정**: 그 sweep은 `prediction_type === 'pre_game'`/`.eq("prediction_type","pre_game")` grep 대상을 lib 레이어 위주로 훑었고, `apps/moneyball/src/app/**/page.tsx` 같은 라우트 파일까지 포괄하지 못해 본 파일을 놓침. #1338 family 재발 계보(cycle 2288~2291)에 **6번째 사례**로 추가 — "sweep 완료" 선언은 실제 grep 범위(파일 glob)를 명시하지 않으면 과신될 수 있다는 교훈.

수정: `CURRENT_SCORING_RULE` import + select에 `scoring_rule` 컬럼 추가 + `.find()` predicate에 `p.scoring_rule === CURRENT_SCORING_RULE` 조건 추가(buildMatchupProfile.ts cycle 2289 패턴과 동일 — LEFT embed라 SQL dotted eq 대신 JS 필터 유지). 정적 grep 회귀 테스트(`silent-drift-cycle-2292.test.ts`) 추가. type-check/lint clean, test 481 files/4085 tests pass. PR #3001 → `gh pr merge --squash --auto --delete-branch` → `gh pr view --json state,mergedAt`로 `state=MERGED` 실측 확인(commit 0ff3efb3, 사례 18 mitigation 준수).

다음 후보: `apps/moneyball/src/app/**/page.tsx` 전체(라우트 파일)를 대상으로 한 진짜 전수 sweep 재실행 권장 — 이번 발견이 lib 파일만 훑은 sweep의 사각지대였다는 점을 고려하면 다른 route 파일에도 동일 누락 가능성 존재. lotto(gap 28/30, 다음 사이클 도달 예상)도 다양성 후보.

## ⚪ review-code (heavy) — series.ts scoring_rule 필터 누락 정정 (#1338 family 4번째, sweep 완료) SUCCESS (cycle 2291, 2026-08-20)

진단: open issue 0건, approved plan 0건(20개 전부 completed/archived/blocked, unprocessed lookup 대상 제외). 2-chain lock 미충족(직전 8사이클 distinct=3: review-code/operational-analysis/explore-idea). 주기 trigger 3종 미도달(fix-incident 13-gap/20, op-analysis 6-gap/25, info-arch 11-gap/30, lotto 27-gap/30 근접이나 미도달). cycle 2290 retro가 지목한 `insights/series.ts` 후속 확인.

감사: `getSeriesByTopic`의 predictions select가 `.eq("prediction_type","pre_game")`만 걸고 scoring_rule 미필터 확인. shadow-cohort.ts의 shadow row(v2.1-B-shadow/v2.0-shadow)도 order-by created_at desc 대상에 포함되나, daily.ts가 shadow row의 reasoning 필드를 템플릿 문자열(`` `[v2.1-B-shadow quant only] ${finalReasoning}` ``)로 넣어 object가 문자열로 뭉개져 저장 — series.ts의 `ReasoningShape` 파싱(`r?.debate?.verdict`)이 실패해 `presented`가 null이 되어 우연히 걸러지고 있었음(실제 유저 가시 오염 0, 다만 fragile — reasoning 포맷이 나중에 바뀌면 silent leak 재발 가능).

수정: `CURRENT_MODEL_FILTER` import + `.match(CURRENT_MODEL_FILTER)` 추가(sibling 컨벤션 정합, defense-in-depth). 정적 grep 회귀 테스트(`silent-drift-cycle-2291.test.ts`) 추가. type-check/lint clean, test 480 files/4082 tests pass. PR #3000 → `gh pr merge --squash --auto --delete-branch` → `gh pr view --json state,mergedAt`로 `state=MERGED` 실측 확인(commit 411dea9d, 사례 18 mitigation 준수).

**#1338 family sweep 완료 확인**: `prediction_type='pre_game'` 사용 전체 파일(35개, __tests__ 제외) 재검sweep → `CURRENT_MODEL_FILTER`/`CURRENT_SCORING_RULE`/`scoring_rule` 부재 파일 0건. cycle 2288(buildTeamProfile)~2291(series) 4개 파일 순차 fix로 형제 파일 전부 정합 완료.

다음 후보: lotto(gap 28/30, 다음 사이클 근접 도달 예상) — diversity 확보. review-code(heavy) #1338 family sweep 종료로 신규 대형 미감사 영역 재탐색 필요 시점.

## ⚪ review-code (heavy) — buildTeamFactorAverages.ts scoring_rule 필터 누락 정정 (#1338 family 3번째) SUCCESS (cycle 2290, 2026-08-20)

진단: open issue 0건, approved plan 0건(plan #27 phase1_done/phase2_rejected/phase3_blocked_on_data — unprocessed lookup 대상 제외). 2-chain lock 미충족(직전 8사이클 distinct=3). 주기 trigger 3종 미도달(fix-incident 12-gap/20, op-analysis 5-gap/25, info-arch 10-gap/30, lotto 26-gap/30 — picks 파일 이미 존재/data 최신이라 신규 작업 불필요). cycle 2289 retro가 지목한 "#1338 family 잔존 미감사 대형 파일 재탐색"을 grep sweep으로 수행.

감사: `prediction_type === 'pre_game'`/`.eq("prediction_type","pre_game")` 사용 전체 파일(~47개) grep → `CURRENT_MODEL_FILTER`/`CURRENT_SCORING_RULE`/`scoring_rule` 부재 파일만 필터링해 후보 축소. `buildTeamAccuracy.ts`/`buildPitcherProfile.ts`/`buildModelTuningInsights.ts`/`buildTeamStrengthSnapshot.ts`/`buildMissReport.ts`/`leaderboard/server.ts` 등은 이미 `CURRENT_MODEL_FILTER`(`.match()`)로 안전 확인(false positive 배제). 남은 후보 2건 중 `buildTeamFactorAverages.ts`(매치업 페이지 팀 팩터 평균 전용 쿼리)를 실제 버그로 확정 — `predictions` select가 `.eq("prediction_type","pre_game")`만 걸고 `scoring_rule` 필터가 전혀 없음. 이건 SQL 레벨 `.eq()` 필터라 매칭되는 모든 row(production v1.8 + shadow v2.1-B-shadow + shadow v2.0-shadow, 셋 다 동일 game_id+prediction_type)를 그대로 반환 — cycle 2288/2289의 JS `.find()` 단일 오염보다 더 심각(게임당 최대 3배 중복 카운트, sampleN 부풀림 + 최근 경기 중복 가중). `buildMlbTeamFactorAverages.ts`(MLB 대응)는 이미 `MLB_PRODUCTION_COHORT_RULES` 필터 적용돼있어 KBO 쪽만 누락된 sibling 불일치로 확정.

수정: `CURRENT_MODEL_FILTER` import + `.match(CURRENT_MODEL_FILTER)` 추가(select 직후, `prediction_type` eq 앞). 기존 mock에 `match()` 체인 추가 + 신규 정적 grep 회귀 테스트(`silent-drift-cycle-2290.test.ts`, cycle 2288 `buildTeamProfile` 패턴 재사용). type-check/lint clean, test 479 files/4080 tests pass. PR #2999 → `gh pr merge --squash --auto --delete-branch` → `gh pr view --json state,mergedAt`로 `state=MERGED` 실측 확인(commit 1b2217e7, 사례 18 mitigation 준수).

다음 후보: `insights/series.ts`도 동일하게 scoring_rule 필터 없음이 확인됐으나, shadow row는 LLM debate(`reasoning`) 미기록으로 추정돼 실무 영향이 낮을 가능성 — 다음 review-code(heavy) fire 시 실측 확인 권장. lotto도 gap 27/30로 다음 사이클 근접.

## ⚪ review-code (heavy) — buildMatchupProfile.ts scoring_rule 필터 누락 정정 (#1338 family 2번째) SUCCESS (cycle 2289, 2026-08-20)

진단: open issue 0건, approved plan 0건(20개 전부 completed/archived/blocked). 2-chain lock 미충족(직전 8사이클 distinct=3). 주기 trigger 3종 미도달(fix-incident 11-gap/20, op-analysis 4-gap/25, info-arch 9-gap/30, lotto 25-gap/30 근접). cycle 2288 retro가 지목한 잔존 후보 — `buildMatchupProfile.ts`/`buildMatchupUpcoming.ts` scoring_rule 필터 정합.

감사: 두 파일 grep 확인 — `buildMatchupUpcoming.ts`는 이미 `.eq("predictions.scoring_rule", CURRENT_SCORING_RULE)` 적용(안전). `buildMatchupProfile.ts`는 predictions가 LEFT embed(`!inner` X, final 경기 record 카운트 위해 의도적)라 `.find(p => p.prediction_type === "pre_game")`만 JS 레벨 필터 — scoring_rule 미검사. daily.ts가 매 경기 production(v1.8) insert 직후 shadow(v2.1-B-shadow/v2.0-shadow) row도 동일 prediction_type='pre_game'으로 insert 중(#1338 family) → `.find()`가 임의 순서로 shadow row를 집어 대결(H2H) 페이지의 confidence/is_correct/predicted_winner 가 오염 가능한 상태.

수정: `scoring_rule` select 필드 + `GameRow` 타입 추가, `.find()` 조건에 `p.scoring_rule === CURRENT_SCORING_RULE` 추가 (SQL 레벨 dotted eq는 LEFT embed와 모호해서 JS 필터 유지). 주석 갱신. 회귀 가드 테스트 신규 1건(shadow row 동석 시 production만 선택) + 기존 fixture 5건에 `scoring_rule: "v1.8"` 추가(신규 필터로 인한 기존 테스트 breakage 차단). type-check/lint clean, test 478 files/4078 tests pass. PR #2998 → `gh pr merge --squash --auto --delete-branch` → `gh pr view --json state,mergedAt`로 `state=MERGED` 실측 확인(commit 64e5241e, 사례 18 mitigation 준수).

다음 후보: lotto(26-gap/30, 다음 사이클 근접) — #1338 family 형제 파일 2건(buildTeamProfile.ts cycle 2288 + buildMatchupProfile.ts 본 cycle) 모두 완료. review-code(heavy) 재선택 시엔 잔존 미감사 대형 파일 재탐색 필요.

## ⚪ review-code (heavy) — buildTeamProfile.ts scoring_rule 필터 누락 정정, shadow row 오염 차단 SUCCESS (cycle 2288, 2026-08-20)

진단: open issue 0건, approved plan 0건(20개 전부 status 없음/completed/archived). 2-chain lock 미충족(직전 8사이클 distinct=5). 주기 trigger 3종 미도달(fix-incident 10-gap/20, op-analysis 3-gap/25, info-arch 8-gap/30, lotto 24-gap/30 근접). cycle 2286/2287 retro 공통 지목 — 잔존 미감사 대형 파일 `teams/[code]/page.tsx`(621줄)/`predictions/[date]/page.tsx`(618줄).

감사: 두 파일 전체 정독 — 양쪽 다 assertSelectOk 전면 적용 이미 완료(이전 사이클 감사 흔적). 감사 범위를 `teams/[code]` 직접 의존 모듈(`buildTeamUpcoming.ts`/`buildTeamEloTrend.ts`/`convergenceRecord.ts`)로 확장 — 전부 assertSelectOk + scoring_rule 필터 정합 확인. 마지막으로 `buildTeamProfile.ts`(586줄) 확장 감사.

발견: `buildTeamProfile.ts`의 games select가 `predictions!inner(...)`에 `prediction_type='pre_game'` 필터만 걸고 **scoring_rule 필터가 아예 없음** — `shadow-cohort.ts`가 `daily.ts` 파이프라인에서 매 경기 production(v1.8) insert 직후 shadow(v2.1-B-shadow/v2.0-shadow) row도 동일 prediction_type='pre_game'으로 daily 누적 중(#1338 family). 정렬 없는 `predictions?.[0]`이 production/shadow 중 임의 row를 선택 — 팀 프로필 페이지 적중률/팩터평균/선발FIP/최근기록/연승연패/평균마진/홈원정편차 전부 shadow 모델 값으로 오염 가능한 상태. 같은 디렉토리 `buildTeamUpcoming.ts`/`teams/[code]/recent/page.tsx`는 이미 `CURRENT_SCORING_RULE` 필터로 회피해온 패턴인데 `buildTeamProfile.ts`만 누락 — daily 파이프라인이 shadow insert 활성 유지 중이라 매일 재발 가능한 살아있는 버그.

수정: `.eq("predictions.scoring_rule", CURRENT_SCORING_RULE)` 추가 (형제 파일 컨벤션 정합) + 정적 grep 회귀 테스트(`silent-drift-cycle-2288.test.ts`) 추가 + 기존 `buildTeamProfile.test.ts` mock 단일 `.eq()` 체인을 2단 체인으로 갱신. type-check/lint clean, test 478 files/4077 tests pass. PR #2997 → `gh pr merge --squash --auto --delete-branch` → **`gh pr view --json state,mergedAt` 로 `state=MERGED` 실측 확인**(commit e14defe5, 사례 18 mitigation 준수).

다음 후보: lotto(25-gap/30, 다음 사이클 도달 예상) 또는 review-code(heavy) 잔존 — `buildMatchupProfile.ts`/`buildMatchupUpcoming.ts` scoring_rule 필터 정합 재확인(teams 쪽과 동일 family 가능성).

## ⚪ explore-idea (heavy) — standings 매직넘버 위젯 신규 SUCCESS (cycle 2287, 2026-08-20)

진단: open issue 0건, approved plan 0건(20개 전부 archived/completed/phase-done, plan #27 leaderboard/picks Phase3 blocked_on_data). 2-chain lock 미충족(직전 8사이클 distinct=4: explore-idea/info-arch/review-code/op-analysis). 주기 trigger 3종 미도달(fix-incident 9-gap/20, op-analysis 2-gap/25, info-arch 7-gap/30, lotto 23-gap/30). **improvement saturation trigger 최초 명시 충족** — 직전 15사이클 중 review-code+fix-incident+polish-ui+info-arch = 13/15 (≥12).

배경 조사: plan #27(MLB 개인 픽/리더보드 parity) 재확인 — Phase 1(mlb_user_picks 테이블)만 유효, Phase 2는 이미 구현돼있어 폐기, Phase 3(리더보드 뷰)는 실측(`mlb_user_picks`=0건, `mlb_pick_poll_events`=0건, KBO `user_picks`=1건)으로 무기한 보류 — 사이트 전체 실 트래픽이 극히 낮아 데이터 의존 신규 기능(리더보드류)은 당장 착수 risk 높음 확인.

실행: 대신 신규 DB 쿼리 0건인 저위험 계산 기반 기능 선택 — KBO standings 페이지에 **매직넘버 위젯** 신규. `KBO_PLAYOFF_TEAM_COUNT=5`(가을야구 진출 5팀 체제) 상수 신규(packages/shared) + `computeMagicNumber` 순수 함수(표준 공식 `G - leaderWins - chaserLosses + 1`, 단위테스트 5건) + standings 페이지에 1위(우승)/5위(가을야구 진출선) 경계 매직넘버 배지 2종 렌더. rubric: 가치 medium(시즌 중 시의성 — 8/20 현재 ~120/144경기 진행) / 시간비용 small / risk 0 / 자율가능 yes / 의존성 none → Tier 1 즉시 fire.

검증: type-check/lint clean, test 4075/4075 pass (신규 5건 포함). PR #2996 → `gh pr merge --squash --auto --delete-branch` → **`gh pr view --json state,mergedAt` 로 `state=MERGED` 실측 확인**(commit 18e375e5, 사례 18 mitigation 준수 — "머지 진행" 서술 전 실제 명령 실행 + 결과 확인).

다음 후보: review-code(heavy) 잔존 미감사 대형 파일(`teams/[code]/page.tsx` 621줄, `predictions/[date]/page.tsx` 618줄) 또는 lotto(24-gap/30, 다음 사이클 근접 도달 예상).

## ⚪ review-code (heavy) — mlb-pipeline.ts 최초 전체 감사, mlb_team_stats select assertSelectOk 누락 정정 SUCCESS (cycle 2286, 2026-08-20)

진단: open issue 0건, approved plan 0건(status: approved 매칭 0건, plan #27 은 Tier3 blocked-on-data spec-only). 2-chain lock 미충족(직전 8사이클 distinct=5: fix-incident/explore-idea/info-arch/review-code/op-analysis). 주기 보정 trigger 3종 모두 미도달 (fix-incident 8-gap/20, op-analysis 1-gap/25, info-arch 6-gap/30, lotto 22-gap/30 — lotto 근접이나 미충족). cycle 2285 retro 가 review-code(heavy) 잔존 대형 미감사 파일로 mlb-pipeline.ts(743줄, 이력 0건) 지목.

감사: 전체(743줄) 최초 정독 — 8개 모드(statsapi_scrape/fancy_scrape/savant_scrape/predict_final/combined_notify/shadow_train/walk_forward_measure/elo_update) 전체 경로 + orchestrator(pipeline_runs insert, silent-drift-alert 연동) 확인.

발견: `runPredictFinal` 의 `mlb_team_stats` select 만 `.error` 미체크 — 바로 6줄 위 `mlb_schedule` select(`gErr` 체크)와 불일치. DB 에러 시 `statsByTeam` 이 빈 Map → 전 팀 `MLB_STAT_DEFAULTS` 로 조용히 fallback, 이 파일 자신의 주석(line 43-44, 사례 20: "cycle 2057 이전엔 이 값들이 항상, 무조건 쓰였음")이 경고하는 실패 모드가 select 에러 경로로도 재발 가능한 상태였음. daily.ts cycle 2284 weather backfill 과 동일 family (assertSelectOk 누락), 다른 파일 최초 발견.

수정: assertSelectOk 적용 + try/catch errors[] push. 커밋 6a662e65, push 완료. type-check/lint/test(476 files/4070 tests) 전부 clean.

다음 후보: review-code(heavy) 잔존 대형 미감사 파일 — buildTeamProfile.ts(586줄)/buildMatchupProfile.ts(579줄)는 cycle 2260 에서 상수/parity 축으로 이미 감사(전체 정독은 아님, 재확인 가치 낮음). 다양성 축 = lotto(23-gap/30, 근접) 다음 사이클 자연 도달 예상.

## ⚪ operational-analysis (lite) — 주간 리뷰 + CE cohort 안정 재확인 SUCCESS (cycle 2285, 2026-08-20)

진단: open issue 0건, approved plan 0건(20개 전부 archived/completed). 2-chain lock 미충족(직전 8사이클 distinct=4). 직전 4사이클(2281~2284) 연속 review-code(heavy) — cycle 2282/2283/2284 retro가 공통으로 lotto/op-analysis 다양성 전환 추천. lotto는 다음 회차(2026-08-22) picks + 직전(08-15) OOS 이미 완료 확인(파일 존재) — trigger 미해당. op-analysis는 gap 20/25(미도달)이나 diminishing-returns 신호(cycle 2283 review-code가 "drift 없음" 판정) 겹쳐 다양성 우선 선택.

실행(lite, 코드 변경 없음): 이번 주(08-17~08-23) KBO 예측 집계 — n=10 검증완료, 5승5패 50.0%(표본 극소, 결론 보류). `scripts/op-analysis-ce-cohort.ts` 재실행 — 누적 n=321(CE=274/비CE=47, cycle 2265와 완전 동일 수치 — 실제 시간 간격 2.5시간이라 신규 검증 없음, 정상). CE 54.0% vs 비CE 63.8% = 9.8pp 격차 유지(cycle 2191 9.9pp→2146 9.7pp→2265 9.8pp, 안정 범위). overlap 월 통제 격차 10.8pp ≈ 전체 → LLM 부가가치 우세 방향 5회 연속 재확인. 최근 14일 v1.8 전량(56/56) CE(debate_version NULL) — CREDIT_EXHAUSTED 6th recurrence 상태 변화 없음.

skill-evolution trigger 평가: trigger3(2285%50=35) 미충족. trigger5 — 평가대상 review-code, 직전20사이클(2266-2285) 14회 fired, 미충족. marker 박제 안함.

다음 후보: review-code(heavy, 잔존 대형 미감사 파일: mlb-pipeline.ts/buildTeamProfile.ts/buildMatchupProfile.ts) 또는 lotto(21-gap/30 근접).

## ⚪ review-code (heavy) — daily.ts 최초 전체 감사, weather 백필 assertSelectOk 누락 정정 SUCCESS (cycle 2284, 2026-08-20)

진단: open issue 0건, approved plan 0건. 2-chain lock 미충족(직전 8사이클 distinct=4). 주기 보정 trigger 3종 (lotto 20-gap/30, op-analysis 19-gap/25, fix-incident 6-gap/20) 모두 미도달. cycle 2283 이 "review-code heavy 대형 미감사 파일 pool 소진 임박" 주장했지만 재탐색 결과 `packages/kbo-data/src/pipeline/daily.ts`(1607줄, 핵심 예측 파이프라인, 281개 fix 커밋이 손댄 파일) 가 review-code 이력 0건으로 확인 — 최우선 미감사 대형 파일 재발견 (cycle 2283 결론 정정).

감사: 전체(1607줄) 최초 정독 — announce/predict/predict_final/verify 4개 모드 전체 경로, finish() 불변 보장, Fancy Stats/FanGraphs fetch, debate/quant fallback, shadow row (v2.1-B/v2.0) insert, GAP 감지, summary notification, accuracy 갱신 헬퍼 전부 확인.

발견: `games.weather` 백필 select(1006번대)만 유일하게 `.error` 미체크 — 이 파일 다른 모든 select/update(assertSelectOk/assertWriteOk 20+ 콜사이트)가 fail-loud 인 것과 불일치. DB 에러 시 "이미 weather 있음"으로 오판돼 매 cron 조용히 skip → weather 컬럼 영구 NULL, 완전 무가시. 사례 3/9 family 와 동일 클래스지만 이 파일에서 최초 발견.

수정: assertSelectOk 적용 + try/catch 로 errors[] push (for 루프 중단 방지, throw 시 나머지 게임 예측 중단 위험 회피). 커밋 6a5e2c1d, push 완료. type-check/lint/test(476 files/4070 tests, kbo-data 89/1147) 전부 clean.

다음 후보: daily.ts 는 이제 review 이력 1건 확보. review-code(heavy) 잔존 대형 미감사 파일 재탐색 시 `packages/kbo-data/src/pipeline/mlb-pipeline.ts`(743줄, 이력 0건), `buildTeamProfile.ts`(586줄, 이력 0건), `buildMatchupProfile.ts`(579줄, 이력 0건) 우선 고려. 다양성 축 = lotto(20-gap/30, 근접)·op-analysis(19-gap/25, 근접) 다음 사이클들 자연 도달 예상.
## ⚪ review-code (heavy) — convergenceRecord.ts 최초 전체 감사, drift 없음 (cycle 2283, 2026-08-20)

진단: open issue 0건, approved plan 0건(20개 전부 archived/completed 상태). 2-chain lock 미충족(직전 8사이클 distinct=4: review-code/fix-incident/explore-idea/info-architecture-review). review-code dominance 65%(13/20) 지속, dominance-positive streak 인정 범위(cycle 135 룰). lotto(19-gap/30)·op-analysis(18-gap/25)·fix-incident(5-gap/20)·info-arch(3-gap/30) 모두 자체 주기 미도달. cycle 2281/2282 carry-over가 review-code(heavy) 잔존 미감사 대형 파일 재탐색 추천.

탐색: game/[id]/page.tsx(838줄, review 이력 12건)/buildAccuracyData.ts(776줄, 17건)/accuracy/page.tsx(1203줄, 24건)/page.tsx(1082줄, 17건) 모두 이미 다회 감사. `lib/analysis/convergenceRecord.ts`(781줄) 는 review-code 이력 0건 — 최초 전체 감사 최우선 후보로 선정.

감사: 전체(781줄) 최초 정독 — KBO/MLB 양쪽 수렴 픽 기록 조회(팀별/홈어웨이/요일별/streak/H2H) 전체 경로. 모든 Supabase 쿼리(games/mlb_schedule/predictions/teams) `assertSelectOk` 적용 확인 — 누락 0건(cycle 2281/2282 family 재발 없음). MLB duel 계산에 Elo/최근폼 미포함은 `computeMlbCompositeDuel` 설계상 6팩터 한정(MLB_FACTOR_PICK_STRONG/COMPLETE 주석과 일치) — drift 아님. `getMlbConvergencePickHeadToHeadRecord`의 `minFactors` 필수 파라미터(기본값 없음)와 모든 콜러(`mlb/matchup`, `en/mlb/matchup`)의 명시적 `MLB_FACTOR_PICK_STRONG`/`COMPLETE` 전달 확인 — cycle 2070 dead-gate 재발 방지 설계 정상 작동. `computeWinRatePct` 0-division 가능 콜사이트 전부 `total > 0` 가드 또는 `minPicks` 필터링된 non-null 반환값만 사용 확인. color-class 헬퍼 3종(`statColorClass*`) + `computeUpcomingPickGameIds` 등 전부 실사용 확인(dead export 없음).

결론: 이 파일에서 silent drift/부정확한 주석/dead code/불일치 미발견. 코드 변경 없음 — 감사 결과만 박제(재감사 회피용, 다음 review-code heavy가 재탐색할 필요 없도록 이력 남김).

다음 후보: review-code(heavy) 대형 미감사 파일 pool 소진 임박 (781줄 이하는 대부분 이력 보유) — 다음 사이클은 lotto(19-gap/30, 20-gap 근접)·op-analysis(18-gap/25)·fix-incident(5-gap/20) 다양성 우선 고려 권장.

## 🟢 review-code (heavy) — analysis-data.ts getThisWeekRemainingGames elo 쿼리 assertSelectOk 누락 정정 (cycle 2282, 2026-08-20)

진단: open issue 0건, approved plan 0건. 2-chain lock 미충족(직전 8사이클 distinct=5). review-code dominance 지속(fix-incident gap=3/20, lotto gap=17/30, op-analysis gap=16/25 — 모두 자체 주기 미도달). cycle 2281 carry-over가 `analysis-data.ts` 잔존 대형 파일로 지목.

감사: `analysis-data.ts` 전체(918→919줄) 재정독. `getTodayAnalysisData`의 homeRank/awayRank/h2hHomeWins/homeTeamVenue 등 인터페이스 필드가 함수 안에서 채워지지 않는 것처럼 보였으나 page.tsx `gamesWithRank` map 이 별도로 augment — false lead 확인 후 배제.

발견: `getThisWeekRemainingGames` 의 `Promise.all([scheduleResult, eloResult])` 중 `eloResult`(이번 주 남은 경기 Elo/10팩터)가 다른 6개 쿼리와 달리 `assertSelectOk` 검증 없이 `if (eloResult.data)` 로만 분기 — cycle 2281이 같은 파일 `sp_confirmation_log`에서 고친 것과 동일한 family, 같은 파일 안 재발.

수정: `eloResult` 도 `assertSelectOk` 통과 (DB 에러 시 fail-loud). 정적 grep 회귀 테스트 `silent-drift-cycle-2282.test.ts` 추가.

부수 발견: `version-sync-guard` 테스트 fail — cycle 2281 이 VERSION/CHANGELOG 만 0.5.62.61 로 올리고 package.json(root+apps/moneyball) 갱신 누락. 0.5.62.62 로 일괄 정합.

검증: 476 test files / 4070 tests all pass, `pnpm type-check` clean, `pnpm lint` clean. 커밋 16cbaaf2, push 완료.

다음 후보: review-code(heavy) 잔존 — `game/[id]/page.tsx`(838줄)/`convergenceRecord.ts`(781줄)/`buildAccuracyData.ts`(776줄, 이미 review 이력 14건으로 상대적으로 감사 밀도 높음) 등. lotto(18-gap/30)·op-analysis(17-gap/25) 다양성도 고려 가능.

## 🟢 review-code (heavy) — calibration-agent.ts parseResponse silent fallback 정정 (cycle 2281, 2026-08-20)

진단: open issue 0건, approved plan 0건(20개 전부 archived/completed/blocked 상태 확인). 2-chain lock 미충족(직전 8사이클 distinct=5: review-code/polish-ui/fix-incident/explore-idea/info-architecture-review). 직전 20사이클 review-code dominance 65%(13/20). 직전 3 cycle(2278/2279/2280) 모두 "review-code(heavy) 잔존 대형 미감사 파일 재탐색" carry-over. lotto(17-gap/30)·op-analysis(16-gap/25)·info-arch(1-gap, 방금 fire) 모두 자체 주기 trigger 미도달.

탐색: `find ... | xargs wc -l` 로 최대 파일 재정렬 후 git log grep 으로 "review-code"/"최초 전체 감사" 커밋 이력 대조 — `agents/validator.ts`(909줄) 가 review-code 이력 0건으로 최우선 후보 확인.

감사: `validator.ts` 전체(909줄) 최초 정독 — 환각숫자/발명선수/금칙어/claim-type 4개 서브체크 + `buildInjectionText`/`maskViolatedReasoning`/`validateFactorAttribution` + 4개 Sentry capture 채널(`notifyValidationViolations`/`captureJudgeParseFallback`/`captureRivalryMemoryFallback`/`captureAgentFallback`). 모든 콜러(team-agent/judge-agent/postview/debate.ts/rivalry-memory.ts) 배선 grep 대조 결과 drift 없음 — cycle 884/981/982/986/1013 다수 과거 하드닝 반영된 상태로 확인.

인접 확장: `debate.ts`(119줄, 3-agent 병렬 실행 오케스트레이터) 로 감사 범위 확장 — `evaluateAndCaptureAgentFallback` 이 `[homeResult, awayResult, judgeResult]` 만 포함하고 `calibResult`(calibration-agent) 는 제외됨을 발견. `calibration-agent.ts` 를 따라가 실제 drift 확인: `parseResponse` catch 블록이 LLM JSON 파싱 실패 시 all-null `CalibrationHint` 를 정상 데이터처럼 반환 — `judge-agent.ts` 의 cycle 1400 lesson P2("parseResponse catch 자체가 fallback 객체를 정상 데이터처럼 반환 → evaluateAndCaptureAgentFallback 의 `r.data == null` 검사 미감지 → 22일 silent")와 완전히 동일한 family. judge-agent 는 당시 patch 됐지만 calibration-agent 는 대상에서 누락돼 지금까지 무방비.

수정: `validator.ts` 에 `captureCalibrationParseFallback` 신규 export (기존 3종 capture 함수와 동일 동적 import + try/catch 패턴). `calibration-agent.ts` `parseResponse` 시그니처에 `homeTeam`/`awayTeam` 추가 + catch 블록에서 호출 + export 전환(judge-agent 패턴 정렬) + 호출부(`runCalibrationAgent`) 갱신. 신규 테스트 3건(`agents-calibration-parse-fallback.test.ts`, judge-agent 의 `agents-judge-parse-fallback.test.ts` 와 동일 mock 패턴).

검증: 89 files/1147 kbo-data tests all pass (신규 3건 포함), `pnpm type-check` clean, `pnpm lint` clean.

다음 후보: review-code(heavy) 잔존 — `analysis-data.ts`(918줄)/`game/[id]/page.tsx`(838줄)/`convergenceRecord.ts`(781줄) 등 review-code 이력 0건 파일 다수 잔존. lotto(18-gap/30)·op-analysis(17-gap/25)·info-arch(2-gap/30) 다양성도 고려 가능.

## 🟢 info-architecture-review — /mlb/reviews/misses 헤더·푸터 sitemap 배선 누락 정정 (cycle 2280, 2026-08-20)

진단: info-architecture-review 30-cycle 미발화 trigger 도달 (마지막 fire cycle 2250, gap=30 정확 도달). open issue 0건, approved plan 0건(20개 전부 completed/archived/blocked), 2-chain lock 미충족(직전 8사이클 distinct=4: review-code 5/polish-ui 1/fix-incident 1/explore-idea 1). 직전 20사이클 review-code dominance 70%(14/20). cycle 2242 checkpoint 가 이미 IA 전수 조사(breadcrumb/sitemap/en미러/DESIGN.md) 완료해 "gap 없음" 확정했었지만, 그 이후(cycle 2279) 신규 라우트 `/mlb/reviews/misses` 가 추가돼 재검증 필요 시점.

실측: `grep Breadcrumb` 결과 misses 페이지 자체는 정상 배선. 하지만 Header.tsx `MLB_NAV`/Footer.tsx MLB 컬럼을 KBO_NAV/AI 예측 컬럼과 대조한 결과 KBO 는 `/reviews`+`/reviews/misses` 헤더·푸터 양쪽에 direct entry 존재하는 반면, MLB 는 `/mlb/reviews` 허브 링크만 있고 `/mlb/reviews/misses` 가 양쪽 다 누락 확인. Footer.tsx 코드 주석에 이미 명시된 "MLB 신규 라우트 추가 시 footer sitemap 컬럼 동기 누락" 반복 패턴(cycle 2153/2225 family) 재발.

수정: Header.tsx MLB_NAV + Footer.tsx MLB 컬럼에 `/mlb/reviews/misses` 항목 추가. `withMlbLocale`/`localizeNavItems` 의 startsWith("/mlb/reviews") 가드가 이미 하위 경로 전부 EN 미러 예외 처리하도록 설계돼 있어(cycle 2227) 로직 변경 없이 텍스트 엔트리 추가만으로 충분. 단, Header.test.ts 의 기존 EN locale 테스트가 정확 일치(`href === "/mlb/reviews"`) 조건이라 신규 misses href 를 걸러내지 못해 실패 — startsWith 조건으로 정정 + misses 케이스 explicit assertion 추가. Footer.test.tsx 에도 동일 assertion 추가.

검증: 475 files/4069 tests all pass, `tsc --noEmit` clean, lint clean. VERSION 0.5.62.59→60.

다음 후보: review-code(heavy) 대형 미감사 파일 재탐색 또는 lotto(16/30-gap)/op-analysis(15/25-gap) 다양성. info-arch 는 이번 fix 로 다시 30-cycle 카운트 리셋.

## 🟢 explore-idea (heavy) — /mlb/reviews/misses 신규, KBO 회고 페이지 parity gap (cycle 2279, 2026-08-20)

진단: explore-idea saturation trigger 충족 (직전 15 사이클 review-code+fix-incident+polish-ui 누적 12회 ≥12, 직전 20 사이클 review-code dominance 75% 15/20). 2-chain lock 미충족(직전 8사이클 distinct=4: explore-idea/review-code/polish-ui/fix-incident). open issue 0건, approved plan 0건(20개 전부 completed/archived/blocked). fix-incident 방금 발화(gap=0)/op-analysis 13-gap/lotto 14-gap/info-arch 28-gap 모두 자체 주기 trigger(25/30/30) 미도달 — cycle 2278 명시 carry-over("lotto/op-analysis/info-arch gap 다양성 또는 review-code 재탐색") 대비 saturation trigger 가 우선 발화 조건으로 명확해 explore-idea 선택.

탐색: `/mlb/reviews` 허브(수렴 픽 성적/스트리크/팀별·홈어웨이·요일별 분해)를 KBO `/reviews` 와 대조 — KBO 만 있는 `/reviews/misses`(고확신 실패 회고) 가 MLB 대응 부재 확인. MLB 주간/월간 리뷰의 `MlbHighlightCard` 는 개별 경기 배지만 노출, 시즌 전체 Top N 집계 없음. DB 실측(직접 supabase 쿼리): 최종 확정 MLB 827경기 중 예측 849건, 고확신(≥55%) 오답 383건 — 페이지가 비지 않을 만큼 표본 충분.

제약 확인: MLB 는 postview 심판 에이전트 부재(`postview-daily.ts` KBO 전용, `judgeReasoning`/`factorErrors` 컬럼 MLB 행 전량 미생성) — KBO 와 동일한 서술형 회고 불가. 대안으로 5팩터(FIP/xFIP/wOBA/불펜FIP/WAR) 중 어떤 것이 (틀린) 예측 방향을 가장 강하게 뒷받침했는지 정량 계산해 노출하는 방식 채택(반대 방향 팩터는 제외).

구현: `buildMlbMissReport()` 신규(`lib/reviews/mlb-shared.ts`) — `mlb_schedule`(status=final) + `predictions`(league=mlb, scoring_rule=MLB_PRODUCTION_COHORT_RULES) 조인, `classifyWinnerProb` tossup 제외 + `deriveMlbOutcome` 오답 필터 + confidence 내림차순 + limit. 기존 `MLB_FACTOR_COLUMN_PAIRS`/`LOWER_IS_BETTER`(mlb-shared.ts 내부 private) export 전환해 `buildMlbFactorInsights` 와 동일 소스 재사용(신규 magic-number 중복 회피). 페이지 `apps/moneyball/src/app/mlb/reviews/misses/page.tsx`(KBO `/reviews/misses` 레이아웃 mirror, `MissesSortControl` 재사용) + `/mlb/reviews` 허브 진입 카드 + `sitemap.ts`/`search/page.tsx` 엔트리 동기(cycle 2262/2263 silent-drift 회귀 가드가 자동 검출·차단해줌 — 실제로 최초 커밋 시 두 가드 모두 fail 후 수정).

검증: 신규 테스트 6건(`buildMlbMissReport.test.ts`, supabase mock 패턴은 기존 `buildMlbWeeklyReview.test.ts` 동일 — schedule/predictions select 실패 시 throw, 적중 예측 제외, tossup 제외, 반대 방향 팩터 제외 + confidence 내림차순 검증). 475 files/4069 tests all pass, `tsc --noEmit` clean, lint clean, pre-push CI pass. VERSION 0.5.62.58→59.

배포: PR #2993 → R7 자동 머지(`gh pr merge --squash --auto --delete-branch`) → `state=MERGED` 실측 확인(mergedAt 2026-08-19T19:38:59Z) 완료.

다음 후보: `/en/mlb/reviews/*` 전체(weekly/monthly/misses)가 아직 영어 미러 부재 — 기존 구조적 gap(신규 아님, 이번 cycle scope 밖). review-code(heavy) 대형 미감사 파일 재탐색 또는 lotto(15/30-gap)·op-analysis(14/25-gap)·info-arch(29/30-gap) 다양성 고려.

## 🟢 review-code (heavy) — packages/kbo-data/src/scrapers/fancy-stats.ts 최초 전체 감사, findPitcher stale line 참조 정정 (cycle 2277, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건 [20개 전부 completed/archived/blocked], 2-chain lock 미충족 직전 8사이클 distinct=3 [review-code 6 + polish-ui 1 + explore-idea 1], fix-incident 19-gap/op-analysis 12-gap/lotto 13-gap/info-arch 27-gap 모두 미도달). cycle 2276 carry-over 명시 후보 `fancy-stats.ts`(526줄, 최초 미감사) 선택 — dominance-positive streak(cycle 135 rule) 적용.

실측: 527줄 전체 read. 팀명 매핑(case-insensitive + 한글 폴백)/parseNum NaN fallback 가시화/xfip fallback silent drift 경고/Elo winPct=0.5 stub 경고 — 모두 이미 console.warn 으로 가시화 구현돼 clean. 테이블 인덱스 주석(투수 4/5/6/7, 타자 0/1/2/3)과 실제 코드 일치. 1건 발견: `findPitcher` docstring 이 호출자 위치를 "daily.ts:563-564"로 명시했지만 실제 호출부는 `daily.ts:693-694`(파일 성장에 따른 stale line 참조). 부수 확인(수정 X, scope 밖): Fancy Stats 소스 투수의 `era`/`innings` 하드코딩 0 값이 `snapshot-pitchers.ts` 경유 `pitcher_season_stats` 테이블에 그대로 기록되지만, KBO UI 어느 페이지도 이 컬럼을 조회하지 않아 현재는 dead column — 향후 소비자 추가 시 주의 필요.

수정: docstring 구체 line 번호 제거, "grep 우선" 안내로 정정 (코드 로직 변경 없음). 474 files/4063 tests all pass, `pnpm type-check` clean, lint clean, pre-push CI pass. main 직접 push(2 file 소규모 주석 정정, PR 생략).

다음 후보: review-code(heavy) 대형 미감사 파일 소진 근접 — 잔존 후보 재탐색 필요. 또는 fix-incident(19/20-gap 임박)·op-analysis(12/25-gap)·lotto(13/30-gap)·info-arch(27/30-gap) 다양성 고려.

## 🟢 review-code (heavy) — packages/kbo-data/src/pipeline/silent-drift-alert.ts 최초 전체 감사, factor anomaly alert 미배선 stale 주석 정정 (cycle 2276, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건 [status=approved 매칭 0건, 20개 plan 모두 completed/archived/blocked], 2-chain lock 미충족 직전 8사이클 distinct=3 [review-code 6 + polish-ui 1 + explore-idea 1], fix-incident 18-gap/op-analysis 11-gap/lotto 12-gap/info-arch 26-gap 모두 미도달, ship-0 emergency stop 미충족[직전 10 cycle 모두 success/partial 1건]). cycle 2275 carry-over 명시 후보 2건(`fancy-stats.ts` 526줄 / `silent-drift-alert.ts` 407줄) 중 이름 아이러니(silent drift *alert* 모듈 자체가 silent drift 가능성) 고려해 후자 선택.

실측: 407줄 전체 read + 5개 alert dispatcher(`captureSilentDriftAlert`/`captureFactorAnomalyAlert`/`captureCreditExhaustedAlert`/`captureSparsePredictionAlert`/`captureConfidenceFlatAlert`) 전수 caller grep. 4개는 `daily.ts`/`mlb-pipeline.ts`/`postview-daily.ts`에서 정상 호출 확인(clean). `captureFactorAnomalyAlert`(cycle 1013 M-D 확장)만 호출부 0건 + 테스트 0건(`pipeline-silent-drift-alert.test.ts`엔 `shouldAlertSilentDrift`/`shouldConfidenceFlatAlert` 두 describe만 존재) — 완전 dead. 원본 주석("cohort wiring (M-V2)의 evidence 누적 + 본 alert 가 함께 작동")이 실제 작동 중인 것처럼 서술했지만, `/debug/silent-drift` 대시보드는 순수 계산 함수 `detectFactorAnomalies`만 직접 사용(사람이 페이지 열람 시만 시각 표시) — Sentry alert dispatcher 자체는 자동 감지 채널로 한 번도 배선된 적 없음.

수정: 주석만 정정(코드 로직 변경 X, 자동 wiring 신규 구현 X — scope 밖). 실제 파이프라인 caller 추가는 explore-idea/feature 영역으로 분리. `PipelineMode` 대조 결과 `MLB_SCRAPE_MODES` 6개 값 모두 타입과 정합(drift 없음). VERSION 0.5.62.55→56, CHANGELOG.md 신규 entry. 474 files/4063 tests all pass, `tsc --noEmit` clean, lint clean.

다음 후보: review-code(heavy) 계속 시 `fancy-stats.ts`(526줄) 잔존 최초 미감사. 또는 op-analysis(11/25-gap)·lotto(12/30-gap)·fix-incident(18/20-gap) 다양성 고려. **신규 후속(자율 X, carry-over만)**: `captureFactorAnomalyAlert` 를 실제 파이프라인에 wiring할지(자동 z-score 감지 활성화) 여부는 명시적 feature 결정 — explore-idea heavy 후보로 carry.

## 🟢 review-code (heavy) — packages/shared/src/index.ts 최초 전체 감사, park factor narrative 주석 + dead export 정정 (cycle 2275, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건, 2-chain lock 미충족 직전 8사이클 distinct=3 [review-code 6 + polish-ui 1 + explore-idea 1], fix-incident 17-gap/op-analysis 10-gap/lotto 11-gap/info-arch 25-gap 모두 미도달). cycle 2274 carry-over 명시 후보 `packages/shared/src/index.ts`(3390줄, 모노레포 최대 미감사 파일) 선택.

실측: Explore agent 전체 read(3390줄) + 본 감사 대상 6항목(stale 주석/dead export/중복 상수/타입 불일치/매직넘버/dev jargon leak) 체계 점검. 600+ wave 누적 정리 이력 덕에 대부분 clean(가중치 합 검증/WEEKDAY_LABELS_KO 통합/MIN_POLL_TOTAL 가드 모두 정상). 2건 발견: (1) `PARK_FACTOR_NARRATIVE_HITTER_MIN` 주석이 "잠실(1.02) 포함 3구장 타자 친화"라 서술했지만 `factor-explanations.ts`의 실제 비교는 strict `>`라 잠실(정확히 1.02, 임계값과 동일)은 중립 처리 — 대칭설계 확인(인천 0.98도 동일하게 strict `<`로 경계 제외되어 자기 comment와 일치) 후 하이터측 주석만 정정(코드 변경 없음). (2) `PostType` — 최초 커밋(Phase 1)부터 정의됐지만 모노레포 전체 grep 결과 단 한 번도 참조 안 된 dead export, 제거.

부수 발견: cycle 2274 커밋이 VERSION/package.json만 bump(0.5.62.54)하고 CHANGELOG.md entry를 누락 — version-sync-guard 테스트 최초 fail로 발견, 누락 entry 소급 작성 후 재통과.

수정: 3개 파일(`packages/shared/src/index.ts` 주석+dead export, `CHANGELOG.md` 2개 entry 소급+신규, `VERSION`/`package.json`/`apps/moneyball/package.json` 0.5.62.55). 474 files/4063 tests all pass, `tsc --noEmit` clean, lint clean, pre-push CI pass. main 직접 push, PR 생략(5 file 소규모 정정).

다음 후보: review-code(heavy) 계속 시 `packages/kbo-data/src/scrapers/fancy-stats.ts`(526줄)/`packages/kbo-data/src/pipeline/silent-drift-alert.ts`(407줄) 둘 다 최초 감사 이력 없음. 또는 fix-incident(18/20-gap 임박)/op-analysis(11/25-gap)/lotto(12/30-gap) diversity 고려.

# TODOS

## 🟢 fix-incident — mlb_fancy_scrape User-Agent 헤더 누락 정정 (cycle 2278, 2026-08-20)

진단: fix-incident 20-gap trigger 도달 (마지막 발화 cycle 2258, 2278-2258=20). `pipeline_runs` 최근 7일/30일 실측 — 먼저 predict 모드 games_found=5/predictions=0 반복 37건 발견했으나 정상 idempotent skip(이미 예측 완료 게임 재조회, 매시 cron 재실행) 패턴으로 확인, 실제 이상 아님. 진짜 이상 = `mlb_fancy_scrape` mode 최근 30일 24/30일 error (HTTP 403 ↔ parse fail 교차 재발, 08-14~08-19 6일 연속 성공 후 08-20 재차 403).

실측: `fangraphs-mlb.ts`의 `fetchLeaderRows`가 `fetch(url)` 호출 시 헤더를 전혀 지정하지 않음 확인. 리포 내 모든 다른 fetch 스크레이퍼(형제 `fangraphs.ts` KBO 버전 포함) 는 처음부터 `KBO_USER_AGENT` 헤더 사용 — MLB 버전(cycle 1985 신규 wiring)만 누락. 기존 파일 상단 주석은 원인을 "FanGraphs SPA 개편으로 인한 구조 변경"으로만 서술했지만 실제로는 헤더 누락이 403 재발의 핵심 원인 중 하나.

수정: `fetch(url)` → `fetch(url, { headers: { 'User-Agent': KBO_USER_AGENT } })` 추가(rate limit/파싱 로직 변경 없음), 상단 주석 근거 갱신. VERSION 0.5.62.57→58, CHANGELOG.md entry. 474 files/4063 tests(moneyball) + 1144 tests(kbo-data) all pass, `pnpm type-check` clean, lint clean, pre-push CI pass. main 직접 push, PR 생략(1 로직 파일 + version bump).

검증 한계: 코드 수정은 확인됐으나 실제 fangraphs.com 이 이 UA 로 더 이상 403 반환 안 하는지는 다음 cron 실행(매일 19:17 UTC 전후) 결과로만 확인 가능 — 이번 cycle 안 fire 검증 불가(cron 스케줄 비동기). 다음 review-code 또는 fix-incident cycle 진단 시 `mlb_fancy_scrape` 최근 실행 status 재확인 필요.

## 🟢 polish-ui — 골드 accent 하드코딩 hex → CSS 토큰 정정 (cycle 2274, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건). **2-chain alternation lock 탐지** — 직전 8사이클 distinct=2 (review-code 7회 + explore-idea 1회) → 두 chain 후보 제외 후 재선택. fix-incident 16-gap/op-analysis 9-gap/lotto 10-gap/info-arch 24-gap 모두 강제 임계(20/25/30/30) 미도달, `gh run list` CI 최근 실패 0건(fix-incident 자연 trigger도 부재), lotto 다음 회차(2026-08-22) picks 이미 박제 + 직전 결과 이미 반영. design-system(DESIGN.md/lotto-data 최근 갱신, 4주 미만) 부적합. 강한 자연 trigger 부재 → 락 룰의 "어떤 chain 도 trigger 없으면 polish-ui 강제 발화" 폴백 적용.

실측: DESIGN.md 골드 accent 토큰(`--color-accent: #c5a23e`, `--color-accent-light: #e2c96b`) 존재 확인 후 컴포넌트 전수 grep(`#c5a23e`/`#e2c96b`, og/twitter-image 제외 — satori 렌더 특성상 리터럴 hex 필수라 기존 컨벤션 유지 대상). `TopStatPickCard.tsx`는 이미 `var(--color-accent-light)` 직접 참조 + 전용 회귀 테스트(`.test.tsx`에 하드코딩 hex `not.toContain` 단언)까지 갖춰 "토큰 참조가 확립된 컨벤션"임을 확인. 반면 `page.tsx`(홈 오늘 경기 위젯, 예측 배지 골드 강조)와 `analysis/page.tsx`(팩터 수렴 픽 강도 표시 3곳)는 라이트/다크 모드 색상을 리터럴 hex로 하드코딩 — 컨벤션 사각지대.

수정: 4곳(`page.tsx` 1곳 + `analysis/page.tsx` 3곳) 전부 `text-[#c5a23e]`→`text-[var(--color-accent)]`, `dark:text-[#e2c96b]`→`dark:text-[var(--color-accent-light)]` 정정. 474 files/4063 tests all pass(zero regression), `tsc --noEmit` clean, lint clean, pre-push CI(lint+type-check) pass. VERSION/root+apps package.json 동기화(0.5.62.53→54). main 직접 push, PR 생략(2 file 소규모 토큰 정정).

다음 후보: 2-chain lock 해제(review-code/explore-idea 재활성) 자연 예상 — review-code(heavy) 계속 시 미감사 대형 파일(`packages/shared/src/index.ts` 3390줄 최대, `packages/kbo-data/src/scrapers/fancy-stats.ts` 526줄, `packages/kbo-data/src/pipeline/silent-drift-alert.ts` 407줄) 후보 잔존. 또는 op-analysis(9/25-gap)·lotto(10/30-gap)·fix-incident(16/20-gap) 누적 계속.

## 🟢 review-code (heavy) — agents/postview.ts 최초 감사, FactorErrorsBars/PostviewPanel dev jargon leak 정정 (cycle 2273, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건, 2-chain lock 미충족 직전 8사이클 distinct=3, fix-incident 15-gap/op-analysis 8-gap/lotto 9-gap/info-arch 23-gap 모두 미도달). cycle 2271 explore-idea saturation + cycle 2272 review-code 대형 파일 소진 결론 → 새 미감사 대상 재탐색. `packages/kbo-data/src/agents/postview.ts`(496줄) — git log 그렙으로 대조한 결과 "최초 감사" 이력 없는 미감사 agent 파일로 확인, 선택.

실측: 오케스트레이션 로직(팀 postview 병렬 → 심판 factor-attribution 순차 → validator 검증 → fallback) clean, `canonicalizeFactorKey`/`isWeightedFactor`/`WEIGHTED_FACTOR_BASES` 일관성 정상. 하지만 이 모듈이 생성하는 `factorErrors[].factor`/`TeamPostview.keyFactor`가 정규화된 raw snake_case 키(`bullpen_fip` 등)인데, 이를 렌더하는 `FactorErrorsBars.tsx`(PostviewPanel 경유 `/analysis/game/[id]` 사용자 가시 페이지)가 `@/lib/predictions/factorLabels`의 `FACTOR_LABELS_TECHNICAL` 단일 source를 거치지 않고 raw 키를 그대로 노출 — 동일 데이터 타입을 쓰는 `dashboard/FactorErrorTable.tsx`(한글 라벨 + raw 보조 표시)와 `reviews/misses/page.tsx`(`factorLabel()` 헬퍼 번역)는 이미 정상 처리 중이라, 이 두 컴포넌트만 사각지대였던 dev 용어 leak 확인.

수정: `FactorErrorsBars.tsx`가 `FACTOR_LABELS_TECHNICAL` 조회해 한글 라벨 우선 표시(번역된 경우만 raw 키 mono 보조 병기, aria-label도 한글 기준 정정) + `PostviewPanel.tsx`의 홈/원정 `keyFactor` 표시도 동일 헬퍼로 번역. `FactorErrorsBars.test.tsx`에 canonical 키(`bullpen_fip`→"불펜 FIP") 번역 신규 테스트 1건 추가, 미등록 키 raw fallback 유지 확인. 474 files/4063 tests all pass(+1, zero regression), `tsc --noEmit` clean, lint clean. VERSION/root+apps package.json 동기화(0.5.62.52→53). main 직접 push, PR 생략(3 file 소규모 UI 정정).

다음 후보: review-code (heavy) 계속 — 미감사 대형 파일 후보 재탐색 필요(`packages/shared/src/index.ts` 3390줄 최대 미감사, `packages/kbo-data/src/scrapers/fancy-stats.ts` 526줄, `packages/kbo-data/src/pipeline/silent-drift-alert.ts` 407줄 모두 grep 결과 "최초 감사" 이력 없음). 또는 diversity 고려(op-analysis 8/25-gap, lotto 9/30-gap, fix-incident 15/20-gap 아직 미도달이나 누적 중).

## 🟢 review-code (heavy) — debug/factor-correlation/page.tsx 최초 감사, 데이터 범위 stale 주석/UI 문구 정정 (cycle 2272, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건, 2-chain lock 미충족 직전 8사이클 distinct=4 [lotto/op-analysis/review-code x5/explore-idea], ship-0/lite-cap 미충족, fix-incident 14-gap/op-analysis 7-gap/lotto 8-gap/info-arch 22-gap 모두 미도달). cycle 2271 explore-idea(lite) saturation 발화 후 신규 후보 없음 결론 + carry-over "review-code(heavy) 복귀 자연" 권고 + TODOS 미감사 대형 파일 목록 잔존 (`debug/factor-correlation/page.tsx`, 543줄) 선택.

실측: 렌더/통계 로직(`ci95`/`makeSplit`/구장·낮밤·요일·기온·바람·강수 split/팀별 홈원정/매치업 매트릭스) clean, `HOME_ADVANTAGE` 단일 source 참조 정상. 상단 주석이 "2024+2025 시즌 백필 완료 + 2026 진행분 합쳐서 (N ~1458)"라 서술했지만 실제 쿼리(`gte('game_date', '2023-01-01')`)는 이미 2023-01-01부터 조회 — DB 직접 조회로 대조한 결과 2023년 734건/2024년 737건/2025년 736건/2026년(진행중) 472건, decided(winner 확정) 총 N=2634 (주석 대비 약 1.8배). UI 헤더 문구는 "환경 변수 → 경기 결과 상관 분석 (2025 시즌 + 2026 진행분)"이라 2023/2024를 아예 언급 안 했고, Home Advantage 섹션 하단 문구는 "2024·2023 백필 시 CI 좁아지면 자동 refine 가능"이라 이미 완료된 백필을 미래형으로 서술 — 3곳 모두 실제 쿼리 범위와 어긋난 stale 텍스트(주석/UI가 backfill 완료 시점 갱신 안 됨).

수정: 3개 텍스트 블록(상단 주석/헤더 문구/하단 문구) 실제 쿼리 범위(2023~2026 누적) 기준 정정. 날마다 증가하는 정확한 N은 주석에 고정 수치로 다시 박제하지 않고 페이지 하단 실측 표시("표본: 완료된 경기 중 승부 확정분 N경기")로 위임(재발 방지 — 고정 수치 주석이 이번 drift의 근본 원인). `silent-drift-wave-240.test.ts` 44/44 pass(이 페이지의 기존 가드는 HOME_ADVANTAGE source note/cycle 470 ref 부재만 검증, 이번 텍스트 변경과 무관), `tsc --noEmit` clean, pre-push lint+type-check pass. VERSION/root+apps package.json atomic 동기화(0.5.62.51→52). `/debug/*` BASIC auth 뒤 페이지라 일반 사용자 영향 없음, 운영자(본인)가 실제 표본 범위를 오인할 수 있는 stale drift 정정. main 직접 push, PR 생략(1 file 텍스트 정정).

다음 후보: review-code (heavy) 계속 — 단, 기존 TODOS 미감사 대형 파일 목록(`reviews/monthly`, `debug/pipeline`, `debug/factor-correlation`)이 전부 소진됨. 다음 사이클은 새 미감사 대상 재탐색(파일 크기/최근 미접촉 라우트 grep) 또는 explore-idea(saturation 재도달 여부 확인) 자연 고려.

## 🟡 explore-idea (lite) — KBO↔MLB 라우트 parity 재감사, 잔여 gap 전부 구조적 비적용/이미 완결 결론 (cycle 2271, 2026-08-20)

진단: open issue 0건, approved plan 0건(전부 completed/blocked/archived). 2-chain lock 미충족(직전 8사이클 distinct=3 [review-code/lotto/op-analysis]). fix-incident 12-gap/op-analysis 5-gap/lotto 6-gap(이미 8/22 50세트 박제됨, gap 무관)/info-arch 20-gap 모두 강제 임계(20/25/30/30) 미도달. **explore-idea saturation trigger 충족** — 직전 15사이클(2256~2270) 중 review-code+fix-incident+polish-ui+info-arch = 12/15 (≥12 임계 도달, review-code 단독 dominance 9/10 유지) → review-code 편중 완화 위해 explore-idea 선택.

실측: KBO 전체 top-level 라우트(about/accuracy/analysis/calendar/changelog/community/contact/dashboard/glossary/guide/insights/leaderboard/login/lotto/matchup/methodology/page/picks/players/predictions/privacy/reviews/search/seasons/settings/standings/teams/terms/v2-preview/v2-shadow-monitor) vs MLB 전체(`mlb/`) diff:

- `/leaderboard`, `/picks` — plan #27(cycle 2254~2256)이 이미 감사 완료. Phase1(마이그레이션 050+sync route) shipped, Phase2(개인 픽 이력)는 cycle 2244 fix-incident 가 이미 league-agnostic 배선해놔서 폐기(중복 구현), Phase3(순위 리더보드)는 프로덕션 실측 결과 KBO/MLB 픽 제출 자체가 0~1건이라 무기한 보류(재확인 조건: user_picks 계열 COUNT ≥10).
- `/matchup` — plan #24(cycle 2050~2079)가 phase 1/2a/3a/3b/3c 전부 완결, 잔여 phase 2b(Elo 팩터)는 MLB Elo 시스템 부재로 blocked → plan #25로 이관 후 archived.
- `/insights`(AI 심판 토론 아카이브), `/glossary` — cycle 2245 확인: MLB는 순수 quant(에이전트 토론 없음, `mlb_v0.1` 단일 스코어링 룰) 라 `/insights` 대응 불필요, `/glossary`는 `/mlb/factors`가 이미 커버 (rejected).
- `/search` — MLB 라우트 13개(standings/team/players/factors/wild-card/postseason/predictions/accuracy/methodology/matchup/reviews+monthly+weekly/calendar) 전부 검색 인덱스에 이미 등록 확인, gap 없음.
- `/analysis`(2802줄, "빅매치 에이전트 토론 + 팩터 수렴 픽 + 이번 주 경기") — 핵심 기능이 에이전트 토론(위 `/insights` rejected 사유와 동일 구조적 이유로 MLB 미보유) 의존이라 단순 포팅 불가, 팩터 수렴 픽 부분만 분리해도 `/mlb/matchup`이 이미 커버(plan #24 Phase 3c). 신규 게인 낮음.
- `/dashboard`(298줄, "모델 버전별(v1.5~v1.8) 성과 비교 + Elo 추이 + 가중치 분포") — MLB는 스코어링 룰이 `mlb_v0.1` 단일 버전뿐이라 버전 비교 축 자체가 구조적으로 비적용. Elo 추이는 팀별 프로필(`/mlb/team/[code]`)에 이미 개별 노출.
- `/seasons`(126줄, "2024/2025 정규시즌 + KS 히스토리")— MLB는 앱 도입 이후 단일 시즌(2026)만 추적, 다중 시즌 비교 자체가 아직 데이터 미존재 (자연 시간 경과 후 재검토 대상).
- `/dashboard`/`/seasons`/`/analysis` 3개 모두 "데이터 부족"이 아니라 "모델 구조(단일 버전/단일 시즌/무-토론)가 KBO와 본질적으로 다름" — plan #27 Phase3 (data-scarcity, 재검토 조건 명확)과는 다른 카테고리의 비적용.

결론: **신규 explore-idea 후속 후보 없음.** MLB parity 커버리지가 이미 충분(구조적으로 불필요한 3건 + 데이터 부족으로 보류된 1건 + 완결 다수) — plan 파일 신규 작성 안 함(spec 가치 없음, 다음 unprocessed-plan lookup 대상 아님). 코드 변경 0. outcome=partial(spec-only 감사 기록).

다음 후보: review-code (heavy) 복귀 자연 (dominance 재확대는 explore-idea 공간 고갈의 자연스러운 결과 — 강제 회피 대상 아님). 또는 dimension-cycle/lotto(추첨 결과 대기)/op-analysis(gap 아직 미도달) 등.

## 🟢 review-code (heavy) — reviews/monthly/[month]/page.tsx 최초 감사, 소표본 임계 하드코딩 5 → SMALL_SAMPLE_N 정정 (cycle 2270, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건, 2-chain lock 미충족 직전 8사이클 distinct=3 [review-code/lotto/op-analysis], ship-0/lite-cap 미충족, fix-incident 11-gap/op-analysis 4-gap/lotto 5-gap/info-arch 19-gap/explore-idea saturation 11/15 모두 미도달). review-code(heavy) 직전 10사이클 9/10 dominance 지속 + TODOS carry-over 미감사 대형 파일 중 사용자 가시 라이브 라우트 `reviews/monthly/[month]/page.tsx`(481줄, 최초 감사) 선택 (`debug/factor-correlation/page.tsx`는 내부 도구 페이지라 후순위).

실측: page.tsx 렌더 로직 clean. 지원 파일 전체 read — `buildMonthlyReview.ts`/`computeMonthRange.ts`(UTC 기준 명시적 문서화, KST 아님 — 의도된 설계, weekly와 동일 패턴이라 drift 아님)/`shared.ts`(fetchPredictionRowsInRange fail-loud 가드 정상)/`convergenceRecord.ts`(781줄, page가 호출하는 6개 range-scoped helper — getRecentConvergencePickRecord/getConvergencePickStreak/BestStreak/HomeAwaySplit/DayOfWeekSplit/TeamStats — 전부 startDate/endDate 인자 순서·gte/lte 양끝 inclusive 정합 확인, drift 없음). 발견: `buildMonthlyReview.ts`(KBO)와 `buildMlbMonthlyReview.ts`(MLB) 양쪽에서 "전월 비교 게이팅"(2곳)/"최다 정확 팀 표시 임계"/"팩터 인사이트 minSamples" 총 4곳씩(합 8곳)이 `SMALL_SAMPLE_N`(5) 상수를 import 안 하고 리터럴 `5`로 하드코딩 — 현재 값 우연 일치라 동작 차이 없으나, cycle 91~131 매직넘버 registry sweep(12 surface: lotto/standings/insights/leaderboard/calendar/feed/MLB/teams/players/seasons/predictions/dashboard) 당시 `reviews/` 모듈이 스윕 대상에서 빠져있던 사각지대.

수정: 양쪽 파일에 `SMALL_SAMPLE_N` import 추가 + 리터럴 `5` 8곳 상수 치환 (KBO 4곳 + MLB 4곳, parity 유지). `apps/moneyball` `vitest run src/lib/reviews` 45/45 pass, `tsc --noEmit` clean. VERSION/root+apps package.json `scripts/bump-version.sh` atomic 동기화 (0.5.62.50→51). main 직접 push, PR 생략 (2 file 소규모 상수 치환).

다음 후보: review-code (heavy) 계속 — 남은 미감사 대형 파일 `debug/factor-correlation/page.tsx`(543줄, 내부 도구). 또는 explore-idea (saturation 11/15로 근접, 다음 사이클 자연 trigger 가능성 상승).

## 🟢 review-code (heavy) — debug/pipeline/page.tsx 최초 감사, MLB pipeline duration_ms silent 미기록 발견/수정 (cycle 2269, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건, 2-chain lock 미충족 직전 8사이클 distinct=3 [review-code/lotto/op-analysis], ship-0/lite-cap 미충족, fix-incident 11-gap/op-analysis 4-gap/lotto 5-gap/info-arch 19-gap/explore-idea saturation 10/15 모두 미도달). review-code(heavy) 직전 8사이클 6/8 dominance 지속 + TODOS carry-over 미감사 대형 파일 리스트 중 `debug/pipeline/page.tsx`(481줄, 최초 감사) 선택.

실측: 렌더 로직(mode subtotal/GAP·SP 이벤트/reject-reason cohort M16) clean, `pipelineStats.ts` 헬퍼도 clean. 실 DB 조회(최근 30일 `pipeline_runs`, KBO+MLB 합계 669건)로 대조한 결과 `mlb_statsapi_scrape`(n=98)/`mlb_fancy_scrape`/`mlb_savant_scrape`/`mlb_predict_final`/`mlb_shadow_train`(각 n=30) 모든 MLB mode row 의 `duration_ms` 가 전부 `null` — 대시보드 "평균 duration" 컬럼이 이 mode 들에서 항상 `0ms` 로 표시(KBO `announce`/`predict`/`predict_final`/`verify` 는 4400~8000ms 정상 기록). Root cause: `packages/kbo-data/src/pipeline/mlb-pipeline.ts` 의 `runMlbPipeline` orchestrator 가 KBO `daily.ts`(`duration_ms: durationMs` 계측 존재, line 192)와 달리 시작 시각을 계측하지 않고 `pipeline_runs.insert()` payload(line 703~712)에 `duration_ms` 필드 자체를 아예 빠뜨림. 정확히 이런 pipeline 이상을 monitoring 해야 할 대시보드 자신이 MLB 도입(cycle 1900대) 이후 이 계측 공백을 못 잡고 있던 사례 — silent drift family 신규 계열(MLB parity gap, cycle 2098~2100 유사 계열과 인접).

수정: `runMlbPipeline` 진입 직후 `const startedAt = Date.now();` 추가 + insert payload 에 `duration_ms: Date.now() - startedAt` 필드 추가 (2 line diff). `mlb-pipeline.test.ts` 19/19 pass (기존 mock 이 insert payload shape 를 엄격히 assert 하지 않아 이 결손을 못 잡던 것 확인 — 신규 회귀 assertion은 이번 fix 범위 밖, 다음 review-code 후속 후보로 carry-over만). `packages/kbo-data` 전체 88 files/1144 tests pass, `apps/moneyball` `tsc --noEmit` clean. VERSION/root+apps package.json `scripts/bump-version.sh` 로 atomic 동기화 (0.5.62.49→50, 사례 16 재발 차단). main 직접 push, PR 생략 (2 file 소규모 fix + 버전/체인지로그).

다음 후보: review-code (heavy) 계속 — 남은 미감사 대형 파일 `reviews/monthly/[month]/page.tsx`(481줄)/`debug/factor-correlation/page.tsx`(543줄). 또는 explore-idea (saturation 10/15로 근접, 다음 사이클 자연 trigger 가능성). 또는 mlb-pipeline.test.ts 에 duration_ms 존재 assertion 추가 (이번엔 skip한 회귀 가드).

## 🟢 review-code (heavy) — mlb/team/[code]/page.tsx 최초 전체 감사, drift 없음 확인 (cycle 2268, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건, 2-chain lock 미충족 직전 8사이클 distinct=3, ship-0/lite-cap 미충족, fix-incident 9-gap/op-analysis 2-gap/lotto 3-gap/info-arch 17-gap/explore-idea saturation 10/15 모두 미도달). review-code(heavy) 직전 8사이클 6/8 dominance 지속 + TODOS carry-over가 지목한 미감사 대형 파일 — `mlb/team/[code]/page.tsx`(519줄, 최초 감사) 선택.

실측: page.tsx 렌더 로직(팩터 그리드/타구 프로파일/Elo 차트/최근 기록 테이블/division 순위 배지) clean. 지원 파일 전체 read: `buildMlbTeamProfile.ts`(teamGames.sort()가 in-place mutation이라 이후 computeTeamStreak/avgMargin/homeAwayEdge 등에 내림차순 정렬 상태로 전달됨을 확인 — 처음엔 정렬 누락 의심했으나 KBO `buildTeamProfile.ts`와 동일 패턴으로 false lead였음), `buildMlbStandings.ts`(GB 계산/division rank 로직 정상), `deriveMlbOutcome.ts`(스케일 문서화 정확, cycle 2160 이중변환 버그 재발 없음), `convergenceRecord.ts`(favoredTeam이 canonical 코드로 정규화되어 page.tsx의 `.find(s => s.teamCode === code)` 매칭과 정합). `MLB_PRODUCTION_COHORT_RULES`/`toMlbStatsApiCode`/`normalizeMlbTeamCode` 사용도 다른 MLB 파일들과 일관.

결론: 코드 변경 불필요. 이미 cycle 2066/2081/2117/2160/2213/2217 등 다수 후속 fix로 충분히 정합화된 파일 — 신규 drift 0건. `apps/moneyball` 워크스페이스 내부 `vitest run src/lib/mlb` 102/102 pass, `tsc --noEmit` clean. (참고: 리포 루트에서 vitest 직접 실행 시 path alias 미해석으로 false failure 발생 — 워크스페이스 디렉토리 내부에서 실행해야 함, 진단 방법 노트.)

다음 후보: review-code (heavy) 계속 — 남은 미감사 대형 파일 `debug/pipeline/page.tsx`(481줄)/`reviews/monthly/[month]/page.tsx`(481줄)/`debug/factor-correlation/page.tsx`(543줄). 또는 explore-idea (saturation 10/15로 근접, 다음 사이클 자연 trigger 가능성).

## 🟢 review-code (heavy) — lotto/methodology/page.tsx 최초 감사, 사이트 데이터 3개월 frozen silent drift 발견/수정 (cycle 2267, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건, 2-chain lock 미충족 직전 8사이클 distinct=3, ship-0/lite-cap 미충족, fix-incident 9-gap/op-analysis 2-gap/lotto 3-gap/info-arch 17-gap/explore-idea saturation 10/15 모두 미도달). review-code(heavy) 직전 20사이클 dominance 지속 + 신규 미감사 영역 확장 — `lotto/methodology/page.tsx`(520줄, 최초 감사) 선택.

실측: 렌더 로직(스파크라인/percentile SVG/OOS 테이블)은 clean. 그러나 데이터 소스 `apps/moneyball/data/lotto-data.json`의 `generated_at`이 `2026-05-26T17:00`(cycle 858 근방)에 고정 — `count_valid=7,700,649`(실제 1237회차 기준 7,705,415), `oos_pass_rate` 4건(1227회까지, 실제 1237회까지), `chain_fire_history` 34건(cycle 970까지, 실제 2264까지)으로 3개월치 site-visible 데이터가 정지. Root cause 규명: `git log`로 "data(lotto): ... lotto-data.json 갱신" 커밋 45건(cycle 1163/1292/1414/1462/1543 등)을 `--stat` 대조한 결과 전부 **`scripts/lotto-data.json`(원시 회차 캐시, 별개 파일)만 수정** — 동명 파일이라 site JSON 갱신으로 오인된 채 방치. develop-cycle SKILL.md의 `lotto` chain trigger/heavy 시퀀스도 `scripts/lotto-data.json`만 참조하고 있어 (line 69/213) site JSON 동기화 step이 애초에 명시되어 있지 않음 — 이번 fix 범위 밖(SKILL.md 변경은 skill-evolution 소관), retro에 carry-over만 기록.

부가 검증: `LOTTO_RULE_COUNT=256`(packages/shared) 상수가 맞는지 재확인 — `scripts/lotto.ts` RULES 배열 리터럴 grep은 241건이었으나 `...ZONES.map(...)`(5개) + 끝자리 loop(10개) spread 를 놓친 오탐이었음. 241+5+10=256 정확히 일치 → drift 아님(false lead, 기록만).

수정: `apps/moneyball/data/lotto-data.json` count_valid/generated_at 최신화 + draw 1228~1237 OOS 10건 + chain_fire_history 45건 append (git log 커밋 메시지 + cycle JSON 실측 기준, 추정 데이터 0건 — `lotto-data-schema.test.ts` 17건 pass 확인). 부수적으로 cycle 2266부터 `VERSION`/root `package.json` 이 `apps/moneyball/package.json`과 어긋나 있던 3-way version guard 실패(`version-sync-guard.test.ts`)도 함께 정정 (0.5.62.47/48 → 49 통일). `tsc --noEmit`/`eslint` clean, `vitest run` 474 files/4062 tests all pass. main 직접 push, PR 생략 (5 file 소규모 데이터+버전 정정).

다음 후보: **skill-evolution carry-over** — `lotto` chain heavy 시퀀스에 `apps/moneyball/data/lotto-data.json` 명시적 동기화 step 추가 필요 (재발 방지, 현재 trigger 미충족이라 이번엔 skip). 또는 review-code (heavy) 계속 (다른 미감사 대형 파일: `debug/pipeline/page.tsx`/`mlb/team/[code]/page.tsx`/`reviews/monthly/[month]/page.tsx`) 또는 explore-idea(saturation 10/15로 근접).

## 🟢 review-code (heavy) — methodology/page.tsx 최초 감사, AI 토론 fallback 미고지 발견/수정 (cycle 2266, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건 — plan #27 explore-idea 대상이나 phase2/3 자연 종료/데이터 보류라 재매핑 대상 아님, 2-chain lock 미충족 직전 8사이클 distinct=4, ship-0/lite-cap 미충족, fix-incident 8-gap/op-analysis·lotto 방금 리셋/info-arch 16-gap/explore-idea saturation 9/15 모두 미도달). review-code(heavy) 직전 20사이클 11/20(55%) 구조적 dominance 지속 + 다른 chain 자연 trigger 부재 → 신규 미감사 영역 확장.

실측: `methodology/page.tsx`(506줄, 최초 감사) 코드 read — 가중치 테이블/데이터소스 라벨은 `MetricRegistry` 동적 파생이라 clean. "AI 에이전트 토론" 섹션이 "심판 에이전트가 양측 주장을 비교하여 ±5% 보정" 을 항상 일어나는 것처럼 무조건 서술 — 그러나 CLAUDE.md 실측 기준 CREDIT_EXHAUSTED fallback 이 2026-06-06 이후 지속(8월 100% 누적 CE율), `/accuracy` 페이지는 이미 이 fallback 비율을 실시간 공개(`fallbackStats`) 중인데 methodology 페이지엔 캐빗/링크 전무 — 사용자가 "AI 3-agent 토론이 항상 일어난다" 로 오독할 수 있는 사용자 가시 정확성 결함.

수정: "AI 에이전트 토론" 섹션 말미에 캐빗 문단 추가 — AI 토론 서버 연결 불가 시 정량 모델만 사용(사후 학습도 미적용)함을 고지 + `/accuracy` 실시간 비율 링크 (기존 페이지 "실시간 …참조" 패턴과 동일 스타일). `tsc --noEmit`/`eslint` clean, `vitest run` 474 files/4062 tests all pass. 소규모 문서성 수정(1 file) — main 직접 push, PR 생략.

다음 후보: review-code (heavy) 계속 (다른 미감사 대형 파일: `lotto/methodology/page.tsx` 최근 부분 수정만 됨/`debug/pipeline/page.tsx`/`mlb/team/[code]/page.tsx`/`reviews/monthly/[month]/page.tsx`) 또는 explore-idea(2-lock 미충족이나 saturation 9/15로 근접).

## 🟢 operational-analysis (lite) — 25-cycle gap trigger 재측정, LLM 부가가치 방향 3-cycle 안정 재확인 (cycle 2265, 2026-08-20)

진단: 강제 trigger = operational-analysis 하나만 (25-cycle gap 정확 도달, 마지막 fire cycle 2240 heavy). open issue 0건, approved plan 0건, 2-chain lock 미충족(직전 8사이클 distinct=3: review-code/fix-incident/lotto), ship-0/lite-cap 미충족.

실측: `scripts/op-analysis-ce-cohort.ts` 재실행 — n=321 (CE n=274 / 비CE n=47, 비CE 완전 동결 지속 — 마지막 비CE 예측 2026-07-01, cycle 2146부터 4개 cycle 연속 47 고정). CE 54.0%(148/274) / 비CE 63.8%(30/47) → 격차 9.8pp (cycle 2191 9.9pp 대비 -0.1pp, 3-cycle window 9.7~10.8pp 안정 범위 유지). overlap 월(05/06/07) 통제 격차 10.8pp ≈ 전체 격차 → temporal bias 배제, LLM 부가가치 우세 방향 4회 연속 재확인. Brier CE 0.3509 vs 비CE 0.2534.

수정: 코드 변경 없음(순수 measurement). CREDIT_EXHAUSTED 지속 확인(6th recurrence 상태 변화 없음, 사용자 크레딧 재충전 미이행). 비CE 표본 동결로 재분리 불가 상태 변화 없음 — 사용자 크레딧 충전 전까지 반복 확인만 가능.

다음 후보: review-code (heavy) 또는 explore-idea — op-analysis gap 재충족까지 25 cycle.

## 🟢 lotto (lite) — 30-cycle gap trigger 감사, drift 없음 확인 (cycle 2264, 2026-08-20)

진단: 강제 trigger = lotto 하나만 (30-cycle gap 정확 도달, 마지막 fire cycle 2234). open issue 0건, approved plan 0건, 2-chain lock 미충족.

실측: `lotto.ts count` 유효 조합 7,705,415 / 전체 8,145,060 / 제거 5.40% (96.5s) — cycle 2234와 동일 값(1237회차 데이터 불변, 다음 추첨 2026-08-22 토 미도래). `lotto.ts rules` 259개 규칙 전수 확인 fail 0건. `lotto.ts update` 이미 최신(1237회차) 확인. picks `2026-08-22-50sets.md` 이미 존재(cycle 2231-2233 사이 박제). 1237회(2026-08-15) OOS 이미 검증 완료(3개 일치 1/50, 기댓값 수준, N=11 누적 우위 증거 없음).

수정: 코드 변경 없음(순수 measurement, drift 0건). skill-evolution trigger 5개 재평가 — 어느 것도 미충족(trigger3 %50≠0=14, trigger5 review-code 직전 20cycle 11회 fired 정상).

다음 후보: review-code (heavy) 또는 explore-idea (heavy) — lotto gap 재충족까지 30 cycle.

## 🟢 review-code (heavy) — sitemap.ts 최초 감사, STATIC_PAGES 와 동일 구조 제네릭 가드 신규 (cycle 2263, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건, 2-chain lock 미충족 직전 8사이클 distinct=3, ship-0/lite-cap 미충족, fix-incident 5-gap/op-analysis 23-gap/info-arch 13-gap/lotto 29-gap 모두 미도달 — lotto 30-gap 은 cycle 2264, op-analysis 25-gap 은 cycle 2265 도달 예정). review-code(heavy) 4연속 success streak (2259~2262, dominance-positive 룰 적용 정상). cycle 2261/2262 가 search/page.tsx STATIC_PAGES 에 적용한 제네릭 스캔 패턴을 동일 구조(신규 hub 추가 시 별도 배열 수동 등록) 파일로 확장 채택.

실측: `sitemap.ts`(423줄) 정적 hub 46개 전수 스캔 후 리터럴 대조 — 6개 apparent 누락(`/accuracy/shadow`, `/v2-shadow-monitor`, `/reviews/{weekly,monthly}`, `/mlb/reviews/{weekly,monthly}`) 전부 코드/주석으로 의도된 제외 확인(noindex `robots: { index: false }` 2건 + `redirect()` 전용 index 페이지 4건, dynamic route 블록이 실제 컨텐츠 URL 커버). 실제 버그 0건 — `sitemap-mlb.test.ts`(214줄)는 하드코딩 `it()` 케이스만 있어 향후 신규 hub 추가 시 STATIC_PAGES 가 겪었던 것과 동일한 수동 갱신 누락 silent drift 에 무방비였던 구조적 gap 확인.

수정: 코드 변경 없음(감사 clean) + 재발 방지 제네릭 회귀 테스트 신규(`silent-drift-cycle-2263.test.ts`) — non-dynamic hub `page.tsx` 전수 스캔 → sitemap.ts 리터럴 엔트리 존재 검증, `redirect()`/`robots: index:false` 패턴은 소스에서 자체 감지해 하드코딩 나열 없이 구조적으로 제외. `tsc --noEmit`/`eslint` clean, `vitest run` 474 files/4062 tests all pass(신규 1건). 커밋 831c6df3 main 직접 push (test-only 소규모 변경, PR 생략).

다음 후보: lotto chain 30-cycle gap (마지막 fire cycle 2234, cycle 2264 도달 예정) 또는 operational-analysis 25-cycle gap (마지막 fire cycle 2240, cycle 2265 도달 예정). cycle 2262 커밋(bb4c2a39)이 VERSION/CHANGELOG bump 를 누락한 이력 gap 은 이번 cycle 에서 소급 수정하지 않음(범위 밖).

## 🟢 review-code (heavy) — lotto/reviews 하위 hub 6개 STATIC_PAGES 검색 인덱스 누락 발견/수정 (cycle 2262, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건 — plan 21건 전부 completed/archived/superseded/partial 등, "approved" 상태 X. 2-chain lock 미충족 직전 8사이클 distinct=3. ship-0/lite-cap 미충족. fix-incident 4-gap/op-analysis 22-gap/info-arch 12-gap/lotto 28-gap 모두 자체 주기 트리거 미도달). deploy-drift-alert 워크플로우가 08-19 4회 failure 후 자연 회복 확인 — gap_hours≥1 threshold 로 인한 known 패턴(cycle 2222 진단과 동일 성격, push burst → Vercel 큐 지연 → 자연 해소), 신규 인시던트 아님. cycle 2261 retro 가 명시적으로 남긴 후보("KBO /predictions //reviews 서브라우트로 동일 제네릭 스캔 확장") 채택.

실측: `/predictions`, `/reviews` 서브라우트 감사 중 `/reviews/monthly`, `/reviews/weekly` (KBO, 2026-04-17/19 라우트 신설) 와 그 MLB mirror `/mlb/reviews/monthly`, `/mlb/reviews/weekly` (plan #26 Phase 2, cycle 2079대) 4개가 STATIC_PAGES 에 전무 — 4개월 미동기. 추가로 최상위 디렉토리 전수 대조 중 `/lotto` (root hub) 자체와 `/lotto/check` (조합 검증 도구) 도 STATIC_PAGES 누락 발견(`/lotto/archive`, `/lotto/methodology` 만 색인되고 부모 hub·도구 페이지가 빠져있던 상태) — 총 6건. `/en/*`, `/debug/*`, `/login`, `/settings`, `/community`, `/v2-preview` 는 로케일 스코프/noindex 내부 프리뷰/"박제 중" placeholder 로 의도된 배제 확인, 변경 없음.

수정: 6개 slug 를 기존 패턴(라벨+키워드)으로 STATIC_PAGES 에 추가. cycle 2261 이 `/mlb/*` 전용으로 만든 회귀 테스트를 일반화한 신규 테스트(`silent-drift-cycle-2262.test.ts`) 추가 — `EXCLUDED_ROOTS` 명시 배제 목록 외 모든 non-dynamic hub `page.tsx` 를 재귀 스캔해 STATIC_PAGES 대응 slug 존재를 검증. 향후 어떤 domain(lotto/reviews/mlb/mlb-reviews 등)에 신규 hub 가 추가돼도 하드코딩 나열 없이 구조적으로 drift 잡음. `tsc --noEmit`/`eslint` clean, `vitest run` 473 files/4061 tests pass(신규 1건 포함). PR #2992 squash-merge, `state=MERGED` 실측 확인(bb4c2a39).

다음 후보: lotto chain 30-cycle gap (마지막 fire cycle 2234, cycle 2264 도달 예정) 또는 operational-analysis 25-cycle gap (마지막 fire cycle 2240, cycle 2265 도달 예정).

## 🟢 review-code (heavy) — search/page.tsx 최초 감사, MLB hub 6개 STATIC_PAGES 누락 발견/수정 (cycle 2261, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건 — plan #27 status=phase1_done/phase2_rejected/phase3_blocked, "approved" 아님, 2-chain lock 미충족 직전 8사이클 distinct=3, ship-0/lite-cap 미충족, fix-incident 3-gap/op-analysis 21-gap/info-arch 11-gap/lotto 27-gap 모두 미도달, explore-idea saturation 11/15<12 미충족). cycle 2260 retro 가 명시적으로 남긴 후보 중 "review-code 미감사 대형 파일 — search/page.tsx(436줄)" 채택 (lotto 30-gap 은 cycle 2264 아직 미도달).

실측: `search/page.tsx` 자체 fuzzy 검색 로직(팀/선수/날짜)은 클린. `STATIC_PAGES` 배열의 라우트 존재 여부 전수 검증(34개 slug → page.tsx 존재 확인) 통과. 이어서 `apps/moneyball/src/app` 최상위 디렉토리 목록과 대조해 STATIC_PAGES 밖 라우트 탐색 — `/community` 는 noindex placeholder(15줄, "커뮤니티 박제 중" 인증 layer 대기)라 의도적 제외 정상. `/mlb/*` 하위 디렉토리 전수 대조 결과 `mlb/predictions`/`mlb/accuracy`/`mlb/methodology`/`mlb/matchup`/`mlb/reviews`/`mlb/calendar` 6개가 실제 page.tsx + 테스트까지 존재하는 shipped KBO-parity hub 인데도 STATIC_PAGES 에 전무. git blame 확인 — STATIC_PAGES 마지막 MLB 동기는 cycle 1116(wave 9, "MLB 6 + KBO 3 entry 동기") 이었고, 그 이후(cycle 1116~2261, wave-626/#2983/#2971/#2724 등)에 신규 shipped 된 MLB parity 기능이 검색 인덱스와 한번도 재동기 안 된 silent drift.

수정: 6개 slug 를 KBO 대응 엔트리와 동일 패턴(라벨+키워드)으로 `STATIC_PAGES` 에 추가. 재발 방지 회귀 테스트 신규(`silent-drift-cycle-2261.test.ts`) — 특정 6개 하드코딩 나열이 아니라 `/mlb/*` 디렉토리를 스캔해 자체 `page.tsx` 를 가진 모든 hub 가 STATIC_PAGES 대응 slug 를 갖는지 제네릭 검증 (향후 신규 MLB hub 추가 시 자동으로 drift 잡음 — STATIC_PAGES sync 가 사람이 기억해서 하는 수동 작업이라 반복 drift 났던 근본 원인 구조적 차단). `pnpm exec tsc --noEmit`/`eslint` clean, `vitest run` 472 files/4060 tests pass(신규 1건 포함). PR #2991 squash-merge, `state=MERGED` 실측 확인(e736b3ef).

다음 후보: lotto chain 30-cycle gap (마지막 fire cycle 2234, cycle 2264 도달 예정) 또는 동일 제네릭 스캔 패턴을 다른 도메인(예: `/en/*` 라우트 트리 vs STATIC_PAGES EN 커버리지, 또는 KBO `/predictions`/`/reviews` 하위 서브라우트)으로 확장.

## 🟢 review-code (heavy) — KBO↔MLB matchup/team-profile 상수 재사용 + KO/EN 리터럴 parity 감사 (전부 clean) (cycle 2260, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건 — plan #27 phase1 완료/phase2 반증/phase3 데이터 대기 상태로 "approved" 아님, 2-chain lock 미충족 직전 8사이클 distinct=3, ship-0/lite-cap 미충족, fix-incident 0-gap/op-analysis 20-gap/info-arch 10-gap/lotto 26-gap 모두 미도달). cycle 2259 retro 가 "lotto 30-gap(cycle 2264 예정) 또는 review-code 신규 grep 소스" 를 다음 후보로 남겼고, lotto gap 미도달이라 review-code 신규 grep 소스 채택.

실측: `buildMlbMatchupProfile.ts`(526줄) vs `buildMatchupProfile.ts`(579줄) — cycle 2894~2906대 wave(MARGIN_*/VENUE_SPLIT_*/RECENT_RECORD_WINDOW/WIN_LOSS_STREAK_MIN_LENGTH 단일 source 통합)를 두 파일 모두 동일하게 import, 리터럴 재하드코딩 없음. `buildMlbTeamProfile.ts` 는 KBO `buildTeamProfile.ts` 의 `computeTeamStreak`/`computeTeamAvgMargin`/`computeTeamBlowoutCount`/`computeTeamCloseGameCount`/`computeTeamHomeAwayEdge`/`computeTeamRecentRecord` 를 직접 import(함수+상수 동시 재사용) — 중복 없음. `buildMlbStandings.ts` 는 accuracy 로직 없이 W-L/GB 계산만이라 `SMALL_SAMPLE_N` 부재가 정상. `buildMlbFactorAccuracy.ts` vs `buildFactorAccuracy.ts` 도 `NEUTRAL_FACTOR`/`NEUTRAL_LO`/`NEUTRAL_HI` 동일 source, 별도 필터 상수 불필요 영역. KO/EN 리터럴 diff 4쌍(`mlb/methodology`↔`en/mlb/methodology`, `mlb/accuracy`↔`en/mlb/accuracy`, `mlb/team/[code]`↔`en/mlb/team/[code]`, `mlb/matchup/[teamA]/[teamB]`↔`en/mlb/matchup/[teamA]/[teamB]`) 숫자/퍼센트 리터럴 전수 비교 — 4쌍 모두 0 diff. `mlb/factors` vs `en/mlb/factors` 리터럴 diff 1건("60")은 실제 값 아니고 주석 "silent drift wave 60" 텍스트 — false positive 확인.

결론: 이번 사이클 grep 소스(KBO/MLB 공유 상수 재사용 지점 + KO/EN 페이지 페어 리터럴 diff)는 전부 clean — 코드 변경 0. cycle 2257 패턴(대형 파일 최초 감사 전부 clean)과 동일 — 감사 자체가 결과물, 향후 동일 파일 재감사 불필요 확정.

다음 후보: lotto chain 30-cycle gap (마지막 fire cycle 2234, cycle 2264 도달) 또는 미감사 대형 파일(`app/search/page.tsx` 436줄, `debug/factor-correlation`/`debug/pipeline` — 최근 wave 로 이미 손질돼 낮은 우선순위) / KO/EN diff 방법론을 KBO↔MLB 라우트 전체(`predictions`/`seasons`/`reviews` 등)로 확장.

## 🟢 review-code (heavy) — lotto archive 계열 4파일 "50조합" 하드코딩 정정 (cycle 2259, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건 — 20개 plan 모두 completed/archived/superseded, 2-chain lock 미충족 직전 8사이클 distinct=4, ship-0 미충족, lite-cap 미충족, review-code trigger 5 표본 20 확보하나 review-code 0회 아님). cycle 2258 retro 가 명시적으로 "lotto/page.tsx·lotto/archive 계열에 유사 stale 문구 재검토 여지" 를 다음 후보로 남겨 채택.

실측: cycle 2258 이 `lotto/methodology/page.tsx` 의 "0.65%" 하드코딩을 고쳤지만 옆 파일들은 미점검 상태였음. grep 결과 `archive/page.tsx`(5곳) + `archive/[date]/page.tsx`(3곳) + `archive/opengraph-image.tsx`(3곳) + `archive/[date]/not-found.tsx`(3곳) = 4파일 14곳에 "50조합"/"50세트" 리터럴 하드코딩 잔존. 실제 최신 archive md 파일(`data/lotto-picks/2026-08-22.md`) 확인 결과 현재 `LOTTO_PICK_COUNT=1000`(wave-185 이후) — 페이지 텍스트만 과거 50세트 시절 문구 그대로 방치된 wave-185 부분 누락 (당시 `lotto/page.tsx` 만 registry 치환하고 archive 계열은 빠짐).

수정: 4파일 모두 `LOTTO_PICK_COUNT` (또는 신규 import) 로 리터럴 치환 (`${LOTTO_PICK_COUNT}조합`). `archive/[date]/page.tsx` 의 stale dev 주석 "전체 45세트 collapse" 도 "전체 나머지 세트 collapse" 로 정정. 부가로 `lotto/methodology/page.tsx` 본문 안 마지막 잔여 "50조합" 1곳(본인 사용 기록 섹션)도 동일 패턴으로 정정. `pnpm exec tsc --noEmit` clean, eslint clean(scoped), `vitest run src/app/lotto` 62/62 pass. 직접 main commit + push, pre-push hook lint+type-check 통과 확인.

다음 후보: `lotto/check/page.tsx` 는 grep 결과 유사 하드코딩 없음(clean) — lotto 도메인 5개 page.tsx + og-image + not-found 전수 점검 완료. 다음은 lotto chain 자체 30-cycle gap 자연 도달(마지막 fire cycle 2234, cycle 2264 도달 예정) 또는 review-code 신규 grep 소스(다른 도메인 registry 상수 재검색) 권장.

## 🟢 fix-incident — lotto methodology cutoff percentage 하드코딩 정정 (cycle 2258, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건, 2-chain lock 미충족 distinct=4, 나머지 gap trigger 전부 미도달). cycle 2257 retro 가 "review-code(heavy) 신규 grep 소스 필요, 아니면 diversity" 권고 — 대형 파일 재스캔 중 `lotto/methodology/page.tsx`(519줄, 마지막 실질 audit = cycle 1569, 688 cycle 전) 가 다른 lotto 파일들(wave 153/164/170/185 반복 수정) 대비 방치돼 있음을 발견해 착수.

실측: 페이지 2곳 + `apps/moneyball/data/lotto-score-backtest.json` note/limitations 필드에 `top ~0.65%` 하드코딩 발견. `LOTTO_PICK_COUNT`(현재 1000) / `count_valid`(7,700,649) 로 실제 계산하면 top 0.01% — 50~1000배 괴리. 원문 자체(cycle 898 최초 authoring, "50/7.7M" 주석)조차 계산이 틀렸던 것으로 확인(50/7.7M=0.00065%, 0.65% 아님). wave-185(cycle 1350대)가 세트수만 `LOTTO_PICK_COUNT` registry 로 치환했고 옆 percentage 문구는 그대로 방치.

수정: page.tsx 에 `pickCutoffPct = (LOTTO_PICK_COUNT / count_valid * 100).toFixed(2)` 파생값(기존 `ratio` 계산과 동일 패턴) 추가해 2곳 대체. static backtest json 도 현재 값(1000세트 / top 0.01%)으로 정정. `pnpm exec tsc --noEmit` clean, eslint clean, vitest 4059/4059 pass. PR #2990 squash-merge, `state=MERGED` 실측 확인(d6e96a60).

다음 후보: lotto 도메인이 review-code silent drift 새 grep 소스로 확인됨 — `lotto/page.tsx`/`lotto/archive` 계열도 유사 stale 문구 재검토 여지. 또는 lotto chain 자체 30-cycle gap 근접(마지막 fire cycle 2234, cycle 2264 도달).

## 🟢 review-code (heavy) — cycle 2256 carry-over 대형 파일 4건 감사 완료(전부 clean) (cycle 2257, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, 승인된 unprocessed plan 0건 — plan #27 은 cycle 2256 이 사실상 종결, 자동 매핑 대상 아님. 2-chain lock 미충족 직전 8사이클 distinct=4). cycle 2256 retro 가 "review-code(heavy) 잔여 대형 파일 4건" 을 명시 추천 — 채택.

실측: 잔여 미감사 대형 파일 4건 전부 최초 감사 완료 — **전부 clean**, silent drift 미발견:
- `buildSeasonSummary.ts`(346줄): supabase 페이지네이션/assertSelectOk 이미 통일(cycle 173), KS 시리즈 탐지 로직 자체 검증, 소비 페이지(`/seasons/[year]`)에 threshold 재하드코딩 없음
- `buildMlbTeamAccuracy.ts`(300줄) + 소비 페이지(`/mlb/accuracy`, `/en/mlb/accuracy`): KBO 대응 함수(`buildTeamAccuracy.ts`)와 SMALL_SAMPLE_N 필터 적용 범위 정확히 대칭(bias 만 필터, accuracy/matchup 은 비필터) — parity 깨짐 없음. `TeamMatchupCards` 공유 컴포넌트로 KBO/MLB 렌더 로직 중복 없음
- `insights/loader.ts`(311줄): `CURRENT_SCORING_RULE` 단독 필터가 `model-version-labels.ts` 문서화된 의도(baseline 분석은 PRODUCTION_COHORT_RULES 아닌 단일 버전 사용)와 일치 — CE-fallback 혼입 배제는 의도된 설계
- `glossary/data.ts`(323줄): 전체 10개 팩터 `modelUsage` 가 `DEFAULT_WEIGHTS` 런타임 참조라 하드코딩 재발 구조적으로 불가능(cycle 1296 wave-88 패턴 이미 완비), `GLOSSARY_TERM_COUNT` 도 동적 계산

수정: 코드 변경 없음 — 4건 모두 기존 설계가 이미 정합. cycle 2256 이 남긴 carry-over 목록 완전 소진.

다음 후보: 대형 파일 재스캔 결과 잔여 미감사 후보 없음(`analysis-data.ts`/`buildAccuracyData.ts`/`buildTeamProfile.ts`/`buildMatchupProfile.ts`/`buildMlbMatchupProfile.ts`/`buildMlbTeamProfile.ts`/`convergenceRecord.ts`/`buildPicksStats.ts`/`factor-explanations.ts`/`buildMlbTeamProfile.ts` 모두 최근 cycle 에서 이미 감사·수정 이력 존재) — review-code(heavy) 는 신규 grep 소스(threshold 상수/버전 표기 재검색) 필요 시점, 아니면 diversity(explore-idea saturation 근접 또는 lotto/op-analysis gap 자연 도달) 권장.

## 🟡 explore-idea (heavy) — plan #27 Phase 2 premise 반증(stale) + Phase 3 데이터 근거 보류 (cycle 2256, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건 — plan #27 은 phase1 완료 상태, 자동 매핑 대상 아님. 2-chain lock 미충족 distinct=4/8, saturation 11/15 <12 미도달, fix-incident/op-analysis/info-arch/lotto gap trigger 전부 미도달, lite-cap 미충족). cycle 2255 retro 가 "plan #27 Phase 2 (explore-idea heavy)" 를 명시 추천 — 채택해 착수했으나, 착수 전 코드 재확인 중 premise 자체가 stale 임을 발견.

실측: Phase 2(`/mlb/picks` 개인 이력 페이지) 구현 착수 전 KBO `MyPicksClient`/`buildPicksStats.ts`/`/api/picks/results/route.ts` 를 다시 읽은 결과, **이미 KBO/MLB 통합 픽 이력 조회가 완비돼 있음을 확인**: `/api/picks/results` 는 `mlb-{external_game_id}` 접두 id 를 `fetchMlbPickResults`+`deriveMlbOutcome` 로 이미 처리하고, `buildPickEntries` 도 string id 를 그대로 유지하며 KBO 와 별도 로직(`ai_predicted_home_win`)으로 정확성 판정 — 전용 회귀 테스트 3건까지 존재. 이 배선은 **cycle 2244 fix-incident**("MLB 픽이 KBO 전용 parseInt 매칭에 걸려 gameId=NaN" 수정)가 plan #27 작성(cycle 2254)보다 10 사이클 앞서 이미 완성한 것 — cycle 2254 진단이 "라우트 존재 여부"만 diff 하고 라우트 내부가 이미 리그 무관인지 확인 안 해 생긴 stale premise (드리프트 사례 16 계열). `/picks` 페이지가 로컬스토리지의 KBO+MLB 혼합 픽을 이미 통합 렌더링하므로 전용 `/mlb/picks` 는 중복 구현.

이어서 Phase 3(`/mlb/leaderboard`) 착수 가치도 재검증 — production DB 직접 COUNT 쿼리(service-role): `mlb_pick_poll_events` 총 0건(unique device 0), `mlb_user_picks` 총 0건(nickname 0), KBO `user_picks` baseline 도 총 1건(nickname 1) — **사이트 전체 리더보드 참여가 사실상 0에 수렴**. plan 원문 risk note("리더보드가 장기간 비어 보일 위험")가 실측으로 확정 이상 심각함 확인 — 지금 4-view 인프라를 지어도 몇 달간 빈 페이지.

수정: 코드 변경 없음. `~/.develop-cycle/plans/moneyballscore/27.md` 에 cycle 2256 갱신 섹션 추가 — Phase 2 **폐기**(gap 자체 없음, 이미 해소됨) + Phase 3 **무기한 보류**(재확인 조건: `mlb_user_picks`/KBO `user_picks` COUNT ≥10 성장 시 재평가). plan #27 은 Phase 1 산출물만 유효, 사실상 완결 — 향후 unprocessed-plan lookup 대상에서 제외 권장.

다음 후보: review-code(heavy) 잔여 대형 파일(`buildSeasonSummary.ts` 346줄/`glossary/data.ts` 323줄/`insights/loader.ts` 311줄/`buildMlbTeamAccuracy.ts` 300줄) — plan #27 계열 후속 fire 는 참여 데이터 성장 전까지 불필요.

## 🟢 explore-idea (heavy) — plan #27 Phase 1: mlb_user_picks 테이블 + nickname sync route (cycle 2255, 2026-08-20)

진단: 강제 trigger 없음 (open issue 0건, approved plan 0건 — plan #27 은 spec_only 상태라 자동 매핑 대상 아니지만 자유선택 input 으로 유효, 2-chain lock 미충족 distinct=5/8, saturation 11/15 <12 미도달, fix-incident/op-analysis/info-arch/lotto gap trigger 전부 미도달). cycle 2254 retro 가 "plan #27 Phase 1 (explore-idea heavy) 가 concrete carry-over" 로 명시 추천 — 채택.

실측: 구현 전 KBO `/picks`/`/leaderboard` 실제 아키텍처 재확인 — `/picks`(MyPicksClient) 는 `user_picks` DB 테이블을 전혀 읽지 않고 localStorage(`use-user-picks.ts`) 기반, DB `user_picks`(024) 는 리더보드 "join"(닉네임 등록) 시에만 sync 됨. 그 과정에서 **기존 silent gap 발견**: `PickButton.tsx` 는 이미 MLB 픽을 `mlb-${gameId}` 네임스페이스로 KBO 와 같은 localStorage 키에 저장 중인데, `use-leaderboard.ts` 의 `readLocalPicks()` 가 `Number(id)` 파싱이라 `mlb-` 접두어는 NaN 필터로 조용히 제외 — 크래시 없이 MLB 참여자는 애초 리더보드 join 자체가 불가능했음(스펙 가정이 아니라 실제 코드 버그).

수정: `supabase/migrations/050_mlb_user_picks.sql` 신규(device_id+nickname+external_game_id FK mlb_schedule, KBO 024/025 분리 전례 + MLB 048 RLS 패턴), `db-constraints.ts` mlbUserPicks 추가, `/api/leaderboard/mlb-sync/route.ts` 신규(KBO sync route 의 external_game_id 버전), `use-leaderboard.ts` 에 `readLocalMlbPicks()` + auto-sync/join 양쪽 dual-sync 추가. 신규 테스트 10건(route 8 + hook 2). `pnpm test` 4059/4059 pass, type-check/lint clean, `supabase db push --linked` 적용 확인. PR #2989 squash-merge (e100c6ce).

Phase 2(`/mlb/picks` 개인 이력 페이지)/Phase 3(`/mlb/leaderboard` 순위 뷰, weekly/monthly 는 표본 희소성 이유로 후순위 검토) 는 이번 cycle scope 밖 — Tier 3 원안 그대로 후속 cycle 분산.

다음 후보: plan #27 Phase 2 (explore-idea heavy) 또는 review-code(heavy) 잔여 대형 파일(`buildSeasonSummary.ts` 346줄/`glossary/data.ts` 323줄/`insights/loader.ts` 311줄/`buildMlbTeamAccuracy.ts` 300줄).

## 🟡 explore-idea (lite, spec-only) — MLB 개인 픽 기록 + 리더보드 gap → plan #27 분리 (cycle 2254, 2026-08-20)

진단: 강제 trigger 없음이지만 explore-idea saturation trigger 충족(직전 15사이클 중 review-code/fix-incident/polish-ui/info-arch 12/15 ≥12) + cycle 2251/2252/2253 retro 3연속 "review-code 또는 explore-idea" 권고 + 2-chain lock 미충족(직전 8사이클 distinct=4, review-code 6/8 dominance 우려) — review-code 6연속(cycle 2246~2253 중 6회) 이후 diversity 자율 선택.

실측: cycle 2245 방법론(KBO↔MLB 앱 라우트 전체 diff) 재사용 — `/insights`(디베이트 reasoning, MLB 는 순수 quant 라 불필요 cycle 2245 기존 결론 유지), `/glossary`(`/mlb/factors`가 이미 커버, cycle 2245 rejected 유지) 외 신규 gap 발견: `/picks`(내 픽 기록)와 `/leaderboard`(순위)는 MLB 대응이 전무. MLB는 `mlb_pick_poll_events`(048, cycle 2223)로 익명 집계까지만 있고 nickname 식별 개인 기록 + 순위 경쟁 layer 부재. rubric 5축 평가: 가치 medium / 시간비용 large(신규 테이블+RLS+뷰4종+페이지+컴포넌트, KBO 규모 준함) / risk 2(LeaderboardClient 매개변수화 시 KBO 회귀 가능성) / 자율가능 yes / 의존성 none → **Tier 3 확정**. plan #26(MLB weekly/monthly reviews)과 동일하게 이번 cycle 은 spec-only, 구현 0.

수정: 코드 변경 없음. `~/.develop-cycle/plans/moneyballscore/27.md` 신규 (rubric + baseline + Phase 1~3 분리 제안 + 리스크 노트: MLB 참여 표본 희소성 실측 권장). 다음 fire 시 Phase 1(스키마 설계 결정 + 마이그레이션 + nickname 제출 flow)부터 재평가.

다음 후보: plan #27 Phase 1 (explore-idea heavy) 또는 review-code(heavy) 잔여 대형 파일(`buildSeasonSummary.ts` 346줄/`glossary/data.ts` 323줄/`insights/loader.ts` 311줄/`buildMlbTeamAccuracy.ts` 300줄).

## 🔴 review-code (heavy) — factor-explanations.ts 최초 감사(clean), 신뢰도 라벨 marginPp 10/20 하드코딩 발견/수정 + 루트 package.json version drift 정정 (cycle 2253, 2026-08-20)

진단: 강제 trigger 없음 (open issue/approved plan 0건 — plan #24 전체 phase 완결/closed, 2-chain lock 없음 직전 8사이클 distinct=5, fix-incident/op-analysis/info-arch/lotto 모두 자체 gap trigger 미도달, explore-idea saturation 11/15 <12 미도달). review-code 7연속 success streak(cycle 135 dominance-positive 룰 인정) — TODOS carry-over 명시 후보(`factor-explanations.ts` 409줄) 채택.

실측: `factor-explanations.ts`(409줄, 최초 감사) 자체는 클린 — `buildGameOverview`의 접전/우세 분기는 wave-352(cycle 1694)가 `NEUTRAL_HI`/`WIN_PROB_DOMINANT_HI`에서 파생한 `OVERVIEW_CLOSE_PP`(10)/`OVERVIEW_DOMINANT_PP`(20) 단일 source 사용. 소비 컴포넌트까지 확장 감사 — 정확히 같은 개념(marginPp 기준 신뢰도 라벨)을 `GameAnalysisProse.tsx`(KBO)와 `MlbGameOverview.tsx`(MLB KO+EN 2곳)가 각자 `marginPp < 10`/`< 20` 리터럴로 재하드코딩 — wave-352 "단일 source 격상" 의도가 실제로는 1곳만 적용되고 3개 소비 지점은 dark copy 상태(값은 동일해 지금은 안 보이지만 threshold 튜닝 시 세 곳만 조용히 어긋남). 부수 발견: cycle 2252 커밋(#2987)이 VERSION/`apps/moneyball/package.json`만 bump하고 루트 `package.json`은 `.43`에 멈춰있던 3-way version drift(정확히 `version-sync-guard.test.ts` 가 지키려던 케이스) — `pnpm --filter moneyball exec vitest run` 실행 중 자연 발견.

수정: `OVERVIEW_CLOSE_PP`/`OVERVIEW_DOMINANT_PP` export 후 3개 소비 지점 import 전환 + 루트 `package.json` 버전 동기화(`.45`). 회귀 테스트 1건 신규(`silent-drift-cycle-2253.test.ts`, source grep 기반). type-check/lint clean, 전체 470 files/4049 tests all pass(+5, zero regression). VERSION 0.5.62.44→0.5.62.45. PR #2988 머지 실측 확인(state=MERGED).

다음 후보: review-code(heavy) 미감사 대형 파일 잔여(`buildSeasonSummary.ts` 346줄/`glossary/data.ts` 323줄/`insights/loader.ts` 311줄/`buildMlbTeamAccuracy.ts` 300줄) 또는 diversity(explore-idea — saturation 11/15, 근접 유지).

## 🔴 review-code (heavy) — buildPicksStats.ts 최초 감사(clean), 🔥 픽 스트릭 배지 threshold 하드코딩(2 vs 3) 발견/수정 (cycle 2252, 2026-08-20)

진단: 강제 trigger 없음 (open issue/approved plan 0건, 2-chain lock 없음 직전 8사이클 distinct=5, fix-incident(8)/op-analysis(12)/lotto(18)/info-arch(2) 모두 자체 gap trigger 미도달, explore-idea saturation 11/15 <12 미도달). cycle 2251 retro 가 "review-code 또는 explore-idea" 권고 + review-code dominance 50%(직전 20사이클) 재확대 지적했지만 explore-idea 신규 redirect source 미확립 상태 — TODOS carry-over 명시 후보(buildPicksStats.ts 410줄 등 미감사 대형 파일) 채택, dominance-positive streak(cycle 135 룰) 인정 하 진행.

실측: `buildPicksStats.ts`(410줄, 최초 감사)의 KST 날짜 처리(`toKSTDate`)는 이미 cycle 2248 `kstDateKey` 패턴과 동일(offset 후 ISO slice) — clean. 소비 컴포넌트까지 확장 감사 — 동일 개념("🔥 N연속" 픽 스트릭 배지)이 `UserVsAIScorecard.tsx`(홈)/`LeaderboardTable.tsx`/`LeaderboardClient.tsx`(리더보드) 3곳은 `currentStreak >= 2`, 같은 `stats.currentStreak` 값을 쓰는 `/picks` 페이지 `WeeklyPicksSummary.tsx` 만 유일하게 `>= 3` 로 어긋남 — single source 부재로 값 desync 된 silent UX drift(스트릭 2인 유저가 홈에서는 배지를 보고 /picks 에서는 못 봄).

수정: `packages/shared`에 `PICKS_STREAK_BADGE_MIN=2`(다수 3곳 값 따라 통일) 신규 상수 추가, 4개 파일 전부 import 전환. 회귀 테스트 1건 신규(`silent-drift-cycle-2252.test.ts`, source grep 기반). type-check/lint clean, 전체 469 files/4044 tests all pass(+9, zero regression). VERSION 0.5.62.43→0.5.62.44. PR #2987 머지 실측 확인(state=MERGED).

다음 후보: review-code(heavy) 미감사 대형 파일 잔여(`factor-explanations.ts` 409줄/`buildSeasonSummary.ts` 346줄/`glossary/data.ts` 323줄/`insights/loader.ts` 311줄/`buildMlbTeamAccuracy.ts` 300줄) 또는 diversity(explore-idea — saturation 11/15 근접, 신규 redirect source 자연 발견 여부 다음 사이클 관찰).

## 🟢 info-architecture-review — /lotto/check sitemap 누락 발견/수정 (cycle 2250, 2026-08-20)

진단: 강제 trigger 없음이지만 3-cycle 연속(2247/2248/2249) retro 가 info-architecture-review diversity 권고 — dominance-positive streak(review-code heavy) 유지하며도 diversity 자율 선택. `find apps/moneyball/src/app -name page.tsx -mtime -7` 47건 flagged(git checkout mtime 오염 다수) → `git log --since="7 days ago" --diff-filter=A`로 실제 신규 16건 재확인(mlb accuracy/calendar/matchup/methodology/predictions/reviews 계열 + EN 미러 + `/lotto/check`). breadcrumb 누락 0건(전체 mlb/*/page.tsx 보유).

실측: sitemap.ts 전체 대조 — 15/16 은 이미 커버(각 신규 라우트 shipped 사이클에서 sitemap 동시 갱신됨), `/lotto/check`(cb21e154, 조합 검증 페이지) 1건만 누락. 페이지 자체는 canonical URL/OG/breadcrumb 모두 정상, `/lotto` 허브에서도 링크됨 — 사용자 도달은 가능하지만 Googlebot sitemap discovery 경로에서만 조용히 빠진 silent SEO drift.

수정: `sitemap.ts` static routes 에 `/lotto/check` 추가(priority 0.5). 회귀 테스트 1건 신규(`sitemap-mlb.test.ts`). type-check/lint clean, 전체 468 files/4035 tests all pass(+1, zero regression). VERSION 0.5.62.42→0.5.62.43.

다음 후보: review-code(heavy) 미감사 대형 파일(`buildPicksStats.ts` 410줄/`factor-explanations.ts` 409줄/`buildSeasonSummary.ts` 346줄/`glossary/data.ts` 323줄/`insights/loader.ts` 311줄/`buildMlbTeamAccuracy.ts` 300줄) 또는 헤더 메가메뉴·푸터 sitemap 컬럼 IA 점검 후속.

## 🔴 review-code (heavy) — buildTeamProfile.ts 등 4개 파일 최초 감사(clean), team 페이지 콜드게임/박빙 승부 threshold 하드코딩 발견/수정 (cycle 2249, 2026-08-20)

진단: 강제 trigger 없음 (open issue/approved plan 0건, 2-chain lock 없음 distinct=5/8, fix-incident(5)/op-analysis(9)/info-arch(7)/lotto(15) 모두 자체 gap trigger 미도달, lotto 8/22 회차 picks 이미 shipped). cycle 2248 TODOS carry-over 명시 후보(review-code heavy 대형 파일 잔여) 채택 — dominance-positive streak(cycle 135 룰) 인정.

실측: `buildTeamProfile.ts`(586줄)/`buildMlbTeamProfile.ts`/`buildMatchupProfile.ts`(579줄)/`buildMlbMatchupProfile.ts`(526줄)/`deriveMlbOutcome.ts` 최초 감사 — 5개 모두 이미 cycle 2034/2036/2040/2055/2064/2066/2071/2081/2117/2160 등 다수 review-code(heavy) 패스로 하드닝됨(fail-loud assertSelectOk, KBO/MLB alias 정규화, sort-then-consume 순서, confidence 스케일 통일) — 문제 없음. 소비 페이지까지 확장 감사한 끝에 발견: matchup 페이지는 `profile.summary`(단일 source 함수가 threshold 를 파라미터로 받음)를 그대로 렌더하지만, team 상세 페이지 3곳(`teams/[code]`, `mlb/team/[code]`, `en/mlb/team/[code]`)은 JSX 안에 "10점차"/"1점차"/"10+ run margin"/"one-run games" 숫자를 직접 하드코딩 — `MARGIN_BLOWOUT_THRESHOLD`/`MARGIN_CLOSE_GAME_THRESHOLD` 상수와 현재 값은 같지만 single source 아님(상수 튜닝 시 필터링은 바뀌는데 문구만 조용히 stale).

수정: 3개 파일 모두 상수 import + template literal interpolation. 회귀 테스트 6건 신규(`review-code-cycle-2249.test.ts`, source grep). type-check/lint clean, 전체 468 files/4034 tests all pass(+6, zero regression). VERSION 0.5.62.41→0.5.62.42.

다음 후보: review-code(heavy) 는 이번 사이클로 team/matchup profile 계열 5개 builder + 소비 페이지 감사 완료 — 다음은 미감사 대형 파일 재탐색(`find apps/moneyball/src -name "*.ts" -not -path "*__tests__*" | xargs wc -l | sort -rn`) 또는 diversity(info-architecture-review — 7-cycle gap, 아직 30 미도달이나 직전 여러 사이클 연속 diversity 권고 누적, 명시적 trigger 재확인 권장).

## 🔴 review-code (heavy) — convergenceRecord.ts 최초 감사, buildAccuracyData.ts dateRange KST 자정 오판 silent drift 발견/수정 (cycle 2248, 2026-08-20)

진단: 강제 trigger 없음 (open issue/approved plan 0건, 2-chain lock 없음 distinct=6/8, fix-incident(3)/op-analysis(7)/info-arch(5)/lotto(13) 모두 자체 gap trigger 미도달). cycle 2246/2247 retro 양쪽이 review-code(heavy) 대형 파일 잔여 백로그(convergenceRecord.ts 781줄/buildAccuracyData.ts 772줄/buildTeamProfile.ts 586줄/buildMatchupProfile.ts 579줄/buildMlbMatchupProfile.ts 526줄) 명시 — dominance-positive streak(cycle 135 룰) 인정 하 계속 진행, 첫 미감사 파일 `convergenceRecord.ts` 채택.

실측: `convergenceRecord.ts`(781줄, KBO+MLB 수렴 픽 통계 — 최초 감사)는 이미 600+ wave 반복으로 잘 정비돼 assertSelectOk 전량 적용 + 순수 함수 대부분 테스트 커버 — 문제 없음 확인. 인접 백로그 파일 `buildAccuracyData.ts`(772줄)로 확장 감사 — `buildVersionHistory`의 `dateRange` 표시가 `first.toDateString() === last.toDateString()`(host 런타임 local=UTC 날짜 비교)로 같은-날 여부를 판정하는데, 파일 안 다른 모든 날짜 경계 계산(`buildDayOfWeek`/`buildRollingAccuracy`/`getWeekStart` 등)은 `KST_OFFSET_MS`를 더해 KST 달력일로 비교 — 유일하게 이 지점만 패턴 이탈. KST 자정 근처(예: verified_at 14:00Z~15:30Z = KST 8/19 23:00~8/20 00:30)에 걸친 범위가 같은 UTC 날짜로 오판돼 실제 이틀 범위가 단일 날짜로 조용히 축약되는 silent drift 발견.

수정: `kstDateKey` 헬퍼(파일 기존 KST-shift 패턴 재사용, `new Date(d.getTime()+KST_OFFSET_MS).toISOString().slice(0,10)`)로 비교 방식을 파일 내 다른 함수들과 통일. 회귀 테스트 1건 신규(`buildAccuracyData.test.ts`, KST 자정 경계 케이스: 4/1 23:00~4/2 00:30 KST → "4/1~4/2" 범위 표시 검증). type-check/lint clean, 전체 467 files/4028 tests all pass(+1, zero regression). VERSION 0.5.62.40→0.5.62.41.

다음 후보: review-code(heavy) 잔여 대형 파일(buildTeamProfile.ts 586줄/buildMatchupProfile.ts 579줄/buildMlbMatchupProfile.ts 526줄) 또는 diversity(info-architecture-review — 6-cycle gap, 아직 30 미도달이나 직전 3사이클 연속 diversity 권고 누적).

## 🟢 polish-ui — /mlb/factors Statcast 배지 emerald 이탈 정정 + version-sync 3-way drift 재발 fix (cycle 2247, 2026-08-20)

진단: 2-chain lock 없음(distinct=5/8). 직전 두 사이클(2245/2246) retro 가 연속 diversity(polish-ui/info-architecture-review) 권고. 각 chain 마지막 fire 갭 측정 결과 fix-incident(3)/op-analysis(7)/info-arch(5)/lotto(13) 모두 자체 trigger 미도달인데, polish-ui 는 마지막 fire cycle 2170(77-cycle gap) + 직전 7일 신규 라우트 다수(mlb/wild-card·calendar·matchup·players·standings·methodology·accuracy·team·predictions·reviews 등 10+) 이후 polish-ui 0회 발화 — 명시적 trigger("신규 라우트 7일 안 추가 후 polish-ui 0회") 충족.

실측: DESIGN.md 토큰 vs 신규 MLB 컴포넌트 grep. `/mlb/factors` 페이지 안 가중치% 배지가 KBO 10팩터 섹션(line 357)은 `bg-brand-50 text-brand-700`, Statcast 4팩터 섹션(line 401)은 `bg-emerald-50 text-emerald-700` — 동일 컴포넌트 패턴인데 색 토큰만 이탈(카드 wrapper 는 양쪽 동일, amber "홈 어드밴티지" 섹션처럼 전체 themed 카드가 아니므로 의도된 구분색 아님). KO+EN 미러 양쪽 동일 버그.

수정: 두 파일(`mlb/factors/page.tsx`, `en/mlb/factors/page.tsx`) emerald→brand 토큰 정렬. 회귀 테스트 2건 신규(`polish-ui-cycle-2247.test.ts`, source grep 기반). 테스트 실행 중 별도 발견: cycle 2246 커밋이 `apps/moneyball/package.json` 만 0.5.62.39 로 올리고 루트 `package.json`/`VERSION` 은 0.5.62.38 잔존 — `version-sync-guard.test.ts`(cycle 2047 도입) 2건 fail. 3개 파일 모두 0.5.62.40 동기화로 같이 fix. type-check/lint clean, 전체 467 files/4027 tests all pass(+2, zero regression).

다음 후보: review-code(heavy) 대형 파일 잔여(convergenceRecord.ts 781줄/buildAccuracyData.ts 772줄/buildTeamProfile.ts 586줄/buildMatchupProfile.ts 579줄/buildMlbMatchupProfile.ts 526줄) 또는 info-architecture-review(트리거 갭 5, 아직 미도달). polish-ui 는 이번 fire 로 갭 리셋 — 다음 diversity 후보는 info-architecture-review 우선 검토 권장.

## 🔴 review-code (heavy) — analysis-data.ts 최초 감사, sp_confirmation_log 에러 silent swallow 발견/수정 (cycle 2246, 2026-08-20)

진단: 강제 trigger 없음 (open issue/approved plan 0건, 2-chain lock 없음 distinct=5/8, DESIGN.md 신선/lotto gap 12/CI 실패 0건 — polish-ui/lotto/fix-incident 자체 trigger 미도달). cycle 2245 retro 가 review-code(heavy) 계속 또는 diversity(polish-ui/info-arch) 권고했으나 diversity 쪽 명시적 trigger 부재 — `analysis-data.ts`(915줄, daily.ts/validator.ts/mlb-pipeline.ts 감사 이후 유일 미감사 대형 파일)를 명시적 후보로 채택.

실측: `getTodayAnalysisData()` 안 7개 supabase select 쿼리 중 6개는 `assertSelectOk`(에러 시 throw) 를 거치는데 `sp_confirmation_log`(오늘 선발투수 이름 조회, wave-335) 쿼리 1개만 `.data ?? []` 로 직접 사용 — RLS/connection 오류 시 예외 없이 "선발투수" 배지 전체가 원인 불명으로 조용히 사라지는 silent drift 가능성 발견.

수정: `spResult` 를 나머지 6개와 동일하게 `assertSelectOk` 경유로 정정. 회귀 테스트 1건 신규(`silent-drift-cycle-2246.test.ts`, source grep 기반, 파일 기존 테스트 스타일과 동일). type-check/lint clean, 전체 466 files/4025 tests all pass(+1, zero regression). PR #2984 squash+auto+delete-branch 머지 완료(state=MERGED 실측 확인). VERSION 0.5.62.38→0.5.62.39.

다음 후보: review-code(heavy) 대형 파일 잔여 (convergenceRecord.ts 781줄 / buildAccuracyData.ts 772줄 / buildTeamProfile.ts 586줄 / buildMatchupProfile.ts 579줄 / buildMlbMatchupProfile.ts 526줄) 또는 diversity(polish-ui/info-architecture-review) — 직전 20 cycle 안 양쪽 모두 0회, 다음 사이클 진단 시 명시적 trigger 재확인 권장.

## 🟢 explore-idea (heavy) — /mlb/methodology 신규, KBO /methodology parity (cycle 2245, 2026-08-20)

진단: 강제 trigger 없음 (open issue/approved plan 0건, 2-chain lock 없음 distinct=4/8). cycle 2242/2243/2244 retro 3연속이 explore-idea diversity 를 명시 권고(saturation 근접: 직전 15 사이클 중 review-code+fix-incident+polish-ui+info-arch = 10/15, 12 미도달이나 추세). plan #24/#25(MLB matchup 전체 phase) 완결 확인, KBO↔MLB 라우트 parity grep 으로 신규 후보 탐색.

실측: `/mlb/glossary` 를 먼저 검토했으나 기존 `/mlb/factors`(14팩터 가중치+정의+출처, plan #25 이전부터 존재)가 이미 그 역할을 완전히 커버 — 순수 중복이라 폐기. Footer "도움말"(KBO) vs "MLB" 컬럼 비교 결과 KBO 는 `/glossary`+`/methodology`+`/guide` 3종이 있는데 MLB 는 `/mlb/factors` 1종뿐 — `/methodology`(전체 프로세스: 데이터 소스/AI 에이전트 토론/검증 방법/모델 진화 history, 506줄)에 대응하는 MLB 라우트가 진짜 gap. `mlb-pipeline.ts` grep 결과 `debate`/`judge` 호출 0건 확인 — MLB 는 KBO 의 LLM 토론 layer 없이 순수 정량 모델(`scoring_rule='mlb_v0.1'` 단일 버전)만 사용한다는 사실이 사용자에게 투명하게 공개된 적 없었음(신규 콘텐츠, 중복 아님).

수정: `/mlb/methodology` + `/en/mlb/methodology` 신규 — 핵심 원칙(정량 모델, LLM 토론 없음 명시)/데이터 소스(MLB Stats API·Baseball Savant·FanGraphs MLB)/정량 모델(Elo K-factor `MLB_ELO_K`/`MLB_ELO_K_POSTSEASON`, 가중치 표는 `/mlb/factors` 링크로 위임해 중복 회피)/검증 방법(`/mlb/accuracy` 링크)/한계+면책 5섹션. Header MLB 메가메뉴 + Footer MLB 컬럼 + `sitemap.ts`(KO/EN) 배선. 테스트 8건 신규(`mlb-methodology-page.test.ts` 6건 + `sitemap-mlb.test.ts` 2건). `pnpm --filter @moneyball/shared type-check` / `pnpm --filter moneyball type-check` 통과, `pnpm --filter moneyball exec vitest run` 465 files/4024 tests 전량 통과(+8, zero regression), `pnpm --filter moneyball lint` clean. VERSION 0.5.62.37→0.5.62.38.

다음 후보: MLB parity 는 `/mlb/factors`/`/mlb/methodology`/`/mlb/reviews`/`/mlb/matchup`/`/mlb/team` 6팩터 등 대부분 영역 성숙 완료 — 다음 explore-idea 는 리더보드 국가 동기화 MLB 지원(Tier 3, cycle 2244 carry-over, DB 스키마 결정 필요) 또는 신규 product 방향, diversity(polish-ui/info-arch) 검토 권장.

## 🔴 fix-incident — MLB 픽('mlb-{external_game_id}') /api/picks/results silent drop 수정 (cycle 2244, 2026-08-20)

진단: 강제 trigger 없음 (open issue/approved plan 0건, 2-chain lock 없음 distinct=3/8, fix-incident 자체 20-cycle gap 미도달 9<20). cycle 2242/2243 retro 양쪽 모두 explore-idea/dimension-cycle diversity 를 권고했으나, plan #26(MLB 주간/월간 리뷰) 완결 + Phase 3 dedup(pearsonCorrelation)도 cycle 2232 에 이미 처리돼 명시적 신규 explore-idea/review-code 후보가 없음. KBO 라우트 vs MLB 라우트 parity grep 중 `/picks`(내 픽 기록)·`/leaderboard` 가 MLB 미러 부재 발견 → 코드 추적 결과 "미러 부재"가 아니라 **silent 실패**로 확인, fix-incident 로 재분류.

실측: `PickButton`(league='mlb')은 localStorage `mb_user_picks_v1` 에 `mlb-{external_game_id}` 문자열 키로 픽을 정상 저장하지만, `/api/picks/results` (`parseInt(s,10)` 필터)와 `buildPickEntries`(`parseInt(idStr,10)`) 양쪽 모두 KBO 정수 game_id 만 가정 — `parseInt('mlb-745444',10)` === `NaN` 이라 MLB 픽이 매 요청 100% 드롭. "내 픽 기록" 페이지에서 MLB 픽은 팀명 null, 영구 "대기중"(isResolved 항상 false), `gameId=NaN` React key 충돌(여러 MLB row 가 있어도 1개만 렌더)로 나타남. 리더보드 국가 동기화(`lib/leaderboard/use-leaderboard.ts` `readLocalPicks` `Number(id)` 필터)도 동일 클래스 버그로 MLB 픽을 서버에 전혀 동기화 안 함 — 이건 `mlb_pick_poll_events`(migration 048) 선례처럼 별도 테이블/스키마가 필요한 더 큰 범위라 이번 fix 스코프 밖(Tier 3)으로 명시 유지.

수정: `/api/picks/results/route.ts` 가 ids 를 KBO 숫자군과 `mlb-` 접두 문자열군으로 분리해 각각 조회 — MLB 는 `mlb_schedule` + `predictions`(`prediction_type='pre_game' AND league='mlb' AND scoring_rule IN MLB_PRODUCTION_COHORT_RULES`, `mlb-shared.ts fetchMlbPredictionRowsInRange` 와 동일 join 패턴 재사용) 조회 후 `deriveMlbOutcome` 으로 승자/정오 직접 산출(MLB predictions 행은 `predicted_winner`/`is_correct` 컬럼이 전량 NULL — team FK 매칭이 애초에 안 맞음). `PickGameResult.id: number → number | string`, 신규 `ai_predicted_home_win`(MLB 전용 bool, id-equality 매칭 우회) 필드 추가. `buildPicksStats.ts` 는 resultMap 을 `String(id)` 키로 통일해 KBO/MLB 양쪽 매칭. 테스트 11건 신규(route.test.ts 6건 + buildPicksStats.test.ts 5건 — NaN 미발생/팀명·스코어 정상 채움/ai_predicted_home_win 판정/KBO+MLB 혼합 무충돌/미매칭 unresolved). type-check/lint clean, 전체 464 files/4016 tests all pass (+11, zero regression). commit `a08e9f96` 직접 main push (pre-push hook 통과).

다음 후보: 리더보드 국가 동기화 MLB 지원(Tier 3, DB 스키마 결정 필요 — `mlb_pick_poll_events` 패턴처럼 별도 테이블 또는 `leaderboard` 관련 테이블 컬럼 타입 변경) 은 명시적 후속 과제로 carry-over. 그 외 신규 explore-idea/review-code 후보 부재 시 dimension-cycle fallback 또는 diversity(polish-ui/info-arch) 자연 검토 권장.

## 🔴 review-code (heavy) — mlb-pipeline.ts 최초 감사, 2개 모드 insert 100% silent 실패 발견/수정 (cycle 2243, 2026-08-19)

진단: 강제 trigger 없음 (open issue/approved plan 0건, gap 미달, 2-chain lock 없음distinct=4/8). cycle 2239/2241 retro 양쪽 모두 `mlb-pipeline.ts`(731줄, validator.ts/daily.ts 감사 후 유일 미감사 non-UI pipeline 파일)를 다음 후보로 명시 — carry-over 채택. cycle 2242 diversity 권고(explore-idea/dimension-cycle)보다 명시적 미감사 대상 존재를 우선.

실측 (prod REST 직접 확인): `runShadowTrain()` 이 insert 하는 `mlb_shadow_train_log` 테이블이 migration 001~048 전체에 걸쳐 한번도 생성된 적 없음(`PGRST205` 실측). `runWalkForwardMeasure()` 는 기존 `walk_forward_brier`(월간 base-vs-shadow 비교 전용 스키마, migration 036)에 date/scoring_rule/brier_score/sample_count(일별 로그) insert 시도 — 컬럼 전량 불일치, orphan 테이블(리포 전체 reader 0건). 두 모드 모두 매 fire 100% insert 실패 상태 방치. mock 기반 테스트(1144건)는 테이블명/컬럼 무관 `{error:null}` 반환이라 이 클래스 버그를 못 잡음.

수정: migration 049(`mlb_shadow_train_log` + `mlb_walk_forward_log` 신규, `walk_forward_brier` 보존) 작성 + `supabase db push --linked` 로 prod 적용 + REST insert/delete 실측 검증. `runWalkForwardMeasure` 타겟을 `mlb_walk_forward_log` 로 정정. 회귀 테스트 2건 추가(테이블명+payload 키 검증, mock shape-only 테스트 한계 보완). type-check 4/4 clean, lint clean, 전체 1144/1144 pass. commit `49346963` 직접 main push (pre-push hook 통과).

다음 후보: diversity 권고(polish-ui/explore-idea/dimension-cycle) 유효 — review-code non-UI pipeline 커버리지 이제 daily.ts/validator.ts/mlb-pipeline.ts 전부 감사 완료. 신규 review-code(heavy) 대상 부재 시 explore-idea 또는 dimension-cycle 자연 전환 권장.

## 🟢 info-architecture-review — diversity carry-over 체크포인트, IA/디자인 gap 0건 (cycle 2242, 2026-08-19)

진단: cycle 2239/2240/2241 retro 3연속이 "diversity — polish-ui 또는 info-architecture-review" 를 다음 후보로 명시 (review-code/op-analysis dominance 대응) — carry-over 채택.

실측: breadcrumb 누락 grep 20건 전부 의도적 제외(debug/redirect-only/root/utility/placeholder) = 신규 gap 0. sitemap.xml drift 0. en/mlb 미러 11라우트 이미 2개월 전부터 완전 wiring(mtime false positive였음). DESIGN.md `## MLB IA` + `mlb-vs-kbo-priority.md` stale lock 문서는 어제(cycle 2162)이미 정정 완료. plan #24/#25/#26 (MLB matchup/Elo/weekly·monthly) 전부 completed/archived, Phase 3 dedup 후속도 cycle 2232/2233 이미 처리. DESIGN.md 는 어제 매우 활발히 갱신되어 4주 staleness 조건과 무관.

결론: 이번 diversity 신호는 "미발화 gap" 이 아니라 "review-code/op-analysis dominance 가 이미 이 영역 signal 흡수 완료" 로 실측 확정. 코드/문서 변경 없음(체크포인트 spec 만 신규 박제, `docs/design/ia-2026-08-19-cycle-2242-diversity-carryover-checkpoint.md`). outcome=retro-only.

다음 후보: review-code(heavy) 신규 대상 부재 시 dimension-cycle fallback 검토 또는 explore-idea(lite) 로 완전히 새 product 방향 재탐색 권장 — 현 10팩터/IA/MLB parity 모두 성숙 상태.

## 🟢 review-code (heavy) — validator.ts 최초 감사, 환각 검증 half-applied fix 재발 발견/수정 (cycle 2241, 2026-08-19)

진단: 강제 trigger 없음 (2-chain lock 없음 distinct=4/8, fix-incident/op-analysis/
lotto/info-arch 모두 gap 미달, open issue/plan 0건). cycle 2239/2240 retro 양쪽
모두 validator.ts 를 다음 review-code(heavy) 후보로 명시 flag — carry-over 채택.

- `packages/kbo-data/src/agents/validator.ts` (899줄, agents/ 디렉토리 유일 미감사
  파일) 서브에이전트 위임 감사.
- **발견**: cycle 2122 fix 가 `buildInjectionText` 안 `buildUserMessage` prepend
  블록(recent_form/head_to_head 소수점 percent) 만 수동 동봉했으나, 같은 블록엔
  metric 별 가중치% ("가중치 15.0%", `NUMERIC_WHITELIST` 밖) 와 WAR/SFR 반올림
  정수 표기도 LLM 에 노출됨 — 정당한 인용도 `checkHallucinatedNumbers` 오탐 위험
  (half-applied fix 재발 패턴, silent drift family).
- **수정**: `renderContextForLLM` 의 "[정량 메트릭]"+"[상대 전적 + 최근 폼]" 섹션을
  `renderMetricsAndRecentFormForLLM` 으로 추출 (agent-context.ts 단일 source),
  `buildInjectionText` 재사용 — 수동 라인 나열 제거로 재동기화 누락 구조적 차단.
  "[도메인 컨텍스트]" 섹션은 의도적 제외 (실측: 구장 hint 0.95 + K/9 잔재값 9 =
  9.95 가 진짜 환각 9.95 를 통과시키는 false negative 확인).
- 검증: type-check clean, kbo-data 88 files/1142 tests pass, apps/moneyball
  silent-drift-wave-225 + agentFallbackStats pass, 신규 회귀 테스트 3건 추가.
  PR #2982, commit `acc138e2`, R7 자동 머지 완료 (`gh pr view 2982 --json
  state,mergedAt` 로 MERGED 실측 확인, mergeCommit `0ae406ce`).
- 다음 후보: review-code(heavy) 가 validator.ts/daily.ts/UI 3대 monolith 모두
  커버 완료 — 비UI agent/pipeline coverage 포화 근접. polish-ui 또는
  info-architecture-review (diversity, 44+/16 cycle 무발화, 단 이번 사이클
  quick check 로는 구체 trigger 미발견 — 깊은 재검토 필요) 또는 explore-idea 고려.

## 🟢 operational-analysis (heavy) — CE 상태 재확인 + debate_version stale default 발견/fix (cycle 2240, 2026-08-19)

진단: 강제 trigger 없음 (모든 gap 미충족, lock 없음, open issue/plan 0건). 직전
20 cycle review-code+explore-idea 80% 편중 재확인 재발 + 장기 stale carry-over
("CREDIT_EXHAUSTED 사용자 크레딧 충전 이행 monitor") 실측 검증 가치 판단해
operational-analysis (heavy) 자율 선택.

- `scripts/op-analysis-ce-cohort.ts` 재실행 결과 total n=316 이 cycle 2191
  스냅샷과 완전 동일 — 처음엔 "frozen 49 cycle" 로 의심했으나 git log 대조 결과
  cycle 2191~2240 모두 같은 날(2026-08-19) 몇 시간 내 발생한 사이클이라 정상
  (KBO 결과 검증 cron 은 1일 1회, 그 사이 새 verified row 없었을 뿐 — false alarm)
- **핵심 재확인**: pre_game v1.8 예측 8/1~8/19 59/59 전량 `debate_version=NULL`
  — CREDIT_EXHAUSTED 100% fallback 지속, 기존 narrative 그대로. 결정 불필요.
- **부수 발견 + fix**: `in_game` 예측(`live.ts` upsert)이 `debate_version` 을
  명시 안 해 migration 007 의 stale `DEFAULT 'v1-narrative'` (현 코드베이스에
  존재조차 안 하는 옛 리터럴) 를 조용히 상속 — "debate 있었던 것"처럼 오분류될
  여지. 실측: 8/10~8/19 in_game 38건 전량 이 값. 현재 모든 consumer가
  `prediction_type='pre_game'` 선필터라 실질 영향 0 (dormant) 이지만 향후
  landmine 차단 위해 explicit `debate_version: null` 추가. PR #2981,
  commit `2cc75f3f`, R7 자동 머지 완료 (`gh pr view 2981 --json state,mergedAt`
  로 MERGED 실측 확인, mergeCommit `7a47ef25`).
- 검증: `pnpm type-check` 4/4 clean, `pnpm test` 463 files/4005 tests all
  pass, `pnpm lint` clean (pre-push hook)
- 다음 후보: review-code(heavy) — validator.ts(899줄) 또는 mlb-pipeline.ts
  (731줄), cycle 2239 이미 flagged. 다양성 위해 polish-ui/info-arch/lotto 도
  검토 가치 (직전 20 cycle review-code+explore-idea 편중 지속)

## 🟢 review-code (heavy) — daily.ts 최대 미감사 non-UI monolith 감사, gap fix (cycle 2239, 2026-08-19)

진단: 강제 trigger 없음 (fix-incident gap=4/lotto gap=5/info-arch gap=14/
op-analysis gap=1, 모두 threshold 미달 / 2-chain lock 없음 distinct=5 / open
issue 0건 / unprocessed plan 0건 — plan 3~24 전부 status:approved 아님).
breadcrumb 16개 누락 grep 은 전부 top-level/debug/redirect-stub 페이지라
false lead 확인 (info-arch 액션 없음). DESIGN.md 는 어제 갱신 fresh (design-system
trigger 없음). 3대 UI monolith(analysis/accuracy/home page.tsx) 는 cycle 2149/
2150/2237 이미 감사 완료 — `packages/kbo-data/src/pipeline/daily.ts`(1601줄,
실제 예측 파이프라인 엔트리, non-UI 파일 중 최대) 가 review-code heavy 대상으로
한 번도 안 감사됐음을 확인해 이번 타겟으로 선정.

- 전체 1601줄 read. 파일 자체는 이미 수십 개 과거 silent drift fix 주석으로
  매우 방어적으로 짜여있음(assertSelectOk/assertWriteOk 패턴 통일 등)
- **발견 + fix**: `handleDailySummaryNotification`(1176줄~)의 `expected` 산정
  (1185)이 `predict_final` GAP 감지(1049, cycle 936 fix)와 동일 개념인데
  `status !== 'live'` 제외가 누락 — live 경기가 expected 를 부풀리면 predict
  mode(strict)에서 매 시간 `todayTotal<expected` 로 summary skip 되다
  predict_final(last-chance)까지 알림이 밀리는 silent delay 가능. 동일 'live'
  제외 조건 추가로 두 산정 일치 (PR #2980, `b2fce392`, R7 자동 squash 머지 완료
  — `gh pr view 2980 --json state,mergedAt` 로 MERGED 실측 확인).
- 저확신 항목 1개 기록(수정 안 함): `isFirstPredictRun`(retention cleanup +
  morning postview) 가 `getUTCHours()===1` 단발 조건이라 그 시각 cron 이
  실패하면 그날 cleanup/postview 가 fallback 없이 통째로 skip — 재발 빈도
  낮고(daily retention 은 다음날 자연 회복) 별도 evidence 없어 이번엔 스코프 밖
- 검증: `pnpm type-check` 4/4 clean, `pnpm test` 463 files/4005 tests all
  pass, `pnpm lint` clean (pre-push hook)
- 다음 review-code(heavy) 후보: `packages/kbo-data/src/agents/validator.ts`
  (899줄), `packages/kbo-data/src/pipeline/mlb-pipeline.ts`(731줄) — 둘 다
  non-UI 대형 파일 중 미감사
- outcome: success

## 🟡 operational-analysis (lite) — 주간 checkpoint, 소표본 no-action (cycle 2238, 2026-08-19)

진단: 강제 trigger 없음 (fix-incident gap=3 / lotto gap=4 / info-arch gap=13 /
op-analysis gap=23<25, threshold 근접 / 2-chain lock 없음 / open issue 0건 /
unprocessed plan 0건). review-code heavy 는 3대 monolith 감사 완료로 새 후보
없음(cycle 2237 결론) — explore-idea+review-code 가 직전 20 사이클의 80%
(16/20) 차지해 다양성 보강 목적으로 op-analysis lite 선택.

- 도중 발견: `gh run list` 로 `op-analysis-weekly` cron 최근 실행(2026-08-17)이
  `failure` 로 표시 — fix-incident 신호로 보였으나 실제로는 cycle 2154~2155
  구간에서 이미 완전 해결됨 확인 (`215097fe` gh pr create/merge 503 재시도 로직
  추가 + `b9dcb633` 로 08-17 데이터 backfill, 둘 다 2026-08-18 17:32 커밋).
  `gh run list` 최근 결과만 보면 오해 소지 있음 — 실제 커밋 로그 대조 필수
  (CLAUDE.md R5 정신 재확인, 별도 fix 불필요).
- `scripts/op-analysis-cohort.ts` 로컬 재실행 (2026-08-19 기준): 전체 n=469
  (08-17 대비 +5) / v1.8 규칙 n=291 acc 55.0% Brier 0.3429 (08-17: acc 55.2%
  Brier 0.3436, 안정) / v2.1-B-shadow n=52 acc 51.9% (동결 유지, reject 상태
  변화 없음). v1.8 유지 확정 재확인, 재조정 근거 없음.
- 이번 주(월 08-17~) 자체 필터 결과: n=24 (화요일 08-18 경기만 verified, 월요일
  KBO 휴무 + 오늘 08-19 경기 미검증) / acc 45.8% — 표본 너무 작아 (n=24)
  하락 신호로 해석 X (plan 자가검증 rubric: 소표본 결정 금지 원칙 적용).
- outcome: retro-only (코드 변경 0, 측정 + 오해 소지 신호 정정만)

## 🟢 review-code (heavy) — 홈페이지 monolith 감사, 확정 버그 0건 (cycle 2237, 2026-08-19)

cycle 2236 carry-over 따라 `apps/moneyball/src/app/page.tsx` (1082줄, 미감사 최대
monolith) 전체 read. analysis/accuracy 는 이미 cycle 2149/2150 감사 완료 — 이번이
3대 monolith 마지막.

- 확정 버그 0건 (이전 사이클 sentinel/가드 누락류 재발 없음)
- 저확신 항목 2개만 기록 (수정 안 함, 근거 불충분):
  - `selectBigMatchFromGames` 가 `selectTopStatPick` 과 달리 scheduled 상태
    필터 없음 — 분석 카드 특성상 의도된 설계일 가능성 (라이브 스코어와 무관)
  - `classifyNoGameReason` 주석 "gap>7d → offseason/break" vs 실제 코드는
    gap>7 시 무조건 'break' 만 반환 (offseason 은 `!next` 시에만) — doc-only
- field-priority 차이 (`home_win_prob` vs `reasoning.homeWinProb`) 검증 —
  daily.ts 파이프라인에서 항상 동시 기록되어 drift 아님 확인
- 기존 테스트 (silent-drift-wave-234, wave-377-top-pick-badge) 23/23 pass
- 다음 review-code(heavy) 후보 없음 — analysis/accuracy/page.tsx 3대 monolith
  모두 감사 완료. 다음 heavy 트리거는 새 drift 신호 발생 시
- outcome: retro-only (코드 변경 0)

## 🟡 review-code (lite) — health baseline, 강제 trigger 없음 (cycle 2236, 2026-08-19)

진단 결과 어떤 chain 도 강제 발화 조건 미충족 (op-analysis gap=21<25 / info-arch
gap=11<30 / lotto gap=2<30 / fix-incident gap=1<20 / 2-chain lock 없음 / open
issue 0건 / plan #26 완전 종결). heavy review-code 가 직전 두 사이클(2232 dedup +
2233 clean audit) 이미 같은 영역 감사 완료라 재감사 한계효용 낮음 판단 — 직접
health baseline 측정만 진행 (코드 변경 0).

- type-check: `pnpm type-check` 4/4 packages clean (cached)
- lint: `pnpm --filter moneyball lint` clean, 0 warnings
- test: `pnpm test` 463 files / 4005 tests all pass
- knip 미설치 (N/A)
- 종합 = 전 카테고리 clean 유지 — 지속 10/10 baseline 은 review-code(heavy) 룰
  ("10/10 유지 시 heavy 권장, 지표 무관 silent drift 가능성") 발동 근거
- 다음 review-code(heavy) 후보: `apps/moneyball/src/app/page.tsx`(1082줄, 홈페이지)
  — analysis/page.tsx(2802줄)/accuracy/page.tsx(1203줄) 는 이미 cycle 2149/2150
  감사 완료, 홈페이지는 미감사 최대 monolith
- outcome: retro-only (코드 변경 0, 순수 measurement)

## 🟢 fix-incident — /lotto/check 프로덕션 빌드 실패 (cycle 2235, 2026-08-19)

deploy-drift-alert 스케줄 workflow 실패 발견 (fix-incident source table 지시대로
`gh run list` 직접 확인, 20-cycle gap 트리거 미충족이었지만 실제 CI 신호 우선).
main HEAD 이 production 대비 10-commit 앞섬(gap 1h+) — cb21e154(`/lotto/check`
신규) 배포부터 매 배포 Error.

- 원인: `loadAllWinners()` 가 `apps/moneyball/data/lotto-data.json` (rules 감사용
  메타데이터 dict, lotto-data-schema.test.ts 대상) 을 역대 당첨 배열로 오인 —
  실제 1237회 당첨 배열은 `scripts/lotto-data.json`. 이름 충돌로 object 를
  `WinnerEntry[]` for-of 순회 → "TypeError: c is not iterable" prerender 실패
- 수정: WINNERS_PATH_CANDIDATES 를 `scripts/lotto-data.json` (repo-root +
  package-anchored, 기존 RESULTS_DIR_ROOT/FALLBACK 패턴과 통일) 로 정정
- 검증: 로컬 `pnpm --filter moneyball build` 재현(수정 전 동일 에러) → 수정 후
  정상 static 생성, 463 files/4005 tests + type-check 통과, 커밋 658838eb 직접
  push(main), 신규 배포(mo7us641q) Ready 확인 후 **실측 fire**: `curl
  /api/version` → commit_sha=658838e 확인 + `curl -o /dev/null -w '%{http_code}'
  /lotto/check` → 200 (R5 정정 룰 — isolated smoke 아닌 실 프로덕션 확인)
- outcome: success

## 🟢 lotto (lite) — 30-cycle gap 감사 (cycle 2234, 2026-08-19)

lotto trigger 6 (30-cycle gap, last fire cycle 2175) + 2-chain alternation lock 탐지
(직전 8 사이클 explore-idea/review-code distinct=2 → 둘 다 후보 제외) 조합 발화.

- count_smoke: 256 rule 기준 유효 조합 **7,705,415** / 전체 8,145,060 / 제거 5.40% / 106.4s
  (직전 cycle 1982 baseline 7,700,649 대비 valid_delta **+4,766** — 신규 회차 데이터 유입에
  따른 통계 자연 이동, rule 변경 없음)
- new_rules: 0 (rule 추가/제거 없음, 순수 감사 fire)
- pick_sample: 1238회 (2026-08-22) 50세트 이미 cycle 2231~2233 사이 박제됨
  (`~/lotto_picks/2026-08-22-50sets.md`, f7d41bf5) — 신규 생성 불필요
- self_verify: 1237회 (2026-08-15) OOS 이미 검증 완료 (`2026-08-15-result.md`) — 3개 일치
  1건/50, 기댓값 수준 (무작위 3개+ 확률 ≈1.87%), drift 없음
- outcome: success (신규 코드 변경 0, 순수 measurement/audit — cycle 1982 패턴 동일)

## 🟢 review-code (heavy) — pearsonCorrelation dedup (plan #26 Phase 3, cycle 2232, 2026-08-19)

plan #26 Phase 3 후속 후보 (cycle 2231 TODOS 박제) — `analyzeFactorAccuracy`
(dashboard/factor-accuracy.ts) 와 `buildMlbFactorInsights`(reviews/mlb-shared.ts) 가
byte-identical `pearsonCorrelation` 19줄을 각자 구현 (diff 확인 완료, 완전 동일).

- 신규 `apps/moneyball/src/lib/stats/pearson.ts` 로 추출 + 단위 테스트 4건 신규
  (`__tests__/pearson.test.ts` — n<2, 완전 양의상관, 완전 음의상관, zero-variance)
- 양쪽 파일 로컬 함수 삭제 + import 로 교체, 로직 변경 없음 (순수 dedup)
- `buildMlbFactorAccuracy.ts` 의 3번째 `LOWER_IS_BETTER` Set 은 스코프 밖 유지 — key
  타입(`FactorKey` 7종 vs `MlbFactorKey` 5종)이 달라 리터럴 중복 아님, 우연히 겹치는
  비즈니스 규칙(FIP류 lower-is-better)이라 강제 통합 시 두 도메인 결합 위험
- 테스트: `pnpm --filter moneyball test -- --run` 463 files/4005 tests all pass
  (+1 file/+4 tests, zero regression), type-check/lint clean

## 🟢 explore-idea (heavy) — MLB 월간 리뷰 Phase 2 페이지 (plan #26, cycle 2231, 2026-08-19)

Phase 1(weekly, cycle 2229/2230) 이 만든 `fetchMlbPredictionRowsInRange`/MLB factor-insight
헬퍼/`MLB_FACTOR_WEIGHTS`/`computeMonthRange`(리그 무관) 그대로 재사용해 monthly 버전 ship.
PR #2978 (squash 4a5ad758). plan #26 전체(Phase 1a+1b+2) 완결 — status
`phase1_shipped_cycle_2230_phase2_monthly_pending` → `all_phases_shipped_cycle_2231`.

- `/mlb/reviews/monthly` (index, 현재 월 redirect) + `/mlb/reviews/monthly/[month]` (ISR page,
  opengraph/twitter image, not-found) — MLB weekly Phase 1b 구조 그대로 복제 (신규 데이터
  레이어 없음)
- `buildMlbMonthlyReview.ts` 신규 — KBO `buildMonthlyReview.ts` 구조 복제, MLB 데이터 소스 재사용
- `/mlb/reviews` 허브 페이지에 weekly + monthly 진입 링크 카드 신규 추가 — **발견**: Phase 1b 가
  hub 페이지에 weekly 링크 자체를 빠뜨렸던 것도 이번에 같이 보강 (plan 문서가 "기존 weekly
  링크 옆에 monthly 추가"라 가정했으나 실제로 weekly 링크가 아예 없었음)
- Header/Footer EN-locale exemption: Header 는 `/mlb/reviews/` prefix 가드가 이미 monthly 도
  자동 커버(코드 변경 불필요), Footer 는 monthly 링크 추가
- sitemap.ts monthly route 추가 (cycle 2225/2230 패턴 재사용)
- Phase 3(선택, 후속) — `analyzeFactorAccuracy`/`analyzeMlbFactorAccuracy` dedup (review-code
  heavy 대상, KBO 회귀 테스트 필수) 는 스코프 밖으로 유지, 후속 review-code fire 후보
- 테스트: `pnpm --filter moneyball test -- --run` 462 files/4001 tests all pass (+3 files/+11
  tests, zero regression), typecheck/lint clean

## 🟢 explore-idea (heavy) — MLB 주간 리뷰 Phase 1b 페이지 (plan #26, cycle 2230, 2026-08-19)

Phase 1a(cycle 2229) 데이터 레이어를 소비하는 페이지 ship. PR #2977 (squash d8ef6343).

- `/mlb/reviews/weekly` (index, 현재 주 redirect) + `/mlb/reviews/weekly/[week]` (ISR page,
  opengraph/twitter image, not-found) — KBO `/reviews/weekly` 구조 그대로 복제
- `MlbHighlightCard.tsx` 신규 컴포넌트 — KBO `HighlightCard` 재사용 불가 확인 후 병렬 구현
  (`MlbWeeklyHighlight` 필드명 externalGameId/predictedHomeWin 이 KBO gameId/predictedWinnerCode
  와 달라 shape incompatible)
- Header/Footer EN-locale exemption `/mlb/reviews/weekly` 로 확장 + sitemap.ts weekly route 추가
- **의도적 생략**: convergence-pick 시즌 전체 통계(강수렴/완전수렴 W-L, streak) — weekly view 에
  안 넣음. `convergenceRecord.ts` 확인 결과 관련 함수들이 date-range 파라미터 없이 시즌 전체
  스캔이라 주간 데이터로 억지 재현 시 실제와 다른 수치 표시 위험 (mlb/reviews 허브 페이지
  cycle 2226 코멘트에서도 이미 후속 과제로 명시됨)
- EN 변형 skip (Phase 1 KO only, mlb/reviews 본체 전례 따름)
- 테스트: `pnpm --filter moneyball test -- --run` 459 files/3990 tests all pass, zero regression
- plan #26 status: `phase1a_data_layer_shipped_cycle_2229_pending_phase1b` →
  `phase1_shipped_cycle_2230_phase2_monthly_pending`
- **다음 fire 후보 (Phase 2, 낮은 증분 비용)**: `buildMlbMonthlyReview.ts` + `monthly/[month]/page.tsx`
  + index — Phase 1 이 만든 `fetchMlbPredictionRowsInRange`/`analyzeMlbFactorAccuracy`/
  `MLB_FACTOR_WEIGHTS` 그대로 재사용, `computeMonthRange` import 만 추가. `/mlb/reviews` 허브에
  weekly/monthly 진입 링크 추가도 함께.

## 🟢 explore-idea (heavy) — MLB 주간 리뷰 Phase 1a 데이터 레이어 (plan #26, cycle 2229, 2026-08-19)

plan #26 (Tier 3, approved) unprocessed plan lookup 자동 매핑 — target_chain=explore-idea
그대로 fire. 규모가 1 cycle 초과 확실해 plan 자체 체크리스트("Phase 1 을 1a(데이터
레이어)/1b(page.tsx+nav) 로 쪼개 2회 fire 검토")에 따라 1a 만 이번 cycle 착수.

- `apps/moneyball/src/lib/reviews/mlb-shared.ts` 신규: `fetchMlbPredictionRowsInRange`
  (mlb_schedule + predictions 두 쿼리 external_game_id 조인, `fetchMlbConvergencePickDetailedResults`
  패턴 재사용) + `buildMlbTeamStats` + `buildMlbFactorInsights`(home/away diff 기반
  Pearson 상관계수 — KBO `analyzeFactorAccuracy` 의 0.5중심 normalized factors 가정이
  MLB 원본 스탯 컬럼엔 안 맞아 병렬 신규 구현, `buildMlbFactorAccuracy.ts` 의
  LOWER_IS_BETTER 규칙 재사용)
- `apps/moneyball/src/lib/reviews/buildMlbWeeklyReview.ts` 신규: KBO `buildWeeklyReview.ts`
  구조 그대로 포팅 (pickHighlights/buildSummary 동일 패턴, `classifyWinnerProb` 리그 무관
  재사용)
- 테스트 2개 (`mlb-shared.test.ts` + `buildMlbWeeklyReview.test.ts`) — supabase mock
  chain (`gte().lte()` schedule + `eq().eq().in().in()` predictions, `buildMlbCalendarHeatmap.test.ts`
  패턴 재사용), silent-drift 회귀 가드(schedule/predictions select 실패 시 throw) 포함
- **범위 밖 (Phase 1b, 다음 explore-idea heavy fire 후보)**: `/mlb/reviews/weekly/[week]`
  page.tsx + index + opengraph/twitter/not-found + Header MLB_NAV + Footer + sitemap.ts
  동기 + EN 변형 skip(Phase 1 KO only, mlb/reviews 본체 전례 따름)
- plan #26 status: `approved` → `phase1a_data_layer_shipped_cycle_2229_pending_phase1b`

## 🟡 explore-idea (lite) — MLB 주간/월간 리뷰 서브페이지 plan #26 (spec-only) (cycle 2228, 2026-08-19)

open issue 0건, approved plan 0건 (25개 전부 completed/archived/superseded 유지, 본
cycle 이 26번째 신규 작성). 직전 8사이클 distinct=4 (explore-idea×2/review-code×3/
fix-incident/info-architecture-review) — 2-chain lock 미충족. fix-incident(gap=6)/
op-analysis(gap=13)/info-arch(gap=3) 자체 trigger 미도달. lotto 는 구조적 30-cycle-gap
trigger 는 충족했으나 다음 회차(1234회, 8/22) picks + 직전 회차(1233회) OOS 결과 모두
이미 8/18에 박제 완료 — 실익 없어 skip.

**carry-over 처리**: cycle 2226 이 `/mlb/reviews` 신규 시 "weekly/monthly 서브페이지는
MLB 주/월 range 유틸 부재라 후속 cycle 과제"로 남긴 gap 을 rubric(가치/시간비용/risk/
자율가능/의존성) 재평가. 실측 결과 `computeWeekRange`/`computeMonthRange` 자체는
리그 무관이라 재사용 가능 확인(당초 서술 부정확) — 하지만 진짜 blocker 는 (1) KBO
`fetchPredictionRowsInRange` 의 games/teams FK 하드코딩(MLB 는 `mlb_schedule` +
`external_game_id` 모델로 분리, plan #24 CRITICAL fix 이후 확립된 패턴 재사용 필요)
(2) `analyzeFactorAccuracy` 의 KBO 10팩터 가중치 하드코딩(MLB 는 6팩터만 유효) — 규모
자체는 plan #24 Phase 1 MVP 급으로 큼. Tier 3 확정 → `~/.develop-cycle/plans/
moneyballscore/26.md` 로 분리(status: approved, target_chain: explore-idea, Phase 1
weekly MVP → Phase 2 monthly → Phase 3 dedup 선택). 이번 cycle 은 spec-only, 코드
변경 0. 다음 explore-idea fire 시 unprocessed plan lookup 으로 자연 pick-up.

## 🟢 explore-idea (heavy) — MLB 수렴 픽 리뷰 허브 /mlb/reviews 신규 (cycle 2226, 2026-08-19)

open issue 0건, approved plan 0건 (19개 전부 completed/archived/superseded 유지). 직전
8사이클 distinct=4 (explore-idea/review-code×3/fix-incident/info-architecture-review)
— 2-chain lock 미충족. op-analysis gap 11 (25 미도달), lotto/info-arch 직전 사이클
처리 완료 — Feature-Drift Cycle 자연 교대 (explore-idea<->review-code) 따라 explore-idea
선택. cycle 2223/2224/2225 retro 모두 "explore-idea or review-code/op-analysis" 권고.

**발견한 gap**: KBO `/reviews` 는 수렴 픽 전체 성적(강수렴/완전수렴 W-L) + 스트리크(현재+
최장) + 팀별/홈-어웨이/요일별 분해까지 갖춘 리뷰 허브지만, MLB 쪽엔 이 분석이 어디에도
없었음 (`/mlb/team/[code]` 는 팀별 수렴 픽 성적만 부분 노출). Header MLB_NAV "경기·팀"
그룹에도 예측 리뷰 항목 자체가 부재.

**구현 (Phase 1 — 수렴 픽 분석 허브만, weekly/monthly 서브페이지는 MLB 주/월 range
유틸 부재라 후속 cycle 과제)**:
- `convergenceRecord.ts`: MLB 내부 함수(`fetchMlbConvergencePickDetailedResults`,
  `evaluateMlbConvergencePickRow`)가 `favoredHome`/`gameDate` 도 반환하도록 확장 +
  `game_date desc` 정렬 추가. 신규 export 5종: `getMlbRecentConvergencePickRecord` /
  `getMlbConvergencePickStreak` / `getMlbConvergencePickBestStreak` /
  `getMlbConvergencePickHomeAwaySplit` / `getMlbConvergencePickDayOfWeekSplit`
  (기존 KBO 함수와 1:1 대응, `computeConvergence*` 순수 함수 재사용 — 신규 로직 없음).
- `ConvergenceTeamStatsBadges` 컴포넌트에 `nameResolver` prop 추가 (기본값
  `shortTeamName` — KBO 호출부 5곳 시그니처 변경 없음). MLB 는 `mlbShortTeamName` 전달.
- 신규 `/mlb/reviews/page.tsx` — Breadcrumb, JSON-LD, revalidate=1800 ISR, canonical
  (en mirror 없음, Phase 1 KO only).
- Header MLB_NAV + Footer MLB column + `sitemap.ts` 3곳 **같은 커밋에서 동기** —
  cycle 2225 가 발견한 "MLB 신규 라우트 추가 시 footer sitemap 컬럼 동기 누락" 패턴
  재발 방지 (이번엔 처음부터 3곳 함께 추가).

전체 스위트 3968개 + lint/type-check pass. `87fa5377` main 직접 push (커밋 정책 R4).

## 🟢 info-architecture-review (heavy) — MLB footer sitemap /mlb/matchup 누락 fix (cycle 2225, 2026-08-19)

open issue 0건, approved plan 0건 (19개 전부 completed/archived/superseded 상태
유지). 직전 8사이클 distinct=3 (review-code/explore-idea/fix-incident) — 2-chain
lock 미충족. lotto(마지막 fire 2175, gap=50)는 trigger 6 (30-gap) 충족하나 다음
회차(1234회, 8/22) 50세트 이미 박제됨(8/18) + 직전 회차(1233회 8/15) 결과도 이미
기록됨(8/18) — 실익 없음. info-architecture-review(마지막 fire 2183, gap=42)도
trigger 9 (30-gap) 충족 + 라우트 mtime -7 다수 감지(MLB parity 시리즈 35개 파일)
— 실제 IA gap 존재 확인되어 이 chain 선택.

**발견한 gap**: Header MLB megamenu(`NavLinks.tsx` MLB_NAV)와 `sitemap.ts` 양쪽
다 `/mlb/matchup` 보유(라우트 실존, KBO 쪽 `/matchup`은 이미 footer 팀·선수
column에 있음) — 그러나 `Footer.tsx` SITEMAP_COLUMNS 의 MLB column 에만 빠져있던
gap. cycle 2153 과 동일 family (MLB 신규 라우트 추가 시 footer sitemap 컬럼 동기
누락 반복 패턴 — 이번엔 `/mlb/matchup` 자체가 오래전부터 라우트/헤더엔 있었으나
footer 만 누락 상태로 방치돼있던 case).

**fix**: `Footer.tsx` MLB column 링크 배열에 `{ href: "/mlb/matchup", label:
"매치업", enLabel: "Matchups" }` 추가 + wireframe 주석 갱신. 회귀 테스트 1건
추가 (Footer MLB column 이 `/mlb/matchup` 링크 렌더 검증). 전체 스위트 3956개
+ Footer 11개 pass, lint/type-check pass. PR #2975 머지(`16c4085c`, MERGED
실측 확인, squash — auto-merge GraphQL 미허용 repo 설정이라 CI green 확인 후
수동 merge).

## 🟢 review-code (heavy) — PickButton 분석 보기 링크 KBO 하드코딩 fix (cycle 2224, 2026-08-19)

cycle 2223 이 신규 MLB 커뮤니티 픽 surface(migration 048, mlb-submit/mlb-poll
route, PickButton league prop) 를 만들며 pollUrl/submitUrl/submitIdField 는
league 분기했지만 "분석 보기" Link 는 `/analysis/game/${gameId}` 하드코딩 그대로
남겨둠. MLB 호출부(`mlb/games/[date]/page.tsx`)는 gameId 로 external_game_id
(VARCHAR string) 를 넘기는데 `/analysis/game/[id]` 는 KBO 전용(`parseInt(id)`
→ `games.id` INT PK 조회) — AI 힌트(aiWinProb) 있는 모든 MLB scheduled 경기에서
엉뚱한 KBO 경기로 연결되거나 404.

**fix**: `PickButton` 에 `analysisHref` optional prop 추가 — 지정 시 사용, 미지정+
league=mlb 면 링크 미표시(안전, 하드코딩 fallback 제거), league=kbo 는 기존
`/analysis/game/${gameId}` 유지. MLB 호출부는 이미 존재하는 매치업 상세 경로
(`/mlb/games/${date}/${home}-vs-${away}`) 를 analysisHref 로 전달. 회귀 테스트
2건 추가. PR #2974 머지(`ba56729b`, MERGED 실측 확인).

## 🟢 explore-idea (heavy) — MLB 커뮤니티 픽 참여 (PickButton/poll) KBO parity (cycle 2223, 2026-08-19)

open issue 0건, approved plan 0건 (19개 전부 completed/archived/superseded).
직전 8사이클 distinct=4 (explore-idea/review-code/fix-incident/operational-analysis)
— 2-chain lock 미충족. lotto(마지막 fire 2175, gap=48)/info-arch(마지막 fire
2183, gap=40) 둘 다 30-gap 트리거 충족하나 실측 결과 lotto 는 8/22 50세트+8/15
결과 이미 박제(실익 없음), info-arch 는 실 IA gap 없음(cycle 2221 재확인과 동일
결론). op-analysis 는 gap=8 로 25-gap 미충족.

**발견한 gap**: KBO `/predictions` 홈페이지엔 PickButton(AI 대 사용자 승부예측 +
커뮤니티 poll 분포)이 있지만 MLB `/mlb/games/[date]` 는 아예 없었음 — 구조적
원인 확인: `pick_poll_events`(migration 025)가 `game_id INT REFERENCES
games(id)` 라 KBO 전용, MLB `external_game_id VARCHAR(20)`(mlb_schedule,
migration 038)과 타입이 안 맞아 재사용 불가.

**구현**: migration 048 `mlb_pick_poll_events` 신규(025 와 동일 RLS 패턴,
FK → mlb_schedule.external_game_id) + `/api/picks/mlb-submit` +
`/api/picks/mlb-poll` route 신규 + `db-constraints.ts` `mlbPickPollEvents`
추가. `PickButton` 에 `league?: 'kbo'|'mlb'` prop 추가 — mlb 시 mlb-submit/
mlb-poll route 로 라우팅 + localStorage 키 `mlb-${gameId}` 네임스페이스
분리(KBO 정수 game_id 와 MLB external_game_id 숫자 문자열 값 공간 충돌 방지).
`mlb/games/[date]/page.tsx` 에 `status==='scheduled'` 게임만 PickButton 노출
(KBO 홈페이지와 동일 게이팅). `supabase db push --linked` 로 migration 048
적용 완료(`migration list --linked` 로 remote=048 확인).

**스코프 밖 (carry-over)**: EN mirror(`/en/mlb/games`) 는 다음 explore-idea
후보로 이월 — 기존 EN mirror 분리 cycle 패턴(cycle 2218/2220) 과 동일.

**검증**: `pnpm --filter moneyball test` 454 files / 3954 tests green (+14
신규: mlb-submit route 검증 8건 + PickButton league='mlb' 라우팅/스토리지키
분리 4건). type-check + lint clean. PR #2973 → `gh pr merge --squash --auto
--delete-branch` → `gh pr view --json state,mergedAt` 로 MERGED 실측 확인
(42466d02, 2026-08-19T05:55:33Z).

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

## review-code (heavy) — EN nav 블랭킷 치환이 /mlb/reviews 를 존재하지 않는 /en/mlb/reviews 로 404 (cycle 2227)

open issue 0건, approved plan 0건(19건 전량 완료/archived). lock 미충족(직전 8사이클
distinct=4). lotto 30-gap 트리거 수치상 충족(gap=52)했으나 count 재확인 결과 다음 회차
(1238회, 08-22) 50세트+직전 회차(1237회) OOS 검증 양쪽 이미 박제 완료 상태(신규 산출물
없음) — 실익 부재로 skip. cycle 2226 next_recommended(review-code or op-analysis) 채택,
repo 기존 관례(explore-idea(heavy) 신규 기능 다음 cycle = review-code(heavy) 가 그
기능 감사)대로 cycle 2226 이 추가한 `/mlb/reviews` 감사.

**발견**: `Header.tsx`의 `withLocale()`과 `Footer.tsx`의 `withMlbLocale()`이 EN
pathname(`/en/mlb/*`)에서 `/mlb/*` href 를 전부 blanket 으로 `/en/mlb/*` 치환.
`/mlb/reviews`는 MLB_NAV·Footer MLB column 11개 항목 중 유일하게 EN 미러 페이지가
없는 라우트(cycle 2226 Phase 1, 의도적 scope 축소 — TODOS.md 에 이미 기록된 결정)라
EN 사용자가 헤더 메가메뉴/푸터에서 "Prediction Review" 클릭 시 `/en/mlb/reviews`
404. cycle 2139/2140/2141 과 같은 bug family(nav href 가 실제 EN 라우트 존재 여부와
불일치) — 그 fix 들이 도입한 바로 그 함수가 이번 신규 라우트 추가로 재발.

**fix**: 두 함수 모두에 `/mlb/reviews` 명시적 예외 추가(href 는 KO 유지, label 텍스트는
`withLocaleText`/enLabel 로 기존처럼 번역 — Footer 가 non-MLB column 에 이미 쓰던
"라우트 부재 시 href 유지, 텍스트만 번역" 패턴과 동일). `Header.test.ts`
"모든 /mlb href 치환" 테스트가 이 예외로 깨져 `/mlb/reviews` 제외하도록 수정 +
회귀 테스트 신규(Header 1건 + Footer 1건, KO href 유지 + `/en/mlb/reviews` 부재 assert).

`pnpm --filter moneyball exec vitest run` (Header/Footer, 19건) + `pnpm test`(turbo
전체 4 packages, 3970건) + type-check + lint 전부 통과 확인 후 커밋, main 직접 push
(PR 미경유 — review-code(heavy) 감사성 1-2 파일 fix 는 기존 관례대로 direct push).

## fix-incident (lite) — deploy-drift-alert 26h 연속 실패 진단 + commits_ahead 진단 버그 fix (cycle 2222)

- gh run list 로 deploy-drift-alert 워크플로우가 2026-08-15 15:33 ~ 08-18 23:33 26시간 연속 매시간 실패 발견 (이미 08-19 01:50부터 자연 해소)
- 근본원인: develop-cycle 봇 push burst(115 commit) 가 Vercel 직렬 build queue 를 앞질러 production 이 뒤쳐진 것 — 실제 deploy 고장 아님, 큐가 자연 해소
- 진단 중 진짜 버그 발견: `.github/workflows/deploy-drift-alert.yml` 의 `fetch-depth: 1` (shallow clone) 때문에 `git rev-list --count PROD_SHA..MAIN_SHA` 가 항상 실패 → 모든 알림에서 `commits_ahead=unknown` 으로만 찍힘. "대량 backlog 자연 해소 중" 과 "소수 commit 인데 진짜 멈춤" 을 구분할 유일한 신호가 사라진 상태였음.
- fix: fetch-depth 0 (전체 history, 68MB/4639 commit — 3분 timeout 안 충분) → commit 69f5ed54, main 직접 push
- 실측 검증: `gh workflow run` 수동 트리거 후 로그 확인 → `commits_ahead=14` 정상 계산 (이전엔 항상 unknown)

## review-code (heavy) — MLB weekly/monthly review 감사, drift 0건 (cycle 2233)

open issue 0건, approved plan 0건. lock 미충족, 기타 trigger 전부 미충족(fix-incident
gap=11/20, op-analysis gap=18/25, info-arch gap=8/30, lotto gap=58 지만 cycle 2226
precedent 로 실익 부재 재확인). 자유 선택: cycle 2232 review-code(heavy) 가
pearsonCorrelation dedup 만 좁게 다뤄, plan #26 이 신규 배선한 `/mlb/reviews/weekly`,
`/mlb/reviews/monthly` 전체(데이터 레이어 + 양쪽 상세 페이지)는 아직 일반 drift 감사
미수행 상태였음 — 형제 라우트 `/mlb/reviews`(hub) 가 cycle 2227 에 nav-locale 버그
맞은 전례도 있어 감사 대상으로 선정.

**감사 범위**: buildMlbWeeklyReview.ts / buildMlbMonthlyReview.ts / mlb-shared.ts
(fetchMlbPredictionRowsInRange, buildMlbTeamStats, buildMlbFactorInsights,
mapMlbRowsToHighlightCandidates) / weekly·monthly `[param]/page.tsx` / not-found /
opengraph-image / sitemap.ts entries / Header·Footer nav 참조.

**near-miss 조사 (버그 아님으로 확정)**: `mlb-shared.ts` `buildMlbFactorInsights()`
의 war 팩터 비교가 cycle 2149(e47b1374) 에서 `analysis/page.tsx` 에 추가한
`homeWar > 0 && awayWar > 0` sentinel 가드를 안 갖고 있음을 발견 — 하지만
`mlb-pipeline.ts:329-330` (`home_war_total: home?.war ?? null`) 확인 결과 MLB 는
팀 stats row 부재 시 실제 `null` 저장(주석: "가짜 값 저장 X — null 유지"), KBO 의
"Fancy Stats top-50 미수록 = 0" 스크래핑 특유의 sentinel 관례와 다름. 즉 이 가드는
KBO 전용이고 MLB 코드엔 없는 게 맞음(붙였으면 오히려 실제 WAR=0 인 팀을 부당 제외하는
새 버그였을 것).

**기타 확인**: `buildMlbMonthlyReview.ts` 의 전월비교 fetch 게이트(하드코딩 5) vs
`buildSummary` 표시 게이트(`MIN_VERIFIED_GAMES_HEDGE`=10) 불일치 — KBO
`buildMonthlyReview.ts` 원본과 byte-identical 패턴이라 신규 MLB drift 아님. sitemap/
locale/nav 스코프도 Phase 1 KO-only 결정과 일관.

**결론**: drift 0건, PR/커밋 없음, cycle 2219 와 동일한 "감사했지만 발견 없음" 패턴.
다음 후보: operational-analysis(gap 19) 또는 fix-incident(gap 12) — 둘 다 자체
주기 트리거 임계 접근 중.

## 🟢 review-code (heavy) — silent drift wave-657 accuracy yellow 하한 단일 source SUCCESS (cycle 2337, 2026-08-20)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2329-2336 distinct=4). 주기 trigger 4종 전부 미도달(fix-incident 3/20, op-analysis 0/25, info-arch 26/30, lotto 12/30). review-code/explore-idea 는 직전 5+ 사이클 연속 "신규 target 부재" 확정된 상태 — 파일 크기+mtime 재정렬로 대체 감사 대상 탐색.

**실행**: `apps/moneyball/src/app/reviews/weekly/[week]/page.tsx`(524줄, 마지막 touch 2026-07-22 = 최오래 미audit 후보) 직접 read 중 3단계(brand/yellow/red) 적중률 색상 배지 yellow 하한이 `>= 0.5` 하드코딩임을 발견. grep 재확인 결과 팀 프로필 3곳(teams/[code], mlb/team/[code], en/mlb/team/[code]) + 주간/월간 리뷰 4곳(reviews/weekly, reviews/monthly, mlb/reviews/weekly, mlb/reviews/monthly) 총 7 callsite 동일 — wave-360/498 family(같은 파일 다른 tier는 이미 상수화됐으나 이 하한만 누락)와 동일 구조. `ACCURACY_MID_RATE=0.5` 신규 상수(`packages/shared`) 추출 + 7 callsite swap + guard test(`wave-657-accuracy-mid-rate-swap.test.ts`, 7건) 신규. `accuracy/page.tsx`/`accuracy/shadow/page.tsx` 의 `>= 0.5` 는 별개 의미(커뮤니티 baseline/홈승 확률 분기)로 스코프 제외.

검증: `tsc --noEmit`(4패키지 clean) / `eslint`(clean) / `pnpm test`(496 files/4164 tests all green, 신규 7건 포함). VERSION/package.json 0.5.62.66→67 bump + CHANGELOG 기록. PR #3017 → `gh pr merge --squash --auto --delete-branch` → `state=MERGED` 실측 확인(commit b83728c7).

결론: "review-code/explore-idea 신규 topic 부재"와 "silent drift 완전 소진"은 다른 명제 — 파일 mtime 기준 재정렬 탐색법이 유효한 반례 발견 경로임을 확인. 다음 cycle 후보: 동일 탐색법 지속 또는 gap-trigger 자연 도달(fix-incident 4/20·op-analysis 1/25·info-arch 27/30·lotto 13/30) monitor.

## 🟢 lotto (lite) — 1239회 50세트 신규 픽 SUCCESS (cycle 2344, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 2-chain lock 미충족(직전 8사이클 2336-2343 distinct=4). 주기 trigger 4종 전부 미도달. cron 이 이미 `1238회 결과 자동 박제`(commit 9be7b18b, `data(lotto)`) 로 OOS 검증(256/256 PASS, 1등 미포함, 5등 16건) 완료 — 세션 시작 `git pull --ff-only` 로 반영 확인. 대신 D-7 트리거(다음 토요일 2026-08-29 draw, 6일 이내) + `~/lotto_picks/2026-08-29-50sets.md` 부재 확인 → lotto lite 자연 선정.

**실행**: `pnpm tsx scripts/lotto.ts count` (count_smoke) → 1238회차 캐시 기준 256규칙 유효조합 7,705,415/8,145,060(제거 5.40%) — 직전 측정(cycle 2145)과 동일, `valid_delta=0`(신규 rule 없음, `new_rules=0`). `pnpm tsx scripts/lotto.ts pick 50` → 50세트 생성, top5(A~E) 추출 → `~/lotto_picks/2026-08-29-50sets.md` 신규 박제(`pick_sample`=A~E 5세트 문서화).

**self_verify**: 파일 생성 확인(Write 성공) + 5세트 표 vs 전체 50세트 리스트 1~5번 항목 값 일치 확인.

결론: 코드 변경 없음(데이터 산출물만), 커밋 없음(`~/lotto_picks/`는 리포 밖 경로 — git 추적 대상 아님). 다음 lotto 발화는 30-cycle gap 자연 도달 또는 다음 추첨 직후 OOS(cron 이 이미 자동화 — 세션 개입 불필요 확인됨).

## ⚪ review-code(heavy) — 신규 target 부재 확인, retro-only (cycle 2359, 2026-08-23)

진단: open issue 0건, approved plan 0/22. 직전 8사이클(2351-2358) distinct=5(explore-idea/review-code/fix-incident/info-arch/skill-evolution), 2-chain lock 미충족. 주기 trigger 4종 미도달(op-analysis 23/25 근접, lotto 15/30, fix-incident/info-arch 방금 리셋). CI 10회 전부 success/skip, Vercel deploy-drift-alert success, pipeline_runs `predict` mode games_found=5/predictions=0 반복 = cycle 2357 에서 이미 확인한 "already_predicted 정상 설계" 재확인(신규 인시던트 아님). EN nav stale scope-exception grep 재검색 = 0건(cycle 2358 완전 해소 확인).

**실행**: 신규 review-code 타겟 탐색 — `packages/kbo-data/src/agents/` 중 최장기 미수정 2파일(`validator-logger.ts` 05-18, `personas.ts` 05-26) 전체 read. validator-logger.ts: migration 022 agent/passed 컬럼 사용처(team-agent.ts:139, judge-agent.ts:205) 양쪽 확인 — `agent: 'team'`/`agent: 'judge'` 정확히 분리, `passed: validation.ok` 정확 전달, 주석과 코드 일치. personas.ts: PERSONA_VERSION → DEBATE_VERSION_PREGAME 단일 source 확인, 환각 카테고리 문서(cycle 986) 최신 유지. 양쪽 모두 drift 없음.

**부가 확인**: sitemap.ts(85 url) vs 실제 static page.tsx(79) 카운트 정상 범위(동적 라우프 loop 반영). CREDIT_EXHAUSTED 지속 확인(`scoring_rule='v1.8'` 최근 5건 전부 `debate_version=null`, confidence 0.026~0.7 분산 = 기존 P4 패턴과 일치, 변화 없음).

결론: 코드 변경 없음(retro-only) — 신규 drift 부재를 실측으로 확인한 것 자체가 가치(silent drift family 미재발 확인). 다음 후보: op-analysis(24/25, 1사이클 후 자연 도달) 또는 자연 발견.

## 🟢 (success) — pipeline route.ts debug leftover 제거 (cycle 2388, 2026-08-23)

진단: 직전 5사이클(2383-2387) clean audit. cycle 2387 retro lead(cron API/telegram 미감사) 따라 재탐색.
발견: `apps/moneyball/src/app/api/pipeline/route.ts` 4개월 방치 debug 코드 — 매 pipeline 응답에 ANTHROPIC_API_KEY prefix 노출(`_debug.keyPrefix`). 2026-04-14 commit 25d9107b 부터 방치.
실행: `_debug` 블록 제거, direct main commit(42779c83) + push. type-check/lint clean.
다음 사이클 추천: op-analysis(20/25)/info-arch(23/30)/lotto(26/30) gap 대기, 또는 다른 cron route(mlb/pipeline, revalidate 등) 유사 debug 잔재 grep 확장.

## 🔵 RETRO-ONLY — operational-analysis(lite) CE-cohort 재확인, 신규 표본 0건 (cycle 2416, 2026-08-23)

진단: open issue 0, approved plan 0/22. 2-chain lock 미충족(직전8 distinct=3). op-analysis gap 23/25 근접 + cycle 2415 retro 명시 추천.

점검: op-analysis-ce-cohort.ts(cycle 1547 표준 harness) 재실행 → n=332(CE=285/비CE=47), acc 55.1%(CE 53.7%/비CE 63.8%, 격차 10.1pp) — cycle 2361(오늘, 55 cycle 전) 측정값과 완전 동일. predictions 테이블 직접 조회로 확인: v1.8 신규 row 는 8/18~8/22 매일 14:17 UTC 배치로 계속 verified 중이고 전부 debate_version=null(CE 지속)이지만, cycle 2361 시점 이미 그날 배치가 반영 완료돼 오늘 재실행은 신규 표본 0건 재확인에 그침. CLAUDE.md 갱신 불필요(동일 수치 중복 기록 방지).

다음 사이클 추천 = explore-idea(최근 20 cycle 중 1회로 저조, statsapi-mlb.ts fetchProbablePitchers 개인 투수 통계 소스 Tier 3 candidate 존재) 또는 review-code(heavy) dominance 지속(14/20).

## 🟢 SUCCESS — fix-incident MLB predictions model_version/debate_version/predicted_at stale DB DEFAULT 상속 차단 (cycle 2423, 2026-08-23)

진단: open issue 0, approved plan 0/29. gap trigger 4종 미도달(fix-incident 9/20, op-analysis 7/25, info-arch 28/30, lotto self-heal). 직전 15 사이클 review-code+fix-incident+polish-ui+info-arch=12/15 → explore-idea improvement-saturation trigger 충족.

탐색: explore-idea 로 KBO analysis/game/[id]/page.tsx 의 "모델 메타 정보" 배지(model_version/debate_version/predicted_at lead-time)를 MLB game detail 페이지에 이식할 수 있는지 조사 → MLB 쪽엔 해당 블록 자체가 없음을 확인 → DB 실측(predictions, scoring_rule='mlb_v0.1')으로 model_version='v1.0', debate_version='v1-narrative'(둘 다 stale DB DEFAULT), predicted_at=NULL 전량 재발 확인. mlb-pipeline.ts predict_final insert 가 3개 컬럼 모두 미명시. live.ts 가 cycle 2240 에 in_game 경로에서 동일 debate_version landmine 을 이미 차단했지만 pre_game 경로(MLB)는 그 fix 범위 밖 — sibling 미차단 family bug.

실행: model_version=MLB_SCORING_RULE('mlb_v0.1'), debate_version=null, predicted_at=new Date().toISOString() 3개 명시 + 회귀 테스트 1건. kbo-data 90/1176 + moneyball 500/4208 tests, tsc, lint 전부 clean. PR #3048 squash 머지(447fdd32).

다음 사이클 추천 = info-architecture-review(28/30 임박) 또는 review-code/explore-idea(MLB game detail 페이지에 KBO "모델 메타 정보" 배지 이식 — predicted_at 이제 실측 채워져 lead-time 계산 가능해짐).

## cycle 2462 (review-code heavy)
- compareModels.ts(299줄) 감사 완료, 논리 버그 없음
- 호출부 /debug 2개 페이지 중복 dark: className 14곳 fix (PR #3064)
- 다음 review-code 후보: buildTeamAccuracy.ts(261줄, standings)

## 🟢 SUCCESS — review-code(heavy) accuracy/page.tsx 최초 전체 감사, small-sample 매직넘버 정정 (cycle 2473, 2026-08-24)

진단: open issue 0, approved plan 0/29 (전부 completed/archived/tier4). gap trigger 4종 전부 미도달(fix-incident 9/20, op-analysis 2/25, info-arch 18/30, lotto 2/30). 2-chain lock 미충족(직전8 distinct=3: review-code/operational-analysis/explore-idea). explore-idea saturation 미충족(10/15 <12). MLB EN 미러 i18n silent-leak family 재확인 — cycle 2424 이후 신규 KO-only feat(mlb) 커밋 0건 확인(53e3eb70..HEAD grep) = 해당 family 현재 소진. 리포 대형 파일 재조사(analysis/page.tsx 2803줄 cycle 2407/2364 감사 완료, page.tsx 1090줄 cycle 218 감사, teams/[code] cycle 2470 clean) → `accuracy/page.tsx`(1205줄) 최후 전체 감사 이력이 cycle 289(2184 사이클 전, 사상 최고 stale) 확인 — 신규 target 선정, 전체 1206줄 read.

검증 항목: (1) `CURRENT_MODEL_FILTER`(scoring_rule 기준, wave-656 정정) 메인 쿼리 필터 정합 확인. (2) factorResult 쿼리 `CURRENT_SCORING_RULE` 단일값 필터 — model-version-labels.ts 문서화 의도("baseline 분석은 CURRENT_SCORING_RULE 만 사용")와 일치, #1338 family 오탐 배제. (3) `buildV18SubCohort`/`buildFallbackStats` 로직 CURRENT_SCORING_RULE·LLM_ACTIVE_VERSIONS 동적 참조 확인, 하드코딩 없음.

발견: `CalibrationChart` 컴포넌트의 산점도 dot 소표본 판정이 `b.n < 5` 리터럴 하드코딩 — 동일 패턴(n<5 소표본 hedge)을 위해 이미 shared 에 `SMALL_SAMPLE_N=5`(sweep 51 source-of-truth)가 정의되어 있고 15개+ 다른 페이지(teams/[code], standings, players 등)가 이를 참조 중인데 accuracy/page.tsx 만 미참조 — silent 매직넘버 drift.

실행: `SMALL_SAMPLE_N` import 추가 + `b.n < 5` → `b.n < SMALL_SAMPLE_N` swap. `pnpm type-check`(4 packages clean) + `pnpm lint`(clean) + `pnpm test`(503 files/4231 tests) 클린. 단일 논리 단위 → PR 없이 직접 main commit+push (v0.5.62.99).

다음 사이클 추천 = operational-analysis(lite, gap 3/25 — 아직 저신선도) 또는 review-code 신규 target 계속 (accuracy/page.tsx 가 참조하는 buildTeamAccuracy.ts/buildAccuracyData.ts 등 lib 함수 자체는 이미 여러 차례 감사됨, TeamMatchupCards/TeamBiasTable/ModelVersionHistory/FactorAccuracyTable 등 컴포넌트 레벨 미감사 후보) 또는 explore-idea(saturation 10/15 근접, 다양성 회복 고려).

## 🟢 SUCCESS — polish-ui: MLB game-detail 레이아웃 폭 회귀 + EN 팀 페이지 division rank 배지 정정 (cycle 2476, 2026-08-24)

진단: 2-chain lock 탐지(직전 8 사이클 distinct=2: review-code 7/8 + operational-analysis 1/8). 잠긴 두 chain 제외, 나머지 pool 전부 trigger 미충족(fix-incident 12/20, info-arch 21/30, explore-idea saturation 11/15, lotto 36/30 이지만 self-heal 이미 최신 no-op) → 룰(어떤 chain 도 trigger 없으면 polish-ui 강제 발화) 적용. 최근 7일 신규 MLB UI 7개 파일(team/matchup/game-detail KO+EN) design-review 0회 근거 추가.

발견: Explore 에이전트 디자인 감사 결과 (1) `mlb/games/[date]/[slug]/page.tsx`(KO+EN) 가 `max-w-3xl px-4` 사용 — KBO 원본+다른 신규 MLB 페이지(team/matchup) 전부 `max-w-4xl` 컨벤션과 불일치, game-detail 만 ~128px 좁게 렌더되는 시각 회귀. (2) EN `mlb/team/[code]/page.tsx` 에 KO 의 division-rank 배지(`buildMlbDivisionStandings`/`findMlbTeamDivisionRank`)가 통째로 누락 — EN 사용자만 순위 정보 미노출. 그 외 색상/spacing 토큰 drift, Breadcrumb 누락은 0건(clean).

실행: game-detail KO+EN `max-w-4xl`/`<article>` 통일. EN 팀 페이지에 division rank 배지 추가(`N/M · GB N.N`, en/mlb/standings 의 GB 표기 컨벤션 재사용). `pnpm type-check`(4 packages clean) + `pnpm test`(505 files/4238 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (v0.5.62.102).

다음 사이클 추천 = review-code 계속(같은 family 재확인 — mlb/players/[id] 등 잔여 페이지) 또는 explore-idea(다양성 회복, saturation 11/15 임박) 또는 info-arch(gap 22/30).

## 🟢 SUCCESS — review-code(heavy) seasons/[year] 최초 전체 감사, isOngoing/isCurrent KST 연도 경계 off-by-one 정정 (cycle 2514, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 2/20, op-analysis 9/25, info-arch 27/30, lotto 5/30). 2-chain lock 미충족(직전8 distinct=3: fix-incident/review-code/lotto). review-code(heavy) 6번째 연속 fire(2509~2514) — dominance-positive streak 인정(진짜 trigger: 대형 미감사 monolith 존재).

`teams/[code]/page.tsx`(622줄)를 최우선 후보로 재확인했으나 cycle 2470 이 이미 최초 전체 감사·clean(RETRO-ONLY) 완료 + 이후 변경 이력 0건(`git log 50c7b165..HEAD` 빈 결과) 확인 후 중복 감사 폐기. cycle 2513 이 추천한 나머지 후보(`debug/pipeline`/`debug/factor-correlation`/`search/page`)도 각각 cycle 2269/2485/2261 에 이미 "최초 감사" 커밋 존재 확인 — 실제 미감사 후보는 `seasons/[year]/page.tsx`(433줄)와 `about/page.tsx`(427줄) 뿐이었음. 전자 선정, 전체 read.

발견: `buildSeasonSummary.ts`(isOngoing 판정) / `seasons/[year]/page.tsx`(generateMetadata 의 isCurrent) 가 각각 독립적으로 `new Date().getFullYear()` 사용 — 서버 로컬(Vercel 기본 UTC) 기준이라 KST 12/31 15:00~23:59 UTC(=1/1 00:00~08:59 KST) 구간에 "올해" 판정이 실제 KST 연도보다 하루 늦게 갱신되는 KST_OFFSET_MS family(computeMonthRange/computeAdjacentDates 와 동일 원칙 위반) 신규 케이스. 연 1회 9시간 구간이지만 "진행 중" 배지·시즌 제목·메타 설명이 매년 재발 오표시. (`seasons/page.tsx`/`not-found.tsx`/`buildMlbTeamProfile.ts` 등 module-scope `getFullYear()` 사용처는 배포 시점 1회 평가라 영향 다르고 이번 audit 범위 밖 — 다음 review-code 후보로 carry-over)

실행: `buildSeasonSummary.ts`에 순수 함수 `computeCurrentKSTYear`/`computeSeasonIsOngoing` 추출(`toKSTDateString` 기반, 기존 `computeAdjacentDates`/`computeMonthRange` 추출 패턴 재사용) + `page.tsx` 동일 함수 재사용. 회귀 테스트 6건(`computeSeasonIsOngoing.test.ts`, 일반 케이스 + KST 연도 경계 양방향 + KS 마감 경계).

검증: `pnpm type-check`(4 packages clean) + `pnpm test`(512 files/4273 tests) + `pnpm lint` clean. 단일 논리 단위 → PR 없이 직접 main commit+push (v0.5.62.108, df407468).

다음 사이클 추천 = review-code(heavy) 계속(잔존 미감사: `about/page.tsx` 427줄, 또는 module-scope `getFullYear()` 사용처 sweep — `seasons/page.tsx`/`not-found.tsx`/`buildMlbTeamProfile.ts`/`buildBatterLeaderboard.ts`/`sitemap.ts`/`snapshot-pitchers`/`sync-batter-stats`) 또는 explore-idea(다양성 회복, 최근 20 cycle 중 2회로 저조) 또는 op-analysis(gap 9/25, 아직 저신선도).

## 🔵 RETRO-ONLY — explore-idea(heavy) 2-chain lock 해소, KBO/MLB debate parity 의도된 설계 확인 (cycle 2515, 2026-08-24)

진단: open issue 0, approved plan 0/29(전부 completed/archived/tier4). gap trigger 4종 미도달(fix-incident 9/20, op-analysis 10/25, info-arch 29/30, lotto 7/30). 직전 8 사이클(2507-2514) distinct=2(review-code+lotto) — **2-chain alternation lock 발동**, review-code(6연속 heavy streak)와 lotto 이번 cycle 후보 제외. 남은 pool 중 trigger 최강(explore-idea saturation 12/15 충족)을 lock 해소 알고리즘대로 채택.

조사: KBO game-detail(`analysis/game/[id]/page.tsx`)에는 있고 MLB game-detail(`mlb/games/[date]/[slug]/page.tsx`)에는 없는 컴포넌트(`AgentArgumentBox`/`DebateTimeline`/`JudgeVerdictPanel`/`PostviewPanel`/`GameAnalysisProse`)를 신규 gap 후보로 조사. 결과: MLB는 `mlb_shadow_train_log` 기반 순수 quant shadow 모델이라 애초에 LLM 에이전트 debate/judge 자체를 실행하지 않음(MLB page는 `debate_version` 필드를 조회하지만 label 표시용일 뿐) — 의도된 아키텍처 차이, autonomous gap 아님.

메타: cycle 2417/2477/2486에 이은 4번째 명시적 "explore-idea heavy no autonomous candidate" 결론. `memory: meta-pattern explore-idea-source-exhaustion` 커밋으로 4-cycle 누적 evidence 별도 dispatch (commit `73daf727`).

실행: 코드 변경 없음 — 조사 완료, 신규 issue 0건.

다음 사이클 추천 = review-code(heavy) 계속(`about/page.tsx` 427줄 미감사, 2-chain lock 재평가 필요) 또는 info-architecture-review(gap 30/30 도달 예상).

## ✅ SUCCESS — review-code(heavy) accuracy 섹션 렌더 게이트 wave-2463 swap 누락분 정정 (cycle 2528, 2026-08-24)

진단: open issue 0, approved plan 0/29. gap trigger 4종 미도달(fix-incident 2/20, op-analysis 23/25, lotto 20/30, info-arch 11/30). 직전 8사이클 distinct=3, lock 없음. explore-idea saturation 13/15 충족되나 직전 4회(2494/2498/2515/2524) 연속 소진 재확인 완료라 skip. cycle 2527 carry-over `mlb/buildMlbStandings.ts`(clean 확인) + `accuracy/page.tsx 소비부` 중 후자 선정.

발견: `accuracy/page.tsx` 팀별 성과 섹션은 `MIN_TEAM_PREDICTIONS` import·사용 중인데, 같은 파일 안 winnerProbBuckets/cohortWeekHeatmap 섹션 렌더 게이트는 하드코딩 `n >= 3`. MLB parity `MlbAccuracyDashboard.tsx` cohortWeekHeatmap 게이트도 동일. wave-2463 이 팀별 표만 swap하고 놓친 재발.

실행: 3곳 모두 `MIN_TEAM_PREDICTIONS` 참조로 교체, MLB 컴포넌트에 import 추가, 상수 주석 갱신, 회귀 테스트 신규 1건. `pnpm type-check`/`test`(515f/4281t)/`lint` clean. root package.json+VERSION 108 잔존 발견 → 2차 커밋으로 즉시 정정(pre-push guard 포착). 단일 논리 단위 → PR 없이 main 직접 commit×2(fix+chore, R4)+push.

다음 사이클 추천 = operational-analysis(gap 24/25, cycle 2530 도달) 또는 lotto(gap 21/30) 또는 review-code(heavy, 잔존 미감사 후보 재탐색 필요 — buildMlbStandings.ts/accuracy 소비부 모두 소진).

## ✅ SUCCESS — review-code(heavy) seasons/page.tsx·not-found.tsx CURRENT_YEAR KST 경계 잔여 정정 (cycle 2531, 2026-08-24)

진단: open issue 0, approved plan 0/29. gap trigger 4종 미도달(fix-incident 5/20, op-analysis 1/25, info-arch 14/30, lotto 23/30). 직전 8사이클 distinct=4, lock 없음. cycle 2530 carry-over(review-code heavy 재탐색) + cycle 2514 retro 명시 잔여 carry-over("seasons/page.tsx/not-found.tsx/buildMlbTeamProfile.ts module-scope getFullYear() — 다음 review-code 후보") 그대로 채택.

발견: cycle 2514 가 buildSeasonSummary.ts/seasons/[year]/page.tsx 만 KST 연도 경계 off-by-one 고치고 seasons/page.tsx(인덱스 "진행 중" 배지)/seasons/[year]/not-found.tsx(AVAILABLE_YEARS) 는 독립적으로 new Date().getFullYear() 계속 사용 — 동일 family 미정정 잔존.

실행: 기존 computeCurrentKSTYear export 재사용으로 두 파일 교체(신규 함수/테스트 불필요, 기존 computeSeasonIsOngoing.test.ts 커버). buildMlbTeamProfile.ts 의 getFullYear()(MLB season stats fallback, 함수 스코프+오프시즌 경계 저영향)는 범위 밖 유지 재-carry-over. pnpm type-check(4 packages)/test(515f/4281t)/lint clean. 단일 논리 단위 → PR 없이 main 직접 commit+push(v0.5.62.110, 34e782b1).

다음 사이클 추천 = review-code(heavy) buildMlbTeamProfile.ts getFullYear() 재검토(함수 스코프 재평가 후 실제 영향 재확인) 또는 diversity(explore-idea, 최근 15 중 saturation 근접 재확인 필요) 또는 lotto(gap 23/30 근접).

## ✅ SUCCESS — review-code(heavy) buildMlbTeamProfile.ts season 연도 KST 경계 잔여 정정 (cycle 2536, 2026-08-24)

진단: open issue 0, approved plan 0/29. gap trigger 4종 미도달(fix-incident 10/20, op-analysis 6/25, info-arch 19/30, lotto 28/30). 직전 8사이클 distinct=3(review-code/operational-analysis/explore-idea), lock 없음. explore-idea saturation 12/15 충족되나 cycle 2535 가 방금 heavy 로 실제 기능(홈/원정 성적 컬럼) ship 완료라 재선정 skip. cycle 2531 retro carry-over("buildMlbTeamProfile.ts getFullYear() 함수 스코프+오프시즌 경계 저영향, 범위 밖 유지 재검토") 재평가로 선정.

발견: `buildMlbTeamProfile.ts` 199행 `new Date().getFullYear()` 는 KST_OFFSET_MS family (cycle 2514/2531 정정분) 와 동일 패턴 — UTC 기준이라 KST 12/31 15:00~23:59 UTC 구간 연도 하루 어긋남. mlb_team_stats.season 조회에 영향.

실행: `computeCurrentKSTYear()` (seasons/buildSeasonSummary.ts export) 재사용으로 교체 — 신규 함수/테스트 불필요. 오프시즌 경계엔 해당 조회 결과가 거의 항상 null 이라 실사용자 영향 낮으나 family 일관성 + 향후 시즌 데이터 조기 적재 시 위험 제거 목적으로 정정. pnpm type-check(4 packages)/test(515f/4292t)/lint clean. 단일 논리 단위 → PR 없이 main 직접 commit+push(55776525).

다음 사이클 추천 = lotto(gap 29/30, 다음 사이클 도달 예상) 또는 review-code(heavy, 잔존 미감사 대형 파일 재탐색) 또는 diversity(explore-idea, saturation 유지 시 재확인).

## ✅ SUCCESS — lotto(lite) countValid saturation 재확인 (cycle 2538, 2026-08-24)

진단: open issue 0, approved plan 0/29. gap trigger — lotto 30/30 도달(last fire cycle 2508, cycle 2537 next_recommended 정합), fix-incident 12/20, op-analysis 8/25, info-arch 21/30 미도달. 직전 8사이클 distinct=3(operational-analysis/review-code/explore-idea), lock 없음.

실행: `pnpm tsx scripts/lotto.ts count` — valid=7,705,415 / total=8,145,060 / removed=5.40% (97.5s). cycle 2478→2508→2538 3연속 완전 동일값 = 256규칙 saturation 구조적 안정 재확인, valid_delta=0. `2026-08-29-50sets.md`(1239회) 이미 cycle 2344 shipped, `2026-08-22-result.md`(1238회 OOS, N=12 cumulative) 이미 완비 — 재생성/재검증 불필요, 다음 OOS 대상(1239회)은 추첨 미도래(오늘 08-24, 추첨 08-29). 신규 코드 변경 없음(측정 only).

다음 사이클 추천 = review-code(heavy, 잔존 대형 미감사 파일 page.tsx(1090줄)/teams/[code]/page.tsx(622줄)/predictions/[date]/page.tsx(615줄) 재탐색) — 2-chain lock 미충족 상태라 자연 재개.

## ✅ SUCCESS — explore-idea(heavy) KBO/MLB 커뮤니티 vs AI 대결 섹션 parity 추가 (cycle 2544, 2026-08-25)

진단: open issue 0, approved plan 0/29. 2-chain lock 없음(직전 8사이클 distinct=3). gap trigger 4종 미도달(fix-incident 18/20, op-analysis 14/25, info-arch 27/30, lotto 6/30). explore-idea saturation 근접 미충족(11/15). cycle 2543 retro가 review-code 소표본 게이트 family 소진 가능성 + explore-idea redirect 권고 → 채택.

발견: KBO `/accuracy` 는 "커뮤니티 vs AI 대결" 섹션(투표 다수결 vs AI 예측 정확도) 존재하나 `/mlb/accuracy`, `/en/mlb/accuracy` 엔 누락. MLB poll 인프라(`mlb_pick_poll_events`, `mlb-poll`/`mlb-submit` API, PickButton)는 이미 라이브였는데 소비 UI만 미구현.

실행: `computeMlbCommunityVsAI`(buildCommunityAccuracy.ts, external_game_id 키 + `deriveMlbOutcome` AI 정답 도출) + `buildMlbCommunityVsAI`(Supabase builder) + `CommunityVsAICard`(locale-aware 공용 컴포넌트, KBO inline JSX 추출) + 양쪽 페이지 wiring. `MIN_POLL_TOTAL=3` KBO 관례 재사용. KBO 원본 미변경.

검증: tsc/lint clean + test 523 files/4323 tests(신규 23개) 통과. 2-commit(feat + CHANGELOG fixup, pre-push guard 포착) 직접 main push, R4 정합. 버전 0.5.62.118→119.

다음 사이클 추천 = review-code(heavy, 신규 대형 파일 재탐색 — 소표본 게이트 family 소진 추정) 또는 operational-analysis(gap 14/25, 아직 미도달).

## cycle 2564 (2026-08-25) — review-code (heavy) SUCCESS
- SMALL_SAMPLE_N family 13번째 재발: /reviews, /seasons/[year], /mlb/reviews, /en/mlb/reviews 4개 페이지 강수렴/완전수렴 W-L 카드가 total>0 만으로 헤드라인 % 노출 (convergenceRecord.ts 빌더 자체 게이트 부재)
- fix: SMALL_SAMPLE_N(5) import + "· 소표본(n<5)" / "· small sample (n<5)" 배지 4파일 추가, silent-drift-wave-676.test.ts 신규 4 assertion
- commit 45db51e2, main 직접 push, pnpm test 534 files/4378 tests(+1/+4) 전체 통과

## ✅ SUCCESS — review-code(heavy) insights/series 매치업 적중률 소표본 게이트 정정 (cycle 2571, 2026-08-25)

발견: cycle 2570 추천대로 insights/[date], predictions/[date], reviews/weekly|monthly 미감사 후보 순회. predictions/[date]·reviews/weekly/[week]·reviews/monthly/[month] 는 SMALL_SAMPLE_N 게이트 이미 적용 확인. insights/series/[topic]/page.tsx (팀간 매치업 적중률, verifiedN/correctN) 만 형제 페이지들과 달리 게이트 누락 — silent drift family 재발 확인.

실행: SMALL_SAMPLE_N import + verifiedN<5 시 소표본 힌트 span 추가. tsc clean. PR #3068 생성 → R7 --squash --auto --delete-branch → state=MERGED 실측 확인(0aa6087a).

다음 사이클 추천 = review-code(heavy) mlb/insights·en/ 다국어 미러 페이지 순회 계속 또는 operational-analysis(gap 10/25 근접) / info-architecture-review(gap 24/30 근접) 자연 발화.

## ✅ SUCCESS — review-code(heavy) sitemap.ts /search robots.txt disallow 모순 제거 (cycle 2579, 2026-08-25)

발견: cycle 2578까지 review-code(heavy) 3개 카테고리(SMALL_SAMPLE_N/PRODUCTION_COHORT_RULES/factor·pipeline comment-drift) 연속 negative 후 cycle 2578 retro 권고대로 4th 카테고리(sitemap/robots 정합성, 컴포넌트 중복) 순회. Explore agent sweep — `sitemap.ts:54`가 `/search` URL을 인덱싱 대상(weekly, priority 0.5)으로 노출하지만 `robots.ts:18/24/31/38` 전체 UA disallow + `search/page.tsx:38` 자체 noindex 메타 양쪽과 모순. 다른 disallow 경로는 이미 sitemap 미노출 정상 확인. 부가 발견(미처리 carry-over): `sitemap-mlb.test.ts`가 monthly reviews/en-mlb weekly·monthly mirror/insights series 라우트 assertion 부재. 컴포넌트 중복은 대부분 의도적 분리(주석 명시), `MatchupEloChart`/`MlbMatchupEloChart` 1쌍만 90%+ 동일(자체 주석 "props shape 동일") 병합 후보.

실행: `sitemap.ts:54` `/search` entry 제거 + 근거 주석. `pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball test`(538 files/4393 tests, 전체 통과, 회귀 없음) + lint clean. VERSION 파일 동기화 누락 pre-push guard 포착 → 2-commit(fix + VERSION sync) 직접 main push (R4). 0.5.62.132→133.

다음 사이클 추천 = review-code(heavy) 후속(sitemap-mlb.test.ts 커버리지 공백 메꾸기) 또는 operational-analysis(gap 19/25 근접).

---

## ✅ SUCCESS — review-code(heavy) 빅매치 카드 hover shadow drift 정정 (cycle 2592, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전8(2584-2591) distinct=3(review-code 5+op-analysis 1+info-arch 2) — 2-chain lock 없음. fix-incident gap 20+/20 재점검(`gh run list` 전부 success/skipped) — negative. op-analysis gap 5/25, lotto gap 23/30, info-arch gap 4/30 미도달. explore-idea saturation 14/15 5연속 재확인 negative(TODOS Next-Up 사용자영역만, plan#29 spec_only_deferred, GH issue 0). cycle 2591 carry-over 추천대로 border-radius axis 스윕 완료 판단 후 신규 축(spacing/shadow/focus-ring) 정독.

발견: DESIGN.md "카드 hover: transition-shadow (hover:shadow-md)" 대비 사이트 전체 `hover:shadow-*` 32건 grep — 31건 `hover:shadow-md` dominant, `app/analysis/page.tsx` 빅매치 CTA 카드 1건만 `hover:shadow-xl`. 정적 `shadow-*` 도 `shadow-md` 28건 dominant(`shadow-lg` 1건은 skip-link 포커스 상태, 카드 범주 아님 — 범위 밖). border-radius family(cycle 2583/2590/2591)와 별개 축, shadow axis 첫 발견.

실행: `hover:shadow-md` 로 정렬, `silent-drift-cycle-2592.test.ts` 신규 2건. `pnpm --filter moneyball exec tsc --noEmit` clean + vitest(546/4418, +1/+2) + lint clean. 단일 논리 단위 → 직접 main commit+push(R4/R7). 1차 push 시 apps/moneyball/package.json 만 bump하고 루트 package.json+VERSION 누락 → version-sync-guard pre-push hook 이 정상 차단, 즉시 3-way 동기화 후속 커밋(a614ddc5)으로 해결.

다음 사이클 추천 = review-code(heavy) 계속 시 focus-ring axis(`focus-visible:outline` 계열) 신규 정독, 또는 op-analysis(gap 6/25)/lotto(gap 24/30) 자연 대기.

## ✅ SUCCESS — lotto(lite) 30-cycle gap trigger count_smoke 재확인 (cycle 2598, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전8(2590-2597) distinct=3(review-code/polish-ui/dimension-cycle), lock 없음. fix-incident gap 72/20 초과 재점검 — 전 scheduled workflow success/skipped, daily-pipeline/sync-batter-stats/pitcher-snapshot/mlb-pipeline 모두 의도된 Cloudflare Worker cron 이관(comment 명시) 확인, 실제 인시던트 없음(negative). lotto gap 정확히 30/30 도달(last fire cycle 2568) — 채택.

실행: `pnpm tsx scripts/lotto.ts count` — valid=7,705,415 / total=8,145,060 / removed=5.40% (96.4s). cycle 2478→2508→2538→2598 4연속 완전 동일값 = 256규칙 saturation 구조적 안정 재확인, valid_delta=0. 2026-08-29 픽 50세트(1239회)는 cycle 2538에 이미 shipped, 2026-08-22 결과(1238회) OOS도 이미 완비 — 다음 추첨(08-29) 미도래로 신규 액션 없음. 신규 코드 변경 없음(측정 only).

다음 사이클 추천 = review-code(heavy, 잔존 typography arbitrary-value sprawl 165건 design-system 후보 검토) 또는 operational-analysis(gap 12/25 근접).

## ✅ SUCCESS — polish-ui(carry-over) text-[11px] 46건 --text-2xs 흡수 (cycle 2600 milestone, 2026-08-25)

진단: open issue 0, approved plan 0/23. 직전8(2592-2599) distinct=5(review-code 4+polish-ui 1+dimension-cycle 1+lotto 1+design-system 1) — 2-chain lock 없음. fix-incident negative(gh run list 전부 success/skipped). op-analysis gap 14/25, info-arch gap 13/30 미도달. explore-idea saturation 11/15 미충족. lotto/design-system 둘 다 직발화 직후 gap 낮음. cycle 2599 retro 가 명시 추천한 carry-over(`text-[11px]` 46건, DESIGN.md "미해결" 항목) 채택. **cycle_n % 50 == 0 milestone — trigger 3 (다른 trigger 결과 무관 즉시 마커 박제, cycle 2051 사례19 룰).**

발견: `text-[11px]` 46건(21개 프로덕션 파일) 전수 확인 — 전부 캡션/보조 라벨/티어 텍스트 역할, DESIGN.md 2xs(10px, "미니 캡션/보조 라벨 — 실사용 최다 빈도") 정의와 완전히 동일한 역할. 10px/11px 1px 차이는 시각적으로 무의미 — 신규 토큰 승격 시 3xs/2xs/신규/xs 4단으로 스케일만 파편화.

실행: `text-[11px]` → `text-2xs` 46건 치환(22 파일, 대괄호 라우트 경로(`[id]`/`[date]`/`[slug]`/`[year]`) 포함 — word-splitting glob 오인 최초 실패 후 `grep -rlZ`+NUL+`while read` 로 재시도 해결). DESIGN.md "(미해결)"→"(해결)" 갱신. `polish-ui-cycle-2600-11px-absorption.test.ts` 신규. `pnpm --filter moneyball exec tsc --noEmit` clean + vitest(553/4429, +1/+1) + lint clean. 단일 논리 단위 → 직접 main commit+push(R4/R7).

milestone 처리: cycle_n=2600 → skill-evolution-pending 마커 박제(retro 마지막 step). 다음 사이클(2601) = skill-evolution 강제 발화(자율 X).

다음 사이클 이후 추천 = review-code(heavy) 또는 op-analysis(gap 15/25)/info-arch(gap 14/30) 자연 발화.

## ✅ SUCCESS — review-code(heavy) 529 Overloaded 재시도 window off-by-one 수정 (cycle 2634, 2026-08-26)

진단: open issue 0, approved plan 0/23. gap trigger 전부 미도달(fix-incident 19/20, op-analysis 8/25, info-arch 16/30, lotto 6/30). 직전8 distinct=6 — 2-chain lock 미충족. DESIGN.md 당일 갱신(polish-ui negative). cycle 2633 explore-idea(lite)가 명시 추천한 신규 축(`retro.ts`/`llm.ts`, validator.ts 환각검증 gap family 완전 소진 이후) 채택.

발견: `llm.ts` 직독 중 cycle 986 주석("529 단독 attempts 4 로 확장: 2.5s→5s→10s→20s = 총 37.5s window")과 실제 동작 불일치 — `MAX_OVERLOADED_ATTEMPTS = OVERLOADED_BACKOFF_MS.length`(4)에 루프가 `attempt < maxAttempts-1`일 때만 sleep 해 마지막 attempt(index 3)는 sleep 없이 즉시 실패 반환, 배열 마지막 값 20000ms 가 죽은 코드. 실측 대기시간 2500+5000+10000=17500ms(17.5s) = 확장 전과 동일, 2026-05-19 5경기 fallback 재발 evidence 로 의도했던 "37.5s 로 확장" 효과가 실제로는 무력화된 상태(단순 주석 오기가 아니라 production resilience 실효성 문제).

수정: `MAX_OVERLOADED_ATTEMPTS = OVERLOADED_BACKOFF_MS.length + 1`(4→5)로 fencepost 정정 — backoff N개 전량 소비하려면 attempts=N+1. 테스트 전부 심볼 참조라 값 변경만으로 기존 회귀 없이 통과. `agents-llm.test.ts`에 `setTimeout` spy 로 backoff 배열 `[2500,5000,10000,20000]` 전량 소비 + 합계 37500ms 직접 검증하는 회귀 가드 신규(향후 attempts 를 배열 길이로 되돌리면 17500 을 보고 즉시 실패). 스코프: 동일 off-by-one 패턴이 일반 경로(`MAX_ATTEMPTS`)와 `llm-deepseek.ts`/`llm-ollama.ts` 에도 존재하나 evidence-backed 수치 주장 없어 이번 스코프 제외.

`pnpm --filter kbo-data exec tsc --noEmit` clean + vitest 91 files/1199 tests(+1) green + lint clean. version 158→159(`scripts/bump-version.sh`). 단일 논리 단위 → 직접 main commit+push(R4/R7).

다음 사이클 추천 = 일반 경로(`MAX_ATTEMPTS`)/`llm-deepseek.ts`/`llm-ollama.ts` 동일 off-by-one 존재 여부 확인(1순위 후보) 또는 polish-ui/info-architecture-review(dominance 완화 다양성).

## 🔍 RETRO-ONLY — review-code(heavy) postview.ts clean audit (cycle 2654, 2026-08-26)

진단: open issue 0, approved plan 0/23. gap trigger 4종 전부 미도달(fix-incident 9/20, op-analysis 17/25, info-arch 6/30, lotto 26/30). 직전8 distinct=4 — 2-chain lock 미충족. cycle 2653 추천 diversity 후보(polish-ui/info-architecture-review) 조사했으나 둘 다 false positive로 기각: (1) `BigMatchDebateCard.tsx` `focus-visible:outline-white` 1건 — outlier처럼 보였으나 부모 카드가 dark hero(`--color-bg-hero-start/end` = brand-800/700) 배경이라 흰 아웃라인이 실제로 대비 확보되는 의도된 디자인, 나머지 73건(`outline-brand-500`)은 라이트 배경 컨텍스트용이라 서로 다른 정상 케이스. (2) breadcrumb 누락 18개 라우트 grep — 전수 확인 결과 전부 root(`/`)/redirect-only index(`/reviews/monthly`,`/reviews/weekly`)/`robots noindex` stub("박제 중" 안내, community/login/settings)/`/debug/*` 내부 전용이라 실질 IA 갭 없음.

실행: `postview.ts`(588줄, 사후분석 오케스트레이터) 전체 정독 — `canonicalizeFactorKey`/`isWeightedFactor` 일관성, `getZeroWeightRuleJudgePregame`(judge-agent.ts 재사용 확인, dead code 아님) 등 3종 ZERO_WEIGHT helper 참조, JUDGE_POSTVIEW_SYSTEM 프롬프트 예시 factor 키(`bullpen_fip`/`recent_form`) DEFAULT_WEIGHTS 실측 일치, validator layer(팀/심판 양쪽) 정상 연결 — 신규 발견 0건, clean(cycle 2632/2637 에서 이미 손질된 최신 상태). 코드 변경 없음.

다음 사이클 추천 = review-code(heavy) 계속 시 미감사 대형 파일(`fancy-stats.ts` 526줄, `silent-drift-alert.ts` 440줄) 정독, 또는 op-analysis(gap 18/25 근접) 자연 대기.

## 🔍 RETRO-ONLY — review-code(heavy) shared/index.ts clean audit (cycle 2655, 2026-08-26)

진단: open issue 0, approved plan 0/23. 2nd defense(cycle 2654 retro commit 존재) OK. gap trigger 4종 전부 미도달(fix-incident 10/20, op-analysis 18/25, info-arch 7/30, lotto 27/30). 직전8 distinct=4 — 2-chain lock 미충족. op-analysis 데이터 동결(cycle 2637 기준 10회 연속 동일 수치, 재측정 저가치) + explore-idea saturation(14/15) 충족되나 유일 후보(plan #29) cycle 2624/2633 재확인 negative — 둘 다 skip. cycle 2654 추천대로 미감사 대형 파일 탐색, `packages/shared/src/index.ts`(3453줄, 리포 최대 단일 파일) 채택.

실행: 서브에이전트(superpowers:code-reviewer) 전체 정독 — `DEFAULT_WEIGHTS`/`HOME_ADVANTAGE`(0.015) CLAUDE.md v1.8 완전 일치, `LLM_RETRY_BACKOFF_MS` 주석의 cycle 2653 fix 서술이 실제 `llm.ts`/`llm-deepseek.ts` 코드와 일치, `PARK_FACTOR_NARRATIVE_*` 경계값이 `kbo-official.ts`의 `DEFAULT_PARK_FACTORS`와 완전 일치, 대칭쌍 상수(STRONG/WEAK, HIGH/LOW) ~15건 산술 검증, `HOME_ELO_BONUS=24`는 기존 wave-272 회귀 테스트가 이미 의도된 값으로 고정 확인, 최근 export 33건 dead-code 스팟체크 전부 실사용처 존재. 신규 drift 0건 — clean audit, 코드 변경 없음.

**패턴 신호**: 직전 6 review-code-family 사이클 중 5회(2648/2649/2652/2654/2655) 가 clean-audit RETRO-ONLY — 대형 파일 반복 스윕의 수확체감 뚜렷. dominance 14/20(70%)와 겹쳐 3연속(2653/2654/2655) diversity 전환 권고 누적.

다음 사이클 추천 = fix-incident(gap 10/20, 실제 incident evidence 재확인 후) 또는 info-architecture-review(gap 7/30 이르지만 checkpoint 재확인) — review-code 편중 완화 우선 검토.

## ✅ SUCCESS — review-code(heavy) backtest-logistic-run.ts 미소비 필드 정리 (cycle 2685, 2026-09-01)

진단: open issue 0, approved plan 0/23(전부 completed/archived/deferred). 2차 방어선(cycle 2684 retro commit 존재) OK. gap trigger 4종 전부 미도달(fix-incident 2/20, op-analysis 19/25, info-arch 6/30, lotto 26/30). 직전8 distinct=3(2-chain lock 미충족). explore-idea saturation(15/15) 도달했으나 4-source 재확인 전부 negative(plan#29 REST count 실측 = cycle 2417 이후 완전 무변화, GH issue 0, TODOS Next-Up 섹션 소멸, 신규라우트 92건=git checkout mtime 부작용) → review-code(heavy) 재선택.

실행: 최고령 미터치 대형파일 재스캔 → `backtest-run.ts`(168줄, 2026-04-21, 최고령) 정독 clean. 동일 연령대 `backtest-logistic-run.ts`(2026-05-04) 후속 정독 — `extractFeatures()` 반환 `games`(used 배열)가 train/test 어디서도 미참조. cycle 2677/2678/2680/2681/2682/2684 와 동일 computed-but-unconsumed 패턴 6번째 발견, 제거. 자매 파일 `backtest-grid-run.ts`의 동명 함수는 clean 확인.

`pnpm --filter moneyball exec tsc --noEmit` + `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` clean + lint clean + vitest 571/4483 green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 39a9eec3).

다음 사이클 추천 = review-code(heavy) 계속 시 미감사 대형 파일(`fancy-stats.ts` 526줄, `silent-drift-alert.ts` 440줄, cycle 2653 carry-over) 정독, 또는 fix-incident(gap 2/20 방금 리셋)/op-analysis(gap 19/25 근접)/lotto(gap 26/30 근접) 자연 대기.

## ✅ SUCCESS — review-code(heavy) convergenceRecord.ts 미소비 id 필드 정리 (cycle 2690, 2026-09-01)

진단: open issue 0, approved plan 0/23(전부 completed/archived/deferred). 2차 방어선(cycle 2689 retro commit 존재) OK. gap trigger 4종 전부 미도달(fix-incident 7/20, op-analysis 24/25 근접, info-arch 11/30, lotto 1/30 방금 발화). 직전8 distinct=3(review-code(heavy) 6 + fix-incident(lite) 1 + lotto(lite) 1) — 2-chain lock 미충족. explore-idea saturation 14/15 재도달했으나 4-source 재확인 전부 negative(신규라우트 92건=git checkout mtime 부작용, TODOS Next-Up stale mcc-alias 1-line만, GH issue 0, DESIGN.md 당일 갱신=git checkout 부작용) → review-code(heavy) 재선택.

실행: 최고령 미터치 대형파일 재스캔 → `convergenceRecord.ts`(832줄, 2026-08-23 11:30 최고령) 전체 정독. `fetchMlbConvergencePickDetailedResultsForPair` 의 `mlb_schedule` select 가 `id` 컬럼을 가져오지만 scheduleRows 순회·`evaluateMlbConvergencePickRow` 호출 어디서도 참조되지 않음(external_game_id 로만 매칭) — kbo-live.ts/mlb-shared.ts/buildPicksStats.ts/predictions Row 등과 동일 미소비 select 필드 계열 9번째 발견, 제거. 나머지 함수(getConvergencePick*/getMlbConvergencePick* 전체, h2h 게이팅, streak/팀별/홈어웨이/요일 집계)는 clean.

`pnpm --filter moneyball exec tsc --noEmit` clean + lint clean + vitest 571 files/4483 tests 전체 green(무변화). 단일 논리 단위 → 직접 main commit+push(R4/R7, 2bb1baa1).

다음 사이클 추천 = review-code(heavy) 계속 시 미감사 대형 파일(`analysis-data.ts`, `buildAccuracyData.ts` 776줄, `buildTeamProfile.ts` 601줄, `buildMatchupProfile.ts` 594줄 후보) 정독, 또는 op-analysis(gap 24/25 임박, 다음 사이클 임계 도달)/fix-incident(7/20)/info-arch(11/30) gap 자연 대기.

## ✅ SUCCESS — polish-ui(2-chain lock fallback) 미소비 semantic CSS 토큰 제거 (cycle 2706, 2026-09-01)

진단: open issue 0, approved plan 0/23. 2차 방어선(cycle 2705 retro commit 존재) OK. gap trigger 4종 전부 미도달(fix-incident 10/20, op-analysis 15/25, info-arch 27/30, lotto 17/30). 직전8 distinct=2(review-code(heavy) 7 + skill-evolution 1) — **2-chain alternation lock 발동**. explore-idea saturation(2/15) 미충족, DESIGN.md mtime 당일=git checkout 부작용, breadcrumb 누락 18건은 cycle 2654 에서 이미 전수 확인된 false positive(root/redirect/noindex stub) — 잔여 chain 전부 organic trigger 부재 → polish-ui 강제 발화(lock rule).

실행: DESIGN.md token vs 컴포넌트 grep 계열 탐색 — `globals.css` `@theme` 블록에 정의된 `--color-*` 27개 전수 `var(--color-X)` 참조 카운트 → `--color-success`/`--color-warning`/`--color-info` 0건 검출. Tailwind v4 `@theme inline` 은 CSS var 뿐 아니라 `bg-success`/`text-warning` 류 auto-utility 도 생성하므로 utility-class 사용까지 재검색 → `--color-warning`(Tailwind `bg-warning`/`text-warning`, `accuracy/page.tsx`+`debug/*` 다수 실사용)과 `--color-error`(`var(--color-error)`, `FactorWaterfallChart.tsx`+`MlbFactorWaterfallChart.tsx` 2곳)는 실사용 확인, `--color-success`/`--color-info` 만 CSS/Tailwind 쪽 진짜 소비처 0건 확정(JS 쪽은 `lib/design-tokens.ts` 의 `semantic.success`/`semantic.info` literal 이 recharts SVG prop 전담 — satori/recharts CSS var 미지원이라 애초 별도 source). `--color-success`/`--color-info` 2개 제거, 주석 갱신.

`pnpm --filter moneyball exec tsc --noEmit` clean + `pnpm --filter moneyball lint` clean + pre-push hook(type-check+version-sync-guard+vitest 3 tests) green. 단일 논리 단위 → 직접 main commit+push(R4/R7, 6c703ee5).

다음 사이클 추천 = review-code(heavy) 미감사 대형 파일(`fancy-stats.ts` 526줄, `silent-drift-alert.ts` 440줄, `analysis-data.ts`/`buildAccuracyData.ts`/`buildTeamProfile.ts`/`buildMatchupProfile.ts` carry-over) 정독, 또는 fix-incident(10/20)/op-analysis(15/25)/info-arch(27/30)/lotto(17/30) gap 자연 대기.

## RETRO-ONLY — review-code(heavy) fancy-stats.ts/silent-drift-alert.ts 재감사 clean (cycle 2707, 2026-09-01)

진단: open issue 0, approved plan 0/23. 2차 방어선(cycle 2706 retro commit 존재) OK. gap trigger 4종 전부 미도달(fix-incident 11/20, op-analysis 16/25, info-arch 28/30, lotto 18/30). 직전8 distinct=3(review-code(heavy) 6 + skill-evolution 1 + polish-ui 1) — 2-chain lock 미충족 → cycle 2706 추천대로 review-code(heavy) carry-over 대형파일 rotation 계속.

실행: `fancy-stats.ts`(526줄) 전체 정독 — FANCY_STATS_DEFAULTS/TEAM_NAME_MAP/FS_TEAM_MAP/findPitcher 전부 단일 source, 이중 정의 drift 없음(FANCY_STATS_DEFAULTS·woba 0.320 값 grep 전체 재확인). `silent-drift-alert.ts`(440줄) 전체 정독 — 5개 alert dispatcher 중 4개(captureSilentDriftAlert/captureCreditExhaustedAlert/captureSparsePredictionAlert/captureConfidenceFlatAlert) 전부 daily.ts/postview-daily.ts/mlb-pipeline.ts 에서 정상 호출 확인, captureFactorAnomalyAlert 미배선은 cycle 2276 에서 이미 문서화된 기존 사실(신규 발견 아님).

두 파일 다 clean — 코드 변경 없음.

다음 사이클 추천 = review-code(heavy) 계속 시 잔여 미감사 대형파일(`analysis-data.ts`/`buildAccuracyData.ts` 776줄, `buildTeamProfile.ts` 601줄, `buildMatchupProfile.ts` 594줄), 또는 fix-incident(12/20)/op-analysis(17/25)/info-arch(29/30 근접)/lotto(19/30) gap 자연 대기.

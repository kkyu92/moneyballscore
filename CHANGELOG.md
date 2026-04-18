# Changelog

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

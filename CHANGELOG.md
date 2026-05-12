# Changelog

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
- **보류**: n=89 (target n=150). 소표본 경고 유효. W21 이후 추가 데이터 누적 후 판단
- **선제 검토 후보**: judge-agent `Sunday confidence_clamp` 0.65→0.55 (n=150 전 단독 적용 검토)

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

- 누적 89건 (목표 n=150+). 잔여 61건 → 예상 4주 추가 관찰 필요.
- 가중치 변경 없음 (소표본). n=150 도달 시 operational-analysis heavy 재실행 예정.

### 패턴 추출 (gstack learnings 등록)

- **[quality_guard] new-page-3cycle-cleanup-pipeline**: 신규 페이지 ship 후 design token drift + assertSelectOk 미적용이 매번 2사이클 연속 발생. PR 체크리스트로 예방 가능.
- **[anti_pattern] confidence-inversion-high-conf-underperforms**: 고확신(≥55%) < 저확신 적중률 역전 지속. calibration curve re-fit 필요 (n=150 도달 후).
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
   - **action**: n=150 도달 후 heavy 분석 시 SFR 임계값(>0.7) 케이스 별도 분류 + 가중치 재검토.

2. **head_to_head 저평가 패턴 지속**: SSG vs NC / 삼성 vs 키움 양 시리즈에서 `head_to_head < 0.45` 신호가 실제 방향을 옳게 가리켰으나 SFR/recent_form에 묻힘. cycle 231 결론("head_to_head 5%→3% 감소 후보")과 **상충** — 이 주 데이터에선 head_to_head가 오히려 더 신뢰할 만함.

3. **일요일 저적중 패턴 지속**: 전체 누적 일요일 적중률 1/8 = 12.5% (4번째 확인). n=150 도달 후 `judge-agent.ts` 일요일 confidence clamp 조정 검토 예정.

4. **n=76 / 150 (50.7% 진행)**: v2.0 가중치 확정 임계 미달. 이번 주 분석은 soft warning 박제만 — 공식 가중치 변경 없음.

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

**권장 대응**: judge-agent.ts 에서 일요일 경기 `confidence_clamp` 상한을 0.65 → 0.55 로 축소 고려 (통계 임계 100건 도달 후 적용 판단).

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

#### 팩터 유효성 — v2.0 후보 확정 (100건 도달 후 적용)

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

가중치 변경 시 총합 = 100%. 재배분 방향: head_to_head +3% 흡수 (lineup_woba -3% / elo -3% / sfr -2% / park -2% → 합 -10%, 남은 -7% 는 bullpen +2% / recent_form +2% / sp_fip + sp_xfip +1% 씩 흡수 예정). **100건 도달 후 CI95 재측정 후 최종 확정.**

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

**현 시점 보류 (72건 < 100건 임계)**. 통계적 신뢰구간 너무 넓음. 단, 다음 checkpoint 기준:
- head_to_head 5% → 8% 상향 후보 (가장 높은 방향성 차이)
- elo 8% → 5% 하향 후보 (방향성 차이 최저)
- SFR 음수값 버그 수정 선행 필요
- 100건 도달 예상 시점: 5월 2주차 (~5/14)

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

# AI 기능 그룹화 — 헤더 nav 재편 (cycle 301)

cycle 301 / 2026-05-12 / chain `info-architecture-review`

## 진단

ia-2026-05-08 spec (cycle 279, 22 사이클 전) "다음 cycle 후속 후보":
- 헤더 메가메뉴 (전체 그리드 hover panel) — 카테고리 hub 강화

현재 문제:
- `AI 분석` = `/analysis` 단일 링크만 노출
- `/accuracy` (AI 적중 기록) = `리뷰·시즌` 7개 항목 중 6번째 → 발견성 낮음
- `/dashboard` (모델 성능) = `리뷰·시즌` 7개 항목 중 7번째 → 발견성 낮음
- `리뷰·시즌` 7개 항목 과부하: 이질적 콘텐츠(리뷰/시즌 + AI 성능) 혼재
- 사이트 가치 제안 (AI 예측 품질) 이 nav에서 바로 드러나지 않음

## 수정

### 헤더 NAV_ITEMS 재편

**Before:**
```
오늘 | AI 분석 | 순위 | 기록 | [팀·선수 ▾(3)] | [리뷰·시즌 ▾(7)] | search | theme
```

**After:**
```
오늘 | [AI ▾(3)] | 순위 | 기록 | [팀·선수 ▾(3)] | [리뷰·시즌 ▾(5)] | search | theme
```

- `AI 분석` (직접 링크) → `AI` 그룹(드롭다운):
  - AI 분석 → /analysis
  - 적중 기록 → /accuracy
  - 모델 성능 → /dashboard

- `리뷰·시즌` 7개 → 5개 (accuracy + dashboard 제거):
  - 예측 리뷰 → /reviews
  - 주간 리뷰 → /reviews/weekly
  - 월간 리뷰 → /reviews/monthly
  - 빗나간 예측 → /reviews/misses
  - 시즌 기록 → /seasons

### 푸터 SITEMAP_COLUMNS 정렬

`분석·예측` 컬럼에 `/accuracy` + `/dashboard` 이동 (현재 `서비스` 컬럼):
```
분석·예측: 오늘 경기 / AI 분석 / 적중 기록 / 모델 성능 / 예측 기록 / 매치업
```

`서비스` 컬럼에서 `/accuracy` + `/dashboard` 제거:
```
서비스: 검색 / 소개 / 문의
```

## 검증

- `pnpm type-check` (apps/moneyball): PASS
- `pnpm test` (apps/moneyball): 전체 PASS
- 헤더 `AI ▾` hover → 3 항목 dropdown 노출
- 모바일 nav: AI 그룹 섹션 헤더 + 3 항목
- `/analysis`, `/accuracy`, `/dashboard` isActive 하이라이트 정상

## 다음 cycle 후속 후보

- 헤더 메가메뉴 본격 전환 (전체 그리드 hover panel, 각 항목에 아이콘+설명) — 별 cycle scope
- analysisRoutes / playerRoutes / predictionDateRoutes 60일 윈도우 적정성 측정 (검색 트래픽 데이터 누적 후)

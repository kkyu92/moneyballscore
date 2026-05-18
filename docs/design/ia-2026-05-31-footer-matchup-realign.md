# IA: Footer `/matchup` 그룹 정렬 (cycle 552)

## 발화

cycle 552 `info-architecture-review` (lite) chain. trigger 9 — 마지막 info-arch fire (cycle 522) 후 30 cycle 경과 (정확히 30-cycle 주기 보정 trigger).

## 진단

Header (`apps/moneyball/src/components/layout/Header.tsx:21-30`) 와 Footer (`apps/moneyball/src/components/layout/Footer.tsx:3-41`) 의 `/matchup` 카테고리 mismatch:

| 컴포넌트 | `/matchup` 그룹 | 그룹 내용 |
|---|---|---|
| Header NAV_ITEMS | `팀·선수` (dropdown) | 팀 / 선수 / 매치업 |
| Footer SITEMAP_COLUMNS | `AI 예측` (column) | 오늘 / 분석 / 적중 / 성능 / 예측 / **매치업** |

cycle 320 spec (`ia-2026-05-30-community-nav-split.md`) 후속 헤더 refactor (cycle 350 SVG 아이콘 추가 등) 진행 중 Header `/matchup` 위치가 `커뮤니티 → 팀·선수` 으로 이동했으나 Footer 동기 누락. 결과: Footer 가 stale.

## 결정

Footer `/matchup` 항목 `AI 예측` 그룹 → `팀·선수` 그룹 이동. Header 멘탈 모델과 정렬.

### 근거

1. `/matchup` 의미 = 두 팀 head-to-head 맞대결 분석. AI 예측 X (data view). 팀 운영 / 비교 시야 정렬 더 자연.
2. Header 와 mental model 일치 → 사용자 같은 카테고리 인지로 검색 가능
3. Footer `AI 예측` 컬럼 6 → 5 항목 (시각 정리). `팀·선수` 컬럼 3 → 4 항목 (균형)

## 변경

`apps/moneyball/src/components/layout/Footer.tsx`:

**Before**:
```ts
AI 예측: 오늘 경기 / AI 분석 / AI 적중 기록 / 모델 성능 / 예측 기록 / 매치업
팀·선수: 팀 순위 / 팀 프로필 / 선수 리더보드
```

**After**:
```ts
AI 예측: 오늘 경기 / AI 분석 / AI 적중 기록 / 모델 성능 / 예측 기록
팀·선수: 팀 순위 / 팀 프로필 / 선수 리더보드 / 매치업
```

## 검증

- `pnpm type-check`: PASS
- `pnpm test`: PASS
- `/matchup` Footer 클릭 시 `팀·선수` 컬럼 표시
- Header /matchup `팀·선수` 드롭다운 위치 변경 X (이미 정렬)

## 다음 cycle 후속 후보

없음. 단일 surgical IA 정렬. trigger 8 (carry-over 미처리 ≥ 20 사이클) 후보 X.

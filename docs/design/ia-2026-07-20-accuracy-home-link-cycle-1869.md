# IA Review: 홈 적중률 요약 → /accuracy 전체 보기 링크 (wave-502)

**cycle**: 1869
**date**: 2026-07-20
**trigger**: trigger 7 (explore-idea 5/12 + info-arch 0/12) + trigger 9 (마지막 info-arch cycle 1839 → 1869 = 30 사이클 gap)

## 진단

### 발견된 IA 이슈

**홈 "적중률 요약" 섹션 → /accuracy 발견 경로 단절** (wave-493 이후 gap):
- `/accuracy` 페이지: AccuracyHeaderCard 티어별 breakdown 추가 (wave-493, cycle 1859) ✅
- 홈 "적중률 요약" 섹션: 시즌 적중률 + 티어 분포 표시
  - AccuracySummary (시즌 적중률 + tier별 %) 
  - 오늘 예측 신뢰도 분포 (wave-495, confident/lean/tossup 경기 수 + 과거 적중률)
- **홈 → /accuracy 링크 없음** ❌ 사용자가 숫자를 보고 더 자세히 보려면 수동으로 nav 사용해야 함

**비교 패턴** (이미 구현된 "전체 보기 →" 패턴):
- 홈 "경기별 예측" → `/predictions` "전체 보기 →" ✅ (기존 패턴)
- 홈 "적중률 요약" → `/accuracy` "전체 보기 →" ❌ (이번 fix 대상)

### 유지 판단 항목 (변경 없음)
- Header KBO_NAV 구조 변경 없음 (예측·기록 그룹: analysis/accuracy/insights/predictions/dashboard)
- Footer "AI 예측" 7 items 유지 (/, analysis, accuracy, dashboard, insights, predictions, calendar)
- community 페이지 breadcrumb 미추가 (robots: noindex, 2026-08~09 ship 예정, 의도적 미노출)
- debug 페이지 breadcrumb 미추가 (내부 툴, 사용자 navigation 불필요)

## 변경 사항

### apps/moneyball/src/app/page.tsx — 적중률 현황 섹션 header 추가

```tsx
{/* 적중률 요약 */}
<section className="space-y-4">
  <div className="flex justify-between items-center">
    <h2 className="text-xl font-bold">적중률 현황</h2>
    <Link href="/accuracy" className="text-sm text-brand-600 hover:text-brand-800 hover:underline">
      전체 보기 →
    </Link>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* AccuracySummary + 오늘 예측 + WeeklyTrendMini */}
  </div>
</section>
```

**패턴**: "경기별 예측" 섹션의 `flex justify-between items-center` + "전체 보기 →" 패턴 동일 적용.

## 기대 효과

- 홈에서 적중률 숫자 보고 `/accuracy` 상세 페이지로 자연 이동 가능
- wave-493 AccuracyHeaderCard 티어 breakdown 발견 경로 완성
- wave-495/497 홈 티어 분포/인라인 적중률 → /accuracy 상세 연결

## 테스트 결과

- 333 test files, 2919 tests: 전부 PASS
- PR #2797, commit 41604d46

## 다음 cycle 후속 후보

- Footer "AI 예측" 컬럼 7 items max — 신규 AI 기능 페이지 추가 시 컬럼 분리 트리거
- WeeklyTrendMini → /reviews/weekly "전체 보기" 링크 여부 (홈 리뷰 섹션 일관성)
- /accuracy/shadow footer 유지 모니터링 (v2.1-B era 종료, 방문 지속 확인)

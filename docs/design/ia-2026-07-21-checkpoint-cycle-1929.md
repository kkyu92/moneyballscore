# IA Review: Footer noindex 2건 제거 + sitemap 동기화 (cycle 1929)

**cycle**: 1929
**date**: 2026-07-21
**trigger**: trigger 9 (마지막 info-arch cycle 1899 → 1929 = 30 사이클 gap, lite 자동)

## 진단

### 발견된 IA 이슈

**1. Footer에 noindex 페이지 2건 노출 (주요 gap)**:

| 페이지 | robots | sitemap.ts | footer |
|---|---|---|---|
| /v2-shadow-monitor | `noindex` | ❌ 제외됨 (cycle 1802) | ✅ 포함 ← **불일치** |
| /accuracy/shadow | `noindex, nofollow` | ❌ 미포함 | ✅ 포함 ← **불일치** |

cycle 1802 IA에서 `/v2-shadow-monitor`를 sitemap.ts에서 제거했지만 Footer는 미동기. `/accuracy/shadow`도 noindex인데 Footer에 노출 중.

**2. Footer ASCII 주석 stale**:
- MLB 컬럼에 `/mlb/factors` 누락 (실제 코드에 있음)
- 도움말 컬럼에 제거된 항목 2개 표시

### 유지 판단 항목 (변경 없음)
- Footer "AI 예측" 7 items: 적정 길이 (/ /analysis /accuracy /dashboard /insights /predictions /calendar)
- 도움말 8→6 items 후 균형 양호
- Breadcrumb: analysis/page.tsx, analysis/game/[id] 양쪽 정상
- Header nav "에이전트 토론·팩터 수렴 픽" description: wave-548~555 이후 최신 상태

## 변경 사항

### apps/moneyball/src/components/layout/Footer.tsx

1. **도움말 컬럼**: `/v2-shadow-monitor`, `/accuracy/shadow` 제거 (8→6 items)
2. **ASCII 주석**: MLB에 `/mlb/fact..` 추가, 도움말 행 갱신, cycle 1929 갱신 표시

## 기대 효과

- Footer가 sitemap.ts와 일관성 (noindex 페이지 완전 제거)
- 사용자에게 내부 모니터링 페이지 미노출 (SEO + UX 개선)
- 도움말 컬럼 6 items로 균형

## 다음 cycle 후속 후보

- Footer "AI 예측" 컬럼 7 items → 향후 8개 도달 시 컬럼 분리 재검토
- wave-548~555 강수렴 픽 기능 discovery 경로 모니터링 (현재 /analysis 직접 진입만)

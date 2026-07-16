---
title: IA 개선 — 분석 카드 매치업 심층 분석 딥링크 (cycle 1699)
date: 2026-07-16
cycle: 1699
chain: info-architecture-review (heavy)
trigger: trigger-7 (직전 12 사이클 explore-idea 5회 + info-arch 0회) + 2-chain alternation lock break (review-code ↔ explore-idea distinct=2)
outcome: success
---

# IA 개선 — 분석 카드 → 매치업 딥링크 (wave-361)

## Trigger

- (7) 직전 12 사이클 explore-idea ≥ 5회 (실측: 5/12) + info-architecture-review 0회 → 트리거 충족
- 2-chain alternation lock: cycle 1691~1698 review-code ↔ explore-idea 엄격 교대 (distinct=2) → 양쪽 제외
- 마지막 info-arch fire: cycle 1680 (19 cycle gap, 30 threshold 미달이지만 trigger 7 충족으로 발화)

## 진단 결과

### wave-353/355/357/359 추가된 배지 (since cycle 1680)

| Wave | 배지 | 위치 |
|---|---|---|
| wave-353 | 선발 xFIP 갭 배지 (원/홈 각각) | `/analysis` 게임 카드 |
| wave-355 | 타선 wOBA 직접 대결 배지 ("타선 XX 강세") | `/analysis` 게임 카드 |
| wave-357 | 수비 SFR 직접 대결 배지 ("수비 XX 강세") | `/analysis` 게임 카드 |
| wave-359 | 불펜 FIP 직접 대결 배지 ("불펜 XX 강세") | `/analysis` 게임 카드 |

### IA 갭 발견

배지들이 "타선 두산 강세" 등 텍스트만 표시, 클릭 시 해당 팀 간 `/matchup/[teamA]/[teamB]` 심층 분석 페이지로 연결되지 않음.

- `/matchup/[teamA]/[teamB]` 페이지: FIP/xFIP/wOBA/SFR/WAR 전 팩터 대결 표 + 최근 맞대결 이력 + IA 브레드크럼 ✓
- 진입점: 분석 카드에서 직접 링크 없음 (팀 프로필 → 매치업 조회 경로만 존재)

### 개선 (wave-361)

`apps/moneyball/src/app/analysis/page.tsx` 게임 카드 `</Link>` 이후:

```tsx
{/* wave-361: 매치업 심층 분석 딥링크 (cycle 1699) */}
{(() => {
  const pair = canonicalPair(g.awayCode, g.homeCode);
  if (!pair) return null;
  return (
    <div className="mt-1.5 px-1 flex justify-end">
      <Link href={pair.path} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
        매치업 심층 분석 →
      </Link>
    </div>
  );
})()}
```

### 네비게이션 흐름

Before: 분석 카드 → [게임 상세] 만 가능
After: 분석 카드 → [게임 상세] + [매치업 심층 분석 →]

## 결론

배지 4건 추가 이후 IA 단절 해소. `/matchup` 라우트 표면 접근성 개선.

## 다음 cycle 후속 후보

- 게임 상세(`/analysis/game/[id]`) 페이지에도 동일 매치업 딥링크 추가 고려
- battle badge가 showing(강세 조건 충족 시)만 딥링크 노출 필터 옵션
- 다음 gap-7 fire = 직전 12 사이클 explore-idea ≥5 + info-arch 0 재충족 시

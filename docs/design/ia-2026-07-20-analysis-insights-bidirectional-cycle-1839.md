# IA Review: analysis/game/[id] → /insights 양방향 링크 (wave-477)

**cycle**: 1839
**date**: 2026-07-20
**trigger**: trigger 9 (마지막 info-arch 발화 cycle 1802 → 1839 = 37 사이클 gap, ≥30 임계) + 2-chain alternation lock (review-code↔explore-idea 8사이클)

## 진단

### 발견된 IA 이슈

**analysis/game/[id] → insights 단방향 누락** (cycle 1727 spec 후속 carry-over 이행):
- `/insights/[date]` 페이지: 경기별 카드에서 `/analysis/game/${gameId}` 링크 존재 ✅
- `/analysis/game/[id]` 페이지: RelatedLinks에 `/insights/[date]` 링크 부재 ❌
- 결과: 사용자가 경기 상세 분석에서 AI 인사이트 아카이브로 이동하는 경로 없음 → discoverability 단절

### 현황 확인

**Header KBO_NAV** (1802 이후 변경 없음):
- 오늘 / 예측·기록(5) / 팀·선수(4) / 리뷰·시즌(3) / 커뮤니티(2)
- /insights = 예측·기록 그룹 포함 ✅

**Footer "AI 예측" 컬럼** (7 items — max 경고 수준 유지):
- /, /analysis, /accuracy, /dashboard, /insights, /predictions, /calendar
- 신규 추가 X (7 items 상한)

**RelatedLinks 현황** (analysis/game/[id]):
- /teams/${homeTeam}, /teams/${awayTeam}, /matchup, /predictions/${gameDate}
- /insights/${gameDate} 미포함 ← 이번 fix 대상

### 유지 판단 항목
- v2-shadow-monitor footer 유지 (cycle 1802 결정 유지, 방문자 데이터 미수집)
- /accuracy/shadow footer 유지 (power user 직접 접근)
- Header nav 변경 없음

## 변경 사항

### analysis/game/[id]/page.tsx — RelatedLinks insight 링크 추가

```tsx
// isPast (status='final') 조건부 — pre-game 단계에서는 insights 페이지 미완성
...(isPast ? [{ href: `/insights/${gameDate}`, label: `${gameDate} AI 인사이트`, hint: 'AI 심판 에이전트 reasoning 아카이브' }] : []),
```

**조건부 이유**: `/insights/[date]` = `dynamicParams: false` + `generateStaticParams` (최근 90일 data 있는 날짜만 static). 경기 종료(status='final') 전에는 해당 날짜 insights 페이지가 없을 수 있음 → 404 dead link 방지.

## 기대 효과

- 경기 상세 분석 → AI 인사이트 아카이브 탐색 경로 완성 (cycle 1727 spec 후속)
- 양방향 insights ↔ analysis navigation 완결
- 팬이 경기 상세에서 같은 날짜 다른 경기의 AI reasoning도 자연 발견

## 테스트 결과

- 312 test files, 2762 tests: 전부 PASS

## 다음 cycle 후속 후보

- Footer "AI 예측" 컬럼 7 items max — 신규 AI 기능 추가 시 컬럼 분리 트리거
- /accuracy/shadow 방문자 패턴 모니터링 (v2.1-B era 종료, 방문 0 지속 시 footer 제거)
- analysis/game/[id] RelatedLinks 다양성: 현재 팀+매치업+예측+인사이트 → 추가 관련 경로 탐색

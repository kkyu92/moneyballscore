# IA Review: /insights 헤더 nav 편입 (wave-384)

**cycle**: 1727
**date**: 2026-07-17
**trigger**: trigger 7 (직전 12 사이클 explore-idea=5 + info-arch=0) + gap=28/30

## 진단

### 발견된 IA 이슈
- `/insights` (AI 인사이트 — 심판 에이전트 reasoning 아카이브): footer "도움말" 에만 존재, 헤더 nav 부재
- `/accuracy/shadow` (v2.1-B rejected artifact): 헤더 "예측·기록" 그룹 점유 중 (stale primary nav)

### 근거
- `/insights` = dynamic daily content, "예측·기록" 그룹 semantic 정합
- `/accuracy/shadow` = 아카이브/히스토리 artifact, footer "도움말" 컬럼이 적합 위치
- COMPOSITE_DUEL 8팩터 완주(cycle 1725) 이후 AI 분석 관련 기능 discoverability 점검 시점

## 변경 사항

### Header.tsx (KBO_NAV 예측·기록)
- 제거: `/accuracy/shadow` (footer "도움말" 에 유지, 헤더에서만 제거)
- 추가: `/insights` label="AI 인사이트" description="심판 에이전트 reasoning 아카이브" icon="database"

### 5개 유지 → MegaMenu `w-[320px]` 레이아웃 unchanged

## 다음 cycle 후속 후보
- info-arch gap=28/30 → 다음 1-2 사이클 내 trigger 9 (30-cycle gap) 도달 예상
- 추가 IA 점검 포인트: analysis/game/[id] → insights 링크 bidirectional 확인
- footer "도움말" 컬럼 정리: v2-preview, v2-shadow-monitor 필요성 재검토 (다음 info-arch 발화 시)

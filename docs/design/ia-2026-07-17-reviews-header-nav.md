# IA Review: /reviews 섹션 헤더 nav 편입 (cycle 1749)

**cycle**: 1749
**date**: 2026-07-17
**trigger**: 2-chain alternation lock (review-code↔explore-idea 8사이클) + trigger 7 (직전 12 사이클 explore-idea=5 + info-arch=0)

## 진단

### 발견된 IA 이슈
- `/reviews` 섹션 (예측 리뷰 / 빗나간 예측 / 주간·월간 / 시즌 기록): footer "리뷰·시즌" 컬럼에는 존재, 헤더 KBO_NAV에 완전 부재
- wave-403 (cycle 1748)에서 `/reviews/misses` 페이지가 추가됐으나 헤더 진입점 없음
- Footer와 Header IA 코멘트(reviews/page.tsx, Footer.tsx lines 8-13)는 "리뷰·시즌" 그룹을 KBO 헤더에 의도적으로 배치하는 설계 박혀있음

### 사용자 discoverability 문제
- 유일한 진입점 = Footer "리뷰·시즌" 컬럼 → 스크롤 bottom까지 내려야 발견 가능
- `/reviews/misses` (고확신 오예측 사후 분석) = unique content, primary navigation 가치 충분
- 적중 기록(`/accuracy`) 옆에 "리뷰" 섹션이 있으면 사용자 mental model 정합

## 변경 사항

### Header.tsx (KBO_NAV에 "리뷰·시즌" 그룹 추가)
```
기존: 오늘 | 예측·기록 | 팀·선수 | 커뮤니티
변경: 오늘 | 예측·기록 | 팀·선수 | 리뷰·시즌 | 커뮤니티
```

**리뷰·시즌 그룹 (3 items)**:
- `/reviews` label="예측 리뷰" description="주간·월간 적중률 추이 · 팀별 분해" icon="bar-chart"
- `/reviews/misses` label="빗나간 예측" description="고확신 오예측 사후 분석" icon="alert-circle"
- `/seasons` label="시즌 기록" description="역대 시즌별 기록" icon="database"

### 커뮤니티 그룹 위치: 마지막으로 이동
- picks, leaderboard 그룹 = UGC/engagement → 마지막 group이 semantic 정합

## 제외 항목
- `/reviews/weekly`, `/reviews/monthly`: redirect-only 페이지, 헤더에 불필요 (footer 유지)
- breadcrumb: reviews/monthly/page.tsx, reviews/weekly/page.tsx = redirect-only, 미장착 OK

## 다음 cycle 후속 후보
- footer "도움말" 컬럼 정리: v2-preview, v2-shadow-monitor 필요성 재검토 (cycle 1727 spec 후속)
- reviews/misses 헤더 nav 추가 후 analytics 수집 확인 (discoverability 개선 측정)

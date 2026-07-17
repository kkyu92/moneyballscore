# IA Review: v2-shadow-monitor noindex + sitemap 제거 (cycle 1802)

**cycle**: 1802
**date**: 2026-07-17
**trigger**: trigger 9 (마지막 info-arch 발화 cycle 1771 → 1802 = 31 사이클 gap, ≥30 임계)

## 진단

### 현재 IA 상태 (1802 기준)

**Header KBO_NAV** (정상):
- 오늘 / 예측·기록(5) / 팀·선수(4) / 리뷰·시즌(3) / 커뮤니티(2)
- 이전 사이클 IA 모두 반영 완료

**Footer "AI 예측" 컬럼** (7 items, max 경고 유지):
- /, /analysis, /accuracy, /dashboard, /insights, /predictions, /calendar
- 신규 AI 기능 추가 없음 (wave-436~444 = analysis page 내부 팩터 행 — 별도 라우트 X)

**Footer "도움말" 컬럼** (8 items):
- /methodology, /guide, /glossary, /v2-shadow-monitor, /accuracy/shadow, /changelog, /about, /search

### 발견된 IA 이슈

**v2-shadow-monitor stale indexing** (cycle 1771 deferred 이행):
- `/v2-shadow-monitor`: sitemap priority 0.55 (weekly) — v1.8 확정(2026-07-06) 이후 실험 결론 완료 artifact
- v2.1-B rejected (Brier 0.4635, n=52), v1.8 유지 확정 = 비교 실험 종료 상태
- 새 cohort 데이터 없음 → `changeFrequency: 'weekly'` 허위 신호 (Google crawl budget 낭비)
- robots 메타데이터 없음 → 현재 indexed (stale experiment content)
- 이전 spec (cycle 1771) "장기 유지 필요성 재검토" 31 사이클 만에 이행

**settings/page.tsx** (noindex placeholder):
- `robots: { index: false, follow: false }` 정상 설정됨
- 헤더/푸터 nav 부재 OK (placeholder, 2026-08~09 인증 layer 의존)

### 유지 판단 항목
- `/accuracy/shadow`: Shadow 적중률 = CE 비분리 시기 v2.1-B 비교용. footer-only 유지 (power user)
- Footer "도움말" `/v2-shadow-monitor` 링크: 제거 vs 유지 → **유지** (transparency 접근성, power user 직접 링크 경로)
- Header nav: 변경 없음 (리뷰·시즌 그룹 안정)

## 변경 사항

### v2-shadow-monitor/page.tsx
- `robots: { index: false }` 추가 — 결론된 실험 archive content, 검색 노출 불필요

### sitemap.ts
- `/v2-shadow-monitor` 라인 제거 — crawl budget 낭비 + stale weekly 신호 차단

### 유지 항목
- Footer "도움말" `/v2-shadow-monitor` 링크: 유지 (power user 직접 접근)
- `/accuracy/shadow`: 현상 유지

## 기대 효과
- Google crawl budget 주간 v2-shadow-monitor 낭비 제거
- Stale experiment content SEO 인덱싱 차단
- 투명성 링크(footer)는 유지 — 직접 URL 접근 가능

## 다음 cycle 후속 후보
- Footer "AI 예측" 컬럼 7 items max 경고 → 신규 AI 기능 추가 시 컬럼 분리 트리거
- `/accuracy/shadow` 장기 유지 필요성: v2.1-B era 종료 이후 방문자 0 패턴 시 footer 제거 검토
- settings/page.tsx 인증 layer 완성 시 IA 재검토 (2026-08~09 예정)

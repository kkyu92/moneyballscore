# IA checkpoint — cycle 3530 (2026-10-22)

진단: breadcrumb 누락 라우트 grep (`grep -L Breadcrumb apps/moneyball/src/app/**/page.tsx`) 이 18건 반환 — 신규 silent drift 후보로 선정, 전수 검증.

## 검증 결과 — 18건 전부 의도된 결과 (drift 0건)

1. **루트 `/` + `/settings` + `/community` + `/login`** (4건) — top-level utility/placeholder 페이지. `robots.ts` 주석에 "placeholder (색인 가치 0)" 명시, breadcrumb 불필요 계층.
2. **`debug/*` 6건** (agent-fallback/pipeline/hallucination/model-comparison/factor-correlation/silent-drift/reliability/deploy-drift) — BASIC auth 내부 대시보드, 사용자 가시 IA 범위 밖.
3. **`reviews/monthly`, `reviews/weekly`, `mlb/reviews/monthly`, `mlb/reviews/weekly`, `en/mlb/reviews/monthly`, `en/mlb/reviews/weekly`** (6건) — 전부 `redirect()` 전용 shim (`getCurrentMonth()`/`getCurrentWeek()` 계산 후 즉시 리다이렉트, UI 렌더 없음). 실제 breadcrumb 은 리다이렉트 타깃인 `[month]`/`[week]` 상세 페이지에 존재 확인(`grep -c Breadcrumb` = 2 양쪽).

추가 검증 2건:

- **Footer sitemap 컬럼** (`Footer.tsx`) — 7컬럼 46링크, cycle 2587 주석에 과거 재발 패턴(신규 라우트 추가 시 헤더/footer 동기 누락) 명시돼 있고 현재 라우트 전수와 대조 결과 누락 없음.
- **Orphan page 후보** (`/community`, `/login`, `/settings`, `/v2-shadow-monitor`) — 코드베이스 전체 grep 결과 내부 링크 0건이나, `robots.ts` 에 "placeholder" 주석 + sitemap.ts 에 v2-shadow-monitor "archive 처리" 주석으로 전부 의도된 비노출 확인. 신규 발견 아님.

## 결론

drift 0건. 코드 변경 없음, retro-only. 다음 info-architecture-review 는 gap 30-cycle 주기 또는 신규 라우트 추가 시그널 기준 권장.

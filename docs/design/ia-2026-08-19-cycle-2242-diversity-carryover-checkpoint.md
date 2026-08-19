# IA/Design 다양성 carry-over 체크포인트 (cycle 2242)

## 배경

cycle 2239/2240/2241 retro 가 연속 3회 "diversity — polish-ui 또는 info-architecture-review" 를 다음 후보로 명시 (review-code/operational-analysis dominance streak 대응). cycle 2242 가 이 carry-over 를 채택해 두 chain 모두 실측 diagnosis 진행.

## Info-architecture-review 진단 결과 — 액션 없음

- **Breadcrumb 누락 grep** (`grep -L Breadcrumb apps/moneyball/src/app/**/page.tsx`): 20건 hit. 전수 분류 결과 전부 의도된 제외 대상 — debug/* (11건, 개발용), `/reviews/weekly`·`/reviews/monthly`·`/mlb/reviews/weekly`·`/mlb/reviews/monthly` (4건, redirect-only 페이지, `ia-2026-05-08-redirect-only-routes-sitemap.md` 기존 정책 정합, 렌더 자체가 없어 breadcrumb 불필요), `/` 루트 (breadcrumb 대상 아님), `/login`·`/settings` (단일 유틸 페이지), `/community` (noindex placeholder, "박제 중" 안내만). **신규 gap 0건**.
- **sitemap.xml vs page.tsx 수 mismatch**: sitemap.ts 가 redirect-only 라우트를 의도적으로 제외하는 주석 정합 확인 — drift 없음.
- **en/mlb 미러 (11 라우트)**: 2026-06-12 (cycle ~1021 직후) 도입, Header/Footer/Breadcrumb/LanguageSwitch 전부 기존에 이미 완전히 wiring 됨 — "신규 라우트 7일 이내" 신호가 아님 (mtime 은 무관 bulk 변경으로 인한 false positive였음, 실제 생성일은 2개월 전).
- **DESIGN.md `## MLB IA` + `docs/decisions/mlb-vs-kbo-priority.md` stale lock 문서**: 어제(2026-08-18, cycle 2162 polish-ui heavy, commit `69d89f38`) 양쪽 모두 이미 실측 정정 완료 확인. 추가 drift 없음.
- **plan #24/#25/#26** (MLB matchup / MLB Elo / MLB weekly·monthly review): 3건 전부 `status: completed_*` 또는 `archived` — 활성 미처리 항목 0건. plan #26 Phase 3 dedup 후속(`analyzeFactorAccuracy` league-agnostic 화)도 cycle 2232 pearsonCorrelation dedup + cycle 2233 review-code(heavy) 감사(RETRO-ONLY, drift 0건)로 이미 부분 처리됨.

## Polish-ui 진단 결과 — 액션 없음

- DESIGN.md 최근 수정 = 2026-08-18 (어제, cycle 2162) — 4주 staleness 조건 미충족, 오히려 최근 매우 활발.
- 미해결 token/component 균열 신규 발견 0건 (사례 3 waterfall chart 색상 drift 는 이미 어제 fix됨).

## 결론

이번 diversity carry-over 는 "실제 gap 있는데 미발화" 가 아니라 "review-code(heavy)/operational-analysis(heavy) dominance 가 실제로 이 두 영역 signal 을 이미 흡수 완료한 상태" 임을 실측 확인. 사례 대응 없음 — 코드/문서 변경 0. 다음 cycle 진단은 이 checkpoint 를 재탐색 없이 신뢰하고 (30-cycle-gap 또는 신규 signal 발생 시까지) 다른 chain 우선 고려 권장.

**cycle_n**: 2242
**chain**: info-architecture-review (진단만, 액션 없음)
**outcome**: retro-only ("현 IA/디자인 충분" 확정)

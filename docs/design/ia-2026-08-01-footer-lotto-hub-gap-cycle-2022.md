# IA — Footer 로또 컬럼 `/lotto` 최상위 hub 누락 (cycle 2022)

## 진단

30-cycle gap trigger 충족 (마지막 info-architecture-review = cycle 1991, gap 31) 으로 점검 시작.

검토한 후보 신호 (대부분 false positive):
- breadcrumb 누락 grep 14건 → root page / `/debug/*` (내부 도구) / `/login /settings /community` (plan #21 noindex placeholder, 이미 추적 중) / `/reviews/monthly`, `/reviews/weekly` (redirect-only stub) — 전부 의도된 누락, cycle 1991 spec 과 동일 결론
- 최근 7일 page.tsx 변경 (debug/reliability, seasons/[year], teams/[code], matchup/[teamA]/[teamB]) → 기존 라우트 내부 컴포넌트 추가 (wave-609~613 matchup 팩터), 신규 top-level 라우트 아님 — megamenu/footer 매핑 대상 아님
- Header megamenu 대비 Footer 컬럼 parity 비교 → **불일치 발견**

**실제 발견**: `/lotto` (로또 hub, sitemap priority 0.6 weekly) 가 Header megamenu LOTTO_NAV 최상위 pill (label "이번 주 조합") 로는 존재하지만, Footer "로또" 컬럼(exhaust 책임)엔 `/lotto/methodology` + `/lotto/archive` 서브 라우트만 있고 부모 `/lotto` 자체가 빠져있었음. Header 는 top pill 자체가 `/lotto` 링크라서 문제 없지만, Footer 는 flat exhaustive list 라 부모 라우트도 명시적 항목이 필요 — cycle 1991 `/calendar` 갭 (반대 방향: Footer 有 / Header 無) 과 대칭되는 패턴.

## 조치

- `Footer.tsx`: SITEMAP_COLUMNS "로또" 컬럼에 `{ href: "/lotto", label: "이번 주 조합" }` 최상단 추가 (Header 라벨과 통일)
- ASCII wireframe 주석 갱신 (cycle 2022 표기)
- `Footer.test.tsx`: 로또 컬럼 3-link 테스트 추가 (AI 예측 컬럼 테스트와 동일 패턴)
- `docs/design/ia-hierarchy.md` 룰 2 카운트 갱신 (로또 2→3 link)

## 다음 cycle 후속 후보

- 없음 (단일 gap, 범위 작음 — cycle 1991 과 동일 규모)

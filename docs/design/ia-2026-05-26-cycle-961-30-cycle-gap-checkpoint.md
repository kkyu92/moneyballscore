# IA Checkpoint — cycle 961 (30-cycle gap, trigger 9)

- **cycle**: 961
- **date**: 2026-05-26
- **chain**: `info-architecture-review` (lite, retro-only)
- **trigger**: 9 (30-cycle gap — 마지막 fire cycle 931, gap=30)
- **outcome**: SUCCESS — silent IA drift 0건 결론

## 자연 발화 경위

cycle 931 info-arch (lite, gap=9, 4 layer audit baseline retro-only) 머지 후 30 cycle 자연 흡수 — explore-idea 다수 fire (plan #10 Tier 1 5/5 ship lotto 차원 closure / plan #11 carry-over / plan #12 TabPFN feasibility + data prep) + review-code (lite) silent drift sweep 63~68 (6 consecutive ALL CLEAN) + fix-incident family (사례 9 family 9/10/11/12번째 재발 + alert channel 9~12번째 evidence + vercel quota 4~6번째 한도 도달) 동시 진행. cycle 961 = trigger 9 (≥30 cycle gap) 자연 충족 + cycle 960 next_rec 1순위 명시.

## 직전 30 cycle (cycles 931-960) 신규 라우트 + IA evidence

직전 30 cycle 안 신규 user-visible route 박제:

1. **plan #10 Tier 1** (cycle 946) — `/lotto/archive` mix strategy 4 variant 통합 노출 (기존 noindex 라우트 확장 only, 신규 라우트 X)
2. **plan #12** (cycle 954~957) — TabPFN feasibility research 영역 (docs/research/ markdown 박제, 사용자 가시 라우트 박제 X)
3. **plan #11** (cycle 950 milestone) — skill-evolution 41회 자가 진화 (SKILL.md 갱신 only, 라우트 박제 X)

신규 user-visible route 0건 = 본 30 cycle window IA 큰 변동 X.

### cycle 900 → cycle 922 IA 정정 evidence (silent gap → 의도된 IA fix)

cycle 900 spec (`docs/design/ia-2026-05-25-cycle-900-30-cycle-gap-checkpoint.md` line 28) 박제:
- `/v2-preview` Header NAV 도움말 group 미등록 = **의도된 gap** (noindex 내부 미리보기 — N=150 도달 후 prod 적용 결정 전까지 surface signal 차단)

cycle 922 PR #1302 (`feat(ia): Header NAV 도움말 group /v2-preview link 추가 — Footer sync drift fix`) = cycle 900 정책 정정:
- Footer 도움말 column 이미 등록 (cycle 894/895 시점) = internal surface 신호 leakage 발생
- Header NAV 도움말 group 만 0 entry = mental model mismatch silent IA drift
- cycle 822 PR #1181 (/changelog) + cycle 687 PR #975 (NAV 도움말 group 첫 박제) 3 layer 정합 박제

본 정정 = **noindex meta tag 우선 (검색 색인 surface 차단 유지) + 사용자 navigation surface 정합 분리** 양쪽 channel 보호. silent IA drift 아님 = 의도된 IA fix evidence. cycle 961 checkpoint 시점 본 정정 정합 정상 상태 확인.

### Header NAV 도움말 group 카탈로그 (cycle 961 측정)

```
methodology → guide → glossary → insights → v2-preview → changelog → about
```

= Footer SITEMAP 도움말 column 순서 정합 100% (`apps/moneyball/src/components/layout/Footer.tsx:42-49` 매칭).

### Breadcrumb coverage 검증

- 총 page.tsx 40건 (apps/moneyball/src/app/, debug + api 제외 시 32건)
- Breadcrumb 미wire 10건:
  - `apps/moneyball/src/app/page.tsx` (루트 home, Breadcrumb 의도 부재 — 정당)
  - `apps/moneyball/src/app/debug/*.tsx` 7건 (BASIC auth gated dev tools, 사용자 가시 X — 정당)
  - `apps/moneyball/src/app/reviews/{monthly,weekly}/page.tsx` 2건 (`redirect()` pure, UI 렌더 X — 정당)
- 사용자 가시 라우트 Breadcrumb coverage = 100% (10건 모두 의도된 동작)

### sitemap.ts vs robots.ts 정합 검증

- sitemap.ts URL entries 35건 (정적 + 동적 entry generator)
- 노출 차단 라우트: `/debug` + `/api` + `/search` + `/lotto` + `/lotto/archive` + `/v2-preview` (noindex)
- 노출 차단 라우트 모두 sitemap.ts 미등록 + robots.ts Disallow rule 정합 ✓
- `/lotto` 4 layer Disallow (Googlebot + Mediapartners-Google + AdsBot-Google + default user-agent) = AdSense 심사 5개월 투자 보호 정책 유지

### Header NAV description 통일 carry-over 재평가

ia-2026-05-21-changelog-header-nav.md "다음 cycle 후속 후보" 안 "Header NAV 그룹 description 통일 — `예측 방법론·10팩터·AI 토론` 패턴 vs `v1.8 모델·10팩터·AI 토론` 패턴 mix" 항목 측정:

```
/methodology description: "v1.8 모델·10팩터·AI 토론"
```

= 본 entry 만 model version 명시. v2.0 도입 시 stale 위험. carry-over 미해소 5 cycle 경과 (cycle 822 → cycle 961). 단 `v1.8` 자체가 사용자 가시 정체성 (v1.8 = 현재 prod 모델 버전) → 단순 stale 아닌 정책 신호. info-arch lite scope 외 — 사용자 자율 결정 carry-over 유지.

## 자가 검증 rubric (cycle 887 plan #8 패턴 정합)

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  baseline_silent_drift_count: 0
  baseline_breadcrumb_coverage: 100%
  baseline_header_footer_sync: 100%
  carry_over_unresolved_count: 3
  carry_over_categories:
    - 헤더 메가메뉴 본격 전환 (별 cycle scope)
    - /reviews 중복 등록 mental model 결정 (사용자 자율)
    - Header NAV description mix 통일 (사용자 자율)
  scope: lite retro-only (단일 surgical fix 후보 0건)
```

| 축 | 평가 |
|---|---|
| 가치 | low (silent drift 0건, surgical fix 후보 0건) |
| 시간 비용 | small (lite checkpoint retro-only) |
| risk | 0 (검증만, 코드 변경 X) |
| 자율 가능 | yes (본 메인 자율 영역 완료) |
| 의존성 | none |

= **Tier 1** (small + light, 즉시 fire, 본 plan scope 외 retro-only baseline 박제).

## 다음 cycle 후속 후보

- **자연 trigger** 자연 발화 시점:
  - 라우트 신규 추가 ≥3 / 7일
  - breadcrumb 누락 grep
  - 사용자 navigation 발화
  - 카테고리 hub 진입 path 약함 (Header / Footer mismatch)
  - 신규 routing depth ≥3 / 1 cycle
  - explore-idea ≥5회 + info-arch 0회 / 12 cycle
  - docs/design/ia-*.md 미처리 ≥ 20 cycle (3 carry-over 미해소 위 list)
  - 라우트 IA 자연 변동 detection
- **trigger 9 주기 보정** (≥30 cycle gap) 다음 자연 시점 = 약 cycle 991

## R5 evidence

- cycle 900 → cycle 922 IA 정정 evidence (silent gap 아님 = 의도된 IA fix) 박제
- cycle 931 → cycle 961 30-cycle 자연 흡수 evidence — explore-idea (plan #10/#11/#12 fire) + review-code (sweep 63~68 6 consecutive ALL CLEAN) + fix-incident (사례 9 family 9~12번째 재발 + alert channel 9~12번째 evidence) 다층 dominance 안에서도 IA layer silent drift 0건 유지
- silent drift family detection channel (review-code lite) 가 IA layer 영향 0 = 운영 코드 silent drift family 와 IA drift family 독립 layer 확인

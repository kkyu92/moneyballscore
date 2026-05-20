# cycle 788 info-architecture-review — 30-cycle gap 정기 점검 (lite, retro-only)

- **mode**: lite (retro-only)
- **trigger**: info-architecture-review trigger 9 (마지막 발화 cycle 758 → 788 = 정확 30-cycle gap, 자체 trigger fire 보장)
- **carry-over**: cycle 787 next_rec 3택 (explore-idea v12-E/F/G / op-analysis v1.8 n=35+ / fix-incident gap=19) 중 trigger 9 명시 우선 박제
- **결과**: IA 큰 문제 부재 → retro-only success

## 진단 결과

### breadcrumb 누락 라우트 8개 — 모두 의도된 부재

```
apps/moneyball/src/app/debug/factor-correlation/page.tsx    (admin BASIC auth)
apps/moneyball/src/app/debug/model-comparison/page.tsx      (admin BASIC auth)
apps/moneyball/src/app/debug/hallucination/page.tsx         (admin BASIC auth)
apps/moneyball/src/app/debug/reliability/page.tsx           (admin BASIC auth)
apps/moneyball/src/app/debug/pipeline/page.tsx              (admin BASIC auth)
apps/moneyball/src/app/reviews/monthly/page.tsx             (redirect-only — getCurrentMonth → /reviews/monthly/[monthId])
apps/moneyball/src/app/reviews/weekly/page.tsx              (redirect-only — getCurrentWeek → /reviews/weekly/[weekId])
apps/moneyball/src/app/page.tsx                             (top-level 홈)
```

추가 Breadcrumb 박제 가치 X — admin 영역 + redirect index + 홈 top-level 모두 사용자 UI Breadcrumb 노출 의미 X.

### Header NAV vs Footer 정합 — cycle 686 박제 reflect

| 그룹 | Header | Footer |
|---|---|---|
| top-level | 오늘 / 순위 / 예측 기록 (flat 3) | AI 예측 컬럼 안 (오늘 경기 / 예측 기록) + 팀·선수 컬럼 안 (팀 순위) — 그룹화 |
| AI | analysis / accuracy / dashboard (3) | + 오늘 경기 / 예측 기록 = 5 |
| 커뮤니티 | picks / leaderboard (2) | picks / leaderboard (2) |
| 팀·선수 | teams / players / matchup (3) | + standings = 4 |
| 리뷰·시즌 | reviews / weekly / monthly / misses / seasons (5) | 동일 (5) |
| 도움말 | methodology / guide / glossary / about (4) | + search = 5 |

mental model 정합. Footer 가 더 풍부 (전체 sitemap), Header = 핵심 NAV — 의도된 차이.

### sitemap.ts coverage — v11-F IndexNow ship 박제 후 모니터링

- 176 line / ~1500 URL 박제 (cycle 772 IndexNow 50 batch \* 30)
- 각 URL priority/changeFreq 직관 박제. Google Search Console 색인 자연 모니터 (사용자 영역)
- v12-F (sitemap priority audit) 후보 = 잔여 carry-over

### 카테고리 hub 진입 path — Header 메가메뉴 + Footer 5 컬럼

- Header 메가메뉴 5 그룹 (AI / 커뮤니티 / 팀·선수 / 리뷰·시즌 / 도움말) + top-level 3 = 8 entry. 균형 OK
- Footer SITEMAP 5 컬럼 (위 동일 + search). 균형 OK
- cycle 686 → 754 동안 IA spec 11건 박제 — saturation pattern 진입. 본 cycle gap=30 정기 점검 = 정상 closure

## 다음 cycle 후속 후보

본 lite gap=30 정기 점검 = 큰 IA 문제 부재 박제. 다음 IA fire trigger:
- 신규 라우트 ≥3 / 7일 또는 breadcrumb 누락 신규 발견 시 자연
- 그 외 = 30-cycle gap 자체 trigger 다음 cycle 818 자연 fire
- v12-F (sitemap priority audit) = explore-idea heavy 후속 후보 (별도 chain)

## 박제 의의

trigger 9 (30-cycle gap) lite 자체 trigger 정상 fire — info-architecture-review 가 영구 opt-out chain (cycle 278 박제) 으로 trigger 5 skill-evolution 평가 제외되지만 자체 trigger 9 가 fire 보장. cycle 758 (footer matchup realign) 이후 30 사이클 동안 review-code (8) + explore-idea (6) + op-analysis (3) + skill-evolution (2) + fix-incident (1) 누적 — IA 영역 의도된 0회 휴면 후 자연 점검. 메타 패턴 cycle 778 v12 inventory series 등 다른 chain 흐름 흡수.

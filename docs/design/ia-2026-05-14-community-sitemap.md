# IA — 커뮤니티 그룹 hub sitemap 누락 보강

cycle 376 / 2026-05-14 / chain `info-architecture-review`

## 진단 evidence

| trigger | 측정 결과 |
|---|---|
| (1) 라우트 신규 추가 ≥3 / 1주 | 7일 안 신규 page.tsx 15개 ✅ |
| (5) sitemap.xml URL 수 vs page.tsx 수 mismatch | `/picks` / `/leaderboard` 누락 ✅ |
| cycle 375 next_rec | "explore-idea or info-architecture-review (review-code heavy streak 자연 break)" ✅ |
| (9) 마지막 info-arch ≥ 30 사이클 미발화 | 마지막 cycle 350 → 26 사이클 (4 cycle 부족) — 미충족 |

## 현재 문제

cycle 321~329 (픽 리더보드 + 커뮤니티 픽 기능 추가) + cycle 330 (NAV 커뮤니티 그룹 분리) 이후:

- Header NAV "커뮤니티▾" 그룹: `/picks` (내 픽 기록) + `/leaderboard` (픽 리더보드)
- Footer SITEMAP_COLUMNS "커뮤니티" 컬럼: 동일 2개 hub
- 실제 page.tsx 존재: `apps/moneyball/src/app/picks/page.tsx` + `apps/moneyball/src/app/leaderboard/page.tsx`
- **그러나 `apps/moneyball/src/app/sitemap.ts` staticRoutes 에 두 hub 모두 부재**

결과: Google 인덱싱 누락 → 검색 노출 0건 → 커뮤니티 그룹 콘텐츠 SEO 가치 사실상 0.

## 수정

`apps/moneyball/src/app/sitemap.ts` staticRoutes 마지막 줄에 2건 추가:

```ts
{ url: `${baseUrl}/picks`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
{ url: `${baseUrl}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
```

priority 0.7 = `/players` / `/teams` / `/matchup` (사용자 가시 hub) 동일.
changeFrequency 'daily' = 사용자 픽 + 리더보드 매일 갱신.

## 검증

- `pnpm type-check`: PASS 필요
- `pnpm test`: 기존 테스트 영향 X (sitemap 단순 staticRoutes 추가)
- 빌드 후 `/sitemap.xml` 응답에 `/picks` + `/leaderboard` 박제 확인 (수동 검증)

## 다음 cycle 후속 후보

- Google Search Console 에서 두 URL 인덱싱 요청 수동 fire (사용자 영역)
- 커뮤니티 그룹 hub robots.txt 노출 / 검색 결과 시점 모니터
- `/picks/[userId]` 또는 `/leaderboard/[period]` 동적 라우트 추가 시 sitemap 동기 갱신

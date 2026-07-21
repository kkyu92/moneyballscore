# IA Review: /teams/[code]/recent sitemap 누락 수정 (cycle 1959)

**cycle**: 1959
**date**: 2026-07-21
**trigger**: trigger 1 (10개 신규 라우트 7일 내) + trigger 9 (30-cycle gap, 1929→1959)

## 진단

### 신규 라우트 7일 내 (10개) IA 통합 상태

| 라우트 | header nav | footer | sitemap | breadcrumb |
|---|---|---|---|---|
| /calendar | ❌ | ✅ AI 예측 | ✅ | ✅ |
| /analysis/game/[id] | via /analysis | via /analysis | ✅ dynamic | ✅ |
| /analysis | ✅ 예측·기록 | ✅ | ✅ | ✅ |
| /v2-shadow-monitor | ❌ (noindex) | ❌ (cycle 1929 제거) | ❌ (cycle 1802 제거) | — |
| /matchup/[teamA]/[teamB] | via /matchup | via /matchup | ✅ allPairs() | ✅ |
| /standings | ✅ 팀·선수 | ✅ | ✅ | ✅ |
| /accuracy | ✅ 예측·기록 | ✅ | ✅ | ✅ |
| /search | mobile icon | ✅ 도움말 | ✅ | ✅ |
| /teams/[code] | via /teams | via /teams | ✅ teamProfileRoutes | ✅ |
| /teams/[code]/recent | via /teams/[code] | via /teams/[code] | **❌ 미포함** | ✅ |

### 발견된 IA 이슈

**`/teams/[code]/recent` sitemap 미포함** (10 URLs, KBO 10구단):
- `/teams/[code]` 는 `teamProfileRoutes` 로 sitemap 포함
- `/teams/[code]/recent` 는 별도 route (generateStaticParams 로 10개 정적 생성) — sitemap 미포함
- 공개 페이지 + 팀별 최근 N경기 예측 실적 = SEO 가치 있음 (팀명 + "최근 경기" 검색 시 진입 가능)
- 브레드크럼 정상 (Home → 팀 → [팀명] → 최근 N경기)

### 유지 판단 항목 (변경 없음)

- Header nav 구조: 5 group 균형 유지 — /calendar, /search 는 footer 전담 (depth 2+ 탐색 보조)
- Footer 컬럼 7개 (cycle 1929 이후 안정): AI 예측 / 커뮤니티 / 팀·선수 / 리뷰·시즌 / 도움말 / MLB / 로또
- /analysis/game/[id] → /analysis hub discovery 정상 (wave-581 링크 확인)
- Breadcrumb: 10개 신규 라우트 모두 정상

## 변경 사항

### apps/moneyball/src/app/sitemap.ts

`teamRecentRoutes` 배열 추가 — KBO_TEAMS 순회, `/teams/${code}/recent` 10 URL.

- priority: 0.6 (팀 프로필 0.65보다 낮음 — 하위 상세 페이지)
- changeFrequency: 'weekly' (팀별 최근 경기 데이터는 경기 있을 때 갱신)
- lastModified: now

## 기대 효과

- Google Search Console 인덱싱 10 URL 추가
- "KBO [팀명] 최근 경기 예측" 검색 진입 가능
- sitemap.ts ↔ page.tsx 정합 유지 (팀 프로필 + 팀 최근 경기 세트)

## 다음 cycle 후속 후보

- Footer "AI 예측" 컬럼 7 items 안정 유지 (8개 도달 시 분리 재검토)
- /search 데스크탑 nav 아이콘 추가 고려 (현재 모바일 전용)

# cycle 798 explore-idea v13 — v12 시리즈 종결 후 redirect source v4 인벤토리

- **mode**: lite (spec write only, retro-only / partial outcome)
- **carry-over**: cycle 796 v12 series 7/7 종결 (A root OG #1111 / B PWA manifest #1113 / C dynamic OG 5 hub #1115 / D Person+SportsTeam schema #1117 / G Web Vitals #1119 / E viewport theme-color #1121 / F sitemap audit #1161). cycle 778 v12 spec 후속 완료
- **chain reason**: cycle 797 next_rec 1순위 explore-idea v13 신규 inventory series. v12 spec carry-over 패턴 (1 cycle spec write + 후속 N cycle ship) 정합. lite = spec write only (auto-fire `/office-hours` AskUserQuestion hang 회피, cycle 778 패턴 정합)
- **v12 결과**: redirect source 7 ship 직결 (PR #1111/#1113/#1115/#1117/#1119/#1121/#1161). v11 4 ship 대비 +75% saturation. v12 = SEO / PWA / Schema enrichment / observability / mobile UX 인프라 중심
- **v13 자연 redirect**: 사용자 가시 UX 강화 + 접근성 + 코드 부채 해소 (v12 인프라 vs v13 UX/A11y/DRY)

## v12 series outcome 박제

| Spec | Ship | PR | Phase 가치 |
|---|---|---|---|
| v12-A root OG | ✓ | #1111 | 소셜 공유 rich preview (default 전역) |
| v12-B PWA manifest | ✓ | #1113 | 모바일 install + Lighthouse PWA 0→9+ |
| v12-C dynamic OG 5 hub | ✓ | #1115 | hub specific rich preview (5/38) |
| v12-D Person/SportsTeam schema | ✓ | #1117 | Google Knowledge Graph rich entity |
| v12-G Web Vitals 2 파일 | ✓ | #1119 | Sentry breadcrumb + GA4 distribution (3채널) |
| v12-E viewport theme-color | ✓ | #1121 | 모바일 browser chrome 브랜드 컬러 |
| v12-F sitemap priority audit | ✓ | #1161 | 직관 → 측정 priority 전환 8 route tune |

ship 7/7 closure. v12 spec 7 후보 모두 처리.

## v13 신규 redirect source 인벤토리 (사용자 가시 UX / A11y / DRY 중심)

### 후보 A — Segment-level `not-found.tsx` coverage 확장

- **현황 측정**: `find apps/moneyball/src/app -name not-found.tsx` = 1 file (root only). 36/37 라우트 segment-level not-found.tsx 부재. `players/[id]` / `teams/[code]` / `analysis/game/[id]` / `predictions/[date]` / `reviews/weekly/[week]` / `reviews/monthly/[month]` / `seasons/[year]` 7 dynamic 라우트 = 404 시 root not-found.tsx 폴백 (context 없음)
- **scope**: dynamic 라우트 5~7개에 segment-level `not-found.tsx` 박제. 각 라우트의 도메인 컨텍스트 (예: `teams/[code]/not-found.tsx` = "팀 코드를 찾을 수 없음 + KBO 10팀 link list" / `players/[id]/not-found.tsx` = "선수 ID 찾을 수 없음 + 팀별 선수단 link" / `analysis/game/[id]/not-found.tsx` = "경기 ID 부재 + 최근 7일 경기 list"). DESIGN.md brand 정합 + 메인 UX 일관
- **ROI**: 중상 — AdSense 심사 phase UX trust 신호 (404 페이지도 컨텍스트 풍부 = 콘텐츠 신뢰) + 사용자 retention (잘못된 URL 도 가치 있는 link 노출)
- **diff**: 5~7 신규 파일 = 5~7 파일
- **measurement**: Google Search Console "Page indexing - Not found (404)" 분포 + Sentry 404 발생 후 bounce 비율 (referer back X = retention)
- **fire mode**: heavy (1 cycle ship)

### 후보 B — 사용자 가시 `/changelog` 페이지

- **현황 측정**: `apps/moneyball/src/app/changelog/` 부재. `CHANGELOG.md` = 1805 line (cycle 516 W22 마감 노트부터 cycle 651 phase 까지 풍부 콘텐츠). 사용자 가시 changelog 진입 path 0
- **scope**: `apps/moneyball/src/app/changelog/page.tsx` 신규 — CHANGELOG.md fs.readFile + remark/markdown render OR 직접 hardcode mirror. SoftwareSourceCode JSON-LD 또는 Article schema 박제. Header / Footer 진입 path 추가 (Footer "도움말" 컬럼)
- **ROI**: 중상 — AdSense 심사 phase trust 신호 (transparent change history) + LLM scraper context (모델 진화 narrative) + power user 가치
- **diff**: 1 신규 페이지 + Footer 수정 = 2 파일
- **measurement**: 사용자 자연 발화 / Vercel Analytics /changelog 진입 비율
- **fire mode**: heavy (1 cycle ship)

### 후보 C — Shared `<ChipFilter>` DRY refactor (20 components 통합)

- **현황 측정**: 20 chip filter/sort 컴포넌트 박제 (saturation v3~v7 누적 — 본 디렉토리 `find apps/moneyball/src/components -name "*Filter.tsx" -o -name "*SortControl.tsx"` 출력). 각 컴포넌트 80~166 line / localStorage key / useSyncExternalStore / 인라인 `<style>` data-attr 패턴 동일. 코드 중복 ≈ 2000 line. 신규 chip 추가 시 80 line 보일러플레이트 의무
- **scope**: `apps/moneyball/src/components/shared/ChipFilter.tsx` 신규 — generic prop (`chips: {value, label, count?, disabled?}[]` / `storageKey` / `attrName` / `attrSelector`) + localStorage / useSyncExternalStore / inline style 박제 통합. 20 컴포넌트 중 5~7개 시범 migration (1 cycle scope). 나머지 cycle 800+ 후속
- **ROI**: 중 — 코드 부채 해소 + 신규 chip 박제 시 1 줄 추가 (80 line → 5 line). 단 ship 직후 가시 가치 ↓ (사용자 invisible 리팩터)
- **diff**: 1 신규 shared + 5~7 컴포넌트 migration = 6~8 파일
- **measurement**: lint output (코드 중복 metric) + 신규 chip 박제 시간 비교
- **fire mode**: heavy (1 cycle ship 5~7 migration / 잔여 후속 cycle)

### 후보 D — Table `scope=col` / `<caption>` A11y audit

- **현황 측정**: `grep "scope=" apps/moneyball/src --include="*.tsx"` = **0 files**. table semantic markup 박제 X. leaderboard / standings / reviews/monthly / seasons/[year] 등 다수 table-like 컴포넌트 (div grid 또는 raw <table>) 박제. WCAG 1.3.1 (Info and Relationships) 미충족
- **scope**: 실제 `<table>` 박제 위치 grep (`grep -rln "<table" apps/moneyball/src --include="*.tsx"`) → scope="col" / `<caption>` (visually-hidden) / aria-rowcount 박제. div grid 박제 위치 = ARIA grid role 검토 (대안 = `role="table"` + `role="row"` + `role="columnheader"`). 5~10 file 자연 scope
- **ROI**: 중 — AdSense 심사 phase A11y trust + 스크린리더 사용자 + WCAG AA 박제
- **diff**: 5~10 파일 수정
- **measurement**: axe-core CI 통과 항목 수 (CI 신규 박제 필요) + Lighthouse Accessibility score before/after
- **fire mode**: heavy (1 cycle ship)

### 후보 E — Hub 라우트 "Last updated" data freshness badge

- **현황 측정**: `grep "마지막 갱신\|Last updated\|갱신:" apps/moneyball/src --include="*.tsx"` = accuracy/page.tsx 1 file only. methodology / guide / about / glossary / predictions / leaderboard / dashboard / analysis / reviews / seasons hub 모두 부재. 사용자가 데이터 신선도 판단 path X
- **scope**: 5~10 hub 라우트에 `<DataFreshnessBadge>` 신규 컴포넌트 박제 — Server Component (DB select `max(updated_at)` 또는 build time mtime). 라우트별 source (예: methodology = `git log -1 --format=%ci -- apps/moneyball/src/app/methodology/page.tsx` build-time / leaderboard = DB max(updated_at)). KST timezone 표기
- **ROI**: 중 — AdSense 심사 phase data trust + 사용자 retention (재방문 시 신선도 신호) + LLM scraper context
- **diff**: 1 신규 컴포넌트 + 5~10 라우트 wire = 6~11 파일
- **measurement**: 사용자 자연 발화 + Vercel Analytics 재방문율 (long-term)
- **fire mode**: heavy (1 cycle ship)

### 후보 F — RSS / Atom `<head>` alternates wire

- **현황 측정**: `apps/moneyball/src/app/feed/route.ts` = 161 line + cycle 149 silent drift family detection 박제됨 (RSS feed 정상 작동). 단 `apps/moneyball/src/app/layout.tsx` metadata 에 `alternates.types['application/rss+xml']` 미박제 → 브라우저 RSS auto-discovery X + Google News Crawler 자연 발견 path 약함
- **scope**: `apps/moneyball/src/app/layout.tsx` metadata.alternates.types 추가 — `{'application/rss+xml': 'https://moneyballscore.vercel.app/feed'}`. (선택) Atom 변형 `/feed/atom` 신규 route + types 양쪽 박제
- **ROI**: 저~중 — Google News inclusion 잠재 + RSS reader auto-discovery + AdSense 심사 phase content channel diversity. 단 ship 직후 가시 가치 ↓
- **diff**: layout.tsx 수정 1 파일 (Atom 추가 시 +1 route)
- **measurement**: Google News crawler 박제 (Search Console) + RSS reader discovery (간접 측정)
- **fire mode**: lite ship

### 후보 G — Sitemap split (sitemap-news.xml / sitemap-images.xml)

- **현황 측정**: `apps/moneyball/src/app/sitemap.ts` = 176 line / ~1500 URL (cycle 796 priority audit 박제 완료). 단일 sitemap.xml — Google News sitemap protocol (`<news:news>` namespace) 미박제 + image sitemap (`<image:image>`) 미박제. 신규 콘텐츠 (매일 5 경기 예측) 의 Google News 인덱싱 path 약함
- **scope**: Next.js 16 multi-sitemap 패턴 (App Router `sitemap.ts` array export 또는 `sitemap/[id].ts` dynamic generation) — main / news (최근 7일 예측) / images (player/team logos + OG images) 분리. 단 google-news.xml protocol 은 News Publisher Center 승인 필요 (AdSense 심사 phase 와 별개) → 검토 후 분리만 박제
- **ROI**: 중 — Google News crawler 직접 path + image search 박제 + 큰 sitemap 의 indexing 속도 개선. 단 News Publisher 승인 미박제 시 부분 가치
- **diff**: sitemap.ts → multi-export refactor + 2~3 신규 sitemap = 3~4 파일
- **measurement**: Google Search Console sitemap submission 결과 + image search 결과 분포
- **fire mode**: heavy (1 cycle ship)

## ROI ranking (메인 자율 평가)

1. **A (segment-level not-found.tsx)** — 가장 큰 UX 갭 (36/37 라우트 missing) + AdSense 심사 phase trust + dynamic 라우트 컨텍스트 풍부 = 최대 ROI. **다음 cycle heavy fire 1순위**
2. **B (사용자 가시 /changelog)** — CHANGELOG.md 1805 line 풍부 콘텐츠 + AdSense 심사 phase trust + LLM context. scope 명확 (1 페이지)
3. **E (Last updated badge)** — 데이터 신선도 신호 + 재방문 retention. scope 약간 큼 (6~11 파일)
4. **D (table scope a11y)** — WCAG AA 박제 + AdSense 심사 phase A11y trust. scope 5~10 파일
5. **C (shared ChipFilter DRY)** — 코드 부채 해소 + 신규 chip 박제 시간 단축. 단 사용자 invisible
6. **F (RSS alternates)** — Google News path 보조 + 매우 작은 scope (1 파일). lite fire 패턴 정합
7. **G (sitemap split)** — Google News protocol 미박제 시 부분 가치. News Publisher 승인 선결

## 다음 cycle 후속 후보

- **다음 explore-idea heavy fire**: 후보 A (segment-level not-found.tsx) — UX 갭 + scope 명확
- **다음 explore-idea lite fire**: 후보 F (RSS alternates layout.tsx 수정 1 파일)
- **carry-over deferred**: 후보 B/C/D/E/G — A 박제 후 재평가

## 비고

- v12 = SEO/PWA/observability/mobile UX 인프라 중심 (silent / 사용자 부재 가치)
- v13 = 사용자 가시 UX + A11y + DRY 코드 부채 (사용자 가시 가치 + AdSense 심사 phase A11y/trust)
- 자연 진화 — 인프라 → 사용자 가시 단계 transition
- AdSense 심사 phase (cycle 651 phase 진행 중) 보조 가치 지속
- 후보 A~F = scope 1~11 파일 = 1 cycle heavy fire 가능
- 후보 G = News Publisher 승인 검토 (사용자 결정 영역) — heavy fire 전 carry-over 보고

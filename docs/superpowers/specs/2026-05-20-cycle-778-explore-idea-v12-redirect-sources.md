# cycle 778 explore-idea v12 — v11 시리즈 종결 후 redirect source v3 인벤토리

- **mode**: lite (spec write only, retro-only)
- **carry-over**: cycle 762 v11 종결 (A/B/C/F ship — JSON-LD coverage / TOC / RelatedLinks / IndexNow). D (hover/focus polish — polish-ui chain redirect 가능, cooldown N=15 cycle 778~792) / E (sticky CTA picks — cohort < 5 noise 위험) deferred
- **chain reason**: cycle 777 next_rec 2순위 explore-idea v12 신규 inventory. v11 D blocked + E noise → 신규 source scout 필요. lite = spec write only (auto-fire `/office-hours` AskUserQuestion hang 회피)
- **v11 결과**: redirect source 4 ship 직결 (PR #1096/1097/1099/1103+1105) + chain pool 신규 chain (lotto) 박제 1건

## v11 series outcome 박제

| Saturation | Ship | Cohort |
|---|---|---|
| v3~v7 (cycle 679~733) | 12 chip components | 12 ship |
| v8/v9 (cycle 738/746) | audit 0건 | 0 ship |
| v10 (cycle 752~759) | loading skeleton / glossary inline / EmptyState shared | 3 ship (A/B/D), C/E deferred |
| **v11 (cycle 762~772)** | **JSON-LD coverage (5 routes) / TOC sidebar (5 routes) / RelatedLinks (4 routes) / IndexNow ping infra** | **4 ship (A/B/C/F), D/E deferred** |

총 23 ship 누적 (16 chip + 3 non-chip v10 + 4 non-chip v11). chip pattern 한계 cement + non-chip pattern 자연 확장 검증.

## v12 신규 redirect source 인벤토리 (non-chip / non-saturated)

### 후보 A — 앱 전역 static OG image (root opengraph-image.tsx)

- **현황 측정**: `apps/moneyball/src/app/layout.tsx:48` openGraph 메타 박제 — `type: "website"` + `locale: "ko_KR"` + `siteName` + `title` + `description` 만. **`images` 필드 부재**. `apps/moneyball/public/og*` 파일 0개. Twitter `card: "summary_large_image"` 박제됐으나 image 부재 → 소셜 공유 시 이미지 미노출 (Twitter 카드 폴백 = 도메인 plain text)
- **scope**: `apps/moneyball/src/app/opengraph-image.tsx` (Next.js 16 File Convention) 신규 — `ImageResponse` 사용 dynamic 1200x630 generation. 로고 + "MoneyBall Score" + tagline "세이버메트릭스 기반 KBO 승부예측" + DESIGN.md brand color. Twitter `twitter-image.tsx` 같이 박제
- **ROI**: 상 — 소셜 공유 클릭률 + AdSense 콘텐츠 신뢰성 (Open Graph rich preview) + Google Knowledge Graph 잠재
- **diff**: 신규 파일 2 (opengraph-image.tsx + twitter-image.tsx) = 2 파일
- **measurement**: Vercel Analytics referrer = social platforms (twitter/facebook/kakaotalk) before/after + 소셜 카드 rich preview 박제 (twitter dev / facebook debugger)
- **fire mode**: heavy (1 cycle ship)

### 후보 B — PWA manifest (apps/moneyball/src/app/manifest.ts)

- **현황 측정**: `apps/moneyball/src/app/manifest*` 부재 (`find` 결과 0건). `apps/moneyball/public/manifest*` 부재. mobile "add to homescreen" / Chrome PWA install prompt 불가. Lighthouse PWA score 미측정 (manifest 부재 = 자동 0점)
- **scope**: Next.js 16 File Convention `manifest.ts` — `MetadataRoute.Manifest` 타입. name / short_name / description / start_url / display: 'standalone' / background_color / theme_color (DESIGN.md brand color) / icons (192x192 + 512x512). `apple-icon.tsx` (180x180) + `icon.tsx` (32x32) 동반 박제
- **ROI**: 중상 — 모바일 사용자 PWA 설치 = 재방문 정점 (push 알림 잠재 + 오프라인 모드 잠재). Lighthouse PWA score 9+ 달성
- **diff**: 신규 파일 3 (manifest.ts + icon.tsx + apple-icon.tsx) = 3 파일
- **measurement**: Lighthouse PWA score before/after + Vercel Analytics returning users 비율 + PWA install events (manual 측정)
- **fire mode**: heavy (1 cycle ship)

### 후보 C — Dynamic OG image expansion (5+ hub routes)

- **현황 측정**: `find -name opengraph-image*` = 2 routes only (`analysis/game/[id]` / `predictions/[date]`). coverage 2/37 = 5.4%. Hub 라우트 (`about` / `methodology` / `guide` / `leaderboard` / `glossary` / `accuracy`) 모두 root OG fallback (후보 A 박제 후 root). 단 hub 별 specific OG = 소셜 공유 클릭률 추가 lift
- **scope**: 5~10 hub 라우트에 `opengraph-image.tsx` 박제. 각 hub 의 핵심 metric (e.g., `accuracy` = 적중률 %, `leaderboard` = 누적 top picker count, `methodology` = v1.8 모델 ver) ImageResponse 동적 렌더링
- **ROI**: 중 — 후보 A 박제 후 추가 lift (감소 ROI). hub 별 specific OG = 직접 link 공유 시 가치
- **diff**: 5~10 신규 파일 (1 cycle 당 5 라우트 = 5 파일)
- **measurement**: 후보 A 와 동일 + hub 별 referrer breakdown
- **fire mode**: heavy (1 cycle ship per 5 routes)
- **선결 조건**: 후보 A 박제 후 발화 권장 (root fallback 먼저)

### 후보 D — schema.org Person/SportsTeam coverage extension (players/teams hub)

- **현황 측정**: `grep -rln "Person\|SportsTeam\|SportsEvent"` = 7 routes 박제 (analysis/game/[id] / matchup/[teamA]/[teamB] / players hub / players/[id] / teams hub / teams/[code] / predictions/[date]). cycle 764 v11 A JSON-LD coverage 확장 시 hub 5 라우트 박제됨. 단 detail 페이지 Person/SportsTeam schema 의 **alumniOf / memberOf / member relationship** 미박제 — Google Knowledge Graph rich entity 잠재 미활용
- **scope**: `players/[id]` Person schema 에 `memberOf` (소속팀 SportsTeam) + `birthDate` + `nationality` 추가. `teams/[code]` SportsTeam schema 에 `member` (선수 Person[]) + `coach` (Person) + `sport: "Baseball"` 명시 추가. cycle 764 ItemList 박제와 연결
- **ROI**: 중 — SEO rich entity (Google Knowledge Graph) + LLM scraper context 보강
- **diff**: 2 라우트 수정 = 2 파일
- **measurement**: Google Search Console rich result `Person` / `SportsTeam` 박제 횟수 before/after + schema.org validator 통과 항목 수
- **fire mode**: heavy (1 cycle ship)

### 후보 E — viewport theme-color + dark mode meta

- **현황 측정**: `grep "viewport\|themeColor"` apps/moneyball/src/app/layout.tsx — viewport / themeColor 미박제. iOS Safari 상단 상태 bar / Android Chrome 주소 bar = 기본 흰색 (DESIGN.md brand color 미반영). dark mode toggle 박제됐으나 theme-color meta 동적 X
- **scope**: `apps/moneyball/src/app/layout.tsx` `export const viewport: Viewport` 박제 — themeColor = light/dark 분기 (DESIGN.md brand color light = `#1a1a1a` dark mode = `#ffffff` 또는 brand). Next.js 16 `Viewport` 타입.
- **ROI**: 저~중 — 모바일 브라우저 UX 일관성 향상 (브랜드 visibility)
- **diff**: layout.tsx 수정 = 1 파일
- **measurement**: 사용자 자연 발화 / 모바일 스크린샷 비교
- **fire mode**: lite ship

### 후보 F — Sitemap priority audit + tune (176 line / ~1500 URLs)

- **현황 측정**: `wc -l apps/moneyball/src/app/sitemap.ts` = 176 line. URL ~1500개 박제 추정 (cycle 772 IndexNow 50 batch \* 30 = ~1500). priority 분포 audit 안 됨 — hub 0.6 / detail 0.5 / archive 0.3 등 직관 박제만. Google Search Console index coverage 자연 신호 확인 안 됨
- **scope**: sitemap.ts read → priority 분포 audit (hub vs detail vs archive 비율) → tune (예: 핵심 hub (predictions/accuracy/methodology) 0.9 강화, 오래된 archive 0.3 약화). lastModified 정확성 검증 (cron 갱신 path)
- **ROI**: 중 — Google index coverage 우선순위 신호 보강 (AdSense 심사 phase ROI 잠재)
- **diff**: sitemap.ts 1 파일 수정 + (선택) admin debug page 1 추가
- **measurement**: Google Search Console "Pages" 색인 분포 + priority signal 반영 자연 관찰
- **fire mode**: heavy audit + lite ship 분리

### 후보 G — Web Vitals tracking (analytics integration)

- **현황 측정**: Sentry SDK v10 박제 (`apps/moneyball/instrumentation*.ts`). 단 Web Vitals (LCP / FID / CLS / INP) 수집 path X — Vercel Analytics 기본 이외 추가 측정 안 됨. /accuracy 같은 데이터 dashboard 라우트 LCP 문제 잠재 (SVG + tables = 800ms+)
- **scope**: `apps/moneyball/instrumentation-client.ts` 또는 신규 `app/_components/WebVitalsReporter.tsx` 박제 — `useReportWebVitals` hook (Next.js 16 built-in) → Sentry breadcrumb 또는 Vercel Analytics custom event 전송
- **ROI**: 중 — performance regression 자연 감지 (v2.0 모델 통합 후 인프라 부하 증가 대비)
- **diff**: 신규 컴포넌트 1 + layout.tsx wire = 2 파일
- **measurement**: Vercel Analytics Web Vitals chart + Sentry performance breadcrumb 누적
- **fire mode**: heavy (1 cycle ship)

## ROI ranking (메인 자율 평가)

1. **A (root OG image)** — 가장 큰 social/SEO 갭 + scope 최소 (2 파일). 다음 cycle 자연 fire 1순위
2. **B (PWA manifest)** — Lighthouse PWA score lift + 모바일 PWA install 잠재
3. **C (dynamic OG expansion)** — A 박제 후 자연 후속
4. **D (Person/SportsTeam schema)** — Google Knowledge Graph rich entity
5. **G (Web Vitals)** — v2.0 phase 대비 성능 측정 인프라
6. **F (sitemap priority)** — 직관 박제 → 측정 박제 전환
7. **E (viewport theme-color)** — micro polish

## 다음 cycle 후속 후보

- **다음 explore-idea heavy fire**: 후보 A (root OG image) — scope 최소 + ROI 최대
- **다음 explore-idea lite fire**: 후보 F (sitemap audit) — 데이터 측정 위주 lite scope
- **carry-over deferred**: 후보 B/C/D/E/G — A 박제 후 재평가

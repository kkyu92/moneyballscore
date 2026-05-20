# cycle 762 explore-idea v11 — v10 시리즈 종결 후 redirect source v2 인벤토리

- **mode**: lite (spec write only, retro-only)
- **carry-over**: cycle 752 v10 종결 (A/B/D ship — loading skeleton / glossary inline / EmptyState shared). C (confidence delta vs market — heavy data source) / E (streak badge — 사용자 발화 대기) deferred
- **chain reason**: cycle 761 next_rec 1순위 explore-idea v11 신규 spec scout. carry-over X 신규 inventory = lite 자연 (heavy office-hours hang risk 회피)
- **v10 결과**: chip series 종결 후 첫 non-chip redirect 패턴 검증 통과 (3 ship 직결 PR #1091/1092/1093)

## v10 series outcome 박제

| Saturation | Ship | Cohort |
|---|---|---|
| v3~v7 (cycle 679~733) | 12 chip components | 12 ship |
| v8/v9 (cycle 738/746) | audit 0건 | 0 ship |
| **v10 (cycle 752~759)** | **loading skeleton / glossary inline / EmptyState shared** | **3 ship (A/B/D), C/E deferred** |

총 16 컴포넌트 + 3 non-chip pattern → chip pattern 한계 cement + non-chip pattern 자연 확장 검증.

## v11 신규 redirect source 인벤토리 (non-chip / non-saturated)

### 후보 A — JSON-LD coverage 확장 (hub / 카테고리 라우트 SEO)
- **현황 측정**: JSON-LD 박제 라우트 = 10 / 36 total (28%). 박제됨 — about / analysis/game/[id] / layout / methodology / glossary / players/[id] / guide / matchup/[teamA]/[teamB] / predictions/[date] / reviews/misses. **미박제 26 라우트** — accuracy / contact / dashboard / leaderboard / picks / predictions(hub) / reviews(hub) / reviews/monthly / reviews/weekly / search / seasons / seasons/[year] / standings / teams / teams/[code] / matchup(hub) / players(hub) / analysis(hub) / reviews/monthly/[month] / reviews/weekly/[week] 등
- **scope**: hub 페이지에 `CollectionPage` + `ItemList` JSON-LD 박제. detail 페이지에 추가 schema (`Person` for players, `SportsTeam` for teams, `Dataset` for accuracy). 1 라우트당 5~15 line schema 박제
- **ROI**: 상 — SEO rich result + AdSense 콘텐츠 보강 + Google Search Console rich result coverage 측정 가능
- **diff (lite scope)**: 1 cycle 당 3~5 라우트 (예: teams hub / teams/[code] / players hub / accuracy / leaderboard) → 5 파일 수정
- **measurement**: Google Search Console rich result count + schema.org validator 통과 수 before/after
- **fire mode**: heavy (5 라우트 ship per cycle)

### 후보 B — TOC sidebar (장문 콘텐츠 페이지)
- **현황**: methodology (468 line) / guide (296 line) / about (FAQ 15건) / privacy / terms 모두 TOC 부재
- **scope**: 본문 ≥ 300 line 페이지에 sticky TOC 컴포넌트 (`<aside>` desktop + collapsible mobile). h2/h3 anchor auto-extract. shared `TableOfContents.tsx`
- **ROI**: 중상 — 가독성 + AdSense long-form 강화. 사용자 자연 발화 신호 잠재
- **diff**: 신규 shared 컴포넌트 1 (~120 line) + wire 5 라우트 = 6 파일
- **measurement**: Vercel Analytics 페이지 평균 체류시간 (TOC 도입 라우트) before/after
- **fire mode**: heavy (1 cycle inventory + 1 cycle ship 분리)

### 후보 C — Related links 패턴 (sibling / related navigation)
- **현황**: breadcrumb 박제 (cycle 758 ia audit). 단 sibling/related navigation = 없음. predictions/[date] 카드 클릭 시 game detail 만, 같은 팀 다른 경기 / 같은 일자 다른 경기 link 부재. teams/[code] 페이지에서 다른 팀 빠른 이동 navigation 부재
- **scope**: `<RelatedLinks />` shared 컴포넌트 + 3~5 영역 wire (analysis/game/[id], teams/[code], players/[id], matchup, predictions/[date])
- **ROI**: 중 — 사용자 dwell time + 페이지 깊이 향상. SEO internal link graph 보강
- **diff**: 신규 컴포넌트 1 + wire 3~5 = 4~6 파일
- **measurement**: Vercel Analytics 페이지뷰 / 세션 + 평균 페이지/세션 before/after
- **fire mode**: heavy (1 cycle ship)

### 후보 D — Hover state + focus ring 정합 (PredictionCard / MiniGameCard / TeamLogo 등 카드 류)
- **현황**: 카드 컴포넌트 hover state 일관성 점검 안 됨. focus ring (a11y) 일부 누락 가능
- **scope**: 카드 컴포넌트 8~10개 hover/focus 정합 (DESIGN.md `transition-colors` + `ring-2 ring-brand`)
- **ROI**: 저~중 — micro polish, a11y 강화
- **diff**: 8~10 컴포넌트 클래스 일관 — 1 cycle audit + 1 cycle ship
- **measurement**: 사용자 자연 발화 / a11y lighthouse score
- **fire mode**: lite audit + heavy ship 분리. polish-ui chain redirect 가능

### 후보 E — Sticky CTA / floating action button (mobile picks)
- **현황**: picks 페이지 사용자가 픽 등록하려면 카드 안 PickButton 클릭. floating sticky CTA "오늘 픽 등록" 없음. mobile 진입 즉시 CTA 가시성 약함
- **scope**: `<StickyCTA />` mobile-only 컴포넌트 + picks 페이지 wire
- **ROI**: 중 — picks engagement 강화. cohort < 5 환경에선 noise 가능
- **diff**: 신규 컴포넌트 1 + 1~2 라우트 wire = 2~3 파일
- **measurement**: picks 등록 수 / 일 before/after
- **fire mode**: heavy

### 후보 F — robots.txt + sitemap.xml audit + indexnow ping
- **현황**: robots.ts + sitemap.ts 존재 (cycle 651 phase). 단 IndexNow ping (Bing / Yandex) 부재. Google Search Console 자동 ping X
- **scope**: route handler `/api/indexnow` 박제. cron 매일 1회 IndexNow API 호출
- **ROI**: 중 — SEO 신선도 향상 (KBO 경기 콘텐츠 매일 갱신 → 즉시 index)
- **diff**: 신규 API route 1 + cron config + sitemap diff cron = 3 파일
- **measurement**: Google Search Console 색인 속도 + Bing webmaster 색인 수
- **fire mode**: heavy

## v11 fire 우선순위 (carry-over closure 후보)

| 순위 | 후보 | mode | scope | trigger | 다음 fire 권장 |
|---|---|---|---|---|---|
| 1 | **A — JSON-LD coverage 확장** | heavy | 5 라우트/cycle | SEO + AdSense (즉시 측정 가능) | 다음 explore-idea heavy fire |
| 2 | C — Related links 패턴 | heavy | shared 컴포넌트 1 + wire 4 | 사용자 dwell time | A 종결 후 |
| 3 | B — TOC sidebar | heavy | shared 컴포넌트 1 + wire 5 | 장문 콘텐츠 가독성 | C 종결 후 |
| 4 | F — IndexNow ping | heavy | API route + cron | SEO 색인 속도 | 사용자 발화 대기 |
| 5 | D — Hover/focus 정합 | lite/polish-ui | 카드 8~10 audit | a11y | polish-ui chain redirect |
| 6 | E — Sticky CTA | heavy | 컴포넌트 + wire | picks engagement | 사용자 cohort 성장 후 |

## fire 권장 — 다음 explore-idea heavy cycle

**1순위 = 후보 A (JSON-LD coverage 확장)** — 5 라우트/cycle 박제, lite scope 경계 가능 시 lite mode 도 OK. ROI 즉시 측정 (Google Search Console rich result coverage).

**heavy fire 시퀀스 (자동 fire 환경)**:
1. `/office-hours` skip (AskUserQuestion hang risk)
2. spec read (본 v11 후보 A 상세 박제)
3. 5 라우트 JSON-LD 박제 — teams (hub) / teams/[code] / players (hub) / accuracy / leaderboard
4. schema.org validator 통과 확인
5. type-check + test
6. commit `feat(seo): JSON-LD coverage 확장 v11-A — 5 라우트 박제` + branch `develop-cycle/cycle-N` + PR + R7

**lite fire 시퀀스**: 1~2 라우트 (예: teams hub + accuracy) 만 박제 + ship.

## 박제 — v11 spec write only

본 cycle 762 = **lite mode**. spec write only, 신규 코드 변경 X, ship X. retro-only outcome=success (cycle 752 v10 lite 동일 패턴).

다음 cycle 763 (or 차기 explore-idea heavy fire) 에서 후보 A 본격 ship 권장.

## carry-over closure 측정

- v10 carry-over deferred 2건 (C/E) — v11 신규 inventory 와 별도 track. C 는 후보 list 에 흡수 (heavy 데이터 source 추가 cycle 분리). E 는 사용자 cohort 성장 대기
- v11 후보 6개 → 다음 N cycle 동안 1~6 ship 가능 (chip pattern 12 ship 의 절반 수준 inventory)

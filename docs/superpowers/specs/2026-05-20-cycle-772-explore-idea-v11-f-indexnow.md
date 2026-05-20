# cycle 772 explore-idea v11 후보 F — IndexNow ping (heavy ship)

- **mode**: heavy
- **carry-over source**: cycle 762 spec `2026-05-20-cycle-762-explore-idea-v11-redirect-sources.md` 4순위 후보 F
- **chain reason**: v11 후보 A (cycle 764) / C (cycle 765) / B (cycle 767) 3건 순차 ship. 잔존 D/E/F 중 F = SEO 자동 신호 (Bing/Naver/Yandex) — KBO 콘텐츠와 Naver 매칭 가치 ↑ + AdSense 심사 phase 보조 (cycle 651 phase carry-over)
- **prev cycle 3 streak**: SUCCESS (fix-incident #769 KBO Referer / review-code #770 sync / operational-analysis #771 baseline). v11 carry-over closure 자연

## 후보 F 결정 근거

cycle 762 inventory:

| 후보 | mode | status |
|---|---|---|
| A JSON-LD coverage | heavy | ✅ ship #1096 (cycle 764) |
| C Related links | heavy | ✅ ship #1097 (cycle 765) |
| B TOC sidebar | heavy | ✅ ship #1099 (cycle 767) |
| **F IndexNow ping** | **heavy** | **← 본 cycle** |
| D Hover/focus 정합 | lite/polish-ui | 후속 (polish-ui chain redirect) |
| E Sticky CTA | heavy | 후속 (사용자 cohort 성장 대기) |

D vs F 우선순위 — F 가 즉시 측정 가능 (Bing webmaster 색인 수) + KBO 콘텐츠 Naver 매칭 가치 + 사용자 발화 비의존. D 는 polish-ui chain redirect 대상이라 explore-idea heavy fire 부적합.

## scope (heavy)

### 신규 endpoint 2개

1. `apps/moneyball/src/app/api/seo/indexnow/key.txt/route.ts` (~20 line)
   - GET → text/plain → `INDEXNOW_KEY` env 값 그대로 반환
   - env 미설정 시 503 응답
2. `apps/moneyball/src/app/api/seo/indexnow/ping/route.ts` (~60 line)
   - GET (CRON_SECRET Bearer auth) → 본 앱 `sitemap()` 직접 호출 → URL 추출 → IndexNow API POST
   - POST body: `{ host, key, keyLocation, urlList }`
   - urlList 10,000 limit (IndexNow spec). 현재 sitemap ~1500 URL = 안전
   - 응답: `{ ok, status, urlCount, host }`

### 신규 workflow 1개

3. `.github/workflows/indexnow-ping.yml`
   - schedule `37 0 * * *` (매일 UTC 00:37 = KST 09:37) — sitemap-warmup `37 * * * *` 패턴 정합 (분 동일, 시 다름)
   - workflow_dispatch (수동)
   - GH Actions schedule 신뢰성 부족 가능성 (cycle 27 박제 41% skip evidence) — 단 IndexNow 1일 1회 ping 은 multiple miss 도 차후 sitemap-warmup 처럼 Cloudflare Worker 이관 가능. 본 cycle scope 미포함

### 테스트 1건

4. `apps/moneyball/src/app/api/seo/indexnow/ping/__tests__/route.test.ts`
   - auth 부재 → 401
   - env 부재 → 503
   - 정상 → IndexNow fetch mock 호출 검증 + urlCount 양수

## 사용자 후속 action (carry-over)

- `INDEXNOW_KEY` env 추가 (Vercel production + GH secrets 양쪽) — 32 hex 추천 (예: `openssl rand -hex 16`)
- GH secrets 에 `CRON_SECRET` 기존 활용 (추가 X)
- workflow 첫 fire 후 Bing Webmaster Tools 색인 수 측정 baseline 박제

## measurement (사용자 후속)

- Bing Webmaster Tools `submitted via IndexNow` count
- Naver Search Advisor 색인 속도 before/after
- Google Search Console = 미반응 (Google IndexNow 미지원, 2026-05 기준)

## fire 시퀀스 (auto-fire safe)

1. office-hours skip (AskUserQuestion hang risk)
2. spec write — 본 문서
3. key.txt route 박제
4. ping route 박제
5. workflow yml 박제
6. test 1건
7. type-check + test smoke
8. commit `feat(seo): IndexNow ping endpoint v11-F (cycle 772)` + branch `develop-cycle/cycle-772` + PR + R7

## 박제 — outcome 후보

- **success**: PR 머지 + CI green
- **partial**: spec only / type-check fail
- **fail**: ship 실패 / R7 자동 머지 실패

본 cycle 목표 = success.

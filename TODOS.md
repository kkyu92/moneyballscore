# TODOS

## 🚀 Next-Up (2026-04-25 이후)

### Day 2 Search Console 색인 요청 (내일)

Day 1 완료: `/`, `/predictions`, `/dashboard`, `/analysis`. 하루 10개 제한에 걸려 5번부터 오늘 못 감. 나머지 6개 + Day 2 새 4개 순서로:

**Day 2** (이어서 10개):
5. `https://moneyballscore.vercel.app/reviews`
6. `https://moneyballscore.vercel.app/about`
7. `https://moneyballscore.vercel.app/teams`
8. `https://moneyballscore.vercel.app/players`
9. `https://moneyballscore.vercel.app/matchup`
10. `https://moneyballscore.vercel.app/reviews/misses`
11. `https://moneyballscore.vercel.app/privacy`
12. `https://moneyballscore.vercel.app/terms`
13. `https://moneyballscore.vercel.app/contact`
14. `https://moneyballscore.vercel.app/seasons`

**Day 3** (인기 팀 프로필 5개 + 최근 리뷰·경기):
- `/teams/HT`, `/teams/LG`, `/teams/OB`, `/teams/SS`, `/teams/SK`
- `/teams/KT`, `/teams/HH`, `/teams/LT`, `/teams/NC`, `/teams/WO`

**Day 4 이후 불필요**: 허브 색인되면 sitemap + 내부 링크로 Google 자동 발견.

### B3 (not_scheduled 재시도) — **데이터 누적 대기**

Part A 관측 결과 (2026-04-24 확인): **이상 status 발생 無**. 모든 skip 이 scheduler 로직 (`window_too_early/late`) 으로 정상. raw 동봉 케이스 아직 트리거되지 않음. 강제 트리거 어려우니 실제 `not_scheduled`/`sp_unconfirmed` 이벤트 발생 시까지 보류.

### 심화 SEO (우선순위 낮음)

- **`generateSitemaps` 로 sub-sitemap 쪼개기**: 현재 1340 URL 단일 파일. 2시즌 더 쌓이면 3000+. Next 16 `id: Promise<string>` breaking change 있음.
- **OG 이미지 점검**: `/analysis/game/[id]` 공유 시 썸네일 동적 생성 (`opengraph-image.tsx`)
- **Core Web Vitals 감사**: Lighthouse 또는 PageSpeed Insights. 개선 여지 발견 시 다음 세션

---

## ✅ 2026-04-23~24 세션 완료

### B1 / Part A / B2 관측 — **모두 정상**
- **B1**: cron 오프셋 17 적용 후 4-23 **7회 fire** (이전 4/15 대비 ↑). KST 16:02 predict 로 예측 5건 성공 생성. KST 23:14 verify success.
- **4-23 `is_correct`**: 5경기 전부 verified (2승 3패, 40%). 체크포인트 우려 해소.
- **Part A**: 이상 status 발생 無 (정상). raw 동봉 대기.
- **B2 체감**: 2026-04-24 KST 09:17 announce 에서 확인 예정.

### HIGH_CONFIDENCE_THRESHOLD 재정의 → winnerProb 3단계 단일 anchor (커밋 6450f60 외)

debate confidence 주관값 축 폐기, 예측 승자 적중 확률 (winnerProb = max(hwp, 1-hwp)) 로 전면 통일:
- `WINNER_PROB_CONFIDENT = 0.65` / `WINNER_PROB_LEAN = 0.55` (Telegram B2 와 통일)
- `classifyWinnerProb(hwp)` → `'confident' | 'lean' | 'tossup'`
- 3단계 라벨 "적중 / 유력 / 반반" + 이모지 pool 랜덤 (`pickTierEmoji`)
  - 적중 🔥 또는 🎯
  - 유력 📈 (단일)
  - 반반 🤔 또는 ⚖️
- UI 전수 반영: 홈/대시보드/예측기록/주간·월간 리뷰/회고
- 테스트 **519 → 536 pass**

### SEO — Sitemap "가져올수없음" 근본 해결 (커밋 da59de3)

- **원인 확정**: `createClient` → `cookies()` 호출 → Next.js 가 route 를 dynamic 으로 강제 → `revalidate` 무력화 → 매 요청 2500 DB 쿼리 → Googlebot timeout → "유형: 알수없음 / 상태: 가져올수없음"
- **해결**: sitemap 전용 cookie-free anon client 인라인 → **static + ISR** prerender
- `x-vercel-cache: HIT` 확인, Search Console **색인 생성됨** 도달
- 동시 조치: pitcher leaderboard 쿼리 제거, games limit 5000→2500, 전 URL lastmod, revalidate 3600→21600, warmup cron (매시간 37분)

### SEO 추가 보강 (커밋 e3f5cee)

- `robots.txt` — `/debug`, `/api`, `/search` Disallow
- canonical — 홈 + /analysis + dashboard/predictions/reviews/reviews-misses/about/teams/players + /analysis/game/[id]
- **SportsEvent JSON-LD** 추가 — /analysis/game/[id] (Article 과 병기). Google 리치 결과 후보 (팀·일정·구장)

### 외부 웹마스터 등록 (사용자 완료)

- Google Search Console ✅ (Day 1 4개 색인 요청 완료)
- Naver 웹마스터 ✅
- Bing Webmaster ✅
- IndexNow ⏭ 스킵

---

## ✅ PLAN_v5 완료 (v0.5.23, 2026-04-20)

**전체 Phase 완료**:
- ✅ Phase 1 UI (LEFT JOIN + PlaceholderCard + estimateTime) — v0.5.22
- ✅ Phase 2 Pipeline (매시간 cron · shouldPredictGame · ON CONFLICT · daily_notifications · 4-mode) — v0.5.22
- ✅ Phase 2.5 DB 기반 form/h2h (asOfDate 실 필터 구조적 해결) — v0.5.22
- ✅ Phase 3 `/debug/pipeline` 대시보드 — v0.5.22
- ✅ Phase 4 가드 테스트 (382 tests: schedule 24 + scrapers 16 + notify 11 + pipeline-daily 15 + ui-homepage 16 + 기존) — v0.5.23

**다음 단계** — PLAN_v5 후속:
- **자연 발화 관찰** (KST 09:00 부터 첫 사이클):
  - UTC 00 (KST 09) announce → Telegram 수신 + `/debug/pipeline` 기록
  - UTC 01-12 predict 매시간 → 각 경기 시작 3h 이내 처음 cron 에만 row 1건 생성
  - UTC 13 predict_final → gap=0 확인
  - UTC 14 verify → accuracy update + notifyResults
- **Phase 5 v2.0 튜닝** (2주 운영 후): stat 누수 차단된 데이터셋 기반 오차분석. ~50경기 축적 시점부터 별도 세션 플래닝.

---

## 🔍 Phase v4-3 자연 발화 관찰 (2026-04-16 이후)

**목적**: v4-3에서 신규 추가한 자동 postview 트리거·Compound 루프가 실제 KBO 경기 종료 시 작동하는지 확인. 프로덕션 재트리거 1회로는 scheduled 상태만 검증됐고, `post_game` row·`agent_memories` row 생성은 실제 완료 경기가 있어야 검증 가능.

### 체크리스트 (매일 경기 후 1회)

**A) Postview 자동 생성 확인**
```sql
-- 어제 날짜 post_game row 개수 (Supabase SQL Editor)
SELECT count(*) FROM predictions
WHERE prediction_type = 'post_game'
  AND game_id IN (SELECT id FROM games WHERE game_date = CURRENT_DATE - INTERVAL '1 day');
```
- **기대**: 어제 완료 경기 수와 일치 (보통 5)
- **0이면**: live-update.yml 트리거 실패 or runPostviewDaily 에러 → GitHub Actions 로그 확인

**B) Postview 내용 샘플링**
```sql
-- 최근 post_game row 1건의 reasoning 구조 확인
SELECT game_id, reasoning->'factorErrors' AS factor_errors,
       substring(reasoning->>'judgeReasoning', 1, 200) AS reasoning_preview
FROM predictions
WHERE prediction_type = 'post_game'
ORDER BY created_at DESC LIMIT 1;
```
- **기대**: `factorErrors`에 실제 factor 이름(`home_sp_fip` 등), `reasoning_preview` 한 줄 이상 (fallback 한 줄 아님)
- **fallback만 나오면**: Sonnet 호출 실패 → API 크레딧·모델 ID 확인

**C) agent_memories home/away 양쪽 생성 확인**
```sql
-- 어제 경기 기반 memory 개수 + 팀 분포
SELECT team_code, memory_type, count(*)
FROM agent_memories
WHERE source_game_id IN (SELECT id FROM games WHERE game_date = CURRENT_DATE - INTERVAL '1 day')
GROUP BY team_code, memory_type
ORDER BY team_code;
```
- **기대**: 경기당 최대 2개 row (home 팀 + away 팀), memory_type 다양하게 분포
- **한쪽 팀만 보이면**: `retro.ts` home/away 버그 수정이 실제 런타임에서 작동 안 함 → 긴급

**D) live-update.yml cron 윈도 확장 확인**
- GitHub Actions → `Live Game Update` workflow → 18:00~00:50 KST 시간대에 10분 간격 실행 로그
- **기대**: 약 43회 실행 (2h 확장분 포함), 대부분 "no active games" 즉시 종료
- **23:30 이후 실행 없으면**: workflow 파일의 cron이 적용 안 됨

**E) UNIQUE 제약·upsert 멱등성 확인**
```sql
-- 같은 (team_code, memory_type, content) 중복 없는지
SELECT team_code, memory_type, content, count(*)
FROM agent_memories
GROUP BY team_code, memory_type, content
HAVING count(*) > 1;
```
- **기대**: 0 rows (UNIQUE 제약 때문에 구조적으로 불가능)
- **row 있으면**: migration 009 제약이 비활성화됨 → 긴급

**F) validator reject 율 (Claude strict)**
- Vercel/pipeline 로그에서 `[Validator]` 키워드 grep
- **기대**: 0건 또는 극소수 (Claude는 compliance 높음)
- **증가하면**: 프롬프트 튜닝 필요 (페르소나·RESPONSE_FORMAT)

### 우선순위
- **반드시**: A, B, C (postview + Compound 루프 핵심 검증)
- **권장**: D (cron 확장 실제 적용 확인)
- **주간 1회**: E, F (정상 운영 확인)

---

## ✅ Phase v4-4 (사용자 UI 노출) — 구현 완료 (2026-04-16~17)

전체 항목 구현 완료. 운영/검증은 자연 발화 관찰 섹션으로 이관.

- ✅ `/analysis/game/[id]` 페이지 — 홈/원정 에이전트 박스 + 심판 reasoning + factor 분해
- ✅ `/analysis` 인덱스 + 시즌 AI 리더보드 (`/dashboard` 이전)
- ✅ 빅매치 자동 선정 휴리스틱 — `packages/kbo-data/src/big-match/selectBigMatch.ts`
- ✅ `BigMatchDebateCard.tsx` hero 섹션 컴포넌트
- ✅ A/B flag — `apps/moneyball/src/lib/feature-flags.ts isBigMatchEnabled`
- ✅ `/debug/hallucination` 대시보드 + middleware BASIC auth (validator 로그)
- ✅ `docs/defamation-ir.md` 명예훼손 IR 절차 문서

남은 검증 (자연 발화):
- post_game 데이터 UI 렌더링 — Phase v4-3 자연 발화 관찰 섹션 A,B,C 항목으로 검증
- 빅매치 자동 선정 결과 의미 있는지 — 운영 데이터 축적 후 후속 회고

---

## 🛠 v0.5.18-21 후속 운영 (2026-04-19)

### Sentry 모니터링 정기 점검
- **What**: Sentry Issues 탭 주 1회 점검. 같은 에러 패턴 반복 시 fix.
- **Where**: https://sentry.io 본인 계정, 프로젝트 `moneyballscore`
- **When**: 주말 retro 시 함께
- **Free plan 한도**: 월 5K errors. 80% 도달 시 이메일 알림 자동.

### Migration 012 적용 검증
- **Done**: `supabase migration list --linked` — 001~012 모두 동기화 완료 (2026-04-19).
- 남은 검증: prod에서 `/search` 한글 선수 ILIKE 응답 시간이 빠른지 (수동 1회).

### 사용자 리텐션 기능 — 부분 구현 진행도
- ✅ 관심 팀 필터 (`FavoriteTeamFilter.tsx`) — localStorage 기반
- ✅ RSS feed (`/feed`) — 이전 구현
- ⏸ 북마크 (특정 경기 팔로우)
- ⏸ 결과 알림 (이메일/푸시)
- ⏸ 사용자 계정 / 세션
- 우선순위: LOW (트래픽 발생 후 재평가)

---

## ✅ v4-4 후속 — 30일 retention (완료)

- **구현**: `daily.ts` predict 모드 시작 시 `agent_memories` + `validator_logs` 30일 초과 row 자동 삭제
- **pg_cron 불필요**: 기존 daily-pipeline cron이 매일 실행하므로 별도 DB extension 없이 해결

## ✅ v5 이후 deferred — DESIGN.md 작성 (완료)

- DESIGN.md 작성 완료 (2026-04-16, `/design-consultation` 실행).
- 다크 그린 + 골드 팔레트 + Pretendard 타이포 + 8px 스페이싱 시스템 + Decisions Log 포함.

---

## Phase 2a 시작 전

### ~~Statiz 스크래핑 법적 리스크 확인~~ ✓ 완료 (2026-04-14)
- **결과:** statiz.co.kr robots.txt에서 `User-agent: * / Disallow: /` — 전체 차단
- **대안 확정:** 3소스 조합
  - KBO 공식 (koreabaseball.com): 경기일정, 선발확정, 결과, 최근폼, 상대전적
  - KBO Fancy Stats (kbofancystats.com): FIP, xFIP, WAR, wOBA, SFR, Elo (robots.txt 없음)
  - FanGraphs (fangraphs.com): wRC+, ISO, BB%/K% (보조/검증)

## KBO Daily 개발 전

### 애드센스 승인 요건 조사
- **What:** Google AdSense 승인에 필요한 최소 요건 조사
- **Why:** AI 생성 콘텐츠에 대한 구글 최신 정책, 최소 콘텐츠 수, 승인 소요 시간 파악
- **확인 사항:** AI 콘텐츠 허용 범위, 자체 도메인 요건, 트래픽 최소 기준
- **우선순위:** HIGH (KBO Daily 개발 방향에 영향)


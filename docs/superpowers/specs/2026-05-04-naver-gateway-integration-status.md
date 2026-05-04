# Naver Sports 비공식 게이트웨이 통합 현황 + 후속 박제 (cycle 18)

**Date**: 2026-05-04
**Cycle**: 18
**Chain**: explore-idea (lite)
**Closes**: #47, #39
**Stop**: spec 박제 + 이슈 close

---

## 이슈 가설

`#47` (2026-05-03) + `#39` (2026-05-01) 동일 주제. geeknews 스카우트가 추천한 `kbo-cli` (Show GN: 터미널 라이브 스코어보드) 의 **Naver Sports 비공식 게이트웨이** (`api-gw.sports.naver.com`) 폴링 로직을 우리 데이터 수집 파이프라인에 통합하면 KBO 공식 사이트 scraper 의 잠재적 불안정성을 보완할 수 있다는 가설.

## 가설 검증 — 이미 구현됨

### Scraper 모듈 inventory

| 파일 | 용도 | Endpoint |
|---|---|---|
| `packages/kbo-data/src/scrapers/naver-schedule.ts` | 월/주 단위 prefetch (14일치 한 번에 조회 가능 — KBO 공식은 14회 + sleep 필요) | `https://api-gw.sports.naver.com/schedule/games` (fields=all/basic) |
| `packages/kbo-data/src/scrapers/naver-record.ts` | 경기별 boxscore (투수/타자/이닝별 점수) — Referer 헤더 필수 | `https://api-gw.sports.naver.com/schedule/games/{gameId}/record` |
| `packages/kbo-data/src/scrapers/kbo-official.ts` | KBO 공식 AJAX (메인 소스) | `koreabaseball.com` |
| `packages/kbo-data/src/scrapers/kbo-live.ts` | KBO 공식 라이브 스코어 (이닝별 승리확률 보정) | `koreabaseball.com` |

### Pipeline 사용 inventory

| 파일 | Naver 모듈 사용 | 역할 |
|---|---|---|
| `packages/kbo-data/src/pipeline/daily.ts` | `fetchNaverSchedule` | announce 모드 14일치 prefetch |
| `packages/kbo-data/src/pipeline/backfill-sp.ts` | `fetchNaverSchedule` | SP 확정 시각 backfill |
| `packages/kbo-data/src/pipeline/backfill-season.ts` | `fetchNaverSchedule` | 시즌 단위 backfill |
| `packages/kbo-data/src/pipeline/live.ts` | `fetchNaverRecord` | 경기 종료 감지 시 boxscore 저장 → game_records |
| `packages/kbo-data/src/pipeline/backfill-records.ts` | `fetchNaverRecord` | 게임 기록 backfill |
| `packages/kbo-data/src/pipeline/save-game-record.ts` | `NaverRecord` 타입 사용 | DB 저장 변환 |

### Cloudflare Worker 양쪽 측정 인프라 (2026-04-27 박제)

`cloudflare-worker/src/worker.ts` — 매 cron trigger 마다 KBO 공식 (`B_PIT_P_NM`) + Naver (`schedule/games?fields=all`) 양쪽 동시 호출 → `sp_confirmation_log` 에 `source='kbo-official'` / `source='naver'` 양쪽 row INSERT. 두 소스 비교로 어느 쪽이 먼저 SP 채우는지 정량 측정 인프라.

Migration: `020_sp_confirmation_log.sql`, `021_widen_sp_log_state_sc.sql`.

## kbo-cli 와 차별점

| 측면 | kbo-cli (이슈 가설) | moneyballscore (실제) |
|---|---|---|
| 데이터 폭 | 라이브 스코어보드 polling (CLI 디스플레이) | schedule prefetch + boxscore + 이닝별 승리확률 + game_records archive |
| Naver 사용 깊이 | 단순 polling | 5 endpoint 사용 (schedule basic/all, record, gameId 변환, batch backfill) |
| KBO 공식 fallback | 단일 소스 | 이중 소스 + sp_confirmation_log 측정 후 fallback 전략 결정 가능 |
| Referer 헤더 | 알 수 없음 | `m.sports.naver.com` 명시 (없으면 일부 필드 403) |
| gameId 포맷 핸들링 | 알 수 없음 | external_game_id (13자) ↔ Naver gameId (17자) 양방향 변환 (`toNaverGameId`) |

이슈 #47/#39 의 "직접적 기여" 가설은 이미 우리가 더 풍부하게 구현한 구조를 외부에서 작은 도구로 본 결과. 차별점이 아니라 **subset 관계** (kbo-cli ⊂ moneyballscore Naver 통합).

## 진짜 남은 gap — 측정 후 결정

`sp_confirmation_log` 가 2026-04-27 부터 누적 중. 1~2주 누적 후 분석 SQL 5개 (`cloudflare-worker/README.md` Phase 3 섹션) 실행 → 다음 결정:

1. **KBO 공식 vs Naver, 어느 쪽이 먼저 SP 채우는가** — 평균 lead time (분)
2. **양쪽 모두 채우면 어느 쪽이 정확한가** — 일치율 % + 불일치 시 어느 쪽이 진실인지 (게임 시작 후 retroactive 확인)
3. **Naver 단독 채움 케이스 / KBO 단독 채움 케이스 비율** — fallback 도입 가치
4. **Cron 횟수 정밀 축소** — 어느 시간대 sp 변동 0 → cron 제거 가능
5. **sp_confirmation_log raw 보관 기간 결정** — 1개월 이후 archive vs 영구

이 5 분석은 **operational-analysis chain** 영역 (`/weekly-review` → `/extract-pattern` → `/compound`). 본 cycle 18 explore-idea 단계 stop 조건 충족.

## 다음 사이클 후속

- **cycle ~25 operational-analysis** — sp_confirmation_log 1주 누적 분석 SQL 5개 실행 → fallback 전략 결정 (cycle 17 retro 의 v1.7-revert 1주 검증과 자연 동시 trigger 가능)
- **cycle ~25+ explore-idea or fix-incident** — 분석 결과 따라 (a) Naver fallback 자동화 (b) cron 횟수 축소 (c) 측정 인프라 archive

## meta-finding — geeknews 스카우트 봇 신호 vs 실제 인벤토리 갭

이 이슈 2건은 봇이 외부 도구 (kbo-cli) 의 라이브 스코어보드 폴링을 보고 우리 인벤토리를 모르고 가치 신호 발신한 케이스. **scout-geeknews.mjs 의 issue body 가 우리 코드베이스 grep 후 "이미 구현된 영역인지" 표시하면 false positive 감소**. 본 cycle 18 결과를 봇 prompt 갱신 input 으로 박제.

(별도 issue 또는 cycle 후속 — `scout-geeknews` 는 별도 레포 또는 GH workflow. 본 repo grep 후 "이미 X 모듈 존재" 추가 박제 패턴.)

## 박제 commit + PR

- branch: `develop-cycle/naver-gateway-status-cycle18`
- commit prefix: `docs(spec):`
- PR: Fixes #47, Fixes #39 (R7 auto-merge → 머지 후 자동 close)

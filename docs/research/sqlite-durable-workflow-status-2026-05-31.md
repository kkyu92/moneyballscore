---
created_at: 2026-05-31
cycle: 1067
updated_cycle: 1470
scout_issue: 1446
related_plan: null
status: carry-over scout (자율 영역 검토 closure, 사용자 결정 wait — 자율 ROI 낮음 결론). **cycle 1470 갱신**: 자율 재 fire 조건 2 (v2.0 n=150 + 백테스트 harness scope) = cycle 1460 v1.8 유지 확정 (Brier <1pp) 으로 무효화 — v2.0 ship 시점 자체 소멸. 재 fire 조건 = 조건 1 (silent drop 누적) / 조건 3 (사용자 발화) / 조건 4 (Vercel platform 변동) 로 축소.
---

# SQLite 내구성 워크플로 Scout #1446 — Status (cycle 1067)

scout #1446 (2026-05-30 박제) carry-over status snapshot. "SQLite 만으로 내구성 있는 워크플로 구현" 긱뉴스 기사 도입 검토 — 본 cycle = 자율 영역 검토 closure + 사용자 결정 wait 명확화.

## 1. 박제 evidence (자율 영역, 종료)

### 1.1 현 프로젝트 내구성 layer 점검

`packages/kbo-data/src/pipeline/daily.ts` (1451 줄) read 결과:

| 내구성 요소 | 현 구현 | 위치 |
|---|---|---|
| run-level 상태 로그 | `pipeline_runs` Supabase 테이블 (mode / status / games_found / predictions / errors / skipped_detail / duration_ms) | `daily.ts` line 155-178 `finish()` helper |
| 모든 exit 경로 로그 보장 | `finish()` 단일 통과 — early return / catch / success 모두 동일 path | `daily.ts` line 126 (주석) + 1451 줄 전체 enforce |
| supabase silent insert 차단 | `.error` 명시적 체크 + console.error (사례 3 VARCHAR overflow 재발 차단) | `daily.ts` line 167-170 |
| silent drift family alert | `pipeline-silent-drift-alert.ts` Sentry warning (predictions=0 + games_found>0 mismatch) | `__tests__/pipeline-silent-drift-alert.test.ts` |
| mode 분리 (idempotent re-run) | announce / predict / predict_final / verify 4 mode + UTC 시각 분기 | `daily.ts` line 119-122 (주석) |
| 부분 성공 (`partial` status) | errors > 0 + predictionsGenerated > 0 시 partial | `daily.ts` line 150-152 |

본 프로젝트 내구성 = **run-level** (각 mode run 단위 status + Telegram 알림 + Sentry alert). **step-level** (개별 경기 scrape / predict / DB write 단계별 transaction) 은 미구현.

### 1.2 SQLite durable workflow 기사 claim 정합 평가

기사 핵심 = "SQLite 만으로 step-level 트랜잭션 + 재시작 path 구현 가능 (외부 인프라 없이)". moneyball 정합 후보:

| 기사 패턴 | moneyball 현재 | 도입 ROI |
|---|---|---|
| step-level 트랜잭션 (각 단계 상태 SQLite 박제) | run-level only | medium — 부분 실패 복구 path 추가, 그러나 Vercel Fluid Compute (stateless) + Supabase Postgres 조합으로 이미 작동 |
| 마지막 성공 단계부터 재시작 | mode 분리로 자연 재시작 (announce/predict/predict_final/verify) | low — 재시작 path 이미 작동 (cron 매시간 fire + idempotent insert) |
| 외부 인프라 없이 (no Redis / no S3 queue) | Supabase Postgres = 외부 인프라이지만 무료 tier + 기존 작동 | low — 기존 layer 작동 중, 추가 SQLite 분기 = 복잡도 + 일관성 risk |
| 로컬 dev fixture / test harness | `__tests__/pipeline-*.test.ts` 직접 mock + vitest in-memory | low — 이미 in-memory mock 작동 (sqlite 대체 필요 X) |
| 신규 워크플로 (예: 백테스트 / shadow cohort 재처리) | 자율 사이클 안 작업 + cycle_state JSON 박제 | low — `~/.develop-cycle/cycles/*.json` 로 충분, SQLite layer 추가 ROI 부족 |

**결론**: 본 프로젝트 = run-level pipeline_runs 로그 + silent drift alert 조합으로 내구성 작동 중. step-level SQLite layer 추가 = scope 큼 + Vercel stateless 환경 미정합 (Fluid Compute = ephemeral filesystem, SQLite 파일 persist 안 됨) + ROI 부족.

### 1.3 Vercel Fluid Compute 환경 정합성 (decisive blocker)

Vercel Fluid Compute = `/tmp` 외 filesystem write 가능하나 **invocation 간 persist X** (요청 끝나면 사라짐). SQLite 파일 기반 durable workflow 구현 시:

- option A: SQLite 파일을 Vercel Blob 에 upload/download per invocation = 매 step round-trip latency (1초+) + 비용 + race condition
- option B: Vercel Postgres / Supabase Postgres 에 SQLite 의 step-level 패턴만 차용 = 본질적으로 현재 pipeline_runs + step_runs 분리 layer 추가
- option C: 별도 EC2 / Fly.io VM 에 SQLite 서버 = 인프라 추가 (긱뉴스 기사 motivation 인 "외부 인프라 없이" 정신 위배)

A/B/C 모두 net 추가 인프라 또는 비용. 기사 핵심 motivation = "외부 인프라 없이" 와 본 프로젝트 deploy target (Vercel serverless) 의 본질적 mismatch.

## 2. 옵션 평가 (사용자 결정 영역)

| 옵션 | 정합도 | 사용자 결정 gating |
|---|---|---|
| A: 현 상태 유지 (Supabase pipeline_runs only) | high — 작동 + silent drift alert 박제 | **default 권장** — 추가 작업 X |
| B: step-level 로그 layer 추가 (pipeline_step_runs 신규 테이블, SQLite 아닌 Supabase) | medium — 부분 실패 복구 path 명확화, 그러나 현 mode 재시작 + cron idempotent insert 로 충분 가능성 ↑ | 사용자 결정 (silent drop 사례 누적 ≥ 3건 시 ROI 재평가) |
| C: SQLite durable workflow 도입 | low — Vercel serverless 환경 미정합 + 외부 인프라 ROI 부족 | 도입 권장 X (블로커 1.3 참조) |
| D: 별도 백테스트 harness 차원 SQLite 활용 | medium — local-only 백테스트 / shadow cohort 재처리 path 가능 (Vercel deploy path X) | ~~v2.0 n=150 도달 + 사용자 결정~~ — **cycle 1460 v1.8 유지 확정으로 무효화** (v2.0 ship 시점 소멸). 재 fire = 사용자 발화 또는 조건 1 (silent drop 누적) |

**자율 영역 권장**: option A default + option B 는 silent drop 사례 누적 시 fix-incident chain 자연 재평가. option C 자율 fire X (Vercel 환경 mismatch).

## 3. 본 cycle 결정 (explore-idea lite)

- 본 메인 자율 fire X — option A default 작동 중 + option C 환경 mismatch
- issue #1446 close 결정 X — carry-over 추적 채널 유지 (사용자 결정 wait + future reference)
- 신규 코드 / 신규 plan slot 박제 X — 현 run-level 내구성 layer 충분
- 신규 plan number 가정 박제 X (silent drift family 사례 16 정합)

## 4. 다음 자율 fire 조건 (자가 의심 차단)

다음 조건 1+ 충족 시 자율 재 fire 자연 (자가 의심 X):

| 조건 | trigger | 발화 chain |
|---|---|---|
| 1. silent drop 사례 누적 ≥ 3건 (1주 안) | `pipeline_runs.status='error'` 1주 ≥ 3건 OR Sentry silent drift alert 누적 | fix-incident (heavy, step-level 로그 layer option B 검토) |
| ~~2. v2.0 n=150 도달 + 백테스트 harness scope 등장~~ (**무효화, cycle 1460 v1.8 유지 확정**) | ~~`~/projects/moneyballscore/docs/research/v2.0-killswitch.md` "v2.0 ship" 박제 + 백테스트 코드 자율 fire 요청~~ | ~~explore-idea (heavy, option D SQLite local-only backtest harness plan)~~ — v2.0 ship 시점 소멸 |
| 3. 사용자 직접 요청 ("SQLite 도입 / step-level 로그 / 내구성 강화" 발화) | 사용자 발화 grep | explore-idea (heavy, expand-plan 박제 chain) |
| 4. Vercel platform 변동 (SQLite native support 등) | Vercel changelog 자율 monitor X (사용자 영역) | 사용자 알림 시 재평가 |

본 doc = scout #1446 carry-over status 박제. 자율 fire 조건 미충족 시 추가 작업 X.

## 5. 정합 패턴 박제

본 status doc = 다음 정합 패턴:
- cycle 1049 #1206 TabPFN status doc 박제 (`docs/research/tabpfn-status-2026-05-29.md`)
- cycle 1052 #1370 feature flag status doc 박제 (`docs/research/feature-flag-status-2026-05-29.md`)
- cycle 1062 #1206 TabPFN status doc 갱신 (v1.8 cohort split)

scout 류 issue 패턴: 초기 relevance 평가 → status doc 박제 → 자율 영역 closure + 사용자 결정 wait 명확화 + 다음 자율 fire 조건 박제. issue close X (carry-over 채널 유지).

차원: explore-idea (lite) — scout #1446 초기 status doc 박제, 신규 코드 / plan slot X.

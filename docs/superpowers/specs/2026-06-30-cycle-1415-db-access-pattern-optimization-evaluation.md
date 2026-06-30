# DB 데이터 접근 패턴 최적화 평가 (cycle 1415, explore-idea lite)

**스카우트**: issue #2515 — "CPU를 정말 화나게 만드는 데이터 접근 패턴" 기사 참고, KBO 분석 엔진 (recent form, H2H, asOfDate) 데이터 접근 최적화 제안
**상태**: REJECT (개념 매칭 불일치)
**Carry-over**: 별도 measurement-first 평가 trigger 조건 박제

## 1. 원본 기사 vs 본 프로젝트 영역 비교

| 항목 | 원본 기사 도메인 | 본 프로젝트 영역 |
|---|---|---|
| 접근 패턴 | CPU L1/L2/L3 캐시 라인 접근 (struct-of-arrays vs array-of-structs) | Supabase REST + PostgreSQL B-tree index |
| 최적화 단위 | 메모리 layout (bytes / cache line 64B) | 쿼리 plan + 인덱스 (B-tree / hash) |
| bottleneck | CPU cache miss / TLB miss | 네트워크 round-trip + 디스크 I/O + buffer cache |
| 측정 도구 | `perf` / cachegrind / Intel VTune | `EXPLAIN ANALYZE` / pg_stat_statements |
| 적용 언어 | C / C++ / Rust (저수준) | TypeScript + SQL (high-level) |

**결론**: 원본 기사 = CPU 캐시 메모리 접근 (저수준). 본 프로젝트 = RDBMS 쿼리 (서버 측 PostgreSQL). **개념 직접 적용 X**.

## 2. 본 프로젝트 실제 DB 접근 영역

| 영역 | 코드 위치 | 접근 패턴 | 인덱스 보호 |
|---|---|---|---|
| recent form | `packages/kbo-data/src/factors/*.ts` | `from('games').select().eq('home_team_id'/'away_team_id').gte('game_date').limit(10)` | `idx_games_team_date` (B-tree) |
| H2H | similar | `from('games').eq + or().limit(20)` | composite index |
| asOfDate | predictor 진입점 | `where game_date < asOfDate` filter | `idx_predictions_game_id` (037 fix) + game_date order index |
| daily pipeline | `pipeline/daily.ts` (1400+ lines) | upsert batch + select limit | `predictions_unique` index (039 fix) |

총 55개 index 박제 (migrations 001~040). silent N+1 query family 미박제 (cycle 1149~ MLB hub empty fallback 사례는 코드 path 자체 부재 = 다른 family).

## 3. ROI 평가 (rubric 5축, plan #8 패턴 정합)

| 축 | 평가 |
|---|---|
| 가치 | **low** — 기사 도메인 (저수준 메모리) ≠ 본 프로젝트 도메인 (RDBMS). 직접 적용 시 측정 가능한 가시 가치 0 |
| 시간 비용 | **medium** — pg_stat_statements 활성화 + slow query log + EXPLAIN ANALYZE 각 핵심 query 측정 = 1+ cycle 소요 |
| risk | **1** — pg_stat_statements 활성화는 약간의 overhead. Supabase 측 권한 / 한도 확인 필요 |
| 자율 가능 | **partial** — Supabase Dashboard 접근 필요 (사용자 영역) |
| 의존성 | **단일** — Supabase 측 metric tooling 활성화 evidence |

**Tier 분류**: Tier 4 (사용자 영역 — Supabase Dashboard 접근 필요)

**자가 의심 차단** (cycle 124/618 룰): "DB 최적화 필요한가?" 자체 의심 X. 객관 evidence (slow query / cache miss / N+1 family) 없으면 결정 X / harness 박제만 가능.

## 4. 재평가 trigger 조건 (carry-over 박제)

다음 중 1+ 충족 시 본 spec 재평가:

1. Supabase Dashboard slow query log 에서 1s+ query ≥ 3건 / 30일 (현 시점 측정 X — 사용자 영역)
2. `pipeline_runs` p95 latency ≥ 5s × 7일 연속 (silent drift alert family fire)
3. Vercel function timeout (60s+) 발생 ≥ 3건 / 30일 (현 0건)
4. agent context build 단계 latency ≥ 2s (LLM judge call 외 부분, 현재 측정 X)

## 5. 본 사이클 결론

- explore-idea (lite) chain — spec write only, 코드 변경 X
- issue #2515 = REJECT carry-over (개념 매칭 불일치, 적용 가치 0)
- 잔여 follow-up = 사용자 영역 trigger 조건 충족 시 본 spec re-open

---

> 본 spec = cycle 1415 explore-idea (lite) chain 결과. ROI rubric 5축 + REJECT carry-over 패턴 (cycle 1406 ArachneControl) 재사용.

# op-analysis cohort split (2026-06-15)

**총 n=268** (적중 146 / 54.5%)

## scoring_rule split

| rule | n | acc | Brier |
|---|---|---|---|
| v1.5 | 16 | 75.0% | 0.2131 |
| v1.6 | 46 | 37.0% | 0.2606 |
| v1.7-revert | 34 | 55.9% | 0.2652 |
| v1.8 | 90 | 58.9% | 0.2588 |
| v1.8-credit-fail | 25 | 60.0% | 0.2304 |
| v2.0-shadow | 5 | 60.0% | 0.5616 |
| v2.1-B-shadow | 52 | 51.9% | 0.4635 |

## 요일별

| 요일 | n | acc |
|---|---|---|
| 화 | 38 | 57.9% |
| 수 | 22 | 50.0% |
| 목 | 82 | 52.4% |
| 금 | 50 | 58.0% |
| 토 | 38 | 60.5% |
| 일 | 38 | 47.4% |

## confidence tier

| tier | n | acc |
|---|---|---|
| low | 183 | 52.5% |
| mid | 53 | 54.7% |
| high | 32 | 65.6% |

## scoring_rule × tier (cohort split heatmap)

| rule | low | mid | high | veryhigh |
|---|---|---|---|---|
| v1.5 | 67% (3) | 67% (6) | 86% (7) | — |
| v1.6 | 38% (32) | 42% (12) | 0% (2) | — |
| v1.7-revert | 60% (25) | 33% (6) | 67% (3) | — |
| v1.8 | 54% (46) | 60% (25) | 68% (19) | — |
| v1.8-credit-fail | 60% (20) | 75% (4) | 0% (1) | — |
| v2.0-shadow | 60% (5) | — | — | — |
| v2.1-B-shadow | 52% (52) | — | — | — |

---

자동 생성 — plan #8 Tier 1 M7 op-analysis-weekly cron.

## silent halt evidence (cycle 1181 추가 박제)

cycle 1173 → 1179 → 1181 cohort 100% 동일 (n=268 / v1.8 n=90 / Brier 0.2588). verified last 7d = 19 이지만 cohort 총량 변동 X → 신규 pre_game 예측 자체 0건 생성 가설.

**pipeline_runs predict 모드 직전 24h** (2026-06-14 ~ 06-15):
- 6/14 12회 (06~17시): `status=success / games_found=5 / pred=0 / errors=[]` 12회 반복
- 6/15 5회 (01~05시): `status=success / games_found=0 / pred=0` (일요일 빈 일정 정상)
- 6/14 games_found=5 + pred=0 = silent silent drift family wave 19 (사례 11 family 12번째 재발 가능성)

**pre_game predictions 박제 상태**:
- `SELECT ... WHERE prediction_type=pre_game ORDER BY created_at DESC LIMIT 20` = 빈 배열
- 즉 created_at 기준 최근 pre_game 예측 자체 부재 (또는 매우 오래된 박제 only)

**games 테이블 정상**:
- 6/14 5경기 final (점수 박제 완료)
- 6/16 / 6/17 5경기 scheduled (예측 대상 존재)

**silent-drift-alert 모듈 fire 추정 미인지**:
- `packages/kbo-data/src/pipeline/silent-drift-alert.ts` 박제 (cycle 813 PR #1173) 이후 cycle 886 verify 확장
- 6/14 12회 같은 mismatch (games_found=5 + pred=0) = alert fire 가능성 있으나 사용자 가시 channel 미작동 또는 alert path 자체 silent

**다음 cycle 1182 fix-incident (heavy) 카리오버**:
- daily.ts pipeline predict 분기 silent skip 위치 식별
- captureSilentDriftAlert 발화 path 검증 (Sentry warning 실제 발화? 또는 silent silent)
- KBO 시즌 데이터 수집 cron 정상 동작 검증 (games 박제는 OK)
- 6/14 5경기 누락 backfill (가능 시)

cycle 1180 MLB PHI cast fix 와 별개 — KBO 정규 predict 흐름 자체 silent halt.

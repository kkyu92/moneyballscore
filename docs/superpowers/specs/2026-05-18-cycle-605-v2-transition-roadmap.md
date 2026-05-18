# v2.0 전진 roadmap — n=119 → n=150 path + v1.8 real-debate platinum tier 검증

**Cycle**: 605 (2026-05-18)
**Chain**: explore-idea (lite, improvement saturation trigger 7 = 13/15 ≥ 12 충족)
**Status**: spec 박제 + 사용자 review 대기 (partial)

---

## 발화 맥락

- **2-chain alternation lock 발동** (cycle 597-604 distinct=2: review-code 7 + skill-evolution 1) → review-code 잠금 cooldown N=1
- **improvement saturation trigger 7** (cycle 210 박제): 직전 15 cycle review-code+fix-incident+polish-ui+info-arch 합계 13/15 ≥ 12 → explore-idea 자연 redirect
- **cycle 525 영구 opt-out** (trigger 5 평가 제외) 와 무관 — saturation trigger 7 = chain pool trigger 별개

## carry-over evidence stack

| Source | 시점 | 핵심 |
|---|---|---|
| `2026-05-18-cycle-549-...weekday-credit-fail-hypothesis.md` | cycle 549 | "평일 100% fail / 주말 100% real" 가설 박제 (n=25) |
| `2026-05-18-cycle-557-...credit-hypothesis-falsification.md` | cycle 557 | 5/13 (Wed) 5/5 real / 5/16 (Sat) 2/5 / 5/17 (Sun) 1/5 → 가설 falsify, H5 (rate limit + 동시 호출) 신가설 |
| `~/.develop-cycle/cycles/542.json` | cycle 542 | real-debate 첫 10건 도달 (Sat 5 + Sun 5, 50% acc) |
| `~/.develop-cycle/cycles/557.json` | cycle 557 | predict path vs postview path 분리 — postview UTC 09 = 5/5 real |
| TODOS.md "v2.0 가중치 트래킹" | cycle 387 갱신 | n=150 임계 / Δ 분석 / v2.0 후보 표 |
| `docs/lessons/2026-05-14-anthropic-credit-silent-fallback-v18.md` | cycle 458 lineage | silent fallback path family (PR #372) |

## 현재 상태 (cycle 605)

- **검증 n**: 119 (TODOS v2.0 트래킹 99건 기준 + 이후 20건 누적 추정, 정확치 op-analysis lite 시 측정)
- **v2.0 임계**: n=150 — **31건 잔존**
- **v1.8 scoring_rule**: 25건 누적 (credit-fail 15 + real-debate 10)
- **real-debate 첫 10건**: 5/16 ~ 5/17 Sat 5 + Sun 5, accuracy 50%
- **predict path stability gap**: postview UTC 09 = 5/5 real / predict cron UTC 02 = 1/5 ~ 5/5 oscillation

## v2.0 전진 plan (3 step)

### Step A — n=119 baseline 정확 측정 (op-analysis lite, 다음 cycle 후보)

```sql
-- predictions table 누적 n + v1.8 sub-cohort
SELECT
  scoring_rule,
  model_version,
  COUNT(*) AS n,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::float / COUNT(*) AS accuracy,
  AVG(POW(home_win_prob - CASE WHEN winner_team_code = home_team_code THEN 1 ELSE 0 END, 2)) AS brier
FROM predictions
WHERE verified_at IS NOT NULL
GROUP BY scoring_rule, model_version
ORDER BY scoring_rule, model_version;
```

진단 결과 박제 위치: cycle (N+1) cycle_state.diagnosis.key_findings

### Step B — H5 (rate limit + 동시 호출) 검증 — fix-incident heavy 후속

cycle 557 spec 검증 step 3건 인계:

1. **agentError detail 분류**: `predictions where scoring_rule='v1.8' AND model_version='v1.8'` 의 `metadata->>'agentError'` HTTP status / message → `rate_limit_error` / `insufficient_credit` / `timeout` 분리. cloudflare-worker 로그 또는 Sentry breadcrumbs 우선.
2. **cron stagger 실험**: `cloudflare-worker/src/index.ts` 5 게임 직렬 호출 사이 30s sleep 도입. 5/19 ~ 5/26 1주 측정 — fail ratio 감소 시 H5 confirm.
3. **Anthropic console usage time-series**: UTC 02 (predict cron) vs UTC 09 (postview) 동시간대 token 누적 비교 — 사용자 action.

### Step C — n=150 도달 후 v2.0 가중치 확정 (op-analysis heavy)

- backtest harness (`packages/kbo-data/scripts/backtest.ts` 또는 신규 작성) 위 v1.8 25건 + 이후 31건 real-debate sub-cohort 기준 factor 정보가치 재측정
- TODOS v2.0 후보 표 (elo 8→13 / bullpen 10→14 / recent 10→13 / lineup 15→12 / sp_fip 15→8 / ...) Δ 95% CI 적용
- n=150+ 도달 후 SFR 극단값 (>0.7) 케이스 cap 또는 head_to_head 가중치 재검토 (cycle 256 박제 후보)
- v1.6 anomaly (37.0% n=46) era 분리 backtest — v1.6 시기 가중치 자체 역방향 가능성 검증

## 위험 & 가드

| 위험 | mitigation |
|---|---|
| n=150 도달 timing 불확실 (KBO 시즌 진행 의존) | cycle 단위 baseline 측정 — n=119/125/130/135/140/145 단계별 op-analysis lite (5건 단위) |
| H5 검증 stagger 후에도 fail 잔존 | H3 (Anthropic daily quota) 잔존 가설 → 사용자 monitor + retry-after 보정 별개 PR |
| v2.0 가중치 확정 후 prod 전환 시 silent fallback 재발 | PR #372 family fix (`mv='v1.8'` 강등 라벨) 작동 검증 + Sentry alert 의무 |
| backtest harness 부재 시 step C 막힘 | cycle 22 spec (`h1-bootstrap-ci-cycle22.md`) 잔재 + cycle 57 backtest-validation-results 박제 — 기존 harness 재활용 |

## 다음 cycle 후속 후보 (chain pool 매핑)

| Step | 권장 chain | mode | 발화 timing |
|---|---|---|---|
| A | operational-analysis | lite | 다음 1~2 cycle 안 (25-cycle gap trigger 미충족, 단 step A 명시) |
| B | fix-incident | heavy | step A baseline 후 (cycle 596 fire 9 cycle gap, 20-cycle 미충족 — 본 spec evidence 로 자연 매핑) |
| C | operational-analysis | heavy | n=150 도달 시 (날짜 미지정) |

## chain pool 변화 X

본 spec = product direction 통합 plan. 신규 chain 후보 X. 기존 op-analysis + fix-incident 자연 redirect.

## 후속

- 사용자 review pending — spec 박제 only, 구현 X
- 본 spec 가시화 = 향후 cycle 의 op-analysis / fix-incident 발화 시 carry-over evidence 로 활용

## 관련

- `docs/superpowers/specs/2026-05-18-cycle-549-v18-weekday-credit-fail-hypothesis.md`
- `docs/superpowers/specs/2026-05-18-cycle-557-v18-credit-hypothesis-falsification.md`
- `docs/superpowers/specs/2026-05-14-cycle-400-v2-transition-readiness.md`
- `docs/lessons/2026-05-14-anthropic-credit-silent-fallback-v18.md`
- TODOS.md "v2.0 가중치 트래킹" 섹션
- cycle 542 / 549 / 557 / 600 cycle_state JSON

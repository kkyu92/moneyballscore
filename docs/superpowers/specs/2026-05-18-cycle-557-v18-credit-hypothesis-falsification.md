# v1.8 평일/주말 credit-fail 가설 falsification — 5/13~5/17 데이터 검증

**Cycle**: 557 (2026-05-18)
**Chain**: fix-incident (lite, 23 cycle 미발화 trigger 7)
**Status**: cycle 549 가설 일부 반례 — 새 가설 후보 갱신, 코드 변경 X

---

## 출처 carry-over

- **cycle 549 explore-idea PARTIAL** (`2026-05-18-cycle-549-v18-weekday-credit-fail-hypothesis.md`): "평일 100% credit-fail / 주말 100% real-debate" 가설 박제
- **cycle 542 op-analysis lite SUCCESS**: 평일 5건 (Wed/Thu/Fri) 모두 credit-fail / 주말 10건 (Sat 5 + Sun 5) 모두 real-debate 측정 (당시 n=25)
- **TODOS.md** (2026-05-16): "credit 복구 완료 (5/16 user action), 다음 predict cron 첫 fire 검증 항목 — totalTokens>0 + reasoning 정상 + mv='v2.0-debate' 라벨"

## 검증 데이터 (predicted_at 2026-05-13 ~ 2026-05-17 UTC, predict path)

```
predictions where predicted_at >= 2026-05-13 (predict path 만, postview 제외)

| Date (UTC) | total | v2.0-debate | v1.8 (강등) | real ratio |
|---|---|---|---|---|
| 2026-05-13 (Wed) | 5 | 5 | 0 | 100%  ← 평일 fail 가설 반례
| 2026-05-14 (Thu) | 5 | 0 | 5 |   0%  ← 일치
| 2026-05-15 (Fri) | 5 | 0 | 5 |   0%  ← 일치
| 2026-05-16 (Sat) | 5 | 2 | 3 |  40%  ← 주말 real 가설 반례
| 2026-05-17 (Sun) | 5 | 1 | 4 |  20%  ← 반례
```

## falsification

cycle 549 가설 = "평일 100% fail / 주말 100% real" — **2/5 일 반례**:

1. **5/13 (Wed 평일)**: 5/5 real-debate. 평일 fail 가설 단일 반례 1건만으로 가설 falsify.
2. **5/16 (Sat 주말)**: 2/5 real (partial). 주말 real 가설 반례.
3. **5/17 (Sun 주말)**: 1/5 real (partial). 반례.

원래 가설 (n=25, 5/13 이전 데이터 0건) 은 표본 timing 문제 — cycle 549 시점에 5/13 데이터 미 반영 + 5/16 credit 복구 후 데이터 미 반영.

## 새 가설 (재 우선순위)

기존 H1~H4 중 H3 (Anthropic API credit 일자별 quota) 가 잔존 — 5/13 신규 데이터 + 5/16 부분 회복 + 5/17 재 fail 패턴이 quota 한도 가설과 일치:

```
5/13 (Wed): credit 충분 → 5/5 real
5/14~15: credit 누적 소진 → 5/5 fail (사용자 5/16 credit 충전 trigger)
5/16 (Sat): 충전 직후 → 2/5 real (cron fire 시점에 charge 부분 반영, race 가능)
5/17 (Sun): 다시 한도 도달 → 1/5 real (5/16 fire 분량 + 5/17 fire 시점 quota 소진)
```

새 H5 후보 — **cron 시각 race + 5 게임 동시 호출 rate limit**:
- 5 게임 동시 직렬 호출 (`debate.ts` Promise.all 또는 sequential) → 일부만 통과
- 5/16 2/5 partial = rate limit 후 retry 통과 가능성

H1/H2 (region rate-limit / Cloudflare IP) 약화 — 평일 5/13 100% real / 5/14 100% fail 같은 시각대 갈리는 패턴은 region/IP 가설로 설명 어려움.

H4 (SP 미확정) 일부 잔존 — 단 5/13 (수 평일) 5/5 real 이면 SP 확정 자연. SP 미확정 가설은 평일/주말 분리 보다는 게임별 분리.

## postview path 비교 (5/17 UTC)

```
predict (UTC 02:19): 5 게임 중 1건 real (mv=v2.0-debate)
postview (UTC 09:01~09:03): 5 게임 중 5건 real (mv=v2.0-postview)
```

postview path 가 predict path 보다 안정. 차이:
- predict: cron 5 게임 동시 fire (시간 윈도우 좁음)
- postview: 각 게임 종료 후 분산 fire (시간 분산)

→ H5 (rate limit + 동시 호출) 보강 evidence.

## action 분기

- **코드 변경 가능 영역** (cron 시각 분산): `cloudflare-worker/` cron schedule 시각 5분 ~ 30분 분산 또는 게임별 stagger
- **외부 영역**: Anthropic API daily quota 충전 + monitoring (사용자 action)
- **본 cycle 557 = action X**: lite 진단 baseline 박제 + 가설 갱신만. fix-incident heavy 후속 권장 (rate-limit 회피 cron stagger 구현 또는 retry-after 보정)

## 검증 step (다음 fix-incident heavy 권장)

1. **agentError detail 분류**: `predictions where scoring_rule='v1.8' AND model_version='v1.8'` 의 `metadata->>'agentError'` HTTP status / message — `rate_limit_error` / `insufficient_credit` / `timeout` 분리
2. **cron stagger 실험**: `cloudflare-worker/src/index.ts` 5 게임 직렬 호출 사이 30s sleep 도입 — 5/17 fail 4건이 timeout 이면 stagger 가 회복
3. **Anthropic console usage time-series**: UTC 02 vs 07 fire 시각의 daily 누적 비교 (사용자 action)

## chain pool 변화 X

본 lesson = 데이터 검증 + 가설 갱신. 신규 chain 후보 X. 기존 fix-incident heavy / operational-analysis heavy 로 자연 redirect.

## 후속

- 다음 fix-incident heavy trigger (사용자 자연 발화 또는 23 cycle 후 주기 보정) 시 본 spec H5 (rate limit + cron stagger) 우선 검증
- ~~n=150 도달 (v1.8 real-debate 표본 ≥ 31건 추가) 시 op-analysis heavy 가중치 v2.0 확정 — 본 lesson H3/H5 분리 측정 통합~~ **cycle 1493 갱신 (wave 217): closed — v1.8 유지 확정 (cycle 1460, n=178 crossed, Brier default 0.2443 vs learned 0.2458 diff <1pp) → v2.0 upgrade 불필요, 본 후속 trigger 무효화.**

## 관련

- `docs/superpowers/specs/2026-05-18-cycle-549-v18-weekday-credit-fail-hypothesis.md`
- `docs/lessons/2026-05-14-anthropic-credit-silent-fallback-v18.md`
- TODOS.md v2.0 가중치 추적 섹션
- cycle 542 / 549 cycle_state JSON (`~/.develop-cycle/cycles/{542,549}.json`)

# cycle 607 — H5 (rate limit + 동시 호출) 가설 falsification + validator hallucination family 정량화

## 요약

- **chain**: fix-incident (heavy)
- **trigger**: cycle 605 spec Step B 명시 + cycle 606 next_rec confirmed
- **결과**:
  - H5 (rate limit + 동시 호출) 가설 **falsified** — v1.8 silent fallback 17건 ground truth 중 rate_limit_error 0건, server_error 0건
  - 진짜 silent fallback family 정량화 — `validator hallucinated_number:hard` 7건 (5/16~5/17) + credit_exhausted 5건 (5/15, cycle 458 family 잔재) + agentError null silent path 5건 (5/14)
- **spec 영향**: cycle 605 Step B "cron stagger 30s sleep" 직접 적용 불필요. 신 mitigation 방향 박제 (v1.6 team-agent prompt / NUMERIC_WHITELIST 확장 / 강등 라벨 분류 세분화)

## H5 가설 (cycle 557 박제 + cycle 605 spec)

> postview UTC 09 = 5/5 real / predict cron UTC 02 = 1/5 ~ 5/5 oscillation → "rate limit + 동시 호출" 의심.
> 추정 path: 5 게임 직렬 호출 + game 안 3 agent (home/away/calibration) `Promise.all` 동시 호출 + Anthropic minute-bucket rate limit 영향.
> Step B 검증: agentError detail 분류 → rate_limit_error / insufficient_credit / timeout 분리. cron stagger 30s sleep 실험 후속.

## ground truth (cycle 607 Supabase query)

쿼리: `predictions where scoring_rule='v1.8' AND model_version='v1.8' AND verified_at IS NOT NULL ORDER BY created_at DESC LIMIT 50` (17건).

### date × category 분포

| 날짜 (KST 변환) | category | n | 정확 메시지 |
|---|---|---|---|
| 5/14 (Thu) | `(no_agentError)` | 5 | reasoning.debate.agentsFailed=null + verdict.reasoning="에이전트 토론 불가. 정량 모델 v1.8 결과 사용." — schema parity 부족 path |
| 5/15 (Fri) | `credit_exhausted` | 5 | `API 400 {...credit balance is too low...}` (cycle 458 family 잔재, 사용자 충전 직전) |
| 5/16 (Sat) | `validator_hallucination` | 3 | `validator: hallucinated_number:hard (주입 블록에 없는 수치 N개)` — N=1,1,1 |
| 5/17 (Sun) | `validator_hallucination` | 4 | 동일 패턴 — N=1,2,4,6 |

### 누적

- `validator_hallucination` (NEW family 정량화): **7건** — judge agent 가 아니라 **team agent (Haiku)** path
- `credit_exhausted`: **5건** — cycle 502 lesson + cycle 458 PR #372 family (이미 박제, 사용자 충전 후 0건 회복)
- `(no_agentError)`: **5건** — reasoning.debate.agentsFailed null + fallback 텍스트만. cycle 386 fix-incident 의 schema parity 가드가 cover 못 한 path
- `rate_limit_error` / `server_error` / `timeout`: **0건** ← H5 falsification

## H5 falsification 결론

- 17건 ground truth 중 rate-related 0건. cron stagger 30s sleep 실험 = 직접 가치 없음
- v1.8 silent fallback 의 진짜 원인 = **team-agent.ts validator strict mode** (HARD_LIMIT=0, hallucinated_number:hard 1건이면 reject) + Haiku 한국어 reasoning 안 입력 블록에 없는 ERA/FIP/wRC+ 수치 자연 생성

## 진짜 root cause path (cycle 502 lesson 재확인 + 정량화)

```
team-agent.ts:124  result = await callLLM<TeamArgument>(haiku, ...)
team-agent.ts:126  validateTeamArgument(result.data, context, mode='strict')
validator.ts:230   checkHallucinatedNumbers — outputNums - injectedNums - derivedNums - NUMERIC_WHITELIST
                   1건이라도 남으면 severity='hard' (HARD_LIMIT=0)
team-agent.ts:148  return { ...result, success: false, error: 'validator: hallucinated_number:hard (...)' }
debate.ts:35-42    homeResult.data null → fallback default homeArg
debate.ts:62       judge runs with fallback (실제로는 quant 결과만 보고 verdict)
debate.ts:87       evaluateAndCaptureAgentFallback → agentsFailed=true, agentError 박제
daily.ts:621       errors.push + debateSucceeded=false
daily.ts:636       decideModelVersion → mv='v1.8' 강등 라벨
```

## 신규 hallucinated 수치 패턴 (7건 정확 수치)

| id | 수치 | 추정 출처 |
|---|---|---|
| 1268 | 98 | wRC+ 추정 (90-110 범위) |
| 1271 | 108 | 동일 |
| 1272 | 7.8 | WAR/runs/something — 단일 |
| 1336 | 4.87 | ERA/FIP 추정 |
| 1337 | 105, 3.6, 4.71, 4.68, 6.8, 1.5 | wRC+ + FIP + 무관 수치 6개 |
| 1338 | 4.3, 108 | FIP + wRC+ |
| 1340 | 2.95, 4.59, 98, 7.49 | ERA + FIP + wRC+ + ? |

공통: **ERA / FIP / wRC+** 범위 수치 — 야구 통계 정형 범위 안에서 Haiku 가 자연 생성. NUMERIC_WHITELIST 는 jersey number / 일반 % 만 (0-100 + 50,20,30...). 야구 stat 정형 수치는 whitelist 외.

## mitigation 방향 후보 (코드 변경 없이 spec only 박제)

### A. team-agent prompt 강화 (low risk)

- BASE_PROMPT 끝에 "주입 블록 외 수치 인용 금지 — 정성 표현 ('낮은 FIP', '상위권 wOBA') 만 허용" 명시
- 현 prompt 확인 후 단일 line 추가

### B. NUMERIC_WHITELIST 확장 (medium risk — false negative 위험)

- 야구 통계 정형 범위 whitelist 추가 (ERA 0-10, FIP 0-10, wRC+ 50-200) — 그러나 hallucination 수치도 통과시킴 → 검증 약화

### C. severity strategy 변경 (high risk — accuracy 영향)

- hallucinated_number 1건 = warn 으로 강등 (cycle 502 추정)
- 2건+ 이면 hard (현 HARD_LIMIT=0 유지)
- WARN_LIMIT (현 2) 안 범위 = pass

### D. 강등 라벨 분류 세분화 (zero-risk, observability only)

- model_version `v1.8` → `v1.8-vfail` (validator fail) / `v1.8-credit` (credit) / `v1.8-other` 3개로 세분
- v2.0 전진 시 sub-cohort 정확 측정 가능 — 진짜 토론 정확도 vs 강등 라벨 정확도 분리

## cycle 605 spec 갱신 권장

```diff
- Step B — H5 (rate limit + 동시 호출) 검증 — fix-incident heavy 후속
+ Step B — validator hallucination family mitigation — fix-incident heavy 후속
  
- 1. agentError detail 분류
- 2. cron stagger 실험
- 3. Anthropic console usage time-series
+ 1. team-agent prompt "주입 외 수치 인용 금지" 단일 line 추가 (option A)
+ 2. NUMERIC_WHITELIST 확장 또는 severity 변경 (option B/C — 추가 검증)
+ 3. v1.8 강등 라벨 sub-version 세분화 (option D — observability)
```

## v2.0 전진 영향

- n=119 baseline 중 v1.8 silent fallback **mv='v1.8' 17건** 의 진짜 분류:
  - 7건 validator hallucination (team agent 정성 표현 부족)
  - 5건 credit (이미 해결)
  - 5건 schema parity null path (cycle 386 후속)
- v1.8 25건 중 silent fallback 17건 / real-debate 10건 분리 (cycle 606 박제 정확)
- v2.0 가중치 확정 (n=150 임계 도달 후) 시 real-debate sub-cohort 만 사용 (cycle 606 권장 유지)

## carry-over (cycle 608+)

- mitigation option A (prompt 단일 line) 다음 cycle 후보 — review-code (heavy) 또는 fix-incident (heavy) 차원
- 5/14 5건 schema parity 부재 path 추가 조사 (cycle 386 fix 가 cover 못 한 sub-path) — cycle 608+ fix-incident 후보
- v1.8 강등 라벨 세분화 (option D) v2.0 전진 prerequisite 후보

## 관련

- `docs/lessons/2026-05-16-v18-credit-recovery-validator-hard-fail.md` (cycle 502 단일 사례 첫 박제)
- `docs/lessons/2026-05-14-anthropic-credit-silent-fallback-v18.md` (cycle 458 PR #372 family)
- `docs/superpowers/specs/2026-05-18-cycle-605-v2-transition-roadmap.md` (Step B 정정 대상)
- `~/.develop-cycle/cycles/606.json` (n=119 baseline 박제)

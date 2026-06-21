---
cycle: 1311
chain: explore-idea (lite)
mode: doc-only (자동 fire 환경 AskUserQuestion hang 차단)
trigger: alt-lock 발동 distinct=1 + saturation 13/15 ≥ 12 + wave 100 후보 grep 진단 결과 0
status: spec_only
---

# cycle 1311 — explore-idea (lite) post-wave-99 saturation redirect

## 1. context

silent drift family wave streak: wave 41~99 (59 wave 누적, cycle 1199 → cycle 1310). 본 saturation 단계 = 59 wave SUCCESS 박제 후 redirect. cycle 1299 (post-wave-90) 직후 12 cycle 안 wave 91~99 9연속 신규 family 재발 → 본 cycle saturation 재검토.

직전 saturation redirect cycle (7번째):
- cycle 1209 (post-wave-38) → wave 39 review-code heavy 자연 매핑
- cycle 1258 (post-wave-60) → wave 61 review-code heavy
- cycle 1267 (post-wave-67) → wave 68 review-code heavy
- cycle 1276 (post-wave-74) → wave 75 review-code heavy
- cycle 1290 (post-wave-84) → lotto chain redirect (cycle 1291/1292) → wave 85 자연 재발 (cycle 1293)
- cycle 1299 (post-wave-90) → cycle 1300 skill-evolution milestone forced fire → wave 91 자연 재발 (cycle 1301)
- **cycle 1311 (post-wave-99)** → 본 cycle, 다음 direction redirect

## 2. saturation evidence

### 2.1 alt-lock 발동 (cycle 225 룰)

직전 8 cycle distinct chain = **1** (review-code 8 consecutive) ≤ 2 → **lock 발동**. review-code 후보 자동 제외. distinct=1 = 사상 최고 dominance (cycle 1299 distinct=2 대비 강화).

### 2.2 improvement saturation (trigger 7 explore-idea)

직전 15 cycle (1296-1310) review-code + fix-incident + polish-ui + info-architecture-review 사이클 분포:
- review-code: 12
- fix-incident: 1 (cycle 1302)
- info-architecture-review: 0
- polish-ui: 0
- 합계: **13/15 ≥ 12** met (cycle 1290/1299 13/15 패턴 동일 재발)

| 직전 20 cycle 분포 (1291-1310) | 횟수 |
|---|---|
| review-code | 15 |
| lotto | 2 |
| skill-evolution | 1 |
| fix-incident | 1 |
| explore-idea | 1 |

review-code dominance 75% = wave 91-99 silent drift family sweep 자연 channel.

### 2.3 wave 100 후보 grep 진단 결과 = 0

본 cycle 진단 단계 grep evidence (runtime code only, tests/__tests__ 제외, sitemap/methodology 히스토리 라벨 / lib/accuracy 모델 히스토리 metadata 제외):

```bash
rg -n "NEUTRAL_HI|NEUTRAL_LO" apps/moneyball/src --type ts -g '!**/__tests__/**'
# = 모두 factorLabels.ts registry import 통과 (factor-accuracy.ts, factor-explanations.ts)
# = hardcoded 0.45/0.55 재선언 0건

rg -n "0\.45|0\.55" apps/moneyball/src --type ts -g '!**/__tests__/**'
# = 매칭 다수, 단 모두 별개 context:
#   - buildWeeklyReview.ts: winnerProb < 0.55 classifier (WINNER_PROB_LEAN registry 통과)
#   - buildMonthlyReview.ts: accuracyRate <= 0.45 (label threshold, 별개 도메인)
#   - accuracy/page.tsx: heatmap fill color threshold (별개 visualization layer)
#   - guide/page.tsx: 사용자 가시 설명 텍스트 (model description, registry 노출 X)
#   - sitemap.ts: priority 0.55 (별개 SEO 도메인)
```

추가 grep — v1.8/v2.0/wave 후보 layer:
- 사용자 가시 wave 88 (cycle 1296) SUCCESS 후 잔여 = developer surface (lib/accuracy heatmap rows / debug labels / shadow-pair regex fallback) + guide page 의 모델 히스토리 라벨 / calendar page 의 PRODUCTION_COHORT_RULES filter 주석.
- wave 91~99 9 cycle 안 NEUTRAL_FACTOR / HOME_ELO_BONUS / HOME_ADVANTAGE / V2_PROMOTION_COHORT_N / RECENT_FORM_GAMES / WINNER_PROB_CLAMP_MIN/MAX / ELO_NEUTRAL / HOME_ADVANTAGE_PCT 등 hardcoded registry sweep 완료.
- 모두 **모델 히스토리 metadata 또는 cohort filter 주석** = 사용자 가시지만 **현재 상태 단언 X** (즉, "v1.8 사용 중" 단언 표기 = 모두 CURRENT_SCORING_RULE registry 통과 박제 후 잔여 = 히스토리 / metadata layer만)

**wave 100 자연 발화 X = silent drift family wave 41-99 자연 종료** (59 wave SUCCESS streak 박제, 사상 최장).

## 3. lock check

직전 8 cycle distinct chain = **1** (review-code 8) → **lock 발동**. review-code 본 cycle 후보 제외 강제. distinct=1 = 사상 최고 dominance.

review-code 8/8 dominance = wave 91-99 신규 family sweep 자연. wave 99 직후 자연 종료 evidence 명확 → break 자연.

## 4. post-wave-99 direction 후보

### Direction A — info-architecture-review (trigger 9 임박, gap=29 → cycle 1312 자연 도달)

last fire = cycle 1282 (gap=29 in cycle 1311). trigger 9 (≥ 30 cycle gap, cycle 300 박제) = cycle 1312 자연 도달 (gap=30).

본 cycle (1311) = trigger 9 1 cycle 미달. 직접 매핑 X. 단 cycle 1312 진단 단계서 자연 fire 기대.

### Direction B — operational-analysis (trigger 7 임박, gap=23 → cycle 1313 자연 도달)

last fire = cycle 1288 (gap=23 in cycle 1311). trigger 7 (≥ 25 cycle gap, cycle 255 박제) = cycle 1313 자연 도달 (gap=25).

본 cycle (1311) = trigger 7 2 cycle 미달. 직접 매핑 X. v1.8 cohort 측정 진척 (cycle 1288 n=108 → cycle 1313 n=~115~120 추정, velocity ~0.3건/cycle flatline).

### Direction C — fix-incident (trigger 7 gap=9, 미달)

last fire = cycle 1302 (gap=9 in cycle 1311). trigger 7 (≥ 20 cycle gap) = cycle 1322 자연 도달. 본 cycle 직접 매핑 X.

### Direction D — lotto (trigger 6 gap=19, 미달 + alt-lock 제외)

last fire = cycle 1292 (gap=19 in cycle 1311). trigger 6 (≥ 30 cycle gap, cycle 772 박제) = cycle 1322 자연 도달. 본 cycle 직접 매핑 X. next 토 = 2026-06-27 (1230회) picks already ship (cycle 1292).

### Direction E — explore-idea heavy (carry-over spec 부족)

plan #3~23 모두 completed 또는 user_pending. 자율 영역 spec 0건. heavy 모드 매핑 X = lite spec only 본 cycle 진행.

## 5. recommendation

**cycle 1312 = info-architecture-review trigger 9 자연 fire (gap=30 도달)**.

본 cycle (1311) = lite spec only outcome=success → cycle 1312 자연 진입 시 info-architecture-review chain 자연 fire (trigger 9 30-cycle gap = info-arch 14th 30-cycle gap checkpoint, post-cycle 1282 13th).

post-info-arch direction = cycle 1313 부터:
- operational-analysis (cycle 1313 = trigger 7 gap=25 자연 도달)
- review-code wave 100+ (grep evidence 새 family 자연 발견 시 자연 redirect)

## 6. self-verification

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  value: medium (direction spec 박제 + saturation redirect 7번째 박제 evidence)
  time_cost: small (1 cycle 안 lite mode 수렴)
  risk: 0 (doc-only, no code change)
  autonomy: yes (본 메인 직접 fire, 사용자 결정 X)
  dependency: none (cycle 1312 info-arch trigger 9 별도 자율 trigger)
  baseline_wave_streak: 59 (wave 41~99 누적, 사상 최장)
  baseline_saturation_period: 12 cycles (post-1299 → 1311, prior 9 cycles post-1290→1299)
  baseline_alt_lock: 1-distinct (review-code 8 in prior 8, 사상 최고 dominance)
  baseline_review_code_dominance: 75% (15/20 in prior 20 cycles)
```

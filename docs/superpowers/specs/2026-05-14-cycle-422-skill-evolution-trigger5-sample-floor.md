# Cycle 422 — skill-evolution 23회째: trigger 5 표본 minimum 임계 (chain pool 사이클 ≥ 10)

## Problem

cycle 421 retro 끝 트리거 5 충족 → skill-evolution-pending 마커 박제 → 본 cycle 422 자동 발화. 마커 박제 사유:

직전 20 cycle (402~421) chain 분포:
- **lotto: 15/20 (75%)** — chain pool 외 차원 (dual-cycle policy, `feedback_dual_cycle_policy.md` 박제)
- review-code: 2/20 (10%)
- fix-incident: 2/20 (10%)
- operational-analysis: 1/20 (5%)
- **explore-idea: 0/20 (0%)** ← trigger 5 충족
- **polish-ui: 0/20 (0%)** ← trigger 5 충족

**근본 진단 — false positive (분모 왜곡)**:

trigger 5 평가 (cycle 278/300 룰) = 영구 opt-out 6개 제외 후 평가 대상 3개 (review-code / explore-idea / polish-ui) 중 0회 발화 검사. 본 평가는 분모 = "직전 20 cycle" 가정. 그러나 본 cycle 윈도우 안:

- lotto batch 15 cycle = chain pool 등록 X (`feedback_dual_cycle_policy.md` 정책 외부 차원, develop-cycle skill 안 진행하지만 chain pool table 등록 chain 아님)
- chain pool 안 chain 사이클 = 5개 (review-code 2 + fix-incident 2 + op-analysis 1)
- 표본 5 cycle 에서 3 chain 만 발화 = 자연 (5 cycle 안 6+ chain 분산 불가능)

즉 trigger 5 가 의도된 표본 = "최근 chain pool 활동" 인데, lotto batch 가 분모 왜곡 → 표본 5 cycle 만으로 0회 검사 → false positive.

**유사 패턴 예상**: 미래 chain pool 외 차원 batch (lotto / 다른 dual-cycle policy / 외부 dispatch) 가 직전 20 cycle 안 ≥ 11 cycle 차지 시 동일 false positive 재발.

**cycle 278 룰 (영구 opt-out 6개 제외) 과 보완**: opt-out 룰은 "특정 chain 의 0회 발화 정상" 처리. 본 cycle 룰은 "분모 자체 표본 부족 시 평가 skip" 처리. 두 룰 모두 false positive 차단 메커니즘.

## Changes

### 1. SKILL.md trigger 5 평가 명령 — 표본 minimum 임계 추가

위치: line 422 (skill-evolution trigger 자동 평가 table).

```diff
- | 5 | 직전 20 사이클 동안 chain pool 의 chain 1개가 0회 발화 (영구 opt-out 6개 제외) | 직전 20 cycle_state JSON 의 `chain_selected` distinct count vs 평가 대상 3개 (review-code / explore-idea / polish-ui) 비교. 영구 opt-out 6개 (dimension-cycle / expand-scope / design-system / operational-analysis / fix-incident / info-architecture-review) 0회 발화여도 trigger 5 미충족 (cycle 278 박제 + cycle 300 info-arch 추가) |
+ | 5 | 직전 20 사이클 동안 chain pool 의 chain 1개가 0회 발화 (영구 opt-out 6개 제외, **표본 ≥ 10**) | 직전 20 cycle_state JSON 의 `chain_selected` distinct count vs 평가 대상 3개 (review-code / explore-idea / polish-ui) 비교. 영구 opt-out 6개 (dimension-cycle / expand-scope / design-system / operational-analysis / fix-incident / info-architecture-review) 0회 발화여도 trigger 5 미충족 (cycle 278 박제 + cycle 300 info-arch 추가). **표본 임계 (cycle 422 박제)**: 직전 20 cycle 안 chain pool 등록 chain (slug = 9개) 사이클 수 < 10 시 표본 부족 — trigger 5 평가 skip (자동 미충족). chain pool 외 차원 (lotto 등 dual-cycle policy batch / 외부 dispatch) 가 분모 차지 시 false positive 차단. |
```

### 2. SKILL.md chain pool table — skill-evolution row 갱신 (trigger 5)

위치: line 69 (skill-evolution row trigger 5).

```diff
- (5) 직전 20 사이클 동안 chain pool 의 chain 1개 0회 발화 (skill-evolution 자체 제외 — self-loop 차단)
+ (5) 직전 20 사이클 동안 chain pool 의 chain 1개 0회 발화 (skill-evolution 자체 제외 — self-loop 차단, **표본 ≥ 10 임계 cycle 422 박제** — chain pool 외 차원 batch 분모 왜곡 false positive 차단)
```

### 3. trigger 5 평가 명령 구체화

기존 평가 명령 (단계 4 회고 시점):
```bash
# 직전 20 cycle chain_selected distinct vs 평가 대상 3개 비교
```

신규 평가 명령:
```bash
# 1. 표본 측정
SAMPLE=$(for n in $(seq $((CYCLE_N - 20)) $((CYCLE_N - 1))); do
  python3 -c "import json; d=json.load(open('$HOME/.develop-cycle/cycles/$n.json')); print(d.get('chain_selected','?').split()[0])" 2>/dev/null
done | grep -cE '^(fix-incident|explore-idea|polish-ui|review-code|operational-analysis|dimension-cycle|expand-scope|design-system|info-architecture-review|skill-evolution)$')

# 2. 표본 < 10 시 trigger 5 평가 skip (자동 미충족)
if [ "$SAMPLE" -lt 10 ]; then
  echo "trigger 5 skip — chain pool 사이클 표본 $SAMPLE < 10 (표본 부족)"
else
  # 기존 평가 진행: 평가 대상 3개 0회 발화 검사
fi
```

### 4. frontmatter description 갱신

- skill-evolution 23회 반영 (cycle 422 추가)
- PASS_ship 갱신 (현재 카운트 confirm 필요 — cycle 400 spec 시 245 박제)

## Rationale

cycle 49 룰 (0회 발화 chain trigger 우선 검토) + cycle 68 룰 (trigger 5 false positive cooldown N=10) + cycle 278/300 룰 (영구 opt-out 6개 제외) = trigger 5 false positive 차단 3 layer 누적.

본 cycle 룰 = 4번째 layer — **분모 표본 부족 시 평가 skip**. 직교 메커니즘:

| Layer | 차단 대상 |
|---|---|
| cycle 49 | 0회 발화 chain trigger 자연 매핑 우선 (false negative 회피) |
| cycle 68 | 직전 skill-evolution 의도된 결과 cooldown N=10 (재충족 무한 loop 차단) |
| cycle 278/300 | 영구 opt-out 6개 (자체 주기 보정 trigger 보유 / 구조적 0회 정상) |
| **cycle 422** | **분모 자체 표본 부족 (chain pool 외 차원 batch 분모 왜곡)** |

본 cycle 케이스: 직전 20 cycle 안 chain pool 등록 chain 사이클 = 5개. 평가 대상 3개 중 5 cycle 안 3 chain (review-code / fix-incident / op-analysis) 만 발화 = 자연. lotto 15 cycle batch 가 분모 차지 = 표본 왜곡. 표본 임계 ≥ 10 미만 시 trigger 5 평가 skip = false positive 차단.

미래 dual-cycle policy 추가 / 외부 차원 batch 진행 시 자동 적용. lotto chain pool 등록 별도 검토 (chain pool 11번째 후보 — 본 cycle 외 carry-over).

## MIGRATION-PATH.md

cycle 422 entry append (SKILL.md 외부 파일, append only — cycle 252 박제 룰).

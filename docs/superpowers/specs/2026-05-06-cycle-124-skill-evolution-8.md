---
title: skill-evolution 8 — PASS counter decoupling fix + ship-0 emergency stop + lite-chain retro-only cap
date: 2026-05-06
cycle: 124
skill_evolution_n: 8
trigger: trigger-5 (직전 20 cycle = 4 chain 만 발화 / 5 chain 0회) + cycle 100 cooldown N=10 만료 (123-100=23)
related_dispatch: bb8c90e memory: meta-pattern cycle 123 — PASS counter vs ship counter decoupling
---

## 1. 문제 정의 (cycle 123 dispatch evidence)

cycle 86~122 = **37 cycle ship 0건** (마지막 ship f6d2709 cycle 85 polish-ui).

같은 37 cycle 동안:
- cycle 49 룰 PASS counter: 24 → 60 (36회 누적)
- 사이클 outcome 분포: PARTIAL 100% (success ship 0)
- 4 lite chain (review-code / polish-ui / op-analysis / explore-idea) 만 rotation
- 5 chain (fix-incident / dimension-cycle / expand-scope / design-system / skill-evolution) = 0회

**사용자 의문 발화** (2026-05-06): "그렇다고 500 사이클을 돌린이유가 있냐? 몇일뒤에 확인하라는거냐?"

→ counter 누적 = 사용자 가시 가치 부재. 메커니즘이 PARTIAL 자동 박제 + 그래도 PASS 카운트 = **skill 평가 지표 결함**.

## 2. 원인 가설 (cycle 123 dispatch)

1. cycle 49 룰 자체가 "0회 chain trigger 우선 검토 후 매핑 자연 X 시 dimension-cycle fallback" — fallback 이 정상 결과로 처리됨 + cooldown 박제. 0회 chain 영원히 0회 + PASS 카운트만 증가
2. 4 lite chain 모두 stop 조건 = retro-only 허용. lite rotation 시 ship 0 가능
3. retro-only PARTIAL outcome 박제 시 "carry-over evidence 부재 누적" 메시지 자동 박제 = 본질적 stop 신호인데 cycle 49 룰 PASS 는 그래도 카운트

## 3. 채택 결정 (3개 SKILL.md 갱신)

### 3.1 cycle 49 룰 PASS counter 분리 — PASS_eval / PASS_ship

**현재 SKILL.md 박제** (description + 진행상황):
- `cycle 49 룰 PASS 38+`, `cycle 49 룰 PASS 7회 누적 (cycle 50/56/63/64/65/66/67)`
- 단일 metric: 발화 측정 = ship 측정 (혼동)

**변경**:
- `PASS_eval`: 본 룰 적용 발화 측정 (= 진단 단계서 0회 chain trigger 우선 검토 후 매핑 자연 발화 또는 fallback). 룰 작동 여부 측정
- `PASS_ship`: 본 룰 발화 결과 실제 ship 박제 측정 (= success outcome + PR R7 머지). 룰 가치 측정

**SKILL.md 박제 갱신**:
- description 줄: `cycle 49 룰 PASS 38+` → `cycle 49 룰 PASS_eval 61 / PASS_ship 1 (cycle 50 polish-ui only — 86~122 ship 0)`
- 마이그레이션 path 단계 3 텍스트: `cycle 49 룰 PASS 7회 누적` → `cycle 49 룰 PASS_eval 7회 / PASS_ship 1회 (cycle 50)`

**의의**: PASS_eval 만 측정해선 룰 가치 측정 X. PASS_ship 분리 = 다음 skill-evolution trigger 평가 시 emergency stop 평가 source.

### 3.2 N cycle 연속 ship 0 emergency stop 메커니즘

**위치**: SKILL.md `## 사이클 단계 4 — 회고` 섹션 끝 (skill-evolution trigger 평가 직후 + signal file 작성 직전)

**정책**:
- 직전 10 cycle outcome = 모두 partial/retro-only (success 0건) → signal next_n=0 강제 + 사용자 알림 dispatch (`memory: meta-pattern emergency-stop` body)
- 평가 명령:
  ```bash
  PARTIAL_STREAK=$(for n in $(seq $((CYCLE_N - 9)) $CYCLE_N); do
    python3 -c "import json; d=json.load(open('$HOME/.develop-cycle/cycles/$n.json')); print(d['execution']['outcome'])" 2>/dev/null
  done | grep -cE 'partial|interrupted')
  if [ "$PARTIAL_STREAK" = "10" ]; then
    NEXT_N=0
    # emergency-stop dispatch
  fi
  ```

**의의**: 본 메인 자가 의심 차단 룰 (= 사용자 N 명시 시 그대로 진행) 의 단일 escape. 진짜 ship 0 누적 시 사용자에게 결정 요청. 본 룰의 `자가 의심 차단` 룰과 충돌 X — N=10 partial streak = 객관 evidence (자가 의심 X).

### 3.3 lite chain retro-only cap

**위치**: SKILL.md chain pool table 의 4 lite chain row (review-code / polish-ui / op-analysis / explore-idea)

**정책**: 같은 chain 직전 5 cycle 모두 outcome=retro-only 또는 partial = 그 chain cooldown N=10 (다음 10 cycle 안 발화 회피)

**평가 시점**: 단계 2 chain 선택 직전 (메인 자유 추론 input)

**평가 명령**:
```bash
# 각 lite chain 별 직전 5 cycle outcome
for chain in review-code polish-ui operational-analysis explore-idea; do
  STREAK=0
  for n in $(seq $((CYCLE_N - 5)) $((CYCLE_N - 1))); do
    SEL=$(python3 -c "import json; d=json.load(open('$HOME/.develop-cycle/cycles/$n.json')); print(d.get('chain_selected', '').split(' ')[0])" 2>/dev/null)
    OUT=$(python3 -c "import json; d=json.load(open('$HOME/.develop-cycle/cycles/$n.json')); print(d['execution']['outcome'])" 2>/dev/null)
    if [ "$SEL" = "$chain" ] && [ "$OUT" != "success" ]; then
      STREAK=$((STREAK + 1))
    fi
  done
  if [ "$STREAK" = "5" ]; then
    echo "COOLDOWN: $chain (5 연속 retro-only)"
  fi
done
```

**의의**: 4 lite chain rotation 만으로 cycle 49 룰 PASS_eval 누적 차단. cooldown 시 dimension-cycle / fix-incident / expand-scope / design-system 등 다른 chain 자연 발화 강제.

## 4. 비채택 결정

- **SKILL 비전 자체 변경** (예: "ship 강제 룰") → 비채택. 비전 = "스스로 상황에 맞게 스킬들을 활용". ship 강제는 비전 위반. emergency stop = 비전 안 escape (사용자 결정 요청)
- **lite chain 자체 폐기** → 비채택. lite chain = carry-over evidence 명확 시 가치 (cycle 56 PASS 사례). cap 만 추가
- **새 chain (예: ship-gate) 추가** → 비채택. 기존 chain pool 9개 충분. cap 메커니즘이 자연 redirect

## 5. 적용 시퀀스 (본 사이클 124)

1. spec write ✓ (본 파일)
2. SKILL.md 글로벌 Edit — 3개 영역
3. draft 동기 (`docs/develop-cycle-improvement-2026-05-01.md` reference 박제)
4. pnpm test smoke
5. commit `feat(skill): cycle 124 skill-evolution 8`
6. branch `develop-cycle/skill-evolution-8`
7. PR + R7 자동 머지 활성화
8. meta-pattern dispatch (변경 diff)
9. cycle_state JSON write
10. signal next_n=98 + active-cycle cleanup

## 6. 다음 fire 예상 evidence

본 사이클 ship (PR + R7 머지 success) → cycle 125 부터 새 메커니즘 적용:
- 진단 단계 chain 선택 시 lite chain cooldown 평가
- 회고 단계 끝 partial streak=10 평가 → emergency stop 가능
- 다음 cycle 49 룰 PASS 측정 = PASS_eval / PASS_ship 분리

cycle 134 (124 + 10) 시점에 emergency stop 메커니즘 첫 평가 — 본 사이클이 ship success 면 partial streak reset → 발화 X 정상.

cycle 144 (124 + 20) 시점에 trigger-5 재평가 (cooldown 만료). 단 본 사이클부터 lite chain cooldown 발화 시 0회 chain 자연 발화 빈도 증가 → trigger-5 false positive 감소 기대.

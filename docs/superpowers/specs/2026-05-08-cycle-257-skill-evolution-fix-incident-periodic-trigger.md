# Cycle 257 — skill-evolution 18회째: fix-incident 주기 보정 trigger + trigger 5 영구 opt-out

## Problem

직전 20 사이클 (237-256) chain 분포:
- explore-idea: 7/20 (35%)
- review-code: 4/20 (20%)
- polish-ui: 3/20 (15%)
- skill-evolution: 2/20 (10%)
- info-architecture-review: 2/20 (10%)
- operational-analysis: 1/20 (5%)
- unknown: 1/20 (5%)
- **fix-incident: 0/20 (0%)** ← 설계 gap

**fix-incident trigger 현재 = reactive only** (GH issues / Sentry / user incident). latent 운영 이슈가 trigger 생성 안 함.

Cycle 256 retro 명시: "fix-incident 0/20 fire + Cloudflare Worker 안정성 + 일요일 경기 파이프라인 점검 필요" — 후보 존재하나 발화 불가.

**2차 문제**: dimension-cycle/expand-scope/design-system 0/20 발화가 매 skill-evolution trigger 5 충족 → 의도된 결과 재인정 무한 loop (cycle 61/135 인정 후 cooldown N=10 만료 반복).

## Changes

### 1. fix-incident trigger (7) 신규 추가

chain pool 표 fix-incident 행에:
```
(7) 마지막 fix-incident 발화 이후 ≥ 20 사이클 (장기 미발화 주기 보정)
    — pipeline_runs 최근 7일 error rate + git log debug commit 강제 점검, lite 자동 권장 (cycle 257 박제)
```

### 2. 진단 source table — fix-incident gap 체크 명령 추가

```bash
for n in $(seq $((CYCLE_N-20)) $((CYCLE_N-1))); do
  python3 -c "import json; d=json.load(open('/Users/kyusikkim/.develop-cycle/cycles/$n.json'));
  c=d.get('chain_selected','?').split()[0]; print('$n' if c=='fix-incident' else '')" 2>/dev/null
done | grep -v '^$'
# 출력 없으면 20+ 사이클 미발화 = trigger 충족
```

### 3. skill-evolution trigger 5 — 영구 opt-out 추가

trigger 5 false positive cooldown 섹션에 append:

```
영구 의도 chain opt-out (trigger 5 평가 제외, cycle 257 박제):
dimension-cycle / expand-scope / design-system
— 구조적으로 0회 정상. cycle 61/135 인정 후 N=10 cooldown 만료 → 재인정 loop 차단.
  trigger 5 평가 시 이 3개 chain 제외 (0회 발화여도 trigger 5 미충족으로 처리)
```

### 4. frontmatter + description 갱신

- skill-evolution 18회 반영 (cycle 257 추가)
- PASS_ship 124 (cycle 256 기준) 업데이트

## Rationale

cycle 255: op-analysis 24-cycle gap trigger 추가 → cycle 256 정확히 발화. 동일 패턴을 fix-incident에 적용.

fix-incident 20-cycle gap trigger 추가 → cycle 258+ 부터 Cloudflare Worker / 일요일 파이프라인 등 latent 운영 이슈 자연 표면화 기대.

영구 opt-out은 cycle 61/135 두 번 인정된 "의도된 결과" chain들의 false positive loop를 항구적으로 차단.

## MIGRATION-PATH.md

cycle 257 entry append (SKILL.md 외부 파일, append only).

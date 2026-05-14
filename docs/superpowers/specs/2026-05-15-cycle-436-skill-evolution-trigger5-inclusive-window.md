# cycle 436 — skill-evolution 24회째: trigger 5 inclusive 윈도우 (N-19..N retro 단계)

**cycle**: 436
**chain**: skill-evolution (자동 발화 — marker `435: ab0495b3c397003214539763d6a6194cc15c037f`)
**outcome**: success (예상)
**PR**: TBD
**date**: 2026-05-15

## trigger

- trigger 5 (직전 20 cycle 동안 chain pool chain 1개 0회 발화) — cycle 435 retro 단계에서 fire
- cycle 435 chain = polish-ui (39 cycle 미발화 자연 해소). 진단 단계 0회 trigger 우선 검토 룰 (line 216 cycle 49) 이 자연 매핑한 결과
- 단 retro 단계 trigger 5 eval window 가 exclusive (N-20)..(N-1) = cycles 415-434 → polish-ui = 0 → marker 박제 → cycle 436 forced skill-evolution
- false positive: cycle 435 자체가 polish-ui 자연 해소했음에도 retro 단계 평가에 미반영

## evidence

직전 20 cycle (416-435) chain 분포 (cycle 435 = polish-ui 포함):

| chain | count |
|---|---|
| lotto (외부 차원) | 8 |
| fix-incident | 4 |
| review-code | 3 |
| operational-analysis | 1 |
| skill-evolution | 1 |
| info-architecture-review | 1 |
| explore-idea | 1 |
| polish-ui | 1 |

chain pool 등록 chain sample = 12 (lotto 제외) ≥ 10 (표본 임계 OK)

inclusive 윈도우 적용 시 polish-ui = 1 (cycle 435 fire 포함) → trigger 5 미충족 → false positive marker 차단

## 변경

1. `~/.claude/skills/develop-cycle/SKILL.md` line 422 trigger 5 평가 명령 seq:
   - 변경 전: `for n in $(seq $((CYCLE_N - 20)) $((CYCLE_N - 1)))`
   - 변경 후: `for n in $(seq $((CYCLE_N - 19)) $CYCLE_N)` (현재 cycle 포함)

2. `~/.claude/skills/develop-cycle/SKILL.md` line 422 description 에 단락 추가:
   ```
   inclusive 윈도우 (cycle 436 박제): 현재 cycle (= retro 작성 중) 의 chain_selected 포함하여 N-19..N 평가. 진단 단계 (line 221) 가 자연 발화 시킨 0회 chain 이 retro 단계에서도 0회로 잡혀 false positive marker 박제 되던 1-cycle 중복 차단. 진단 단계 (line 221) 는 현재 cycle 의 chain 미선택 상태이므로 exclusive (N-20..N-1) 유지 — 평가 시점 차이. cycle 435 polish-ui SUCCESS 후 retro 단계 trigger 5 false positive (window 415-434 polish-ui=0) → cycle 436 forced skill-evolution 박제 → 본 룰 추가.
   ```

3. `~/.claude/skills/develop-cycle/SKILL.md` line 69 skill-evolution row trigger 5 설명 에 "inclusive 윈도우 cycle 436 박제" 추가

4. `~/.claude/skills/develop-cycle/MIGRATION-PATH.md` cycle 436 entry append (append-only 룰 준수)

## 근거

- cycle 49 룰 = 진단 단계 0회 발화 chain 검출 시 자연 fire 권장 (skill-evolution 자체 발화 X 으로 0회 chain 자연 해소 path 제공)
- cycle 50 PASS = polish-ui 0회 → 진단 단계서 자연 fire → ship SUCCESS (R5 진짜 PASS)
- cycle 435 동일 패턴 = polish-ui 0회 → 진단 단계서 polish-ui fire → SUCCESS (PR #472)
- 단 retro 단계 trigger 5 eval window 가 exclusive (N-20..N-1) = 현재 cycle 의 chain_selected 미포함 → false positive marker → 1-cycle 중복 skill-evolution
- inclusive (N-19..N) = 현재 cycle chain 포함 → 자연 해소 chain count → trigger 5 미충족 → false positive 차단

## false positive 차단 layer 누적 (5번째)

| layer | cycle | 룰 |
|---|---|---|
| 1 | 49 | 0회 발화 chain trigger 우선 검토 룰 (진단 단계) |
| 2 | 68 | trigger 5 false positive cooldown (직전 skill-evolution 의도된 결과 시 N=10 회피) |
| 3 | 278 | 영구 의도 chain opt-out 5개 (dimension-cycle / expand-scope / design-system / operational-analysis / fix-incident) |
| 4 | 300 | 영구 의도 chain opt-out 6개째 (info-architecture-review) + 평가 대상 4개 → 3개 축소 |
| 5 | 422 | 표본 ≥ 10 임계 (chain pool 외 차원 batch 분모 왜곡 차단) |
| **6** | **436** | **inclusive 윈도우 N-19..N (retro 단계 평가 시 현재 cycle 포함)** |

진단 단계 (line 221) 는 exclusive (N-20..N-1) 유지 — 현재 cycle chain 아직 미선택 상태이므로 평가 시점 차이 명시.

## PASS_ship 누적

- cycle 435 기준 = 281 (cycle 421→435: 13 success + 1 partial)
- cycle 401-435 = 34 ship in 35 cycles (97% ship rate, 1 partial = cycle 433 explore-idea spec only)
- 다음 milestone: cycle 450

## 호환성

- 기존 cooldown 룰 (cycle 68) 호환: cooldown 활성 시 trigger 5 평가 skip → inclusive 윈도우 무관
- 기존 opt-out 룰 (cycle 278/300) 호환: 평가 대상 3개 (review-code/explore-idea/polish-ui) 만 inclusive 윈도우 평가
- 기존 표본 임계 (cycle 422) 호환: sample count 도 inclusive 윈도우 적용 (chain pool sample = 12 ≥ 10)
- 다음 cycle 437 진단 단계: line 221 exclusive 윈도우 = cycles 417-436. 본 cycle (436 = skill-evolution) chain pool 안. 자연 평가

## 자동 fire 환경 호환성

- 본 cycle 의 spec 작성 / SKILL.md Edit / MIGRATION-PATH.md append 모두 자동 fire 환경 OK (AskUserQuestion 발화 X)
- `/office-hours` skip 강제 (skill-evolution chain stop rule)
- 메인이 trigger evidence + 직전 N cycle pattern 종합으로 spec 직접 작성

## smoke test

`pnpm --filter @moneyball/shared test --run` = 73/73 PASS (4 files, 194ms)

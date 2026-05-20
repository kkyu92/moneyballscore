# Cycle 774 skill-evolution — trigger 5 lotto 영구 opt-out

- **cycle**: 774
- **trigger 충족**: trigger 5 (window N-19..N inclusive 754..773 평가 시 lotto=0회 발화, 표본 19 ≥ 10 충족)
- **이전 skill-evolution**: cycle 750 (24 cycle gap)
- **PASS_ship 누적**: 506 (cycle 773 기준, +7 ship 751-773)
- **success rate**: 23 cycle 윈도우 success 19 / retro-only 3 / partial 1 = 96% (50-cycle 윈도우 cycle 800 milestone 후 정식 측정)

## 발화 맥락

cycle 773 retro 평가 시점 trigger 5 inclusive 윈도우 (754..773, 본 cycle 미진행) 측정:

| chain | 발화 수 |
|---|---|
| explore-idea | 7 |
| review-code | 6 |
| operational-analysis | 3 |
| polish-ui | 1 |
| info-architecture-review | 1 |
| fix-incident | 1 |
| skill-evolution | 1 (cycle 750) |
| **lotto** | **0** ← trigger 5 fire |
| dimension-cycle | 0 |
| expand-scope | 0 |
| design-system | 0 |

평가 대상 (cycle 772 박제 시점 = review-code / polish-ui / lotto 3개) 중 lotto = 0회 → trigger 5 fire → `~/.develop-cycle/skill-evolution-pending` 마커 박제 (773: b2f7048...).

cycle 774 진단 단계 마커 발견 → skill-evolution chain 강제 발화.

## cycle 772 lotto chain pool 정식 박제 후 fire timing 분석

| 시점 | 이벤트 |
|---|---|
| cycle 772 (2026-05-20) | `lotto` chain chain pool 10번째 row 정식 박제 (chain-evolution dispatch). 평가 대상 3개 (review-code / polish-ui / lotto) 추가 |
| cycle 773 (2026-05-20) | review-code heavy sweep 12 SUCCESS — CLAUDE.md silent drift family sync. retro 단계 trigger 5 평가 시 lotto=0회 → 즉시 fire |
| cycle 774 (2026-05-20) | skill-evolution forced fire — 본 spec |

**구조적 false positive evidence**:
- cycle 772 박제 직후 2 cycle 만에 trigger 5 평가 도달
- 2 cycle 만에 20-cycle 윈도우 채울 수 없음 (lotto 최대 발화 가능 = 2 cycle)
- 사용자 자율 발화 X (cycle 772/773 모두 다른 chain 자연 fire)
- = lotto chain 구조적으로 trigger 5 평가 시점에 0회일 수밖에 없음

## cycle 525 explore-idea opt-out 패턴 정합

| 측면 | explore-idea (cycle 525) | lotto (cycle 774) |
|---|---|---|
| 외부 source 의존 | ✓ (GH issue / TODOS / 자연 발화) | ✓ (외부 추첨 주기 토 21:00 KST) |
| 자체 주기 보정 trigger 보유 | ✓ improvement saturation 직전 15 사이클 ≥ 12회 fire 보장 | ✓ trigger 6 = 30-cycle gap fire 보장 |
| cooldown 만료 후 자연 회복 | ✗ (cycle 523~524 0회 재발) | N/A (chain pool 갓 추가 — cooldown 단계 X) |
| 영구 opt-out 정합 | ✓ (cycle 525 박제) | ✓ (본 cycle 774 박제 — 즉시) |

**결정**: cooldown 만료 대기 X — 즉시 opt-out. 사유 = chain pool 신규 추가 시점부터 자체 trigger (lotto 30-cycle gap + 외부 추첨 주기) 가 fire 보장 → trigger 5 중복 검사는 noise 만 발생.

## 변경

### `~/.claude/skills/develop-cycle/SKILL.md`

#### line 6 (history summary) — append

```
cycle 774 갱신: trigger 5 lotto 영구 opt-out 추가 (lotto chain pool 정식 박제 cycle 772 직후 2 cycle 만에 trigger 5 즉시 fire = 구조적 false positive — 2 cycle 만에 20-cycle window 채울 수 없음. lotto 자체 trigger 6 = 30-cycle gap fire 보장 + 외부 추첨 주기 (토 21:00 KST) 의존 = explore-idea 와 동일 본질) + opt-out 7개→8개 (평가 대상 2개→2개: review-code / polish-ui — lotto 제외 후 동일 유지). 표본 임계 regex 에 lotto 포함 (chain pool 외 → chain pool 등록 chain slug 10개로 갱신).
```

#### line 70 (chain pool table skill-evolution row)

- "영구 의도 chain opt-out (... cycle 525 갱신)" → "... cycle 525 갱신, cycle 774 갱신"
- opt-out 목록 `dimension-cycle / expand-scope / design-system / operational-analysis / fix-incident / info-architecture-review / explore-idea` → `... / explore-idea / lotto`
- "이 7개 chain 은 0회 발화 정상" → "이 8개 chain 은 0회 발화 정상"
- 평가 대상 3개 → 2개 (review-code / polish-ui)
- "cycle 774 박제 evidence" 단락 추가

#### line 424 (trigger 5 평가 명령)

- "영구 opt-out 6개 제외" → "영구 opt-out 8개 제외"
- "평가 대상 3개 (review-code / explore-idea / polish-ui)" → "평가 대상 2개 (review-code / polish-ui)"
- opt-out 6개 목록 (dimension-cycle / expand-scope / design-system / operational-analysis / fix-incident / info-architecture-review) → 8개 목록 (+ explore-idea + lotto)
- chain pool slug 9개 (regex) → 10개 (lotto 추가)
- 표본 임계 regex 에 lotto 추가
- "chain pool 외 차원 (`lotto` 등 dual-cycle policy batch / 외부 dispatch) 가 분모 차지 시 false positive 차단" → "chain pool 외 차원 (외부 dispatch 등) 가 분모 차지 시 false positive 차단" (lotto 정식 박제 후 chain pool 안으로 이동)

### `~/.claude/skills/develop-cycle/MIGRATION-PATH.md`

append-only entry (cycle 774) 박제.

### 본 spec (`docs/superpowers/specs/2026-05-20-cycle-774-skill-evolution-trigger5-lotto-permanent-opt-out.md`)

본 파일.

## 변경 영향

- 다음 사이클부터 lotto chain 0-fire 가 trigger 5 fire 안 시킴
- 평가 대상 = review-code / polish-ui 2개로 단순화
- chain pool 10개 중 8개 opt-out, 2개 평가 대상 — 단순한 평가 구조
- 표본 임계 regex 에 lotto 포함 = lotto 발화 사이클이 sample 카운트에 정상 반영 (false negative 차단)

## 구조 변경 X

- chain pool 10개 그대로 (lotto chain 변경 X)
- lotto chain trigger 1-6 그대로 (자체 주기 보정 trigger 보유 유지)
- 자가 진화 메타 룰 5종 (cycle 422/436/484/512/525) 누적 효과 + 본 cycle 774 추가 → 6종 → false positive 차단 layer 강화
- 다음 milestone = cycle 800 (26 cycle 거리, trigger 3)

## 근거

trigger 5 false positive 차단 layer 6번째 추가:

1. cycle 422 — 표본 임계 (chain pool 사이클 ≥ 10)
2. cycle 436 — inclusive 윈도우 (N-19..N)
3. cycle 484 — polish-ui cooldown N=10
4. cycle 512 — explore-idea cooldown 단독 (불충분 evidence 박제)
5. cycle 525 — explore-idea 영구 opt-out (외부 source 의존 chain 본질)
6. **cycle 774 — lotto 영구 opt-out (갓 추가된 chain 의 구조적 false positive 차단)**

자가 진화 메타 룰 안정화 + chain pool 신규 chain 추가 시 즉시 영구 opt-out 박제 패턴 (자체 주기 보정 trigger 보유 chain 한정) 박제.

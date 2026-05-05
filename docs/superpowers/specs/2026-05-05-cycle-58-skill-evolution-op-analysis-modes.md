# Cycle 58 — skill-evolution: operational-analysis lite/heavy 모드 분리 + cycle 56 carry-over 박제

**작성**: 2026-05-05 21:45 KST
**Chain**: skill-evolution (자동 발화 4회째 — cycle 46/49/51 에 이은 4번째)
**Trigger**: trigger #5 (직전 20 사이클 chain 1개 0회 발화) — `dimension-cycle` + `design-system` 2개 잔존
**마커**: `~/.develop-cycle/skill-evolution-pending` = `57: 1c6f986...` (cycle 57 retro 시점 박제)

## 1. trigger 증거

cycle 57 retro 시점 본 메인이 trigger 5개 자가 평가 → trigger #5 충족:

| # | 조건 | 측정 | 충족 |
|---|---|---|---|
| 1 | `chain-evolution` subtype commit 5건 누적 | `git log --grep "subtype: chain-evolution" \| wc -l` = 0 | ❌ |
| 2 | 같은 chain 5회 연속 fail | 직전 5 cycle: fix-incident/op-analysis/review-code/explore-idea/op-analysis (다양) | ❌ |
| 3 | `cycle_n % 50 == 0` | 57 % 50 = 7 | ❌ |
| 4 | `meta-pattern` body 에 "SKILL 갱신 필요" | cycle 57 = meta-pattern dispatch X | ❌ |
| 5 | 직전 20 사이클 chain 1개 0회 발화 | `dimension-cycle` 0회 + `design-system` 0회 = 2 chain 0회 | ✅ |

직전 20 사이클 (cycle 38~57) chain 분포:
```
   7 fix-incident
   4 operational-analysis
   3 skill-evolution
   2 review-code
   1 polish-ui
   1 explore-idea
   1 expand-scope
   0 dimension-cycle    ← trigger
   0 design-system      ← trigger
```

## 2. 본 cycle 갱신 영역 평가

### 후보 A: operational-analysis lite/heavy 모드 분리 (선정)

**증거 (3 sample)**:

| Cycle | 모드 | skills_invoked | outcome | 비고 |
|---|---|---|---|---|
| 52 | lite | 0개 (lesson + retro 박제만) | success | 신선 30일 데이터 (예측 적중률 47%, sfr/h2h systematic bias 발견) |
| 54 | lite | 0개 (동일 source 재진단) | partial | cycle 52 직후 3일 = 데이터 부족 (5월 추가 5경기 / N=15 통계 유의 X) |
| 57 | heavy | 5개 (Edit backtest 2개 + Bash type-check + Bash 실측 2개) | success | backtest harness 직접 실행 + bootstrap CI 측정 + R8 결정 (변경 보류) |

**패턴**:
- lite = 운영 데이터 snapshot 박제 (lesson + retro). 신선 데이터 ≥ N 임계 시 success / 직후 재진단 시 partial
- heavy = 코드 실행 (backtest / 통계 측정 / 시뮬레이션). 결과 독립 — 데이터 신선도 무관 success

**chain pool table 의 op-analysis 행** (현재):
```
| `operational-analysis` | 진단 = 운영 데이터 분석 / 적중률 metric / 패턴 학습 | `/weekly-review` → `/extract-pattern` → `/compound` | 회고 박제 또는 lesson PR |
```

→ lite/heavy 구분 X. 갱신 후:
```
| `operational-analysis` | 진단 = 운영 데이터 분석 / 적중률 metric / 패턴 학습 | **lite**: `/weekly-review` → `/extract-pattern` → `/compound` (lesson + retro 박제만, 신규 코드 X) / **heavy**: backtest harness 직접 실행 / bootstrap CI 측정 / 시뮬레이션 코드 작성 + 실행 + R8 데이터 결정 | lite: 신선 데이터 ≥ N 임계 + lesson 박제 (success) / 직후 재진단 = 데이터 부족 (partial). heavy: 코드 실행 결과 + 통계 결정 박제 (success). 모드 선택 = 직전 op-analysis 사이클 outcome / 데이터 신선도 (≥7일 lite OK / <7일 heavy 필요) / 결정 기준 미측정 항목 존재 (heavy) |
```

**선정 사유**: 3 sample 직접 evidence + lite 사이클 partial 회피 (cycle 54 사례 재발 방지) + heavy 모드 박제로 cycle 58 carry-over (op-analysis prod CI 측정) 판단 source 명확.

### 후보 B: 잔존 0회 chain 2개 (`dimension-cycle` + `design-system`) carry-over 박제

**현재 상태**:
- `dimension-cycle` = legacy fallback. trigger = "위 5 chain 어디에도 안 맞음 + 직전 5 사이클 모두 source 균형 X"
- `design-system` = 메인 자율. trigger = DESIGN.md mtime ≥4주 / 새 area spec 부재 / 사용자 발화 / token-grep 균열

cycle 56 explore-idea = cycle 49 룰 PASS 2번째 (cycle 50 polish-ui 1번째 PASS 후속) → 잔존 2개. 두 chain 모두 매핑 자연 X = 기다림. 룰 추가 X.

→ **마이그레이션 path table 단계 4 에 cycle 56 PASS + 잔존 2개 박제만**.

### 후보 C: trigger 5 발화 빈도 가드

trigger 5 = "직전 20 사이클 chain 1개 0회 발화". chain pool 9개 중 자주 0회 발화 (특히 dimension-cycle / design-system / skill-evolution 자체) → 매 5 사이클 마다 발화 가능. **잡음 가능성**.

대안:
- "직전 20 → 직전 30 사이클" — 발화 가드 강화
- "skill-evolution 자체 제외 chain 0회" — self-loop 차단
- "직전 10 사이클 0회 + 직전 30 사이클 0회 동시" — 강한 신호만 발화

평가:
- 본 cycle 58 = trigger 5 두 번째 발화 (cycle 51 milestone trigger #3 후속). 잡음 X — 잔존 chain 2개 명확
- skill-evolution 자체 제외 = 본 cycle 58 trigger 5 측정에 skill-evolution 포함하지 않음 (이미 자가 진화 chain). chain pool 8개 중 0회 발화 측정.
- → trigger 5 정의에 "skill-evolution 자체 제외" 명시 강화. 잡음 차단 + 본질 보존.

→ **trigger 5 텍스트 보강만 (간단)**.

## 3. 갱신 행동

### A. `chain pool table` op-analysis 행 lite/heavy 분리

(위 후보 A 박스 — 시퀀스 + 멈춤 조건 둘 다 갱신)

### B. `skill-evolution` 행 trigger 5 텍스트 강화

현재:
```
(5) 직전 20 사이클 동안 chain 1개 0회 발화
```

갱신:
```
(5) 직전 20 사이클 동안 chain pool 의 chain 1개 0회 발화 (skill-evolution 자체 제외 — self-loop 차단)
```

### C. `description` 갱신 — milestone 누적 박제

현재 (line 3):
```
**cycle 50 milestone 누적** — cycle 46/49/51 skill-evolution 3회 자가 진화 + cycle 50 cycle 49 룰 (0회 chain trigger 우선 검토) 첫 자연 발화 검증 PASS.
```

갱신:
```
**cycle 50 milestone 누적** — cycle 46/49/51/58 skill-evolution 4회 자가 진화 + cycle 49 룰 (0회 chain trigger 우선 검토) 검증 PASS 2회 (cycle 50 polish-ui / cycle 56 explore-idea) + cycle 57 success break (3 partial → 1 success, op-analysis heavy 모드).
```

### D. 마이그레이션 path table 단계 3 갱신

현재 (line 4 단계 3):
```
| 3 | N = 50 milestone | `skill-evolution` 자동 발화 (50 milestone trigger) — **cycle 51 첫 발화 PASS** (2026-05-05). 본 cycle 51 = milestone 50 의의 + cycle 49 룰 cycle 50 PASS 박제 + 잔여 0회 chain 3개 (explore-idea / dimension-cycle / design-system) carry-over |
```

갱신:
```
| 3 | N = 50 milestone | `skill-evolution` 자동 발화 (50 milestone trigger) — **cycle 51 첫 발화 PASS** (2026-05-05). cycle 56 explore-idea = cycle 49 룰 PASS 2번째 (cycle 50 polish-ui 1번째 PASS 후속). 잔여 0회 chain 2개 (dimension-cycle / design-system) carry-over. cycle 58 trigger 5 (chain 0회 발화) 자동 발화 = skill-evolution 4회째 자가 진화 |
```

## 4. 검증 plan

- spec 본 파일 작성 (본 작업)
- SKILL.md Edit (4 영역 — A/B/C/D)
- pnpm test (regression smoke — develop-cycle 외 영역 변경 없으니 통과 기대)
- commit `feat(skill): cycle 58 — operational-analysis lite/heavy 분리 + cycle 56 PASS 박제`
- branch `develop-cycle/skill-evolution-58` push
- gh pr create + gh pr merge --squash --auto --delete-branch (R7)

## 5. 잔여 한계 / 후속 carry-over

### 본 cycle 갱신 후 cycle 59 carry-over

cycle 57 retro 의 `next_recommended_chain` = "operational-analysis (prod 30일 N=62 sfr/h2h bias bootstrap CI 측정 — cycle 56 spec step 2)" = **cycle 59 자연 후보**. 본 cycle 58 = skill-evolution 강제 발화로 1 사이클 지연.

cycle 59 발화 시 본 SKILL 갱신의 op-analysis heavy 모드 스펙 직접 적용 자연 (prod query + bootstrap CI = heavy 모드 코드 실행 패턴).

### 잔존 0회 chain 2개

`dimension-cycle` (legacy fallback) — 본 chain 자체는 site/acquisition/model 차원 dispatch 의 기존 mechanism. 본 chain pool 의 5 main chain 어디에도 안 맞을 때만 자연 발화. 매핑 자연 X 시 발화 회피가 본 SKILL 의도. 강제 발화 X.

`design-system` — DESIGN.md mtime ≥4주 trigger. 직전 측정 (cycle 50 polish-ui 자동 touch 1시간 전) → 4주 임계 미도달. 자연 발화 시점 = DESIGN.md 4주+ 미갱신 시점 후속.

→ 두 chain 모두 강제 발화 X. 본 cycle 58 trigger 발화 후속 = trigger 5 정의 강화 (self-loop 차단) 만으로 충분. 추가 룰 X.

### R5 6번째 후보 (cycle 53 carry-over)

cycle 53 fix-incident 가 FIRE_HANG capture-pane logging partial 박제. R5 6번째 후보 (자동 fire chain 잔여 한계) 검증 대기. cycle 48/53 두 partial → cycle 67/68 시점 (자연 fire 발생 후) success 박제 가능.

본 cycle 58 = 무관. carry-over 명시만.

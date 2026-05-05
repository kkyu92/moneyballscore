# cycle 61 — skill-evolution 5번째 자가 진화 (review-code + explore-idea lite/heavy 모드 분리)

**Date**: 2026-05-05
**Branch**: `develop-cycle/skill-evolution-61`
**Cycle**: 61
**Chain**: skill-evolution (강제 발화 — trigger 5 충족)

## 트리거 평가

| # | 조건 | 측정 | 결과 |
|---|---|---|---|
| 1 | `chain-evolution` subtype commit 5건 누적 | 0건 | 미충족 |
| 2 | 같은 chain 5회 연속 fail | N/A | 미충족 |
| 3 | `cycle_n % 50 == 0` | 61 % 50 = 11 | 미충족 |
| 4 | `meta-pattern` body "SKILL 갱신 필요" | 부재 | 미충족 |
| 5 | 직전 20 사이클 chain 1개 0회 발화 | 3개 (dimension/expand-scope/design-system) | **충족** |

직전 20 사이클 (41~60) chain 분포:
- fix-incident: 5회 (41/42/47/48/53)
- explore-idea: 1회 (56 lite)
- polish-ui: 1회 (50)
- review-code: 3회 (44 lite / 55 lite / 60 heavy)
- operational-analysis: 5회 (45 verification / 52 lite / 54 lite / 57 heavy / 59 heavy)
- skill-evolution: 4회 (46/49/51/58)
- dimension-cycle / expand-scope / design-system: **0회**

## 갱신 영역 분석

### 영역 1 — review-code lite/heavy 모드 분리

cycle 58 이 op-analysis lite/heavy 모드 분리 박제. 동일 패턴이 review-code 에서 자연 발생:

| 사이클 | 모드 | 시퀀스 실행 | outcome |
|---|---|---|---|
| 44 | lite (diagnostic only) | `/health` 만, simplify/review/ship skip | success (retro-only) |
| 55 | lite (health diagnostic) | `/health` 만, simplify/review/ship trigger 부족 | partial |
| 60 | heavy (진짜 read) | 코드 read (kbo-fancy SFR + backtest h2h + prod predictor) + Edit + ship | success |

cycle 60 retro 가 명시: "cycle 44/55 review-code lite (diagnostic only partial) 와 차별 = 진짜 read 결과 actionable fix 박제". 이미 메인 자율 추론 단계서 모드 구분 적용 중. SKILL.md 박제만 남음.

**lite 모드**: `/health` (또는 `/simplify` 자체 진단) → 진단 결과 보고 retro-only (수정 후보 X) 또는 partial (trigger 부족) 박제. 코드 변경 0.

**heavy 모드**: 메인이 직접 코드 read (특정 파일/영역 명시) → silent drift / 부정확한 주석 / dead code / 불일치 발견 → Edit + ship. cycle 60 = predictor.ts 주석 v1.7-revert 정정.

**모드 선택**:
- 직전 review-code 사이클이 lite=success (코드 양호 박제) 직후 → heavy 권장 (진짜 read 가치)
- 직전 review-code 가 heavy=success → lite 권장 (재진단 + 신선 baseline)
- /health score 10/10 (cycle 55 박제) 유지 시 → heavy (지표 무관 silent drift 가능성 검토)
- 큰 파일 monolith 새 발견 시 → heavy

### 영역 2 — explore-idea lite 모드 박제

cycle 56 explore-idea 첫 발화:

| 사이클 | 모드 | 시퀀스 실행 | outcome |
|---|---|---|---|
| 56 | lite (spec only) | office-hours/plan-ceo/plan-eng skip + spec write only | partial |

cycle 56 retro 명시: "cycle 52 lesson H1 + cycle 21 박제 정량 evidence 통합. v2.1 가중치 후보 3개 + 검증 plan + 결정 기준". carry-over spec 박제 만으로 partial outcome. cycle 49 룰 (0회 chain trigger 우선 검토) PASS 2번째.

**lite 모드**: 직전 사이클의 lesson/spec carry-over 가 명확히 큰 방향 미정 → spec write 만 진행 (office-hours/plan-ceo/plan-eng skip). 사용자 review 대기 partial.

**heavy 모드** (cycle 56 시점 미발화): office-hours 부터 풀 시퀀스. 새 product idea / 자연 발화 새 feature 후보 시.

**모드 선택**:
- carry-over spec 명확 (직전 lesson + spec evidence) → lite (spec only)
- 새 idea / TODOS Next-Up 4주+ 미진행 → heavy (office-hours 부터)

### 영역 3 — 0회 chain 3개 의도된 결과 인정 박제

직전 20 사이클 0회 chain 3개:

#### dimension-cycle (legacy default)
- 정의: "위 어디에도 안 맞음 + 직전 5 사이클 모두 진단 source 균형 trigger 충족 X 일 때만 발화"
- 직전 20 사이클: 매 사이클 다른 chain 1개 trigger 자연 매핑 → ambiguous trigger 발생 X
- **의도된 결과**: 0회 발화 = 정상. fallback only — 다른 chain 우선 룰 작동 중. trigger 강화 X

#### expand-scope (메타 기획)
- trigger: small fix only 4 사이클 누적 / architecture 키워드 / TODOS "큰 방향" 4주+
- 직전 20 사이클: cycle 56 explore-idea (lite) + cycle 57 spec carry-over 등 mid scope 활동 자연 발생. small fix only 4 사이클 누적 미발생
- TODOS.md "큰 방향" 키워드 grep = 0건
- **의도된 결과**: 0회 발화 = 정상. 진짜 메타 기획 후보 부재. trigger 강화 X (사용자 N=milestone 또는 GH issue architecture 키워드 발생 시 자연 발화)

#### design-system (시스템 디자인)
- trigger: DESIGN.md mtime ≥4주 / docs/design/ 부재 / 사용자 design 발화 / token vs 컴포넌트 grep 균열
- DESIGN.md mtime = 0.1일 (cycle 50 polish-ui 시점 갱신 또는 최근 다른 사이클)
- 사용자 design 발화 0건
- **의도된 결과**: 0회 발화 = 정상. DESIGN.md 신선도 충분. trigger 강화 X

**박제 결론**: 직전 20 사이클 0회 chain 3개 = trigger 미발생이 정상 (false negative X). cycle 49 룰 (0회 chain trigger 우선 검토) 의 검토 결과 = 의도된 결과. 룰 자체는 polish-ui (cycle 50) / explore-idea (cycle 56) PASS 2회 검증 완료. dimension/expand/design 은 자연 발화 대기.

### 영역 4 — 마이그레이션 path 단계 3 cycle 61 5번째 진화 박제

기존:
```
| 3 | N = 50 milestone | `skill-evolution` 자동 발화 (50 milestone trigger) — **cycle 51 첫 발화 PASS** ... cycle 58 trigger 5 (chain 0회 발화) 자동 발화 = skill-evolution 4회째 자가 진화 — op-analysis lite/heavy 모드 분리 + cycle 56 PASS 박제 |
```

추가:
```
... cycle 61 trigger 5 (chain 0회 발화) 자동 발화 = skill-evolution 5회째 자가 진화 — review-code lite/heavy 모드 분리 + explore-idea lite 모드 박제 + 0회 chain 3개 의도된 결과 인정 박제
```

## SKILL.md edit 영역

1. `review-code` chain row (line 34) → lite/heavy 분리 + cycle 44/55/60 evidence
2. `explore-idea` chain row (line 32) → lite 모드 박제 + cycle 56 evidence
3. 마이그레이션 path 단계 3 (line ~end) → cycle 61 5번째 박제 추가
4. description (frontmatter line 3) → cycle 50 milestone 누적 → cycle 50+ milestone 누적 + cycle 49 룰 PASS 누적 텍스트 갱신

## 검증 plan

- `pnpm test` smoke (CI 회귀 차단)
- 본 spec read + SKILL.md 변경 diff 박제
- meta-pattern dispatch (변경 diff 박제)
- R7 자동 머지

## stop 조건

- success: SKILL.md 변경 PR 박제 + R7 머지 + meta-pattern dispatch
- partial: spec only + 사용자 review (5회째 자가 진화는 영역 명확 → success 권장)
- fail: pnpm test smoke fail → PR 생성 X, retro-only

## 다음 발화 예측

- cycle 62 진단 시 본 cycle 61 갱신 적용 — review-code 모드 명시 박제 / explore-idea lite 모드 명시 박제
- 0회 chain 3개 = 의도된 결과 박제 → 다음 사이클 진단 시 trigger 우선 검토 룰 (cycle 49) 재해석 (false negative 의심 X)

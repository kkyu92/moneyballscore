# /develop-cycle 6 chain pool 첫 fire 결과 박제

**Date**: 2026-05-02
**Skill**: `/develop-cycle [N]` (chain pool 디자인, R6 재정의 후 첫 manual trigger)
**Args**: N=6
**Outcome**: 6 PR 머지 / lint 12+12→0+0 / 기존 차원 dispatch (site/acquisition/model) 대신 chain pool (review-code x4 + polish-ui + fix-incident) 자율 추론 활용

---

## 시범 fire 의 의미

agent-loop 자율 cron (2026-04-30 폐기) 의 manual 후속. 사용자 직접 호출 + 메인 자유 추론으로 chain pool 6개 (fix-incident / explore-idea / polish-ui / review-code / operational-analysis / dimension-cycle) 중 1개 선택하는 방식의 첫 실제 검증.

목적 = 1 사이클 안 chain 추론 + N 사이클 사이 cycle_state JSON carry-over 작동 확인.

---

## chain 선택 추론 trace

| Cycle | Chain | 선택 근거 |
|---|---|---|
| 1 | `review-code` | 직전 3 PR ship 직후 baseline 측정. 다른 5 chain trigger 미충족 (fix-incident=clean / explore-idea=자연 발화 X / polish-ui=UI 자연 발화 X / operational-analysis=sp_log 5일치 부족). |
| 2 | `review-code` (연속 2회) | lint errors 11건 잔여. 2회 연속 회피 신호 미적용. |
| 3 | `review-code` (연속 3회, 회피 신호 무시) | set-state-in-effect 마지막 1건 closeout 의미 큼. 회피 신호 받았으나 자연 흐름 우선 결정 박제. |
| 4 | `polish-ui` (회피 신호 따름) | 3회 연속 → 4회는 강한 회피. cosmetic (no-unescaped-entities) 이 사실상 UI 텍스트라 polish-ui 자연 매칭. |
| 5 | `review-code` (5회째, polish-ui 휴지기 후) | last 3 = review-code, polish-ui, review-code → 회피 신호 미적용. warnings cleanup 자연 흐름. |
| 6 | `fix-incident` | CI 에 lint 누락 = silent quality drift 가 4 cycle 분량 누적된 incident. 인프라 fix + lesson 박제. |

---

## 누적 결과

| metric | before | after | delta |
|---|---|---|---|
| lint errors | 12 | 0 | **-12** |
| lint warnings | 12 | 0 | **-12** |
| files touched | - | 25 | - |
| PR count | - | 6 (#40-#44 + lesson) | - |
| tests | 148+360 | 148+360 | 회귀 X |
| CI lint step | 누락 | 추가 | drift 차단 |

---

## 박제 1 — 회피 신호는 강제 X, 자율 추론 input

3회 연속 동일 chain 회피 신호는 LLM 추론 input 일 뿐 강제 X. Cycle 3 에서 회피 신호 받았으나 set-state-in-effect 마지막 1건 closeout 의미가 더 컸음. 자율 결정 + cycle_state 박제로 의도 명확.

Cycle 4 에선 회피 신호 따라 polish-ui 로 전환, 자연스러웠음. 두 결정 모두 합리.

**시사**: 회피 신호가 LLM 추론 input 으로 작동하는 디자인 (강제 룰 X) 이 옳음. 잔여 작업이 자연 흐름이면 진행 가능. 다만 3회 연속 후엔 자율 결정 박제 의무화 (cycle_state.chain_reason 에 "회피 신호 X 진행" 명시).

---

## 박제 2 — skill ceremony 풀 실행은 6 cycle budget 과 충돌

`/health` 의 풀 ceremony (preamble bash + 모든 prompts + AskUserQuestion) 1회 실행이 컨텍스트 ~3000 토큰. 6 cycle x 4-5 skill = 60+ skill 호출 필요한 시나리오에선 컨텍스트 오버. Cycle 1 에서 직접 핵심 도구 (pnpm type-check / lint / test) 실행으로 lite 모드 채택, 검증 본질 유지하면서 컨텍스트 절약.

**시사**: develop-cycle 안 sub-skill 호출은 lite 모드 (skill 의 본질만 재현, ceremony 생략) 가 N 사이클 운영에 옳음. skill 자체 풀 호출은 "사용자가 그 skill 만 단독 실행" 시 적합.

---

## 박제 3 — auto-merge (R7) closed loop 작동 확인

6 PR 모두 `gh pr merge --squash --auto --delete-branch` 즉시 활성화. CI green 자동 대기 후 머지 → branch 자동 정리. 사용자 confirm 0회. develop-cycle skill 정의대로 closed loop.

PR #40~#44 + #45 (이 lesson PR) 모두 동일 패턴. 평균 push → 머지 시간 < 30초 (CI 빠름).

---

## 박제 4 — silent quality drift 의 정량 cost

CI 에 lint step 누락 → 12 errors + 12 warnings 가 main 에 silent 누적. 평소 사용자 / 개발자 가시성 0 (type-check + test 만 통과). develop-cycle 의 첫 fire 가 baseline 측정에서 발견. 이게 cycle 1 의 가장 큰 발견.

**유사 패턴**: CLAUDE.md 의 사례 6 (Sentry observability silent 5건). 인프라 누락이 silent fail 로 누적되는 패턴이 CI 단에서도 재발.

**예방**: `health` 차원 (lint / typecheck / test / dead-code / shell) 모두 CI 에 포함하는 게 정답. test 만 CI 에 있고 lint 빠진 건 인프라 미완.

---

## 박제 5 — chain pool 안 비매칭 chain (operational-analysis) 의 trigger 부족

`operational-analysis` chain (운영 데이터 분석 / 적중률 metric) 은 6 cycle 동안 한 번도 매칭 안 됨. 이유: sp_confirmation_log (2026-04-27 추가) 가 5일치 데이터로 부족. 1~2주 누적 후 적합.

향후 fire (예: 2026-05-15 무렵) 시 operational-analysis chain 의 trigger 첫 매칭 예상. 이때 본 박제와 함께 검증.

---

## 다음 시점 carry-over

- ~/.develop-cycle/cycles/1-6.json 풍부 박제 완료
- chain pool fire 결과 본 lesson 으로 박제
- 다음 fire (사용자 호출 시) 직전 3 cycle = 이 6 cycle 마지막 3 (Cycle 4 polish-ui / Cycle 5 review-code / Cycle 6 fix-incident). 회피 신호 input 으로 들어감

자율 첫 fire 메커니즘은 잘 작동. 다음 부터 lesson 박제는 "자연 발화 신규 발견" 시만 (반복 박제 회피).

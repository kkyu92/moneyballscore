---
spec: cycle 201 fix-incident — cycle 200 skill-evolution chain stall root cause + SKILL.md 가드 보강
date: 2026-05-07
chain: fix-incident (skill-evolution X — chain 시퀀스 안 stuck 패턴 자체 회피)
trigger: cycle 200 hard cap kill (3604s, outcome=interrupted) → 사용자 manual 재시작 + root cause 검증 지시
prior_cycles:
  - cycle 178: fix-incident on watch.sh fire 시퀀스 PARTIAL — FIRE_HANG 5건 root cause 식별 (handoff load AskUserQuestion in auto-fire env, 4건) + cycle 45 token rate limit 1건. watch.sh line 395 `/handoff load` 자동 입력 제거 fix
  - cycle 179~199: 21 cycle 모두 success (review-code heavy) — cycle 178 fix 작동 검증
  - cycle 200: trigger 3 (50-milestone) skill-evolution 강제 발화 → 첫 45분 정상 활동 후 마지막 15분 stuck → watch.sh hard cap kill 3604s (outcome=interrupted, chain=unknown)
  - cycle 201 (본 spec): fix-incident chain — cycle 200 root cause 박제 + SKILL.md 가드 보강 (skill-evolution chain 시퀀스 `/office-hours` skip 강제 + 실패 모드 행 2개 추가)
---

# cycle 201 fix-incident — cycle 200 skill-evolution chain stall root cause + SKILL.md 가드 보강

## 요약

cycle 200 = trigger 3 (cycle_n % 50 == 0) milestone 으로 skill-evolution chain 강제 발화. 첫 45분 정상 활동 (chain 시퀀스 진행) 후 마지막 15분 stuck (children=0 + cpu 0~28% oscillation 매 ~20s burst) → watch.sh hang safety v2 hard cap 3600s 정확 kill. cycle 201 = 사용자 manual 재시작 (`/develop-cycle 100`) 직후 fix-incident chain 으로 cycle 200 root cause 검증 + SKILL.md 가드 보강.

자동 진행 X — 사용자 명시 단일 cycle 진행 + signal next_n=0 박제.

## cycle 200 evidence (watch.log 패턴)

- 시작: 2026-05-06 23:11 KST (UTC 14:11)
- 첫 45분 (0~2703s): watch.log entry 0건 = 정상 활동 (cpu>1% OR children>0)
- 23:56 KST (2703s): idle 첫 감지 — 이후 children=0 + cpu 0~28% oscillation
- 마지막 15분: idle/burst 매 ~20s 반복 (Claude Code retry backoff interval 와 일치)
- 00:11 KST (3604s): TIMEOUT_KILL hard cap → SIGTERM/SIGKILL → cycles/200.json 자동 박제 (outcome=interrupted, chain=unknown)
- 직전 12 cycle (N=50→N=40, 22:00~23:10 KST): 모두 5~13분 만에 정상 종료 + signal + 자동 fire

## root cause 가설 — 두 가능 원인

### (a) skill-evolution chain 시퀀스 안 `/office-hours` AskUserQuestion 자동 fire 환경 사용자 부재 hang

- skill-evolution chain 시퀀스: trigger 증거 수집 → 갱신 영역 list → `/office-hours` → spec write → SKILL.md Edit
- `/office-hours` = YC startup mode 6 forcing questions → AskUserQuestion 발화
- 자동 fire 환경 (mcc bash while loop) = 사용자 부재 → 무한 대기 → hard cap kill
- cycle 178 식별 패턴 (handoff load AskUserQuestion 4건) 의 chain 안 sub-skill 발현 = cycle 178 fix 가 못 잡은 layer

### (b) Claude Max session 한도 도달

- 22 cycle 연속 review-code (heavy) 누적 (cycle 178~199, 약 2시간)
- cycle 200 시작 23:11 KST = 한도 윈도우 가까이
- 한도 hit 시 retry backoff loop = children=0 + cpu burst 패턴 (a) 와 동일
- 사용자 가설 — 다른 사이클에서 동일 evidence (cycle 178 박제 = cycle 45 token rate limit 1건)
- claude UI 한도 메시지 = 결정적 evidence (자동 fire 환경에선 사용자 부재로 못 봄)

### (a)+(b) 동시 가능

두 패턴 동일 (children=0 + cpu oscillation + 1시간 유지) — watch.log 만으론 100% 확정 X. base rate (cycle 178 박제 4:1 AskUserQuestion 우세) + cycle 200 컨텍스트 (45분 활동 + 22 cycle 누적) 종합 → 둘 다 가능 + (a) 가드 우선 처리, (b) 객관 evidence 행 추가.

## SKILL.md 변경 영역 (3건)

### 1. chain pool 의 `skill-evolution` 시퀀스 보강

기존: `trigger 증거 수집 → 갱신 영역 list → /office-hours → spec write → ...`

변경: `... → spec write (자동 fire 환경 = /office-hours skip 강제 — AskUserQuestion 발화 = 사용자 부재 무한 대기 hang 위험. cycle 200 stall 박제 후속, 메인이 trigger evidence + 직전 N cycle pattern 종합으로 spec 직접 작성) → ...`

의도: skill-evolution chain 의 `/office-hours` 자동 발화 차단. 메인이 trigger 5 evidence + 직전 N cycle chain 분포 / outcome 분포 종합으로 spec 직접 작성.

### 2. 실패 모드 table 행 2개 추가

| 자동 fire 환경 sub-skill AskUserQuestion hang (cycle 178 식별 + cycle 200 후속) | mitigation = chain 시퀀스에서 AskUserQuestion 발화 sub-skill 식별 후 자동 fire 환경 skip 명시 (예: skill-evolution chain 의 `/office-hours` skip, spec 직접 작성). R5 메타 패턴 6번째 evidence — 매 fix 가 다음 layer 잔여 한계 노출 |
| Claude Max session 한도 도달 (cycle 200 가설) | 22+ cycle 연속 heavy 누적 시 가능. 패턴 = children=0 + cpu 0~28% oscillation + 1시간 유지 (retry backoff). reset 윈도우 5시간 = 다음 cycle 자연 회복. mitigation = 사용자 "stop" 만 단일 escape (자가 의심 차단 룰 vs 한도 객관 evidence 디커플링) |

### 3. 마이그레이션 path "다음 milestone = cycle 200" 항목 보강

cycle 200 stall 사례 박제 + cycle 201 fix-incident 후속 처리 명문화. 다음 milestone = cycle 250.

## R5 메타 패턴 6번째 evidence

> 매 fix 가 다음 layer 잔여 한계 노출

| # | cycle | fix | 잔여 한계 (다음 cycle 에서 발현) |
|---|---|---|---|
| 1 | cycle 24 | hang safety v2 (CPU/child probe + 5m idle + 60m hard) | hang 의 root cause 식별 X |
| 2 | cycle 48 | fire hang detection (warm-up race + silent gap) | 5건 hang 의 진짜 root cause 미식별 |
| 3 | cycle 53 | FIRE_HANG capture-pane logging | capture log 만 — 분석 X |
| 4 | cycle 178 | watch.sh /handoff load 자동 입력 제거 (4건 root cause) | chain 시퀀스 안 sub-skill 의 AskUserQuestion 가드 X |
| 5 | cycle 178 | (동시) cycle 45 token rate limit 1건 식별 | 한도 도달 패턴 mitigation 명문화 X |
| 6 | **cycle 201 (본 cycle)** | skill-evolution chain `/office-hours` skip + 한도 도달 실패 모드 행 추가 | **다음 cycle 에서 발현될 잔여 한계 = 미식별** |

## 검증

- `pnpm test` smoke = SKILL.md 변경만이라 skip (코드 변경 0)
- cycle_state outcome=success 박제 (PR #N + R7 자동 머지 후)
- 다음 cycle 자동 진행 X — signal next_n=0 박제 (사용자 명시)

## 자동 진행 X (사용자 명시)

본 cycle 끝 = signal next_n=0. 다음 cycle 자동 fire X. 사용자가 다시 `/develop-cycle [N]` 호출 시만 진행.

## 다음 milestone

cycle 250 (50 단위 milestone progression sequence — cycle 100 / 124 / 135 / 150 / 200 (interrupted) / 250).

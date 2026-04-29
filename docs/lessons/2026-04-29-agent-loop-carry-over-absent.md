# lesson: agent-loop carry-over 부재 → 6 cycles main 직접 push (drift case 박제)

## 현상

Phase 5a self-develop closed loop 첫 ship 직후 6 cycles 디버그 발생. 각 cycle
에서 다음 fix 를 main 직접 push (PR 없이) 하면서 진행:

| cycle | fix | drift case |
|---|---|---|
| 1 | pnpm/action-setup `version: 9` vs `packageManager: pnpm@10.33.0` 충돌 | 사례 3 재발 |
| 2 | bypassPermissions settings 추가 (denials 19→8) | claude-code-action SDK default 권한 |
| 3 | show_full_output: true (디버그 가시화) | turn-by-turn 출력 숨김 |
| 4 | --dangerously-skip-permissions claude_args | bypassPermissions 만으론 도구 enable 안 됨 |
| 5 | repo settings toggle (workflow permissions write + PR 생성 활성) | createPullRequest blocked |

본 6 cycles 자체가 carry-over chain 부재 증거. 있었으면 fire 1 = pnpm fix
박제 → carry-over Issue → fire 2 = bypassPermissions ... 자연 chain 됐을 것.

## 원인

Phase 5a 첫 ship spec 에서 1 fire = 1 try 만 가정. 큰 task 자율 분해 + 다음
fire 인계 메커니즘 누락. 결과적으로:

1. fire 별 결과 (성공/실패/부분) 가 다음 fire 에 전달 안 됨
2. 동일 task 의 다단계 진행 = 사용자 (또는 같은 세션) 가 main 직접 push
   해서 인위적으로 chain 만들어야 함
3. 사용자 직접 작업과 자동 결과 label 모호 (`self-dev` 만으론 의도/주체 불분명)

## 해결

Phase 5 비전 1 보완 (4/29 ship):

1. **namespace 분리** — 사용자 직접 작업 vs agent-loop 자동 결과
   - label `agent-loop` (자동) vs 일반 prefix (사용자)
   - branch prefix `agent-loop/` vs 일반 (`feat/`, `fix/`)
   - Issue title 의 `🔁 agent-loop carry-over: ...` / `agent-loop/human-needed: ...` 마커

2. **carry-over chain** — 1 cycle = 10 fire
   - fire 진입 시 `gh issue list --label "agent-loop,handoff"` 검색
   - 있으면 직진 작업 (새 decision X), 없으면 새 cycle 시작 (fire 1/10)
   - fire 종료 직전 작업 미완료면 carry-over Issue 박제 (title 에 `(fire N/10)`)
   - fire 10/10 도달 시 cycle 의 10 fire 횡단 분석 → `lesson:` prefix 박제 → cycle 종료

## 예방 체크리스트

- 새 자율 agent ship 시 **단일 fire 가정 X**. carry-over 메커니즘 함께 설계
- namespace 분리 = 사용자 직접 작업과 자동 결과 분리 가능 토대 (없으면 누가/언제/왜 한 작업인지 추적 불가)
- 자동 agent 의 cycle cap (10 fire) 명시 → 무한 chain 방지 + 메타 회고 기점
- 본 lesson 처럼 6 cycles 디버그 경험 자체를 박제 → 다음 자율 agent ship 시 같은 실수 회피

## 관련 작업

- PR #16 — Phase 5a self-develop closed loop 첫 ship
- main commits `0a8a8c8`, `2390900`, `74b0f5b`, `6016238` — 6 cycles 디버그 직접 push (carry-over 부재 흔적)
- repo settings toggle — `workflow permissions write` + `can_approve_pull_request_reviews=true`
- PR (본 commit 직후) — agent-loop 분리 + carry-over chain ship

Fingerprint: agent-loop-cycle-zero

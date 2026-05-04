# watch.sh fire 시퀀스 fix + TODOS.md mcc alias 안내 (cycle 41, plan PR 3 + base 보강)

**일자**: 2026-05-04
**Cycle**: 41 (chain=fix-incident, plan.md PR 3 + base 보강)
**Base**: cycle 39 PR #80 (watch.sh socket) + cycle 40 PR #81 (SKILL.md active-cycle socket)
**Status**: watch.sh main 함수 fire 시퀀스 변경 + TODOS.md 사용자 영역 1 line 안내

---

## 1. 결함 발견 (사용자 질문 → 정직 답변)

cycle 39+40 base 구현 PR 후 사용자 질문: "1+2+3 작업 후 자동 세션 관리 되는가?"

본 메인 정직 답변 = **NO**. 이유:

```bash
# watch.sh main 함수 (cycle 25 박제 후 변경 X)
case "$status" in
  OK)
    if [[ "$next_n" =~ ^[0-9]+$ ]] && [ "$next_n" -gt 0 ]; then
      send "exit" Enter        # ← claude 안 prompt 텍스트 = 종료 X
      sleep 2
      send "claude" Enter      # ← 의미 모호 (legacy default 환경 가정)
      sleep 12
      send "/handoff load" Enter
      sleep 8
      send "/develop-cycle $next_n" Enter
```

문제:
1. `send "exit" Enter` = claude conversation prompt 로 "exit" 텍스트 입력. claude slash command `/exit` 가 아님 → claude 종료 X 가능성 높음
2. cycle 25/26 박제 "fire 검증" = 거짓 (R5). 한 번도 실측 X
3. 본 cycle 39 PR = send 함수 (socket+target 옵션) 만 변경. 시퀀스 자체 미수정

즉 send 시퀀스 자체가 **자동 fire chain 끊김의 root cause**. 사용자 질문이 본 결함 발견 트리거.

---

## 2. Fix

### 2.1 watch.sh main 함수 send 시퀀스 변경

```diff
   if [[ "$next_n" =~ ^[0-9]+$ ]] && [ "$next_n" -gt 0 ]; then
-    send "exit" Enter
-    sleep 2
-    send "claude" Enter
-    sleep 12
+    # claude 종료 — /exit slash command (primary) + Ctrl-D EOF (fallback)
+    # 가정: mcc alias bash while loop 환경. claude 종료 후 bash 가 새 caffeinate command claude 자동 시작
+    send "/exit" Enter
+    sleep 2
+    send C-d
+    sleep 12
+    # 새 fresh claude process warm-up 후 prompt 입력
     send "/handoff load" Enter
     sleep 8
     send "/develop-cycle $next_n" Enter
-    log "fired fresh process cycle N=$next_n"
+    log "fired fresh process cycle N=$next_n (sequence: /exit + C-d + handoff load + develop-cycle)"
```

### 2.2 시퀀스 설계

| Step | 명령 | 효과 | 타이밍 |
|---|---|---|---|
| 1 | `send "/exit" Enter` | claude `/exit` slash command — primary 종료 path | sleep 2 |
| 2 | `send C-d` | Ctrl-D EOF — fallback (slash 미지원 또는 prompt buffer 안 텍스트 잔존 시) | sleep 12 |
| 3 | bash while loop 새 iter | mcc alias 의 `while caffeinate -i command claude` 다음 iter = 새 claude 시작 | (자동) |
| 4 | `send "/handoff load" Enter` | 새 claude 의 conversation 첫 prompt | sleep 8 |
| 5 | `send "/develop-cycle $next_n" Enter` | 새 cycle 시작 명령 | (끝) |

**총 시간**: 22초 (claude 종료 + 새 claude warm-up + handoff load + 새 cycle 시작)

### 2.3 mcc alias 의존

본 시퀀스 = mcc alias bash while loop 환경 가정:

```bash
alias mcc='tmux new -As claude bash -c "trap \"exit 0\" SIGINT; while caffeinate -i command claude; do echo \"[mcc] claude exited normally, restart in 2s...\"; sleep 2; done"'
```

핵심: `bash -c "while caffeinate -i command claude; do ...; done"` — claude exit code 0 시만 새 iter. 사용자 Ctrl-C SIGINT trap = bash 자체 종료 (정상 stop).

mcc alias 미적용 시 (legacy iTerm2 직접) = bash while loop 부재 → claude 종료 후 새 claude 자동 시작 X → 자동 fire 작동 X (legacy 환경 자체 한계).

---

## 3. TODOS.md mcc alias 안내 갱신

`TODOS.md` 의 develop-cycle 섹션 갱신:
- 기존 4 line tmux alias 안내 → 새 1 line bash wrapper alias
- 검증 방법 (3 cycle fire 시뮬) 명시
- 본 메인 영역 cycle 42~46 잔여 명시

---

## 4. 검증 (DRY_RUN smoke test)

```
DRY_RUN send: socket=claude target=claude keys=/exit Enter
  sleep 2
DRY_RUN send: socket=claude target=claude keys=C-d
  sleep 12
DRY_RUN send: socket=claude target=claude keys=/handoff load Enter
  sleep 8
DRY_RUN send: socket=claude target=claude keys=/develop-cycle 42 Enter
```

OK. 시퀀스 정상 박제.

**진짜 효과 검증**: cycle 46 end-to-end (사용자 mcc alias 적용 후 실측).

---

## 5. 한계 + 다음 step

### 5.1 한계

- `/exit` slash command 가 claude code CLI 에 정확히 존재하는지 미검증 (web 검색 또는 사용자 직접 확인)
- Ctrl-D 가 fallback 작동하는지 미검증
- bash while loop 의 새 claude warm-up 12초 = 충분한지 미검증

→ **cycle 46 end-to-end 검증** 필수. 첫 실패 시 Ctrl-D / sleep 조정 / 다른 종료 방법 (`/quit`?).

### 5.2 후속 (cycle 42~46)

| Cycle | PR |
|---|---|
| 42 | migration 023 develop_cycle_logs (R5 prod push) |
| 43 | retro Supabase INSERT/UPSERT |
| 44 | dashboard 기본 layout |
| 45 | dashboard auto-refresh + UX polish |
| 46 | end-to-end 자동 fire 실측 (verify-only) |

cycle 46 통과 시 = N=50 자율 진행 진짜 가능. 그 이전엔 manual 호출 + cycle_state JSON carry-over.

---

## 6. 사용자한테 정직한 한 줄

**현재 상태 (본 cycle 41 ship 후)**: 1+2+3 작업 만으로는 자동 X. cycle 42~46 base 구현 마무리 + cycle 46 end-to-end 실측 통과 후부터 진짜 자율 진행 가능.

본 cycle 41 = 시퀀스 fix + TODOS 안내. 사용자 영역 1 line 적용 + 본 메인 영역 cycle 42~46 진행 시점이 진짜 자율 시작점.

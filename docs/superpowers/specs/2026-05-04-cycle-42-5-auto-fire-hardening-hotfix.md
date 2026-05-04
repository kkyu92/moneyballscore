---
title: cycle 42.5 hotfix — auto-fire hardening (mcc SIGINT survival + watch.sh ensure_session + SEND_FAILED guard)
date: 2026-05-04
type: hotfix
parent_cycle: 42
related: 2026-05-04-fire-sequence-fix-cycle41.md, 2026-05-04-skill-md-active-cycle-socket-cycle40.md, 2026-05-04-watch-sh-socket-impl-cycle39.md
---

# cycle 42.5 hotfix — auto-fire hardening

cycle 42 first real fire 21:42 KST 가 send-keys 3건 모두 fail 했고, watch.sh 가 fail 후에도 silent "fired" 박제 후 다음 cycle 진입 chain 끊김. 50 cycle 자율 진행 직전 발견. cycle 41 spec_v3 의 drift_risk_points 1~3 이 실측으로 노출된 케이스.

## 1. 진단 — fail 시점 fingerprint

`~/.develop-cycle/watch.log` (raw):
```
2026-05-04 21:42:03 send-keys fail target=claude keys=C-d
2026-05-04 21:42:15 send-keys fail target=claude keys=/handoff load Enter
2026-05-04 21:42:23 send-keys fail target=claude keys=/develop-cycle 40 Enter
2026-05-04 21:42:23 fired fresh process cycle N=40 (sequence: /exit + C-d + handoff load + develop-cycle)
```

| 항목 | 값 |
|---|---|
| signal next_n | 40 (cycle 42 retro 박제 후) |
| socket | default |
| target | claude |
| 21:41:27 시점 | cycles/42.json 박제 (cycle 42 main 종료) |
| 21:42:03 시점 | watch.sh fire 시도. send-keys fail 첫 번째 |
| 21:48:35 시점 | tmux session "claude" 새로 생성 (사용자 mcc 재진입) |

**객관 사실**: 21:42 시점 default socket 의 session "claude" 부재. 21:48:35 새로 attach. 즉 21:42 직전 사용자가 mcc 종료한 직후 세션 부재 상태에서 watch.sh 가 fire 시도.

## 2. 3 layer root cause

### Layer 1 — mcc alias 의 SIGINT 즉사 결함

```bash
# Before (cycle 41 cycle 41 spec 박제)
alias mcc='tmux new -As claude bash -c "trap \"exit 0\" SIGINT; while caffeinate -i command claude; do echo ...; sleep 2; done"'
```

`trap "exit 0" SIGINT` = SIGINT 받으면 exit 0 으로 즉시 종료. 사용자 의도적 Ctrl-C 한 번 또는 시스템 슬립/wake race 한 번이면 outer bash 즉사 → tmux session 즉사 → 자동 fire chain 영구 단절.

50 cycle 자율 진행 동안 한 번이라도 SIGINT 가 도달하면 끝. 단일 실패 지점.

### Layer 2 — watch.sh send 함수 fail silent 박제

```bash
# Before
send() {
  ...
  tmux send-keys -t "$TMUX_TARGET:0.0" "$@" 2>/dev/null || log "send-keys fail target=$TMUX_TARGET keys=$*"
}
```

send-keys fail 시 단순히 log 만 남기고 다음 명령 진행. main() 의 fire 시퀀스는 sleep + send 5건 연속 실행 → 5건 모두 fail 해도 마지막에 `log "fired fresh process cycle N=$next_n"` 박제. 즉 **fire 0% 성공인데 watch.log 는 success 처럼 박제** = silent 단절.

cycle 41 의 fire 시퀀스 fix 가 "/exit + C-d + handoff load + develop-cycle" 추가했지만 send 함수 자체는 fail-silent 그대로.

### Layer 3 — session 부재 자동 복구 부재

watch.sh 는 send-keys 만 시도. session 부재 시 자동 spawn 안 함. 사용자 mcc 종료 = session 종료 = 자동 fire 영구 단절.

## 3. Fix — 3 layer 각각 차단

### P1 — `~/.zshrc` mcc alias trap 무력화

```bash
# After
alias mcc='tmux new -As claude bash -c "trap \"\" SIGINT; while caffeinate -i command claude; do echo \"[mcc] claude exited, restart in 2s (intentional kill: tmux kill-session -t claude)...\"; sleep 2; done"'
```

`trap "" SIGINT` = SIGINT 무시. outer bash 가 SIGINT 받아도 exit 안 함. 의도적 종료는 별도 escape:
```bash
tmux kill-session -t claude  # 명시적 종료
```

### P2 — `~/.develop-cycle/watch.sh` 변경 (3 layer)

#### P2-a `tmux_cmd()` wrapper

socket default vs named 분기 통일:
```bash
tmux_cmd() {
  if [ "$TMUX_SOCKET" = "default" ]; then
    tmux "$@"
  else
    tmux -L "$TMUX_SOCKET" "$@"
  fi
}
```

#### P2-b `ensure_session()` — 부재 시 detached spawn

```bash
ensure_session() {
  if tmux_cmd has-session -t "$TMUX_TARGET" 2>/dev/null; then
    return 0
  fi
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY_RUN ensure_session: would spawn socket=$TMUX_SOCKET target=$TMUX_TARGET"
    return 0
  fi
  log "session absent socket=$TMUX_SOCKET target=$TMUX_TARGET — spawning detached"
  tmux_cmd new-session -d -s "$TMUX_TARGET" \
    bash -c 'trap "" SIGINT; while caffeinate -i command claude; do echo "[auto] claude exited, restart in 2s..."; sleep 2; done' \
    2>/dev/null
  sleep 15  # claude TUI 초기화 시간
  if tmux_cmd has-session -t "$TMUX_TARGET" 2>/dev/null; then
    log "session spawned socket=$TMUX_SOCKET target=$TMUX_TARGET"
    return 0
  fi
  log "session spawn FAILED socket=$TMUX_SOCKET target=$TMUX_TARGET"
  return 1
}
```

mcc alias 와 동일한 bash while loop 패턴 (trap "" SIGINT + caffeinate + claude). 사용자가 mcc 안에 없어도 detached 로 spawn 후 send-keys 작동.

#### P2-c `send()` SEND_FAILED 카운터

```bash
SEND_FAILED=0  # global, fire 시퀀스 시작 시 reset

send() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY_RUN send: socket=$TMUX_SOCKET target=$TMUX_TARGET keys=$*"
    return 0
  fi
  if tmux_cmd send-keys -t "$TMUX_TARGET:0.0" "$@" 2>/dev/null; then
    return 0
  fi
  log "send-keys fail socket=$TMUX_SOCKET target=$TMUX_TARGET keys=$*"
  SEND_FAILED=1
  return 1
}
```

#### P2-d main() OK 분기 — pre-flight + post-check abort

```bash
case "$status" in
  OK)
    if [[ "$next_n" =~ ^[0-9]+$ ]] && [ "$next_n" -gt 0 ]; then
      # Pre-flight
      if ! ensure_session; then
        log "fire ABORT cycle=$next_n — session ensure failed"
        # signal 에 FAIL 박제 (next_n=0 으로 zero-touch fire 차단)
        cat > "$SIGNAL" <<EOF
$next_n
FAIL
session ensure failed (socket=$TMUX_SOCKET target=$TMUX_TARGET)
0
EOF
        notify_fail "fire abort cycle $next_n: session ensure failed"
        rm -f "$LOCK"; return 0
      fi

      SEND_FAILED=0
      send "/exit" Enter; sleep 2
      send C-d; sleep 12
      send "/handoff load" Enter; sleep 8
      send "/develop-cycle $next_n" Enter

      # Post-check
      if [ "$SEND_FAILED" = "1" ]; then
        log "fire ABORT cycle=$next_n — send-keys partial fail during sequence"
        cat > "$SIGNAL" <<EOF
$next_n
FAIL
send-keys partial fail during fire sequence (see watch.log)
0
EOF
        notify_fail "fire abort cycle $next_n: send-keys partial fail"
        rm -f "$LOCK"; return 0
      fi

      log "fired fresh process cycle N=$next_n (sequence: /exit + C-d + handoff load + develop-cycle)"
    else
      log "OK with next_n='$next_n', stop"
    fi
    ;;
```

## 4. 검증 — 3 layer smoke pass

### 4-a syntax + alias

| 검증 | 결과 |
|---|---|
| `bash -n ~/.develop-cycle/watch.sh` | SYNTAX_OK |
| `zsh -c 'source ~/.zshrc; alias mcc'` | `mcc='... trap \"\" SIGINT ...'` 정상 박제 |

### 4-b DRY_RUN smoke (`DC_HOME=/tmp/smoke_dc DRY_RUN=1 ...`)

```
DRY_RUN send: socket=default target=claude keys=/exit Enter
DRY_RUN send: socket=default target=claude keys=C-d
DRY_RUN send: socket=default target=claude keys=/handoff load Enter
DRY_RUN send: socket=default target=claude keys=/develop-cycle 49 Enter
fired fresh process cycle N=49 (sequence: /exit + C-d + handoff load + develop-cycle)
```

→ DRY_RUN ✅ (시퀀스 4건 정상 출력 + signal cleared).

### 4-c dummy socket 별도 spawn smoke (실측 검증)

별도 socket `smoke` + target `dummy` 로 mcc 패턴 spawn 검증:

```
STEP1: pre-state has-session  → ABSENT (expected)
STEP2: spawn detached         → spawn OK
STEP3: post-state has-session → PRESENT (expected)
STEP4: send-keys              → send OK
STEP5: capture-pane           → "echo HELLO_FROM_SEND" 텍스트 박제 확인
STEP6: SIGINT survival        → kill -INT pane_pid 후 has-session SURVIVED ✅
STEP7: cleanup                → kill-server
```

**STEP6 가 핵심**: pane PID 에 SIGINT 보냈음에도 session 살아있음 = `trap "" SIGINT` 효과 실측 검증. 50 cycle 자율 진행 동안 의도치 않은 SIGINT 도달해도 자동 fire chain 안전.

## 5. 잔여 한계 (cycle 43 first real fire 시점 검증)

본 hotfix 가 차단 못하는 시나리오:
1. **claude TUI prompt buffer 잔존 시 C-d EOF 무시** — buffer 비어 있을 때만 EOF 작동. 사용자가 mcc 안에서 텍스트 입력 중 cycle 종료 시 fail 가능. 회피 path: `/exit` slash command primary, C-d fallback.
2. **send-keys 도달 후 claude warm-up 12초 부족** — 새 claude TUI 가 prompt 받을 준비 시간. 부족 시 send-keys 가 buffer 에 들어가도 처리 안 됨. 현재 cycle 41 박제 12초.
3. **`/handoff load` 실행 도중 `/develop-cycle 40` 도달 race** — sleep 8 가 handoff load 완료 보장 X. handoff load 가 8초 넘기면 race. 현재 박제 8초.

3 한계 모두 cycle 43 first real fire 실측 시점에서만 검증 가능. cycle 46 end-to-end verify-only retro 까지 미루지 않고, cycle 43 fire 직후 watch.log + cycles/44.json 박제 확인으로 즉시 검증.

## 6. 영향

- cycle 41 박제 "fire 시퀀스 검증됐다" = 거짓 → cycle 42 first fire 21:42 fail 로 노출 (R5 정정 박제 4번째)
- cycle 41 spec_v3 drift_risk_points 1~3 이 본 hotfix 로 모두 차단
- 50 cycle 자율 path 활성화 조건 충족 (smoke 3-layer pass + SIGINT 생존)

## 7. 다음 단계

1. 본 hotfix PR 머지 (R7 자동 squash + delete-branch)
2. signal 박제 → cycle 43 fire (next_n=49 또는 사용자 결정 N)
3. cycle 43 진행 시작 → cycle 끝 시 watch.sh fire → 본 세션 종료 + 새 process spawn → cycle 44 자동 진행 = **진짜 검증 신호**
4. cycle 44 박제 확인 후 사용자 자리 비움 가능

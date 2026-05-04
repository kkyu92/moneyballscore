---
title: cycle 43 — ensure_session pane wrapper 검증 (cycle 42.5 hotfix follow-up)
date: 2026-05-04
type: fix-incident
parent_cycle: 42.5
related: 2026-05-04-cycle-42-5-auto-fire-hardening-hotfix.md
r5_correction_n: 5
---

# cycle 43 — ensure_session pane wrapper 검증

cycle 42.5 hotfix 가 `ensure_session()` 추가했으나 **session 존재 여부만** 검증, **pane wrapper 구조 미검증**. 사용자 실제 세션이 `tmux new -As claude claude` (raw, wrapper 없음) 로 생성된 케이스에서 has-session true → 즉시 OK 리턴 → /exit 가 pane 죽임 → 후속 send-keys 모두 fail. cycle 42.5 hotfix 의 22:06 첫 실측 시도가 21:42 pre-hotfix 와 동일하게 fail = 본 문제 노출. R5 정정 박제 5번째.

## 1. Phase 1 — Root cause investigation (systematic-debugging)

### 1-a evidence — process tree

```
$ ps -ef | awk '$2==44194'
501 44194 1 0 10:07AM ?? 0:01.03 tmux new -As claude claude
```

PID 44194 = `tmux new -As claude claude` (literal). pane PID 44195 = `claude.exe` 직접. **bash wrapper 부재**. mcc alias 가 박제하는 `bash -c "trap '' SIGINT; while caffeinate -i command claude; do ...; done"` 패턴 X.

### 1-b watch.log timing 정확히 일치

```
22:06:45 send fail keys=C-d                    ← /exit Enter 성공 → claude 종료 → pane 죽음 → C-d 도달 X
22:06:58 send fail keys=/handoff load Enter
22:07:06 send fail keys=/develop-cycle 50 Enter
22:07:06 fire ABORT (cycle 42.5 hotfix SEND_FAILED guard 작동)
22:07:11 fail alert sent
22:07:26 (사용자 mcc 재진입 — 새 session 생성)
```

`/exit Enter` fail entry 부재 = 그건 성공 (session 살아있을 때). C-d 부터 fail = 그 사이 pane 사망.

### 1-c 비교 — wrapped vs raw

| session 종류 | pane PID 첫 프로세스 | `/exit` 처리 |
|---|---|---|
| **mcc alias (wrapped)** | `bash -c "trap ... while caffeinate ..."` | claude 종료 → bash continue → 새 claude spawn (chain 유지) |
| **사용자 현재 (raw)** | `claude` 직접 | claude 종료 → pane has no command → pane destroyed → session destroyed (single pane single window) |

### 1-d cycle 42.5 hotfix 가 놓친 부분

`ensure_session()`:
```bash
ensure_session() {
  if tmux_cmd has-session -t "$TMUX_TARGET" 2>/dev/null; then
    return 0  # ← session 존재 = 즉시 OK. pane 구조 검증 X
  fi
  # absent → spawn 처리만
}
```

has-session true 만 보고 통과. raw pane 도 통과. /exit 후 죽음.

### 1-e 21:42 pre-hotfix fail 도 동일 패턴

```
21:42:03 send fail target=claude keys=C-d
21:42:15 send fail target=claude keys=/handoff load Enter
21:42:23 send fail target=claude keys=/develop-cycle 40 Enter
21:42:23 fired fresh process cycle N=40 (silent — pre-hotfix SEND_FAILED guard 부재)
```

**동일 패턴 = 동일 root cause**. cycle 42.5 hotfix 는 silent 거짓 박제만 차단했고 (SEND_FAILED guard) 근본 원인 (pane wrapper 부재) 미해결.

## 2. Phase 2-3 — Pattern + Hypothesis

### 2-a Pattern

`tmux display-message -p -t '$TARGET:0.0' '#{pane_pid}'` = pane 의 첫 (launch) 프로세스 PID. 그 PID 의 `ps -o comm=` 가:
- `bash` → wrapper 시그니처
- `claude` (또는 다른 명령) → raw

### 2-b Hypothesis

ensure_session 에 pane_pid 의 comm 검증 추가. `bash` 가 아니면 ABORT (사용자 세션 자율 파괴 X).

### 2-c Verification

isolated tmux socket `smoke` 4 시나리오 (실측):

| # | 시나리오 | 결과 |
|---|---|---|
| 1 | absent → spawn detached (test: cat stand-in) | exit=0, pane_pid comm=bash ✅ |
| 2 | present + bash wrapper | exit=0 ✅ |
| 3 | present + raw cat (no wrapper) | exit=1, log "pane lacks bash wrapper — pane_pid=N comm=cat. ABORT." ✅ |
| 4 | present + raw sleep | exit=1, log "...comm=sleep. ABORT." ✅ |

사용자 실제 session 검증:
```
current pane_pid=44195
ps -o comm=: 'claude'
VERDICT: pane lacks wrapper → would ABORT (correct)
```

DRY_RUN smoke (회귀 차단):
```
DRY_RUN ensure_session: session present, would validate pane wrapper
DRY_RUN send: socket=default target=claude keys=/exit Enter
DRY_RUN send: socket=default target=claude keys=C-d
DRY_RUN send: socket=default target=claude keys=/handoff load Enter
DRY_RUN send: socket=default target=claude keys=/develop-cycle 42 Enter
```

DRY_RUN 경로 영향 X.

## 3. Phase 4 — Implementation

### 3-a 변경 영역

`~/.develop-cycle/watch.sh` `ensure_session()` 함수만 변경. main flow / send / signal 처리 X.

### 3-b 코드 (after)

```bash
ensure_session() {
  if ! tmux_cmd has-session -t "$TMUX_TARGET" 2>/dev/null; then
    if [ "$DRY_RUN" = "1" ]; then
      echo "DRY_RUN ensure_session: would spawn socket=$TMUX_SOCKET target=$TMUX_TARGET"
      return 0
    fi
    log "session absent socket=$TMUX_SOCKET target=$TMUX_TARGET — spawning detached"
    tmux_cmd new-session -d -s "$TMUX_TARGET" \
      bash -c 'trap "" SIGINT; while caffeinate -i command claude; do echo "[auto] claude exited, restart in 2s..."; sleep 2; done' \
      2>/dev/null
    sleep 15
    if tmux_cmd has-session -t "$TMUX_TARGET" 2>/dev/null; then
      log "session spawned socket=$TMUX_SOCKET target=$TMUX_TARGET"
      return 0
    fi
    log "session spawn FAILED socket=$TMUX_SOCKET target=$TMUX_TARGET"
    return 1
  fi

  # Session present — validate pane has bash wrapper before /exit-respawn fire.
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY_RUN ensure_session: session present, would validate pane wrapper"
    return 0
  fi

  local pane_pid pane_comm
  pane_pid=$(tmux_cmd display-message -p -t "$TMUX_TARGET:0.0" '#{pane_pid}' 2>/dev/null)
  if [ -z "$pane_pid" ] || ! [[ "$pane_pid" =~ ^[0-9]+$ ]]; then
    log "ensure_session: cannot read pane_pid socket=$TMUX_SOCKET target=$TMUX_TARGET — aborting"
    return 1
  fi
  pane_comm=$(ps -p "$pane_pid" -o comm= 2>/dev/null | awk '{print $1}' | xargs basename 2>/dev/null)
  case "$pane_comm" in
    bash) return 0 ;;
    *)
      log "session present but pane lacks bash wrapper — pane_pid=$pane_pid comm=$pane_comm. /exit would destroy session permanently. Restart via mcc alias OR run 'tmux kill-session -t $TMUX_TARGET' (watch.sh next fire will spawn a wrapped session)."
      return 1
      ;;
  esac
}
```

### 3-c 디자인 결정 — auto-rewrap X

raw pane 발견 시 자동 kill-session + spawn 옵션도 가능하나 **사용자 진행 중 claude 대화 파괴 위험**. 보수적 선택: ABORT + 명확한 안내. 사용자 manual 재진입 (mcc) 1회 = 향후 안전.

### 3-d 디자인 결정 — bash 만 허용

zsh wrapper 도 가능하지만 spawn fallback 이 bash 이므로 일관성 위해 bash 만 허용. zsh 사용 사용자 발생 시 추가 검토.

## 4. 사용자 즉시 조치 (cycle 43 ship 후)

```bash
# 1. /handoff save (현 세션 박제)
# 2. 본 claude 세션 종료 (/exit 또는 tmux kill-session -t claude)
tmux kill-session -t claude
# 3. 새 터미널 + mcc (새 alias = wrapper 박제)
mcc
# 4. mcc 안 새 claude 에서:
/handoff load
/develop-cycle 40
```

이후 자동 fire chain 활성화. cycle 43 → 44 자동 전환 = 진짜 검증 신호.

## 5. 박제 가치

### R5 정정 5번째

| # | 사이클 | 거짓 박제 | 정정 시점 | 차단 fix |
|---|---|---|---|---|
| 1 | cycle 25/26 | "watch.sh fire 검증됐다" | cycle 33 | PPID chain |
| 2 | cycle 39+40 | "base PR 자동 fire 작동" | cycle 41 | fire 시퀀스 |
| 3 | cycle 41 | "fire 시퀀스 검증됐다" | cycle 42 first fire 21:42 | hotfix 진행 |
| 4 | cycle 42.5 hotfix | "smoke + SIGINT survival 통과" | cycle 42.5 22:06 second fire | (본 cycle) |
| **5** | **cycle 42.5 ensure_session** | **"session 검증 충분"** | **cycle 43 본 진단** | **pane wrapper 검증** |

### 다음 잠재 R5 후보 (drift_risk_points)

cycle 42.5 hotfix spec section 5 의 잔여 한계 3건은 본 fix 적용 후에도 검증 미완:
1. claude TUI prompt buffer 잔존 시 C-d EOF 무시
2. 새 claude warm-up 12초 부족 가능성
3. /handoff load 와 /develop-cycle 사이 sleep 8 race

cycle 44+ 첫 fire 실측 시 검증 가능. 본 fix 가 차단 X — 단지 raw pane 케이스만 차단.

## 6. systematic-debugging 적용 결과

| Phase | 활동 | 결과 |
|---|---|---|
| 1 | Root cause investigation | ps + tmux display-message + watch.log 정렬 → 실측 단서 |
| 2 | Pattern analysis | wrapped vs raw 비교, pane_pid 검증 가능성 발견 |
| 3 | Hypothesis | comm=bash 검증으로 차단 가능 |
| 4 | Implementation | edit + 4 시나리오 isolated smoke + DRY_RUN 회귀 + 사용자 실제 session 검증 |

**Iron Law 준수**: 추측 fix X. 4 phase 모두 evidence-based.

# watch.sh TMUX_SOCKET 동적 지원 구현 (cycle 39, plan PR 1)

**일자**: 2026-05-04
**Cycle**: 39 (chain=fix-incident, plan.md PR 1 base 구현 첫 step)
**Base**: plan.md (cycle 38, 8 PR 분할)
**Status**: 글로벌 watch.sh 변경 + DRY_RUN smoke test PASS

---

## 1. 변경

`~/.develop-cycle/watch.sh` 의 send 함수 + TMUX_SOCKET 환경변수 / file 지원.

### 1.1 환경변수 + file fallback

```bash
TMUX_SOCKET_FILE="$DC_HOME/tmux-socket"
TMUX_TARGET_FILE="$DC_HOME/tmux-target"
TMUX_TARGET="${TMUX_TARGET:-$(cat "$TMUX_TARGET_FILE" 2>/dev/null || echo claude)}"
TMUX_SOCKET="${TMUX_SOCKET:-$(cat "$TMUX_SOCKET_FILE" 2>/dev/null || echo default)}"
```

우선순위:
1. 환경변수 (launchd plist 또는 export) — 최우선
2. `~/.develop-cycle/tmux-socket` / `tmux-target` file (cycle 40 SKILL.md active-cycle 박제 시 자동 작성 예정)
3. fallback default ("default" socket / "claude" target)

### 1.2 send 함수

```bash
send() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY_RUN send: socket=$TMUX_SOCKET target=$TMUX_TARGET keys=$*"
  elif [ "$TMUX_SOCKET" = "default" ]; then
    tmux send-keys -t "$TMUX_TARGET:0.0" "$@" 2>/dev/null || log "send-keys fail target=$TMUX_TARGET keys=$*"
  else
    tmux -L "$TMUX_SOCKET" send-keys -t "$TMUX_TARGET:0.0" "$@" 2>/dev/null || log "send-keys fail socket=$TMUX_SOCKET target=$TMUX_TARGET keys=$*"
  fi
}
```

핵심:
- `default` socket = `tmux send-keys -t TARGET:0.0` (legacy mcc 밖 환경)
- non-default socket = `tmux -L SOCKET send-keys -t TARGET:0.0` (mcc 안 환경)
- `:0.0` = window 0, pane 0 = mcc 의 메인 claude pane
- send-keys 실패 시 watch.log 박제 (silent fail 차단 — cycle 25/26 의 거짓 박제 회피)

---

## 2. 검증 (DRY_RUN smoke test)

### 2.1 default socket

```
$ DRY_RUN=1 TMUX_SOCKET=default TMUX_TARGET=claude
$ send "exit" Enter
DRY_RUN send: socket=default target=claude keys=exit Enter
```

OK.

### 2.2 mcc socket

```
$ DRY_RUN=1 TMUX_SOCKET=claude-swarm-60808 TMUX_TARGET=claude-swarm
$ send "exit" Enter
DRY_RUN send: socket=claude-swarm-60808 target=claude-swarm keys=exit Enter
$ send "/handoff load" Enter
DRY_RUN send: socket=claude-swarm-60808 target=claude-swarm keys=/handoff load Enter
```

OK.

---

## 3. 한계 + 다음 step (cycle 40~41)

### 3.1 한계

본 PR 만으로는 자동 fire 메커니즘 작동 X. tmux-socket / tmux-target file 부재 시 default fallback → mcc 환경 X.

### 3.2 cycle 40 (PR 2): SKILL.md active-cycle 박제 시 socket+target 자동 박제

`~/.claude/skills/develop-cycle/SKILL.md` + draft lockstep:

```bash
# 단계 1 진단 첫 step (PPID chain 매칭 후)
if [ -n "$TMUX" ]; then
  TMUX_SOCKET_NAME=$(basename "$(echo "$TMUX" | cut -d, -f1)")
elif [ -n "$P" ]; then
  TMUX_SOCKET_NAME=$(lsof -p "$P" 2>/dev/null | awk '/tmux/ {print $NF}' | head -1 | xargs basename 2>/dev/null | cut -d, -f1)
fi
[ -z "$TMUX_SOCKET_NAME" ] && TMUX_SOCKET_NAME="default"
echo "$TMUX_SOCKET_NAME" > ~/.develop-cycle/tmux-socket

TMUX_TARGET_NAME=$([ "$TMUX_SOCKET_NAME" = "default" ] && tmux display-message -p '#{session_name}' 2>/dev/null || tmux -L "$TMUX_SOCKET_NAME" display-message -p '#{session_name}' 2>/dev/null)
[ -z "$TMUX_TARGET_NAME" ] && TMUX_TARGET_NAME="claude"
echo "$TMUX_TARGET_NAME" > ~/.develop-cycle/tmux-target
```

### 3.3 cycle 41 (PR 3): mcc alias 변경 사용자 영역 안내

본 cycle 39 + cycle 40 만으로도 자동 fire 가능 — 단 mcc 가 caffeinate→claude 직접 spawn 패턴 유지 시 새 claude spawn X. mcc alias 변경 (bash while loop wrapper) 필요.

---

## 4. 결론

watch.sh socket 지원 구현 + DRY_RUN smoke test PASS. cycle 40~41 후 mcc 안 자동 fire 메커니즘 완성. cycle 46 end-to-end 검증 시 본 PR 의 효과 실측.

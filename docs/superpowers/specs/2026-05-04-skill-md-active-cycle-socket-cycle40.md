# SKILL.md active-cycle socket+target 자동 박제 (cycle 40, plan PR 2)

**일자**: 2026-05-04
**Cycle**: 40 (chain=fix-incident, plan.md PR 2)
**Base**: cycle 39 (PR #80, watch.sh socket 지원)
**Status**: SKILL.md + draft lockstep + 본 환경 검증 (한계 노출)

---

## 1. 변경

`~/.claude/skills/develop-cycle/SKILL.md` + `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` lockstep.

active-cycle 박제 직후 socket+target 자동 감지 + file 박제 추가:

```bash
TMUX_SOCKET_NAME=""
if [ -n "$TMUX" ]; then
  TMUX_SOCKET_NAME=$(basename "$(echo "$TMUX" | cut -d, -f1)")
elif [ -n "$P" ] && [ "$P" != "$$" ]; then
  TMUX_SOCKET_NAME=$(lsof -p "$P" 2>/dev/null | awk '/tmux/ {print $NF}' | head -1 | xargs basename 2>/dev/null | cut -d, -f1)
fi
[ -z "$TMUX_SOCKET_NAME" ] && TMUX_SOCKET_NAME="default"
echo "$TMUX_SOCKET_NAME" > ~/.develop-cycle/tmux-socket

if [ "$TMUX_SOCKET_NAME" = "default" ]; then
  TMUX_TARGET_NAME=$(tmux display-message -p '#{session_name}' 2>/dev/null)
else
  TMUX_TARGET_NAME=$(tmux -L "$TMUX_SOCKET_NAME" display-message -p '#{session_name}' 2>/dev/null)
fi
[ -z "$TMUX_TARGET_NAME" ] && TMUX_TARGET_NAME="claude"
echo "$TMUX_TARGET_NAME" > ~/.develop-cycle/tmux-target
```

---

## 2. 본 환경 검증 (한계 노출)

본 환경 (현재 cycle 진행 중) 검증:

```
$ echo "TMUX=$TMUX"
TMUX=

$ lsof -p 60808 2>/dev/null | awk '/tmux/ {print $NF}'
(빈 출력)

→ 감지된 socket: default
→ 감지된 target: claude (fallback)
```

### 2.1 핵심 발견

본 메인 claude 60808 의 PPID chain:
- 60808 (claude)
- 60803 (`/bin/sh /usr/bin/command claude`)
- 83781 (zsh)
- 83776 (login)
- 83030 (iTerm2)

→ **본 메인 claude 는 tmux 밖 — iTerm2 안 zsh 에서 직접 실행**.

`tmux -L claude-swarm-60808 list-clients` 결과 = 빈 (client 0). socket 은 살아있지만 attach 안 됨 = idle session.

즉 **현재 환경에서 watch.sh send-keys 는 본 메인 claude 에 도달 X** (tmux pane 안 process X).

### 2.2 cycle 41 의 진짜 가치

본 cycle 40 의 SKILL.md 변경은 = **사용자가 mcc alias 적용 후 새 세션 진입 시점부터** 효과. 현재 본 세션은 legacy 방식 (iTerm2 직접) 라 자동 감지 = default fallback.

cycle 41 (TODOS.md mcc alias 안내) = 진짜 활성화 트리거:
```bash
alias mcc='tmux new -As claude bash -c "trap \"exit 0\" SIGINT; while caffeinate -i command claude; do sleep 2; done"'
```

사용자가 `~/.zshrc` 에 추가 + `source ~/.zshrc` + `mcc` 진입 → 본 메인 claude 가 tmux pane 안 process → SKILL.md active-cycle 박제 시 socket=`claude` (default mcc tmux session name) + target=`claude` 자동 감지 → watch.sh 가 정확히 send-keys.

---

## 3. 검증 시나리오 (cycle 41 후 사용자 영역)

cycle 41 PR 머지 후 사용자가 다음 단계 수행:
1. `~/.zshrc` 에 mcc alias 1 line 추가
2. `source ~/.zshrc`
3. `mcc` 입력 → tmux 안 새 claude 시작
4. `/develop-cycle 2` 호출 → 본 메인이 cycle 진행
5. 진단 단계 첫 step active-cycle 박제 → tmux-socket=`default` + tmux-target=`claude` (mcc tmux session 안)
6. cycle 끝 + signal 박제 → watch.sh 가 send-keys → `/exit` (claude slash) → bash while loop 가 새 claude 시작 → /handoff load + /develop-cycle 1 자동 입력

검증 통과 시 cycle 41+ = 진짜 자율 진행 가능.

---

## 4. cycle 40 결론

- SKILL.md + draft lockstep edit
- 본 환경 검증 = default fallback 정상 (legacy iTerm2 환경)
- 진짜 효과 검증 = cycle 41 사용자 영역 적용 후 새 mcc 세션
- cycle 46 end-to-end 검증 시 본 PR 의 실측

본 cycle 40 = 인프라 박제. cycle 41 사용자 영역 = 활성화 트리거. cycle 46 = 검증.

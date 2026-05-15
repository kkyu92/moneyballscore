#!/bin/bash
# develop-cycle zero-touch watcher
# Read signal file → fire tmux send-keys to claude session, or telegram alert on FAIL.

set -uo pipefail

DC_HOME="${DC_HOME:-$HOME/.develop-cycle}"
SIGNAL="$DC_HOME/signal"
LOCK="$DC_HOME/lock"
LOG="$DC_HOME/watch.log"
TMUX_TARGET="${TMUX_TARGET:-claude}"
DRY_RUN="${DRY_RUN:-0}"
TELEGRAM_WEBHOOK="${TELEGRAM_WEBHOOK:-}"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"
}

send() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY_RUN send: $*"
  else
    tmux send-keys -t "$TMUX_TARGET" "$@"
  fi
}

notify_fail() {
  local reason="$1"
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY_RUN notify: $reason"
  elif [ -n "$TELEGRAM_WEBHOOK" ]; then
    curl -s -X POST "$TELEGRAM_WEBHOOK" \
      --data-urlencode "text=⚠️ develop-cycle FAIL: $reason" >/dev/null
  fi
}

main() {
  [ ! -f "$SIGNAL" ] && return 0
  [ -f "$LOCK" ] && return 0
  touch "$LOCK"

  local status reason next_n
  status=$(sed -n '2p' "$SIGNAL")
  reason=$(sed -n '3p' "$SIGNAL")
  next_n=$(sed -n '4p' "$SIGNAL")

  case "$status" in
    OK)
      if [[ "$next_n" =~ ^[0-9]+$ ]] && [ "$next_n" -gt 0 ]; then
        send "exit" Enter
        sleep 2
        send "claude --model sonnet" Enter
        sleep 12
        send "/handoff load" Enter
        sleep 8
        send "/develop-cycle $next_n" Enter
        log "fired fresh process cycle N=$next_n"
      else
        log "OK with next_n='$next_n', stop"
      fi
      ;;
    FAIL)
      notify_fail "$reason"
      log "fail alert sent: $reason"
      ;;
    *)
      log "malformed signal, status='$status' — discarding"
      ;;
  esac

  rm -f "$SIGNAL" "$LOCK"
}

main "$@"

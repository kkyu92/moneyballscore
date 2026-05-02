#!/bin/bash
# Install develop-cycle zero-touch watcher.
# Sets up ~/.develop-cycle/ + LaunchAgent plist + launchctl load.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_SRC="$REPO_ROOT/tools/zero-touch/watch.sh"
PLIST_SRC="$REPO_ROOT/tools/zero-touch/com.kkyu.dc-watch.plist"

DC_HOME="$HOME/.develop-cycle"
PLIST_DEST="$HOME/Library/LaunchAgents/com.kkyu.dc-watch.plist"
DRY_RUN="${DRY_RUN:-0}"

if [ -z "${TELEGRAM_WEBHOOK:-}" ]; then
  echo "WARN: TELEGRAM_WEBHOOK env var 미설정. FAIL 알림이 silent 작동 (curl 호출 자체 skip)."
  echo "   계속하려면 TELEGRAM_WEBHOOK 설정 후 재실행 권장."
  read -rp "Continue without webhook? [y/N] " ans
  [ "$ans" = "y" ] || exit 1
fi

run() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY: $*"
  else
    eval "$@"
  fi
}

echo "→ ~/.develop-cycle/ 셋업"
run "mkdir -p '$DC_HOME'"
run "cp '$SCRIPT_SRC' '$DC_HOME/watch.sh'"
run "chmod +x '$DC_HOME/watch.sh'"

echo "→ plist 치환 + 배치"
run "mkdir -p '$HOME/Library/LaunchAgents'"
if [ "$DRY_RUN" = "1" ]; then
  echo "DRY: sed -e ... '$PLIST_SRC' > '$PLIST_DEST'"
else
  sed \
    -e "s|__DC_WATCH_PATH__|$DC_HOME/watch.sh|g" \
    -e "s|__TELEGRAM_WEBHOOK__|${TELEGRAM_WEBHOOK:-}|g" \
    -e "s|__DC_HOME__|$DC_HOME|g" \
    "$PLIST_SRC" > "$PLIST_DEST"
fi

echo "→ launchctl load"
run "launchctl unload '$PLIST_DEST' 2>/dev/null || true"
run "launchctl load '$PLIST_DEST'"

echo ""
echo "✅ Installed."
echo "   - watch.sh: $DC_HOME/watch.sh"
echo "   - plist: $PLIST_DEST"
echo "   - log: $DC_HOME/watch.log"
echo "   - error log: $DC_HOME/error.log"
echo ""
echo "확인: launchctl list | grep dc-watch"

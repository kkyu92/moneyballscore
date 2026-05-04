#!/bin/bash
# Regression test for ~/.develop-cycle/watch.sh hang safety v2.
# Spawns dummy long-running PID, fakes active-cycle past hard cap, then asserts:
#   - dummy PID killed
#   - cycles/<n>.json written with outcome=interrupted
#   - signal file written with FAIL status
#   - active-cycle / idle-since cleaned up
#
# Run: bash tests/scripts/dc-watch-timeout.test.sh

set -uo pipefail

WATCH_SH="${WATCH_SH:-$HOME/.develop-cycle/watch.sh}"
[ ! -x "$WATCH_SH" ] && { echo "FAIL: $WATCH_SH not executable"; exit 1; }

TMP_HOME=$(mktemp -d)
mkdir -p "$TMP_HOME/cycles"
cleanup() { rm -rf "$TMP_HOME"; kill -9 "${DUMMY_PID:-0}" 2>/dev/null || true; }
trap cleanup EXIT

# Spawn dummy long-running process
sleep 9999 &
DUMMY_PID=$!
sleep 0.5  # let it settle

# Verify dummy is alive
if ! kill -0 "$DUMMY_PID" 2>/dev/null; then
  echo "FAIL: dummy process did not start"
  exit 1
fi

# ─── Test 1: hard cap kill (elapsed > CYCLE_HARD, regardless of activity) ───
NOW=$(date +%s)
HARD=3600
cat > "$TMP_HOME/active-cycle" <<EOF
99
$DUMMY_PID
$(( NOW - HARD - 100 ))
EOF

DRY_RUN=1 \
DC_HOME="$TMP_HOME" \
CYCLE_SOFT=2700 \
CYCLE_HARD="$HARD" \
IDLE_THRESHOLD=300 \
TELEGRAM_WEBHOOK="" \
bash "$WATCH_SH" 2>&1 | grep -v "^$" || true

# Allow watch.sh's `kill -TERM ... sleep 5 ... kill -9` to finish.
# do_kill sleeps 5s between SIGTERM and SIGKILL; give it room.
sleep 6

# Verify dummy was killed
if kill -0 "$DUMMY_PID" 2>/dev/null; then
  echo "FAIL [hard cap]: dummy PID $DUMMY_PID still alive after watch.sh ran"
  kill -9 "$DUMMY_PID" 2>/dev/null
  exit 1
fi

# Verify cycle_state written
if [ ! -f "$TMP_HOME/cycles/99.json" ]; then
  echo "FAIL [hard cap]: cycles/99.json not written"
  ls -la "$TMP_HOME/cycles/"
  exit 1
fi

if ! grep -q '"outcome": "interrupted"' "$TMP_HOME/cycles/99.json"; then
  echo "FAIL [hard cap]: outcome not interrupted in cycle_state"
  cat "$TMP_HOME/cycles/99.json"
  exit 1
fi

if ! grep -q "hard cap" "$TMP_HOME/cycles/99.json"; then
  echo "FAIL [hard cap]: reason 'hard cap' not in cycle_state"
  exit 1
fi

# Verify watch.log has TIMEOUT_KILL entry (signal is transient — main() consumes + deletes it)
if [ ! -f "$TMP_HOME/watch.log" ] || ! grep -q "TIMEOUT_KILL" "$TMP_HOME/watch.log"; then
  echo "FAIL [hard cap]: TIMEOUT_KILL log entry not written"
  [ -f "$TMP_HOME/watch.log" ] && cat "$TMP_HOME/watch.log"
  exit 1
fi

# Verify cleanup
[ -f "$TMP_HOME/active-cycle" ] && { echo "FAIL [hard cap]: active-cycle not cleaned up"; exit 1; }
[ -f "$TMP_HOME/idle-since" ] && { echo "FAIL [hard cap]: idle-since not cleaned up"; exit 1; }

echo "PASS [hard cap]"

# ─── Test 2: below-soft = no kill ───
sleep 9999 &
DUMMY_PID=$!
sleep 0.5
rm -f "$TMP_HOME/signal" "$TMP_HOME/cycles/100.json"

NOW=$(date +%s)
cat > "$TMP_HOME/active-cycle" <<EOF
100
$DUMMY_PID
$(( NOW - 600 ))
EOF

DRY_RUN=1 DC_HOME="$TMP_HOME" CYCLE_SOFT=2700 CYCLE_HARD=3600 IDLE_THRESHOLD=300 TELEGRAM_WEBHOOK="" \
  bash "$WATCH_SH" >/dev/null 2>&1

if ! kill -0 "$DUMMY_PID" 2>/dev/null; then
  echo "FAIL [below soft]: dummy PID killed (should remain alive)"
  exit 1
fi

if [ -f "$TMP_HOME/cycles/100.json" ]; then
  echo "FAIL [below soft]: cycle_state written (should not be)"
  exit 1
fi

[ ! -f "$TMP_HOME/active-cycle" ] && { echo "FAIL [below soft]: active-cycle removed (should remain)"; exit 1; }

kill -9 "$DUMMY_PID" 2>/dev/null
echo "PASS [below soft]"

# ─── Test 3: dead PID = active-cycle cleaned, no kill, no cycle_state ───
DEAD_PID=99999
while kill -0 "$DEAD_PID" 2>/dev/null; do DEAD_PID=$(( DEAD_PID + 1 )); [ "$DEAD_PID" -gt 4194304 ] && break; done

NOW=$(date +%s)
rm -f "$TMP_HOME/cycles/101.json" "$TMP_HOME/signal"
cat > "$TMP_HOME/active-cycle" <<EOF
101
$DEAD_PID
$(( NOW - 5000 ))
EOF

DRY_RUN=1 DC_HOME="$TMP_HOME" CYCLE_SOFT=2700 CYCLE_HARD=3600 IDLE_THRESHOLD=300 TELEGRAM_WEBHOOK="" \
  bash "$WATCH_SH" >/dev/null 2>&1

[ -f "$TMP_HOME/active-cycle" ] && { echo "FAIL [dead pid]: active-cycle not cleaned"; exit 1; }
[ -f "$TMP_HOME/cycles/101.json" ] && { echo "FAIL [dead pid]: cycle_state written for dead PID"; exit 1; }

echo "PASS [dead pid]"

# ─── Test 4: malformed active-cycle = cleanup, no error ───
NOW=$(date +%s)
echo "garbage" > "$TMP_HOME/active-cycle"

DRY_RUN=1 DC_HOME="$TMP_HOME" CYCLE_SOFT=2700 CYCLE_HARD=3600 IDLE_THRESHOLD=300 TELEGRAM_WEBHOOK="" \
  bash "$WATCH_SH" >/dev/null 2>&1

[ -f "$TMP_HOME/active-cycle" ] && { echo "FAIL [malformed]: active-cycle not discarded"; exit 1; }

echo "PASS [malformed]"

echo ""
echo "════════════════════════════════════════"
echo "ALL TESTS PASSED — dc-watch-timeout v2"
echo "════════════════════════════════════════"

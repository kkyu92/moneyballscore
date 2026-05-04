#!/bin/bash
# Self-test for watch.sh (DRY_RUN mode).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WATCH="$SCRIPT_DIR/watch.sh"

TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

export DC_HOME="$TMP"
export DRY_RUN=1
export TELEGRAM_WEBHOOK="https://example.invalid/dummy"

assert_contains() {
  local out="$1" needle="$2" name="$3"
  if echo "$out" | grep -qF "$needle"; then
    echo "✅ $name"
  else
    echo "❌ $name"
    echo "  expected to contain: $needle"
    echo "  actual: $out"
    exit 1
  fi
}

assert_not_contains() {
  local out="$1" needle="$2" name="$3"
  if echo "$out" | grep -qF "$needle"; then
    echo "❌ $name"
    echo "  expected NOT to contain: $needle"
    echo "  actual: $out"
    exit 1
  else
    echo "✅ $name"
  fi
}

run_case() {
  local name="$1" signal_content="$2"
  rm -f "$TMP/signal" "$TMP/lock"
  printf "%s" "$signal_content" > "$TMP/signal"
  bash "$WATCH" 2>&1
}

# Case 1: OK + next_n=3 → send-keys 시퀀스 (D-2: 매 사이클 새 process)
out=$(run_case "ok+next3" "3
OK

3")
assert_contains "$out" "DRY_RUN send: exit" "case1: exit send (claude 종료)"
assert_contains "$out" "DRY_RUN send: claude" "case1: claude send (새 process 시작)"
assert_contains "$out" "DRY_RUN send: /handoff load" "case1: /handoff load send"
assert_contains "$out" "DRY_RUN send: /develop-cycle 3" "case1: /develop-cycle 3 send"

# Case 2: OK + next_n=0 → send-keys 안 함
out=$(run_case "ok+next0" "3
OK

0")
assert_not_contains "$out" "DRY_RUN send" "case2: no send-keys"

# Case 3: FAIL → 텔레그램 notify
out=$(run_case "fail" "2
FAIL
worker shutdown timeout
0")
assert_contains "$out" "DRY_RUN notify: worker shutdown timeout" "case3: telegram notify"
assert_not_contains "$out" "DRY_RUN send" "case3: no send-keys"

# Case 4: malformed → 아무것도 안 함, log 만
out=$(run_case "malformed" "1
WEIRD_STATUS
")
assert_not_contains "$out" "DRY_RUN send" "case4: no send-keys"
assert_not_contains "$out" "DRY_RUN notify" "case4: no notify"
grep -qF "malformed signal" "$TMP/watch.log" && echo "✅ case4: log written" \
  || { echo "❌ case4: log missing"; exit 1; }

# Case 5: signal file 없음 → no-op (lock 파일도 안 만들어야)
rm -f "$TMP/signal" "$TMP/lock"
bash "$WATCH"
[ ! -f "$TMP/lock" ] && echo "✅ case5: no signal → no lock" \
  || { echo "❌ case5: lock created without signal"; exit 1; }

# Case 6: signal 처리 후 항상 삭제
printf "3\nOK\n\n3" > "$TMP/signal"
bash "$WATCH" >/dev/null 2>&1
[ ! -f "$TMP/signal" ] && echo "✅ case6: signal deleted after processing" \
  || { echo "❌ case6: signal NOT deleted"; exit 1; }

echo ""
echo "All tests passed."

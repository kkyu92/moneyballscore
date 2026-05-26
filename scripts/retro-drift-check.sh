#!/usr/bin/env bash
# silent retro drift family detection — develop-cycle 자체 retro 박제 layer silent skip 진단
# 사례 15 (cycle 882-888 7건 silent retro drift, CLAUDE.md 드리프트 사례 박제)
# Usage:
#   scripts/retro-drift-check.sh [from_cycle] [to_cycle]
#   scripts/retro-drift-check.sh 870 913
#   scripts/retro-drift-check.sh               # default: last 50 cycles before max
# Exit codes:
#   0 — no drift detected (모든 cycle 안 JSON + commit 양쪽 박제)
#   1 — drift detected (silent skip 1+ cycle)
#   2 — usage / 환경 오류

set -euo pipefail

CYCLES_DIR="${CYCLES_DIR:-$HOME/.develop-cycle/cycles}"

if [ ! -d "$CYCLES_DIR" ]; then
  echo "ERROR: cycles dir not found: $CYCLES_DIR" >&2
  exit 2
fi

MAX_CYCLE=$(ls "$CYCLES_DIR" 2>/dev/null | grep -E '^[0-9]+\.json$' | sed 's/\.json//' | sort -n | tail -1)
if [ -z "$MAX_CYCLE" ]; then
  echo "ERROR: no cycle JSON found in $CYCLES_DIR" >&2
  exit 2
fi

FROM_CYCLE="${1:-$((MAX_CYCLE - 50 + 1))}"
TO_CYCLE="${2:-$MAX_CYCLE}"

if [ "$FROM_CYCLE" -lt 1 ]; then
  FROM_CYCLE=1
fi

if [ "$FROM_CYCLE" -gt "$TO_CYCLE" ]; then
  echo "ERROR: from_cycle ($FROM_CYCLE) > to_cycle ($TO_CYCLE)" >&2
  exit 2
fi

echo "=== silent retro drift check: cycle $FROM_CYCLE..$TO_CYCLE ==="

DRIFT_CYCLES=()
JSON_ONLY=()
COMMIT_ONLY=()

for n in $(seq "$FROM_CYCLE" "$TO_CYCLE"); do
  HAS_JSON=0
  HAS_COMMIT=0
  [ -f "$CYCLES_DIR/$n.json" ] && HAS_JSON=1
  if git log --all --oneline --grep="policy: cycle $n " 2>/dev/null | head -1 | grep -q .; then
    HAS_COMMIT=1
  fi

  if [ $HAS_JSON -eq 0 ] && [ $HAS_COMMIT -eq 0 ]; then
    DRIFT_CYCLES+=("$n")
  elif [ $HAS_JSON -eq 1 ] && [ $HAS_COMMIT -eq 0 ]; then
    COMMIT_ONLY+=("$n")
  elif [ $HAS_JSON -eq 0 ] && [ $HAS_COMMIT -eq 1 ]; then
    JSON_ONLY+=("$n")
  fi
done

TOTAL=$((TO_CYCLE - FROM_CYCLE + 1))
DRIFT_N=${#DRIFT_CYCLES[@]}
JSON_ONLY_N=${#JSON_ONLY[@]}
COMMIT_ONLY_N=${#COMMIT_ONLY[@]}
OK_N=$((TOTAL - DRIFT_N - JSON_ONLY_N - COMMIT_ONLY_N))

echo ""
echo "총 범위: $TOTAL cycle"
echo "  OK (JSON + commit 양쪽 박제): $OK_N"
echo "  silent drift (양쪽 부재):     $DRIFT_N"
echo "  partial drift (JSON only):    $JSON_ONLY_N"
echo "  partial drift (commit only):  $COMMIT_ONLY_N"

if [ $DRIFT_N -gt 0 ]; then
  echo ""
  echo "❌ silent retro drift detected — 사례 15 family"
  echo "drift cycles: ${DRIFT_CYCLES[*]}"
fi

if [ $JSON_ONLY_N -gt 0 ]; then
  echo ""
  echo "⚠️  partial drift (JSON only — commit silent skip)"
  echo "cycles: ${JSON_ONLY[*]}"
fi

if [ $COMMIT_ONLY_N -gt 0 ]; then
  echo ""
  echo "⚠️  partial drift (commit only — JSON silent skip)"
  echo "cycles: ${COMMIT_ONLY[*]}"
fi

if [ $DRIFT_N -gt 0 ] || [ $JSON_ONLY_N -gt 0 ] || [ $COMMIT_ONLY_N -gt 0 ]; then
  echo ""
  echo "조치 가이드:"
  echo "  1. drift cycle 본 메인 작업 evidence 확인 (git log PR# / CLAUDE.md 박제 / TODOS.md)"
  echo "  2. retroactive 박제 X (당시 작업 evidence 부재 시 재구성 불가)"
  echo "  3. 패턴 누적 시 SKILL.md skill-evolution carry-over"
  exit 1
fi

echo ""
echo "✅ no retro drift"
exit 0

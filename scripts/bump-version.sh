#!/usr/bin/env bash
# Atomically syncs VERSION + root package.json + apps/moneyball/package.json
# to a single version string. version-sync-guard.test.ts (cycle 2047) only
# detects drift a cycle late; this script exists so the 3 files never drift
# in the first place — each was previously bumped by hand and kept missing
# one (cycle 2068 VERSION stale, cycle 2070 root package.json stale).
#
# CHANGELOG.md's top `## v<version>` heading is prose (multi-paragraph entry)
# and stays a manual write — this script only guards the 3 machine-checked
# version fields.
set -euo pipefail

NEW_VERSION="${1:?usage: bump-version.sh <X.Y.Z.W>}"

if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "bump-version: version must match X.Y.Z.W (got: $NEW_VERSION)" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "$NEW_VERSION" > "$ROOT_DIR/VERSION"

node -e "
const fs = require('fs');
const version = process.argv[1];
for (const p of process.argv.slice(2)) {
  const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
}
" "$NEW_VERSION" "$ROOT_DIR/package.json" "$ROOT_DIR/apps/moneyball/package.json"

echo "bump-version: VERSION + package.json (root) + apps/moneyball/package.json -> $NEW_VERSION"
echo "Reminder: CHANGELOG.md top heading must also read '## v$NEW_VERSION — ...' (write by hand)."

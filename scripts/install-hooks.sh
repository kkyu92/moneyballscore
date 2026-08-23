#!/bin/sh
# Install git pre-push validation hook.
# Runs automatically via `prepare` lifecycle (pnpm install).
# Re-run manually: sh scripts/install-hooks.sh

set -e

# Skip in CI or when .git is absent (submodule / worktree edge cases)
if [ -n "$CI" ] || [ ! -d ".git" ]; then
  echo "hooks: skipping (CI or no .git)"
  exit 0
fi

HOOKS_DIR="$(git rev-parse --show-toplevel)/.git/hooks"

cat > "$HOOKS_DIR/pre-push" << 'HOOK'
#!/bin/sh
# Pre-push validation: lint + type-check + version-sync-guard
# Catches the most common CI failure causes before they reach origin.
# version-sync-guard added cycle 2452 fix-incident: VERSION/package.json
# 3-way drift recurred 5x (cycle 2363/2437/2445 etc) because hand-edited
# version bumps only surfaced the mismatch in CI, after push/merge.

set -e

echo "[pre-push] Running validation..."

if ! pnpm lint 2>&1; then
  echo "[pre-push] ✗ lint failed — fix errors before pushing"
  exit 1
fi

if ! pnpm type-check 2>&1; then
  echo "[pre-push] ✗ type-check failed — fix type errors before pushing"
  exit 1
fi

if ! (cd apps/moneyball && pnpm vitest run src/app/__tests__/version-sync-guard.test.ts) 2>&1; then
  echo "[pre-push] ✗ version-sync-guard failed — VERSION/package.json/CHANGELOG drift, fix before pushing"
  exit 1
fi

echo "[pre-push] ✓ lint + type-check + version-sync-guard passed"
HOOK

chmod +x "$HOOKS_DIR/pre-push"
echo "hooks: pre-push installed at $HOOKS_DIR/pre-push"

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
# Pre-push validation: lint + type-check
# Catches the two most common CI failure causes before they reach origin.

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

echo "[pre-push] ✓ lint + type-check passed"
HOOK

chmod +x "$HOOKS_DIR/pre-push"
echo "hooks: pre-push installed at $HOOKS_DIR/pre-push"

#!/usr/bin/env bash
# Brings new upstream changes into this fork through a pull request.
#
#   - Nothing new upstream: does nothing.
#   - A sync pull request is already open: does nothing (merge or close it first).
#   - Merges cleanly: pushes branch sync/upstream-<date>, runs typecheck, tests
#     and the build, and opens a pull request that says what came in and
#     whether the checks passed. Cloudflare Pages gives that branch a preview URL.
#   - Conflicts: opens an issue listing the files, and changes nothing.
#
# Env: UPSTREAM_URL (default below), BASE (default main), DRY_RUN=1 to skip
# the push and the pull request / issue calls.
set -uo pipefail

UPSTREAM_URL="${UPSTREAM_URL:-https://github.com/julesvbertolino/todoist-enhanced.git}"
BASE="${BASE:-main}"
DRY_RUN="${DRY_RUN:-0}"
run() { if [ "$DRY_RUN" = "1" ]; then echo "[dry run] $*"; else "$@"; fi; }

git remote get-url upstream >/dev/null 2>&1 || git remote add upstream "$UPSTREAM_URL"
git fetch --quiet upstream main --tags

BEHIND=$(git rev-list --count "HEAD..upstream/main")
if [ "$BEHIND" = "0" ]; then echo "Up to date with upstream."; exit 0; fi

if [ "$DRY_RUN" != "1" ] && [ -n "$(gh pr list --state open --search 'head:sync/upstream-' --json number --jq '.[].number')" ]; then
  echo "A sync pull request is already open. Merge or close it first."; exit 0
fi

NEW_VERSION=$(git describe --tags --abbrev=0 upstream/main 2>/dev/null || echo "latest")
BRANCH="sync/upstream-$(date +%Y%m%d)"
git config user.name  "${GIT_AUTHOR_NAME:-github-actions[bot]}"
git config user.email "${GIT_AUTHOR_EMAIL:-41898282+github-actions[bot]@users.noreply.github.com}"
git checkout -q -B "$BRANCH" "$BASE"

if ! git merge --no-edit --no-ff upstream/main >/tmp/merge.log 2>&1; then
  FILES=$(git diff --name-only --diff-filter=U)
  git merge --abort
  echo "Conflicts in:"; echo "$FILES"
  BODY=$(printf 'Upstream is %s commit(s) ahead (latest release: %s), but merging it conflicts in:\n\n%s\n\nThese are files you changed and upstream changed too. Merge by hand:\n\n    git fetch upstream && git checkout -b sync/manual main && git merge upstream/main\n\nthen resolve, test, and open a pull request.\n' \
    "$BEHIND" "$NEW_VERSION" "$(echo "$FILES" | sed 's/^/- /')")
  run gh issue create --title "Upstream $NEW_VERSION needs a manual merge" --body "$BODY"
  exit 0
fi

CHECKS=""
STATUS="passed"
if [ -f package.json ] && [ "${SKIP_CHECKS:-0}" != "1" ]; then
  npm ci --silent && npm run --silent typecheck && npm test --silent && npm run --silent build || STATUS="FAILED"
  CHECKS="Typecheck, unit tests and build: **$STATUS**."
else
  CHECKS="Checks were skipped."
fi

CHANGES=$(git diff "$BASE"..upstream/main -- CHANGELOG.md 2>/dev/null | grep '^+' | grep -v '^+++' | sed 's/^+//' | head -60)
BODY=$(printf 'Brings in %s upstream commit(s), up to %s.\n\n%s\n\nOpen the Cloudflare Pages preview for this branch and check your views before merging. Merging deploys to production.\n\n### Upstream changelog\n\n%s\n' \
  "$BEHIND" "$NEW_VERSION" "$CHECKS" "${CHANGES:-No changelog entry.}")
run git push -q origin "$BRANCH"
run gh pr create --base "$BASE" --head "$BRANCH" --title "Sync upstream ($NEW_VERSION)" --body "$BODY"
echo "Done: $BRANCH ($STATUS)"

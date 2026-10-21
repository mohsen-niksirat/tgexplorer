#!/usr/bin/env bash
# ============================================================
# scripts/push-branch.sh — push the current commit to a branch
# ------------------------------------------------------------
# The crawl/avatar workflows used to push to `main` while the code
# lived on `master`, so every crawled update went to a branch nobody
# deployed. They also swallowed the push failure: `git push` inside an
# `if` never trips `set -e`, so the job reported success while nothing
# was pushed.
#
#   scripts/push-branch.sh <branch> [conflict-paths...]
#
# Retries on a race, resolves a rebase conflict in favour of the
# generated data files, and fails loudly when the push never succeeds.
# ============================================================
set -euo pipefail

BRANCH="${1:?usage: push-branch.sh <branch> [conflict-paths...]}"
shift || true
CONFLICT_PATHS=("$@")

echo "Pushing to origin/$BRANCH"

for attempt in 1 2 3 4 5; do
  git fetch origin "$BRANCH" || true

  if ! git rebase "origin/$BRANCH"; then
    echo "Rebase conflict — keeping the generated files from this run"
    for path in "${CONFLICT_PATHS[@]}"; do
      git checkout --theirs "$path" 2>/dev/null || true
      git add "$path" 2>/dev/null || true
    done
    GIT_EDITOR=true git rebase --continue 2>/dev/null || git rebase --abort 2>/dev/null || true
  fi

  if git push origin "HEAD:$BRANCH"; then
    echo "Pushed successfully (attempt $attempt)"
    exit 0
  fi

  echo "Push raced with another run — retrying ($attempt/5)"
  sleep 8
done

echo "::error::Could not push to origin/$BRANCH after 5 attempts"
exit 1

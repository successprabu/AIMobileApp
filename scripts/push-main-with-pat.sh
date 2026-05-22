#!/usr/bin/env bash
# Push main to successprabu/AIMobileApp using a GitHub PAT.
# Usage:
#   GITHUB_PAT=ghp_xxx ./scripts/push-main-with-pat.sh
#   echo ghp_xxx | GITHUB_PAT=$(cat) ./scripts/push-main-with-pat.sh

set -euo pipefail
cd "$(dirname "$0")/.."

PAT="${GITHUB_PAT:-${GH_TOKEN:-${PAT:-}}}"

if [ -z "$PAT" ]; then
  echo "Set GITHUB_PAT (or GH_TOKEN / PAT) with a fine-grained token that can write to successprabu/AIMobileApp."
  exit 1
fi

git checkout main
git merge -q cursor/new-receipt-fead 2>/dev/null || true

export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_SYSTEM=/dev/null

git -c 'url.https://github.com/.insteadof=' \
  -c 'url.https://x-access-token:cursor@github.com/.insteadof=' \
  push "https://x-access-token:${PAT}@github.com/successprabu/AIMobileApp.git" main

echo "Pushed main successfully."

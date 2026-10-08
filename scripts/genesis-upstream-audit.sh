#!/usr/bin/env bash
set -euo pipefail
URL="${UPSTREAM_URL:-https://github.com/melgarafael/DeskcommCRM.git}"
REMOTE="${UPSTREAM_REMOTE:-deskcomm-upstream}"
git rev-parse --is-inside-work-tree >/dev/null
if git remote get-url "$REMOTE" >/dev/null 2>&1; then git remote set-url "$REMOTE" "$URL"; else git remote add "$REMOTE" "$URL"; fi
git fetch --tags "$REMOTE" main
echo "UPSTREAM_MAIN=$(git rev-parse "$REMOTE/main")"
git tag --sort=-version:refname | head -20
git diff --name-status HEAD..."$REMOTE/main" | sed -n '1,400p'
echo "NO MERGE PERFORMED"

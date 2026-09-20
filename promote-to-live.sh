#!/usr/bin/env bash
set -euo pipefail

# Deploy to production from local main branch.
# Usage:
#   ./promote-to-live.sh

BRANCH="main"
LIVE_REMOTE="origin"

echo "→ Pushing to $LIVE_REMOTE/$BRANCH ..."
git push "$LIVE_REMOTE" "$BRANCH"
echo "✓ Production deployed — https://arthadrishti-app.vercel.app"

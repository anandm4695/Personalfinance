#!/usr/bin/env bash
set -euo pipefail

# Sync demo and live deployments from local main branch.
# Usage:
#   ./promote-to-live.sh          Push to both remotes (demo first, then origin)
#   ./promote-to-live.sh --demo   Push to demo only
#   ./promote-to-live.sh --live   Push to origin/live only

BRANCH="main"
DEMO_REMOTE="demo"
LIVE_REMOTE="origin"

push_demo() {
  echo "→ Pushing to $DEMO_REMOTE/$BRANCH ..."
  git push "$DEMO_REMOTE" "$BRANCH"
  echo "✓ Demo pushed — https://personalfinancedemo.vercel.app"
}

push_live() {
  echo "→ Pushing to $LIVE_REMOTE/$BRANCH ..."
  git push "$LIVE_REMOTE" "$BRANCH"
  echo "✓ Live pushed — https://personal-finance-by-anand-mohta.vercel.app"
}

case "${1:-}" in
  --demo) push_demo ;;
  --live) push_live ;;
  *)
    push_demo
    echo ""
    push_live
    echo ""
    echo "✓ Both remotes are in sync at $(git rev-parse --short HEAD)"
    ;;
esac

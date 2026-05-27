#!/bin/bash
# ──────────────────────────────────────────────────────────────
# PROMOTE DEMO → LIVE
# Run this script when you're happy with the demo and want to
# push everything to the live environment.
#
# What it does automatically:
#   1. Pulls latest code from demo GitHub
#   2. Copies it to live GitHub (push triggers live Vercel deploy)
#   3. Deploys to live Vercel
#
# What you do manually after:
#   4. Apply SQL to live Supabase (only if you added new DB migrations)
# ──────────────────────────────────────────────────────────────

set -e  # stop on any error

LIVE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_REPO="https://github.com/anandm4695/Personalfinancedemo.git"

echo ""
echo "========================================="
echo "  PROMOTING DEMO → LIVE"
echo "========================================="
echo ""

# ── Step 1: Pull latest demo code ──────────────────────────────
echo "Step 1/3 — Pulling latest code from demo GitHub..."
TEMP_DIR=$(mktemp -d)
git clone "$DEMO_REPO" "$TEMP_DIR" --depth=1 --quiet
echo "  ✅ Demo code downloaded"

# ── Step 2: Sync files to live repo ────────────────────────────
echo "Step 2/3 — Copying to live repo..."
rsync -a --delete \
  --exclude='.git/' \
  --exclude='.vercel/' \
  --exclude='node_modules/' \
  --exclude='build/' \
  --exclude='.env' \
  "$TEMP_DIR/" "$LIVE_DIR/"
rm -rf "$TEMP_DIR"

cd "$LIVE_DIR"

# Check if anything actually changed
if git diff --quiet && git diff --cached --quiet; then
  echo "  ℹ️  No changes detected — demo and live are already in sync."
else
  git add -A
  git commit -m "promote: sync from demo to live — $(date '+%Y-%m-%d %H:%M')"
  git push origin main
  echo "  ✅ Live GitHub updated (live Vercel will auto-deploy if connected)"
fi

# ── Step 3: Deploy to live Vercel ──────────────────────────────
echo "Step 3/3 — Deploying to live Vercel..."
npx vercel --prod --yes 2>&1 | grep -E "(Ready|Error|✓|✗|https://)" | head -5
echo "  ✅ Live Vercel deployed"

echo ""
echo "========================================="
echo "  ✅ LIVE ENVIRONMENT UPDATED"
echo "========================================="
echo ""
echo "  Live app: https://personal-finance-by-anand-mohta.vercel.app"
echo ""
echo "─────────────────────────────────────────"
echo "  ⚠️  DID YOU ADD NEW SQL MIGRATIONS?"
echo "─────────────────────────────────────────"
echo "  If yes, apply them to live Supabase:"
echo "  1. Go to supabase.com → live project"
echo "  2. SQL Editor → New query"
echo "  3. Paste database/fix_schema_sync.sql → Run"
echo ""

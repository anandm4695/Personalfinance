-- ============================================================
-- MIGRATION 70: Add missing user_id index on gold_holdings
--
-- Migration 60_gold_holdings.sql created the gold_holdings table
-- without an index on user_id, unlike every other user-data table
-- added since migration 33 — every query in this app filters
-- gold_holdings by user_id (e.g. api/send-summary.js, the Gold tab),
-- so this was doing a sequential scan on every lookup.
--
-- Run in Supabase SQL Editor — safe to run multiple times (IF NOT EXISTS).
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_gold_holdings_user_id ON gold_holdings(user_id);

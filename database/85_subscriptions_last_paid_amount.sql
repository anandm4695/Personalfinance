-- Migration 85: Subscriptions — track last bank-linked paid amount
-- When a bank transaction linked to a subscription is posted (BanksTab's
-- autoPostLinkedTransaction), the renewal date advances but the actual amount
-- charged was never recorded anywhere — so a price hike (e.g. Netflix raising
-- its price) went completely unnoticed unless the user happened to compare
-- bank statements manually. This column stores the amount from the most
-- recent linked payment so SubscriptionsTab can flag a mismatch against the
-- tracked `amount` and offer a one-click "Update tracked cost" action.
-- Run manually in Supabase SQL Editor (Dashboard → SQL Editor → New query).

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_paid_amount numeric;

-- ── Verify column was added ─────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'subscriptions' AND column_name = 'last_paid_amount';

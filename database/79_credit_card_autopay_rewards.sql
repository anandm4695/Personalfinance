-- ============================================================
-- MIGRATION 79: Autopay + reward points tracking on credit_cards
--
-- auto_pay              — when true, due-date urgency alerts/notifications
--                          are muted for this card (payment is automatic).
-- reward_points_balance — current loyalty/reward points balance.
-- reward_point_value    — redemption value per point (₹), used to estimate
--                          the redeemable ₹ value of the points balance.
--
-- Run in Supabase SQL Editor — safe to run multiple times (IF NOT EXISTS).
-- ============================================================

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS auto_pay boolean DEFAULT false;

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS reward_points_balance numeric DEFAULT 0;

ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS reward_point_value numeric DEFAULT 0;

COMMENT ON COLUMN public.credit_cards.auto_pay IS 'When true, due-date urgency reminders are muted for this card';
COMMENT ON COLUMN public.credit_cards.reward_points_balance IS 'Current reward/loyalty points balance';
COMMENT ON COLUMN public.credit_cards.reward_point_value IS 'Redemption value per point (₹) — used to estimate redeemable value';

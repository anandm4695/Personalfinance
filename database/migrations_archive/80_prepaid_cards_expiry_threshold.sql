-- Migration 80: Expiry date + low-balance threshold on prepaid cards
-- Prepaid cards previously had no expiry tracking, so a card could lapse with
-- unused balance still on it and no warning. Also adds a per-card low-balance
-- threshold (falls back to a ₹100 default in app code when unset) so the
-- low-balance alert can be tuned per card instead of a single hardcoded value.

ALTER TABLE public.prepaid_cards
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS low_balance_threshold numeric(12,2);

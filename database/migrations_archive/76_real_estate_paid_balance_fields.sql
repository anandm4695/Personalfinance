-- Migration 76: Real Estate — Paid fields for Agreement Value & Stamp Duty
-- Mirrors the tds_amount/tds_value split (migration 75): agreement_value and
-- stamp_duty remain the Total (contracted) figures, and these new *_paid
-- columns track the cumulative amount actually paid so far (incremented when
-- a bank transaction is linked to that cost field). The UI derives
-- Balance = Total - Paid for all three cost types.

ALTER TABLE public.real_estate_properties
  ADD COLUMN IF NOT EXISTS agreement_value_paid numeric(14,2),
  ADD COLUMN IF NOT EXISTS stamp_duty_paid numeric(14,2);

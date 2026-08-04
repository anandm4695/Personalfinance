-- Migration 83: Payment ledger for Loans Given / Loans Taken
-- Loan Given's "Quick Repayment" only ever overwrote the `outstanding` number,
-- with no record of individual repayment dates/amounts — no audit trail, no
-- way to undo a mis-entered figure, no history to review. This adds a
-- `payments` jsonb ledger (same pattern as the informal-loan tranches/payments
-- columns in 02_add_missing_tables.sql) so each repayment is logged as its
-- own {id, amount, date, note} entry while `outstanding` remains the
-- authoritative running balance every other screen already reads.

ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS payments jsonb DEFAULT '[]'::jsonb;

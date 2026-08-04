-- Migration 82: Track the principal portion of loan-EMI linked bank transactions
-- When a bank transaction is linked to a Loan Taken record, the app posts a
-- payment against that loan's outstanding balance. Previously it subtracted
-- the FULL transaction amount, but part of every EMI is interest — only the
-- principal portion should reduce the outstanding balance. This column stores
-- the exact principal amount that was applied at posting time, so that
-- deleting the transaction later can reverse the correct amount instead of
-- guessing (recomputing at delete-time would use the loan's now-changed
-- outstanding/rate and drift from what was actually applied).

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS linked_principal_amount numeric;

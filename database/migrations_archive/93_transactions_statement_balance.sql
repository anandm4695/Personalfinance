-- Migration 93: Preserve the bank-stated closing balance from CSV imports
-- Real bank statement CSV exports carry their own per-row closing balance
-- column, which Smart Import already detects but previously discarded. The
-- Banks & Transactions ledger's running "Balance" column was reconstructing
-- balances backward from the account's CURRENT balance, which only holds up
-- when every transaction the account ever had has been entered — untrue for
-- an account whose transactions came from importing a slice of years-old
-- bank history. This column stores that ground-truth balance per transaction
-- so the ledger can use it directly instead of guessing.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS statement_balance numeric;

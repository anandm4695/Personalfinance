-- Migration 81: Add missing columns to loans table
-- The Loan Taken/Loan Given forms have always collected a lender/borrower name,
-- an EMI due day, a note, and (for Loan Given) a "given on" / "due by" date —
-- but the `loans` table never had matching columns for `due_day`, `note`,
-- `given_date`, or `due_date`. Every new/edited loan upsert therefore included
-- unknown-column keys and was silently rejected by PostgREST (failures are
-- swallowed by Promise.allSettled), so loans never actually persisted to
-- Supabase — only to local state until the next reload/re-login wiped them.

ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS due_day     integer CHECK (due_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS note        text,
  ADD COLUMN IF NOT EXISTS given_date  date,
  ADD COLUMN IF NOT EXISTS due_date    date;

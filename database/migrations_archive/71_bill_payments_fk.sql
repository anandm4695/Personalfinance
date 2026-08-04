-- Migration 71: Foreign key for bill_payments.bank_account_id
--
-- Gap found in a later audit: migration 66 (bill_payments) added
-- bank_account_id UUID with no REFERENCES clause, unlike every other
-- cross-table reference in this schema (e.g. account_id -> bank_accounts
-- in migrations 01, 35, 42). Left unconstrained, the column could hold a
-- UUID that doesn't correspond to any bank_accounts row, and deleting a
-- bank account wouldn't clean up references to it from bill_payments.
--
-- Not editing 66_bill_payments.sql directly since it may already have run
-- against the live database — altering an already-applied migration file
-- in place is unsafe. This is a separate, additive migration instead.
--
-- ON DELETE SET NULL matches the existing convention for optional
-- bank-account links elsewhere in this schema (01_initial_schema.sql,
-- 35_budget_month_and_recurring_expenses.sql, 42_transactions_to_account_id.sql):
-- deleting a bank account should orphan the reference, not cascade-delete
-- bill payment history.

ALTER TABLE public.bill_payments DROP CONSTRAINT IF EXISTS bill_payments_bank_account_id_fkey;

ALTER TABLE public.bill_payments
  ADD CONSTRAINT bill_payments_bank_account_id_fkey
  FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

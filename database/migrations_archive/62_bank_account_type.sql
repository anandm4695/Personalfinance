-- Add account type column to bank_accounts
-- Values: Savings, Current, Salary, Joint, FD, Other
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'Savings';

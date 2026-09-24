-- ================================================================
-- Migration 97: Ensure all transactions table columns and constraints exist
-- Guarantees that single transactions, batch CSV imports, and linked 
-- transactions persist reliably to Supabase without dropping fields or 
-- failing on missing column / type errors.
--
-- Safe and idempotent (uses ADD COLUMN IF NOT EXISTS).
-- ================================================================

-- 1. Transactions table columns
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS owner text NOT NULL DEFAULT 'self';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS to_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS narration text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reference_number text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS linked_type text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS linked_id text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS linked_principal_amount numeric;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS statement_balance numeric;

-- 2. Performance indexes for transactions queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions (user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_owner ON public.transactions (user_id, owner);

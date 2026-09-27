-- ================================================================
-- Migration 98: Fix All Missing Sync Columns across Modules
-- Ensures columns across Document Vault, Will & Nominee Tracker,
-- Transactions, Settings, and Net Worth history exist so Supabase
-- sync, single CRUD, CSV batch imports, and backup restore run cleanly.
--
-- Safe and idempotent (uses ADD COLUMN IF NOT EXISTS).
-- ================================================================

-- 1. Documents & Will / Nominee Tracker columns
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS primary_executor text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS alternate_executor text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS reg_number text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS sub_registrar_office text DEFAULT '';

-- 2. User Settings JSONB columns
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS master_data jsonb;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS dismissed_alerts jsonb DEFAULT '{}'::jsonb;

-- 3. Net Worth History breakdown column
ALTER TABLE public.net_worth_history ADD COLUMN IF NOT EXISTS breakdown jsonb;

-- 4. Transactions table sanity checks
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS owner text NOT NULL DEFAULT 'self';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS linked_type text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS linked_id text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS linked_principal_amount numeric;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS statement_balance numeric;

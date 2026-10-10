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

-- 5. Health Insurance columns
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS room_rent_limit text DEFAULT 'No Sub-limit';
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS deductible numeric DEFAULT 0;
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS tpa_name text DEFAULT '';
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS tpa_contact text DEFAULT '';
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS copay_percent numeric DEFAULT 0;
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS restoration_benefit boolean DEFAULT false;
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS maternity_cover boolean DEFAULT false;
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS daycare_cover boolean DEFAULT false;
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS waiting_period_years numeric DEFAULT 0;
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS no_claim_bonus numeric DEFAULT 0;
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS claims jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS insured_members jsonb DEFAULT '[]'::jsonb;

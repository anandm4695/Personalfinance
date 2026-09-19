-- ================================================================
-- Migration 96: Fix Missing Fields & DB Columns Sync
-- Adds all missing schema columns across all entities so that Supabase
-- storage, updates, backup restores, and forms sync completely without
-- dropping fields or triggering PGRST204 errors.
--
-- Safe and idempotent (uses ADD COLUMN IF NOT EXISTS).
-- ================================================================

-- 1. Gold & SGB Holdings
ALTER TABLE public.gold_holdings ADD COLUMN IF NOT EXISTS gross_grams numeric;
ALTER TABLE public.gold_holdings ADD COLUMN IF NOT EXISTS making_charges numeric;
ALTER TABLE public.gold_holdings ADD COLUMN IF NOT EXISTS vault_location text;
ALTER TABLE public.gold_holdings ADD COLUMN IF NOT EXISTS hallmark_uid text;
ALTER TABLE public.gold_holdings ADD COLUMN IF NOT EXISTS certificate_no text;
ALTER TABLE public.gold_holdings ADD COLUMN IF NOT EXISTS demat_account text;

-- 2. Life Events Planner
ALTER TABLE public.life_events ADD COLUMN IF NOT EXISTS inflation_rate numeric DEFAULT 6;
ALTER TABLE public.life_events ADD COLUMN IF NOT EXISTS expected_return numeric DEFAULT 10;

-- 3. Health Insurance
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS deductible numeric DEFAULT 0;
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS tpa_name text DEFAULT '';
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS tpa_contact text DEFAULT '';
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS copay_percent numeric DEFAULT 0;
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS restoration_benefit boolean DEFAULT false;
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS maternity_cover boolean DEFAULT false;
ALTER TABLE public.health_insurance ADD COLUMN IF NOT EXISTS daycare_cover boolean DEFAULT false;

-- 4. Bill Payments & Bill Payment History
ALTER TABLE public.bill_payments ADD COLUMN IF NOT EXISTS frequency text DEFAULT 'monthly';
ALTER TABLE public.bill_payments ADD COLUMN IF NOT EXISTS default_payment_source text DEFAULT '';
ALTER TABLE public.bill_payments ADD COLUMN IF NOT EXISTS portal_url text DEFAULT '';

ALTER TABLE public.bill_payment_history ADD COLUMN IF NOT EXISTS linked_account_id text DEFAULT '';
ALTER TABLE public.bill_payment_history ADD COLUMN IF NOT EXISTS linked_txn_id text DEFAULT '';

-- 5. Vehicles Master
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS cubic_capacity numeric;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS seating_capacity integer;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS fitness_upto date;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS financier text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS insurance_company text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS insurance_policy_number text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS emission_norms text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS rto text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS registered_owner text;

-- 6. Fixed Deposits
ALTER TABLE public.fixed_deposits ADD COLUMN IF NOT EXISTS fd_number text;
ALTER TABLE public.fixed_deposits ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE public.fixed_deposits ADD COLUMN IF NOT EXISTS interest_payout text;
ALTER TABLE public.fixed_deposits ADD COLUMN IF NOT EXISTS deposit_type text;
ALTER TABLE public.fixed_deposits ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT false;
ALTER TABLE public.fixed_deposits ADD COLUMN IF NOT EXISTS tag text;
ALTER TABLE public.fixed_deposits ADD COLUMN IF NOT EXISTS notes text;

-- 7. Recurring Deposits
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS rd_number text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS debit_day integer;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS goal text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.recurring_deposits ADD COLUMN IF NOT EXISTS maturity_date date;

-- 8. Bonds
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS credit_rating text;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS demat_account text;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS tax_category text;
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS notes text;

-- 9. PPF, NPS & EPF
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS rate numeric;
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS linked_account text;
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS extension_years integer DEFAULT 0;
ALTER TABLE public.ppf_nps ADD COLUMN IF NOT EXISTS extension_with_contribution boolean DEFAULT true;

-- 10. Credit Cards
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS interest_rate numeric;

-- 11. Loans (Taken & Given)
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS interest_type text;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS is_interest_free boolean DEFAULT false;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS security text;

-- 12. Informal Loans (Borrowed & Lent)
ALTER TABLE public.informal_loans ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.informal_loans ADD COLUMN IF NOT EXISTS relationship text;
ALTER TABLE public.informal_loans ADD COLUMN IF NOT EXISTS phone text;

-- 13. Rental Properties
ALTER TABLE public.rental_properties ADD COLUMN IF NOT EXISTS default_bank_account_id text;

-- 14. Real Estate Payments
ALTER TABLE public.real_estate_payments ADD COLUMN IF NOT EXISTS linked_txn_id text;
ALTER TABLE public.real_estate_payments ADD COLUMN IF NOT EXISTS payment_source text;
ALTER TABLE public.real_estate_payments ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.real_estate_payments ADD COLUMN IF NOT EXISTS post_to_account boolean DEFAULT false;
ALTER TABLE public.real_estate_payments ADD COLUMN IF NOT EXISTS auto_update_agreement_paid boolean DEFAULT false;

-- 15. Tax Payments & Challans
ALTER TABLE public.tax_payments ADD COLUMN IF NOT EXISTS challan_no text;
ALTER TABLE public.tax_payments ADD COLUMN IF NOT EXISTS challan text;
ALTER TABLE public.tax_payments ADD COLUMN IF NOT EXISTS bsr_code text;
ALTER TABLE public.tax_payments ADD COLUMN IF NOT EXISTS bank text;
ALTER TABLE public.tax_payments ADD COLUMN IF NOT EXISTS tax_type text;
ALTER TABLE public.tax_payments ADD COLUMN IF NOT EXISTS notes text;

-- 16. Insurance Plans (LIC, Term, Investment)
ALTER TABLE public.lic_policies ADD COLUMN IF NOT EXISTS premium_paying_term integer;
ALTER TABLE public.lic_policies ADD COLUMN IF NOT EXISTS nominee_share numeric;

ALTER TABLE public.term_plans ADD COLUMN IF NOT EXISTS policy_number text;
ALTER TABLE public.term_plans ADD COLUMN IF NOT EXISTS nominee_share numeric;

ALTER TABLE public.investment_plans ADD COLUMN IF NOT EXISTS nominee_share numeric;

-- 17. Subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS autopay boolean DEFAULT false;

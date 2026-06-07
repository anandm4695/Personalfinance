-- ============================================================
-- SCHEMA DIAGNOSTIC — Run this in demo Supabase SQL Editor
-- It shows every table and column that SHOULD exist but is MISSING.
-- Zero rows = schema is perfectly in sync. Non-zero = gaps found.
-- ============================================================

-- PART 1: Missing tables
SELECT 'MISSING TABLE' AS issue, expected.table_name
FROM (VALUES
  ('profiles'),
  ('user_settings'),
  ('bank_accounts'),
  ('demat_accounts'),
  ('transactions'),
  ('mutual_funds'),
  ('stocks'),
  ('fixed_deposits'),
  ('recurring_deposits'),
  ('bonds'),
  ('ppf_nps'),
  ('credit_cards'),
  ('prepaid_cards'),
  ('loans'),
  ('goals'),
  ('budgets'),
  ('subscriptions'),
  ('reminders'),
  ('activity_logs'),
  ('lic_policies'),
  ('term_plans'),
  ('informal_loans'),
  ('rental_properties'),
  ('sips'),
  ('stock_sells'),
  ('mf_sells'),
  ('net_worth_history'),
  ('corporate_actions'),
  ('investment_plans'),
  ('tax_payments'),
  ('income_entries'),
  ('recurring_expenses')
) AS expected(table_name)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_name = expected.table_name
)

UNION ALL

-- PART 2: Missing columns (table, column)
SELECT 'MISSING COLUMN: ' || expected.table_name, expected.col
FROM (VALUES
  -- profiles
  ('profiles','name'), ('profiles','fy'), ('profiles','regime'), ('profiles','savings_target'), ('profiles','updated_at'),
  -- user_settings
  ('user_settings','dark_mode'), ('user_settings','accent_key'), ('user_settings','density'),
  ('user_settings','sidebar_nav'), ('user_settings','radius_key'), ('user_settings','font_key'),
  ('user_settings','bg_style'), ('user_settings','anim_speed'), ('user_settings','chart_style'),
  ('user_settings','master_data'), -- migration 05
  ('user_settings','email_enabled'), ('user_settings','email_frequency'), ('user_settings','email_day'),
  ('user_settings','email_hour'), ('user_settings','email_address'), -- migration 29
  ('user_settings','gemini_api_key'), -- migration 30
  ('user_settings','dismissed_alerts'), -- migration 36
  ('user_settings','from_email'), -- migration 40
  -- credit_cards
  ('credit_cards','status'), ('credit_cards','closed_date'), -- migration 02
  ('credit_cards','ledger'), -- migration 03
  ('credit_cards','statement_date'), ('credit_cards','grace_days'), ('credit_cards','reward_type'),
  ('credit_cards','reward_rate'), ('credit_cards','lounge_count'), ('credit_cards','notes'), -- migration 04
  ('credit_cards','shared_group'), ('credit_cards','shared_group_limit'), -- migration 37
  -- prepaid_cards
  ('prepaid_cards','status'), ('prepaid_cards','closed_date'), -- migration 02
  -- ppf_nps
  ('ppf_nps','transactions'), -- migration 06
  ('ppf_nps','epf_type'), ('ppf_nps','employee_contribution'), ('ppf_nps','employer_contribution'), -- migration 07
  ('ppf_nps','epf_balance'), ('ppf_nps','pension_balance'), -- migration 08
  ('ppf_nps','establishments'), -- migration 28
  -- stocks
  ('stocks','day_low'), ('stocks','day_high'), ('stocks','week_52_low'), ('stocks','week_52_high'),
  ('stocks','pe_ratio'), ('stocks','market_cap'), ('stocks','sector'), -- migration 11
  ('stocks','isin'), ('stocks','exchange'), -- migration 13
  -- stock_sells
  ('stock_sells','exchange'), -- migration 13
  -- lic_policies
  ('lic_policies','maturity_date'), -- migration 14
  ('lic_policies','commencement_date'), ('lic_policies','transactions'), -- migration 18
  ('lic_policies','policy_term'), -- migration 19
  -- term_plans
  ('term_plans','expiry_date'), -- migration 14
  ('term_plans','premium_paying_term'), -- migration 20
  ('term_plans','transactions'), -- migration 21
  -- rental_properties
  ('rental_properties','deposit_amount'), ('rental_properties','deposit_date'), -- migration 15
  ('rental_properties','deposit_ledger'), ('rental_properties','rent_ledger'), -- migration 16
  ('rental_properties','deposit_transactions'), -- migration 23
  ('rental_properties','due_day'), -- migration 25
  ('rental_properties','escalation_tiers'), -- migration 39
  ('rental_properties','property_value'), -- migration 45
  -- subscriptions
  ('subscriptions','remark'), -- migration 17
  -- bonds
  ('bonds','order_id'), ('bonds','isin'), ('bonds','security_name'), ('bonds','security_nature'),
  ('bonds','ytm_rate'), ('bonds','buyer_name'), ('bonds','seller_name'), ('bonds','issuer'),
  ('bonds','face_value_per_unit'), ('bonds','number_of_units'), ('bonds','principal_repayment'),
  ('bonds','interest_payment_date'), ('bonds','order_date'), ('bonds','clean_price_per_unit'),
  ('bonds','accrued_interest_per_unit'), ('bonds','total_principal_amount'), ('bonds','total_accrued_interest'),
  ('bonds','total_consideration'), ('bonds','brokerage'), ('bonds','stamp_duty'),
  ('bonds','total_investment_amount'), -- migrations 26, 27
  -- reminders
  ('reminders','owner'), ('reminders','amount'), ('reminders','note'), -- migration 31
  ('reminders','category'), -- migration 38
  -- budgets
  ('budgets','budget_month'), -- migration 35
  -- sips
  ('sips','broker') -- migration 41
) AS expected(table_name, col)
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_name = expected.table_name
)
AND NOT EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name  = expected.table_name
    AND c.column_name = expected.col
)
ORDER BY 1, 2;

# ArthaDrishti by Anand Mohta -- Schema & API Documentation

> Auto-generated from 59 SQL migration files, `appConstants.ts`, and `/api/` serverless functions.

---

## 1. Table Overview

| # | Table Name | Purpose | Created In |
|---|-----------|---------|------------|
| 1 | `profiles` | User profile (name, FY, tax regime, savings target) | 01 |
| 2 | `user_settings` | UI preferences, email settings, Gemini API key, dismissed alerts | 01, 05, 29, 30, 36, 40 |
| 3 | `bank_accounts` | Bank account master records | 01 |
| 4 | `demat_accounts` | Demat/broker account master records | 01 |
| 5 | `transactions` | Bank transactions (credit/debit/transfer) | 01, 41, 42, 43, 46 |
| 6 | `mutual_funds` | Mutual fund holdings | 01, 50, 51 |
| 7 | `stocks` | Stock holdings | 01, 11, 13 |
| 8 | `fixed_deposits` | Fixed deposit records | 01 |
| 9 | `recurring_deposits` | Recurring deposit records | 01 |
| 10 | `bonds` | Bond/debenture holdings with full order slip fields | 01, 26, 27 |
| 11 | `ppf_nps` | PPF, NPS, and EPF accounts (shared table, discriminated by `type`) | 01, 06-10, 28, 54, 55 |
| 12 | `prepaid_cards` | Prepaid/wallet cards with embedded transaction ledger | 01, 02 |
| 13 | `credit_cards` | Credit cards with transaction ledger and shared pool support | 01, 02, 03, 04, 37, 44 |
| 14 | `loans` | Formal loans (taken and given, discriminated by `is_lent`) | 01 |
| 15 | `goals` | Financial goals with progress tracking | 01 |
| 16 | `budgets` | Monthly category budgets | 01, 35 |
| 17 | `subscriptions` | Recurring subscriptions | 01, 17, 47 |
| 18 | `reminders` | User reminders and alerts | 01, 31, 38 |
| 19 | `activity_logs` | CRUD action audit trail | 01, 32 |
| 20 | `lic_policies` | LIC endowment/life insurance policies | 02, 14, 18, 19 |
| 21 | `term_plans` | Term insurance plans | 02, 14, 20, 21 |
| 22 | `informal_loans` | Informal loans (borrowed from / lent to people) | 02 |
| 23 | `rental_properties` | Rental properties (landlord out / tenant in) | 02, 15, 16, 23, 25, 39, 45 |
| 24 | `sips` | SIP (Systematic Investment Plan) tracker | 02, 41 |
| 25 | `stock_sells` | Historical stock sell records | 02, 13 |
| 26 | `mf_sells` | Historical mutual fund sell records | 02 |
| 27 | `net_worth_history` | Monthly net worth snapshots with asset class breakdown | 02, 59 |
| 28 | `corporate_actions` | Stock splits and bonus share events | 12 |
| 29 | `investment_plans` | Endowment/ULIP/guaranteed return plans | 22 |
| 30 | `tax_payments` | Tax payment log (TDS, advance, self-assessment) | 24 |
| 31 | `recurring_expenses` | Fixed repeating costs (maid, utilities, EMI) | 35 |
| 32 | `income_entries` | Explicit income ledger (salary, freelance, dividends) | 34 |
| 33 | `watchlists` | Named stock watchlists | 48, 49 |
| 34 | `watchlist_items` | Individual stocks in a watchlist | 48, 49 |
| 35 | `real_estate_properties` | Real estate property records | 52 |
| 36 | `real_estate_demands` | Builder demand letters / installment calls | 52 |
| 37 | `real_estate_payments` | Payments against a property/demand | 52 |
| 38 | `vehicles` | Vehicle ownership with embedded service history | 53, 56 |
| 39 | `dividends` | Dividend income tracking (stocks and MFs) | 57 |
| 40 | `documents` | Document vault (file metadata with linked records) | 58 |

---

## 2. Schema Details

### 2.1 `profiles`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `user_id` | uuid | PK, FK -> `auth.users` | -- |
| `name` | text | | NULL |
| `fy` | text | | `'2025-26'` |
| `regime` | text | | `'new'` |
| `savings_target` | numeric | | `20` |
| `updated_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Migrations:** 01

---

### 2.2 `user_settings`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `user_id` | uuid | PK, FK -> `auth.users` | -- |
| `dark_mode` | boolean | | `false` |
| `accent_key` | text | | `'blue'` |
| `density` | text | | `'normal'` |
| `sidebar_nav` | boolean | | `true` |
| `radius_key` | text | | `'modern'` |
| `font_key` | text | | `'inter'` |
| `bg_style` | text | | `'plain'` |
| `anim_speed` | text | | `'smooth'` |
| `chart_style` | text | | `'monotone'` |
| `master_data` | jsonb | | NULL |
| `email_enabled` | boolean | | `false` |
| `email_frequency` | text | | `'weekly'` |
| `email_day` | integer | | `1` |
| `email_hour` | integer | | `8` |
| `email_address` | text | | `''` |
| `gemini_api_key` | text | | `''` |
| `dismissed_alerts` | jsonb | | `'{}'::jsonb` |
| `from_email` | text | | NULL |
| `updated_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Migrations:** 01, 05, 29, 30, 36, 40

---

### 2.3 `bank_accounts`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `bank_name` | text | NOT NULL | -- |
| `account_number` | text | | NULL |
| `balance` | numeric | | `0` |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_bank_accounts_user (user_id)` (migration 33)
**Migrations:** 01

---

### 2.4 `demat_accounts`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `broker` | text | NOT NULL | -- |
| `dp_id` | text | | NULL |
| `client_id` | text | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_demat_accounts_user (user_id)` (migration 33)
**Migrations:** 01

---

### 2.5 `transactions`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `date` | date | NOT NULL | -- |
| `account_id` | uuid | FK -> `bank_accounts(id)` ON DELETE SET NULL | NULL |
| `amount` | numeric | NOT NULL | -- |
| `type` | text | CHECK (`'credit'`, `'debit'`) | NULL |
| `category` | text | | NULL |
| `note` | text | | NULL |
| `narration` | text | | NULL |
| `to_account_id` | uuid | FK -> `bank_accounts(id)` ON DELETE SET NULL | NULL |
| `linked_type` | text | | NULL |
| `linked_id` | text | | NULL |
| `reference_number` | text | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_transactions_user_date (user_id, date DESC)`, `idx_transactions_user_type (user_id, type)` (migration 33)
**Migrations:** 01, 41 (narration), 42 (to_account_id), 43 (linked_type/linked_id), 46 (reference_number)

---

### 2.6 `mutual_funds`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `scheme` | text | NOT NULL | -- |
| `type` | text | | NULL |
| `units` | numeric | | `0` |
| `current_nav` | numeric | | `0` |
| `invested` | numeric | | `0` |
| `folio_number` | text | | NULL |
| `buy_nav` | numeric | | `0` |
| `buy_date` | date | | NULL |
| `mf_code` | text | | NULL |
| `mf_type` | text | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_mutual_funds_user (user_id)` (migration 33)
**Migrations:** 01, 50, 51

---

### 2.7 `stocks`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `symbol` | text | NOT NULL | -- |
| `demat_id` | uuid | FK -> `demat_accounts(id)` ON DELETE SET NULL | NULL |
| `qty` | numeric | | `0` |
| `current_price` | numeric | | `0` |
| `avg_price` | numeric | | `0` |
| `exchange` | text | NOT NULL | `'NSE'` |
| `buy_date` | date | | NULL |
| `sector` | text | | NULL |
| `market_cap` | numeric | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_stocks_user (user_id)` (migration 33)
**Migrations:** 01, 11, 13

---

### 2.8 `fixed_deposits`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `bank` | text | | NULL |
| `principal` | numeric | | `0` |
| `rate` | numeric | | `0` |
| `years` | numeric | | NULL |
| `start_date` | date | | NULL |
| `maturity_date` | date | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_fixed_deposits_user (user_id)` (migration 33)
**Migrations:** 01

---

### 2.9 `recurring_deposits`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `bank` | text | | NULL |
| `monthly` | numeric | | `0` |
| `rate` | numeric | | `0` |
| `tenure_months` | numeric | | NULL |
| `start_date` | date | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_recurring_deposits_user (user_id)` (migration 33)
**Migrations:** 01

---

### 2.10 `bonds`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `name` | text | NOT NULL | -- |
| `type` | text | | NULL |
| `face_value` | numeric | | `0` |
| `coupon` | numeric | | `0` |
| `maturity_date` | date | | NULL |
| `issuer` | text | | NULL |
| `order_id` | text | | NULL |
| `isin` | text | | NULL |
| `security_name` | text | | NULL |
| `security_nature` | text | | NULL |
| `ytm_rate` | numeric | | NULL |
| `buyer_name` | text | | NULL |
| `seller_name` | text | | NULL |
| `face_value_per_unit` | numeric | | NULL |
| `number_of_units` | numeric | | NULL |
| `principal_repayment` | text | | NULL |
| `interest_payment_date` | text | | NULL |
| `order_date` | text | | NULL |
| `clean_price_per_unit` | numeric | | NULL |
| `accrued_interest_per_unit` | numeric | | NULL |
| `total_principal_amount` | numeric | | NULL |
| `total_accrued_interest` | numeric | | NULL |
| `total_consideration` | numeric | | NULL |
| `brokerage` | numeric | | `0` |
| `stamp_duty` | numeric | | `0` |
| `total_investment_amount` | numeric | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_bonds_user (user_id)` (migration 33)
**Migrations:** 01, 26, 27

---

### 2.11 `ppf_nps`

Shared table for PPF, NPS, and EPF accounts. The `type` column discriminates between them.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `type` | text | CHECK (`'PPF'`, `'NPS'`, `'EPF'`) | NULL |
| `bank` | text | | NULL |
| `balance` | numeric | | `0` |
| `open_date` | date | | NULL |
| `this_year_contribution` | numeric | | `0` |
| `transactions` | jsonb | | `'[]'::jsonb` |
| `account_number` | text | | NULL |
| `uan` | text | | NULL |
| `establishments` | jsonb | | `'[]'::jsonb` |
| `pran` | text | | NULL |
| `tier` | text | | `'I'` |
| `epf_type` | text | | NULL |
| `employer_contribution` | numeric | | `0` |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_ppf_nps_user (user_id)` (migration 33)
**Migrations:** 01, 06, 07, 08, 09, 10, 28, 54, 55

---

### 2.12 `prepaid_cards`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `card_name` | text | NOT NULL | -- |
| `card_type` | text | | NULL |
| `last4` | text | | NULL |
| `transactions` | jsonb | | `'[]'::jsonb` |
| `status` | text | | `'active'` |
| `closed_date` | date | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_prepaid_cards_user (user_id)` (migration 33)
**Migrations:** 01, 02

---

### 2.13 `credit_cards`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `issuer` | text | NOT NULL | -- |
| `network` | text | | NULL |
| `last4` | text | | NULL |
| `card_limit` | numeric | | `0` |
| `outstanding` | numeric | | `0` |
| `bill_date` | text | | NULL |
| `due_day` | text | | NULL |
| `annual_fee` | numeric | | `0` |
| `helpline` | text | | NULL |
| `transactions` | jsonb | | `'[]'::jsonb` |
| `waiver_info` | text | | NULL |
| `status` | text | | `'active'` |
| `closed_date` | date | | NULL |
| `shared_group` | text | | NULL |
| `shared_group_limit` | numeric | | `0` |
| `fee_month` | integer | | NULL |
| `fee_day` | integer | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_credit_cards_user (user_id)` (migration 33)
**Migrations:** 01, 02, 03, 04, 37, 44

---

### 2.14 `loans`

Shared table for loans taken and loans given. The `is_lent` boolean discriminates.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `lender_borrower` | text | NOT NULL | -- |
| `type` | text | | NULL |
| `is_lent` | boolean | | `false` |
| `principal` | numeric | | `0` |
| `outstanding` | numeric | | `0` |
| `emi` | numeric | | `0` |
| `rate` | numeric | | `0` |
| `months_remaining` | numeric | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_loans_user (user_id)` (migration 33)
**Migrations:** 01

---

### 2.15 `goals`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `name` | text | NOT NULL | -- |
| `category` | text | | NULL |
| `target_amount` | numeric | | `0` |
| `current_amount` | numeric | | `0` |
| `priority` | text | CHECK (`'Low'`, `'Medium'`, `'High'`) | NULL |
| `start_date` | date | | NULL |
| `target_date` | date | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_goals_user (user_id)` (migration 33)
**Migrations:** 01

---

### 2.16 `budgets`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `category` | text | NOT NULL | -- |
| `monthly_limit` | numeric | | `0` |
| `budget_month` | text | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_budgets_user (user_id)` (migration 33)
**Migrations:** 01, 35

---

### 2.17 `subscriptions`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | -- |
| `name` | text | NOT NULL | -- |
| `category` | text | | NULL |
| `amount` | numeric | | `0` |
| `cycle` | text | CHECK (`'monthly'`, `'quarterly'`, `'yearly'`) | NULL |
| `renewal_date` | date | | NULL |
| `paused` | boolean | | `false` |
| `remark` | text | | NULL |
| `website` | text | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_subscriptions_user (user_id)` (migration 33)
**Migrations:** 01, 17, 47

---

### 2.18 `reminders`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `title` | text | NOT NULL | -- |
| `reminder_date` | date | | NULL |
| `priority` | text | | NULL |
| `owner` | text | | `'self'` |
| `amount` | numeric | | NULL |
| `note` | text | | NULL |
| `category` | text | | `'Reminder'` |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_reminders_user_date (user_id, reminder_date)` (migration 33)
**Migrations:** 01, 31, 38

---

### 2.19 `activity_logs`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `action_type` | text | NOT NULL | -- |
| `description` | text | | NULL |
| `metadata` | jsonb | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id` (policy name: `activity_logs_own`)
**Indexes:** `activity_logs_user_time_idx (user_id, created_at DESC)` (migration 32)
**Migrations:** 01 (definition), 32 (recreated with index)

---

### 2.20 `lic_policies`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `plan_name` | text | | NULL |
| `policy_number` | text | | NULL |
| `sum_assured` | numeric | | `0` |
| `annual_premium` | numeric | | `0` |
| `premium_paid` | numeric | | `0` |
| `maturity_date` | date | | NULL |
| `commencement_date` | date | | NULL |
| `transactions` | jsonb | | `'[]'::jsonb` |
| `policy_term` | integer | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_lic_policies_user (user_id)` (migration 33)
**Migrations:** 02, 14, 18, 19

---

### 2.21 `term_plans`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `plan_name` | text | | NULL |
| `insurer` | text | | NULL |
| `cover_amount` | numeric | | `0` |
| `annual_premium` | numeric | | `0` |
| `premium_paid` | numeric | | `0` |
| `term` | numeric | | NULL |
| `start_date` | date | | NULL |
| `maturity_date` | date | | NULL |
| `expiry_date` | date | | NULL |
| `premium_paying_term` | integer | | NULL |
| `transactions` | jsonb | | `'[]'::jsonb` |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_term_plans_user (user_id)` (migration 33)
**Migrations:** 02, 14, 20, 21

---

### 2.22 `informal_loans`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `direction` | text | NOT NULL, CHECK (`'borrowed'`, `'lent'`) | -- |
| `person` | text | NOT NULL | -- |
| `note` | text | | NULL |
| `tranches` | jsonb | | `'[]'::jsonb` |
| `payments` | jsonb | | `'[]'::jsonb` |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_informal_loans_user (user_id)` (migration 33)
**Migrations:** 02

---

### 2.23 `rental_properties`

Shared table for properties rented out (landlord) and rented in (tenant). Discriminated by `property_type` (`'out'` / `'in'`).

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `property_type` | text | NOT NULL, CHECK (`'out'`, `'in'`) | `'out'` |
| `property_name` | text | NOT NULL | -- |
| `address` | text | | NULL |
| `monthly_rent` | numeric | | `0` |
| `security_deposit` | numeric | | `0` |
| `tenant_name` | text | | NULL |
| `landlord_name` | text | | NULL |
| `lease_start` | date | | NULL |
| `lease_end` | date | | NULL |
| `is_active` | boolean | | `true` |
| `receipts` | jsonb | | `'[]'::jsonb` |
| `payments` | jsonb | | `'[]'::jsonb` |
| `deposit_deductions` | jsonb | | `'[]'::jsonb` |
| `deposit_returned` | numeric | | `0` |
| `tenants` | jsonb | | `'[]'::jsonb` |
| `tenant_phone` | text | | NULL |
| `agreement_start` | date | | NULL |
| `agreement_end` | date | | NULL |
| `property_type_detail` | text | | NULL |
| `municipal_tax` | numeric | | `0` |
| `landlords` | jsonb | | `'[]'::jsonb` |
| `landlord_phone` | text | | NULL |
| `landlord_pan` | text | | NULL |
| `deposit_paid_date` | date | | NULL |
| `deposit_received_date` | date | | NULL |
| `deposit_transactions` | jsonb | | `'[]'::jsonb` |
| `due_day` | integer | | `5` |
| `escalation_tiers` | jsonb | | `'[]'::jsonb` |
| `property_value` | numeric | | `0` |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_rental_properties_user (user_id)` (migration 33)
**Migrations:** 02, 15, 16, 23, 25, 39, 45

---

### 2.24 `sips`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `scheme` | text | NOT NULL | -- |
| `fund_type` | text | | NULL |
| `amount` | numeric | | `0` |
| `frequency` | text | | `'monthly'` |
| `start_date` | date | | NULL |
| `total_installments` | numeric | | NULL |
| `broker` | text | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_sips_user (user_id)` (migration 33)
**Migrations:** 02, 41 (broker)

---

### 2.25 `stock_sells`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | text | PK (app-generated `"ss-<timestamp>"`) | -- |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `symbol` | text | NOT NULL | -- |
| `exchange` | text | | NULL |
| `qty` | numeric | | `0` |
| `buy_price` | numeric | | `0` |
| `buy_date` | date | | NULL |
| `sell_price` | numeric | | `0` |
| `sell_date` | date | | NULL |
| `broker` | text | | NULL |
| `demat_id` | text | | NULL |
| `profit` | numeric | | `0` |
| `sector` | text | | NULL |
| `market_cap` | numeric | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_stock_sells_user (user_id)` (migration 33)
**Migrations:** 02, 13

---

### 2.26 `mf_sells`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | text | PK (app-generated) | -- |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `scheme` | text | | NULL |
| `units` | numeric | | `0` |
| `buy_nav` | numeric | | `0` |
| `sell_nav` | numeric | | `0` |
| `buy_date` | date | | NULL |
| `sell_date` | date | | NULL |
| `profit` | numeric | | `0` |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_mf_sells_user (user_id)` (migration 33)
**Migrations:** 02

---

### 2.27 `net_worth_history`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `user_id` | uuid | PK (composite), FK -> `auth.users` | -- |
| `month` | text | PK (composite), format `YYYY-MM` | -- |
| `net_worth` | numeric | | `0` |
| `cash` | numeric | | `0` |
| `equity` | numeric | | `0` |
| `debt` | numeric | | `0` |
| `real_estate` | numeric | | `0` |
| `vehicles` | numeric | | `0` |
| `liabilities` | numeric | | `0` |
| `breakdown` | jsonb | | NULL |
| `updated_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_net_worth_history_user_month (user_id, month DESC)` (migration 33)
**Migrations:** 02, 59

---

### 2.28 `corporate_actions`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `symbol` | text | NOT NULL | -- |
| `exchange` | text | NOT NULL | `'NSE'` |
| `action_type` | text | NOT NULL, CHECK (`'split'`, `'bonus'`) | -- |
| `ratio_n` | numeric | NOT NULL | -- |
| `ratio_m` | numeric | NOT NULL | -- |
| `action_date` | date | | NULL |
| `old_qty` | numeric | | NULL |
| `new_qty` | numeric | | NULL |
| `old_avg_price` | numeric | | NULL |
| `new_avg_price` | numeric | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_corporate_actions_user (user_id)`, `idx_corporate_actions_symbol (symbol, exchange)` (migration 33)
**Migrations:** 12

---

### 2.29 `investment_plans`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `insurer` | text | NOT NULL | -- |
| `plan_name` | text | NOT NULL | -- |
| `policy_number` | text | | NULL |
| `sum_assured` | numeric | | `0` |
| `annual_premium` | numeric | | `0` |
| `premium_paid` | numeric | | `0` |
| `policy_term` | integer | | `0` |
| `premium_paying_term` | integer | | `0` |
| `commencement_date` | date | | NULL |
| `maturity_date` | date | | NULL |
| `expected_maturity_amount` | numeric | | `0` |
| `transactions` | jsonb | | `'[]'::jsonb` |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id` (policy: `Users can manage their own investment plans`)
**Indexes:** `idx_investment_plans_user (user_id)` (migration 33)
**Migrations:** 22

---

### 2.30 `tax_payments`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `date` | date | | NULL |
| `type` | text | | NULL |
| `amount` | numeric | | `0` |
| `note` | text | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_tax_payments_user (user_id)` (migration 33)
**Migrations:** 24

---

### 2.31 `recurring_expenses`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `name` | text | NOT NULL | -- |
| `category` | text | NOT NULL | -- |
| `amount` | numeric | NOT NULL | `0` |
| `frequency` | text | NOT NULL, CHECK (`'monthly'`, `'quarterly'`, `'yearly'`, `'weekly'`) | -- |
| `due_day` | integer | NOT NULL, CHECK (1-31) | -- |
| `start_date` | date | NOT NULL | -- |
| `end_date` | date | | NULL |
| `account_id` | uuid | FK -> `bank_accounts(id)` ON DELETE SET NULL | NULL |
| `is_active` | boolean | | `true` |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id` (policy: `recurring_expenses_own`)
**Indexes:** `recurring_expenses_user_idx (user_id)` (migration 35)
**Migrations:** 35

---

### 2.32 `income_entries`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `date` | date | NOT NULL | -- |
| `amount` | numeric | NOT NULL | `0` |
| `source` | text | | NULL |
| `category` | text | | NULL |
| `note` | text | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id` (policy: `income_entries_own`)
**Indexes:** `income_entries_user_date_idx (user_id, date DESC)` (migration 34)
**Migrations:** 34

---

### 2.33 `watchlists`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users(id)` ON DELETE CASCADE | -- |
| `owner` | text | NOT NULL | `'self'` |
| `name` | text | NOT NULL | -- |
| `description` | text | | NULL |
| `color` | text | | `'#6366f1'` |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Migrations:** 48, 49

---

### 2.34 `watchlist_items`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users(id)` ON DELETE CASCADE | -- |
| `owner` | text | NOT NULL | `'self'` |
| `watchlist_id` | uuid | NOT NULL, FK -> `watchlists(id)` ON DELETE CASCADE | -- |
| `symbol` | text | NOT NULL | -- |
| `exchange` | text | NOT NULL | `'NSE'` |
| `target_price` | numeric(14,2) | | NULL |
| `notes` | text | | NULL |
| `added_on` | date | | `CURRENT_DATE` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_watchlist_items_watchlist_id (watchlist_id)`, `idx_watchlist_items_user_id (user_id)` (migrations 48/49)
**Migrations:** 48, 49

---

### 2.35 `real_estate_properties`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users(id)` ON DELETE CASCADE | -- |
| `owner` | text | NOT NULL | `'self'` |
| `name` | text | NOT NULL | -- |
| `type` | text | NOT NULL | `'residential'` |
| `status` | text | NOT NULL | `'owned'` |
| `location` | text | | NULL |
| `developer_name` | text | | NULL |
| `seller_name` | text | | NULL |
| `rera_number` | text | | NULL |
| `area_sqft` | numeric(14,2) | | NULL |
| `purchase_date` | date | | NULL |
| `registration_date` | date | | NULL |
| `possession_date` | date | | NULL |
| `agreement_value` | numeric(14,2) | | NULL |
| `stamp_duty` | numeric(14,2) | | NULL |
| `tds_value` | numeric(14,2) | | NULL |
| `market_value` | numeric(14,2) | | NULL |
| `sale_date` | date | | NULL |
| `sale_price` | numeric(14,2) | | NULL |
| `sale_stamp_duty` | numeric(14,2) | | NULL |
| `sale_tds` | numeric(14,2) | | NULL |
| `notes` | text | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_re_properties_user_id (user_id)` (migration 52)
**Migrations:** 52

---

### 2.36 `real_estate_demands`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users(id)` ON DELETE CASCADE | -- |
| `owner` | text | NOT NULL | `'self'` |
| `property_id` | uuid | NOT NULL, FK -> `real_estate_properties(id)` ON DELETE CASCADE | -- |
| `demand_date` | date | | NULL |
| `due_date` | date | | NULL |
| `milestone` | text | | NULL |
| `amount` | numeric(14,2) | | NULL |
| `gst_amount` | numeric(14,2) | | NULL |
| `total_amount` | numeric(14,2) | | NULL |
| `status` | text | NOT NULL | `'pending'` |
| `notes` | text | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_re_demands_user_id (user_id)`, `idx_re_demands_property_id (property_id)` (migration 52)
**Migrations:** 52

---

### 2.37 `real_estate_payments`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users(id)` ON DELETE CASCADE | -- |
| `owner` | text | NOT NULL | `'self'` |
| `property_id` | uuid | NOT NULL, FK -> `real_estate_properties(id)` ON DELETE CASCADE | -- |
| `demand_id` | uuid | FK -> `real_estate_demands(id)` ON DELETE SET NULL | NULL |
| `payment_date` | date | | NULL |
| `amount` | numeric(14,2) | | NULL |
| `payment_mode` | text | | `'NEFT'` |
| `reference_number` | text | | NULL |
| `note` | text | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_re_payments_user_id (user_id)`, `idx_re_payments_property_id (property_id)`, `idx_re_payments_demand_id (demand_id)` (migration 52)
**Migrations:** 52

---

### 2.38 `vehicles`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users(id)` ON DELETE CASCADE | -- |
| `owner` | text | NOT NULL | `'self'` |
| `vehicle_type` | text | NOT NULL | `'two-wheeler'` |
| `make` | text | NOT NULL | -- |
| `model` | text | NOT NULL | -- |
| `year` | integer | | NULL |
| `color` | text | | NULL |
| `fuel_type` | text | | `'petrol'` |
| `registration_number` | text | | NULL |
| `chassis_number` | text | | NULL |
| `engine_number` | text | | NULL |
| `purchase_date` | date | | NULL |
| `purchase_price` | numeric(14,2) | | NULL |
| `current_value` | numeric(14,2) | | NULL |
| `insurance_expiry` | date | | NULL |
| `puc_expiry` | date | | NULL |
| `service_history` | jsonb | NOT NULL | `'[]'::jsonb` |
| `notes` | text | | NULL |
| `rc_document_url` | text | | NULL |
| `insurance_policy_url` | text | | NULL |
| `puc_certificate_url` | text | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id`
**Indexes:** `idx_vehicles_user_id (user_id)` (migration 53)
**Migrations:** 53, 56

---

### 2.39 `dividends`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users(id)` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `symbol` | text | | NULL |
| `fund_name` | text | | NULL |
| `type` | text | NOT NULL | `'stock'` |
| `amount` | numeric | NOT NULL | `0` |
| `tds` | numeric | | `0` |
| `record_date` | date | | NULL |
| `payment_date` | date | | NULL |
| `fy` | text | | NULL |
| `note` | text | | NULL |
| `created_at` | timestamptz | | `now()` |

**RLS:** `auth.uid() = user_id` (policy: `Users access own dividends`)
**Migrations:** 57

---

### 2.40 `documents`

Shared by two features: Document Vault (`type = ''`, DocumentVaultTab.tsx) and
Will & Nominee Tracker's Will/Key-Contact records (`type = 'will' | 'key_contact'`,
NomineeTrackerTab.tsx). Document Vault filters the table down to blank-`type`
rows before rendering.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK -> `auth.users(id)` | -- |
| `owner` | text | NOT NULL | `'self'` |
| `name` | text | NOT NULL | -- |
| `file_path` | text | nullable — object key in the `documents` Storage bucket | NULL |
| `file_size` | integer | | NULL |
| `mime_type` | text | | NULL |
| `linked_type` | text | unused by Document Vault (see `linked_asset_type` below) | NULL |
| `linked_id` | uuid | unused by Document Vault (see `linked_asset` below) | NULL |
| `tags` | text[] | | NULL |
| `type` | text | `''` \| `'will'` \| `'key_contact'` | `''` |
| `date` | date | will: date the will was made/updated | NULL |
| `location` | text | will: physical location | `''` |
| `witnesses` | text | will: witness names | `''` |
| `lawyer_name` | text | | `''` |
| `lawyer_contact` | text | | `''` |
| `notes` | text | | `''` |
| `role` | text | key contact: Lawyer/CA/Financial Advisor/... | `''` |
| `phone` | text | key contact | `''` |
| `email` | text | key contact | `''` |
| `uploaded_at` | timestamptz | | `now()` |
| `category` | text | Document Vault category (Identity/Financial/...) | `''` |
| `subcategory` | text | | `''` |
| `document_number` | text | | `''` |
| `issuer` | text | | `''` |
| `issue_date` | text | text (not date) — form sends `''` when blank | `''` |
| `expiry_date` | text | text (not date) — form sends `''` when blank | `''` |
| `url` | text | external link, alternative to an uploaded file | `''` |
| `linked_asset_type` | text | e.g. `'bankAccount'`, `'property'` | `''` |
| `linked_asset` | text | id of the linked asset row | `''` |

**RLS:** `auth.uid() = user_id` (policy: `Users can access own data`)
**Migrations:** 58, 90, 91

**Storage:** private bucket `documents`, objects keyed `<user_id>/<doc_id>/<filename>`,
RLS-scoped to the top-level folder matching `auth.uid()`. Files are opened via
short-lived `createSignedUrl()` calls, never a permanent public URL (migration 91).

---

## 3. State Key Mapping

The frontend uses camelCase state keys. `TABLE_MAP` in `src/utils/appConstants.ts` maps each key to its Supabase table name.

| Frontend State Key | Database Table | Notes |
|-------------------|---------------|-------|
| `bankAccounts` | `bank_accounts` | |
| `transactions` | `transactions` | |
| `mutualFunds` | `mutual_funds` | |
| `stocks` | `stocks` | |
| `demat` | `demat_accounts` | |
| `fixedDeposits` | `fixed_deposits` | |
| `recurringDeposits` | `recurring_deposits` | |
| `bonds` | `bonds` | |
| `ppf` | `ppf_nps` | Filtered by `type = 'PPF'` |
| `nps` | `ppf_nps` | Filtered by `type = 'NPS'` |
| `epf` | `ppf_nps` | Filtered by `type = 'EPF'` |
| `creditCards` | `credit_cards` | |
| `prepaidCards` | `prepaid_cards` | |
| `loansTaken` | `loans` | Filtered by `is_lent = false` |
| `loansGiven` | `loans` | Filtered by `is_lent = true` |
| `goals` | `goals` | |
| `budgets` | `budgets` | |
| `subscriptions` | `subscriptions` | |
| `reminders` | `reminders` | |
| `recurringExpenses` | `recurring_expenses` | |
| `lic` | `lic_policies` | |
| `termPlans` | `term_plans` | |
| `investmentPlans` | `investment_plans` | |
| `informalBorrowed` | `informal_loans` | Filtered by `direction = 'borrowed'` |
| `informalLent` | `informal_loans` | Filtered by `direction = 'lent'` |
| `rentalProperties` | `rental_properties` | Filtered by `property_type = 'out'` |
| `rentedProperties` | `rental_properties` | Filtered by `property_type = 'in'` |
| `sips` | `sips` | |
| `stockSells` | `stock_sells` | |
| `mfSells` | `mf_sells` | |
| `corporateActions` | `corporate_actions` | |
| `taxPayments` | `tax_payments` | |
| `income` | `income_entries` | |
| `wishlists` | `watchlists` | Renamed from wishlists in migration 49 |
| `wishlistItems` | `watchlist_items` | Renamed from wishlist_items in migration 49 |
| `realEstateProperties` | `real_estate_properties` | |
| `realEstateDemands` | `real_estate_demands` | |
| `realEstatePayments` | `real_estate_payments` | |
| `vehicles` | `vehicles` | |
| `dividends` | `dividends` | |
| `documents` | `documents` | |

**Shared / discriminated tables:**
- `ppf_nps` holds PPF, NPS, and EPF records (discriminated by the `type` column)
- `loans` holds both loans taken and loans given (discriminated by the `is_lent` boolean)
- `informal_loans` holds both borrowed and lent records (discriminated by the `direction` column)
- `rental_properties` holds both landlord and tenant records (discriminated by the `property_type` column)

---

## 4. API Endpoints

All API routes are Vercel serverless functions located in `/api/`. They are accessible at `https://<domain>/api/<name>`.

### 4.1 `GET /api/stock-price`

Fetches real-time stock quotes from Yahoo Finance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbols` | query string | Yes | Comma-separated list of stock symbols (max 30) |

**Response:** JSON object keyed by symbol, each containing:
- `price`, `change`, `changePercent`
- `dayHigh`, `dayLow`, `weekHigh52`, `weekLow52`, `prevClose`, `volume`
- `sector`, `marketCap`

**Cache:** `s-maxage=30, stale-while-revalidate=60`
**Library:** `yahoo-finance2`

---

### 4.2 `GET /api/stock-chart`

Returns intraday 5-minute chart data for the last trading session.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | query string | Yes | Single stock symbol |

**Response:** `{ date: string, points: [{ t: "HH:MM", p: number }] }`
**Cache:** `s-maxage=60, stale-while-revalidate=120`
**Library:** `yahoo-finance2`

---

### 4.3 `GET /api/mf-nav`

Fetches mutual fund NAV, 30-day chart, and 52-week high/low from mfapi.in.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | query string | Yes | Numeric AMFI scheme code |

**Response:**
- `nav`, `date`, `prevNav`, `navChange`, `navChangePct`
- `high52`, `low52`
- `chart`: array of `{ t: date_string, p: nav_value }`
- `schemeName`

**Cache:** `s-maxage=3600, stale-while-revalidate=7200`
**External API:** `https://api.mfapi.in/mf/<code>`

---

### 4.4 `GET /api/stock-logo`

Resolves stock logos using a multi-source priority chain.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | query string | Yes | Stock symbol (e.g., `RELIANCE.NS`) |

**Resolution priority:**
1. Local curated `STOCK_DOMAINS` mapping (450+ NSE/BSE stocks) via Hunter.io logos + Google Favicon
2. Twelve Data API (if `TWELVE_DATA_KEY` env var set)
3. EODHD public CDN (direct URL)
4. Yahoo Finance website domain via Google Favicon

**Response:** `{ logoUrl: string|null, faviconUrl: string|null }`
**Cache:** `s-maxage=86400, stale-while-revalidate=604800`

---

### 4.5 `GET /api/cron-update-prices`

Automated batch update of stock prices and MF NAVs in Supabase. Designed for Vercel Cron.

**Authentication:** Vercel CRON header (`x-vercel-cron: true`) or `Authorization: Bearer <CRON_SECRET>` or `?secret=<CRON_SECRET>` query param.

**Process:**
1. Fetches all unique stock symbols from `stocks` table
2. Fetches all unique MF codes from `mutual_funds` table
3. Updates `stocks.current_price` via Yahoo Finance
4. Updates `mutual_funds.current_nav` via mfapi.in

**Environment variables required:**
- `VITE_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (for auth)

**Response:** `{ status, timestamp, stocks: { total_unique, updated, failed }, mutual_funds: { total_unique, updated, failed } }`

---

### 4.6 `GET /api/rc-lookup`

Vehicle Registration Certificate (RC) lookup via multiple providers with offline fallback.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reg` | query string | Yes | Vehicle registration number |

**Provider priority:**
1. Surepass (`SUREPASS_TOKEN` env var)
2. Attestr (`ATTESTR_TOKEN` env var)
3. RapidAPI (`RAPIDAPI_KEY` env var)
4. Deterministic mock data (offline fallback)

**Response:** `{ registrationNumber, make, model, year, color, fuelType, vehicleType, chassisNumber, engineNumber, insuranceExpiry, pucExpiry, ownerName, rto, state, source }`

---

### 4.7 `GET|POST /api/send-summary`

Email summary sender (daily/weekly/monthly). Generates a rich HTML email with net worth, cash flow, portfolio, budgets, goals, alerts, and dues.

**Modes:**
- `GET ?action=healthcheck` -- Returns config status (Resend key, Supabase key, from email)
- `GET ?action=cron` -- Scheduled cron execution (iterates all users with `email_enabled = true`)
- `POST` -- Manual "Send Test" from Settings UI

**POST body:**
```json
{
  "state": { ... },
  "emailTo": "user@example.com",
  "frequency": "daily|weekly|monthly",
  "recipientName": "Anand",
  "fromEmail": "sender@domain.com"
}
```

**Environment variables required:**
- `Resend_Email_API` or `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (optional, defaults to `onboarding@resend.dev`)
- `VITE_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_EMAIL_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (for cron auth)

**Library:** `resend` (email), `@supabase/supabase-js` (data fetch)

---

## 5. Migration Sequence

| # | File | Description |
|---|------|-------------|
| 01 | `01_initial_schema.sql` | Creates all core tables: profiles, user_settings, bank_accounts, demat_accounts, transactions, mutual_funds, stocks, fixed_deposits, recurring_deposits, bonds, ppf_nps, prepaid_cards, credit_cards, loans, goals, budgets, subscriptions, reminders, activity_logs. Enables RLS on all tables with `auth.uid() = user_id` policy. |
| 02 | `02_add_missing_tables.sql` | Adds `status`/`closed_date` to credit_cards and prepaid_cards. Creates lic_policies, term_plans, informal_loans, rental_properties, sips, stock_sells, mf_sells, net_worth_history. Enables RLS on all new tables. |
| 03 | `03_credit_card_full_sync.sql` | Adds `transactions` (JSONB), `waiver_info`, `status`, `closed_date` to credit_cards. |
| 04 | `04_fix_credit_cards_missing_cols.sql` | Ensures `annual_fee`, `waiver_info`, `helpline`, `owner`, `status`, `closed_date`, `transactions` all exist on credit_cards (idempotent catch-all). |
| 05 | `05_add_master_data.sql` | Adds `master_data` (JSONB) column to user_settings. |
| 06 | `06_ppf_transactions.sql` | Adds `transactions` (JSONB) and `account_number` to ppf_nps. |
| 07 | `07_epf_support.sql` | Adds `uan` to ppf_nps. Updates type constraint to include `'EPF'`. |
| 08 | `08_ppf_epf_fix.sql` | Consolidated re-run of migrations 06+07. Adds `transactions`, `account_number` columns and EPF type constraint. Notes UAN is now stored in `account_number`. |
| 09 | `09_epf_constraint_fix.sql` | Drops ALL check constraints on ppf_nps and re-adds the correct one allowing PPF/NPS/EPF. |
| 10 | `10_epf_final_fix.sql` | Definitive EPF fix: re-adds columns and constraint. Includes verification query. |
| 11 | `11_add_stocks_missing_columns.sql` | Adds `exchange` (NOT NULL, default `'NSE'`) and `buy_date` to stocks. |
| 12 | `12_corporate_actions.sql` | Creates corporate_actions table for stock split/bonus history. Enables RLS. |
| 13 | `13_add_stock_metadata.sql` | Adds `sector` and `market_cap` to stocks and stock_sells tables. |
| 14 | `14_insurance_updates.sql` | Adds `maturity_date` to lic_policies, `expiry_date` to term_plans. |
| 15 | `15_rental_schema_update.sql` | Adds multi-tenant/multi-landlord fields to rental_properties: `tenants`, `tenant_phone`, `agreement_start`, `agreement_end`, `property_type_detail`, `municipal_tax`, `landlords`, `landlord_phone`, `landlord_pan`. Backfills agreement dates from lease dates. |
| 16 | `16_rental_deposit_ledgers.sql` | Adds `payments`, `receipts`, `deposit_deductions`, `deposit_returned`, `deposit_paid_date`, `deposit_received_date` to rental_properties (some may already exist from migration 02). |
| 17 | `17_add_subscriptions_remark.sql` | Adds `remark` column to subscriptions. |
| 18 | `18_lic_commencement_transactions.sql` | Adds `commencement_date` and `transactions` (JSONB) to lic_policies. |
| 19 | `19_lic_policy_term.sql` | Adds `policy_term` (integer) to lic_policies. |
| 20 | `20_term_plan_details.sql` | Adds `premium_paying_term` (integer) to term_plans. |
| 21 | `21_term_plan_transactions.sql` | Adds `transactions` (JSONB) to term_plans. |
| 22 | `22_investment_plans.sql` | Creates investment_plans table for endowment/ULIP/guaranteed plans. Enables RLS. |
| 23 | `23_rental_deposit_transactions.sql` | Adds `deposit_transactions` (JSONB) to rental_properties for partial deposit tracking. |
| 24 | `24_tax_payments.sql` | Creates tax_payments table for TDS/advance/self-assessment/professional tax. Enables RLS. |
| 25 | `25_rental_due_day.sql` | Adds `due_day` (integer, default 5) to rental_properties. |
| 26 | `26_bonds_expanded_fields.sql` | Adds full order slip fields to bonds: `order_id`, `isin`, `security_name`, `security_nature`, `ytm_rate`, `buyer_name`, `seller_name`, `face_value_per_unit`, `number_of_units`, `principal_repayment`, `interest_payment_date`, `order_date`, `clean_price_per_unit`, `accrued_interest_per_unit`, `total_principal_amount`, `total_accrued_interest`, `total_consideration`, `brokerage`, `stamp_duty`, `total_investment_amount`. |
| 27 | `27_bonds_add_missing_columns.sql` | Re-adds all bond columns from migration 26 plus `issuer` (idempotent catch-all). |
| 28 | `28_epf_establishments.sql` | Adds `establishments` (JSONB) to ppf_nps for EPF service history. |
| 29 | `29_email_settings.sql` | Adds email notification columns to user_settings: `email_enabled`, `email_frequency`, `email_day`, `email_hour`, `email_address`. |
| 30 | `30_gemini_api_key.sql` | Adds `gemini_api_key` to user_settings for AI Advisor persistence. |
| 31 | `31_reminders_missing_columns.sql` | Adds `owner`, `amount`, `note` to reminders. |
| 32 | `32_activity_logs.sql` | Recreates activity_logs table with proper RLS policy (`activity_logs_own`) and index on `(user_id, created_at DESC)`. |
| 33 | `33_performance_indexes.sql` | Creates B-tree indexes on all tables for `user_id` and common date/sort columns. Also indexes net_worth_history and corporate_actions. |
| 34 | `34_income_entries.sql` | Creates income_entries table for salary/freelance/dividend income tracking. Enables RLS with `income_entries_own` policy. |
| 35 | `35_budget_month_and_recurring_expenses.sql` | Adds `budget_month` to budgets. Creates recurring_expenses table with frequency, due_day, date range, and bank account FK. |
| 36 | `36_add_dismissed_alerts.sql` | Adds `dismissed_alerts` (JSONB) to user_settings. |
| 37 | `37_credit_card_shared_pool.sql` | Adds `shared_group` and `shared_group_limit` to credit_cards for shared credit pool support. |
| 38 | `38_reminders_category.sql` | Adds `category` (default `'Reminder'`) to reminders. |
| 39 | `39_rental_escalation_tiers.sql` | Adds `escalation_tiers` (JSONB) to rental_properties for per-year rent escalation schedule. |
| 40 | `40_email_from_setting.sql` | Adds `from_email` to user_settings for per-user sender email in cron emails. |
| 41a | `41_sips_broker.sql` | Adds `broker` to sips table. |
| 41b | `41_transactions_narration.sql` | Adds `narration` to transactions. |
| 42 | `42_transactions_to_account_id.sql` | Adds `to_account_id` (FK -> bank_accounts) to transactions for transfer destination. |
| 43 | `43_transactions_linked_record.sql` | Adds `linked_type` and `linked_id` to transactions for module linking. |
| 44 | `44_credit_card_fee_date.sql` | Adds `fee_month` and `fee_day` to credit_cards for annual fee deduction date tracking. |
| 45 | `45_rental_property_value.sql` | Adds `property_value` (numeric) to rental_properties. |
| 46 | `46_transactions_reference_number.sql` | Adds `reference_number` to transactions for cheque/reference numbers. |
| 47 | `47_subscriptions_website.sql` | Adds `website` to subscriptions for custom logo domain resolution. |
| 48 | `48_wishlists.sql` | Creates watchlists and watchlist_items tables with RLS and indexes. |
| 49 | `49_rename_wishlists_to_watchlists.sql` | Handles rename from wishlists to watchlists (handles all possible states). Recreates indexes. |
| 50 | `50_mf_folio_buynav_code.sql` | Adds `folio_number`, `buy_nav`, `buy_date`, `mf_code` to mutual_funds. |
| 51 | `51_mf_type_field.sql` | Adds `mf_type` to mutual_funds (Direct/Regular x Growth/IDCW). Re-adds migration 50 columns for safety. |
| 52 | `52_real_estate.sql` | Creates real_estate_properties, real_estate_demands, and real_estate_payments tables with FK relationships, RLS, and indexes. |
| 53 | `53_vehicles.sql` | Creates vehicles table with embedded JSONB service_history. Enables RLS. |
| 54 | `54_nps_pran_tier.sql` | Adds `pran` and `tier` (default `'I'`) to ppf_nps for NPS accounts. |
| 55 | `55_nps_investment_columns.sql` | Adds `account_number`, `epf_type`, `employer_contribution`, `establishments` to ppf_nps. Re-adds type constraint for safety. |
| 56 | `56_vehicles_doc_urls.sql` | Adds `rc_document_url`, `insurance_policy_url`, `puc_certificate_url` to vehicles. |
| 57 | `57_dividends.sql` | Creates dividends table for stock and MF dividend tracking. Enables RLS. |
| 58 | `58_documents.sql` | Creates documents table for file vault (metadata with linked records and tags). Enables RLS. |
| 59 | `59_nw_breakdown.sql` | Adds asset class breakdown columns to net_worth_history: `cash`, `equity`, `debt`, `real_estate`, `vehicles`, `liabilities`, `breakdown` (JSONB). |

---

## Appendix: Row Level Security (RLS) Summary

All tables have RLS enabled. Every table uses a policy that restricts access to rows where `user_id = auth.uid()`. This ensures each user can only read and write their own data.

**Policy names vary by table:**
- Most tables: `"Users can access own data"`
- `profiles`: `"Users can access own profile"`
- `user_settings`: `"Users can access own settings"`
- `activity_logs`: `"activity_logs_own"`
- `income_entries`: `"income_entries_own"`
- `recurring_expenses`: `"recurring_expenses_own"`
- `investment_plans`: `"Users can manage their own investment plans"`
- `dividends`: `"Users access own dividends"`
- `documents`: `"Users access own documents"`

## Appendix: Foreign Key Relationships

```
auth.users
  |-- profiles (user_id)
  |-- user_settings (user_id)
  |-- bank_accounts (user_id)
  |   |-- transactions (account_id)
  |   |-- transactions (to_account_id)
  |   |-- recurring_expenses (account_id)
  |-- demat_accounts (user_id)
  |   |-- stocks (demat_id)
  |-- transactions (user_id)
  |-- mutual_funds (user_id)
  |-- stocks (user_id)
  |-- fixed_deposits (user_id)
  |-- recurring_deposits (user_id)
  |-- bonds (user_id)
  |-- ppf_nps (user_id)
  |-- prepaid_cards (user_id)
  |-- credit_cards (user_id)
  |-- loans (user_id)
  |-- goals (user_id)
  |-- budgets (user_id)
  |-- subscriptions (user_id)
  |-- reminders (user_id)
  |-- activity_logs (user_id)
  |-- lic_policies (user_id)
  |-- term_plans (user_id)
  |-- informal_loans (user_id)
  |-- rental_properties (user_id)
  |-- sips (user_id)
  |-- stock_sells (user_id)
  |-- mf_sells (user_id)
  |-- net_worth_history (user_id)
  |-- corporate_actions (user_id)
  |-- investment_plans (user_id)
  |-- tax_payments (user_id)
  |-- recurring_expenses (user_id)
  |-- income_entries (user_id)
  |-- watchlists (user_id)
  |   |-- watchlist_items (watchlist_id)
  |-- watchlist_items (user_id)
  |-- real_estate_properties (user_id)
  |   |-- real_estate_demands (property_id)
  |   |-- real_estate_payments (property_id)
  |-- real_estate_demands (user_id)
  |   |-- real_estate_payments (demand_id)
  |-- real_estate_payments (user_id)
  |-- vehicles (user_id)
  |-- dividends (user_id)
  |-- documents (user_id)
```

-- Migration 33: Performance indexes
-- All tables are queried almost exclusively by user_id + a date/created_at column.
-- Without indexes, Supabase does a full sequential scan on every fetch — fine for
-- a handful of rows but noticeably slow as data grows (1k+ transactions).
-- Run this once in Supabase SQL Editor → https://app.supabase.com → SQL Editor
-- Each CREATE INDEX uses IF NOT EXISTS so it is safe to re-run.

-- Core financial tables: filter by user + sort/range by date
create index if not exists idx_transactions_user_date        on public.transactions        (user_id, date desc);
create index if not exists idx_transactions_user_type        on public.transactions        (user_id, type);

create index if not exists idx_bank_accounts_user            on public.bank_accounts       (user_id);
create index if not exists idx_mutual_funds_user             on public.mutual_funds        (user_id);
create index if not exists idx_stocks_user                   on public.stocks              (user_id);
create index if not exists idx_fixed_deposits_user           on public.fixed_deposits      (user_id);
create index if not exists idx_recurring_deposits_user       on public.recurring_deposits  (user_id);
create index if not exists idx_bonds_user                    on public.bonds               (user_id);
create index if not exists idx_ppf_nps_user                  on public.ppf_nps             (user_id);
create index if not exists idx_credit_cards_user             on public.credit_cards        (user_id);
create index if not exists idx_prepaid_cards_user            on public.prepaid_cards       (user_id);
create index if not exists idx_loans_user                    on public.loans               (user_id);
create index if not exists idx_goals_user                    on public.goals               (user_id);
create index if not exists idx_budgets_user                  on public.budgets             (user_id);
create index if not exists idx_subscriptions_user            on public.subscriptions       (user_id);
create index if not exists idx_reminders_user_date           on public.reminders           (user_id, reminder_date);
create index if not exists idx_lic_policies_user             on public.lic_policies        (user_id);
create index if not exists idx_term_plans_user               on public.term_plans          (user_id);
create index if not exists idx_investment_plans_user         on public.investment_plans    (user_id);
create index if not exists idx_informal_loans_user           on public.informal_loans      (user_id);
create index if not exists idx_rental_properties_user        on public.rental_properties   (user_id);
create index if not exists idx_sips_user                     on public.sips               (user_id);
create index if not exists idx_stock_sells_user              on public.stock_sells         (user_id);
create index if not exists idx_mf_sells_user                 on public.mf_sells            (user_id);
create index if not exists idx_corporate_actions_user        on public.corporate_actions   (user_id);
create index if not exists idx_corporate_actions_symbol      on public.corporate_actions   (symbol, exchange);
create index if not exists idx_tax_payments_user             on public.tax_payments        (user_id);
create index if not exists idx_demat_accounts_user           on public.demat_accounts      (user_id);

-- Net worth history: common time-series sort
create index if not exists idx_net_worth_history_user_month  on public.net_worth_history   (user_id, month desc);

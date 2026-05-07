-- ==========================================
-- SUPABASE NORMALIZED SCHEMA FOR PERSONAL FINANCE
-- ==========================================

-- 1. Profiles & Settings
create table if not exists public.profiles (
  user_id uuid references auth.users not null primary key,
  name text,
  fy text default '2025-26',
  regime text default 'new',
  savings_target numeric default 20,
  updated_at timestamp with time zone default now()
);

create table if not exists public.user_settings (
  user_id uuid references auth.users not null primary key,
  dark_mode boolean default false,
  accent_key text default 'blue',
  density text default 'normal',
  sidebar_nav boolean default true,
  radius_key text default 'modern',
  font_key text default 'inter',
  bg_style text default 'plain',
  anim_speed text default 'smooth',
  chart_style text default 'monotone',
  updated_at timestamp with time zone default now()
);

-- 2. Master Tables (Bank & Demat)
create table if not exists public.bank_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  bank_name text not null,
  account_number text,
  balance numeric default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.demat_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  broker text not null,
  dp_id text,
  client_id text,
  created_at timestamp with time zone default now()
);

-- 3. Transactions (FK to Bank Account)
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  date date not null,
  account_id uuid references public.bank_accounts(id) on delete set null,
  amount numeric not null,
  type text check (type in ('credit', 'debit')),
  category text,
  note text,
  created_at timestamp with time zone default now()
);

-- 4. Investments (Market)
create table if not exists public.mutual_funds (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  scheme text not null,
  type text, -- Equity, Debt, etc.
  units numeric default 0,
  current_nav numeric default 0,
  invested numeric default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.stocks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  symbol text not null,
  demat_id uuid references public.demat_accounts(id) on delete set null,
  qty numeric default 0,
  current_price numeric default 0,
  avg_price numeric default 0,
  created_at timestamp with time zone default now()
);

-- 5. Fixed Income & Savings
create table if not exists public.fixed_deposits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  bank text,
  principal numeric default 0,
  rate numeric default 0,
  years numeric,
  start_date date,
  maturity_date date,
  created_at timestamp with time zone default now()
);

create table if not exists public.recurring_deposits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  bank text,
  monthly numeric default 0,
  rate numeric default 0,
  tenure_months numeric,
  start_date date,
  created_at timestamp with time zone default now()
);

create table if not exists public.bonds (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  name text not null,
  type text,
  face_value numeric default 0,
  coupon numeric default 0,
  maturity_date date,
  created_at timestamp with time zone default now()
);

create table if not exists public.ppf_nps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  type text check (type in ('PPF', 'NPS')),
  bank text,
  balance numeric default 0,
  open_date date,
  this_year_contribution numeric default 0,
  created_at timestamp with time zone default now()
);

-- 6. Liabilities
create table if not exists public.credit_cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  issuer text not null,
  network text,
  last4 text,
  card_limit numeric default 0,
  outstanding numeric default 0,
  bill_date text,
  due_day text,
  created_at timestamp with time zone default now()
);

create table if not exists public.loans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  lender_borrower text not null,
  type text, -- Car, Home, Personal, etc.
  is_lent boolean default false, -- true if user lent money to others
  principal numeric default 0,
  outstanding numeric default 0,
  emi numeric default 0,
  rate numeric default 0,
  months_remaining numeric,
  created_at timestamp with time zone default now()
);

-- 7. Planning & Goals
create table if not exists public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  name text not null,
  category text,
  target_amount numeric default 0,
  current_amount numeric default 0,
  priority text check (priority in ('Low', 'Medium', 'High')),
  start_date date,
  target_date date,
  created_at timestamp with time zone default now()
);

create table if not exists public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  category text not null,
  monthly_limit numeric default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null,
  name text not null,
  amount numeric default 0,
  cycle text check (cycle in ('monthly', 'quarterly', 'yearly')),
  renewal_date date,
  paused boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists public.reminders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  reminder_date date,
  priority text,
  created_at timestamp with time zone default now()
);

-- 8. Activity Log
create table if not exists public.activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  action_type text not null,
  description text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

do $$
declare
  t text;
begin
  for t in 
    select table_name 
    from information_schema.tables 
    where table_schema = 'public' 
    and table_type = 'BASE TABLE'
    and table_name not in ('user_state') -- excluding the old table if it exists
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Users can access own data" on public.%I', t);
    execute format('create policy "Users can access own data" on public.%I for all using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Special policies for profiles and user_settings (primary key is user_id)
drop policy if exists "Users can access own profile" on public.profiles;
create policy "Users can access own profile" on public.profiles for all using (auth.uid() = user_id);

drop policy if exists "Users can access own settings" on public.user_settings;
create policy "Users can access own settings" on public.user_settings for all using (auth.uid() = user_id);

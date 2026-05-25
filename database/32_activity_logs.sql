-- Migration 32: Activity Logs table
-- App.tsx calls supabase.from("activity_logs").insert(...) on every add/remove/update
-- action. Without this table every CRUD operation silently swallows a 42P01 (table not found)
-- error in logActivity(), and the resetAll() phase-1 loop also fails on this table.
-- Run this once in Supabase SQL Editor → https://app.supabase.com → SQL Editor

create table if not exists public.activity_logs (
  id          uuid    default gen_random_uuid() primary key,
  user_id     uuid    references auth.users not null,
  action_type text    not null,
  description text,
  metadata    jsonb,
  created_at  timestamptz default now()
);

-- RLS: each user can only read/write their own logs
alter table public.activity_logs enable row level security;

-- CREATE POLICY has no IF NOT EXISTS in PostgreSQL; use DO block to skip if already present
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'activity_logs'
      and policyname = 'activity_logs_own'
  ) then
    execute $pol$
      create policy "activity_logs_own"
        on public.activity_logs
        using (user_id = auth.uid())
    $pol$;
  end if;
end;
$$;

-- Fast lookup by user and time (most common query pattern)
create index if not exists activity_logs_user_time_idx
  on public.activity_logs (user_id, created_at desc);

-- Migration 28: Add establishments (service history) column to EPF accounts
-- EPF accounts are stored in public.ppf_nps with type = 'EPF'
-- Run this in Supabase SQL Editor → https://app.supabase.com → SQL Editor

alter table public.ppf_nps
  add column if not exists establishments jsonb default '[]'::jsonb;

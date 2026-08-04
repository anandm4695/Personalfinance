-- Migration 29: Add email notification settings columns to user_settings
-- These columns are read by the /api/send-summary cron to decide who to email.
-- Run this in Supabase SQL Editor → https://app.supabase.com → SQL Editor

alter table public.user_settings
  add column if not exists email_enabled   boolean default false,
  add column if not exists email_frequency text    default 'weekly',
  add column if not exists email_day       integer default 1,
  add column if not exists email_hour      integer default 8,
  add column if not exists email_address   text    default '';

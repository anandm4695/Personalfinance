-- Migration 31: Add missing columns to reminders table
-- The ReminderModal form saves note, amount, and owner but these columns
-- were absent from the initial schema, causing PGRST204 errors on every insert.
-- Run this in Supabase SQL Editor → https://app.supabase.com → SQL Editor

alter table public.reminders
  add column if not exists owner  text    default 'self',
  add column if not exists amount numeric default null,
  add column if not exists note   text    default null;

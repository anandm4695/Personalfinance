-- Migration 38: Add category column to reminders table
-- Allows manual reminders to be categorised (Health, Vehicle, Tax, Bills, Reminder)
-- Run this in Supabase SQL Editor → https://app.supabase.com → SQL Editor

alter table public.reminders
  add column if not exists category text default 'Reminder';

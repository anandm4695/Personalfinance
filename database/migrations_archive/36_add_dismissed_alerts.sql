-- Migration 36: Add dismissed_alerts column to user_settings table
-- Run in Supabase Dashboard → SQL Editor → New query → Run

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS dismissed_alerts jsonb DEFAULT '{}'::jsonb;

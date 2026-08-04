-- Migration 30: Add gemini_api_key column to user_settings
-- Required for the AI Advisor tab to persist the Gemini API key to the cloud.
-- Run this in Supabase SQL Editor → https://app.supabase.com → SQL Editor

alter table public.user_settings
  add column if not exists gemini_api_key text default '';

-- Migration 40: Store sender email (from_email) in user_settings
-- Previously stored only in localStorage; now persisted in DB so cron job can use it per user.
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS from_email text DEFAULT NULL;

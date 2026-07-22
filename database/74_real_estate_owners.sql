-- Migration 74: Real Estate — multiple owners with ownership %
-- Adds `owners` (jsonb array of {id, sharePct}) to real_estate_properties so a
-- property can be jointly held by more than one family profile, with each
-- owner's percentage share tracked. The existing `owner` text column is kept
-- as the primary/filing owner (used across the app for single-owner
-- filtering) and is kept in sync with the highest-share entry in `owners`.

ALTER TABLE public.real_estate_properties
  ADD COLUMN IF NOT EXISTS owners jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill existing rows: single owner at 100% share.
UPDATE public.real_estate_properties
SET owners = jsonb_build_array(jsonb_build_object('id', owner, 'sharePct', 100))
WHERE owners = '[]'::jsonb OR owners IS NULL;

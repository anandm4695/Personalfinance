-- 90_nominee_tracker_fixes.sql
-- Run manually in Supabase SQL Editor.
--
-- 1. `documents.file_path` was NOT NULL with no default, but the Will &
--    Nominee Tracker's "Will Document" and "Key Contact" records are
--    metadata-only entries with no uploaded file — every save of either was
--    silently rejected by Postgres (23502 not-null violation) for any
--    logged-in online user, reverting the item from the UI right after it
--    appeared to save. Making the column nullable fixes that outright
--    failure.
-- 2. `documents` was also missing every column the Will/Key-Contact forms
--    actually write (type, date, location, witnesses, lawyer_name,
--    lawyer_contact, notes, role, phone, email) — migration 58 only ever
--    created the file-vault columns (name/file_path/mime_type/...) for the
--    Document Vault feature; nobody wrote a follow-up migration when the
--    Will/Contact forms were bolted onto the same table later. Confirmed
--    live: without these columns, the app's own missing-column retry logic
--    silently strips every one of them before saving, so even after fix #1
--    a "saved" Will/Contact record persists as an empty shell — the date,
--    location, witnesses, lawyer info, contact role/phone/email were all
--    silently discarded on every save, forever, since this feature shipped.
-- 3. `govt_schemes` had a `nominee` column (added ad hoc, outside the
--    migration-69 nominee rollout) but no matching `nominee_relation` column,
--    so government schemes (SSY, SCSS, PM-KISAN, etc.) could never show a
--    relation in the Will & Nominee Tracker even after being nominated.

ALTER TABLE public.documents ALTER COLUMN file_path DROP NOT NULL;

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS type            text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS date            date;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS location        text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS witnesses       text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS lawyer_name     text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS lawyer_contact  text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS notes           text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS role            text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS phone           text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS email           text DEFAULT '';

ALTER TABLE public.govt_schemes ADD COLUMN IF NOT EXISTS nominee_relation text DEFAULT '';

-- Migration 91: Document Vault — missing metadata columns + real file storage
--
-- DocumentVaultTab.tsx's save payload has always sent category, subcategory,
-- documentNumber, issuer, issueDate, expiryDate, url, linkedAssetType and
-- linkedAsset — none of which had matching columns on public.documents. The
-- app's generic camelToSnake() save path plus the PGRST204 strip-and-retry
-- logic in addItem/updateItem (App.tsx) silently dropped every one of these
-- fields on every real (online) save, showing only a quiet "⚠️ Saved but ...
-- was not stored" warn toast — so the vault's headline feature (expiry
-- tracking) never actually survived a page reload for a real user. This adds
-- the columns the component has always expected.
--
-- issue_date/expiry_date are TEXT (not DATE): both fields are optional and the
-- form sends '' when left blank, which a DATE column would reject on insert.
--
-- Also adds real file storage: a private 'documents' Storage bucket + RLS so
-- users can upload the actual PDF/image, not just paste a URL. Objects are
-- keyed '<user_id>/<file>' and policies restrict access to files under the
-- caller's own uid, mirroring the row-level `user_id = auth.uid()` policy
-- already used on every table in this schema.

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS category          text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS subcategory       text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_number   text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS issuer            text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS issue_date        text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS expiry_date       text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS url               text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS linked_asset_type text DEFAULT '';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS linked_asset      text DEFAULT '';

-- ── Storage bucket for real file uploads ───────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can read own vault files" ON storage.objects;
CREATE POLICY "Users can read own vault files" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload own vault files" ON storage.objects;
CREATE POLICY "Users can upload own vault files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own vault files" ON storage.objects;
CREATE POLICY "Users can update own vault files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own vault files" ON storage.objects;
CREATE POLICY "Users can delete own vault files" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

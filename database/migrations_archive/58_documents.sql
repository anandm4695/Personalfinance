-- Migration 58: Document vault table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  owner TEXT NOT NULL DEFAULT 'self',
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  linked_type TEXT,  -- 'stock', 'mf', 'fd', 'insurance', 'tax', 'property', 'vehicle', etc.
  linked_id UUID,
  tags TEXT[],
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own documents"
  ON documents FOR ALL USING (auth.uid() = user_id);

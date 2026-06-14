-- Add broll_urls column for Pexels clip metadata (Phase 7)
ALTER TABLE content_objects
  ADD COLUMN IF NOT EXISTS broll_urls JSONB NOT NULL DEFAULT '[]'::JSONB;

-- Supabase Storage bucket for audio + rendered video (create if missing)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read on media bucket
CREATE POLICY "Public read access for media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- Allow service role / authenticated uploads (permissive for dev)
CREATE POLICY "Allow uploads to media bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media');

CREATE POLICY "Allow updates to media bucket"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'media');

CREATE POLICY "Allow deletes from media bucket"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media');

-- Short vs long production + long-form pipeline (sections, merge, vertical render handoff)

ALTER TABLE content_objects
  ADD COLUMN IF NOT EXISTS production_type TEXT NOT NULL DEFAULT 'short'
  CHECK (production_type IN ('short', 'long'));

CREATE TABLE IF NOT EXISTS long_form_projects (
  project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels (channel_id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'researched',
    'outlined',
    'scripted',
    'tts_ready',
    'merged',
    'review',
    'queued_render',
    'published',
    'failed'
  )),
  research_notes TEXT NOT NULL DEFAULT '',
  outline JSONB NOT NULL DEFAULT '[]'::JSONB,
  merged_audio_path TEXT,
  final_video_id UUID REFERENCES content_objects (video_id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_long_form_projects_channel ON long_form_projects (channel_id);
CREATE INDEX IF NOT EXISTS idx_long_form_projects_status ON long_form_projects (status);

CREATE TABLE IF NOT EXISTS long_form_sections (
  section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES long_form_projects (project_id) ON DELETE CASCADE,
  sort_order INT NOT NULL CHECK (sort_order >= 0),
  title TEXT NOT NULL,
  script_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'written',
    'tts_done',
    'failed'
  )),
  audio_path TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_long_form_sections_project ON long_form_sections (project_id, sort_order);

ALTER TABLE long_form_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE long_form_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all long_form_projects" ON long_form_projects;
CREATE POLICY "Allow all long_form_projects" ON long_form_projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all long_form_sections" ON long_form_sections;
CREATE POLICY "Allow all long_form_sections" ON long_form_sections FOR ALL USING (true) WITH CHECK (true);

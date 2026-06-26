-- Scene-level visual planning for contextual short and long-form renders.

ALTER TABLE content_objects
  ADD COLUMN IF NOT EXISTS visual_plan JSONB NOT NULL DEFAULT '[]'::JSONB;

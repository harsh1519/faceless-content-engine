-- Scope trends to a channel (live imports) while keeping legacy rows global (channel_id NULL)

ALTER TABLE trends
  ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels (channel_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_trends_channel_id ON trends (channel_id);

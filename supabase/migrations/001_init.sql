-- Faceless Content Automation Engine — initial schema
-- Run via Supabase CLI: supabase db push
-- Or paste into Supabase Dashboard → SQL Editor

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- channels
-- ---------------------------------------------------------------------------
CREATE TABLE channels (
  channel_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  platform            TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  niche_type          TEXT NOT NULL,
  target_demographics TEXT NOT NULL,
  health_score        INT NOT NULL DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  posts_per_day       INT NOT NULL DEFAULT 1 CHECK (posts_per_day >= 0),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  auto_publish        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_channels_platform ON channels (platform);
CREATE INDEX idx_channels_status ON channels (status);

-- ---------------------------------------------------------------------------
-- trends
-- ---------------------------------------------------------------------------
CREATE TABLE trends (
  trend_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL,
  keyword         TEXT NOT NULL,
  hook_text       TEXT NOT NULL,
  velocity_score  NUMERIC NOT NULL DEFAULT 0,
  predicted_epc   NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'approved', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trends_status ON trends (status);
CREATE INDEX idx_trends_velocity ON trends (velocity_score DESC);

-- ---------------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------------
CREATE TABLE offers (
  offer_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  offer_type    TEXT NOT NULL CHECK (offer_type IN ('cpa_lead', 'cpa_sale', 'affiliate')),
  payout        NUMERIC NOT NULL DEFAULT 0,
  vertical      TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  cloaked_url   TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_offers_status ON offers (status);
CREATE INDEX idx_offers_vertical ON offers (vertical);

-- ---------------------------------------------------------------------------
-- content_objects
-- ---------------------------------------------------------------------------
CREATE TABLE content_objects (
  video_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    UUID NOT NULL REFERENCES channels (channel_id) ON DELETE CASCADE,
  trend_id      UUID REFERENCES trends (trend_id) ON DELETE SET NULL,
  offer_id      UUID REFERENCES offers (offer_id) ON DELETE SET NULL,
  script        TEXT NOT NULL DEFAULT '',
  audio_path    TEXT,
  render_path   TEXT,
  status        TEXT NOT NULL DEFAULT 'script_review' CHECK (
    status IN (
      'trend_queue',
      'script_review',
      'rendering',
      'ready_approve',
      'published',
      'failed'
    )
  ),
  thumbnail_url TEXT,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_objects_channel ON content_objects (channel_id);
CREATE INDEX idx_content_objects_status ON content_objects (status);
CREATE INDEX idx_content_objects_offer ON content_objects (offer_id);

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
CREATE TABLE leads (
  lead_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_video_id UUID REFERENCES content_objects (video_id) ON DELETE SET NULL,
  contact_channel TEXT NOT NULL CHECK (contact_channel IN ('email', 'telegram', 'sms')),
  contact_value   TEXT NOT NULL,
  consent_status  BOOLEAN NOT NULL DEFAULT FALSE,
  intent_tags     JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_contact_channel ON leads (contact_channel);
CREATE INDEX idx_leads_source_video ON leads (source_video_id);

-- ---------------------------------------------------------------------------
-- conversions
-- ---------------------------------------------------------------------------
CREATE TABLE conversions (
  conversion_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id          UUID REFERENCES content_objects (video_id) ON DELETE SET NULL,
  offer_id          UUID NOT NULL REFERENCES offers (offer_id) ON DELETE CASCADE,
  click_count       INT NOT NULL DEFAULT 0,
  conversion_count  INT NOT NULL DEFAULT 0,
  revenue           NUMERIC NOT NULL DEFAULT 0,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversions_video ON conversions (video_id);
CREATE INDEX idx_conversions_offer ON conversions (offer_id);
CREATE INDEX idx_conversions_occurred_at ON conversions (occurred_at DESC);

-- ---------------------------------------------------------------------------
-- Row Level Security (permissive for dev — tighten in Phase 10 with auth)
-- ---------------------------------------------------------------------------
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to channels" ON channels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to trends" ON trends FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to offers" ON offers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to content_objects" ON content_objects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to conversions" ON conversions FOR ALL USING (true) WITH CHECK (true);

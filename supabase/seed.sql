-- Seed data for Faceless Content Automation Engine
-- Run after 001_init.sql: psql or Supabase SQL Editor

-- Fixed UUIDs for predictable FK references in seed data
-- Channels (3 niches, different platforms)
INSERT INTO channels (channel_id, name, platform, niche_type, target_demographics, health_score, posts_per_day, status, auto_publish) VALUES
  ('a1000001-0000-4000-8000-000000000001', 'Wealth Whisper', 'youtube', 'personal finance', '25-34, US, male-skewing', 82, 2, 'active', true),
  ('a1000001-0000-4000-8000-000000000002', 'Glow Hacks Daily', 'instagram', 'beauty & skincare', '18-28, global, female', 45, 3, 'active', false),
  ('a1000001-0000-4000-8000-000000000003', 'TechTok Briefs', 'tiktok', 'tech gadgets', '16-30, US/UK, mixed', 28, 1, 'active', false);

-- Offers (3)
INSERT INTO offers (offer_id, name, offer_type, payout, vertical, affiliate_url, cloaked_url, status) VALUES
  ('b2000001-0000-4000-8000-000000000001', 'CreditBoost Pro Lead', 'cpa_lead', 12.50, 'finance', 'https://affiliate.example.com/creditboost', 'https://go.example.com/cb', 'active'),
  ('b2000001-0000-4000-8000-000000000002', 'SerumGlow Affiliate', 'affiliate', 8.00, 'beauty', 'https://affiliate.example.com/serumglow', 'https://go.example.com/sg', 'active'),
  ('b2000001-0000-4000-8000-000000000003', 'BudgetPhone CPA', 'cpa_sale', 35.00, 'tech', 'https://affiliate.example.com/budgetphone', NULL, 'paused');

-- Trends (5)
INSERT INTO trends (trend_id, source, keyword, hook_text, velocity_score, predicted_epc, status) VALUES
  ('c3000001-0000-4000-8000-000000000001', 'tiktok', 'side hustle 2025', 'This side hustle made me $3k last month and nobody talks about it...', 94.2, 0.42, 'approved'),
  ('c3000001-0000-4000-8000-000000000002', 'google trends', 'retinol routine', 'Dermatologists hate this 3-step retinol hack (but it works)', 78.5, 0.31, 'approved'),
  ('c3000001-0000-4000-8000-000000000003', 'reddit', 'budget smartphone', 'Stop buying flagship phones — this $200 phone beats them all', 88.0, 0.55, 'new'),
  ('c3000001-0000-4000-8000-000000000004', 'twitter', 'passive income', 'I replaced my 9-5 with this one passive income stream', 71.3, 0.38, 'new'),
  ('c3000001-0000-4000-8000-000000000005', 'instagram', 'glass skin', 'Glass skin in 7 days — the routine nobody wants you to know', 65.8, 0.27, 'rejected');

-- Content objects (6 — spread across pipeline statuses)
INSERT INTO content_objects (video_id, channel_id, trend_id, offer_id, script, audio_path, render_path, status, thumbnail_url, published_at) VALUES
  (
    'd4000001-0000-4000-8000-000000000001',
    'a1000001-0000-4000-8000-000000000001',
    'c3000001-0000-4000-8000-000000000004',
    'b2000001-0000-4000-8000-000000000001',
    'HOOK: Your boss doesn''t want you to know this side income trick. BODY: In 2025, the smartest move isn''t crypto — it''s micro-SaaS templates. CTA: Comment INCOME and I''ll send the free starter kit.',
    NULL, NULL,
    'trend_queue', NULL, NULL
  ),
  (
    'd4000001-0000-4000-8000-000000000002',
    'a1000001-0000-4000-8000-000000000002',
    'c3000001-0000-4000-8000-000000000002',
    'b2000001-0000-4000-8000-000000000002',
    'HOOK: Stop wasting money on serums that don''t work. BODY: Step 1 — cleanse with lukewarm water. Step 2 — apply retinol 2x weekly. Step 3 — lock in with peptide moisturizer. CTA: Comment GLOW for my full product list.',
    NULL, NULL,
    'script_review', NULL, NULL
  ),
  (
    'd4000001-0000-4000-8000-000000000003',
    'a1000001-0000-4000-8000-000000000003',
    'c3000001-0000-4000-8000-000000000003',
    'b2000001-0000-4000-8000-000000000003',
    'HOOK: Apple wants you to spend $1200 — don''t. BODY: This budget phone has 120Hz display, 2-day battery, and a camera that rivals flagships. CTA: Comment PHONE for the link.',
    'audio/render-003.mp3', NULL,
    'rendering', NULL, NULL
  ),
  (
    'd4000001-0000-4000-8000-000000000004',
    'a1000001-0000-4000-8000-000000000001',
    'c3000001-0000-4000-8000-000000000001',
    'b2000001-0000-4000-8000-000000000001',
    'HOOK: I made $3,247 last month with zero followers. BODY: Print-on-demand + TikTok Shop affiliate = unstoppable combo. Here''s the exact workflow. CTA: Comment HUSTLE for the blueprint.',
    'audio/render-004.mp3', 'renders/render-004.mp4',
    'ready_approve', 'https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg', NULL
  ),
  (
    'd4000001-0000-4000-8000-000000000005',
    'a1000001-0000-4000-8000-000000000002',
    'c3000001-0000-4000-8000-000000000005',
    'b2000001-0000-4000-8000-000000000002',
    'HOOK: Glass skin isn''t genetics — it''s this routine. BODY: Double cleanse, hyaluronic acid, SPF every morning. Results in 7 days guaranteed. CTA: Comment SKIN for the routine PDF.',
    'audio/render-005.mp3', 'renders/render-005.mp4',
    'published', 'https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg',
    NOW() - INTERVAL '2 days'
  ),
  (
    'd4000001-0000-4000-8000-000000000006',
    'a1000001-0000-4000-8000-000000000003',
    NULL,
    'b2000001-0000-4000-8000-000000000003',
    'HOOK: This render failed mid-process. BODY: Placeholder script for failed content object. CTA: Comment RETRY.',
    NULL, NULL,
    'failed', NULL, NULL
  );

-- Sample leads
INSERT INTO leads (source_video_id, contact_channel, contact_value, consent_status, intent_tags) VALUES
  ('d4000001-0000-4000-8000-000000000005', 'email', 'user1@example.com', true, '["beauty", "skincare"]'),
  ('d4000001-0000-4000-8000-000000000005', 'telegram', '@glowfan22', true, '["beauty"]'),
  ('d4000001-0000-4000-8000-000000000004', 'email', 'hustler@example.com', false, '["finance", "side-hustle"]');

-- Sample conversions (for dashboard KPIs in later phases)
INSERT INTO conversions (video_id, offer_id, click_count, conversion_count, revenue, occurred_at) VALUES
  ('d4000001-0000-4000-8000-000000000005', 'b2000001-0000-4000-8000-000000000002', 420, 18, 144.00, NOW() - INTERVAL '1 day'),
  ('d4000001-0000-4000-8000-000000000005', 'b2000001-0000-4000-8000-000000000002', 380, 12, 96.00, NOW() - INTERVAL '3 days'),
  ('d4000001-0000-4000-8000-000000000004', 'b2000001-0000-4000-8000-000000000001', 210, 8, 100.00, NOW() - INTERVAL '5 days'),
  ('d4000001-0000-4000-8000-000000000004', 'b2000001-0000-4000-8000-000000000001', 150, 5, 62.50, NOW() - INTERVAL '10 days'),
  (NULL, 'b2000001-0000-4000-8000-000000000001', 90, 2, 25.00, NOW() - INTERVAL '15 days');

/**
 * Database types aligned with supabase/migrations/001_init.sql
 * Regenerate with `supabase gen types` after linking a project.
 */
export type Platform = "instagram" | "youtube" | "tiktok";
export type ChannelStatus = "active" | "paused";
export type TrendStatus = "new" | "approved" | "rejected";
export type OfferType = "cpa_lead" | "cpa_sale" | "affiliate";
export type OfferStatus = "active" | "paused";
export type ContentStatus =
  | "trend_queue"
  | "script_review"
  | "rendering"
  | "ready_approve"
  | "published"
  | "failed";
export type ContactChannel = "email" | "telegram" | "sms";

export interface Channel {
  channel_id: string;
  name: string;
  platform: Platform;
  niche_type: string;
  target_demographics: string;
  health_score: number;
  posts_per_day: number;
  status: ChannelStatus;
  auto_publish: boolean;
  created_at: string;
}

export interface Trend {
  trend_id: string;
  source: string;
  keyword: string;
  hook_text: string;
  velocity_score: number;
  predicted_epc: number;
  status: TrendStatus;
  created_at: string;
}

export interface Offer {
  offer_id: string;
  name: string;
  offer_type: OfferType;
  payout: number;
  vertical: string;
  affiliate_url: string;
  cloaked_url: string | null;
  status: OfferStatus;
  created_at: string;
}

export interface ContentObject {
  video_id: string;
  channel_id: string;
  trend_id: string | null;
  offer_id: string | null;
  script: string;
  audio_path: string | null;
  render_path: string | null;
  broll_urls: BrollClip[];
  status: ContentStatus;
  thumbnail_url: string | null;
  published_at: string | null;
  created_at: string;
}

export interface BrollClip {
  id: number;
  url: string;
  width: number;
  height: number;
  duration: number;
  photographer?: string;
}

export interface Lead {
  lead_id: string;
  source_video_id: string | null;
  contact_channel: ContactChannel;
  contact_value: string;
  consent_status: boolean;
  intent_tags: string[];
  created_at: string;
}

export interface Conversion {
  conversion_id: string;
  video_id: string | null;
  offer_id: string;
  click_count: number;
  conversion_count: number;
  revenue: number;
  occurred_at: string;
}

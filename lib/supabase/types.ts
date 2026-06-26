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
  /** When set, trend was imported for this channel (e.g. live discover). NULL = global/seed. */
  channel_id?: string | null;
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

export type ProductionType = "short" | "long";

export interface ContentObject {
  video_id: string;
  channel_id: string;
  trend_id: string | null;
  offer_id: string | null;
  script: string;
  audio_path: string | null;
  render_path: string | null;
  broll_urls: BrollClip[];
  visual_plan: VisualPlanItem[];
  status: ContentStatus;
  production_type?: ProductionType;
  thumbnail_url: string | null;
  published_at: string | null;
  created_at: string;
}

export type LongFormProjectStatus =
  | "draft"
  | "researched"
  | "outlined"
  | "scripted"
  | "tts_ready"
  | "merged"
  | "review"
  | "queued_render"
  | "published"
  | "failed";

export type LongFormSectionStatus = "pending" | "written" | "tts_done" | "failed";

export interface LongFormProjectRow {
  project_id: string;
  channel_id: string | null;
  title: string;
  topic: string;
  status: LongFormProjectStatus;
  research_notes: string;
  outline: { id: string; title: string }[];
  merged_audio_path: string | null;
  final_video_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface LongFormSectionRow {
  section_id: string;
  project_id: string;
  sort_order: number;
  title: string;
  script_text: string;
  status: LongFormSectionStatus;
  audio_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrollClip {
  id: number;
  url: string;
  width: number;
  height: number;
  duration: number;
  photographer?: string;
}

export interface VisualPlanItem {
  beat_index: number;
  text: string;
  visual_query: string;
  duration_seconds: number;
  clip?: BrollClip;
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

# Faceless Content Engine — What This App Does

A **mission control dashboard** for running faceless video channels (Instagram, YouTube, TikTok). Think of it as a social media manager + ads manager in one dark-themed web app. You manage channels, run **short-form** and **long-form** production paths, attach monetization offers, and track leads and revenue — mostly on free-tier APIs.

---

## The Big Picture

### Shorts engine (`/pipeline`)

Content flows left-to-right through a **Kanban pipeline**:

**Trends Queue → Script Review → Rendering → Ready / Approve → Published**

Each short is tied to a **channel** (niche + platform), an optional **trend** (keyword + predicted EPC), and an **offer** (CPA/affiliate link). The app automates what it can and puts **manual gates** where a human should review scripts or final video.

### Long-form engine (`/long-form`)

Separate workflow for longer narrated videos (section-based, avoids stretching the shorts Kanban):

**Topic → Research → Outline → Section scripts → TTS per section → Merge audio → Enqueue vertical render**

After **Enqueue render**, the app inserts a `content_objects` row in **`rendering`** (with `production_type: long`) so the same **FFmpeg renderer** can build the final 1080×1920 MP4. Pick a **channel** on the project before enqueue.

---

## Screens

### Command Center (`/`)

Home dashboard with live Supabase data:

- **KPIs:** revenue, total leads, posts published today, average EPC
- **Revenue chart:** last 30 days from conversion events
- **Alerts:** low-health channels, failed renders, paused offers

### Channels (`/channels`)

Manage distribution channels across platforms:

- Table: name, niche, platform, health score, posts/day, status
- **Autopilot toggle:** preference stored in DB (auto-publish automation is not wired end-to-end in V1)
- Add channels via dialog; click a row for detail drawer + linked content

### Content Pipeline (`/pipeline`) — shorts

Horizontal Kanban board with five columns matching content status:

- **Trend cards** in Trends Queue: pick a channel → **Generate Script** (Gemini)
- **Script Review:** edit script, **Approve** → TTS + Pexels B-roll fetch, moves to Rendering
- **Rendering:** progress indicator (local FFmpeg worker processes these)
- **Ready / Approve:** preview audio/video, publish when satisfied
- Detail modal: full script editor, offer picker, regenerate script, media previews

### Long-form (`/long-form`)

Guided steps for one project: **Research** → **Outline** (creates section rows) → **Write sections** → **Section TTS** (all sections) → **Merge audio** (FFmpeg) → **Enqueue render** (creates a pipeline job with merged narration + B-roll). Merged audio preview uses authenticated **`/api/media/...`** when files live under **`LOCAL_MEDIA_ROOT`**.

### Offers (`/offers`)

Track monetization offers:

- Payout, type (CPA lead/sale, affiliate), vertical
- Clicks, conversions, EPC aggregated from conversion records
- Add offers, toggle active/paused

### Audience Vault (`/audience`)

Lead capture and segmentation:

- Total leads + breakdown by email / Telegram / SMS
- Segment cards grouped by **intent tags**
- Broadcast button (UI stub in V1 — no actual send)

### Settings (`/settings`)

- Integration status: which API keys are configured (checked server-side)
- Mock usage meters for Gemini, ElevenLabs, Pexels, etc.
- **Local media root** appears when `LOCAL_MEDIA_ROOT` is set (disk storage for blobs)

---

## What Runs Where

| Component | Where it runs |
|-----------|---------------|
| Next.js web app | Your machine (`npm run dev`) |
| Database + auth | Supabase (cloud) |
| **Media blobs** | Supabase Storage **or** optional **`LOCAL_MEDIA_ROOT`** on disk (`local/...` paths in DB) |
| Script generation (shorts + long-form copy) | Gemini API (`/api/generate-script`, long-form step routes) |
| **Text-to-speech** | `/api/generate-audio`: **ElevenLabs first**; on failure or missing key, **Gemini TTS** (same `GEMINI_API_KEY`; optional `GEMINI_TTS_MODEL` / `GEMINI_TTS_VOICE`) |
| B-roll clips | Pexels via `/api/fetch-broll` |
| Long-form merged narration | Server **FFmpeg** (`merge-audio` step); requires `ffmpeg` on PATH |
| Video render | **Separate** local script: `renderer/render.js` (FFmpeg) |

The renderer is **not** part of the Next app. It polls Supabase for `rendering` jobs, reads audio from Storage **or** `local/...` under `LOCAL_MEDIA_ROOT`, builds 1080×1920 MP4s with captions, uploads the MP4 to Storage **or** disk, and sets status to `ready_approve`. Long jobs can raise **`MAX_BROLL_SEGMENTS`** (env; default higher than legacy 500).

---

## Data Model (short)

- **channels** — platform accounts you publish to
- **trends** — trending keywords with velocity + predicted EPC
- **offers** — affiliate/CPA offers with payout info
- **content_objects** — videos moving through the pipeline (`production_type`: **`short`** | **`long`**), script, audio, broll, render paths
- **long_form_projects** — topic, research notes, outline JSON, merged audio path, status, optional `channel_id`, link to final `content_objects` row
- **long_form_sections** — ordered sections with script + per-section TTS paths
- **leads** — audience contacts with intent tags
- **conversions** — click/conversion/revenue tracking per offer

Schema additions live in `supabase/migrations/003_long_form.sql` (run via Supabase CLI or SQL editor).

---

## Auth

Email + password login via Supabase. All dashboard routes require sign-in. API routes for media generation use server-side env keys; **`/api/media`** requires a signed-in user. The renderer uses the Supabase service role key.

---

## Tech Stack

Next.js 14 · TypeScript · Tailwind · shadcn/ui · TanStack Query · Supabase · Recharts · Gemini (scripts + TTS) · ElevenLabs (TTS primary) · Pexels · FFmpeg (local + merge) · optional on-disk media via `LOCAL_MEDIA_ROOT`

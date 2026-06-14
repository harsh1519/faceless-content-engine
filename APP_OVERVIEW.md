# Faceless Content Engine — What This App Does

A **mission control dashboard** for running faceless short-form video channels (Instagram, YouTube, TikTok). Think of it as a social media manager + ads manager in one dark-themed web app. You manage channels, move content through a production pipeline, attach monetization offers, and track leads and revenue — mostly on free-tier APIs.

---

## The Big Picture

Content flows left-to-right through a **Kanban pipeline**:

**Trends Queue → Script Review → Rendering → Ready / Approve → Published**

Each piece of content is tied to a **channel** (niche + platform), an optional **trend** (keyword + predicted EPC), and an **offer** (CPA/affiliate link). The app automates what it can and puts **manual gates** where a human should review scripts or final video.

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
- **Autopilot toggle:** auto-publish when content is ready
- Add channels via dialog; click a row for detail drawer + linked content

### Content Pipeline (`/pipeline`) — core screen
Horizontal Kanban board with five columns matching content status:
- **Trend cards** in Trends Queue: pick a channel → **Generate Script** (Gemini AI)
- **Script Review:** edit script, **Approve** → triggers ElevenLabs TTS + Pexels B-roll fetch, moves to Rendering
- **Rendering:** progress indicator (local FFmpeg worker processes these)
- **Ready / Approve:** preview audio/video, publish when satisfied
- Detail modal: full script editor, offer picker, regenerate script, media previews

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

---

## What Runs Where

| Component | Where it runs |
|-----------|---------------|
| Next.js web app | Your machine (`npm run dev`) |
| Database + auth + storage | Supabase (cloud) |
| Script generation | Gemini API via `/api/generate-script` |
| Text-to-speech | ElevenLabs via `/api/generate-audio` |
| B-roll clips | Pexels via `/api/fetch-broll` |
| Video render | **Separate** local script: `renderer/render.js` (FFmpeg) |

The renderer is **not** part of the Next app. It polls Supabase for `rendering` jobs, builds 1080×1920 MP4s with captions, uploads to Storage, and sets status to `ready_approve`.

---

## Data Model (short)

- **channels** — platform accounts you publish to
- **trends** — trending keywords with velocity + predicted EPC
- **offers** — affiliate/CPA offers with payout info
- **content_objects** — videos moving through the pipeline (script, audio, broll, render paths)
- **leads** — audience contacts with intent tags
- **conversions** — click/conversion/revenue tracking per offer

---

## Auth

Email + password login via Supabase. All dashboard routes require sign-in. API routes for media generation use server-side env keys; the renderer uses the Supabase service role key.

---

## Tech Stack

Next.js 14 · TypeScript · Tailwind · shadcn/ui · TanStack Query · Supabase · Recharts · Gemini · ElevenLabs · Pexels · FFmpeg (local)

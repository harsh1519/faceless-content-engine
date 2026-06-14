# Getting Started — Run the Faceless Content Engine

Follow these steps in order. Everything uses **free tiers** unless noted.

---

## 1. Prerequisites

Install on your machine:

- **Node.js 18+** and npm
- **FFmpeg** (only needed for video rendering — see step 8)
  - Ubuntu: `sudo apt install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Windows: [ffmpeg.org](https://ffmpeg.org/download.html) → add `bin` to PATH

---

## 2. Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. **Settings → API** — copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret)

### Run database migrations

Open **SQL Editor** and run these files in order:

1. `supabase/migrations/001_init.sql` — tables + RLS
2. `supabase/migrations/002_broll_urls.sql` — broll column + storage bucket
3. `supabase/seed.sql` — sample channels, offers, trends, content (optional but recommended)

### Enable auth

1. **Authentication → Providers** → enable **Email**
2. For quick local dev: **Authentication → Settings** → disable **Confirm email**
   - Or confirm signup emails via Supabase logs / your inbox

---

## 3. Get API Keys

| Service | URL | Env var |
|---------|-----|---------|
| Google Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `GEMINI_API_KEY` |
| ElevenLabs | [elevenlabs.io](https://elevenlabs.io) | `ELEVENLABS_API_KEY` |
| Pexels | [pexels.com/api](https://www.pexels.com/api/) | `PEXELS_API_KEY` |

All are free-tier friendly for development.

---

## 4. Configure Environment

From the project root:

```bash
cp .env.local.example .env.local
```

Fill in every value in `.env.local`. Restart the dev server after any change.

---

## 5. Install & Run the Web App

```bash
# From project root
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to **/login**.

### First login

1. Visit **/signup** → create an account (email + password, min 6 chars)
2. Sign in at **/login**
3. You land on the **Command Center**

---

## 6. Verify the App Works

Suggested smoke test:

1. **Command Center** — KPIs and chart load (seed data)
2. **Channels** — see 3 sample channels; toggle autopilot
3. **Pipeline** — Kanban shows content across columns
4. **Trends Queue** — pick channel → **Generate Script** (needs `GEMINI_API_KEY`)
5. **Script Review** — **Approve →** (needs `ELEVENLABS_API_KEY`, `PEXELS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
6. **Settings** — integration cards show green “Connected” for configured keys

---

## 7. Content Pipeline Workflow (end-to-end)

```
Trend card → Generate Script (Gemini)
    ↓
Script Review → Approve (TTS + B-roll APIs)
    ↓
Rendering → local FFmpeg renderer (step 8)
    ↓
Ready / Approve → preview → Approve & Publish
```

---

## 8. Run the Local Video Renderer (optional but needed for MP4 output)

When content is in **Rendering**, the Next app does not build video — the separate renderer does.

```bash
cd renderer
npm install
cp .env.example .env   # or reuse ../.env.local values
```

Set in `renderer/.env` (or rely on root `.env.local` if copied):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Run:

```bash
npm start        # polls every 30s
# or
npm run once     # process queue once and exit
```

Successful render → content moves to **Ready / Approve** with `render_path` set.

See `renderer/README.md` for FFmpeg troubleshooting.

---

## 9. Project Structure (quick reference)

```
app/                    Next.js pages (dashboard + auth + API routes)
components/features/    UI by domain (pipeline, channels, etc.)
lib/                    Supabase clients, queries, AI/media helpers
supabase/migrations/    SQL schema
renderer/               Standalone FFmpeg worker (Node.js)
```

---

## 10. Common Issues

| Problem | Fix |
|---------|-----|
| Redirect loop / can't login | Enable Email auth in Supabase; check URL/anon key |
| Integration shows “Missing key” | Fill `.env.local`, restart `npm run dev` |
| Generate Script fails | Set `GEMINI_API_KEY` |
| Approve fails | Set ElevenLabs, Pexels, and service role keys |
| Renderer finds no jobs | Content must be `status = rendering` with `audio_path` + `broll_urls` |
| Storage upload fails | Run migration 002; confirm `media` bucket exists |
| Video won't play in UI | Renderer must finish; file at `media/renders/{id}.mp4` |

---

## You're Ready

- **Daily use:** `npm run dev` + sign in
- **When pipeline has Rendering items:** run `renderer` in a second terminal
- **Check integration health:** `/settings`

For the full build spec, see `test.txt` in the project root.

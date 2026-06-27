# Local Video Renderer

Standalone Node.js script that polls Supabase for content in **`rendering`** status, builds vertical short-form MP4s with FFmpeg, and uploads them back to Supabase Storage.

## Prerequisites

### 1. FFmpeg (required)

FFmpeg must be installed and available on your `PATH` as `ffmpeg` and `ffprobe`.

**Ubuntu / Debian**
```bash
sudo apt update && sudo apt install -y ffmpeg
```

**macOS (Homebrew)**
```bash
brew install ffmpeg
```

**Windows**
1. Download from [ffmpeg.org/download.html](https://ffmpeg.org/download.html) (gyan.dev builds work well)
2. Extract and add the `bin` folder to your system `PATH`
3. Verify in a new terminal: `ffmpeg -version`

### 2. Supabase setup

- Run migration `supabase/migrations/002_broll_urls.sql` (creates the `media` storage bucket)
- Run migration `supabase/migrations/005_visual_plan.sql` for scene-level visual planning
- Content must be in **`rendering`** status with:
  - `audio_path` — MP3 uploaded by Phase 7 (`/api/generate-audio`)
  - `broll_urls` — JSON array of Pexels clip URLs from Phase 7
  - `visual_plan` — optional scene-level beats with selected clips

### 3. Environment variables

Copy credentials into `renderer/.env` or use the project root `.env.local`:

```bash
cp .env.example .env
# or rely on ../.env.local
```

Required:
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL (or `NEXT_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for Storage upload + DB updates |

Optional:
| Variable | Default | Description |
|---|---|---|
| `POLL_INTERVAL_MS` | `30000` | Poll interval when running continuously |
| `RENDER_ENGINE` | `ffmpeg` | Use `remotion` for the React-based InVideo-style compositor, falls back to FFmpeg overlay if unavailable |

## Install & run

From the project root:

```bash
cd renderer
npm install
npm start          # poll every 30s
npm run once       # process current queue once, then exit
```

## Remotion compositor

The renderer includes an optional Remotion template for a more InVideo-like output with layered cards, animated captions, gradients, and progress UI.

Enable it after installing renderer dependencies:

```bash
RENDER_ENGINE=remotion npm start
```

If Remotion packages are not installed or a Remotion render fails, the worker logs the issue and falls back to the FFmpeg overlay renderer for that job.

## What the renderer does

For each `content_objects` row with `status = 'rendering'`:

1. **Downloads** the TTS audio from Supabase Storage (`media` bucket)
2. **Downloads** B-roll clips from Pexels URLs in `broll_urls`
3. **Uses** `visual_plan` order when available, falling back to looping B-roll
4. **Trims** each clip to max **2.5 seconds** fallback pacing or planned beat duration
5. **Scales/crops** to **1080×1920** (9:16 vertical)
6. **Concatenates** clips, looping if video is shorter than audio
7. **Burns captions** from the visual plan or script text
8. **Muxes** audio + captioned video → MP4
9. **Uploads** to `media/renders/{video_id}.mp4`
10. **Updates** `render_path` and sets `status` → **`ready_approve`**

On any error, status is set to **`failed`** (visible in Command Center alerts).

## Output

- Storage path: `renders/{video_id}.mp4`
- Resolution: 1080×1920 @ 30fps
- Codecs: H.264 + AAC

After a successful render, open the **Content Pipeline** → **Ready / Approve** column to preview and publish.

## Troubleshooting

| Issue | Fix |
|---|---|
| `FFmpeg not found` | Install FFmpeg and restart your terminal |
| `Missing audio_path` | Approve script in Phase 7 first (generates TTS) |
| `Missing broll_urls` | Same — Approve triggers Pexels fetch |
| `Storage download failed` | Confirm `media` bucket exists and file is at `audio/{id}.mp3` |
| `Upload failed` | Check `SUPABASE_SERVICE_ROLE_KEY` and storage policies |
| Subtitles garbled | Script should use plain ASCII; special chars in paths can break FFmpeg on Windows |

## Development tips

- Use `npm run once` while testing — avoids a long-running poll loop
- Temp files are written to the OS temp dir and cleaned up after each job
- Check Supabase **Table Editor** → `content_objects` for `render_path` and status changes

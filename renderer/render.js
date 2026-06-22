#!/usr/bin/env node
/**
 * Local video renderer for Faceless Content Engine.
 * Polls Supabase for content in "rendering" status, builds 1080x1920 MP4s via FFmpeg.
 *
 * Usage:
 *   node render.js          # continuous polling
 *   node render.js --once   # process current queue then exit
 */

const fsp = require("fs/promises");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const dotenv = require("dotenv");
const ffmpeg = require("fluent-ffmpeg");
const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

// Load env from renderer/.env then project root .env.local
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 30_000);
const RUN_ONCE = process.argv.includes("--once");

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;
const MAX_CLIP_SECONDS = 2.5;
const BUCKET = "media";
const LOCAL_MEDIA_PREFIX = "local/";
const LOCAL_MEDIA_ROOT = process.env.LOCAL_MEDIA_ROOT
  ? path.resolve(process.env.LOCAL_MEDIA_ROOT)
  : null;
const MAX_BROLL_SEGMENTS = Number(process.env.MAX_BROLL_SEGMENTS || 3000);
const FFMPEG_PATH =
  process.env.FFMPEG_PATH?.trim() ||
  (process.platform === "win32" ? "C:\\ffmpeg\\bin\\ffmpeg.exe" : "ffmpeg");
const FFPROBE_PATH =
  process.env.FFPROBE_PATH?.trim() ||
  (process.platform === "win32" ? "C:\\ffmpeg\\bin\\ffprobe.exe" : "ffprobe");

ffmpeg.setFfmpegPath(FFMPEG_PATH);
ffmpeg.setFfprobePath(FFPROBE_PATH);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Copy renderer/.env.example to .env or use root .env.local."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});

function log(msg, ...args) {
  console.log(`[renderer ${new Date().toISOString()}] ${msg}`, ...args);
}

function checkFfmpeg() {
  try {
    execFileSync(FFMPEG_PATH, ["-version"], { stdio: "ignore" });
    execFileSync(FFPROBE_PATH, ["-version"], { stdio: "ignore" });
  } catch {
    console.error(
      `FFmpeg not found. Checked:\nffmpeg: ${FFMPEG_PATH}\nffprobe: ${FFPROBE_PATH}\nSet FFMPEG_PATH and FFPROBE_PATH in renderer/.env if needed.`
    );
    process.exit(1);
  }
}

async function fetchRenderingJobs() {
  const { data, error } = await supabase
    .from("content_objects")
    .select("video_id, script, audio_path, broll_urls, status")
    .eq("status", "rendering");

  if (error) throw error;
  return data ?? [];
}

async function setStatus(videoId, status) {
  const { error } = await supabase
    .from("content_objects")
    .update({ status })
    .eq("video_id", videoId);

  if (error) throw error;
}

async function markReady(videoId, renderPath) {
  const { error } = await supabase
    .from("content_objects")
    .update({
      render_path: renderPath,
      status: "ready_approve",
    })
    .eq("video_id", videoId);

  if (error) throw error;
}

async function downloadStorageFile(storagePath, destPath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error) throw new Error(`Storage download failed (${storagePath}): ${error.message}`);

  const buffer = Buffer.from(await data.arrayBuffer());
  await fsp.writeFile(destPath, buffer);
}

function resolveLocalMediaFile(dbPath) {
  if (!dbPath.startsWith(LOCAL_MEDIA_PREFIX)) {
    return null;
  }
  if (!LOCAL_MEDIA_ROOT) {
    throw new Error("LOCAL_MEDIA_ROOT is required for paths starting with local/");
  }
  const rel = dbPath.slice(LOCAL_MEDIA_PREFIX.length);
  const full = path.resolve(path.join(LOCAL_MEDIA_ROOT, rel));
  const rootWithSep = LOCAL_MEDIA_ROOT.endsWith(path.sep)
    ? LOCAL_MEDIA_ROOT
    : LOCAL_MEDIA_ROOT + path.sep;
  if (full !== LOCAL_MEDIA_ROOT && !full.startsWith(rootWithSep)) {
    throw new Error("Invalid local media path");
  }
  return full;
}

async function copyAudioToWorkdir(audioPath, destPath) {
  const localSrc = resolveLocalMediaFile(audioPath);
  if (localSrc) {
    await fsp.copyFile(localSrc, destPath);
    return;
  }
  await downloadStorageFile(audioPath, destPath);
}

async function downloadUrl(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}): ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await fsp.writeFile(destPath, buffer);
}

function ffprobeDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration || 0);
    });
  });
}

function runFfmpeg(command) {
  return new Promise((resolve, reject) => {
    command.on("end", resolve).on("error", reject).run();
  });
}

/** Strip HOOK:/BODY:/CTA: labels and split into caption phrases. */
function scriptToPhrases(script) {
  const cleaned = script
    .replace(/\bHOOK:\s*/gi, "")
    .replace(/\bBODY:\s*/gi, "")
    .replace(/\bCTA:\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return [" "];

  const parts = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return parts?.map((p) => p.trim()).filter(Boolean) || [cleaned];
}

function formatSrtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function buildSrt(script, totalSeconds) {
  const phrases = scriptToPhrases(script);
  const slice = totalSeconds / phrases.length;
  let srt = "";

  phrases.forEach((phrase, i) => {
    const start = i * slice;
    const end = i === phrases.length - 1 ? totalSeconds : (i + 1) * slice;
    srt += `${i + 1}\n`;
    srt += `${formatSrtTime(start)} --> ${formatSrtTime(end)}\n`;
    srt += `${phrase}\n\n`;
  });

  return srt;
}

/** Build segment list looping broll until audio duration is covered. */
function planSegments(clips, audioDuration) {
  if (!clips.length) throw new Error("No broll clips available");

  const segments = [];
  let total = 0;
  let index = 0;

  while (total < audioDuration - 0.05) {
    const clip = clips[index % clips.length];
    const remaining = audioDuration - total;
    const clipDur = Math.min(MAX_CLIP_SECONDS, remaining, clip.duration || MAX_CLIP_SECONDS);
    segments.push({ url: clip.url, duration: clipDur, index: index % clips.length });
    total += clipDur;
    index++;
    if (index > MAX_BROLL_SEGMENTS)
      throw new Error(
        `Too many segments (${MAX_BROLL_SEGMENTS} max) — increase MAX_BROLL_SEGMENTS or shorten audio`
      );
  }

  return segments;
}

const SCALE_FILTER = `scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}`;

async function trimAndScaleClip(inputPath, outputPath, duration) {
  await runFfmpeg(
    ffmpeg(inputPath)
      .setStartTime(0)
      .duration(duration)
      .videoFilters(SCALE_FILTER)
      .outputOptions(["-an", "-r", "30", "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p"])
      .output(outputPath)
  );
}

async function concatSegments(segmentPaths, outputPath) {
  const listPath = outputPath.replace(".mp4", "-list.txt");
  const listContent = segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await fsp.writeFile(listPath, listContent);

  await runFfmpeg(
    ffmpeg()
      .input(listPath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .outputOptions(["-c", "copy"])
      .output(outputPath)
  );
}

async function muxFinalVideo(videoPath, audioPath, srtPath, outputPath) {
  const escapedSrt = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
  const subFilter = `subtitles='${escapedSrt}':force_style='FontName=Arial,FontSize=22,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2,MarginV=80'`;

  await runFfmpeg(
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .videoFilters(subFilter)
      .outputOptions([
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-movflags",
        "+faststart",
        "-pix_fmt",
        "yuv420p",
      ])
      .output(outputPath)
  );
}

async function uploadRender(localPath, videoId) {
  const fileBuffer = await fsp.readFile(localPath);
  const rel = `renders/${videoId}.mp4`;

  if (LOCAL_MEDIA_ROOT) {
    const dest = path.resolve(path.join(LOCAL_MEDIA_ROOT, rel));
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.writeFile(dest, fileBuffer);
    return `${LOCAL_MEDIA_PREFIX}${rel.replace(/\\/g, "/")}`;
  }

  const { error } = await supabase.storage.from(BUCKET).upload(rel, fileBuffer, {
    contentType: "video/mp4",
    upsert: true,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return rel;
}

async function processJob(job) {
  const { video_id: videoId, script, audio_path: audioPath, broll_urls: brollUrls } = job;

  if (!audioPath) throw new Error("Missing audio_path");
  if (!brollUrls?.length) throw new Error("Missing broll_urls");

  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), `render-${videoId}-`));
  log(`Processing ${videoId} in ${workDir}`);

  try {
    const ext = path.extname(audioPath) || ".mp3";
    const localAudio = path.join(workDir, `input-audio${ext}`);
    await copyAudioToWorkdir(audioPath, localAudio);
    const audioDuration = await ffprobeDuration(localAudio);
    log(`Audio duration: ${audioDuration.toFixed(1)}s`);

    const clips = brollUrls;
    const segments = planSegments(clips, audioDuration);
    const segmentPaths = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const rawPath = path.join(workDir, `raw-${i}.mp4`);
      const segPath = path.join(workDir, `seg-${i}.mp4`);

      log(`  Clip ${i + 1}/${segments.length} (${seg.duration.toFixed(1)}s)`);
      await downloadUrl(seg.url, rawPath);
      await trimAndScaleClip(rawPath, segPath, seg.duration);
      segmentPaths.push(segPath);
    }

    const concatPath = path.join(workDir, "concat.mp4");
    await concatSegments(segmentPaths, concatPath);

    const srtPath = path.join(workDir, "captions.srt");
    await fsp.writeFile(srtPath, buildSrt(script || "", audioDuration), "utf8");

    const outputPath = path.join(workDir, "output.mp4");
    await muxFinalVideo(concatPath, localAudio, srtPath, outputPath);

    const renderPath = await uploadRender(outputPath, videoId);
    await markReady(videoId, renderPath);
    log(`Done ${videoId} → ${renderPath}`);
  } finally {
    await fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function processQueue() {
  const jobs = await fetchRenderingJobs();
  if (!jobs.length) {
    log("No jobs in rendering queue");
    return;
  }

  log(`Found ${jobs.length} job(s)`);

  for (const job of jobs) {
    try {
      await processJob(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`FAILED ${job.video_id}: ${message}`);
      try {
        await setStatus(job.video_id, "failed");
      } catch (statusErr) {
        log(`Could not mark failed: ${statusErr.message}`);
      }
    }
  }
}

async function main() {
  checkFfmpeg();
  log(`Starting renderer (poll every ${POLL_INTERVAL_MS}ms, once=${RUN_ONCE})`);

  do {
    try {
      await processQueue();
    } catch (err) {
      log(`Queue error: ${err.message}`);
    }

    if (RUN_ONCE) break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  } while (true);
}

main().catch((err) => {
  console.error("[renderer] Fatal:", err);
  process.exit(1);
});

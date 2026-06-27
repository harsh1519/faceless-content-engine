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
const { pathToFileURL } = require("url");

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
const RENDER_ENGINE = (process.env.RENDER_ENGINE || "ffmpeg").toLowerCase();

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;
const MAX_CLIP_SECONDS = Number(process.env.MAX_CLIP_SECONDS || 2.2);
const MAX_PLANNED_CLIP_SECONDS = Number(process.env.MAX_PLANNED_CLIP_SECONDS || 4.5);
const DOWNLOAD_TIMEOUT_MS = Number(process.env.DOWNLOAD_TIMEOUT_MS || 30_000);
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

let remotionBundlePromise = null;

function log(msg, ...args) {
  console.log(`[renderer ${new Date().toISOString()}] ${msg}`, ...args);
}

function errorMessage(err) {
  return err instanceof Error ? err.message : String(err);
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
    .select("video_id, script, audio_path, broll_urls, visual_plan, status")
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
  if (!isHttpUrl(url)) {
    throw new Error(`Invalid clip URL: ${url || "(empty)"}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Download failed (${res.status}): ${url}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await fsp.writeFile(destPath, buffer);
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`Download timed out after ${DOWNLOAD_TIMEOUT_MS}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function ffprobeDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else {
        const duration = Number(metadata.format?.duration || 0);
        if (!Number.isFinite(duration) || duration <= 0) {
          reject(new Error(`Could not determine media duration for ${filePath}`));
          return;
        }
        resolve(duration);
      }
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

function buildSrt(script, totalSeconds, visualPlan = []) {
  const phrases = buildTimedPhrases(script, totalSeconds, visualPlan);
  let srt = "";

  phrases.forEach((phrase, i) => {
    srt += `${i + 1}\n`;
    srt += `${formatSrtTime(phrase.start)} --> ${formatSrtTime(phrase.end)}\n`;
    srt += `${phrase.text}\n\n`;
  });

  return srt;
}

function buildAss(script, totalSeconds, visualPlan = []) {
  const phrases = buildTimedPhrases(script, totalSeconds, visualPlan);
  const events = [];

  phrases.forEach((phrase) => {
    const overlay = phrase.overlay_text || shortOverlayFromText(phrase.text);
    const overlayStart = phrase.start;
    const overlayEnd = Math.min(phrase.end, phrase.start + 1.45);

    if (overlay && overlayEnd > overlayStart + 0.2) {
      events.push(
        `Dialogue: 1,${formatAssTime(overlayStart)},${formatAssTime(overlayEnd)},Overlay,,0,0,0,,${assText(overlay.toUpperCase(), 24)}`
      );
    }

    events.push(
      `Dialogue: 0,${formatAssTime(phrase.start)},${formatAssTime(phrase.end)},Caption,,0,0,0,,${assText(phrase.text, 34)}`
    );
  });

  const firstOverlay = phrases[0]?.overlay_text || shortOverlayFromText(phrases[0]?.text || "");
  if (firstOverlay) {
    events.unshift(
      `Dialogue: 2,${formatAssTime(0)},${formatAssTime(Math.min(1.15, totalSeconds))},Hook,,0,0,0,,${assText(firstOverlay.toUpperCase(), 22)}`
    );
  }

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${OUTPUT_WIDTH}
PlayResY: ${OUTPUT_HEIGHT}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Arial,58,&H00FFFFFF,&H000000FF,&H00101010,&HAA000000,-1,0,0,0,100,100,0,0,3,3,1,2,86,86,178,1
Style: Overlay,Arial,44,&H00FFFFFF,&H000000FF,&H00241610,&HBB111111,-1,0,0,0,100,100,1,0,3,2,0,8,92,92,122,1
Style: Hook,Arial,64,&H00FFFFFF,&H000000FF,&H00000000,&HE01C1410,-1,0,0,0,100,100,1,0,3,3,1,5,90,90,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;
}

function buildTimedPhrases(script, totalSeconds, visualPlan = []) {
  const plannedPhrases = visualPlan
    .filter((beat) => beat?.text && Number(beat.duration_seconds) > 0)
    .map((beat) => ({
      text: formatCaptionText(String(beat.text).trim(), beat.emphasis_terms),
      overlay_text: String(beat.overlay_text || "").trim(),
      duration: Number(beat.duration_seconds),
    }));
  const phrases =
    plannedPhrases.length > 0
      ? plannedPhrases
      : scriptToPhrases(script).map((text) => ({
          text: formatCaptionText(text),
          overlay_text: shortOverlayFromText(text),
          duration: 1,
        }));
  const durationTotal =
    phrases.reduce((sum, phrase) => sum + phrase.duration, 0) || phrases.length;
  let cursor = 0;

  return phrases.map((phrase, i) => {
    const slice = (phrase.duration / durationTotal) * totalSeconds;
    const start = cursor;
    const end = i === phrases.length - 1 ? totalSeconds : cursor + slice;
    cursor = end;
    return { ...phrase, start, end };
  });
}

function formatCaptionText(text, emphasisTerms = []) {
  const compact = text.replace(/\s+/g, " ").trim();
  const terms = Array.isArray(emphasisTerms)
    ? emphasisTerms.map((term) => String(term).trim()).filter(Boolean)
    : [];
  const words = compact.split(" ");

  return words
    .map((word) => {
      const normalized = word.replace(/[^\w-]/g, "").toLowerCase();
      const shouldEmphasize = terms.some(
        (term) => normalized === term.toLowerCase() || normalized.includes(term.toLowerCase())
      );
      return shouldEmphasize ? word.toUpperCase() : word;
    })
    .join(" ")
    .slice(0, 180);
}

function shortOverlayFromText(text) {
  return String(text || "")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 5)
    .join(" ")
    .slice(0, 42);
}

function formatAssTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function assText(text, lineLength) {
  const escaped = String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .trim();
  return wrapAssText(escaped, lineLength);
}

function wrapAssText(text, lineLength) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > lineLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines.slice(0, 3).join("\\N");
}

/** Build segment list looping broll until audio duration is covered. */
function planSegments(clips, audioDuration, visualPlan = []) {
  if (!clips.length) throw new Error("No broll clips available");
  if (!Number.isFinite(audioDuration) || audioDuration <= 0) {
    throw new Error("Audio duration is invalid");
  }

  const plannedSegments = planVisualSegments(clips, audioDuration, visualPlan);
  if (plannedSegments.length > 0) return plannedSegments;

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

function normalizeJobClips(brollUrls, visualPlan = []) {
  const byUrl = new Map();
  const allClips = [
    ...(Array.isArray(brollUrls) ? brollUrls : []),
    ...(Array.isArray(visualPlan)
      ? visualPlan.map((beat) => beat?.clip).filter(Boolean)
      : []),
  ];

  for (const clip of allClips) {
    const normalized = normalizeClip(clip);
    if (normalized && !byUrl.has(normalized.url)) {
      byUrl.set(normalized.url, normalized);
    }
  }

  return Array.from(byUrl.values());
}

function normalizeVisualPlanForRender(visualPlan) {
  if (!Array.isArray(visualPlan)) return [];

  return visualPlan
    .map((beat, index) => {
      const clip = normalizeClip(beat?.clip);
      return {
        beat_index: Number.isFinite(Number(beat?.beat_index))
          ? Number(beat.beat_index)
          : index,
        text: String(beat?.text ?? "").trim(),
        visual_query: String(beat?.visual_query ?? "").trim(),
        duration_seconds: Number.isFinite(Number(beat?.duration_seconds))
          ? Number(beat.duration_seconds)
          : 3,
        overlay_text: String(beat?.overlay_text ?? "").trim(),
        emphasis_terms: Array.isArray(beat?.emphasis_terms)
          ? beat.emphasis_terms.map(String).filter(Boolean)
          : [],
        visual_treatment: String(beat?.visual_treatment ?? "").trim(),
        pattern_interrupt: Boolean(beat?.pattern_interrupt),
        ...(clip && { clip }),
      };
    })
    .filter((beat) => beat.text || beat.clip)
    .slice(0, 80);
}

function normalizeClip(clip) {
  if (!clip || typeof clip !== "object") return null;
  const url = String(clip.url ?? "").trim();
  if (!isHttpUrl(url)) return null;

  const duration = Number(clip.duration);
  return {
    ...clip,
    url,
    duration: Number.isFinite(duration) && duration > 0 ? duration : MAX_CLIP_SECONDS,
  };
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function planVisualSegments(clips, audioDuration, visualPlan) {
  const beats = visualPlan.filter(
    (beat) => beat?.clip?.url && Number(beat.duration_seconds) > 0
  );
  if (!beats.length) return [];

  const segments = [];
  const durationTotal =
    beats.reduce((sum, beat) => sum + Number(beat.duration_seconds), 0) || beats.length;
  let total = 0;

  for (let i = 0; i < beats.length && total < audioDuration - 0.05; i++) {
    const beat = beats[i];
    const clip = beat.clip;
    const targetDuration =
      i === beats.length - 1
        ? audioDuration - total
        : (Number(beat.duration_seconds) / durationTotal) * audioDuration;
    const clipDur = Math.min(
      Math.max(targetDuration, 0.5),
      MAX_PLANNED_CLIP_SECONDS,
      clip.duration || MAX_PLANNED_CLIP_SECONDS
    );

    segments.push({
      url: clip.url,
      duration: clipDur,
      index: Number.isFinite(Number(beat.beat_index)) ? Number(beat.beat_index) : i,
      visual_treatment: beat.pattern_interrupt ? "snap_zoom" : beat.visual_treatment,
      pattern_interrupt: Boolean(beat.pattern_interrupt),
    });
    total += clipDur;
  }

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

const BASE_SCALE_FILTER = `scale=${Math.round(OUTPUT_WIDTH * 1.12)}:${Math.round(OUTPUT_HEIGHT * 1.12)}:force_original_aspect_ratio=increase`;
const COLOR_GRADE_FILTER = "eq=contrast=1.10:saturation=1.18:brightness=0.015,unsharp=5:5:0.45:3:3:0.20,noise=alls=2:allf=t,vignette=PI/6";

function buildClipFilters(segment, segmentIndex) {
  const treatment = segment.visual_treatment || "push_in";
  const crop = buildMotionCrop(treatment, segmentIndex);
  const fadeOutStart = Math.max(Number(segment.duration || 1) - 0.12, 0);

  return [
    BASE_SCALE_FILTER,
    crop,
    COLOR_GRADE_FILTER,
    "fps=30",
    "setsar=1",
    "fade=t=in:st=0:d=0.10",
    `fade=t=out:st=${fadeOutStart.toFixed(2)}:d=0.10`,
  ].join(",");
}

function buildMotionCrop(treatment, segmentIndex) {
  const centerX = "(iw-ow)/2";
  const centerY = "(ih-oh)/2";

  if (treatment === "side_pan") {
    const direction = segmentIndex % 2 === 0 ? 1 : -1;
    return `crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:x='${centerX}+${direction}*sin(n/35)*28':y='${centerY}'`;
  }

  if (treatment === "pull_out") {
    return `crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:x='${centerX}':y='${centerY}+cos(n/42)*18'`;
  }

  if (treatment === "snap_zoom") {
    return `crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:x='${centerX}+sin(n/12)*16':y='${centerY}+cos(n/12)*16'`;
  }

  return `crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:x='${centerX}':y='${centerY}-sin(n/45)*20'`;
}

async function trimAndScaleClip(inputPath, outputPath, segment, segmentIndex) {
  await runFfmpeg(
    ffmpeg(inputPath)
      .setStartTime(0)
      .duration(segment.duration)
      .videoFilters(buildClipFilters(segment, segmentIndex))
      .outputOptions(["-an", "-r", "30", "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p"])
      .output(outputPath)
  );
}

async function renderSegmentWithFallback(segment, i, workDir, fallbackClips) {
  const candidates = [
    segment,
    ...fallbackClips
      .filter((clip) => clip.url !== segment.url)
      .slice(0, 4)
      .map((clip) => ({
        url: clip.url,
        duration: Math.min(segment.duration, clip.duration || segment.duration),
        visual_treatment: segment.visual_treatment,
        pattern_interrupt: segment.pattern_interrupt,
      })),
  ];
  let lastError = null;

  for (let attempt = 0; attempt < candidates.length; attempt++) {
    const candidate = candidates[attempt];
    const rawPath = path.join(workDir, `raw-${i}-${attempt}.mp4`);
    const segPath = path.join(workDir, `seg-${i}.mp4`);

    try {
      await downloadUrl(candidate.url, rawPath);
      await trimAndScaleClip(rawPath, segPath, candidate, i);
      if (attempt > 0) {
        log(`  Clip ${i + 1}: recovered with fallback clip`);
      }
      return segPath;
    } catch (err) {
      lastError = err;
      log(`  Clip ${i + 1}: attempt ${attempt + 1} failed (${errorMessage(err)})`);
    }
  }

  throw new Error(`All clip attempts failed for segment ${i + 1}: ${errorMessage(lastError)}`);
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

async function muxFinalVideo(videoPath, audioPath, assPath, outputPath, totalSeconds) {
  const escapedAss = assPath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
  const progressWidth = Math.max(1, OUTPUT_WIDTH - 160);
  const finalFilter = [
    "drawbox=x=0:y=0:w=iw:h=ih:color=black@0.10:t=fill",
    "drawbox=x=48:y=70:w=984:h=116:color=black@0.32:t=fill",
    "drawbox=x=58:y=80:w=964:h=96:color=white@0.05:t=fill",
    "drawbox=x=70:y=1715:w=940:h=190:color=black@0.34:t=fill",
    `drawbox=x=80:y=1840:w='min(${progressWidth},${progressWidth}*t/${Math.max(totalSeconds, 1).toFixed(3)})':h=8:color=white@0.92:t=fill`,
    `subtitles='${escapedAss}'`,
  ].join(",");

  await runFfmpeg(
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .videoFilters(finalFilter)
      .outputOptions([
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
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

async function renderFfmpegOverlayVideo({
  videoPath,
  audioPath,
  outputPath,
  script,
  totalSeconds,
  visualPlan,
  workDir,
}) {
  const assPath = path.join(workDir, "captions.ass");
  await fsp.writeFile(
    assPath,
    buildAss(script, totalSeconds, visualPlan),
    "utf8"
  );
  await muxFinalVideo(videoPath, audioPath, assPath, outputPath, totalSeconds);
}

async function renderRemotionVideo({
  videoPath,
  audioPath,
  outputPath,
  script,
  totalSeconds,
  visualPlan,
}) {
  const { renderMedia, selectComposition } = loadRemotionRenderer();
  const serveUrl = await getRemotionBundle();
  const inputProps = {
    videoSrc: pathToFileURL(videoPath).href,
    audioSrc: pathToFileURL(audioPath).href,
    durationSeconds: totalSeconds,
    scenes: buildRemotionScenes(script, totalSeconds, visualPlan),
  };
  const composition = await selectComposition({
    serveUrl,
    id: "InvideoShort",
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    chromiumOptions: {
      ignoreCertificateErrors: true,
    },
  });
}

function loadRemotionRenderer() {
  try {
    return {
      ...require("@remotion/renderer"),
      ...require("@remotion/bundler"),
    };
  } catch (err) {
    throw new Error(
      `Remotion packages are not installed. Run install later in renderer/ or set RENDER_ENGINE=ffmpeg. ${errorMessage(err)}`
    );
  }
}

async function getRemotionBundle() {
  if (!remotionBundlePromise) {
    const { bundle } = loadRemotionRenderer();
    remotionBundlePromise = bundle({
      entryPoint: path.join(__dirname, "remotion", "index.jsx"),
    });
  }
  return remotionBundlePromise;
}

function buildRemotionScenes(script, totalSeconds, visualPlan) {
  return buildTimedPhrases(script, totalSeconds, visualPlan).map((phrase, index) => {
    const beat = visualPlan[index] ?? {};
    return {
      start: phrase.start,
      end: phrase.end,
      captionText: phrase.text,
      overlayText: phrase.overlay_text || shortOverlayFromText(phrase.text),
      visualTreatment: beat.visual_treatment || "push_in",
      patternInterrupt: Boolean(beat.pattern_interrupt),
    };
  });
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
  const {
    video_id: videoId,
    script,
    audio_path: audioPath,
    broll_urls: brollUrls,
    visual_plan: visualPlan,
  } = job;

  if (!audioPath) throw new Error("Missing audio_path");

  const renderVisualPlan = normalizeVisualPlanForRender(visualPlan);
  const clips = normalizeJobClips(brollUrls, renderVisualPlan);
  if (!clips.length) {
    throw new Error("No usable B-roll clips available");
  }

  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), `render-${videoId}-`));
  log(`Processing ${videoId} in ${workDir}`);

  try {
    const ext = path.extname(audioPath) || ".mp3";
    const localAudio = path.join(workDir, `input-audio${ext}`);
    await copyAudioToWorkdir(audioPath, localAudio);
    const audioDuration = await ffprobeDuration(localAudio);
    log(`Audio duration: ${audioDuration.toFixed(1)}s`);

    const segments = planSegments(clips, audioDuration, renderVisualPlan);
    const segmentPaths = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      log(`  Clip ${i + 1}/${segments.length} (${seg.duration.toFixed(1)}s)`);
      const segPath = await renderSegmentWithFallback(seg, i, workDir, clips);
      segmentPaths.push(segPath);
    }

    if (!segmentPaths.length) {
      throw new Error("No video segments were rendered");
    }

    const concatPath = path.join(workDir, "concat.mp4");
    await concatSegments(segmentPaths, concatPath);

    const outputPath = path.join(workDir, "output.mp4");
    if (RENDER_ENGINE === "remotion") {
      try {
        await renderRemotionVideo({
          videoPath: concatPath,
          audioPath: localAudio,
          outputPath,
          script: script || "",
          totalSeconds: audioDuration,
          visualPlan: renderVisualPlan,
        });
      } catch (err) {
        log(`Remotion render failed, falling back to FFmpeg overlay: ${errorMessage(err)}`);
        await renderFfmpegOverlayVideo({
          videoPath: concatPath,
          audioPath: localAudio,
          outputPath,
          script: script || "",
          totalSeconds: audioDuration,
          visualPlan: renderVisualPlan,
          workDir,
        });
      }
    } else {
      await renderFfmpegOverlayVideo({
        videoPath: concatPath,
        audioPath: localAudio,
        outputPath,
        script: script || "",
        totalSeconds: audioDuration,
        visualPlan: renderVisualPlan,
        workDir,
      });
    }

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
      const message = errorMessage(err);
      log(`FAILED ${job.video_id}: ${message}`);
      try {
        await setStatus(job.video_id, "failed");
      } catch (statusErr) {
        log(`Could not mark failed: ${errorMessage(statusErr)}`);
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
      log(`Queue error: ${errorMessage(err)}`);
    }

    if (RUN_ONCE) break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  } while (true);
}

main().catch((err) => {
  console.error("[renderer] Fatal:", err);
  process.exit(1);
});

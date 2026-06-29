export interface BrollClip {
  id: number;
  url: string;
  width: number;
  height: number;
  duration: number;
  photographer?: string;
  quality_score?: number;
  media_type?: "video" | "image";
  source?: "pexels" | "unsplash" | "wikimedia" | "nasa" | "openverse";
  alt?: string;
}

const PEXELS_API = "https://api.pexels.com/videos/search";

interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

interface PexelsVideo {
  id: number;
  duration: number;
  user: { name: string };
  video_files: PexelsVideoFile[];
}

export async function fetchPortraitClips(
  keywords: string[],
  perPage = 5
): Promise<BrollClip[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error("PEXELS_API_KEY is not configured");
  }

  const query = keywords.filter(Boolean).join(" ").trim();
  if (!query) {
    throw new Error("At least one keyword is required");
  }

  const params = new URLSearchParams({
    query,
    orientation: "portrait",
    per_page: String(perPage),
  });

  const res = await fetch(`${PEXELS_API}?${params}`, {
    headers: { Authorization: apiKey },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pexels API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { videos?: PexelsVideo[] };
  const clips: BrollClip[] = [];

  for (const video of data.videos ?? []) {
    const file = pickBestPortraitFile(video.video_files);
    if (!file) continue;

    clips.push({
      id: video.id,
      url: file.link,
      width: file.width,
      height: file.height,
      duration: video.duration,
      photographer: video.user?.name,
      quality_score: scoreClip(file, video.duration),
      media_type: "video",
      source: "pexels",
    });
  }

  return clips.sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));
}

function pickBestPortraitFile(
  files: PexelsVideoFile[]
): PexelsVideoFile | null {
  const mp4Portrait = files.filter(
    (f) =>
      f.file_type === "video/mp4" &&
      f.height >= f.width &&
      f.height >= 720
  );

  if (mp4Portrait.length === 0) {
    return (
      files.find((f) => f.file_type === "video/mp4" && f.height >= f.width) ??
      files.find((f) => f.file_type === "video/mp4") ??
      null
    );
  }

  const practicalPortrait = mp4Portrait.filter((f) => f.height <= 1280);
  const candidates = practicalPortrait.length > 0 ? practicalPortrait : mp4Portrait;

  return candidates.sort((a, b) => scoreFileForDownload(b) - scoreFileForDownload(a))[0];
}

function scoreFileForDownload(file: PexelsVideoFile): number {
  const verticalRatio = file.height / Math.max(file.width, 1);
  const targetHeightScore = 100 - Math.abs(file.height - 1080) / 12;
  const verticalScore = Math.min(verticalRatio / 1.75, 1.2) * 20;
  const qualityPenalty = file.height > 1280 ? 25 : 0;

  return targetHeightScore + verticalScore - qualityPenalty;
}

function scoreClip(file: PexelsVideoFile, duration: number): number {
  const verticalRatio = file.height / Math.max(file.width, 1);
  const resolutionScore = Math.max(0, 40 - Math.abs(file.height - 1080) / 24);
  const verticalScore = Math.min(verticalRatio / 1.75, 1.2) * 30;
  const durationScore =
    duration >= 2 && duration <= 12
      ? 20
      : duration > 12 && duration <= 25
        ? 12
        : 5;
  const qualityScore =
    file.quality === "hd" || file.quality === "uhd" ? 10 : 4;
  const hugeFilePenalty = file.height > 1280 ? 25 : 0;

  return Math.round(
    resolutionScore + verticalScore + durationScore + qualityScore - hugeFilePenalty
  );
}

export interface BrollClip {
  id: number;
  url: string;
  width: number;
  height: number;
  duration: number;
  photographer?: string;
  quality_score?: number;
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

  return mp4Portrait.sort((a, b) => b.height - a.height)[0];
}

function scoreClip(file: PexelsVideoFile, duration: number): number {
  const verticalRatio = file.height / Math.max(file.width, 1);
  const resolutionScore = Math.min(file.height / 1920, 1.4) * 40;
  const verticalScore = Math.min(verticalRatio / 1.75, 1.2) * 30;
  const durationScore =
    duration >= 2 && duration <= 12
      ? 20
      : duration > 12 && duration <= 25
        ? 12
        : 5;
  const qualityScore =
    file.quality === "hd" || file.quality === "uhd" ? 10 : 4;

  return Math.round(resolutionScore + verticalScore + durationScore + qualityScore);
}

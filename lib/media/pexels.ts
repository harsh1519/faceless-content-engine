export interface BrollClip {
  id: number;
  url: string;
  width: number;
  height: number;
  duration: number;
  photographer?: string;
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
    });
  }

  return clips;
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

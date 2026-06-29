import type { BrollClip } from "@/lib/media/pexels";

type ImageSource = "unsplash" | "wikimedia" | "nasa" | "openverse";

interface MediaSearchInput {
  query: string;
  source: ImageSource;
}

export async function fetchFreeImageAsset(
  input: MediaSearchInput
): Promise<BrollClip | null> {
  const query = input.query.trim();
  if (!query) return null;

  switch (input.source) {
    case "unsplash":
      return fetchUnsplashImage(query);
    case "wikimedia":
      return fetchWikimediaImage(query);
    case "nasa":
      return fetchNasaImage(query);
    case "openverse":
      return fetchOpenverseImage(query);
    default:
      return null;
  }
}

async function fetchUnsplashImage(query: string): Promise<BrollClip | null> {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    query,
    orientation: "portrait",
    per_page: "5",
    content_filter: "high",
  });
  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${apiKey}` },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    results?: Array<{
      id: string;
      width: number;
      height: number;
      alt_description?: string | null;
      urls?: { regular?: string; full?: string };
      user?: { name?: string };
    }>;
  };
  const item = (data.results ?? []).find((photo) => photo.urls?.regular);
  if (!item?.urls?.regular) return null;

  return imageClip({
    id: item.id,
    url: item.urls.regular,
    width: item.width,
    height: item.height,
    source: "unsplash",
    photographer: item.user?.name,
    alt: item.alt_description ?? query,
  });
}

async function fetchWikimediaImage(query: string): Promise<BrollClip | null> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `${query} file`,
    gsrnamespace: "6",
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url|size|mime",
    iiurlwidth: "1400",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": "FacelessContentEngine/1.0" },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title?: string;
          imageinfo?: Array<{
            thumburl?: string;
            url?: string;
            width?: number;
            height?: number;
            mime?: string;
          }>;
        }
      >;
    };
  };
  const pages = Object.values(data.query?.pages ?? {});
  const image = pages
    .map((page) => ({ page, info: page.imageinfo?.[0] }))
    .find(({ info }) => info?.mime?.startsWith("image/") && (info.thumburl || info.url));
  if (!image?.info) return null;

  return imageClip({
    id: image.page.title ?? image.info.url ?? query,
    url: image.info.thumburl ?? image.info.url!,
    width: image.info.width ?? 1400,
    height: image.info.height ?? 1400,
    source: "wikimedia",
    photographer: "Wikimedia Commons",
    alt: image.page.title ?? query,
  });
}

async function fetchNasaImage(query: string): Promise<BrollClip | null> {
  const params = new URLSearchParams({
    q: query,
    media_type: "image",
    page_size: "8",
  });
  const res = await fetch(`https://images-api.nasa.gov/search?${params}`);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    collection?: {
      items?: Array<{
        href?: string;
        links?: Array<{ href?: string; render?: string }>;
        data?: Array<{ title?: string }>;
      }>;
    };
  };
  const item = (data.collection?.items ?? []).find((entry) =>
    entry.links?.some((link) => link.href && link.render === "image")
  );
  const href = item?.links?.find((link) => link.href && link.render === "image")?.href;
  if (!href) return null;

  return imageClip({
    id: item?.href ?? href,
    url: href,
    width: 1400,
    height: 1400,
    source: "nasa",
    photographer: "NASA",
    alt: item?.data?.[0]?.title ?? query,
  });
}

async function fetchOpenverseImage(query: string): Promise<BrollClip | null> {
  const params = new URLSearchParams({
    q: query,
    page_size: "8",
    mature: "false",
  });
  const res = await fetch(`https://api.openverse.engineering/v1/images/?${params}`, {
    headers: { "User-Agent": "FacelessContentEngine/1.0" },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    results?: Array<{
      id: string;
      url?: string;
      thumbnail?: string;
      width?: number;
      height?: number;
      title?: string;
      creator?: string;
    }>;
  };
  const item = (data.results ?? []).find((result) => result.url || result.thumbnail);
  if (!item) return null;

  return imageClip({
    id: item.id,
    url: item.url ?? item.thumbnail!,
    width: item.width ?? 1400,
    height: item.height ?? 1400,
    source: "openverse",
    photographer: item.creator,
    alt: item.title ?? query,
  });
}

function imageClip(input: {
  id: string;
  url: string;
  width: number;
  height: number;
  source: ImageSource;
  photographer?: string;
  alt?: string;
}): BrollClip {
  return {
    id: stableNumericId(`${input.source}:${input.id}`),
    url: input.url,
    width: input.width,
    height: input.height,
    duration: 4,
    photographer: input.photographer,
    media_type: "image",
    source: input.source,
    alt: input.alt,
    quality_score: scoreImage(input.width, input.height),
  };
}

function stableNumericId(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function scoreImage(width: number, height: number): number {
  const verticalRatio = height / Math.max(width, 1);
  const sizeScore = Math.min(Math.max(width, height) / 1600, 1.2) * 50;
  const verticalScore = Math.min(verticalRatio / 1.4, 1.2) * 30;
  return Math.round(sizeScore + verticalScore);
}

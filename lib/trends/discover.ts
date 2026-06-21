import type { Channel } from "@/lib/supabase/types";

/** Reddit requires a descriptive User-Agent (see https://github.com/reddit-archive/reddit/wiki/api) */
const REDDIT_UA =
  "FacelessContentEngine/1.0 (local dashboard; https://github.com/)";

export interface DiscoveredTrendRow {
  source: string;
  keyword: string;
  hook_text: string;
  velocity_score: number;
  predicted_epc: number;
  channel_id: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function heuristicEpcFromScore(score: number): number {
  const s = clamp(score, 0, 50000);
  return Math.round((0.12 + Math.log10(s + 10) * 0.045) * 100) / 100;
}

function velocityFromRedditScore(score: number): number {
  return clamp(Math.round(35 + Math.log10(score + 20) * 22), 30, 98);
}

function velocityFromGoogleValue(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 55;
  return clamp(Math.round(40 + Math.log10(value + 1) * 18), 40, 99);
}

function nicheToSubreddits(niche: string): string[] {
  const n = niche.toLowerCase();
  const rules: Array<[string[], string[]]> = [
    [
      ["finance", "wealth", "money", "invest", "budget", "debt", "saving"],
      ["personalfinance", "wallstreetbets"],
    ],
    [
      ["beauty", "skin", "glow", "makeup", "hair", "cosmetic"],
      ["SkincareAddiction", "MakeupAddiction"],
    ],
    [
      ["tech", "gadget", "phone", "software", "code", "ai", "crypto"],
      ["technology", "gadgets"],
    ],
    [
      ["fitness", "gym", "workout", "health", "weight", "muscle"],
      ["Fitness", "loseit"],
    ],
    [["food", "recipe", "cook", "kitchen", "eat"], ["food", "Cooking"]],
    [["game", "gaming", "esport", "nintendo", "playstation"], ["gaming", "Games"]],
  ];
  for (const [keys, subs] of rules) {
    if (keys.some((k) => n.includes(k))) return subs;
  }
  return ["videos", "InternetIsBeautiful"];
}

async function fetchRedditHot(
  subreddit: string,
  limit = 10
): Promise<Array<{ title: string; score: number; hook: string }>> {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/hot.json?limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": REDDIT_UA,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const j = (await res.json()) as {
    data?: { children?: Array<{ data?: { title?: string; score?: number; selftext?: string; stickied?: boolean } }> };
  };
  const children = j?.data?.children ?? [];
  const out: Array<{ title: string; score: number; hook: string }> = [];
  for (const c of children) {
    const d = c.data;
    if (!d?.title || d.stickied) continue;
    const title = d.title.slice(0, 200);
    const hook = (d.selftext?.trim() || d.title).slice(0, 280);
    out.push({ title, score: d.score ?? 0, hook });
  }
  return out;
}

function parseGoogleRelatedQueries(
  jsonStr: string
): Array<{ query: string; value: number }> {
  try {
    const j = JSON.parse(jsonStr) as {
      default?: {
        rankedList?: Array<{ rankedKeyword?: Array<{ query?: string; value?: number }> }>;
      };
    };
    const ranked =
      j?.default?.rankedList?.[0]?.rankedKeyword ??
      j?.default?.rankedList?.flatMap((x) => x.rankedKeyword ?? []) ??
      [];
    if (!Array.isArray(ranked)) return [];
    return ranked
      .filter((x) => x?.query && typeof x.query === "string")
      .map((x) => ({
        query: String(x.query).slice(0, 120),
        value:
          typeof x.value === "number" && Number.isFinite(x.value) && x.value > 0
            ? x.value
            : 50,
      }))
      .slice(0, 10);
  } catch {
    return [];
  }
}

async function fetchGoogleRelated(
  keyword: string,
  geo = "US"
): Promise<Array<{ query: string; value: number }>> {
  const kw = keyword.trim().slice(0, 100);
  if (!kw) return [];
  // google-trends-api is CommonJS; keep dynamic require for Next bundling
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const googleTrends = require("google-trends-api") as {
    relatedQueries: (opts: { keyword: string; geo?: string }) => Promise<string>;
  };
  const raw = await googleTrends.relatedQueries({ keyword: kw, geo });
  return parseGoogleRelatedQueries(raw);
}

/**
 * Pull free public signals: Reddit (niche-mapped + r/tiktok), Google Trends related queries
 * (niche + TikTok-flavoured query). TikTok does not expose a stable free official trends API;
 * we surface TikTok-relevant chatter via r/tiktok + Google “tiktok …” related searches.
 */
export async function discoverTrendsForChannel(
  channel: Channel
): Promise<DiscoveredTrendRow[]> {
  const seen = new Set<string>();
  const rows: DiscoveredTrendRow[] = [];
  const cid = channel.channel_id;

  const push = (r: Omit<DiscoveredTrendRow, "channel_id">) => {
    const key = r.keyword.toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    rows.push({ ...r, channel_id: cid });
  };

  const niche = channel.niche_type || channel.name || "shorts";
  const nicheHead = niche.split(/[,;]/)[0]?.trim() || niche;

  // --- Reddit (niche) ---
  const subs = nicheToSubreddits(niche);
  for (const sub of subs.slice(0, 2)) {
    const posts = await fetchRedditHot(sub, 12);
    for (const p of posts.slice(0, 6)) {
      push({
        source: `Reddit (r/${sub})`,
        keyword: p.title,
        hook_text:
          p.hook.length > 40
            ? `${p.hook.slice(0, 220)}…`
            : `From r/${sub}: ${p.hook}`,
        velocity_score: velocityFromRedditScore(p.score),
        predicted_epc: heuristicEpcFromScore(p.score),
      });
    }
  }

  const tikPosts = await fetchRedditHot("TikTok", 12);
  for (const p of tikPosts.slice(0, 6)) {
    push({
      source: "TikTok / Reddit (r/TikTok)",
      keyword: p.title,
      hook_text: `From r/TikTok: ${p.hook.slice(0, 220)}`,
      velocity_score: velocityFromRedditScore(p.score),
      predicted_epc: heuristicEpcFromScore(p.score),
    });
  }

  // --- Google Trends (niche) ---
  try {
    const gNiche = await fetchGoogleRelated(nicheHead);
    for (const g of gNiche.slice(0, 5)) {
      push({
        source: "Google Trends",
        keyword: g.query,
        hook_text:
          "Related search interest (US). Use Script Review to turn this into a hook and CTA.",
        velocity_score: velocityFromGoogleValue(g.value),
        predicted_epc: clamp(0.2 + Math.min(g.value, 120) / 500, 0.15, 0.75),
      });
    }
  } catch {
    // Google Trends can fail (rate limit, network); other sources still succeed
  }

  // --- Google Trends (TikTok + niche wording) ---
  try {
    const gTok = await fetchGoogleRelated(`tiktok ${nicheHead}`.slice(0, 100));
    for (const g of gTok.slice(0, 4)) {
      push({
        source: "Google Trends (TikTok-related)",
        keyword: g.query,
        hook_text:
          "Search interest tied to TikTok + your niche — verify on TikTok before scripting.",
        velocity_score: velocityFromGoogleValue(g.value),
        predicted_epc: clamp(0.22 + Math.min(g.value, 120) / 480, 0.15, 0.78),
      });
    }
  } catch {
    // ignore
  }

  return rows.slice(0, 28);
}

import Parser from "rss-parser";
import type { NewsBriefing, NewsItem } from "./types";

const parser = new Parser({ timeout: 8000 });

type HnHit = {
  title?: string;
  story_title?: string;
  url?: string;
  story_url?: string;
  objectID: string;
  created_at: string;
  points?: number;
};

const AI_QUERY =
  '(AI OR "artificial intelligence" OR LLM OR Claude OR OpenAI OR Anthropic OR Gemini)';

async function getAiNews(limit: number): Promise<NewsItem[]> {
  const url = new URL("https://hn.algolia.com/api/v1/search_by_date");
  url.searchParams.set("query", AI_QUERY);
  url.searchParams.set("tags", "story");
  url.searchParams.set("numericFilters", "points>40");
  url.searchParams.set("hitsPerPage", String(limit * 2));

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`hn: ${res.status}`);
  const data = (await res.json()) as { hits: HnHit[] };

  const items: NewsItem[] = [];
  const seen = new Set<string>();
  for (const hit of data.hits) {
    const title = hit.title ?? hit.story_title;
    const url = hit.url ?? hit.story_url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`;
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      title,
      source: "Hacker News",
      url,
      publishedAt: hit.created_at,
    });
    if (items.length >= limit) break;
  }
  return items;
}

async function getLocalNews(limit: number): Promise<NewsItem[]> {
  const feeds = (process.env.LOCAL_NEWS_FEEDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (feeds.length === 0) return [];

  const results = await Promise.allSettled(
    feeds.map(async (feedUrl) => {
      const res = await fetch(feedUrl, {
        cache: "no-store",
        headers: { "user-agent": "OakwindRustle/0.1 (+briefing)" },
      });
      if (!res.ok) throw new Error(`${feedUrl}: ${res.status}`);
      const text = await res.text();
      return parser.parseString(text);
    }),
  );

  const items: NewsItem[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    const feed = r.value;
    const source = feed.title ?? "Local";
    for (const entry of feed.items.slice(0, limit)) {
      if (!entry.title || !entry.link) continue;
      items.push({
        title: entry.title,
        source,
        url: entry.link,
        publishedAt: entry.isoDate,
      });
    }
  }

  items.sort((a, b) => {
    const at = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bt = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bt - at;
  });

  return items.slice(0, limit);
}

function speakList(label: string, items: NewsItem[]): string {
  if (items.length === 0) return `No ${label} stories right now.`;
  const lines = items
    .map((item, i) => `${i + 1}. ${item.title}. From ${item.source}.`)
    .join(" ");
  return `${label}: ${lines}`;
}

export async function getNews(): Promise<NewsBriefing> {
  const aiLimit = Number(process.env.AI_NEWS_LIMIT ?? "5");
  const localLimit = Number(process.env.LOCAL_NEWS_LIMIT ?? "5");

  const [aiRes, localRes] = await Promise.allSettled([
    getAiNews(aiLimit),
    getLocalNews(localLimit),
  ]);

  const ai = aiRes.status === "fulfilled" ? aiRes.value : [];
  const local = localRes.status === "fulfilled" ? localRes.value : [];

  const spoken = [speakList("Local headlines", local), speakList("AI headlines", ai)].join(
    " ",
  );

  return { local, ai, spoken };
}

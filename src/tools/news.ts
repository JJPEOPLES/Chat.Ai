import { env } from "@/lib/env";
import { optionalToolDisabled, fetchJson } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

type NewsResult = {
  news?: Array<{ title: string; text?: string; url?: string }>;
};

export const newsTool: ToolDefinition = {
  id: "news",
  label: "World News",
  description: "Latest headlines from World News API when enabled.",
  keywords: ["news", "headline", "current events", "world news"],
  status: env.WORLD_NEWS_API_KEY ? "available" : "optional",
  env: ["WORLD_NEWS_API_KEY"],
  publicFriendly: false,
  async execute(query) {
    if (!env.WORLD_NEWS_API_KEY) {
      return optionalToolDisabled(
        "World News",
        "Add WORLD_NEWS_API_KEY to enable live news."
      );
    }

    const url = new URL("https://api.worldnewsapi.com/search-news");
    url.searchParams.set("text", query);
    url.searchParams.set("language", "en");
    url.searchParams.set("api-key", env.WORLD_NEWS_API_KEY);
    const data = await fetchJson<NewsResult>(url.toString());
    const items = data.news?.slice(0, 5) ?? [];

    return {
      tool: "World News",
      ok: true,
      summary: items.map((item) => `${item.title} — ${item.text ?? item.url ?? ""}`).join("\n"),
      data: items,
    };
  },
};

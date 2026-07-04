import { env } from "@/lib/env";
import { optionalToolDisabled, fetchJson } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

type SerpResult = {
  organic_results?: Array<{ title: string; link: string; snippet?: string }>;
};

export const webSearchTool: ToolDefinition = {
  id: "web-search",
  label: "Web Search",
  description: "General live web search using SerpApi when configured.",
  keywords: ["search", "google", "find", "web", "look up", "latest"],
  status: env.SERPAPI_KEY ? "available" : "optional",
  env: ["SERPAPI_KEY"],
  publicFriendly: false,
  async execute(query) {
    if (!env.SERPAPI_KEY) {
      return optionalToolDisabled(
        "Web Search",
        "Add SERPAPI_KEY to enable live search results."
      );
    }

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", query);
    url.searchParams.set("api_key", env.SERPAPI_KEY);
    const data = await fetchJson<SerpResult>(url.toString());
    const top = data.organic_results?.slice(0, 5) ?? [];

    return {
      tool: "Web Search",
      ok: true,
      summary: top.map((item) => `${item.title} — ${item.snippet ?? item.link}`).join("\n"),
      data: top,
    };
  },
};

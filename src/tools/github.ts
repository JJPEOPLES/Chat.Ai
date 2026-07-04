import { fetchJson } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

type RepoSearch = {
  items?: Array<{ full_name: string; description: string | null; html_url: string; stargazers_count: number }>;
};

export const githubTool: ToolDefinition = {
  id: "github",
  label: "GitHub",
  description: "Public repository search via the free GitHub REST API.",
  keywords: ["github", "repo", "repository", "code", "open source"],
  status: "available",
  publicFriendly: true,
  async execute(query) {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=5`;
    const data = await fetchJson<RepoSearch>(url, {
      headers: { "User-Agent": "Chat.ai" },
    });

    return {
      tool: "GitHub",
      ok: true,
      summary: (data.items ?? [])
        .map((repo) => `${repo.full_name} ★${repo.stargazers_count} — ${repo.description ?? repo.html_url}`)
        .join("\n"),
      data: data.items ?? [],
    };
  },
};

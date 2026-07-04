import { env } from "@/lib/env";
import { optionalToolDisabled, fetchJson } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

type NetlifySite = Array<{ name: string; url: string; state: string }>;

export const netlifyTool: ToolDefinition = {
  id: "netlify",
  label: "Netlify",
  description: "Deployment status and site listing when a token is added.",
  keywords: ["deploy", "netlify", "site status", "publish"],
  status: env.NETLIFY_API_TOKEN ? "available" : "optional",
  env: ["NETLIFY_API_TOKEN"],
  publicFriendly: false,
  async execute() {
    if (!env.NETLIFY_API_TOKEN) {
      return optionalToolDisabled(
        "Netlify",
        "Add NETLIFY_API_TOKEN to manage deployments."
      );
    }

    const data = await fetchJson<NetlifySite>("https://api.netlify.com/api/v1/sites", {
      headers: { Authorization: `Bearer ${env.NETLIFY_API_TOKEN}` },
    });

    return {
      tool: "Netlify",
      ok: true,
      summary: data.slice(0, 5).map((site) => `${site.name} — ${site.state} — ${site.url}`).join("\n"),
      data,
    };
  },
};

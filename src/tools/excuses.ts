import { fetchJson } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

type ExcuseResponse = Array<{ excuse: string; category: string }>;

export const excusesTool: ToolDefinition = {
  id: "excuses",
  label: "Excuser",
  description: "Random excuses from a free public API.",
  keywords: ["excuse", "random excuse", "funny"],
  status: "available",
  publicFriendly: true,
  async execute() {
    const data = await fetchJson<ExcuseResponse>("https://excuser-three.vercel.app/v1/excuse");
    const excuse = data[0];
    return {
      tool: "Excuser",
      ok: true,
      summary: `${excuse.excuse} (${excuse.category})`,
      data: excuse,
    };
  },
};

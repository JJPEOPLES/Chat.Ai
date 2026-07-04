import type { ToolDefinition } from "@/lib/types";

export const cleverbotTool: ToolDefinition = {
  id: "cleverbot",
  label: "Cleverbot",
  description: "Legacy fallback tool slot kept optional by default.",
  keywords: ["cleverbot", "casual bot", "chit chat"],
  status: "disabled",
  publicFriendly: false,
  async execute() {
    return {
      tool: "Cleverbot",
      ok: false,
      summary: "Cleverbot is intentionally disabled by default in this build.",
    };
  },
};

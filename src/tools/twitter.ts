import { env } from "@/lib/env";
import { optionalToolDisabled } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

export const twitterTool: ToolDefinition = {
  id: "twitter",
  label: "Twitter/X",
  description: "Optional X lookup when a bearer token is configured.",
  keywords: ["twitter", "x", "tweet", "social post"],
  status: env.TWITTER_BEARER_TOKEN ? "available" : "optional",
  env: ["TWITTER_BEARER_TOKEN"],
  publicFriendly: false,
  async execute() {
    return optionalToolDisabled(
      "Twitter/X",
      "Add TWITTER_BEARER_TOKEN to enable X API access."
    );
  },
};

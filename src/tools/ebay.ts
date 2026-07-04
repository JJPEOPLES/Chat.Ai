import { env } from "@/lib/env";
import { optionalToolDisabled } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

export const ebayTool: ToolDefinition = {
  id: "ebay",
  label: "eBay",
  description: "Optional shopping search for eBay.",
  keywords: ["shop", "buy", "price", "ebay", "product"],
  status: env.EBAY_APP_ID ? "available" : "optional",
  env: ["EBAY_APP_ID"],
  publicFriendly: false,
  async execute() {
    return optionalToolDisabled(
      "eBay",
      "Add EBAY_APP_ID to enable marketplace search."
    );
  },
};

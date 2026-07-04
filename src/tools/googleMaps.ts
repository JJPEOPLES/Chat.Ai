import { env } from "@/lib/env";
import { optionalToolDisabled } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

export const googleMapsTool: ToolDefinition = {
  id: "google-maps",
  label: "Google Maps",
  description: "Optional Google Maps support when configured.",
  keywords: ["google maps", "route", "street view"],
  status: env.GOOGLE_MAPS_API_KEY ? "available" : "optional",
  env: ["GOOGLE_MAPS_API_KEY"],
  publicFriendly: false,
  async execute() {
    return optionalToolDisabled(
      "Google Maps",
      "Add GOOGLE_MAPS_API_KEY to enable Google Maps requests."
    );
  },
};

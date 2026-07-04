import { env } from "@/lib/env";
import { optionalToolDisabled, fetchJson } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

type MapboxResponse = {
  features?: Array<{ place_name: string; center: [number, number] }>;
};

export const mapsTool: ToolDefinition = {
  id: "maps",
  label: "Mapbox",
  description: "Map search and geocoding when Mapbox is configured.",
  keywords: ["map", "location", "directions", "near me", "place"],
  status: env.MAPBOX_TOKEN ? "available" : "optional",
  env: ["MAPBOX_TOKEN"],
  publicFriendly: false,
  async execute(query) {
    if (!env.MAPBOX_TOKEN) {
      return optionalToolDisabled("Mapbox", "Add MAPBOX_TOKEN to enable geocoding.");
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${env.MAPBOX_TOKEN}&limit=3`;
    const data = await fetchJson<MapboxResponse>(url);
    const items = data.features ?? [];

    return {
      tool: "Mapbox",
      ok: items.length > 0,
      summary: items
        .map((item) => `${item.place_name} (${item.center[1]}, ${item.center[0]})`)
        .join("\n"),
      data: items,
    };
  },
};

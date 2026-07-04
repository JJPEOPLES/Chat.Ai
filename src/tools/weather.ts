import { fetchJson } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

type CountryLookup = { country?: string };

export const weatherTool: ToolDefinition = {
  id: "weather",
  label: "7Timer",
  description: "Quick weather forecast using the free 7Timer API.",
  keywords: ["weather", "forecast", "temperature", "rain", "storm"],
  status: "available",
  publicFriendly: true,
  async execute() {
    const defaultLat = "40.7128";
    const defaultLon = "-74.006";
    const url = `https://www.7timer.info/bin/api.pl?lon=${defaultLon}&lat=${defaultLat}&product=civillight&output=json`;
    const data = await fetchJson<{ dataseries?: Array<{ weather: string; temp2m: { max: number; min: number } }> }>(url);
    const next = data.dataseries?.slice(0, 3) ?? [];

    return {
      tool: "7Timer",
      ok: true,
      summary: next
        .map((item, index) => `Day ${index + 1}: ${item.weather}, high ${item.temp2m.max}°C, low ${item.temp2m.min}°C`)
        .join("\n"),
      data,
    };
  },
};

export const countryLookupTool: ToolDefinition = {
  id: "country",
  label: "Country.is",
  description: "Simple location country lookup via public IP.",
  keywords: ["country", "where am i", "location detection", "region"],
  status: "available",
  publicFriendly: true,
  async execute() {
    const data = await fetchJson<CountryLookup>("https://api.country.is/");
    return {
      tool: "Country.is",
      ok: true,
      summary: data.country ? `Detected country: ${data.country}` : "Country not detected.",
      data,
    };
  },
};

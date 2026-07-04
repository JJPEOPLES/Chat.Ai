import { tools } from "@/tools";
import type { ToolDefinition } from "./types";

const autoRoutableTools = tools.filter((tool) => tool.status === "available");
const defaultTool = autoRoutableTools.find((tool) => tool.id === "web-search");

export function chooseTool(query: string): ToolDefinition | null {
  const lower = query.toLowerCase();

  for (const tool of autoRoutableTools) {
    if (tool.keywords.some((keyword) => lower.includes(keyword))) {
      return tool;
    }
  }

  if (/\b(weather|forecast|rain|temperature)\b/.test(lower)) {
    return autoRoutableTools.find((tool) => tool.id === "weather") ?? null;
  }

  if (/\b(movie|film|imdb|actor)\b/.test(lower)) {
    return autoRoutableTools.find((tool) => tool.id === "movies") ?? null;
  }

  if (/\b(song|artist|album|band|music)\b/.test(lower)) {
    return autoRoutableTools.find((tool) => tool.id === "music") ?? null;
  }

  if (/\b(lyrics)\b/.test(lower)) {
    return autoRoutableTools.find((tool) => tool.id === "lyrics") ?? null;
  }

  if (/\b(github|repo|repository|code)\b/.test(lower)) {
    return autoRoutableTools.find((tool) => tool.id === "github") ?? null;
  }

  if (/\b(news|headline|latest)\b/.test(lower)) {
    return autoRoutableTools.find((tool) => tool.id === "news") ?? defaultTool ?? null;
  }

  return null;
}

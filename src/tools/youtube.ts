import { env } from "@/lib/env";
import { optionalToolDisabled, fetchJson } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

type YoutubeSearch = {
  items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }>;
};

export const youtubeTool: ToolDefinition = {
  id: "youtube",
  label: "YouTube",
  description: "Optional YouTube search when configured.",
  keywords: ["youtube", "video", "channel", "watch"],
  status: env.YOUTUBE_API_KEY ? "available" : "optional",
  env: ["YOUTUBE_API_KEY"],
  publicFriendly: false,
  async execute(query) {
    if (!env.YOUTUBE_API_KEY) {
      return optionalToolDisabled(
        "YouTube",
        "Add YOUTUBE_API_KEY to enable YouTube search."
      );
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${env.YOUTUBE_API_KEY}`;
    const data = await fetchJson<YoutubeSearch>(url);

    return {
      tool: "YouTube",
      ok: true,
      summary: (data.items ?? [])
        .map((item) => `${item.snippet?.title} — ${item.snippet?.channelTitle} — https://youtu.be/${item.id?.videoId}`)
        .join("\n"),
      data: data.items ?? [],
    };
  },
};

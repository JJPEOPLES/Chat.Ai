import { fetchJson } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

type LyricsResponse = { lyrics?: string; error?: string };

export const lyricsTool: ToolDefinition = {
  id: "lyrics",
  label: "Lyrics.ovh",
  description: "Fetch song lyrics from a free public API.",
  keywords: ["lyrics", "song words", "sing"],
  status: "available",
  publicFriendly: true,
  async execute(query) {
    const [artist, title] = query.split("-").map((item) => item.trim());

    if (!artist || !title) {
      return {
        tool: "Lyrics.ovh",
        ok: false,
        summary: 'Use the format "Artist - Song Title" for lyrics lookup.',
      };
    }

    const data = await fetchJson<LyricsResponse>(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
    );

    return {
      tool: "Lyrics.ovh",
      ok: Boolean(data.lyrics),
      summary: data.lyrics ?? data.error ?? "Lyrics not found.",
      data,
    };
  },
};

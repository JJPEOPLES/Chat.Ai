import { fetchJson } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

type AudioDbArtist = {
  artists?: Array<{ strArtist: string; strGenre?: string; strBiographyEN?: string }>;
};

export const musicTool: ToolDefinition = {
  id: "music",
  label: "TheAudioDB",
  description: "Artist lookup with a free public API.",
  keywords: ["music", "artist", "album", "band", "song info"],
  status: "available",
  publicFriendly: true,
  async execute(query) {
    const url = new URL("https://theaudiodb.com/api/v1/json/2/search.php");
    url.searchParams.set("s", query);
    const data = await fetchJson<AudioDbArtist>(url.toString());
    const artist = data.artists?.[0];

    if (!artist) {
      return {
        tool: "TheAudioDB",
        ok: false,
        summary: `No music results found for "${query}".`,
      };
    }

    return {
      tool: "TheAudioDB",
      ok: true,
      summary: `${artist.strArtist}${artist.strGenre ? ` • ${artist.strGenre}` : ""}\n${artist.strBiographyEN ?? ""}`,
      data: artist,
    };
  },
};

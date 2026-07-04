import { env } from "@/lib/env";
import { optionalToolDisabled, fetchJson } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

type OmdbResponse = {
  Title?: string;
  Year?: string;
  Plot?: string;
  imdbRating?: string;
  Response?: string;
  Error?: string;
};

export const moviesTool: ToolDefinition = {
  id: "movies",
  label: "OMDb",
  description: "Movie lookup when OMDb is configured.",
  keywords: ["movie", "film", "imdb", "actor", "director"],
  status: env.OMDB_API_KEY ? "available" : "optional",
  env: ["OMDB_API_KEY"],
  publicFriendly: false,
  async execute(query) {
    if (!env.OMDB_API_KEY) {
      return optionalToolDisabled("OMDb", "Add OMDB_API_KEY to enable movie search.");
    }

    const url = `https://www.omdbapi.com/?apikey=${env.OMDB_API_KEY}&t=${encodeURIComponent(query)}`;
    const data = await fetchJson<OmdbResponse>(url);

    return {
      tool: "OMDb",
      ok: data.Response === "True",
      summary:
        data.Response === "True"
          ? `${data.Title} (${data.Year}) • IMDb ${data.imdbRating}\n${data.Plot}`
          : data.Error ?? "Movie not found.",
      data,
    };
  },
};

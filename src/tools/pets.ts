import { env } from "@/lib/env";
import { optionalToolDisabled, fetchJson } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

type PetResponse = { pets?: Array<{ name?: string; age?: string; breed?: string; city?: string }> };

export const petsTool: ToolDefinition = {
  id: "pets",
  label: "AdoptAPet",
  description: "Pet adoption search, enabled only when an API key is provided.",
  keywords: ["pet", "adopt", "dog", "cat", "animal shelter"],
  status: env.ADOPT_A_PET_KEY ? "available" : "optional",
  env: ["ADOPT_A_PET_KEY"],
  publicFriendly: false,
  async execute(query) {
    if (!env.ADOPT_A_PET_KEY) {
      return optionalToolDisabled(
        "AdoptAPet",
        "Add ADOPT_A_PET_KEY to enable pet adoption search."
      );
    }

    const url = `https://api.adoptapet.me/search/pets?key=${env.ADOPT_A_PET_KEY}&q=${encodeURIComponent(query)}`;
    const data = await fetchJson<PetResponse>(url);

    return {
      tool: "AdoptAPet",
      ok: true,
      summary: (data.pets ?? [])
        .slice(0, 5)
        .map((pet) => `${pet.name ?? "Unnamed"} • ${pet.breed ?? "Unknown breed"} • ${pet.city ?? "Unknown city"}`)
        .join("\n"),
      data: data.pets ?? [],
    };
  },
};

import { env } from "@/lib/env";
import { optionalToolDisabled } from "@/lib/tool-fetch";
import type { ToolDefinition } from "@/lib/types";

export const gyazoTool: ToolDefinition = {
  id: "gyazo",
  label: "Gyazo",
  description: "Optional screenshot library access via Gyazo.",
  keywords: ["gyazo", "screenshot", "capture"],
  status: env.GYAZO_ACCESS_TOKEN ? "available" : "optional",
  env: ["GYAZO_ACCESS_TOKEN"],
  publicFriendly: false,
  async execute() {
    return optionalToolDisabled(
      "Gyazo",
      "Add GYAZO_ACCESS_TOKEN to enable Gyazo integration."
    );
  },
};

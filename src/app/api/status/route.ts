import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { visibleTools } from "@/tools";

export function GET() {
  return NextResponse.json({
    ai: {
      configured: Boolean(env.AI_API_KEY),
      model: env.AI_MODEL,
      baseUrl: env.AI_BASE_URL,
    },
    supabase: {
      configured: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
    },
    tools: visibleTools.map((tool) => ({
      id: tool.id,
      label: tool.label,
      description: tool.description,
      status: tool.status,
      env: tool.env ?? [],
      publicFriendly: tool.publicFriendly,
    })),
  });
}

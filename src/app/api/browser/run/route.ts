import { NextResponse } from "next/server";
import { runBrowserPlan } from "@/lib/browser-agent";
import { checkRateLimit } from "@/lib/rate-limit";
import type { BrowserPlan } from "@/lib/types";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const { rateLimited } = checkRateLimit(`${ip}:browser-run`);

  if (rateLimited) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  try {
    const body = (await request.json()) as { approved: boolean; plan: BrowserPlan };
    if (!body.approved) {
      return NextResponse.json(
        { error: "Execution requires explicit approval." },
        { status: 400 }
      );
    }

    const result = await runBrowserPlan(body.plan);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to run browser plan." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { generateBrowserPlan } from "@/lib/browser-agent";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const { rateLimited } = checkRateLimit(`${ip}:browser-plan`);

  if (rateLimited) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  try {
    const body = (await request.json()) as { request: string };
    if (!body.request?.trim()) {
      return NextResponse.json({ error: "Request is required." }, { status: 400 });
    }

    const plan = await generateBrowserPlan(body.request);
    return NextResponse.json({ plan });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate browser plan." },
      { status: 500 }
    );
  }
}

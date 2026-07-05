import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase-server";

function resolveSafeRedirect(request: Request, next: string) {
  const currentUrl = new URL(request.url);
  if (!next.startsWith("/") || next.startsWith("//")) {
    return new URL("/", currentUrl);
  }

  return new URL(next, currentUrl);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const safeRedirect = resolveSafeRedirect(request, next);

  if (!isSupabaseConfigured() || !code) {
    return NextResponse.redirect(safeRedirect);
  }

  const client = await createSupabaseServerClient();
  if (client) {
    await client.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(safeRedirect);
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase-server";

function resolveSafeRedirect(request: Request, next: string) {
  const currentUrl = new URL(request.url);
  const currentHostIsLocal =
    currentUrl.hostname === "localhost" || currentUrl.hostname === "127.0.0.1";

  try {
    const target = new URL(next, currentUrl);
    const targetHostIsLocal =
      target.hostname === "localhost" || target.hostname === "127.0.0.1";

    if (!currentHostIsLocal && targetHostIsLocal) {
      return new URL("/", currentUrl);
    }

    if (target.origin !== currentUrl.origin && !currentHostIsLocal) {
      return new URL(target.pathname + target.search + target.hash, currentUrl);
    }

    return target;
  } catch {
    return new URL("/", currentUrl);
  }
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

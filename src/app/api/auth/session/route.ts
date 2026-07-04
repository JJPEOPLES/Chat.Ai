import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase-server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, user: null, session: null });
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    return NextResponse.json({ configured: false, user: null, session: null });
  }

  const [{ data: sessionData }, { data: userData }] = await Promise.all([
    client.auth.getSession(),
    client.auth.getUser(),
  ]);

  return NextResponse.json({
    configured: true,
    session: sessionData.session,
    user: userData.user,
  });
}

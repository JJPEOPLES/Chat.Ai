import { createBrowserClient } from "@supabase/ssr";
import { env } from "./env";
import { isSupabaseConfigured } from "./supabase-config";

export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createBrowserClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!);
}

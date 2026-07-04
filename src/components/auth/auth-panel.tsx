"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, LogOut, Mail, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; avatar_url?: string };
} | null;

export function AuthPanel({
  user,
  onAuthChange,
}: {
  user: AuthUser;
  onAuthChange: () => Promise<void>;
}) {
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function signWithPassword() {
    if (!client) return;
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage("Check your inbox to confirm your account.");
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await onAuthChange();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink() {
    if (!client) return;
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setMessage("Magic link sent. Check your email.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send magic link.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    if (!client) return;
    setLoading(true);
    setMessage(null);
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  async function signOut() {
    if (!client) return;
    setLoading(true);
    await client.auth.signOut();
    await onAuthChange();
    setLoading(false);
  }

  if (!client) {
    return (
      <div className="rail-card rounded-[28px] p-5">
        <div className="text-lg font-semibold text-white">Supabase auth unavailable</div>
        <p className="mt-2 text-sm text-slate-400">Add the Supabase env vars to enable account sync.</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="rail-card rounded-[28px] p-5">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white">
            {(user.email?.[0] ?? "U").toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-white">{user.user_metadata?.full_name ?? user.email ?? "Signed in"}</div>
            <div className="text-sm text-slate-400">Cloud sync active</div>
          </div>
        </div>
        <button
          onClick={signOut}
          disabled={loading}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100 disabled:opacity-50"
        >
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="rail-card rounded-[28px] p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <div className="text-[1.45rem] font-semibold text-white">Account sync</div>
          <div className="text-sm text-slate-400">Sign in to save chats to Supabase</div>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        {(["signin", "signup"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`rounded-full px-4 py-2 text-sm ${
              mode === value ? "bg-fuchsia-600 text-white" : "bg-white/5 text-slate-300"
            }`}
          >
            {value === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="w-full rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
          className="w-full rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
        />
      </div>

      <div className="mt-4 grid gap-2">
        <button
          onClick={signWithPassword}
          disabled={loading || !email || !password}
          className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button
          onClick={sendMagicLink}
          disabled={loading || !email}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100 disabled:opacity-50"
        >
          <Mail className="size-4" />
          Send magic link
        </button>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100 disabled:opacity-50"
        >
          Continue with Google
        </button>
      </div>

      {message ? <div className="mt-3 text-sm text-slate-300">{message}</div> : null}
    </div>
  );
}

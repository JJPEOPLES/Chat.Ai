"use client";

export function SettingsPanel() {
  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-panel-strong rounded-3xl p-6">
          <h2 className="mb-3 text-xl font-semibold">Core settings</h2>
          <ul className="space-y-3 text-sm text-slate-300">
            <li>AI provider credentials stay server-side only.</li>
            <li>Supabase auth and sync are optional until you add project keys.</li>
            <li>Optional third-party tools fail gracefully when not configured.</li>
            <li>Temporary mode is the default, so long-term memory starts empty.</li>
          </ul>
        </section>

        <section className="glass-panel-strong rounded-3xl p-6">
          <h2 className="mb-3 text-xl font-semibold">Media handling</h2>
          <ul className="space-y-3 text-sm text-slate-300">
            <li>Images and PDFs are inspected before reaching the model.</li>
            <li>Audio and video transcription is attempted only if the AI endpoint supports it.</li>
            <li>Browser speech APIs power voice input and spoken output.</li>
          </ul>
        </section>

        <section className="glass-panel-strong rounded-3xl p-6 lg:col-span-2">
          <h2 className="mb-3 text-xl font-semibold">Environment variables</h2>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 font-mono text-sm text-cyan-200">
            AI_API_KEY=YOUR_SERVER_SIDE_KEY
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Only `AI_API_KEY` is required for the assistant. Everything else is optional.
          </p>
        </section>
      </div>
    </div>
  );
}

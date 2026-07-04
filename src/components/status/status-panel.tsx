"use client";

import { useEffect, useState } from "react";

type StatusPayload = {
  ai: { configured: boolean; model: string; baseUrl: string };
  supabase: { configured: boolean };
  tools: Array<{ id: string; label: string; status: string }>;
};

export function StatusPanel() {
  const [status, setStatus] = useState<StatusPayload | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((response) => response.json())
      .then(setStatus);
  }, []);

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          title="AI API"
          value={status?.ai.configured ? "Configured" : "Missing key"}
          description={status ? `${status.ai.model} via ${status.ai.baseUrl}` : "Loading…"}
        />
        <Card
          title="Supabase"
          value={status?.supabase.configured ? "Connected" : "Guest mode"}
          description="Auth, database, and cloud sync"
        />
        <Card
          title="Tools live"
          value={String(status?.tools.filter((tool) => tool.status === "available").length ?? 0)}
          description="Ready right now"
        />
        <Card
          title="Optional tools"
          value={String(status?.tools.filter((tool) => tool.status === "optional").length ?? 0)}
          description="Unlockable later"
        />
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="glass-panel-strong rounded-3xl p-5">
      <div className="mb-2 text-sm text-slate-400">{title}</div>
      <div className="mb-2 text-2xl font-semibold">{value}</div>
      <div className="text-sm text-slate-300">{description}</div>
    </div>
  );
}

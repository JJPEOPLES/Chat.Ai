"use client";

import { useEffect, useState } from "react";

type StatusResponse = Awaited<ReturnType<typeof fetchStatus>>;

async function fetchStatus() {
  const response = await fetch("/api/status");
  return (await response.json()) as {
    tools: Array<{
      id: string;
      label: string;
      description: string;
      status: string;
      env: string[];
      publicFriendly: boolean;
    }>;
  };
}

export function ToolPanel() {
  const [data, setData] = useState<StatusResponse | null>(null);

  useEffect(() => {
    fetchStatus().then(setData);
  }, []);

  return (
    <div className="scrollbar-thin grid flex-1 gap-4 overflow-y-auto p-6 lg:grid-cols-2 xl:grid-cols-3">
      {data?.tools.map((tool) => (
        <article key={tool.id} className="glass-panel-strong rounded-3xl p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{tool.label}</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] ${
                tool.status === "available"
                  ? "bg-emerald-400/15 text-emerald-200"
                  : tool.status === "optional"
                    ? "bg-amber-400/15 text-amber-100"
                    : "bg-slate-400/15 text-slate-200"
              }`}
            >
              {tool.status}
            </span>
          </div>
          <p className="mb-4 text-sm text-slate-300">{tool.description}</p>
          <div className="text-xs text-slate-400">
            {tool.publicFriendly
              ? "Works with a free/public endpoint."
              : tool.env.length
                ? `Optional env: ${tool.env.join(", ")}`
                : "Disabled by default."}
          </div>
        </article>
      ))}
    </div>
  );
}

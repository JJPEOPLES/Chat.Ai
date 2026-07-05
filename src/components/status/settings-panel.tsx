"use client";

import { useMemo, useState } from "react";
import type { Project } from "@/lib/types";

export function SettingsPanel({
  project,
  onUpdateProject,
}: {
  project: Project | null;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
}) {
  const [memoryDraft, setMemoryDraft] = useState("");
  const memoryCount = useMemo(() => project?.memoryItems.length ?? 0, [project]);

  if (!project) {
    return (
      <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
        <div className="glass-panel-strong rounded-3xl p-6 text-slate-300">Select a project to edit its workspace settings.</div>
      </div>
    );
  }

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-panel-strong rounded-3xl p-6">
          <h2 className="mb-3 text-xl font-semibold">Project workspace</h2>
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm text-slate-400">Project name</div>
              <input
                value={project.name}
                onChange={(event) => onUpdateProject(project.id, { name: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
            </div>
            <div>
              <div className="mb-2 text-sm text-slate-400">Project instructions</div>
              <textarea
                value={project.instructions ?? ""}
                onChange={(event) => onUpdateProject(project.id, { instructions: event.target.value })}
                placeholder="Tell Chat.ai how this workspace should behave."
                className="min-h-36 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
            </div>
          </div>
        </section>

        <section className="glass-panel-strong rounded-3xl p-6">
          <h2 className="mb-3 text-xl font-semibold">Project memory</h2>
          <p className="mb-4 text-sm text-slate-400">
            Memory stays isolated to this workspace. You can review, edit, or delete every item.
          </p>
          <div className="mb-4 text-sm text-slate-300">{memoryCount} memory item{memoryCount === 1 ? "" : "s"} stored</div>
          <div className="mb-4 flex flex-wrap gap-2">
            {project.memoryItems.length ? (
              project.memoryItems.map((item) => (
                <button
                  key={item}
                  onClick={() =>
                    onUpdateProject(project.id, {
                      memoryItems: project.memoryItems.filter((memoryItem) => memoryItem !== item),
                    })
                  }
                  className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm text-slate-100"
                >
                  {item} ×
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-400">
                No project memory yet.
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={memoryDraft}
              onChange={(event) => setMemoryDraft(event.target.value)}
              placeholder="Add a memory item"
              className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            />
            <button
              onClick={() => {
                const value = memoryDraft.trim();
                if (!value) return;
                onUpdateProject(project.id, {
                  memoryItems: [...project.memoryItems, value],
                });
                setMemoryDraft("");
              }}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black"
            >
              Add
            </button>
          </div>
        </section>

        <section className="glass-panel-strong rounded-3xl p-6 lg:col-span-2">
          <h2 className="mb-3 text-xl font-semibold">Workspace notes</h2>
          <ul className="space-y-3 text-sm text-slate-300">
            <li>Project instructions are injected only for chats in this workspace.</li>
            <li>Project memory is isolated and can be cleared item-by-item at any time.</li>
            <li>Cloud sync for projects requires the latest `supabase/schema.sql` migration.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

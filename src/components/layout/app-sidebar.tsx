"use client";

import {
  AppWindow,
  Compass,
  Files,
  FolderKanban,
  Home,
  MessageSquarePlus,
  PanelTopOpen,
  Settings,
  Sparkles,
  CheckSquare,
} from "lucide-react";
import { formatDate, truncate } from "@/lib/utils";
import type { Conversation, Project } from "@/lib/types";

export function AppSidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  activeTab,
  onTabChange,
  user,
  searchQuery,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
}: {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  activeTab: "chat" | "tools" | "settings" | "status";
  onTabChange: (tab: "chat" | "tools" | "settings" | "status") => void;
  user?: { email?: string | null } | null;
  searchQuery?: string;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
}) {
  const menuItems = [
    { label: "New chat", icon: MessageSquarePlus, tab: "chat" as const, active: activeTab === "chat" },
    { label: "Search chats", icon: Home, tab: "chat" as const, active: false },
    { label: "Library", icon: Files, tab: "tools" as const, active: activeTab === "tools" },
    { label: "Projects", icon: FolderKanban, tab: "chat" as const, active: false },
    { label: "Scheduled", icon: CheckSquare, tab: "status" as const, active: activeTab === "status" },
    { label: "Apps", icon: AppWindow, tab: "tools" as const, active: false },
    { label: "More", icon: Compass, tab: "settings" as const, active: activeTab === "settings" },
  ];
  const filteredConversations = conversations.filter((conversation) => {
    if (conversation.projectId !== activeProjectId) return false;
    const query = searchQuery?.trim().toLowerCase();
    if (!query) return true;
    return (
      conversation.title.toLowerCase().includes(query) ||
      conversation.messages.some((message) => message.content.toLowerCase().includes(query))
    );
  });

  return (
    <aside className="sidebar-panel scrollbar-thin flex min-h-screen flex-col overflow-hidden px-3 py-5">
      <div className="mb-4 px-2">
        <div className="flex items-center gap-2 text-[2rem] font-semibold text-white">
          <Sparkles className="size-5 text-white" />
          <span>Chat.ai</span>
          <span className="text-[#f1c27d]">Plus</span>
        </div>
      </div>

      <div className="mb-5 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          return (
            <button
              key={item.label}
              onClick={() => (item.label === "New chat" ? onCreate() : onTabChange(item.tab))}
              className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[1rem] transition ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-200 hover:bg-white/6"
              }`}
            >
              <Icon className="size-4.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-2 border-t border-white/8 pt-4">
        <div className="mb-3 flex items-center justify-between px-2 text-sm font-medium text-slate-400">
          <span>Projects</span>
          <button onClick={onCreateProject} className="text-slate-300">+</button>
        </div>
        <div className="mb-4 space-y-1.5">
          {projects.map((project) => {
            const isActive = project.id === activeProjectId;
            return (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                  isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <PanelTopOpen className="size-4" />
                <span className="truncate">{project.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mb-3 px-2 text-sm font-medium text-slate-400">Recents</div>
        <div className="space-y-1.5">
          {filteredConversations.map((conversation) => {
            const isActive = conversation.id === activeId;
            return (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-200 hover:bg-white/4"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-sm font-medium">{truncate(conversation.title, 28)}</div>
                  <div className="shrink-0 text-xs text-slate-500">{formatDate(conversation.updatedAt)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto border-t border-white/8 pt-4">
        <div className="flex items-center justify-between rounded-2xl bg-white/4 p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-fuchsia-300 text-xs font-semibold text-black">
              T
            </div>
            <div>
              <div className="font-medium text-white">{user?.email?.split("@")[0] ?? "Tera"}</div>
              <div className="text-xs text-slate-400">Plus</div>
            </div>
          </div>
          <button onClick={() => onTabChange("settings")} className="text-slate-300">
            <Settings className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

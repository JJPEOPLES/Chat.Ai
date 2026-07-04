"use client";

import {
  Compass,
  FileImage,
  Files,
  FolderKanban,
  Home,
  MemoryStick,
  MessageSquarePlus,
  Mic,
  Plus,
  Settings,
  Sparkles,
  SquareTerminal,
  CheckSquare,
} from "lucide-react";
import { formatDate, truncate } from "@/lib/utils";
import type { Conversation } from "@/lib/types";

export function AppSidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  activeTab,
  onTabChange,
  user,
  searchQuery,
}: {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  activeTab: "chat" | "tools" | "settings" | "status";
  onTabChange: (tab: "chat" | "tools" | "settings" | "status") => void;
  user?: { email?: string | null } | null;
  searchQuery?: string;
}) {
  const menuItems = [
    { label: "Home", icon: Home, tab: "chat" as const, active: activeTab === "chat" },
    { label: "Explore AI's", icon: Compass, tab: "tools" as const, active: activeTab === "tools" },
    { label: "Projects", icon: FolderKanban, tab: "chat" as const, active: activeTab === "chat" },
    { label: "Memory", icon: MemoryStick, tab: "status" as const, active: activeTab === "status" },
    { label: "Files", icon: Files, tab: "chat" as const, active: activeTab === "chat" },
    { label: "Images", icon: FileImage, tab: "chat" as const, active: activeTab === "chat" },
    { label: "Voice", icon: Mic, tab: "chat" as const, active: activeTab === "chat" },
    { label: "Code", icon: SquareTerminal, tab: "tools" as const, active: activeTab === "tools" },
    { label: "Tasks", icon: CheckSquare, tab: "status" as const, active: activeTab === "status" },
    { label: "Settings", icon: Settings, tab: "settings" as const, active: activeTab === "settings" },
  ];
  const filteredConversations = conversations.filter((conversation) => {
    const query = searchQuery?.trim().toLowerCase();
    if (!query) return true;
    return (
      conversation.title.toLowerCase().includes(query) ||
      conversation.messages.some((message) => message.content.toLowerCase().includes(query))
    );
  });

  return (
    <aside className="sidebar-panel scrollbar-thin flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[28px] px-5 py-6">
      <div className="mb-6">
        <div className="mb-7 flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500/40 to-indigo-500/30 p-3 text-white shadow-[0_0_32px_rgba(124,58,237,0.35)]">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="text-[2rem] font-semibold tracking-tight text-white">Chat.ai</div>
          </div>
        </div>

        <button
          onClick={onCreate}
          className="flex w-full items-center justify-between rounded-2xl border border-fuchsia-400/30 bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-4 font-medium text-white shadow-[0_14px_40px_rgba(99,102,241,0.28)]"
        >
          <span className="flex items-center gap-3">
            <MessageSquarePlus className="size-4" />
            New Chat
          </span>
          <span className="rounded-xl bg-white/10 px-2.5 py-1 text-xs text-slate-200">⌘ K</span>
        </button>
      </div>

      <div className="mb-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          return (
            <button
              key={item.label}
              onClick={() => onTabChange(item.tab)}
              className={`relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[1.05rem] transition ${
                isActive
                  ? "bg-white/8 text-white shadow-[inset_0_0_0_1px_rgba(139,92,246,0.35)]"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              {isActive ? <span className="absolute left-0 top-3 h-9 w-1 rounded-r-full bg-fuchsia-500" /> : null}
              <Icon className="size-5" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-1 border-t border-white/8 pt-5">
        <div className="mb-3 flex items-center justify-between text-sm text-slate-400">
          <span>Your Chats</span>
          <button onClick={onCreate} className="text-xl leading-none text-slate-300">
            <Plus className="size-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          {filteredConversations.map((conversation) => {
            const isActive = conversation.id === activeId;
            return (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                  isActive
                    ? "bg-white/7 text-white"
                    : "text-slate-300 hover:bg-white/4"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-sm font-medium">{truncate(conversation.title, 24)}</div>
                  <div className="shrink-0 text-xs text-slate-500">{formatDate(conversation.updatedAt)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={() => onTabChange("chat")} className="mt-5 text-sm text-slate-300 hover:text-white">View all →</button>

      <div className="mt-auto border-t border-white/8 pt-5">
        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffffff,#7c3aed_40%,#111827_100%)] text-sm font-semibold text-white">
              T
            </div>
            <div>
              <div className="font-medium text-white">{user?.email?.split("@")[0] ?? "Tera"}</div>
              <div className="text-xs text-slate-400">{user?.email ?? "Prime Workspace"}</div>
            </div>
          </div>
          <span className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-medium text-white">Pro</span>
        </div>
      </div>
    </aside>
  );
}

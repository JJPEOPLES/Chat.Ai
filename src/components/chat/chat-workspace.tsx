"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bot,
  BrainCircuit,
  ChevronDown,
  Code2,
  Crown,
  Database,
  ImageIcon,
  Mic,
  PenLine,
  Search,
  Settings,
  Sparkles,
  SquareCode,
  Box,
} from "lucide-react";
import { BrowserAgentPanel } from "@/components/browser/browser-agent-panel";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ChatComposer } from "@/components/chat/composer";
import { MessageList } from "@/components/chat/message-list";
import { ToolPanel } from "@/components/status/tool-panel";
import { SettingsPanel } from "@/components/status/settings-panel";
import { StatusPanel } from "@/components/status/status-panel";
import { createStarterConversation } from "@/lib/conversation-sync";
import type { Attachment, Conversation, Message } from "@/lib/types";

type Tab = "chat" | "tools" | "settings" | "status";

export function ChatWorkspace() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<{
    id: string;
    email?: string;
    user_metadata?: { full_name?: string; avatar_url?: string };
  } | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [conversations, setConversations] = useState<Conversation[]>([createStarterConversation()]);
  const [activeId, setActiveId] = useState<string>("");
  const [streaming, setStreaming] = useState(false);
  const [useTools] = useState(true);
  const [composerSeed, setComposerSeed] = useState("");
  const [chatSearch, setChatSearch] = useState("");

  useEffect(() => {
    void refreshSession();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (user) return;
    window.localStorage.setItem("chat-ai-conversations", JSON.stringify(conversations));
  }, [authReady, conversations, user]);

  useEffect(() => {
    if (!authReady || !user) return;

    const timeout = window.setTimeout(async () => {
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversations }),
      });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [authReady, conversations, user]);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ?? conversations[0];

  const nav = useMemo(
    () => [
      { id: "chat", label: "AI Chat", icon: Bot },
      { id: "tools", label: "Study", icon: Box },
      { id: "status", label: "Code", icon: SquareCode },
      { id: "settings", label: "Write", icon: PenLine },
      { id: "chat", label: "Image", icon: ImageIcon },
      { id: "chat", label: "More", icon: BrainCircuit },
    ] satisfies Array<{ id: Tab; label: string; icon: typeof Bot }>,
    []
  );

  function createConversation() {
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title: "New conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setTab("chat");
    setComposerSeed("");
  }

  function queuePrompt(prompt: string) {
    setComposerSeed(prompt);
    setTab("chat");
  }

  function clearMemory() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("chat-ai-conversations");
    }

    const starter = createStarterConversation();
    setConversations([starter]);
    setActiveId(starter.id);
    setComposerSeed("");
  }

  async function refreshSession() {
    const response = await fetch("/api/auth/session");
    const data = (await response.json()) as {
      user: { id: string; email?: string; user_metadata?: { full_name?: string; avatar_url?: string } } | null;
    };

    setUser(data.user);
    setAuthReady(true);

    if (data.user) {
      const conversationsResponse = await fetch("/api/conversations");
      const conversationsData = (await conversationsResponse.json()) as {
        conversations: Conversation[];
      };
      const nextConversations = conversationsData.conversations.length
        ? conversationsData.conversations
        : [createStarterConversation()];
      setConversations(nextConversations);
      setActiveId(nextConversations[0]?.id ?? "");
      return;
    }

    const raw = window.localStorage.getItem("chat-ai-conversations");
    if (raw) {
      const parsed = JSON.parse(raw) as Conversation[];
      if (parsed.length) {
        setConversations(parsed);
        setActiveId(parsed[0].id);
        return;
      }
    }

    const starter = createStarterConversation();
    setConversations([starter]);
    setActiveId(starter.id);
  }

  function updateMessages(messages: Message[]) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              title:
                conversation.title === "New conversation" && messages[0]?.content
                  ? messages[0].content.slice(0, 40)
                  : conversation.title,
              updatedAt: new Date().toISOString(),
              messages,
            }
          : conversation
      )
    );
  }

  async function handleSend(content: string, attachments: Attachment[]) {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      attachments,
      createdAt: new Date().toISOString(),
    };

    const draftAssistant: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...activeConversation.messages, userMessage, draftAssistant];
    updateMessages(nextMessages);
    setStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.filter((message) => message.content || message.role === "user"),
          attachments,
          useTools,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Unable to stream response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === activeConversation.id
              ? {
                  ...conversation,
                  updatedAt: new Date().toISOString(),
                  messages: conversation.messages.map((message) =>
                    message.id === draftAssistant.id ? { ...message, content: text } : message
                  ),
                }
              : conversation
          )
        );
      }
    } catch (error) {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === draftAssistant.id
                    ? {
                        ...message,
                        content:
                          error instanceof Error
                            ? `I hit an error: ${error.message}`
                            : "I hit an unknown error.",
                      }
                    : message
                ),
              }
            : conversation
        )
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 gap-5 p-4 lg:grid-cols-[290px_minmax(0,1fr)]">
      <AppSidebar
        activeId={activeId}
        conversations={conversations}
        onSelect={setActiveId}
        onCreate={createConversation}
        activeTab={tab}
        onTabChange={setTab}
        user={user}
        searchQuery={chatSearch}
      />

      <main className="main-surface flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[30px] px-6 py-5">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="pt-1">
            <h1 className="text-[3rem] font-semibold tracking-tight text-white">Good evening, Tera 👋</h1>
            <p className="mt-2 text-2xl text-slate-300">What can I help you with today?</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setTab("settings")}
              className="rounded-2xl border border-amber-400/30 bg-white/4 px-5 py-3 text-lg text-white shadow-[0_0_0_1px_rgba(251,191,36,0.06)]"
            >
              <span className="flex items-center gap-2">
                <Crown className="size-5 text-amber-300" />
                Pro Plan
              </span>
            </button>
            <label className="flex min-w-[320px] items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-5 py-3 text-slate-400">
              <Search className="size-5" />
              <input
                value={chatSearch}
                onChange={(event) => setChatSearch(event.target.value)}
                placeholder="Search chats..."
                className="flex-1 bg-transparent text-left text-lg text-slate-100 outline-none placeholder:text-slate-400"
              />
              <span className="text-base">Ctrl K</span>
            </label>
            <button
              onClick={() => setTab("status")}
              className="relative rounded-full p-3 text-slate-300 hover:bg-white/6"
            >
              <Bell className="size-6" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-fuchsia-500" />
            </button>
            <div className="relative flex size-14 items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_30%_30%,#ffffff,#6d28d9_45%,#030712_100%)] text-lg font-semibold text-white">
              T
              <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-400 ring-2 ring-[#070b16]" />
            </div>
          </div>
        </header>

        {tab === "chat" && (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
            <section className="flex min-h-0 flex-col">
              <div className="mb-5 flex flex-wrap gap-3">
                {nav.map((item, index) => {
                  const Icon = item.icon;
                  const active = composerSeed.startsWith(item.label) || (index === 0 && !composerSeed);

                  return (
                    <button
                      key={`${item.label}-${index}`}
                      onClick={() =>
                        queuePrompt(
                          item.label === "AI Chat"
                            ? "AI Chat: Help me with my next task."
                            : item.label === "Study"
                              ? "Study: explain this topic clearly, step by step."
                              : item.label === "Code"
                                ? "Code: help me build or debug code."
                                : item.label === "Write"
                                  ? "Write: draft polished writing for me."
                                  : item.label === "Image"
                                    ? "Image: analyze or help create an image concept."
                                    : "More: show me the best tools or workflow for this task."
                        )
                      }
                      className={`rounded-2xl border px-5 py-3 text-lg transition ${
                        active
                          ? "border-fuchsia-400/30 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-[0_18px_40px_rgba(99,102,241,0.22)]"
                          : "border-white/8 bg-[#0b1224] text-slate-200 hover:bg-white/7"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="size-5" />
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="conversation-shell flex min-h-0 flex-1 flex-col rounded-[30px]">
                <MessageList messages={activeConversation.messages} streaming={streaming} />
              </div>
              <ChatComposer
                onSend={handleSend}
                disabled={streaming}
                seedText={composerSeed}
                onSeedApplied={() => setComposerSeed("")}
                onCreateConversation={createConversation}
              />
            </section>

            <aside className="scrollbar-thin min-h-0 space-y-4 overflow-y-auto">
              <div className="rail-card rounded-[28px] p-5">
                <div className="mb-4 text-[1.75rem] font-semibold text-white">AI Models</div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 items-center justify-between rounded-2xl border border-white/10 bg-white/4 px-4 py-4">
                    <div className="flex items-center gap-3 text-xl text-white">
                      <div className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
                        <Sparkles className="size-5" />
                      </div>
                      GPT-4o
                    </div>
                    <ChevronDown className="size-5 text-slate-400" />
                  </div>
                  <button
                    onClick={() => setTab("settings")}
                    className="flex size-15 items-center justify-center rounded-2xl border border-white/10 bg-white/4 text-slate-300"
                  >
                    <Settings className="size-5" />
                  </button>
                </div>
              </div>

              <div className="rail-card rounded-[28px] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-[1.75rem] font-semibold text-white">Tools</div>
                  <button onClick={() => setTab("tools")} className="text-base text-fuchsia-400">See all ›</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Web Search", icon: Search, prompt: "Use web search to find the latest information on this topic." },
                    { label: "AI Image", icon: ImageIcon, prompt: "Help me analyze or generate an image idea." },
                    { label: "Code Interpreter", icon: Code2, prompt: "Help me write, debug, or explain code." },
                    { label: "PDF Analyzer", icon: Database, prompt: "I want to upload a PDF and extract the important points." },
                    { label: "Voice Chat", icon: Mic, prompt: "Use voice-friendly replies and help me talk through this." },
                    { label: "All Tools", icon: BrainCircuit, prompt: "Show me which tools in Chat.ai are best for this task." },
                  ].map((item) => {
                    const ToolIcon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => queuePrompt(item.prompt)}
                        className="rounded-2xl border border-white/8 bg-white/4 p-4 text-center transition hover:bg-white/8"
                      >
                        <ToolIcon className="mx-auto mb-3 size-7 text-fuchsia-400" />
                        <div className="text-sm leading-tight text-white">{item.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <BrowserAgentPanel />
              <AuthPanel user={user} onAuthChange={refreshSession} />

              <div className="rail-card rounded-[28px] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-[1.75rem] font-semibold text-white">Memory</div>
                  <button onClick={clearMemory} className="text-base text-fuchsia-400">Clear all ›</button>
                </div>
                <p className="mb-4 text-lg text-slate-300">Temporary mode is on by default. Long-term memory starts empty until you decide to keep data.</p>
                {activeConversation.memory ? (
                  <div className="flex flex-wrap gap-2">
                    {activeConversation.memory.split("\n").filter(Boolean).map((tag) => (
                      <span key={tag} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-sm text-slate-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/4 px-4 py-4 text-sm text-slate-400">
                    No saved memory yet.
                  </div>
                )}
              </div>

              <div className="rail-card rounded-[28px] p-5">
                <div className="mb-4 text-[1.75rem] font-semibold text-white">Today’s Activity</div>
                <div className="activity-graph flex h-48 items-end justify-between rounded-2xl px-4 pb-5 pt-3">
                  {[16, 42, 24, 55, 31, 72, 40].map((height, index) => (
                    <div key={index} className="flex h-full flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-8 rounded-full bg-gradient-to-t from-fuchsia-600 via-indigo-500 to-violet-300 shadow-[0_0_28px_rgba(124,58,237,0.35)]"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between text-sm text-slate-500">
                  <span>12AM</span>
                  <span>6AM</span>
                  <span>12PM</span>
                  <span>6PM</span>
                  <span>12AM</span>
                </div>
              </div>
            </aside>
          </div>
        )}

        {tab === "tools" && <ToolPanel />}
        {tab === "settings" && <SettingsPanel />}
        {tab === "status" && <StatusPanel />}
      </main>
    </div>
  );
}

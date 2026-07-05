"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  BrainCircuit,
  ImageIcon,
  PenLine,
  Search,
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
import { createStarterConversation, createStarterProject, DEFAULT_PROJECT_ID } from "@/lib/conversation-sync";
import type { Attachment, BrowserPlan, BrowserRunResult, Conversation, Message, Project } from "@/lib/types";

type Tab = "chat" | "tools" | "settings" | "status";

export function ChatWorkspace() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<{
    id: string;
    email?: string;
    user_metadata?: { full_name?: string; avatar_url?: string };
  } | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [projects, setProjects] = useState<Project[]>([createStarterProject()]);
  const [activeProjectId, setActiveProjectId] = useState<string>(DEFAULT_PROJECT_ID);
  const [conversations, setConversations] = useState<Conversation[]>([createStarterConversation(DEFAULT_PROJECT_ID)]);
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
    window.localStorage.setItem("chat-ai-project-state", JSON.stringify({ projects, conversations, activeProjectId }));
  }, [activeProjectId, authReady, conversations, projects, user]);

  useEffect(() => {
    if (!authReady || !user) return;

    const timeout = window.setTimeout(async () => {
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects, conversations }),
      });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [authReady, conversations, projects, user]);

  const projectConversations = conversations.filter((conversation) => conversation.projectId === activeProjectId);
  const activeConversation =
    projectConversations.find((conversation) => conversation.id === activeId) ?? projectConversations[0];
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;

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
      projectId: activeProjectId,
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

  function createProject() {
    const projectId = crypto.randomUUID();
    const project: Project = {
      id: projectId,
      name: `Project ${projects.length + 1}`,
      instructions: "",
      memoryItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const starterConversation = createStarterConversation(projectId);
    setProjects((current) => [project, ...current]);
    setConversations((current) => [starterConversation, ...current]);
    setActiveProjectId(projectId);
    setActiveId(starterConversation.id);
    setTab("chat");
  }

  function selectProject(projectId: string) {
    setActiveProjectId(projectId);
    const firstConversation = conversations.find((conversation) => conversation.projectId === projectId);
    if (firstConversation) {
      setActiveId(firstConversation.id);
      return;
    }
    const conversation = createStarterConversation(projectId);
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
  }

  function updateProject(projectId: string, updates: Partial<Project>) {
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : project
      )
    );
  }

  function queuePrompt(prompt: string) {
    setComposerSeed(prompt);
    setTab("chat");
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
        projects?: Project[];
        conversations: Conversation[];
      };
      const nextProjects = conversationsData.projects?.length
        ? conversationsData.projects
        : [createStarterProject()];
      const nextConversations = conversationsData.conversations.length
        ? conversationsData.conversations
        : [createStarterConversation(nextProjects[0]?.id ?? DEFAULT_PROJECT_ID)];
      setProjects(nextProjects);
      setConversations(nextConversations);
      setActiveProjectId(nextProjects[0]?.id ?? DEFAULT_PROJECT_ID);
      setActiveId(nextConversations[0]?.id ?? "");
      return;
    }

    const raw = window.localStorage.getItem("chat-ai-project-state");
    if (raw) {
      const parsed = JSON.parse(raw) as {
        projects?: Project[];
        conversations?: Conversation[];
        activeProjectId?: string;
      };
      if (parsed.conversations?.length) {
        const nextProjects = parsed.projects?.length ? parsed.projects : [createStarterProject()];
        setProjects(nextProjects);
        setConversations(parsed.conversations);
        setActiveProjectId(parsed.activeProjectId ?? nextProjects[0].id);
        setActiveId(
          parsed.conversations.find((conversation) => conversation.projectId === (parsed.activeProjectId ?? nextProjects[0].id))?.id ??
            parsed.conversations[0].id
        );
        return;
      }
    }

    const starterProject = createStarterProject();
    const starter = createStarterConversation(starterProject.id);
    setProjects([starterProject]);
    setConversations([starter]);
    setActiveProjectId(starterProject.id);
    setActiveId(starter.id);
  }

  function updateMessages(messages: Message[]) {
    const targetConversationId = activeConversation?.id ?? activeId;
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === targetConversationId
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

  function sanitizeAttachmentsForStorage(attachments: Attachment[]) {
    return attachments.map(({ previewUrl, ...attachment }) => ({
      ...attachment,
      previewUrl,
    }));
  }

  function isBrowserAgentRequest(content: string) {
    return (
      /https?:\/\//i.test(content) &&
      /\b(api key|browser|website|sites|provider|sign up|login|developer|dashboard|oauth|token|automation|open these|check these)\b/i.test(
        content
      )
    );
  }

  function updateMessageById(messageId: string, updater: (message: Message) => Message) {
    const targetConversationId = activeConversation?.id ?? activeId;
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === targetConversationId
          ? {
              ...conversation,
              updatedAt: new Date().toISOString(),
              messages: conversation.messages.map((message) =>
                message.id === messageId ? updater(message) : message
              ),
            }
          : conversation
      )
    );
  }

  async function handleAgentFlow(content: string, attachments: Attachment[], userMessage: Message) {
    const agentMessageId = crypto.randomUUID();
    const agentPlaceholder: Message = {
      id: agentMessageId,
      role: "assistant",
      toolName: "Browser Agent",
      content: "I’m checking the websites and preparing the next best browser action sequence.",
      createdAt: new Date().toISOString(),
      pendingApproval: false,
    };

    updateMessages([...activeConversation.messages, userMessage, agentPlaceholder]);

    const response = await fetch("/api/browser/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: content }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to prepare browser actions.");
    }

    const plan = data.plan as BrowserPlan;
    updateMessageById(agentMessageId, (message) => ({
      ...message,
      content: plan.summary,
      agentPlan: plan,
      pendingApproval: true,
      attachments: sanitizeAttachmentsForStorage(attachments),
    }));
  }

  async function approveAgentPlan(messageId: string) {
    if (!activeConversation) return;
    const message = activeConversation.messages.find((item) => item.id === messageId);
    if (!message?.agentPlan) return;

    updateMessageById(messageId, (current) => ({
      ...current,
      content: "Running the approved browser task now.",
      pendingApproval: false,
    }));

    const { response, data } = await executeBrowserRun(message.agentPlan);

    updateMessageById(messageId, (current) => ({
      ...current,
      content:
        response.ok
          ? "The browser agent finished the approved task."
          : `The browser agent could not finish the task: ${"error" in data ? (data.error ?? "Unknown error.") : "Unknown error."}`,
      agentResult: response.ok ? (data as BrowserRunResult) : undefined,
      pendingApproval: false,
    }));
  }

  async function executeBrowserRun(plan: BrowserPlan) {
    const payload = JSON.stringify({ approved: true, plan });
    const localBridgeUrls = ["http://127.0.0.1:4467/run", "http://localhost:4467/run"];

    for (const url of localBridgeUrls) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        const data = (await response.json()) as BrowserRunResult | { error?: string };
        return { response, data };
      } catch {
        continue;
      }
    }

    const response = await fetch("/api/browser/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    const data = (await response.json()) as BrowserRunResult | { error?: string };

    if (!response.ok && "error" in data && data.error?.includes("Netlify runtime")) {
      return {
        response,
        data: {
          error:
            `${data.error} Start the local helper with "npm run browser:bridge" on your computer, ` +
            "then approve the task again.",
        },
      };
    }

    return { response, data };
  }

  async function handleSend(content: string, attachments: Attachment[]) {
    if (!activeConversation) {
      createConversation();
      return;
    }
    const storedAttachments = sanitizeAttachmentsForStorage(attachments);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      attachments: storedAttachments,
      createdAt: new Date().toISOString(),
    };

    const draftAssistant: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    if (isBrowserAgentRequest(content)) {
      try {
        await handleAgentFlow(content, attachments, userMessage);
      } catch (error) {
        updateMessages([
          ...activeConversation.messages,
          userMessage,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            toolName: "Browser Agent",
            content:
              error instanceof Error ? `I hit an error: ${error.message}` : "I hit an unknown browser-agent error.",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      return;
    }

    const nextMessages = [...activeConversation.messages, userMessage, draftAssistant];
    const requestMessages: Message[] = [
      ...(activeProject?.instructions || activeProject?.memoryItems.length
        ? [
            {
              id: crypto.randomUUID(),
              role: "system" as const,
              content: [
                activeProject?.instructions ? `Project instructions:\n${activeProject.instructions}` : "",
                activeProject?.memoryItems.length ? `Project memory:\n- ${activeProject.memoryItems.join("\n- ")}` : "",
              ]
                .filter(Boolean)
                .join("\n\n"),
              createdAt: new Date().toISOString(),
            },
          ]
        : []),
      ...activeConversation.messages,
      {
        ...userMessage,
        attachments,
      },
      draftAssistant,
    ];
    updateMessages(nextMessages);
    setStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: requestMessages.filter((message) => message.content || message.role === "user"),
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
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
      <AppSidebar
        activeId={activeId}
        conversations={conversations}
        onSelect={setActiveId}
        onCreate={createConversation}
        activeTab={tab}
        onTabChange={setTab}
        user={user}
        searchQuery={chatSearch}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={selectProject}
        onCreateProject={createProject}
      />

      <main className="main-surface flex min-h-screen flex-col overflow-hidden px-6 py-5">

        {tab === "chat" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <section className="mx-auto flex min-h-0 w-full max-w-[920px] flex-1 flex-col">
              <div className="mb-4 mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <label className="flex min-w-[220px] flex-1 items-center gap-3 rounded-full bg-[#1f1f1f] px-4 py-2.5">
                  <Search className="size-4" />
                  <input
                    value={chatSearch}
                    onChange={(event) => setChatSearch(event.target.value)}
                    placeholder="Search chats"
                    className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  />
                </label>
                <button onClick={() => setTab("tools")} className="rounded-full bg-[#1f1f1f] px-4 py-2.5 text-slate-200">
                  Tools
                </button>
                <button onClick={() => setTab("settings")} className="rounded-full bg-[#1f1f1f] px-4 py-2.5 text-slate-200">
                  Settings
                </button>
              </div>

              <div className="mb-5 flex flex-wrap gap-2">
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
                      className={`rounded-full border px-4 py-2.5 text-sm transition ${
                        active
                          ? "border-white/10 bg-white text-black"
                          : "border-white/8 bg-[#151515] text-slate-200 hover:bg-[#1c1c1c]"
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

              <div className="conversation-shell flex min-h-0 flex-1 flex-col">
              <MessageList
                messages={activeConversation.messages}
                streaming={streaming}
                onApproveAgent={approveAgentPlan}
              />
              </div>
              <div className="sticky bottom-0 mt-4 bg-gradient-to-t from-black via-black to-transparent pb-4 pt-4">
                <ChatComposer
                  onSend={handleSend}
                  disabled={streaming}
                  seedText={composerSeed}
                  onSeedApplied={() => setComposerSeed("")}
                  onCreateConversation={createConversation}
                />
              </div>
            </section>
          </div>
        )}

        {tab === "tools" && (
          <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-4 py-4">
            <ToolPanel />
            <BrowserAgentPanel />
          </div>
        )}
        {tab === "settings" && (
          <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-4 py-4">
            <AuthPanel user={user} onAuthChange={refreshSession} />
            <SettingsPanel project={activeProject} onUpdateProject={updateProject} />
          </div>
        )}
        {tab === "status" && <StatusPanel />}
      </main>
    </div>
  );
}

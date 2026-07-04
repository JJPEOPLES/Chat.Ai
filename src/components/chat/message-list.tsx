"use client";

import { Bot, User } from "lucide-react";
import { MarkdownMessage } from "./markdown-message";
import { formatDate } from "@/lib/utils";
import type { BrowserAction, Message } from "@/lib/types";

export function MessageList({
  messages,
  streaming,
  onApproveAgent,
}: {
  messages: Message[];
  streaming: boolean;
  onApproveAgent: (messageId: string) => Promise<void>;
}) {
  return (
    <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-7 py-6">
      {messages.map((message) => {
        const isAssistant = message.role === "assistant";
        const Icon = isAssistant ? Bot : User;

        return (
          <article
            key={message.id}
            className={`rounded-[26px] border p-6 ${
              isAssistant
                ? "border-white/8 bg-[#0a1021]"
                : "ml-auto max-w-[420px] border-fuchsia-400/20 bg-gradient-to-br from-blue-600 to-fuchsia-600 text-white shadow-[0_24px_50px_rgba(79,70,229,0.25)]"
            }`}
          >
            <div className="mb-4 flex items-center gap-3 text-sm">
              <div className={`rounded-2xl p-2 ${isAssistant ? "bg-white/6" : "bg-white/12"}`}>
                <Icon className="size-4" />
              </div>
              <div className="font-medium">{isAssistant ? "Chat.ai" : "You"}</div>
              <div className={isAssistant ? "text-slate-400" : "text-white/70"}>{formatDate(message.createdAt)}</div>
            </div>

            {message.attachments?.length ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {message.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      isAssistant
                        ? "border-white/10 bg-white/5 text-slate-300"
                        : "border-white/20 bg-white/10 text-white/80"
                    }`}
                  >
                    {attachment.name} • {attachment.kind}
                  </div>
                ))}
              </div>
            ) : null}

            <MarkdownMessage content={message.content} />

            {message.toolName === "Browser Agent" && message.agentPlan ? (
              <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-black/35">
                <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                  <div>
                    <div className="text-sm text-slate-400">
                      {message.pendingApproval ? "Thought for a few seconds" : "Agent task"}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-white">{message.agentPlan.title}</div>
                  </div>
                  <div className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-200">
                    Browser Agent
                  </div>
                </div>

                <div className="px-5 py-4">
                  <div className="mb-3 text-sm text-slate-300">{message.agentPlan.summary}</div>

                  <div className="mb-4 rounded-2xl border border-white/8 bg-[#070b16] p-4">
                    <div className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-500">Done / Plan</div>
                    <div className="text-sm text-white">
                      {message.agentPlan.websites[0] ?? "Prepared browser task"}
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1.3fr_0.9fr]">
                    <div className="rounded-[22px] border border-white/8 bg-[#0b0f18] p-4">
                      <div className="mb-3 text-base font-semibold text-white">Planned actions</div>
                      <div className="space-y-2">
                        {message.agentPlan.steps.slice(0, 6).map((step, index) => (
                          <div key={`${step.type}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
                            {index + 1}. {describeAction(step)}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(64,22,22,0.35),rgba(10,10,10,0.92))] p-4">
                      <div className="mb-3 text-base font-semibold text-white">Execution</div>
                      {message.agentResult ? (
                        <div className="space-y-2 text-sm text-slate-200">
                          <div className={message.agentResult.ok ? "text-emerald-300" : "text-rose-300"}>
                            {message.agentResult.ok ? "Run completed" : "Run stopped"}
                          </div>
                          {message.agentResult.logs.slice(0, 5).map((log) => (
                            <div key={log} className="rounded-xl bg-white/[0.04] px-3 py-2">
                              {log}
                            </div>
                          ))}
                          {message.agentResult.error ? (
                            <div className="rounded-xl bg-rose-500/10 px-3 py-2 text-rose-200">
                              {message.agentResult.error}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-sm text-slate-300">
                            Approval is required before the agent touches the site.
                          </div>
                          <button
                            onClick={() => onApproveAgent(message.id)}
                            disabled={!message.pendingApproval}
                            className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                          >
                            Approve & run
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}

      {streaming ? <div className="px-2 text-sm text-fuchsia-300">Streaming response…</div> : null}
    </div>
  );
}

function describeAction(step: BrowserAction) {
  switch (step.type) {
    case "goto":
      return `Open ${step.url}`;
    case "click":
      return `Click ${step.target.text ?? step.target.label ?? step.target.placeholder ?? step.target.selector ?? "target"}`;
    case "type":
      return `Fill ${step.target.text ?? step.target.label ?? step.target.placeholder ?? step.target.selector ?? "field"}`;
    case "press":
      return `Press ${step.key}`;
    case "wait":
      return `Wait ${step.milliseconds}ms`;
    case "waitForText":
      return `Wait for "${step.text}"`;
    case "screenshot":
      return `Capture ${step.name}`;
    case "extractText":
      return `Extract ${step.name}`;
  }
}

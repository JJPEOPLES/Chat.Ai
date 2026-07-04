"use client";

import { Bot, User } from "lucide-react";
import { MarkdownMessage } from "./markdown-message";
import { formatDate } from "@/lib/utils";
import type { Message } from "@/lib/types";

export function MessageList({
  messages,
  streaming,
}: {
  messages: Message[];
  streaming: boolean;
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
          </article>
        );
      })}

      {streaming ? <div className="px-2 text-sm text-fuchsia-300">Streaming response…</div> : null}
    </div>
  );
}

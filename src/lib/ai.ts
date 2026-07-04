import { env } from "./env";
import { tools } from "@/tools";
import type { Attachment, Message, ToolResult } from "./types";

type OpenAiChunk = {
  choices?: Array<{ delta?: { content?: string } }>;
};

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

function buildAttachmentContext(attachments: Attachment[]) {
  return attachments
    .map((attachment) => {
      const header = `Attachment: ${attachment.name} (${attachment.kind}, ${attachment.mimeType}, ${attachment.size} bytes)`;
      const body = attachment.textContent ?? attachment.transcript ?? "";
      return body ? `${header}\n${body}` : header;
    })
    .join("\n\n");
}

function buildCapabilityPrompt() {
  const availableTools = tools
    .map((tool) => {
      const availability =
        tool.status === "available"
          ? "ready now"
          : tool.status === "optional"
            ? `optional (${tool.env?.join(", ") ?? "env required"})`
            : "disabled";

      return `- ${tool.label}: ${tool.description} [${availability}]`;
    })
    .join("\n");

  return [
    "You are Chat.ai, a futuristic multimodal AI assistant.",
    "You should act like you know your product surface and explain it confidently when users ask what you can do.",
    "Core capabilities:",
    "- normal AI chat and reasoning",
    "- streaming responses",
    "- markdown and code block formatting",
    "- image understanding when users upload images",
    "- PDF reading from extracted text",
    "- audio and video summarization when transcripts are available",
    "- answering questions about uploaded files",
    "- voice input and voice output support in the app UI",
    "- chat history and saved conversations in the app",
    "- temporary mode by default, with no long-term memory assumed unless the app explicitly stores it",
    "- optional Supabase-backed auth and cloud sync when configured",
    "- a browser agent that can inspect websites and prepare approval-first action plans",
    "Tool routing behavior:",
    "- Automatically use the best matching tool when the user asks for live or domain-specific information.",
    "- If a tool result is present, trust it over prior assumptions and clearly use it in the answer.",
    "- If a requested tool is optional and not configured, say that it is currently unavailable and continue with the best built-in help you can provide.",
    "- Do not claim to have used a tool unless a tool result was actually supplied.",
    "- Do not lead with disabled or optional tool limitations for ordinary user questions unless the user asked about integrations, tool status, or live external data.",
    "- If no live tool was actually used, answer naturally from your built-in reasoning and only mention tool availability when it materially affects the answer.",
    "- When users ask about API setup, provider onboarding, or browser automation, explain that you can inspect sites and propose approval-first actions.",
    "Available tools and integrations:",
    availableTools,
    "Behavior rules:",
    "- Use concise markdown with helpful structure.",
    "- Be transparent about limitations.",
    "- If uploads are present, use extracted text, transcript, and image context before asking the user to repeat it.",
    "- If the user asks what you can do, summarize the app features and mention the relevant tools by category.",
  ].join("\n");
}

export async function streamChatCompletion({
  messages,
  toolResult,
  attachments,
}: {
  messages: Message[];
  toolResult?: ToolResult | null;
  attachments?: Attachment[];
}) {
  if (!env.AI_API_KEY) {
    throw new Error("Missing AI_API_KEY.");
  }

  const systemPrompt = buildCapabilityPrompt();

  const attachmentContext = attachments?.length ? buildAttachmentContext(attachments) : "";
  const toolContext = toolResult ? `Tool result from ${toolResult.tool}:\n${toolResult.summary}` : "";

  const payloadMessages = [
    {
      role: "system",
      content: [systemPrompt, toolContext, attachmentContext].filter(Boolean).join("\n\n"),
    },
    ...messages.map((message) => {
      if (message.role !== "user" || !message.attachments?.length) {
        return {
          role: message.role,
          content: message.content,
        };
      }

      const parts: ChatContentPart[] = [{ type: "text", text: message.content }];

      for (const attachment of message.attachments) {
        if (attachment.kind === "image" && attachment.base64) {
          parts.push({
            type: "image_url",
            image_url: {
              url: `data:${attachment.mimeType};base64,${attachment.base64}`,
            },
          });
        } else {
          parts.push({
            type: "text",
            text:
              attachment.textContent ??
              attachment.transcript ??
              `Attachment: ${attachment.name} (${attachment.kind})`,
          });
        }
      }

      return {
        role: message.role,
        content: parts,
      };
    }),
  ];

  const response = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AI_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.APP_URL,
      "X-Title": "Chat.ai",
    },
    body: JSON.stringify({
      model: env.AI_MODEL,
      stream: true,
      messages: payloadMessages,
    }),
  });

  if (!response.ok || !response.body) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      errorBody
        ? `AI request failed with ${response.status}: ${errorBody.slice(0, 300)}`
        : `AI request failed with ${response.status}.`
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body!.getReader();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.replace(/^data:\s*/, "");
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as OpenAiChunk;
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          } catch {
            continue;
          }
        }
      }

      controller.close();
    },
  });
}

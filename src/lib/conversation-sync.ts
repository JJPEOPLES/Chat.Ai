import type { Attachment, Conversation, Message } from "./types";

type DbConversation = {
  id: string;
  title: string;
  memory: string | null;
  created_at: string;
  updated_at: string;
  messages: Array<{
    id: string;
    role: Message["role"];
    content: string;
    tool_name: string | null;
    created_at: string;
    attachments: Array<{
      id: string;
      file_name: string;
      mime_type: string;
      file_size: number;
      extracted_text: string | null;
      transcript: string | null;
    }>;
  }>;
};

export function createStarterConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Welcome to **Chat.ai**.\n\nI can chat, stream answers, inspect uploads, and route your request to public or optional tools automatically.",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function mapDbConversations(conversations: DbConversation[]): Conversation[] {
  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    memory: conversation.memory ?? undefined,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    messages: conversation.messages
      .slice()
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
      .map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        toolName: message.tool_name ?? undefined,
        createdAt: message.created_at,
        attachments: message.attachments?.map(
          (attachment): Attachment => ({
            id: attachment.id,
            name: attachment.file_name,
            mimeType: attachment.mime_type,
            size: attachment.file_size,
            kind: attachment.mime_type.startsWith("image/")
              ? "image"
              : attachment.mime_type.startsWith("audio/")
                ? "audio"
                : attachment.mime_type.startsWith("video/")
                  ? "video"
                  : attachment.mime_type === "application/pdf"
                    ? "pdf"
                    : attachment.mime_type.startsWith("text/")
                      ? "text"
                      : "other",
            textContent: attachment.extracted_text ?? undefined,
            transcript: attachment.transcript ?? undefined,
          })
        ),
      })),
  }));
}

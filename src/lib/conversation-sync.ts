import type { Attachment, Conversation, Message, Project } from "./types";

export const DEFAULT_PROJECT_ID = "00000000-0000-4000-8000-000000000001";

type DbConversation = {
  id: string;
  project_id?: string | null;
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

type DbProject = {
  id: string;
  name: string;
  instructions: string | null;
  memory_items: string[] | null;
  created_at: string;
  updated_at: string;
};

export function createStarterProject(): Project {
  return {
    id: DEFAULT_PROJECT_ID,
    name: "General",
    instructions: "Default workspace for everyday chats and experiments.",
    memoryItems: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createStarterConversation(projectId = DEFAULT_PROJECT_ID): Conversation {
  return {
    id: crypto.randomUUID(),
    projectId,
    title: "New conversation",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Welcome to **Chat.ai**.\n\nI can chat, stream answers, inspect uploads, route your request to live tools, and keep each project workspace isolated.",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function mapDbProjects(projects: DbProject[]): Project[] {
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    instructions: project.instructions ?? undefined,
    memoryItems: project.memory_items ?? [],
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  }));
}

export function mapDbConversations(conversations: DbConversation[]): Conversation[] {
  return conversations.map((conversation) => ({
    id: conversation.id,
    projectId: conversation.project_id ?? DEFAULT_PROJECT_ID,
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

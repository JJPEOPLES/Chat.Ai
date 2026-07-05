import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createStarterProject, DEFAULT_PROJECT_ID, mapDbConversations, mapDbProjects } from "@/lib/conversation-sync";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Conversation, Project } from "@/lib/types";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const { rateLimited } = checkRateLimit(`${ip}:conversations-get`);
  if (rateLimited) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    return NextResponse.json({ projects: [], conversations: [] });
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return NextResponse.json({ projects: [], conversations: [] });
  }

  let projects: Project[] = [];

  const { data: projectData, error: projectError } = await client
    .from("projects")
    .select("id,name,instructions,memory_items,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (!projectError) {
    projects = mapDbProjects((projectData ?? []) as never[]);
  }

  const { data, error } = await client
    .from("conversations")
    .select(
      "id,project_id,title,memory,created_at,updated_at,messages(id,role,content,tool_name,created_at,attachments(id,file_name,mime_type,file_size,extracted_text,transcript))"
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .order("created_at", { foreignTable: "messages", ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const conversations = mapDbConversations((data ?? []) as never[]);

  if (!projects.length) {
    projects = [createStarterProject()];
  }

  if (!conversations.some((conversation) => conversation.projectId !== DEFAULT_PROJECT_ID)) {
    conversations.forEach((conversation) => {
      conversation.projectId = projects[0]?.id ?? DEFAULT_PROJECT_ID;
    });
  }

  return NextResponse.json({ projects, conversations });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const { rateLimited } = checkRateLimit(`${ip}:conversations-post`);
  if (rateLimited) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 400 });
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { projects?: Project[]; conversations: Conversation[] };
  const projects = body.projects ?? [];
  const conversations = body.conversations ?? [];

  for (const project of projects) {
    const { error: projectUpsertError } = await client.from("projects").upsert({
      id: project.id,
      user_id: user.id,
      name: project.name,
      instructions: project.instructions ?? null,
      memory_items: project.memoryItems,
      created_at: project.createdAt,
      updated_at: project.updatedAt,
    });

    if (projectUpsertError && !/projects|memory_items|instructions/i.test(projectUpsertError.message)) {
      return NextResponse.json({ error: projectUpsertError.message }, { status: 500 });
    }
  }

  for (const conversation of conversations) {
    let conversationError: { message: string } | null = null;

    const { error: conversationErrorWithProject } = await client.from("conversations").upsert({
      id: conversation.id,
      user_id: user.id,
      project_id: conversation.projectId === DEFAULT_PROJECT_ID ? null : conversation.projectId,
      title: conversation.title,
      memory: conversation.memory ?? null,
      created_at: conversation.createdAt,
      updated_at: conversation.updatedAt,
    });

    conversationError = conversationErrorWithProject;

    if (conversationErrorWithProject && /project_id/i.test(conversationErrorWithProject.message)) {
      const { error: fallbackConversationError } = await client.from("conversations").upsert({
        id: conversation.id,
        user_id: user.id,
        title: conversation.title,
        memory: conversation.memory ?? null,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
      });
      conversationError = fallbackConversationError;
    }

    if (conversationError) {
      return NextResponse.json({ error: conversationError.message }, { status: 500 });
    }

    const messageIds = conversation.messages.map((message) => message.id);

    if (messageIds.length) {
      await client.from("attachments").delete().in("message_id", messageIds);
    }

    await client.from("messages").delete().eq("conversation_id", conversation.id);

    if (!conversation.messages.length) {
      continue;
    }

    const { error: messageError } = await client.from("messages").insert(
      conversation.messages.map((message) => ({
        id: message.id,
        conversation_id: conversation.id,
        role: message.role,
        content: message.content,
        tool_name: message.toolName ?? null,
        created_at: message.createdAt,
      }))
    );

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    const attachments = conversation.messages.flatMap((message) =>
      (message.attachments ?? []).map((attachment) => ({
        id: attachment.id,
        message_id: message.id,
        file_name: attachment.name,
        mime_type: attachment.mimeType,
        file_size: attachment.size,
        extracted_text: attachment.textContent ?? null,
        transcript: attachment.transcript ?? null,
        storage_path: null,
      }))
    );

    if (attachments.length) {
      const { error: attachmentError } = await client.from("attachments").insert(attachments);
      if (attachmentError) {
        return NextResponse.json({ error: attachmentError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { mapDbConversations } from "@/lib/conversation-sync";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Conversation } from "@/lib/types";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const { rateLimited } = checkRateLimit(`${ip}:conversations-get`);
  if (rateLimited) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    return NextResponse.json({ conversations: [] });
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return NextResponse.json({ conversations: [] });
  }

  const { data, error } = await client
    .from("conversations")
    .select(
      "id,title,memory,created_at,updated_at,messages(id,role,content,tool_name,created_at,attachments(id,file_name,mime_type,file_size,extracted_text,transcript))"
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .order("created_at", { foreignTable: "messages", ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: mapDbConversations((data ?? []) as never[]) });
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

  const body = (await request.json()) as { conversations: Conversation[] };
  const conversations = body.conversations ?? [];

  for (const conversation of conversations) {
    const { error: conversationError } = await client.from("conversations").upsert({
      id: conversation.id,
      user_id: user.id,
      title: conversation.title,
      memory: conversation.memory ?? null,
      created_at: conversation.createdAt,
      updated_at: conversation.updatedAt,
    });

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

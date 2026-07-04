import { NextResponse } from "next/server";
import { streamChatCompletion } from "@/lib/ai";
import { chooseTool } from "@/lib/tool-router";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Attachment, Message } from "@/lib/types";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const { rateLimited } = checkRateLimit(ip);

  if (rateLimited) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  try {
    const body = (await request.json()) as {
      messages: Message[];
      attachments?: Attachment[];
      useTools?: boolean;
    };
    const latest = body.messages.at(-1);

    if (!latest) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const tool = body.useTools ? chooseTool(latest.content) : null;
    const toolResult = tool ? await tool.execute(latest.content) : null;
    const stream = await streamChatCompletion({
      messages: body.messages,
      attachments: body.attachments,
      toolResult,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Tool-Used": toolResult?.tool ?? "AI",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Chat request failed unexpectedly.",
      },
      { status: 500 }
    );
  }
}

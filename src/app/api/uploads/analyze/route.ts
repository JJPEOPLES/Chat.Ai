import { NextResponse } from "next/server";
import {
  detectUploadKind,
  extractPdfText,
  transcribeMedia,
} from "@/lib/attachment-analysis.server";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const { rateLimited } = checkRateLimit(`${ip}:uploads`);

  if (rateLimited) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Limit is 15MB." },
        { status: 400 }
      );
    }

    const kind = detectUploadKind(file.type);
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileBase64 = buffer.toString("base64");
    const base64 = kind === "image" ? fileBase64 : null;
    let textContent: string | null = null;
    let transcript: string | null = null;

    if (kind === "pdf") {
      textContent = await extractPdfText(fileBase64);
    }

    if (kind === "text") {
      textContent = buffer.toString("utf-8");
    }

    if (kind === "audio" || kind === "video") {
      transcript = await transcribeMedia(file);
    }

    return NextResponse.json({
      name: file.name,
      mimeType: file.type,
      size: file.size,
      kind,
      base64,
      textContent,
      transcript,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Upload analysis failed.",
      },
      { status: 500 }
    );
  }
}

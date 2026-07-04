import type { Attachment } from "./types";
import { env } from "./env";
import { detectUploadKind } from "./upload-kind";

export { detectUploadKind };

export async function extractPdfText(base64: string) {
  const pdfParseModuleName = "pdf-" + "parse";
  const { PDFParse } = (await import(pdfParseModuleName)) as typeof import("pdf-parse");
  const buffer = Buffer.from(base64, "base64");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

export async function transcribeMedia(file: File) {
  if (!env.AI_API_KEY) {
    return null;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", process.env.AI_TRANSCRIPTION_MODEL ?? "whisper-1");

  const response = await fetch(`${env.AI_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { text?: string };
  return data.text ?? null;
}

export async function summarizeAttachmentText(attachment: Attachment) {
  return (
    attachment.transcript ??
    attachment.textContent ??
    `Uploaded ${attachment.kind} file named ${attachment.name}.`
  );
}

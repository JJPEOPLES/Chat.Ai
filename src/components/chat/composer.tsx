"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ImageIcon, Mic, Paperclip, Plus, Send, SquareCode, Volume2 } from "lucide-react";
import { detectUploadKind } from "@/lib/upload-kind";
import type { Attachment } from "@/lib/types";

export function ChatComposer({
  onSend,
  disabled,
  seedText,
  onSeedApplied,
  onCreateConversation,
}: {
  onSend: (content: string, attachments: Attachment[]) => Promise<void>;
  disabled: boolean;
  seedText?: string;
  onSeedApplied?: () => void;
  onCreateConversation?: () => void;
}) {
  const speechAvailable = useSyncExternalStore(
    subscribeToBrowserCapabilities,
    getSpeechAvailabilitySnapshot,
    getSpeechAvailabilityServerSnapshot
  );
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!seedText) return;
    const timer = window.setTimeout(() => {
      setContent(seedText);
      onSeedApplied?.();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [seedText, onSeedApplied]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionCtor =
      window.SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: typeof window.SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setContent((current) => `${current}${current ? " " : ""}${transcript}`);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    speechRecognitionRef.current = recognition;

    return () => {
      speechRecognitionRef.current?.stop();
      speechRecognitionRef.current = null;
    };
  }, []);

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const next: Attachment[] = [];

    for (const file of Array.from(list)) {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      next.push({
        id: crypto.randomUUID(),
        name: data.name ?? file.name,
        mimeType: data.mimeType ?? file.type,
        size: data.size ?? file.size,
        kind: data.kind ?? detectUploadKind(file.type),
        base64: data.base64,
        textContent: data.textContent ?? undefined,
        transcript: data.transcript ?? undefined,
      });
    }

    setAttachments((current) => [...current, ...next]);
  }

  function startListening() {
    if (!speechRecognitionRef.current) return;
    setIsListening(true);
    speechRecognitionRef.current.start();
  }

  function speakDraft() {
    if (typeof window === "undefined" || !content.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.rate = 1;
    utterance.pitch = 1.02;
    window.speechSynthesis.speak(utterance);
  }

  async function submit() {
    if (!content.trim() && attachments.length === 0) return;
    const payload = attachments;
    const message = content.trim() || "Please analyze the uploaded files.";
    setContent("");
    setAttachments([]);
    await onSend(message, payload);
  }

  return (
    <div className="pt-5">
      {attachments.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-200"
            >
              {attachment.name} • {attachment.kind}
            </div>
          ))}
        </div>
      ) : null}

      <div className="composer-shell rounded-[30px] p-5">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Message Chat.ai anything..."
          className="min-h-20 w-full resize-none bg-transparent text-[1.8rem] text-slate-100 outline-none placeholder:text-slate-500"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onCreateConversation}
              className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300"
            >
              <Plus className="size-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              accept="image/*,audio/*,video/*,application/pdf,text/plain"
              onChange={(event) => handleFiles(event.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-lg text-slate-200 hover:bg-white/10"
            >
              <Paperclip className="size-4" />
              Upload
            </button>
            <button
              onClick={() =>
                setContent((current) =>
                  `${current}${current ? "\n\n" : ""}Think step by step and give me the strongest answer.`
                )
              }
              className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-4 py-2.5 text-lg text-fuchsia-300"
            >
              <Mic className="size-4" />
              Deep Think
            </button>
            <button
              onClick={() => setContent((current) => `${current}${current ? "\n\n" : ""}Help me with an image task.`)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-lg text-slate-200"
            >
              <ImageIcon className="size-4" />
              Image
            </button>
            <button
              onClick={() => setContent((current) => `${current}${current ? "\n\n" : ""}Help me write or debug code.`)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-lg text-slate-200"
            >
              <SquareCode className="size-4" />
              Code
            </button>
            <button
              onClick={startListening}
              disabled={!speechAvailable}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-lg text-slate-200 disabled:opacity-40"
            >
              <Mic className="size-4" />
              {isListening ? "Listening..." : "Voice input"}
            </button>
            <button
              onClick={speakDraft}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-lg text-slate-200"
            >
              <Volume2 className="size-4" />
              Voice output
            </button>
          </div>

          <button
            disabled={disabled}
            onClick={submit}
            className="flex size-18 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white shadow-[0_18px_42px_rgba(124,58,237,0.45)] disabled:opacity-50"
          >
            <Send className="size-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

function subscribeToBrowserCapabilities() {
  return () => {};
}

function getSpeechAvailabilitySnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function getSpeechAvailabilityServerSnapshot() {
  return false;
}

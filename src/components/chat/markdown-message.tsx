"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown prose prose-invert max-w-none text-sm text-slate-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { className, children, ...rest } = props;
            const match = /language-(\w+)/.exec(className ?? "");
            const text = String(children).replace(/\n$/, "");

            if (!match) {
              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            }

            return <CodeBlock code={text} language={match[1]} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative">
      <button
        onClick={copy}
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre>
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}

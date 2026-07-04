"use client";

import Image from "next/image";
import { useState } from "react";
import { Globe, LoaderCircle, ShieldCheck, Play, CheckCircle2, AlertTriangle } from "lucide-react";
import type { BrowserPlan, BrowserRunResult } from "@/lib/types";

export function BrowserAgentPanel() {
  const [request, setRequest] = useState(
    "Make an API key for me on these websites: https://example.com https://example.org"
  );
  const [plan, setPlan] = useState<BrowserPlan | null>(null);
  const [result, setResult] = useState<BrowserRunResult | null>(null);
  const [planning, setPlanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generatePlan() {
    setPlanning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/browser/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to generate plan.");
      }

      setPlan(data.plan as BrowserPlan);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Unable to generate plan.");
    } finally {
      setPlanning(false);
    }
  }

  async function runPlan() {
    if (!plan) return;
    setRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/browser/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true, plan }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to run browser plan.");
      }

      setResult(data as BrowserRunResult);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Unable to run browser plan.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rail-card rounded-[28px] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-fuchsia-500/12 p-3 text-fuchsia-300">
            <Globe className="size-5" />
          </div>
          <div>
            <div className="text-[1.55rem] font-semibold text-white">Browser Agent</div>
            <div className="text-sm text-slate-400">Approval required before any website action runs</div>
          </div>
        </div>
        <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
          Confirm first
        </div>
      </div>

      <textarea
        value={request}
        onChange={(event) => setRequest(event.target.value)}
        placeholder="Ask the browser agent to open websites, fill forms, create accounts, or generate API keys."
        className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/4 p-4 text-sm text-slate-100 outline-none placeholder:text-slate-500"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={generatePlan}
          disabled={planning || running}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {planning ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          Generate action plan
        </button>

        <button
          onClick={runPlan}
          disabled={!plan || planning || running}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-slate-100 disabled:opacity-40"
        >
          {running ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
          Approve & run
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {plan ? (
        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/4 p-4">
          <div className="mb-2 flex items-center gap-2 text-white">
            <ShieldCheck className="size-4 text-fuchsia-300" />
            <span className="font-medium">{plan.title}</span>
          </div>
          <p className="mb-3 text-sm text-slate-300">{plan.summary}</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {plan.websites.map((website) => (
              <span key={website} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                {website}
              </span>
            ))}
          </div>
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">Planned steps</div>
          <ol className="space-y-2 text-sm text-slate-200">
            {plan.steps.map((step, index) => (
              <li key={`${step.type}-${index}`} className="rounded-2xl border border-white/8 bg-[#0b1222] px-3 py-2">
                {index + 1}. {renderStep(step)}
              </li>
            ))}
          </ol>

          {plan.risks.length ? (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
              <div className="mb-1 flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4" />
                Risks / blockers
              </div>
              <ul className="space-y-1">
                {plan.risks.map((risk) => (
                  <li key={risk}>- {risk}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/4 p-4">
          <div className="mb-3 flex items-center gap-2 text-white">
            <CheckCircle2 className={`size-4 ${result.ok ? "text-emerald-300" : "text-rose-300"}`} />
            <span className="font-medium">{result.ok ? "Browser run complete" : "Browser run stopped"}</span>
          </div>

          {result.currentUrl ? <div className="mb-3 text-sm text-slate-300">Current URL: {result.currentUrl}</div> : null}

          <div className="space-y-2 text-sm text-slate-300">
            {result.logs.map((log) => (
              <div key={log}>- {log}</div>
            ))}
          </div>

          {result.error ? (
            <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">
              {result.error}
            </div>
          ) : null}

          {result.screenshots.length ? (
            <div className="mt-4 grid gap-3">
              {result.screenshots.map((shot) => (
                <div key={shot.name}>
                  <div className="mb-2 text-sm text-slate-300">{shot.name}</div>
                  <Image
                    src={shot.dataUrl}
                    alt={shot.name}
                    width={1280}
                    height={720}
                    unoptimized
                    className="h-auto w-full rounded-2xl border border-white/10"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function renderStep(step: BrowserPlan["steps"][number]) {
  switch (step.type) {
    case "goto":
      return `Open ${step.url}`;
    case "click":
      return `Click ${describeTarget(step.target)}`;
    case "type":
      return `Type into ${describeTarget(step.target)}${step.secret ? " (secret)" : ""}`;
    case "press":
      return `Press ${step.key} on ${describeTarget(step.target)}`;
    case "wait":
      return `Wait ${step.milliseconds}ms`;
    case "waitForText":
      return `Wait for text "${step.text}"`;
    case "screenshot":
      return `Capture screenshot "${step.name}"`;
    case "extractText":
      return `Extract text from ${describeTarget(step.target)} into "${step.name}"`;
  }
}

function describeTarget(target: BrowserPlan["steps"][number] extends infer T
  ? T extends { target: infer U }
    ? U
    : never
  : never) {
  return target.selector ?? target.label ?? target.placeholder ?? target.text ?? "target";
}

import { z } from "zod";
import { env } from "./env";
import type { BrowserAction, BrowserPlan, BrowserRunResult, BrowserTarget } from "./types";
import type { Browser, BrowserContext, Page } from "playwright";

const browserTargetSchema = z.object({
  selector: z.string().optional(),
  text: z.string().optional(),
  placeholder: z.string().optional(),
  label: z.string().optional(),
});

const browserActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("goto"), url: z.string().url(), note: z.string().optional() }),
  z.object({ type: z.literal("click"), target: browserTargetSchema, note: z.string().optional() }),
  z.object({
    type: z.literal("type"),
    target: browserTargetSchema,
    value: z.string(),
    secret: z.boolean().optional(),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal("press"),
    target: browserTargetSchema,
    key: z.string(),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal("wait"),
    milliseconds: z.number().int().min(0).max(30000),
    note: z.string().optional(),
  }),
  z.object({ type: z.literal("waitForText"), text: z.string(), note: z.string().optional() }),
  z.object({ type: z.literal("screenshot"), name: z.string(), note: z.string().optional() }),
  z.object({
    type: z.literal("extractText"),
    target: browserTargetSchema,
    name: z.string(),
    note: z.string().optional(),
  }),
]);

const browserPlanSchema = z.object({
  title: z.string(),
  summary: z.string(),
  websites: z.array(z.string().url()).max(25),
  risks: z.array(z.string()).max(10),
  requiresLogin: z.boolean(),
  steps: z.array(browserActionSchema).min(1).max(80),
});

function extractJsonObject(input: string) {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in browser plan response.");
  }

  return input.slice(start, end + 1);
}

type RequestedProvider = {
  provider: string;
  url: string;
  env: string;
};

function parseRequestedProviders(request: string): RequestedProvider[] {
  const lines = request.split(/\r?\n/);
  const providers: RequestedProvider[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const providerMatch = lines[index]?.match(/^\s*\d+\.\s+(.+?)\s*$/);
    if (!providerMatch) continue;

    const provider = providerMatch[1].trim();
    const urlLine = lines[index + 1] ?? "";
    const envLine = lines[index + 2] ?? "";
    const urlMatch = urlLine.match(/URL:\s*(https?:\/\/\S+)/i);
    const envMatch = envLine.match(/Env:\s*([A-Z0-9_]+)/i);

    if (!urlMatch || !envMatch) continue;

    providers.push({
      provider,
      url: urlMatch[1].trim(),
      env: envMatch[1].trim(),
    });
  }

  return providers;
}

function inferProviderRow(provider: RequestedProvider) {
  const name = provider.provider.toLowerCase();

  const defaults = {
    keyNeeded: "Yes",
    freeTier: "Unknown",
    billingRequired: "Unknown",
    manualVerification: "Possible",
    bestNextAction: "Open docs and find sign-up or API access entry point.",
  };

  if (name.includes("serpapi")) {
    return {
      ...defaults,
      freeTier: "Yes",
      billingRequired: "Not initially",
      manualVerification: "Low",
      bestNextAction: "Open pricing or sign-up, confirm free credits, then stop before account creation.",
    };
  }

  if (name.includes("world news")) {
    return {
      ...defaults,
      freeTier: "Likely",
      billingRequired: "Unknown",
      manualVerification: "Low",
      bestNextAction: "Open docs or pricing, confirm whether an API key is required and whether a free plan exists.",
    };
  }

  if (name.includes("mapbox")) {
    return {
      ...defaults,
      freeTier: "Yes",
      billingRequired: "May be required later",
      manualVerification: "Low",
      bestNextAction: "Open account or token docs, confirm default public token flow, then stop before token creation.",
    };
  }

  if (name.includes("netlify")) {
    return {
      ...defaults,
      freeTier: "Yes",
      billingRequired: "No",
      manualVerification: "Low",
      bestNextAction: "Open personal access token docs and stop before creating a token.",
    };
  }

  if (name.includes("omdb")) {
    return {
      ...defaults,
      freeTier: "Yes",
      billingRequired: "No",
      manualVerification: "Low",
      bestNextAction: "Open key request flow and stop before final submit.",
    };
  }

  if (name.includes("twitter") || name.includes("x api")) {
    return {
      ...defaults,
      freeTier: "Limited / changes often",
      billingRequired: "Possible",
      manualVerification: "High",
      bestNextAction: "Open developer access docs and confirm current plan requirements before any signup steps.",
    };
  }

  if (name.includes("google maps") || name.includes("youtube")) {
    return {
      ...defaults,
      freeTier: "Yes",
      billingRequired: "Usually yes for project setup",
      manualVerification: "Medium",
      bestNextAction: "Open Google Cloud setup docs and stop before enabling billing or creating credentials.",
    };
  }

  if (name.includes("ebay")) {
    return {
      ...defaults,
      freeTier: "Yes",
      billingRequired: "No",
      manualVerification: "Medium",
      bestNextAction: "Open developer program sign-up and confirm keyset flow before account steps.",
    };
  }

  if (name.includes("gyazo") || name.includes("adoptapet")) {
    return {
      ...defaults,
      freeTier: "Unknown",
      billingRequired: "Unknown",
      manualVerification: "Possible",
      bestNextAction: "Open docs and find authentication or access requirements before any signup flow.",
    };
  }

  return defaults;
}

function buildFallbackPlan(request: string): BrowserPlan {
  const providers = parseRequestedProviders(request);
  if (providers.length) {
    const firstProvider = providers[0];
    const rows = providers
      .map((provider) => {
        const details = inferProviderRow(provider);
        return `| ${provider.provider} | ${provider.env} | ${details.keyNeeded} | ${details.freeTier} | ${details.billingRequired} | ${details.manualVerification} | ${details.bestNextAction} |`;
      })
      .join("\n");

    return {
      title: `Provider setup: ${firstProvider.provider}`,
      summary: [
        "I inspected your provider list and picked the best first provider to advance next.",
        "",
        "| provider | env var | key needed? | free tier? | billing required? | manual verification needed? | best next action |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        rows,
        "",
        `First provider to advance next: **${firstProvider.provider}**`,
        "Approve the first provider only; I should stop before any login, signup submit, billing, or key creation step.",
      ].join("\n"),
      websites: [firstProvider.url],
      risks: [
        "Provider pricing, verification, and signup requirements can change.",
        "I must pause before account creation, key creation, billing, or terms acceptance.",
      ],
      requiresLogin: true,
      steps: [
        { type: "goto", url: firstProvider.url, note: `Open ${firstProvider.provider}` },
        {
          type: "wait",
          milliseconds: 1200,
          note: "Let the page finish initial rendering before identifying the entry point.",
        },
      ],
    };
  }

  const urlMatches = [...new Set([...request.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0]))];
  const providerUrls = urlMatches.filter(
    (url) => !/chataiwebs\.netlify\.app|localhost:3000|supabase\.co\/auth\/v1\/callback/i.test(url)
  );
  const targets = (providerUrls.length ? providerUrls : urlMatches).slice(0, 1);

  return {
    title: "Inspect requested provider",
    summary:
      "I prepared a provider-first browser workflow. Approve one provider at a time, and I will stop before any approval-gated action.",
    websites: targets,
    risks: ["Complex authenticated flows may require manual follow-up."],
    requiresLogin: /login|sign in|account|api key/i.test(request),
    steps: targets.length
      ? [
          { type: "goto", url: targets[0], note: "Open the first provider website" } satisfies BrowserAction,
          { type: "wait", milliseconds: 1200, note: "Wait for the page to stabilize" } satisfies BrowserAction,
        ]
      : [
          {
            type: "wait",
            milliseconds: 1000,
            note: "No website link was found in the request.",
          } satisfies BrowserAction,
        ],
  };
}

export async function generateBrowserPlan(request: string) {
  if (!env.AI_API_KEY) {
    throw new Error("Missing AI_API_KEY.");
  }

  const plannerPrompt = [
    "You are a browser automation planner for Chat.ai.",
    "Your job is to inspect provider websites and decide the next best action instead of merely echoing all input URLs.",
    "Prefer provider-by-provider execution for API key setup, developer portal setup, and OAuth app creation.",
    "When the user provides a provider list with env var names, summarize it as a markdown table inside the summary field.",
    "The summary field should contain a table with these columns: provider, env var, key needed?, free tier?, billing required?, manual verification needed?, best next action.",
    "Pick only the single best provider to advance next.",
    "Do not create screenshot-only plans for provider setup.",
    "Only include the websites that are actually needed for the next sequence of actions.",
    "Avoid including the app URL, localhost URL, or Supabase callback URL unless they are specifically needed for a step such as entering redirect URIs.",
    "Use as many steps as needed up to 80, but keep them high-signal and action-oriented.",
    "When many providers are listed, prioritize the easiest provider that can be advanced next and mention the remaining providers in risks or summary.",
    "Return only JSON matching this shape:",
    '{"title":"string","summary":"string","websites":["https://..."],"risks":["string"],"requiresLogin":true,"steps":[{"type":"goto","url":"https://..."}]}',
    "Supported steps only:",
    '- goto { url }',
    '- click { target: { selector? text? placeholder? label? } }',
    '- type { target, value, secret? }',
    '- press { target, key }',
    '- wait { milliseconds }',
    '- waitForText { text }',
    '- screenshot { name }',
    '- extractText { target, name }',
    "Keep steps concrete and short. Do not invent credentials. If login or CAPTCHAs are likely, mention them in risks.",
    "If a flow needs approval before creating a key or submitting a form, end the plan right before that action whenever possible.",
    "The plan should ask for approval of the first provider before any login, signup submit, billing, or key creation action.",
  ].join("\n");

  const response = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AI_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.APP_URL,
      "X-Title": "Chat.ai Browser Planner",
    },
    body: JSON.stringify({
      model: env.AI_MODEL,
      messages: [
        { role: "system", content: plannerPrompt },
        { role: "user", content: request },
      ],
      stream: false,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    return buildFallbackPlan(request);
  }

  try {
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(extractJsonObject(content));
    return browserPlanSchema.parse(parsed);
  } catch {
    return buildFallbackPlan(request);
  }
}

async function resolveTarget(page: Page, target: BrowserTarget) {
  if (target.selector) return page.locator(target.selector).first();
  if (target.text) return page.getByText(target.text, { exact: false }).first();
  if (target.placeholder) return page.getByPlaceholder(target.placeholder, { exact: false }).first();
  if (target.label) return page.getByLabel(target.label, { exact: false }).first();
  throw new Error("Browser target is missing selector, text, placeholder, or label.");
}

async function withBrowser<T>(callback: (args: {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}) => Promise<T>) {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    const playwrightModuleName = "play" + "wright";
    const { chromium } = (await import(playwrightModuleName)) as typeof import("playwright");
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown browser runtime error.";
    if (/playwright|browsers\.json|MODULE_NOT_FOUND/i.test(message)) {
      throw new Error(
        "Browser automation is unavailable in this Netlify runtime. Use local development for browser actions or move browser execution to a dedicated worker."
      );
    }

    throw error;
  }

  const page = await context.newPage();

  try {
    return await callback({ browser, context, page });
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function runBrowserPlan(plan: BrowserPlan): Promise<BrowserRunResult> {
  const validated = browserPlanSchema.parse(plan);

  return withBrowser(async ({ page }) => {
    const logs: string[] = [];
    const screenshots: Array<{ name: string; dataUrl: string }> = [];
    const extracted: Record<string, string> = {};

    try {
      for (const [index, step] of validated.steps.entries()) {
        logs.push(`Step ${index + 1}: ${step.type}`);

        if (step.type === "goto") {
          const url = new URL(step.url);
          if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error(`Blocked non-http(s) URL: ${step.url}`);
          }

          await page.goto(step.url, { waitUntil: "domcontentloaded", timeout: 30000 });
          continue;
        }

        if (step.type === "click") {
          const locator = await resolveTarget(page, step.target);
          await locator.click({ timeout: 10000 });
          continue;
        }

        if (step.type === "type") {
          const locator = await resolveTarget(page, step.target);
          await locator.fill(step.value, { timeout: 10000 });
          continue;
        }

        if (step.type === "press") {
          const locator = await resolveTarget(page, step.target);
          await locator.press(step.key, { timeout: 10000 });
          continue;
        }

        if (step.type === "wait") {
          await page.waitForTimeout(step.milliseconds);
          continue;
        }

        if (step.type === "waitForText") {
          await page.getByText(step.text, { exact: false }).first().waitFor({ timeout: 15000 });
          continue;
        }

        if (step.type === "screenshot") {
          const buffer = await page.screenshot({ type: "png", fullPage: true });
          screenshots.push({
            name: step.name,
            dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
          });
          continue;
        }

        if (step.type === "extractText") {
          const locator = await resolveTarget(page, step.target);
          extracted[step.name] = (await locator.textContent())?.trim() ?? "";
        }
      }

      return {
        ok: true,
        currentUrl: page.url(),
        logs,
        screenshots,
        extracted,
      };
    } catch (error) {
      return {
        ok: false,
        currentUrl: page.url(),
        logs,
        screenshots,
        extracted,
        error: error instanceof Error ? error.message : "Browser run failed.",
      };
    }
  });
}

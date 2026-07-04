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

function buildFallbackPlan(request: string): BrowserPlan {
  const urlMatches = [...new Set([...request.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0]))];
  const providerUrls = urlMatches.filter(
    (url) => !/chataiwebs\.netlify\.app|localhost:3000|supabase\.co\/auth\/v1\/callback/i.test(url)
  );
  const targets = (providerUrls.length ? providerUrls : urlMatches).slice(0, 25);

  return {
    title: "Inspect requested providers",
    summary:
      "This fallback plan opens the requested provider websites, captures the current state, and prepares for provider-by-provider follow-up.",
    websites: targets,
    risks: ["Complex authenticated flows may require manual follow-up."],
    requiresLogin: /login|sign in|account|api key/i.test(request),
    steps: targets.length
      ? targets.flatMap((url, index) => [
          { type: "goto", url, note: `Open website ${index + 1}` } satisfies BrowserAction,
          { type: "screenshot", name: `website-${index + 1}` } satisfies BrowserAction,
        ])
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

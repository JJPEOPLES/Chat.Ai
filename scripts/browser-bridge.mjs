import http from "node:http";
import { chromium } from "playwright";

const PORT = Number(process.env.BROWSER_BRIDGE_PORT || 4467);
const ALLOWED_ORIGINS = new Set([
  "https://chataiwebs.netlify.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function json(response, status, payload, origin = "*") {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
}

function getAllowedOrigin(request) {
  const origin = request.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return origin;
  }

  return "*";
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function resolveTarget(page, target) {
  if (target?.selector) return page.locator(target.selector).first();
  if (target?.text) return page.getByText(target.text, { exact: false }).first();
  if (target?.placeholder) return page.getByPlaceholder(target.placeholder, { exact: false }).first();
  if (target?.label) return page.getByLabel(target.label, { exact: false }).first();
  throw new Error("Browser target is missing selector, text, placeholder, or label.");
}

async function runPlan(plan) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const logs = [];
  const screenshots = [];
  const extracted = {};

  try {
    for (const [index, step] of (plan.steps ?? []).entries()) {
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
  } finally {
    await context.close();
    await browser.close();
  }
}

const server = http.createServer(async (request, response) => {
  const origin = getAllowedOrigin(request);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    json(response, 200, { ok: true, mode: "local-bridge" }, origin);
    return;
  }

  if (request.method === "POST" && request.url === "/run") {
    try {
      const body = await readJson(request);
      if (!body?.plan) {
        json(response, 400, { error: "Missing plan." }, origin);
        return;
      }

      const result = await runPlan(body.plan);
      json(response, result.ok ? 200 : 500, result, origin);
      return;
    } catch (error) {
      json(
        response,
        500,
        { error: error instanceof Error ? error.message : "Local bridge execution failed." },
        origin
      );
      return;
    }
  }

  json(response, 404, { error: "Not found." }, origin);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Chat.ai local browser bridge running on http://127.0.0.1:${PORT}`);
});

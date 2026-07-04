const requests = new Map<string, number[]>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

export function checkRateLimit(key: string) {
  const now = Date.now();
  const existing = requests.get(key) ?? [];
  const filtered = existing.filter((timestamp) => now - timestamp < WINDOW_MS);

  if (filtered.length >= MAX_REQUESTS) {
    requests.set(key, filtered);
    return { rateLimited: true, remaining: 0 };
  }

  filtered.push(now);
  requests.set(key, filtered);

  return { rateLimited: false, remaining: MAX_REQUESTS - filtered.length };
}

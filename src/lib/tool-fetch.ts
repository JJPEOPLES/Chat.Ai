export async function fetchJson<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function optionalToolDisabled(tool: string, reason: string) {
  return {
    tool,
    ok: false,
    summary: `${tool} is currently disabled.`,
    reason,
  };
}

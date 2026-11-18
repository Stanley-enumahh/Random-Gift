// Browser-side helper: calls our own Next.js routes and turns DRF errors into messages.

export class ApiError extends Error {
  // Per-field messages, e.g. { email: "An account with this email already exists." }
  constructor(message: string, readonly fields: Record<string, string> = {}) {
    super(message);
  }
}

export async function postJson<T = unknown>(url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw toApiError(data);
  return data as T;
}

function firstMessage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function toApiError(data: unknown): ApiError {
  const fields: Record<string, string> = {};
  let general: string | null = null;
  if (data && typeof data === "object") {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const msg = firstMessage(value);
      if (!msg) continue;
      if (key === "detail" || key === "non_field_errors") general ??= msg;
      else fields[key] = msg;
    }
  }
  return new ApiError(general ?? Object.values(fields)[0] ?? "Something went wrong. Please try again.", fields);
}

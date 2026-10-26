export async function timedFetch(url: string, init?: RequestInit, requestId = globalThis.crypto.randomUUID()): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("x-dwt-request-id", requestId);
  const startedAt = performance.now();
  try {
    const response = await fetch(url, { ...init, headers });
    if (process.env.NODE_ENV === "development") {
      const path = new URL(url, window.location.origin).pathname.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/[id]");
      console.info(`[timing ${requestId}] client ${init?.method ?? "GET"} ${path} ${response.status} wait=${(performance.now() - startedAt).toFixed(1)}ms`);
    }
    return response;
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.info(`[timing ${requestId}] client request failed wait=${(performance.now() - startedAt).toFixed(1)}ms`);
    throw error;
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const requestId = globalThis.crypto.randomUUID();
  const startedAt = performance.now();
  const response = await timedFetch(url, init, requestId);
  const data = await response.json().catch(() => ({}));
  if (process.env.NODE_ENV === "development") {
    const path = new URL(url, window.location.origin).pathname.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/[id]");
    console.info(`[timing ${requestId}] client ${init?.method ?? "GET"} ${path} complete=${(performance.now() - startedAt).toFixed(1)}ms`);
  }
  if (!response.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data as T;
}

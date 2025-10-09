const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined | null>;
  body?: BodyInit | Record<string, unknown> | null;
  responseType?: "json" | "blob" | "text";
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(path, API_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

function normalizeBody(body: RequestOptions["body"]): BodyInit | undefined {
  if (!body) return undefined;
  if (body instanceof FormData) return body;
  if (typeof body === "string" || body instanceof Blob) return body;
  return JSON.stringify(body);
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}) {
  const {
    method,
    headers,
    query,
    body,
    responseType = "json",
    signal,
  } = options;

  const url = buildUrl(path, query);
  const payload = normalizeBody(body);

  const requestHeaders = new Headers(headers);
  const isFormData = body instanceof FormData;

  if (!isFormData && payload && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    method: method ?? (payload ? "POST" : "GET"),
    headers: requestHeaders,
    body: payload,
    signal,
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorJson = await response.json();
      errorMessage = errorJson?.error || errorJson?.detail || errorMessage;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errorMessage || "Erro na requisição");
  }

  if (responseType === "blob") {
    return (await response.blob()) as T;
  }

  if (responseType === "text") {
    return (await response.text()) as T;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

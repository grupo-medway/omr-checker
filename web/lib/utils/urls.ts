const DEFAULT_API_BASE = "http://localhost:8000";

function sanitizeBaseUrl(value?: string | null) {
  if (!value) {
    return DEFAULT_API_BASE;
  }
  return value.replace(/\/$/, "");
}

export function resolveAuditImageUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }

  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:")) {
    return url;
  }

  if (!url.startsWith("/static/")) {
    return url;
  }

  const baseUrl = sanitizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  return encodeURI(`${baseUrl}${url}`);
}

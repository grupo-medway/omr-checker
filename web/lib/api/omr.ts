import { apiFetch } from "./client";
import { ProcessResponse } from "./types";

export function processOmr(
  params: {
    file: File;
    template: string;
  },
  auth?: { token?: string | null },
) {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("template", params.template);

  const headers: Record<string, string> = {};
  if (auth?.token) {
    headers["X-Audit-Token"] = auth.token;
  }

  return apiFetch<ProcessResponse>("/api/process-omr", {
    method: "POST",
    headers,
    body: formData,
  });
}

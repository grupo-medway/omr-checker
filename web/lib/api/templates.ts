import { apiFetch } from "./client";

export function getTemplates() {
  return apiFetch<{ templates: string[] }>("/api/templates");
}

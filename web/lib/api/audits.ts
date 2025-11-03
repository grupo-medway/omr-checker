import { apiFetch } from "./client";
import { buildAuditHeaders } from "./helpers";
import {
  AuditDecisionRequest,
  AuditDetail,
  AuditListResponse,
  ExportMetadata,
} from "./types";

type AuthConfig = {
  user: string;
  token?: string | null;
};

type ListAuditParams = {
  status?: string | null;
  template?: string | null;
  batchId?: string | null;
  page?: number;
  pageSize?: number;
};

export function listAudits(params: ListAuditParams, auth: AuthConfig) {
  return apiFetch<AuditListResponse>("/api/audits", {
    headers: buildAuditHeaders(auth),
    query: {
      status: params.status ?? undefined,
      template: params.template ?? undefined,
      batch_id: params.batchId ?? undefined,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 50,
    },
  });
}

export function getAuditDetail(id: number, auth: AuthConfig) {
  return apiFetch<AuditDetail>(`/api/audits/${id}`, {
    headers: buildAuditHeaders(auth),
  });
}

export function submitAuditDecision(
  id: number,
  payload: AuditDecisionRequest,
  auth: AuthConfig,
) {
  return apiFetch<AuditDetail>(`/api/audits/${id}/decision`, {
    method: "POST",
    headers: buildAuditHeaders(auth),
    body: payload,
  });
}

export function exportBatch(
  batchId: string,
  auth: AuthConfig,
  options?: { metadata?: boolean },
) {
  if (options?.metadata) {
    return apiFetch<ExportMetadata>("/api/audits/export", {
      headers: buildAuditHeaders(auth),
      query: { batch_id: batchId, format: "json" },
    });
  }

  return apiFetch<Blob>("/api/audits/export", {
    headers: buildAuditHeaders(auth),
    query: { batch_id: batchId, format: "file" },
    responseType: "blob",
  });
}

export function cleanupBatch(
  batchId: string,
  auth: AuthConfig,
) {
  return apiFetch<{ batch_id: string }>("/api/audits/cleanup", {
    method: "POST",
    headers: buildAuditHeaders(auth),
    body: { batch_id: batchId, confirm: true },
  });
}

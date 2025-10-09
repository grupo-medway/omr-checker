"use client";

import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  cleanupBatch,
  exportBatch,
  getAuditDetail,
  listAudits,
  submitAuditDecision,
} from "@/lib/api/audits";
import { processOmr } from "@/lib/api/omr";
import { getTemplates } from "@/lib/api/templates";
import {
  AuditDecisionRequest,
  AuditDetail,
  AuditListResponse,
  ProcessResponse,
} from "@/lib/api/types";
import { useAuditCredentials } from "@/components/audit-credentials-provider";

export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 100;

export function useTemplatesQuery() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => getTemplates(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useProcessOmrMutation(
  options?: UseMutationOptions<ProcessResponse, Error, { file: File; template: string }>,
) {
  const { credentials } = useAuditCredentials();

  return useMutation<ProcessResponse, Error, { file: File; template: string }>({
    mutationKey: ["process-omr"],
    mutationFn: (variables) =>
      processOmr(variables, {
        token: credentials.token,
      }),
    ...options,
  });
}

type AuditListArgs = {
  status?: string | null;
  template?: string | null;
  batchId?: string | null;
  page?: number;
  pageSize?: number;
};

export function useAuditListQuery(
  params: AuditListArgs,
  options?: { enabled?: boolean },
): UseQueryResult<AuditListResponse, Error> {
  const { credentials, hydrated } = useAuditCredentials();

  const enabled =
    hydrated &&
    !!credentials.user &&
    !!params.batchId &&
    (options?.enabled ?? true);

  return useQuery({
    queryKey: ["audit-list", params],
    enabled,
    queryFn: () =>
      listAudits(
        {
          status: params.status,
          template: params.template,
          batchId: params.batchId,
          page: params.page,
          pageSize: clampPageSize(params.pageSize),
        },
        credentials,
      ),
    // Removido staleTime para garantir refetch após invalidação
  });
}

export function useAuditDetailQuery(
  id: number | null,
  options?: { enabled?: boolean },
) {
  const { credentials, hydrated } = useAuditCredentials();

  const enabled =
    hydrated &&
    !!credentials.user &&
    !!id &&
    (options?.enabled ?? true);

  return useQuery({
    queryKey: ["audit-detail", id],
    enabled,
    queryFn: () => getAuditDetail(id!, credentials),
  });
}

export function useSubmitDecisionMutation(
  auditId: number | null,
) {
  const queryClient = useQueryClient();
  const { credentials, hydrated } = useAuditCredentials();

  return useMutation({
    mutationKey: ["audit-decision", auditId],
    mutationFn: (payload: AuditDecisionRequest) => {
      if (!hydrated || !credentials.user) {
        throw new Error("Credenciais de auditoria não carregadas");
      }
      if (!auditId) {
        throw new Error("Nenhum item selecionado");
      }
      return submitAuditDecision(auditId, payload, credentials);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["audit-detail", auditId] });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "audit-list" || query.queryKey[0] === "batch-summary",
      });
      return data;
    },
  });
}

export function useExportBatchMutation(batchId: string | null) {
  const { credentials } = useAuditCredentials();

  return useMutation<Blob, Error>({
    mutationKey: ["export-batch", batchId],
    mutationFn: async () => {
      if (!batchId) {
        throw new Error("Lote não selecionado");
      }
      const blob = await exportBatch(batchId, credentials) as Blob;
      return blob;
    },
  });
}

export function useExportMetadataQuery(batchId: string | null) {
  const { credentials, hydrated } = useAuditCredentials();

  return useQuery({
    queryKey: ["batch-summary", batchId],
    enabled: hydrated && !!credentials.user && !!batchId,
    queryFn: async () => {
      if (!batchId) {
        throw new Error("Lote não selecionado");
      }
      try {
        return await exportBatch(batchId, credentials, { metadata: true });
      } catch (error) {
        return null;
      }
    },
    staleTime: 1000 * 10,
  });
}

export function useCleanupBatchMutation(batchId: string | null) {
  const queryClient = useQueryClient();
  const { credentials } = useAuditCredentials();

  return useMutation({
    mutationKey: ["cleanup-batch", batchId],
    mutationFn: async () => {
      if (!batchId) {
        throw new Error("Lote não selecionado");
      }
      return cleanupBatch(batchId, credentials);
    },
    onSuccess: () => {
      queryClient.removeQueries({
        predicate: (query) =>
          ["audit-list", "audit-detail", "batch-summary"].includes(
            String(query.queryKey[0]),
          ),
      });
    },
  });
}

export type IssueType = "multi-marked" | "unmarked" | "invalid" | "unknown";

export function useAuditIssues(detail: AuditDetail | undefined) {
  return useMemo(() => {
    if (!detail) return new Set<string>();
    const issueQuestions = detail.issues
      .map((issue) => issue.split(":")[0]?.trim())
      .filter(Boolean);
    return new Set(issueQuestions as string[]);
  }, [detail]);
}

export function useAuditIssuesMap(detail: AuditDetail | undefined) {
  return useMemo(() => {
    if (!detail) return new Map<string, IssueType>();

    const issuesMap = new Map<string, IssueType>();

    detail.issues.forEach((issue) => {
      const [questionId, ...descParts] = issue.split(":");
      const description = descParts.join(":").toLowerCase().trim();
      const question = questionId?.trim();

      if (!question) return;

      let type: IssueType = "unknown";
      if (description.includes("multi")) {
        type = "multi-marked";
      } else if (description.includes("unmarked") || description.includes("not marked")) {
        type = "unmarked";
      } else if (description.includes("invalid")) {
        type = "invalid";
      }

      issuesMap.set(question, type);
    });

    return issuesMap;
  }, [detail]);
}

function clampPageSize(value?: number | null, fallback = DEFAULT_PAGE_SIZE) {
  const numeric = typeof value === "number" && !Number.isNaN(value) ? value : fallback;
  return Math.min(Math.max(1, numeric), MAX_PAGE_SIZE);
}

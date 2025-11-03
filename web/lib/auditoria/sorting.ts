import type { AuditListItem } from "@/lib/api/types";

export type IssueSeverity = "critical" | "warning" | "info" | "other" | "none";

const severityOrder: Record<IssueSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  other: 3,
  none: 4,
};

const statusOrder: Record<string, number> = {
  pending: 0,
  reopened: 1,
  resolved: 2,
};

export function getIssueSeverity(issues: string[]): IssueSeverity {
  if (issues.length === 0) {
    return "none";
  }

  const normalizedIssues = issues.map((issue) => issue.toLowerCase());

  if (normalizedIssues.some((issue) => issue.includes("multi"))) {
    return "critical";
  }

  if (normalizedIssues.some((issue) => issue.includes("unmarked"))) {
    return "warning";
  }

  if (normalizedIssues.some((issue) => issue.includes("invalid"))) {
    return "info";
  }

  // Qualquer issue não mapeada ainda é considerada relevante e deve aparecer antes dos cartões sem issues.
  return "other";
}

export function sortByPriority(items: AuditListItem[]): AuditListItem[] {
  return [...items].sort((a, b) => {
    const aSeverity = getIssueSeverity(a.issues);
    const bSeverity = getIssueSeverity(b.issues);

    if (severityOrder[aSeverity] !== severityOrder[bSeverity]) {
      return severityOrder[aSeverity] - severityOrder[bSeverity];
    }

    const aStatus = statusOrder[a.status] ?? Number.POSITIVE_INFINITY;
    const bStatus = statusOrder[b.status] ?? Number.POSITIVE_INFINITY;

    if (aStatus !== bStatus) {
      return aStatus - bStatus;
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}


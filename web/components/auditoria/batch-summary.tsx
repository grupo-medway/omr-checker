import { BadgeCheck, Clock, Loader2, RefreshCw, Users } from "lucide-react";

import type { AuditListResponse } from "@/lib/api/types";

type BatchSummaryProps = {
  response: AuditListResponse | undefined;
  batchId: string | null;
  manifestInfo?: {
    exported_at?: string | null;
    exported_by?: string | null;
  } | null;
  isRefreshing?: boolean;
};

export function BatchSummary({ response, batchId, manifestInfo, isRefreshing }: BatchSummaryProps) {
  if (!response || !batchId) {
    return null;
  }

  const items = [
    {
      label: "Pendentes",
      value: response.pending,
      icon: Clock,
    },
    {
      label: "Resolvidos",
      value: response.resolved,
      icon: BadgeCheck,
    },
    {
      label: "Reabertos",
      value: response.reopened,
      icon: RefreshCw,
    },
    {
      label: "Total",
      value: response.total,
      icon: Users,
    },
  ];

  return (
    <div className="grid gap-4 rounded-lg border border-border/40 bg-card p-4 shadow-sm sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <item.icon className="h-4 w-4" />
            {item.label}
          </span>
          <span className="text-2xl font-semibold text-foreground">{item.value}</span>
        </div>
      ))}
      <div className="sm:col-span-4 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p>
            Lote: <span className="font-semibold text-foreground">{batchId}</span>
          </p>
          {manifestInfo?.exported_at ? (
            <p>
              Última exportação: {new Date(manifestInfo.exported_at).toLocaleString()} por {" "}
              <span className="font-medium text-foreground">
                {manifestInfo.exported_by ?? "desconhecido"}
              </span>
            </p>
          ) : (
            <p>Nenhuma exportação registrada para este lote.</p>
          )}
        </div>
        {isRefreshing ? (
          <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Atualizando métricas…
          </span>
        ) : null}
      </div>
    </div>
  );
}

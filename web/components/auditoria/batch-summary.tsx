import { useEffect, useRef } from "react";
import { BadgeCheck, Clock, Loader2, RefreshCw, Users, TrendingUp, TrendingDown } from "lucide-react";

import type { AuditListResponse } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";

type BatchSummaryProps = {
  response: AuditListResponse | undefined;
  batchId: string | null;
  manifestInfo?: {
    exported_at?: string | null;
    exported_by?: string | null;
  } | null;
  isRefreshing?: boolean;
};

type TrendBadgeProps = {
  delta: number;
  variant: "default" | "destructive" | "secondary" | "warning" | "success";
};

function TrendBadge({ delta, variant }: TrendBadgeProps) {
  if (delta === 0) return null;

  const isPositive = delta > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Badge
      variant={variant}
      className="ml-2 gap-1 text-xs px-1.5 py-0.5"
    >
      <Icon className="h-3 w-3" />
      {isPositive ? "+" : ""}
      {delta}
    </Badge>
  );
}

export function BatchSummary({ response, batchId, manifestInfo, isRefreshing }: BatchSummaryProps) {
  // Refs para valores anteriores - inicializar com valores atuais na primeira vez
  const prevPending = useRef<number | null>(response?.pending ?? null);
  const prevResolved = useRef<number | null>(response?.resolved ?? null);
  const prevReopened = useRef<number | null>(response?.reopened ?? null);

  // Flag para controlar primeira renderização
  const isFirstRender = useRef(true);

  // Atualizar refs após render (antes do early return para seguir Rules of Hooks)
  useEffect(() => {
    if (!response || isRefreshing) return;

    // Na primeira renderização, apenas marca que já passou
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevPending.current = response.pending;
      prevResolved.current = response.resolved;
      prevReopened.current = response.reopened;
      return;
    }

    // Nas próximas, calcula delta e atualiza
    prevPending.current = response.pending;
    prevResolved.current = response.resolved;
    prevReopened.current = response.reopened;
  }, [response?.pending, response?.resolved, response?.reopened, isRefreshing, response]);

  if (!response || !batchId) {
    return null;
  }

  // Calcular deltas
  const pendingDelta = prevPending.current !== null ? response.pending - prevPending.current : 0;
  const resolvedDelta = prevResolved.current !== null ? response.resolved - prevResolved.current : 0;
  const reopenedDelta = prevReopened.current !== null ? response.reopened - prevReopened.current : 0;

  const progressPercentage = response.total > 0 ? (response.resolved / response.total) * 100 : 0;

  const getDeltaVariant = (
    metric: "pending" | "resolved" | "reopened" | "total",
    delta: number,
  ): TrendBadgeProps["variant"] => {
    if (delta === 0) {
      return "secondary";
    }

    if (metric === "pending") {
      return delta > 0 ? "destructive" : "success";
    }

    if (metric === "resolved") {
      return delta > 0 ? "success" : "destructive";
    }

    if (metric === "reopened") {
      return delta > 0 ? "warning" : "success";
    }

    return delta > 0 ? "default" : "secondary";
  };

  const items = [
    {
      key: "pending" as const,
      label: "Pendentes",
      value: response.pending,
      icon: Clock,
      delta: pendingDelta,
    },
    {
      key: "resolved" as const,
      label: "Resolvidos",
      value: response.resolved,
      icon: BadgeCheck,
      delta: resolvedDelta,
    },
    {
      key: "reopened" as const,
      label: "Reabertos",
      value: response.reopened,
      icon: RefreshCw,
      delta: reopenedDelta,
    },
    {
      key: "total" as const,
      label: "Total",
      value: response.total,
      icon: Users,
      delta: 0,
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
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">{item.value}</span>
            <TrendBadge delta={item.delta} variant={getDeltaVariant(item.key, item.delta)} />
          </div>
        </div>
      ))}

      {/* Progress bar section */}
      <div className="sm:col-span-4 mt-2 pt-4 border-t">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progresso</span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
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

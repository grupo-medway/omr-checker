"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Search, XCircle } from "lucide-react";

import type { AuditListItem } from "@/lib/api/types";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pendente",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  },
  resolved: {
    label: "Resolvido",
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  reopened: {
    label: "Reaberto",
    className: "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200",
  },
};

type AuditListProps = {
  items: AuditListItem[] | undefined;
  isLoading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  filterStatus: string | null;
  onFilterStatus: (status: string | null) => void;
};

export function AuditList({
  items,
  isLoading,
  selectedId,
  onSelect,
  filterStatus,
  onFilterStatus,
}: AuditListProps) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      const matchesStatus = filterStatus ? item.status === filterStatus : true;
      const matchesSearch = search
        ? item.file_id.toLowerCase().includes(search.toLowerCase())
        : true;
      return matchesStatus && matchesSearch;
    });
  }, [filterStatus, items, search]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por identificador"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          value={filterStatus ?? ""}
          onChange={(event) =>
            onFilterStatus(event.target.value ? event.target.value : null)
          }
          className="h-10 w-[150px] rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos</option>
          <option value="pending">Pendentes</option>
          <option value="resolved">Resolvidos</option>
          <option value="reopened">Reabertos</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-border/40 bg-card">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando itens de auditoria...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground p-4">
            <XCircle className="h-6 w-6" />
            <p>Nenhum item encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filteredItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`flex w-full flex-col gap-1 p-3 text-left transition-colors hover:bg-accent/60 ${item.id === selectedId ? "bg-accent/40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {item.file_id}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {item.issues.join(" • ") || "Sem issues registradas"}
                  </p>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_LABELS[status] ?? STATUS_LABELS.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${config.className}`}>
      {status === "resolved" ? <CheckCircle2 className="h-3 w-3" /> : null}
      {config.label}
    </span>
  );
}

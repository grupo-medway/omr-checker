"use client";

import { Download, Eraser, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type ExportActionsProps = {
  batchId: string | null;
  disabled?: boolean;
  isExporting: boolean;
  isCleaning: boolean;
  manifest?: {
    exported_at?: string | null;
    exported_by?: string | null;
  } | null;
  manifestLoading?: boolean;
  onExport: () => void;
  onCleanup: () => void;
};

export function ExportActions({
  batchId,
  disabled,
  isExporting,
  isCleaning,
  manifest,
  manifestLoading,
  onExport,
  onCleanup,
}: ExportActionsProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/40 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Exportação e limpeza</span>
        {manifest?.exported_at ? (
          <span>
            Última exportação: {new Date(manifest.exported_at).toLocaleString()} por{" "}
            <span className="font-semibold text-foreground">
              {manifest.exported_by ?? "desconhecido"}
            </span>
          </span>
        ) : manifestLoading ? (
          <span>Carregando informações do manifesto...</span>
        ) : (
          <span>Nenhuma exportação registrada até o momento.</span>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={onExport}
          disabled={disabled || !batchId || isExporting || manifestLoading}
          className="min-w-[160px] gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Exportando
            </>
          ) : (
            <>
              <Download className="h-4 w-4" /> Exportar CSV
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={onCleanup}
          disabled={disabled || !batchId || isCleaning}
          className="min-w-[160px] gap-2"
        >
          {isCleaning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Limpando
            </>
          ) : (
            <>
              <Eraser className="h-4 w-4" /> Limpar lote
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
